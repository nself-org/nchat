/**
 * Message Status GraphQL Operations
 *
 * Queries, mutations, and subscriptions for message edit history
 * and delivery status tracking.
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT, MESSAGE_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetMessageEditHistoryVariables {
  messageId: string;
}

export interface MessageEditHistoryRecord {
  id: string;
  message_id: string;
  editor_id: string;
  previous_content: string;
  new_content: string;
  change_summary: string | null;
  edited_at: string;
  editor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface GetMessageStatusVariables {
  messageId: string;
}

export interface MessageStatusData {
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  delivered_count?: number;
  read_count?: number;
  total_recipients?: number;
  error?: string;
}

export interface GetMessageReadByVariables {
  messageId: string;
}

export interface MessageReadByData {
  user_id: string;
  read_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const MESSAGE_EDIT_HISTORY_FRAGMENT = gql`
  fragment MessageEditHistory on nchat_message_edits {
    id
    message_id
    editor_id
    previous_content
    new_content
    change_summary
    edited_at
    editor {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const MESSAGE_STATUS_FRAGMENT = gql`
  fragment MessageStatus on nchat_message_status {
    id
    message_id
    status
    delivered_count
    read_count
    total_recipients
    error
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get edit history for a specific message
 */
export const GET_MESSAGE_EDIT_HISTORY = gql`
  query GetMessageEditHistory($messageId: uuid!) {
    nchat_message_edits(
      where: { message_id: { _eq: $messageId } }
      order_by: { edited_at: desc }
    ) {
      ...MessageEditHistory
    }
    nchat_message_edits_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_EDIT_HISTORY_FRAGMENT}
`;

/**
 * Get edit history for multiple messages (batch)
 */
export const GET_MESSAGES_EDIT_HISTORY = gql`
  query GetMessagesEditHistory($messageIds: [uuid!]!) {
    nchat_message_edits(
      where: { message_id: { _in: $messageIds } }
      order_by: { message_id: asc, edited_at: desc }
    ) {
      ...MessageEditHistory
    }
  }
  ${MESSAGE_EDIT_HISTORY_FRAGMENT}
`;

/**
 * Get delivery status for a specific message
 */
