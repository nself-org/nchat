"use client";

/**
 * ReconnectingIndicator - Animated indicator for reconnection state
 *
 * Shows a visual indicator when the application is attempting
 * to reconnect to the server.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

// =============================================================================
// Types
// =============================================================================

export interface ReconnectingIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showAttempts?: boolean;
  variant?: "spinner" | "dots" | "pulse";
}

// =============================================================================
// Component
// =============================================================================

export function ReconnectingIndicator({
  className,
  size = "md",
  showText = true,
  showAttempts = true,
  variant = "spinner",
}: ReconnectingIndicatorProps) {
  const { isReconnecting, reconnectAttempts } = useConnectionStatus();

  if (!isReconnecting) {
    return null;
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "spinner" && (
        <svg
          className={cn("animate-spin text-yellow-500", sizeClasses[size])}
          xmlns="http://www.w3.org/2000/svg"
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

      {variant === "dots" && (
        <div className="flex space-x-1">
          <div
            className={cn(
              "animate-bounce rounded-full bg-yellow-500",
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-2.5 w-2.5",
            )}
            style={{ animationDelay: "0ms" }}
          />
          <div
            className={cn(
              "animate-bounce rounded-full bg-yellow-500",
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-2.5 w-2.5",
            )}
            style={{ animationDelay: "150ms" }}
          />
          <div
            className={cn(
              "animate-bounce rounded-full bg-yellow-500",
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-2.5 w-2.5",
            )}
            style={{ animationDelay: "300ms" }}
          />
        </div>
      )}

      {variant === "pulse" && (
        <div className="relative">
          <div
            className={cn("rounded-full bg-yellow-500", sizeClasses[size])}
          />
          <div
            className={cn(
              "absolute inset-0 animate-ping rounded-full bg-yellow-500 opacity-75",
              sizeClasses[size],
            )}
          />
        </div>
      )}

      {showText && (
        <span
          className={cn(
            "font-medium text-yellow-600 dark:text-yellow-400",
            textSizeClasses[size],
          )}
        >
          Reconnecting
          {showAttempts && reconnectAttempts > 1 && (
            <span className="ml-1 text-muted-foreground">
              (attempt {reconnectAttempts})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default ReconnectingIndicator;
