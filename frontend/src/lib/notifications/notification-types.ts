/**
 * Notification Types - Comprehensive type definitions for nself-chat notification system
 *
 * This file defines all TypeScript types used across the notification settings system.
 */

// ============================================================================
// Enums and Type Aliases
// ============================================================================

/**
 * Types of notifications that can be sent
 */
export type NotificationType =
  | "mention"
  | "direct_message"
  | "thread_reply"
  | "reaction"
  | "channel_invite"
  | "channel_update"
  | "system"
  | "announcement"
  | "keyword";

/**
 * Priority levels for notifications
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Notification levels for channels
 */
export type ChannelNotificationLevel =
  | "all"
  | "mentions"
  | "nothing"
  | "custom";

/**
 * Email digest frequency options
 */
export type EmailDigestFrequency =
  | "instant"
  | "hourly"
  | "daily"
  | "weekly"
  | "never";

/**
 * Delivery methods for notifications
 */
export type NotificationDeliveryMethod =
  | "desktop"
  | "mobile"
  | "email"
  | "in_app";

/**
 * Day of week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ============================================================================
// Quiet Hours / Do Not Disturb
// ============================================================================

/**
 * Time range for quiet hours
 */
export interface TimeRange {
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
}

/**
 * Do Not Disturb schedule configuration
 */
export interface QuietHoursSchedule {
  /** Whether quiet hours are enabled */
  enabled: boolean;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Days of the week when quiet hours apply (0-6, Sunday-Saturday) */
  days: DayOfWeek[];
  /** Whether to allow @mentions to break through quiet hours */
  allowMentionsBreakthrough: boolean;
  /** Whether to apply quiet hours on weekends */
  enableOnWeekends: boolean;
  /** Whether to automatically set status to DND during quiet hours */
  autoSetStatus: boolean;
  /** Custom status message during quiet hours */
  customStatusMessage?: string;
  /** Timezone for the schedule */
  timezone: string;
}

/**
 * Weekend-specific quiet hours settings
 */
export interface WeekendQuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

// ============================================================================
// Sound Settings
// ============================================================================

/**
 * Sound configuration for notifications
 */
export interface NotificationSoundSettings {
  /** Whether sounds are enabled globally */
  enabled: boolean;
  /** Global volume (0-100) */
  volume: number;
  /** Default notification sound identifier */
  defaultSound: string;
  /** Sound for mentions */
  mentionSound: string;
  /** Sound for direct messages */
  dmSound: string;
  /** Sound for thread replies */
  threadSound: string;
  /** Sound for reactions */
  reactionSound: string;
  /** Whether to play sounds when window is focused */
  playWhenFocused: boolean;
  /** Custom sound URL (user uploaded) */
  customSoundUrl?: string;
}

/**
 * Available notification sounds
 */
export interface NotificationSound {
  id: string;
  name: string;
  url: string;
  category: "default" | "custom" | "system";
  duration: number; // in milliseconds
}

// ============================================================================
// Keyword Notifications
// ============================================================================

/**
 * Keyword alert configuration
 */
export interface KeywordNotification {
  id: string;
  /** The keyword or phrase to match */
  keyword: string;
  /** Whether matching is case-sensitive */
  caseSensitive: boolean;
  /** Whether to match whole words only */
  wholeWord: boolean;
  /** Whether this keyword alert is enabled */
  enabled: boolean;
  /** Highlight color for matched keywords */
  highlightColor?: string;
  /** Custom sound for this keyword */
  soundId?: string;
  /** Channels where this keyword is active (empty = all channels) */
  channelIds: string[];
  /** When this keyword was created */
  createdAt: string;
}

/**
 * Keyword match result
 */
export interface KeywordMatch {
  keyword: string;
  matchedText: string;
  position: number;
  length: number;
}

// ============================================================================
// Channel-Specific Settings
// ============================================================================

/**
 * Per-channel notification settings
 */
export interface ChannelNotificationSetting {
  channelId: string;
  channelName?: string;
  channelType?: "public" | "private" | "dm";
  /** Notification level for this channel */
  level: ChannelNotificationLevel;
  /** When channel is muted until (ISO date string, null = not muted) */
  muteUntil?: string | null;
  /** Whether to override global settings */
  overrideGlobal: boolean;
  /** Custom sound for this channel */
  customSound?: string;
  /** Whether to show desktop notifications for this channel */
  desktopEnabled?: boolean;
  /** Whether to show mobile push for this channel */
  mobileEnabled?: boolean;
  /** Whether to show email notifications for this channel */
  emailEnabled?: boolean;
  /** Custom keywords active in this channel */
  activeKeywords?: string[];
}

/**
 * Mute duration options
 */
export interface MuteDuration {
  value: string;
  label: string;
  minutes: number;
}

/**
 * Predefined mute durations
 */
