/**
 * Moderation Module - User blocking, reporting, muting, and AI-powered content moderation
 *
 * This module provides comprehensive moderation tools for the nself-chat application.
 */

// AI-Powered Moderation (v0.5.0)
export { AIDetector, getAIDetector } from "./ai-detector";
export type { ToxicityResult, NSFWResult, SpamResult } from "./ai-detector";

export { ProfanityFilter, getProfanityFilter } from "./profanity-filter";
export type { ProfanityResult } from "./profanity-filter";

export {
  ModerationService,
  getModerationService,
  DEFAULT_MODERATION_CONFIG,
} from "./moderation-service";
export type { ModerationResult, ModerationConfig } from "./moderation-service";

export { ModerationQueue } from "./moderation-queue";
export type { QueueItem, ModerationAction } from "./moderation-queue";

// Block store and types
export {
  useBlockStore,
  type BlockedUser,
  type BlockSettings,
  type BlockState,
  type BlockActions,
  type BlockStore,
  selectBlockedUsers,
  selectBlockedUserIds,
  selectBlockSettings,
  selectIsLoading,
  selectError,
  selectBlockModal,
  selectBlockedCount,
  selectIsBlocking,
  selectIsUnblocking,
  selectShouldHideContent,
  selectShouldPreventDM,
  selectShouldHideFromList,
} from "./block-store";

// Report store and types
export {
  useReportStore,
  type ReportReason,
  type ReportStatus,
  type ReportType,
  type ReportReasonOption,
  type UserInfo,
  type MessageInfo,
  type UserReport,
  type MessageReport,
  type Report,
  type ReportState,
  type ReportActions,
  type ReportStore,
  REPORT_REASONS,
  selectUserReports,
  selectMessageReports,
  selectAllReports,
  selectPendingReportsCount,
  selectReportUserModal,
  selectReportMessageModal,
  selectFormState,
  selectMyReports,
  selectFilters,
  isUserReport,
  isMessageReport,
} from "./report-store";

// Block hook
export {
  useBlock,
  useIsUserBlocked,
  useBlockStatus,
  type UseBlockOptions,
  type UseBlockReturn,
} from "./use-block";
