import { gql } from "@apollo/client";
import {
  USER_PROFILE_FRAGMENT,
  USER_BASIC_FRAGMENT,
  CHANNEL_FULL_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportType = "spam" | "harassment" | "inappropriate" | "other";
export type ModerationAction = "warn" | "mute" | "ban" | "delete" | "dismiss";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalChannels: number;
  totalMessages: number;
  pendingReports: number;
  bannedUsers: number;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
  isActive: boolean;
  isBanned: boolean;
  bannedAt?: string;
  bannedUntil?: string;
  banReason?: string;
  createdAt: string;
  lastSeenAt?: string;
  messagesCount: number;
  channelsCount: number;
}

export interface AdminChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  isPrivate: boolean;
  isArchived: boolean;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
  };
  membersCount: number;
  messagesCount: number;
}

export interface ModerationReport {
  id: string;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
  };
  reportedUser?: {
    id: string;
    username: string;
    displayName: string;
  };
  reportedMessage?: {
    id: string;
    content: string;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
    channel: {
      id: string;
      name: string;
    };
  };
  moderator?: {
    id: string;
    username: string;
    displayName: string;
  };
  resolution?: string;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  target?: {
    type: "user" | "channel" | "message";
    id: string;
    name: string;
  };
}

// ============================================================================
// ADMIN FRAGMENTS
// ============================================================================

