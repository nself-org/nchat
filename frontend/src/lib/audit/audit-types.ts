/**
 * Audit Log Types - TypeScript type definitions for the audit logging system
 *
 * This module defines all types used throughout the audit logging system,
 * including event categories, actions, and log entry structures.
 */

// ============================================================================
// Event Categories
// ============================================================================

export type AuditCategory =
  | "user"
  | "message"
  | "channel"
  | "file"
  | "attachment"
  | "moderation"
  | "admin"
  | "security"
  | "integration";

// ============================================================================
// Event Actions by Category
// ============================================================================

export type UserAction =
  | "login"
  | "logout"
  | "signup"
  | "password_change"
  | "password_reset"
  | "profile_update"
  | "avatar_update"
  | "email_change"
  | "username_change"
  | "account_deactivate"
  | "account_reactivate";

export type MessageAction =
  | "create"
  | "edit"
  | "delete"
  | "pin"
  | "unpin"
  | "reply"
  | "mention"
  | "bulk_delete"
  | "forward"
  | "send_scheduled";

export type ChannelAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "unarchive"
  | "member_add"
  | "member_remove"
  | "member_role_change"
  | "topic_change"
  | "description_change"
  | "visibility_change";

export type FileAction =
  | "upload"
  | "download"
  | "delete"
  | "share"
  | "unshare"
  | "preview"
  | "rename"
  | "access";

export type AdminAction =
  | "role_change"
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "role_assigned"
  | "role_unassigned"
  | "permission_change"
  | "settings_change"
  | "user_ban"
  | "user_unban"
  | "user_kick"
  | "user_mute"
  | "user_unmute"
  | "config_update"
  | "feature_toggle"
  | "audit_settings_change"
  | "retention_policy_change"
  | "bulk_user_action";

export type SecurityAction =
  | "failed_login"
  | "suspicious_activity"
  | "api_key_create"
  | "api_key_revoke"
  | "api_key_use"
  | "webhook_create"
  | "webhook_delete"
  | "webhook_update"
  | "session_invalidate"
  | "mfa_enable"
  | "mfa_disable"
  | "ip_blocked"
  | "rate_limit_exceeded"
  | "sso_connection_created"
  | "sso_connection_updated"
  | "sso_connection_deleted"
  | "sso_login_initiated"
  | "sso_login_success"
  | "sso_login_failed"
  | "sso_logout_request_created"
  | "sso_logout_response_processed";

export type IntegrationAction =
  | "app_install"
  | "app_uninstall"
  | "app_configure"
  | "bot_create"
  | "bot_delete"
  | "bot_configure"
  | "oauth_authorize"
  | "oauth_revoke"
  | "sync_start"
  | "sync_complete"
  | "sync_failed";

export type ModerationAction =
  | "content_flagged"
  | "content_deleted"
  | "content_hidden"
  | "user_warned"
  | "user_muted"
  | "user_banned"
  | "user_shadowbanned"
  | "moderation_action_reversed"
  | "appeal_submitted"
  | "appeal_assigned"
  | "appeal_resolved"
  | "appeal_withdrawn";

export type AuditAction =
  | UserAction
  | MessageAction
  | ChannelAction
  | FileAction
  | AdminAction
  | SecurityAction
  | IntegrationAction
  | ModerationAction;

// ============================================================================
// Severity Levels
// ============================================================================

export type AuditSeverity = "info" | "warning" | "error" | "critical";

// ============================================================================
// Actor Types
// ============================================================================

export type ActorType =
  | "user"
  | "system"
  | "bot"
  | "integration"
  | "anonymous"
  | "admin"
  | "moderator";

export interface AuditActor {
  id: string;
  type: ActorType;
  email?: string;
  username?: string;
  displayName?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ============================================================================
// Resource Types
// ============================================================================

export type ResourceType =
  | "user"
  | "message"
  | "channel"
  | "file"
  | "attachment"
  | "scheduled_message"
  | "role"
  | "permission"
  | "setting"
  | "api_key"
  | "webhook"
  | "integration"
  | "bot"
  | "session";

export interface AuditResource {
  type: ResourceType;
  id: string;
  name?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Audit Log Entry
// ============================================================================

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  category: AuditCategory;
  action: AuditAction;
  severity: AuditSeverity;
  actor: AuditActor;
  resource?: AuditResource;
  target?: AuditResource;
  description: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  // Location data
  ipAddress?: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  // Request context
  requestId?: string;
  correlationId?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface AuditLogFilters {
  category?: AuditCategory[];
  action?: AuditAction[];
  severity?: AuditSeverity[];
  actorId?: string;
  actorType?: ActorType;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  searchQuery?: string;
  ipAddress?: string;
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuditLogSortOptions {
  field: "timestamp" | "category" | "action" | "severity" | "actor";
  direction: "asc" | "desc";
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = "csv" | "json" | "xlsx";

export interface AuditExportOptions {
  format: ExportFormat;
  filters?: AuditLogFilters;
  includeMetadata?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  fields?: (keyof AuditLogEntry)[];
}

export interface AuditExportResult {
  filename: string;
  data: string | Blob;
  mimeType: string;
  recordCount: number;
}

// ============================================================================
// Retention Policy
// ============================================================================

export interface AuditRetentionPolicy {
  id: string;
  name: string;
  enabled: boolean;
  retentionDays: number;
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  archiveEnabled: boolean;
  archiveLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditSettings {
  enabled: boolean;
  defaultRetentionDays: number;
  maxRetentionDays: number;
  minRetentionDays: number;
  archiveEnabled: boolean;
  archiveLocation?: string;
  realTimeEnabled: boolean;
  sensitiveFieldMasking: boolean;
  ipLoggingEnabled: boolean;
  geoLocationEnabled: boolean;
  policies: AuditRetentionPolicy[];
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface AuditStatistics {
  totalEvents: number;
  eventsByCategory: Record<AuditCategory, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByDay: { date: string; count: number }[];
  topActors: { actor: AuditActor; count: number }[];
  topActions: { action: AuditAction; count: number }[];
  failedEvents: number;
  successRate: number;
}

// ============================================================================
// Real-time Types
// ============================================================================

export interface AuditStreamEvent {
  type: "new" | "update" | "delete";
  entry: AuditLogEntry;
}

export type AuditStreamCallback = (event: AuditStreamEvent) => void;

// ============================================================================
// Helper Types
// ============================================================================

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  pagination: AuditLogPagination;
}

export interface AuditActionConfig {
  action: AuditAction;
  category: AuditCategory;
  defaultSeverity: AuditSeverity;
  description: string;
  requiresResource: boolean;
  sensitiveFields?: string[];
}

// Category and action display names
export const categoryDisplayNames: Record<AuditCategory, string> = {
  user: "User",
  message: "Message",
  channel: "Channel",
  file: "File",
  attachment: "Attachment",
  moderation: "Moderation",
  admin: "Admin",
  security: "Security",
  integration: "Integration",
};

export const severityDisplayNames: Record<AuditSeverity, string> = {
  info: "Info",
  warning: "Warning",
  error: "Error",
  critical: "Critical",
};

export const severityColors: Record<AuditSeverity, string> = {
  info: "#3B82F6",
  warning: "#F59E0B",
  error: "#EF4444",
  critical: "#DC2626",
};

export const categoryColors: Record<AuditCategory, string> = {
  user: "#3B82F6",
  message: "#10B981",
  channel: "#8B5CF6",
  file: "#F59E0B",
  attachment: "#F59E0B",
  moderation: "#EC4899",
  admin: "#EF4444",
  security: "#DC2626",
  integration: "#06B6D4",
};
