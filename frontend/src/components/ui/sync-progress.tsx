"use client";

/**
 * Sync Progress - Visual progress indicator for sync operations
 *
 * Shows real-time sync progress with item counts and status.
 */

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/hooks/use-offline";
import { Progress } from "./progress";
import { Card } from "./card";

// =============================================================================
// Types
// =============================================================================

export interface SyncProgressProps {
  /** Show as overlay */
  overlay?: boolean;
  /** Show detailed stats */
  detailed?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function SyncProgress({
  overlay = false,
  detailed = true,
  className,
}: SyncProgressProps) {
  const syncState = useSyncStatus();
  const [visible, setVisible] = useState(false);

  // Show when syncing, hide after completion with delay
  useEffect(() => {
    if (syncState.status === "syncing") {
      setVisible(true);
    } else if (
      syncState.status === "completed" ||
      syncState.status === "failed"
    ) {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncState.status]);

  if (!visible && syncState.status === "idle") {
    return null;
  }

  const StatusIcon = getStatusIcon(syncState.status);
  const statusColor = getStatusColor(syncState.status);

  const content = (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <StatusIcon
            className={cn(
              "h-5 w-5",
              statusColor,
              syncState.status === "syncing" && "animate-spin",
            )}
          />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">
              {getStatusText(syncState.status, syncState.operation)}
            </h3>
            {detailed && syncState.itemsTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                {syncState.itemsProcessed} of {syncState.itemsTotal} items
              </p>
            )}
          </div>
          <div className="text-sm font-medium">{syncState.progress}%</div>
        </div>

        {/* Progress Bar */}
        <Progress value={syncState.progress} className="h-2" />

        {/* Error Message */}
        {syncState.error && (
          <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
            <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span>{syncState.error}</span>
          </div>
        )}

        {/* Detailed Stats */}
        {detailed && syncState.lastSyncAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last sync: {formatTimestamp(syncState.lastSyncAt)}</span>
          </div>
        )}
      </div>
    </Card>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md">{content}</div>
      </div>
    );
  }

  return content;
}

// =============================================================================
// Compact Variant
// =============================================================================

export function SyncProgressCompact() {
  const syncState = useSyncStatus();

  if (syncState.status === "idle") {
    return null;
  }

  const StatusIcon = getStatusIcon(syncState.status);
  const statusColor = getStatusColor(syncState.status);

  return (
    <div className="flex items-center gap-2 text-sm">
      <StatusIcon
        className={cn(
          "h-4 w-4",
          statusColor,
          syncState.status === "syncing" && "animate-spin",
        )}
      />
      <span className="text-muted-foreground">
        {getStatusText(syncState.status, syncState.operation)}
      </span>
      {syncState.status === "syncing" && (
        <span className="font-medium">{syncState.progress}%</span>
      )}
    </div>
  );
}

// =============================================================================
// Toast Variant
// =============================================================================

export function SyncProgressToast() {
  const syncState = useSyncStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (syncState.status === "syncing") {
      setShow(true);
    } else if (
      syncState.status === "completed" ||
      syncState.status === "failed"
    ) {
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncState.status]);

  if (!show) {
    return null;
  }

  const StatusIcon = getStatusIcon(syncState.status);
  const statusColor = getStatusColor(syncState.status);

  return (
    <div className="fixed bottom-4 left-4 z-50 min-w-[200px] rounded-lg border bg-background p-3 shadow-lg animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn(
            "h-4 w-4",
            statusColor,
            syncState.status === "syncing" && "animate-spin",
          )}
        />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {getStatusText(syncState.status, syncState.operation)}
          </p>
          {syncState.status === "syncing" && syncState.itemsTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              {syncState.itemsProcessed}/{syncState.itemsTotal}
            </p>
          )}
        </div>
        {syncState.status === "syncing" && (
          <span className="text-xs font-medium">{syncState.progress}%</span>
        )}
      </div>
      {syncState.status === "syncing" && (
        <Progress value={syncState.progress} className="mt-2 h-1" />
      )}
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function getStatusIcon(status: string) {
  switch (status) {
    case "syncing":
      return RefreshCw;
    case "completed":
      return CheckCircle;
    case "failed":
      return XCircle;
    default:
      return Clock;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "syncing":
      return "text-blue-600 dark:text-blue-400";
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "failed":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

function getStatusText(status: string, operation: string | null): string {
  if (status === "syncing") {
    switch (operation) {
      case "full_sync":
        return "Performing full sync...";
      case "incremental_sync":
        return "Syncing changes...";
      case "channel_sync":
        return "Syncing channel...";
      case "message_sync":
        return "Syncing messages...";
      case "queue_flush":
        return "Sending pending changes...";
      default:
        return "Syncing...";
    }
  }

  switch (status) {
    case "completed":
      return "Sync completed";
    case "failed":
      return "Sync failed";
    case "partial":
      return "Partial sync completed";
    default:
      return "Ready to sync";
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;

  // Same day
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "yesterday";
  }

  // Older
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
