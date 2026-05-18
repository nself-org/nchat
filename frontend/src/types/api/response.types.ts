/**
 * API Response Types for nself-chat
 *
 * Type definitions for all API response shapes and payloads.
 * Provides consistent typing for frontend data consumption.
 */

import type {
  User,
  UserBasicInfo,
  UserPresence,
  UserSettings,
  UserProfile,
} from "../user";
import type { Channel, ChannelMember, Thread } from "../channel";
import type { Message, Attachment, Reaction } from "../message";
import type {
  Notification,
  NotificationPreferences,
  NotificationCount,
} from "../notification";
import type {
  Plan,
  Subscription,
  Invoice,
  SubscriptionUsage,
} from "../subscription.types";
import type { AuditLog, AuditStatistics } from "../audit.types";

// ============================================================================
// Common Response Types
// ============================================================================

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Response metadata */
  meta?: ResponseMeta;
}

/**
 * Response metadata.
 */
export interface ResponseMeta {
  /** Request ID for tracing */
  requestId: string;
  /** Server timestamp (ISO 8601) */
  timestamp: string;
  /** Response time in milliseconds */
  responseTime?: number;
  /** API version */
  version?: string;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  /** Data items */
  items: T[];
  /** Pagination info */
  pagination: PaginationInfo;
  /** Response metadata */
  meta?: ResponseMeta;
}

/**
 * Pagination information.
 */
export interface PaginationInfo {
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total items */
  total: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
  /** Next cursor (cursor-based) */
  nextCursor?: string;
  /** Previous cursor (cursor-based) */
  prevCursor?: string;
}

/**
 * Cursor-based pagination info.
 */
export interface CursorPaginationInfo {
  /** Start cursor */
  startCursor: string | null;
  /** End cursor */
  endCursor: string | null;
  /** Has next page */
  hasNextPage: boolean;
  /** Has previous page */
  hasPreviousPage: boolean;
}

/**
 * Connection response (Relay pattern).
 */
export interface Connection<T> {
  /** Edges */
  edges: Edge<T>[];
  /** Page info */
  pageInfo: CursorPaginationInfo;
  /** Total count */
  totalCount: number;
}

/**
 * Edge in connection.
 */
export interface Edge<T> {
  /** Node data */
  node: T;
  /** Cursor */
  cursor: string;
}

// ============================================================================
// Authentication Responses
// ============================================================================

/**
 * Authentication response (login/register).
 */
export interface AuthResponse {
  /** User data */
  user: User;
  /** Access token (JWT) */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token expiration (ISO 8601) */
  expiresAt: string;
  /** Session ID */
  sessionId: string;
  /** MFA required */
  mfaRequired?: boolean;
  /** MFA methods available */
  mfaMethods?: ("totp" | "sms" | "email")[];
}

/**
 * Token refresh response.
 */
export interface TokenRefreshResponse {
  /** New access token */
  accessToken: string;
  /** New refresh token */
  refreshToken: string;
  /** New expiration */
  expiresAt: string;
}

/**
 * Session response.
 */
export interface SessionResponse {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Device info */
  device: {
    type: "desktop" | "mobile" | "tablet" | "web";
    name?: string;
    os?: string;
    browser?: string;
  };
  /** IP address */
  ipAddress: string | null;
  /** Location */
  location: string | null;
  /** Created timestamp */
  createdAt: string;
  /** Last active timestamp */
  lastActiveAt: string;
  /** Is current session */
  isCurrent: boolean;
}

// ============================================================================
// User Responses
// ============================================================================

/**
 * Full user response.
 */
export interface UserResponse extends User {
  /** Extended profile */
  profile: UserProfile;
  /** User settings */
  settings: UserSettings;
  /** Current presence */
  presence: UserPresence;
}

/**
 * User list response.
 */
export type UserListResponse = PaginatedResponse<UserBasicInfo>;

/**
 * User search response.
 */
export interface UserSearchResponse extends PaginatedResponse<UserBasicInfo> {
  /** Search query */
  query: string;
  /** Search took (ms) */
  took: number;
}

/**
 * User profile response.
 */
export interface UserProfileResponse {
  /** User data */
  user: User;
  /** Profile data */
  profile: UserProfile;
  /** Mutual channels */
  mutualChannels?: { id: string; name: string }[];
  /** Is blocked */
  isBlocked: boolean;
  /** Is contact */
  isContact: boolean;
}

// ============================================================================
// Channel Responses
// ============================================================================

/**
 * Channel response with membership.
 */
export interface ChannelResponse extends Channel {
  /** Current user membership */
  membership: ChannelMember | null;
  /** Is member */
  isMember: boolean;
  /** Recent messages preview */
  recentMessages?: Message[];
  /** Pinned messages */
  pinnedMessages?: Message[];
}

/**
 * Channel list response.
 */
