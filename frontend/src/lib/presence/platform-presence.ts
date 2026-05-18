/**
 * Platform Presence System - Unified presence, typing, and read receipt handling
 *
 * This module provides platform-specific semantics for presence indicators,
 * typing states, and read receipts matching WhatsApp, Telegram, Signal, Slack,
 * and Discord behaviors.
 *
 * @module lib/presence/platform-presence
 * @version 1.0.0
 */

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/**
 * Supported platform presets for presence/receipt behavior
 */
export type PlatformPreset =
  | "whatsapp"
  | "telegram"
  | "signal"
  | "slack"
  | "discord"
  | "default";

/**
 * Presence status types
 */
export type PresenceStatus =
  | "online"
  | "away"
  | "busy"
  | "dnd"
  | "invisible"
  | "offline";

/**
 * Message delivery status
 */
export type DeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/**
 * Last seen privacy levels
 */
export type LastSeenPrivacy = "everyone" | "contacts" | "nobody";

/**
 * Read receipt privacy levels
 */
export type ReadReceiptPrivacy = "enabled" | "disabled" | "contacts-only";

/**
 * Typing indicator visibility
 */
export type TypingPrivacy = "enabled" | "disabled";

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

/**
 * Platform-specific presence configuration
 */
export interface PlatformPresenceConfig {
  /** Platform identifier */
  platform: PlatformPreset;

  /** Presence features */
  presence: {
    /** Whether online status is shown */
    showOnline: boolean;
    /** Whether last seen is shown */
    showLastSeen: boolean;
    /** Whether custom status messages are supported */
    customStatus: boolean;
    /** Whether activity status is shown (e.g., "Playing Spotify") */
    activityStatus: boolean;
    /** Auto-away timeout in minutes (0 = disabled) */
    autoAwayTimeout: number;
    /** Idle detection timeout in minutes */
    idleTimeout: number;
    /** Whether DND (Do Not Disturb) is supported */
    dndSupported: boolean;
    /** Whether invisible mode is supported */
    invisibleSupported: boolean;
    /** Available status options */
    availableStatuses: PresenceStatus[];
  };

  /** Typing indicator features */
  typing: {
    /** Whether typing indicators are shown */
    enabled: boolean;
    /** Timeout for typing indicator in seconds */
    timeout: number;
    /** Throttle interval for sending typing events in ms */
    throttleInterval: number;
    /** Whether to show typing in groups */
    showInGroups: boolean;
    /** Whether to show typing in DMs */
    showInDMs: boolean;
    /** Whether typing shows user name(s) */
    showTyperNames: boolean;
    /** Max typers to show before "X others" */
    maxTypersDisplayed: number;
  };

  /** Read receipt features */
  receipts: {
    /** Whether read receipts are supported */
    enabled: boolean;
    /** Whether read receipts can be disabled by user */
    userOptOut: boolean;
    /** Whether to show delivery status (sent/delivered) */
    showDeliveryStatus: boolean;
    /** Whether to show read status */
    showReadStatus: boolean;
    /** Whether to show read receipts in groups */
    groupReceipts: boolean;
    /** Max readers to show avatars for */
    maxReadersDisplayed: number;
    /** Style of read receipts */
    style: ReceiptStyle;
  };

  /** Privacy default settings */
  privacyDefaults: {
    lastSeen: LastSeenPrivacy;
    readReceipts: ReadReceiptPrivacy;
    typingIndicator: TypingPrivacy;
  };
}

/**
 * Receipt display style
 */
export interface ReceiptStyle {
  /** Pending icon (e.g., clock) */
  pendingIcon: string;
  /** Sent icon (single check) */
  sentIcon: string;
  /** Delivered icon (double check gray) */
  deliveredIcon: string;
  /** Read icon (double check blue/green) */
  readIcon: string;
  /** Failed icon */
  failedIcon: string;
  /** Color for sent/delivered */
  sentColor: string;
  /** Color for read */
  readColor: string;
  /** Whether to use checkmarks or other icons */
  useCheckmarks: boolean;
  /** Whether to show "Seen by X" text in groups */
  showSeenByText: boolean;
  /** Whether to show reader avatars */
  showReaderAvatars: boolean;
}

// ============================================================================
// PLATFORM CONFIGURATIONS
// ============================================================================

