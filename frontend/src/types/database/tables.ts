/**
 * Database Table Types
 *
 * TypeScript interfaces generated from backend/schema.dbml.
 * These types represent the database table structures.
 *
 * @generated from backend/schema.dbml
 * @version 1.0.0
 */

import type {
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

// ============================================================================
// Base Types
// ============================================================================

/**
 * UUID string type for database identifiers.
 */
export type UUID = string;

/**
 * ISO 8601 timestamp string.
 */
export type Timestamp = string;

/**
 * PostgreSQL inet type for IP addresses.
 */
export type InetAddress = string;

/**
 * JSON-serializable object type.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Common timestamp fields present on most tables.
 */
export interface TimestampFields {
  /** Record creation timestamp */
  created_at: Timestamp;
  /** Last update timestamp */
  updated_at: Timestamp;
}

/**
 * Soft delete fields.
 */
export interface SoftDeleteFields {
  /** Deletion timestamp (null if not deleted) */
  deleted_at: Timestamp | null;
}

// ============================================================================
// Users & Profiles
// ============================================================================

/**
 * Core user table - synced with Nhost Auth.
 * @table nchat_users
 */
export interface DbUser extends TimestampFields, SoftDeleteFields {
  /** Primary key - UUID */
  id: UUID;
  /** Unique email address */
  email: string;
  /** Display name shown in UI */
  display_name: string;
  /** Unique username (lowercase, alphanumeric) */
  username: string | null;
  /** Avatar image URL */
  avatar_url: string | null;
  /** Account status */
  status: UserStatus;
  /** Email verification status */
  email_verified: boolean;
  /** Phone number */
  phone: string | null;
  /** Phone verification status */
  phone_verified: boolean | null;
  /** Locale/language preference */
  locale: string;
  /** Timezone (IANA format) */
  timezone: string;
  /** Additional metadata */
  metadata: JsonObject;
  /** Last seen timestamp */
  last_seen_at: Timestamp | null;
}

/**
 * Extended user profile information.
 * @table nchat_profiles
 */
export interface DbProfile extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** User bio/about text */
  bio: string | null;
  /** Job title */
  title: string | null;
  /** Company name */
  company: string | null;
  /** Location */
  location: string | null;
  /** Website URL */
  website: string | null;
  /** Social media links */
  social_links: JsonObject;
  /** Pronouns */
  pronouns: string | null;
  /** Profile banner URL */
  banner_url: string | null;
  /** Theme preference (light/dark/system) */
  theme_preference: string;
  /** Custom status message */
  custom_status: string | null;
  /** Custom status emoji */
  custom_status_emoji: string | null;
  /** Custom status expiration */
  custom_status_expires_at: Timestamp | null;
}

/**
 * Real-time user presence tracking.
 * @table nchat_presence
 */
export interface DbPresence extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Current presence status */
  status: PresenceStatus;
  /** Custom presence message */
  custom_message: string | null;
  /** Last heartbeat timestamp */
  last_heartbeat_at: Timestamp;
  /** Current channel being viewed */
  current_channel_id: UUID | null;
  /** Device information */
  device_info: JsonObject;
  /** Mobile device flag */
  is_mobile: boolean;
}

/**
 * User preferences and settings.
 * @table nchat_user_settings
 */
export interface DbUserSettings extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;

  // Notification Settings
  /** Master notification toggle */
  notifications_enabled: boolean;
  /** Play notification sounds */
  notification_sound: boolean;
  /** Desktop notifications */
  notification_desktop: boolean;
  /** Mobile push notifications */
  notification_mobile: boolean;
  /** Email notifications */
  notification_email: boolean;
  /** Email notification frequency */
  notification_email_frequency: string;
  /** Quiet hours enabled */
  quiet_hours_enabled: boolean;
  /** Quiet hours start time */
  quiet_hours_start: string | null;
  /** Quiet hours end time */
  quiet_hours_end: string | null;

  // Privacy Settings
  /** Show online status to others */
  show_online_status: boolean;
  /** Show typing indicator */
  show_typing_indicator: boolean;
  /** Show read receipts */
  read_receipts: boolean;
  /** Who can send DMs (everyone/contacts/none) */
  allow_dm_from: string;

  // Display Settings
  /** Compact message display mode */
  compact_mode: boolean;
  /** Theme (light/dark/system) */
  theme: string;
  /** Font size preference */
  font_size: string;
  /** Message density preference */
  message_density: string;

  // Keyboard Shortcuts
  /** Enable keyboard shortcuts */
  keyboard_shortcuts_enabled: boolean;
  /** Custom shortcut mappings */
  custom_shortcuts: JsonObject;

  // Accessibility
  /** Reduce motion/animations */
  reduce_motion: boolean;
  /** High contrast mode */
  high_contrast: boolean;
  /** Screen reader optimizations */
  screen_reader_mode: boolean;
}

