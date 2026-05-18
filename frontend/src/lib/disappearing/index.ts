/**
 * Disappearing Messages Module
 *
 * Exports all disappearing message functionality.
 */

// Types
export * from "./disappearing-types";

// Settings management
export {
  getChannelSettings,
  saveChannelSettings,
  enableDisappearing,
  disableDisappearing,
  isDisappearingEnabled,
  getDefaultDuration,
  getSecretChatSettings,
  saveSecretChatSettings,
  isSecretChat,
  removeSecretChat,
  getUserPreferences,
  saveUserPreferences,
  canModifySettings,
  getTimerOptions,
  isValidDuration,
  syncSettingsFromServer,
  syncSettingsToServer,
} from "./disappearing-settings";

// Scheduler
export {
  getScheduler,
  createScheduler,
  createDisappearingData,
  markAsViewed,
  startBurnReading,
} from "./disappearing-scheduler";

// Manager
export {
  getDisappearingManager,
  createDisappearingManager,
  initializeDisappearingManager,
  type DisappearingManagerCallbacks,
  type MessageWithDisappearing,
} from "./disappearing-manager";

// Self-destruct
export {
  getDefaultOptions,
  prepareForDestruction,
  executeSelfDestruct,
  getBurnAnimationStyles,
  getDissolveAnimationStyles,
  getFadeAnimationStyles,
  getAnimationStyles,
  secureClear,
  clearMessageContent,
  batchDestruct,
  findExpiredMessages,
  type SelfDestructOptions,
  type DestructionResult,
} from "./self-destruct";

// View once
export {
  isViewOnceMessage,
  canViewMessage,
  getViewOnceState,
  getPlaceholderText,
  getViewOnceIcon,
  createViewOnceData,
  markViewOnceAsViewed,
  ViewOnceSession,
  getBlurredPlaceholderStyles,
  getViewOnceStatusText,
  getViewOnceWarning,
  formatOpenedText,
  VIEW_ONCE_PLACEHOLDERS,
  VIEW_ONCE_ICONS,
  type ViewOnceMediaInfo,
  type ViewOnceMessage,
  type ViewOnceState,
} from "./view-once";
