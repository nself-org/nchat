"use client";

import { type ReactNode } from "react";
import { usePermission } from "@/hooks/use-permission";
import type { Permission, Role } from "@/types/rbac";

interface PermissionGateProps {
  /**
   * Content to render if the user has access
   */
  children: ReactNode;
  /**
   * Permission required to view the children
   * If provided, checks if user has this specific permission
   */
  permission?: Permission;
  /**
   * Role required to view the children
   * If provided, checks if user's role is at or above this level
   */
  role?: Role;
  /**
   * Content to render if the user does NOT have access
   * Defaults to null (render nothing)
   */
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders children based on user permissions or role.
 *
 * @example
 * ```tsx
 * // Check for a specific permission
 * <PermissionGate permission={PERMISSIONS.CHANNEL_CREATE}>
 *   <CreateChannelButton />
 * </PermissionGate>
 *
 * // Check for a minimum role level
 * <PermissionGate role="moderator">
 *   <ModerationTools />
 * </PermissionGate>
 *
 * // With a fallback for unauthorized users
 * <PermissionGate
 *   permission={PERMISSIONS.ADMIN_DASHBOARD}
 *   fallback={<p>You do not have access to the admin dashboard.</p>}
 * >
 *   <AdminDashboard />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  children,
  permission,
  role,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasRole } = usePermission();

  const hasAccess = permission
    ? hasPermission(permission)
    : role
      ? hasRole(role)
      : true;

  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