/**
 * WhatsApp-style presence configuration
 * - Blue double ticks for read
 * - Last seen privacy controls
 * - Read receipts can be disabled (but then you can't see others')
 */
export const WHATSAPP_CONFIG: PlatformPresenceConfig = {
  platform: "whatsapp",
  presence: {
    showOnline: true,
    showLastSeen: true,
    customStatus: true,
    activityStatus: false,
    autoAwayTimeout: 0,
    idleTimeout: 0,
    dndSupported: false,
    invisibleSupported: false,
    availableStatuses: ["online", "offline"],
  },
  typing: {
    enabled: true,
    timeout: 5,
    throttleInterval: 2000,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: true,
    maxTypersDisplayed: 3,
  },
  receipts: {
    enabled: true,
    userOptOut: true, // If disabled, you can't see others' receipts either
    showDeliveryStatus: true,
    showReadStatus: true,
    groupReceipts: true,
    maxReadersDisplayed: 0, // Just shows count
    style: {
      pendingIcon: "clock",
      sentIcon: "check",
      deliveredIcon: "check-check",
      readIcon: "check-check",
      failedIcon: "alert-circle",
      sentColor: "#9E9E9E", // Gray
      readColor: "#53BDEB", // WhatsApp blue
      useCheckmarks: true,
      showSeenByText: false,
      showReaderAvatars: false,
    },
  },
  privacyDefaults: {
    lastSeen: "everyone",
    readReceipts: "enabled",
    typingIndicator: "enabled",
  },
};

/**
 * Telegram-style presence configuration
 * - Double checks for delivery/read (green when read)
 * - Last seen approximations (recently, within week, etc.)
 * - No read receipts in groups
 */
export const TELEGRAM_CONFIG: PlatformPresenceConfig = {
  platform: "telegram",
  presence: {
    showOnline: true,
    showLastSeen: true,
    customStatus: true,
    activityStatus: false,
    autoAwayTimeout: 0,
    idleTimeout: 0,
    dndSupported: false,
    invisibleSupported: true, // Can hide last seen completely
    availableStatuses: ["online", "offline"],
  },
  typing: {
    enabled: true,
    timeout: 5,
    throttleInterval: 2000,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: true,
    maxTypersDisplayed: 4,
  },
  receipts: {
    enabled: true,
    userOptOut: false, // Can't disable receipts
    showDeliveryStatus: true,
    showReadStatus: true,
    groupReceipts: false, // Telegram doesn't show read receipts in groups
    maxReadersDisplayed: 0,
    style: {
      pendingIcon: "clock",
      sentIcon: "check",
      deliveredIcon: "check-check",
      readIcon: "check-check",
      failedIcon: "x-circle",
      sentColor: "#A0B8C9", // Gray-blue
      readColor: "#4FAE4E", // Telegram green
      useCheckmarks: true,
      showSeenByText: false,
      showReaderAvatars: false,
    },
  },
  privacyDefaults: {
    lastSeen: "everyone",
    readReceipts: "enabled",
    typingIndicator: "enabled",
  },
};

/**
 * Signal-style presence configuration
 * - Privacy-first approach
 * - Read receipts disabled by default
 * - Minimal presence information
 */
export const SIGNAL_CONFIG: PlatformPresenceConfig = {
  platform: "signal",
  presence: {
    showOnline: false, // Signal doesn't show online status
    showLastSeen: false, // No last seen
    customStatus: false,
    activityStatus: false,
    autoAwayTimeout: 0,
    idleTimeout: 0,
    dndSupported: false,
    invisibleSupported: false,
    availableStatuses: ["online", "offline"],
  },
  typing: {
    enabled: true,
    timeout: 4,
    throttleInterval: 2000,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: false, // Just shows "typing..."
    maxTypersDisplayed: 1,
  },
  receipts: {
    enabled: true,
    userOptOut: true, // Privacy-first - can disable
    showDeliveryStatus: true,
    showReadStatus: true,
    groupReceipts: false, // No group receipts for privacy
    maxReadersDisplayed: 0,
    style: {
      pendingIcon: "circle",
      sentIcon: "circle-check",
      deliveredIcon: "circle-check-filled",
      readIcon: "circle-check-filled",
      failedIcon: "circle-x",
      sentColor: "#86898C", // Gray
      readColor: "#2C6BED", // Signal blue
      useCheckmarks: false, // Uses filled circles
      showSeenByText: false,
      showReaderAvatars: false,
    },
  },
  privacyDefaults: {
    lastSeen: "nobody",
    readReceipts: "disabled", // Disabled by default
    typingIndicator: "enabled",
  },
};

