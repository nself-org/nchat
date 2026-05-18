/**
 * useRole Hook
 *
 * Hook for accessing and checking user roles.
 * Provides utilities for role-based access control in components.
 */

"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  type UserRole,
  ROLE_LEVELS,
  ROLE_METADATA,
  ALL_ROLES,
  ADMIN_ROLES,
  MODERATOR_ROLES,
  getRoleLevel,
  hasRoleOrHigher,
  hasHigherRole,
  compareRoles,
  getRolesAtOrBelow,
  getRolesAtOrAbove,
  isAdmin,
  isModerator,
  isOwner,
  isGuest,
  getRoleMetadata,
  getAssignableRoles,
  canModifyUserRole,
} from "@/lib/auth/roles";

export interface UseRoleReturn {
  /** Current user's role (null if not authenticated) */
  role: UserRole | null;
  /** Role level (numeric value) */
  roleLevel: number;
  /** Role metadata (label, description, color, etc.) */
  roleMetadata: ReturnType<typeof getRoleMetadata> | null;

  // Role checks
  /** Check if user has the specified role or higher */
  hasRoleOrHigher: (requiredRole: UserRole) => boolean;
  /** Check if user has exactly the specified role */
  hasExactRole: (role: UserRole) => boolean;
  /** Check if user's role is one of the allowed roles */
  isRoleAllowed: (allowedRoles: UserRole[]) => boolean;

  // Common role checks
  /** Is user an owner */
  isOwner: boolean;
  /** Is user an admin (owner or admin) */
  isAdmin: boolean;
  /** Is user a moderator (owner, admin, or moderator) */
  isModerator: boolean;
  /** Is user a guest */
  isGuest: boolean;
  /** Is user authenticated with any role */
  isAuthenticated: boolean;

  // Role management utilities
  /** Get roles that this user can assign to others */
  assignableRoles: UserRole[];
  /** Check if this user can modify another user's role */
  canModifyRole: (
    targetCurrentRole: UserRole,
    targetNewRole: UserRole,
  ) => boolean;
  /** Compare this user's role to another role */
  compareToRole: (otherRole: UserRole) => number;
}

/**
 * Hook for accessing and checking user roles
 */
export function useRole(): UseRoleReturn {
  const { user, loading } = useAuth();

  const role = user?.role ?? null;
  const roleLevel = role ? getRoleLevel(role) : 0;
  const roleMetadata = role ? getRoleMetadata(role) : null;

  // Memoize computed values
  const assignableRoles = useMemo(
    () => (role ? getAssignableRoles(role) : []),
    [role],
  );

  // Return object with all role utilities
  return useMemo(
    () => ({
      role,
      roleLevel,
      roleMetadata,

      // Role checks
      hasRoleOrHigher: (requiredRole: UserRole) =>
        role ? hasRoleOrHigher(role, requiredRole) : false,

      hasExactRole: (exactRole: UserRole) => role === exactRole,

      isRoleAllowed: (allowedRoles: UserRole[]) =>
        role ? allowedRoles.includes(role) : false,

      // Common role checks
      isOwner: role ? isOwner(role) : false,
      isAdmin: role ? isAdmin(role) : false,
      isModerator: role ? isModerator(role) : false,
      isGuest: role ? isGuest(role) : false,
      isAuthenticated: role !== null,

      // Role management
      assignableRoles,
      canModifyRole: (targetCurrentRole: UserRole, targetNewRole: UserRole) =>
        role
          ? canModifyUserRole(role, targetCurrentRole, targetNewRole)
          : false,
      compareToRole: (otherRole: UserRole) =>
        role ? compareRoles(role, otherRole) : -ROLE_LEVELS[otherRole],
    }),
    [role, roleLevel, roleMetadata, assignableRoles],
  );
}

/**
 * Hook that returns true if user has the required role or higher
 */
export function useHasRole(requiredRole: UserRole): boolean {
  const { role } = useRole();
  return role ? hasRoleOrHigher(role, requiredRole) : false;
}

/**
 * Hook that returns true if user's role is one of the allowed roles
 */
export function useIsRoleAllowed(allowedRoles: UserRole[]): boolean {
  const { role } = useRole();
  return role ? allowedRoles.includes(role) : false;
}

/**
 * Hook for checking if user can access admin features
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useRole();
  return isAdmin;
}

/**
 * Hook for checking if user can access moderator features
 */
export function useIsModerator(): boolean {
  const { isModerator } = useRole();
  return isModerator;
}

// Re-export types and constants for convenience
export {
  type UserRole,
  ROLE_LEVELS,
  ROLE_METADATA,
  ALL_ROLES,
  ADMIN_ROLES,
  MODERATOR_ROLES,
};
