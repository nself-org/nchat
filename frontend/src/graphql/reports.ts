/**
 * Reporting GraphQL Operations
 *
 * Handles user reports, message reports, and moderation workflows
 */

import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
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
  | "sexual_content"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "self_harm"
  | "bullying"
  | "scam"
  | "other";

export type ReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "dismissed"
  | "escalated";

export type ReportType = "user" | "message" | "channel";

export type ReportPriority = "low" | "medium" | "high" | "critical";

export interface ReportUserVariables {
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  evidenceUrls?: string[];
  priority?: ReportPriority;
}

export interface ReportMessageVariables {
  reporterId: string;
  messageId: string;
  reason: ReportReason;
  details?: string;
  priority?: ReportPriority;
}

export interface GetReportsVariables {
  status?: ReportStatus;
  type?: ReportType;
  priority?: ReportPriority;
  reason?: ReportReason;
  limit?: number;
  offset?: number;
}

export interface ResolveReportVariables {
  reportId: string;
  moderatorId: string;
  status: "resolved" | "dismissed";
  notes?: string;
  actionTaken?: string;
}

export interface EscalateReportVariables {
  reportId: string;
  escalatedBy: string;
  reason: string;
}

export interface GetReportDetailsVariables {
  reportId: string;
}

export interface GetUserReportHistoryVariables {
  userId: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const USER_REPORT_FRAGMENT = gql`
  fragment UserReport on nchat_user_reports {
    id
    reporter_id
    reported_user_id
    reason
    details
    evidence_urls
    status
    priority
    created_at
    updated_at
    resolved_at
    resolution_notes
    action_taken
    moderator_id
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
    priority
    created_at
    updated_at
    resolved_at
    resolution_notes
    action_taken
    moderator_id
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

export const REPORT_ACTIVITY_FRAGMENT = gql`
  fragment ReportActivity on nchat_report_activities {
    id
    report_id
    report_type
    user_id
    action
    notes
    created_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all reports (admin only)
 */
export const GET_REPORTS = gql`
  query GetReports(
    $status: String
    $priority: String
    $reason: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    user_reports: nchat_user_reports(
      where: {
        _and: [
          { status: { _eq: $status } }
          { priority: { _eq: $priority } }
          { reason: { _eq: $reason } }
        ]
      }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      ...UserReport
    }

    message_reports: nchat_message_reports(
      where: {
        _and: [
          { status: { _eq: $status } }
          { priority: { _eq: $priority } }
          { reason: { _eq: $reason } }
        ]
      }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      ...MessageReport
    }

    user_reports_count: nchat_user_reports_aggregate(
      where: {
        _and: [
          { status: { _eq: $status } }
          { priority: { _eq: $priority } }
          { reason: { _eq: $reason } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }

    message_reports_count: nchat_message_reports_aggregate(
      where: {
        _and: [
          { status: { _eq: $status } }
          { priority: { _eq: $priority } }
          { reason: { _eq: $reason } }
        ]
      }
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
 * Get user reports only (admin only)
 */
export const GET_USER_REPORTS = gql`
  query GetUserReports(
    $status: String
    $priority: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_user_reports(
      where: {
        _and: [{ status: { _eq: $status } }, { priority: { _eq: $priority } }]
      }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      ...UserReport
    }
    nchat_user_reports_aggregate(
      where: {
        _and: [{ status: { _eq: $status } }, { priority: { _eq: $priority } }]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Get message reports only (admin only)
 */
export const GET_MESSAGE_REPORTS = gql`
  query GetMessageReports(
    $status: String
    $priority: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_message_reports(
      where: {
        _and: [{ status: { _eq: $status } }, { priority: { _eq: $priority } }]
      }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      ...MessageReport
    }
    nchat_message_reports_aggregate(
      where: {
        _and: [{ status: { _eq: $status } }, { priority: { _eq: $priority } }]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Get a single user report by ID
 */
export const GET_USER_REPORT = gql`
  query GetUserReport($id: uuid!) {
    nchat_user_reports_by_pk(id: $id) {
      ...UserReport
      activities {
        ...ReportActivity
      }
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${REPORT_ACTIVITY_FRAGMENT}
`;

/**
 * Get a single message report by ID
 */
export const GET_MESSAGE_REPORT = gql`
  query GetMessageReport($id: uuid!) {
    nchat_message_reports_by_pk(id: $id) {
      ...MessageReport
      activities {
        ...ReportActivity
      }
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
  ${REPORT_ACTIVITY_FRAGMENT}
`;

/**
 * Get reports for a specific user (reports against them)
 */
export const GET_REPORTS_AGAINST_USER = gql`
  query GetReportsAgainstUser($userId: uuid!, $limit: Int = 20) {
    nchat_user_reports(
      where: { reported_user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...UserReport
    }
    nchat_user_reports_aggregate(
      where: { reported_user_id: { _eq: $userId } }
    ) {
      aggregate {
        count
      }
    }
  }
  ${USER_REPORT_FRAGMENT}
`;

/**
 * Get reports submitted by a user
 */
export const GET_REPORTS_BY_USER = gql`
  query GetReportsByUser($userId: uuid!, $limit: Int = 20) {
    user_reports: nchat_user_reports(
      where: { reporter_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...UserReport
    }
    message_reports: nchat_message_reports(
      where: { reporter_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...MessageReport
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Get report statistics
 */
export const GET_REPORT_STATS = gql`
  query GetReportStats {
    total: nchat_user_reports_aggregate {
      aggregate {
        count
      }
    }

    pending: nchat_user_reports_aggregate(
      where: { status: { _eq: "pending" } }
    ) {
      aggregate {
        count
      }
    }

    under_review: nchat_user_reports_aggregate(
      where: { status: { _eq: "under_review" } }
    ) {
      aggregate {
        count
      }
    }

    resolved: nchat_user_reports_aggregate(
      where: { status: { _eq: "resolved" } }
    ) {
      aggregate {
        count
      }
    }

    dismissed: nchat_user_reports_aggregate(
      where: { status: { _eq: "dismissed" } }
    ) {
      aggregate {
        count
      }
    }

    by_reason: nchat_user_reports(
      distinct_on: reason
      order_by: { reason: asc }
    ) {
      reason
    }

    by_priority: nchat_user_reports_aggregate(distinct_on: priority) {
      nodes {
        priority
      }
    }
  }
`;

/**
 * Check if user has already reported something
 */
export const CHECK_EXISTING_REPORT = gql`
  query CheckExistingReport(
    $reporterId: uuid!
    $reportedUserId: uuid
    $messageId: uuid
  ) {
    user_report: nchat_user_reports(
      where: {
        _and: [
          { reporter_id: { _eq: $reporterId } }
          { reported_user_id: { _eq: $reportedUserId } }
          { status: { _in: ["pending", "under_review"] } }
        ]
      }
      limit: 1
    ) {
      id
      status
    }

    message_report: nchat_message_reports(
      where: {
        _and: [
          { reporter_id: { _eq: $reporterId } }
          { message_id: { _eq: $messageId } }
          { status: { _in: ["pending", "under_review"] } }
        ]
      }
      limit: 1
    ) {
      id
      status
    }
  }
`;

/**
 * Get pending reports count
 */
export const GET_PENDING_REPORTS_COUNT = gql`
  query GetPendingReportsCount {
    user_reports: nchat_user_reports_aggregate(
      where: { status: { _in: ["pending", "under_review"] } }
    ) {
      aggregate {
        count
      }
    }

    message_reports: nchat_message_reports_aggregate(
      where: { status: { _in: ["pending", "under_review"] } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

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
    $priority: String = "medium"
  ) {
    insert_nchat_user_reports_one(
      object: {
        reporter_id: $reporterId
        reported_user_id: $reportedUserId
        reason: $reason
        details: $details
        evidence_urls: $evidenceUrls
        priority: $priority
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
    $priority: String = "medium"
  ) {
    insert_nchat_message_reports_one(
      object: {
        reporter_id: $reporterId
        message_id: $messageId
        reason: $reason
        details: $details
        priority: $priority
        status: "pending"
      }
    ) {
      ...MessageReport
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Update report status (admin/moderator only)
 */
export const UPDATE_REPORT_STATUS = gql`
  mutation UpdateReportStatus(
    $reportId: uuid!
    $reportType: String!
    $status: String!
    $moderatorId: uuid!
  ) {
    update_user_report: update_nchat_user_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: $status
        moderator_id: $moderatorId
        updated_at: "now()"
      }
    ) @include(if: $reportType == "user") {
      ...UserReport
    }

    update_message_report: update_nchat_message_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: $status
        moderator_id: $moderatorId
        updated_at: "now()"
      }
    ) @include(if: $reportType == "message") {
      ...MessageReport
    }
  }
  ${USER_REPORT_FRAGMENT}
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
    $actionTaken: String
  ) {
    update_nchat_user_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        moderator_id: $moderatorId
        status: $status
        resolution_notes: $notes
        action_taken: $actionTaken
        resolved_at: "now()"
        updated_at: "now()"
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
    $actionTaken: String
  ) {
    update_nchat_message_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        moderator_id: $moderatorId
        status: $status
        resolution_notes: $notes
        action_taken: $actionTaken
        resolved_at: "now()"
        updated_at: "now()"
      }
    ) {
      ...MessageReport
    }
  }
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Escalate a report
 */
export const ESCALATE_REPORT = gql`
  mutation EscalateReport(
    $reportId: uuid!
    $reportType: String!
    $escalatedBy: uuid!
    $reason: String!
  ) {
    update_user_report: update_nchat_user_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: "escalated"
        priority: "high"
        updated_at: "now()"
      }
    ) @include(if: $reportType == "user") {
      ...UserReport
    }

    update_message_report: update_nchat_message_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: "escalated"
        priority: "high"
        updated_at: "now()"
      }
    ) @include(if: $reportType == "message") {
      ...MessageReport
    }

    # Log the escalation
    insert_activity: insert_nchat_report_activities_one(
      object: {
        report_id: $reportId
        report_type: $reportType
        user_id: $escalatedBy
        action: "escalated"
        notes: $reason
      }
    ) {
      id
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Add activity to a report (for audit trail)
 */
export const ADD_REPORT_ACTIVITY = gql`
  mutation AddReportActivity(
    $reportId: uuid!
    $reportType: String!
    $userId: uuid!
    $action: String!
    $notes: String
  ) {
    insert_nchat_report_activities_one(
      object: {
        report_id: $reportId
        report_type: $reportType
        user_id: $userId
        action: $action
        notes: $notes
      }
    ) {
      ...ReportActivity
    }
  }
  ${REPORT_ACTIVITY_FRAGMENT}
`;

/**
 * Bulk update report statuses
 */
export const BULK_UPDATE_REPORTS = gql`
  mutation BulkUpdateReports(
    $reportIds: [uuid!]!
    $reportType: String!
    $status: String!
    $moderatorId: uuid!
  ) {
    update_user_reports: update_nchat_user_reports(
      where: { id: { _in: $reportIds } }
      _set: {
        status: $status
        moderator_id: $moderatorId
        updated_at: "now()"
      }
    ) @include(if: $reportType == "user") {
      affected_rows
      returning {
        id
        status
      }
    }

    update_message_reports: update_nchat_message_reports(
      where: { id: { _in: $reportIds } }
      _set: {
        status: $status
        moderator_id: $moderatorId
        updated_at: "now()"
      }
    ) @include(if: $reportType == "message") {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`;

/**
 * Delete a report (admin only)
 */
export const DELETE_REPORT = gql`
  mutation DeleteReport($reportId: uuid!, $reportType: String!) {
    delete_user_report: delete_nchat_user_reports_by_pk(id: $reportId)
      @include(if: $reportType == "user") {
      id
    }

    delete_message_report: delete_nchat_message_reports_by_pk(id: $reportId)
      @include(if: $reportType == "message") {
      id
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new reports (admin only)
 */
export const NEW_REPORTS_SUBSCRIPTION = gql`
  subscription NewReportsSubscription {
    nchat_user_reports(
      where: { status: { _eq: "pending" } }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: 20
    ) {
      ...UserReport
    }
    nchat_message_reports(
      where: { status: { _eq: "pending" } }
      order_by: [{ priority: desc }, { created_at: desc }]
      limit: 20
    ) {
      ...MessageReport
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Subscribe to report status changes
 */
export const REPORT_STATUS_SUBSCRIPTION = gql`
  subscription ReportStatusSubscription($reportId: uuid!, $reportType: String!) {
    user_report: nchat_user_reports_by_pk(id: $reportId)
      @include(if: $reportType == "user") {
      ...UserReport
    }

    message_report: nchat_message_reports_by_pk(id: $reportId)
      @include(if: $reportType == "message") {
      ...MessageReport
    }
  }
  ${USER_REPORT_FRAGMENT}
  ${MESSAGE_REPORT_FRAGMENT}
`;

/**
 * Subscribe to pending reports count
 */
export const PENDING_REPORTS_COUNT_SUBSCRIPTION = gql`
  subscription PendingReportsCountSubscription {
    user_reports: nchat_user_reports_aggregate(
      where: { status: { _in: ["pending", "under_review"] } }
    ) {
      aggregate {
        count
      }
    }

    message_reports: nchat_message_reports_aggregate(
      where: { status: { _in: ["pending", "under_review"] } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Subscribe to report activities
 */
export const REPORT_ACTIVITIES_SUBSCRIPTION = gql`
  subscription ReportActivitiesSubscription($reportId: uuid!) {
    nchat_report_activities(
      where: { report_id: { _eq: $reportId } }
      order_by: { created_at: desc }
    ) {
      ...ReportActivity
    }
  }
  ${REPORT_ACTIVITY_FRAGMENT}
`;
