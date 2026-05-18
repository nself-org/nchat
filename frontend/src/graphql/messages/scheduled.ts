/**
 * Scheduled Messages GraphQL Operations
 *
 * Comprehensive queries and mutations for scheduled message CRUD.
 * Connects to the Hasura GraphQL backend via nchat_scheduled_message table.
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ScheduledMessageStatus =
  | "pending"
  | "sent"
  | "failed"
  | "cancelled";

export interface ScheduledMessage {
  id: string;
  userId: string;
  channelId: string;
  content: string;
  scheduledAt: Date;
  status: ScheduledMessageStatus;
  retryCount: number;
  maxRetries: number;
  threadId?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  createdAt: Date;
  sentAt?: Date;
  errorMessage?: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface GetScheduledMessagesVariables {
  userId: string;
  status?: ScheduledMessageStatus;
  channelId?: string;
  limit?: number;
  offset?: number;
}

export interface GetScheduledMessageVariables {
  id: string;
}

export interface InsertScheduledMessageVariables {
  userId: string;
  channelId: string;
  content: string;
  scheduledAt: string;
  threadId?: string;
  attachments?: unknown;
  maxRetries?: number;
}

export interface UpdateScheduledMessageVariables {
  id: string;
  content?: string;
  scheduledAt?: string;
  threadId?: string;
  attachments?: unknown;
}

export interface DeleteScheduledMessageVariables {
  id: string;
}

export interface UpdateScheduledMessageStatusVariables {
  id: string;
  status: ScheduledMessageStatus;
  sentAt?: string;
  errorMessage?: string;
  retryCount?: number;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const SCHEDULED_MESSAGE_FRAGMENT = gql`
  fragment ScheduledMessage on nchat_scheduled_message {
    id
    user_id
    channel_id
    content
    scheduled_at
    status
    retry_count
    max_retries
    thread_id
    attachments
    created_at
    sent_at
    error_message
    user {
      ...UserBasic
    }
    channel {
      id
      name
      slug
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const SCHEDULED_MESSAGE_BASIC_FRAGMENT = gql`
  fragment ScheduledMessageBasic on nchat_scheduled_message {
    id
    user_id
    channel_id
    content
    scheduled_at
    status
    retry_count
    created_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get scheduled messages for a user with pagination and filtering
 */
