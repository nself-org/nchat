/**
 * Permission Checking Utilities
 *
 * Provides functions to check user permissions based on their role.
 */

import {
  ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  type Role,
  type Permission,
} from "@/types/rbac";

/**
 * Default permissions for each role
 * Owner has all permissions, other roles have specific subsets
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: Object.values(PERMISSIONS), // Owner has ALL permissions
  admin: [
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_EDIT,
    PERMISSIONS.MESSAGE_DELETE,
    PERMISSIONS.MESSAGE_DELETE_OTHERS,
    PERMISSIONS.MESSAGE_PIN,
    PERMISSIONS.CHANNEL_CREATE,
    PERMISSIONS.CHANNEL_EDIT,
    PERMISSIONS.CHANNEL_DELETE,
    PERMISSIONS.CHANNEL_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_KICK,
    PERMISSIONS.USER_MUTE,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_ASSIGN,
    PERMISSIONS.ADMIN_DASHBOARD,
    PERMISSIONS.ADMIN_SETTINGS,
    PERMISSIONS.ADMIN_AUDIT_LOG,
  ],
  moderator: [
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_EDIT,
    PERMISSIONS.MESSAGE_DELETE,
    PERMISSIONS.MESSAGE_DELETE_OTHERS,
    PERMISSIONS.MESSAGE_PIN,
    PERMISSIONS.CHANNEL_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MUTE,
    PERMISSIONS.USER_KICK,
    PERMISSIONS.ADMIN_DASHBOARD,
  ],
  member: [
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_EDIT,
    PERMISSIONS.MESSAGE_DELETE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.ROLE_VIEW,
  ],
  guest: [PERMISSIONS.USER_VIEW],
};

/**
 * Check if a user with the given role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  // Owner always has all permissions
  if (userRole === ROLES.OWNER) return true;

  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user's role is at or above the required role level
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can manage (assign/modify) another user's role
 */
export function canManageRole(userRole: Role, targetRole: Role): boolean {
  // Owner can manage anyone except other owners
  if (userRole === ROLES.OWNER) return targetRole !== ROLES.OWNER;

  // Others can only manage roles below them
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Check if a role is the owner role
 */
export function isOwner(role: Role): boolean {
  return role === ROLES.OWNER;
}

/**
 * Owner protection - check if an action can be performed on a user
 * Some actions (delete, demote, ban) are NEVER allowed on owner
 */
export function canModifyUser(
  actorRole: Role,
  targetRole: Role,
  action: "delete" | "demote" | "ban",
): boolean {
  // Nobody can delete, demote, or ban an owner
  if (targetRole === ROLES.OWNER) return false;

  // Must have higher role to modify
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: Role): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get all roles sorted by hierarchy (highest first)
 */
export function getAllRolesSorted(): Role[] {
  return Object.values(ROLES).sort(
    (a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a],
  );
}
