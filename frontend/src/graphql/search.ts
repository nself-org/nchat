import { gql } from "@apollo/client";
import {
  SEARCH_MESSAGE_RESULT_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  ATTACHMENT_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SearchMessagesVariables {
  query: string;
  channelId?: string;
  userId?: string;
  before?: string;
  after?: string;
  hasAttachments?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchFilesVariables {
  query: string;
  channelId?: string;
  fileType?: string;
  limit?: number;
  offset?: number;
}

export interface SearchUsersVariables {
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchChannelsVariables {
  query: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface SearchAllVariables {
  query: string;
  limit?: number;
}

export interface SearchResult {
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    user: { id: string; username: string; display_name: string };
    channel: { id: string; name: string; slug: string };
  }>;
  files: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }>;
  users: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Search messages with filters
 */
export const SEARCH_MESSAGES = gql`
  query SearchMessages(
    $query: String!
    $channelId: uuid
    $userId: uuid
    $before: timestamptz
    $after: timestamptz
    $hasAttachments: Boolean
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_messages(
      where: {
        _and: [
          { content: { _ilike: $query } }
          { is_deleted: { _eq: false } }
          { channel_id: { _eq: $channelId } }
          { user_id: { _eq: $userId } }
          { created_at: { _lt: $before, _gt: $after } }
          {
            _or: [
              { attachments: { id: { _is_null: false } } }
              { attachments: { id: { _is_null: $hasAttachments } } }
            ]
          }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...SearchMessageResult
      # Highlight context (surrounding content)
      parent {
        id
        content
      }
    }
    nchat_messages_aggregate(
      where: {
        _and: [
          { content: { _ilike: $query } }
          { is_deleted: { _eq: false } }
          { channel_id: { _eq: $channelId } }
          { user_id: { _eq: $userId } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${SEARCH_MESSAGE_RESULT_FRAGMENT}
`;

/**
 * Full-text search messages (PostgreSQL FTS)
 * Requires tsvector column and GIN index on messages table
 */
export const SEARCH_MESSAGES_FTS = gql`
  query SearchMessagesFTS(
    $query: String!
    $channelId: uuid
    $limit: Int = 20
    $offset: Int = 0
  ) {
    search_messages(
      args: { search_query: $query, channel_id: $channelId }
      limit: $limit
      offset: $offset
    ) {
      id
      content
      type
      created_at
      rank
      headline
      user {
        ...UserBasic
      }
      channel {
        ...ChannelBasic
      }
      attachments {
        id
        file_name
        file_type
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Search files/attachments
 */
export const SEARCH_FILES = gql`
  query SearchFiles(
    $query: String!
    $channelId: uuid
    $fileType: String
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_attachments(
      where: {
        _and: [
          {
            _or: [
              { file_name: { _ilike: $query } }
              { metadata: { _contains: { description: $query } } }
            ]
          }
          { message: { channel_id: { _eq: $channelId } } }
          { file_type: { _ilike: $fileType } }
          { message: { is_deleted: { _eq: false } } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Attachment
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
    nchat_attachments_aggregate(
      where: {
        _and: [
          { file_name: { _ilike: $query } }
          { message: { channel_id: { _eq: $channelId } } }
          { file_type: { _ilike: $fileType } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Search users
 */
export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int = 20, $offset: Int = 0) {
    nchat_users(
      where: {
        _and: [
          {
            _or: [
              { username: { _ilike: $query } }
              { display_name: { _ilike: $query } }
              { email: { _ilike: $query } }
              { bio: { _ilike: $query } }
            ]
          }
          { is_active: { _eq: true } }
        ]
      }
      order_by: { display_name: asc }
      limit: $limit
      offset: $offset
    ) {
      ...UserBasic
      bio
      status
      status_emoji
      presence {
        status
        last_seen_at
      }
    }
    nchat_users_aggregate(
      where: {
        _and: [
          {
            _or: [
              { username: { _ilike: $query } }
              { display_name: { _ilike: $query } }
              { email: { _ilike: $query } }
            ]
          }
          { is_active: { _eq: true } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Search channels
 */
export const SEARCH_CHANNELS = gql`
  query SearchChannels(
    $query: String!
    $type: String
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_channels(
      where: {
        _and: [
          {
            _or: [
              { name: { _ilike: $query } }
              { description: { _ilike: $query } }
              { topic: { _ilike: $query } }
            ]
          }
          { type: { _eq: $type } }
          { is_archived: { _eq: false } }
          # Only search public channels or channels user is member of
          {
            _or: [
              { is_private: { _eq: false } }
              { members: { user_id: { _eq: "current_user_id" } } }
            ]
          }
        ]
      }
      order_by: { name: asc }
      limit: $limit
      offset: $offset
    ) {
      ...ChannelBasic
      topic
      members_aggregate {
        aggregate {
          count
        }
      }
      creator {
        ...UserBasic
      }
    }
    nchat_channels_aggregate(
      where: {
        _and: [
          {
            _or: [
              { name: { _ilike: $query } }
              { description: { _ilike: $query } }
            ]
          }
          { type: { _eq: $type } }
          { is_archived: { _eq: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Combined search across all entities
 */
export const SEARCH_ALL = gql`
  query SearchAll($query: String!, $limit: Int = 5) {
    messages: nchat_messages(
      where: { content: { _ilike: $query }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      content
      type
      created_at
      user {
        ...UserBasic
      }
      channel {
        id
        name
        slug
      }
    }

    files: nchat_attachments(
      where: {
        file_name: { _ilike: $query }
        message: { is_deleted: { _eq: false } }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      file_name
      file_type
      file_size
      file_url
      thumbnail_url
      message {
        channel {
          id
          name
          slug
        }
      }
    }

    users: nchat_users(
      where: {
        _or: [
          { username: { _ilike: $query } }
          { display_name: { _ilike: $query } }
        ]
        is_active: { _eq: true }
      }
      order_by: { display_name: asc }
      limit: $limit
    ) {
      ...UserBasic
      status
      presence {
        status
      }
    }

    channels: nchat_channels(
      where: {
        _or: [{ name: { _ilike: $query } }, { description: { _ilike: $query } }]
        is_archived: { _eq: false }
        is_private: { _eq: false }
      }
      order_by: { name: asc }
      limit: $limit
    ) {
      ...ChannelBasic
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Quick search (for command palette / spotlight)
 */
export const QUICK_SEARCH = gql`
  query QuickSearch($query: String!, $limit: Int = 8) {
    # Recent/relevant channels
    channels: nchat_channels(
      where: { name: { _ilike: $query }, is_archived: { _eq: false } }
      limit: $limit
      order_by: { updated_at: desc }
    ) {
      id
      name
      slug
      type
      icon
    }

    # Users
    users: nchat_users(
      where: {
        _or: [
          { username: { _ilike: $query } }
          { display_name: { _ilike: $query } }
        ]
        is_active: { _eq: true }
      }
      limit: $limit
      order_by: { display_name: asc }
    ) {
      id
      username
      display_name
      avatar_url
      presence {
        status
      }
    }
  }
`;

/**
 * Search messages in a specific channel
 */
export const SEARCH_CHANNEL_MESSAGES = gql`
  query SearchChannelMessages(
    $channelId: uuid!
    $query: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        content: { _ilike: $query }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...SearchMessageResult
    }
  }
  ${SEARCH_MESSAGE_RESULT_FRAGMENT}
`;

/**
 * Search messages from a specific user
 */
export const SEARCH_USER_MESSAGES = gql`
  query SearchUserMessages(
    $userId: uuid!
    $query: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_messages(
      where: {
        user_id: { _eq: $userId }
        content: { _ilike: $query }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...SearchMessageResult
    }
  }
  ${SEARCH_MESSAGE_RESULT_FRAGMENT}
`;

/**
 * Search messages with date range
 */
export const SEARCH_MESSAGES_BY_DATE = gql`
  query SearchMessagesByDate(
    $query: String!
    $startDate: timestamptz!
    $endDate: timestamptz!
    $channelId: uuid
    $limit: Int = 50
  ) {
    nchat_messages(
      where: {
        content: { _ilike: $query }
        is_deleted: { _eq: false }
        created_at: { _gte: $startDate, _lte: $endDate }
        channel_id: { _eq: $channelId }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...SearchMessageResult
    }
  }
  ${SEARCH_MESSAGE_RESULT_FRAGMENT}
`;

/**
 * Get recent searches (if tracking search history)
 */
export const GET_RECENT_SEARCHES = gql`
  query GetRecentSearches($userId: uuid!, $limit: Int = 10) {
    nchat_search_history(
      where: { user_id: { _eq: $userId } }
      order_by: { searched_at: desc }
      limit: $limit
    ) {
      id
      query
      type
      result_count
      searched_at
    }
  }
`;

/**
 * Save search query to history
 */
export const SAVE_SEARCH = gql`
  mutation SaveSearch(
    $userId: uuid!
    $query: String!
    $type: String!
    $resultCount: Int!
  ) {
    insert_nchat_search_history_one(
      object: {
        user_id: $userId
        query: $query
        type: $type
        result_count: $resultCount
      }
    ) {
      id
      query
      searched_at
    }
  }
`;

/**
 * Clear search history
 */
export const CLEAR_SEARCH_HISTORY = gql`
  mutation ClearSearchHistory($userId: uuid!) {
    delete_nchat_search_history(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;
