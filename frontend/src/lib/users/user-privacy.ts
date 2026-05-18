/**
 * User Privacy Settings
 *
 * Functions for managing user privacy settings including visibility levels,
 * blocked users, and contact management.
 */

import { type UserProfile } from "@/stores/user-store";
import {
  type ProfileVisibilitySettings,
  type VisibilityLevel,
  type ActivityVisibility,
} from "@/components/users/ProfileVisibility";

// ============================================================================
// Types
// ============================================================================

export interface BlockedUser {
  userId: string;
  blockedAt: Date;
  reason?: string;
}

export interface Contact {
  userId: string;
  addedAt: Date;
  nickname?: string;
  notes?: string;
}

export interface PrivacySettings extends ProfileVisibilitySettings {
  allowDirectMessages: "everyone" | "contacts" | "nobody";
  allowMentions: "everyone" | "contacts" | "nobody";
  allowSearchDiscovery: boolean;
  showInDirectory: boolean;
}

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  email: "contacts",
  phone: "private",
  location: "public",
  timezone: "public",
  lastSeen: "everyone",
  onlineStatus: "everyone",
  allowDirectMessages: "everyone",
  allowMentions: "everyone",
  allowSearchDiscovery: true,
  showInDirectory: true,
};

// ============================================================================
// Visibility Functions
// ============================================================================

/**
 * Check if a user can see another user's field based on visibility settings
 */
export function canSeeField(
  viewerUserId: string,
  targetUser: UserProfile,
  field: keyof ProfileVisibilitySettings,
  visibilitySettings: ProfileVisibilitySettings,
  contacts: Contact[],
): boolean {
  // User can always see their own fields
  if (viewerUserId === targetUser.id) return true;

  const visibility = visibilitySettings[field];

  // Handle contact-based visibility
  if (
    visibility === "contacts" ||
    (visibility as ActivityVisibility) === "contacts"
  ) {
    return isContact(viewerUserId, contacts);
  }

  // Handle public/everyone visibility
  if (
    visibility === "public" ||
    (visibility as ActivityVisibility) === "everyone"
  ) {
    return true;
  }

  // Handle private/nobody visibility
  return false;
}

/**
 * Check if a user is in the contacts list
 */
export function isContact(userId: string, contacts: Contact[]): boolean {
  return contacts.some((contact) => contact.userId === userId);
}

/**
 * Check if a user is blocked
 */
export function isBlocked(
  userId: string,
  blockedUsers: BlockedUser[],
): boolean {
  return blockedUsers.some((blocked) => blocked.userId === userId);
}

/**
 * Get visibility level display text
 */
export function getVisibilityLabel(
  level: VisibilityLevel | ActivityVisibility,
): string {
  switch (level) {
    case "public":
    case "everyone":
      return "Everyone";
    case "contacts":
      return "Contacts only";
    case "private":
    case "nobody":
      return "Only you";
    default:
      return "Unknown";
  }
}

// ============================================================================
// Contact Management
// ============================================================================

/**
 * Add a user to contacts
 */
export function addContact(
  userId: string,
  contacts: Contact[],
  options?: { nickname?: string; notes?: string },
): Contact[] {
  if (isContact(userId, contacts)) {
    return contacts;
  }

  return [
    ...contacts,
    {
      userId,
      addedAt: new Date(),
      nickname: options?.nickname,
      notes: options?.notes,
    },
  ];
}

/**
 * Remove a user from contacts
 */
export function removeContact(userId: string, contacts: Contact[]): Contact[] {
  return contacts.filter((contact) => contact.userId !== userId);
}

/**
 * Update contact details
 */
export function updateContact(
  userId: string,
  contacts: Contact[],
  updates: { nickname?: string; notes?: string },
): Contact[] {
  return contacts.map((contact) =>
    contact.userId === userId ? { ...contact, ...updates } : contact,
  );
}

/**
 * Get contact by user ID
 */
export function getContact(
  userId: string,
  contacts: Contact[],
): Contact | undefined {
  return contacts.find((contact) => contact.userId === userId);
}

// ============================================================================
// Block Management
// ============================================================================

/**
 * Block a user
 */
