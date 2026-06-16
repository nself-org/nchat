"use client";

/**
 * NotificationFeedAsync — Notification feed surface with 7-state AsyncScreen.
 *
 * Purpose: Wraps notification list with all 7 async states; loading skeleton,
 *          empty state, error with retry, permission-denied, rate-limit, offline.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: NotificationFeed: 7-state: complete
 */

import * as React from "react";
import { AsyncScreen, type AsyncState, type AsyncScreenProps } from "@/components/common/AsyncScreen";
import { NotificationList } from "./NotificationList";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface NotificationFeedAsyncProps
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
// Notification skeleton
// =============================================================================

function NotificationSkeleton() {
  return (
    <div
      className="flex flex-col gap-1 p-3"
      data-testid="notification-feed-skeleton"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md p-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function NotificationFeedAsync({
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
}: NotificationFeedAsyncProps) {
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
      loadingSlot={<NotificationSkeleton />}
      emptyTitle="No notifications"
      emptyMessage="You're all caught up."
      className={cn("flex flex-col h-full", className)}
    >
      <NotificationList />
    </AsyncScreen>
  );
}
