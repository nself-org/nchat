/**
 * Audit Types for nself-chat
 *
 * Type definitions for audit logs, compliance tracking, and security events.
 * Supports comprehensive activity monitoring and regulatory compliance.
 */

import type { UserBasicInfo } from "./user";

// ============================================================================
// Audit Action Types
// ============================================================================

/**
 * Audit action categories.
 */
export type AuditActionCategory =
  | "authentication"
  | "user_management"
  | "channel_management"
  | "message_management"
  | "moderation"
  | "settings"
  | "billing"
  | "integration"
  | "security";

/**
 * Authentication actions.
 */
export type AuthenticationAction =
  | "login"
  | "logout"
  | "login_failed"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_verified"
  | "mfa_failed"
  | "session_created"
  | "session_revoked"
  | "api_key_created"
  | "api_key_revoked";

/**
 * User management actions.
 */
export type UserManagementAction =
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "user_activated"
  | "user_deactivated"
  | "user_suspended"
  | "user_unsuspended"
  | "role_assigned"
  | "role_removed"
  | "permission_granted"
  | "permission_revoked"
  | "profile_updated"
  | "avatar_changed"
  | "email_changed"
  | "email_verified";

/**
 * Channel management actions.
 */
export type ChannelManagementAction =
  | "channel_created"
  | "channel_updated"
  | "channel_deleted"
  | "channel_archived"
  | "channel_unarchived"
  | "member_added"
  | "member_removed"
  | "member_role_changed"
  | "member_invited"
  | "invite_accepted"
  | "invite_rejected"
  | "invite_expired"
  | "category_created"
  | "category_updated"
  | "category_deleted";

/**
 * Message management actions.
 */
export type MessageManagementAction =
  | "message_sent"
  | "message_edited"
  | "message_deleted"
  | "message_restored"
  | "message_pinned"
  | "message_unpinned"
  | "reaction_added"
  | "reaction_removed"
  | "thread_created"
  | "thread_archived"
  | "thread_locked"
  | "thread_unlocked"
  | "file_uploaded"
  | "file_deleted";

/**
 * Moderation actions.
 */
export type ModerationAction =
  | "user_warned"
  | "user_mute"
  | "user_muted"
  | "user_unmuted"
  | "user_kicked"
  | "user_banned"
  | "user_unbanned"
  | "user_shadowbanned"
  | "message_flagged"
  | "message_hidden"
  | "content_flagged"
  | "content_deleted"
  | "content_hidden"
  | "content_reported"
  | "report_resolved"
  | "filter_triggered"
  | "spam_detected"
  | "rate_limit_applied"
  | "moderation_action_reversed";

/**
 * Settings actions.
 */
export type SettingsAction =
  | "workspace_settings_updated"
  | "notification_settings_updated"
  | "privacy_settings_updated"
  | "theme_changed"
  | "branding_updated"
  | "feature_enabled"
  | "feature_disabled"
  | "export_requested"
  | "export_completed"
  | "data_deleted";

/**
 * Billing actions.
 */
export type BillingAction =
  | "plan_changed"
  | "subscription_created"
  | "subscription_canceled"
  | "subscription_renewed"
  | "payment_method_added"
  | "payment_method_removed"
  | "payment_succeeded"
  | "payment_failed"
  | "invoice_generated"
  | "refund_issued";

/**
 * Integration actions.
 */
export type IntegrationAction =
  | "integration_connected"
  | "integration_disconnected"
  | "integration_configured"
  | "webhook_created"
  | "webhook_deleted"
  | "webhook_triggered"
  | "bot_installed"
  | "bot_uninstalled"
  | "bot_authorized"
  | "api_called";

/**
 * Security actions.
 */
export type SecurityAction =
  | "suspicious_activity_detected"
  | "ip_blocked"
  | "ip_unblocked"
  | "account_locked"
  | "account_unlocked"
  | "data_accessed"
  | "permission_escalation_attempt"
  | "invalid_token_used"
  | "rate_limit_exceeded"
  | "security_alert_triggered";

/**
 * All audit actions union type.
 */
export type AuditAction =
  | AuthenticationAction
  | UserManagementAction
  | ChannelManagementAction
  | MessageManagementAction
  | ModerationAction
  | SettingsAction
  | BillingAction
  | IntegrationAction
  | SecurityAction;

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Audit log severity levels.
 */
export type AuditSeverity = "low" | "medium" | "high" | "critical";

/**
 * Audit log entry.
 */
export interface AuditLog {
  /** Unique audit log identifier */
  id: string;
  /** Workspace ID (null for system-wide) */
  workspaceId: string | null;

  // Action details
  /** Action performed */
  action: AuditAction;
  /** Action category */
  category: AuditActionCategory;
  /** Severity level */
  severity: AuditSeverity;

  // Actor information
  /** User who performed the action */
  actorId: string | null;
  /** Actor details (cached) */
  actor: UserBasicInfo | null;
  /** Actor type */
  actorType: "user" | "system" | "bot" | "api" | "webhook";