// ============================================================================
// Channels & Categories
// ============================================================================

/**
 * Channel organization categories.
 * @table nchat_categories
 */
export interface DbCategory extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Category name */
  name: string;
  /** Category description */
  description: string | null;
  /** Display order position */
  position: number;
  /** Collapsed state in sidebar */
  is_collapsed: boolean;
  /** Created by user */
  created_by: UUID | null;
}

/**
 * Chat channels - public, private, direct messages.
 * @table nchat_channels
 */
export interface DbChannel extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Reference to category */
  category_id: UUID | null;
  /** Channel name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Channel description */
  description: string | null;
  /** Channel topic (header display) */
  topic: string | null;
  /** Channel type */
  type: ChannelType;
  /** Channel icon (emoji or URL) */
  icon: string | null;
  /** Theme color */
  color: string | null;
  /** Display order position */
  position: number | null;
  /** Default channel flag */
  is_default: boolean;
  /** Archived flag */
  is_archived: boolean;
  /** Read-only flag */
  is_readonly: boolean;
  /** NSFW/age-restricted flag */
  is_nsfw: boolean;
  /** Slow mode delay (seconds) */
  slowmode_seconds: number;
  /** Maximum member limit */
  max_members: number | null;
  /** Current member count (cached) */
  member_count: number;
  /** Total message count (cached) */
  message_count: number;
  /** Last message timestamp */
  last_message_at: Timestamp | null;
  /** Last message ID */
  last_message_id: UUID | null;
  /** Message retention days */
  retention_days: number | null;
  /** Created by user */
  created_by: UUID | null;
  /** Archive timestamp */
  archived_at: Timestamp | null;
}

/**
 * Channel membership and permissions.
 * @table nchat_channel_members
 */
export interface DbChannelMember extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to channel */
  channel_id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Member role in channel */
  role: MemberRole;
  /** Custom nickname */
  nickname: string | null;

  // Permission overrides (null = inherit)
  /** Can read messages */
  can_read: boolean | null;
  /** Can send messages */
  can_write: boolean | null;
  /** Can manage channel */
  can_manage: boolean | null;
  /** Can invite members */
  can_invite: boolean | null;
  /** Can pin messages */
  can_pin: boolean | null;
  /** Can delete any message */
  can_delete_messages: boolean | null;
  /** Can mention @everyone */
  can_mention_everyone: boolean | null;

  // Status
  /** Muted flag */
  is_muted: boolean;
  /** Mute expiration */
  muted_until: Timestamp | null;
  /** Pinned/favorited flag */
  is_pinned: boolean;
  /** Notification level */
  notification_level: string;

  // Read tracking
  /** Last read message ID */
  last_read_message_id: UUID | null;
  /** Last read timestamp */
  last_read_at: Timestamp | null;
  /** Unread message count */
  unread_count: number;
  /** Unread mention count */
  mention_count: number;

  /** Join timestamp */
  joined_at: Timestamp;
  /** Invited by user */
  invited_by: UUID | null;
}

// ============================================================================
// Messages & Threads
// ============================================================================

/**
 * Chat messages with threading support.
 * @table nchat_messages
 */
