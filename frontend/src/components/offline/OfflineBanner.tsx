"use client";

/**
 * OfflineBanner - Banner for offline mode
 *
 * Shows a banner indicating the app is in offline mode
 * with access to cached content.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineStore } from "@/stores/offline-store";

// =============================================================================
// Types
// =============================================================================

export interface OfflineBannerProps {
  className?: string;
  position?: "top" | "bottom";
  dismissible?: boolean;
  showCacheInfo?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function OfflineBanner({
  className,
  position = "top",
  dismissible = true,
  showCacheInfo = true,
}: OfflineBannerProps) {
  const { isOffline, offlineDurationText, reconnect, dismissBanner } =
    useConnectionStatus();
  const { cachedChannelIds, cacheStats, pendingMessages, queuedActions } =
    useOfflineStore();
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!isOffline || isDismissed) {
    return null;
  }

  const pendingCount =
    pendingMessages.length +
    queuedActions.filter((a) => a.status === "pending").length;

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissBanner();
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 bg-gray-800 dark:bg-gray-900",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      role="alert"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Main content */}
          <div className="flex items-start gap-3">
            {/* Offline icon */}
            <div className="flex-shrink-0 rounded-full bg-gray-700 p-2">
              <svg
                className="h-5 w-5 text-gray-300"
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
            </div>

            {/* Text content */}
            <div>
              <p className="text-sm font-medium text-white">
                You&apos;re viewing cached content
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-300">
                {offlineDurationText && (
                  <p>Offline for {offlineDurationText}</p>
                )}
                {showCacheInfo && (
                  <p>
                    {cachedChannelIds.length > 0 ? (
                      <>
                        {cachedChannelIds.length} cached channel
                        {cachedChannelIds.length !== 1 ? "s" : ""} available
                      </>
                    ) : (
                      "Limited cached content available"
                    )}
                  </p>
                )}
                {pendingCount > 0 && (
                  <p className="text-yellow-300">
                    {pendingCount} pending action{pendingCount !== 1 ? "s" : ""}{" "}
                    will sync when online
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => reconnect()}
              className="border-0 bg-gray-700 text-white hover:bg-gray-600"
            >
              <svg
                className="mr-1.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </Button>
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="rounded p-1.5 text-gray-300 hover:bg-gray-700 hover:text-white"
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
    </div>
  );
}

export default OfflineBanner;
