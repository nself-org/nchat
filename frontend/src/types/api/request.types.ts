/**
 * API Request Types for nself-chat
 *
 * Type definitions for all API request payloads and input types.
 * Organized by domain for easy discovery and use.
 */

import type { UserRole } from "../user";
import type { ChannelType } from "../channel";
import type { MemberRole } from "../database/enums";

// ============================================================================
// Common Request Types
// ============================================================================

/**
 * Standard pagination parameters.
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Direction for cursor pagination */
  direction?: "forward" | "backward";
}

/**
 * Standard sort parameters.
 */
export interface SortParams<T extends string = string> {
  /** Field to sort by */
  sortBy?: T;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Standard date range filter.
 */
export interface DateRangeParams {
  /** Start date (ISO 8601) */
  startDate?: string;
  /** End date (ISO 8601) */
  endDate?: string;
}

/**
 * Standard search parameters.
 */
export interface SearchParams {
  /** Search query string */
  query: string;
  /** Fields to search in */
  fields?: string[];
  /** Use fuzzy matching */
  fuzzy?: boolean;
}

// ============================================================================
// Authentication Requests
// ============================================================================

/**
 * Email/password login request.
 */
export interface LoginRequest {
  /** User email */
  email: string;
  /** User password */
  password: string;
  /** Remember session */
  rememberMe?: boolean;
  /** Device information */
  deviceInfo?: DeviceInfo;
}

/**
 * Device information for authentication.
 */
export interface DeviceInfo {
  /** Device type */
  type?: "desktop" | "mobile" | "tablet" | "web";
  /** Device name */
  name?: string;
  /** Operating system */
  os?: string;
  /** Browser name */
  browser?: string;
  /** App version */
  appVersion?: string;
  /** Push notification token */
  pushToken?: string;
}

/**
 * User registration request.
 */
export interface RegisterRequest {
  /** User email */
  email: string;
  /** User password */
  password: string;
  /** Display name */
  displayName: string;
  /** Username (optional) */
  username?: string;
  /** Accepted terms of service */
  acceptedTerms: boolean;
  /** Marketing opt-in */
  marketingOptIn?: boolean;
  /** Invite code (if joining workspace) */
  inviteCode?: string;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  /** User email */
  email: string;
}

/**
 * Password reset confirmation.
 */
export interface PasswordResetConfirmRequest {
  /** Reset token */
  token: string;
  /** New password */
  newPassword: string;
}

/**
 * Change password request.
 */
export interface ChangePasswordRequest {
  /** Current password */
  currentPassword: string;
  /** New password */
  newPassword: string;
}

/**
 * OAuth/social login request.
 */
export interface OAuthLoginRequest {
  /** OAuth provider */
  provider: "google" | "github" | "discord" | "apple";
  /** OAuth code */
  code: string;
  /** Redirect URI used */
  redirectUri: string;
  /** State parameter */
  state?: string;
}

/**
 * Token refresh request.
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * MFA verification request.
 */
export interface MfaVerifyRequest {
  /** MFA code */
  code: string;
  /** MFA method used */
  method: "totp" | "sms" | "email";
  /** Trust this device */
  trustDevice?: boolean;
}

// ============================================================================
// User Requests
// ============================================================================

/**
 * Update user profile request.
 */
export interface UpdateProfileRequest {
  /** Display name */
  displayName?: string;
  /** Username */
  username?: string;
  /** Bio */
  bio?: string;
  /** Location */
  location?: string;
  /** Website URL */
  website?: string;
  /** Timezone (IANA format) */
  timezone?: string;
  /** Language preference */
  language?: string;
  /** Pronouns */
  pronouns?: string;
  /** Job title */
  jobTitle?: string;
  /** Company/organization */
  company?: string;
}

/**
 * Update user settings request.
 */
export interface UpdateSettingsRequest {
  /** Notification settings */
  notifications?: {
    enabled?: boolean;
    sound?: boolean;
    desktop?: boolean;
    email?: {
      enabled?: boolean;
      directMessages?: boolean;
      mentions?: boolean;
      digest?: "none" | "daily" | "weekly";
    };
    push?: {
      enabled?: boolean;
      directMessages?: boolean;
      mentions?: boolean;
    };
  };
  /** Privacy settings */
  privacy?: {
    allowDirectMessages?: "everyone" | "contacts" | "none";
    showOnlineStatus?: boolean;
    showTypingIndicator?: boolean;
    showReadReceipts?: boolean;
  };
  /** Appearance settings */
  appearance?: {
    theme?: "light" | "dark" | "system";
    compactMode?: boolean;
    fontSize?: "small" | "medium" | "large";
    timeFormat?: "12h" | "24h";
  };
}

/**
 * Update user status request.
 */
export interface UpdateStatusRequest {
  /** Status emoji */
  emoji?: string;
  /** Status text */
  text?: string;
  /** Status expiration (ISO 8601) */
  expiresAt?: string | null;
}

/**
 * Update presence request.
 */
export interface UpdatePresenceRequest {
  /** Presence status */
  status: "online" | "away" | "dnd" | "offline";
  /** Custom message */
  customMessage?: string;
}

/**
 * User search request.
 */
export interface UserSearchRequest extends PaginationParams, SearchParams {
  /** Filter by roles */
  roles?: UserRole[];
  /** Filter by status */
  status?: "active" | "inactive" | "suspended";
  /** Filter by presence */
  presence?: ("online" | "away" | "dnd" | "offline")[];
  /** Exclude user IDs */
  excludeIds?: string[];
  /** Include only from channel */
  channelId?: string;
  /** Include only from workspace */
  workspaceId?: string;
}

// ============================================================================
// Channel Requests
// ============================================================================

/**
 * Create channel request.
 */
export interface CreateChannelRequest {
  /** Channel name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Description */
  description?: string;
  /** Topic */
  topic?: string;
  /** Icon (emoji or URL) */
  icon?: string;
  /** Category ID */
  categoryId?: string;
  /** Is default channel */
  isDefault?: boolean;
  /** Is read-only (announcements) */
  isReadOnly?: boolean;
  /** Initial member IDs */
  memberIds?: string[];
  /** Channel settings */
  settings?: ChannelSettingsInput;
}

/**
 * Channel settings input.
 */
export interface ChannelSettingsInput {
  /** Allow reactions */
  allowReactions?: boolean;
  /** Allow threads */
  allowThreads?: boolean;
  /** Allow file uploads */
  allowFileUploads?: boolean;
  /** Allow link previews */
  allowLinkPreviews?: boolean;
  /** Slow mode delay (seconds) */
  slowModeDelay?: number;
  /** Default notification level */
  defaultNotificationLevel?: "all" | "mentions" | "none";
  /** Is NSFW */
  isNsfw?: boolean;
}

/**
 * Update channel request.
 */
export interface UpdateChannelRequest {
  /** Channel name */
  name?: string;
  /** Description */
  description?: string;
  /** Topic */
  topic?: string;
  /** Icon */
  icon?: string;
  /** Category ID */
  categoryId?: string | null;
  /** Position */
  position?: number;
  /** Is default */
  isDefault?: boolean;
  /** Is read-only */
  isReadOnly?: boolean;
  /** Settings */
  settings?: ChannelSettingsInput;
}

/**
 * Create DM channel request.
 */
export interface CreateDMRequest {
  /** User ID to start DM with */
  userId: string;
}

/**
 * Create group DM request.
 */
export interface CreateGroupDMRequest {
  /** Group name */
  name?: string;
  /** Group icon */
  icon?: string;
  /** User IDs (2-10) */
  userIds: string[];
}

/**
 * Channel member action request.
 */
export interface ChannelMemberActionRequest {
  /** User ID */
  userId: string;
  /** Action */
  action: "add" | "remove" | "update_role";
  /** New role (for update_role) */
  role?: MemberRole;
}

/**
 * Create channel invite request.
 */
export interface CreateChannelInviteRequest {
  /** Expiration duration (seconds, null = never) */
  expiresIn?: number | null;
  /** Maximum uses (null = unlimited) */
  maxUses?: number | null;
  /** Temporary membership */
  isTemporary?: boolean;
  /** Target email (private invite) */
  targetEmail?: string;
}

/**
 * Channel search request.
 */
export interface ChannelSearchRequest extends PaginationParams, SearchParams {
  /** Filter by types */
  types?: ChannelType[];
  /** Filter by category */
  categoryId?: string;
  /** Include archived */
  includeArchived?: boolean;
  /** Only channels user is member of */
  onlyJoined?: boolean;
  /** Only with unread messages */
  onlyUnread?: boolean;
  /** Sort options */
  sort?: SortParams<"name" | "created" | "lastMessage" | "memberCount">;
}

// ============================================================================
// Message Requests
// ============================================================================

/**
 * Send message request.
 */
export interface SendMessageRequest {
  /** Channel ID */
  channelId: string;
  /** Message content */
  content: string;
  /** Reply to message ID */
  replyToId?: string;
  /** Thread ID (for thread replies) */
  threadId?: string;
  /** Attachment IDs */
  attachmentIds?: string[];
  /** Sticker ID */
  stickerId?: string;
  /** Poll ID */
  pollId?: string;
  /** Mentions */
  mentions?: {
    users?: string[];
    channels?: string[];
    everyone?: boolean;
    here?: boolean;
  };
  /** Silent message (no notifications) */
  silent?: boolean;
  /** Scheduled send time (ISO 8601) */
  scheduledAt?: string;
}

/**
 * Edit message request.
 */
export interface EditMessageRequest {
  /** New content */
  content: string;
}

/**
 * Message search request.
 */
export interface MessageSearchRequest
  extends PaginationParams, SearchParams, DateRangeParams {
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Filter by user IDs (authors) */
  authorIds?: string[];
  /** Has attachments */
  hasAttachments?: boolean;
  /** Has links */
  hasLinks?: boolean;
  /** Is pinned */
  isPinned?: boolean;
  /** Mentions current user */
  mentionsMe?: boolean;
  /** Sort options */
  sort?: SortParams<"relevance" | "date">;
}

/**
 * Reaction request.
 */
export interface ReactionRequest {
  /** Emoji character or custom emoji ID */
  emoji: string;
}

/**
 * Mark messages read request.
 */
export interface MarkReadRequest {
  /** Channel ID */
  channelId: string;
  /** Last read message ID */
  messageId: string;
}

/**
 * Bulk message action request.
 */
export interface BulkMessageActionRequest {
  /** Message IDs */
  messageIds: string[];
  /** Action */
  action: "delete" | "pin" | "unpin";
}

// ============================================================================
// Thread Requests
// ============================================================================

/**
 * Create thread request.
 */
export interface CreateThreadRequest {
  /** Root message ID */
  messageId: string;
  /** Thread name (optional) */
  name?: string;
}

/**
 * Update thread request.
 */
export interface UpdateThreadRequest {
  /** Thread name */
  name?: string;
  /** Is locked */
  isLocked?: boolean;
  /** Is archived */
  isArchived?: boolean;
}

// ============================================================================
// File Upload Requests
// ============================================================================

/**
 * File upload request (presigned URL).
 */
export interface FileUploadRequest {
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Upload context */
  context: "message" | "avatar" | "banner" | "workspace" | "emoji";
  /** Associated entity ID */
  entityId?: string;
}

/**
 * Complete upload request.
 */
export interface CompleteUploadRequest {
  /** Upload ID */
  uploadId: string;
  /** File checksum (optional) */
  checksum?: string;
}

// ============================================================================
// Workspace Requests
// ============================================================================

/**
 * Create workspace request.
 */
export interface CreateWorkspaceRequest {
  /** Workspace name */
  name: string;
  /** URL slug */
  slug: string;
  /** Description */
  description?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Primary color */
  primaryColor?: string;
  /** Is public */
  isPublic?: boolean;
}

/**
 * Update workspace request.
 */
export interface UpdateWorkspaceRequest {
  /** Workspace name */
  name?: string;
  /** Description */
  description?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Icon URL */
  iconUrl?: string;
  /** Banner URL */
  bannerUrl?: string;
  /** Primary color */
  primaryColor?: string;
  /** Is public */
  isPublic?: boolean;
  /** Is discoverable */
  isDiscoverable?: boolean;
  /** Allow invites */
  allowInvites?: boolean;
  /** Require approval */
  requireApproval?: boolean;
  /** Default channel ID */
  defaultChannelId?: string;
}

/**
 * Create workspace invite request.
 */
export interface CreateWorkspaceInviteRequest {
  /** Max uses */
  maxUses?: number | null;
  /** Expiration (seconds) */
  expiresIn?: number | null;
  /** Target email */
  targetEmail?: string;
  /** Target role */
  targetRole?: MemberRole;
}

// ============================================================================
// Notification Requests
// ============================================================================

/**
 * Update notification preferences request.
 */
export interface UpdateNotificationPreferencesRequest {
  /** Global enabled */
  enabled?: boolean;
  /** Email settings */
  email?: {
    enabled?: boolean;
    directMessages?: boolean;
    mentions?: boolean;
    threadReplies?: boolean;
    digestFrequency?: "none" | "hourly" | "daily" | "weekly";
  };
  /** Push settings */
  push?: {
    enabled?: boolean;
    directMessages?: boolean;
    mentions?: boolean;
    threadReplies?: boolean;
    reactions?: boolean;
    showPreview?: boolean;
  };
  /** Desktop settings */
  desktop?: {
    enabled?: boolean;
    directMessages?: boolean;
    mentions?: boolean;
    playSound?: boolean;
  };
  /** Quiet hours */
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  /** Keywords */
  keywords?: string[];
}

/**
 * Mark notifications read request.
 */
export interface MarkNotificationsReadRequest {
  /** Notification IDs (empty = all) */
  notificationIds?: string[];
  /** Mark all before timestamp */
  before?: string;
}

// ============================================================================
// Webhook Requests
// ============================================================================

/**
 * Create webhook request.
 */
export interface CreateWebhookRequest {
  /** Webhook name */
  name: string;
  /** Destination URL */
  url: string;
  /** Event types to send */
  events: string[];
  /** Channel ID (optional) */
  channelId?: string;
  /** Is enabled */
  isEnabled?: boolean;
}

/**
 * Update webhook request.
 */
export interface UpdateWebhookRequest {
  /** Webhook name */
  name?: string;
  /** Destination URL */
  url?: string;
  /** Event types */
  events?: string[];
  /** Is enabled */
  isEnabled?: boolean;
}

/**
 * Create incoming webhook request.
 */
export interface CreateIncomingWebhookRequest {
  /** Webhook name */
  name: string;
  /** Target channel ID */
  channelId: string;
  /** Custom avatar URL */
  avatarUrl?: string;
  /** Custom username */
  username?: string;
}

// ============================================================================
// Report Requests
// ============================================================================

/**
 * Report content request.
 */
export interface ReportContentRequest {
  /** Content type */
  type: "message" | "user" | "channel";
  /** Content ID */
  targetId: string;
  /** Report reason */
  reason: "spam" | "harassment" | "inappropriate" | "violence" | "other";
  /** Additional details */
  details?: string;
}

// ============================================================================
// Moderation Requests
// ============================================================================

/**
 * User moderation action request.
 */
export interface ModerationActionRequest {
  /** Target user ID */
  userId: string;
  /** Action type */
  action: "warn" | "mute" | "kick" | "ban";
  /** Reason */
  reason?: string;
  /** Duration (seconds, for mute/ban) */
  duration?: number | null;
  /** Delete messages */
  deleteMessages?: boolean;
  /** Delete messages from last N hours */
  deleteMessageHours?: number;
}
