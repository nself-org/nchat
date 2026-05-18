/**
 * Activity GraphQL
 *
 * Central export for activity-related GraphQL operations
 */

// Queries and Mutations
export {
  // Fragments
  ACTIVITY_FRAGMENT,

  // Types
  type ActivityType,
  type ActivityCategory,
  type GetActivitiesVariables,
  type GetUnreadCountsVariables,
  type GetActivityByIdVariables,

  // Queries
  GET_ACTIVITIES,
  GET_ACTIVITY_BY_ID,
  GET_UNREAD_COUNTS,
  GET_ACTIVITIES_BY_CATEGORY,
  SEARCH_ACTIVITIES,

  // Mutations
  MARK_ACTIVITY_AS_READ,
  MARK_ACTIVITIES_AS_READ,
  MARK_ALL_ACTIVITIES_AS_READ,
  ARCHIVE_ACTIVITY,
  ARCHIVE_READ_ACTIVITIES,
  DELETE_ACTIVITY,
  UPDATE_ACTIVITY_PREFERENCES,
} from "./activity-queries";

// Subscriptions
export {
  // Types
  type ActivitySubscriptionVariables,
  type ActivityUnreadSubscriptionVariables,
  type ActivityCategorySubscriptionVariables,

  // Subscriptions
  ACTIVITY_SUBSCRIPTION,
  ACTIVITY_UNREAD_SUBSCRIPTION,
  ACTIVITY_UNREAD_BY_CATEGORY_SUBSCRIPTION,
  ACTIVITY_CATEGORY_SUBSCRIPTION,
  ACTIVITY_STREAM_SUBSCRIPTION,
  MENTION_ACTIVITY_SUBSCRIPTION,
  THREAD_ACTIVITY_SUBSCRIPTION,
  FILE_ACTIVITY_SUBSCRIPTION,
  ACTIVITY_READ_STATE_SUBSCRIPTION,
} from "./activity-subscriptions";
