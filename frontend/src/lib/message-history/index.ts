/**
 * Message Edit History Module
 *
 * Central export point for message edit history functionality.
 */

// Types
export * from "./history-types";

// Diff utilities
export {
  tokenize,
  calculateWordDiff,
  wordDiffsToSegments,
  calculateVersionDiff,
  calculateCharDiff,
  hasChanges,
  getChangePercentage,
  truncateDiff,
  diffToPlainText,
  getChangedSegments,
  generateUnifiedDiff,
} from "./history-diff";

// Storage utilities
export {
  loadHistorySettings,
  saveHistorySettings,
  updateHistorySettings,
  getCachedHistory,
  cacheHistory,
  invalidateHistoryCache,
  clearHistoryCache,
  serializeHistory,
  deserializeHistory,
  createInitialHistory,
  addVersionToHistory,
  getEditSummary,
  getVersion,
  getOriginalVersion,
  getCurrentVersion,
  restoreVersion,
  clearHistory,
  trimHistory,
  shouldTrimHistory,
  applyRetentionPolicy,
} from "./history-storage";

// Permission utilities
export {
  canViewEditHistory,
  canViewHistoryWithSettings,
  canRestoreVersion,
  canClearHistory,
  canDeleteVersions,
  canAccessAdminHistoryTools,
  canModifyHistorySettings,
  getHistoryPermissions,
  getViewPermissionDescription,
  getViewPermissionOptions,
  createPermissionChecker,
  createAuditEntry,
  formatAuditAction,
  type HistoryPermissions,
  type PermissionContext,
  type HistoryAuditEntry,
} from "./history-permissions";

// Store and manager
export {
  useEditHistoryStore,
  useActiveHistory,
  useSelectedVersions,
  useHistoryLoading,
  useHistoryModalOpen,
  useHistorySettings,
  getAdminHistoryList,
  exportHistoryData,
  formatHistoryForDisplay,
} from "./history-manager";
