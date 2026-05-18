/**
 * Presence System - Central export file
 *
 * Provides user presence, status, activity, and typing functionality.
 */

// Types
export * from "./presence-types";

// Utilities
export {
  IdleDetector,
  getIdleDetector,
  destroyIdleDetector,
} from "./idle-detector";
export {
  TypingTracker,
  getTypingTracker,
  destroyTypingTracker,
  getTypingText,
} from "./typing-tracker";
export {
  PresenceTracker,
  getPresenceTracker,
  destroyPresenceTracker,
} from "./presence-tracker";
export {
  PresenceBroadcaster,
  getPresenceBroadcaster,
  destroyPresenceBroadcaster,
} from "./presence-broadcaster";
export {
  PresenceManager,
  initializePresenceManager,
  getPresenceManager,
  destroyPresenceManager,
} from "./presence-manager";

// Platform-specific presence
// Note: Some types are redefined in platform-presence for platform-specific semantics
// Import platform-presence directly when needing platform-specific configurations
export {
  // Platform types
  type PlatformPreset,
  type LastSeenPrivacy,
  type ReadReceiptPrivacy,
  type TypingPrivacy,
  type PlatformPresenceConfig,
  type ReceiptStyle,
  type PresencePrivacySettings,
  type ConversationPrivacyOverride,
  type UserPresenceState,
  type UserActivity,
  type PresenceTransitionRules,
  type UserTypingState,
  type ConversationTypingState,
  type MessageReadReceipt,
  type MessageDeliveryState,

  // Platform configurations
  getPlatformConfig,
  PLATFORM_CONFIGS,
  WHATSAPP_CONFIG,
  TELEGRAM_CONFIG,
  SIGNAL_CONFIG,
  SLACK_CONFIG,
  DISCORD_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_TRANSITION_RULES,

  // Platform-specific helper functions (avoid conflicts with presence-types)
  formatTypingText,
  formatSeenByText,
  getDeliveryStatusIcon,
  getDeliveryStatusColor,
  shouldShowReadReceipts,
  shouldSendTypingIndicator,
  isPresenceVisibleTo,
  isLastSeenVisibleTo,
} from "./platform-presence";