export const MUTE_DURATIONS: MuteDuration[] = [
  { value: "15m", label: "15 minutes", minutes: 15 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "2h", label: "2 hours", minutes: 120 },
  { value: "4h", label: "4 hours", minutes: 240 },
  { value: "8h", label: "8 hours", minutes: 480 },
  { value: "24h", label: "24 hours", minutes: 1440 },
  { value: "1w", label: "1 week", minutes: 10080 },
  { value: "forever", label: "Until I turn it back on", minutes: Infinity },
];

// ============================================================================
// DM-Specific Settings
// ============================================================================

/**
 * Direct message notification settings
 */
export interface DMNotificationSettings {
  /** Whether to receive DM notifications */
  enabled: boolean;
  /** Whether to show desktop notifications for DMs */
  desktop: boolean;
  /** Whether to show mobile push for DMs */
  mobile: boolean;
  /** Whether to receive email notifications for DMs */
  email: boolean;
  /** Whether to show message preview */
  showPreview: boolean;
  /** Whether to play sound for DMs */
  playSound: boolean;
  /** Custom sound for DMs */
  customSound?: string;
  /** Whether to allow DMs during quiet hours */
  allowDuringQuietHours: boolean;
  /** Muted conversations */
  mutedConversations: string[];
}

// ============================================================================
// Mention Settings
// ============================================================================

/**
 * Mention notification settings
 */
export interface MentionSettings {
  /** Whether mention notifications are enabled */
  enabled: boolean;
  /** Notify on @username mentions */
  notifyOnUserMention: boolean;
  /** Notify on @here mentions */
  notifyOnHere: boolean;
  /** Notify on @channel mentions */
  notifyOnChannel: boolean;
  /** Notify on @everyone mentions */
  notifyOnEveryone: boolean;
  /** Whether to show desktop notification for mentions */
  desktop: boolean;
  /** Whether to show mobile push for mentions */
  mobile: boolean;
  /** Whether to send email for mentions */
  email: boolean;
  /** Whether mentions can break through quiet hours */
  breakThroughQuietHours: boolean;
  /** Custom sound for mentions */
  customSound?: string;
  /** Highlight mentions in messages */
  highlightInMessages: boolean;
  /** Badge mentions on channel */
  showBadge: boolean;
}

// ============================================================================
// Push Notification Settings
// ============================================================================

/**
 * Mobile push notification settings
 */
export interface PushNotificationSettings {
  /** Whether push notifications are enabled */
  enabled: boolean;
  /** Device token for push notifications */
  deviceToken?: string;
  /** Platform (ios, android, web) */
  platform?: "ios" | "android" | "web";
  /** Device ID */
  deviceId?: string;
  /** Whether to show message preview in push */
  showPreview: boolean;
  /** Whether to play sound */
  playSound: boolean;
  /** Whether to vibrate */
  vibrate: boolean;
  /** LED color for Android */
  ledColor?: string;
  /** Priority level */
  priority: "low" | "normal" | "high";
  /** Whether to group notifications */
  groupNotifications: boolean;
  /** Whether to show as heads-up notification */
  headsUp: boolean;
}

// ============================================================================
// Desktop Notification Settings
// ============================================================================

/**
 * Desktop notification settings
 */
export interface DesktopNotificationSettings {
  /** Whether desktop notifications are enabled */
  enabled: boolean;
  /** Browser permission status */
  permission: NotificationPermission | "default";
  /** Whether to show message preview */
  showPreview: boolean;
  /** Whether to show sender avatar */
  showAvatar: boolean;
  /** Whether to play sound */
  playSound: boolean;
  /** Duration to show notification (ms, 0 = system default) */
  duration: number;
  /** Position on screen */
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Whether to require user interaction to dismiss */
  requireInteraction: boolean;
  /** Whether to show even when window is focused */
  showWhenFocused: boolean;
  /** Stack multiple notifications */
  stackNotifications: boolean;
  /** Maximum stacked notifications */
  maxStacked: number;
}

// ============================================================================
// Email Notification Settings
// ============================================================================

/**
 * Email notification settings
 */
export interface EmailNotificationSettings {
  /** Whether email notifications are enabled */
  enabled: boolean;
  /** Email address for notifications */
  email?: string;
  /** Digest frequency */
  digestFrequency: EmailDigestFrequency;
  /** Include activity summary in digest */
  includeActivitySummary: boolean;
  /** Include message previews */
  includePreview: boolean;
  /** Include unread count */
  includeUnreadCount: boolean;
  /** Notification types to include in email */
  enabledTypes: NotificationType[];
  /** Time to send daily/weekly digest (HH:mm) */
  digestTime: string;
  /** Day for weekly digest (0-6) */
  weeklyDigestDay: DayOfWeek;
  /** Whether to send immediate email for urgent notifications */
  urgentImmediate: boolean;
}

// ============================================================================
// Notification Filters
// ============================================================================

/**
 * Filter tab options
 */
export type NotificationFilterTab =
  | "all"
  | "mentions"
  | "threads"
  | "reactions"
  | "dms"
  | "unread";

/**
 * Notification filter configuration
 */