/**
 * Slack-style presence configuration
 * - Green dot for online
 * - Idle (away) detection
 * - "Seen by" avatars in channels
 */
export const SLACK_CONFIG: PlatformPresenceConfig = {
  platform: "slack",
  presence: {
    showOnline: true,
    showLastSeen: false, // Shows "Active X minutes ago" instead
    customStatus: true, // Emoji + text status
    activityStatus: true, // "In a meeting", "On a call"
    autoAwayTimeout: 30, // 30 minutes
    idleTimeout: 10, // 10 minutes
    dndSupported: true, // Do Not Disturb schedules
    invisibleSupported: false,
    availableStatuses: ["online", "away", "dnd", "offline"],
  },
  typing: {
    enabled: true,
    timeout: 5,
    throttleInterval: 3000,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: true,
    maxTypersDisplayed: 3,
  },
  receipts: {
    enabled: true,
    userOptOut: false,
    showDeliveryStatus: false, // Slack doesn't show sent/delivered
    showReadStatus: true,
    groupReceipts: true, // Shows "Seen by X"
    maxReadersDisplayed: 5, // Shows up to 5 avatars
    style: {
      pendingIcon: "clock",
      sentIcon: "check",
      deliveredIcon: "check",
      readIcon: "eye",
      failedIcon: "alert-triangle",
      sentColor: "#ABABAD",
      readColor: "#1D1C1D", // Slack dark
      useCheckmarks: false,
      showSeenByText: true, // "Seen by Alice, Bob, and 3 others"
      showReaderAvatars: true,
    },
  },
  privacyDefaults: {
    lastSeen: "everyone",
    readReceipts: "enabled",
    typingIndicator: "enabled",
  },
};

/**
 * Discord-style presence configuration
 * - Rich presence with activities
 * - Per-channel presence
 * - No message read receipts (except for DMs)
 */
export const DISCORD_CONFIG: PlatformPresenceConfig = {
  platform: "discord",
  presence: {
    showOnline: true,
    showLastSeen: false,
    customStatus: true, // Custom status with emoji
    activityStatus: true, // "Playing...", "Listening to...", etc.
    autoAwayTimeout: 10,
    idleTimeout: 5,
    dndSupported: true,
    invisibleSupported: true,
    availableStatuses: ["online", "away", "dnd", "invisible", "offline"],
  },
  typing: {
    enabled: true,
    timeout: 8,
    throttleInterval: 2500,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: true,
    maxTypersDisplayed: 4,
  },
  receipts: {
    enabled: false, // Discord doesn't have read receipts in servers
    userOptOut: false,
    showDeliveryStatus: false,
    showReadStatus: false,
    groupReceipts: false,
    maxReadersDisplayed: 0,
    style: {
      pendingIcon: "clock",
      sentIcon: "check",
      deliveredIcon: "check",
      readIcon: "check",
      failedIcon: "x",
      sentColor: "#72767D",
      readColor: "#72767D",
      useCheckmarks: false,
      showSeenByText: false,
      showReaderAvatars: false,
    },
  },
  privacyDefaults: {
    lastSeen: "nobody",
    readReceipts: "disabled",
    typingIndicator: "enabled",
  },
};

/**
 * Default configuration (balanced approach)
 */