  // Target information
  /** Entity type affected */
  entityType: AuditEntityType;
  /** Entity ID affected */
  entityId: string | null;
  /** Target user ID (if applicable) */
  targetUserId: string | null;
  /** Target user details (cached) */
  targetUser: UserBasicInfo | null;
  /** Channel ID (if applicable) */
  channelId: string | null;

  // Change details
  /** Previous values (for updates) */
  previousValues: Record<string, unknown> | null;
  /** New values (for creates/updates) */
  newValues: Record<string, unknown> | null;
  /** Change summary */
  changeSummary: string | null;

  // Additional context
  /** Human-readable description */
  description: string;
  /** Additional metadata */
  metadata: AuditMetadata;

  // Request information
  /** Client IP address */
  ipAddress: string | null;
  /** User agent string */
  userAgent: string | null;
  /** Geolocation (from IP) */
  location: AuditLocation | null;
  /** Request correlation ID */
  requestId: string | null;
  /** Session ID */
  sessionId: string | null;

  // Status
  /** Action result */
  result: "success" | "failure" | "partial";
  /** Error message (if failed) */
  errorMessage: string | null;

  /** Log creation timestamp */
  createdAt: Date;
}

/**
 * Audit entity types.
 */
export type AuditEntityType =
  | "user"
  | "workspace"
  | "channel"
  | "message"
  | "thread"
  | "role"
  | "permission"
  | "integration"
  | "webhook"
  | "bot"
  | "subscription"
  | "invoice"
  | "settings"
  | "file"
  | "api_key"
  | "session"
  | "report";

/**
 * Audit metadata.
 */
