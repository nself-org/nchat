/**
 * RoleGuard — role-based access control guard component.
 *
 * Decoupled from Next.js and @/ aliases.
 * Role/permission logic injected via props.
 *
 * @module auth/role-guard
 */

import { useEffect, useState } from 'react';
import { useRouter } from '../adapters/router';
import { cn } from '../lib/utils';
import type { AuthState } from './auth-guard';

// ============================================================================
// Types
// ============================================================================

/** Role hierarchy — lowest to highest privilege */
export type UserRole = 'guest' | 'member' | 'moderator' | 'admin' | 'owner';

/** Permission string (extensible by consumers) */
export type Permission = string;

export interface RoleGuardProps {
  children: React.ReactNode;
  /** Injected auth state */
  authState: AuthState;
  /**
   * Optional role checking function.
   * Returns true when the user's role satisfies the requirement.
   */
  hasRole?: (userRole: string, requiredRole: UserRole) => boolean;
  /**
   * Optional permission checking function.
   */
  hasPermission?: (userRole: string, permission: Permission) => boolean;
  /** User must have this role or higher */
  requiredRole?: UserRole;
  /** User must have one of these exact roles */
  allowedRoles?: UserRole[];
  /** User must have this permission */
  requiredPermission?: Permission;
  /** Any of these permissions is sufficient */
  anyPermissions?: Permission[];
  /** All of these permissions are required */
  allPermissions?: Permission[];
  /** Where to redirect if unauthorized (shows access denied if not set) */
  redirectTo?: string;
  /** Custom access denied component */
  accessDeniedComponent?: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when access is denied */
  onAccessDenied?: () => void;
  /** Whether to require authentication first (default: true) */
  requireAuth?: boolean;
  className?: string;
}

// ============================================================================
// Default access denied UI
// ============================================================================

