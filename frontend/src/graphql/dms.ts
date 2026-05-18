/**
 * Direct Messages GraphQL Operations
 *
 * Handles 1:1 and group direct messaging functionality
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT, ATTACHMENT_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DMType = "direct" | "group";
export type DMStatus = "active" | "archived" | "deleted";
export type DMNotificationSetting = "all" | "mentions" | "none";
export type DMParticipantRole = "owner" | "admin" | "member";

export interface CreateDMVariables {
  creatorId: string;
  participantId: string;
}

export interface CreateGroupDMVariables {
  name: string;
  description?: string;
  creatorId: string;
  participantIds: { user_id: string; role?: string }[];
}

export interface GetUserDMsVariables {
  userId: string;
  status?: DMStatus;
  limit?: number;
  offset?: number;
}

export interface GetDMVariables {
  id?: string;
  slug?: string;
}

export interface SendDMMessageVariables {
  dmId: string;
  userId: string;
  content: string;
  type?: string;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDMSettingsVariables {
  dmId: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface AddDMParticipantsVariables {
  participants: { dm_id: string; user_id: string; role?: string }[];
}

export interface MarkDMAsReadVariables {
  dmId: string;
  userId: string;
  messageId: string;
}

export interface UpdateDMNotificationSettingsVariables {
  dmId: string;
  userId: string;
  setting: DMNotificationSetting;
  isMuted?: boolean;
  mutedUntil?: string;
}

export interface DMSubscriptionVariables {
  userId?: string;
  dmId?: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const DM_USER_FRAGMENT = gql`
  fragment DMUser on nchat_users {
    id
    username
    display_name
    avatar_url
    status
    status_emoji
    last_seen_at
  }
`;

export const DM_PARTICIPANT_FRAGMENT = gql`
  fragment DMParticipant on nchat_dm_participants {
    id
    user_id
    dm_id
    joined_at
    last_read_at
    last_read_message_id
    notification_setting
    is_muted
    muted_until
    role
    user {
      ...DMUser
    }
  }
  ${DM_USER_FRAGMENT}
`;

export const DM_BASIC_FRAGMENT = gql`
  fragment DMBasic on nchat_direct_messages {
    id
    type
    name
    slug
    description
    avatar_url
    created_by
    created_at
    updated_at
    status
    archived_at
    archived_by
    participant_count
    last_message_id
    last_message_at
    last_message_preview
    last_message_user_id
  }
`;

export const DM_FULL_FRAGMENT = gql`
  fragment DMFull on nchat_direct_messages {
    ...DMBasic
    settings
    participants {
      ...DMParticipant
    }
  }
  ${DM_BASIC_FRAGMENT}
  ${DM_PARTICIPANT_FRAGMENT}
`;

export const DM_MESSAGE_FRAGMENT = gql`
  fragment DMMessage on nchat_dm_messages {
    id
    dm_id
    user_id
    content
    type
    reply_to_id
    forwarded_from_id
    is_edited
    is_pinned
    is_deleted
    deleted_at
    created_at
    edited_at
    metadata
    user {
      ...DMUser
    }
    reply_to {
      id
      content
      user {
        ...DMUser
      }
    }
    attachments {
      ...Attachment
    }
    reactions {
      id
      message_id
      user_id
      emoji
      created_at
      user {
        ...UserBasic
      }
    }
    read_receipts {
      id
      message_id
      user_id
      read_at
      user {
        ...UserBasic
      }
    }
  }
  ${DM_USER_FRAGMENT}
  ${ATTACHMENT_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all DMs for the current user
 */
export const GET_USER_DMS = gql`
  query GetUserDMs(
    $userId: uuid!
    $status: String = "active"
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _eq: $status } } }
      order_by: { dm: { last_message_at: desc_nulls_last } }
      limit: $limit
      offset: $offset
    ) {
      dm {
        ...DMFull
      }
      last_read_at
      last_read_message_id
      notification_setting
      is_muted
      muted_until
    }
    nchat_dm_participants_aggregate(
      where: { user_id: { _eq: $userId }, dm: { status: { _eq: $status } } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${DM_FULL_FRAGMENT}
`;

