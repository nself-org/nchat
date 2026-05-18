/**
 * Channel Management GraphQL Mutations
 *
 * Comprehensive mutations for channel lifecycle, membership, and settings.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Channel CRUD Mutations
// ============================================================================

export const CREATE_CHANNEL = gql`
  mutation CreateChannel(
    $name: String!
    $description: String
    $type: String!
    $isPrivate: Boolean!
    $topic: String
    $icon: String
    $categoryId: uuid
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        description: $description
        type: $type
        is_private: $isPrivate
        topic: $topic
        icon: $icon
        category_id: $categoryId
      }
    ) {
      id
      name
      slug
      description
      type
      is_private
      topic
      icon
      category_id
      created_at
      owner_id
    }
  }
`;

export const UPDATE_CHANNEL = gql`
  mutation UpdateChannel(
    $channelId: uuid!
    $name: String
    $description: String
    $topic: String
    $icon: String
    $categoryId: uuid
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        name: $name
        description: $description
        topic: $topic
        icon: $icon
        category_id: $categoryId
      }
    ) {
      id
      name
      slug
      description
      topic
      icon
      category_id
      updated_at
    }
  }
`;

export const DELETE_CHANNEL = gql`
  mutation DeleteChannel($channelId: uuid!) {
    delete_nchat_channels_by_pk(id: $channelId) {
      id
      name
    }
  }
`;

export const ARCHIVE_CHANNEL = gql`
  mutation ArchiveChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      id
      name
      is_archived
      archived_at
    }
  }
`;

export const UNARCHIVE_CHANNEL = gql`
  mutation UnarchiveChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_archived: false, archived_at: null }
    ) {
      id
      name
      is_archived
      archived_at
    }
  }
`;

// ============================================================================
// Channel Membership Mutations
// ============================================================================

export const JOIN_CHANNEL = gql`
  mutation JoinChannel($channelId: uuid!, $userId: uuid!) {
    insert_nchat_channel_members_one(
      object: { channel_id: $channelId, user_id: $userId, role: "member" }
    ) {
      channel_id
      user_id
      role
      joined_at
    }
  }
`;

export const LEAVE_CHANNEL = gql`
  mutation LeaveChannel($channelId: uuid!, $userId: uuid!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

export const ADD_CHANNEL_MEMBER = gql`
  mutation AddChannelMember($channelId: uuid!, $userId: uuid!, $role: String) {
    insert_nchat_channel_members_one(
      object: { channel_id: $channelId, user_id: $userId, role: $role }
      on_conflict: { constraint: channel_members_pkey, update_columns: [role] }
    ) {
      channel_id
      user_id
      role
      joined_at
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const REMOVE_CHANNEL_MEMBER = gql`
  mutation RemoveChannelMember($channelId: uuid!, $userId: uuid!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($channelId: uuid!, $userId: uuid!, $role: String!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { role: $role }
    ) {
      affected_rows
      returning {
        channel_id
        user_id
        role
        user {
          id
          display_name
        }
      }
    }
  }
`;

export const TRANSFER_OWNERSHIP = gql`
  mutation TransferOwnership($channelId: uuid!, $newOwnerId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { owner_id: $newOwnerId }
    ) {
      id
      owner_id
      owner {
        id
        display_name
        avatar_url
      }
      updated_at
    }
  }
`;

// ============================================================================
// Channel Settings Mutations
// ============================================================================

export const MUTE_CHANNEL = gql`
  mutation MuteChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_muted: true }
    ) {
      affected_rows
      returning {
        channel_id
        is_muted
      }
    }
  }
`;

export const UNMUTE_CHANNEL = gql`
  mutation UnmuteChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_muted: false }
    ) {
      affected_rows
      returning {
        channel_id
        is_muted
      }
    }
  }
`;

export const PIN_CHANNEL = gql`
  mutation PinChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_pinned: true }
    ) {
      affected_rows
      returning {
        channel_id
        is_pinned
      }
    }
  }
`;

export const UNPIN_CHANNEL = gql`
  mutation UnpinChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_pinned: false }
    ) {
      affected_rows
      returning {
        channel_id
        is_pinned
      }
    }
  }
`;

export const UPDATE_CHANNEL_NOTIFICATIONS = gql`
  mutation UpdateChannelNotifications(
    $channelId: uuid!
    $userId: uuid!
    $notificationsEnabled: Boolean!
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { notifications_enabled: $notificationsEnabled }
    ) {
      affected_rows
      returning {
        channel_id
        notifications_enabled
      }
    }
  }
`;

export const UPDATE_CHANNEL_PRIVACY = gql`
  mutation UpdateChannelPrivacy($channelId: uuid!, $isPrivate: Boolean!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_private: $isPrivate }
    ) {
      id
      is_private
      updated_at
    }
  }
`;

// ============================================================================
// Bulk Operations
// ============================================================================

export const ADD_MULTIPLE_MEMBERS = gql`
  mutation AddMultipleMembers(
    $members: [nchat_channel_members_insert_input!]!
  ) {
    insert_nchat_channel_members(
      objects: $members
      on_conflict: { constraint: channel_members_pkey, update_columns: [role] }
    ) {
      affected_rows
      returning {
        channel_id
        user_id
        role
        user {
          id
          display_name
          avatar_url
        }
      }
    }
  }
`;

export const REMOVE_MULTIPLE_MEMBERS = gql`
  mutation RemoveMultipleMembers($channelId: uuid!, $userIds: [uuid!]!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _in: $userIds } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreateChannelInput {
  name: string;
  description?: string;
  type: "text" | "voice" | "announcement" | "general";
  isPrivate: boolean;
  topic?: string;
  icon?: string;
  categoryId?: string;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
  icon?: string;
  categoryId?: string;
}

export interface ChannelMemberInput {
  channelId: string;
  userId: string;
  role?: "owner" | "admin" | "moderator" | "member";
}

export interface BulkMemberInput {
  channel_id: string;
  user_id: string;
  role?: string;
}
