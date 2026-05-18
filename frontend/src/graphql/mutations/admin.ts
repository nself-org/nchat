/**
 * Admin Operations GraphQL Mutations
 *
 * Comprehensive mutations for user management, roles, moderation, audit logging,
 * and system administration.
 */

import { gql } from "@apollo/client";

// ============================================================================
// User Management Mutations
// ============================================================================

export const SUSPEND_USER = gql`
  mutation SuspendUser(
    $userId: uuid!
    $reason: String!
    $suspendedUntil: timestamptz
    $suspendedBy: uuid!
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        status: "suspended"
        suspended_at: "now()"
        suspended_until: $suspendedUntil
        suspend_reason: $reason
        suspended_by: $suspendedBy
      }
    ) {
      id
      status
      suspended_at
      suspended_until
      suspend_reason
      username
      email
    }
  }
`;

export const UNSUSPEND_USER = gql`
  mutation UnsuspendUser($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        status: "active"
        suspended_at: null
        suspended_until: null
        suspend_reason: null
        suspended_by: null
      }
    ) {
      id
      status
      username
    }
  }
`;

export const BAN_USER = gql`
  mutation BanUser(
    $userId: uuid!
    $reason: String!
    $bannedBy: uuid!
    $permanent: Boolean
  ) {
    insert_nchat_user_bans_one(
      object: {
        user_id: $userId
        reason: $reason
        banned_by: $bannedBy
        permanent: $permanent
        banned_at: "now()"
      }
    ) {
      id
      user_id
      reason
      banned_at
      permanent
      user {
        id
        username
        email
      }
    }
  }
`;

export const UNBAN_USER = gql`
  mutation UnbanUser($userId: uuid!) {
    delete_nchat_user_bans(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser(
    $userId: uuid!
    $deleteContent: Boolean
    $anonymize: Boolean
  ) {
    delete_nchat_users_by_pk(id: $userId) {
      id
      username
      email
    }
  }
`;

export const PROMOTE_USER = gql`
  mutation PromoteUser($userId: uuid!, $newRole: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { role: $newRole }
    ) {
      id
      username
      role
      updated_at
    }
  }
`;

export const DEMOTE_USER = gql`
  mutation DemoteUser($userId: uuid!, $newRole: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { role: $newRole }
    ) {
      id
      username
      role
      updated_at
    }
  }
`;

export const RESET_USER_PASSWORD = gql`
  mutation ResetUserPassword(
    $userId: uuid!
    $newPassword: String
    $sendEmail: Boolean
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { password_reset_required: true, password_reset_at: "now()" }
    ) {
      id
      username
      email
      password_reset_required
    }
  }
`;

export const IMPERSONATE_USER = gql`
  mutation ImpersonateUser(
    $adminId: uuid!
    $targetUserId: uuid!
    $reason: String
  ) {
    insert_nchat_impersonation_logs_one(
      object: {
        admin_id: $adminId
        target_user_id: $targetUserId
        reason: $reason
        started_at: "now()"
      }
    ) {
      id
      target_user_id
      started_at
      target_user {
        id
        username
        role
      }
    }
  }
`;

export const END_IMPERSONATION = gql`
  mutation EndImpersonation($impersonationId: uuid!) {
    update_nchat_impersonation_logs_by_pk(
      pk_columns: { id: $impersonationId }
      _set: { ended_at: "now()" }
    ) {
      id
      ended_at
    }
  }
`;

export const INVITE_USERS = gql`
  mutation InviteUsers($invites: [nchat_user_invites_insert_input!]!) {
    insert_nchat_user_invites(objects: $invites) {
      affected_rows
      returning {
        id
        email
        role
        invited_by
        expires_at
      }
    }
  }
`;

// ============================================================================
// Role Management Mutations
// ============================================================================

export const CREATE_ROLE = gql`
  mutation CreateRole(
    $name: String!
    $description: String
    $permissions: jsonb!
    $priority: Int
  ) {
    insert_nchat_roles_one(
      object: {
        name: $name
        description: $description
        permissions: $permissions
        priority: $priority
      }
    ) {
      id
      name
      description
      permissions
      priority
      created_at
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation UpdateRole(
    $roleId: uuid!
    $name: String
    $description: String
    $permissions: jsonb
    $priority: Int
  ) {
    update_nchat_roles_by_pk(
      pk_columns: { id: $roleId }
      _set: {
        name: $name
        description: $description
        permissions: $permissions
        priority: $priority
      }
    ) {
      id
      name
      description
      permissions
      priority
      updated_at
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($roleId: uuid!) {
    delete_nchat_roles_by_pk(id: $roleId) {
      id
      name
    }
  }
`;

