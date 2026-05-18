/**
 * Message GraphQL Subscriptions
 *
 * Real-time subscriptions for messages, reactions, and typing indicators.
 * Connects via WebSocket to the Hasura GraphQL backend.
 */

import { gql } from "@apollo/client";
import {
  MESSAGE_FULL_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
  USER_BASIC_FRAGMENT,
  REACTION_FRAGMENT,
} from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MessageSubscriptionVariables {
  channelId: string;
}

export interface ThreadSubscriptionVariables {
  threadId: string;
}

export interface TypingSubscriptionVariables {
  channelId: string;
}

export interface ReactionsSubscriptionVariables {
  messageId?: string;
  channelId?: string;
}

// ============================================================================
// MESSAGE SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new messages in a channel
 * Returns the latest message when a new one is added
 */
export const MESSAGE_SUBSCRIPTION = gql`
  subscription MessageSubscription($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Subscribe to all messages in a channel (for full sync)
 */
export const CHANNEL_MESSAGES_SUBSCRIPTION = gql`
  subscription ChannelMessagesSubscription(
    $channelId: uuid!
    $limit: Int = 50
  ) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Subscribe to message updates (edits) in a channel
 */
export const MESSAGE_UPDATED_SUBSCRIPTION = gql`
  subscription MessageUpdatedSubscription($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_edited: { _eq: true } }
      order_by: { edited_at: desc_nulls_last }
      limit: 1
    ) {
      id
      content
      is_edited
      edited_at
      metadata
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to message deletions in a channel
 */
export const MESSAGE_DELETED_SUBSCRIPTION = gql`
  subscription MessageDeletedSubscription($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: true } }
      order_by: { deleted_at: desc_nulls_last }
      limit: 1
    ) {
      id
      is_deleted
      deleted_at
      thread_id
    }
  }
`;

/**
 * Subscribe to all message activity using Hasura streaming
 * More efficient for high-traffic channels
 */
export const MESSAGE_STREAM_SUBSCRIPTION = gql`
  subscription MessageStreamSubscription($channelId: uuid!) {
    nchat_messages_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { channel_id: { _eq: $channelId }, thread_id: { _is_null: true } }
    ) {
      id
      channel_id
      user_id
      content
      type
      is_edited
      is_deleted
      is_pinned
      created_at
      edited_at
      deleted_at
      metadata
      user {
        ...UserBasic
      }
      reactions {
        id
        emoji
        user_id
      }
      reactions_aggregate {
        aggregate {
          count
        }
      }
      attachments {
        id
        filename
        file_path
        url
        type
        mime_type
        size_bytes
        width
        height
        thumbnail_url
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// THREAD SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new messages in a thread
 */
export const THREAD_MESSAGES_SUBSCRIPTION = gql`
  subscription ThreadMessagesSubscription($threadId: uuid!) {
    nchat_messages(
      where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Subscribe to thread updates (message count, last reply, etc.)
 */
export const THREAD_SUBSCRIPTION = gql`
  subscription ThreadSubscription($threadId: uuid!) {
    nchat_threads_by_pk(id: $threadId) {
      id
      message_count
      participant_count
      last_message_at
      last_message_id
      is_locked
      is_archived
      participants(limit: 10) {
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// REACTION SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to reactions on a specific message
 */
export const MESSAGE_REACTIONS_SUBSCRIPTION = gql`
  subscription MessageReactionsSubscription($messageId: uuid!) {
    nchat_reactions(
      where: { message_id: { _eq: $messageId } }
      order_by: { created_at: asc }
    ) {
      id
      emoji
      user_id
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to reaction changes in a channel (for all messages)
 */
export const CHANNEL_REACTIONS_SUBSCRIPTION = gql`
  subscription ChannelReactionsSubscription($channelId: uuid!) {
    nchat_reactions(
      where: { message: { channel_id: { _eq: $channelId } } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      id
      message_id
      emoji
      user_id
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// TYPING INDICATOR SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to typing indicators in a channel
 */
export const TYPING_SUBSCRIPTION = gql`
  subscription TypingSubscription($channelId: uuid!) {
    nchat_typing_indicators(
      where: {
        channel_id: { _eq: $channelId }
        started_at: { _gt: "now() - interval '5 seconds'" }
      }
      order_by: { started_at: desc }
    ) {
      id
      user_id
      channel_id
      thread_id
      started_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to typing indicators in a thread
 */
export const THREAD_TYPING_SUBSCRIPTION = gql`
  subscription ThreadTypingSubscription($threadId: uuid!) {
    nchat_typing_indicators(
      where: {
        thread_id: { _eq: $threadId }
        started_at: { _gt: "now() - interval '5 seconds'" }
      }
      order_by: { started_at: desc }
    ) {
      id
      user_id
      thread_id
      started_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// PINNED MESSAGES SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to pinned messages in a channel
 */
export const PINNED_MESSAGES_SUBSCRIPTION = gql`
  subscription PinnedMessagesSubscription($channelId: uuid!) {
    nchat_pinned_messages(
      where: { channel_id: { _eq: $channelId } }
      order_by: { pinned_at: desc }
    ) {
      id
      message_id
      pinned_at
      pinned_by
      message {
        id
        content
        created_at
        user {
          ...UserBasic
        }
      }
      pinned_by_user: user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// READ STATE SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to read receipts in a channel
 */
export const READ_RECEIPTS_SUBSCRIPTION = gql`
  subscription ReadReceiptsSubscription($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      last_read_message_id
      last_read_at
      unread_count
      mention_count
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
