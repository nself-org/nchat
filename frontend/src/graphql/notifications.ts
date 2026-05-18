import { gql } from "@apollo/client";
import {
  NOTIFICATION_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NotificationType =
  | "message"
  | "mention"
  | "reaction"
  | "reply"
  | "thread_reply"
  | "channel_invite"
  | "dm"
  | "system";

export interface GetNotificationsVariables {
  userId: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface GetUnreadCountVariables {
  userId: string;
}

export interface MarkAsReadVariables {
  notificationId: string;
}

export interface MarkAllAsReadVariables {
  userId: string;
  channelId?: string;
}

export interface UpdateNotificationPreferencesVariables {
  userId: string;
  preferences: {
    email?: boolean;
    push?: boolean;
    desktop?: boolean;
    mentions?: boolean;
    directMessages?: boolean;
    threads?: boolean;
    channelUpdates?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    mutedChannels?: string[];
  };
}

export interface NotificationSubscriptionVariables {
  userId: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get notifications for a user
 */
export const GET_NOTIFICATIONS = gql`
  query GetNotifications(
    $userId: uuid!
    $limit: Int = 50
    $offset: Int = 0
    $unreadOnly: Boolean = false
    $type: String
  ) {
    nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        _and: [
          {
            _or: [
              { is_read: { _eq: false } }
              { is_read: { _neq: $unreadOnly } }
            ]
          }
          { type: { _eq: $type } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Notification
    }
    nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        _and: [
          {
            _or: [
              { is_read: { _eq: false } }
              { is_read: { _neq: $unreadOnly } }
            ]
          }
          { type: { _eq: $type } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

/**
 * Get unread notification count
 */
export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: uuid!) {
    total: nchat_notifications_aggregate(
      where: { user_id: { _eq: $userId }, is_read: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
    # By type
    mentions: nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        type: { _eq: "mention" }
      }
    ) {
      aggregate {
        count
      }
    }
    dms: nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        type: { _eq: "dm" }
      }
    ) {
      aggregate {
        count
      }
    }
    threads: nchat_notifications_aggregate(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        type: { _in: ["reply", "thread_reply"] }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get unread counts by channel
 */
export const GET_UNREAD_BY_CHANNEL = gql`
  query GetUnreadByChannel($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel_id
      last_read_at
      channel {
        id
        name
        slug
        unread: messages_aggregate(
          where: {
            created_at: { _gt: "last_read_at" }
            is_deleted: { _eq: false }
          }
        ) {
          aggregate {
            count
          }
        }
        has_mention: messages(
          where: {
            created_at: { _gt: "last_read_at" }
            mentions: { user_id: { _eq: $userId } }
          }
          limit: 1
        ) {
          id
        }
      }
    }
  }
`;

/**
 * Get notification preferences
 */
export const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      notification_preferences
    }
    # Also get muted channels
    nchat_channel_members(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { notifications_enabled: { _eq: false } }
          { muted_until: { _gt: "now()" } }
        ]
      }
    ) {
      channel_id
      notifications_enabled
      muted_until
      channel {
        id
        name
      }
    }
  }
`;

/**
 * Get recent notifications grouped by type
 */
export const GET_NOTIFICATIONS_GROUPED = gql`
  query GetNotificationsGrouped($userId: uuid!, $limit: Int = 10) {
    mentions: nchat_notifications(
      where: { user_id: { _eq: $userId }, type: { _eq: "mention" } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Notification
    }

    threads: nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        type: { _in: ["reply", "thread_reply"] }
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Notification
    }

    dms: nchat_notifications(
      where: { user_id: { _eq: $userId }, type: { _eq: "dm" } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Notification
    }

    reactions: nchat_notifications(
      where: { user_id: { _eq: $userId }, type: { _eq: "reaction" } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...Notification
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark a single notification as read
 */
export const MARK_AS_READ = gql`
  mutation MarkAsRead($notificationId: uuid!) {
    update_nchat_notifications_by_pk(
      pk_columns: { id: $notificationId }
      _set: { is_read: true, read_at: "now()" }
    ) {
      id
      is_read
      read_at
    }
  }
`;

/**
 * Mark multiple notifications as read
 */
export const MARK_MULTIPLE_AS_READ = gql`
  mutation MarkMultipleAsRead($notificationIds: [uuid!]!) {
    update_nchat_notifications(
      where: { id: { _in: $notificationIds } }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Mark all notifications as read
 */
export const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead($userId: uuid!, $channelId: uuid) {
    update_nchat_notifications(
      where: {
        user_id: { _eq: $userId }
        is_read: { _eq: false }
        channel_id: { _eq: $channelId }
      }
      _set: { is_read: true, read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

// Re-export UPDATE_NOTIFICATION_PREFERENCES from users.ts
export { UPDATE_NOTIFICATION_PREFERENCES } from "./users";

/**
 * Mute a channel's notifications
 */
export const MUTE_CHANNEL_NOTIFICATIONS = gql`
  mutation MuteChannelNotifications(
    $channelId: uuid!
    $userId: uuid!
    $mutedUntil: timestamptz
  ) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { notifications_enabled: false, muted_until: $mutedUntil }
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
 * Unmute a channel's notifications
 */
export const UNMUTE_CHANNEL_NOTIFICATIONS = gql`
  mutation UnmuteChannelNotifications($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { notifications_enabled: true, muted_until: null }
    ) {
      affected_rows
      returning {
        id
        notifications_enabled
      }
    }
  }
`;

/**
 * Delete a notification
 */
export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: uuid!) {
    delete_nchat_notifications_by_pk(id: $notificationId) {
      id
    }
  }
`;

/**
 * Delete all notifications for a user
 */
export const DELETE_ALL_NOTIFICATIONS = gql`
  mutation DeleteAllNotifications($userId: uuid!) {
    delete_nchat_notifications(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

/**
 * Create a notification (typically done server-side)
 */
export const CREATE_NOTIFICATION = gql`
  mutation CreateNotification(
    $userId: uuid!
    $type: String!
    $title: String!
    $body: String!
    $actorId: uuid
    $channelId: uuid
    $messageId: uuid
    $data: jsonb
  ) {
    insert_nchat_notifications_one(
      object: {
        user_id: $userId
        type: $type
        title: $title
        body: $body
        actor_id: $actorId
        channel_id: $channelId
        message_id: $messageId
        data: $data
      }
    ) {
      ...Notification
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

/**
 * Register push notification token
 */
export const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken(
    $userId: uuid!
    $token: String!
    $platform: String!
    $deviceId: String
  ) {
    insert_nchat_push_tokens_one(
      object: {
        user_id: $userId
        token: $token
        platform: $platform
        device_id: $deviceId
      }
      on_conflict: {
        constraint: nchat_push_tokens_token_key
        update_columns: [user_id, platform, device_id, updated_at]
      }
    ) {
      id
      token
      platform
    }
  }
`;

/**
 * Unregister push notification token
 */
export const UNREGISTER_PUSH_TOKEN = gql`
  mutation UnregisterPushToken($token: String!) {
    delete_nchat_push_tokens(where: { token: { _eq: $token } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new notifications
 */
export const NOTIFICATION_SUBSCRIPTION = gql`
  subscription NotificationSubscription($userId: uuid!) {
    nchat_notifications(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...Notification
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

/**
 * Subscribe to unread count changes
 */
export const UNREAD_COUNT_SUBSCRIPTION = gql`
  subscription UnreadCountSubscription($userId: uuid!) {
    nchat_notifications_aggregate(
      where: { user_id: { _eq: $userId }, is_read: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Subscribe to notification stream
 */
export const NOTIFICATION_STREAM_SUBSCRIPTION = gql`
  subscription NotificationStreamSubscription($userId: uuid!) {
    nchat_notifications_stream(
      cursor: { initial_value: { created_at: "now()" } }
      batch_size: 10
      where: { user_id: { _eq: $userId } }
    ) {
      id
      type
      title
      body
      data
      is_read
      created_at
      actor {
        ...UserBasic
      }
      channel {
        id
        name
        slug
      }
      message {
        id
        content
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to channel unread updates
 */
export const CHANNEL_UNREAD_SUBSCRIPTION = gql`
  subscription ChannelUnreadSubscription($userId: uuid!, $channelId: uuid!) {
    nchat_channel_members(
      where: { user_id: { _eq: $userId }, channel_id: { _eq: $channelId } }
    ) {
      last_read_at
      channel {
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
`;
