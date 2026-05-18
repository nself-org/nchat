/**
 * Disappearing Messages Types for nself-chat
 *
 * Type definitions for ephemeral messaging, view-once media,
 * and self-destructing messages.
 */

// ============================================================================
// Timer Duration Types
// ============================================================================

/**
 * Preset timer durations in seconds.
 */
export type DisappearingTimerPreset =
  | 0 // Off (messages persist)
  | 86400 // 24 hours
  | 604800 // 7 days
  | 2592000 // 30 days
  | 7776000; // 90 days

/**
 * All available timer duration options with labels.
 */
export const DISAPPEARING_TIMER_OPTIONS: {
  value: number;
  label: string;
  shortLabel: string;
}[] = [
  { value: 0, label: "Off", shortLabel: "Off" },
  { value: 86400, label: "24 hours", shortLabel: "24h" },
  { value: 604800, label: "7 days", shortLabel: "7d" },
  { value: 2592000, label: "30 days", shortLabel: "30d" },
  { value: 7776000, label: "90 days", shortLabel: "90d" },
];

/**
 * Timer preset lookup by value.
 */
export const TIMER_PRESETS: Record<number, string> = {
  0: "Off",
  86400: "24 hours",
  604800: "7 days",
  2592000: "30 days",
  7776000: "90 days",
};

/**
 * Get human-readable label for a duration in seconds.
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "Off";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Get countdown display string (for remaining time).
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Expiring...";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

// ============================================================================
// Message Disappearing Types
// ============================================================================

/**
 * Types of disappearing message behavior.
 */
export type DisappearingMessageType =
  | "regular" // Timer starts on send
  | "view_once" // Delete after first view
  | "burn_after_reading"; // Delete X seconds after read

/**
 * Labels for disappearing message types.
 */
export const DISAPPEARING_TYPE_LABELS: Record<DisappearingMessageType, string> =
  {
    regular: "Auto-delete",
    view_once: "View once",
    burn_after_reading: "Burn after reading",
  };

/**
 * Burn after reading timer options (in seconds).
 */
export const BURN_TIMER_OPTIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
];

// ============================================================================
// Disappearing Message Data
// ============================================================================

/**
 * Disappearing message configuration attached to a message.
 */
export interface DisappearingMessageData {
  /** Type of disappearing behavior */
  type: DisappearingMessageType;
  /** Timer duration in seconds (for regular type) */
  timerDuration?: number;
  /** Burn timer in seconds (for burn_after_reading type) */
  burnTimer?: number;
  /** When the message was sent */
  sentAt: string;
  /** When the timer started (may differ from sentAt for burn_after_reading) */
  timerStartedAt?: string;
  /** Calculated expiration time */
  expiresAt?: string;
  /** Whether message has been viewed (for view_once) */
  hasBeenViewed?: boolean;
  /** When message was first viewed */
  viewedAt?: string;
  /** User ID who viewed (for view_once) */
  viewedBy?: string;
  /** Whether message is currently visible (burn after reading countdown active) */
  isReading?: boolean;
  /** When reading started (for burn_after_reading) */
  readingStartedAt?: string;
}

/**
 * Message with disappearing data.
 */
export interface DisappearingMessage {
  /** Message ID */
  id: string;
  /** Channel ID */
  channelId: string;
  /** User ID who sent */
  userId: string;
  /** Disappearing configuration */
  disappearing: DisappearingMessageData;
  /** Message content (may be encrypted or null if viewed) */
  content: string | null;
  /** Attachment URLs (may be null if viewed) */
  attachments?: string[] | null;
}

// ============================================================================
// Channel/DM Settings Types
// ============================================================================

/**
 * Disappearing message settings for a channel or DM.
 */
export interface DisappearingSettings {
  /** Whether disappearing messages are enabled */
  enabled: boolean;
  /** Default timer duration in seconds */
  defaultDuration: number;
  /** Who can modify settings */
  canModify: "owner" | "admin" | "all";
  /** Whether to show a banner indicating disappearing is enabled */
  showBanner: boolean;
  /** When settings were last changed */
  updatedAt: string;
  /** User who last changed settings */
  updatedBy?: string;
}

/**
 * Default disappearing settings.
 */