export interface ChannelListResponse {
  /** Channels grouped by category */
  categories: {
    id: string;
    name: string;
    position: number;
    isCollapsed: boolean;
    channels: ChannelListItem[];
  }[];
  /** Uncategorized channels */
  uncategorized: ChannelListItem[];
  /** Direct messages */
  directMessages: DirectMessageItem[];
}

/**
 * Channel list item.
 */
export interface ChannelListItem {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel type */
  type: string;
  /** Icon */
  icon?: string;
  /** Unread count */
  unreadCount: number;
  /** Mention count */
  mentionCount: number;
  /** Is muted */
  isMuted: boolean;
  /** Is pinned */
  isPinned: boolean;
  /** Last message preview */
  lastMessage?: {
    content: string;
    authorName: string;
    timestamp: string;
  };
  /** Position */
  position: number;
}

/**
 * Direct message item.
 */
export interface DirectMessageItem {
  /** Channel ID */
  id: string;
  /** Other participant(s) */
  participants: UserBasicInfo[];
  /** Unread count */
  unreadCount: number;
  /** Last message preview */
  lastMessage?: {
    content: string;
    authorId: string;
    timestamp: string;
  };
  /** Is group DM */
  isGroup: boolean;
}

/**
 * Channel members response.
 */
export interface ChannelMembersResponse extends PaginatedResponse<ChannelMemberResponse> {
  /** Online count */
  onlineCount: number;
  /** Total member count */
  totalMembers: number;
}

/**
 * Channel member response.
 */
export interface ChannelMemberResponse extends ChannelMember {
  /** User details */
  user: UserBasicInfo & {
    presence: UserPresence;
  };
}

/**
 * Channel invite response.
 */
export interface ChannelInviteResponse {
  /** Invite code */
  code: string;
  /** Invite URL */
  url: string;
  /** Expires at */
  expiresAt: string | null;
  /** Max uses */
  maxUses: number | null;
  /** Current uses */
  uses: number;
  /** Channel info */
  channel: {
    id: string;
    name: string;
    type: string;
    memberCount: number;
  };
}

// ============================================================================
// Message Responses
// ============================================================================

/**
 * Message response.
 */
export interface MessageResponse extends Omit<Message, "replyTo"> {
  /** Author details */
  author: UserBasicInfo;
  /** Attachments */
  attachments: Attachment[];
  /** Reactions with users */
  reactions: ReactionWithUsers[];
  /** Thread info (if has thread) */
  thread?: ThreadSummary;
  /** Reply to message (if reply) */
  replyTo?: MessagePreview | null;
}

/**
 * Reaction with user info.
 */
export interface ReactionWithUsers extends Reaction {
  /** Users who reacted */
  users: UserBasicInfo[];
  /** Has current user reacted */
  hasReacted: boolean;
}

/**
 * Thread summary.
 */
export interface ThreadSummary {
  /** Thread ID */
  id: string;
  /** Reply count */
  replyCount: number;
  /** Participant count */
  participantCount: number;
  /** Last reply at */
  lastReplyAt: string;
  /** Participant previews */
  participants: UserBasicInfo[];
}

/**
 * Message preview (for replies).
 */
export interface MessagePreview {
  /** Message ID */
  id: string;
  /** Content preview */
  content: string;
  /** Author */
  author: UserBasicInfo;
  /** Has attachments */
  hasAttachments: boolean;
}

/**
 * Messages response.
 */
export interface MessagesResponse {
  /** Messages */
  messages: MessageResponse[];
  /** Has more (older) */
  hasMore: boolean;
  /** Has newer */
  hasNewer: boolean;
  /** Oldest message timestamp */
  oldestTimestamp: string | null;
  /** Newest message timestamp */
  newestTimestamp: string | null;
}

/**
 * Message search response.
 */
export interface MessageSearchResponse extends PaginatedResponse<MessageSearchResult> {
  /** Search query */
  query: string;
  /** Search took (ms) */
  took: number;
  /** Total matches */
  totalMatches: number;
}

/**
 * Message search result.
 */
export interface MessageSearchResult {
  /** Message */
  message: MessageResponse;
  /** Channel info */
  channel: {
    id: string;
    name: string;
    type: string;
  };
  /** Highlighted content */
  highlight?: string;
  /** Match score */
  score: number;
}

// ============================================================================
// Thread Responses
// ============================================================================

/**
 * Thread response.
 */
export interface ThreadResponse extends Thread {
  /** Root message */
  rootMessage: MessageResponse;
  /** Replies */
  replies: MessageResponse[];
  /** Participants */
  participants: UserBasicInfo[];
  /** User's read state */
  userReadState?: {
    lastReadMessageId: string | null;
    unreadCount: number;
  };
}

/**
 * Thread list response.
 */
export type ThreadListResponse = PaginatedResponse<ThreadListItem>;

/**
 * Thread list item.
 */
export interface ThreadListItem {
  /** Thread ID */
  id: string;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** Root message preview */
  rootMessage: MessagePreview;
  /** Reply count */
  replyCount: number;
  /** Unread count */
  unreadCount: number;
  /** Last reply at */
  lastReplyAt: string;
  /** Participants preview */
  participants: UserBasicInfo[];
  /** Is subscribed */
  isSubscribed: boolean;
}

