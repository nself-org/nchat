/**
 * usePermissions Hook
 *
 * Hook for checking user permissions.
 * Provides utilities for permission-based access control in components.
 */

"use client";

import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  type Permission,
  PERMISSIONS,
  PERMISSION_GROUPS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  getPermissionDescription,
  getMinimumRoleForPermission,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/roles";

export interface UsePermissionsReturn {
  /** All permissions the current user has */
  permissions: Permission[];

  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;

  /** Check if user has all of the specified permissions */
  canAll: (permissions: Permission[]) => boolean;

  /** Check if user has any of the specified permissions */
  canAny: (permissions: Permission[]) => boolean;

  /** Get description for a permission */
  getDescription: (permission: Permission) => string;

  /** Check if user is authenticated */
  isAuthenticated: boolean;

  /** User's role (null if not authenticated) */
  role: UserRole | null;

  // Common permission checks (shortcuts)
  /** Can user send messages */
  canSendMessages: boolean;
  /** Can user create channels */
  canCreateChannels: boolean;
  /** Can user delete any message */
  canDeleteAnyMessage: boolean;
  /** Can user manage users */
  canManageUsers: boolean;
  /** Can user access admin dashboard */
  canAccessAdmin: boolean;
  /** Can user moderate content */
  canModerate: boolean;
  /** Can user configure system */
  canConfigureSystem: boolean;
}

/**
 * Hook for checking user permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const role = user?.role ?? null;

  // Get all permissions for the user's role
  const permissions = useMemo(
    () => (role ? getPermissionsForRole(role) : []),
    [role],
  );

  // Memoized permission check functions
  const can = useCallback(
    (permission: Permission) =>
      role ? hasPermission(role, permission) : false,
    [role],
  );

  const canAll = useCallback(
    (perms: Permission[]) => (role ? hasAllPermissions(role, perms) : false),
    [role],
  );

  const canAny = useCallback(
    (perms: Permission[]) => (role ? hasAnyPermission(role, perms) : false),
    [role],
  );

  const getDescription = useCallback(
    (permission: Permission) => getPermissionDescription(permission),
    [],
  );

  // Common permission shortcuts
  const commonPermissions = useMemo(
    () => ({
      canSendMessages: can(PERMISSIONS.MESSAGE_SEND),
      canCreateChannels: can(PERMISSIONS.CHANNEL_CREATE),
      canDeleteAnyMessage: can(PERMISSIONS.MESSAGE_DELETE_ANY),
      canManageUsers: can(PERMISSIONS.ADMIN_USERS),
      canAccessAdmin: can(PERMISSIONS.ADMIN_DASHBOARD),
      canModerate: canAny([
        PERMISSIONS.MOD_VIEW_REPORTS,
        PERMISSIONS.MOD_DELETE_MESSAGES,
        PERMISSIONS.MESSAGE_DELETE_ANY,
      ]),
      canConfigureSystem: can(PERMISSIONS.SYSTEM_CONFIG),
    }),
    [can, canAny],
  );

  return useMemo(
    () => ({
      permissions,
      can,
      canAll,
      canAny,
      getDescription,
      isAuthenticated: role !== null,
      role,
      ...commonPermissions,
    }),
    [permissions, can, canAll, canAny, getDescription, role, commonPermissions],
  );
}

/**
 * Hook that returns true if user has the specified permission
 */
export function useCan(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}

/**
 * Hook that returns true if user has all of the specified permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { canAll } = usePermissions();
  return canAll(permissions);
}

/**
 * Hook that returns true if user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { canAny } = usePermissions();
  return canAny(permissions);
}

/**
 * Hook for channel permissions
 */
export function useChannelPermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canView: can(PERMISSIONS.CHANNEL_VIEW),
      canCreate: can(PERMISSIONS.CHANNEL_CREATE),
      canDelete: can(PERMISSIONS.CHANNEL_DELETE),
      canUpdate: can(PERMISSIONS.CHANNEL_UPDATE),
      canJoin: can(PERMISSIONS.CHANNEL_JOIN),
      canLeave: can(PERMISSIONS.CHANNEL_LEAVE),
      canInvite: can(PERMISSIONS.CHANNEL_INVITE),
      canKick: can(PERMISSIONS.CHANNEL_KICK),
      canArchive: can(PERMISSIONS.CHANNEL_ARCHIVE),
      canPinMessages: can(PERMISSIONS.CHANNEL_PIN_MESSAGES),
      canManagePermissions: can(PERMISSIONS.CHANNEL_MANAGE_PERMISSIONS),
    }),
    [can],
  );
}

/**
 * Hook for message permissions
 */
