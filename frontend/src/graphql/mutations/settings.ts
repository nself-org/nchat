/**
 * Settings GraphQL Mutations
 *
 * Mutations for updating user settings, preferences, and privacy options.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Profile Settings
// ============================================================================

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($userId: uuid!, $input: nchat_users_set_input!) {
    update_nchat_users_by_pk(pk_columns: { id: $userId }, _set: $input) {
      id
      display_name
      bio
      status
      timezone
      language
      updated_at
    }
  }
`;

export const UPLOAD_AVATAR = gql`
  mutation UploadAvatar($userId: uuid!, $avatarUrl: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: $avatarUrl }
    ) {
      id
      avatar_url
      updated_at
    }
  }
`;

export const REMOVE_AVATAR = gql`
  mutation RemoveAvatar($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: null }
    ) {
      id
      avatar_url
      updated_at
    }
  }
`;

// ============================================================================
// Account Settings
// ============================================================================

export const UPDATE_EMAIL = gql`
  mutation UpdateEmail($userId: uuid!, $newEmail: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { email: $newEmail, email_verified: false }
    ) {
      id
      email
      email_verified
      updated_at
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword(
    $userId: uuid!
    $oldPassword: String!
    $newPassword: String!
  ) {
    changePassword(
      userId: $userId
      oldPassword: $oldPassword
      newPassword: $newPassword
    ) {
      success
      message
    }
  }
`;

export const ENABLE_2FA = gql`
  mutation Enable2FA($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { two_factor_enabled: true }
    ) {
      id
      two_factor_enabled
      updated_at
    }
  }
`;

export const DISABLE_2FA = gql`
  mutation Disable2FA($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { two_factor_enabled: false }
    ) {
      id
      two_factor_enabled
      updated_at
    }
  }
`;

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($userId: uuid!) {
    delete_nchat_users_by_pk(id: $userId) {
      id
    }
  }
`;

// ============================================================================
// Notification Settings
// ============================================================================

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($userId: uuid!, $preferences: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { notification_preferences: $preferences }
    ) {
      id
      notification_preferences
      updated_at
    }
  }
`;

export const UPDATE_PUSH_SUBSCRIPTION = gql`
  mutation UpdatePushSubscription(
    $userId: uuid!
    $endpoint: String!
    $keys: jsonb!
  ) {
    insert_nchat_push_subscriptions_one(
      object: {
        user_id: $userId
        endpoint: $endpoint
        keys: $keys
        enabled: true
      }
      on_conflict: {
        constraint: push_subscriptions_user_id_endpoint_key
        update_columns: [keys, enabled, updated_at]
      }
    ) {
      id
      endpoint
      enabled
    }
  }
`;

export const DISABLE_PUSH_SUBSCRIPTION = gql`
  mutation DisablePushSubscription($userId: uuid!, $endpoint: String!) {
    update_nchat_push_subscriptions(
      where: { user_id: { _eq: $userId }, endpoint: { _eq: $endpoint } }
      _set: { enabled: false }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Privacy Settings
// ============================================================================

export const UPDATE_PRIVACY_SETTINGS = gql`
  mutation UpdatePrivacySettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { privacy_settings: $settings }
    ) {
      id
      privacy_settings
      updated_at
    }
  }
`;

export const UPDATE_BLOCKED_USERS = gql`
  mutation UpdateBlockedUsers($userId: uuid!, $blockedUserIds: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { blocked_users: $blockedUserIds }
    ) {
      id
      blocked_users
      updated_at
    }
  }
`;

export const CLEAR_LOCATION_HISTORY = gql`
  mutation ClearLocationHistory($userId: uuid!) {
    delete_nchat_user_locations(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// Appearance Settings
// ============================================================================

export const UPDATE_THEME_PREFERENCES = gql`
  mutation UpdateThemePreferences($userId: uuid!, $theme: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { theme_preferences: $theme }
    ) {
      id
      theme_preferences
      updated_at
    }
  }
`;

// ============================================================================
// Accessibility Settings
// ============================================================================

export const UPDATE_ACCESSIBILITY_SETTINGS = gql`
  mutation UpdateAccessibilitySettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { accessibility_settings: $settings }
    ) {
      id
      accessibility_settings
      updated_at
    }
  }
`;

// ============================================================================
// OAuth Connections
// ============================================================================

export const CONNECT_OAUTH_PROVIDER = gql`
  mutation ConnectOAuthProvider(
    $userId: uuid!
    $provider: String!
    $providerId: String!
    $accessToken: String!
  ) {
    insert_nchat_oauth_connections_one(
      object: {
        user_id: $userId
        provider: $provider
        provider_id: $providerId
        access_token: $accessToken
        connected_at: "now()"
      }
      on_conflict: {
        constraint: oauth_connections_user_id_provider_key
        update_columns: [access_token, connected_at]
      }
    ) {
      id
      provider
      connected_at
    }
  }
`;

export const DISCONNECT_OAUTH_PROVIDER = gql`
  mutation DisconnectOAuthProvider($userId: uuid!, $provider: String!) {
    delete_nchat_oauth_connections(
      where: { user_id: { _eq: $userId }, provider: { _eq: $provider } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface UpdateProfileInput {
  display_name?: string;
  bio?: string;
  status?: string;
  timezone?: string;
  language?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  mobile: boolean;
  sound: boolean;
  mentions: boolean;
  replies: boolean;
  reactions: boolean;
  direct_messages: boolean;
  channel_messages: boolean;
}

export interface PrivacySettings {
  profile_visibility: "public" | "members" | "private";
  last_seen_visibility: "everyone" | "contacts" | "nobody";
  read_receipts: boolean;
  typing_indicators: boolean;
  location_sharing: boolean;
  activity_status: boolean;
}

export interface ThemePreferences {
  mode: "light" | "dark" | "system";
  primary_color: string;
  font_size: "small" | "medium" | "large";
  compact_mode: boolean;
}

export interface AccessibilitySettings {
  high_contrast: boolean;
  reduce_motion: boolean;
  screen_reader_optimized: boolean;
  keyboard_shortcuts: boolean;
  font_size_override: number;
}
