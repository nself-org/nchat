"use client";

/**
 * SettingsPanelAsync — Settings surface with 7-state AsyncScreen contract.
 *
 * Purpose: Wraps settings panel with all 7 async states; skeleton while prefs
 *          load, permission-denied (unauthed only — settings always allow'd if
 *          authed), error with retry, offline banner.
 * Constraints: Settings are always accessible to authenticated users; the only
 *              permission-denied case is unauthenticated.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: SettingsPanel: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface SettingsPanelAsyncProps
  extends Pick<
    AsyncScreenProps,
    | "onLoginRedirect"
    | "isNetworkOffline"
    | "isReconnecting"
    | "error"
    | "onRetry"
    | "rateLimitRetryAfterMs"
    | "onRateLimitRetry"
  > {
  state: AsyncState;
  children: React.ReactNode;
  className?: string;
}

// =============================================================================
// Settings skeleton
// =============================================================================

function SettingsSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 p-6"
      data-testid="settings-panel-skeleton"
    >
      {/* Section header */}
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      {/* Fields */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SettingsPanelAsync({
  state,
  children,
  onLoginRedirect,
  isNetworkOffline,
  isReconnecting,
  error,
  onRetry,
  rateLimitRetryAfterMs,
  onRateLimitRetry,
  className,
}: SettingsPanelAsyncProps) {
  return (
    <AsyncScreen
      state={state}
      // Settings are always "unauthorized" = unauthenticated (only one case)
      permissionKind="unauthenticated"
      onLoginRedirect={onLoginRedirect}
      isNetworkOffline={isNetworkOffline}
      isReconnecting={isReconnecting}
      error={error}
      onRetry={onRetry}
      rateLimitRetryAfterMs={rateLimitRetryAfterMs}
      onRateLimitRetry={onRateLimitRetry}
      loadingSlot={<SettingsSkeleton />}
      emptyTitle="No settings available"
      className={cn("flex flex-col", className)}
    >
      {children}
    </AsyncScreen>
  );
}
