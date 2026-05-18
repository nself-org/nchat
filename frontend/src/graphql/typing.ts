import { gql } from "@apollo/client";
import { TYPING_INDICATOR_FRAGMENT, USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StartTypingVariables {
  userId: string;
  channelId: string;
  threadId?: string;
}

export interface StopTypingVariables {
  userId: string;
  channelId: string;
  threadId?: string;
}

export interface TypingSubscriptionVariables {
  channelId: string;
  threadId?: string;
}

export interface TypingUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  started_at: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get current typing users in a channel
 */
export const GET_TYPING_USERS = gql`
  query GetTypingUsers($channelId: uuid!, $threadId: uuid) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
        expires_at: { _gt: "now()" }
      }
      order_by: { started_at: asc }
    ) {
      ...TypingIndicator
    }
  }
  ${TYPING_INDICATOR_FRAGMENT}
`;

/**
 * Get typing users count
 */
export const GET_TYPING_USERS_COUNT = gql`
  query GetTypingUsersCount($channelId: uuid!, $threadId: uuid) {
    nchat_typing_indicators_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
        expires_at: { _gt: "now()" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Check if specific user is typing
 */
export const CHECK_USER_TYPING = gql`
  query CheckUserTyping($userId: uuid!, $channelId: uuid!, $threadId: uuid) {
    nchat_typing_indicators(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
        expires_at: { _gt: "now()" }
      }
      limit: 1
    ) {
      id
      started_at
      expires_at
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start typing indicator
 * Sets an expiration time (typically 5-10 seconds)
 */
export const START_TYPING = gql`
  mutation StartTyping($userId: uuid!, $channelId: uuid!, $threadId: uuid) {
    insert_nchat_typing_indicators_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        thread_id: $threadId
        started_at: "now()"
        expires_at: "now() + interval '10 seconds'"
      }
      on_conflict: {
        constraint: nchat_typing_indicators_user_id_channel_id_thread_id_key
        update_columns: [started_at, expires_at]
      }
    ) {
      id
      started_at
      expires_at
    }
  }
`;

/**
 * Extend typing indicator (keep-alive)
 */
export const EXTEND_TYPING = gql`
  mutation ExtendTyping($userId: uuid!, $channelId: uuid!, $threadId: uuid) {
    update_nchat_typing_indicators(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
      }
      _set: { expires_at: "now() + interval '10 seconds'" }
    ) {
      affected_rows
      returning {
        id
        expires_at
      }
    }
  }
`;

/**
 * Stop typing indicator (explicit stop)
 */
export const STOP_TYPING = gql`
  mutation StopTyping($userId: uuid!, $channelId: uuid!, $threadId: uuid) {
    delete_nchat_typing_indicators(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        _or: [
          { thread_id: { _eq: $threadId } }
          { thread_id: { _is_null: true } }
        ]
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Stop all typing indicators for a user (on disconnect)
 */
export const STOP_ALL_TYPING = gql`
  mutation StopAllTyping($userId: uuid!) {
    delete_nchat_typing_indicators(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

/**
 * Clean up expired typing indicators (maintenance)
 */
export const CLEANUP_EXPIRED_TYPING = gql`
  mutation CleanupExpiredTyping {
    delete_nchat_typing_indicators(where: { expires_at: { _lt: "now()" } }) {
      affected_rows
    }
  }
`;

/**
 * Set typing with custom expiration
 */
export const SET_TYPING_WITH_EXPIRY = gql`
  mutation SetTypingWithExpiry(
    $userId: uuid!
    $channelId: uuid!
    $threadId: uuid
    $expiresIn: interval!
  ) {
    insert_nchat_typing_indicators_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        thread_id: $threadId
        started_at: "now()"
        expires_at: "now() + $expiresIn"
      }
      on_conflict: {
        constraint: nchat_typing_indicators_user_id_channel_id_thread_id_key
        update_columns: [started_at, expires_at]
      }
    ) {
      id
      expires_at
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to typing indicators in a channel
 */
export const TYPING_SUBSCRIPTION = gql`
  subscription TypingSubscription($channelId: uuid!, $threadId: uuid) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
        expires_at: { _gt: "now()" }
      }
      order_by: { started_at: asc }
    ) {
      id
      user_id
      started_at
      expires_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to typing in a thread
 */
export const THREAD_TYPING_SUBSCRIPTION = gql`
  subscription ThreadTypingSubscription($threadId: uuid!) {
    nchat_typing_indicators(
      where: { thread_id: { _eq: $threadId }, expires_at: { _gt: "now()" } }
      order_by: { started_at: asc }
    ) {
      id
      user_id
      started_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to typing stream (real-time updates)
 */
export const TYPING_STREAM_SUBSCRIPTION = gql`
  subscription TypingStreamSubscription($channelId: uuid!) {
    nchat_typing_indicators_stream(
      cursor: { initial_value: { started_at: "now()" } }
      batch_size: 10
      where: { channel_id: { _eq: $channelId }, expires_at: { _gt: "now()" } }
    ) {
      id
      user_id
      channel_id
      thread_id
      started_at
      expires_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to typing status changes for specific users
 */
export const USERS_TYPING_SUBSCRIPTION = gql`
  subscription UsersTypingSubscription($userIds: [uuid!]!, $channelId: uuid!) {
    nchat_typing_indicators(
      where: {
        user_id: { _in: $userIds }
        channel_id: { _eq: $channelId }
        expires_at: { _gt: "now()" }
      }
    ) {
      user_id
      channel_id
      thread_id
      started_at
      expires_at
    }
  }
`;

/**
 * Subscribe to all typing activity in channels user is member of
 */
export const ALL_CHANNELS_TYPING_SUBSCRIPTION = gql`
  subscription AllChannelsTypingSubscription($userId: uuid!) {
    nchat_typing_indicators(
      where: {
        expires_at: { _gt: "now()" }
        user_id: { _neq: $userId }
        channel: { members: { user_id: { _eq: $userId } } }
      }
    ) {
      id
      channel_id
      thread_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
