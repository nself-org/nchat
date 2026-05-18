/**
 * Audit GraphQL Mutations
 *
 * GraphQL mutations for managing audit log data.
 */

import { gql } from "@apollo/client";
import { AUDIT_ENTRY_FRAGMENT } from "./audit-queries";

// ============================================================================
// Mutations - Audit Log Entries
// ============================================================================

/**
 * Insert a new audit log entry
 */
export const INSERT_AUDIT_LOG = gql`
  ${AUDIT_ENTRY_FRAGMENT}
  mutation InsertAuditLog($object: nchat_audit_logs_insert_input!) {
    insert_nchat_audit_logs_one(object: $object) {
      ...AuditEntryFields
    }
  }
`;

/**
 * Insert multiple audit log entries
 */
export const INSERT_AUDIT_LOGS_BATCH = gql`
  mutation InsertAuditLogsBatch($objects: [nchat_audit_logs_insert_input!]!) {
    insert_nchat_audit_logs(objects: $objects) {
      affected_rows
      returning {
        id
        timestamp
        category
        action
      }
    }
  }
`;

/**
 * Delete old audit logs (for retention policy)
 */
export const DELETE_OLD_AUDIT_LOGS = gql`
  mutation DeleteOldAuditLogs($olderThan: timestamptz!) {
    delete_nchat_audit_logs(where: { timestamp: { _lt: $olderThan } }) {
      affected_rows
    }
  }
`;

/**
 * Delete audit logs by category and date
 */
