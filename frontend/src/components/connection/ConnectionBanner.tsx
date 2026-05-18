"use client";

/**
 * ConnectionBanner - Banner displayed when disconnected
 *
 * Shows a prominent banner at the top of the screen when
 * the connection is lost, with reconnection status.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineStore } from "@/stores/offline-store";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionBannerProps {
  className?: string;
  position?: "top" | "bottom";
  dismissible?: boolean;
  showPendingCount?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionBanner({
  className,
  position = "top",
  dismissible = true,
  showPendingCount = true,
}: ConnectionBannerProps) {
  const {
    state,
    isOffline,
    isReconnecting,
    reconnectAttempts,
    offlineDurationText,
    showBanner,
    reconnect,
    cancelReconnect,
    dismissBanner,
  } = useConnectionStatus();

  const pendingCount = useOfflineStore(
    (s) =>
      s.queuedActions.filter((a) => a.status === "pending").length +
      s.pendingMessages.length,
  );

  // Don't show if online or banner is dismissed
  if (!showBanner || state === "online") {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 px-4 py-2",
        position === "top" ? "top-0" : "bottom-0",
        isOffline && "bg-gray-900 dark:bg-gray-800",
        isReconnecting && "bg-yellow-600 dark:bg-yellow-700",
        state === "error" && "bg-red-600 dark:bg-red-700",
        className,
      )}
      role="alert"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status icon */}
          {isOffline && !isReconnecting && (
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          )}
          {isReconnecting && (
            <svg
              className="h-5 w-5 animate-spin text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {/* Message */}
          <div className="text-white">
            <p className="text-sm font-medium">
              {isOffline && !isReconnecting && "You are offline"}
              {isReconnecting &&
                `Reconnecting${reconnectAttempts > 1 ? ` (attempt ${reconnectAttempts})` : ""}...`}
              {state === "error" && "Connection error"}
            </p>
            {offlineDurationText && !isReconnecting && (
              <p className="text-xs text-white/70">
                Offline for {offlineDurationText}
              </p>
            )}
            {showPendingCount && pendingCount > 0 && (
              <p className="text-xs text-white/70">
                {pendingCount} pending{" "}
                {pendingCount === 1 ? "message" : "messages"}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isOffline && !isReconnecting && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reconnect()}
              className="border-0 bg-white/20 text-white hover:bg-white/30"
            >
              Reconnect
            </Button>
          )}
          {isReconnecting && (
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelReconnect}
              className="border-0 bg-white/20 text-white hover:bg-white/30"
            >
              Cancel
            </Button>
          )}
          {dismissible && (
            <button
              onClick={dismissBanner}
              className="rounded p-1 text-white hover:bg-white/20"
              aria-label="Dismiss"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectionBanner;
