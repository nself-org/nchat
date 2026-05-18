"use client";

/**
 * OfflineIndicator - Indicator for offline mode
 *
 * Shows when the application is in offline mode with
 * information about cached data availability.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineStore } from "@/stores/offline-store";

// =============================================================================
// Types
// =============================================================================

export interface OfflineIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "detailed";
  showCacheInfo?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function OfflineIndicator({
  className,
  size = "md",
  variant = "minimal",
  showCacheInfo = false,
}: OfflineIndicatorProps) {
  const { isOffline, offlineDurationText } = useConnectionStatus();
  const { cacheStats, cachedChannelIds } = useOfflineStore();

  if (!isOffline) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-gray-500 dark:text-gray-400",
          sizeClasses[size],
          className,
        )}
      >
        <svg
          className={cn(iconSizes[size])}
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
        <span>Offline</span>
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-gray-200 p-2 dark:bg-gray-700">
          <svg
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
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

        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            You&apos;re offline
          </h4>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {offlineDurationText
              ? `Disconnected ${offlineDurationText} ago`
              : "No internet connection"}
          </p>

          {showCacheInfo && (
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Cached data available:</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                {cachedChannelIds.length > 0 && (
                  <li>
                    {cachedChannelIds.length} channel
                    {cachedChannelIds.length !== 1 ? "s" : ""}
                  </li>
                )}
                {cacheStats?.messageCount && cacheStats.messageCount > 0 && (
                  <li>
                    {cacheStats.messageCount} message
                    {cacheStats.messageCount !== 1 ? "s" : ""}
                  </li>
                )}
                {!cachedChannelIds.length && !cacheStats?.messageCount && (
                  <li>No cached data</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineIndicator;