export function blockUser(
  userId: string,
  blockedUsers: BlockedUser[],
  reason?: string,
): BlockedUser[] {
  if (isBlocked(userId, blockedUsers)) {
    return blockedUsers;
  }

  return [
    ...blockedUsers,
    {
      userId,
      blockedAt: new Date(),
      reason,
    },
  ];
}

/**
 * Unblock a user
 */
export function unblockUser(
  userId: string,
  blockedUsers: BlockedUser[],
): BlockedUser[] {
  return blockedUsers.filter((blocked) => blocked.userId !== userId);
}

/**
 * Get blocked user entry
 */
export function getBlockedUser(
  userId: string,
  blockedUsers: BlockedUser[],
): BlockedUser | undefined {
  return blockedUsers.find((blocked) => blocked.userId === userId);
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Check if a user can send direct messages to another user
 */
export function canSendDirectMessage(
  senderUserId: string,
  recipientUserId: string,
  recipientSettings: PrivacySettings,
  recipientBlockedUsers: BlockedUser[],
  recipientContacts: Contact[],
): { allowed: boolean; reason?: string } {
  // Check if sender is blocked
  if (isBlocked(senderUserId, recipientBlockedUsers)) {
    return { allowed: false, reason: "You are blocked by this user" };
  }

  // Check DM settings
  switch (recipientSettings.allowDirectMessages) {
    case "nobody":
      return {
        allowed: false,
        reason: "This user does not accept direct messages",
      };
    case "contacts":
      if (!isContact(senderUserId, recipientContacts)) {
        return {
          allowed: false,
          reason: "This user only accepts messages from contacts",
        };
      }
      break;
    case "everyone":
    default:
      break;
  }

  return { allowed: true };
}

/**
 * Check if a user can mention another user
 */
export function canMention(
  mentionerUserId: string,
  targetUserId: string,
  targetSettings: PrivacySettings,
  targetBlockedUsers: BlockedUser[],
  targetContacts: Contact[],
): boolean {
  if (isBlocked(mentionerUserId, targetBlockedUsers)) {
    return false;
  }

  switch (targetSettings.allowMentions) {
    case "nobody":
      return false;
    case "contacts":
      return isContact(mentionerUserId, targetContacts);
    case "everyone":
    default:
      return true;
  }
}

/**
 * Filter users based on visibility in directory
 */
export function filterVisibleInDirectory<T extends { id: string }>(
  users: T[],
  privacySettingsMap: Map<string, PrivacySettings>,
): T[] {
  return users.filter((user) => {
    const settings = privacySettingsMap.get(user.id);
    return settings?.showInDirectory !== false;
  });
}

/**
 * Filter users based on search discovery
 */
export function filterSearchable<T extends { id: string }>(
  users: T[],
  privacySettingsMap: Map<string, PrivacySettings>,
): T[] {
  return users.filter((user) => {
    const settings = privacySettingsMap.get(user.id);
    return settings?.allowSearchDiscovery !== false;
  });
}

// ============================================================================
// Storage Functions
// ============================================================================

const PRIVACY_STORAGE_KEY = "nchat-privacy-settings";
const CONTACTS_STORAGE_KEY = "nchat-contacts";
const BLOCKED_STORAGE_KEY = "nchat-blocked-users";

/**
 * Save privacy settings to localStorage
 */
export function savePrivacySettings(settings: PrivacySettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load privacy settings from localStorage
 */
export function loadPrivacySettings(): PrivacySettings {
  if (typeof window === "undefined") return DEFAULT_PRIVACY_SETTINGS;

  try {
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    return stored
      ? { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_PRIVACY_SETTINGS;
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

/**
 * Save contacts to localStorage
 */
export function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load contacts from localStorage
 */
export function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((contact: Contact & { addedAt: string }) => ({
      ...contact,
      addedAt: new Date(contact.addedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Save blocked users to localStorage
 */
export function saveBlockedUsers(blockedUsers: BlockedUser[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(blockedUsers));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load blocked users from localStorage
 */
export function loadBlockedUsers(): BlockedUser[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(BLOCKED_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    // Convert date strings back to Date objects
    return parsed.map((blocked: BlockedUser & { blockedAt: string }) => ({
      ...blocked,
      blockedAt: new Date(blocked.blockedAt),
    }));
  } catch {
    return [];
  }
}
