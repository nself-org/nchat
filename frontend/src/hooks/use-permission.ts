"use client";

import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  hasPermission,
  hasRole,
  canManageRole,
  canModifyUser,
  isOwner,
  getRolePermissions,
  ROLE_HIERARCHY,
  type Permission,
  type Role,
  type PermissionResult,
} from "@/lib/rbac";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for permission checks
 */
export interface PermissionCheckOptions {
  /** Channel ID for channel-specific permission checks */
  channelId?: string;
  /** Resource type for resource-specific permission checks */
  resourceType?: string;
  /** Resource ID for resource-specific permission checks */
  resourceId?: string;
  /** Resource owner ID for ownership checks */
  resourceOwnerId?: string;
}

/**
 * Batch permission check result
 */
export interface BatchPermissionResult {
  /** Whether any of the permissions are granted */
  any: boolean;
  /** Whether all of the permissions are granted */
  all: boolean;
  /** Map of permission to result */
  results: Map<Permission, boolean>;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * React hook for checking user permissions
 *
 * Provides comprehensive permission checking including single permissions,
 * batch checks, role comparisons, and user management permissions.
 *
 * @example
 * ```tsx
 * const { hasPermission, hasRole, isOwner, role } = usePermission()
 *
 * if (hasPermission(PERMISSIONS.CHANNEL_CREATE)) {
 *   // Show create channel button
 * }
 *
 * if (hasRole('moderator')) {
 *   // Show moderation tools
 * }
 *
 * // Check multiple permissions
 * const { any, all } = checkMultiple([PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT])
 * ```
 */
export function usePermission() {
  const { user } = useAuth();
  const userRole = (user?.role || "guest") as Role;
  const userId = user?.id;

  const check = useMemo(
    () => ({
      /**
       * Check if the current user has a specific permission
       */
      hasPermission: (
        permission: Permission,
        _options?: PermissionCheckOptions,
      ) => hasPermission(userRole, permission),

      /**
       * Check if the current user's role is at or above the required role
       */
      hasRole: (role: Role) => hasRole(userRole, role),

      /**
       * Check if the current user can manage (assign/modify) a target role
       */
      canManageRole: (targetRole: Role) => canManageRole(userRole, targetRole),

      /**
       * Check if the current user can perform a modification action on another user
       */
      canModifyUser: (targetRole: Role, action: "delete" | "demote" | "ban") =>
        canModifyUser(userRole, targetRole, action),

      /**
       * Check if the current user is an owner
       */
      isOwner: isOwner(userRole),

      /**
       * Check if the current user is an admin or higher
       */
      isAdmin: userRole === "owner" || userRole === "admin",

      /**
       * Check if the current user is a moderator or higher
       */
      isModerator:
        userRole === "owner" ||
        userRole === "admin" ||
        userRole === "moderator",

      /**
       * Get all permissions for the current user's role
       */
      permissions: getRolePermissions(userRole),

      /**
       * The current user's role
       */
      role: userRole,

      /**
       * The current user's ID
       */
      userId,

      /**
       * Get the numeric hierarchy level for the current user's role
       */
      hierarchyLevel: ROLE_HIERARCHY[userRole],

      /**
       * Check if user is the owner of a resource
       */
      isResourceOwner: (resourceOwnerId: string | undefined) =>
        userId !== undefined && resourceOwnerId === userId,
    }),
    [userRole, userId],
  );

  /**
   * Check multiple permissions at once
   */
  const checkMultiple = useCallback(
    (
      permissions: Permission[],
      options?: PermissionCheckOptions,
    ): BatchPermissionResult => {
      const results = new Map<Permission, boolean>();

      permissions.forEach((permission) => {
        results.set(permission, hasPermission(userRole, permission));
      });

      return {
        any: Array.from(results.values()).some((v) => v),
        all: Array.from(results.values()).every((v) => v),
        results,
      };
    },
    [userRole],
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: Permission[], options?: PermissionCheckOptions): boolean => {
      return permissions.some((p) => hasPermission(userRole, p));
    },
    [userRole],
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: Permission[], options?: PermissionCheckOptions): boolean => {
      return permissions.every((p) => hasPermission(userRole, p));
    },
    [userRole],
  );

  /**
   * Check if user can edit a resource (owner or has edit permission)
   */
  const canEditResource = useCallback(
    (permission: Permission, resourceOwnerId: string | undefined): boolean => {
      // Owner of resource can always edit
      if (userId && resourceOwnerId === userId) {
        return true;
      }
      // Check if has general edit permission
      return hasPermission(userRole, permission);
    },
    [userRole, userId],
  );

  /**
   * Check if user can delete a resource (owner or has delete permission)
   */
  const canDeleteResource = useCallback(
    (permission: Permission, resourceOwnerId: string | undefined): boolean => {
      // Owner of resource can always delete
      if (userId && resourceOwnerId === userId) {
        return true;
      }
      // Check if has general delete permission
      return hasPermission(userRole, permission);
    },
    [userRole, userId],
  );

  /**
   * Get a detailed permission check result
   */
  const checkPermissionDetailed = useCallback(
    (
      permission: Permission,
      options?: PermissionCheckOptions,
    ): PermissionResult => {
      // Owner always has all permissions
      if (userRole === "owner") {
        return {
          allowed: true,
          reason: "Owner has all permissions",
          grantedBy: "owner-role",
        };
      }

      const allowed = hasPermission(userRole, permission);
      return {
        allowed,
        reason: allowed
          ? `Granted by ${userRole} role`
          : `${userRole} role does not have this permission`,
        grantedBy: allowed ? `${userRole}-role` : undefined,
        deniedBy: allowed ? undefined : `${userRole}-role`,
      };
    },
    [userRole],
  );

  /**
   * Check if user's role is higher than target role
   */
  const isHigherRole = useCallback(
    (targetRole: Role): boolean => {
      return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
    },
    [userRole],
  );

  /**
   * Check if user's role is at least the target role level
   */
  const isAtLeastRole = useCallback(
    (targetRole: Role): boolean => {
      return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
    },
    [userRole],
  );

  return {
    ...check,
    checkMultiple,
    hasAnyPermission,
    hasAllPermissions,
    canEditResource,
    canDeleteResource,
    checkPermissionDetailed,
    isHigherRole,
    isAtLeastRole,
  };
}

