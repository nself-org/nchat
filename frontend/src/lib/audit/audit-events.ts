/**
 * Audit Events - Event type definitions and configurations
 *
 * This module defines all audit event types, their configurations,
 * and helper functions for event handling.
 */

import type {
  AuditAction,
  AuditActionConfig,
  AuditCategory,
  AuditSeverity,
} from "./audit-types";

// ============================================================================
// Event Configuration Registry
// ============================================================================

// @ts-expect-error - Partial implementation - some action configs are missing
export const auditEventConfigs: Record<AuditAction, AuditActionConfig> = {
  // User Events
  login: {
    action: "login",
    category: "user",
    defaultSeverity: "info",
    description: "User logged in",
    requiresResource: false,
  },
  logout: {
    action: "logout",
    category: "user",
    defaultSeverity: "info",
    description: "User logged out",
    requiresResource: false,
  },
  signup: {
    action: "signup",
    category: "user",
    defaultSeverity: "info",
    description: "New user signed up",
    requiresResource: true,
  },
  password_change: {
    action: "password_change",
    category: "user",
    defaultSeverity: "warning",
    description: "User changed their password",
    requiresResource: false,
    sensitiveFields: ["oldPassword", "newPassword"],
  },
  password_reset: {
    action: "password_reset",
    category: "user",
    defaultSeverity: "warning",
    description: "User reset their password",
    requiresResource: false,
    sensitiveFields: ["token"],
  },
  profile_update: {
    action: "profile_update",
    category: "user",
    defaultSeverity: "info",
    description: "User updated their profile",
    requiresResource: true,
  },
  avatar_update: {
    action: "avatar_update",
    category: "user",
    defaultSeverity: "info",
    description: "User updated their avatar",
    requiresResource: false,
  },
  email_change: {
    action: "email_change",
    category: "user",
    defaultSeverity: "warning",
    description: "User changed their email address",
    requiresResource: true,
    sensitiveFields: ["oldEmail", "newEmail"],
  },
  username_change: {
    action: "username_change",
    category: "user",
    defaultSeverity: "info",
    description: "User changed their username",
    requiresResource: true,
  },
  account_deactivate: {
    action: "account_deactivate",
    category: "user",
    defaultSeverity: "warning",
    description: "User account was deactivated",
    requiresResource: true,
  },
  account_reactivate: {
    action: "account_reactivate",
    category: "user",
    defaultSeverity: "info",
    description: "User account was reactivated",
    requiresResource: true,
  },

  // Message Events
  create: {
    action: "create",
    category: "message",
    defaultSeverity: "info",
    description: "Message created",
    requiresResource: true,
  },
  edit: {
    action: "edit",
    category: "message",
    defaultSeverity: "info",
    description: "Message edited",
    requiresResource: true,
  },
  delete: {
    action: "delete",
    category: "message",
    defaultSeverity: "info",
    description: "Message deleted",
    requiresResource: true,
  },
  pin: {
    action: "pin",
    category: "message",
    defaultSeverity: "info",
    description: "Message pinned",
    requiresResource: true,
  },
  unpin: {
    action: "unpin",
    category: "message",
    defaultSeverity: "info",
    description: "Message unpinned",
    requiresResource: true,
  },
  reply: {
    action: "reply",
    category: "message",
    defaultSeverity: "info",
    description: "Reply to message",
    requiresResource: true,
  },
  mention: {
    action: "mention",
    category: "message",
    defaultSeverity: "info",
    description: "User mentioned in message",
    requiresResource: true,
  },
  bulk_delete: {
    action: "bulk_delete",
    category: "message",
    defaultSeverity: "warning",
    description: "Multiple messages deleted",
    requiresResource: true,
  },

  // Channel Events
  // Note: For channel actions, we use different action names where they overlap with message actions
  // The category in AuditActionConfig differentiates them
  update: {
    action: "update",
    category: "channel",
    defaultSeverity: "info",
    description: "Channel updated",
    requiresResource: true,
  },
  archive: {
    action: "archive",
    category: "channel",
    defaultSeverity: "warning",
    description: "Channel archived",
    requiresResource: true,
  },
  unarchive: {
    action: "unarchive",
    category: "channel",
    defaultSeverity: "info",
    description: "Channel unarchived",
    requiresResource: true,
  },
  member_add: {
    action: "member_add",
    category: "channel",
    defaultSeverity: "info",
    description: "Member added to channel",
    requiresResource: true,
  },
  member_remove: {
    action: "member_remove",
    category: "channel",
    defaultSeverity: "info",
    description: "Member removed from channel",
    requiresResource: true,
  },
  member_role_change: {
    action: "member_role_change",
    category: "channel",
    defaultSeverity: "info",
    description: "Member role changed in channel",
    requiresResource: true,
  },
  topic_change: {
    action: "topic_change",
    category: "channel",
    defaultSeverity: "info",
    description: "Channel topic changed",
    requiresResource: true,
  },
  description_change: {
    action: "description_change",
    category: "channel",
    defaultSeverity: "info",
    description: "Channel description changed",
    requiresResource: true,
  },
  visibility_change: {
    action: "visibility_change",
    category: "channel",
    defaultSeverity: "warning",
    description: "Channel visibility changed",
    requiresResource: true,
  },

  // File Events
  upload: {
    action: "upload",
    category: "file",
    defaultSeverity: "info",
    description: "File uploaded",
    requiresResource: true,
  },
  download: {
    action: "download",
    category: "file",
    defaultSeverity: "info",
    description: "File downloaded",
    requiresResource: true,
  },
  share: {
    action: "share",
    category: "file",
    defaultSeverity: "info",
    description: "File shared",
    requiresResource: true,
  },
  unshare: {
    action: "unshare",
    category: "file",
    defaultSeverity: "info",
    description: "File sharing revoked",
    requiresResource: true,
  },
  preview: {
    action: "preview",
    category: "file",
    defaultSeverity: "info",
    description: "File previewed",
    requiresResource: true,
  },
  rename: {
    action: "rename",
    category: "file",
    defaultSeverity: "info",
    description: "File renamed",
    requiresResource: true,
  },

  // Admin Events
  role_change: {
    action: "role_change",
    category: "admin",
    defaultSeverity: "warning",
    description: "User role changed",
    requiresResource: true,
  },
  permission_change: {
    action: "permission_change",
    category: "admin",
    defaultSeverity: "warning",
    description: "Permission changed",
    requiresResource: true,
  },
  settings_change: {
    action: "settings_change",
    category: "admin",
    defaultSeverity: "info",
    description: "Settings changed",
    requiresResource: true,
  },
  user_ban: {
    action: "user_ban",
    category: "admin",
    defaultSeverity: "warning",
    description: "User banned",
    requiresResource: true,
  },
  user_unban: {
    action: "user_unban",
    category: "admin",
    defaultSeverity: "info",
    description: "User unbanned",
    requiresResource: true,
  },
  user_kick: {
    action: "user_kick",
    category: "admin",
    defaultSeverity: "warning",
    description: "User kicked",
    requiresResource: true,
  },
  user_mute: {
    action: "user_mute",
    category: "admin",
    defaultSeverity: "info",
    description: "User muted",
    requiresResource: true,
  },
  user_unmute: {
    action: "user_unmute",
    category: "admin",
    defaultSeverity: "info",
    description: "User unmuted",
    requiresResource: true,
  },
  config_update: {
    action: "config_update",
    category: "admin",
    defaultSeverity: "info",
    description: "App configuration updated",
    requiresResource: true,
  },
  feature_toggle: {
    action: "feature_toggle",
    category: "admin",
    defaultSeverity: "info",
    description: "Feature toggled",
    requiresResource: true,
  },
  audit_settings_change: {
    action: "audit_settings_change",
    category: "admin",
    defaultSeverity: "warning",
    description: "Audit settings changed",
    requiresResource: true,
  },
  retention_policy_change: {
    action: "retention_policy_change",
    category: "admin",
    defaultSeverity: "warning",
    description: "Retention policy changed",
    requiresResource: true,
  },
  bulk_user_action: {
    action: "bulk_user_action",
    category: "admin",
    defaultSeverity: "warning",
    description: "Bulk user action performed",
    requiresResource: true,
  },

  // Security Events
  failed_login: {
    action: "failed_login",
    category: "security",
    defaultSeverity: "warning",
    description: "Failed login attempt",
    requiresResource: false,
    sensitiveFields: ["password"],
  },
  suspicious_activity: {
    action: "suspicious_activity",
    category: "security",
    defaultSeverity: "critical",
    description: "Suspicious activity detected",
    requiresResource: false,
  },
  api_key_create: {
    action: "api_key_create",
    category: "security",
    defaultSeverity: "warning",
    description: "API key created",
    requiresResource: true,
    sensitiveFields: ["key"],
  },
  api_key_revoke: {
    action: "api_key_revoke",
    category: "security",
    defaultSeverity: "warning",
    description: "API key revoked",
    requiresResource: true,
  },
  api_key_use: {
    action: "api_key_use",
    category: "security",
    defaultSeverity: "info",
    description: "API key used",
    requiresResource: true,
  },
  webhook_create: {
    action: "webhook_create",
    category: "security",
    defaultSeverity: "info",
    description: "Webhook created",
    requiresResource: true,
    sensitiveFields: ["secret"],
  },
  webhook_delete: {
    action: "webhook_delete",
    category: "security",
    defaultSeverity: "info",
    description: "Webhook deleted",
    requiresResource: true,
  },
  webhook_update: {
    action: "webhook_update",
    category: "security",
    defaultSeverity: "info",
    description: "Webhook updated",
    requiresResource: true,
    sensitiveFields: ["secret"],
  },
  session_invalidate: {
    action: "session_invalidate",
    category: "security",
    defaultSeverity: "warning",
    description: "Session invalidated",
    requiresResource: true,
  },
  mfa_enable: {
    action: "mfa_enable",
    category: "security",
    defaultSeverity: "info",
    description: "MFA enabled",
    requiresResource: false,
    sensitiveFields: ["secret", "backupCodes"],
  },
  mfa_disable: {
    action: "mfa_disable",
    category: "security",
    defaultSeverity: "warning",
    description: "MFA disabled",
    requiresResource: false,
  },
  ip_blocked: {
    action: "ip_blocked",
    category: "security",
    defaultSeverity: "warning",
    description: "IP address blocked",
    requiresResource: false,
  },
  rate_limit_exceeded: {
    action: "rate_limit_exceeded",
    category: "security",
    defaultSeverity: "warning",
    description: "Rate limit exceeded",
    requiresResource: false,
  },

  // Integration Events
  app_install: {
    action: "app_install",
    category: "integration",
    defaultSeverity: "info",
    description: "App installed",
    requiresResource: true,
  },
  app_uninstall: {
    action: "app_uninstall",
    category: "integration",
    defaultSeverity: "info",
    description: "App uninstalled",
    requiresResource: true,
  },
  app_configure: {
    action: "app_configure",
    category: "integration",
    defaultSeverity: "info",
    description: "App configured",
    requiresResource: true,
    sensitiveFields: ["apiKey", "secret"],
  },
  bot_create: {
    action: "bot_create",
    category: "integration",
    defaultSeverity: "info",
    description: "Bot created",
    requiresResource: true,
    sensitiveFields: ["token"],
  },
  bot_delete: {
    action: "bot_delete",
    category: "integration",
    defaultSeverity: "info",
    description: "Bot deleted",
    requiresResource: true,
  },
  bot_configure: {
    action: "bot_configure",
    category: "integration",
    defaultSeverity: "info",
    description: "Bot configured",
    requiresResource: true,
    sensitiveFields: ["token"],
  },
  oauth_authorize: {
    action: "oauth_authorize",
    category: "integration",
    defaultSeverity: "info",
    description: "OAuth authorization granted",
    requiresResource: true,
    sensitiveFields: ["accessToken", "refreshToken"],
  },
  oauth_revoke: {
    action: "oauth_revoke",
    category: "integration",
    defaultSeverity: "info",
    description: "OAuth authorization revoked",
    requiresResource: true,
  },
  sync_start: {
    action: "sync_start",
    category: "integration",
    defaultSeverity: "info",
    description: "Sync started",
    requiresResource: true,
  },
  sync_complete: {
    action: "sync_complete",
    category: "integration",
    defaultSeverity: "info",
    description: "Sync completed",
    requiresResource: true,
  },
  sync_failed: {
    action: "sync_failed",
    category: "integration",
    defaultSeverity: "error",
    description: "Sync failed",
    requiresResource: true,
  },

  // Role Management Events (Admin)
  role_created: {
    action: "role_created",
    category: "admin",
    defaultSeverity: "info",
    description: "New role created",
    requiresResource: true,
  },
  role_updated: {
    action: "role_updated",
    category: "admin",
    defaultSeverity: "info",
    description: "Role updated",
    requiresResource: true,
  },
  role_deleted: {
    action: "role_deleted",
    category: "admin",
    defaultSeverity: "warning",
    description: "Role deleted",
    requiresResource: true,
  },
  role_assigned: {
    action: "role_assigned",
    category: "admin",
    defaultSeverity: "info",
    description: "Role assigned to user",
    requiresResource: true,
  },
  role_unassigned: {
    action: "role_unassigned",
    category: "admin",
    defaultSeverity: "info",
    description: "Role unassigned from user",
    requiresResource: true,
  },

  // SSO Events (Security)
  sso_connection_created: {
    action: "sso_connection_created",
    category: "security",
    defaultSeverity: "info",
    description: "SSO connection created",
    requiresResource: true,
  },
  sso_connection_updated: {
    action: "sso_connection_updated",
    category: "security",
    defaultSeverity: "info",
    description: "SSO connection updated",
    requiresResource: true,
  },
  sso_connection_deleted: {
    action: "sso_connection_deleted",
    category: "security",
    defaultSeverity: "warning",
    description: "SSO connection deleted",
    requiresResource: true,
  },
  sso_login_initiated: {
    action: "sso_login_initiated",
    category: "security",
    defaultSeverity: "info",
    description: "SSO login initiated",
    requiresResource: false,
  },
  sso_login_success: {
    action: "sso_login_success",
    category: "security",
    defaultSeverity: "info",
    description: "SSO login successful",
    requiresResource: false,
  },
  sso_login_failed: {
    action: "sso_login_failed",
    category: "security",
    defaultSeverity: "warning",
    description: "SSO login failed",
    requiresResource: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the configuration for a specific audit action
 */
export function getAuditEventConfig(action: AuditAction): AuditActionConfig {
  return auditEventConfigs[action];
}

/**
 * Get all actions for a specific category
 */
export function getActionsByCategory(category: AuditCategory): AuditAction[] {
  return Object.values(auditEventConfigs)
    .filter((config) => config.category === category)
    .map((config) => config.action);
}

/**
 * Get the default severity for an action
 */
export function getDefaultSeverity(action: AuditAction): AuditSeverity {
  return auditEventConfigs[action]?.defaultSeverity ?? "info";
}

/**
 * Get the category for an action
 */
export function getCategoryForAction(action: AuditAction): AuditCategory {
  return auditEventConfigs[action]?.category ?? "user";
}

/**
 * Check if an action has sensitive fields
 */
export function hasSensitiveFields(action: AuditAction): boolean {
  const config = auditEventConfigs[action];
  return (
    config?.sensitiveFields !== undefined && config.sensitiveFields.length > 0
  );
}

/**
 * Get sensitive fields for an action
 */
export function getSensitiveFields(action: AuditAction): string[] {
  return auditEventConfigs[action]?.sensitiveFields ?? [];
}

/**
 * Get all security-related actions
 */
export function getSecurityActions(): AuditAction[] {
  return getActionsByCategory("security");
}

/**
 * Get all admin actions
 */
export function getAdminActions(): AuditAction[] {
  return getActionsByCategory("admin");
}

/**
 * Check if an action is high severity (warning, error, or critical)
 */
export function isHighSeverityAction(action: AuditAction): boolean {
  const severity = getDefaultSeverity(action);
  return (
    severity === "warning" || severity === "error" || severity === "critical"
  );
}

/**
 * Get human-readable action name
 */
export function getActionDisplayName(action: AuditAction): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================================================
// Event Templates
// ============================================================================

export const eventDescriptionTemplates: Partial<Record<AuditAction, string>> = {
  login: "{actor} logged in",
  logout: "{actor} logged out",
  signup: "{actor} signed up",
  password_change: "{actor} changed their password",
  password_reset: "{actor} reset their password",
  profile_update: "{actor} updated their profile",
  create: "{actor} created a message in {channel}",
  edit: "{actor} edited a message in {channel}",
  delete: "{actor} deleted a message in {channel}",
  pin: "{actor} pinned a message in {channel}",
  unpin: "{actor} unpinned a message in {channel}",
  member_add: "{actor} added {target} to {channel}",
  member_remove: "{actor} removed {target} from {channel}",
  role_change: "{actor} changed {target} role from {oldRole} to {newRole}",
  user_ban: "{actor} banned {target}",
  user_unban: "{actor} unbanned {target}",
  failed_login: "Failed login attempt for {email}",
  api_key_create: "{actor} created an API key",
  api_key_revoke: "{actor} revoked an API key",
  app_install: "{actor} installed {app}",
  app_uninstall: "{actor} uninstalled {app}",
  bot_create: "{actor} created bot {bot}",
};
