/**
 * Notification Types for nself-chat
 *
 * Type definitions for notifications, notification preferences, and delivery settings.
 * Supports in-app, push, email, and desktop notifications.
 */

import type { UserBasicInfo } from "./user";

// ============================================================================
// Notification Type Definitions
// ============================================================================

/**
 * Types of notifications.
 */
export type NotificationType =
  // Message notifications
  | "mention"
  | "direct_message"
  | "reply"
  | "thread_reply"
  // Reaction notifications
  | "reaction"
  // Channel notifications
  | "channel_invite"
  | "channel_join"
  | "channel_leave"
  | "channel_update"
  // User notifications
  | "follow"
  | "user_join"
  // System notifications
  | "system"
  | "announcement"
  | "security_alert"
  // Integration notifications
  | "integration"
  | "bot"
  | "webhook";

/**
 * Notification priority levels.
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Notification delivery channels.
 */
export type NotificationChannel = "in_app" | "push" | "email" | "desktop";

/**
 * Notification status.
 */
export type NotificationStatus = "unread" | "read" | "dismissed" | "archived";

// ============================================================================
// Notification Content Types
// ============================================================================

/**
 * Content for message-related notifications.
 */
export interface MessageNotificationContent {
  type: "mention" | "direct_message" | "reply" | "thread_reply";
  /** Message ID */
  messageId: string;
  /** Message preview text */
  messagePreview: string;
  /** Channel info */
  channel: {
    id: string;
    name: string;
    type: "public" | "private" | "direct" | "group_dm";
  };
  /** Thread ID (if thread reply) */
  threadId?: string;
}

/**
 * Content for reaction notifications.
 */
export interface ReactionNotificationContent {
  type: "reaction";
  /** Message ID that received reaction */
  messageId: string;
  /** Message preview text */
  messagePreview: string;
  /** Reaction emoji */
  emoji: string;
  /** Channel info */
  channel: {
    id: string;
    name: string;
  };
}

/**
 * Content for channel notifications.
 */
export interface ChannelNotificationContent {
  type: "channel_invite" | "channel_join" | "channel_leave" | "channel_update";
  /** Channel info */
  channel: {
    id: string;
    name: string;
    type: "public" | "private";
  };
  /** Change description (for updates) */
  changeDescription?: string;
}

/**
 * Content for user notifications.
 */
export interface UserNotificationContent {
  type: "follow" | "user_join";
  /** Target user (who performed action) */
  targetUser?: UserBasicInfo;
}

/**
 * Content for system notifications.
 */
export interface SystemNotificationContent {
  type: "system" | "announcement" | "security_alert";
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Action URL */
  actionUrl?: string;
  /** Action label */
  actionLabel?: string;
}

/**
 * Content for integration notifications.
 */