export interface DbMessage extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to channel */
  channel_id: UUID;
  /** Reference to author */
  user_id: UUID | null;
  /** Reference to thread */
  thread_id: UUID | null;
  /** Reference to parent message (reply) */
  parent_message_id: UUID | null;

  // Content
  /** Message content (markdown/plain) */
  content: string | null;
  /** Rendered HTML content */
  content_html: string | null;
  /** Plain text content */
  content_plain: string | null;
  /** Message type */
  type: MessageType;
  /** Additional metadata */
  metadata: JsonObject;

  // Rich content
  /** Mentioned user IDs */
  mentions: UUID[];
  /** Mentioned role names */
  mentioned_roles: string[];
  /** Mentioned channel IDs */
  mentioned_channels: UUID[];
  /** Embedded content (link previews, etc.) */
  embeds: JsonObject[];

  // Status flags
  /** Edited flag */
  is_edited: boolean;
  /** Pinned flag */
  is_pinned: boolean;
  /** Soft-deleted flag */
  is_deleted: boolean;
  /** System message flag */
  is_system: boolean;

  // Counts
  /** Reaction count (cached) */
  reaction_count: number;
  /** Reply count (cached) */
  reply_count: number;

  // Scheduling
  /** Scheduled send time */
  scheduled_at: Timestamp | null;
  /** Published timestamp */
  published_at: Timestamp | null;

  // Edit/delete tracking
  /** Edit timestamp */
  edited_at: Timestamp | null;
  /** Delete timestamp */
  deleted_at: Timestamp | null;
}

/**
 * Message threads (like Slack threads).
 * @table nchat_threads
 */
export interface DbThread extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to parent channel */
  channel_id: UUID;
  /** Reference to root message */
  root_message_id: UUID;
  /** Thread name/title */
  name: string | null;

  // Counts
  /** Message count in thread */
  message_count: number;
  /** Participant count */
  participant_count: number;

  // Status
  /** Locked flag (no new replies) */
  is_locked: boolean;
  /** Archived flag */
  is_archived: boolean;
  /** Auto-archive duration (minutes) */
  auto_archive_duration: number;

  // Timestamps
  /** Last message timestamp */
  last_message_at: Timestamp | null;
  /** Last message ID */
  last_message_id: UUID | null;
  /** Archive timestamp */
  archived_at: Timestamp | null;
  /** Created by user */
  created_by: UUID | null;
}

/**
 * Thread membership and read tracking.
 * @table nchat_thread_members
 */
export interface DbThreadMember extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to thread */
  thread_id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Last read message ID */
  last_read_message_id: UUID | null;
  /** Last read timestamp */
  last_read_at: Timestamp | null;
  /** Unread count */
  unread_count: number;
  /** Subscribed flag */
  is_subscribed: boolean;
  /** Join timestamp */
  joined_at: Timestamp;
}

/**
 * Message reactions.
 * @table nchat_reactions
 */
export interface DbReaction {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to message */
  message_id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Emoji character or shortcode */
  emoji: string;
  /** Reference to custom emoji */
  emoji_id: UUID | null;
  /** Creation timestamp */
  created_at: Timestamp;
}

/**
 * Custom emoji per workspace.
 * @table nchat_custom_emojis
 */
export interface DbCustomEmoji {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Emoji name/shortcode */
  name: string;
  /** Emoji image URL */
  image_url: string;
  /** Animated flag */
  animated: boolean;
  /** Created by user */
  created_by: UUID | null;
  /** Creation timestamp */
  created_at: Timestamp;
}

// ============================================================================
// Attachments & Media
// ============================================================================

/**
 * File attachments for messages.
 * @table nchat_attachments
 */
export interface DbAttachment extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to message */
  message_id: UUID | null;
  /** Reference to uploader */
  user_id: UUID;

  // File info
  /** Generated filename */
  filename: string;
  /** Original filename */
  original_filename: string;
  /** Storage path */
  file_path: string;
  /** Public URL */
  url: string;

  // Metadata
  /** Attachment type */
  type: AttachmentType;
  /** MIME type */
  mime_type: string;
  /** File size in bytes */
  size_bytes: number;

  // Dimensions (images/videos)
  /** Width in pixels */
  width: number | null;
  /** Height in pixels */
  height: number | null;
  /** Duration in seconds */
  duration_seconds: number | null;

  // Thumbnails
  /** Thumbnail URL */
  thumbnail_url: string | null;
  /** Thumbnail width */
  thumbnail_width: number | null;
  /** Thumbnail height */
  thumbnail_height: number | null;

  // Processing
  /** Processing complete flag */
  is_processed: boolean;
  /** Processing error message */
  processing_error: string | null;
  /** BlurHash for placeholder */
  blurhash: string | null;

  /** Additional metadata */
  metadata: JsonObject;
}