export type UsePermissionReturn = ReturnType<typeof usePermission>;

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook to check a single permission (memoized)
 *
 * @example
 * ```tsx
 * const canCreateChannel = useHasPermission(PERMISSIONS.CHANNEL_CREATE)
 * ```
 */
export function useHasPermission(
  permission: Permission,
  options?: PermissionCheckOptions,
): boolean {
  const { hasPermission } = usePermission();
  return useMemo(
    () => hasPermission(permission, options),
    [hasPermission, permission, options],
  );
}

/**
 * Hook to check multiple permissions (any must pass)
 *
 * @example
 * ```tsx
 * const canModerate = useHasAnyPermission([PERMISSIONS.USER_KICK, PERMISSIONS.USER_MUTE])
 * ```
 */
export function useHasAnyPermission(
  permissions: Permission[],
  options?: PermissionCheckOptions,
): boolean {
  const { hasAnyPermission } = usePermission();
  return useMemo(
    () => hasAnyPermission(permissions, options),
    [hasAnyPermission, permissions, options],
  );
}

/**
 * Hook to check multiple permissions (all must pass)
 *
 * @example
 * ```tsx
 * const isFullAdmin = useHasAllPermissions([PERMISSIONS.ADMIN_SETTINGS, PERMISSIONS.ADMIN_BILLING])
 * ```
 */
export function useHasAllPermissions(
  permissions: Permission[],
  options?: PermissionCheckOptions,
): boolean {
  const { hasAllPermissions } = usePermission();
  return useMemo(
    () => hasAllPermissions(permissions, options),
    [hasAllPermissions, permissions, options],
  );
}

/**
 * Hook to check if user is at least a specific role
 *
 * @example
 * ```tsx
 * const isModerator = useIsAtLeastRole('moderator')
 * ```
 */
export function useIsAtLeastRole(role: Role): boolean {
  const { isAtLeastRole } = usePermission();
  return useMemo(() => isAtLeastRole(role), [isAtLeastRole, role]);
}

/**
 * Hook to check if current user can manage a target user
 *
 * @example
 * ```tsx
 * const canBan = useCanManageUser(targetUser.role, 'ban')
 * ```
 */
export function useCanManageUser(
  targetRole: Role,
  action: "delete" | "demote" | "ban",
): boolean {
  const { canModifyUser } = usePermission();
  return useMemo(
    () => canModifyUser(targetRole, action),
    [canModifyUser, targetRole, action],
  );
}

/**
 * Hook to check if current user can edit a resource
 *
 * @example
 * ```tsx
 * const canEdit = useCanEditResource(PERMISSIONS.MESSAGE_EDIT, message.authorId)
 * ```
 */
export function useCanEditResource(
  permission: Permission,
  resourceOwnerId: string | undefined,
): boolean {
  const { canEditResource } = usePermission();
  return useMemo(
    () => canEditResource(permission, resourceOwnerId),
    [canEditResource, permission, resourceOwnerId],
  );
}

/**
 * Hook to get the current user's role
 *
 * @example
 * ```tsx
 * const role = useRole()
 * ```
 */
export function useRole(): Role {
  const { role } = usePermission();
  return role;
}

/**
 * Hook to check if current user is owner
 *
 * @example
 * ```tsx
 * const isOwner = useIsOwner()
 * ```
 */
export function useIsOwner(): boolean {
  const { isOwner } = usePermission();
  return isOwner;
}

/**
 * Hook to check if current user is admin or higher
 *
 * @example
 * ```tsx
 * const isAdmin = useIsAdmin()
 * ```
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermission();
  return isAdmin;
}

/**
 * Hook to check if current user is moderator or higher
 *
 * @example
 * ```tsx
 * const isModerator = useIsModerator()
 * ```
 */
export function useIsModerator(): boolean {
  const { isModerator } = usePermission();
  return isModerator;
}
