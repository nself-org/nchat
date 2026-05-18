/**
 * Analytics GraphQL Queries
 *
 * GraphQL queries for fetching analytics data from Hasura
 */

import { gql } from "@apollo/client";

// ============================================================================
// Message Analytics Queries
// ============================================================================

export const GET_MESSAGE_VOLUME = gql`
  query GetMessageVolume(
    $start: timestamptz!
    $end: timestamptz!
    $channelIds: [uuid!]
  ) {
    nchat_messages_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        channel_id: { _in: $channelIds }
      }
    ) {
      aggregate {
        count
      }
    }
    nchat_messages(
      where: {
        created_at: { _gte: $start, _lte: $end }
        channel_id: { _in: $channelIds }
      }
      order_by: { created_at: asc }
    ) {
      id
      channel_id
      created_at
      has_attachments
      thread_id
    }
  }
`;

export const GET_MESSAGE_STATS = gql`
  query GetMessageStats($start: timestamptz!, $end: timestamptz!) {
    total: nchat_messages_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
      }
    }
    with_attachments: nchat_messages_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        has_attachments: { _eq: true }
      }
    ) {
      aggregate {
        count
      }
    }
    in_threads: nchat_messages_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        thread_id: { _is_null: false }
      }
    ) {
      aggregate {
        count
      }
    }
    edited: nchat_messages_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        updated_at: { _is_null: false }
      }
    ) {
      aggregate {
        count
      }
    }
    deleted: nchat_messages_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        deleted_at: { _is_null: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_TOP_MESSAGES = gql`
  query GetTopMessages($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
    nchat_messages(
      where: {
        created_at: { _gte: $start, _lte: $end }
        deleted_at: { _is_null: true }
      }
      order_by: [
        { reactions_aggregate: { count: desc } }
        { reply_count: desc }
      ]
      limit: $limit
    ) {
      id
      content
      channel_id
      created_at
      reply_count
      channel {
        id
        name
        slug
      }
      user {
        id
        username
        display_name
        avatar_url
      }
      reactions_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_MESSAGES_BY_HOUR = gql`
  query GetMessagesByHour($start: timestamptz!, $end: timestamptz!) {
    nchat_messages(where: { created_at: { _gte: $start, _lte: $end } }) {
      id
      created_at
      user_id
    }
  }
`;

// ============================================================================
// User Analytics Queries
// ============================================================================

export const GET_USER_ACTIVITY = gql`
  query GetUserActivity(
    $start: timestamptz!
    $end: timestamptz!
    $limit: Int!
    $includeBots: Boolean!
  ) {
    nchat_users(
      where: {
        _or: [{ is_bot: { _eq: false } }, { is_bot: { _eq: $includeBots } }]
      }
      limit: $limit
      order_by: { last_active_at: desc_nulls_last }
    ) {
      id
      username
      display_name
      avatar_url
      last_active_at
      created_at
      is_bot
      messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
        aggregate {
          count
        }
      }
      reactions_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
        aggregate {
          count
        }
      }
      files_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_USER_STATS = gql`
  query GetUserStats($start: timestamptz!, $end: timestamptz!) {
    total_users: nchat_users_aggregate(where: { is_bot: { _eq: false } }) {
      aggregate {
        count
      }
    }
    new_users: nchat_users_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        is_bot: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    active_users: nchat_users_aggregate(
      where: { last_active_at: { _gte: $start }, is_bot: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_INACTIVE_USERS = gql`
  query GetInactiveUsers($cutoff: timestamptz!, $limit: Int!) {
    nchat_users(
      where: { is_bot: { _eq: false }, last_active_at: { _lt: $cutoff } }
      order_by: { last_active_at: desc_nulls_last }
      limit: $limit
    ) {
      id
      username
      display_name
      avatar_url
      last_active_at
      messages_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_USER_GROWTH = gql`
  query GetUserGrowth($start: timestamptz!, $end: timestamptz!) {
    nchat_users(
      where: {
        created_at: { _gte: $start, _lte: $end }
        is_bot: { _eq: false }
      }
      order_by: { created_at: asc }
    ) {
      id
      created_at
    }
    previous_total: nchat_users_aggregate(
      where: { created_at: { _lt: $start }, is_bot: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Channel Analytics Queries
// ============================================================================

export const GET_CHANNEL_ACTIVITY = gql`
  query GetChannelActivity(
    $start: timestamptz!
    $end: timestamptz!
    $limit: Int!
  ) {
    nchat_channels(
      where: { is_archived: { _eq: false } }
      limit: $limit
      order_by: { created_at: desc }
    ) {
      id
      name
      slug
      type
      created_at
      members_aggregate {
        aggregate {
          count
        }
      }
      messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
        aggregate {
          count
        }
      }
      active_users: messages(
        where: { created_at: { _gte: $start, _lte: $end } }
        distinct_on: user_id
      ) {
        user_id
      }
    }
  }
`;

export const GET_CHANNEL_STATS = gql`
  query GetChannelStats {
    total: nchat_channels_aggregate(where: { is_archived: { _eq: false } }) {
      aggregate {
        count
      }
    }
    public: nchat_channels_aggregate(
      where: { is_archived: { _eq: false }, type: { _eq: "public" } }
    ) {
      aggregate {
        count
      }
    }
    private: nchat_channels_aggregate(
      where: { is_archived: { _eq: false }, type: { _eq: "private" } }
    ) {
      aggregate {
        count
      }
    }
    direct: nchat_channels_aggregate(
      where: { is_archived: { _eq: false }, type: { _eq: "direct" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_CHANNEL_GROWTH = gql`
  query GetChannelGrowth(
    $channelId: uuid!
    $start: timestamptz!
    $end: timestamptz!
  ) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        joined_at: { _gte: $start, _lte: $end }
      }
      order_by: { joined_at: asc }
    ) {
      id
      joined_at
      left_at
    }
  }
`;

// ============================================================================
// Reaction Analytics Queries
// ============================================================================

export const GET_REACTIONS = gql`
  query GetReactions($start: timestamptz!, $end: timestamptz!) {
    nchat_reactions(where: { created_at: { _gte: $start, _lte: $end } }) {
      id
      emoji
      user_id
      created_at
    }
  }
`;

export const GET_REACTION_STATS = gql`
  query GetReactionStats($start: timestamptz!, $end: timestamptz!) {
    total: nchat_reactions_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
      }
    }
    unique_emojis: nchat_reactions(
      where: { created_at: { _gte: $start, _lte: $end } }
      distinct_on: emoji
    ) {
      emoji
    }
  }
`;

// ============================================================================
// File Analytics Queries
// ============================================================================

export const GET_FILE_UPLOADS = gql`
  query GetFileUploads($start: timestamptz!, $end: timestamptz!) {
    nchat_files(
      where: { created_at: { _gte: $start, _lte: $end } }
      order_by: { created_at: asc }
    ) {
      id
      name
      mime_type
      size
      user_id
      created_at
    }
  }
`;

export const GET_FILE_STATS = gql`
  query GetFileStats($start: timestamptz!, $end: timestamptz!) {
    total: nchat_files_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
        sum {
          size
        }
        avg {
          size
        }
      }
    }
    uploaders: nchat_files(
      where: { created_at: { _gte: $start, _lte: $end } }
      distinct_on: user_id
    ) {
      user_id
    }
  }
`;

// ============================================================================
// Search Analytics Queries
// ============================================================================

export const GET_SEARCH_LOGS = gql`
  query GetSearchLogs($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
    nchat_search_logs(
      where: { created_at: { _gte: $start, _lte: $end } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      query
      user_id
      result_count
      created_at
    }
  }
`;

export const GET_SEARCH_STATS = gql`
  query GetSearchStats($start: timestamptz!, $end: timestamptz!) {
    total: nchat_search_logs_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
        avg {
          result_count
        }
      }
    }
    no_results: nchat_search_logs_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        result_count: { _eq: 0 }
      }
    ) {
      aggregate {
        count
      }
    }
    unique_searchers: nchat_search_logs(
      where: { created_at: { _gte: $start, _lte: $end } }
      distinct_on: user_id
    ) {
      user_id
    }
  }