/**
 * Media library for workspace.
 * @table nchat_media
 */
export interface DbMedia extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Reference to uploader */
  user_id: UUID;

  // File info
  /** Generated filename */
  filename: string;
  /** Original filename */
  original_filename: string;
  /** Storage path */
  file_path: string;
  /** Public URL */
  url: string;

  // Metadata
  /** Media type */
  type: AttachmentType;
  /** MIME type */
  mime_type: string;
  /** File size in bytes */
  size_bytes: number;

  // Dimensions
  /** Width in pixels */
  width: number | null;
  /** Height in pixels */
  height: number | null;
  /** Duration in seconds */
  duration_seconds: number | null;

  // Thumbnails
  /** Thumbnail URL */
  thumbnail_url: string | null;
  /** BlurHash */
  blurhash: string | null;

  // Usage
  /** Reference count */
  reference_count: number;
  /** Last access timestamp */
  last_accessed_at: Timestamp | null;

  // Metadata
  /** Alt text */
  alt_text: string | null;
  /** Description */
  description: string | null;
  /** Tags */
  tags: string[];
  /** Additional metadata */
  metadata: JsonObject;
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * User notifications.
 * @table nchat_notifications
 */
export interface DbNotification {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to recipient */
  user_id: UUID;
  /** Notification type */
  type: NotificationType;

  // Source references
  /** Reference to channel */
  channel_id: UUID | null;
  /** Reference to message */
  message_id: UUID | null;
  /** Reference to thread */
  thread_id: UUID | null;
  /** Reference to actor (who triggered) */
  actor_id: UUID | null;

  // Content
  /** Notification title */
  title: string;
  /** Notification body */
  body: string | null;
  /** Additional data */
  data: JsonObject;
  /** Action URL */
  action_url: string | null;

  // Status
  /** Read flag */
  is_read: boolean;
  /** Read timestamp */
  read_at: Timestamp | null;
  /** Seen flag */
  is_seen: boolean;
  /** Seen timestamp */
  seen_at: Timestamp | null;

  // Delivery
  /** Push sent flag */
  push_sent: boolean;
  /** Push sent timestamp */
  push_sent_at: Timestamp | null;
  /** Email sent flag */
  email_sent: boolean;
  /** Email sent timestamp */
  email_sent_at: Timestamp | null;

  /** Creation timestamp */
  created_at: Timestamp;
}

/**
 * Web push notification subscriptions.
 * @table nchat_push_subscriptions
 */
export interface DbPushSubscription extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Push endpoint URL */
  endpoint: string;
  /** P256DH key */
  p256dh: string;
  /** Auth key */
  auth: string;
  /** User agent string */
  user_agent: string | null;
  /** Device type */
  device_type: string | null;
  /** Active flag */
  is_active: boolean;
  /** Last used timestamp */
  last_used_at: Timestamp | null;
}

// ============================================================================
// Workspaces & Organizations
// ============================================================================

/**
 * Workspaces (like Slack workspaces or Discord servers).
 * @table nchat_workspaces
 */
export interface DbWorkspace extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Workspace name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Workspace description */
  description: string | null;

  // Branding
  /** Logo URL */
  logo_url: string | null;
  /** Icon URL */
  icon_url: string | null;
  /** Banner URL */
  banner_url: string | null;
  /** Primary brand color */
  primary_color: string | null;

  // Settings
  /** Public visibility */
  is_public: boolean;
  /** Discoverable in search */
  is_discoverable: boolean;
  /** Allow member invites */
  allow_invites: boolean;
  /** Require admin approval */
  require_approval: boolean;
  /** Default channel ID */
  default_channel_id: UUID | null;

  // Features
  /** Enabled features */
  features: JsonObject;

  // Limits
  /** Maximum members */
  max_members: number | null;
  /** Maximum channels */
  max_channels: number | null;
  /** Maximum storage bytes */
  max_storage_bytes: number | null;

  // Stats
  /** Member count (cached) */
  member_count: number;
  /** Channel count (cached) */
  channel_count: number;
  /** Message count (cached) */
  message_count: number;
  /** Storage used bytes */
  storage_used_bytes: number;

  /** Reference to owner */
  owner_id: UUID | null;
}