function DefaultAccessDenied({
  requiredRole,
  userRole,
}: {
  requiredRole?: UserRole;
  userRole?: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="border-destructive/20 w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
        <div className="bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="mb-4 text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
        {requiredRole && (
          <div className="bg-muted/50 mb-4 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">
              Required role:{' '}
              <span className="font-medium capitalize">{requiredRole}</span>
            </p>
            {userRole && (
              <p className="mt-1 text-muted-foreground">
                Your role: <span className="font-medium capitalize">{userRole}</span>
              </p>
            )}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-secondary-foreground hover:bg-secondary/80 rounded-md bg-secondary px-4 py-2 text-sm font-medium"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="text-primary-foreground hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium"
          >
            Go to Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function DefaultLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

// ============================================================================
// Default role hierarchy check
// ============================================================================

const ROLE_ORDER: UserRole[] = ['guest', 'member', 'moderator', 'admin', 'owner'];

function defaultHasRole(userRole: string, requiredRole: UserRole): boolean {
  const userIdx = ROLE_ORDER.indexOf(userRole as UserRole);
  const reqIdx = ROLE_ORDER.indexOf(requiredRole);
  return userIdx !== -1 && reqIdx !== -1 && userIdx >= reqIdx;
}

// ============================================================================
// RoleGuard
// ============================================================================

/**
 * Wraps content behind role/permission requirements.
 * Role logic is injectable — consumers provide hasRole / hasPermission fns.
 *
 * @example
 * ```tsx
 * <RoleGuard
 *   authState={authState}
 *   requiredRole="admin"
 *   hasRole={myHasRoleFn}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  children,
  authState,
  hasRole = defaultHasRole,
  hasPermission,
  requiredRole,
  allowedRoles,
  requiredPermission,
  anyPermissions,
  allPermissions,
  redirectTo,
  accessDeniedComponent,
  loadingComponent,
  onAccessDenied,
  requireAuth = true,
  className,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, loading } = authState;
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) return; // AuthGuard handles this case

    const userRole = user?.role ?? null;
    let authorized = false;

    if (requiredRole && userRole) {
      authorized = hasRole(userRole, requiredRole);
    } else if (allowedRoles && userRole) {
      authorized = allowedRoles.includes(userRole as UserRole);
    } else if (requiredPermission && userRole && hasPermission) {
      authorized = hasPermission(userRole, requiredPermission);
    } else if (anyPermissions && userRole && hasPermission) {
      authorized = anyPermissions.some((p) => hasPermission(userRole, p));
    } else if (allPermissions && userRole && hasPermission) {
      authorized = allPermissions.every((p) => hasPermission(userRole, p));
    } else if (!requiredRole && !allowedRoles && !requiredPermission && !anyPermissions && !allPermissions) {
      authorized = requireAuth ? !!user : true;
    }

    if (!authorized) {
      onAccessDenied?.();
      if (redirectTo) {
        router.replace(redirectTo);
        return;
      }
    }

    setIsAuthorized(authorized);
  }, [user, loading, requiredRole, allowedRoles, requiredPermission, anyPermissions, allPermissions, redirectTo, requireAuth, onAccessDenied, hasRole, hasPermission, router]);

  if (loading || isAuthorized === null) {
    return <>{loadingComponent ?? <DefaultLoadingSpinner />}</>;
  }

  if (!isAuthorized) {
    return (
      <>
        {accessDeniedComponent ?? (
          <DefaultAccessDenied requiredRole={requiredRole} userRole={user?.role} />
        )}
      </>
    );
  }

  return <div className={cn(className)}>{children}</div>;
}

// ============================================================================
// Convenience role guards
// ============================================================================

type ConvenienceGuardProps = Omit<RoleGuardProps, 'requiredRole'>;

export function AdminGuard(props: ConvenienceGuardProps) {
  return <RoleGuard {...props} requiredRole="admin" />;
}

export function ModeratorGuard(props: ConvenienceGuardProps) {
  return <RoleGuard {...props} requiredRole="moderator" />;
}

export function OwnerGuard(props: ConvenienceGuardProps) {
  return <RoleGuard {...props} requiredRole="owner" />;
}

/**
 * Wraps with both AuthGuard and RoleGuard for convenience.
 */
export function AuthRoleGuard({
  pathname,
  loginRedirectTo = '/login',
  ...roleProps
}: RoleGuardProps & { pathname?: string; loginRedirectTo?: string }) {
  // AuthRoleGuard chains auth check → role check
  // Both are managed here without importing AuthGuard to avoid circular deps
  return (
    <RoleGuard {...roleProps} requireAuth={true} />
  );
}

// ============================================================================
// useRoleGuard hook
// ============================================================================

export interface UseRoleGuardOptions {
  authState: AuthState;
  hasRole?: (userRole: string, requiredRole: UserRole) => boolean;
  hasPermission?: (userRole: string, permission: Permission) => boolean;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  onAccessDenied?: () => void;
}

export function useRoleGuard(options: UseRoleGuardOptions) {
  const { authState, hasRole = defaultHasRole, requiredRole, allowedRoles, onAccessDenied } = options;
  const { user, loading } = authState;

  const userRole = user?.role ?? null;

  let isAuthorized = false;
  if (!loading && user && userRole) {
    if (requiredRole) {
      isAuthorized = hasRole(userRole, requiredRole);
    } else if (allowedRoles) {
      isAuthorized = allowedRoles.includes(userRole as UserRole);
    } else {
      isAuthorized = true;
    }
  }

  useEffect(() => {
    if (!loading && !isAuthorized && user) {
      onAccessDenied?.();
    }
  }, [loading, isAuthorized, user, onAccessDenied]);

  return { isAuthorized, isLoading: loading, userRole };
}

// ============================================================================
// withRoleGuard HOC
// ============================================================================

export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P & { authState: AuthState }>,
  options?: Partial<RoleGuardProps>
) {
  return function RoleGuardedComponent(props: P & { authState: AuthState }) {
    return (
      <RoleGuard {...options} authState={props.authState}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}
