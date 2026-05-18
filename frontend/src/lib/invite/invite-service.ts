/**
 * Invite Service - Core invite operations for nself-chat
 *
 * Handles invite code generation, validation, and link building.
 * This service provides pure functions that can be used across
 * the application without requiring React or Apollo dependencies.
 */

import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

export type InviteType = "channel" | "workspace";

export interface InviteCodeOptions {
  /** Length of the invite code (default: 8) */
  length?: number;
  /** Prefix for the code (e.g., 'ch' for channel, 'ws' for workspace) */
  prefix?: string;
}

export interface InviteValidationResult {
  isValid: boolean;
  error?: InviteValidationError;
  invite?: InviteInfo;
}

export interface InviteInfo {
  id: string;
  code: string;
  type: InviteType;
  channelId: string | null;
  channelName: string | null;
  channelSlug: string | null;
  channelDescription: string | null;
  channelIsPrivate: boolean;
  channelMembersCount: number;
  workspaceName: string | null;
  creatorName: string;
  creatorAvatarUrl: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export type InviteValidationError =
  | "invalid_code"
  | "not_found"
  | "expired"
  | "max_uses_reached"
  | "revoked"
  | "already_member"
  | "channel_archived"
  | "permission_denied";

export interface ExpirationOption {
  label: string;
  value: string;
  duration: number | null; // milliseconds, null = never
}

export interface MaxUsesOption {
  label: string;
  value: number | null; // null = unlimited
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CODE_LENGTH = 8;
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

// Expiration presets
export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { label: "30 minutes", value: "30m", duration: 30 * 60 * 1000 },
  { label: "1 hour", value: "1h", duration: 60 * 60 * 1000 },
  { label: "6 hours", value: "6h", duration: 6 * 60 * 60 * 1000 },
  { label: "12 hours", value: "12h", duration: 12 * 60 * 60 * 1000 },
  { label: "1 day", value: "1d", duration: 24 * 60 * 60 * 1000 },
  { label: "7 days", value: "7d", duration: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", value: "30d", duration: 30 * 24 * 60 * 60 * 1000 },
  { label: "Never", value: "never", duration: null },
];

// Max uses presets
export const MAX_USES_OPTIONS: MaxUsesOption[] = [
  { label: "1 use", value: 1 },
  { label: "5 uses", value: 5 },
  { label: "10 uses", value: 10 },
  { label: "25 uses", value: 25 },
  { label: "50 uses", value: 50 },
  { label: "100 uses", value: 100 },
  { label: "No limit", value: null },
];

// ============================================================================
// Code Generation
// ============================================================================

/**
 * Generate a unique invite code
 * Uses nanoid for cryptographically secure random generation
 */
export function generateInviteCode(options: InviteCodeOptions = {}): string {
  const { length = DEFAULT_CODE_LENGTH, prefix } = options;

  // Use nanoid with a custom alphabet that excludes ambiguous characters
  const code = nanoid(length);

  // Clean up the code to use our custom alphabet
  const cleanCode = code
    .split("")
    .map((char) => {
      const index = Math.abs(char.charCodeAt(0)) % CODE_ALPHABET.length;
      return CODE_ALPHABET[index];
    })
    .join("");

  return prefix ? `${prefix}-${cleanCode}` : cleanCode;
}

/**
 * Generate a channel invite code
 */
export function generateChannelInviteCode(): string {
  return generateInviteCode({ length: 8 });
}

/**
 * Generate a workspace invite code
 */
export function generateWorkspaceInviteCode(): string {
  return generateInviteCode({ length: 10 });
}

// ============================================================================
// Code Validation
// ============================================================================

/**
 * Validate an invite code format
 */
export function isValidInviteCodeFormat(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Remove any prefix if present
  const cleanCode = code.includes("-") ? code.split("-").pop() || "" : code;

  // Code should be between 6 and 12 characters
  if (cleanCode.length < 6 || cleanCode.length > 12) {
    return false;
  }

  // Code should only contain alphanumeric characters
  return /^[a-zA-Z0-9]+$/.test(cleanCode);
}

/**
 * Normalize an invite code (trim, remove common URL prefixes)
 */
export function normalizeInviteCode(input: string): string {
  if (!input) return "";

  let code = input.trim();

  // Handle full URLs
  if (code.includes("/invite/")) {
    const match = code.match(/\/invite\/([a-zA-Z0-9-]+)/);
    if (match) {
      code = match[1];
    }
  }

  // Remove trailing slashes or query params
  code = code.split("?")[0].split("#")[0].replace(/\/$/, "");

  return code;
}

// ============================================================================
// Invite Validation
// ============================================================================

/**
 * Check if an invite has expired
 */
export function isInviteExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() < Date.now();
}

/**
 * Check if an invite has reached max uses
 */
export function hasReachedMaxUses(
  maxUses: number | null,
  useCount: number,
): boolean {
  if (maxUses === null || maxUses === 0) return false;
  return useCount >= maxUses;
}

/**
 * Get remaining uses for an invite
 */
export function getRemainingUses(
  maxUses: number | null,
  useCount: number,
): number | null {
  if (maxUses === null) return null;
  return Math.max(0, maxUses - useCount);
}

/**
 * Get time until invite expires
 */
export function getTimeUntilExpiry(
  expiresAt: Date | string | null,
): number | null {
  if (!expiresAt) return null;
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const remaining = expiry.getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Format time until expiry as human-readable string
 */
export function formatTimeUntilExpiry(
  expiresAt: Date | string | null,
): string | null {
  const remaining = getTimeUntilExpiry(expiresAt);
  if (remaining === null) return null;
  if (remaining === 0) return "Expired";

  const seconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

// ============================================================================
// Link Building
// ============================================================================

/**
 * Build an invite link URL
 */
export function buildInviteLink(code: string, baseUrl?: string): string {
  const base = baseUrl || getBaseUrl();
  return `${base}/invite/${code}`;
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback for server-side
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Parse an invite link to extract the code
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
    return normalizeInviteCode(url);
  }
}

// ============================================================================
// Expiration Calculation
// ============================================================================

/**
 * Calculate expiration date from a preset option
 */
export function calculateExpirationDate(option: string): Date | null {
  const preset = EXPIRATION_OPTIONS.find((o) => o.value === option);
  if (!preset || preset.duration === null) return null;
  return new Date(Date.now() + preset.duration);
}

/**
 * Get the expiration option that best matches a date
 */
export function getExpirationOption(expiresAt: Date | null): ExpirationOption {
  if (!expiresAt) {
    return EXPIRATION_OPTIONS.find((o) => o.value === "never")!;
  }

  const remaining = expiresAt.getTime() - Date.now();

  // Find the closest matching option
  for (const option of EXPIRATION_OPTIONS) {
    if (option.duration === null) continue;
    if (remaining <= option.duration) {
      return option;
    }
  }

  return EXPIRATION_OPTIONS[EXPIRATION_OPTIONS.length - 2]; // 30 days
}

// ============================================================================
// Share Utilities
// ============================================================================

/**
 * Copy invite link to clipboard
 */
export async function copyInviteLinkToClipboard(
  code: string,
): Promise<boolean> {
  const link = buildInviteLink(code);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Share invite link via native share API (mobile)
 */
export async function shareInviteLink(
  code: string,
  title?: string,
  text?: string,
): Promise<boolean> {
  const link = buildInviteLink(code);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: title || "Join our chat",
        text: text || "You have been invited to join a conversation",
        url: link,
      });
      return true;
    } catch {
      // User cancelled or share failed
      return false;
    }
  }

  // Fallback to copy
  return copyInviteLinkToClipboard(code);
}