export const GET_MESSAGE_STATUS = gql`
  query GetMessageStatus($messageId: uuid!) {
    nchat_message_status_by_pk(message_id: $messageId) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Get read receipts for a specific message
 */
export const GET_MESSAGE_READ_BY = gql`
  query GetMessageReadBy($messageId: uuid!) {
    nchat_read_receipts(
      where: { message_id: { _eq: $messageId } }
      order_by: { read_at: asc }
    ) {
      user_id
      read_at
      user {
        ...UserBasic
      }
    }
    nchat_read_receipts_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get delivery status for multiple messages
 */
export const GET_MESSAGES_STATUS = gql`
  query GetMessagesStatus($messageIds: [uuid!]!) {
    nchat_message_status(where: { message_id: { _in: $messageIds } }) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Get read receipts for multiple messages (batch)
 */
export const GET_MESSAGES_READ_BY = gql`
  query GetMessagesReadBy($messageIds: [uuid!]!) {
    nchat_read_receipts(
      where: { message_id: { _in: $messageIds } }
      order_by: { message_id: asc, read_at: asc }
    ) {
      message_id
      user_id
      read_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save edit history when a message is edited
 * (This is typically handled by a database trigger, but available for manual use)
 */
export const SAVE_MESSAGE_EDIT = gql`
  mutation SaveMessageEdit(
    $messageId: uuid!
    $editorId: uuid!
    $previousContent: String!
    $newContent: String!
    $changeSummary: String
  ) {
    insert_nchat_message_edits_one(
      object: {
        message_id: $messageId
        editor_id: $editorId
        previous_content: $previousContent
        new_content: $newContent
        change_summary: $changeSummary
      }
    ) {
      ...MessageEditHistory
    }
  }
  ${MESSAGE_EDIT_HISTORY_FRAGMENT}
`;

/**
 * Update message delivery status
 */
export const UPDATE_MESSAGE_STATUS = gql`
  mutation UpdateMessageStatus(
    $messageId: uuid!
    $status: String!
    $deliveredCount: Int
    $readCount: Int
    $totalRecipients: Int
    $error: String
  ) {
    insert_nchat_message_status_one(
      object: {
        message_id: $messageId
        status: $status
        delivered_count: $deliveredCount
        read_count: $readCount
        total_recipients: $totalRecipients
        error: $error
        updated_at: "now()"
      }
      on_conflict: {
        constraint: nchat_message_status_pkey
        update_columns: [status, delivered_count, read_count, error, updated_at]
      }
    ) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Mark message as delivered
 */
export const MARK_MESSAGE_DELIVERED = gql`
  mutation MarkMessageDelivered(
    $messageId: uuid!
    $deliveredCount: Int
    $totalRecipients: Int
  ) {
    insert_nchat_message_status_one(
      object: {
        message_id: $messageId
        status: "delivered"
        delivered_count: $deliveredCount
        total_recipients: $totalRecipients
        updated_at: "now()"
      }
      on_conflict: {
        constraint: nchat_message_status_pkey
        update_columns: [status, delivered_count, updated_at]
      }
    ) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Delete edit history for a message (admin only)
 */
export const DELETE_MESSAGE_EDIT_HISTORY = gql`
  mutation DeleteMessageEditHistory($messageId: uuid!) {
    delete_nchat_message_edits(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to message status updates
 */
export const MESSAGE_STATUS_SUBSCRIPTION = gql`
  subscription MessageStatusSubscription($messageId: uuid!) {
    nchat_message_status_by_pk(message_id: $messageId) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Subscribe to message status updates for multiple messages
 */
export const MESSAGES_STATUS_SUBSCRIPTION = gql`
  subscription MessagesStatusSubscription($messageIds: [uuid!]!) {
    nchat_message_status(where: { message_id: { _in: $messageIds } }) {
      ...MessageStatus
    }
  }
  ${MESSAGE_STATUS_FRAGMENT}
`;

/**
 * Subscribe to new read receipts for a message
 */
export const MESSAGE_READ_BY_SUBSCRIPTION = gql`
  subscription MessageReadBySubscription($messageId: uuid!) {
    nchat_read_receipts(
      where: { message_id: { _eq: $messageId } }
      order_by: { read_at: desc }
      limit: 1
    ) {
      user_id
      read_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to edit history updates for a message
 */
export const MESSAGE_EDIT_HISTORY_SUBSCRIPTION = gql`
  subscription MessageEditHistorySubscription($messageId: uuid!) {
    nchat_message_edits(
      where: { message_id: { _eq: $messageId } }
      order_by: { edited_at: desc }
      limit: 1
    ) {
      ...MessageEditHistory
    }
  }
  ${MESSAGE_EDIT_HISTORY_FRAGMENT}
`;

/**
 * Subscribe to status stream for real-time updates
 */
export const MESSAGE_STATUS_STREAM_SUBSCRIPTION = gql`
  subscription MessageStatusStreamSubscription($channelId: uuid!) {
    nchat_message_status_stream(
      cursor: { initial_value: { updated_at: "now()" } }
      batch_size: 10
      where: { message: { channel_id: { _eq: $channelId } } }
    ) {
      message_id
      status
      delivered_count
      read_count
      total_recipients
      error
      updated_at
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform GraphQL edit history to app format
 */
export function transformEditHistory(data: MessageEditHistoryRecord[]): Array<{
  previousContent: string;
  newContent: string;
  changeSummary: string | null;
  editedAt: Date;
  editorId: string;
}> {
  return data.map((record) => ({
    previousContent: record.previous_content,
    newContent: record.new_content,
    changeSummary: record.change_summary,
    editedAt: new Date(record.edited_at),
    editorId: record.editor_id,
  }));
}

/**
 * Transform GraphQL read receipts to app format
 */
export function transformReadReceipts(data: MessageReadByData[]): Array<{
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  readAt: Date;
}> {
  return data.map((record) => ({
    user: {
      id: record.user.id,
      username: record.user.username,
      displayName: record.user.display_name,
      avatarUrl: record.user.avatar_url,
    },
    readAt: new Date(record.read_at),
  }));
}
