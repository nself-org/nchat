/**
 * Role Definitions
 *
 * Defines all user roles, their hierarchy, and role-related utilities.
 * Roles are hierarchical - higher roles inherit permissions from lower roles.
 */

/**
 * User roles in the system, ordered from most to least privileged
 */
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

/**
 * Role hierarchy levels - higher number = more privileges
 */
export const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  moderator: 60,
  member: 40,
  guest: 20,
} as const;

/**
 * Role metadata for display and UI purposes
 */
export const ROLE_METADATA: Record<
  UserRole,
  {
    label: string;
    description: string;
    color: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  owner: {
    label: "Owner",
    description: "Full system control and ownership rights",
    color: "#F59E0B", // amber
    badgeVariant: "default",
  },
  admin: {
    label: "Administrator",
    description: "Manage users, channels, and system settings",
    color: "#EF4444", // red
    badgeVariant: "destructive",
  },
  moderator: {
    label: "Moderator",
    description: "Moderate content and manage channels",
    color: "#8B5CF6", // purple
    badgeVariant: "secondary",
  },
  member: {
    label: "Member",
    description: "Standard user with full chat access",
    color: "#10B981", // green
    badgeVariant: "outline",
  },
  guest: {
    label: "Guest",
    description: "Limited read-only access",
    color: "#6B7280", // gray
    badgeVariant: "outline",
  },
};

/**
 * All available roles as an array, ordered by privilege level (highest first)
 */
export const ALL_ROLES: UserRole[] = [
  "owner",
  "admin",
  "moderator",
  "member",
  "guest",
];

/**
 * Roles that can manage the system (owner and admin)
 */
export const ADMIN_ROLES: UserRole[] = ["owner", "admin"];

/**
 * Roles that can moderate content
 */
export const MODERATOR_ROLES: UserRole[] = ["owner", "admin", "moderator"];

/**
 * Roles that can chat (excludes guests by default based on config)
 */
export const CHAT_ROLES: UserRole[] = ["owner", "admin", "moderator", "member"];

/**
 * Get the numeric level of a role
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role] ?? 0;
}

/**
 * Check if roleA has equal or higher privileges than roleB
 */
export function hasRoleOrHigher(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Check if roleA has strictly higher privileges than roleB
 */
export function hasHigherRole(roleA: UserRole, roleB: UserRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB);
}

/**
 * Compare two roles: returns positive if roleA > roleB, negative if roleA < roleB, 0 if equal
 */
export function compareRoles(roleA: UserRole, roleB: UserRole): number {
  return getRoleLevel(roleA) - getRoleLevel(roleB);
}

/**
 * Get all roles at or below a given role level
 */
export function getRolesAtOrBelow(role: UserRole): UserRole[] {
  const level = getRoleLevel(role);
  return ALL_ROLES.filter((r) => getRoleLevel(r) <= level);
}

/**
 * Get all roles at or above a given role level
 */
export function getRolesAtOrAbove(role: UserRole): UserRole[] {
  const level = getRoleLevel(role);
  return ALL_ROLES.filter((r) => getRoleLevel(r) >= level);
}

/**
 * Check if the user's role is included in the allowed roles array
 */
export function isRoleAllowed(
  userRole: UserRole,
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user has admin-level access (owner or admin)
 */
export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Check if user has moderator-level access (owner, admin, or moderator)
 */
export function isModerator(role: UserRole): boolean {
  return MODERATOR_ROLES.includes(role);
}

/**
 * Check if user is the owner
 */
export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

/**
 * Check if user is a guest
 */
export function isGuest(role: UserRole): boolean {
  return role === "guest";
}

/**
 * Get role metadata for display
 */
export function getRoleMetadata(role: UserRole) {
  return ROLE_METADATA[role];
}

/**
 * Get the next role up in the hierarchy (for promotions)
 */
export function getNextHigherRole(role: UserRole): UserRole | null {
  const currentLevel = getRoleLevel(role);
  const higherRoles = ALL_ROLES.filter((r) => getRoleLevel(r) > currentLevel);
  if (higherRoles.length === 0) return null;
  // Return the role with the smallest level that's still higher
  return higherRoles.reduce((closest, r) =>
    getRoleLevel(r) < getRoleLevel(closest) ? r : closest,
  );
}

/**
 * Get the next role down in the hierarchy (for demotions)
 */
export function getNextLowerRole(role: UserRole): UserRole | null {
  const currentLevel = getRoleLevel(role);
  const lowerRoles = ALL_ROLES.filter((r) => getRoleLevel(r) < currentLevel);
  if (lowerRoles.length === 0) return null;
  // Return the role with the largest level that's still lower
  return lowerRoles.reduce((closest, r) =>
    getRoleLevel(r) > getRoleLevel(closest) ? r : closest,
  );
}

/**
 * Get roles that a given role can assign (can only assign roles lower than own)
 */
export function getAssignableRoles(assignerRole: UserRole): UserRole[] {
  // Owner cannot be assigned, only transferred
  // Users can only assign roles lower than their own
  return ALL_ROLES.filter(
    (r) => r !== "owner" && getRoleLevel(r) < getRoleLevel(assignerRole),
  );
}

/**
 * Check if a user with roleA can modify (promote/demote) a user with roleB
 */
export function canModifyUserRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
): boolean {
  // Cannot modify owner
  if (targetCurrentRole === "owner") return false;

  // Cannot promote to owner
  if (targetNewRole === "owner") return false;

  // Actor must have higher role than both current and new target role
  return (
    hasHigherRole(actorRole, targetCurrentRole) &&
    hasHigherRole(actorRole, targetNewRole)
  );
}
