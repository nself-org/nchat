/**
 * Presence Settings GraphQL Operations
 *
 * GraphQL queries, mutations, and subscriptions for managing user presence
 * privacy settings including visibility controls, last seen, and read receipts.
 *
 * @module graphql/presence-settings
 * @version 1.0.0
 */

import { gql } from "@apollo/client";

// ============================================================================
// Fragments
// ============================================================================

/**
 * Fragment for presence settings fields
 */
export const PRESENCE_SETTINGS_FRAGMENT = gql`
  fragment PresenceSettingsFields on nchat_presence_settings {
    id
    userId: user_id
    visibility
    showLastSeen: show_last_seen
    showOnlineStatus: show_online_status
    allowReadReceipts: allow_read_receipts
    invisibleMode: invisible_mode
    createdAt: created_at
    updatedAt: updated_at
  }
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get user's presence privacy settings
 */
export const GET_PRESENCE_SETTINGS = gql`
  query GetPresenceSettings($userId: uuid!) {
    nchat_presence_settings_by_pk(user_id: $userId) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

/**
 * Get presence settings for multiple users
 */
export const GET_PRESENCE_SETTINGS_BULK = gql`
  query GetPresenceSettingsBulk($userIds: [uuid!]!) {
    nchat_presence_settings(where: { user_id: { _in: $userIds } }) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

/**
 * Check if user A can see user B's presence
 * This query checks:
 * 1. Target user's visibility settings
 * 2. Contact/DM relationship between users
 * 3. Invisible mode status
 */
export const GET_PRESENCE_VISIBILITY = gql`
  query GetPresenceVisibility($viewerId: uuid!, $targetId: uuid!) {
    # Get target user's presence settings
    targetSettings: nchat_presence_settings_by_pk(user_id: $targetId) {
      visibility
      showLastSeen: show_last_seen
      showOnlineStatus: show_online_status
      invisibleMode: invisible_mode
    }

    # Check if users have a DM relationship (mutual contact indicator)
    dmRelationship: nchat_direct_messages(
      where: {
        type: { _eq: "direct" }
        status: { _eq: "active" }
        _and: [
          { participants: { user_id: { _eq: $viewerId } } }
          { participants: { user_id: { _eq: $targetId } } }
        ]
      }
      limit: 1
    ) {
      id
    }

    # Check for explicit contact relationship
    contactRelationship: nchat_contacts(
      where: {
        user_id: { _eq: $viewerId }
        contact_user_id: { _eq: $targetId }
      }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Get visible presence for multiple users with privacy filtering
 * Returns presence data only for users whose settings allow the viewer to see it
 */
export const GET_VISIBLE_PRESENCE = gql`
  query GetVisiblePresence($viewerId: uuid!, $targetIds: [uuid!]!) {
    # Get all target users' presence data
    presences: nchat_presence(where: { user_id: { _in: $targetIds } }) {
      userId: user_id
      status
      customStatus: custom_status
      customStatusEmoji: custom_status_emoji
      lastSeen: last_seen
    }

    # Get all target users' presence settings
    presenceSettings: nchat_presence_settings(
      where: { user_id: { _in: $targetIds } }
    ) {
      userId: user_id
      visibility
      showLastSeen: show_last_seen
      showOnlineStatus: show_online_status
      invisibleMode: invisible_mode
    }

    # Get DM relationships (contacts)
    dmRelationships: nchat_direct_messages(
      where: {
        type: { _eq: "direct" }
        status: { _eq: "active" }
        participants: { user_id: { _eq: $viewerId } }
      }
    ) {
      participants(where: { user_id: { _neq: $viewerId } }) {
        userId: user_id
      }
    }

    # Get explicit contacts
    contacts: nchat_contacts(where: { user_id: { _eq: $viewerId } }) {
      contactUserId: contact_user_id
    }
  }
`;

/**
 * Get contacts for a user (users with DM history or explicit contacts)
 */
export const GET_USER_CONTACTS = gql`
  query GetUserContacts($userId: uuid!) {
    # Get users from DM conversations
    dmParticipants: nchat_dm_participants(
      where: {
        user_id: { _eq: $userId }
        dm: { type: { _eq: "direct" }, status: { _eq: "active" } }
      }
    ) {
      dm {
        participants(where: { user_id: { _neq: $userId } }) {
          userId: user_id
          user {
            id
            username
            displayName: display_name
            avatarUrl: avatar_url
          }
        }
      }
    }

    # Get explicit contacts
    contacts: nchat_contacts(where: { user_id: { _eq: $userId } }) {
      contactUserId: contact_user_id
      user: contactUser {
        id
        username
        displayName: display_name
        avatarUrl: avatar_url
      }
    }
  }
`;

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update presence privacy settings
 * Uses upsert to create settings if they don't exist
 */
export const UPDATE_PRESENCE_SETTINGS = gql`
  mutation UpdatePresenceSettings(
    $userId: uuid!
    $visibility: String
    $showLastSeen: Boolean
    $showOnlineStatus: Boolean
    $allowReadReceipts: Boolean
    $invisibleMode: Boolean
  ) {
    insert_nchat_presence_settings_one(
      object: {
        user_id: $userId
        visibility: $visibility
        show_last_seen: $showLastSeen
        show_online_status: $showOnlineStatus
        allow_read_receipts: $allowReadReceipts
        invisible_mode: $invisibleMode
      }
      on_conflict: {
        constraint: nchat_presence_settings_pkey
        update_columns: [
          visibility
          show_last_seen
          show_online_status
          allow_read_receipts
          invisible_mode
          updated_at
        ]
      }
    ) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

/**
 * Enable invisible mode (appear offline to others)
 */
export const SET_INVISIBLE_MODE = gql`
  mutation SetInvisibleMode($userId: uuid!, $enabled: Boolean!) {
    update_nchat_presence_settings_by_pk(
      pk_columns: { user_id: $userId }
      _set: { invisible_mode: $enabled, updated_at: "now()" }
    ) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

/**
 * Reset presence settings to defaults
 */
export const RESET_PRESENCE_SETTINGS = gql`
  mutation ResetPresenceSettings($userId: uuid!) {
    update_nchat_presence_settings_by_pk(
      pk_columns: { user_id: $userId }
      _set: {
        visibility: "everyone"
        show_last_seen: true
        show_online_status: true
        allow_read_receipts: true
        invisible_mode: false
        updated_at: "now()"
      }
    ) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

/**
 * Create default presence settings for new user
 */
export const CREATE_DEFAULT_PRESENCE_SETTINGS = gql`
  mutation CreateDefaultPresenceSettings($userId: uuid!) {
    insert_nchat_presence_settings_one(
      object: {
        user_id: $userId
        visibility: "everyone"
        show_last_seen: true
        show_online_status: true
        allow_read_receipts: true
        invisible_mode: false
      }
      on_conflict: {
        constraint: nchat_presence_settings_pkey
        update_columns: []
      }
    ) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to presence settings changes
 */
export const PRESENCE_SETTINGS_SUBSCRIPTION = gql`
  subscription PresenceSettingsSubscription($userId: uuid!) {
    nchat_presence_settings_by_pk(user_id: $userId) {
      ...PresenceSettingsFields
    }
  }
  ${PRESENCE_SETTINGS_FRAGMENT}
`;

// ============================================================================
// Types (for TypeScript)
// ============================================================================

/**
 * Presence visibility levels
 */
export type PresenceVisibility = "everyone" | "contacts" | "nobody";

/**
 * Presence settings interface
 */
export interface PresenceSettings {
  id?: string;
  userId: string;
  visibility: PresenceVisibility;
  showLastSeen: boolean;
  showOnlineStatus: boolean;
  allowReadReceipts: boolean;
  invisibleMode: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Presence settings input for updates
 */
export interface PresenceSettingsInput {
  visibility?: PresenceVisibility;
  showLastSeen?: boolean;
  showOnlineStatus?: boolean;
  allowReadReceipts?: boolean;
  invisibleMode?: boolean;
}

/**
 * Default presence settings
 */
export const DEFAULT_PRESENCE_SETTINGS: Omit<
  PresenceSettings,
  "userId" | "id" | "createdAt" | "updatedAt"
> = {
  visibility: "everyone",
  showLastSeen: true,
  showOnlineStatus: true,
  allowReadReceipts: true,
  invisibleMode: false,
};

/**
 * Presence visibility result from canViewPresence check
 */
export interface PresenceVisibilityResult {
  canViewPresence: boolean;
  canViewLastSeen: boolean;
  canViewOnlineStatus: boolean;
  isContact: boolean;
  isInvisible: boolean;
}
