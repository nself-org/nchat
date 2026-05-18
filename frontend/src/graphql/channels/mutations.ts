/**
 * Channel GraphQL Mutations
 *
 * Comprehensive mutations for channel CRUD, membership management, and settings.
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

export interface CreateChannelInput {
  name: string;
  slug?: string;
  description?: string | null;
  topic?: string | null;
  type: "public" | "private" | "direct" | "group" | "announcement";
  workspaceId?: string | null;
  categoryId?: string | null;
  icon?: string | null;
  color?: string | null;
  isDefault?: boolean;
  isReadonly?: boolean;
  maxMembers?: number | null;
  slowmodeSeconds?: number;
  createdBy: string;
  memberIds?: string[];
}

export interface UpdateChannelInput {
  name?: string;
  description?: string | null;
  topic?: string | null;
  icon?: string | null;
  color?: string | null;
  categoryId?: string | null;
  position?: number;
  isReadonly?: boolean;
  isDefault?: boolean;
  maxMembers?: number | null;
  slowmodeSeconds?: number;
}

export interface AddMemberInput {
  channelId: string;
  userId: string;
  role?: "owner" | "admin" | "moderator" | "member" | "guest";
  invitedBy?: string;
}

export interface UpdateMemberInput {
  channelId: string;
  userId: string;
  role?: string;
  nickname?: string;
  canRead?: boolean | null;
  canWrite?: boolean | null;
  canManage?: boolean | null;
  canInvite?: boolean | null;
  canPin?: boolean | null;
  canDeleteMessages?: boolean | null;
  canMentionEveryone?: boolean | null;
  notificationLevel?: "all" | "mentions" | "none";
  isMuted?: boolean;
  mutedUntil?: string | null;
  isPinned?: boolean;
}

// ============================================================================
// CHANNEL CRUD MUTATIONS
// ============================================================================

/**
 * Create a new channel
 */
export const CREATE_CHANNEL = gql`
  mutation CreateChannel(
    $name: String!
    $slug: String!
    $description: String
    $topic: String
    $type: String!
    $workspaceId: uuid
    $categoryId: uuid
    $icon: String
    $color: String
    $isDefault: Boolean = false
    $isReadonly: Boolean = false
    $maxMembers: Int
    $slowmodeSeconds: Int = 0
    $createdBy: uuid!
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        slug: $slug
        description: $description
        topic: $topic
        type: $type
        workspace_id: $workspaceId
        category_id: $categoryId
        icon: $icon
        color: $color
        is_default: $isDefault
        is_readonly: $isReadonly
        max_members: $maxMembers
        slowmode_seconds: $slowmodeSeconds
        created_by: $createdBy
        member_count: 1
        members: { data: [{ user_id: $createdBy, role: "owner" }] }
      }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Create a channel with initial members
 */
export const CREATE_CHANNEL_WITH_MEMBERS = gql`
  mutation CreateChannelWithMembers(
    $name: String!
    $slug: String!
    $description: String
    $type: String!
    $createdBy: uuid!
    $members: [nchat_channel_members_insert_input!]!
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        slug: $slug
        description: $description
        type: $type
        created_by: $createdBy
        members: { data: $members }
      }
    ) {
      ...ChannelFull
      members {
        ...ChannelMember
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Update channel details
 */
export const UPDATE_CHANNEL = gql`
  mutation UpdateChannel(
    $channelId: uuid!
    $name: String
    $description: String
    $topic: String
    $icon: String
    $color: String
    $categoryId: uuid
    $position: Int
    $isReadonly: Boolean
    $isDefault: Boolean
    $maxMembers: Int
    $slowmodeSeconds: Int
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        name: $name
        description: $description
        topic: $topic
        icon: $icon
        color: $color
        category_id: $categoryId
        position: $position
        is_readonly: $isReadonly
        is_default: $isDefault
        max_members: $maxMembers
        slowmode_seconds: $slowmodeSeconds
        updated_at: "now()"
      }
    ) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Delete a channel (hard delete)
 */
export const DELETE_CHANNEL = gql`
  mutation DeleteChannel($channelId: uuid!) {
    delete_nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      affected_rows
    }
    delete_nchat_channels_by_pk(id: $channelId) {
      id
      name
      slug
    }
  }
`;

/**
 * Archive a channel (soft delete)
 */
export const ARCHIVE_CHANNEL = gql`
  mutation ArchiveChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_archived: true, archived_at: "now()", updated_at: "now()" }
    ) {
      id
      name
      is_archived
      archived_at
      updated_at
    }
  }
