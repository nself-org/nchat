"use client";

/**
 * AsyncScreen — 7-state data surface wrapper for all nchat chat surfaces.
 *
 * Purpose: Enforce a consistent 7-state async contract across every data
 *          surface: loading, empty, error, permission-denied, rate-limited,
 *          offline, and connected (renders children).
 * Inputs:  State flags + optional slot overrides per state.
 * Outputs: Correct UI for whichever state is active; children when connected.
 * Constraints: Must cover BOTH unauthenticated (→ login redirect) AND
 *              unauthorized (→ access request CTA) as permission-denied.
 *              Offline covers network-offline AND Hasura subscription drop.
 * SPORT: REGISTRY-WEB-SURFACES.md — nchat web: 7-state contract: complete
 */

import * as React from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  WifiOff,
  RefreshCw,
  ShieldOff,
  LogIn,
  Clock,
  AlertCircle,
} from "lucide-react";

// =============================================================================
// 7 States
// =============================================================================

export type AsyncState =
  | "loading"
  | "empty"
  | "error"
  | "permission-denied"
  | "rate-limited"
  | "offline"
  | "connected";

/**
 * Permission-denied sub-type:
 * - "unauthenticated": no valid JWT → redirect to login
 * - "unauthorized": valid JWT but missing channel membership
 */
export type PermissionDeniedKind = "unauthenticated" | "unauthorized";

// =============================================================================
// Props
// =============================================================================

export interface AsyncScreenProps {
  state: AsyncState;
  children: React.ReactNode;

  // --- Loading ---
  loadingSlot?: React.ReactNode;

  // --- Empty ---
  emptySlot?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;

  // --- Error ---
  errorSlot?: React.ReactNode;
  error?: Error | string | null;
  onRetry?: () => void;

  // --- Permission-denied ---
  permissionKind?: PermissionDeniedKind;
  channelName?: string;
  onLoginRedirect?: () => void;
  onRequestAccess?: () => void;

  // --- Rate-limited ---
  rateLimitRetryAfterMs?: number;
  onRateLimitRetry?: () => void;

  // --- Offline ---
  /** true = network offline; false = Hasura subscription disconnected */
  isNetworkOffline?: boolean;
  isReconnecting?: boolean;

  className?: string;
}

// =============================================================================
// Internal state renderers
// =============================================================================

function LoadingView({ slot }: { slot?: React.ReactNode }) {
  if (slot) return <>{slot}</>;
  return (
    <div
      className="flex flex-1 items-center justify-center p-8"
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyView({
  slot,
  title,
  message,
}: {
  slot?: React.ReactNode;
  title?: string;
  message?: string;
}) {
  if (slot) return <>{slot}</>;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        {title ?? "Nothing here yet"}
      </p>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

function ErrorView({
  slot,
  error,
  onRetry,
}: {
  slot?: React.ReactNode;
  error?: Error | string | null;
  onRetry?: () => void;
}) {
  if (slot) return <>{slot}</>;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Something went wrong.";
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

function PermissionDeniedView({
  kind,
  channelName,
  onLoginRedirect,
  onRequestAccess,
}: {
  kind: PermissionDeniedKind;
  channelName?: string;
  onLoginRedirect?: () => void;
  onRequestAccess?: () => void;
}) {
  if (kind === "unauthenticated") {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
        role="alert"
        data-testid="async-screen-unauthenticated"
      >
        <LogIn className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Sign in to continue</p>
        <p className="text-xs text-muted-foreground">
          Your session has expired or you are not signed in.
        </p>
        {onLoginRedirect && (
          <Button size="sm" onClick={onLoginRedirect}>
            Sign in
          </Button>
        )}
      </div>
    );
  }

  // unauthorized
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
      data-testid="async-screen-unauthorized"
    >
      <ShieldOff className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {channelName
          ? `You don't have access to #${channelName}`
          : "Access denied"}
      </p>
      <p className="text-xs text-muted-foreground">
        Request access from a workspace admin.
      </p>
      {onRequestAccess && (
        <Button size="sm" variant="outline" onClick={onRequestAccess}>
          Request access
        </Button>
      )}
    </div>
  );
}

function RateLimitedView({
  retryAfterMs,
  onRetry,
}: {
  retryAfterMs?: number;
  onRetry?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number>(
    retryAfterMs ? Math.ceil(retryAfterMs / 1000) : 0,
  );

  useEffect(() => {
    if (!retryAfterMs || retryAfterMs <= 0) return;
    setSecondsLeft(Math.ceil(retryAfterMs / 1000));
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfterMs]);

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      role="alert"
      data-testid="async-screen-rate-limited"
    >
      <Clock className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Slow down</p>
      <p className="text-xs text-muted-foreground">
        {secondsLeft > 0
          ? `Message not sent. Try in ${secondsLeft}s`
          : "Message not sent. You can try again now."}
      </p>
      {onRetry && secondsLeft === 0 && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

function OfflineView({
  isNetworkOffline,
  isReconnecting,
}: {
  isNetworkOffline?: boolean;
  isReconnecting?: boolean;
}) {
  if (isReconnecting) {
    return (
      <div
        className="flex items-center gap-2 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        role="status"
        aria-live="polite"
        data-testid="async-screen-reconnecting"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Reconnecting&hellip;</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 bg-gray-100 px-4 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      role="status"
      aria-live="polite"
      data-testid="async-screen-offline"
    >
      <WifiOff className="h-4 w-4" />
      <span>
        {isNetworkOffline
          ? "You're offline — messages will send when you reconnect"
          : "Connection lost — messages will send when reconnected"}
      </span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AsyncScreen wraps any nchat data surface and renders the correct
 * state-driven UI. Pass `state="connected"` to render children normally.
 */
export function AsyncScreen({
  state,
  children,
  loadingSlot,
  emptySlot,
  emptyTitle,
  emptyMessage,
  errorSlot,
  error,
  onRetry,
  permissionKind = "unauthorized",
  channelName,
  onLoginRedirect,
  onRequestAccess,
  rateLimitRetryAfterMs,
  onRateLimitRetry,
  isNetworkOffline,
  isReconnecting,
  className,
}: AsyncScreenProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      data-async-state={state}
    >
      {/* Offline banner always rendered at top when relevant, children still show below */}
      {state === "offline" && (
        <OfflineView
          isNetworkOffline={isNetworkOffline}
          isReconnecting={isReconnecting}
        />
      )}

      {state === "loading" && <LoadingView slot={loadingSlot} />}
      {state === "empty" && (
        <EmptyView slot={emptySlot} title={emptyTitle} message={emptyMessage} />
      )}
      {state === "error" && (
        <ErrorView slot={errorSlot} error={error} onRetry={onRetry} />
      )}
      {state === "permission-denied" && (
        <PermissionDeniedView
          kind={permissionKind}
          channelName={channelName}
          onLoginRedirect={onLoginRedirect}
          onRequestAccess={onRequestAccess}
        />
      )}
      {state === "rate-limited" && (
        <RateLimitedView
          retryAfterMs={rateLimitRetryAfterMs}
          onRetry={onRateLimitRetry}
        />
      )}

      {/* Children always rendered when connected; offline shows banner above children */}
      {(state === "connected" || state === "offline") && children}
    </div>
  );
}
