"use client";

/**
 * ConnectionStatus - Connection status indicator component
 *
 * Shows a visual indicator of the current connection state.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import type { ConnectionState } from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  showQuality?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "dot" | "badge" | "icon";
}

// =============================================================================
// Helpers
// =============================================================================

function getStatusColor(state: ConnectionState): string {
  switch (state) {
    case "online":
      return "bg-green-500";
    case "connecting":
    case "reconnecting":
      return "bg-yellow-500";
    case "offline":
      return "bg-gray-400";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getStatusTextColor(state: ConnectionState): string {
  switch (state) {
    case "online":
      return "text-green-600 dark:text-green-400";
    case "connecting":
    case "reconnecting":
      return "text-yellow-600 dark:text-yellow-400";
    case "offline":
      return "text-gray-500 dark:text-gray-400";
    case "error":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-500";
  }
}

function getDotSize(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "h-2 w-2";
    case "md":
      return "h-2.5 w-2.5";
    case "lg":
      return "h-3 w-3";
    default:
      return "h-2.5 w-2.5";
  }
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionStatus({
  className,
  showText = false,
  showQuality = false,
  size = "md",
  variant = "dot",
}: ConnectionStatusProps) {
  const {
    state,
    stateText,
    networkQuality,
    networkQualityText,
    isReconnecting,
    reconnectAttempts,
  } = useConnectionStatus();

  const dotSizeClass = getDotSize(size);
  const statusColor = getStatusColor(state);
  const textColor = getStatusTextColor(state);
  const isPulsing = state === "connecting" || state === "reconnecting";

  if (variant === "dot") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <div
            className={cn(
              "rounded-full",
              dotSizeClass,
              statusColor,
              isPulsing && "animate-pulse",
            )}
          />
          {isPulsing && (
            <div
              className={cn(
                "absolute inset-0 animate-ping rounded-full opacity-75",
                statusColor,
              )}
            />
          )}
        </div>
        {showText && (
          <span className={cn("text-sm font-medium", textColor)}>
            {stateText}
            {isReconnecting && reconnectAttempts > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({reconnectAttempts})
              </span>
            )}
          </span>
        )}
        {showQuality && state === "online" && networkQuality !== "unknown" && (
          <span className="text-xs text-muted-foreground">
            ({networkQualityText})
          </span>
        )}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
          state === "online" && "bg-green-100 dark:bg-green-900/30",
          (state === "connecting" || state === "reconnecting") &&
            "bg-yellow-100 dark:bg-yellow-900/30",
          state === "offline" && "bg-gray-100 dark:bg-gray-800",
          state === "error" && "bg-red-100 dark:bg-red-900/30",
          className,
        )}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            statusColor,
            isPulsing && "animate-pulse",
          )}
        />
        <span className={cn("text-xs font-medium", textColor)}>
          {stateText}
        </span>
      </div>
    );
  }

  // Icon variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {state === "online" && (
        <svg
          className="h-4 w-4 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {state === "offline" && (
        <svg
          className="h-4 w-4 text-gray-400"
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
      {(state === "connecting" || state === "reconnecting") && (
        <svg
          className="h-4 w-4 animate-spin text-yellow-500"
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
      {state === "error" && (
        <svg
          className="h-4 w-4 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
      {showText && (
        <span className={cn("text-sm", textColor)}>{stateText}</span>
      )}
    </div>
  );
}

export default ConnectionStatus;
