"use client";

/**
 * PendingMessages - Display for messages waiting to send
 *
 * Shows a list or count of messages that are queued
 * to be sent when connection is restored.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOfflineStore, type PendingMessage } from "@/stores/offline-store";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

// =============================================================================
// Types
// =============================================================================

export interface PendingMessagesProps {
  className?: string;
  channelId?: string;
  showList?: boolean;
  maxVisible?: number;
  onRetry?: () => void;
  onCancel?: (messageId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function PendingMessages({
  className,
  channelId,
  showList = false,
  maxVisible = 5,
  onRetry,
  onCancel,
}: PendingMessagesProps) {
  const pendingMessages = useOfflineStore((state) =>
    channelId
      ? state.pendingMessages.filter((m) => m.channelId === channelId)
      : state.pendingMessages,
  );

  const { items: queuedActions, retryFailed } = useOfflineQueue();

  // Get send_message actions
  const queuedMessages = queuedActions.filter(
    (a) =>
      a.type === "send_message" && (!channelId || a.channelId === channelId),
  );

  const totalPending = pendingMessages.length + queuedMessages.length;
  const failedCount =
    pendingMessages.filter((m) => m.status === "failed").length +
    queuedMessages.filter((a) => a.status === "failed").length;

  if (totalPending === 0) {
    return null;
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      retryFailed();
    }
  };

  if (!showList) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <svg
          className="h-4 w-4 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {totalPending} pending message{totalPending !== 1 ? "s" : ""}
          {failedCount > 0 && (
            <span className="ml-1 text-red-500">({failedCount} failed)</span>
          )}
        </span>
        {failedCount > 0 && (
          <button
            onClick={handleRetry}
            className="hover:text-primary/80 text-xs text-primary"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // List view
  const visibleMessages = [...pendingMessages.slice(0, maxVisible)];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Pending Messages ({totalPending})
        </h4>
        {failedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            Retry all
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleMessages.map((message) => (
          <PendingMessageItem
            key={message.tempId}
            message={message}
            onCancel={onCancel}
          />
        ))}

        {totalPending > maxVisible && (
          <p className="text-center text-xs text-muted-foreground">
            +{totalPending - maxVisible} more
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Pending Message Item
// =============================================================================

interface PendingMessageItemProps {
  message: PendingMessage;
  onCancel?: (messageId: string) => void;
}

function PendingMessageItem({ message, onCancel }: PendingMessageItemProps) {
  const statusIcon = {
    pending: (
      <svg
        className="h-4 w-4 text-yellow-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    sending: (
      <svg
        className="h-4 w-4 animate-spin text-primary"
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
    ),
    failed: (
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
    ),
  };

  return (
    <div className="bg-muted/50 flex items-start gap-2 rounded-md p-2">
      {statusIcon[message.status]}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{message.content}</p>
        {message.error && (
          <p className="mt-0.5 text-xs text-red-500">{message.error}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {message.status === "pending" && "Waiting to send"}
          {message.status === "sending" && "Sending..."}
          {message.status === "failed" && "Failed to send"}
        </p>
      </div>
      {onCancel && message.status !== "sending" && (
        <button
          onClick={() => onCancel(message.tempId)}
          className="text-muted-foreground hover:text-foreground"
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
  );
}

export default PendingMessages;
