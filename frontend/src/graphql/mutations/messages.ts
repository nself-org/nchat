/**
 * Message Operations GraphQL Mutations
 *
 * Comprehensive mutations for message lifecycle, reactions, threading, and features.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Message CRUD Mutations
// ============================================================================

export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $channelId: uuid!
    $content: String!
    $replyToId: uuid
    $attachments: jsonb
    $mentions: jsonb
    $metadata: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        content: $content
        reply_to_id: $replyToId
        attachments: $attachments
        mentions: $mentions
        metadata: $metadata
      }
    ) {
      id
      content
      created_at
      updated_at
      channel_id
      user_id
      reply_to_id
      attachments
      mentions
      metadata
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const UPDATE_MESSAGE = gql`
  mutation UpdateMessage(
    $messageId: uuid!
    $content: String!
    $mentions: jsonb
  ) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: {
        content: $content
        mentions: $mentions
        updated_at: "now()"
        is_edited: true
      }
    ) {
      id
      content
      updated_at
      is_edited
      mentions
    }
  }
`;

export const DELETE_MESSAGE = gql`
  mutation DeleteMessage($messageId: uuid!) {
    delete_nchat_messages_by_pk(id: $messageId) {
      id
      content
      channel_id
    }
  }
`;

export const SOFT_DELETE_MESSAGE = gql`
  mutation SoftDeleteMessage($messageId: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_deleted: true, deleted_at: "now()", content: "[deleted]" }
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

// ============================================================================
// Message Interaction Mutations
// ============================================================================

export const PIN_MESSAGE = gql`
  mutation PinMessage($messageId: uuid!, $channelId: uuid!) {
    insert_nchat_pinned_messages_one(
      object: { message_id: $messageId, channel_id: $channelId }
      on_conflict: {
        constraint: pinned_messages_message_id_channel_id_key
        update_columns: [pinned_at]
      }
    ) {
      id
      message_id
      channel_id
      pinned_at
      pinned_by
      message {
        id
        content
        user {
          id
          display_name
        }
      }
    }
  }
`;

export const UNPIN_MESSAGE = gql`
  mutation UnpinMessage($messageId: uuid!, $channelId: uuid!) {
    delete_nchat_pinned_messages(
      where: {
        message_id: { _eq: $messageId }
        channel_id: { _eq: $channelId }
      }
    ) {
      affected_rows
    }
  }
`;

export const STAR_MESSAGE = gql`
  mutation StarMessage($messageId: uuid!, $userId: uuid!) {
    insert_nchat_starred_messages_one(
      object: { message_id: $messageId, user_id: $userId }
      on_conflict: {
        constraint: starred_messages_message_id_user_id_key
        update_columns: [starred_at]
      }
    ) {
      id
      message_id
      starred_at
    }
  }
`;

export const UNSTAR_MESSAGE = gql`
  mutation UnstarMessage($messageId: uuid!, $userId: uuid!) {
    delete_nchat_starred_messages(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

export const FORWARD_MESSAGE = gql`
  mutation ForwardMessage(
    $messageId: uuid!
    $targetChannelId: uuid!
    $content: String
    $userId: uuid!
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $targetChannelId
        content: $content
        user_id: $userId
        forwarded_from: $messageId
        metadata: { type: "forwarded" }
      }
    ) {
      id
      content
      created_at
      channel_id
      forwarded_from
      original_message: forwarded_from_message {
        id
        content
        user {
          id
          display_name
        }
      }
    }
  }
`;

export const MARK_MESSAGE_READ = gql`
  mutation MarkMessageRead($messageId: uuid!, $userId: uuid!) {
    insert_nchat_read_receipts_one(
      object: { message_id: $messageId, user_id: $userId, read_at: "now()" }
      on_conflict: {
        constraint: read_receipts_message_id_user_id_key
        update_columns: [read_at]
      }
    ) {
      id
      message_id
      read_at
    }
  }
`;

export const MARK_MESSAGE_UNREAD = gql`
  mutation MarkMessageUnread($messageId: uuid!, $userId: uuid!) {
    delete_nchat_read_receipts(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Thread Mutations
// ============================================================================

export const CREATE_THREAD = gql`
  mutation CreateThread($messageId: uuid!, $name: String) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { has_thread: true, thread_name: $name }
    ) {
      id
      has_thread
      thread_name
      thread_message_count: replies_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const REPLY_TO_THREAD = gql`
  mutation ReplyToThread(
    $threadId: uuid!
    $channelId: uuid!
    $content: String!
    $mentions: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        reply_to_id: $threadId
        channel_id: $channelId
        content: $content
        mentions: $mentions
      }
    ) {
      id
      content
      created_at
      reply_to_id
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const SUBSCRIBE_TO_THREAD = gql`
  mutation SubscribeToThread($messageId: uuid!, $userId: uuid!) {
    insert_nchat_thread_subscriptions_one(
      object: { message_id: $messageId, user_id: $userId }
      on_conflict: {
        constraint: thread_subscriptions_message_id_user_id_key
        update_columns: [subscribed_at]
      }
    ) {
      id
      message_id
      subscribed_at
    }
  }
`;

export const UNSUBSCRIBE_FROM_THREAD = gql`
  mutation UnsubscribeFromThread($messageId: uuid!, $userId: uuid!) {
    delete_nchat_thread_subscriptions(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Message Attachments
// ============================================================================

export const ADD_ATTACHMENT = gql`
  mutation AddAttachment($messageId: uuid!, $attachment: jsonb!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _append: { attachments: $attachment }
    ) {
      id
      attachments
    }
  }
`;

export const REMOVE_ATTACHMENT = gql`
  mutation RemoveAttachment($messageId: uuid!, $attachmentIndex: Int!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _delete_elem: { attachments: $attachmentIndex }
    ) {
      id
      attachments
    }
  }
`;

// ============================================================================
// Scheduled Messages
// ============================================================================

export const SCHEDULE_MESSAGE = gql`
  mutation ScheduleMessage(
    $channelId: uuid!
    $content: String!
    $scheduledFor: timestamptz!
    $attachments: jsonb
    $mentions: jsonb
  ) {
    insert_nchat_scheduled_messages_one(
      object: {
        channel_id: $channelId
        content: $content
        scheduled_for: $scheduledFor
        attachments: $attachments
        mentions: $mentions
        status: "pending"
      }
    ) {
      id
      channel_id
      content
      scheduled_for
      status
    }
  }
`;

export const CANCEL_SCHEDULED_MESSAGE = gql`
  mutation CancelScheduledMessage($messageId: uuid!) {
    update_nchat_scheduled_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { status: "cancelled", cancelled_at: "now()" }
    ) {
      id
      status
      cancelled_at
    }
  }
`;

export const UPDATE_SCHEDULED_MESSAGE = gql`
  mutation UpdateScheduledMessage(
    $messageId: uuid!
    $content: String
    $scheduledFor: timestamptz
  ) {
    update_nchat_scheduled_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { content: $content, scheduled_for: $scheduledFor }
    ) {
      id
      content
      scheduled_for
    }
  }
`;

// ============================================================================
// Typing Indicators
// ============================================================================

export const START_TYPING = gql`
  mutation StartTyping($channelId: uuid!, $userId: uuid!) {
    insert_nchat_typing_indicators_one(
      object: { channel_id: $channelId, user_id: $userId, started_at: "now()" }
      on_conflict: {
        constraint: typing_indicators_channel_id_user_id_key
        update_columns: [started_at]
      }
    ) {
      id
      channel_id
      user_id
      started_at
    }
  }
`;

export const STOP_TYPING = gql`
  mutation StopTyping($channelId: uuid!, $userId: uuid!) {
    delete_nchat_typing_indicators(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Bulk Operations
// ============================================================================

export const DELETE_MULTIPLE_MESSAGES = gql`
  mutation DeleteMultipleMessages($messageIds: [uuid!]!) {
    delete_nchat_messages(where: { id: { _in: $messageIds } }) {
      affected_rows
    }
  }
`;

export const PIN_MULTIPLE_MESSAGES = gql`
  mutation PinMultipleMessages($pins: [nchat_pinned_messages_insert_input!]!) {
    insert_nchat_pinned_messages(
      objects: $pins
      on_conflict: {
        constraint: pinned_messages_message_id_channel_id_key
        update_columns: [pinned_at]
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        pinned_at
      }
    }
  }
`;

// ============================================================================
// Re-export reaction mutations
// ============================================================================

export { ADD_REACTION, REMOVE_REACTION, TOGGLE_REACTION } from "./reactions";

// ============================================================================
// Type Definitions
// ============================================================================

export interface SendMessageInput {
  channelId: string;
  content: string;
  replyToId?: string;
  threadId?: string;
  attachments?: unknown[];
  mentions?: { userId: string; displayName: string }[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageInput {
  content: string;
  mentions?: { userId: string; displayName: string }[];
}

export interface ForwardMessageInput {
  messageId: string;
  targetChannelId: string;
  content?: string;
}

export interface ScheduleMessageInput {
  channelId: string;
  content: string;
  scheduledFor: string;
  attachments?: unknown[];
  mentions?: { userId: string; displayName: string }[];
}

export interface AttachmentInput {
  type: "file" | "image" | "video" | "audio" | "link";
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface PinMessageInput {
  message_id: string;
  channel_id: string;
}
