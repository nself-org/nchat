/**
 * Role Inheritance - Permission inheritance and effective permission calculation
 *
 * This module handles how permissions are inherited and combined across roles,
 * and calculates effective permissions for users.
 */

import {
  Permission,
  Role,
  EffectivePermissions,
  ChannelPermissionOverride,
} from "./role-types";
import { getHighestRole, sortRolesByPosition } from "./role-hierarchy";
import { PERMISSIONS } from "./permission-types";

// ============================================================================
// Permission Computation
// ============================================================================

/**
 * Compute effective permissions for a user based on their roles
 */
export function computeEffectivePermissions(
  userId: string,
  userRoles: Role[],
): EffectivePermissions {
  const sortedRoles = sortRolesByPosition(userRoles);
  const highestRole = sortedRoles[0];

  // Check if user has administrator permission (bypasses all checks)
  const hasAdmin = userRoles.some((role) =>
    role.permissions.includes("administrator"),
  );

  // Check if user is owner
  const isOwner = userRoles.some(
    (role) => role.id === "owner" && role.isBuiltIn,
  );

  // Merge all permissions from all roles
  const permissionSet = new Set<Permission>();
  for (const role of userRoles) {
    for (const permission of role.permissions) {
      permissionSet.add(permission);
    }
  }

  // If admin, add all permissions
  if (hasAdmin || isOwner) {
    const allPermissions = Object.keys(PERMISSIONS) as Permission[];
    for (const permission of allPermissions) {
      permissionSet.add(permission);
    }
  }

  return {
    userId,
    permissions: Array.from(permissionSet),
    highestRole: highestRole,
    roles: sortedRoles,
    isOwner,
    isAdmin: hasAdmin || isOwner,
    computedAt: new Date(),
  };
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  effectivePermissions: EffectivePermissions,
  permission: Permission,
): boolean {
  // Admin and owner have all permissions
  if (effectivePermissions.isAdmin || effectivePermissions.isOwner) {
    return true;
  }

  return effectivePermissions.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  effectivePermissions: EffectivePermissions,
  permissions: Permission[],
): boolean {
  if (effectivePermissions.isAdmin || effectivePermissions.isOwner) {
    return true;
  }

  return permissions.some((p) => effectivePermissions.permissions.includes(p));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  effectivePermissions: EffectivePermissions,
  permissions: Permission[],
): boolean {
  if (effectivePermissions.isAdmin || effectivePermissions.isOwner) {
    return true;
  }

  return permissions.every((p) => effectivePermissions.permissions.includes(p));
}

// ============================================================================
// Channel Overrides
// ============================================================================

/**
 * Apply channel permission overrides to effective permissions
 */
export function applyChannelOverrides(
  basePermissions: Permission[],
  overrides: ChannelPermissionOverride[],
  userId: string,
  userRoleIds: string[],
): Permission[] {
  const permissionSet = new Set(basePermissions);

  // Sort overrides: user-specific overrides take precedence over role overrides
  const sortedOverrides = [...overrides].sort((a, b) => {
    // User overrides come last (highest priority)
    if (a.userId && !b.userId) return 1;
    if (!a.userId && b.userId) return -1;
    return 0;
  });

  for (const override of sortedOverrides) {
    // Check if override applies to this user
    const applies =
      override.userId === userId ||
      (override.roleId && userRoleIds.includes(override.roleId));

    if (!applies) continue;

    // Apply denies first
    for (const denied of override.deny) {
      permissionSet.delete(denied);
    }

    // Then apply allows
    for (const allowed of override.allow) {
      permissionSet.add(allowed);
    }
  }

  return Array.from(permissionSet);
}

/**
 * Compute effective permissions for a specific channel
 */
export function computeChannelPermissions(
  effectivePermissions: EffectivePermissions,
  channelOverrides: ChannelPermissionOverride[],
): Permission[] {
  // Admin/owner bypass all overrides
  if (effectivePermissions.isAdmin || effectivePermissions.isOwner) {
    return effectivePermissions.permissions;
  }

  const userRoleIds = effectivePermissions.roles.map((r) => r.id);

  return applyChannelOverrides(
    effectivePermissions.permissions,
    channelOverrides,
    effectivePermissions.userId,
    userRoleIds,
  );
}

// ============================================================================
// Permission Sources
// ============================================================================

/**
 * Find which role grants a specific permission
 */
export function findPermissionSource(
  permission: Permission,
  userRoles: Role[],
): Role | undefined {
  const sortedRoles = sortRolesByPosition(userRoles);

  // Return the highest role that grants this permission
  for (const role of sortedRoles) {
    if (role.permissions.includes(permission)) {
      return role;
    }
  }

  return undefined;
}

