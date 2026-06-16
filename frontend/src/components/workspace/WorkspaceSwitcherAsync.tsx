"use client";

/**
 * WorkspaceSwitcherAsync — WorkspaceSwitcher surface with 7-state AsyncScreen.
 *
 * Purpose: Wraps workspace list with all 7 async states; skeleton during load,
 *          permission-denied for unauthed/unauth'd, offline banner, etc.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: WorkspaceSwitcher: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface WorkspaceSwitcherAsyncProps
  extends Pick<
    AsyncScreenProps,
    | "onLoginRedirect"
    | "onRequestAccess"
    | "isNetworkOffline"
    | "isReconnecting"
    | "error"
    | "onRetry"
    | "rateLimitRetryAfterMs"
    | "onRateLimitRetry"
  > {
  state: AsyncState;
  permissionKind?: AsyncScreenProps["permissionKind"];
  className?: string;
}

// =============================================================================
// Workspace skeleton
// =============================================================================

function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2" data-testid="workspace-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 rounded-md p-2">
          <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceSwitcherAsync({
  state,
  permissionKind = "unauthorized",
  onLoginRedirect,
  onRequestAccess,
  isNetworkOffline,
  isReconnecting,
  error,
  onRetry,
  rateLimitRetryAfterMs,
  onRateLimitRetry,
  className,
}: WorkspaceSwitcherAsyncProps) {
  return (
    <AsyncScreen
      state={state}
      permissionKind={permissionKind}
      onLoginRedirect={onLoginRedirect}
      onRequestAccess={onRequestAccess}
      isNetworkOffline={isNetworkOffline}
      isReconnecting={isReconnecting}
      error={error}
      onRetry={onRetry}
      rateLimitRetryAfterMs={rateLimitRetryAfterMs}
      onRateLimitRetry={onRateLimitRetry}
      loadingSlot={<WorkspaceSkeleton />}
      emptyTitle="No workspaces"
      emptyMessage="Join or create a workspace to get started."
      className={cn("flex flex-col", className)}
    >
      <WorkspaceSwitcher />
    </AsyncScreen>
  );
}