export interface NotificationFilter {
  id: string;
  name: string;
  description?: string;
  /** Filter by notification types */
  types?: NotificationType[];
  /** Filter by channels */
  channelIds?: string[];
  /** Filter by users */
  userIds?: string[];
  /** Filter by read status */
  unreadOnly?: boolean;
  /** Filter by priority */
  priorities?: NotificationPriority[];
  /** Filter by date range */
  dateRange?: {
    from?: string;
    to?: string;
  };
  /** Sort order */
  sortBy?: "date" | "priority" | "type";
  sortDirection?: "asc" | "desc";
}

// ============================================================================
// Notification History
// ============================================================================

/**
 * Notification history entry
 */
export interface NotificationHistoryEntry {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  actor?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  channelId?: string;
  channelName?: string;
  messageId?: string;
  threadId?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  deliveredVia: NotificationDeliveryMethod[];
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Notification history query options
 */
export interface NotificationHistoryQueryOptions {
  limit?: number;
  offset?: number;
  filter?: NotificationFilter;
  includeArchived?: boolean;
}

// ============================================================================
// Global Notification Preferences
// ============================================================================

/**
 * Complete notification preferences
 */
export interface NotificationPreferences {
  // Global toggles
  globalEnabled: boolean;

  // Desktop settings
  desktop: DesktopNotificationSettings;

  // Mobile push settings
  push: PushNotificationSettings;

  // Email settings
  email: EmailNotificationSettings;

  // Sound settings
  sound: NotificationSoundSettings;

  // Quiet hours
  quietHours: QuietHoursSchedule;
  weekendQuietHours?: WeekendQuietHours;

  // Type-specific settings
  mentions: MentionSettings;
  directMessages: DMNotificationSettings;
  threadReplies: boolean;
  reactions: boolean;
  channelInvites: boolean;
  channelUpdates: boolean;
  announcements: boolean;

  // Keywords
  keywords: KeywordNotification[];

  // Per-channel settings
  channelSettings: Record<string, ChannelNotificationSetting>;

  // Filters
  savedFilters: NotificationFilter[];

  // Preview and display
  showSenderName: boolean;
  showMessagePreview: boolean;

  // Timestamps
  lastUpdated: string;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_QUIET_HOURS: QuietHoursSchedule = {
  enabled: false,
  startTime: "22:00",
  endTime: "08:00",
  days: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
  allowMentionsBreakthrough: true,
  enableOnWeekends: true,
  autoSetStatus: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export const DEFAULT_SOUND_SETTINGS: NotificationSoundSettings = {
  enabled: true,
  volume: 80,
  defaultSound: "default",
  mentionSound: "mention",
  dmSound: "dm",
  threadSound: "thread",
  reactionSound: "reaction",
  playWhenFocused: false,
};

export const DEFAULT_DESKTOP_SETTINGS: DesktopNotificationSettings = {
  enabled: true,
  permission: "default",
  showPreview: true,
  showAvatar: true,
  playSound: true,
  duration: 5000,
  position: "top-right",
  requireInteraction: false,
  showWhenFocused: false,
  stackNotifications: true,
  maxStacked: 5,
};

export const DEFAULT_PUSH_SETTINGS: PushNotificationSettings = {
  enabled: true,
  showPreview: true,
  playSound: true,
  vibrate: true,
  priority: "normal",
  groupNotifications: true,
  headsUp: true,
};

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  enabled: false,
  digestFrequency: "daily",
  includeActivitySummary: true,
  includePreview: true,
  includeUnreadCount: true,
  enabledTypes: ["mention", "direct_message"],
  digestTime: "09:00",
  weeklyDigestDay: 1,
  urgentImmediate: true,
};

export const DEFAULT_MENTION_SETTINGS: MentionSettings = {
  enabled: true,
  notifyOnUserMention: true,
  notifyOnHere: true,
  notifyOnChannel: true,
  notifyOnEveryone: true,
  desktop: true,
  mobile: true,
  email: true,
  breakThroughQuietHours: true,
  highlightInMessages: true,
  showBadge: true,
};

export const DEFAULT_DM_SETTINGS: DMNotificationSettings = {
  enabled: true,
  desktop: true,
  mobile: true,
  email: false,
  showPreview: true,
  playSound: true,
  allowDuringQuietHours: false,
  mutedConversations: [],
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  globalEnabled: true,
  desktop: DEFAULT_DESKTOP_SETTINGS,
  push: DEFAULT_PUSH_SETTINGS,
  email: DEFAULT_EMAIL_SETTINGS,
  sound: DEFAULT_SOUND_SETTINGS,
  quietHours: DEFAULT_QUIET_HOURS,
  mentions: DEFAULT_MENTION_SETTINGS,
  directMessages: DEFAULT_DM_SETTINGS,
  threadReplies: true,
  reactions: false,
  channelInvites: true,
  channelUpdates: true,
  announcements: true,
  keywords: [],
  channelSettings: {},
  savedFilters: [],
  showSenderName: true,
  showMessagePreview: true,
  lastUpdated: new Date().toISOString(),
};