`;

/**
 * Unarchive a channel
 */
export const UNARCHIVE_CHANNEL = gql`
  mutation UnarchiveChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_archived: false, archived_at: null, updated_at: "now()" }
    ) {
      id
      name
      is_archived
      archived_at
      updated_at
    }
  }
`;

// ============================================================================
// MEMBERSHIP MUTATIONS
// ============================================================================

/**
 * Join a public channel
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
      channel_id
      user_id
      role
      joined_at
      channel {
        ...ChannelBasic
        member_count
      }
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
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
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;

/**
 * Add a member to a channel (invite)
 */
export const ADD_CHANNEL_MEMBER = gql`
  mutation AddChannelMember(
    $channelId: uuid!
    $userId: uuid!
    $role: String = "member"
    $invitedBy: uuid
  ) {
    insert_nchat_channel_members_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        role: $role
        invited_by: $invitedBy
      }
      on_conflict: {
        constraint: nchat_channel_members_channel_id_user_id_key
        update_columns: [role, invited_by]
      }
    ) {
      ...ChannelMember
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: 1 }
    ) {
      id
      member_count
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Remove a member from a channel
 */
export const REMOVE_CHANNEL_MEMBER = gql`
  mutation RemoveChannelMember($channelId: uuid!, $userId: uuid!) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
      returning {
        id
        user_id
        channel_id
      }
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: -1 }
    ) {
      id
      member_count
    }
  }
`;

/**
 * Add multiple members to a channel (bulk invite)
 */
export const ADD_CHANNEL_MEMBERS_BULK = gql`
  mutation AddChannelMembersBulk(
    $members: [nchat_channel_members_insert_input!]!
    $channelId: uuid!
    $memberCount: Int!
  ) {
    insert_nchat_channel_members(
      objects: $members
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
        joined_at
        user {
          ...UserBasic
        }
      }
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: $memberCount }
    ) {
      id
      member_count
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Remove multiple members from a channel
 */
export const REMOVE_CHANNEL_MEMBERS_BULK = gql`
  mutation RemoveChannelMembersBulk(
    $channelId: uuid!
    $userIds: [uuid!]!
    $memberCount: Int!
  ) {
    delete_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _in: $userIds } }
    ) {
      affected_rows
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _inc: { member_count: $memberCount }
    ) {
      id
      member_count
    }
  }
`;

/**
 * Update member role
 */
export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($channelId: uuid!, $userId: uuid!, $role: String!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { role: $role, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        ...ChannelMember
      }
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

/**
 * Update member permissions
 */
export const UPDATE_MEMBER_PERMISSIONS = gql`
  mutation UpdateMemberPermissions(
    $channelId: uuid!
    $userId: uuid!
    $canRead: Boolean
    $canWrite: Boolean
    $canManage: Boolean
    $canInvite: Boolean
    $canPin: Boolean
    $canDeleteMessages: Boolean
    $canMentionEveryone: Boolean
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: {
        can_read: $canRead
        can_write: $canWrite
        can_manage: $canManage
        can_invite: $canInvite
        can_pin: $canPin
        can_delete_messages: $canDeleteMessages
        can_mention_everyone: $canMentionEveryone
        updated_at: "now()"
      }
    ) {
      affected_rows
      returning {
        id
        user_id
        channel_id
        role
        can_read
        can_write
        can_manage
        can_invite
        can_pin
        can_delete_messages
        can_mention_everyone
      }
    }
  }
`;

/**
 * Update member nickname
 */
export const UPDATE_MEMBER_NICKNAME = gql`
  mutation UpdateMemberNickname(
    $channelId: uuid!
    $userId: uuid!
    $nickname: String
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { nickname: $nickname, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        user_id
        nickname
      }
    }
  }
`;

/**
 * Transfer channel ownership
 */
export const TRANSFER_CHANNEL_OWNERSHIP = gql`
  mutation TransferChannelOwnership(
    $channelId: uuid!
    $currentOwnerId: uuid!
    $newOwnerId: uuid!
  ) {
    update_current_owner: update_nchat_channel_members(
      where: {
        channel_id: { _eq: $channelId }
        user_id: { _eq: $currentOwnerId }
      }
      _set: { role: "admin", updated_at: "now()" }
    ) {
      affected_rows
    }
    update_new_owner: update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $newOwnerId } }
      _set: { role: "owner", updated_at: "now()" }
    ) {
      affected_rows
      returning {
        ...ChannelMember
      }
    }
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { created_by: $newOwnerId, updated_at: "now()" }
    ) {
      id
      created_by
    }
  }
  ${CHANNEL_MEMBER_FRAGMENT}
