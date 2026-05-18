/**
 * Role Manager - High-level role management operations
 *
 * This module provides the main API for role management operations,
 * coordinating between hierarchy, inheritance, and validation logic.
 */

import {
  Role,
  Permission,
  CreateRoleInput,
  UpdateRoleInput,
  UserRole,
  RoleHistoryEntry,
  EffectivePermissions,
} from "./role-types";
import {
  DEFAULT_ROLES,
  createNewRole,
  ROLE_COLOR_PRESETS,
} from "./role-defaults";
import {
  sortRolesByPosition,
  getHighestRole,
  canManageRole,
  calculateNewPosition,
  rebalancePositions,
  isValidPosition,
} from "./role-hierarchy";
import {
  computeEffectivePermissions,
  hasPermission,
  getPermissionsLostOnRemoval,
  detectPermissionConflicts,
} from "./role-inheritance";
import { isDangerousPermission, requiresAdmin } from "./permission-types";

// ============================================================================
// Role CRUD Operations
// ============================================================================

/**
 * Create a new role
 */
export function createRole(
  input: CreateRoleInput,
  existingRoles: Role[],
  creatorPermissions: EffectivePermissions,
): { role: Role; errors: string[] } {
  const errors: string[] = [];

  // Validation
  if (!input.name || input.name.trim().length === 0) {
    errors.push("Role name is required");
  }

  if (input.name && input.name.length > 100) {
    errors.push("Role name must be 100 characters or less");
  }

  // Check for duplicate names
  const nameExists = existingRoles.some(
    (r) => r.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (nameExists) {
    errors.push("A role with this name already exists");
  }

  // Check if user can create roles
  if (!hasPermission(creatorPermissions, "manage_roles")) {
    errors.push("You do not have permission to create roles");
  }

  // Validate permissions being assigned
  if (input.permissions) {
    for (const permission of input.permissions) {
      if (isDangerousPermission(permission)) {
        if (!hasPermission(creatorPermissions, permission)) {
          errors.push(
            `Cannot grant "${permission}" - you don't have this permission`,
          );
        }
      }
      if (requiresAdmin(permission) && !creatorPermissions.isAdmin) {
        errors.push(`Cannot grant "${permission}" - requires administrator`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      role: {} as Role,
      errors,
    };
  }

  // Calculate position
  const position = input.position ?? calculateNewPosition(existingRoles);

  // Ensure position is below creator's highest role
  if (position >= creatorPermissions.highestRole.position) {
    errors.push("Cannot create role at or above your highest role position");
    return { role: {} as Role, errors };
  }

  // Build role
  let permissions = input.permissions || [];

  // If copying from another role
  if (input.copyFrom) {
    const sourceRole = existingRoles.find((r) => r.id === input.copyFrom);
    if (sourceRole) {
      permissions = [...sourceRole.permissions];
    }
  }

  const now = new Date();
  const role: Role = {
    id: generateRoleId(),
    name: input.name.trim(),
    description: input.description?.trim(),
    color: input.color || ROLE_COLOR_PRESETS[0].color,
    icon: input.icon,
    position,
    isBuiltIn: false,
    isDefault: input.isDefault ?? false,
    isMentionable: input.isMentionable ?? false,
    permissions,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorPermissions.userId,
  };

  return { role, errors: [] };
}

/**
 * Update an existing role
 */
export function updateRole(
  roleId: string,
  input: UpdateRoleInput,
  existingRoles: Role[],
  editorPermissions: EffectivePermissions,
): { role: Role; errors: string[] } {
  const errors: string[] = [];

  const role = existingRoles.find((r) => r.id === roleId);
  if (!role) {
    errors.push("Role not found");
    return { role: {} as Role, errors };
  }

  // Check if user can manage this role
  if (!canManageRole(editorPermissions.highestRole, role)) {
    errors.push("You cannot edit this role");
    return { role, errors };
  }

  // Built-in roles have restrictions
  if (role.isBuiltIn) {
    if (input.name !== undefined) {
      errors.push("Cannot rename built-in roles");
    }
    if (input.position !== undefined) {
      errors.push("Cannot change position of built-in roles");
    }
  }

  // Validate name uniqueness if changing
  if (input.name) {
    const nameExists = existingRoles.some(
      (r) =>
        r.id !== roleId && r.name.toLowerCase() === input.name!.toLowerCase(),
    );
    if (nameExists) {
      errors.push("A role with this name already exists");
    }
  }

  // Validate position if changing
  if (input.position !== undefined) {
    if (input.position >= editorPermissions.highestRole.position) {
      errors.push("Cannot move role to or above your highest role");
    }
    if (!isValidPosition(input.position, existingRoles, roleId)) {
      errors.push("Invalid position");
    }
  }

  // Validate permissions if changing
  if (input.permissions) {
    // Check new permissions
    for (const permission of input.permissions) {
      if (!role.permissions.includes(permission)) {
        // New permission being added
        if (
          isDangerousPermission(permission) &&
          !hasPermission(editorPermissions, permission)
        ) {
          errors.push(
            `Cannot grant "${permission}" - you don't have this permission`,
          );
        }
      }
    }

    // Check if removing dangerous permissions
    for (const permission of role.permissions) {
      if (!input.permissions.includes(permission)) {
        if (permission === "administrator" && !editorPermissions.isOwner) {
          errors.push("Only owner can remove administrator permission");
        }
      }
    }
  }

  if (errors.length > 0) {
    return { role, errors };
  }

  // Apply updates
  const updatedRole: Role = {
    ...role,
    name: input.name ?? role.name,
    description: input.description ?? role.description,
    color: input.color ?? role.color,
    icon: input.icon ?? role.icon,
    position: input.position ?? role.position,
    isDefault: input.isDefault ?? role.isDefault,
    isMentionable: input.isMentionable ?? role.isMentionable,
    permissions: input.permissions ?? role.permissions,
    updatedAt: new Date(),
  };

  return { role: updatedRole, errors: [] };
}

/**
 * Delete a role
 */
export function deleteRole(
  roleId: string,
  existingRoles: Role[],
  deleterPermissions: EffectivePermissions,
): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  const role = existingRoles.find((r) => r.id === roleId);
  if (!role) {
    errors.push("Role not found");
    return { success: false, errors };
  }

  // Cannot delete built-in roles
  if (role.isBuiltIn) {
    errors.push("Cannot delete built-in roles");
    return { success: false, errors };
  }

  // Check if user can manage this role
  if (!canManageRole(deleterPermissions.highestRole, role)) {
    errors.push("You cannot delete this role");
    return { success: false, errors };
  }

  return { success: true, errors: [] };
}

/**
 * Duplicate a role
 */
export function duplicateRole(
  roleId: string,
  newName: string,
  existingRoles: Role[],
  creatorPermissions: EffectivePermissions,
): { role: Role; errors: string[] } {
  const sourceRole = existingRoles.find((r) => r.id === roleId);

  if (!sourceRole) {
    return {
      role: {} as Role,
      errors: ["Source role not found"],
    };
  }

  return createRole(
    {
      name: newName,
      description: sourceRole.description,
      color: sourceRole.color,
      icon: sourceRole.icon,
      isMentionable: sourceRole.isMentionable,
      permissions: [...sourceRole.permissions],
      position: calculateNewPosition(existingRoles, undefined, sourceRole.id),
    },
    existingRoles,
    creatorPermissions,
  );
}

// ============================================================================
// Role Assignment
// ============================================================================

/**
 * Assign a role to a user
 */
export function assignRoleToUser(
  userId: string,
  roleId: string,
  allRoles: Role[],
  userCurrentRoles: Role[],
  assignerPermissions: EffectivePermissions,
): { success: boolean; errors: string[]; newPermissions?: Permission[] } {
  const errors: string[] = [];

  const role = allRoles.find((r) => r.id === roleId);
  if (!role) {
    errors.push("Role not found");
    return { success: false, errors };
  }

  // Check if user already has this role
  if (userCurrentRoles.some((r) => r.id === roleId)) {
    errors.push("User already has this role");
    return { success: false, errors };
  }

  // Check if assigner can manage this role
  if (!canManageRole(assignerPermissions.highestRole, role)) {
    errors.push("You cannot assign this role");
    return { success: false, errors };
  }

  // Cannot assign owner role
  if (role.id === "owner" && role.isBuiltIn) {
    errors.push("Cannot assign the owner role");
    return { success: false, errors };
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Calculate new permissions gained
  const currentPerms = new Set<Permission>();
  for (const r of userCurrentRoles) {
    for (const p of r.permissions) {
      currentPerms.add(p);
    }
  }

  const newPermissions = role.permissions.filter((p) => !currentPerms.has(p));

  return { success: true, errors: [], newPermissions };
}

/**
 * Remove a role from a user
 */
export function removeRoleFromUser(
  userId: string,
  roleId: string,
  allRoles: Role[],
  userCurrentRoles: Role[],
  removerPermissions: EffectivePermissions,
): { success: boolean; errors: string[]; lostPermissions?: Permission[] } {
  const errors: string[] = [];

  const role = allRoles.find((r) => r.id === roleId);
  if (!role) {
    errors.push("Role not found");
    return { success: false, errors };
  }

  // Check if user has this role
  if (!userCurrentRoles.some((r) => r.id === roleId)) {
    errors.push("User does not have this role");
    return { success: false, errors };
  }

  // Check if remover can manage this role
  if (!canManageRole(removerPermissions.highestRole, role)) {
    errors.push("You cannot remove this role");
    return { success: false, errors };
  }

  // Cannot remove own owner role
  if (
    role.id === "owner" &&
    role.isBuiltIn &&
    userId === removerPermissions.userId
  ) {
    errors.push("Cannot remove your own owner role");
    return { success: false, errors };
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  // Calculate permissions that would be lost
  const lostPermissions = getPermissionsLostOnRemoval(userCurrentRoles, role);

  return { success: true, errors: [], lostPermissions };
}

/**
 * Bulk assign roles to users
 */
export function bulkAssignRoles(
  userIds: string[],
  roleIds: string[],
  action: "add" | "remove" | "set",
  allRoles: Role[],
  assignerPermissions: EffectivePermissions,
): { success: boolean; errors: string[]; processedCount: number } {
  const errors: string[] = [];

  // Validate roles
  const roles = roleIds
    .map((id) => allRoles.find((r) => r.id === id))
    .filter(Boolean) as Role[];

  if (roles.length !== roleIds.length) {
    errors.push("One or more roles not found");
  }

  // Check permissions for all roles
  for (const role of roles) {
    if (!canManageRole(assignerPermissions.highestRole, role)) {
      errors.push(`Cannot manage role "${role.name}"`);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors, processedCount: 0 };
  }

  return {
    success: true,
    errors: [],
    processedCount: userIds.length,
  };
}

// ============================================================================
// Role History
// ============================================================================

/**
 * Create a role history entry
 */
export function createHistoryEntry(
  userId: string,
  role: Role,
  action: "assigned" | "removed" | "expired",
  performedBy?: string,
  performedByName?: string,
  reason?: string,
): RoleHistoryEntry {
  return {
    id: generateHistoryId(),
    userId,
    roleId: role.id,
    roleName: role.name,
    action,
    performedBy,
    performedByName,
    timestamp: new Date(),
    reason,
  };
}

// ============================================================================
// Default Roles
// ============================================================================

/**
 * Get all default roles
 */
export function getDefaultRoles(): Role[] {
  return Object.values(DEFAULT_ROLES);
}

/**
 * Initialize roles for a new server
 */
export function initializeServerRoles(): Role[] {
  return sortRolesByPosition(getDefaultRoles());
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique role ID
 */
function generateRoleId(): string {
  return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique history entry ID
 */
function generateHistoryId(): string {
  return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate role data
 */
export function validateRole(role: Partial<Role>): string[] {
  const errors: string[] = [];

  if (!role.name || role.name.trim().length === 0) {
    errors.push("Role name is required");
  }

  if (role.name && role.name.length > 100) {
    errors.push("Role name must be 100 characters or less");
  }

  if (role.description && role.description.length > 500) {
    errors.push("Role description must be 500 characters or less");
  }

  if (role.color && !/^#[0-9A-Fa-f]{6}$/.test(role.color)) {
    errors.push("Invalid color format (use hex color like #FF0000)");
  }

  if (role.position !== undefined && role.position < 0) {
    errors.push("Position must be positive");
  }

  return errors;
}

/**
 * Sanitize role input
 */
export function sanitizeRoleInput(input: CreateRoleInput): CreateRoleInput {
  return {
    ...input,
    name: input.name.trim(),
    description: input.description?.trim(),
    color: input.color?.toUpperCase(),
  };
}

/**
 * Get role statistics
 */
export interface RoleStats {
  totalRoles: number;
  builtInRoles: number;
  customRoles: number;
  rolesWithMembers: number;
  rolesWithDangerousPermissions: number;
}

export function getRoleStats(roles: Role[]): RoleStats {
  return {
    totalRoles: roles.length,
    builtInRoles: roles.filter((r) => r.isBuiltIn).length,
    customRoles: roles.filter((r) => !r.isBuiltIn).length,
    rolesWithMembers: roles.filter((r) => (r.memberCount ?? 0) > 0).length,
    rolesWithDangerousPermissions: roles.filter((r) =>
      r.permissions.some(isDangerousPermission),
    ).length,
  };
}

// Re-export commonly used functions
export {
  computeEffectivePermissions,
  hasPermission,
  detectPermissionConflicts,
  sortRolesByPosition,
  getHighestRole,
  canManageRole,
};
