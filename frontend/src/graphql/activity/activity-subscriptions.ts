import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
} from "../fragments";
import { ACTIVITY_FRAGMENT } from "./activity-queries";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ActivitySubscriptionVariables {
  userId: string;
}

export interface ActivityUnreadSubscriptionVariables {
  userId: string;
}

export interface ActivityCategorySubscriptionVariables {
  userId: string;
  category: string;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new activities for a user
 */
export const ACTIVITY_SUBSCRIPTION = gql`
  subscription ActivitySubscription($userId: uuid!) {
    nchat_activities(
      where: { user_id: { _eq: $userId }, is_archived: { _eq: false } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Subscribe to unread count changes
 */
export const ACTIVITY_UNREAD_SUBSCRIPTION = gql`
  subscription ActivityUnreadSubscription($userId: uuid!) {
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
  }
`;

/**
 * Subscribe to unread counts by category
 */
export const ACTIVITY_UNREAD_BY_CATEGORY_SUBSCRIPTION = gql`
  subscription ActivityUnreadByCategorySubscription($userId: uuid!) {
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
 * Subscribe to activities in a specific category
 */
export const ACTIVITY_CATEGORY_SUBSCRIPTION = gql`
  subscription ActivityCategorySubscription(
    $userId: uuid!
    $category: String!
  ) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: $category }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 20
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Subscribe to activity stream using Hasura streaming subscriptions
 * This is more efficient for real-time updates
 */
export const ACTIVITY_STREAM_SUBSCRIPTION = gql`
  subscription ActivityStreamSubscription($userId: uuid!) {
    nchat_activities_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { user_id: { _eq: $userId }, is_archived: { _eq: false } }
    ) {
      id
      type
      category
      priority
      data
      is_read
      read_at
      created_at
      actor {
        id
        username
        display_name
        avatar_url
      }
      channel {
        id
        name
        slug
        type
      }
      message {
        id
        content
        created_at
      }
    }
  }
`;

/**
 * Subscribe to mentions specifically
 */
export const MENTION_ACTIVITY_SUBSCRIPTION = gql`
  subscription MentionActivitySubscription($userId: uuid!) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "mentions" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Subscribe to thread replies specifically
 */
export const THREAD_ACTIVITY_SUBSCRIPTION = gql`
  subscription ThreadActivitySubscription($userId: uuid!) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "threads" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Subscribe to file activity specifically
 */
export const FILE_ACTIVITY_SUBSCRIPTION = gql`
  subscription FileActivitySubscription($userId: uuid!) {
    nchat_activities(
      where: {
        user_id: { _eq: $userId }
        category: { _eq: "files" }
        is_archived: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Activity
    }
  }
  ${ACTIVITY_FRAGMENT}
`;

/**
 * Subscribe to activity read state changes
 * Useful for syncing across devices/tabs
 */
export const ACTIVITY_READ_STATE_SUBSCRIPTION = gql`
  subscription ActivityReadStateSubscription($userId: uuid!) {
    nchat_activities(
      where: { user_id: { _eq: $userId }, is_archived: { _eq: false } }
      order_by: { read_at: desc_nulls_last }
      limit: 10
    ) {
      id
      is_read
      read_at
    }
  }
`;