`;

// ============================================================================
// MEMBER SETTINGS MUTATIONS
// ============================================================================

/**
 * Mute a channel for a user
 */
export const MUTE_CHANNEL = gql`
  mutation MuteChannel(
    $channelId: uuid!
    $userId: uuid!
    $mutedUntil: timestamptz
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_muted: true, muted_until: $mutedUntil, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        channel_id
        is_muted
        muted_until
      }
    }
  }
`;

/**
 * Unmute a channel for a user
 */
export const UNMUTE_CHANNEL = gql`
  mutation UnmuteChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_muted: false, muted_until: null, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        channel_id
        is_muted
        muted_until
      }
    }
  }
`;

/**
 * Pin a channel for a user
 */
export const PIN_CHANNEL = gql`
  mutation PinChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_pinned: true, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        channel_id
        is_pinned
      }
    }
  }
`;

/**
 * Unpin a channel for a user
 */
export const UNPIN_CHANNEL = gql`
  mutation UnpinChannel($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { is_pinned: false, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        channel_id
        is_pinned
      }
    }
  }
`;

/**
 * Update notification settings for a channel member
 */
export const UPDATE_CHANNEL_NOTIFICATIONS = gql`
  mutation UpdateChannelNotifications(
    $channelId: uuid!
    $userId: uuid!
    $notificationLevel: String!
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { notification_level: $notificationLevel, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        channel_id
        notification_level
      }
    }
  }
`;

/**
 * Mark channel as read
 */
export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead(
    $channelId: uuid!
    $userId: uuid!
    $messageId: uuid
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: {
        last_read_message_id: $messageId
        last_read_at: "now()"
        unread_count: 0
        mention_count: 0
        updated_at: "now()"
      }
    ) {
      affected_rows
      returning {
        id
        channel_id
        last_read_at
        last_read_message_id
        unread_count
        mention_count
      }
    }
  }
`;

// ============================================================================
// DIRECT MESSAGE MUTATIONS
// ============================================================================

/**
 * Create or get existing direct message channel
 */
export const GET_OR_CREATE_DM = gql`
  mutation GetOrCreateDM($userId1: uuid!, $userId2: uuid!) {
    insert_nchat_channels_one(
      object: {
        name: "Direct Message"
        slug: "dm"
        type: "direct"
        created_by: $userId1
        member_count: 2
        members: {
          data: [
            { user_id: $userId1, role: "member" }
            { user_id: $userId2, role: "member" }
          ]
        }
      }
      on_conflict: {
        constraint: nchat_channels_dm_unique
        update_columns: [updated_at]
      }
    ) {
      ...ChannelFull
      members {
        user {
          ...UserBasic
        }
        role
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Create a group DM
 */
export const CREATE_GROUP_DM = gql`
  mutation CreateGroupDM(
    $name: String
    $createdBy: uuid!
    $members: [nchat_channel_members_insert_input!]!
    $memberCount: Int!
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        slug: "group-dm"
        type: "group"
        created_by: $createdBy
        member_count: $memberCount
        members: { data: $members }
      }
    ) {
      ...ChannelFull
      members {
        user {
          ...UserBasic
        }
        role
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// CHANNEL REORDERING
// ============================================================================

/**
 * Update channel position within a category
 */
export const UPDATE_CHANNEL_POSITION = gql`
  mutation UpdateChannelPosition(
    $channelId: uuid!
    $position: Int!
    $categoryId: uuid
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        position: $position
        category_id: $categoryId
        updated_at: "now()"
      }
    ) {
      id
      position
      category_id
    }
  }
`;

/**
 * Bulk update channel positions (for drag-and-drop reordering)
 */
export const REORDER_CHANNELS = gql`
  mutation ReorderChannels($updates: [nchat_channels_updates!]!) {
    update_nchat_channels_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
        category_id
      }
    }
  }
`;

// ============================================================================
// CHANNEL TYPE MUTATIONS
// ============================================================================

/**
 * Convert channel type (e.g., public to private)
 */
export const UPDATE_CHANNEL_TYPE = gql`
  mutation UpdateChannelType($channelId: uuid!, $type: String!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { type: $type, updated_at: "now()" }
    ) {
      id
      type
      updated_at
    }
  }
`;

/**
 * Update channel to announcement type (read-only for most members)
 */
export const MAKE_ANNOUNCEMENT_CHANNEL = gql`
  mutation MakeAnnouncementChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { type: "announcement", is_readonly: true, updated_at: "now()" }
    ) {
      id
      type
      is_readonly
      updated_at
    }
  }
`;