/**
 * Workspace membership.
 * @table nchat_workspace_members
 */
export interface DbWorkspaceMember extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Member role */
  role: MemberRole;
  /** Custom nickname */
  nickname: string | null;

  // Status
  /** Owner flag */
  is_owner: boolean;
  /** Banned flag */
  is_banned: boolean;
  /** Ban reason */
  ban_reason: string | null;
  /** Ban timestamp */
  banned_at: Timestamp | null;
  /** Banned by user */
  banned_by: UUID | null;

  /** Join timestamp */
  joined_at: Timestamp;
  /** Invited by user */
  invited_by: UUID | null;
}

/**
 * Workspace invitation links.
 * @table nchat_workspace_invites
 */
export interface DbWorkspaceInvite extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Unique invite code */
  code: string;

  // Limits
  /** Maximum uses */
  max_uses: number | null;
  /** Current use count */
  uses: number;
  /** Expiration timestamp */
  expires_at: Timestamp | null;

  // Targeting
  /** Target email for private invite */
  target_email: string | null;
  /** Role to assign */
  target_role: MemberRole;

  // Tracking
  /** Created by user */
  created_by: UUID | null;
  /** Revoked flag */
  is_revoked: boolean;
  /** Revoke timestamp */
  revoked_at: Timestamp | null;
  /** Revoked by user */
  revoked_by: UUID | null;
}

// ============================================================================
// Roles & Permissions (RBAC)
// ============================================================================

/**
 * Custom roles per workspace.
 * @table nchat_roles
 */
export interface DbRole extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Role name */
  name: string;
  /** Role description */
  description: string | null;
  /** Theme color */
  color: string | null;
  /** Icon */
  icon: string | null;
  /** Display order */
  position: number;

  // Flags
  /** Default role flag */
  is_default: boolean;
  /** System role flag (non-deletable) */
  is_system: boolean;
  /** Mentionable flag */
  is_mentionable: boolean;
  /** Hoisted flag (show separately) */
  is_hoisted: boolean;

  /** Permissions bitmask */
  permissions: number;
}

/**
 * User role assignments.
 * @table nchat_user_roles
 */
export interface DbUserRole {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Reference to role */
  role_id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Granted by user */
  granted_by: UUID | null;
  /** Grant timestamp */
  granted_at: Timestamp;
  /** Expiration timestamp */
  expires_at: Timestamp | null;
}

/**
 * Permission definitions.
 * @table nchat_permissions
 */
export interface DbPermission {
  /** Primary key - UUID */
  id: UUID;
  /** Permission name */
  name: string;
  /** Permission description */
  description: string | null;
  /** Permission category */
  category: string;
  /** Bit position in bitmask */
  bit_position: number;
  /** Dangerous permission flag */
  is_dangerous: boolean;
}

// ============================================================================
// Billing & Subscriptions
// ============================================================================

/**
 * Subscription plans.
 * @table nchat_plans
 */
export interface DbPlan extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Plan name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Plan description */
  description: string | null;

  // Pricing
  /** Monthly price in cents */
  price_monthly_cents: number;
  /** Yearly price in cents */
  price_yearly_cents: number | null;
  /** Currency code */
  currency: string;

  // Limits
  /** Maximum members */
  max_members: number | null;
  /** Maximum channels */
  max_channels: number | null;
  /** Maximum storage bytes */
  max_storage_bytes: number | null;
  /** Maximum file size bytes */
  max_file_size_bytes: number | null;

  /** Enabled features */
  features: JsonObject;

  // Status
  /** Active flag */
  is_active: boolean;
  /** Public visibility */
  is_public: boolean;
  /** Sort order */
  sort_order: number;
}

/**
 * Workspace subscriptions.
 * @table nchat_subscriptions
 */
export interface DbSubscription extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Reference to plan */
  plan_id: UUID;

  /** Subscription status */
  status: SubscriptionStatus;

  // Stripe
  /** Stripe subscription ID */
  stripe_subscription_id: string | null;
  /** Stripe customer ID */
  stripe_customer_id: string | null;

  // Dates
  /** Trial end timestamp */
  trial_ends_at: Timestamp | null;
  /** Current period start */
  current_period_start: Timestamp | null;
  /** Current period end */
  current_period_end: Timestamp | null;
  /** Cancellation timestamp */
  canceled_at: Timestamp | null;
  /** End timestamp */
  ended_at: Timestamp | null;
}

