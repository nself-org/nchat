/**
 * Message GraphQL Queries
 *
 * Comprehensive queries for message fetching, pagination, and filtering.
 * Connects to the Hasura GraphQL backend via nchat_messages table.
 */

import { gql } from "@apollo/client";
import {
  MESSAGE_FULL_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
  USER_BASIC_FRAGMENT,
  ATTACHMENT_FRAGMENT,
  REACTION_FRAGMENT,
} from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetMessagesVariables {
  channelId: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

export interface GetMessageVariables {
  id: string;
}

export interface GetThreadMessagesVariables {
  threadId: string;
  limit?: number;
  offset?: number;
  before?: string;
}

export interface GetPinnedMessagesVariables {
  channelId: string;
}

export interface GetMessagesAroundVariables {
  channelId: string;
  messageId: string;
  limit?: number;
}

export interface SearchMessagesVariables {
  channelId?: string;
  query: string;
  limit?: number;
  offset?: number;
  userId?: string;
  hasAttachments?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// CORE QUERIES
// ============================================================================

/**
 * Get messages for a channel with pagination
 * Uses cursor-based pagination for efficient loading
 */
export const GET_MESSAGES = gql`
  query GetMessages(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $before: timestamptz
    $after: timestamptz
  ) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
        _and: [
          { created_at: { _lt: $before } }
          { created_at: { _gt: $after } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageFull
    }
    nchat_messages_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get a single message by ID with all relations
 */
export const GET_MESSAGE = gql`
  query GetMessage($id: uuid!) {
    nchat_messages_by_pk(id: $id) {
      ...MessageFull
      thread {
        id
        channel_id
        root_message_id
        message_count
        participant_count
        last_message_at
        is_locked
        is_archived
        created_at
        participants(limit: 5) {
          id
          user_id
          user {
            ...UserBasic
          }
        }
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get messages for a thread with pagination
 */
export const GET_THREAD_MESSAGES = gql`
  query GetThreadMessages(
    $threadId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $before: timestamptz
  ) {
    nchat_messages(
      where: {
        thread_id: { _eq: $threadId }
        is_deleted: { _eq: false }
        created_at: { _lt: $before }
      }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageFull
    }
    nchat_messages_aggregate(
      where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
    nchat_threads_by_pk(id: $threadId) {
      id
      channel_id
      root_message_id
      message_count
      participant_count
      last_message_at
      is_locked
      root_message: nchat_messages_by_pk(id: root_message_id) {
        ...MessageFull
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get pinned messages for a channel
 */
export const GET_PINNED_MESSAGES = gql`
  query GetPinnedMessages($channelId: uuid!) {
    nchat_pinned_messages(
      where: { channel_id: { _eq: $channelId } }
      order_by: { pinned_at: desc }
    ) {
      id
      message_id
      pinned_at
      pinned_by
      message {
        ...MessageFull
      }
      pinned_by_user: user {
        ...UserBasic
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get messages around a specific message (for jump-to-message)
 */
export const GET_MESSAGES_AROUND = gql`
  query GetMessagesAround(
    $channelId: uuid!
    $messageId: uuid!
    $limit: Int = 25
  ) {
    before: nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
        id: { _lt: $messageId }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...MessageFull
    }
    target: nchat_messages_by_pk(id: $messageId) {
      ...MessageFull
    }
    after: nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
        id: { _gt: $messageId }
      }
      order_by: { created_at: asc }
      limit: $limit
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Search messages across channels
 */
export const SEARCH_MESSAGES = gql`
  query SearchMessages(
    $channelId: uuid
    $query: String!
    $limit: Int = 20
    $offset: Int = 0
    $userId: uuid
    $hasAttachments: Boolean
    $dateFrom: timestamptz
    $dateTo: timestamptz
  ) {
    nchat_messages(
      where: {
        _and: [
          { channel_id: { _eq: $channelId } }
          { content: { _ilike: $query } }
          { is_deleted: { _eq: false } }
          { user_id: { _eq: $userId } }
          { created_at: { _gte: $dateFrom, _lte: $dateTo } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageFull
      channel {
        id
        name
        slug
        type
      }
    }
    nchat_messages_aggregate(
      where: {
        _and: [
          { channel_id: { _eq: $channelId } }
          { content: { _ilike: $query } }
          { is_deleted: { _eq: false } }
          { user_id: { _eq: $userId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get recent messages for a user's mentions
 */
export const GET_USER_MENTIONS = gql`
  query GetUserMentions($userId: uuid!, $limit: Int = 20, $offset: Int = 0) {
    nchat_messages(
      where: { mentions: { _contains: [$userId] }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageFull
      channel {
        id
        name
        slug
        type
      }
    }
    nchat_messages_aggregate(
      where: { mentions: { _contains: [$userId] }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get message count for a channel
 */
export const GET_MESSAGE_COUNT = gql`
  query GetMessageCount($channelId: uuid!) {
    nchat_messages_aggregate(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get unread message count for a channel/user
 */
export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount(
    $channelId: uuid!
    $userId: uuid!
    $lastReadAt: timestamptz
  ) {
    nchat_messages_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        created_at: { _gt: $lastReadAt }
        user_id: { _neq: $userId }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