export const GET_SCHEDULED_MESSAGES = gql`
  query GetScheduledMessages(
    $userId: uuid!
    $status: String
    $channelId: uuid
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_scheduled_message(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
      }
      order_by: { scheduled_at: asc }
      limit: $limit
      offset: $offset
    ) {
      ...ScheduledMessage
    }
    nchat_scheduled_message_aggregate(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
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
    nchat_scheduled_message_by_pk(id: $id) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Get scheduled messages that are due for sending
 * Used by the job processor to find messages ready to send
 */
export const GET_DUE_SCHEDULED_MESSAGES = gql`
  query GetDueScheduledMessages($currentTime: timestamptz!, $limit: Int = 100) {
    nchat_scheduled_message(
      where: {
        status: { _eq: "pending" }
        scheduled_at: { _lte: $currentTime }
      }
      order_by: { scheduled_at: asc }
      limit: $limit
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Get scheduled messages count by status for a user
 */
export const GET_SCHEDULED_MESSAGES_COUNT = gql`
  query GetScheduledMessagesCount($userId: uuid!) {
    pending: nchat_scheduled_message_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "pending" } }
    ) {
      aggregate {
        count
      }
    }
    sent: nchat_scheduled_message_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "sent" } }
    ) {
      aggregate {
        count
      }
    }
    failed: nchat_scheduled_message_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "failed" } }
    ) {
      aggregate {
        count
      }
    }
    cancelled: nchat_scheduled_message_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "cancelled" } }
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
export const INSERT_SCHEDULED_MESSAGE = gql`
  mutation InsertScheduledMessage(
    $userId: uuid!
    $channelId: uuid!
    $content: String!
    $scheduledAt: timestamptz!
    $threadId: uuid
    $attachments: jsonb
    $maxRetries: Int = 3
  ) {
    insert_nchat_scheduled_message_one(
      object: {
        user_id: $userId
        channel_id: $channelId
        content: $content
        scheduled_at: $scheduledAt
        thread_id: $threadId
        attachments: $attachments
        max_retries: $maxRetries
        status: "pending"
        retry_count: 0
      }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Update a scheduled message (content, time, etc.)
 * Only allowed for pending messages
 */
export const UPDATE_SCHEDULED_MESSAGE = gql`
  mutation UpdateScheduledMessage(
    $id: uuid!
    $content: String
    $scheduledAt: timestamptz
    $threadId: uuid
    $attachments: jsonb
  ) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _set: {
        content: $content
        scheduled_at: $scheduledAt
        thread_id: $threadId
        attachments: $attachments
      }
    ) {
      ...ScheduledMessage
    }
  }
  ${SCHEDULED_MESSAGE_FRAGMENT}
`;

/**
 * Cancel a scheduled message (set status to cancelled)
 */
export const DELETE_SCHEDULED_MESSAGE = gql`
  mutation DeleteScheduledMessage($id: uuid!) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _set: { status: "cancelled" }
    ) {
      id
      status
    }
  }
`;

/**
 * Update scheduled message status (for job processing)
 */
export const UPDATE_SCHEDULED_MESSAGE_STATUS = gql`
  mutation UpdateScheduledMessageStatus(
    $id: uuid!
    $status: String!
    $sentAt: timestamptz
    $errorMessage: String
    $retryCount: Int
  ) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: $status
        sent_at: $sentAt
        error_message: $errorMessage
        retry_count: $retryCount
      }
    ) {
      id
      status
      sent_at
      error_message
      retry_count
    }
  }
`;

/**
 * Increment retry count for a scheduled message
 */
export const INCREMENT_SCHEDULED_MESSAGE_RETRY = gql`
  mutation IncrementScheduledMessageRetry($id: uuid!, $errorMessage: String) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _inc: { retry_count: 1 }
      _set: { error_message: $errorMessage }
    ) {
      id
      retry_count
      max_retries
      error_message
    }
  }
`;

/**
 * Hard delete a scheduled message (admin only)
 */
export const HARD_DELETE_SCHEDULED_MESSAGE = gql`
  mutation HardDeleteScheduledMessage($id: uuid!) {
    delete_nchat_scheduled_message_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Bulk cancel scheduled messages
 */
export const BULK_CANCEL_SCHEDULED_MESSAGES = gql`
  mutation BulkCancelScheduledMessages($ids: [uuid!]!) {
    update_nchat_scheduled_message(
      where: { id: { _in: $ids }, status: { _eq: "pending" } }
      _set: { status: "cancelled" }
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
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform GraphQL scheduled message data to ScheduledMessage type
 */
export function transformScheduledMessage(
  data: Record<string, unknown>,
): ScheduledMessage {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    channelId: data.channel_id as string,
    content: data.content as string,
    scheduledAt: new Date(data.scheduled_at as string),
    status: data.status as ScheduledMessageStatus,
    retryCount: (data.retry_count as number) || 0,
    maxRetries: (data.max_retries as number) || 3,
    threadId: data.thread_id as string | undefined,
    attachments: data.attachments as ScheduledMessage["attachments"],
    createdAt: new Date(data.created_at as string),
    sentAt: data.sent_at ? new Date(data.sent_at as string) : undefined,
    errorMessage: data.error_message as string | undefined,
    user: data.user
      ? transformUser(data.user as Record<string, unknown>)
      : undefined,
    channel: data.channel
      ? transformChannel(data.channel as Record<string, unknown>)
      : undefined,
  };
}

/**
 * Transform multiple scheduled messages
 */
export function transformScheduledMessages(
  data: unknown[],
): ScheduledMessage[] {
  return data.map((m) =>
    transformScheduledMessage(m as Record<string, unknown>),
  );
}

/**
 * Transform user data
 */
function transformUser(
  data: Record<string, unknown>,
): ScheduledMessage["user"] {
  return {
    id: data.id as string,
    username: data.username as string,
    displayName: (data.display_name as string) || (data.username as string),
    avatarUrl: data.avatar_url as string | undefined,
  };
}

/**
 * Transform channel data
 */
function transformChannel(
  data: Record<string, unknown>,
): ScheduledMessage["channel"] {
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
  };
}