export const ASSIGN_ROLE_TO_USER = gql`
  mutation AssignRoleToUser($userId: uuid!, $roleId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { role_id: $roleId }
    ) {
      id
      username
      role_id
      role {
        id
        name
        permissions
      }
    }
  }
`;

// ============================================================================
// Moderation Mutations
// ============================================================================

export const DELETE_CONTENT = gql`
  mutation DeleteContent(
    $contentType: String!
    $contentId: uuid!
    $reason: String!
    $deletedBy: uuid!
  ) {
    insert_nchat_moderation_actions_one(
      object: {
        action_type: "delete_content"
        content_type: $contentType
        content_id: $contentId
        reason: $reason
        moderator_id: $deletedBy
        created_at: "now()"
      }
    ) {
      id
      action_type
      content_type
      content_id
      reason
      created_at
    }
  }
`;

export const WARN_USER = gql`
  mutation WarnUser(
    $userId: uuid!
    $reason: String!
    $warnedBy: uuid!
    $severity: String
  ) {
    insert_nchat_user_warnings_one(
      object: {
        user_id: $userId
        reason: $reason
        warned_by: $warnedBy
        severity: $severity
        created_at: "now()"
      }
    ) {
      id
      user_id
      reason
      severity
      created_at
      user {
        id
        username
      }
    }
  }
`;

export const RESOLVE_REPORT = gql`
  mutation ResolveReport(
    $reportId: uuid!
    $resolution: String!
    $resolvedBy: uuid!
    $actionTaken: String
  ) {
    update_nchat_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: "resolved"
        resolution: $resolution
        resolved_by: $resolvedBy
        action_taken: $actionTaken
        resolved_at: "now()"
      }
    ) {
      id
      status
      resolution
      action_taken
      resolved_at
    }
  }
`;

export const DISMISS_REPORT = gql`
  mutation DismissReport(
    $reportId: uuid!
    $dismissedBy: uuid!
    $reason: String
  ) {
    update_nchat_reports_by_pk(
      pk_columns: { id: $reportId }
      _set: {
        status: "dismissed"
        dismissed_by: $dismissedBy
        dismiss_reason: $reason
        dismissed_at: "now()"
      }
    ) {
      id
      status
      dismissed_at
    }
  }
`;

export const LOCK_CHANNEL = gql`
  mutation LockChannel($channelId: uuid!, $reason: String, $lockedBy: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        is_locked: true
        locked_at: "now()"
        locked_by: $lockedBy
        lock_reason: $reason
      }
    ) {
      id
      name
      is_locked
      locked_at
      lock_reason
    }
  }
`;

export const UNLOCK_CHANNEL = gql`
  mutation UnlockChannel($channelId: uuid!) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        is_locked: false
        locked_at: null
        locked_by: null
        lock_reason: null
      }
    ) {
      id
      name
      is_locked
    }
  }
`;

// ============================================================================
// Audit Log Mutations
// ============================================================================

export const CREATE_AUDIT_LOG = gql`
  mutation CreateAuditLog(
    $userId: uuid!
    $action: String!
    $resourceType: String
    $resourceId: uuid
    $details: jsonb
    $ipAddress: String
    $userAgent: String
  ) {
    insert_nchat_audit_logs_one(
      object: {
        user_id: $userId
        action: $action
        resource_type: $resourceType
        resource_id: $resourceId
        details: $details
        ip_address: $ipAddress
        user_agent: $userAgent
        created_at: "now()"
      }
    ) {
      id
      action
      created_at
    }
  }
`;

export const PURGE_OLD_AUDIT_LOGS = gql`
  mutation PurgeOldAuditLogs($before: timestamptz!) {
    delete_nchat_audit_logs(where: { created_at: { _lt: $before } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// System Settings Mutations
// ============================================================================

export const UPDATE_SYSTEM_SETTINGS = gql`
  mutation UpdateSystemSettings($key: String!, $value: jsonb!) {
    insert_nchat_system_settings_one(
      object: { key: $key, value: $value, updated_at: "now()" }
      on_conflict: {
        constraint: system_settings_key_key
        update_columns: [value, updated_at]
      }
    ) {
      key
      value
      updated_at
    }
  }
`;

export const DELETE_SYSTEM_SETTING = gql`
  mutation DeleteSystemSetting($key: String!) {
    delete_nchat_system_settings(where: { key: { _eq: $key } }) {
      affected_rows
    }
  }