export interface IntegrationNotificationContent {
  type: "integration" | "bot" | "webhook";
  /** Integration/bot name */
  sourceName: string;
  /** Integration/bot icon */
  sourceIcon?: string;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Action URL */
  actionUrl?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Union type for all notification content types.
 */
export type NotificationContent =
  | MessageNotificationContent
  | ReactionNotificationContent
  | ChannelNotificationContent
  | UserNotificationContent
  | SystemNotificationContent
  | IntegrationNotificationContent;

// ============================================================================
// Main Notification Interface
// ============================================================================

/**
 * Core Notification interface.
 */
export interface Notification {
  /** Unique notification ID */
  id: string;
  /** Recipient user ID */
  userId: string;
  /** Notification type */
  type: NotificationType;
  /** Notification priority */
  priority: NotificationPriority;
  /** Current status */
  status: NotificationStatus;
  /** User who triggered the notification (if applicable) */
  actor?: UserBasicInfo;
  /** Notification title */
  title: string;
  /** Notification body/description */
  body: string;
  /** Type-specific content */
  content: NotificationContent;
  /** Channels this notification was sent to */
  deliveredTo: NotificationChannel[];
  /** Whether notification has been clicked/acted upon */
  isActioned: boolean;
  /** Action URL (deep link) */
  actionUrl?: string;
  /** Custom action data */
  actionData?: Record<string, unknown>;
  /** When notification was created */
  createdAt: Date;
  /** When notification was read */
  readAt?: Date;
  /** When notification expires */
  expiresAt?: Date;
  /** Grouping key (for collapsing similar notifications) */
  groupKey?: string;
  /** Count of grouped notifications */
  groupCount?: number;
}

/**
 * Grouped notification (collapsed).
 */
export interface GroupedNotification {
  /** Group key */
  groupKey: string;
  /** Representative notification */
  notification: Notification;
  /** Number of notifications in group */
  count: number;
  /** Actors involved in group */
  actors: UserBasicInfo[];
  /** Latest timestamp in group */
  latestAt: Date;
}

// ============================================================================
// Notification Preferences Types
// ============================================================================

/**
 * Channel-specific notification settings.
 */
export interface ChannelNotificationSettings {
  /** Channel ID */
  channelId: string;
  /** Enable notifications for this channel */
  enabled: boolean;
  /** Notification level */
  level: "all" | "mentions" | "none";
  /** Override mute status */
  isMuted: boolean;
  /** Mute until timestamp */
  mutedUntil?: Date;
}

/**
 * Notification schedule (quiet hours).
 */
export interface NotificationSchedule {
  /** Enable quiet hours */
  enabled: boolean;
  /** Days of week (0 = Sunday) */
  daysOfWeek: number[];
  /** Start time (HH:MM in 24h format) */
  startTime: string;
  /** End time (HH:MM in 24h format) */
  endTime: string;
  /** Timezone (IANA format) */
  timezone: string;
  /** Allow urgent notifications during quiet hours */
  allowUrgent: boolean;
}

/**
 * Email notification settings.
 */
export interface EmailNotificationSettings {
  /** Enable email notifications */
  enabled: boolean;
  /** Send for direct messages */
  directMessages: boolean;
  /** Send for mentions */
  mentions: boolean;
  /** Send for thread replies */
  threadReplies: boolean;
  /** Send for channel updates */
  channelUpdates: boolean;
  /** Digest frequency */
  digestFrequency: "none" | "hourly" | "daily" | "weekly";
  /** Digest day (for weekly) */
  digestDay?: number;
  /** Digest time (HH:MM) */
  digestTime?: string;
  /** Minimum delay before sending (minutes) */
  delayMinutes: number;
}

/**
 * Push notification settings.
 */
export interface PushNotificationSettings {
  /** Enable push notifications */
  enabled: boolean;
  /** Send for direct messages */
  directMessages: boolean;
  /** Send for mentions */
  mentions: boolean;
  /** Send for thread replies */
  threadReplies: boolean;
  /** Send for reactions */
  reactions: boolean;
  /** Show message preview in push */
  showPreview: boolean;
  /** Show sender name */
  showSender: boolean;
  /** Vibrate on receive */
  vibrate: boolean;
  /** Sound for notifications */
  sound: string | null;
}

/**
 * Desktop notification settings.
 */
export interface DesktopNotificationSettings {
  /** Enable desktop notifications */
  enabled: boolean;
  /** Send for direct messages */
  directMessages: boolean;
  /** Send for mentions */
  mentions: boolean;
  /** Send for all messages in active channels */
  allMessages: boolean;
  /** Show message preview */
  showPreview: boolean;
  /** Play sound */
  playSound: boolean;
  /** Sound file/name */
  sound: string | null;
  /** Duration in seconds (0 = until dismissed) */
  duration: number;
}

/**
 * Keyword notification settings.
 */
export interface KeywordNotificationSettings {
  /** Enable keyword notifications */
  enabled: boolean;
  /** Keywords to trigger notifications */
  keywords: string[];
  /** Case sensitive matching */
  caseSensitive: boolean;
  /** Match whole words only */
  wholeWordsOnly: boolean;
}

/**
 * Complete notification preferences.
 */
export interface NotificationPreferences {
  /** Global enable/disable */
  enabled: boolean;
  /** Email settings */
  email: EmailNotificationSettings;
  /** Push settings */
  push: PushNotificationSettings;
  /** Desktop settings */
  desktop: DesktopNotificationSettings;
  /** Keyword settings */
  keywords: KeywordNotificationSettings;
  /** Quiet hours schedule */
  schedule: NotificationSchedule;
  /** Channel-specific overrides */
  channelOverrides: ChannelNotificationSettings[];
  /** Muted channel IDs */
  mutedChannels: string[];
  /** Muted user IDs */
  mutedUsers: string[];
  /** Do not disturb mode */
  doNotDisturb: {
    enabled: boolean;
    until?: Date;
    allowUrgent: boolean;
  };
}

/**
 * Default notification preferences.
 */
export const DefaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  email: {
    enabled: true,
    directMessages: true,
    mentions: true,
    threadReplies: false,
    channelUpdates: false,
    digestFrequency: "daily",
    delayMinutes: 5,
  },
  push: {
    enabled: true,
    directMessages: true,
    mentions: true,
    threadReplies: true,
    reactions: false,
    showPreview: true,
    showSender: true,
    vibrate: true,
    sound: "default",
  },
  desktop: {
    enabled: true,
    directMessages: true,
    mentions: true,
    allMessages: false,
    showPreview: true,
    playSound: true,
    sound: "default",
    duration: 5,
  },
  keywords: {
    enabled: false,
    keywords: [],
    caseSensitive: false,
    wholeWordsOnly: true,
  },
  schedule: {
    enabled: false,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "22:00",
    endTime: "08:00",
    timezone: "UTC",
    allowUrgent: true,
  },
  channelOverrides: [],
  mutedChannels: [],
  mutedUsers: [],
  doNotDisturb: {
    enabled: false,
    allowUrgent: true,
  },
};

