/**
 * Contact Service - Complete contacts management for nself-chat
 *
 * Handles contact discovery, invites, relationships, and blocking with
 * privacy-preserving operations and rate limiting.
 */

import { nanoid } from "nanoid";
import crypto from "crypto";

// ============================================================================
// Types
// ============================================================================

export type ContactRelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked"
  | "blocked_by";

export type ContactDiscoveryMethod =
  | "phone"
  | "email"
  | "username"
  | "qr_code"
  | "invite_link"
  | "mutual_contact"
  | "channel_member";

export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  nickname?: string;
  notes?: string;
  isFavorite: boolean;
  discoveryMethod: ContactDiscoveryMethod;
  addedAt: Date;
  updatedAt: Date;
  user?: ContactUser;
}

export interface ContactUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeenAt?: Date;
}

export interface ContactInvite {
  id: string;
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  code: string;
  message?: string;
  status: ContactInviteStatus;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
  sender?: ContactUser;
  recipient?: ContactUser;
}

export type ContactInviteStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export interface BlockedContact {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: Date;
  blockedUser?: ContactUser;
}

export interface PhoneHashResult {
  hash: string;
  salt: string;
}

export interface DiscoveryResult {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  mutualContacts: number;
  isBlocked: boolean;
  relationshipStatus: ContactRelationshipStatus;
}

export interface ContactSyncResult {
  matched: DiscoveryResult[];
  unmatched: string[];
  errors: string[];
}

export interface QRCodeData {
  type: "contact_exchange";
  userId: string;
  username: string;
  displayName: string;
  code: string;
  expiresAt: number;
  signature: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const INVITE_CODE_LENGTH = 12;
const QR_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PHONE_HASH_ITERATIONS = 100000;
const PHONE_HASH_KEY_LENGTH = 32;
const MAX_CONTACTS_PER_USER = 10000;
const MAX_PENDING_INVITES = 100;

// Rate limiting
const DISCOVERY_RATE_LIMIT = 100; // requests per hour
const SYNC_RATE_LIMIT = 10; // requests per hour

// ============================================================================
// Rate Limiting Store (in-memory for simplicity)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 3600000, // 1 hour
): RateLimitResult {
  const now = new Date();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new window
    const resetAt = new Date(now.getTime() + windowMs);
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ============================================================================
// Phone Number Hashing (Privacy-Preserving)
// ============================================================================

/**
 * Hash a phone number for privacy-preserving contact matching
 * Uses PBKDF2 with a random salt
 */
export function hashPhoneNumber(phone: string, salt?: string): PhoneHashResult {
  // Normalize phone number (remove non-digits, ensure country code)
  const normalizedPhone = normalizePhoneNumber(phone);
  const useSalt = salt || crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .pbkdf2Sync(
      normalizedPhone,
      useSalt,
      PHONE_HASH_ITERATIONS,
      PHONE_HASH_KEY_LENGTH,
      "sha256",
    )
    .toString("hex");

  return { hash, salt: useSalt };
}

/**
 * Verify a phone number against a hash
 */
export function verifyPhoneHash(
  phone: string,
  hash: string,
  salt: string,
): boolean {
  const result = hashPhoneNumber(phone, salt);
  return result.hash === hash;
}

/**
 * Normalize phone number for consistent hashing
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!normalized.startsWith("+")) {
    // Assume US number if no country code
    if (normalized.length === 10) {
      normalized = "+1" + normalized;
    } else if (normalized.length === 11 && normalized.startsWith("1")) {
      normalized = "+" + normalized;
    }
  }

  return normalized;
}

/**
 * Hash email for privacy-preserving matching
 */
export function hashEmail(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  return crypto.createHash("sha256").update(normalizedEmail).digest("hex");
}

// ============================================================================
// Invite Code Generation
// ============================================================================

/**
 * Generate a unique invite code
 */
export function generateInviteCode(): string {
  return nanoid(INVITE_CODE_LENGTH);
}

/**
 * Build an invite link URL
 */
export function buildInviteLink(code: string, baseUrl?: string): string {
  const base = baseUrl || getBaseUrl();
  return `${base}/contacts/invite/${code}`;
}

/**
 * Parse an invite code from a link
 */
export function parseInviteLink(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const inviteIndex = pathParts.indexOf("invite");
    if (inviteIndex !== -1 && pathParts[inviteIndex + 1]) {
      return pathParts[inviteIndex + 1];
    }
    return null;
  } catch {
    // May be just the code itself
    if (url.length === INVITE_CODE_LENGTH && /^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }
    return null;
  }
}

