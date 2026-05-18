"use client";

/**
 * ConnectionSettings - Connection preferences component
 *
 * Allows users to configure connection and offline settings.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useOfflineStore } from "@/stores/offline-store";
import { useOfflineCache, useOfflineSync } from "@/hooks/useOfflineCache";
import { SyncStatus } from "./SyncStatus";

// =============================================================================
// Types
// =============================================================================

export interface ConnectionSettingsProps {
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionSettings({ className }: ConnectionSettingsProps) {
  const { settings, updateSettings, cacheStats, cacheEnabled } =
    useOfflineStore();
  const { clearAll, runCleanup, refreshStats } = useOfflineCache();
  const { sync } = useOfflineSync();
  const [isClearing, setIsClearing] = React.useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAll();
    } finally {
      setIsClearing(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Sync Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Sync Status</h3>
        <SyncStatus showProgress showLastSync />
      </div>

      {/* Cache Info */}
      {cacheStats && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Cache Statistics</h3>
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total size</span>
              <span>{formatSize(cacheStats.totalSize)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Channels cached</span>
              <span>{cacheStats.channelCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Messages cached</span>
              <span>{cacheStats.messageCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Users cached</span>
              <span>{cacheStats.userCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cache hit rate</span>
              <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Offline Settings</h3>

        {/* Auto Sync */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync">Auto sync</Label>
            <p className="text-xs text-muted-foreground">
              Automatically sync data when connected
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={settings.autoSyncEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ autoSyncEnabled: checked })
            }
          />
        </div>

        {/* Background Sync */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="background-sync">Background sync</Label>
            <p className="text-xs text-muted-foreground">
              Sync data in the background
            </p>
          </div>
          <Switch
            id="background-sync"
            checked={settings.backgroundSyncEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ backgroundSyncEnabled: checked })
            }
          />
        </div>

        {/* Offline Indicator */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="offline-indicator">Show offline indicator</Label>
            <p className="text-xs text-muted-foreground">
              Display indicator when offline
            </p>
          </div>
          <Switch
            id="offline-indicator"
            checked={settings.showOfflineIndicator}
            onCheckedChange={(checked) =>
              updateSettings({ showOfflineIndicator: checked })
            }
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Cache Management</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync()}
            className="flex-1"
          >
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
            Sync Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={runCleanup}
            className="flex-1"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Cleanup
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearCache}
          disabled={isClearing}
          className="w-full"
        >
          {isClearing ? (
            <>
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
              Clearing...
            </>
          ) : (
            <>
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear All Cache
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ConnectionSettings;
