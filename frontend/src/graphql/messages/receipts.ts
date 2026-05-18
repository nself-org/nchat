/**
 * Message Delivery Receipts GraphQL Operations
 *
 * GraphQL queries, mutations, and subscriptions for message delivery receipts.
 * Supports sent, delivered, and read status tracking for messages.
 *
 * @module graphql/messages/receipts
 * @version 1.0.0
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Receipt status enum
 */
export type ReceiptStatus = "sent" | "delivered" | "read";

/**
 * Individual delivery receipt
 */
export interface DeliveryReceipt {
  id: string;
  messageId: string;
  userId: string;
  status: ReceiptStatus;
  deliveredAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

/**
 * Aggregated receipt summary for a message
 */
export interface ReceiptSummary {
  messageId: string;
  totalRecipients: number;
  deliveredCount: number;
  readCount: number;
  receipts: DeliveryReceipt[];
}

/**
 * Variables for receipt queries
 */
export interface GetReceiptsVariables {
  messageId: string;
}

export interface MarkDeliveredVariables {
  messageId: string;
  userId: string;
}

export interface MarkReadVariables {
  messageId: string;
  userId: string;
}

export interface GetUnreadCountVariables {
  channelId: string;
  userId: string;
}

export interface MarkChannelReadVariables {
  channelId: string;
  userId: string;
}

export interface ReceiptSubscriptionVariables {
  messageId?: string;
  channelId?: string;
  userId?: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

/**
 * Base fragment for delivery receipts
 */
export const DELIVERY_RECEIPT_FRAGMENT = gql`
  fragment DeliveryReceipt on nchat_message_receipts {
    id
    message_id
    user_id
    status
    delivered_at
    read_at
    created_at
    updated_at
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
 * Get all receipts for a specific message
 */
export const GET_MESSAGE_RECEIPTS = gql`
  query GetMessageReceipts($messageId: uuid!) {
    nchat_message_receipts(
      where: { message_id: { _eq: $messageId } }
      order_by: { updated_at: desc }
    ) {
      ...DeliveryReceipt
    }
    nchat_message_receipts_aggregate(
      where: { message_id: { _eq: $messageId } }
    ) {
      aggregate {
        count
      }
    }
    delivered: nchat_message_receipts_aggregate(
      where: {
        message_id: { _eq: $messageId }
        status: { _in: ["delivered", "read"] }
      }
    ) {
      aggregate {
        count
      }
    }
    read: nchat_message_receipts_aggregate(
      where: { message_id: { _eq: $messageId }, status: { _eq: "read" } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Get receipt status for a specific user and message
 */
export const GET_USER_RECEIPT = gql`
  query GetUserReceipt($messageId: uuid!, $userId: uuid!) {
    nchat_message_receipts(
      where: { message_id: { _eq: $messageId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      ...DeliveryReceipt
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Get unread message count for a channel
 */
export const GET_UNREAD_MESSAGE_COUNT = gql`
  query GetUnreadMessageCount($channelId: uuid!, $userId: uuid!) {
    nchat_messages_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        user_id: { _neq: $userId }
        _not: {
          receipts: { user_id: { _eq: $userId }, status: { _eq: "read" } }
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
 * Get receipts for multiple messages (batch query)
 */
export const GET_MESSAGES_RECEIPTS = gql`
  query GetMessagesReceipts($messageIds: [uuid!]!) {
    nchat_message_receipts(
      where: { message_id: { _in: $messageIds } }
      order_by: { message_id: asc, updated_at: desc }
    ) {
      ...DeliveryReceipt
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Get read status for channel members (who has read the latest message)
 */
export const GET_CHANNEL_READ_STATUS = gql`
  query GetChannelReadStatus($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      last_read_message_id
      last_read_at
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
 * Mark a message as delivered
 * Creates or updates the receipt record
 */
export const MARK_MESSAGE_DELIVERED = gql`
  mutation MarkMessageDelivered($messageId: uuid!, $userId: uuid!) {
    insert_nchat_message_receipts_one(
      object: {
        message_id: $messageId
        user_id: $userId
        status: "delivered"
        delivered_at: "now()"
      }
      on_conflict: {
        constraint: nchat_message_receipts_message_id_user_id_key
        update_columns: [status, delivered_at, updated_at]
        where: { status: { _eq: "sent" } }
      }
    ) {
      ...DeliveryReceipt
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Mark a message as read (via receipt)
 * Updates the receipt record to read status
 */
export const MARK_RECEIPT_READ = gql`
  mutation MarkReceiptRead($messageId: uuid!, $userId: uuid!) {
    insert_nchat_message_receipts_one(
      object: {
        message_id: $messageId
        user_id: $userId
        status: "read"
        delivered_at: "now()"
        read_at: "now()"
      }
      on_conflict: {
        constraint: nchat_message_receipts_message_id_user_id_key
        update_columns: [status, read_at, updated_at]
      }
    ) {
      ...DeliveryReceipt
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Bulk mark messages as delivered
 */
export const BULK_MARK_DELIVERED = gql`
  mutation BulkMarkDelivered(
    $objects: [nchat_message_receipts_insert_input!]!
  ) {
    insert_nchat_message_receipts(
      objects: $objects
      on_conflict: {
        constraint: nchat_message_receipts_message_id_user_id_key
        update_columns: [status, delivered_at, updated_at]
        where: { status: { _eq: "sent" } }
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        status
      }
    }
  }
`;

/**
 * Mark all messages in a channel as read for a user
 */
export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead($channelId: uuid!, $userId: uuid!) {
    # Update channel member's last read state
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()", unread_count: 0, mention_count: 0 }
    ) {
      affected_rows
      returning {
        id
        last_read_message_id
        last_read_at
        unread_count
      }
    }
    # Bulk update all message receipts for this channel
    update_nchat_message_receipts(
      where: {
        user_id: { _eq: $userId }
        message: { channel_id: { _eq: $channelId } }
        status: { _neq: "read" }
      }
      _set: { status: "read", read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Create initial sent receipt when message is created
 * This is typically called by the message service when sending
 */
export const CREATE_SENT_RECEIPTS = gql`
  mutation CreateSentReceipts(
    $objects: [nchat_message_receipts_insert_input!]!
  ) {
    insert_nchat_message_receipts(
      objects: $objects
      on_conflict: {
        constraint: nchat_message_receipts_message_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        user_id
        status
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to receipt updates for a specific message
 */
export const MESSAGE_RECEIPTS_SUBSCRIPTION = gql`
  subscription MessageReceiptsSubscription($messageId: uuid!) {
    nchat_message_receipts(
      where: { message_id: { _eq: $messageId } }
      order_by: { updated_at: desc }
    ) {
      ...DeliveryReceipt
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Subscribe to receipt updates for messages in a channel
 * Useful for showing read receipts in message list
 */
export const CHANNEL_RECEIPTS_SUBSCRIPTION = gql`
  subscription ChannelReceiptsSubscription($channelId: uuid!) {
    nchat_message_receipts(
      where: { message: { channel_id: { _eq: $channelId } } }
      order_by: { updated_at: desc }
      limit: 100
    ) {
      ...DeliveryReceipt
      message {
        id
        channel_id
      }
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Subscribe to receipt updates for the current user
 * Useful for tracking delivery confirmations of sent messages
 */
export const USER_SENT_RECEIPTS_SUBSCRIPTION = gql`
  subscription UserSentReceiptsSubscription($userId: uuid!) {
    nchat_message_receipts(
      where: {
        message: { user_id: { _eq: $userId } }
        user_id: { _neq: $userId }
      }
      order_by: { updated_at: desc }
      limit: 50
    ) {
      ...DeliveryReceipt
      message {
        id
        channel_id
        user_id
      }
    }
  }
  ${DELIVERY_RECEIPT_FRAGMENT}
`;

/**
 * Subscribe to read status changes using streaming
 */
export const RECEIPT_STREAM_SUBSCRIPTION = gql`
  subscription ReceiptStreamSubscription($channelId: uuid!) {
    nchat_message_receipts_stream(
      cursor: { initial_value: { updated_at: "now()" } }
      batch_size: 20
      where: { message: { channel_id: { _eq: $channelId } } }
    ) {
      id
      message_id
      user_id
      status
      delivered_at
      read_at
      updated_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform raw GraphQL receipt data to DeliveryReceipt
 */
export function transformReceipt(
  data: Record<string, unknown>,
): DeliveryReceipt {
  return {
    id: data.id as string,
    messageId: data.message_id as string,
    userId: data.user_id as string,
    status: data.status as ReceiptStatus,
    deliveredAt: data.delivered_at
      ? new Date(data.delivered_at as string)
      : null,
    readAt: data.read_at ? new Date(data.read_at as string) : null,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
    user: data.user
      ? {
          id: (data.user as Record<string, unknown>).id as string,
          username: (data.user as Record<string, unknown>).username as string,
          displayName:
            ((data.user as Record<string, unknown>).display_name as string) ||
            ((data.user as Record<string, unknown>).username as string),
          avatarUrl: (data.user as Record<string, unknown>).avatar_url as
            | string
            | undefined,
        }
      : undefined,
  };
}

/**
 * Transform array of receipts
 */
export function transformReceipts(data: unknown[]): DeliveryReceipt[] {
  return data.map((r) => transformReceipt(r as Record<string, unknown>));
}

/**
 * Build receipt summary from query results
 */
export function buildReceiptSummary(
  messageId: string,
  receipts: DeliveryReceipt[],
  totalCount: number,
  deliveredCount: number,
  readCount: number,
): ReceiptSummary {
  return {
    messageId,
    totalRecipients: totalCount,
    deliveredCount,
    readCount,
    receipts,
  };
}

/**
 * Get the highest receipt status from a list
 * Priority: read > delivered > sent
 */
export function getHighestStatus(receipts: DeliveryReceipt[]): ReceiptStatus {
  if (receipts.some((r) => r.status === "read")) return "read";
  if (receipts.some((r) => r.status === "delivered")) return "delivered";
  return "sent";
}

/**
 * Format receipt status for display
 */
export function formatReceiptStatus(
  status: ReceiptStatus,
  deliveredCount?: number,
  readCount?: number,
  totalRecipients?: number,
): string {
  if (totalRecipients === undefined) {
    switch (status) {
      case "read":
        return "Read";
      case "delivered":
        return "Delivered";
      case "sent":
      default:
        return "Sent";
    }
  }

  // Group message format
  const delivered = deliveredCount || 0;
  const read = readCount || 0;

  if (read === totalRecipients) {
    return `Read by all (${read})`;
  }

  if (read > 0 && delivered > 0) {
    return `Delivered: ${delivered}, Read: ${read}`;
  }

  if (delivered === totalRecipients) {
    return `Delivered to all (${delivered})`;
  }

  if (delivered > 0) {
    return `Delivered to ${delivered} of ${totalRecipients}`;
  }

  return "Sent";
}