/**
 * Validate invite code format
 */
export function isValidInviteCode(code: string): boolean {
  return (
    typeof code === "string" &&
    code.length === INVITE_CODE_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(code)
  );
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ============================================================================
// QR Code Operations
// ============================================================================

/**
 * Generate QR code data for contact exchange
 */
export function generateQRCodeData(
  userId: string,
  username: string,
  displayName: string,
  secretKey: string,
): QRCodeData {
  const code = generateInviteCode();
  const expiresAt = Date.now() + QR_CODE_EXPIRY_MS;

  // Create signature for verification
  const dataToSign = `${userId}:${username}:${code}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign)
    .digest("hex");

  return {
    type: "contact_exchange",
    userId,
    username,
    displayName,
    code,
    expiresAt,
    signature,
  };
}

/**
 * Verify QR code data authenticity
 */
export function verifyQRCodeData(data: QRCodeData, secretKey: string): boolean {
  // Check expiration
  if (Date.now() > data.expiresAt) {
    return false;
  }

  // Verify signature
  const dataToSign = `${data.userId}:${data.username}:${data.code}:${data.expiresAt}`;
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(dataToSign)
    .digest("hex");

  return data.signature === expectedSignature;
}

/**
 * Parse QR code JSON string
 */
export function parseQRCodeData(qrString: string): QRCodeData | null {
  try {
    const data = JSON.parse(qrString);
    if (data.type !== "contact_exchange") {
      return null;
    }
    return data as QRCodeData;
  } catch {
    return null;
  }
}

// ============================================================================
// Contact Invite Lifecycle
// ============================================================================

export interface CreateInviteOptions {
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  message?: string;
  expiresInMs?: number;
}

/**
 * Create a contact invite
 */
export function createContactInvite(
  options: CreateInviteOptions,
): ContactInvite {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (options.expiresInMs || DEFAULT_INVITE_EXPIRY_MS),
  );

  return {
    id: nanoid(),
    senderId: options.senderId,
    recipientId: options.recipientId,
    recipientEmail: options.recipientEmail,
    recipientPhone: options.recipientPhone,
    code: generateInviteCode(),
    message: options.message,
    status: "pending",
    expiresAt,
    createdAt: now,
  };
}

/**
 * Check if invite is expired
 */
export function isInviteExpired(invite: ContactInvite): boolean {
  return new Date() > invite.expiresAt;
}

/**
 * Check if invite can be accepted
 */
export function canAcceptInvite(
  invite: ContactInvite,
  recipientId: string,
): { allowed: boolean; reason?: string } {
  if (invite.status !== "pending") {
    return { allowed: false, reason: `Invite is ${invite.status}` };
  }

  if (isInviteExpired(invite)) {
    return { allowed: false, reason: "Invite has expired" };
  }

  // If invite has a specific recipient, verify it matches
  if (invite.recipientId && invite.recipientId !== recipientId) {
    return { allowed: false, reason: "Invite is for a different user" };
  }

  if (invite.senderId === recipientId) {
    return { allowed: false, reason: "Cannot accept your own invite" };
  }

  return { allowed: true };
}

/**
 * Get invite status display text
 */
export function getInviteStatusText(status: ContactInviteStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Declined";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

// ============================================================================
// Contact Relationship Management
// ============================================================================

/**
 * Determine relationship status between two users
 */
export function determineRelationshipStatus(
  userId: string,
  otherUserId: string,
  contacts: Contact[],
  blockedUsers: BlockedContact[],
  pendingInvitesSent: ContactInvite[],
  pendingInvitesReceived: ContactInvite[],
): ContactRelationshipStatus {
  // Check if blocked
  const isBlocked = blockedUsers.some(
    (b) => b.userId === userId && b.blockedUserId === otherUserId,
  );
  if (isBlocked) return "blocked";

  const isBlockedBy = blockedUsers.some(
    (b) => b.userId === otherUserId && b.blockedUserId === userId,
  );
  if (isBlockedBy) return "blocked_by";

  // Check if already a contact
  const isContact = contacts.some(
    (c) => c.userId === userId && c.contactUserId === otherUserId,
  );
  if (isContact) return "accepted";

  // Check for pending invites
  const hasPendingSent = pendingInvitesSent.some(
    (i) =>
      i.senderId === userId &&
      i.recipientId === otherUserId &&
      i.status === "pending",
  );
  if (hasPendingSent) return "pending_sent";

  const hasPendingReceived = pendingInvitesReceived.some(
    (i) =>
      i.senderId === otherUserId &&
      i.recipientId === userId &&
      i.status === "pending",
  );
  if (hasPendingReceived) return "pending_received";

  return "none";
}

/**
 * Get mutual contacts between two users
 */
export function getMutualContacts(
  userContacts: Contact[],
  otherUserContacts: Contact[],
): string[] {
  const userContactIds = new Set(userContacts.map((c) => c.contactUserId));
  const otherContactIds = new Set(
    otherUserContacts.map((c) => c.contactUserId),
  );

  const mutual: string[] = [];
  userContactIds.forEach((id) => {
    if (otherContactIds.has(id)) {
      mutual.push(id);
    }
  });

  return mutual;
}

/**
 * Check if two users are mutual contacts
 */
export function areMutualContacts(
  userContacts: Contact[],
  otherUserContacts: Contact[],
  userId: string,
  otherUserId: string,
): boolean {
  const userHasOther = userContacts.some(
    (c) => c.contactUserId === otherUserId,
  );
  const otherHasUser = otherUserContacts.some(
    (c) => c.contactUserId === userId,
  );
  return userHasOther && otherHasUser;
}

// ============================================================================
// Privacy-Preserving Discovery
// ============================================================================

export interface DiscoveryOptions {
  userId: string;
  method: ContactDiscoveryMethod;
  blockedUserIds: Set<string>;
  userPrivacySettings?: Map<string, PrivacySettings>;
}

export interface PrivacySettings {
  allowSearchDiscovery: boolean;
  showInDirectory: boolean;
  allowContactRequests: "everyone" | "contacts_of_contacts" | "nobody";
  showMutualContacts: boolean;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowSearchDiscovery: true,
  showInDirectory: true,
  allowContactRequests: "everyone",
  showMutualContacts: true,
};

/**
 * Filter discovery results based on privacy settings
 */
export function filterDiscoveryResults(
  results: DiscoveryResult[],
  options: DiscoveryOptions,
): DiscoveryResult[] {
  return results.filter((result) => {
    // Always filter out blocked users
    if (options.blockedUserIds.has(result.userId)) {
      return false;
    }

    // Apply privacy settings if available
    const settings =
      options.userPrivacySettings?.get(result.userId) ||
      DEFAULT_PRIVACY_SETTINGS;

    // Check if user allows discovery
    if (!settings.allowSearchDiscovery) {
      return false;
    }

    // Check if user allows contact requests
    if (settings.allowContactRequests === "nobody") {
      return false;
    }

    if (settings.allowContactRequests === "contacts_of_contacts") {
      // Would need to check if requester is a contact of any of user's contacts
      // For simplicity, we'll allow if there are mutual contacts
      if (result.mutualContacts === 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check rate limit for discovery operations
 */
export function checkDiscoveryRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`discovery:${userId}`, DISCOVERY_RATE_LIMIT);
}

/**
 * Check rate limit for sync operations
 */
export function checkSyncRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`sync:${userId}`, SYNC_RATE_LIMIT);
}

// ============================================================================
// Contact Sync from Device
// ============================================================================

export interface DeviceContact {
  name: string;
  phoneNumbers: string[];
  emails: string[];
}

/**
 * Hash device contacts for privacy-preserving sync
 */
export function hashDeviceContacts(
  contacts: DeviceContact[],
  phoneSalt: string,
): { phoneHashes: string[]; emailHashes: string[] } {
  const phoneHashes: string[] = [];
  const emailHashes: string[] = [];

  contacts.forEach((contact) => {
    contact.phoneNumbers.forEach((phone) => {
      const { hash } = hashPhoneNumber(phone, phoneSalt);
      phoneHashes.push(hash);
    });

    contact.emails.forEach((email) => {
      emailHashes.push(hashEmail(email));
    });
  });

  return { phoneHashes, emailHashes };
}

/**
 * Match hashed contacts with server database
 * This would be called on the server with access to user data
 */
export function matchHashedContacts(
  phoneHashes: string[],
  emailHashes: string[],
  _registeredUsers: Map<
    string,
    { phoneHash?: string; emailHash?: string; userId: string }
  >,
): string[] {
  const matchedUserIds: string[] = [];
  const phoneHashSet = new Set(phoneHashes);
  const emailHashSet = new Set(emailHashes);

  _registeredUsers.forEach((user, _key) => {
    if (user.phoneHash && phoneHashSet.has(user.phoneHash)) {
      matchedUserIds.push(user.userId);
    } else if (user.emailHash && emailHashSet.has(user.emailHash)) {
      matchedUserIds.push(user.userId);
    }
  });

  return matchedUserIds;
}

// ============================================================================
// Block List Management
// ============================================================================

/**
 * Create a block entry
 */
export function createBlock(
  userId: string,
  blockedUserId: string,
  reason?: string,
): BlockedContact {
  return {
    id: nanoid(),
    userId,
    blockedUserId,
    reason,
    blockedAt: new Date(),
  };
}

/**
 * Check if user should be prevented from taking an action
 */
export function isActionBlockedByUser(
  actorId: string,
  targetId: string,
  blockedContacts: BlockedContact[],
): {
  blocked: boolean;
  direction: "actor_blocked" | "blocked_by_target" | null;
} {
  // Check if actor has blocked target
  const actorBlockedTarget = blockedContacts.some(
    (b) => b.userId === actorId && b.blockedUserId === targetId,
  );
  if (actorBlockedTarget) {
    return { blocked: true, direction: "actor_blocked" };
  }

  // Check if target has blocked actor
  const targetBlockedActor = blockedContacts.some(
    (b) => b.userId === targetId && b.blockedUserId === actorId,
  );
  if (targetBlockedActor) {
    return { blocked: true, direction: "blocked_by_target" };
  }

  return { blocked: false, direction: null };
}

/**
 * Filter content based on blocked users
 */
export function filterBlockedContent<T extends { userId: string }>(
  items: T[],
  blockedUserIds: Set<string>,
): T[] {
  return items.filter((item) => !blockedUserIds.has(item.userId));
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate contact limits
 */
export function validateContactLimits(currentContactCount: number): {
  allowed: boolean;
  reason?: string;
} {
  if (currentContactCount >= MAX_CONTACTS_PER_USER) {
    return {
      allowed: false,
      reason: `Maximum contact limit of ${MAX_CONTACTS_PER_USER} reached`,
    };
  }
  return { allowed: true };
}

/**
 * Validate pending invite limits
 */
export function validatePendingInviteLimits(currentPendingCount: number): {
  allowed: boolean;
  reason?: string;
} {
  if (currentPendingCount >= MAX_PENDING_INVITES) {
    return {
      allowed: false,
      reason: `Maximum pending invite limit of ${MAX_PENDING_INVITES} reached`,
    };
  }
  return { allowed: true };
}

// ============================================================================
// Export Types and Constants
// ============================================================================

export {
  MAX_CONTACTS_PER_USER,
  MAX_PENDING_INVITES,
  DISCOVERY_RATE_LIMIT,
  SYNC_RATE_LIMIT,
  QR_CODE_EXPIRY_MS,
  DEFAULT_INVITE_EXPIRY_MS,
};
