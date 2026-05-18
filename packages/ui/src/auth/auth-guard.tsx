/**
 * AuthGuard — protects routes requiring authentication.
 *
 * Decoupled from Next.js: uses RouterAdapter instead of next/navigation.
 * Auth state injected via props — no @/ alias imports.
 *
 * @module auth/auth-guard
 */

import { useEffect, useState } from 'react';
import { useRouter } from '../adapters/router';
import { cn } from '../lib/utils';

// ============================================================================
// Types
// ============================================================================

/** Minimal auth state shape required by auth guards */
export interface AuthState {
  /** Authenticated user, or null when unauthenticated */
  user: { id: string; email?: string; role?: string } | null;
  /** True while auth state is being resolved */
  loading: boolean;
}

export interface AuthGuardProps {
  /** Content to render when authenticated */
  children: React.ReactNode;
  /** Auth state injected by the consuming application */
  authState: AuthState;
  /** Current pathname — used to build returnTo URL (default: '/') */
  pathname?: string;
  /** Where to redirect if not authenticated (default: /login) */
  redirectTo?: string;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Callback when authentication check fails */
  onAuthFailure?: () => void;
  /** Whether to show loading state (default: true) */
  showLoading?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Loading spinner
// ============================================================================

function DefaultLoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Checking authentication...</p>
      </div>
    </div>
  );
}

// ============================================================================
// AuthGuard
// ============================================================================

/**
 * Wraps protected content and handles authentication state.
 * Redirect happens via RouterAdapter — works in Next.js, Tauri, Capacitor.
 *
 * @example
 * ```tsx
 * <RouterAdapterContext.Provider value={nextjsAdapter}>
 *   <AuthGuard authState={authState} pathname={pathname}>
 *     <ProtectedPage />
 *   </AuthGuard>
 * </RouterAdapterContext.Provider>
 * ```
 */
export function AuthGuard({
  children,
  authState,
  pathname = '/',
  redirectTo = '/login',
  loadingComponent,
  onAuthFailure,
  showLoading = true,
  className,
}: AuthGuardProps) {
  const router = useRouter();
  const { user, loading } = authState;
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      onAuthFailure?.();
      const returnUrl = encodeURIComponent(pathname);
      const loginUrl = redirectTo.includes('?')
        ? `${redirectTo}&returnTo=${returnUrl}`
        : `${redirectTo}?returnTo=${returnUrl}`;
      router.replace(loginUrl);
    } else {
      setIsChecking(false);
    }
  }, [user, loading, router, pathname, redirectTo, onAuthFailure]);

  if (loading || isChecking) {
    if (!showLoading) return null;
    return <>{loadingComponent ?? <DefaultLoadingSpinner />}</>;
  }

  if (!user) return null;

  return <div className={cn(className)}>{children}</div>;
}

// ============================================================================
// GuestGuard
// ============================================================================

export interface GuestGuardProps {
  children: React.ReactNode;
  authState: AuthState;
  /** Where to redirect if authenticated (default: /chat) */
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
  showLoading?: boolean;
  className?: string;
}

/**
 * Redirects authenticated users away from public-only pages (login, signup).
 */
export function GuestGuard({
  children,
  authState,
  redirectTo = '/chat',
  loadingComponent,
  showLoading = true,
  className,
}: GuestGuardProps) {
  const router = useRouter();
  const { user, loading } = authState;
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(redirectTo);
    } else {
      setIsChecking(false);
    }
  }, [user, loading, router, redirectTo]);

  if (loading || isChecking) {
    if (!showLoading) return null;
    return <>{loadingComponent ?? <DefaultLoadingSpinner />}</>;
  }

  if (user) return null;

  return <div className={cn(className)}>{children}</div>;
}

// ============================================================================
// useAuthGuard hook
// ============================================================================

export interface UseAuthGuardOptions {
  authState: AuthState;
  pathname?: string;
  redirectTo?: string;
  onAuthFailure?: () => void;
}

/**
 * Hook version of AuthGuard — for imperative redirect control.
 */
export function useAuthGuard(options: UseAuthGuardOptions) {
  const router = useRouter();
  const { authState, pathname = '/', redirectTo = '/login', onAuthFailure } = options;
  const { user, loading } = authState;

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

// ============================================================================
// useGuestGuard hook
// ============================================================================

export interface UseGuestGuardOptions {
  authState: AuthState;
  redirectTo?: string;
}

/**
 * Hook version of GuestGuard.
 */
export function useGuestGuard(options: UseGuestGuardOptions) {
  const router = useRouter();
  const { authState, redirectTo = '/chat' } = options;
  const { user, loading } = authState;

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

// ============================================================================
// withAuthGuard HOC
// ============================================================================

/**
 * Higher-order component version of AuthGuard.
 */
export function withAuthGuard<P extends object>(
  WrappedComponent: React.ComponentType<P & { authState: AuthState; pathname?: string }>,
  options?: {
    redirectTo?: string;
    loadingComponent?: React.ReactNode;
  }
) {
  return function AuthGuardedComponent(
    props: P & { authState: AuthState; pathname?: string }
  ) {
    return (
      <AuthGuard
        authState={props.authState}
        pathname={props.pathname}
        redirectTo={options?.redirectTo}
        loadingComponent={options?.loadingComponent}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };
}

export default AuthGuard;
