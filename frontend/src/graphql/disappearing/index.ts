/**
 * Disappearing Messages - GraphQL Operations
 *
 * TypeScript GraphQL queries and mutations for disappearing messages.
 */

import { gql } from "@apollo/client";

// =============================================================================
// FRAGMENTS
// =============================================================================

export const DISAPPEARING_SETTINGS_FRAGMENT = gql`
  fragment DisappearingSettings on nchat_disappearing_settings {
    channel_id
    enabled
    default_duration
    can_modify
    show_banner
    is_secret_chat
    is_encrypted
    screenshot_warning
    prevent_forwarding
    prevent_copying
    hide_notification_content
    updated_at
    updated_by
  }
`;

export const DISAPPEARING_MESSAGE_FRAGMENT = gql`
  fragment DisappearingMessage on nchat_messages {
    id
    channel_id
    user_id
    disappearing_type
    disappearing_duration
    disappearing_burn_timer
    disappearing_expires_at
    disappearing_viewed
    disappearing_viewed_at
    disappearing_viewed_by
    disappearing_is_reading
    disappearing_reading_started_at
    created_at
  }
`;

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get disappearing settings for a channel.
 */
export const GET_DISAPPEARING_SETTINGS = gql`
  query GetDisappearingSettings($channelId: uuid!) {
    nchat_disappearing_settings_by_pk(channel_id: $channelId) {
      ...DisappearingSettings
    }
  }
  ${DISAPPEARING_SETTINGS_FRAGMENT}
`;

/**
 * Get disappearing settings for multiple channels.
 */
export const GET_DISAPPEARING_SETTINGS_BULK = gql`
  query GetDisappearingSettingsBulk($channelIds: [uuid!]!) {
    nchat_disappearing_settings(where: { channel_id: { _in: $channelIds } }) {
      channel_id
      enabled
      default_duration
      can_modify
      show_banner
      updated_at
    }
  }
`;

/**
 * Get messages with active disappearing timers.
 */
export const GET_DISAPPEARING_MESSAGES = gql`
  query GetDisappearingMessages($channelId: uuid!, $limit: Int = 100) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        disappearing_type: { _is_null: false }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...DisappearingMessage
    }
  }
  ${DISAPPEARING_MESSAGE_FRAGMENT}
`;

/**
 * Get a single message's disappearing data (including content for viewing).
 */
export const GET_MESSAGE_DISAPPEARING_DATA = gql`
  query GetMessageDisappearingData($messageId: uuid!) {
    nchat_messages_by_pk(id: $messageId) {
      id
      channel_id
      user_id
      content
      disappearing_type
      disappearing_duration
      disappearing_burn_timer
      disappearing_expires_at
      disappearing_viewed
      disappearing_viewed_at
      disappearing_viewed_by
      disappearing_is_reading
      disappearing_reading_started_at
      created_at
      attachments {
        id
        url
        type
        name
      }
    }
  }
`;

/**
 * Get view-once messages pending viewing.
 */
export const GET_PENDING_VIEW_ONCE = gql`
  query GetPendingViewOnceMessages($channelId: uuid!, $userId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        disappearing_type: { _eq: "view_once" }
        disappearing_viewed: { _eq: false }
        user_id: { _neq: $userId }
      }
      order_by: { created_at: desc }
    ) {
      id
      channel_id
      user_id
      created_at
      attachments {
        id
        type
        name
        thumbnail_url
      }
    }
  }
`;

/**
 * Get messages expiring soon.
 */
export const GET_EXPIRING_MESSAGES = gql`
  query GetExpiringMessages($channelId: uuid!, $expiresWithin: timestamptz!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: false }
        disappearing_expires_at: { _lte: $expiresWithin, _gt: "now()" }
      }
      order_by: { disappearing_expires_at: asc }
    ) {
      id
      channel_id
      disappearing_expires_at
      disappearing_type
    }
  }
`;

/**
 * Get user's disappearing preferences.
 */
export const GET_DISAPPEARING_PREFERENCES = gql`
  query GetDisappearingPreferences($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      disappearing_dm_default
      disappearing_group_default
      disappearing_show_indicators
      disappearing_show_countdown
      disappearing_warning_seconds
      disappearing_sound_before_expiry
    }
  }
`;

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Enable disappearing messages for a channel.
 */
