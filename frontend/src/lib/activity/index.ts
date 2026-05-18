/**
 * Activity Feed Library
 *
 * Central export for all activity-related utilities
 */

// Types
export * from "./activity-types";

// Formatter
export {
  formatActorName,
  formatActorNames,
  getActivityVerb,
  formatActivityText,
  formatAggregatedActivityText,
  formatActivityDescription,
  truncateText,
  formatFileSize,
  formatCallDuration,
  getActivityEmoji,
  getActivityActionUrl,
} from "./activity-formatter";

// Filters
export {
  filterByCategory,
  filterByTypes,
  filterByChannels,
  filterByUsers,
  filterByReadStatus,
  filterByPriority,
  filterByDateRange,
  filterBySearchQuery,
  applyFilters,
  ACTIVITY_TYPE_TO_CATEGORY,
  getTypesForCategory,
  getCategoryLabel,
  getAllCategories,
  getCategoriesWithActivities,
  getUnreadCountByCategory,
  getCountsByCategory,
  QUICK_FILTERS,
  getQuickFilter,
  combineFilters,
  hasActiveFilters,
  clearFilters,
} from "./activity-filters";

// Aggregator
export {
  aggregateActivities,
  isAggregatedActivity,
  flattenAggregatedActivities,
  getAllActivityIds,
  getUnreadCount,
  splitByReadStatus,
  reaggregateAfterRead,
} from "./activity-aggregator";
export type { AggregationConfig } from "./activity-aggregator";

// Collector
export {
  transformUser,
  transformChannel,
  transformMessage,
  transformThread,
  transformFile,
  generateActivityId,
  determinePriority,
  determineCategory,
  createMessageActivity,
  createReactionActivity,
  createMentionActivity,
  createReplyActivity,
  createThreadReplyActivity,
  createChannelCreatedActivity,
  createChannelArchivedActivity,
  createMemberJoinedActivity,
  createMemberLeftActivity,
  createFileSharedActivity,
  createCallStartedActivity,
  createCallEndedActivity,
  createReminderDueActivity,
  createTaskCompletedActivity,
  createTaskAssignedActivity,
  createIntegrationEventActivity,
  createSystemActivity,
  notificationToActivity,
  notificationsToActivities,
} from "./activity-collector";
export type {
  RawUser,
  RawChannel,
  RawMessage,
  RawThread,
  RawFile,
  RawNotification,
} from "./activity-collector";

// Manager
export {
  sortActivities,
  sortAggregatedActivities,
  paginateActivities,
  getDateGroup,
  getDateGroupLabel,
  groupActivitiesByDate,
  groupActivitiesByDateGroup,
  processActivityFeed,
  ActivityFeedManager,
  getActivityManager,
  resetActivityManager,
} from "./activity-manager";
