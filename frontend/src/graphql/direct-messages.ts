import { gql } from "@apollo/client";

/**
 * Direct Messages GraphQL operations
 *
 * Handles DM creation, querying, and management
 */

// ============================================================================
// Fragments
// ============================================================================

const DM_USER_FRAGMENT = gql`
  fragment DMUser on users {
    id
    username
    displayName: display_name
    avatarUrl: avatar_url
    status
    statusEmoji: status_emoji
    lastSeenAt: last_seen_at
  }
`;

const DM_PARTICIPANT_FRAGMENT = gql`
  fragment DMParticipant on nchat_dm_participants {
    id
    userId: user_id
    dmId: dm_id
    joinedAt: joined_at
    lastReadAt: last_read_at
    lastReadMessageId: last_read_message_id
    notificationSetting: notification_setting
    isMuted: is_muted
    mutedUntil: muted_until
    role
    user {
      ...DMUser
    }
  }
  ${DM_USER_FRAGMENT}
`;

const DM_FRAGMENT = gql`
  fragment DirectMessage on nchat_direct_messages {
    id
    type
    name
    slug
    description
    avatarUrl: avatar_url
    createdBy: created_by
    createdAt: created_at
    updatedAt: updated_at
    status
    archivedAt: archived_at
    archivedBy: archived_by
    lastMessageId: last_message_id
    lastMessageAt: last_message_at
    lastMessagePreview: last_message_preview
    lastMessageUserId: last_message_user_id
    settings
    participants {
      ...DMParticipant
    }
  }
  ${DM_PARTICIPANT_FRAGMENT}
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get or create a DM channel between two users
 */
export const GET_OR_CREATE_DM = gql`
  mutation GetOrCreateDM($userId1: uuid!, $userId2: uuid!) {
    insert_nchat_direct_messages_one(
      object: {
        type: "direct"
        slug: ""
        created_by: $userId1
        participants: {
          data: [
            { user_id: $userId1, role: "member" }
            { user_id: $userId2, role: "member" }
          ]
        }
      }
      on_conflict: {
        constraint: nchat_direct_messages_participants_unique
        update_columns: []
      }
    ) {
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Find existing DM between two users
 */
export const FIND_DM_BY_PARTICIPANTS = gql`
  query FindDMByParticipants($userId1: uuid!, $userId2: uuid!) {
    nchat_direct_messages(
      where: {
        type: { _eq: "direct" }
        status: { _eq: "active" }
        participants: { user_id: { _in: [$userId1, $userId2] } }
      }
      limit: 1
    ) {
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Get all DMs for a user
 */
export const GET_USER_DMS = gql`
  query GetUserDMs($userId: uuid!) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _neq: "deleted" } } }
      order_by: { dm: { last_message_at: desc_nulls_last } }
    ) {
      dm {
        ...DirectMessage
      }
      lastReadAt: last_read_at
      lastReadMessageId: last_read_message_id
      notificationSetting: notification_setting
      isMuted: is_muted
      mutedUntil: muted_until
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Get a single DM by ID
 */
export const GET_DM = gql`
  query GetDM($dmId: uuid!) {
    nchat_direct_messages_by_pk(id: $dmId) {
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a group DM
 */
export const CREATE_GROUP_DM = gql`
  mutation CreateGroupDM(
    $name: String!
    $description: String
    $creatorId: uuid!
    $participantIds: [uuid!]!
    $avatarUrl: String
  ) {
    insert_nchat_direct_messages_one(
      object: {
        type: "group"
        name: $name
        description: $description
        avatar_url: $avatarUrl
        created_by: $creatorId
        slug: ""
        participants: { data: [{ user_id: $creatorId, role: "owner" }] }
      }
    ) {
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Update DM
 */
export const UPDATE_DM = gql`
  mutation UpdateDM(
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
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Archive DM
 */
export const ARCHIVE_DM = gql`
  mutation ArchiveDM($dmId: uuid!, $userId: uuid!) {
    update_nchat_direct_messages_by_pk(
      pk_columns: { id: $dmId }
      _set: { status: "archived", archived_at: "now()", archived_by: $userId }
    ) {
      id
      status
      archivedAt: archived_at
      archivedBy: archived_by
    }
  }
`;

/**
 * Mark DM as read
 */
export const MARK_DM_AS_READ = gql`
  mutation MarkDMAsRead($dmId: uuid!, $userId: uuid!, $lastMessageId: uuid) {
    update_nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()", last_read_message_id: $lastMessageId }
    ) {
      affected_rows
      returning {
        id
        lastReadAt: last_read_at
        lastReadMessageId: last_read_message_id
      }
    }
  }
`;

/**
 * Update notification settings for a DM
 */
export const UPDATE_DM_NOTIFICATIONS = gql`
  mutation UpdateDMNotifications(
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
        notificationSetting: notification_setting
        isMuted: is_muted
        mutedUntil: muted_until
      }
    }
  }
`;

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to DM updates
 */
export const DM_SUBSCRIPTION = gql`
  subscription DMSubscription($dmId: uuid!) {
    nchat_direct_messages_by_pk(id: $dmId) {
      ...DirectMessage
    }
  }
  ${DM_FRAGMENT}
`;

/**
 * Subscribe to user's DMs
 */
export const USER_DMS_SUBSCRIPTION = gql`
  subscription UserDMsSubscription($userId: uuid!) {
    nchat_dm_participants(
      where: { user_id: { _eq: $userId }, dm: { status: { _neq: "deleted" } } }
      order_by: { dm: { last_message_at: desc_nulls_last } }
    ) {
      dm {
        ...DirectMessage
      }
      lastReadAt: last_read_at
      notificationSetting: notification_setting
      isMuted: is_muted
    }
  }
  ${DM_FRAGMENT}
`;
