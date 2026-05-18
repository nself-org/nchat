/**
 * GraphQL Operations for Typing Indicators
 *
 * Provides mutations and subscriptions for typing indicators across
 * channels, threads, and direct messages.
 *
 * Note: Typing indicators are primarily handled via Socket.io for real-time
 * performance, but these GraphQL operations provide an alternative API
 * and can be used for initial state sync.
 *
 * @module graphql/realtime/typing
 * @version 1.0.0
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Room type for typing context
 */
export type TypingRoomType = "channel" | "thread" | "dm";

/**
 * Typing indicator record from database
 */
export interface TypingIndicator {
  id: string;
  userId: string;
  channelId: string;
  threadId?: string;
  dmId?: string;
  roomType: TypingRoomType;
  startedAt: string;
  expiresAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

/**
 * Variables for starting typing
 */
export interface StartTypingVariables {
  userId: string;
  channelId?: string;
  threadId?: string;
  dmId?: string;
  roomType: TypingRoomType;
}

/**
 * Variables for stopping typing
 */
export interface StopTypingVariables {
  userId: string;
  channelId?: string;
  threadId?: string;
  dmId?: string;
}

/**
 * Variables for typing subscription
 */
export interface TypingSubscriptionVariables {
  channelId?: string;
  threadId?: string;
  dmId?: string;
}

/**
 * Typing event payload
 */
export interface TypingEventPayload {
  roomName: string;
  roomType: TypingRoomType;
  threadId?: string;
  users: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    startedAt: string;
  }>;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

/**
 * Fragment for typing indicator data
 */
export const TYPING_INDICATOR_FRAGMENT = gql`
  fragment TypingIndicatorData on nchat_typing_indicators {
    id
    user_id
    channel_id
    thread_id
    dm_id
    room_type
    started_at
    expires_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get typing users in a channel
 */
export const GET_CHANNEL_TYPING_USERS = gql`
  query GetChannelTypingUsers($channelId: uuid!) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _is_null: true }
        expires_at: { _gt: "now()" }
      }
      order_by: { started_at: asc }
    ) {
      ...TypingIndicatorData
    }
  }
  ${TYPING_INDICATOR_FRAGMENT}
`;

/**
 * Get typing users in a thread
 */
export const GET_THREAD_TYPING_USERS = gql`
  query GetThreadTypingUsers($channelId: uuid!, $threadId: uuid!) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _eq: $threadId }
        expires_at: { _gt: "now()" }
      }
      order_by: { started_at: asc }
    ) {
      ...TypingIndicatorData
    }
  }
  ${TYPING_INDICATOR_FRAGMENT}
`;

/**
 * Get typing users in a DM
 */
export const GET_DM_TYPING_USERS = gql`
  query GetDMTypingUsers($dmId: uuid!) {
    nchat_typing_indicators(
      where: { dm_id: { _eq: $dmId }, expires_at: { _gt: "now()" } }
      order_by: { started_at: asc }
    ) {
      ...TypingIndicatorData
    }
  }
  ${TYPING_INDICATOR_FRAGMENT}
