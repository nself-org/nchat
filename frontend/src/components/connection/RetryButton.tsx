"use client";

/**
 * RetryButton - Manual retry button component
 *
 * Provides a button for manually retrying failed operations
 * or triggering reconnection.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

// =============================================================================
// Types
// =============================================================================

export interface RetryButtonProps extends Omit<ButtonProps, "onClick"> {
  mode?: "connection" | "queue" | "both";
  showIcon?: boolean;
  showCount?: boolean;
  onRetry?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function RetryButton({
  className,
  mode = "both",
  showIcon = true,
  showCount = true,
  onRetry,
  children,
  ...props
}: RetryButtonProps) {
  const { isOffline, isReconnecting, reconnect } = useConnectionStatus();
  const { stats, retryFailed, isProcessing } = useOfflineQueue();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const failedCount = stats.failed;
  const hasFailedItems = failedCount > 0;
  const showRetryQueue =
    (mode === "queue" || mode === "both") && hasFailedItems;
  const showReconnect = (mode === "connection" || mode === "both") && isOffline;

  const handleClick = async () => {
    setIsRetrying(true);

    try {
      if (onRetry) {
        await onRetry();
      } else {
        if (showReconnect) {
          reconnect();
        }
        if (showRetryQueue) {
          await retryFailed();
        }
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const isLoading = isRetrying || isProcessing || isReconnecting;

  // Determine button text
  let buttonText = children;
  if (!buttonText) {
    if (showReconnect && showRetryQueue) {
      buttonText = "Retry All";
    } else if (showReconnect) {
      buttonText = "Reconnect";
    } else if (showRetryQueue) {
      buttonText = `Retry${showCount && failedCount > 0 ? ` (${failedCount})` : ""}`;
    } else {
      buttonText = "Retry";
    }
  }

  // Don't show if nothing to retry
  if (!showReconnect && !showRetryQueue && !onRetry) {
    return null;
  }

  return (
    <Button
      className={cn(className)}
      onClick={handleClick}
      disabled={isLoading}
      {...props}
    >
      {showIcon &&
        (isLoading ? (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
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
        ) : (
          <svg
            className="mr-2 h-4 w-4"
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
        ))}
      {buttonText}
    </Button>
  );
}

export default RetryButton;
