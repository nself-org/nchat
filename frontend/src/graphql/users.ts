import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  USER_PROFILE_FRAGMENT,
  USER_PRESENCE_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UserStatus = "online" | "away" | "busy" | "offline" | "invisible";

export interface GetUserVariables {
  id?: string;
  username?: string;
  email?: string;
}

export interface GetUsersVariables {
  limit?: number;
  offset?: number;
  search?: string;
  roleId?: string;
}

export interface UpdateProfileVariables {
  id: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
}

export interface UpdateStatusVariables {
  userId: string;
  status?: string;
  statusEmoji?: string;
  statusExpiresAt?: string;
}

export interface UpdatePresenceVariables {
  userId: string;
  status: UserStatus;
  device?: string;
}

export interface UserSubscriptionVariables {
  userId: string;
}

export interface UsersSubscriptionVariables {
  userIds: string[];
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single user by ID, username, or email
 */
export const GET_USER = gql`
  query GetUser($id: uuid, $username: String, $email: String) {
    nchat_users(
      where: {
        _or: [
          { id: { _eq: $id } }
          { username: { _eq: $username } }
          { email: { _eq: $email } }
        ]
      }
      limit: 1
    ) {
      ...UserProfile
      role {
        id
        name
        permissions
      }
      presence {
        status
        last_seen_at
        device
      }
      channels_aggregate {
        aggregate {
          count
        }
      }
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Get user profile with detailed information
 */
export const GET_USER_PROFILE = gql`
  query GetUserProfile($id: uuid!) {
    nchat_users_by_pk(id: $id) {
      ...UserProfile
      role {
        id
        name
        permissions
      }
      presence {
        status
        last_seen_at
        device
      }
      # User's channels
      channel_memberships(limit: 10) {
        channel {
          id
          name
          slug
          type
        }
        role
      }
      # Recent activity
      messages_aggregate {
        aggregate {
          count
        }
      }
      # Shared channels with current user (computed via Hasura)
      settings
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Get all users (workspace members) with pagination and search
 */
export const GET_USERS = gql`
  query GetUsers(
    $limit: Int = 50
    $offset: Int = 0
    $search: String
    $roleId: uuid
  ) {
    nchat_users(
      where: {
        _and: [
          {
            _or: [
              { username: { _ilike: $search } }
              { display_name: { _ilike: $search } }
              { email: { _ilike: $search } }
            ]
          }
          { role_id: { _eq: $roleId } }
          { is_active: { _eq: true } }
        ]
      }
      order_by: { display_name: asc }
      limit: $limit
      offset: $offset
    ) {
      ...UserProfile
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
              { username: { _ilike: $search } }
              { display_name: { _ilike: $search } }
              { email: { _ilike: $search } }
            ]
          }
          { role_id: { _eq: $roleId } }
          { is_active: { _eq: true } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Get online users
 */
export const GET_ONLINE_USERS = gql`
  query GetOnlineUsers {
    nchat_user_presence(
      where: { status: { _in: ["online", "away", "busy"] } }
      order_by: { last_seen_at: desc }
    ) {
      ...UserPresence
    }
  }
  ${USER_PRESENCE_FRAGMENT}
`;

/**
 * Get user presence/status
 */
export const GET_USER_PRESENCE = gql`
  query GetUserPresence($userId: uuid!) {
    nchat_user_presence(where: { user_id: { _eq: $userId } }, limit: 1) {
      ...UserPresence
    }
  }
  ${USER_PRESENCE_FRAGMENT}
`;

/**
 * Get presence for multiple users
 */
export const GET_USERS_PRESENCE = gql`
  query GetUsersPresence($userIds: [uuid!]!) {
    nchat_user_presence(where: { user_id: { _in: $userIds } }) {
      user_id
      status
      last_seen_at
      device
    }
  }
`;

/**
 * Get users by role
 */
export const GET_USERS_BY_ROLE = gql`
  query GetUsersByRole($roleName: String!) {
    nchat_users(
      where: { role: { name: { _eq: $roleName } }, is_active: { _eq: true } }
      order_by: { display_name: asc }
    ) {
      ...UserBasic
      role {
        name
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get current user with all details
 */
export const GET_CURRENT_USER = gql`
  query GetCurrentUser($id: uuid!) {
    nchat_users_by_pk(id: $id) {
      ...UserProfile
      role {
        id
        name
        permissions
      }
      presence {
        status
        last_seen_at
      }
      settings
      notification_preferences
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Search users for mentions
 */
export const SEARCH_USERS_FOR_MENTION = gql`
  query SearchUsersForMention(
    $search: String!
    $channelId: uuid
    $limit: Int = 10
  ) {
    nchat_users(
      where: {
        _and: [
          {
            _or: [
              { username: { _ilike: $search } }
              { display_name: { _ilike: $search } }
            ]
          }
          { is_active: { _eq: true } }
          # Optionally filter by channel membership
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
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update user profile
 */
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $id: uuid!
    $displayName: String
    $bio: String
    $avatarUrl: String
    $timezone: String
    $locale: String
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $id }
      _set: {
        display_name: $displayName
        bio: $bio
        avatar_url: $avatarUrl
        timezone: $timezone
        locale: $locale
        updated_at: "now()"
      }
    ) {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Update user status (custom status message)
 */
export const UPDATE_STATUS = gql`
  mutation UpdateStatus(
    $userId: uuid!
    $status: String
    $statusEmoji: String
    $statusExpiresAt: timestamptz
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        status: $status
        status_emoji: $statusEmoji
        status_expires_at: $statusExpiresAt
        updated_at: "now()"
      }
    ) {
      id
      status
      status_emoji
      status_expires_at
    }
  }
`;

/**
 * Clear user status
 */
export const CLEAR_STATUS = gql`
  mutation ClearStatus($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { status: null, status_emoji: null, status_expires_at: null }
    ) {
      id
      status
      status_emoji
    }
  }
`;

/**
 * Update user presence (online/away/busy/offline)
 */
export const UPDATE_PRESENCE = gql`
  mutation UpdatePresence($userId: uuid!, $status: String!, $device: String) {
    insert_nchat_user_presence_one(
      object: {
        user_id: $userId
        status: $status
        device: $device
        last_seen_at: "now()"
      }
      on_conflict: {
        constraint: nchat_user_presence_user_id_key
        update_columns: [status, device, last_seen_at]
      }
    ) {
      id
      status
      last_seen_at
      device
    }
  }
`;

/**
 * Set user as offline
 */
export const SET_OFFLINE = gql`
  mutation SetOffline($userId: uuid!) {
    update_nchat_user_presence(
      where: { user_id: { _eq: $userId } }
      _set: { status: "offline", last_seen_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        status
        last_seen_at
      }
    }
  }
`;

/**
 * Update user settings (JSON field)
 */
export const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _append: { settings: $settings }
    ) {
      id
      settings
    }
  }
`;

/**
 * Update notification preferences
 */
export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($userId: uuid!, $preferences: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { notification_preferences: $preferences }
    ) {
      id
      notification_preferences
    }
  }
`;

/**
 * Update user avatar
 */
export const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($userId: uuid!, $avatarUrl: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: $avatarUrl, updated_at: "now()" }
    ) {
      id
      avatar_url
    }
  }
`;

/**
 * Delete user avatar
 */
export const DELETE_AVATAR = gql`
  mutation DeleteAvatar($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: null, updated_at: "now()" }
    ) {
      id
      avatar_url
    }
  }
`;

/**
 * Deactivate user account
 */
export const DEACTIVATE_USER = gql`
  mutation DeactivateUser($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_active: false, deactivated_at: "now()" }
    ) {
      id
      is_active
      deactivated_at
    }
    # Also set offline
    update_nchat_user_presence(
      where: { user_id: { _eq: $userId } }
      _set: { status: "offline" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Reactivate user account
 */
export const REACTIVATE_USER = gql`
  mutation ReactivateUser($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_active: true, deactivated_at: null }
    ) {
      id
      is_active
    }
  }
`;

/**
 * Update user role (admin only)
 */
export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($userId: uuid!, $roleId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { role_id: $roleId }
    ) {
      id
      role {
        id
        name
        permissions
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to user presence changes
 */
export const PRESENCE_SUBSCRIPTION = gql`
  subscription PresenceSubscription($userId: uuid!) {
    nchat_user_presence(where: { user_id: { _eq: $userId } }) {
      ...UserPresence
    }
  }
  ${USER_PRESENCE_FRAGMENT}
`;

/**
 * Subscribe to all online users presence
 */
export const ALL_PRESENCE_SUBSCRIPTION = gql`
  subscription AllPresenceSubscription {
    nchat_user_presence(where: { status: { _neq: "offline" } }) {
      user_id
      status
      last_seen_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to specific users' presence (for channel members)
 */
export const USERS_PRESENCE_SUBSCRIPTION = gql`
  subscription UsersPresenceSubscription($userIds: [uuid!]!) {
    nchat_user_presence(where: { user_id: { _in: $userIds } }) {
      user_id
      status
      last_seen_at
      device
    }
  }
`;

/**
 * Subscribe to user status changes (custom status)
 */
export const USER_STATUS_SUBSCRIPTION = gql`
  subscription UserStatusSubscription($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      status
      status_emoji
      status_expires_at
    }
  }
`;

/**
 * Subscribe to user profile updates
 */
export const USER_PROFILE_SUBSCRIPTION = gql`
  subscription UserProfileSubscription($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

/**
 * Subscribe to presence stream (new presence events)
 */
export const PRESENCE_STREAM_SUBSCRIPTION = gql`
  subscription PresenceStreamSubscription {
    nchat_user_presence_stream(
      cursor: { initial_value: { last_seen_at: "now()" } }
      batch_size: 20
    ) {
      user_id
      status
      last_seen_at
      device
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
