/**
 * Message Edit History Permissions
 *
 * Utilities for checking who can view and manage message edit history.
 */

import type { UserRole } from "@/lib/auth/roles";
import type {
  HistoryViewPermission,
  EditHistorySettings,
} from "./history-types";
import type { MessageUser } from "@/types/message";

// ============================================================================
// Role Hierarchy
// ============================================================================

const ROLE_LEVELS: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role] ?? 0;
}

function hasRoleOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

// ============================================================================
// View Permission Checks
// ============================================================================

/**
 * Check if a user can view edit history for a message.
 */
export function canViewEditHistory(
  viewPermission: HistoryViewPermission,
  userRole: UserRole,
  userId: string,
  messageAuthorId: string,
): boolean {
  switch (viewPermission) {
    case "everyone":
      return true;

    case "author-only":
      return userId === messageAuthorId;

    case "moderators":
      return (
        hasRoleOrHigher(userRole, "moderator") || userId === messageAuthorId
      );

    case "admins":
      return hasRoleOrHigher(userRole, "admin") || userId === messageAuthorId;

    case "disabled":
      return false;

    default:
      return false;
  }
}

/**
 * Check if a user can view edit history based on settings.
 */
export function canViewHistoryWithSettings(
  settings: EditHistorySettings,
  userRole: UserRole,
  userId: string,
  messageAuthorId: string,
): boolean {
  if (!settings.trackingEnabled) return false;

  return canViewEditHistory(
    settings.viewPermission,
    userRole,
    userId,
    messageAuthorId,
  );
}

// ============================================================================
// Admin Permission Checks
// ============================================================================

/**
 * Check if a user can restore a previous version.
 */
export function canRestoreVersion(
  settings: EditHistorySettings,
  userRole: UserRole,
  userId: string,
  messageAuthorId: string,
): boolean {
  if (!settings.allowVersionRestore) return false;

  // Must be admin or higher
  if (hasRoleOrHigher(userRole, "admin")) return true;

  // Or the message author can restore their own message
  if (userId === messageAuthorId) return true;

  return false;
}

/**
 * Check if a user can clear edit history.
 */
export function canClearHistory(
  settings: EditHistorySettings,
  userRole: UserRole,
): boolean {
  if (!settings.allowHistoryClear) return false;

  // Only admins and owners can clear history
  return hasRoleOrHigher(userRole, "admin");
}

/**
 * Check if a user can delete specific versions.
 */
export function canDeleteVersions(
  userRole: UserRole,
  userId: string,
  messageAuthorId: string,
): boolean {
  // Admin or higher can delete any versions
  if (hasRoleOrHigher(userRole, "admin")) return true;

  // Authors can delete versions of their own messages (moderator+)
  if (userId === messageAuthorId && hasRoleOrHigher(userRole, "moderator")) {
    return true;
  }

  return false;
}

/**
 * Check if a user can access admin history tools.
 */
export function canAccessAdminHistoryTools(userRole: UserRole): boolean {
  return hasRoleOrHigher(userRole, "admin");
}

/**
 * Check if a user can modify history settings.
 */
export function canModifyHistorySettings(userRole: UserRole): boolean {
  return hasRoleOrHigher(userRole, "admin");
}

// ============================================================================
// Bulk Permission Checks
// ============================================================================

/**
 * Check multiple history permissions at once.
 */
export interface HistoryPermissions {
  canView: boolean;
  canRestore: boolean;
  canClear: boolean;
  canDeleteVersions: boolean;
  canAccessAdmin: boolean;
  canModifySettings: boolean;
}

export function getHistoryPermissions(
  settings: EditHistorySettings,
  userRole: UserRole,
  userId: string,
  messageAuthorId: string,
): HistoryPermissions {
  return {
    canView: canViewHistoryWithSettings(
      settings,
      userRole,
      userId,
      messageAuthorId,
    ),
    canRestore: canRestoreVersion(settings, userRole, userId, messageAuthorId),
    canClear: canClearHistory(settings, userRole),
    canDeleteVersions: canDeleteVersions(userRole, userId, messageAuthorId),
    canAccessAdmin: canAccessAdminHistoryTools(userRole),
    canModifySettings: canModifyHistorySettings(userRole),
  };
}

// ============================================================================
// Permission Descriptions
// ============================================================================

/**
 * Get human-readable description of view permission level.
 */
export function getViewPermissionDescription(
  permission: HistoryViewPermission,
): string {
  switch (permission) {
    case "everyone":
      return "All users can view edit history";
    case "author-only":
      return "Only message authors can view their edit history";
    case "moderators":
      return "Moderators and above can view all edit history";
    case "admins":
      return "Only admins and owners can view edit history";
    case "disabled":
      return "Edit history viewing is disabled";
    default:
      return "Unknown permission level";
  }
}

/**
 * Get available view permission options for UI.
 */
export function getViewPermissionOptions(): Array<{
  value: HistoryViewPermission;
  label: string;
  description: string;
}> {
  return [
    {
      value: "everyone",
      label: "Everyone",
      description: "All users can view edit history for any message",
    },
    {
      value: "author-only",
      label: "Author Only",
      description: "Users can only view edit history for their own messages",
    },
    {
      value: "moderators",
      label: "Moderators+",
      description: "Moderators, admins, and owners can view all edit history",
    },
    {
      value: "admins",
      label: "Admins Only",
      description: "Only admins and owners can view edit history",
    },
    {
      value: "disabled",
      label: "Disabled",
      description: "No one can view edit history (still tracked)",
    },
  ];
}

// ============================================================================
// Permission Context
// ============================================================================

/**
 * Context for permission checks.
 */
export interface PermissionContext {
  userId: string;
  userRole: UserRole;
  settings: EditHistorySettings;
}

/**
 * Create a permission checker function for a specific context.
 */
export function createPermissionChecker(context: PermissionContext) {
  const { userId, userRole, settings } = context;

  return {
    canViewHistory: (messageAuthorId: string) =>
      canViewHistoryWithSettings(settings, userRole, userId, messageAuthorId),

    canRestore: (messageAuthorId: string) =>
      canRestoreVersion(settings, userRole, userId, messageAuthorId),

    canClear: () => canClearHistory(settings, userRole),

    canDeleteVersions: (messageAuthorId: string) =>
      canDeleteVersions(userRole, userId, messageAuthorId),

    canAccessAdmin: () => canAccessAdminHistoryTools(userRole),

    canModifySettings: () => canModifyHistorySettings(userRole),

    getAllPermissions: (messageAuthorId: string) =>
      getHistoryPermissions(settings, userRole, userId, messageAuthorId),
  };
}

// ============================================================================
// Audit Helpers
// ============================================================================

/**
 * Generate audit log entry for history action.
 */
export interface HistoryAuditEntry {
  action: string;
  messageId: string;
  userId: string;
  userRole: UserRole;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export function createAuditEntry(
  action: string,
  messageId: string,
  user: MessageUser,
): HistoryAuditEntry {
  return {
    action,
    messageId,
    userId: user.id,
    userRole: (user.role as UserRole) ?? "member",
    timestamp: new Date(),
  };
}

export function formatAuditAction(entry: HistoryAuditEntry): string {
  const timeStr = entry.timestamp.toLocaleString();
  return `[${timeStr}] ${entry.userRole} "${entry.userId}" performed "${entry.action}" on message ${entry.messageId}`;
}
