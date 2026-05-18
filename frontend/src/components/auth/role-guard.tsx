/**
 * RoleGuard Component
 *
 * Protects routes that require specific roles.
 * Shows access denied message if user doesn't have required role.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  type UserRole,
  hasRoleOrHigher,
  getRoleMetadata,
  ROLE_METADATA,
} from "@/lib/auth/roles";
import { type Permission, hasPermission } from "@/lib/auth/permissions";
import { AuthGuard } from "./auth-guard";

interface RoleGuardProps {
  /** Content to render when authorized */
  children: React.ReactNode;
  /** Required role (user must have this role or higher) */
  requiredRole?: UserRole;
  /** Allowed roles (user must have one of these roles) */
  allowedRoles?: UserRole[];
  /** Required permission (alternative to role check) */
  requiredPermission?: Permission;
  /** Any of these permissions is sufficient */
  anyPermissions?: Permission[];
  /** All of these permissions are required */
  allPermissions?: Permission[];
  /** Where to redirect if not authorized (default: shows access denied) */
  redirectTo?: string;
  /** Custom access denied component */
  accessDeniedComponent?: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when access is denied */
  onAccessDenied?: () => void;
  /** Whether to check auth first (default: true) */
  requireAuth?: boolean;
}

/**
 * Default access denied component
 */
