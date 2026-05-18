/**
 * Role Hierarchy - Logic for role positioning and hierarchy management
 *
 * This module handles role ordering, comparison, and hierarchy operations.
 */

import {
  Role,
  RoleHierarchyNode,
  RoleComparison,
  Permission,
} from "./role-types";

// ============================================================================
// Hierarchy Operations
// ============================================================================

/**
 * Sort roles by position (highest first)
 */
export function sortRolesByPosition(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => b.position - a.position);
}

/**
 * Sort roles by position (lowest first)
 */
export function sortRolesByPositionAsc(roles: Role[]): Role[] {
  return [...roles].sort((a, b) => a.position - b.position);
}

/**
 * Get the highest role from a list
 */
export function getHighestRole(roles: Role[]): Role | undefined {
  if (roles.length === 0) return undefined;
  return roles.reduce((highest, current) =>
    current.position > highest.position ? current : highest,
  );
}

/**
 * Get the lowest role from a list
 */
export function getLowestRole(roles: Role[]): Role | undefined {
  if (roles.length === 0) return undefined;
  return roles.reduce((lowest, current) =>
    current.position < lowest.position ? current : lowest,
  );
}

/**
 * Check if role A is higher than role B
 */
export function isRoleHigher(roleA: Role, roleB: Role): boolean {
  return roleA.position > roleB.position;
}

/**
 * Check if role A can manage role B
 * A role can only manage roles with lower positions
 */
export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  // Built-in owner role cannot be managed by anyone
  if (targetRole.id === "owner" && targetRole.isBuiltIn) {
    return false;
  }
  // Manager must have higher position
  return managerRole.position > targetRole.position;
}

/**
 * Check if a user with given roles can manage a target role
 */
export function canUserManageRole(
  userRoles: Role[],
  targetRole: Role,
): boolean {
  const highestUserRole = getHighestRole(userRoles);
  if (!highestUserRole) return false;
  return canManageRole(highestUserRole, targetRole);
}

/**
 * Get roles that a user can assign (roles below their highest role)
 */
export function getAssignableRoles(
  userRoles: Role[],
  allRoles: Role[],
): Role[] {
  const highestUserRole = getHighestRole(userRoles);
  if (!highestUserRole) return [];

  return allRoles.filter(
    (role) => role.position < highestUserRole.position && role.id !== "owner", // Owner role is never assignable
  );
}

/**
 * Get roles that a user can create (positions below their highest role)
 */
export function getValidPositionsForNewRole(
  userRoles: Role[],
  allRoles: Role[],
): number[] {
  const highestUserRole = getHighestRole(userRoles);
  if (!highestUserRole) return [];

  const maxPosition = highestUserRole.position - 1;
  const usedPositions = new Set(allRoles.map((r) => r.position));
  const validPositions: number[] = [];

  // Find available positions between 1 and max
  for (let i = 1; i <= maxPosition; i++) {
    if (!usedPositions.has(i)) {
      validPositions.push(i);
    }
  }

  return validPositions;
}

// ============================================================================
// Position Management
// ============================================================================

/**
 * Calculate new position for a role being inserted
 */
export function calculateNewPosition(
  allRoles: Role[],
  insertAfterRoleId?: string,
  insertBeforeRoleId?: string,
): number {
  const sorted = sortRolesByPosition(allRoles);

  if (insertAfterRoleId) {
    const afterRole = sorted.find((r) => r.id === insertAfterRoleId);
    const afterIndex = sorted.findIndex((r) => r.id === insertAfterRoleId);

    if (afterRole && afterIndex < sorted.length - 1) {
      const nextRole = sorted[afterIndex + 1];
      return Math.floor((afterRole.position + nextRole.position) / 2);
    } else if (afterRole) {
      return Math.max(1, afterRole.position - 10);
    }
  }

  if (insertBeforeRoleId) {
    const beforeRole = sorted.find((r) => r.id === insertBeforeRoleId);
    const beforeIndex = sorted.findIndex((r) => r.id === insertBeforeRoleId);

    if (beforeRole && beforeIndex > 0) {
      const prevRole = sorted[beforeIndex - 1];
      return Math.floor((beforeRole.position + prevRole.position) / 2);
    } else if (beforeRole) {
      return beforeRole.position + 10;
    }
  }

  // Default: place below the lowest non-guest role
  const lowestNonGuest = sorted.filter((r) => r.id !== "guest").pop();
  if (lowestNonGuest) {
    return Math.floor(lowestNonGuest.position / 2);
  }

  return 30; // Default position
}

/**
 * Rebalance role positions to ensure proper spacing
 */
export function rebalancePositions(roles: Role[]): Role[] {
  const sorted = sortRolesByPosition(roles);
  const step = 10;

  return sorted.map((role, index) => ({
    ...role,
    position: (sorted.length - index) * step,
  }));
}

/**
 * Move a role to a new position
 */