export interface AuditMetadata {
  /** Device type */
  deviceType?: "desktop" | "mobile" | "tablet" | "api";
  /** Browser name */
  browser?: string;
  /** Operating system */
  os?: string;
  /** API version (for API calls) */
  apiVersion?: string;
  /** Integration name (for integration events) */
  integrationName?: string;
  /** Bot name (for bot events) */
  botName?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Audit geolocation.
 */
export interface AuditLocation {
  /** Country code (ISO 3166-1 alpha-2) */
  country: string | null;
  /** Country name */
  countryName: string | null;
  /** Region/state */
  region: string | null;
  /** City */
  city: string | null;
  /** Latitude */
  latitude: number | null;
  /** Longitude */
  longitude: number | null;
  /** Timezone */
  timezone: string | null;
}

// ============================================================================
// Audit Query Types
// ============================================================================

/**
 * Audit log filter options.
 */
export interface AuditLogFilter {
  /** Filter by workspace ID */
  workspaceId?: string;
  /** Filter by actions */
  actions?: AuditAction[];
  /** Filter by categories */
  categories?: AuditActionCategory[];
  /** Filter by severity levels */
  severities?: AuditSeverity[];
  /** Filter by actor ID */
  actorId?: string;
  /** Filter by target user ID */
  targetUserId?: string;
  /** Filter by entity type */
  entityType?: AuditEntityType;
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by channel ID */
  channelId?: string;
  /** Filter by result */
  result?: "success" | "failure" | "partial";
  /** Filter by date range start */
  dateFrom?: Date;
  /** Filter by date range end */
  dateTo?: Date;
  /** Filter by IP address */
  ipAddress?: string;
  /** Search in description */
  search?: string;
}

/**
 * Audit log sort options.
 */
export interface AuditLogSortOptions {
  /** Sort field */
  sortBy: "createdAt" | "severity" | "action" | "category";
  /** Sort direction */
  sortOrder: "asc" | "desc";
}

/**
 * Audit log search result.
 */
export interface AuditLogSearchResult {
  /** Audit logs */
  logs: AuditLog[];
  /** Total count */
  totalCount: number;
  /** Page info */
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

// ============================================================================
// Audit Statistics Types
// ============================================================================

/**
 * Audit statistics summary.
 */
export interface AuditStatistics {
  /** Workspace ID */
  workspaceId: string | null;
  /** Time range */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** Total events */
  totalEvents: number;
  /** Events by category */
  byCategory: Record<AuditActionCategory, number>;
  /** Events by severity */
  bySeverity: Record<AuditSeverity, number>;
  /** Events by result */
  byResult: {
    success: number;
    failure: number;
    partial: number;
  };
  /** Top actors */
  topActors: Array<{
    actor: UserBasicInfo | null;
    eventCount: number;
  }>;
  /** Most common actions */
  topActions: Array<{
    action: AuditAction;
    count: number;
  }>;
  /** Events by day */
  eventsByDay: Array<{
    date: string;
    count: number;
  }>;
  /** Security incidents */
  securityIncidents: number;
}

/**
 * User activity summary.
 */
export interface UserActivitySummary {
  /** User ID */
  userId: string;
  /** User details */
  user: UserBasicInfo;
  /** Time range */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** Total actions */
  totalActions: number;
  /** Actions by category */
  actionsByCategory: Record<AuditActionCategory, number>;
  /** Login count */
  loginCount: number;
  /** Last login */
  lastLogin: Date | null;
  /** Unique IPs used */
  uniqueIps: string[];
  /** Unique devices */
  uniqueDevices: string[];
  /** Failed login attempts */
  failedLoginAttempts: number;
  /** Security alerts */
  securityAlerts: number;
}

// ============================================================================
// Audit Export Types
// ============================================================================

/**
 * Audit export format.
 */
export type AuditExportFormat = "json" | "csv" | "pdf";

/**
 * Audit export request.
 */
export interface AuditExportRequest {
  /** Export format */
  format: AuditExportFormat;
  /** Filter criteria */
  filter: AuditLogFilter;
  /** Fields to include */
  fields?: (keyof AuditLog)[];
  /** Include metadata */
  includeMetadata?: boolean;
  /** Date range required */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Delivery method */
  delivery: "download" | "email";
  /** Email address (if delivery === 'email') */
  email?: string;
}

/**
 * Audit export status.
 */
export interface AuditExportStatus {
  /** Export ID */
  id: string;
  /** Request details */
  request: AuditExportRequest;
  /** Status */
  status: "pending" | "processing" | "completed" | "failed";
  /** Progress percentage */
  progress: number;
  /** Total records */
  totalRecords: number;
  /** Processed records */
  processedRecords: number;
  /** Download URL (when completed) */
  downloadUrl: string | null;
  /** Error message (if failed) */
  errorMessage: string | null;
  /** Created timestamp */
  createdAt: Date;
  /** Completed timestamp */
  completedAt: Date | null;
  /** Expires at */
  expiresAt: Date | null;
}

// ============================================================================
// Security Event Types
// ============================================================================

/**
 * Security event.
 */
export interface SecurityEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: SecurityAction;
  /** Severity */
  severity: AuditSeverity;
  /** Description */
  description: string;
  /** User ID (if known) */
  userId: string | null;
  /** User details */
  user: UserBasicInfo | null;
  /** IP address */
  ipAddress: string | null;
  /** Location */
  location: AuditLocation | null;
  /** Threat indicators */
  indicators: SecurityIndicator[];
  /** Recommended actions */
  recommendations: string[];
  /** Is resolved */
  isResolved: boolean;
  /** Resolution notes */
  resolutionNotes: string | null;
  /** Resolved by */
  resolvedBy: string | null;
  /** Resolved at */
  resolvedAt: Date | null;
  /** Created at */
  createdAt: Date;
}

/**
 * Security threat indicator.
 */
export interface SecurityIndicator {
  /** Indicator type */
  type: "ip" | "user_agent" | "behavior" | "pattern" | "location";
  /** Indicator value */
  value: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Description */
  description: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get action category.
 */
export function getActionCategory(action: AuditAction): AuditActionCategory {
  const categoryMap: Record<string, AuditActionCategory> = {
    login: "authentication",
    logout: "authentication",
    login_failed: "authentication",
    password_changed: "authentication",
    mfa_enabled: "authentication",
    user_created: "user_management",
    user_updated: "user_management",
    channel_created: "channel_management",
    channel_updated: "channel_management",
    message_sent: "message_management",
    message_deleted: "message_management",
    user_banned: "moderation",
    user_muted: "moderation",
    workspace_settings_updated: "settings",
    plan_changed: "billing",
    integration_connected: "integration",
    suspicious_activity_detected: "security",
  };

  return categoryMap[action] || "security";
}

/**
 * Get severity label.
 */
export function getSeverityLabel(severity: AuditSeverity): string {
  const labels: Record<AuditSeverity, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };
  return labels[severity];
}

/**
 * Get severity color.
 */
export function getSeverityColor(severity: AuditSeverity): string {
  const colors: Record<AuditSeverity, string> = {
    low: "gray",
    medium: "yellow",
    high: "orange",
    critical: "red",
  };
  return colors[severity];
}

/**
 * Format audit log for display.
 */
export function formatAuditDescription(log: AuditLog): string {
  const actor = log.actor?.displayName || log.actorId || "System";
  const target = log.targetUser?.displayName || log.entityId || "";

  // Build description based on action
  switch (log.action) {
    case "login":
      return `${actor} logged in`;
    case "logout":
      return `${actor} logged out`;
    case "user_created":
      return `${actor} created user ${target}`;
    case "user_banned":
      return `${actor} banned ${target}`;
    case "channel_created":
      return `${actor} created a new channel`;
    case "message_deleted":
      return `${actor} deleted a message`;
    default:
      return log.description;
  }
}

/**
 * Check if action is security-sensitive.
 */
export function isSecuritySensitive(action: AuditAction): boolean {
  const sensitiveActions: AuditAction[] = [
    "login_failed",
    "password_changed",
    "password_reset_requested",
    "mfa_disabled",
    "user_banned",
    "user_suspended",
    "permission_escalation_attempt",
    "invalid_token_used",
    "suspicious_activity_detected",
    "security_alert_triggered",
  ];
  return sensitiveActions.includes(action);
}