/**
 * Billing invoices.
 * @table nchat_invoices
 */
export interface DbInvoice extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Reference to subscription */
  subscription_id: UUID | null;

  /** Stripe invoice ID */
  stripe_invoice_id: string | null;

  // Amounts
  /** Subtotal in cents */
  amount_cents: number;
  /** Tax in cents */
  tax_cents: number;
  /** Total in cents */
  total_cents: number;
  /** Currency code */
  currency: string;

  /** Invoice status */
  status: string;

  // Dates
  /** Period start */
  period_start: Timestamp | null;
  /** Period end */
  period_end: Timestamp | null;
  /** Due date */
  due_date: Timestamp | null;
  /** Payment timestamp */
  paid_at: Timestamp | null;

  /** Invoice PDF URL */
  invoice_pdf_url: string | null;
}

// ============================================================================
// Bookmarks & Search
// ============================================================================

/**
 * User bookmarks/saved items.
 * @table nchat_bookmarks
 */
export interface DbBookmark {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;
  /** Reference to bookmarked message */
  message_id: UUID | null;
  /** Reference to bookmarked channel */
  channel_id: UUID | null;
  /** Note/comment */
  note: string | null;
  /** Folder name */
  folder: string | null;
  /** Tags */
  tags: string[];
  /** Creation timestamp */
  created_at: Timestamp;
}

/**
 * Pinned messages per channel.
 * @table nchat_pinned_messages
 */
export interface DbPinnedMessage {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to channel */
  channel_id: UUID;
  /** Reference to message */
  message_id: UUID;
  /** Pinned by user */
  pinned_by: UUID;
  /** Pin timestamp */
  pinned_at: Timestamp;
}

/**
 * Full-text search index.
 * @table nchat_search_index
 */
export interface DbSearchIndex {
  /** Primary key - UUID */
  id: UUID;
  /** Entity type (message, channel, user) */
  entity_type: string;
  /** Entity ID */
  entity_id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Reference to channel */
  channel_id: UUID | null;
  /** Reference to user */
  user_id: UUID | null;

  /** Searchable title */
  title: string | null;
  /** Searchable content */
  content: string;
  /** PostgreSQL tsvector */
  content_tsv: string | null;

  /** Additional metadata */
  metadata: JsonObject;

  /** Index timestamp */
  indexed_at: Timestamp;
  /** Last update timestamp */
  updated_at: Timestamp;
}

// ============================================================================
// Audit Logs
// ============================================================================

/**
 * Comprehensive audit trail.
 * @table nchat_audit_logs
 */
export interface DbAuditLog {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID | null;
  /** Reference to actor user */
  user_id: UUID | null;

  /** Audit action type */
  action: AuditAction;
  /** Entity type (user, channel, message, etc.) */
  entity_type: string;
  /** Entity ID */
  entity_id: UUID | null;

  // Context
  /** Reference to channel */
  channel_id: UUID | null;
  /** Reference to target user */
  target_user_id: UUID | null;

  // Changes
  /** Previous values */
  old_values: JsonObject | null;
  /** New values */
  new_values: JsonObject | null;
  /** Additional metadata */
  metadata: JsonObject;

  // Request info
  /** Client IP address */
  ip_address: InetAddress | null;
  /** User agent string */
  user_agent: string | null;
  /** Request correlation ID */
  request_id: string | null;

  /** Log timestamp */
  created_at: Timestamp;
}

// ============================================================================
// Integrations & Webhooks
// ============================================================================

/**
 * Third-party integrations.
 * @table nchat_integrations
 */
export interface DbIntegration extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Integration name */
  name: string;
  /** Integration type (slack, github, etc.) */
  type: string;

  /** Configuration */
  config: JsonObject;
  /** Encrypted credentials */
  credentials_encrypted: string | null;

  // Status
  /** Enabled flag */
  is_enabled: boolean;
  /** Last sync timestamp */
  last_sync_at: Timestamp | null;
  /** Last error message */
  last_error: string | null;
  /** Error count */
  error_count: number;

  /** Created by user */
  created_by: UUID | null;
}

