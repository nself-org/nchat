import { gql } from "@apollo/client";
import {
  MESSAGE_FULL_FRAGMENT,
  MESSAGE_WITH_THREAD_FRAGMENT,
  USER_BASIC_FRAGMENT,
  ATTACHMENT_FRAGMENT,
  REACTION_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetMessagesVariables {
  channelId: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
  threadId?: string;
}

export interface GetMessageVariables {
  id: string;
}

export interface SendMessageVariables {
  channelId: string;
  userId: string;
  content: string;
  type?: "text" | "image" | "file" | "video" | "audio" | "system" | "code";
  threadId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface EditMessageVariables {
  id: string;
  content: string;
}

export interface DeleteMessageVariables {
  id: string;
}

export interface PinMessageVariables {
  id: string;
  isPinned: boolean;
}

export interface ForwardMessageVariables {
  originalMessageId: string;
  targetChannelId: string;
  userId: string;
  comment?: string;
}

export interface MessageSubscriptionVariables {
  channelId: string;
}

export interface ThreadMessageSubscriptionVariables {
  threadId: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get messages for a channel with pagination and optional filtering
 */
export const GET_MESSAGES = gql`
  query GetMessages(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $before: timestamptz
    $after: timestamptz
    $threadId: uuid
  ) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        thread_id: { _is_null: true }
        created_at: { _lt: $before, _gt: $after }
        _and: [
          {
            _or: [
              { thread_id: { _is_null: true } }
              { thread_id: { _eq: $threadId } }
            ]
          }
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
      ...MessageWithThread
    }
  }
  ${MESSAGE_WITH_THREAD_FRAGMENT}
`;

/**
 * Get pinned messages for a channel
 */
export const GET_PINNED_MESSAGES = gql`
  query GetPinnedMessages($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_pinned: { _eq: true }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
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

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Send a new message
 */
export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $type: String = "text"
    $threadId: uuid
    $parentId: uuid
    $metadata: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        type: $type
        thread_id: $threadId
        parent_id: $parentId
        metadata: $metadata
      }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Edit an existing message
 */
export const EDIT_MESSAGE = gql`
  mutation EditMessage($id: uuid!, $content: String!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: { content: $content, is_edited: true, edited_at: "now()" }
    ) {
      ...MessageFull
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Soft delete a message
 */
export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($id: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

/**
 * Hard delete a message (admin only)
 */
export const HARD_DELETE_MESSAGE = gql`
  mutation HardDeleteMessage($id: uuid!) {
    delete_nchat_messages_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Pin a message
 */
export const PIN_MESSAGE = gql`
  mutation PinMessage($id: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: { is_pinned: true }
    ) {
      id
      is_pinned
    }
  }
`;

/**
 * Unpin a message
 */
export const UNPIN_MESSAGE = gql`
  mutation UnpinMessage($id: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $id }
      _set: { is_pinned: false }
    ) {
      id
      is_pinned
    }
  }
`;

/**
 * Forward a message to another channel
 */
export const FORWARD_MESSAGE = gql`
  mutation ForwardMessage(
    $originalMessageId: uuid!
    $targetChannelId: uuid!
    $userId: uuid!
    $comment: String
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $targetChannelId
        user_id: $userId
        content: $comment
        type: "forwarded"
        forwarded_from_id: $originalMessageId
        metadata: { forwarded: true }
      }
    ) {
      ...MessageFull
      forwarded_from {
        ...MessageFull
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
`;

/**
 * Bulk delete messages (admin/moderator)
 */
export const BULK_DELETE_MESSAGES = gql`
  mutation BulkDeleteMessages($ids: [uuid!]!) {
    update_nchat_messages(
      where: { id: { _in: $ids } }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new messages in a channel
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
 * Subscribe to message updates (edits)
 */
export const MESSAGE_UPDATED_SUBSCRIPTION = gql`
  subscription MessageUpdatedSubscription($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_edited: { _eq: true } }
      order_by: { edited_at: desc }
      limit: 1
    ) {
      id
      content
      is_edited
      edited_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to message deletions
 */
export const MESSAGE_DELETED_SUBSCRIPTION = gql`
  subscription MessageDeletedSubscription($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: true } }
      order_by: { deleted_at: desc }
      limit: 1
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

// THREAD_MESSAGES_SUBSCRIPTION is defined in threads.ts

/**
 * Subscribe to all message activity in a channel (new, edited, deleted)
 */
export const MESSAGE_ACTIVITY_SUBSCRIPTION = gql`
  subscription MessageActivitySubscription($channelId: uuid!) {
    nchat_messages_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { channel_id: { _eq: $channelId } }
    ) {
      id
      content
      type
      is_edited
      is_deleted
      is_pinned
      created_at
      edited_at
      deleted_at
      user {
        ...UserBasic
      }
      attachments {
        ...Attachment
      }
      reactions {
        ...Reaction
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${ATTACHMENT_FRAGMENT}
  ${REACTION_FRAGMENT}
`;