// ============================================================================
// Notification Actions
// ============================================================================

/**
 * Actions that can be taken on notifications.
 */
export type NotificationAction =
  | "mark_read"
  | "mark_unread"
  | "dismiss"
  | "archive"
  | "mute_channel"
  | "mute_thread"
  | "open";

/**
 * Bulk notification action input.
 */
export interface BulkNotificationAction {
  /** Notification IDs */
  notificationIds: string[];
  /** Action to perform */
  action: NotificationAction;
}

// ============================================================================
// Notification Query Types
// ============================================================================

/**
 * Notification filter criteria.
 */
export interface NotificationFilter {
  /** Filter by types */
  types?: NotificationType[];
  /** Filter by status */
  status?: NotificationStatus[];
  /** Filter by priority */
  priority?: NotificationPriority[];
  /** Filter by date range */
  after?: Date;
  before?: Date;
  /** Include archived */
  includeArchived?: boolean;
  /** Filter by channel */
  channelId?: string;
  /** Search text */
  search?: string;
}

/**
 * Notification sort options.
 */
export interface NotificationSortOptions {
  sortBy: "createdAt" | "priority" | "type";
  sortOrder: "asc" | "desc";
}

/**
 * Notification count summary.
 */
export interface NotificationCount {
  /** Total unread */
  total: number;
  /** Unread by type */
  byType: Partial<Record<NotificationType, number>>;
  /** Unread mentions */
  mentions: number;
  /** Unread direct messages */
  directMessages: number;
}

// ============================================================================
// Push Token Types
// ============================================================================

/**
 * Push notification token.
 */
export interface PushToken {
  /** Token ID */
  id: string;
  /** User ID */
  userId: string;
  /** Token value */
  token: string;
  /** Platform */
  platform: "ios" | "android" | "web";
  /** Device info */
  device?: {
    name?: string;
    model?: string;
    os?: string;
  };
  /** Whether token is active */
  isActive: boolean;
  /** When token was registered */
  createdAt: Date;
  /** Last time token was used */
  lastUsedAt?: Date;
}

/**
 * Input for registering a push token.
 */
export interface RegisterPushTokenInput {
  token: string;
  platform: "ios" | "android" | "web";
  device?: {
    name?: string;
    model?: string;
    os?: string;
  };
}

// ============================================================================
// Notification Events
// ============================================================================

/**
 * Notification received event.
 */
export interface NotificationReceivedEvent {
  notification: Notification;
  channels: NotificationChannel[];
  timestamp: Date;
}

/**
 * Notification read event.
 */
export interface NotificationReadEvent {
  notificationId: string;
  userId: string;
  timestamp: Date;
}

/**
 * Notification count updated event.
 */
export interface NotificationCountUpdatedEvent {
  userId: string;
  counts: NotificationCount;
  timestamp: Date;
}
