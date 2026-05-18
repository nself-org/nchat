/**
 * User Settings GraphQL Mutations
 *
 * Complete mutations for profile, account, notifications, and privacy settings.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Profile Settings Mutations
// ============================================================================

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile(
    $userId: uuid!
    $displayName: String
    $bio: String
    $timezone: String
    $language: String
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        display_name: $displayName
        bio: $bio
        timezone: $timezone
        language: $language
        updated_at: "now()"
      }
    ) {
      id
      display_name
      bio
      timezone
      language
      updated_at
    }
  }
`;

export const UPDATE_USER_AVATAR = gql`
  mutation UpdateUserAvatar($userId: uuid!, $avatarUrl: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: $avatarUrl, updated_at: "now()" }
    ) {
      id
      avatar_url
      updated_at
    }
  }
`;

export const REMOVE_USER_AVATAR = gql`
  mutation RemoveUserAvatar($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { avatar_url: null, updated_at: "now()" }
    ) {
      id
      avatar_url
      updated_at
    }
  }
`;

// ============================================================================
// Account Settings Mutations
// ============================================================================

export const UPDATE_USER_EMAIL = gql`
  mutation UpdateUserEmail($userId: uuid!, $email: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { email: $email, email_verified: false, updated_at: "now()" }
    ) {
      id
      email
      email_verified
      updated_at
    }
  }
`;

export const UPDATE_USER_PASSWORD = gql`
  mutation UpdateUserPassword(
    $userId: uuid!
    $currentPassword: String!
    $newPassword: String!
  ) {
    updatePassword(
      userId: $userId
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      success
      message
    }
  }
`;

export const CONNECT_OAUTH_ACCOUNT = gql`
  mutation ConnectOAuthAccount(
    $userId: uuid!
    $provider: String!
    $providerAccountId: String!
    $email: String!
  ) {
    insert_nchat_oauth_connections_one(
      object: {
        user_id: $userId
        provider: $provider
        provider_account_id: $providerAccountId
        email: $email
        connected_at: "now()"
      }
      on_conflict: {
        constraint: oauth_connections_user_id_provider_key
        update_columns: [provider_account_id, email, connected_at]
      }
    ) {
      id
      provider
      email
      connected_at
    }
  }
`;

export const DISCONNECT_OAUTH_ACCOUNT = gql`
  mutation DisconnectOAuthAccount($userId: uuid!, $accountId: uuid!) {
    delete_nchat_oauth_connections_by_pk(id: $accountId) {
      id
      provider
    }
  }
`;

export const ENABLE_TWO_FACTOR_AUTH = gql`
  mutation EnableTwoFactorAuth(
    $userId: uuid!
    $secret: String!
    $backupCodes: jsonb!
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        two_factor_enabled: true
        two_factor_secret: $secret
        two_factor_backup_codes: $backupCodes
        updated_at: "now()"
      }
    ) {
      id
      two_factor_enabled
      updated_at
    }
  }
`;

export const DISABLE_TWO_FACTOR_AUTH = gql`
  mutation DisableTwoFactorAuth($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        two_factor_enabled: false
        two_factor_secret: null
        two_factor_backup_codes: null
        updated_at: "now()"
      }
    ) {
      id
      two_factor_enabled
      updated_at
    }
  }
`;

export const DELETE_USER_ACCOUNT = gql`
  mutation DeleteUserAccount($userId: uuid!) {
    delete_nchat_users_by_pk(id: $userId) {
      id
      email
    }
  }
`;

// ============================================================================
// Notification Settings Mutations
// ============================================================================

export const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { notification_preferences: $settings, updated_at: "now()" }
    ) {
      id
      notification_preferences
      updated_at
    }
  }
`;

// ============================================================================
// Privacy Settings Mutations
// ============================================================================

export const UPDATE_PRIVACY_SETTINGS = gql`
  mutation UpdatePrivacySettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { privacy_settings: $settings, updated_at: "now()" }
    ) {
      id
      privacy_settings
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
// TypeScript Interfaces
// ============================================================================

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface NotificationSettings {
  desktopEnabled: boolean;
  desktopSound: boolean;
  desktopPreview: boolean;
  emailEnabled: boolean;
  emailFrequency: "instant" | "daily" | "weekly" | "never";
  emailDigest: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  dndWeekends: boolean;
  directMessages: boolean;
  mentions: boolean;
  channelMessages: boolean;
  threadReplies: boolean;
  reactions: boolean;
}

export interface LocationPrivacySettings {
  locationVisibility: "everyone" | "contacts" | "nobody";
  useApproximateLocation: boolean;
  defaultSharingDuration: number;
  showNearbyPlaces: boolean;
  saveLocationHistory: boolean;
  locationHistoryRetentionDays: number;
}