/**
 * Generate mailto link for email sharing
 */
export function generateMailtoLink(
  code: string,
  subject?: string,
  body?: string,
): string {
  const link = buildInviteLink(code);
  const defaultSubject = "You're invited to join our chat";
  const defaultBody = `Hi,\n\nI'd like to invite you to join our conversation.\n\nClick here to join: ${link}\n\nSee you there!`;

  const params = new URLSearchParams({
    subject: subject || defaultSubject,
    body: body || defaultBody,
  });

  return `mailto:?${params.toString()}`;
}

// ============================================================================
// Transform Utilities
// ============================================================================

/**
 * Transform raw GraphQL invite data to InviteInfo
 */
export function transformInviteData(data: any): InviteInfo | null {
  if (!data) return null;

  return {
    id: data.id,
    code: data.code,
    type: data.type as InviteType,
    channelId: data.channel_id || data.channelId || null,
    channelName: data.channel?.name || null,
    channelSlug: data.channel?.slug || null,
    channelDescription: data.channel?.description || null,
    channelIsPrivate: data.channel?.is_private || false,
    channelMembersCount: data.channel?.members_aggregate?.aggregate?.count || 0,
    workspaceName: null, // Would come from workspace data
    creatorName:
      data.creator?.display_name || data.creator?.username || "Unknown",
    creatorAvatarUrl: data.creator?.avatar_url || null,
    maxUses: data.max_uses || null,
    useCount: data.use_count || 0,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    isActive: data.is_active ?? true,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Validate a transformed invite
 */
export function validateInvite(invite: InviteInfo): InviteValidationResult {
  // Check if active
  if (!invite.isActive) {
    return { isValid: false, error: "revoked", invite };
  }

  // Check expiration
  if (isInviteExpired(invite.expiresAt)) {
    return { isValid: false, error: "expired", invite };
  }

  // Check max uses
  if (hasReachedMaxUses(invite.maxUses, invite.useCount)) {
    return { isValid: false, error: "max_uses_reached", invite };
  }

  return { isValid: true, invite };
}
