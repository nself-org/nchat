import { gql } from "@apollo/client";
import { READ_RECEIPT_FRAGMENT, USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetReadReceiptsVariables {
  messageId?: string;
  channelId?: string;
  userId?: string;
}

export interface MarkChannelReadVariables {
  channelId: string;
  userId: string;
  messageId?: string;
}

export interface ReadReceiptSubscriptionVariables {
  channelId: string;
}

export interface UnreadInfo {
  channelId: string;
  unreadCount: number;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  hasMention: boolean;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get read receipts for a specific message
 */
export const GET_READ_RECEIPTS = gql`
  query GetReadReceipts($messageId: uuid!) {
    nchat_read_receipts(
      where: { message_id: { _eq: $messageId } }
      order_by: { read_at: asc }
    ) {
      ...ReadReceipt
    }
    nchat_read_receipts_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
    }
  }
  ${READ_RECEIPT_FRAGMENT}
`;

/**
 * Get read receipts for multiple messages (batch)
 */
export const GET_MESSAGES_READ_RECEIPTS = gql`
  query GetMessagesReadReceipts($messageIds: [uuid!]!) {
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

/**
 * Get channel read status for a user
 */
export const GET_CHANNEL_READ_STATUS = gql`
  query GetChannelReadStatus($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      last_read_at
      last_read_message_id
      channel {
        id
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
        last_message: messages(
          limit: 1
          order_by: { created_at: desc }
          where: { is_deleted: { _eq: false } }
        ) {
          id
          created_at
        }
      }
    }
  }
`;

/**
 * Get unread counts for all channels
 */
export const GET_ALL_UNREAD_COUNTS = gql`
  query GetAllUnreadCounts($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel_id
      last_read_at
      last_read_message_id
      channel {
        id
        name
        slug
        type
        unread_count: messages_aggregate(
          where: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
            user_id: { _neq: $userId }
          }
        ) {
          aggregate {
            count
          }
        }
        has_mention: messages(
          where: {
            created_at: { _gt: "last_read_at" }
            mentions: { user_id: { _eq: $userId } }
            is_deleted: { _eq: false }
          }
          limit: 1
        ) {
          id
        }
      }
    }
  }
`;

/**
 * Get who has read up to a specific point in channel
 */
export const GET_CHANNEL_READERS = gql`
  query GetChannelReaders($channelId: uuid!, $afterMessageId: uuid) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        last_read_message_id: { _gte: $afterMessageId }
      }
      order_by: { last_read_at: desc }
    ) {
      user_id
      last_read_at
      last_read_message_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get the last read position for all channel members
 */
export const GET_CHANNEL_READ_POSITIONS = gql`
  query GetChannelReadPositions($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      last_read_at
      last_read_message_id
      user {
        ...UserBasic
        presence {
          status
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get first unread message in a channel
 */
export const GET_FIRST_UNREAD_MESSAGE = gql`
  query GetFirstUnreadMessage($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      last_read_at
      channel {
        first_unread: messages(
          where: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
          }
          order_by: { created_at: asc }
          limit: 1
        ) {
          id
          created_at
        }
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark channel as read up to latest message
 */
export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead($channelId: uuid!, $userId: uuid!) {
    # Get latest message ID first, then update
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        last_read_at
        last_read_message_id
      }
    }
  }
`;

/**
 * Mark channel as read up to specific message
 */
export const MARK_CHANNEL_READ_TO_MESSAGE = gql`
  mutation MarkChannelReadToMessage(
    $channelId: uuid!
    $userId: uuid!
    $messageId: uuid!
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()", last_read_message_id: $messageId }
    ) {
      affected_rows
      returning {
        id
        last_read_at
        last_read_message_id
      }
    }
  }
`;

/**
 * Create a read receipt for a specific message
 */
export const CREATE_READ_RECEIPT = gql`
  mutation CreateReadReceipt(
    $messageId: uuid!
    $userId: uuid!
    $channelId: uuid!
  ) {
    insert_nchat_read_receipts_one(
      object: {
        message_id: $messageId
        user_id: $userId
        channel_id: $channelId
        read_at: "now()"
      }
      on_conflict: {
        constraint: nchat_read_receipts_user_id_message_id_key
        update_columns: [read_at]
      }
    ) {
      id
      read_at
    }
    # Also update channel member's last read
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()", last_read_message_id: $messageId }
    ) {
      affected_rows
    }
  }
`;

/**
 * Mark all channels as read
 */
export const MARK_ALL_CHANNELS_READ = gql`
  mutation MarkAllChannelsRead($userId: uuid!) {
    update_nchat_channel_members(
      where: { user_id: { _eq: $userId } }
      _set: { last_read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

// MARK_THREAD_READ is defined in threads.ts

/**
 * Bulk create read receipts (for marking multiple messages as read)
 */
export const BULK_CREATE_READ_RECEIPTS = gql`
  mutation BulkCreateReadReceipts(
    $receipts: [nchat_read_receipts_insert_input!]!
  ) {
    insert_nchat_read_receipts(
      objects: $receipts
      on_conflict: {
        constraint: nchat_read_receipts_user_id_message_id_key
        update_columns: [read_at]
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Clear read receipts older than a certain date (maintenance)
 */
export const CLEANUP_OLD_READ_RECEIPTS = gql`
  mutation CleanupOldReadReceipts($olderThan: timestamptz!) {
    delete_nchat_read_receipts(where: { read_at: { _lt: $olderThan } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to read receipts for a channel
 */
export const READ_RECEIPT_SUBSCRIPTION = gql`
  subscription ReadReceiptSubscription($channelId: uuid!) {
    nchat_read_receipts(
      where: { channel_id: { _eq: $channelId } }
      order_by: { read_at: desc }
      limit: 20
    ) {
      id
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

/**
 * Subscribe to read status changes for a specific message
 */
export const MESSAGE_READ_STATUS_SUBSCRIPTION = gql`
  subscription MessageReadStatusSubscription($messageId: uuid!) {
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
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel member read positions
 */
export const CHANNEL_READ_POSITIONS_SUBSCRIPTION = gql`
  subscription ChannelReadPositionsSubscription($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      last_read_at
      last_read_message_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to unread count changes for a user
 */
export const UNREAD_COUNTS_SUBSCRIPTION = gql`
  subscription UnreadCountsSubscription($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel_id
      last_read_at
      channel {
        id
        name
        unread: messages_aggregate(
          where: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
            user_id: { _neq: $userId }
          }
        ) {
          aggregate {
            count
          }
        }
      }
    }
  }
`;

/**
 * Subscribe to read receipt stream
 */
export const READ_RECEIPT_STREAM_SUBSCRIPTION = gql`
  subscription ReadReceiptStreamSubscription($channelId: uuid!) {
    nchat_read_receipts_stream(
      cursor: { initial_value: { read_at: "now()" } }
      batch_size: 20
      where: { channel_id: { _eq: $channelId } }
    ) {
      id
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
