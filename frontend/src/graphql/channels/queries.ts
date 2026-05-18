/**
 * Channel GraphQL Queries
 *
 * Comprehensive queries for fetching channels, channel details, and channel members.
 * Connects to the Hasura GraphQL backend with nchat_channels and nchat_channel_members tables.
 */

import { gql } from "@apollo/client";
import {
  CHANNEL_BASIC_FRAGMENT,
  CHANNEL_FULL_FRAGMENT,
  CHANNEL_MEMBER_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GetChannelsVariables {
  workspaceId?: string;
  type?: "public" | "private" | "direct" | "group" | "announcement";
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetChannelByIdVariables {
  id: string;
}

export interface GetChannelBySlugVariables {
  slug: string;
  workspaceId?: string;
}

export interface GetChannelMembersVariables {
  channelId: string;
  limit?: number;
  offset?: number;
}

export interface GetUserChannelsVariables {
  userId: string;
  types?: string[];
  includeArchived?: boolean;
}

export interface CheckMembershipVariables {
  channelId: string;
  userId: string;
}

export interface SearchChannelsVariables {
  searchQuery: string;
  type?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// CHANNEL LIST QUERIES
// ============================================================================

/**
 * Get all channels with optional filtering by type and archived status
 */
export const GET_CHANNELS = gql`
  query GetChannels(
    $type: String
    $includeArchived: Boolean = false
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_channels(
      where: {
        _and: [
          { is_archived: { _eq: $includeArchived } }
          { _or: [{ type: { _eq: $type } }, { type: { _is_null: false } }] }
        ]
      }
      order_by: [
        { category_id: asc_nulls_last }
        { position: asc }
        { name: asc }
      ]
      limit: $limit
      offset: $offset
    ) {
      ...ChannelFull
    }
    nchat_channels_aggregate(
      where: {
        _and: [
          { is_archived: { _eq: $includeArchived } }
          { _or: [{ type: { _eq: $type } }, { type: { _is_null: false } }] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get all public channels (discoverable channels)
 */
export const GET_PUBLIC_CHANNELS = gql`
  query GetPublicChannels($limit: Int = 50, $offset: Int = 0) {
    nchat_channels(
      where: { type: { _eq: "public" }, is_archived: { _eq: false } }
      order_by: [
        { member_count: desc }
        { last_message_at: desc_nulls_last }
        { name: asc }
      ]
      limit: $limit
      offset: $offset
    ) {
      ...ChannelFull
    }
    nchat_channels_aggregate(
      where: { type: { _eq: "public" }, is_archived: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get channels grouped by category
 */
export const GET_CHANNELS_BY_CATEGORY = gql`
  query GetChannelsByCategory($includeArchived: Boolean = false) {
    nchat_categories(order_by: { position: asc }) {
      id
      name
      description
      position
      is_collapsed
      channels(
        where: { is_archived: { _eq: $includeArchived } }
        order_by: { position: asc }
      ) {
        ...ChannelFull
      }
    }
    uncategorized: nchat_channels(
      where: {
        category_id: { _is_null: true }
        is_archived: { _eq: $includeArchived }
      }
      order_by: { position: asc }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

// ============================================================================
// SINGLE CHANNEL QUERIES
// ============================================================================

/**
 * Get a single channel by ID with full details
 */
export const GET_CHANNEL_BY_ID = gql`
  query GetChannelById($id: uuid!) {
    nchat_channels_by_pk(id: $id) {
      ...ChannelFull
      members(limit: 20, order_by: { role: asc, joined_at: asc }) {
        ...ChannelMember
      }
      pinned_messages: messages(
        where: { is_pinned: { _eq: true }, is_deleted: { _eq: false } }
        order_by: { created_at: desc }
        limit: 10
      ) {
        id
        content
        created_at
        user {
          ...UserBasic
        }
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${CHANNEL_MEMBER_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get a single channel by slug
 */
export const GET_CHANNEL_BY_SLUG = gql`
  query GetChannelBySlug($slug: String!, $workspaceId: uuid) {
    nchat_channels(
      where: {
        slug: { _eq: $slug }
        _or: [
          { workspace_id: { _eq: $workspaceId } }
          { workspace_id: { _is_null: true } }
        ]
      }
      limit: 1
    ) {
      ...ChannelFull
      members(limit: 20, order_by: { role: asc, joined_at: asc }) {
        ...ChannelMember
      }
      pinned_messages: messages(
        where: { is_pinned: { _eq: true }, is_deleted: { _eq: false } }
        order_by: { created_at: desc }
        limit: 10
      ) {
        id
        content
        created_at
        user {
          ...UserBasic
        }
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${CHANNEL_MEMBER_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// CHANNEL MEMBERS QUERIES
// ============================================================================

/**
 * Get channel members with pagination
 */
export const GET_CHANNEL_MEMBERS = gql`
  query GetChannelMembers(
    $channelId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId } }
      order_by: [{ role: asc }, { joined_at: asc }]
      limit: $limit
      offset: $offset
    ) {
      ...ChannelMember
    }
    nchat_channel_members_aggregate(
      where: { channel_id: { _eq: $channelId } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Get channel members by role
 */
export const GET_CHANNEL_MEMBERS_BY_ROLE = gql`
  query GetChannelMembersByRole($channelId: uuid!, $role: String!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, role: { _eq: $role } }
      order_by: { joined_at: asc }
    ) {
      ...ChannelMember
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Get channel admins (owner, admin, moderator)
 */
export const GET_CHANNEL_ADMINS = gql`
  query GetChannelAdmins($channelId: uuid!) {
    nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        role: { _in: ["owner", "admin", "moderator"] }
      }
      order_by: { role: asc }
    ) {
      ...ChannelMember
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

// ============================================================================
// USER CHANNEL QUERIES
// ============================================================================

/**
 * Get channels a user is a member of
 */
export const GET_USER_CHANNELS = gql`
  query GetUserChannels($userId: uuid!, $includeArchived: Boolean = false) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { is_archived: { _eq: $includeArchived } }
      }
      order_by: [
        { is_pinned: desc }
        { channel: { last_message_at: desc_nulls_last } }
      ]
    ) {
      channel {
        ...ChannelFull
        last_message: messages(
          limit: 1
          order_by: { created_at: desc }
          where: { is_deleted: { _eq: false } }
        ) {
          id
          content
          created_at
          user {
            ...UserBasic
          }
        }
      }
      role
      joined_at
      last_read_at
      last_read_message_id
      is_muted
      muted_until
      is_pinned
      notification_level
      unread_count
      mention_count
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get direct message channels for a user
 */
export const GET_USER_DM_CHANNELS = gql`
  query GetUserDMChannels($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: {
          type: { _in: ["direct", "group"] }
          is_archived: { _eq: false }
        }
      }
      order_by: { channel: { last_message_at: desc_nulls_last } }
    ) {
      channel {
        ...ChannelFull
        members {
          user {
            ...UserBasic
          }
          role
        }
        last_message: messages(
          limit: 1
          order_by: { created_at: desc }
          where: { is_deleted: { _eq: false } }
        ) {
          id
          content
          created_at
          user {
            ...UserBasic
          }
        }
      }
      last_read_at
      is_muted
      notification_level
      unread_count
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get channels user has unread messages in
 */
export const GET_USER_UNREAD_CHANNELS = gql`
  query GetUserUnreadChannels($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        unread_count: { _gt: 0 }
        channel: { is_archived: { _eq: false } }
      }
      order_by: { channel: { last_message_at: desc } }
    ) {
      channel {
        ...ChannelBasic
      }
      unread_count
      mention_count
      last_read_at
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// MEMBERSHIP QUERIES
// ============================================================================

/**
 * Check if a user is a member of a channel
 */
export const CHECK_CHANNEL_MEMBERSHIP = gql`
  query CheckChannelMembership($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      role
      joined_at
      can_read
      can_write
      can_manage
      can_invite
      notification_level
      is_muted
    }
  }
`;

/**
 * Get user's membership details for a channel
 */
export const GET_USER_CHANNEL_MEMBERSHIP = gql`
  query GetUserChannelMembership($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members_by_pk(channel_id: $channelId, user_id: $userId) {
      id
      channel_id
      user_id
      role
      nickname
      can_read
      can_write
      can_manage
      can_invite
      can_pin
      can_delete_messages
      can_mention_everyone
      is_muted
      muted_until
      is_pinned
      notification_level
      last_read_message_id
      last_read_at
      unread_count
      mention_count
      joined_at
      invited_by
      created_at
      updated_at
    }
  }
`;

// ============================================================================
// SEARCH QUERIES
// ============================================================================

/**
 * Search channels by name or description
 */
export const SEARCH_CHANNELS = gql`
  query SearchChannels(
    $searchQuery: String!
    $type: String
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_channels(
      where: {
        _and: [
          { is_archived: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchQuery } }
              { description: { _ilike: $searchQuery } }
              { topic: { _ilike: $searchQuery } }
            ]
          }
          { _or: [{ type: { _eq: $type } }, { type: { _is_null: false } }] }
        ]
      }
      order_by: [{ member_count: desc }, { name: asc }]
      limit: $limit
      offset: $offset
    ) {
      ...ChannelFull
    }
    nchat_channels_aggregate(
      where: {
        _and: [
          { is_archived: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchQuery } }
              { description: { _ilike: $searchQuery } }
              { topic: { _ilike: $searchQuery } }
            ]
          }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get channels for discovery (public channels user is not a member of)
 */
export const GET_DISCOVERABLE_CHANNELS = gql`
  query GetDiscoverableChannels(
    $userId: uuid!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_channels(
      where: {
        type: { _eq: "public" }
        is_archived: { _eq: false }
        _not: { members: { user_id: { _eq: $userId } } }
      }
      order_by: [{ member_count: desc }, { last_message_at: desc_nulls_last }]
      limit: $limit
      offset: $offset
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

// ============================================================================
// STATS QUERIES
// ============================================================================

/**
 * Get channel statistics
 */
export const GET_CHANNEL_STATS = gql`
  query GetChannelStats($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      member_count
      message_count
      created_at
      last_message_at
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
      pinned_count: messages_aggregate(where: { is_pinned: { _eq: true } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Get channel activity (for analytics)
 */
export const GET_CHANNEL_ACTIVITY = gql`
  query GetChannelActivity($channelId: uuid!, $since: timestamptz!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      messages_aggregate(where: { created_at: { _gte: $since } }) {
        aggregate {
          count
        }
      }
      active_members: members_aggregate(
        where: { last_read_at: { _gte: $since } }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`;
