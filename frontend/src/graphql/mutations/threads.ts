/**
 * Thread GraphQL Mutations
 *
 * Complete set of mutations for thread functionality including:
 * - Creating threads
 * - Replying to threads
 * - Managing thread participants
 * - Thread notifications
 * - Thread read state
 */

import { gql } from "@apollo/client";
import {
  THREAD_FRAGMENT,
  MESSAGE_FULL_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "../fragments";

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
 * Mark all threads as read for a user
 */
export const MARK_ALL_THREADS_READ = gql`
  mutation MarkAllThreadsRead($userId: uuid!) {
    update_nchat_thread_participants(
      where: { user_id: { _eq: $userId } }
      _set: { last_read_at: "now()" }
    ) {
      affected_rows
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

/**
 * Archive a thread
 */
export const ARCHIVE_THREAD = gql`
  mutation ArchiveThread($threadId: uuid!) {
    update_nchat_threads_by_pk(
      pk_columns: { id: $threadId }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      id
      is_archived
      archived_at
    }
  }
`;

/**
 * Unarchive a thread
 */
export const UNARCHIVE_THREAD = gql`
  mutation UnarchiveThread($threadId: uuid!) {
    update_nchat_threads_by_pk(
      pk_columns: { id: $threadId }
      _set: { is_archived: false, archived_at: null }
    ) {
      id
      is_archived
      archived_at
    }
  }
`;

/**
 * Lock a thread (prevent new replies)
 */
export const LOCK_THREAD = gql`
  mutation LockThread($threadId: uuid!) {
    update_nchat_threads_by_pk(
      pk_columns: { id: $threadId }
      _set: { is_locked: true, locked_at: "now()" }
    ) {
      id
      is_locked
      locked_at
    }
  }
`;

/**
 * Unlock a thread
 */
export const UNLOCK_THREAD = gql`
  mutation UnlockThread($threadId: uuid!) {
    update_nchat_threads_by_pk(
      pk_columns: { id: $threadId }
      _set: { is_locked: false, locked_at: null }
    ) {
      id
      is_locked
      locked_at
    }
  }
`;

/**
 * Add users to a thread
 */
export const ADD_THREAD_PARTICIPANTS = gql`
  mutation AddThreadParticipants($threadId: uuid!, $userIds: [uuid!]!) {
    insert_nchat_thread_participants(
      objects: [
        {
          thread_id: $threadId
          user_id: { _in: $userIds }
          notifications_enabled: true
        }
      ]
      on_conflict: {
        constraint: nchat_thread_participants_thread_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Remove users from a thread
 */
export const REMOVE_THREAD_PARTICIPANTS = gql`
  mutation RemoveThreadParticipants($threadId: uuid!, $userIds: [uuid!]!) {
    delete_nchat_thread_participants(
      where: { thread_id: { _eq: $threadId }, user_id: { _in: $userIds } }
    ) {
      affected_rows
    }
  }
`;
