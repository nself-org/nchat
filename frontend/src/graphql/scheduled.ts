import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT, CHANNEL_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ScheduledMessage {
  id: string;
  user_id: string;
  channel_id: string;
  content: string;
  scheduled_at: string;
  timezone: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  type: "text" | "image" | "file" | "video" | "audio" | "code";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  error_message?: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    type: string;
    is_private: boolean;
    is_archived: boolean;
    is_default: boolean;
  };
}

export interface CreateScheduledMessageVariables {
  userId: string;
  channelId: string;
  content: string;
  scheduledAt: string;
  timezone: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateScheduledMessageVariables {
  id: string;
  content?: string;
  scheduledAt?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

export interface DeleteScheduledMessageVariables {
  id: string;
}

export interface GetScheduledMessagesVariables {
  userId: string;
  channelId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SendScheduledNowVariables {
  id: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const SCHEDULED_MESSAGE_FRAGMENT = gql`
  fragment ScheduledMessage on nchat_scheduled_messages {
    id
    user_id
    channel_id
    content
    scheduled_at
    timezone
    status
    type
    metadata
    created_at
    updated_at
    sent_at
    error_message
    user {
      ...UserBasic
    }
    channel {
      ...ChannelBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all scheduled messages for a user
 * Optionally filter by channel and/or status
 */
export const GET_SCHEDULED_MESSAGES = gql`
  query GetScheduledMessages(
    $userId: uuid!
    $channelId: uuid
    $status: String = "pending"
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_scheduled_messages(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        status: { _eq: $status }
      }
      order_by: { scheduled_at: asc }
      limit: $limit
      offset: $offset
    ) {
      ...ScheduledMessage
    }
    nchat_scheduled_messages_aggregate(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        status: { _eq: $status }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Get a single scheduled message by ID
 */
export const GET_SCHEDULED_MESSAGE = gql`
  query GetScheduledMessage($id: uuid!) {
    nchat_scheduled_messages_by_pk(id: $id) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Get all pending scheduled messages for a specific channel
 */
export const GET_CHANNEL_SCHEDULED_MESSAGES = gql`
  query GetChannelScheduledMessages($channelId: uuid!, $userId: uuid!) {
    nchat_scheduled_messages(
      where: {
        channel_id: { _eq: $channelId }
        user_id: { _eq: $userId }
        status: { _eq: "pending" }
      }
      order_by: { scheduled_at: asc }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Get count of pending scheduled messages
 */
export const GET_SCHEDULED_MESSAGES_COUNT = gql`
  query GetScheduledMessagesCount($userId: uuid!) {
    nchat_scheduled_messages_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "pending" } }
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
 * Create a new scheduled message
 */
export const CREATE_SCHEDULED_MESSAGE = gql`
  mutation CreateScheduledMessage(
    $userId: uuid!
    $channelId: uuid!
    $content: String!
    $scheduledAt: timestamptz!
    $timezone: String!
    $type: String = "text"
    $metadata: jsonb
  ) {
    insert_nchat_scheduled_messages_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        content: $content
        scheduled_at: $scheduledAt
        timezone: $timezone
        type: $type
        metadata: $metadata
        status: "pending"
      }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Update a scheduled message
 * Can update content, scheduled time, or metadata
 */
export const UPDATE_SCHEDULED_MESSAGE = gql`
  mutation UpdateScheduledMessage(
    $id: uuid!
    $content: String
    $scheduledAt: timestamptz
    $timezone: String
    $metadata: jsonb
  ) {
    update_nchat_scheduled_messages_by_pk(
      pk_columns: { id: $id }
      _set: {
        content: $content
        scheduled_at: $scheduledAt
        timezone: $timezone
        metadata: $metadata
        updated_at: "now()"
      }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Delete (cancel) a scheduled message
 * Sets status to cancelled rather than hard delete
 */
export const DELETE_SCHEDULED_MESSAGE = gql`
  mutation DeleteScheduledMessage($id: uuid!) {
    update_nchat_scheduled_messages_by_pk(
      pk_columns: { id: $id }
      _set: { status: "cancelled", updated_at: "now()" }
    ) {
      id
      status
      updated_at
    }
  }
`;

/**
 * Hard delete a scheduled message (admin only)
 */
export const HARD_DELETE_SCHEDULED_MESSAGE = gql`
  mutation HardDeleteScheduledMessage($id: uuid!) {
    delete_nchat_scheduled_messages_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Send a scheduled message immediately
 * This marks it for immediate sending by the backend
 */
export const SEND_SCHEDULED_NOW = gql`
  mutation SendScheduledNow($id: uuid!) {
    update_nchat_scheduled_messages_by_pk(
      pk_columns: { id: $id }
      _set: { scheduled_at: "now()", updated_at: "now()" }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Bulk cancel scheduled messages
 */
export const BULK_CANCEL_SCHEDULED_MESSAGES = gql`
  mutation BulkCancelScheduledMessages($ids: [uuid!]!) {
    update_nchat_scheduled_messages(
      where: { id: { _in: $ids }, status: { _eq: "pending" } }
      _set: { status: "cancelled", updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to changes in scheduled messages for a user
 */
export const SCHEDULED_MESSAGES_SUBSCRIPTION = gql`
  subscription ScheduledMessagesSubscription($userId: uuid!) {
    nchat_scheduled_messages(
      where: { user_id: { _eq: $userId }, status: { _eq: "pending" } }
      order_by: { scheduled_at: asc }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Subscribe to a single scheduled message status
 */
export const SCHEDULED_MESSAGE_STATUS_SUBSCRIPTION = gql`
  subscription ScheduledMessageStatusSubscription($id: uuid!) {
    nchat_scheduled_messages_by_pk(id: $id) {
      id
      status
      sent_at
      error_message
      updated_at
    }
  }
`;
