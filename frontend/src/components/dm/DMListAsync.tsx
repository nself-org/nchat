"use client";

/**
 * DMListAsync — Direct Message list surface with 7-state AsyncScreen contract.
 *
 * Purpose: Wraps DM conversation list with skeleton loading, offline banner,
 *          permission-denied for unauthed / unauth'd, empty state, errors.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: DMList: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { DMList } from "./DMList";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface DMListAsyncProps
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
// DM skeleton
// =============================================================================

function DMListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2" data-testid="dm-list-skeleton">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function DMListAsync({
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
}: DMListAsyncProps) {
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
      loadingSlot={<DMListSkeleton />}
      emptyTitle="No direct messages"
      emptyMessage="Start a conversation by clicking the compose button."
      className={cn("flex flex-col h-full", className)}
    >
      <DMList />
    </AsyncScreen>
  );
}