export const DEFAULT_DISAPPEARING_SETTINGS: DisappearingSettings = {
  enabled: false,
  defaultDuration: 86400, // 24 hours
  canModify: "admin",
  showBanner: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Secret chat settings (end-to-end encrypted with disappearing).
 */
export interface SecretChatSettings extends DisappearingSettings {
  /** Secret chat is always enabled with disappearing */
  enabled: true;
  /** End-to-end encryption enabled */
  isEncrypted: boolean;
  /** Screenshot detection/warning enabled */
  screenshotWarning: boolean;
  /** Prevent message forwarding */
  preventForwarding: boolean;
  /** Prevent text copying */
  preventCopying: boolean;
  /** Block notifications from showing content */
  hideNotificationContent: boolean;
}

/**
 * Default secret chat settings.
 */
export const DEFAULT_SECRET_CHAT_SETTINGS: SecretChatSettings = {
  enabled: true,
  defaultDuration: 86400,
  canModify: "all",
  showBanner: true,
  updatedAt: new Date().toISOString(),
  isEncrypted: true,
  screenshotWarning: true,
  preventForwarding: true,
  preventCopying: true,
  hideNotificationContent: true,
};

// ============================================================================
// User Preferences Types
// ============================================================================

/**
 * User's default preferences for disappearing messages.
 */
export interface DisappearingUserPreferences {
  /** Default timer for new DMs */
  defaultDMDuration: number;
  /** Default timer for new group chats */
  defaultGroupDuration: number;
  /** Whether to show disappearing indicator on messages */
  showIndicators: boolean;
  /** Whether to show countdown timer */
  showCountdown: boolean;
  /** Play sound when message is about to disappear */
  playSoundBeforeExpiry: boolean;
  /** Seconds before expiry to show warning */
  expiryWarningSeconds: number;
}

/**
 * Default user preferences.
 */
export const DEFAULT_USER_PREFERENCES: DisappearingUserPreferences = {
  defaultDMDuration: 0,
  defaultGroupDuration: 0,
  showIndicators: true,
  showCountdown: true,
  playSoundBeforeExpiry: false,
  expiryWarningSeconds: 60,
};

// ============================================================================
// Event Types
// ============================================================================

/**
 * Disappearing message events for socket.io.
 */
export interface DisappearingMessageEvent {
  /** Event type */
  type: "timer_started" | "message_expired" | "message_viewed" | "burn_started";
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Timestamp of event */
  timestamp: string;
  /** Additional data */
  data?: {
    expiresAt?: string;
    viewedBy?: string;
    burnEndsAt?: string;
  };
}

/**
 * Settings change event.
 */
export interface DisappearingSettingsChangeEvent {
  /** Channel or DM ID */
  channelId: string;
  /** User who changed settings */
  changedBy: string;
  /** Previous settings */
  previousSettings: DisappearingSettings;
  /** New settings */
  newSettings: DisappearingSettings;
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response when fetching disappearing messages state.
 */
export interface DisappearingMessagesState {
  /** Channel ID */
  channelId: string;
  /** Current settings */
  settings: DisappearingSettings;
  /** Active message timers */
  activeTimers: {
    messageId: string;
    expiresAt: string;
    type: DisappearingMessageType;
  }[];
  /** View-once messages not yet viewed */
  pendingViewOnce: string[];
}

/**
 * Response when viewing a view-once message.
 */
export interface ViewOnceResponse {
  /** Whether view was successful */
  success: boolean;
  /** Message content (only on first view) */
  content?: string;
  /** Attachments (only on first view) */
  attachments?: {
    id: string;
    url: string;
    type: string;
    name: string;
  }[];
  /** Error message if failed */
  error?: string;
  /** Whether content was already viewed */
  alreadyViewed?: boolean;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Screenshot detection event.
 */
export interface ScreenshotDetectionEvent {
  /** Channel ID where screenshot was detected */
  channelId: string;
  /** User who took screenshot */
  userId: string;
  /** Timestamp */
  timestamp: string;
  /** Message ID if specific message was visible */
  messageId?: string;
}

/**
 * Security warning types.
 */
export type SecurityWarningType =
  | "screenshot_detected"
  | "screen_recording_detected"
  | "forwarding_blocked"
  | "copy_blocked";

/**
 * Security warning event.
 */
export interface SecurityWarningEvent {
  type: SecurityWarningType;
  message: string;
  channelId?: string;
  messageId?: string;
  timestamp: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Check if a message has disappearing data.
 */
export function hasDisappearingData(message: {
  disappearing?: DisappearingMessageData | null;
}): message is { disappearing: DisappearingMessageData } {
  return message.disappearing !== null && message.disappearing !== undefined;
}

/**
 * Check if a message is expired.
 */
export function isMessageExpired(
  disappearing: DisappearingMessageData,
): boolean {
  if (!disappearing.expiresAt) return false;
  return new Date(disappearing.expiresAt) <= new Date();
}

/**
 * Get remaining time in seconds.
 */
export function getRemainingTime(
  disappearing: DisappearingMessageData,
): number {
  if (!disappearing.expiresAt) return -1;
  const remaining = Math.floor(
    (new Date(disappearing.expiresAt).getTime() - Date.now()) / 1000,
  );
  return Math.max(0, remaining);
}

/**
 * Calculate expiration date from settings.
 */
export function calculateExpiresAt(
  sentAt: Date,
  durationSeconds: number,
): Date | null {
  if (durationSeconds <= 0) return null;
  return new Date(sentAt.getTime() + durationSeconds * 1000);
}