export const DELETE_AUDIT_LOGS_BY_CATEGORY = gql`
  mutation DeleteAuditLogsByCategory(
    $category: String!
    $olderThan: timestamptz!
  ) {
    delete_nchat_audit_logs(
      where: { category: { _eq: $category }, timestamp: { _lt: $olderThan } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Delete audit logs by severity and date
 */
export const DELETE_AUDIT_LOGS_BY_SEVERITY = gql`
  mutation DeleteAuditLogsBySeverity(
    $severities: [String!]!
    $olderThan: timestamptz!
  ) {
    delete_nchat_audit_logs(
      where: { severity: { _in: $severities }, timestamp: { _lt: $olderThan } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Mutations - Audit Settings
// ============================================================================

/**
 * Update audit settings
 */
export const UPDATE_AUDIT_SETTINGS = gql`
  mutation UpdateAuditSettings(
    $id: uuid!
    $settings: nchat_audit_settings_set_input!
  ) {
    update_nchat_audit_settings_by_pk(
      pk_columns: { id: $id }
      _set: $settings
    ) {
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
      updated_at
    }
  }
`;

/**
 * Insert or update audit settings (upsert)
 */
export const UPSERT_AUDIT_SETTINGS = gql`
  mutation UpsertAuditSettings($object: nchat_audit_settings_insert_input!) {
    insert_nchat_audit_settings_one(
      object: $object
      on_conflict: {
        constraint: nchat_audit_settings_pkey
        update_columns: [
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
          updated_at
        ]
      }
    ) {
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
  }
`;

// ============================================================================
// Mutations - Retention Policies
// ============================================================================

/**
 * Insert a new retention policy
 */
export const INSERT_RETENTION_POLICY = gql`
  mutation InsertRetentionPolicy(
    $object: nchat_audit_retention_policies_insert_input!
  ) {
    insert_nchat_audit_retention_policies_one(object: $object) {
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
 * Update a retention policy
 */
export const UPDATE_RETENTION_POLICY = gql`
  mutation UpdateRetentionPolicy(
    $id: uuid!
    $policy: nchat_audit_retention_policies_set_input!
  ) {
    update_nchat_audit_retention_policies_by_pk(
      pk_columns: { id: $id }
      _set: $policy
    ) {
      id
      name
      enabled
      retention_days
      categories
      severities
      archive_enabled
      archive_location
      updated_at
    }
  }
`;

/**
 * Delete a retention policy
 */
export const DELETE_RETENTION_POLICY = gql`
  mutation DeleteRetentionPolicy($id: uuid!) {
    delete_nchat_audit_retention_policies_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Toggle retention policy enabled status
 */
export const TOGGLE_RETENTION_POLICY = gql`
  mutation ToggleRetentionPolicy($id: uuid!, $enabled: Boolean!) {
    update_nchat_audit_retention_policies_by_pk(
      pk_columns: { id: $id }
      _set: { enabled: $enabled, updated_at: "now()" }
    ) {
      id
      name
      enabled
      updated_at
    }
  }
`;

// ============================================================================
// Mutations - Archive Operations
// ============================================================================

/**
 * Mark entries for archival
 */
export const MARK_ENTRIES_FOR_ARCHIVE = gql`
  mutation MarkEntriesForArchive($ids: [uuid!]!) {
    update_nchat_audit_logs(
      where: { id: { _in: $ids } }
      _set: { archived: true, archived_at: "now()" }
    ) {
      affected_rows
    }
  }
`;

/**
 * Mark entries as archived with location
 */
export const UPDATE_ARCHIVE_STATUS = gql`
  mutation UpdateArchiveStatus($ids: [uuid!]!, $archiveLocation: String!) {
    update_nchat_audit_logs(
      where: { id: { _in: $ids } }
      _set: {
        archived: true
        archived_at: "now()"
        archive_location: $archiveLocation
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Mutations - Bulk Operations
// ============================================================================

/**
 * Bulk delete audit logs by IDs
 */
export const BULK_DELETE_AUDIT_LOGS = gql`
  mutation BulkDeleteAuditLogs($ids: [uuid!]!) {
    delete_nchat_audit_logs(where: { id: { _in: $ids } }) {
      affected_rows
    }
  }
`;

/**
 * Purge all audit logs (use with caution)
 */
export const PURGE_ALL_AUDIT_LOGS = gql`
  mutation PurgeAllAuditLogs {
    delete_nchat_audit_logs(where: {}) {
      affected_rows
    }
  }
`;

// ============================================================================
// Mutations - Export Tracking
// ============================================================================

/**
 * Record an export operation
 */
export const RECORD_EXPORT_OPERATION = gql`
  mutation RecordExportOperation($object: nchat_audit_exports_insert_input!) {
    insert_nchat_audit_exports_one(object: $object) {
      id
      format
      record_count
      filters
      exported_by
      exported_at
      file_size
      file_name
    }
  }
`;

// ============================================================================
// Helper Types for Mutations
// ============================================================================

export interface AuditLogInsertInput {
  category: string;
  action: string;
  severity: string;
  actor_id: string;
  actor_type: string;
  actor_email?: string;
  actor_username?: string;
  actor_display_name?: string;
  actor_ip_address?: string;
  actor_user_agent?: string;
  actor_session_id?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  resource_previous_value?: Record<string, unknown>;
  resource_new_value?: Record<string, unknown>;
  resource_metadata?: Record<string, unknown>;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  description: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  geo_country?: string;
  geo_region?: string;
  geo_city?: string;
  request_id?: string;
  correlation_id?: string;
}

export interface AuditSettingsUpdateInput {
  enabled?: boolean;
  default_retention_days?: number;
  max_retention_days?: number;
  min_retention_days?: number;
  archive_enabled?: boolean;
  archive_location?: string;
  real_time_enabled?: boolean;
  sensitive_field_masking?: boolean;
  ip_logging_enabled?: boolean;
  geo_location_enabled?: boolean;
}

export interface RetentionPolicyInsertInput {
  name: string;
  enabled: boolean;
  retention_days: number;
  categories?: string[];
  severities?: string[];
  archive_enabled: boolean;
  archive_location?: string;
}

export interface RetentionPolicyUpdateInput {
  name?: string;
  enabled?: boolean;
  retention_days?: number;
  categories?: string[];
  severities?: string[];
  archive_enabled?: boolean;
  archive_location?: string;
}