export const DEFAULT_CONFIG: PlatformPresenceConfig = {
  platform: "default",
  presence: {
    showOnline: true,
    showLastSeen: true,
    customStatus: true,
    activityStatus: false,
    autoAwayTimeout: 5,
    idleTimeout: 5,
    dndSupported: true,
    invisibleSupported: true,
    availableStatuses: [
      "online",
      "away",
      "busy",
      "dnd",
      "invisible",
      "offline",
    ],
  },
  typing: {
    enabled: true,
    timeout: 5,
    throttleInterval: 2000,
    showInGroups: true,
    showInDMs: true,
    showTyperNames: true,
    maxTypersDisplayed: 3,
  },
  receipts: {
    enabled: true,
    userOptOut: true,
    showDeliveryStatus: true,
    showReadStatus: true,
    groupReceipts: true,
    maxReadersDisplayed: 3,
    style: {
      pendingIcon: "clock",
      sentIcon: "check",
      deliveredIcon: "check-check",
      readIcon: "check-check",
      failedIcon: "alert-circle",
      sentColor: "#6B7280", // Gray
      readColor: "#3B82F6", // Blue
      useCheckmarks: true,
      showSeenByText: true,
      showReaderAvatars: true,
    },
  },
  privacyDefaults: {
    lastSeen: "everyone",
    readReceipts: "enabled",
    typingIndicator: "enabled",
  },
};

/**
 * Get platform configuration by preset name
 */
export function getPlatformConfig(
  preset: PlatformPreset,
): PlatformPresenceConfig {
  switch (preset) {
    case "whatsapp":
      return WHATSAPP_CONFIG;
    case "telegram":
      return TELEGRAM_CONFIG;
    case "signal":
      return SIGNAL_CONFIG;
    case "slack":
      return SLACK_CONFIG;
    case "discord":
      return DISCORD_CONFIG;
    default:
      return DEFAULT_CONFIG;
  }
}

/**
 * All available platform configurations
 */
export const PLATFORM_CONFIGS: Record<PlatformPreset, PlatformPresenceConfig> =
  {
    whatsapp: WHATSAPP_CONFIG,
    telegram: TELEGRAM_CONFIG,
    signal: SIGNAL_CONFIG,
    slack: SLACK_CONFIG,
    discord: DISCORD_CONFIG,
    default: DEFAULT_CONFIG,
  };

// ============================================================================
// USER PRIVACY SETTINGS
// ============================================================================

/**
 * User's privacy settings for presence and receipts
 */
export interface PresencePrivacySettings {
  /** Who can see last seen */
  lastSeenVisibility: LastSeenPrivacy;

  /** Who can see online status */
  onlineStatusVisibility: LastSeenPrivacy;

  /** Whether to send read receipts */
  sendReadReceipts: boolean;

  /** Whether to show typing indicators */
  sendTypingIndicators: boolean;

  /** Per-conversation overrides */
  conversationOverrides: Map<string, ConversationPrivacyOverride>;
}

/**
 * Per-conversation privacy override
 */
export interface ConversationPrivacyOverride {
  /** Conversation ID */
  conversationId: string;

  /** Override read receipts (null = use global) */
  readReceipts?: boolean | null;

  /** Override typing indicators (null = use global) */
  typingIndicators?: boolean | null;
}

/**
 * Default privacy settings
 */
export const DEFAULT_PRIVACY_SETTINGS: PresencePrivacySettings = {
  lastSeenVisibility: "everyone",
  onlineStatusVisibility: "everyone",
  sendReadReceipts: true,
  sendTypingIndicators: true,
  conversationOverrides: new Map(),
};

// ============================================================================
// PRESENCE STATE ENGINE
// ============================================================================

/**
 * Full presence state for a user
 */
export interface UserPresenceState {
  /** User ID */
  userId: string;

  /** Current status */
  status: PresenceStatus;

  /** Custom status message */
  customStatusText?: string;

  /** Custom status emoji */
  customStatusEmoji?: string;

  /** Custom status expiry */
  customStatusExpiresAt?: Date;

  /** Last seen timestamp (if visible) */
  lastSeenAt?: Date;

  /** Last activity (for idle detection) */
  lastActivityAt: Date;

  /** Whether user is idle */
  isIdle: boolean;

  /** Current activity (for rich presence) */
  activity?: UserActivity;

  /** Device type */
  device?: "desktop" | "mobile" | "web";
}

/**
 * User activity for rich presence
 */
export interface UserActivity {
  /** Activity type */
  type: "playing" | "watching" | "listening" | "streaming" | "custom";

  /** Activity name */
  name: string;

  /** Activity details */
  details?: string;

  /** Activity state */
  state?: string;

  /** Start time */
  startedAt?: Date;

  /** End time (estimated) */
  endsAt?: Date;

  /** Associated image/icon */
  imageUrl?: string;
}

