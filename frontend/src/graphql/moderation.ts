/**
 * Moderation GraphQL Operations
 *
 * Handles user blocking, reporting, and muting functionality
 */

import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export type MuteDuration =
  | "15m"
  | "1h"
  | "4h"
  | "24h"
  | "7d"
  | "30d"
  | "permanent";

export interface BlockUserVariables {
  userId: string;
  blockedUserId: string;
}

export interface UnblockUserVariables {
  userId: string;
  blockedUserId: string;
}

export interface GetBlockedUsersVariables {
  userId: string;
}

export interface ReportUserVariables {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  evidenceUrls?: string[];
}

export interface ReportMessageVariables {
  reporterId: string;
  messageId: string;
  reason: ReportReason;
  details?: string;
}

export interface MuteUserVariables {
  userId: string;
  mutedByUserId: string;
  channelId?: string;
  duration: MuteDuration;
  reason?: string;
}

export interface UnmuteUserVariables {
  muteId: string;
}

export interface GetReportsVariables {
  status?: ReportStatus;
  type?: "user" | "message";
  limit?: number;
  offset?: number;
}

export interface ResolveReportVariables {
  reportId: string;
  moderatorId: string;
  resolution: "resolved" | "dismissed";
  notes?: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const BLOCKED_USER_FRAGMENT = gql`
  fragment BlockedUser on nchat_blocked_users {
    id
    user_id
    blocked_user_id
    created_at
    blocked_user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const USER_REPORT_FRAGMENT = gql`
  fragment UserReport on nchat_user_reports {
    id
    reporter_id
    reported_user_id
    reason
    details
    evidence_urls
    status
    created_at
    resolved_at
    resolution_notes
    reporter {
      ...UserBasic
    }
    reported_user {
      ...UserBasic
    }
    moderator {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const MESSAGE_REPORT_FRAGMENT = gql`
  fragment MessageReport on nchat_message_reports {
    id
    reporter_id
    message_id
    reason
    details
    status
    created_at
    resolved_at
    resolution_notes
    reporter {
      ...UserBasic
    }
    message {
      ...MessageBasic
      channel {
        ...ChannelBasic
      }
    }
    moderator {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${MESSAGE_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

export const USER_MUTE_FRAGMENT = gql`
  fragment UserMute on nchat_user_mutes {
    id
    user_id
    muted_by_id
    channel_id
    reason
    muted_at
    muted_until
    is_global
    user {
      ...UserBasic
    }
    muted_by {
      ...UserBasic
    }
    channel {
      ...ChannelBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all users blocked by the current user
 */
export const GET_BLOCKED_USERS = gql`
  query GetBlockedUsers($userId: uuid!) {
    nchat_blocked_users(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
    ) {
      ...BlockedUser
    }
  }
  ${BLOCKED_USER_FRAGMENT}
`;

/**
 * Check if a specific user is blocked
 */
export const CHECK_USER_BLOCKED = gql`
  query CheckUserBlocked($userId: uuid!, $blockedUserId: uuid!) {
    nchat_blocked_users(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { blocked_user_id: { _eq: $blockedUserId } }
        ]
      }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Get all blocked user IDs (for filtering)
 */
export const GET_BLOCKED_USER_IDS = gql`
  query GetBlockedUserIds($userId: uuid!) {
    nchat_blocked_users(where: { user_id: { _eq: $userId } }) {
      blocked_user_id
    }
  }
`;

/**
 * Get user reports (admin only)
 */
export const GET_USER_REPORTS = gql`
  query GetUserReports($status: String, $limit: Int = 50, $offset: Int = 0) {
    nchat_user_reports(
      where: { status: { _eq: $status } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...UserReport
    }
    nchat_user_reports_aggregate(where: { status: { _eq: $status } }) {
      aggregate {
        count
      }
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Get message reports (admin only)
 */
export const GET_MESSAGE_REPORTS = gql`
  query GetMessageReports($status: String, $limit: Int = 50, $offset: Int = 0) {
    nchat_message_reports(
      where: { status: { _eq: $status } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageReport
    }
    nchat_message_reports_aggregate(where: { status: { _eq: $status } }) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Get all reports (combined user and message reports for admin)
 */
export const GET_REPORTS_ADMIN = gql`
  query GetReportsAdmin(
    $status: String = "pending"
    $limit: Int = 50
    $offset: Int = 0
  ) {
    user_reports: nchat_user_reports(
      where: { status: { _eq: $status } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...UserReport
    }
    message_reports: nchat_message_reports(
      where: { status: { _eq: $status } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageReport
    }
    user_reports_count: nchat_user_reports_aggregate(
      where: { status: { _eq: $status } }
    ) {
      aggregate {
        count
      }
    }
    message_reports_count: nchat_message_reports_aggregate(
      where: { status: { _eq: $status } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Get active mutes for a user
 */
export const GET_USER_MUTES = gql`
  query GetUserMutes($userId: uuid!) {
    nchat_user_mutes(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { muted_until: { _gt: "now()" } }
          { muted_until: { _is_null: true } }
        ]
      }
      order_by: { muted_at: desc }
    ) {
      ...UserMute
    }
  }
  ${USER_MUTE_FRAGMENT}
`;

/**
 * Check if user is muted in a channel or globally
 */
export const CHECK_USER_MUTED = gql`
  query CheckUserMuted($userId: uuid!, $channelId: uuid) {
    nchat_user_mutes(
      where: {
        user_id: { _eq: $userId }
        _or: [{ is_global: { _eq: true } }, { channel_id: { _eq: $channelId } }]
        _and: [
          {
            _or: [
              { muted_until: { _gt: "now()" } }
              { muted_until: { _is_null: true } }
            ]
          }
        ]
      }
      limit: 1
    ) {
      id
      muted_until
      is_global
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Block a user
 */
export const BLOCK_USER = gql`
  mutation BlockUser($userId: uuid!, $blockedUserId: uuid!) {
    insert_nchat_blocked_users_one(
      object: { user_id: $userId, blocked_user_id: $blockedUserId }
      on_conflict: {
        constraint: nchat_blocked_users_user_id_blocked_user_id_key
        update_columns: []
      }
    ) {
      ...BlockedUser
    }
  }
  ${BLOCKED_USER_FRAGMENT}
`;

/**
 * Unblock a user
 */
export const UNBLOCK_USER = gql`
  mutation UnblockUser($userId: uuid!, $blockedUserId: uuid!) {
    delete_nchat_blocked_users(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { blocked_user_id: { _eq: $blockedUserId } }
        ]
      }
    ) {
      affected_rows
      returning {
        id
        blocked_user_id
      }
    }
  }
`;

/**
 * Report a user
 */
export const REPORT_USER = gql`
  mutation ReportUser(
    $reporterId: uuid!
    $reportedUserId: uuid!
    $reason: String!
    $details: String
    $evidenceUrls: jsonb
  ) {
    insert_nchat_user_reports_one(
      object: {
        reporter_id: $reporterId
        reported_user_id: $reportedUserId
        reason: $reason
        details: $details
        evidence_urls: $evidenceUrls
        status: "pending"
      }
    ) {
      ...UserReport
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Report a message
 */
export const REPORT_MESSAGE = gql`
  mutation ReportMessage(
    $reporterId: uuid!
    $messageId: uuid!
    $reason: String!
    $details: String
  ) {
    insert_nchat_message_reports_one(
      object: {
        reporter_id: $reporterId
        message_id: $messageId
        reason: $reason
        details: $details
        status: "pending"
      }
    ) {
      ...MessageReport
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Resolve a user report (admin/moderator only)
 */
export const RESOLVE_USER_REPORT = gql`
  mutation ResolveUserReport(
    $reportId: uuid!
    $moderatorId: uuid!
    $status: String!
    $notes: String
  ) {
    update_nchat_user_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        moderator_id: $moderatorId
        status: $status
        resolution_notes: $notes
        resolved_at: "now()"
      }
    ) {
      ...UserReport
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Resolve a message report (admin/moderator only)
 */
export const RESOLVE_MESSAGE_REPORT = gql`
  mutation ResolveMessageReport(
    $reportId: uuid!
    $moderatorId: uuid!
    $status: String!
    $notes: String
  ) {
    update_nchat_message_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        moderator_id: $moderatorId
        status: $status
        resolution_notes: $notes
        resolved_at: "now()"
      }
    ) {
      ...MessageReport
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Mute a user (moderator only)
 */
export const MUTE_USER = gql`
  mutation MuteUser(
    $userId: uuid!
    $mutedById: uuid!
    $channelId: uuid
    $reason: String
    $mutedUntil: timestamptz
    $isGlobal: Boolean = false
  ) {
    insert_nchat_user_mutes_one(
      object: {
        user_id: $userId
        muted_by_id: $mutedById
        channel_id: $channelId
        reason: $reason
        muted_until: $mutedUntil
        is_global: $isGlobal
        muted_at: "now()"
      }
    ) {
      ...UserMute
    }
  }
  ${USER_MUTE_FRAGMENT}
`;

/**
 * Unmute a user
 */
export const UNMUTE_USER = gql`
  mutation UnmuteUser($muteId: uuid!) {
    delete_nchat_user_mutes_by_pk(id: $muteId) {
      id
      user_id
    }
  }
`;

/**
 * Unmute a user in a specific channel or globally
 */
export const UNMUTE_USER_BY_CONTEXT = gql`
  mutation UnmuteUserByContext(
    $userId: uuid!
    $channelId: uuid
    $isGlobal: Boolean
  ) {
    delete_nchat_user_mutes(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { channel_id: { _eq: $channelId } }
          { is_global: { _eq: $isGlobal } }
        ]
      }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to blocked users changes
 */
export const BLOCKED_USERS_SUBSCRIPTION = gql`
  subscription BlockedUsersSubscription($userId: uuid!) {
    nchat_blocked_users(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
    ) {
      ...BlockedUser
    }
  }
  ${BLOCKED_USER_FRAGMENT}
`;

/**
 * Subscribe to new reports (admin only)
 */
export const REPORTS_SUBSCRIPTION = gql`
  subscription ReportsSubscription {
    nchat_user_reports(
      where: { status: { _eq: "pending" } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      ...UserReport
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Subscribe to user mutes
 */
export const USER_MUTES_SUBSCRIPTION = gql`
  subscription UserMutesSubscription($userId: uuid!) {
    nchat_user_mutes(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { muted_until: { _gt: "now()" } }
          { muted_until: { _is_null: true } }
        ]
      }
    ) {
      ...UserMute
    }
  }
  ${USER_MUTE_FRAGMENT}
`;
