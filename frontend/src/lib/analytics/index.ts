/**
 * Analytics Library - Main entry point
 *
 * Re-exports all analytics utilities for easy importing
 */

// Types
export * from "./analytics-types";

// Core modules
export {
  AnalyticsCollector,
  getAnalyticsCollector,
  setAnalyticsCollectorAuth,
} from "./analytics-collector";
export {
  AnalyticsProcessor,
  getAnalyticsProcessor,
} from "./analytics-processor";
export {
  AnalyticsAggregator,
  getAnalyticsAggregator,
  resetAnalyticsAggregator,
} from "./analytics-aggregator";

// Export utilities
export {
  exportToCSV,
  exportToJSON,
  exportFullReport,
  formatMessageVolumeForExport,
  formatUserActivityForExport,
  formatChannelActivityForExport,
  formatReactionsForExport,
  formatFileUploadsForExport,
  formatSearchQueriesForExport,
  formatPeakHoursForExport,
  formatTopMessagesForExport,
  formatInactiveUsersForExport,
  formatUserGrowthForExport,
  formatSummaryForExport,
  createScheduledReportConfig,
  calculateNextRunTime,
  createReportHistory,
  analyticsExport,
} from "./analytics-export";

// ============================================================================
// NEW: v0.8.0 Mobile/Desktop Analytics
// ============================================================================

export * from "./types";
export * from "./firebase";
export * from "./sentry-mobile";
export * from "./events";
export * from "./privacy";
export * from "./config";

// Re-export analytics instance
export { analytics } from "./events";
export { analyticsPrivacy } from "./privacy";
export {
  getAnalyticsConfig,
  isAnalyticsAvailable,
  getPlatformProperties,
} from "./config";
