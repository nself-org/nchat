/**
 * Sync Status Indicator Component
 *
 * Shows current sync status and allows manual sync trigger.
 * Displays conflict count and last sync time.
 *
 * @module components/sync/SyncStatusIndicator
 * @version 1.0.0
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSyncStatus } from "@/services/settings/settings-sync.service";

// ============================================================================
// Types
// ============================================================================

export interface SyncStatusIndicatorProps {
  /** Current sync status */
  status: SettingsSyncStatus;
  /** Last sync timestamp */
  lastSyncTimestamp?: number;
  /** Conflict count */
  conflictCount?: number;
  /** Manual sync handler */
  onSync?: () => void;
  /** Show as badge */
  variant?: "full" | "compact" | "badge";
  /** Show conflicts */
  showConflicts?: boolean;
  /** Is syncing */
  isSyncing?: boolean;
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<
  SettingsSyncStatus,
  {
    icon: typeof CheckCircle;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  idle: {
    icon: Clock,
    label: "Not synced",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  syncing: {
    icon: RefreshCw,
    label: "Syncing...",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  synced: {
    icon: CheckCircle,
    label: "Synced",
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900",
  },
  conflict: {
    icon: AlertCircle,
    label: "Conflicts",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900",
  },
  error: {
    icon: WifiOff,
    label: "Sync failed",
    color: "text-red-500",
    bgColor: "bg-red-100 dark:bg-red-900",
  },
};

// ============================================================================
// Component
// ============================================================================

export function SyncStatusIndicator({
  status,
  lastSyncTimestamp,
  conflictCount = 0,
  onSync,
  variant = "full",
  showConflicts = true,
  isSyncing = false,
}: SyncStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  /**
   * Update time ago
   */
  useEffect(() => {
    if (!lastSyncTimestamp) {
      setTimeAgo("");
      return;
    }

    const updateTimeAgo = () => {
      const now = Date.now();
      const diff = now - lastSyncTimestamp;

      if (diff < 60000) {
        setTimeAgo("just now");
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        setTimeAgo(`${minutes}m ago`);
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diff / 86400000);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSyncTimestamp]);

  /**
   * Badge variant
   */
  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("gap-1.5", config.bgColor)}>
              <Icon
                className={cn(
                  "h-3 w-3",
                  config.color,
                  isSyncing && "animate-spin",
                )}
              />
              {config.label}
              {showConflicts && conflictCount > 0 && (
                <span className="ml-1 text-xs">({conflictCount})</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              {timeAgo && <div>Last synced: {timeAgo}</div>}
              {conflictCount > 0 && (
                <div>{conflictCount} unresolved conflicts</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  /**
   * Compact variant
   */
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Icon
          className={cn("h-4 w-4", config.color, isSyncing && "animate-spin")}
          aria-label={config.label}
        />
        {showConflicts && conflictCount > 0 && (
          <Badge variant="destructive" className="h-5 text-xs">
            {conflictCount}
          </Badge>
        )}
        {onSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  /**
   * Full variant
   */
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Icon
          className={cn("h-4 w-4", config.color, isSyncing && "animate-spin")}
        />
        <span className="text-sm font-medium">{config.label}</span>
      </div>

      {timeAgo && (
        <span className="text-xs text-muted-foreground">
          Last synced: {timeAgo}
        </span>
      )}

      {showConflicts && conflictCount > 0 && (
        <Badge variant="destructive">{conflictCount} conflicts</Badge>
      )}

      {onSync && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="ml-auto"
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")}
          />
          Sync Now
        </Button>
      )}
    </div>
  );
}

export default SyncStatusIndicator;
