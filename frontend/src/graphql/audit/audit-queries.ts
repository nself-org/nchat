/**
 * Audit GraphQL Queries
 *
 * GraphQL queries for fetching audit log data.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Fragments
// ============================================================================

export const AUDIT_ENTRY_FRAGMENT = gql`
  fragment AuditEntryFields on nchat_audit_logs {
    id
    timestamp
    category
    action
    severity
    actor_id
    actor_type
    actor_email
    actor_username
    actor_display_name
    actor_ip_address
    actor_user_agent
    actor_session_id
    resource_type
    resource_id
    resource_name
    resource_previous_value
    resource_new_value
    resource_metadata
    target_type
    target_id
    target_name
    description
    success
    error_message
    metadata
    ip_address
    geo_country
    geo_region
    geo_city
    request_id
    correlation_id
    created_at
    updated_at
  }
`;

export const AUDIT_STATISTICS_FRAGMENT = gql`
  fragment AuditStatisticsFields on nchat_audit_statistics {
    total_events
    events_by_category
    events_by_severity
    events_by_day
    failed_events
    success_rate
    top_actors
    top_actions
    calculated_at
  }
`;

// ============================================================================
// Queries
// ============================================================================

/**
 * Get audit logs with pagination and filters
 */
export const GET_AUDIT_LOGS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetAuditLogs(
    $limit: Int = 20
    $offset: Int = 0
    $where: nchat_audit_logs_bool_exp
    $order_by: [nchat_audit_logs_order_by!]
  ) {
    nchat_audit_logs(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $order_by
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get a single audit log entry by ID
 */
export const GET_AUDIT_LOG_BY_ID = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetAuditLogById($id: uuid!) {
    nchat_audit_logs_by_pk(id: $id) {
      ...AuditEntryFields
    }
  }
`;

/**
 * Get audit logs by actor ID
 */
export const GET_AUDIT_LOGS_BY_ACTOR = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetAuditLogsByActor(
    $actorId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_audit_logs(
      where: { actor_id: { _eq: $actorId } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(where: { actor_id: { _eq: $actorId } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get audit logs by resource
 */
export const GET_AUDIT_LOGS_BY_RESOURCE = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetAuditLogsByResource(
    $resourceType: String!
    $resourceId: String!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_audit_logs(
      where: {
        resource_type: { _eq: $resourceType }
        resource_id: { _eq: $resourceId }
      }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(
      where: {
        resource_type: { _eq: $resourceType }
        resource_id: { _eq: $resourceId }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get security events
 */
export const GET_SECURITY_EVENTS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetSecurityEvents($limit: Int = 50, $offset: Int = 0) {
    nchat_audit_logs(
      where: { category: { _eq: "security" } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(where: { category: { _eq: "security" } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get admin actions
 */
export const GET_ADMIN_ACTIONS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetAdminActions($limit: Int = 50, $offset: Int = 0) {
    nchat_audit_logs(
      where: { category: { _eq: "admin" } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(where: { category: { _eq: "admin" } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get user activity
 */
export const GET_USER_ACTIVITY = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetUserActivity(
    $userId: uuid!
    $startDate: timestamptz
    $endDate: timestamptz
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_audit_logs(
      where: {
        actor_id: { _eq: $userId }
        timestamp: { _gte: $startDate, _lte: $endDate }
      }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(
      where: {
        actor_id: { _eq: $userId }
        timestamp: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get channel activity
 */
export const GET_CHANNEL_ACTIVITY = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetChannelActivity(
    $channelId: String!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_audit_logs(
      where: {
        _or: [
          { resource_id: { _eq: $channelId } }
          { metadata: { _contains: { channelId: $channelId } } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(
      where: {
        _or: [
          { resource_id: { _eq: $channelId } }
          { metadata: { _contains: { channelId: $channelId } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get failed events
 */
export const GET_FAILED_EVENTS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetFailedEvents($limit: Int = 50, $offset: Int = 0) {
    nchat_audit_logs(
      where: { success: { _eq: false } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(where: { success: { _eq: false } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get high severity events (critical and error)
 */
export const GET_HIGH_SEVERITY_EVENTS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query GetHighSeverityEvents($limit: Int = 50, $offset: Int = 0) {
    nchat_audit_logs(
      where: { severity: { _in: ["critical", "error"] } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(
      where: { severity: { _in: ["critical", "error"] } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get audit statistics
 */
export const GET_AUDIT_STATISTICS = gql`
  query GetAuditStatistics($startDate: timestamptz, $endDate: timestamptz) {
    events_by_category: nchat_audit_logs_aggregate(
      where: { timestamp: { _gte: $startDate, _lte: $endDate } }
    ) {
      nodes {
        category
      }
      aggregate {
        count
      }
    }
    events_by_severity: nchat_audit_logs_aggregate(
      where: { timestamp: { _gte: $startDate, _lte: $endDate } }
    ) {
      nodes {
        severity
      }
      aggregate {
        count
      }
    }
    total_events: nchat_audit_logs_aggregate(
      where: { timestamp: { _gte: $startDate, _lte: $endDate } }
    ) {
      aggregate {
        count
      }
    }
    failed_events: nchat_audit_logs_aggregate(
      where: {
        success: { _eq: false }
        timestamp: { _gte: $startDate, _lte: $endDate }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get audit settings
 */
export const GET_AUDIT_SETTINGS = gql`
  query GetAuditSettings {
    nchat_audit_settings(limit: 1) {
      id
      enabled
      default_retention_days
      max_retention_days
      min_retention_days
      archive_enabled
      archive_location
      real_time_enabled
      sensitive_field_masking
      ip_logging_enabled
      geo_location_enabled
      created_at
      updated_at
    }
    nchat_audit_retention_policies(order_by: { created_at: asc }) {
      id
      name
      enabled
      retention_days
      categories
      severities
      archive_enabled
      archive_location
      created_at
      updated_at
    }
  }
`;

/**
 * Search audit logs
 */
export const SEARCH_AUDIT_LOGS = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  query SearchAuditLogs(
    $searchQuery: String!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_audit_logs(
      where: {
        _or: [
          { description: { _ilike: $searchQuery } }
          { actor_email: { _ilike: $searchQuery } }
          { actor_username: { _ilike: $searchQuery } }
          { actor_display_name: { _ilike: $searchQuery } }
          { resource_name: { _ilike: $searchQuery } }
          { error_message: { _ilike: $searchQuery } }
        ]
      }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...AuditEntryFields
    }
    nchat_audit_logs_aggregate(
      where: {
        _or: [
          { description: { _ilike: $searchQuery } }
          { actor_email: { _ilike: $searchQuery } }
          { actor_username: { _ilike: $searchQuery } }
          { actor_display_name: { _ilike: $searchQuery } }
          { resource_name: { _ilike: $searchQuery } }
          { error_message: { _ilike: $searchQuery } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to new audit log entries
 */
export const AUDIT_LOG_SUBSCRIPTION = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  subscription AuditLogSubscription {
    nchat_audit_logs(limit: 1, order_by: { timestamp: desc }) {
      ...AuditEntryFields
    }
  }
`;

/**
 * Subscribe to security events
 */
export const SECURITY_EVENT_SUBSCRIPTION = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  subscription SecurityEventSubscription {
    nchat_audit_logs(
      limit: 1
      where: { category: { _eq: "security" } }
      order_by: { timestamp: desc }
    ) {
      ...AuditEntryFields
    }
  }
`;

/**
 * Subscribe to high severity events
 */
export const HIGH_SEVERITY_SUBSCRIPTION = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  subscription HighSeveritySubscription {
    nchat_audit_logs(
      limit: 1
      where: { severity: { _in: ["critical", "error"] } }
      order_by: { timestamp: desc }
    ) {
      ...AuditEntryFields
    }
  }
`;