/**
 * Get a single DM by ID
 */
export const GET_DM = gql`
  query GetDM($id: uuid!) {
    nchat_direct_messages_by_pk(id: $id) {
      ...DMFull
      pinned_messages: messages(
        where: { is_pinned: { _eq: true }, is_deleted: { _eq: false } }
        order_by: { created_at: desc }
      ) {
        id
        content
        type
        created_at
        user {
          ...DMUser
        }
      }
    }
  }
  ${DM_FULL_FRAGMENT}
  ${DM_USER_FRAGMENT}
`;

/**
 * Get a DM by slug
 */
export const GET_DM_BY_SLUG = gql`
  query GetDMBySlug($slug: String!) {
    nchat_direct_messages(where: { slug: { _eq: $slug } }, limit: 1) {
      ...DMFull
    }
  }
  ${DM_FULL_FRAGMENT}
`;

/**
 * Check if DM exists between two users
 */
export const CHECK_EXISTING_DM = gql`
  query CheckExistingDM($userId1: uuid!, $userId2: uuid!) {
    nchat_direct_messages(
      where: {
        type: { _eq: "direct" }
        _and: [
          { participants: { user_id: { _eq: $userId1 } } }
          { participants: { user_id: { _eq: $userId2 } } }
        ]
      }
      limit: 1
    ) {
      ...DMFull
    }
  }
  ${DM_FULL_FRAGMENT}
`;

/**
 * Get DM messages with pagination
 */
export const GET_DM_MESSAGES = gql`
  query GetDMMessages(
    $dmId: uuid!
    $limit: Int = 50
    $cursor: timestamptz
    $order: order_by = desc
  ) {
    nchat_dm_messages(
      where: {
        dm_id: { _eq: $dmId }
        is_deleted: { _eq: false }
        created_at: { _lt: $cursor }
      }
      order_by: { created_at: $order }
      limit: $limit
    ) {
      ...DMMessage
    }
    nchat_dm_messages_aggregate(
      where: { dm_id: { _eq: $dmId }, is_deleted: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${DM_MESSAGE_FRAGMENT}
`;

/**
 * Get unread count for all DMs
 */
export const GET_TOTAL_DM_UNREAD_COUNT = gql`
  query GetTotalDMUnreadCount($userId: uuid!) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _eq: "active" } } }
    ) {
      dm_id
      last_read_at
      dm {
        messages_aggregate(
          where: { is_deleted: { _eq: false }, user_id: { _neq: $userId } }
        ) {
          aggregate {
            count
          }
        }
      }
    }
  }
`;

/**
 * Search DM messages
 */