`;

// ============================================================================
// Bot Analytics Queries
// ============================================================================

export const GET_BOT_ACTIVITY = gql`
  query GetBotActivity($start: timestamptz!, $end: timestamptz!, $limit: Int!) {
    nchat_users(where: { is_bot: { _eq: true } }, limit: $limit) {
      id
      username
      display_name
      avatar_url
      last_active_at
      messages_aggregate(where: { created_at: { _gte: $start, _lte: $end } }) {
        aggregate {
          count
        }
      }
      channel_memberships {
        channel {
          id
          name
        }
      }
    }
  }
`;

// ============================================================================
// Dashboard Overview Query
// ============================================================================

export const GET_DASHBOARD_OVERVIEW = gql`
  query GetDashboardOverview($start: timestamptz!, $end: timestamptz!) {
    messages: nchat_messages_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
      }
    }
    users: nchat_users_aggregate(
      where: { is_bot: { _eq: false }, last_active_at: { _gte: $start } }
    ) {
      aggregate {
        count
      }
    }
    channels: nchat_channels_aggregate(where: { is_archived: { _eq: false } }) {
      aggregate {
        count
      }
    }
    reactions: nchat_reactions_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
      }
    }
    files: nchat_files_aggregate(
      where: { created_at: { _gte: $start, _lte: $end } }
    ) {
      aggregate {
        count
        sum {
          size
        }
      }
    }
    new_users: nchat_users_aggregate(
      where: {
        created_at: { _gte: $start, _lte: $end }
        is_bot: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Subscription for Real-time Updates
// ============================================================================

export const ANALYTICS_REALTIME_SUBSCRIPTION = gql`
  subscription AnalyticsRealtime {
    nchat_messages_aggregate {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Query Variables Types
// ============================================================================

export interface DateRangeVariables {
  start: string;
  end: string;
}

export interface DateRangeWithLimitVariables extends DateRangeVariables {
  limit: number;
}

export interface DateRangeWithChannelsVariables extends DateRangeVariables {
  channelIds?: string[];
}

export interface UserActivityVariables extends DateRangeWithLimitVariables {
  includeBots: boolean;
}

export interface ChannelGrowthVariables extends DateRangeVariables {
  channelId: string;
}

export interface InactiveUsersVariables {
  cutoff: string;
  limit: number;
}
