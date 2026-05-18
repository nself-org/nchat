/**
 * AuthGuard Component
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface AuthGuardProps {
  /** Content to render when authenticated */
  children: React.ReactNode;
  /** Where to redirect if not authenticated (default: /login) */
  redirectTo?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when authentication fails */
  onAuthFailure?: () => void;
  /** Whether to show loading state (default: true) */
  showLoading?: boolean;
}

/**
 * Default loading spinner component
 */
function DefaultLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Checking authentication...
        </p>
      </div>
    </div>
  );
}

/**
 * AuthGuard wraps protected content and handles authentication state
 */
export function AuthGuard({
  children,
  redirectTo = "/login",
  loadingComponent,
  onAuthFailure,
  showLoading = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // If no user, redirect to login
    if (!user) {
      onAuthFailure?.();

      // Build redirect URL with return path
      const returnUrl = encodeURIComponent(pathname);
      const loginUrl = redirectTo.includes("?")
        ? `${redirectTo}&returnTo=${returnUrl}`
        : `${redirectTo}?returnTo=${returnUrl}`;

      router.replace(loginUrl);
    } else {
      // User is authenticated
      setIsChecking(false);
    }
  }, [user, loading, router, pathname, redirectTo, onAuthFailure]);

  // Show loading while checking auth
  if (loading || isChecking) {
    if (!showLoading) {
      return null;
    }
    return loadingComponent ?? <DefaultLoadingSpinner />;
  }

  // If we get here, user is authenticated
  if (!user) {
    // Should not happen, but handle gracefully
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook version of AuthGuard for more control
 */
export function useAuthGuard(options?: {
  redirectTo?: string;
  onAuthFailure?: () => void;
}): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
} {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { redirectTo = "/login", onAuthFailure } = options ?? {};

  useEffect(() => {
    if (!loading && !user) {
      onAuthFailure?.();
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`${redirectTo}?returnTo=${returnUrl}`);
    }
  }, [user, loading, router, pathname, redirectTo, onAuthFailure]);

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    user,
  };
}

/**
 * Higher-order component version of AuthGuard
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
  },
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard
        redirectTo={options?.redirectTo}
        loadingComponent={options?.loadingComponent}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };
}

/**
 * GuestGuard - opposite of AuthGuard
 * Redirects authenticated users away from public-only pages (login, signup)
 */
export function GuestGuard({
  children,
  redirectTo = "/chat",
  loadingComponent,
  showLoading = true,
}: Omit<AuthGuardProps, "onAuthFailure">) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (user) {
      // User is authenticated, redirect away from guest-only page
      router.replace(redirectTo);
    } else {
      setIsChecking(false);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading while checking
  if (loading || isChecking) {
    if (!showLoading) {
      return null;
    }
    return loadingComponent ?? <DefaultLoadingSpinner />;
  }

  // If we get here, user is NOT authenticated (guest)
  if (user) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook version of GuestGuard
 */
export function useGuestGuard(options?: { redirectTo?: string }): {
  isGuest: boolean;
  isLoading: boolean;
} {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { redirectTo = "/chat" } = options ?? {};

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return {
    isGuest: !user,
    isLoading: loading,
  };
}

export default AuthGuard;