/**
 * Outgoing webhooks.
 * @table nchat_webhooks
 */
export interface DbWebhook extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Reference to channel (optional) */
  channel_id: UUID | null;

  /** Webhook name */
  name: string;
  /** Destination URL */
  url: string;
  /** Signing secret */
  secret: string | null;

  /** Event types to send */
  events: string[];

  // Status
  /** Enabled flag */
  is_enabled: boolean;
  /** Last trigger timestamp */
  last_triggered_at: Timestamp | null;
  /** Last error message */
  last_error: string | null;
  /** Failure count */
  failure_count: number;

  /** Created by user */
  created_by: UUID | null;
}

/**
 * Incoming webhooks for external services.
 * @table nchat_incoming_webhooks
 */
export interface DbIncomingWebhook extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace */
  workspace_id: UUID;
  /** Reference to target channel */
  channel_id: UUID;

  /** Webhook name */
  name: string;
  /** Unique token */
  token: string;

  // Customization
  /** Custom avatar URL */
  avatar_url: string | null;
  /** Custom username */
  username: string | null;

  // Status
  /** Enabled flag */
  is_enabled: boolean;
  /** Last used timestamp */
  last_used_at: Timestamp | null;
  /** Message count */
  message_count: number;

  /** Created by user */
  created_by: UUID | null;
}

// ============================================================================
// Bots & Apps
// ============================================================================

/**
 * Bot applications.
 * @table nchat_bots
 */
export interface DbBot extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to workspace (null = global) */
  workspace_id: UUID | null;
  /** Reference to owner */
  owner_id: UUID;

  /** Bot name */
  name: string;
  /** Unique username */
  username: string;
  /** Bot description */
  description: string | null;
  /** Avatar URL */
  avatar_url: string | null;

  /** Token hash */
  token_hash: string;

  /** Permissions bitmask */
  permissions: number;

  // Status
  /** Enabled flag */
  is_enabled: boolean;
  /** Verified flag */
  is_verified: boolean;
  /** Public flag */
  is_public: boolean;

  // Stats
  /** Install count */
  install_count: number;
  /** Message count */
  message_count: number;
  /** Last active timestamp */
  last_active_at: Timestamp | null;
}

// ============================================================================
// App Configuration
// ============================================================================

/**
 * Global app configuration (from setup wizard).
 * @table nchat_app_configuration
 */
export interface DbAppConfiguration extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Configuration key */
  key: string;

  /** Setup state */
  setup: JsonObject;
  /** Owner info */
  owner: JsonObject;
  /** Branding settings */
  branding: JsonObject;
  /** Landing theme */
  landing_theme: string;
  /** Homepage config */
  homepage: JsonObject;
  /** Auth providers */
  auth_providers: JsonObject;
  /** Auth permissions */
  auth_permissions: JsonObject;
  /** Feature flags */
  features: JsonObject;
  /** Integration settings */
  integrations: JsonObject;
  /** Moderation settings */
  moderation: JsonObject;
  /** Theme settings */
  theme: JsonObject;
  /** SEO settings */
  seo: JsonObject;
  /** Legal settings */
  legal: JsonObject;
  /** Social links */
  social: JsonObject;
}

// ============================================================================
// Sessions & Devices
// ============================================================================

/**
 * User sessions for multi-device support.
 * @table nchat_sessions
 */
export interface DbSession extends TimestampFields {
  /** Primary key - UUID */
  id: UUID;
  /** Reference to user */
  user_id: UUID;

  /** Token hash */
  token_hash: string;
  /** Refresh token hash */
  refresh_token_hash: string | null;

  // Device info
  /** User agent string */
  user_agent: string | null;
  /** IP address */
  ip_address: InetAddress | null;
  /** Device type */
  device_type: string | null;
  /** Device name */
  device_name: string | null;
  /** Operating system */
  os: string | null;
  /** Browser */
  browser: string | null;
  /** Location (from IP) */
  location: string | null;

  // Status
  /** Active flag */
  is_active: boolean;
  /** Last active timestamp */
  last_active_at: Timestamp;

  /** Expiration timestamp */
  expires_at: Timestamp;
}
