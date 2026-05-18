import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
} from "../fragments";

// ============================================================================
// FRAGMENTS
// ============================================================================

export const ACTIVITY_FRAGMENT = gql`
  fragment Activity on nchat_activities {
    id
    user_id
    type
    category
    priority
    data
    is_read
    read_at
    is_archived
    archived_at
    created_at
    updated_at
    actor {
      ...UserBasic
    }
    channel {
      ...ChannelBasic
    }
    message {
      ...MessageBasic
    }
    thread {
      id
      channel_id
      parent_message_id
      message_count
      last_reply_at
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
  ${MESSAGE_BASIC_FRAGMENT}
`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ActivityType =
  | "message"
  | "reaction"
  | "mention"
  | "reply"
  | "thread_reply"
  | "channel_created"
  | "channel_archived"
  | "channel_unarchived"
  | "member_joined"
  | "member_left"
  | "member_invited"
  | "file_shared"
  | "call_started"
  | "call_ended"
  | "reminder_due"
  | "task_completed"
  | "task_assigned"
  | "integration_event"
  | "system";

export type ActivityCategory =
  | "all"
  | "mentions"
  | "threads"
  | "reactions"
  | "files"
  | "channels"
  | "members"
  | "calls"
  | "tasks"
  | "integrations";

export interface GetActivitiesVariables {
  userId: string;
  limit?: number;
  offset?: number;
  category?: ActivityCategory;
  types?: ActivityType[];
  isRead?: boolean;
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetUnreadCountsVariables {
  userId: string;
}

export interface GetActivityByIdVariables {
  activityId: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get activities for a user
 */
export const GET_ACTIVITIES = gql`
  query GetActivities(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $category: String
    $types: [String!]
    $isRead: Boolean
    $channelId: uuid
    $dateFrom: timestamptz
    $dateTo: timestamptz
  ) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        is_archived: { _eq: false }
        _and: [
          { category: { _eq: $category } }
          { type: { _in: $types } }
          { is_read: { _eq: $isRead } }
          { channel_id: { _eq: $channelId } }
          { created_at: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Activity
    }
    nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_archived: { _eq: false }
        _and: [
          { category: { _eq: $category } }
          { type: { _in: $types } }
          { is_read: { _eq: $isRead } }
          { channel_id: { _eq: $channelId } }
          { created_at: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Get activity by ID
 */
export const GET_ACTIVITY_BY_ID = gql`
  query GetActivityById($activityId: uuid!) {
    nchat_activities_by_pk(id: $activityId) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Get unread counts by category
 */
export const GET_UNREAD_COUNTS = gql`
  query GetUnreadCounts($userId: uuid!) {
    total: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    mentions: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
        category: { _eq: "mentions" }
      }
    ) {
      aggregate {
        count
      }
    }

    threads: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
        category: { _eq: "threads" }
      }
    ) {
      aggregate {
        count
      }
    }

    reactions: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
        category: { _eq: "reactions" }
      }
    ) {
      aggregate {
        count
      }
    }

    files: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
        category: { _eq: "files" }
      }
    ) {
      aggregate {
        count
      }
    }

    channels: nchat_activities_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        is_archived: { _eq: false }
        category: { _eq: "channels" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get activities grouped by category
 */
export const GET_ACTIVITIES_BY_CATEGORY = gql`
  query GetActivitiesByCategory($userId: uuid!, $limit: Int = 10) {
    mentions: nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "mentions" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Activity
    }

    threads: nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "threads" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Activity
    }

    reactions: nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "reactions" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Activity
    }

    files: nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "files" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Search activities
 */
export const SEARCH_ACTIVITIES = gql`
  query SearchActivities(
    $userId: uuid!
    $searchQuery: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        is_archived: { _eq: false }
        _or: [
          { message: { content: { _ilike: $searchQuery } } }
          { channel: { name: { _ilike: $searchQuery } } }
          { actor: { display_name: { _ilike: $searchQuery } } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark activity as read
 */
export const MARK_ACTIVITY_AS_READ = gql`
  mutation MarkActivityAsRead($activityId: uuid!) {
    update_nchat_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: { is_read: true, read_at: "now()" }
    ) {
      id
      is_read
      read_at
    }
  }
`;

/**
 * Mark multiple activities as read
 */
export const MARK_ACTIVITIES_AS_READ = gql`
  mutation MarkActivitiesAsRead($activityIds: [uuid!]!) {
    update_nchat_activities(
      where: { id: { _in: $activityIds } }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        is_read
        read_at
      }
    }
  }
`;

/**
 * Mark all activities as read
 */
export const MARK_ALL_ACTIVITIES_AS_READ = gql`
  mutation MarkAllActivitiesAsRead($userId: uuid!, $category: String) {
    update_nchat_activities(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        category: { _eq: $category }
      }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Archive activity
 */
export const ARCHIVE_ACTIVITY = gql`
  mutation ArchiveActivity($activityId: uuid!) {
    update_nchat_activities_by_pk(
      pk_columns: { id: $activityId }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      id
      is_archived
      archived_at
    }
  }
`;

/**
 * Archive all read activities
 */
export const ARCHIVE_READ_ACTIVITIES = gql`
  mutation ArchiveReadActivities($userId: uuid!) {
    update_nchat_activities(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: true }
        is_archived: { _eq: false }
      }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Delete activity
 */
export const DELETE_ACTIVITY = gql`
  mutation DeleteActivity($activityId: uuid!) {
    delete_nchat_activities_by_pk(id: $activityId) {
      id
    }
  }
`;

/**
 * Update activity preferences
 */
export const UPDATE_ACTIVITY_PREFERENCES = gql`
  mutation UpdateActivityPreferences($userId: uuid!, $preferences: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { activity_preferences: $preferences }
    ) {
      id
      activity_preferences
    }
  }
`;