export const ENABLE_DISAPPEARING = gql`
  mutation EnableDisappearingMessages(
    $channelId: uuid!
    $duration: Int!
    $userId: uuid!
  ) {
    insert_nchat_disappearing_settings_one(
      object: {
        channel_id: $channelId
        enabled: true
        default_duration: $duration
        updated_by: $userId
      }
      on_conflict: {
        constraint: disappearing_settings_pkey
        update_columns: [enabled, default_duration, updated_at, updated_by]
      }
    ) {
      ...DisappearingSettings
    }
  }
  ${DISAPPEARING_SETTINGS_FRAGMENT}
`;

/**
 * Disable disappearing messages for a channel.
 */
export const DISABLE_DISAPPEARING = gql`
  mutation DisableDisappearingMessages($channelId: uuid!, $userId: uuid!) {
    update_nchat_disappearing_settings_by_pk(
      pk_columns: { channel_id: $channelId }
      _set: { enabled: false, updated_by: $userId }
    ) {
      channel_id
      enabled
      updated_at
    }
  }
`;

/**
 * Update disappearing settings.
 */
export const UPDATE_DISAPPEARING_SETTINGS = gql`
  mutation UpdateDisappearingSettings(
    $channelId: uuid!
    $settings: nchat_disappearing_settings_set_input!
  ) {
    update_nchat_disappearing_settings_by_pk(
      pk_columns: { channel_id: $channelId }
      _set: $settings
    ) {
      ...DisappearingSettings
    }
  }
  ${DISAPPEARING_SETTINGS_FRAGMENT}
`;

/**
 * Create secret chat settings.
 */
export const CREATE_SECRET_CHAT = gql`
  mutation CreateSecretChat(
    $channelId: uuid!
    $userId: uuid!
    $duration: Int!
  ) {
    insert_nchat_disappearing_settings_one(
      object: {
        channel_id: $channelId
        enabled: true
        default_duration: $duration
        is_secret_chat: true
        is_encrypted: true
        screenshot_warning: true
        prevent_forwarding: true
        prevent_copying: true
        hide_notification_content: true
        updated_by: $userId
      }
      on_conflict: {
        constraint: disappearing_settings_pkey
        update_columns: [
          enabled
          default_duration
          is_secret_chat
          is_encrypted
          screenshot_warning
          prevent_forwarding
          prevent_copying
          hide_notification_content
          updated_at
          updated_by
        ]
      }
    ) {
      channel_id
      enabled
      default_duration
      is_secret_chat
      updated_at
    }
  }
`;

/**
 * Send a disappearing message.
 */
export const SEND_DISAPPEARING_MESSAGE = gql`
  mutation SendDisappearingMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $type: String = "text"
    $disappearingType: String!
    $disappearingDuration: Int
    $disappearingBurnTimer: Int
    $expiresAt: timestamptz
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        type: $type
        disappearing_type: $disappearingType
        disappearing_duration: $disappearingDuration
        disappearing_burn_timer: $disappearingBurnTimer
        disappearing_expires_at: $expiresAt
        disappearing_viewed: false
      }
    ) {
      id
      channel_id
      user_id
      content
      type
      disappearing_type
      disappearing_duration
      disappearing_burn_timer
      disappearing_expires_at
      created_at
    }
  }
`;

/**
 * Mark view-once message as viewed.
 */
export const MARK_VIEW_ONCE_VIEWED = gql`
  mutation MarkViewOnceViewed($messageId: uuid!, $viewerId: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: {
        disappearing_viewed: true
        disappearing_viewed_at: "now()"
        disappearing_viewed_by: $viewerId
      }
    ) {
      id
      disappearing_viewed
      disappearing_viewed_at
      disappearing_viewed_by
      content
      attachments {
        id
        url
        type
        name
      }
    }
  }
`;

/**
 * Start burn-after-reading timer.
 */
export const START_BURN_TIMER = gql`
  mutation StartBurnTimer($messageId: uuid!, $expiresAt: timestamptz!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: {
        disappearing_is_reading: true
        disappearing_reading_started_at: "now()"
        disappearing_expires_at: $expiresAt
      }
    ) {
      id
      disappearing_is_reading
      disappearing_reading_started_at
      disappearing_expires_at
    }
  }
`;

/**
 * Delete expired message.
 */
export const DELETE_EXPIRED_MESSAGE = gql`
  mutation DeleteExpiredMessage($messageId: uuid!) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: { is_deleted: true, deleted_at: "now()", content: "" }
    ) {
      id
      is_deleted
      deleted_at
    }
  }
`;

/**
 * Bulk delete expired messages.
 */
