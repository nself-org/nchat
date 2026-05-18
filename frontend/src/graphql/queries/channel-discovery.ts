/**
 * Channel Discovery GraphQL Queries
 *
 * Queries specifically for channel discovery, browsing, and recommendations
 */

import { gql } from "@apollo/client";

// ============================================================================
// Discovery Queries
// ============================================================================

export const GET_PUBLIC_CHANNELS = gql`
  query GetPublicChannels($limit: Int = 50, $offset: Int = 0) {
    nchat_channels(
      where: { is_private: { _eq: false }, is_archived: { _eq: false } }
      order_by: [
        { is_default: desc }
        { members_aggregate: { count: desc } }
        { name: asc }
      ]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      slug
      description
      type
      topic
      is_default
      is_private
      is_archived
      icon
      color
      category_id
      created_at
      updated_at
      created_by
      owner_id
      members_aggregate {
        aggregate {
          count
        }
      }
      messages_aggregate {
        aggregate {
          count
        }
      }
      last_message_at
      last_message {
        id
        content
        created_at
      }
    }
  }
`;

export const SEARCH_CHANNELS = gql`
  query SearchChannels($query: String!, $limit: Int = 20) {
    nchat_channels(
      where: {
        _or: [
          { name: { _ilike: $query } }
          { description: { _ilike: $query } }
          { topic: { _ilike: $query } }
        ]
        is_archived: { _eq: false }
      }
      limit: $limit
      order_by: [{ is_default: desc }, { members_aggregate: { count: desc } }]
    ) {
      id
      name
      slug
      description
      type
      topic
      is_private
      is_default
      icon
      color
      category_id
      created_at
      updated_at
      members_aggregate {
        aggregate {
          count
        }
      }
      last_message_at
    }
  }
`;

export const GET_TRENDING_CHANNELS = gql`
  query GetTrendingChannels($limit: Int = 10, $since: timestamptz!) {
    nchat_channels(
      where: {
        is_private: { _eq: false }
        is_archived: { _eq: false }
        last_message_at: { _gte: $since }
      }
      order_by: [
        { messages_aggregate: { count: desc } }
        { members_aggregate: { count: desc } }
      ]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      is_default
      created_at
      updated_at
      last_message_at
      members_aggregate {
        aggregate {
          count
        }
      }
      messages_aggregate(where: { created_at: { _gte: $since } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_FEATURED_CHANNELS = gql`
  query GetFeaturedChannels($limit: Int = 10) {
    nchat_channels(
      where: {
        is_private: { _eq: false }
        is_archived: { _eq: false }
        is_default: { _eq: true }
      }
      order_by: [{ position: asc }, { created_at: asc }]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      is_default
      created_at
      updated_at
      last_message_at
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_POPULAR_CHANNELS = gql`
  query GetPopularChannels($limit: Int = 10) {
    nchat_channels(
      where: { is_private: { _eq: false }, is_archived: { _eq: false } }
      order_by: [{ members_aggregate: { count: desc } }]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      created_at
      updated_at
      last_message_at
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_NEW_CHANNELS = gql`
  query GetNewChannels($limit: Int = 10, $since: timestamptz!) {
    nchat_channels(
      where: {
        is_private: { _eq: false }
        is_archived: { _eq: false }
        created_at: { _gte: $since }
      }
      order_by: [{ created_at: desc }]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      is_default
      created_at
      updated_at
      last_message_at
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_CHANNELS_BY_CATEGORY = gql`
  query GetChannelsByCategory($categoryId: uuid!) {
    nchat_channels(
      where: { category_id: { _eq: $categoryId }, is_archived: { _eq: false } }
      order_by: [{ position: asc }, { name: asc }]
    ) {
      id
      name
      slug
      description
      type
      topic
      is_private
      icon
      color
      category_id
      created_at
      updated_at
      members_aggregate {
        aggregate {
          count
        }
      }
      last_message_at
    }
  }
`;

export const GET_RECOMMENDED_CHANNELS = gql`
  query GetRecommendedChannels($userId: uuid!, $limit: Int = 10) {
    nchat_channels(
      where: {
        is_private: { _eq: false }
        is_archived: { _eq: false }
        members: { user_id: { _neq: $userId } }
      }
      order_by: [{ members_aggregate: { count: desc } }, { created_at: desc }]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      created_at
      updated_at
      last_message_at
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_SIMILAR_CHANNELS = gql`
  query GetSimilarChannels(
    $channelId: uuid!
    $categoryId: uuid
    $limit: Int = 5
  ) {
    nchat_channels(
      where: {
        id: { _neq: $channelId }
        category_id: { _eq: $categoryId }
        is_private: { _eq: false }
        is_archived: { _eq: false }
      }
      order_by: [{ members_aggregate: { count: desc } }]
      limit: $limit
    ) {
      id
      name
      slug
      description
      type
      topic
      icon
      color
      category_id
      created_at
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_DISCOVERY_STATS = gql`
  query GetDiscoveryStats {
    public_channels: nchat_channels_aggregate(
      where: { is_private: { _eq: false }, is_archived: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
    private_channels: nchat_channels_aggregate(
      where: { is_private: { _eq: true }, is_archived: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
    total_members: nchat_channel_members_aggregate {
      aggregate {
        count
      }
    }
    active_today: nchat_channels_aggregate(
      where: {
        last_message_at: { _gte: "now() - interval '24 hours'" }
        is_archived: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    new_this_week: nchat_channels_aggregate(
      where: {
        created_at: { _gte: "now() - interval '7 days'" }
        is_archived: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Channel Preview Query
// ============================================================================

export const GET_CHANNEL_PREVIEW = gql`
  query GetChannelPreview($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      slug
      description
      type
      topic
      is_private
      is_default
      icon
      color
      category_id
      created_at
      updated_at
      creator {
        id
        username
        display_name
        avatar_url
      }
      members_aggregate {
        aggregate {
          count
        }
      }
      messages(order_by: { created_at: desc }, limit: 5) {
        id
        content
        created_at
        sender {
          id
          display_name
          avatar_url
        }
      }
      members(limit: 10, order_by: { joined_at: asc }) {
        user {
          id
          username
          display_name
          avatar_url
          status
        }
      }
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChannelDiscoveryVariables {
  limit?: number;
  offset?: number;
  query?: string;
  categoryId?: string;
  userId?: string;
  channelId?: string;
  since?: string;
}