// ============================================================================
// Notification Responses
// ============================================================================

/**
 * Notification response.
 */
export interface NotificationResponse extends Notification {
  /** Actor details */
  actor?: UserBasicInfo;
}

/**
 * Notifications list response.
 */
export interface NotificationsResponse extends PaginatedResponse<NotificationResponse> {
  /** Unread count */
  unreadCount: number;
  /** Counts by type */
  countsByType: NotificationCount;
}

/**
 * Notification preferences response.
 */
export interface NotificationPreferencesResponse {
  /** Preferences */
  preferences: NotificationPreferences;
  /** Channel overrides */
  channelOverrides: {
    channelId: string;
    channelName: string;
    level: "all" | "mentions" | "none";
    isMuted: boolean;
  }[];
}

// ============================================================================
// Upload Responses
// ============================================================================

/**
 * Presigned upload URL response.
 */
export interface PresignedUploadResponse {
  /** Upload ID */
  uploadId: string;
  /** Presigned URL */
  url: string;
  /** HTTP method */
  method: "PUT" | "POST";
  /** Required headers */
  headers: Record<string, string>;
  /** URL expiration */
  expiresAt: string;
  /** Maximum file size */
  maxSize: number;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
}

/**
 * Upload complete response.
 */
export interface UploadCompleteResponse {
  /** Attachment info */
  attachment: Attachment;
  /** Public URL */
  url: string;
  /** Thumbnail URL (if applicable) */
  thumbnailUrl?: string;
}

// ============================================================================
// Workspace Responses
// ============================================================================

/**
 * Workspace response.
 */
export interface WorkspaceResponse {
  /** Workspace ID */
  id: string;
  /** Workspace name */
  name: string;
  /** URL slug */
  slug: string;
  /** Description */
  description: string | null;
  /** Logo URL */
  logoUrl: string | null;
  /** Icon URL */
  iconUrl: string | null;
  /** Banner URL */
  bannerUrl: string | null;
  /** Primary color */
  primaryColor: string | null;
  /** Is public */
  isPublic: boolean;
  /** Is discoverable */
  isDiscoverable: boolean;
  /** Member count */
  memberCount: number;
  /** Channel count */
  channelCount: number;
  /** Owner info */
  owner: UserBasicInfo;
  /** Current user's membership */
  membership?: {
    role: string;
    joinedAt: string;
  };
  /** Features */
  features: Record<string, boolean>;
  /** Created at */
  createdAt: string;
}

/**
 * Workspace invite response.
 */
export interface WorkspaceInviteResponse {
  /** Invite code */
  code: string;
  /** Invite URL */
  url: string;
  /** Expires at */
  expiresAt: string | null;
  /** Max uses */
  maxUses: number | null;
  /** Current uses */
  uses: number;
  /** Target role */
  targetRole: string;
  /** Workspace info */
  workspace: {
    id: string;
    name: string;
    memberCount: number;
  };
}

// ============================================================================
// Subscription Responses
// ============================================================================

/**
 * Subscription response.
 */
export interface SubscriptionResponse {
  /** Subscription */
  subscription: Subscription;
  /** Usage */
  usage: SubscriptionUsage;
  /** Available plans */
  availablePlans: Plan[];
}

/**
 * Plans list response.
 */
export interface PlansResponse {
  /** Plans */
  plans: Plan[];
  /** Current plan (if subscribed) */
  currentPlan?: Plan;
}

/**
 * Invoices response.
 */
export type InvoicesResponse = PaginatedResponse<Invoice>;

/**
 * Checkout session response.
 */
export interface CheckoutSessionResponse {
  /** Checkout URL */
  url: string;
  /** Session ID */
  sessionId: string;
  /** Expires at */
  expiresAt: string;
}

/**
 * Portal session response.
 */
export interface PortalSessionResponse {
  /** Portal URL */
  url: string;
}

// ============================================================================
// Audit Responses
// ============================================================================

/**
 * Audit logs response.
 */
export type AuditLogsResponse = PaginatedResponse<AuditLog>;

/**
 * Audit statistics response.
 */
export interface AuditStatsResponse {
  /** Statistics */
  stats: AuditStatistics;
  /** Generated at */
  generatedAt: string;
}

// ============================================================================
// Health & Status Responses
// ============================================================================

/**
 * Health check response.
 */
export interface HealthResponse {
  /** Overall status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Service checks */
  services: {
    name: string;
    status: "up" | "down" | "degraded";
    latency?: number;
    message?: string;
  }[];
  /** Version info */
  version: {
    api: string;
    build: string;
    commit: string;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Rate limit response.
 */
export interface RateLimitResponse {
  /** Limit */
  limit: number;
  /** Remaining */
  remaining: number;
  /** Reset timestamp */
  reset: string;
  /** Retry after (seconds) */
  retryAfter?: number;
}