export function moveRole(
  roles: Role[],
  roleId: string,
  newPosition: number,
): Role[] {
  return roles.map((role) =>
    role.id === roleId ? { ...role, position: newPosition } : role,
  );
}

/**
 * Swap positions of two roles
 */
export function swapRolePositions(
  roles: Role[],
  roleIdA: string,
  roleIdB: string,
): Role[] {
  const roleA = roles.find((r) => r.id === roleIdA);
  const roleB = roles.find((r) => r.id === roleIdB);

  if (!roleA || !roleB) return roles;

  return roles.map((role) => {
    if (role.id === roleIdA) {
      return { ...role, position: roleB.position };
    }
    if (role.id === roleIdB) {
      return { ...role, position: roleA.position };
    }
    return role;
  });
}

// ============================================================================
// Hierarchy Tree
// ============================================================================

/**
 * Build a hierarchy tree from flat roles list
 */
export function buildHierarchyTree(
  roles: Role[],
  currentUserHighestRole?: Role,
): RoleHierarchyNode[] {
  const sorted = sortRolesByPosition(roles);

  return sorted.map((role, index) => ({
    role,
    children: [], // Flat hierarchy for now
    depth: index,
    canManage: currentUserHighestRole
      ? canManageRole(currentUserHighestRole, role)
      : false,
  }));
}

/**
 * Get role path from highest to a specific role
 */
export function getRolePath(roles: Role[], targetRoleId: string): Role[] {
  const sorted = sortRolesByPosition(roles);
  const targetIndex = sorted.findIndex((r) => r.id === targetRoleId);

  if (targetIndex === -1) return [];

  return sorted.slice(0, targetIndex + 1);
}

// ============================================================================
// Role Comparison
// ============================================================================

/**
 * Compare two roles
 */
export function compareRoles(roleA: Role, roleB: Role): RoleComparison {
  const [higher, lower] =
    roleA.position > roleB.position ? [roleA, roleB] : [roleB, roleA];

  const permA = new Set(roleA.permissions);
  const permB = new Set(roleB.permissions);

  const onlyInHigher = higher.permissions.filter(
    (p) => !permB.has(p as Permission),
  );
  const onlyInLower = lower.permissions.filter(
    (p) => !permA.has(p as Permission),
  );
  const shared = higher.permissions.filter((p) => permB.has(p as Permission));

  return {
    higherRole: higher,
    lowerRole: lower,
    positionDifference: higher.position - lower.position,
    permissionDifference: {
      onlyInHigher: onlyInHigher as Permission[],
      onlyInLower: onlyInLower as Permission[],
      shared: shared as Permission[],
    },
  };
}

/**
 * Check if two roles have identical permissions
 */
export function haveIdenticalPermissions(roleA: Role, roleB: Role): boolean {
  if (roleA.permissions.length !== roleB.permissions.length) return false;

  const permSetA = new Set(roleA.permissions);
  return roleB.permissions.every((p) => permSetA.has(p));
}

/**
 * Get permission differences between roles
 */
export function getPermissionDiff(
  fromRole: Role,
  toRole: Role,
): { added: Permission[]; removed: Permission[] } {
  const fromSet = new Set(fromRole.permissions);
  const toSet = new Set(toRole.permissions);

  const added = toRole.permissions.filter((p) => !fromSet.has(p));
  const removed = fromRole.permissions.filter((p) => !toSet.has(p));

  return { added, removed };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate role position is valid within hierarchy
 */
export function isValidPosition(
  position: number,
  allRoles: Role[],
  excludeRoleId?: string,
): boolean {
  const otherRoles = excludeRoleId
    ? allRoles.filter((r) => r.id !== excludeRoleId)
    : allRoles;

  // Position must be positive
  if (position <= 0) return false;

  // Position must not be taken
  if (otherRoles.some((r) => r.position === position)) return false;

  return true;
}

/**
 * Check if moving a role would cause hierarchy issues
 */
export function canMoveToPosition(
  role: Role,
  newPosition: number,
  userHighestRole: Role,
  allRoles: Role[],
): { valid: boolean; reason?: string } {
  // Can't move built-in owner role
  if (role.id === "owner" && role.isBuiltIn) {
    return { valid: false, reason: "Cannot move the owner role" };
  }

  // Can't move role above user's highest role
  if (newPosition >= userHighestRole.position) {
    return { valid: false, reason: "Cannot move role above your highest role" };
  }

  // Can't move role to position 0 or negative
  if (newPosition <= 0) {
    return { valid: false, reason: "Position must be greater than 0" };
  }

  // Check for position conflicts
  const conflictingRole = allRoles.find(
    (r) => r.id !== role.id && r.position === newPosition,
  );
  if (conflictingRole) {
    return {
      valid: false,
      reason: `Position ${newPosition} is already used by "${conflictingRole.name}"`,
    };
  }

  return { valid: true };
}