export const BULK_DELETE_EXPIRED = gql`
  mutation BulkDeleteExpiredMessages($messageIds: [uuid!]!) {
    update_nchat_messages(
      where: { id: { _in: $messageIds } }
      _set: { is_deleted: true, deleted_at: "now()", content: "" }
    ) {
      affected_rows
      returning {
        id
        channel_id
      }
    }
  }
`;

/**
 * Update user disappearing preferences.
 */
export const UPDATE_DISAPPEARING_PREFERENCES = gql`
  mutation UpdateDisappearingPreferences(
    $userId: uuid!
    $dmDefault: Int
    $groupDefault: Int
    $showIndicators: Boolean
    $showCountdown: Boolean
    $warningSeconds: Int
    $soundBeforeExpiry: Boolean
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        disappearing_dm_default: $dmDefault
        disappearing_group_default: $groupDefault
        disappearing_show_indicators: $showIndicators
        disappearing_show_countdown: $showCountdown
        disappearing_warning_seconds: $warningSeconds
        disappearing_sound_before_expiry: $soundBeforeExpiry
      }
    ) {
      id
      disappearing_dm_default
      disappearing_group_default
      disappearing_show_indicators
      disappearing_show_countdown
      disappearing_warning_seconds
      disappearing_sound_before_expiry
    }
  }
`;

/**
 * Log screenshot detection.
 */
export const LOG_SCREENSHOT = gql`
  mutation LogScreenshotDetection(
    $channelId: uuid!
    $userId: uuid!
    $messageId: uuid
  ) {
    insert_nchat_screenshot_logs_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        message_id: $messageId
        detected_at: "now()"
      }
    ) {
      id
      channel_id
      user_id
      detected_at
    }
  }
`;

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe to disappearing settings changes.
 */
export const DISAPPEARING_SETTINGS_SUBSCRIPTION = gql`
  subscription DisappearingSettingsSubscription($channelId: uuid!) {
    nchat_disappearing_settings_by_pk(channel_id: $channelId) {
      ...DisappearingSettings
    }
  }
  ${DISAPPEARING_SETTINGS_FRAGMENT}
`;

/**
 * Subscribe to message expirations in a channel.
 */
export const MESSAGE_EXPIRATION_SUBSCRIPTION = gql`
  subscription MessageExpirationSubscription($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        is_deleted: { _eq: true }
        disappearing_type: { _is_null: false }
      }
      order_by: { deleted_at: desc }
      limit: 1
    ) {
      id
      channel_id
      disappearing_type
      deleted_at
    }
  }
`;

/**
 * Subscribe to view-once message views.
 */
export const VIEW_ONCE_VIEWED_SUBSCRIPTION = gql`
  subscription ViewOnceViewedSubscription($channelId: uuid!) {
    nchat_messages(
      where: {
        channel_id: { _eq: $channelId }
        disappearing_type: { _eq: "view_once" }
        disappearing_viewed: { _eq: true }
      }
      order_by: { disappearing_viewed_at: desc }
      limit: 1
    ) {
      id
      channel_id
      disappearing_viewed
      disappearing_viewed_at
      disappearing_viewed_by
    }
  }
`;

// =============================================================================
// TYPES
// =============================================================================

export interface DisappearingSettingsData {
  channel_id: string;
  enabled: boolean;
  default_duration: number;
  can_modify: "owner" | "admin" | "all";
  show_banner: boolean;
  is_secret_chat?: boolean;
  is_encrypted?: boolean;
  screenshot_warning?: boolean;
  prevent_forwarding?: boolean;
  prevent_copying?: boolean;
  hide_notification_content?: boolean;
  updated_at: string;
  updated_by?: string;
}

export interface DisappearingMessageData {
  id: string;
  channel_id: string;
  user_id: string;
  disappearing_type: "regular" | "view_once" | "burn_after_reading";
  disappearing_duration?: number;
  disappearing_burn_timer?: number;
  disappearing_expires_at?: string;
  disappearing_viewed?: boolean;
  disappearing_viewed_at?: string;
  disappearing_viewed_by?: string;
  disappearing_is_reading?: boolean;
  disappearing_reading_started_at?: string;
  created_at: string;
}

export interface UserDisappearingPreferences {
  id: string;
  disappearing_dm_default: number;
  disappearing_group_default: number;
  disappearing_show_indicators: boolean;
  disappearing_show_countdown: boolean;
  disappearing_warning_seconds: number;
  disappearing_sound_before_expiry: boolean;
}