`;

export const TOGGLE_FEATURE_FLAG = gql`
  mutation ToggleFeatureFlag($flagName: String!, $enabled: Boolean!) {
    insert_nchat_feature_flags_one(
      object: { name: $flagName, enabled: $enabled, updated_at: "now()" }
      on_conflict: {
        constraint: feature_flags_name_key
        update_columns: [enabled, updated_at]
      }
    ) {
      name
      enabled
      updated_at
    }
  }
`;

// ============================================================================
// Bulk Operations
// ============================================================================

export const BULK_SUSPEND_USERS = gql`
  mutation BulkSuspendUsers(
    $userIds: [uuid!]!
    $reason: String!
    $suspendedBy: uuid!
  ) {
    update_nchat_users(
      where: { id: { _in: $userIds } }
      _set: {
        status: "suspended"
        suspended_at: "now()"
        suspend_reason: $reason
        suspended_by: $suspendedBy
      }
    ) {
      affected_rows
      returning {
        id
        username
        status
      }
    }
  }
`;

export const BULK_DELETE_USERS = gql`
  mutation BulkDeleteUsers($userIds: [uuid!]!) {
    delete_nchat_users(where: { id: { _in: $userIds } }) {
      affected_rows
    }
  }
`;

export const BULK_ASSIGN_ROLE = gql`
  mutation BulkAssignRole($userIds: [uuid!]!, $roleId: uuid!) {
    update_nchat_users(
      where: { id: { _in: $userIds } }
      _set: { role_id: $roleId }
    ) {
      affected_rows
      returning {
        id
        username
        role_id
      }
    }
  }
`;

export const BULK_DELETE_MESSAGES = gql`
  mutation BulkDeleteMessagesByUser($userId: uuid!, $channelId: uuid) {
    delete_nchat_messages(
      where: { user_id: { _eq: $userId }, channel_id: { _eq: $channelId } }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Analytics & Stats
// ============================================================================

export const REFRESH_STATS_CACHE = gql`
  mutation RefreshStatsCache {
    refresh_stats_cache {
      success
      refreshed_at
    }
  }
`;

export const EXPORT_USER_DATA = gql`
  mutation ExportUserData(
    $userId: uuid!
    $format: String!
    $includeMessages: Boolean
  ) {
    export_user_data(
      userId: $userId
      format: $format
      includeMessages: $includeMessages
    ) {
      export_id
      download_url
      expires_at
    }
  }
`;

export const IMPORT_USERS = gql`
  mutation ImportUsers($users: jsonb!, $sendInvites: Boolean) {
    import_users(users: $users, sendInvites: $sendInvites) {
      imported_count
      failed_count
      errors
    }
  }
`;

// ============================================================================
// Webhooks Management
// ============================================================================

export const CREATE_WEBHOOK = gql`
  mutation CreateWebhook(
    $name: String!
    $url: String!
    $events: jsonb!
    $secret: String
    $enabled: Boolean
  ) {
    insert_nchat_webhooks_one(
      object: {
        name: $name
        url: $url
        events: $events
        secret: $secret
        enabled: $enabled
      }
    ) {
      id
      name
      url
      events
      enabled
      created_at
    }
  }
`;

export const UPDATE_WEBHOOK = gql`
  mutation UpdateWebhook(
    $webhookId: uuid!
    $name: String
    $url: String
    $events: jsonb
    $secret: String
    $enabled: Boolean
  ) {
    update_nchat_webhooks_by_pk(
      pk_columns: { id: $webhookId }
      _set: {
        name: $name
        url: $url
        events: $events
        secret: $secret
        enabled: $enabled
      }
    ) {
      id
      name
      url
      events
      enabled
      updated_at
    }
  }
`;

export const DELETE_WEBHOOK = gql`
  mutation DeleteWebhook($webhookId: uuid!) {
    delete_nchat_webhooks_by_pk(id: $webhookId) {
      id
      name
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface SuspendUserInput {
  userId: string;
  reason: string;
  suspendedUntil?: string;
  suspendedBy: string;
}

export interface BanUserInput {
  userId: string;
  reason: string;
  bannedBy: string;
  permanent?: boolean;
}

export interface DeleteUserInput {
  userId: string;
  deleteContent?: boolean;
  anonymize?: boolean;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: Record<string, boolean>;
  priority?: number;
}

export interface WarnUserInput {
  userId: string;
  reason: string;
  warnedBy: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface ResolveReportInput {
  reportId: string;
  resolution: string;
  resolvedBy: string;
  actionTaken?: string;
}

export interface AuditLogInput {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface WebhookInput {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  enabled?: boolean;
}

export interface UserInviteInput {
  email: string;
  role?: string;
  invited_by: string;
  expires_at?: string;
}
