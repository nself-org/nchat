import { gql } from "@apollo/client";
import {
  MENTION_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MentionType = "user" | "channel" | "everyone" | "here";

export interface GetMentionsVariables {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export interface CreateMentionVariables {
  messageId: string;
  userId: string;
  type: MentionType;
}

export interface MentionSubscriptionVariables {
  userId: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all mentions for a user
 */
export const GET_MENTIONS = gql`
  query GetMentions(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $unreadOnly: Boolean = false
  ) {
    nchat_mentions(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
        _and: [
          {
            _or: [
              { is_read: { _eq: false } }
              { is_read: { _neq: $unreadOnly } }
            ]
          }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Mention
      is_read
      read_at
    }
    nchat_mentions_aggregate(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MENTION_FRAGMENT}
`;

/**
 * Get unread mentions count
 */
export const GET_UNREAD_MENTIONS_COUNT = gql`
  query GetUnreadMentionsCount($userId: uuid!) {
    nchat_mentions_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get mentions in a specific channel
 */
export const GET_CHANNEL_MENTIONS = gql`
  query GetChannelMentions(
    $channelId: uuid!
    $userId: uuid!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_mentions(
      where: {
        user_id: { _eq: $userId }
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Mention
      is_read
    }
  }
  ${MENTION_FRAGMENT}
`;

/**
 * Get recent mentions grouped by channel
 */
export const GET_MENTIONS_BY_CHANNEL = gql`
  query GetMentionsByChannel($userId: uuid!, $limit: Int = 5) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel {
        id
        name
        slug
        mentions: messages(
          where: {
            mentions: { user_id: { _eq: $userId } }
            is_deleted: { _eq: false }
          }
          order_by: { created_at: desc }
          limit: $limit
        ) {
          id
          content
          created_at
          user {
            ...UserBasic
          }
          mentions(where: { user_id: { _eq: $userId } }) {
            id
            is_read
          }
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get mentions for a specific message
 */
export const GET_MESSAGE_MENTIONS = gql`
  query GetMessageMentions($messageId: uuid!) {
    nchat_mentions(
      where: { message_id: { _eq: $messageId } }
      order_by: { type: asc }
    ) {
      id
      type
      user_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Search users for @mention autocomplete
 */
export const SEARCH_MENTIONABLE_USERS = gql`
  query SearchMentionableUsers(
    $search: String!
    $channelId: uuid
    $limit: Int = 10
  ) {
    # Channel members first (if channel specified)
    channel_members: nchat_users(
      where: {
        _and: [
          {
            _or: [
              { username: { _ilike: $search } }
              { display_name: { _ilike: $search } }
            ]
          }
          { is_active: { _eq: true } }
          { channel_memberships: { channel_id: { _eq: $channelId } } }
        ]
      }
      limit: $limit
      order_by: { display_name: asc }
    ) {
      ...UserBasic
      presence {
        status
      }
    }

    # All workspace users
    all_users: nchat_users(
      where: {
        _or: [
          { username: { _ilike: $search } }
          { display_name: { _ilike: $search } }
        ]
        is_active: { _eq: true }
      }
      limit: $limit
      order_by: { display_name: asc }
    ) {
      ...UserBasic
      presence {
        status
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get @here and @everyone mention eligibility
 */
export const GET_MENTION_PERMISSIONS = gql`
  query GetMentionPermissions($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      role
      channel {
        settings
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create mentions when sending a message
 * (Usually done automatically by message parsing)
 */
export const CREATE_MENTIONS = gql`
  mutation CreateMentions($mentions: [nchat_mentions_insert_input!]!) {
    insert_nchat_mentions(
      objects: $mentions
      on_conflict: {
        constraint: nchat_mentions_message_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        message_id
        user_id
        type
      }
    }
  }
`;

/**
 * Mark a mention as read
 */
export const MARK_MENTION_READ = gql`
  mutation MarkMentionRead($mentionId: uuid!) {
    update_nchat_mentions_by_pk(
      pk_columns: { id: $mentionId }
      _set: { is_read: true, read_at: "now()" }
    ) {
      id
      is_read
      read_at
    }
  }
`;

/**
 * Mark multiple mentions as read
 */
export const MARK_MENTIONS_READ = gql`
  mutation MarkMentionsRead($mentionIds: [uuid!]!) {
    update_nchat_mentions(
      where: { id: { _in: $mentionIds } }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Mark all mentions as read for a user
 */
export const MARK_ALL_MENTIONS_READ = gql`
  mutation MarkAllMentionsRead($userId: uuid!, $channelId: uuid) {
    update_nchat_mentions(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        message: { channel_id: { _eq: $channelId } }
      }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Delete mentions for a message (when message is deleted)
 */
export const DELETE_MESSAGE_MENTIONS = gql`
  mutation DeleteMessageMentions($messageId: uuid!) {
    delete_nchat_mentions(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
  }
`;

/**
 * Update mentions for a message (when message is edited)
 */
export const UPDATE_MESSAGE_MENTIONS = gql`
  mutation UpdateMessageMentions(
    $messageId: uuid!
    $mentions: [nchat_mentions_insert_input!]!
  ) {
    # Delete existing mentions
    delete_nchat_mentions(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
    # Insert new mentions
    insert_nchat_mentions(objects: $mentions) {
      affected_rows
      returning {
        id
        user_id
        type
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new mentions for a user
 */
export const MENTION_SUBSCRIPTION = gql`
  subscription MentionSubscription($userId: uuid!) {
    nchat_mentions(
      where: {
        user_id: { _eq: $userId }
        message: { is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Mention
      is_read
    }
  }
  ${MENTION_FRAGMENT}
`;

/**
 * Subscribe to unread mentions count
 */
export const UNREAD_MENTIONS_COUNT_SUBSCRIPTION = gql`
  subscription UnreadMentionsCountSubscription($userId: uuid!) {
    nchat_mentions_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        message: { is_deleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Subscribe to mentions stream
 */
export const MENTIONS_STREAM_SUBSCRIPTION = gql`
  subscription MentionsStreamSubscription($userId: uuid!) {
    nchat_mentions_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { user_id: { _eq: $userId } }
    ) {
      id
      type
      is_read
      created_at
      message {
        id
        content
        created_at
        user {
          ...UserBasic
        }
        channel {
          ...ChannelBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel mentions for a user
 */
export const CHANNEL_MENTIONS_SUBSCRIPTION = gql`
  subscription ChannelMentionsSubscription($userId: uuid!, $channelId: uuid!) {
    nchat_mentions(
      where: {
        user_id: { _eq: $userId }
        message: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
        is_read: { _eq: false }
      }
    ) {
      id
      message {
        id
        content
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
