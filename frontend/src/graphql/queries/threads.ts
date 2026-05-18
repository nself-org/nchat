/**
 * Thread GraphQL Queries
 *
 * Complete set of queries for thread functionality including:
 * - Thread details
 * - Thread messages with pagination
 * - Thread participants
 * - Thread search and filtering
 * - Thread activity feed
 */

import { gql } from "@apollo/client";
import {
  THREAD_FRAGMENT,
  MESSAGE_FULL_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "../fragments";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get thread details with messages
 */
export const GET_THREAD = gql`
  query GetThread($threadId: uuid!) {
    nchat_threads_by_pk(id: $threadId) {
      ...Thread
    }
  }
  ${THREAD_FRAGMENT}
`;

/**
 * Get messages in a thread with pagination
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
    # Also get the parent message
    nchat_threads_by_pk(id: $threadId) {
      id
      parent_message {
        ...MessageFull
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get thread participants
 */
export const GET_THREAD_PARTICIPANTS = gql`
  query GetThreadParticipants($threadId: uuid!) {
    nchat_thread_participants(
      where: { thread_id: { _eq: $threadId } }
      order_by: { joined_at: asc }
    ) {
      id
      user_id
      joined_at
      last_read_at
      notifications_enabled
      user {
        ...UserBasic
        status
      }
    }
    nchat_thread_participants_aggregate(
      where: { thread_id: { _eq: $threadId } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get all threads in a channel
 */
export const GET_CHANNEL_THREADS = gql`
  query GetChannelThreads(
    $channelId: uuid!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_threads(
      where: { channel_id: { _eq: $channelId } }
      order_by: { last_reply_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Thread
      latest_replies: messages(
        limit: 3
        order_by: { created_at: desc }
        where: { is_deleted: { _eq: false } }
      ) {
        id
        content
        created_at
        user {
          ...UserBasic
        }
      }
    }
  }
  ${THREAD_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get threads that a user is participating in
 */
export const GET_USER_THREADS = gql`
  query GetUserThreads($userId: uuid!, $limit: Int = 20, $offset: Int = 0) {
    nchat_thread_participants(
      where: { user_id: { _eq: $userId } }
      order_by: { thread: { last_reply_at: desc } }
      limit: $limit
      offset: $offset
    ) {
      thread {
        ...Thread
        channel {
          id
          name
          slug
        }
        latest_reply: messages(
          limit: 1
          order_by: { created_at: desc }
          where: { is_deleted: { _eq: false } }
        ) {
          id
          content
          created_at
          user {
            ...UserBasic
          }
        }
      }
      last_read_at
      has_unread: thread {
        messages_aggregate(
          where: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
          }
        ) {
          aggregate {
            count
          }
        }
      }
    }
  }
  ${THREAD_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get unread thread count for user
 */
export const GET_UNREAD_THREADS_COUNT = gql`
  query GetUnreadThreadsCount($userId: uuid!) {
    nchat_thread_participants_aggregate(
      where: {
        user_id: { _eq: $userId }
        thread: {
          messages: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
          }
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Search threads in a channel
 */
export const SEARCH_CHANNEL_THREADS = gql`
  query SearchChannelThreads(
    $channelId: uuid!
    $searchQuery: String!
    $limit: Int = 20
  ) {
    nchat_threads(
      where: {
        channel_id: { _eq: $channelId }
        _or: [
          { parent_message: { content: { _ilike: $searchQuery } } }
          { messages: { content: { _ilike: $searchQuery } } }
        ]
      }
      order_by: { last_reply_at: desc }
      limit: $limit
    ) {
      ...Thread
    }
  }
  ${THREAD_FRAGMENT}
`;

/**
 * Get thread activity feed for a user
 */
export const GET_THREAD_ACTIVITY_FEED = gql`
  query GetThreadActivityFeed($userId: uuid!, $limit: Int = 50) {
    nchat_messages(
      where: {
        thread_id: { _is_null: false }
        _or: [
          { user_id: { _eq: $userId } }
          { mentioned_users: { _contains: $userId } }
          { thread: { participants: { user_id: { _eq: $userId } } } }
        ]
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...MessageFull
      thread {
        id
        parent_message_id
        channel {
          id
          name
          slug
        }
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Get thread participants with their contribution stats
 */
export const GET_THREAD_PARTICIPANT_STATS = gql`
  query GetThreadParticipantStats($threadId: uuid!) {
    nchat_thread_participants(where: { thread_id: { _eq: $threadId } }) {
      id
      user_id
      joined_at
      last_read_at
      notifications_enabled
      user {
        ...UserBasic
      }
      message_count: messages_aggregate(
        where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
      last_message: messages(
        limit: 1
        order_by: { created_at: desc }
        where: { thread_id: { _eq: $threadId }, is_deleted: { _eq: false } }
      ) {
        id
        content
        created_at
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