export function useMessagePermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canSend: can(PERMISSIONS.MESSAGE_SEND),
      canEditOwn: can(PERMISSIONS.MESSAGE_EDIT_OWN),
      canEditAny: can(PERMISSIONS.MESSAGE_EDIT_ANY),
      canDeleteOwn: can(PERMISSIONS.MESSAGE_DELETE_OWN),
      canDeleteAny: can(PERMISSIONS.MESSAGE_DELETE_ANY),
      canPin: can(PERMISSIONS.MESSAGE_PIN),
      canReact: can(PERMISSIONS.MESSAGE_REACT),
      canThread: can(PERMISSIONS.MESSAGE_THREAD),
      canMention: can(PERMISSIONS.MESSAGE_MENTION),
      canMentionAll: can(PERMISSIONS.MESSAGE_MENTION_ALL),
      canSchedule: can(PERMISSIONS.MESSAGE_SCHEDULE),
      canForward: can(PERMISSIONS.MESSAGE_FORWARD),
    }),
    [can],
  );
}

/**
 * Hook for file permissions
 */
export function useFilePermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canUpload: can(PERMISSIONS.FILE_UPLOAD),
      canDownload: can(PERMISSIONS.FILE_DOWNLOAD),
      canDeleteOwn: can(PERMISSIONS.FILE_DELETE_OWN),
      canDeleteAny: can(PERMISSIONS.FILE_DELETE_ANY),
    }),
    [can],
  );
}

/**
 * Hook for user management permissions
 */
export function useUserPermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canViewProfile: can(PERMISSIONS.USER_VIEW_PROFILE),
      canUpdateOwnProfile: can(PERMISSIONS.USER_UPDATE_OWN_PROFILE),
      canUpdateAnyProfile: can(PERMISSIONS.USER_UPDATE_ANY_PROFILE),
      canInvite: can(PERMISSIONS.USER_INVITE),
      canBan: can(PERMISSIONS.USER_BAN),
      canUnban: can(PERMISSIONS.USER_UNBAN),
      canKick: can(PERMISSIONS.USER_KICK),
      canMute: can(PERMISSIONS.USER_MUTE),
      canAssignRole: can(PERMISSIONS.USER_ASSIGN_ROLE),
      canViewActivity: can(PERMISSIONS.USER_VIEW_ACTIVITY),
    }),
    [can],
  );
}

/**
 * Hook for admin permissions
 */
export function useAdminPermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canAccessDashboard: can(PERMISSIONS.ADMIN_DASHBOARD),
      canManageUsers: can(PERMISSIONS.ADMIN_USERS),
      canManageChannels: can(PERMISSIONS.ADMIN_CHANNELS),
      canManageSettings: can(PERMISSIONS.ADMIN_SETTINGS),
      canViewAuditLog: can(PERMISSIONS.ADMIN_AUDIT_LOG),
      canViewAnalytics: can(PERMISSIONS.ADMIN_ANALYTICS),
      canManageIntegrations: can(PERMISSIONS.ADMIN_INTEGRATIONS),
      canManageWebhooks: can(PERMISSIONS.ADMIN_WEBHOOKS),
      canBackup: can(PERMISSIONS.ADMIN_BACKUP),
    }),
    [can],
  );
}

/**
 * Hook for moderation permissions
 */
export function useModerationPermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canViewReports: can(PERMISSIONS.MOD_VIEW_REPORTS),
      canResolveReports: can(PERMISSIONS.MOD_RESOLVE_REPORTS),
      canWarnUser: can(PERMISSIONS.MOD_WARN_USER),
      canMuteUser: can(PERMISSIONS.MOD_MUTE_USER),
      canDeleteMessages: can(PERMISSIONS.MOD_DELETE_MESSAGES),
      canEnableSlowMode: can(PERMISSIONS.MOD_SLOW_MODE),
    }),
    [can],
  );
}

/**
 * Hook for system permissions
 */
export function useSystemPermissions() {
  const { can } = usePermissions();

  return useMemo(
    () => ({
      canRunSetup: can(PERMISSIONS.SYSTEM_SETUP),
      canConfigureSystem: can(PERMISSIONS.SYSTEM_CONFIG),
      canUpdateBranding: can(PERMISSIONS.SYSTEM_BRANDING),
      canTransferOwnership: can(PERMISSIONS.SYSTEM_TRANSFER_OWNERSHIP),
    }),
    [can],
  );
}

// Re-export types and constants for convenience
export {
  type Permission,
  PERMISSIONS,
  PERMISSION_GROUPS,
  getMinimumRoleForPermission,
};
