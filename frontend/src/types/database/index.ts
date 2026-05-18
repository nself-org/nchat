/**
 * Database Types Index
 *
 * Central export file for all database-related TypeScript types.
 * Generated from backend/schema.dbml.
 *
 * @generated from backend/schema.dbml
 * @version 1.0.0
 */

// ============================================================================
// Enums
// ============================================================================

export type {
  UserStatus,
  PresenceStatus,
  ChannelType,
  MessageType,
  MemberRole,
  NotificationType,
  AttachmentType,
  SubscriptionStatus,
  AuditAction,
} from "./enums";

export {
  // Status arrays
  USER_STATUSES,
  PRESENCE_STATUSES,
  CHANNEL_TYPES,
  MESSAGE_TYPES,
  MEMBER_ROLES,
  NOTIFICATION_TYPES,
  ATTACHMENT_TYPES,
  SUBSCRIPTION_STATUSES,
  AUDIT_ACTIONS,
  // Label mappings
  PRESENCE_STATUS_LABELS,
  CHANNEL_TYPE_LABELS,
  MEMBER_ROLE_LEVELS,
  MEMBER_ROLE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  AUDIT_ACTION_LABELS,
  MIME_TYPE_CATEGORIES,
  // Type guards
  isUserStatus,
  isPresenceStatus,
  isChannelType,
  isMessageType,
  isMemberRole,
  isNotificationType,
  isAttachmentType,
  isSubscriptionStatus,
  isAuditAction,
} from "./enums";

// ============================================================================
// Table Types
// ============================================================================

export type {
  // Base types
  UUID,
  Timestamp,
  InetAddress,
  JsonObject,
  TimestampFields,
  SoftDeleteFields,
  // User tables
  DbUser,
  DbProfile,
  DbPresence,
  DbUserSettings,
  // Channel tables
  DbCategory,
  DbChannel,
  DbChannelMember,
  // Message tables
  DbMessage,
  DbThread,
  DbThreadMember,
  DbReaction,
  DbCustomEmoji,
  // Attachment tables
  DbAttachment,
  DbMedia,
  // Notification tables
  DbNotification,
  DbPushSubscription,
  // Workspace tables
  DbWorkspace,
  DbWorkspaceMember,
  DbWorkspaceInvite,
  // RBAC tables
  DbRole,
  DbUserRole,
  DbPermission,
  // Billing tables
  DbPlan,
  DbSubscription,
  DbInvoice,
  // Bookmark/search tables
  DbBookmark,
  DbPinnedMessage,
  DbSearchIndex,
  // Audit tables
  DbAuditLog,
  // Integration tables
  DbIntegration,
  DbWebhook,
  DbIncomingWebhook,
  // Bot tables
  DbBot,
  // Config tables
  DbAppConfiguration,
  // Session tables
  DbSession,
} from "./tables";
