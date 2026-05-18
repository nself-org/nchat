/**
 * Notification Library - nself-chat
 *
 * Comprehensive notification management system including:
 * - Type definitions
 * - Preference management
 * - Quiet hours/DND
 * - Keyword matching
 * - Sound management
 * - Delivery channels
 * - Scheduling
 */

// Types
export * from "./notification-types";

// Notification Manager
export {
  NotificationManager,
  getNotificationManager,
  resetNotificationManager,
  type NotificationPayload,
  type DeliveryResult,
  type NotificationManagerOptions,
} from "./notification-manager";

// Preferences
export {
  loadPreferences,
  savePreferences,
  clearPreferences,
  updateGlobalEnabled,
  updateDesktopSettings,
  updatePushSettings,
  updateEmailSettings,
  updateSoundSettings,
  updateQuietHours,
  updateMentionSettings,
  updateDMSettings,
  getChannelSettings,
  updateChannelSettings,
  removeChannelSettings,
  muteChannel,
  unmuteChannel,
  setChannelLevel,
  addKeyword,
  updateKeyword,
  removeKeyword,
  toggleKeyword,
  validatePreferences,
  exportPreferences,
  importPreferences,
  getEffectiveSettings,
  hasAnyNotificationEnabled,
  getPreferencesSummary,
} from "./notification-preferences";

// Quiet Hours
export {
  parseTimeToMinutes,
  formatMinutesToTime,
  getCurrentTimeMinutes,
  getCurrentDayOfWeek,
  isWeekend,
  isInQuietHours,
  willBeInQuietHours,
  getTimeUntilQuietHoursEnd,
  getTimeUntilQuietHoursStart,
  formatRemainingTime,
  validateQuietHoursSchedule,
  getNextQuietHoursPeriod,
  isInWeekendQuietHours,
  createDefaultSchedule,
  getDayDisplayName,
  getAllDaysOfWeek,
  getWeekdays,
  getWeekendDays,
} from "./quiet-hours";

// Keyword Matching
export {
  escapeRegex,
  createKeywordPattern,
  matchKeyword,
  matchKeywords,
  hasKeywordMatch,
  highlightMatches,
  getHighlightedResult,
  createKeyword,
  validateKeyword,
  isDuplicateKeyword,
  getKeywordsForChannel,
  sortKeywords,
  searchKeywords,
  getKeywordStats,
  type MatchOptions,
  type HighlightedResult,
} from "./keyword-matcher";

// Sounds
export {
  NOTIFICATION_SOUNDS,
  DEFAULT_SOUNDS_BY_TYPE,
  playNotificationSound,
  playSoundForType,
  stopAllSounds,
  stopSound,
  preloadSounds,
  preloadSpecificSounds,
  areSoundsPreloaded,
  clearAudioCache,
  getSoundById,
  getSoundsByCategory,
  getAvailableSounds,
  getSoundName,
  addCustomSound,
  removeCustomSound,
  getCustomSounds,
  normalizeVolume,
  volumeToAudioLevel,
  getVolumeIcon,
  playTestSound,
  playTestBeep,
} from "./notification-sounds";

// Channels
export {
  isDesktopAvailable,
  getDesktopPermission,
  requestDesktopPermission,
  deliverDesktopNotification,
  isPushAvailable,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  deliverPushNotification,
  sendEmailNotification,
  registerInAppHandler,
  unregisterInAppHandler,
  deliverInAppNotification,
  getChannelStatuses,
  getAvailableMethods,
  deliverToChannels,
  type NotificationChannelStatus,
  type DeliveryPayload,
  type EmailPayload,
  type InAppNotificationHandler,
} from "./notification-channels";

// Scheduler
export {
  parseTimeForToday,
  getNextOccurrence,
  getNextDayOccurrence,
  getNextDigestTime,
  getDigestPeriod,
  shouldSendDigest,
  generateDigestContent,
  formatDigestAsText,
  formatDigestAsHtml,
  createScheduledNotification,
  getDueNotifications,
  processScheduledNotification,
  type ScheduledNotification,
  type DigestConfig,
  type DigestContent,
} from "./notification-scheduler";

