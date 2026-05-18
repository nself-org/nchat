/**
 * SetupGuard — manages initial setup wizard flow.
 *
 * Decoupled from Next.js navigation and @/ aliases.
 * Setup state and role check injected via props.
 *
 * @module auth/setup-guard
 */

import { useEffect, useState } from 'react';
import { useRouter } from '../adapters/router';
import type { AuthState } from './auth-guard';

// ============================================================================
// Types
// ============================================================================

/** App setup configuration shape */
export interface SetupConfig {
  /** Whether initial setup has been completed */
  isCompleted: boolean;
  /** Current setup step index */
  currentStep?: number;
}

export interface SetupGuardProps {
  children: React.ReactNode;
  /** Injected auth state */
  authState: AuthState;
  /** Injected setup configuration */
  setupConfig: SetupConfig;
  /** Whether setup config is still loading */
  setupLoading?: boolean;
  /**
   * Returns true if the user has the owner role.
   * Defaults to checking `user.role === 'owner'`.
   */
  isOwner?: (role: string) => boolean;
  /** Current pathname — used to detect setup pages */
  pathname?: string;
  loadingComponent?: React.ReactNode;
  /** Where to redirect when setup is complete (for setup pages) */
  onCompleteRedirectTo?: string;
  /** Where to redirect when setup is incomplete (for non-setup pages) */
  onIncompleteRedirectTo?: string;
}

// ============================================================================
// Loading / pending UI
// ============================================================================

function DefaultSetupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Checking setup status...</p>
      </div>
    </div>
  );
}

function SetupPendingMessage({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
        <div className="bg-warning/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg className="text-warning h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">Setup In Progress</h2>
        <p className="mb-4 text-muted-foreground">
          The system administrator is completing the initial setup. Please check back shortly.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-primary-foreground hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RequireSetupComplete
// ============================================================================

export interface RequireSetupCompleteProps {
  children: React.ReactNode;
  authState: AuthState;
  setupConfig: SetupConfig;
  setupLoading?: boolean;
  isOwner?: (role: string) => boolean;
  loadingComponent?: React.ReactNode;
  redirectTo?: string;
  onRefresh?: () => void;
}

/**
 * Only allows access when setup is complete.
 * Used for main app pages (chat, settings, etc.).
 */
export function RequireSetupComplete({
  children,
  authState,
  setupConfig,
  setupLoading = false,
  isOwner = (role) => role === 'owner',
  loadingComponent,
  redirectTo = '/setup',
  onRefresh,
}: RequireSetupCompleteProps) {
  const router = useRouter();
  const { user, loading: authLoading } = authState;
  const [status, setStatus] = useState<'loading' | 'complete' | 'incomplete' | 'pending'>('loading');

  useEffect(() => {
    if (authLoading || setupLoading) return;

    const setupComplete = setupConfig.isCompleted;

    if (setupComplete) {
      setStatus('complete');
    } else if (user?.role && isOwner(user.role)) {
      setStatus('incomplete');
      router.replace(redirectTo);
    } else if (user) {
      setStatus('pending');
    } else {
      setStatus('complete'); // Let auth guard handle unauthenticated
    }
  }, [authLoading, setupLoading, setupConfig.isCompleted, user, router, redirectTo, isOwner]);

  if (status === 'loading' || authLoading || setupLoading) {
    return <>{loadingComponent ?? <DefaultSetupLoading />}</>;
  }
  if (status === 'incomplete') {
    return <>{loadingComponent ?? <DefaultSetupLoading />}</>;
  }
  if (status === 'pending') {
    return <SetupPendingMessage onRefresh={onRefresh} />;
  }
  return <>{children}</>;
}

// ============================================================================
// RequireSetupIncomplete
// ============================================================================

export interface RequireSetupIncompleteProps {
  children: React.ReactNode;
  authState: AuthState;
  setupConfig: SetupConfig;
  setupLoading?: boolean;
  isOwner?: (role: string) => boolean;
  loadingComponent?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Only allows access when setup is NOT complete.
 * Used for setup wizard pages.
 */
export function RequireSetupIncomplete({
  children,
  authState,
  setupConfig,
  setupLoading = false,
  isOwner = (role) => role === 'owner',
  loadingComponent,
  redirectTo = '/chat',
}: RequireSetupIncompleteProps) {
  const router = useRouter();
  const { user, loading: authLoading } = authState;
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || setupLoading) return;

    const setupComplete = setupConfig.isCompleted;

    if (setupComplete) {
      router.replace(redirectTo);
      setIsAllowed(false);
    } else if (user?.role && isOwner(user.role)) {
      setIsAllowed(true);
    } else if (user) {
      router.replace('/chat');
      setIsAllowed(false);
    } else {
      router.replace('/login');
      setIsAllowed(false);
    }
  }, [authLoading, setupLoading, setupConfig.isCompleted, user, router, redirectTo, isOwner]);

  if (isAllowed === null || authLoading || setupLoading) {
    return <>{loadingComponent ?? <DefaultSetupLoading />}</>;
  }
  if (!isAllowed) {
    return <>{loadingComponent ?? <DefaultSetupLoading />}</>;
  }
  return <>{children}</>;
}

// ============================================================================
// SetupGuard (smart — detects setup pages by pathname)
// ============================================================================

/**
 * Smart guard that detects whether the current page is a setup page
 * and delegates to RequireSetupIncomplete or RequireSetupComplete.
 */
export function SetupGuard({
  pathname = '/',
  onCompleteRedirectTo = '/chat',
  onIncompleteRedirectTo = '/setup',
  loadingComponent,
  ...props
}: SetupGuardProps) {
  const isSetupPage = pathname.startsWith('/setup');

  if (isSetupPage) {
    return (
      <RequireSetupIncomplete
        {...props}
        loadingComponent={loadingComponent}
        redirectTo={onCompleteRedirectTo}
      />
    );
  }

  return (
    <RequireSetupComplete
      {...props}
      loadingComponent={loadingComponent}
      redirectTo={onIncompleteRedirectTo}
    />
  );
}

// ============================================================================
// Hooks
// ============================================================================

export interface UseSetupStatusOptions {
  authState: AuthState;
  setupConfig: SetupConfig;
  setupLoading?: boolean;
  isOwner?: (role: string) => boolean;
}

/** Returns setup status derived from injected state */
export function useSetupStatus(options: UseSetupStatusOptions) {
  const { authState, setupConfig, setupLoading = false, isOwner = (role) => role === 'owner' } = options;
  const { user, loading: authLoading } = authState;

  const isLoading = authLoading || setupLoading;
  const isComplete = setupConfig.isCompleted;
  const currentStep = setupConfig.currentStep ?? 0;
  const canAccessSetup = user?.role ? isOwner(user.role) && !isComplete : false;

  return { isComplete, isLoading, currentStep, canAccessSetup };
}

/** Returns true when the owner needs to complete setup */
export function useRequiresSetup(options: UseSetupStatusOptions): boolean {
  const { authState, setupConfig, setupLoading = false, isOwner = (role) => role === 'owner' } = options;
  const { user, loading: authLoading } = authState;

  if (authLoading || setupLoading) return false;
  if (!user?.role) return false;
  return isOwner(user.role) && !setupConfig.isCompleted;
}

export default SetupGuard;
