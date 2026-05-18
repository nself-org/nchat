/**
 * Database Enums
 *
 * TypeScript enum types generated from backend/schema.dbml.
 * These enums represent the database-level enumerated types.
 *
 * @generated from backend/schema.dbml
 * @version 1.0.0
 */

// ============================================================================
// User Enums
// ============================================================================

/**
 * User account status.
 * Tracks the lifecycle state of a user account.
 */
export type UserStatus = "active" | "inactive" | "suspended" | "deleted";

/**
 * Array of all valid user statuses for validation.
 */
export const USER_STATUSES: readonly UserStatus[] = [
  "active",
  "inactive",
  "suspended",
  "deleted",
] as const;

/**
 * User presence/online status.
 * Real-time status indicator for user availability.
 */
export type PresenceStatus =
  | "online"
  | "away"
  | "dnd"
  | "offline"
  | "invisible";

/**
 * Array of all valid presence statuses for validation.
 */
export const PRESENCE_STATUSES: readonly PresenceStatus[] = [
  "online",
  "away",
  "dnd",
  "offline",
  "invisible",
] as const;

/**
 * Human-readable labels for presence statuses.
 */
export const PRESENCE_STATUS_LABELS: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  offline: "Offline",
  invisible: "Invisible",
} as const;

// ============================================================================
// Channel Enums
// ============================================================================

/**
 * Channel type categorization.
 * Determines the behavior and visibility of a channel.
 */
export type ChannelType =
  | "public"
  | "private"
  | "direct"
  | "group"
  | "announcement";

/**
 * Array of all valid channel types for validation.
 */
export const CHANNEL_TYPES: readonly ChannelType[] = [
  "public",
  "private",
  "direct",
  "group",
  "announcement",
] as const;

/**
 * Human-readable labels for channel types.
 */
export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  public: "Public Channel",
  private: "Private Channel",
  direct: "Direct Message",
  group: "Group Chat",
  announcement: "Announcement",
} as const;

// ============================================================================
// Message Enums
// ============================================================================

/**
 * Message type classification.
 * Determines how the message content should be rendered.
 */
export type MessageType =
  | "text"
  | "system"
  | "bot"
  | "file"
  | "voice"
  | "video"
  | "embed";

/**
 * Array of all valid message types for validation.
 */
export const MESSAGE_TYPES: readonly MessageType[] = [
  "text",
  "system",
  "bot",
  "file",
  "voice",
  "video",
  "embed",
] as const;

// ============================================================================
// Member/Role Enums
// ============================================================================

/**
 * Member role in a workspace or channel.
 * Defines the permission level of a member.
 */
export type MemberRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Array of all valid member roles for validation.
 */
export const MEMBER_ROLES: readonly MemberRole[] = [
  "owner",
  "admin",
  "moderator",
  "member",
  "guest",
] as const;

/**
 * Role hierarchy levels (higher = more permissions).
 */
export const MEMBER_ROLE_LEVELS: Record<MemberRole, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  member: 40,
  guest: 20,
} as const;

/**
 * Human-readable labels for member roles.
 */
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  moderator: "Moderator",
  member: "Member",
  guest: "Guest",
} as const;

// ============================================================================
// Notification Enums
// ============================================================================

/**
 * Notification type classification.
 * Determines the category and handling of notifications.
 */
export type NotificationType =
  | "message"
  | "mention"
  | "reaction"
  | "thread_reply"
  | "channel_invite"
  | "system";

/**
 * Array of all valid notification types for validation.
 */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "message",
  "mention",
  "reaction",
  "thread_reply",
  "channel_invite",
  "system",
] as const;

// ============================================================================
// Attachment Enums
// ============================================================================

/**
 * Attachment type classification.
 * Determines how attachments are processed and displayed.
 */
export type AttachmentType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

/**
 * Array of all valid attachment types for validation.
 */
export const ATTACHMENT_TYPES: readonly AttachmentType[] = [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "other",
] as const;

/**
 * MIME type to attachment type mapping.
 */
export const MIME_TYPE_CATEGORIES: Record<string, AttachmentType> = {
  "image/": "image",
  "video/": "video",
  "audio/": "audio",
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.": "document",
  "text/": "document",
  "application/zip": "archive",
  "application/x-rar": "archive",
  "application/x-7z": "archive",
  "application/gzip": "archive",
  "application/x-tar": "archive",
} as const;

// ============================================================================
// Subscription Enums
// ============================================================================

/**
 * Subscription status for billing.
 * Tracks the lifecycle state of a subscription.
 */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

/**
 * Array of all valid subscription statuses for validation.
 */
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
] as const;

/**
 * Human-readable labels for subscription statuses.
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trial Period",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  unpaid: "Unpaid",
} as const;

// ============================================================================
// Audit Enums
// ============================================================================

/**
 * Audit log action types.
 * Tracks all significant actions in the system for compliance.
 */
export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "invite"
  | "join"
  | "leave"
  | "kick"
  | "ban"
  | "unban"
  | "mute"
  | "unmute"
  | "pin"
  | "unpin"
  | "archive"
  | "unarchive";

/**
 * Array of all valid audit actions for validation.
 */
export const AUDIT_ACTIONS: readonly AuditAction[] = [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "invite",
  "join",
  "leave",
  "kick",
  "ban",
  "unban",
  "mute",
  "unmute",
  "pin",
  "unpin",
  "archive",
  "unarchive",
] as const;

/**
 * Human-readable labels for audit actions.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Created",
  read: "Viewed",
  update: "Updated",
  delete: "Deleted",
  login: "Logged In",
  logout: "Logged Out",
  invite: "Invited",
  join: "Joined",
  leave: "Left",
  kick: "Kicked",
  ban: "Banned",
  unban: "Unbanned",
  mute: "Muted",
  unmute: "Unmuted",
  pin: "Pinned",
  unpin: "Unpinned",
  archive: "Archived",
  unarchive: "Unarchived",
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for UserStatus.
 */
export function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus);
}

/**
 * Type guard for PresenceStatus.
 */
export function isPresenceStatus(value: string): value is PresenceStatus {
  return PRESENCE_STATUSES.includes(value as PresenceStatus);
}

/**
 * Type guard for ChannelType.
 */
export function isChannelType(value: string): value is ChannelType {
  return CHANNEL_TYPES.includes(value as ChannelType);
}

/**
 * Type guard for MessageType.
 */
export function isMessageType(value: string): value is MessageType {
  return MESSAGE_TYPES.includes(value as MessageType);
}

/**
 * Type guard for MemberRole.
 */
export function isMemberRole(value: string): value is MemberRole {
  return MEMBER_ROLES.includes(value as MemberRole);
}

/**
 * Type guard for NotificationType.
 */
export function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationType);
}

/**
 * Type guard for AttachmentType.
 */
export function isAttachmentType(value: string): value is AttachmentType {
  return ATTACHMENT_TYPES.includes(value as AttachmentType);
}

/**
 * Type guard for SubscriptionStatus.
 */
export function isSubscriptionStatus(
  value: string,
): value is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus);
}

/**
 * Type guard for AuditAction.
 */
export function isAuditAction(value: string): value is AuditAction {
  return AUDIT_ACTIONS.includes(value as AuditAction);
}