// Channel Rules (enhanced per-channel notification rules)
export {
  createChannelRuleStore,
  createChannelRule,
  updateChannelRule,
  deleteChannelRule,
  getChannelRule,
  getAllChannelRules,
  getChannelRulesByLevel,
  muteChannelRule,
  unmuteChannelRule,
  isChannelRuleMuted,
  isMuteActive,
  cleanupExpiredMutes as cleanupExpiredChannelMutes,
  setThreadPreference,
  removeThreadPreference,
  getEffectiveThreadLevel,
  createCategoryRule,
  addCategoryRule,
  updateCategoryRule,
  deleteCategoryRule,
  addChannelToCategory,
  removeChannelFromCategory,
  evaluateChannelRule,
  resolveDeliveryMethods,
  getMutedChannels as getMutedChannelRules,
  getChannelsInCategory,
  getChannelRuleStats,
  type ChannelNotificationRule,
  type ChannelCategoryRule,
  type ChannelRuleStore,
  type ChannelRuleResult,
  type ThreadNotificationPreference,
  type ThreadNotificationLevel,
  type MuteState,
} from "./channel-rules";

// Keyword Alerts Engine (enhanced keyword matching with regex support)
export {
  createKeywordAlertDefinition,
  validateKeywordAlertPattern,
  createKeywordGroup,
  getEffectiveAlertPriority,
  buildMatchRegex,
  matchSingleAlert,
  matchKeywordAlerts,
  filterActiveAlerts,
  hasAnyKeywordMatch,
  createWorkspaceKeywordList,
  addKeywordToWorkspace,
  removeKeywordFromWorkspace,
  getKeywordsForWorkspace,
  getKeywordAlertStats as getKeywordAlertEngineStats,
  ALERT_TO_NOTIFICATION_PRIORITY,
  ALERT_PRIORITY_ORDER,
  type KeywordAlertDefinition,
  type KeywordMatchMode,
  type KeywordAlertPriority,
  type KeywordGroup,
  type KeywordAlertMatch,
  type KeywordAlertResult,
  type WorkspaceKeywordList,
} from "./keyword-alerts-engine";

// Quiet Hours Engine (enhanced DND and scheduling)
export {
  activateDND,
  deactivateDND,
  isDNDActive,
  getDNDTimeRemaining,
  createException,
  addException,
  removeException,
  toggleException,
  matchesException,
  parseTimeToMinutes as parseTimeToMinutesEngine,
  getDaySchedule,
  isTimeInSchedule,
  getCurrentTimeInTimezone,
  isScheduleActive,
  checkQuietHours,
  getNextQuietHoursTransition,
  formatDNDTimeRemaining,
  validateEnhancedSchedule,
  createDefaultQuietHoursSchedule,
  createDefaultQuietHoursState,
  DEFAULT_DND_MODE,
  DEFAULT_DAY_SCHEDULE,
  DEFAULT_WEEKEND_SCHEDULE,
  type DNDMode,
  type DNDException,
  type DaySchedule,
  type EnhancedQuietHoursSchedule,
  type QuietHoursState,
  type QuietHoursCheckResult,
  type QuietHoursTransition,
} from "./quiet-hours-engine";

// Digest (notification batching and digest behavior)
export {
  createDigestConfig,
  shouldBypassDigest,
  shouldSendDigest as shouldSendDigestNew,
  getNextDigestTime as getNextDigestTimeNew,
  generateDigest,
  formatDigestAsText as formatDigestText,
  createDeliveryState,
  markDigestSent,
  addPendingNotification,
  DEFAULT_DIGEST_CONFIG,
  type DigestFrequency,
  type DigestGroupBy,
  type DigestConfig as DigestConfigNew,
  type DigestEntry,
  type DigestGroup,
  type Digest,
  type DigestSummary,
  type DigestDeliveryState,
} from "./digest";

// Preference Engine (central decision engine)
export {
  NotificationPreferenceEngine,
  shouldNotify,
  createPreferenceEngineState,
  updateEngineState,
  isChannelSuppressed,
  getDecisionSummary,
  DEFAULT_GLOBAL_PREFS,
  type NotificationInput,
  type NotificationDecision,
  type PlatformDelivery,
  type SoundPreference,
  type GlobalNotificationPrefs,
  type PreferenceEngineState,
} from "./preference-engine";
