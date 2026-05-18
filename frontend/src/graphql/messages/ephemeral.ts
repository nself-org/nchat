/**
 * Ephemeral Messages GraphQL Operations
 *
 * Provides GraphQL queries and mutations for disappearing messages
 * with server-side TTL enforcement.
 *
 * @module graphql/messages/ephemeral
 * @version 1.0.0
 */

import { gql } from "@apollo/client";
import { MESSAGE_FULL_FRAGMENT, CHANNEL_BASIC_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetEphemeralMessagesVariables {
  channelId: string;
  limit?: number;
  offset?: number;
}

export interface GetExpiredMessagesVariables {
  limit?: number;
  now?: string;
}

export interface SetMessageTTLVariables {
  messageId: string;
  ttlSeconds: number;
  expiresAt: string;
}

export interface UpdateChannelDefaultTTLVariables {
  channelId: string;
  ttlSeconds: number | null;
}

export interface DeleteExpiredMessagesVariables {
  now: string;
  limit?: number;
}

export interface ClearMessageTTLVariables {
  messageId: string;
}

export interface ExtendMessageTTLVariables {
  messageId: string;
  expiresAt: string;
}

export interface GetMessageTTLVariables {
  messageId: string;
}

export interface GetChannelTTLVariables {
  channelId: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface MessageWithTTL {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  ttl_seconds: number | null;
  expires_at: string | null;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ChannelWithTTL {
  id: string;
  name: string;
  slug: string;
  default_message_ttl_seconds: number | null;
}

export interface EphemeralMessagesResult {
  nchat_messages: MessageWithTTL[];
  nchat_messages_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface ExpiredMessagesResult {
  nchat_messages: Array<{
    id: string;
    channel_id: string;
    user_id: string;
    expires_at: string;
    created_at: string;
  }>;
  nchat_messages_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface SetMessageTTLResult {
  update_nchat_messages_by_pk: {
    id: string;
    ttl_seconds: number | null;
    expires_at: string | null;
  } | null;
}

export interface UpdateChannelTTLResult {
  update_nchat_channels_by_pk: {
    id: string;
    name: string;
    default_message_ttl_seconds: number | null;
  } | null;
}

export interface DeleteExpiredMessagesResult {
  delete_nchat_messages: {
    affected_rows: number;
    returning: Array<{
      id: string;
      channel_id: string;
    }>;
  };
}

export interface ClearMessageTTLResult {
  update_nchat_messages_by_pk: {
    id: string;
    ttl_seconds: number | null;
    expires_at: string | null;
  } | null;
}

export interface GetMessageTTLResult {
  nchat_messages_by_pk: {
    id: string;
    ttl_seconds: number | null;
    expires_at: string | null;
    created_at: string;
    user_id: string;
    channel_id: string;
    channel: {
      id: string;
      name: string;
      default_message_ttl_seconds: number | null;
      created_by: string;
    };
  } | null;
}

export interface GetChannelTTLResult {
  nchat_channels_by_pk: {
    id: string;
    name: string;
    default_message_ttl_seconds: number | null;
    created_by: string;
  } | null;
}

// ============================================================================
// EPHEMERAL MESSAGE FRAGMENT
// ============================================================================

export const EPHEMERAL_MESSAGE_FRAGMENT = gql`
  fragment EphemeralMessage on nchat_messages {
    id
    channel_id
    user_id
    content
    content_html
    type
    ttl_seconds
    expires_at
    created_at
    updated_at
    is_edited
    is_deleted
    user {
      id
      username
      display_name
      avatar_url
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get ephemeral messages (messages with TTL set) for a channel
 */
export const GET_EPHEMERAL_MESSAGES = gql`
  query GetEphemeralMessages(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        ttl_seconds: { _is_null: false }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...EphemeralMessage
    }
    nchat_messages_aggregate(
      where: {
        channel_id: { _eq: $channelId }
        ttl_seconds: { _is_null: false }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${EPHEMERAL_MESSAGE_FRAGMENT}
`;

/**
 * Get messages that have expired (expires_at < now)
 * Used by the cleanup job to identify messages to delete
 */
export const GET_EXPIRED_MESSAGES = gql`
  query GetExpiredMessages($now: timestamptz!, $limit: Int = 100) {
    nchat_messages(
      where: { expires_at: { _lte: $now }, is_deleted: { _eq: false } }
      order_by: { expires_at: asc }
      limit: $limit
    ) {
      id
      channel_id
      user_id
      expires_at
      created_at
    }
    nchat_messages_aggregate(
      where: { expires_at: { _lte: $now }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get TTL information for a specific message
 */
export const GET_MESSAGE_TTL = gql`
  query GetMessageTTL($messageId: uuid!) {
    nchat_messages_by_pk(id: $messageId) {
      id
      ttl_seconds
      expires_at
      created_at
      user_id
      channel_id
      channel {
        id
        name
        default_message_ttl_seconds
        created_by
      }
    }
  }
`;

/**
 * Get default TTL for a channel
 */
export const GET_CHANNEL_TTL = gql`
  query GetChannelTTL($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      default_message_ttl_seconds
      created_by
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Set TTL on an existing message
 * Calculates expires_at based on ttl_seconds from current time
 */
export const SET_MESSAGE_TTL = gql`
  mutation SetMessageTTL(
    $messageId: uuid!
    $ttlSeconds: Int!
    $expiresAt: timestamptz!
  ) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { ttl_seconds: $ttlSeconds, expires_at: $expiresAt }
    ) {
      id
      ttl_seconds
      expires_at
    }
  }
`;

/**
 * Update default TTL for a channel
 * New messages in this channel will automatically have this TTL applied
 */
export const UPDATE_CHANNEL_DEFAULT_TTL = gql`
  mutation UpdateChannelDefaultTTL($channelId: uuid!, $ttlSeconds: Int) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { default_message_ttl_seconds: $ttlSeconds }
    ) {
      id
      name
      default_message_ttl_seconds
    }
  }
`;

/**
 * Delete expired messages in bulk
 * Used by the cleanup job for periodic cleanup
 */
export const DELETE_EXPIRED_MESSAGES = gql`
  mutation DeleteExpiredMessages($now: timestamptz!, $limit: Int = 100) {
    delete_nchat_messages(
      where: { expires_at: { _lte: $now }, is_deleted: { _eq: false } }
      limit: $limit
    ) {
      affected_rows
      returning {
        id
        channel_id
      }
    }
  }
`;

/**
 * Clear TTL from a message (make it permanent)
 */
export const CLEAR_MESSAGE_TTL = gql`
  mutation ClearMessageTTL($messageId: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { ttl_seconds: null, expires_at: null }
    ) {
      id
      ttl_seconds
      expires_at
    }
  }
`;

/**
 * Extend message TTL by recalculating expires_at
 */
export const EXTEND_MESSAGE_TTL = gql`
  mutation ExtendMessageTTL($messageId: uuid!, $expiresAt: timestamptz!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { expires_at: $expiresAt }
    ) {
      id
      ttl_seconds
      expires_at
    }
  }
`;

/**
 * Send a new message with TTL support
 * Used when sending messages in channels with default TTL or with explicit TTL
 */
export const SEND_MESSAGE_WITH_TTL = gql`
  mutation SendMessageWithTTL(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $contentHtml: String
    $type: String = "text"
    $threadId: uuid
    $parentMessageId: uuid
    $mentions: _uuid
    $mentionedRoles: _text
    $mentionedChannels: _uuid
    $metadata: jsonb
    $ttlSeconds: Int
    $expiresAt: timestamptz
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        content_html: $contentHtml
        type: $type
        thread_id: $threadId
        parent_message_id: $parentMessageId
        mentions: $mentions
        mentioned_roles: $mentionedRoles
        mentioned_channels: $mentionedChannels
        metadata: $metadata
        ttl_seconds: $ttlSeconds
        expires_at: $expiresAt
      }
    ) {
      id
      channel_id
      user_id
      content
      content_html
      type
      ttl_seconds
      expires_at
      created_at
      updated_at
      is_edited
      is_deleted
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

export interface SendMessageWithTTLVariables {
  channelId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  type?: string;
  threadId?: string;
  parentMessageId?: string;
  mentions?: string[];
  mentionedRoles?: string[];
  mentionedChannels?: string[];
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
  expiresAt?: string;
}

export interface SendMessageWithTTLResult {
  insert_nchat_messages_one: {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    content_html: string | null;
    type: string;
    ttl_seconds: number | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string | null;
    is_edited: boolean;
    is_deleted: boolean;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate expires_at timestamp from TTL seconds
 */
export function calculateExpiresAt(ttlSeconds: number, fromDate?: Date): Date {
  const baseDate = fromDate || new Date();
  return new Date(baseDate.getTime() + ttlSeconds * 1000);
}

/**
 * Calculate remaining time in seconds until message expires
 */
export function calculateRemainingSeconds(expiresAt: Date | string): number {
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const remaining = Math.floor((expiry.getTime() - now.getTime()) / 1000);
  return Math.max(0, remaining);
}

/**
 * Check if a message has expired
 */
export function isMessageExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const expiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() <= Date.now();
}

/**
 * Validate TTL value is within allowed range
 * Minimum: 30 seconds
 * Maximum: 7 days (604800 seconds)
 */
export function validateTTL(ttlSeconds: number): {
  valid: boolean;
  error?: string;
  clampedValue?: number;
} {
  const MIN_TTL = 30;
  const MAX_TTL = 604800; // 7 days

  if (typeof ttlSeconds !== "number" || isNaN(ttlSeconds)) {
    return { valid: false, error: "TTL must be a valid number" };
  }

  if (ttlSeconds < MIN_TTL) {
    return { valid: false, error: `TTL must be at least ${MIN_TTL} seconds` };
  }

  if (ttlSeconds > MAX_TTL) {
    return {
      valid: false,
      error: `TTL must not exceed ${MAX_TTL} seconds (7 days)`,
    };
  }

  return { valid: true };
}

/**
 * Format TTL for display
 */
export function formatTTL(ttlSeconds: number | null): string {
  if (ttlSeconds === null) return "Permanent";

  if (ttlSeconds < 60) {
    return `${ttlSeconds} second${ttlSeconds !== 1 ? "s" : ""}`;
  }

  if (ttlSeconds < 3600) {
    const minutes = Math.floor(ttlSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  if (ttlSeconds < 86400) {
    const hours = Math.floor(ttlSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  const days = Math.floor(ttlSeconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

/**
 * Transform raw GraphQL ephemeral message data
 */
export function transformEphemeralMessage(data: MessageWithTTL) {
  return {
    id: data.id,
    channelId: data.channel_id,
    userId: data.user_id,
    content: data.content,
    ttlSeconds: data.ttl_seconds,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    createdAt: new Date(data.created_at),
    user: {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
    },
    isExpired: data.expires_at ? isMessageExpired(data.expires_at) : false,
    remainingSeconds: data.expires_at
      ? calculateRemainingSeconds(data.expires_at)
      : null,
  };
}
