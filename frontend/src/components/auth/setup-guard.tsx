/**
 * SetupGuard Component
 *
 * Manages the setup wizard flow.
 * - Redirects to setup if setup is not complete (for owner)
 * - Prevents access to setup if already complete
 * - Allows setup access only to owner role
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { isOwner } from "@/lib/auth/roles";

interface SetupGuardProps {
  /** Content to render */
  children: React.ReactNode;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Where to redirect if setup is complete (for setup pages) */
  onCompleteRedirectTo?: string;
  /** Where to redirect if setup is incomplete (for non-setup pages) */
  onIncompleteRedirectTo?: string;
}

/**
 * Default loading component
 */
function DefaultSetupLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">
          Checking setup status...
        </p>
      </div>
    </div>
  );
}

/**
 * Setup pending message for non-owners
 */
function SetupPendingMessage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
        <div className="bg-warning/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="text-warning h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Setup In Progress
        </h2>

        <p className="mb-4 text-muted-foreground">
          The system administrator is completing the initial setup. Please check
          back shortly.
        </p>

        <button
          onClick={() => router.refresh()}
          className="text-primary-foreground hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

/**
 * RequireSetupComplete - Only allow access if setup is complete
 * Used for main app pages (chat, settings, etc.)
 */
export function RequireSetupComplete({
  children,
  loadingComponent,
  redirectTo = "/setup",
}: {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();
  const [status, setStatus] = useState<
    "loading" | "complete" | "incomplete" | "pending"
  >("loading");

  useEffect(() => {
    if (authLoading || configLoading) return;

    const setupComplete = config.setup?.isCompleted ?? false;

    if (setupComplete) {
      setStatus("complete");
    } else if (user && isOwner(user.role)) {
      // Owner needs to complete setup - redirect to setup wizard
      setStatus("incomplete");
      router.replace(redirectTo);
    } else if (user) {
      // Non-owner user, setup not complete - show pending message
      setStatus("pending");
    } else {
      // Not authenticated - let auth guard handle it
      setStatus("complete");
    }
  }, [
    authLoading,
    configLoading,
    config.setup?.isCompleted,
    user,
    router,
    redirectTo,
  ]);

  if (status === "loading" || authLoading || configLoading) {
    return loadingComponent ?? <DefaultSetupLoading />;
  }

  if (status === "incomplete") {
    // Redirecting to setup
    return loadingComponent ?? <DefaultSetupLoading />;
  }

  if (status === "pending") {
    return <SetupPendingMessage />;
  }

  return <>{children}</>;
}

/**
 * RequireSetupIncomplete - Only allow access if setup is NOT complete
 * Used for setup wizard pages
 */
export function RequireSetupIncomplete({
  children,
  loadingComponent,
  redirectTo = "/chat",
}: {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || configLoading) return;

    const setupComplete = config.setup?.isCompleted ?? false;

    if (setupComplete) {
      // Setup already complete, redirect away
      router.replace(redirectTo);
      setIsAllowed(false);
    } else if (user && isOwner(user.role)) {
      // Owner can access setup
      setIsAllowed(true);
    } else if (user) {
      // Non-owner cannot access setup
      router.replace("/chat");
      setIsAllowed(false);
    } else {
      // Not authenticated - redirect to login
      router.replace("/login");
      setIsAllowed(false);
    }
  }, [
    authLoading,
    configLoading,
    config.setup?.isCompleted,
    user,
    router,
    redirectTo,
  ]);

  if (isAllowed === null || authLoading || configLoading) {
    return loadingComponent ?? <DefaultSetupLoading />;
  }

  if (!isAllowed) {
    return loadingComponent ?? <DefaultSetupLoading />;
  }

  return <>{children}</>;
}

/**
 * SetupGuard - Smart guard that handles both cases
 * Detects if current page is a setup page based on pathname
 */
export function SetupGuard({
  children,
  loadingComponent,
  onCompleteRedirectTo = "/chat",
  onIncompleteRedirectTo = "/setup",
}: SetupGuardProps) {
  const pathname = usePathname();
  const isSetupPage = pathname.startsWith("/setup");

  if (isSetupPage) {
    return (
      <RequireSetupIncomplete
        loadingComponent={loadingComponent}
        redirectTo={onCompleteRedirectTo}
      >
        {children}
      </RequireSetupIncomplete>
    );
  }

  return (
    <RequireSetupComplete
      loadingComponent={loadingComponent}
      redirectTo={onIncompleteRedirectTo}
    >
      {children}
    </RequireSetupComplete>
  );
}

/**
 * Hook for setup status
 */
export function useSetupStatus(): {
  isComplete: boolean;
  isLoading: boolean;
  currentStep: number;
  canAccessSetup: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();

  const isLoading = authLoading || configLoading;
  const isComplete = config.setup?.isCompleted ?? false;
  const currentStep = config.setup?.currentStep ?? 0;
  const canAccessSetup = user ? isOwner(user.role) && !isComplete : false;

  return {
    isComplete,
    isLoading,
    currentStep,
    canAccessSetup,
  };
}

/**
 * Hook to check if owner needs to complete setup
 */
export function useRequiresSetup(): boolean {
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();

  if (authLoading || configLoading) return false;
  if (!user) return false;

  const setupComplete = config.setup?.isCompleted ?? false;
  return isOwner(user.role) && !setupComplete;
}

export default SetupGuard;