/**
 * Presence state transition rules
 */
export interface PresenceTransitionRules {
  /** Whether to auto-transition to away when idle */
  autoAway: boolean;

  /** Idle timeout before auto-away (ms) */
  idleTimeout: number;

  /** Whether to restore previous status when active again */
  restoreOnActive: boolean;

  /** Statuses that block auto-away */
  autoAwayExemptStatuses: PresenceStatus[];
}

/**
 * Default transition rules
 */
export const DEFAULT_TRANSITION_RULES: PresenceTransitionRules = {
  autoAway: true,
  idleTimeout: 5 * 60 * 1000, // 5 minutes
  restoreOnActive: true,
  autoAwayExemptStatuses: ["dnd", "invisible"],
};

// ============================================================================
// TYPING STATE
// ============================================================================

/**
 * Typing state for a user in a conversation
 */
export interface UserTypingState {
  /** User ID */
  userId: string;

  /** User display name */
  userName: string;

  /** User avatar URL */
  userAvatar?: string;

  /** Conversation ID (channel, thread, or DM) */
  conversationId: string;

  /** When typing started */
  startedAt: Date;

  /** When typing will expire */
  expiresAt: Date;
}

/**
 * Aggregated typing state for a conversation
 */
export interface ConversationTypingState {
  /** Conversation ID */
  conversationId: string;

  /** Users currently typing */
  typingUsers: UserTypingState[];

  /** Last update timestamp */
  lastUpdatedAt: Date;
}

// ============================================================================
// READ RECEIPT STATE
// ============================================================================

/**
 * Read receipt for a message
 */
export interface MessageReadReceipt {
  /** Message ID */
  messageId: string;

  /** User who read the message */
  userId: string;

  /** User display name */
  userName: string;

  /** User avatar URL */
  userAvatar?: string;

  /** When the message was read */
  readAt: Date;
}

/**
 * Delivery status for a message
 */
export interface MessageDeliveryState {
  /** Message ID */
  messageId: string;

  /** Current delivery status */
  status: DeliveryStatus;

  /** When sent */
  sentAt?: Date;

  /** When delivered to server */
  deliveredAt?: Date;

  /** When first read */
  firstReadAt?: Date;

  /** Read receipts */
  readBy: MessageReadReceipt[];

  /** Total recipients (for group messages) */
  totalRecipients?: number;

  /** Whether all recipients have read */
  allRead: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format last seen time based on platform style
 */
export function formatLastSeen(
  lastSeenAt: Date | undefined,
  platform: PlatformPreset = "default",
): string {
  if (!lastSeenAt) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - lastSeenAt.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Telegram-style approximations
  if (platform === "telegram") {
    if (diffMins < 1) return "online";
    if (diffDays < 1) return "last seen recently";
    if (diffDays < 7) return "last seen within a week";
    if (diffDays < 30) return "last seen within a month";
    return "last seen a long time ago";
  }

  // Slack-style
  if (platform === "slack") {
    if (diffMins < 1) return "Active";
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return "Away";
  }

  // WhatsApp/default style
  if (diffMins < 1) return "online";
  if (diffMins < 60)
    return `last seen ${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `last seen ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "last seen yesterday";
  if (diffDays < 7) return `last seen ${diffDays} days ago`;

  return `last seen ${lastSeenAt.toLocaleDateString()}`;
}

/**
 * Format typing indicator text
 */
export function formatTypingText(
  typingUsers: UserTypingState[],
  config: PlatformPresenceConfig,
): string {
  if (typingUsers.length === 0) return "";

  if (!config.typing.showTyperNames) {
    return "typing...";
  }

  const names = typingUsers
    .slice(0, config.typing.maxTypersDisplayed)
    .map((u) => u.userName);
  const remaining = Math.max(
    0,
    typingUsers.length - config.typing.maxTypersDisplayed,
  );

  // If there are more users than displayed, always show "X others"
  if (remaining > 0) {
    return `${names.join(", ")}, and ${remaining} other${remaining > 1 ? "s" : ""} are typing...`;
  }

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  // 3 or more names, no remaining
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]} are typing...`;
}

/**
 * Format "seen by" text for group messages
 */
export function formatSeenByText(
  readBy: MessageReadReceipt[],
  totalRecipients: number,
  config: PlatformPresenceConfig,
): string {
  if (readBy.length === 0) return "";

  if (!config.receipts.style.showSeenByText) {
    return "";
  }

  const names = readBy
    .slice(0, config.receipts.maxReadersDisplayed)
    .map((r) => r.userName);
  const remaining = Math.max(
    0,
    readBy.length - config.receipts.maxReadersDisplayed,
  );

  if (readBy.length === totalRecipients) {
    return "Seen by everyone";
  }

  if (names.length === 1) {
    return `Seen by ${names[0]}`;
  }

  if (remaining === 0) {
    return `Seen by ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  return `Seen by ${names.join(", ")} and ${remaining} other${remaining > 1 ? "s" : ""}`;
}