`;

/**
 * Check if specific user is typing
 */
export const CHECK_USER_TYPING = gql`
  query CheckUserTyping(
    $userId: uuid!
    $channelId: uuid
    $threadId: uuid
    $dmId: uuid
  ) {
    nchat_typing_indicators(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { channel_id: { _eq: $channelId }, thread_id: { _eq: $threadId } }
          { dm_id: { _eq: $dmId } }
        ]
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
 * Start typing indicator in a channel
 */
export const START_TYPING_IN_CHANNEL = gql`
  mutation StartTypingInChannel($userId: uuid!, $channelId: uuid!) {
    insert_nchat_typing_indicators_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        room_type: "channel"
        started_at: "now()"
        expires_at: "now() + interval '5 seconds'"
      }
      on_conflict: {
        constraint: nchat_typing_indicators_user_channel_thread_key
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
 * Start typing indicator in a thread
 */
export const START_TYPING_IN_THREAD = gql`
  mutation StartTypingInThread(
    $userId: uuid!
    $channelId: uuid!
    $threadId: uuid!
  ) {
    insert_nchat_typing_indicators_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        thread_id: $threadId
        room_type: "thread"
        started_at: "now()"
        expires_at: "now() + interval '5 seconds'"
      }
      on_conflict: {
        constraint: nchat_typing_indicators_user_channel_thread_key
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
 * Start typing indicator in a DM
 */
export const START_TYPING_IN_DM = gql`
  mutation StartTypingInDM($userId: uuid!, $dmId: uuid!) {
    insert_nchat_typing_indicators_one(
      object: {
        user_id: $userId
        dm_id: $dmId
        room_type: "dm"
        started_at: "now()"
        expires_at: "now() + interval '5 seconds'"
      }
      on_conflict: {
        constraint: nchat_typing_indicators_user_dm_key
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
 * Stop typing indicator in a channel/thread
 */
export const STOP_TYPING_IN_CHANNEL = gql`
  mutation StopTypingInChannel(
    $userId: uuid!
    $channelId: uuid!
    $threadId: uuid
  ) {
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
 * Stop typing indicator in a DM
 */
export const STOP_TYPING_IN_DM = gql`
  mutation StopTypingInDM($userId: uuid!, $dmId: uuid!) {
    delete_nchat_typing_indicators(
      where: { user_id: { _eq: $userId }, dm_id: { _eq: $dmId } }
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
 * Clean up expired typing indicators (maintenance job)
 */
export const CLEANUP_EXPIRED_TYPING = gql`
  mutation CleanupExpiredTyping {
    delete_nchat_typing_indicators(where: { expires_at: { _lt: "now()" } }) {
      affected_rows
    }
  }
`;

/**
 * Extend typing indicator (keep-alive)
 */
export const EXTEND_TYPING = gql`
  mutation ExtendTyping(
    $userId: uuid!
    $channelId: uuid
    $threadId: uuid
    $dmId: uuid
  ) {
    update_nchat_typing_indicators(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { channel_id: { _eq: $channelId }, thread_id: { _eq: $threadId } }
          { dm_id: { _eq: $dmId } }
        ]
      }
      _set: { expires_at: "now() + interval '5 seconds'" }
    ) {
      affected_rows
      returning {
        id
        expires_at
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to typing indicators in a channel
 */
export const CHANNEL_TYPING_SUBSCRIPTION = gql`
  subscription ChannelTypingSubscription($channelId: uuid!) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        thread_id: { _is_null: true }
        expires_at: { _gt: "now()" }
      }
      order_by: { started_at: asc }
    ) {
      id
      user_id
      started_at
      expires_at
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

/**
 * Subscribe to typing indicators in a thread
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
      expires_at
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

/**
 * Subscribe to typing indicators in a DM
 */
export const DM_TYPING_SUBSCRIPTION = gql`
  subscription DMTypingSubscription($dmId: uuid!) {
    nchat_typing_indicators(
      where: { dm_id: { _eq: $dmId }, expires_at: { _gt: "now()" } }
      order_by: { started_at: asc }
    ) {
      id
      user_id
      started_at
      expires_at
      user {
        id
        username
        display_name
        avatar_url
      }
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
      order_by: { started_at: asc }
    ) {
      id
      channel_id
      thread_id
      dm_id
      room_type
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

/**
 * Subscribe to typing using Hasura streaming subscription
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
      room_type
      started_at
      expires_at
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Transformed typing user for UI display
 */
export interface TypingUserDisplay {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  startedAt: Date;
}

/**
 * Transform raw GraphQL response to display format
 */
export function transformTypingIndicator(
  indicator: TypingIndicator,
): TypingUserDisplay {
  return {
    userId: indicator.userId,
    displayName:
      indicator.user?.displayName || indicator.user?.username || "Unknown",
    avatarUrl: indicator.user?.avatarUrl,
    startedAt: new Date(indicator.startedAt),
  };
}

/**
 * Format typing text from users
 */
export function formatTypingText(users: TypingUserDisplay[]): string | null {
  if (users.length === 0) return null;

  const names = users.map((u) => u.displayName);

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
  }

  return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`;
}