/**
 * Get all roles that grant a specific permission
 */
export function findAllPermissionSources(
  permission: Permission,
  userRoles: Role[],
): Role[] {
  return userRoles.filter((role) => role.permissions.includes(permission));
}

/**
 * Get a map of permissions to their source roles
 */
export function getPermissionSourceMap(
  userRoles: Role[],
): Map<Permission, Role[]> {
  const sourceMap = new Map<Permission, Role[]>();

  for (const role of userRoles) {
    for (const permission of role.permissions) {
      const sources = sourceMap.get(permission) || [];
      sources.push(role);
      sourceMap.set(permission, sources);
    }
  }

  return sourceMap;
}

// ============================================================================
// Inherited Permissions
// ============================================================================

/**
 * Get permissions that would be inherited if a user was assigned a role
 */
export function getInheritedPermissions(
  currentRoles: Role[],
  newRole: Role,
): { gained: Permission[]; already: Permission[] } {
  const currentPermissions = new Set<Permission>();
  for (const role of currentRoles) {
    for (const permission of role.permissions) {
      currentPermissions.add(permission);
    }
  }

  const gained: Permission[] = [];
  const already: Permission[] = [];

  for (const permission of newRole.permissions) {
    if (currentPermissions.has(permission)) {
      already.push(permission);
    } else {
      gained.push(permission);
    }
  }

  return { gained, already };
}

/**
 * Get permissions that would be lost if a role was removed
 */
export function getPermissionsLostOnRemoval(
  currentRoles: Role[],
  roleToRemove: Role,
): Permission[] {
  // Get permissions from other roles
  const remainingPermissions = new Set<Permission>();
  for (const role of currentRoles) {
    if (role.id === roleToRemove.id) continue;
    for (const permission of role.permissions) {
      remainingPermissions.add(permission);
    }
  }

  // Find permissions that are only in the removed role
  return roleToRemove.permissions.filter((p) => !remainingPermissions.has(p));
}

// ============================================================================
// Permission Conflicts
// ============================================================================

/**
 * Detect potential permission conflicts
 */
export interface PermissionConflict {
  permission: Permission;
  type: "duplicate" | "escalation" | "dangerous";
  message: string;
  roles: Role[];
}

export function detectPermissionConflicts(
  userRoles: Role[],
): PermissionConflict[] {
  const conflicts: PermissionConflict[] = [];
  const sourceMap = getPermissionSourceMap(userRoles);

  // Check for escalation risks
  const hasManageRoles = sourceMap.has("manage_roles");
  const hasAdministrator = sourceMap.has("administrator");

  if (hasManageRoles && !hasAdministrator) {
    const manageRolesSources = sourceMap.get("manage_roles") || [];
    conflicts.push({
      permission: "manage_roles",
      type: "escalation",
      message: "User can manage roles, which may allow privilege escalation",
      roles: manageRolesSources,
    });
  }

  // Check for dangerous permission combinations
  const dangerousPermissions: Permission[] = [
    "administrator",
    "manage_server",
    "ban_members",
    "manage_roles",
    "manage_billing",
  ];

  for (const dangerous of dangerousPermissions) {
    if (sourceMap.has(dangerous)) {
      const sources = sourceMap.get(dangerous) || [];
      conflicts.push({
        permission: dangerous,
        type: "dangerous",
        message: `"${PERMISSIONS[dangerous].name}" is a sensitive permission`,
        roles: sources,
      });
    }
  }

  return conflicts;
}

// ============================================================================
// Permission Validation
// ============================================================================

/**
 * Check if a user can grant a specific permission to a role
 */
export function canGrantPermission(
  granterPermissions: EffectivePermissions,
  permission: Permission,
): boolean {
  // Must have the permission to grant it
  if (!hasPermission(granterPermissions, permission)) {
    return false;
  }

  // Must have manage_roles to grant any permission
  if (!hasPermission(granterPermissions, "manage_roles")) {
    return false;
  }

  // Can't grant administrator unless you're owner
  if (permission === "administrator" && !granterPermissions.isOwner) {
    return false;
  }

  return true;
}

/**
 * Filter permissions that a user can grant
 */
export function filterGrantablePermissions(
  granterPermissions: EffectivePermissions,
): Permission[] {
  if (!hasPermission(granterPermissions, "manage_roles")) {
    return [];
  }

  if (granterPermissions.isOwner) {
    return granterPermissions.permissions;
  }

  // Can only grant permissions you have (except administrator)
  return granterPermissions.permissions.filter((p) => p !== "administrator");
}