/**
 * Get status color for presence dot
 */
export function getPresenceColor(
  status: PresenceStatus,
  platform: PlatformPreset = "default",
): string {
  const colors: Record<PresenceStatus, string> = {
    online: platform === "slack" ? "#36C5F0" : "#22C55E",
    away: platform === "discord" ? "#FAA61A" : "#F59E0B",
    busy: "#EF4444",
    dnd: "#EF4444",
    invisible: "#6B7280",
    offline: "#6B7280",
  };
  return colors[status];
}

/**
 * Get icon name for delivery status
 */
export function getDeliveryStatusIcon(
  status: DeliveryStatus,
  config: PlatformPresenceConfig,
): string {
  switch (status) {
    case "pending":
      return config.receipts.style.pendingIcon;
    case "sent":
      return config.receipts.style.sentIcon;
    case "delivered":
      return config.receipts.style.deliveredIcon;
    case "read":
      return config.receipts.style.readIcon;
    case "failed":
      return config.receipts.style.failedIcon;
    default:
      return "circle";
  }
}

/**
 * Get color for delivery status
 */
export function getDeliveryStatusColor(
  status: DeliveryStatus,
  config: PlatformPresenceConfig,
): string {
  if (status === "read") {
    return config.receipts.style.readColor;
  }
  if (status === "failed") {
    return "#EF4444";
  }
  return config.receipts.style.sentColor;
}

/**
 * Check if read receipts should be shown based on privacy settings
 */
export function shouldShowReadReceipts(
  userSettings: PresencePrivacySettings,
  conversationId: string,
  platformConfig: PlatformPresenceConfig,
): boolean {
  // Platform doesn't support receipts
  if (!platformConfig.receipts.enabled) return false;

  // Check conversation override
  const override = userSettings.conversationOverrides.get(conversationId);
  if (override?.readReceipts !== null && override?.readReceipts !== undefined) {
    return override.readReceipts;
  }

  // Use global setting
  return userSettings.sendReadReceipts;
}

/**
 * Check if typing indicators should be sent
 */
export function shouldSendTypingIndicator(
  userSettings: PresencePrivacySettings,
  conversationId: string,
  platformConfig: PlatformPresenceConfig,
): boolean {
  // Platform doesn't support typing
  if (!platformConfig.typing.enabled) return false;

  // Check conversation override
  const override = userSettings.conversationOverrides.get(conversationId);
  if (
    override?.typingIndicators !== null &&
    override?.typingIndicators !== undefined
  ) {
    return override.typingIndicators;
  }

  // Use global setting
  return userSettings.sendTypingIndicators;
}

/**
 * Determine if presence should be visible to viewer based on privacy settings
 */
export function isPresenceVisibleTo(
  presenceOwnerSettings: PresencePrivacySettings,
  viewerId: string,
  isContact: boolean,
): boolean {
  const visibility = presenceOwnerSettings.onlineStatusVisibility;

  switch (visibility) {
    case "everyone":
      return true;
    case "contacts":
      return isContact;
    case "nobody":
      return false;
    default:
      return true;
  }
}

/**
 * Determine if last seen should be visible to viewer
 */
export function isLastSeenVisibleTo(
  presenceOwnerSettings: PresencePrivacySettings,
  viewerId: string,
  isContact: boolean,
): boolean {
  const visibility = presenceOwnerSettings.lastSeenVisibility;

  switch (visibility) {
    case "everyone":
      return true;
    case "contacts":
      return isContact;
    case "nobody":
      return false;
    default:
      return true;
  }
}
