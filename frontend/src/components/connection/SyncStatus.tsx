"use client";

/**
 * SyncStatus - Sync status display component
 *
 * Shows the current sync status and progress.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useOfflineSync } from "@/hooks/useOfflineCache";

// =============================================================================
// Types
// =============================================================================

export interface SyncStatusProps {
  className?: string;
  showProgress?: boolean;
  showLastSync?: boolean;
  compact?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatLastSync(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(date).toLocaleDateString();
}

// =============================================================================
// Component
// =============================================================================

export function SyncStatus({
  className,
  showProgress = true,
  showLastSync = true,
  compact = false,
}: SyncStatusProps) {
  const { status, progress, error, lastSyncAt, sync, cancel } =
    useOfflineSync();
  const isSyncing = status === "syncing";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isSyncing ? (
          <>
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
            <span className="text-xs text-muted-foreground">
              Syncing {Math.round(progress)}%
            </span>
          </>
        ) : status === "completed" ? (
          <>
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
            <span className="text-xs text-muted-foreground">
              Synced {formatLastSync(lastSyncAt)}
            </span>
          </>
        ) : status === "failed" ? (
          <>
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
            <span className="text-xs text-red-500">Sync failed</span>
          </>
        ) : (
          showLastSync && (
            <span className="text-xs text-muted-foreground">
              Last sync: {formatLastSync(lastSyncAt)}
            </span>
          )
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSyncing ? (
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
          ) : (
            <svg
              className="h-4 w-4 text-muted-foreground"
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
          )}
          <span className="text-sm font-medium">
            {isSyncing ? "Syncing..." : "Sync Status"}
          </span>
        </div>

        {!isSyncing && (
          <button
            onClick={() => sync()}
            className="hover:text-primary/80 text-xs text-primary"
          >
            Sync now
          </button>
        )}
        {isSyncing && (
          <button
            onClick={cancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      {showProgress && isSyncing && (
        <Progress value={progress} className="h-1" />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {showLastSync && !isSyncing && (
        <p className="text-xs text-muted-foreground">
          Last synced: {formatLastSync(lastSyncAt)}
        </p>
      )}
    </div>
  );
}

export default SyncStatus;
