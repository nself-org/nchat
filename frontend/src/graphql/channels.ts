import { gql } from "@apollo/client";
import {
  CHANNEL_BASIC_FRAGMENT,
  CHANNEL_FULL_FRAGMENT,
  CHANNEL_MEMBER_FRAGMENT,
  USER_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ChannelType = "public" | "private" | "direct" | "group";

export interface GetChannelsVariables {
  workspaceId?: string;
  type?: ChannelType;
  includeArchived?: boolean;
}

export interface GetChannelVariables {
  id?: string;
  slug?: string;
}

export interface GetChannelMembersVariables {
  channelId: string;
  limit?: number;
  offset?: number;
}

export interface CreateChannelVariables {
  name: string;
  slug: string;
  description?: string;
  type: ChannelType;
  isPrivate?: boolean;
  creatorId: string;
  categoryId?: string;
  icon?: string;
}

export interface UpdateChannelVariables {
  id: string;
  name?: string;
  description?: string;
  topic?: string;
  icon?: string;
  isPrivate?: boolean;
}

export interface UpdateChannelSettingsVariables {
  id: string;
  settings: {
    allowThreads?: boolean;
    allowReactions?: boolean;
    allowAttachments?: boolean;
    slowMode?: number;
    memberLimit?: number;
  };
}

export interface ChannelMemberVariables {
  channelId: string;
  userId: string;
}

export interface InviteToChannelVariables {
  channelId: string;
  userIds: string[];
  inviterId: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all channels for a workspace (with optional filtering)
 */
export const GET_CHANNELS = gql`
  query GetChannels($type: String, $includeArchived: Boolean = false) {
    nchat_channels(
      where: {
        _and: [
          {
            _or: [
              { is_archived: { _eq: false } }
              { is_archived: { _eq: $includeArchived } }
            ]
          }
          { _or: [{ type: { _eq: $type } }, { type: { _is_null: false } }] }
        ]
      }
      order_by: [
        { category_id: asc_nulls_last }
        { position: asc }
        { name: asc }
      ]
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get channels grouped by category
 */
export const GET_CHANNELS_BY_CATEGORY = gql`
  query GetChannelsByCategory {
    nchat_channel_categories(order_by: { position: asc }) {
      id
      name
      position
      is_collapsed
      channels(
        where: { is_archived: { _eq: false } }
        order_by: { position: asc }
      ) {
        ...ChannelFull
      }
    }
    uncategorized: nchat_channels(
      where: { category_id: { _is_null: true }, is_archived: { _eq: false } }
      order_by: { position: asc }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get a single channel by ID or slug
 */
export const GET_CHANNEL = gql`
  query GetChannel($id: uuid, $slug: String) {
    nchat_channels(
      where: { _or: [{ id: { _eq: $id } }, { slug: { _eq: $slug } }] }
      limit: 1
    ) {
      ...ChannelFull
      settings
      members(limit: 20, order_by: { joined_at: asc }) {
        ...ChannelMember
      }
      pinned_messages: messages(
        where: { is_pinned: { _eq: true }, is_deleted: { _eq: false } }
        order_by: { created_at: desc }
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
 * Get channels that a user is a member of
 */
export const GET_USER_CHANNELS = gql`
  query GetUserChannels($userId: uuid!) {
    nchat_channel_members(
      where: { user_id: { _eq: $userId } }
      order_by: { channel: { name: asc } }
    ) {
      channel {
        ...ChannelFull
      }
      role
      joined_at
      last_read_at
      last_read_message_id
      notifications_enabled
      muted_until
      unread_count: channel {
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
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get direct message channels for a user
 */
export const GET_DM_CHANNELS = gql`
  query GetDMChannels($userId: uuid!) {
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        channel: { type: { _in: ["direct", "group"] } }
      }
      order_by: { channel: { updated_at: desc } }
    ) {
      channel {
        ...ChannelFull
        members {
          user {
            ...UserBasic
            status
            status_emoji
          }
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
      notifications_enabled
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Check if user is member of channel
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
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new channel
 */
export const CREATE_CHANNEL = gql`
  mutation CreateChannel(
    $name: String!
    $slug: String!
    $description: String
    $type: String = "public"
    $isPrivate: Boolean = false
    $creatorId: uuid!
    $categoryId: uuid
    $icon: String
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        slug: $slug
        description: $description
        type: $type
        is_private: $isPrivate
        creator_id: $creatorId
        category_id: $categoryId
        icon: $icon
        members: { data: [{ user_id: $creatorId, role: "admin" }] }
      }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Update channel details
 */
export const UPDATE_CHANNEL = gql`
  mutation UpdateChannel(
    $id: uuid!
    $name: String
    $description: String
    $topic: String
    $icon: String
    $isPrivate: Boolean
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
        topic: $topic
        icon: $icon
        is_private: $isPrivate
        updated_at: "now()"
      }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Update channel settings (JSON field)
 */
export const UPDATE_CHANNEL_SETTINGS = gql`
  mutation UpdateChannelSettings($id: uuid!, $settings: jsonb!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $id }
      _append: { settings: $settings }
    ) {
      id
      settings
    }
  }
`;

/**
 * Delete a channel (hard delete)
 */
export const DELETE_CHANNEL = gql`
  mutation DeleteChannel($id: uuid!) {
    delete_nchat_channels_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Archive a channel (soft delete)
 */
export const ARCHIVE_CHANNEL = gql`
  mutation ArchiveChannel($id: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $id }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      id
      is_archived
      archived_at
    }
  }
`;

/**
 * Unarchive a channel
 */
export const UNARCHIVE_CHANNEL = gql`
  mutation UnarchiveChannel($id: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $id }
      _set: { is_archived: false, archived_at: null }
    ) {
      id
      is_archived
    }
  }
`;

/**
 * Join a channel
 */
export const JOIN_CHANNEL = gql`
  mutation JoinChannel($channelId: uuid!, $userId: uuid!) {
    insert_nchat_channel_members_one(
      object: { channel_id: $channelId, user_id: $userId, role: "member" }
      on_conflict: {
        constraint: nchat_channel_members_channel_id_user_id_key
        update_columns: []
      }
    ) {
      id
      role
      joined_at
      channel {
        ...ChannelBasic
      }
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Leave a channel
 */
export const LEAVE_CHANNEL = gql`
  mutation LeaveChannel($channelId: uuid!, $userId: uuid!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Invite users to a channel
 */
export const INVITE_TO_CHANNEL = gql`
  mutation InviteToChannel(
    $channelId: uuid!
    $userIds: [uuid!]!
    $inviterId: uuid!
  ) {
    insert_nchat_channel_members(
      objects: [
        # This uses a computed approach - in practice you'd map userIds
      ]
      on_conflict: {
        constraint: nchat_channel_members_channel_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        user {
          ...UserBasic
        }
      }
    }
    # Also create invitation records for tracking
    insert_nchat_channel_invitations(
      objects: [
        # Map userIds to invitation objects
      ]
    ) {
      affected_rows
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Bulk invite users to channel (alternative approach)
 */
export const BULK_INVITE_TO_CHANNEL = gql`
  mutation BulkInviteToChannel(
    $objects: [nchat_channel_members_insert_input!]!
  ) {
    insert_nchat_channel_members(
      objects: $objects
      on_conflict: {
        constraint: nchat_channel_members_channel_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        user_id
        channel_id
        role
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Remove a user from a channel (kick)
 */
export const REMOVE_FROM_CHANNEL = gql`
  mutation RemoveFromChannel($channelId: uuid!, $userId: uuid!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Update member role in channel
 */
export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($channelId: uuid!, $userId: uuid!, $role: String!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { role: $role }
    ) {
      affected_rows
      returning {
        id
        role
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Update member notification settings
 */
export const UPDATE_CHANNEL_NOTIFICATIONS = gql`
  mutation UpdateChannelNotifications(
    $channelId: uuid!
    $userId: uuid!
    $enabled: Boolean!
    $mutedUntil: timestamptz
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { notifications_enabled: $enabled, muted_until: $mutedUntil }
    ) {
      affected_rows
      returning {
        id
        notifications_enabled
        muted_until
      }
    }
  }
`;

/**
 * Create or get direct message channel between users
 */
export const GET_OR_CREATE_DM_CHANNEL = gql`
  mutation GetOrCreateDMChannel($userId1: uuid!, $userId2: uuid!) {
    insert_nchat_channels_one(
      object: {
        name: "Direct Message"
        slug: "dm"
        type: "direct"
        is_private: true
        members: {
          data: [
            { user_id: $userId1, role: "member" }
            { user_id: $userId2, role: "member" }
          ]
        }
      }
      on_conflict: { constraint: nchat_channels_dm_unique, update_columns: [] }
    ) {
      ...ChannelFull
      members {
        user {
          ...UserBasic
        }
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Reorder channels within a category
 */
export const REORDER_CHANNELS = gql`
  mutation ReorderChannels($updates: [nchat_channels_updates!]!) {
    update_nchat_channels_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to channel updates
 */
export const CHANNEL_SUBSCRIPTION = gql`
  subscription ChannelSubscription($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Subscribe to all channels (for sidebar updates)
 */
export const CHANNELS_SUBSCRIPTION = gql`
  subscription ChannelsSubscription {
    nchat_channels(
      where: { is_archived: { _eq: false } }
      order_by: [{ category_id: asc_nulls_last }, { position: asc }]
    ) {
      ...ChannelBasic
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel member changes
 */
export const CHANNEL_MEMBERS_SUBSCRIPTION = gql`
  subscription ChannelMembersSubscription($channelId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId } }
      order_by: { joined_at: asc }
    ) {
      ...ChannelMember
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Subscribe to user's channel membership changes
 */
export const USER_CHANNELS_SUBSCRIPTION = gql`
  subscription UserChannelsSubscription($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel {
        ...ChannelBasic
      }
      last_read_at
      notifications_enabled
    }
  }
  ${CHANNEL_BASIC_FRAGMENT}
`;