export const SEARCH_DM_MESSAGES = gql`
  query SearchDMMessages(
    $dmId: uuid!
    $query: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_dm_messages(
      where: {
        dm_id: { _eq: $dmId }
        is_deleted: { _eq: false }
        content: { _ilike: $query }
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...DMMessage
    }
  }
  ${DM_MESSAGE_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new 1:1 DM or get existing one
 */
export const CREATE_OR_GET_DM = gql`
  mutation CreateOrGetDM($creatorId: uuid!, $participantId: uuid!) {
    insert_nchat_direct_messages_one(
      object: {
        type: "direct"
        slug: ""
        created_by: $creatorId
        participants: {
          data: [
            { user_id: $creatorId, role: "member" }
            { user_id: $participantId, role: "member" }
          ]
        }
      }
      on_conflict: {
        constraint: nchat_direct_messages_dm_unique
        update_columns: [updated_at]
      }
    ) {
      id
      slug
      type
      participants {
        user {
          ...UserBasic
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Create a new group DM
 */
export const CREATE_GROUP_DM = gql`
  mutation CreateGroupDM(
    $name: String!
    $description: String
    $creatorId: uuid!
    $participantIds: [nchat_dm_participants_insert_input!]!
  ) {
    insert_nchat_direct_messages_one(
      object: {
        type: "group"
        name: $name
        description: $description
        slug: ""
        created_by: $creatorId
        participants: { data: $participantIds }
      }
    ) {
      id
      slug
      type
      name
      description
      participants {
        user_id
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
 * Update DM settings (group only)
 */
export const UPDATE_DM_SETTINGS = gql`
  mutation UpdateDMSettings(
    $dmId: uuid!
    $name: String
    $description: String
    $avatarUrl: String
  ) {
    update_nchat_direct_messages_by_pk(
      pk_columns: { id: $dmId }
      _set: {
        name: $name
        description: $description
        avatar_url: $avatarUrl
        updated_at: "now()"
      }
    ) {
      id
      name
      description
      avatar_url
      updated_at
    }
  }
`;

/**
 * Archive a DM
 */
export const ARCHIVE_DM = gql`
  mutation ArchiveDM($dmId: uuid!, $userId: uuid!) {
    update_nchat_direct_messages_by_pk(
      pk_columns: { id: $dmId }
      _set: { status: "archived", archived_at: "now()", archived_by: $userId }
    ) {
      id
      status
      archived_at
      archived_by
    }
  }
`;

/**
 * Unarchive a DM
 */
export const UNARCHIVE_DM = gql`
  mutation UnarchiveDM($dmId: uuid!) {
    update_nchat_direct_messages_by_pk(
      pk_columns: { id: $dmId }
      _set: { status: "active", archived_at: null, archived_by: null }
    ) {
      id
      status
    }
  }
`;

/**
 * Delete a DM (soft delete)
 */
export const DELETE_DM = gql`
  mutation DeleteDM($dmId: uuid!) {
    update_nchat_direct_messages_by_pk(
      pk_columns: { id: $dmId }
      _set: { status: "deleted" }
    ) {
      id
      status
    }
  }
`;

/**
 * Send a message
 */
export const SEND_DM_MESSAGE = gql`
  mutation SendDMMessage(
    $dmId: uuid!
    $userId: uuid!
    $content: String!
    $type: String = "text"
    $replyToId: uuid
    $metadata: jsonb
  ) {
    insert_nchat_dm_messages_one(
      object: {
        dm_id: $dmId
        user_id: $userId
        content: $content
        type: $type
        reply_to_id: $replyToId
        metadata: $metadata
      }
    ) {
      ...DMMessage
    }
  }
  ${DM_MESSAGE_FRAGMENT}
`;

/**
 * Update a message
 */
export const UPDATE_DM_MESSAGE = gql`
  mutation UpdateDMMessage($messageId: uuid!, $content: String!) {
    update_nchat_dm_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { content: $content, is_edited: true, edited_at: "now()" }
    ) {
      id
      content
      is_edited
      edited_at
    }
  }
`;

/**
 * Delete a message (soft delete)
 */
export const DELETE_DM_MESSAGE = gql`
  mutation DeleteDMMessage($messageId: uuid!) {
    update_nchat_dm_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_deleted: true, deleted_at: "now()" }
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

/**
 * Mark DM as read
 */
export const MARK_DM_AS_READ = gql`
  mutation MarkDMAsRead($dmId: uuid!, $userId: uuid!, $messageId: uuid!) {
    update_nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()", last_read_message_id: $messageId }
    ) {
      affected_rows
      returning {
        id
        last_read_at
        last_read_message_id
      }
    }
  }
`;

/**
 * Add participants to group DM
 */
export const ADD_DM_PARTICIPANTS = gql`
  mutation AddDMParticipants(
    $participants: [nchat_dm_participants_insert_input!]!
  ) {
    insert_nchat_dm_participants(
      objects: $participants
      on_conflict: {
        constraint: nchat_dm_participants_dm_id_user_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        user_id
        dm_id
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
 * Remove participant from group DM
 */
export const REMOVE_DM_PARTICIPANT = gql`
  mutation RemoveDMParticipant($dmId: uuid!, $userId: uuid!) {
    delete_nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Leave a DM
 */
export const LEAVE_DM = gql`
  mutation LeaveDM($dmId: uuid!, $userId: uuid!) {
    delete_nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Update notification settings for a DM
 */
export const UPDATE_DM_NOTIFICATION_SETTINGS = gql`
  mutation UpdateDMNotificationSettings(
    $dmId: uuid!
    $userId: uuid!
    $setting: String!
    $isMuted: Boolean
    $mutedUntil: timestamptz
  ) {
    update_nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
      _set: {
        notification_setting: $setting
        is_muted: $isMuted
        muted_until: $mutedUntil
      }
    ) {
      affected_rows
      returning {
        id
        notification_setting
        is_muted
        muted_until
      }
    }
  }
`;

/**
 * Add reaction to DM message
 */
export const ADD_DM_REACTION = gql`
  mutation AddDMReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    insert_nchat_dm_reactions_one(
      object: { message_id: $messageId, user_id: $userId, emoji: $emoji }
      on_conflict: {
        constraint: nchat_dm_reactions_message_id_user_id_emoji_key
        update_columns: []
      }
    ) {
      id
      message_id
      user_id
      emoji
      created_at
    }
  }
`;

/**
 * Remove reaction from DM message
 */
export const REMOVE_DM_REACTION = gql`
  mutation RemoveDMReaction(
    $messageId: uuid!
    $userId: uuid!
    $emoji: String!
  ) {
    delete_nchat_dm_reactions(
      where: {
        message_id: { _eq: $messageId }
        user_id: { _eq: $userId }
        emoji: { _eq: $emoji }
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to DM list updates
 */
export const DM_LIST_SUBSCRIPTION = gql`
  subscription DMListSubscription($userId: uuid!) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _eq: "active" } } }
      order_by: { dm: { last_message_at: desc_nulls_last } }
    ) {
      dm {
        ...DMBasic
        participants {
          user_id
          user {
            ...DMUser
          }
        }
      }
      last_read_at
      is_muted
      muted_until
    }
  }
  ${DM_BASIC_FRAGMENT}
  ${DM_USER_FRAGMENT}
`;

/**
 * Subscribe to a single DM updates
 */
export const DM_SUBSCRIPTION = gql`
  subscription DMSubscription($dmId: uuid!) {
    nchat_direct_messages_by_pk(id: $dmId) {
      ...DMFull
    }
  }
  ${DM_FULL_FRAGMENT}
`;

/**
 * Subscribe to new messages in a DM
 */
export const DM_MESSAGES_SUBSCRIPTION = gql`
  subscription DMMessagesSubscription($dmId: uuid!, $limit: Int = 50) {
    nchat_dm_messages(
      where: { dm_id: { _eq: $dmId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...DMMessage
    }
  }
  ${DM_MESSAGE_FRAGMENT}
`;

/**
 * Subscribe to typing indicators in a DM
 */
export const DM_TYPING_SUBSCRIPTION = gql`
  subscription DMTypingSubscription($dmId: uuid!, $excludeUserId: uuid!) {
    nchat_dm_typing_indicators(
      where: {
        dm_id: { _eq: $dmId }
        user_id: { _neq: $excludeUserId }
        expires_at: { _gt: "now()" }
      }
    ) {
      dm_id
      user_id
      started_at
      expires_at
      user {
        ...DMUser
      }
    }
  }
  ${DM_USER_FRAGMENT}
`;

/**
 * Subscribe to unread count for all DMs
 */
export const DM_UNREAD_COUNT_SUBSCRIPTION = gql`
  subscription DMUnreadCountSubscription($userId: uuid!) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _eq: "active" } } }
    ) {
      dm_id
      last_read_at
      is_muted
      dm {
        id
        last_message_at
        messages_aggregate(
          where: { is_deleted: { _eq: false }, user_id: { _neq: $userId } }
        ) {
          aggregate {
            count
          }
        }
      }
    }
  }
`;