function DefaultAccessDenied({
  requiredRole,
  userRole,
}: {
  requiredRole?: UserRole;
  userRole: UserRole | null;
}) {
  const router = useRouter();
  const roleInfo = requiredRole ? getRoleMetadata(requiredRole) : null;
  const userRoleInfo = userRole ? getRoleMetadata(userRole) : null;

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

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Access Denied
        </h2>

        <p className="mb-4 text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>

        {requiredRole && (
          <div className="bg-muted/50 mb-4 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">
              Required role:{" "}
              <span className="font-medium" style={{ color: roleInfo?.color }}>
                {roleInfo?.label}
              </span>
            </p>
            {userRole && (
              <p className="mt-1 text-muted-foreground">
                Your role:{" "}
                <span
                  className="font-medium"
                  style={{ color: userRoleInfo?.color }}
                >
                  {userRoleInfo?.label}
                </span>
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
            onClick={() => router.push("/chat")}
            className="text-primary-foreground hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium"
          >
            Go to Chat
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * RoleGuard wraps protected content and handles role-based access
 */
export function RoleGuard({
  children,
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
}: RoleGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    // If auth is required but user is not authenticated, let AuthGuard handle it
    if (requireAuth && !user) {
      return;
    }

    const userRole = user?.role ?? null;
    let authorized = false;

    // Check role requirements
    if (requiredRole && userRole) {
      authorized = hasRoleOrHigher(userRole, requiredRole);
    } else if (allowedRoles && userRole) {
      authorized = allowedRoles.includes(userRole);
    } else if (requiredPermission && userRole) {
      authorized = hasPermission(userRole, requiredPermission);
    } else if (anyPermissions && userRole) {
      authorized = anyPermissions.some((p) => hasPermission(userRole, p));
    } else if (allPermissions && userRole) {
      authorized = allPermissions.every((p) => hasPermission(userRole, p));
    } else if (
      !requiredRole &&
      !allowedRoles &&
      !requiredPermission &&
      !anyPermissions &&
      !allPermissions
    ) {
      // No requirements specified, just needs auth (or not if requireAuth is false)
      authorized = requireAuth ? !!user : true;
    }

    setIsAuthorized(authorized);

    if (!authorized) {
      onAccessDenied?.();
      if (redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [
    user,
    loading,
    requiredRole,
    allowedRoles,
    requiredPermission,
    anyPermissions,
    allPermissions,
    requireAuth,
    redirectTo,
    router,
    onAccessDenied,
  ]);

  // Show loading while checking
  if (loading || isAuthorized === null) {
    return (
      loadingComponent ?? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Checking permissions...
            </p>
          </div>
        </div>
      )
    );
  }

  // If not authorized and no redirect, show access denied
  if (!isAuthorized && !redirectTo) {
    return (
      accessDeniedComponent ?? (
        <DefaultAccessDenied
          requiredRole={requiredRole}
          userRole={user?.role ?? null}
        />
      )
    );
  }

  // If not authorized with redirect, return null (redirect is happening)
  if (!isAuthorized) {
    return null;
  }

  // User is authorized
  return <>{children}</>;
}

/**
 * Combined AuthGuard + RoleGuard for convenience
 */
export function AuthRoleGuard({
  children,
  requiredRole,
  allowedRoles,
  requiredPermission,
  loginRedirectTo = "/login",
  accessDeniedRedirectTo,
  loadingComponent,
  accessDeniedComponent,
}: {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  loginRedirectTo?: string;
  accessDeniedRedirectTo?: string;
  loadingComponent?: React.ReactNode;
  accessDeniedComponent?: React.ReactNode;
}) {
  return (
    <AuthGuard redirectTo={loginRedirectTo} loadingComponent={loadingComponent}>
      <RoleGuard
        requiredRole={requiredRole}
        allowedRoles={allowedRoles}
        requiredPermission={requiredPermission}
        redirectTo={accessDeniedRedirectTo}
        loadingComponent={loadingComponent}
        accessDeniedComponent={accessDeniedComponent}
        requireAuth={false} // Auth already checked
      >
        {children}
      </RoleGuard>
    </AuthGuard>
  );
}

/**
 * AdminGuard - shortcut for admin-only routes
 */
export function AdminGuard({
  children,
  redirectTo,
  loadingComponent,
  accessDeniedComponent,
}: {
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
  accessDeniedComponent?: React.ReactNode;
}) {
  return (
    <AuthRoleGuard
      requiredRole="admin"
      accessDeniedRedirectTo={redirectTo}
      loadingComponent={loadingComponent}
      accessDeniedComponent={accessDeniedComponent}
    >
      {children}
    </AuthRoleGuard>
  );
}

/**
 * ModeratorGuard - shortcut for moderator+ routes
 */
export function ModeratorGuard({
  children,
  redirectTo,
  loadingComponent,
  accessDeniedComponent,
}: {
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
  accessDeniedComponent?: React.ReactNode;
}) {
  return (
    <AuthRoleGuard
      requiredRole="moderator"
      accessDeniedRedirectTo={redirectTo}
      loadingComponent={loadingComponent}
      accessDeniedComponent={accessDeniedComponent}
    >
      {children}
    </AuthRoleGuard>
  );
}

/**
 * OwnerGuard - shortcut for owner-only routes
 */
export function OwnerGuard({
  children,
  redirectTo,
  loadingComponent,
  accessDeniedComponent,
}: {
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
  accessDeniedComponent?: React.ReactNode;
}) {
  return (
    <AuthRoleGuard
      allowedRoles={["owner"]}
      accessDeniedRedirectTo={redirectTo}
      loadingComponent={loadingComponent}
      accessDeniedComponent={accessDeniedComponent}
    >
      {children}
    </AuthRoleGuard>
  );
}

/**
 * Hook for role-based authorization
 */
export function useRoleGuard(options: {
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
}): {
  isAuthorized: boolean;
  isLoading: boolean;
  userRole: UserRole | null;
} {
  const { user, loading } = useAuth();
  const userRole = user?.role ?? null;

  let isAuthorized = false;

  if (!loading && user) {
    const { requiredRole, allowedRoles, requiredPermission } = options;

    if (requiredRole && userRole) {
      isAuthorized = hasRoleOrHigher(userRole, requiredRole);
    } else if (allowedRoles && userRole) {
      isAuthorized = allowedRoles.includes(userRole);
    } else if (requiredPermission && userRole) {
      isAuthorized = hasPermission(userRole, requiredPermission);
    } else if (!requiredRole && !allowedRoles && !requiredPermission) {
      isAuthorized = true;
    }
  }

  return {
    isAuthorized,
    isLoading: loading,
    userRole,
  };
}

/**
 * Higher-order component for role-based access control
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    requiredRole?: UserRole;
    allowedRoles?: UserRole[];
    redirectTo?: string;
  },
) {
  return function RoleGuardedComponent(props: P) {
    return (
      <AuthRoleGuard
        requiredRole={options.requiredRole}
        allowedRoles={options.allowedRoles}
        accessDeniedRedirectTo={options.redirectTo}
      >
        <WrappedComponent {...props} />
      </AuthRoleGuard>
    );
  };
}

export default RoleGuard;