export const ADMIN_USER_FRAGMENT = gql`
  fragment AdminUser on nchat_users {
    id
    username
    display_name
    email
    avatar_url
    is_active
    is_banned
    banned_at
    banned_until
    ban_reason
    created_at
    role {
      id
      name
      permissions
    }
    presence {
      status
      last_seen_at
    }
    messages_aggregate {
      aggregate {
        count
      }
    }
    channel_memberships_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const ADMIN_CHANNEL_FRAGMENT = gql`
  fragment AdminChannel on nchat_channels {
    id
    name
    slug
    description
    type
    is_private
    is_archived
    created_at
    creator {
      id
      username
      display_name
    }
    members_aggregate {
      aggregate {
        count
      }
    }
    messages_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const MODERATION_REPORT_FRAGMENT = gql`
  fragment ModerationReport on nchat_reports {
    id
    type
    reason
    status
    resolution
    created_at
    resolved_at
    reporter {
      id
      username
      display_name
    }
    reported_user {
      id
      username
      display_name
    }
    reported_message {
      id
      content
      user {
        id
        username
        display_name
      }
      channel {
        id
        name
      }
    }
    moderator {
      id
      username
      display_name
    }
  }
`;

export const ACTIVITY_LOG_FRAGMENT = gql`
  fragment ActivityLog on nchat_activity_logs {
    id
    type
    description
    metadata
    created_at
    actor {
      id
      username
      display_name
      avatar_url
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get admin dashboard statistics
 */
export const GET_ADMIN_STATS = gql`
  query GetAdminStats {
    users_aggregate: nchat_users_aggregate {
      aggregate {
        count
      }
    }
    active_users_aggregate: nchat_users_aggregate(
      where: { is_active: { _eq: true } }
    ) {
      aggregate {
        count
      }
    }
    banned_users_aggregate: nchat_users_aggregate(
      where: { is_banned: { _eq: true } }
    ) {
      aggregate {
        count
      }
    }
    channels_aggregate: nchat_channels_aggregate {
      aggregate {
        count
      }
    }
    messages_aggregate: nchat_messages_aggregate {
      aggregate {
        count
      }
    }
    pending_reports_aggregate: nchat_reports_aggregate(
      where: { status: { _eq: "pending" } }
    ) {
      aggregate {
        count
      }
    }
    recent_users: nchat_users(limit: 5, order_by: { created_at: desc }) {
      ...UserBasic
      created_at
    }
    recent_messages_count: nchat_messages_aggregate(
      where: { created_at: { _gte: "now() - interval '24 hours'" } }
    ) {
      aggregate {
        count
      }
    }
    online_users_count: nchat_user_presence_aggregate(
      where: { status: { _eq: "online" } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get users for admin with pagination and search
 */
export const GET_USERS_ADMIN = gql`
  query GetUsersAdmin(
    $limit: Int = 20
    $offset: Int = 0
    $search: String
    $roleId: uuid
    $isBanned: Boolean
    $orderBy: [nchat_users_order_by!] = [{ created_at: desc }]
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
          { is_banned: { _eq: $isBanned } }
        ]
      }
      order_by: $orderBy
      limit: $limit
      offset: $offset
    ) {
      ...AdminUser
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
          { is_banned: { _eq: $isBanned } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${ADMIN_USER_FRAGMENT}
`;

/**
 * Get single user details for admin
 */
export const GET_USER_ADMIN = gql`
  query GetUserAdmin($id: uuid!) {
    nchat_users_by_pk(id: $id) {
      ...AdminUser
      bio
      timezone
      locale
      settings
      notification_preferences
      channel_memberships(limit: 20) {
        channel {
          id
          name
          slug
          type
        }
        role
        joined_at
      }
      messages(limit: 10, order_by: { created_at: desc }) {
        id
        content
        created_at
        channel {
          id
          name
        }
      }
    }
  }
  ${ADMIN_USER_FRAGMENT}
`;

/**
 * Get all channels for admin with pagination
 */
export const GET_CHANNELS_ADMIN = gql`
  query GetChannelsAdmin(
    $limit: Int = 20
    $offset: Int = 0
    $search: String
    $type: String
    $includeArchived: Boolean = false
  ) {
    nchat_channels(
      where: {
        _and: [
          { name: { _ilike: $search } }
          { type: { _eq: $type } }
          { is_archived: { _eq: $includeArchived } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AdminChannel
    }
    nchat_channels_aggregate(
      where: {
        _and: [
          { name: { _ilike: $search } }
          { type: { _eq: $type } }
          { is_archived: { _eq: $includeArchived } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${ADMIN_CHANNEL_FRAGMENT}
`;

/**
 * Get moderation queue (pending reports)
 */
export const GET_MODERATION_QUEUE = gql`
  query GetModerationQueue(
    $limit: Int = 20
    $offset: Int = 0
    $status: String = "pending"
    $type: String
  ) {
    nchat_reports(
      where: { _and: [{ status: { _eq: $status } }, { type: { _eq: $type } }] }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...ModerationReport
    }
    nchat_reports_aggregate(
      where: { _and: [{ status: { _eq: $status } }, { type: { _eq: $type } }] }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MODERATION_REPORT_FRAGMENT}
`;

/**
 * Get activity logs
 */
export const GET_ACTIVITY_LOGS = gql`
  query GetActivityLogs(
    $limit: Int = 50
    $offset: Int = 0
    $type: String
    $actorId: uuid
  ) {
    nchat_activity_logs(
      where: {
        _and: [{ type: { _eq: $type } }, { actor_id: { _eq: $actorId } }]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...ActivityLog
    }
  }
  ${ACTIVITY_LOG_FRAGMENT}
`;

/**
 * Get available roles
 */
export const GET_ROLES = gql`
  query GetRoles {
    nchat_roles(order_by: { name: asc }) {
      id
      name
      description
      permissions
      is_default
      created_at
    }
  }
`;

/**
 * Get analytics data for dashboard
 */
export const GET_ANALYTICS_DATA = gql`
  query GetAnalyticsData($startDate: timestamptz!, $endDate: timestamptz!) {
    # User signups by day
    user_signups: nchat_users(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
      order_by: { created_at: asc }
    ) {
      id
      created_at
    }

    # Messages by day
    messages: nchat_messages(
      where: { created_at: { _gte: $startDate, _lte: $endDate } }
      order_by: { created_at: asc }
    ) {
      id
      created_at
      channel_id
    }

    # Active channels
    active_channels: nchat_channels(
      where: { messages: { created_at: { _gte: $startDate } } }
    ) {
      id
      name
      messages_aggregate(
        where: { created_at: { _gte: $startDate, _lte: $endDate } }
      ) {
        aggregate {
          count
        }
      }
    }

    # User roles distribution
    role_distribution: nchat_roles {
      id
      name
      users_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Ban a user
 */
export const BAN_USER = gql`
  mutation BanUser(
    $userId: uuid!
    $reason: String!
    $duration: String
    $moderatorId: uuid!
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        is_banned: true
        banned_at: "now()"
        banned_until: $duration
        ban_reason: $reason
      }
    ) {
      id
      is_banned
      banned_at
      banned_until
      ban_reason
    }
    # Log the action
    insert_nchat_activity_logs_one(
      object: {
        type: "user_banned"
        description: "User banned"
        actor_id: $moderatorId
        target_user_id: $userId
        metadata: { reason: $reason, duration: $duration }
      }
    ) {
      id
    }
    # Set user offline
    update_nchat_user_presence(
      where: { user_id: { _eq: $userId } }
      _set: { status: "offline" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Unban a user
 */
export const UNBAN_USER = gql`
  mutation UnbanUser($userId: uuid!, $moderatorId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        is_banned: false
        banned_at: null
        banned_until: null
        ban_reason: null
      }
    ) {
      id
      is_banned
    }
    # Log the action
    insert_nchat_activity_logs_one(
      object: {
        type: "user_unbanned"
        description: "User unbanned"
        actor_id: $moderatorId
        target_user_id: $userId
      }
    ) {
      id
    }
  }
`;

/**
 * Change user role
 */
export const CHANGE_USER_ROLE = gql`
  mutation ChangeUserRole($userId: uuid!, $roleId: uuid!, $moderatorId: uuid!) {
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
    # Log the action
    insert_nchat_activity_logs_one(
      object: {
        type: "role_changed"
        description: "User role changed"
        actor_id: $moderatorId
        target_user_id: $userId
        metadata: { new_role_id: $roleId }
      }
    ) {
      id
    }
  }
`;

/**
 * Deactivate a user (soft delete)
 */
export const DEACTIVATE_USER_ADMIN = gql`
  mutation DeactivateUserAdmin($userId: uuid!, $moderatorId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_active: false, deactivated_at: "now()" }
    ) {
      id
      is_active
      deactivated_at
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "user_deactivated"
        description: "User deactivated by admin"
        actor_id: $moderatorId
        target_user_id: $userId
      }
    ) {
      id
    }
  }
`;

/**
 * Reactivate a user
 */
export const REACTIVATE_USER_ADMIN = gql`
  mutation ReactivateUserAdmin($userId: uuid!, $moderatorId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_active: true, deactivated_at: null }
    ) {
      id
      is_active
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "user_reactivated"
        description: "User reactivated by admin"
        actor_id: $moderatorId
        target_user_id: $userId
      }
    ) {
      id
    }
  }
`;

/**
 * Create a report
 */
export const CREATE_REPORT = gql`
  mutation CreateReport(
    $type: String!
    $reason: String!
    $reporterId: uuid!
    $reportedUserId: uuid
    $reportedMessageId: uuid
  ) {
    insert_nchat_reports_one(
      object: {
        type: $type
        reason: $reason
        status: "pending"
        reporter_id: $reporterId
        reported_user_id: $reportedUserId
        reported_message_id: $reportedMessageId
      }
    ) {
      id
      type
      reason
      status
      created_at
    }
  }
`;

/**
 * Resolve a moderation report
 */
export const RESOLVE_REPORT = gql`
  mutation ResolveReport(
    $reportId: uuid!
    $status: String!
    $resolution: String!
    $moderatorId: uuid!
    $action: String
  ) {
    update_nchat_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: $status
        resolution: $resolution
        resolved_at: "now()"
        moderator_id: $moderatorId
      }
    ) {
      id
      status
      resolution
      resolved_at
      moderator {
        id
        username
        display_name
      }
    }
    # Log the action
    insert_nchat_activity_logs_one(
      object: {
        type: "report_resolved"
        description: "Moderation report resolved"
        actor_id: $moderatorId
        metadata: { report_id: $reportId, status: $status, action: $action }
      }
    ) {
      id
    }
  }
`;

/**
 * Delete a message (admin action)
 */
export const DELETE_MESSAGE_ADMIN = gql`
  mutation DeleteMessageAdmin(
    $messageId: uuid!
    $moderatorId: uuid!
    $reason: String
  ) {
    update_nchat_messages_by_pk(
      pk_columns: { id: $messageId }
      _set: {
        is_deleted: true
        deleted_at: "now()"
        deleted_by_id: $moderatorId
      }
    ) {
      id
      is_deleted
      deleted_at
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "message_deleted"
        description: "Message deleted by moderator"
        actor_id: $moderatorId
        metadata: { message_id: $messageId, reason: $reason }
      }
    ) {
      id
    }
  }
`;

/**
 * Warn a user
 */
export const WARN_USER = gql`
  mutation WarnUser($userId: uuid!, $reason: String!, $moderatorId: uuid!) {
    insert_nchat_user_warnings_one(
      object: { user_id: $userId, reason: $reason, issued_by_id: $moderatorId }
    ) {
      id
      reason
      created_at
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "user_warned"
        description: "User warned"
        actor_id: $moderatorId
        target_user_id: $userId
        metadata: { reason: $reason }
      }
    ) {
      id
    }
  }
`;

/**
 * Delete a channel (admin action)
 */
export const DELETE_CHANNEL_ADMIN = gql`
  mutation DeleteChannelAdmin($channelId: uuid!, $moderatorId: uuid!) {
    delete_nchat_channels_by_pk(id: $channelId) {
      id
      name
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "channel_deleted"
        description: "Channel deleted by admin"
        actor_id: $moderatorId
        metadata: { channel_id: $channelId }
      }
    ) {
      id
    }
  }
`;

/**
 * Archive a channel (admin action)
 */
export const ARCHIVE_CHANNEL_ADMIN = gql`
  mutation ArchiveChannelAdmin($channelId: uuid!, $moderatorId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: { is_archived: true, archived_at: "now()" }
    ) {
      id
      is_archived
      archived_at
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "channel_archived"
        description: "Channel archived by admin"
        actor_id: $moderatorId
        metadata: { channel_id: $channelId }
      }
    ) {
      id
    }
  }
`;

/**
 * Update workspace settings
 */
export const UPDATE_WORKSPACE_SETTINGS = gql`
  mutation UpdateWorkspaceSettings($settings: jsonb!, $moderatorId: uuid!) {
    insert_nchat_workspace_settings_one(
      object: { settings: $settings }
      on_conflict: {
        constraint: nchat_workspace_settings_pkey
        update_columns: [settings, updated_at]
      }
    ) {
      id
      settings
      updated_at
    }
    insert_nchat_activity_logs_one(
      object: {
        type: "settings_updated"
        description: "Workspace settings updated"
        actor_id: $moderatorId
      }
    ) {
      id
    }
  }
`;

/**
 * Get workspace settings
 */
export const GET_WORKSPACE_SETTINGS = gql`
  query GetWorkspaceSettings {
    nchat_workspace_settings(limit: 1) {
      id
      settings
      updated_at
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new reports
 */
export const REPORTS_SUBSCRIPTION = gql`
  subscription ReportsSubscription {
    nchat_reports(
      where: { status: { _eq: "pending" } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      ...ModerationReport
    }
  }
  ${MODERATION_REPORT_FRAGMENT}
`;

/**
 * Subscribe to activity logs
 */
export const ACTIVITY_LOGS_SUBSCRIPTION = gql`
  subscription ActivityLogsSubscription {
    nchat_activity_logs(order_by: { created_at: desc }, limit: 50) {
      ...ActivityLog
    }
  }
  ${ACTIVITY_LOG_FRAGMENT}
`;

/**
 * Subscribe to user count changes
 */
export const USER_COUNT_SUBSCRIPTION = gql`
  subscription UserCountSubscription {
    nchat_users_aggregate {
      aggregate {
        count
      }
    }
    online: nchat_user_presence_aggregate(
      where: { status: { _eq: "online" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;
