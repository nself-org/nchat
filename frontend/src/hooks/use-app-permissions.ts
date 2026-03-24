/**
 * useAppPermissions Hook
 *
 * Provides role and permission checking for the current app and user.
 * Designed for monorepo "one of many" compatibility where users can have
 * different roles across different applications.
 */

import { useCallback, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAuth } from '@/contexts/auth-context'
import {
  GET_USER_APP_ROLES,
  GET_USER_APP_PERMISSIONS,
} from '@/graphql/app-rbac'
import type {
  AppRole,
  AppPermission,
  UseAppPermissionsResult,
  AppUserRole,
  AppRolePermission,
} from '@/types/app-rbac'

/**
 * Get the current app ID from environment or config
 */
function getCurrentAppId(): string {
  // Default to 'nchat' but could be loaded from config
  return process.env.NEXT_PUBLIC_APP_ID || 'nchat'
}

/**
 * Hook to check user permissions in the current app
 *
 * @param appId - Optional app ID (defaults to current app from env)
 * @returns Permission checking functions and user role/permission data
 *
 * @example
 * ```tsx
 * function AdminButton() {
 *   const { hasRole, hasPermission, isAdmin } = useAppPermissions()
 *
 *   if (!isAdmin) return null
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={!hasPermission('channels.delete')}
 *     >
 *       Delete Channel
 *     </button>
 *   )
 * }
 * ```
 */
export function useAppPermissions(appId?: string): UseAppPermissionsResult {
  const { user } = useAuth()
  const currentAppId = appId || getCurrentAppId()

  // Fetch user's roles for this app
  const {
    data: rolesData,
    loading: rolesLoading,
    error: rolesError,
  } = useQuery<{ app_user_roles: AppUserRole[] }>(GET_USER_APP_ROLES, {
    variables: {
      userId: user?.id,
      appId: currentAppId,
    },
    skip: !user?.id,
  })

  // Fetch user's permissions for this app
  const {
    data: permissionsData,
    loading: permissionsLoading,
    error: permissionsError,
  } = useQuery<{ app_role_permissions: AppRolePermission[] }>(GET_USER_APP_PERMISSIONS, {
    variables: {
      userId: user?.id,
      appId: currentAppId,
    },
    skip: !user?.id,
  })

  // Extract roles and permissions
  const userRoles = useMemo<AppRole[]>(() => {
    if (!rolesData?.app_user_roles) return []
    return rolesData.app_user_roles.map((r) => r.role)
  }, [rolesData])

  const userPermissions = useMemo<AppPermission[]>(() => {
    if (!permissionsData?.app_role_permissions) return []
    return permissionsData.app_role_permissions.map((p) => p.permission) as AppPermission[]
  }, [permissionsData])

  // Computed flags
  const isOwner = userRoles.includes('owner')
  const isAdmin = userRoles.includes('admin') || isOwner
  const isModerator = userRoles.includes('moderator') || isAdmin

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: AppRole): boolean => {
      return userRoles.includes(role)
    },
    [userRoles]
  )

  /**
   * Check if user has a specific permission
   *
   * @param permission - Permission to check
   * @param resource - Optional specific resource ID
   */
  const hasPermission = useCallback(
    (permission: AppPermission, resource?: string): boolean => {
      // Owner has all permissions
      if (isOwner) return true

      // Check if user has the permission
      if (userPermissions.includes(permission)) return true

      // Check for wildcard permissions
      // e.g., "messages.delete.any" includes "messages.delete.own"
      if (permission.endsWith('.own')) {
        const anyPermission = permission.replace('.own', '.any') as AppPermission
        if (userPermissions.includes(anyPermission)) return true
      }

      return false
    },
    [userPermissions, isOwner]
  )

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: AppRole[]): boolean => {
      return roles.some((role) => userRoles.includes(role))
    },
    [userRoles]
  )

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: AppPermission[]): boolean => {
      return permissions.every((permission) => hasPermission(permission))
    },
    [hasPermission]
  )

  const loading = rolesLoading || permissionsLoading
  const error = rolesError || permissionsError

  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    userRoles,
    userPermissions,
    isOwner,
    isAdmin,
    isModerator,
    loading,
    error: error ? new Error(error.message) : undefined,
  }
}

/**
 * Hook variant for checking permissions across multiple apps
 *
 * @param appIds - Array of app IDs to check
 * @returns Map of app IDs to their permission results
 *
 * @example
 * ```tsx
 * function MultiAppDashboard() {
 *   const permissions = useMultiAppPermissions(['nchat', 'ntv', 'nfamily'])
 *
 *   return (
 *     <div>
 *       {permissions.nchat.isAdmin && <NchatAdminPanel />}
 *       {permissions.ntv.isAdmin && <NtvAdminPanel />}
 *       {permissions.nfamily.isAdmin && <NfamilyAdminPanel />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMultiAppPermissions(
  appIds: string[]
): Record<string, UseAppPermissionsResult> {
  const results: Record<string, UseAppPermissionsResult> = {}

  // This is a simplified version - in production you'd want to batch these queries
  for (const appId of appIds) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[appId] = useAppPermissions(appId)
  }

  return results
}

/**
 * Higher-order component to require specific roles
 *
 * Deferred: requires moving to a .tsx file to enable JSX in HOCs.
 *
 * @example
 * ```tsx
 * const AdminOnlyComponent = requireRoles(['admin', 'owner'])(MyComponent)
 * ```
 */
/* DISABLED - JSX not allowed in .ts files. See use-app-permissions-hoc.tsx when needed.
export function requireRoles(roles: AppRole[]) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      const { hasAnyRole, loading } = useAppPermissions()

      if (loading) {
        return <div>Loading permissions...</div>
      }

      if (!hasAnyRole(roles)) {
        return <div>Access denied. Required roles: {roles.join(', ')}</div>
      }

      return <Component {...props} />
    }
  }
}
*/

/**
 * Higher-order component to require specific permissions
 *
 * Deferred: requires moving to a .tsx file to enable JSX in HOCs.
 *
 * @example
 * ```tsx
 * const CanDeleteMessages = requirePermissions(['messages.delete'])(DeleteButton)
 * ```
 */
/* DISABLED - JSX not allowed in .ts files. See use-app-permissions-hoc.tsx when needed.
export function requirePermissions(permissions: AppPermission[]) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      const { hasAllPermissions, loading } = useAppPermissions()

      if (loading) {
        return <div>Loading permissions...</div>
      }

      if (!hasAllPermissions(permissions)) {
        return <div>Access denied. Required permissions: {permissions.join(', ')}</div>
      }

      return <Component {...props} />
    }
  }
}
*/
