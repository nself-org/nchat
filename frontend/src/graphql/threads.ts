import { gql } from "@apollo/client";
import {
  THREAD_FRAGMENT,
  MESSAGE_FULL_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetThreadMessagesVariables {
  threadId: string;
  limit?: number;
  offset?: number;
  before?: string;
}

export interface GetThreadParticipantsVariables {
  threadId: string;
}

export interface CreateThreadVariables {
  channelId: string;
  parentMessageId: string;
  userId: string;
  content: string;
}

export interface ReplyToThreadVariables {
  threadId: string;
  userId: string;
  content: string;
  type?: string;
}

export interface JoinThreadVariables {
  threadId: string;
  userId: string;
}

export interface LeaveThreadVariables {
  threadId: string;
  userId: string;
}

export interface ThreadSubscriptionVariables {
  threadId: string;
}

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

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new thread from a message
 */
export const CREATE_THREAD = gql`
  mutation CreateThread(
    $channelId: uuid!
    $parentMessageId: uuid!
    $userId: uuid!
    $content: String!
  ) {
    # Create the thread
    insert_nchat_threads_one(
      object: {
        channel_id: $channelId
        parent_message_id: $parentMessageId
        message_count: 1
        last_reply_at: "now()"
        participants: { data: [{ user_id: $userId }] }
        messages: {
          data: [
            {
              channel_id: $channelId
              user_id: $userId
              content: $content
              type: "text"
            }
          ]
        }
      }
    ) {
      ...Thread
      messages(limit: 1, order_by: { created_at: desc }) {
        ...MessageFull
      }
    }
  }
  ${THREAD_FRAGMENT}
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Reply to an existing thread
 */
export const REPLY_TO_THREAD = gql`
  mutation ReplyToThread(
    $threadId: uuid!
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $type: String = "text"
  ) {
    # Insert the message
    insert_nchat_messages_one(
      object: {
        thread_id: $threadId
        channel_id: $channelId
        user_id: $userId
        content: $content
        type: $type
      }
    ) {
      ...MessageFull
    }
    # Update thread stats
    update_nchat_threads_by_pk(
      pk_columns: { id: $threadId }
      _inc: { message_count: 1 }
      _set: { last_reply_at: "now()" }
    ) {
      id
      message_count
      last_reply_at
    }
    # Add user as participant if not already
    insert_nchat_thread_participants_one(
      object: { thread_id: $threadId, user_id: $userId }
      on_conflict: {
        constraint: nchat_thread_participants_thread_id_user_id_key
        update_columns: []
      }
    ) {
      id
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Join a thread (follow for notifications)
 */
export const JOIN_THREAD = gql`
  mutation JoinThread($threadId: uuid!, $userId: uuid!) {
    insert_nchat_thread_participants_one(
      object: {
        thread_id: $threadId
        user_id: $userId
        notifications_enabled: true
      }
      on_conflict: {
        constraint: nchat_thread_participants_thread_id_user_id_key
        update_columns: [notifications_enabled]
      }
    ) {
      id
      thread_id
      user_id
      joined_at
      notifications_enabled
    }
  }
`;

/**
 * Leave a thread (unfollow)
 */
export const LEAVE_THREAD = gql`
  mutation LeaveThread($threadId: uuid!, $userId: uuid!) {
    delete_nchat_thread_participants(
      where: { thread_id: { _eq: $threadId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Update thread notification settings
 */
export const UPDATE_THREAD_NOTIFICATIONS = gql`
  mutation UpdateThreadNotifications(
    $threadId: uuid!
    $userId: uuid!
    $enabled: Boolean!
  ) {
    update_nchat_thread_participants(
      where: { thread_id: { _eq: $threadId }, user_id: { _eq: $userId } }
      _set: { notifications_enabled: $enabled }
    ) {
      affected_rows
      returning {
        id
        notifications_enabled
      }
    }
  }
`;

/**
 * Mark thread as read
 */
export const MARK_THREAD_READ = gql`
  mutation MarkThreadRead($threadId: uuid!, $userId: uuid!) {
    update_nchat_thread_participants(
      where: { thread_id: { _eq: $threadId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        last_read_at
      }
    }
  }
`;

/**
 * Delete a thread (admin only)
 */
export const DELETE_THREAD = gql`
  mutation DeleteThread($threadId: uuid!) {
    # Delete all messages in thread first
    delete_nchat_messages(where: { thread_id: { _eq: $threadId } }) {
      affected_rows
    }
    # Delete participants
    delete_nchat_thread_participants(where: { thread_id: { _eq: $threadId } }) {
      affected_rows
    }
    # Delete the thread
    delete_nchat_threads_by_pk(id: $threadId) {
      id
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to thread updates (new messages)
 */
export const THREAD_SUBSCRIPTION = gql`
  subscription ThreadSubscription($threadId: uuid!) {
    nchat_threads_by_pk(id: $threadId) {
      id
      message_count
      last_reply_at
      messages(
        limit: 1
        order_by: { created_at: desc }
        where: { is_deleted: { _eq: false } }
      ) {
        ...MessageFull
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

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
 * Subscribe to thread participant changes
 */
export const THREAD_PARTICIPANTS_SUBSCRIPTION = gql`
  subscription ThreadParticipantsSubscription($threadId: uuid!) {
    nchat_thread_participants(where: { thread_id: { _eq: $threadId } }) {
      id
      user_id
      joined_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to all threads user is participating in
 */
export const USER_THREADS_SUBSCRIPTION = gql`
  subscription UserThreadsSubscription($userId: uuid!) {
    nchat_thread_participants(
      where: { user_id: { _eq: $userId } }
      order_by: { thread: { last_reply_at: desc } }
    ) {
      thread {
        id
        message_count
        last_reply_at
        parent_message {
          id
          content
          channel {
            id
            name
            slug
          }
        }
      }
      last_read_at
    }
  }
`;
