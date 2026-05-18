"use client";

/**
 * Offline Indicator Component
 *
 * Displays connection status, pending message queue count, and sync state.
 * Provides visual feedback and actions for offline/online transitions.
 *
 * @module components/ui/offline-indicator
 * @version 1.0.0
 */

import { useState, useEffect } from "react";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertCircle,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { Button } from "./button";
import { Badge } from "./badge";
import { Progress } from "./progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface OfflineIndicatorProps {
  /** Position on screen */
  position?: "top" | "bottom";
  /** Show detailed info */
  detailed?: boolean;
  /** Allow dismissing */
  dismissible?: boolean;
  /** Auto-hide after successful sync */
  autoHide?: boolean;
  /** Auto-hide delay in ms */
  autoHideDelay?: number;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function OfflineIndicator({
  position = "top",
  detailed = true,
  dismissible = false,
  autoHide = true,
  autoHideDelay = 3000,
  className,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isConnected,
    connectionState,
    connectionQuality,
    latency,
    queueCount,
    isFlushing,
    isSyncing,
    syncStatus,
    lastSyncAt,
    wasOffline,
    sync,
    flushQueue,
    clearQueue,
  } = useOfflineStatus();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-hide after successful sync
  useEffect(() => {
    if (
      autoHide &&
      isOnline &&
      isConnected &&
      queueCount === 0 &&
      !wasOffline
    ) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, isOnline, isConnected, queueCount, wasOffline]);

  // Don't show if online, connected, no pending changes, and not showing success
  if (
    isOnline &&
    isConnected &&
    queueCount === 0 &&
    !wasOffline &&
    !showSuccess
  ) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      logger.error("Sync failed:", error);
    }
  };

  const handleFlush = async () => {
    try {
      await flushQueue();
    } catch (error) {
      logger.error("Queue flush failed:", error);
    }
  };

  // Determine indicator state
  const isOffline = !isOnline;
  const isReconnecting = connectionState === "reconnecting";
  const needsSync = wasOffline && isConnected;
  const hasPending = queueCount > 0;

  // State colors
  const getStateColors = () => {
    if (isOffline) {
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-900 dark:text-red-100",
        icon: "text-red-600 dark:text-red-400",
      };
    }
    if (isReconnecting || isSyncing) {
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-900 dark:text-blue-100",
        icon: "text-blue-600 dark:text-blue-400",
      };
    }
    if (needsSync || hasPending) {
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        border: "border-yellow-200 dark:border-yellow-800",
        text: "text-yellow-900 dark:text-yellow-100",
        icon: "text-yellow-600 dark:text-yellow-400",
      };
    }
    // Success state
    return {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-900 dark:text-green-100",
      icon: "text-green-600 dark:text-green-400",
    };
  };

  const colors = getStateColors();

  // Status text
  const getStatusText = () => {
    if (isOffline) return "You are offline";
    if (isReconnecting) return "Reconnecting...";
    if (isSyncing) return "Syncing...";
    if (needsSync) return "Reconnected - Sync required";
    if (hasPending)
      return `${queueCount} message${queueCount !== 1 ? "s" : ""} queued`;
    if (showSuccess) return "Synced successfully";
    return "Connected";
  };

  // Icon
  const getIcon = () => {
    if (isOffline) return <WifiOff className={cn("h-5 w-5", colors.icon)} />;
    if (isReconnecting || isSyncing) {
      return <Loader2 className={cn("h-5 w-5 animate-spin", colors.icon)} />;
    }
    if (showSuccess) return <Check className={cn("h-5 w-5", colors.icon)} />;
    return <Wifi className={cn("h-5 w-5", colors.icon)} />;
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-300",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className={cn("border-b shadow-md", colors.bg, colors.border)}>
          {/* Header */}
          <div className="container mx-auto flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              {/* Icon */}
              {getIcon()}

              {/* Status Text */}
              <div>
                <p className={cn("font-medium", colors.text)}>
                  {getStatusText()}
                </p>
                {hasPending && !isOffline && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isFlushing ? "Sending..." : "Ready to send"}
                  </p>
                )}
              </div>

              {/* Pending Count Badge */}
              {hasPending && (
                <Badge variant="secondary" className="ml-2">
                  {queueCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sync Button */}
              {isOnline && isConnected && (needsSync || hasPending) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={needsSync ? handleSync : handleFlush}
                  disabled={isSyncing || isFlushing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      (isSyncing || isFlushing) && "animate-spin",
                    )}
                  />
                  {isSyncing
                    ? "Syncing..."
                    : isFlushing
                      ? "Sending..."
                      : needsSync
                        ? "Sync Now"
                        : "Send Now"}
                </Button>
              )}

              {/* Expand Button */}
              {detailed && !showSuccess && (
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {isExpanded ? "Hide" : "Details"}
                  </Button>
                </CollapsibleTrigger>
              )}

              {/* Dismiss Button */}
              {dismissible && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsDismissed(true)}
                  className="h-8 w-8 p-0"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <Progress value={undefined} className="h-1 rounded-none" />
          )}

          {/* Expanded Details */}
          {detailed && (
            <CollapsibleContent>
              <div className="container mx-auto border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  {/* Connection Info */}
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                      Connection
                    </h4>
                    <div className="space-y-1 text-gray-600 dark:text-gray-400">
                      <p>
                        Status:{" "}
                        <span className="font-medium capitalize">
                          {connectionState}
                        </span>
                      </p>
                      <p>
                        Quality:{" "}
                        <span className="font-medium capitalize">
                          {connectionQuality}
                        </span>
                      </p>
                      {latency !== null && (
                        <p>
                          Latency:{" "}
                          <span className="font-medium">{latency}ms</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sync Info */}
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                      Sync Status
                    </h4>
                    <div className="space-y-1 text-gray-600 dark:text-gray-400">
                      <p>
                        Status:{" "}
                        <span className="font-medium capitalize">
                          {syncStatus}
                        </span>
                      </p>
                      {lastSyncAt && (
                        <p>
                          Last sync:{" "}
                          <span className="font-medium">
                            {formatTimeAgo(lastSyncAt)}
                          </span>
                        </p>
                      )}
                      {wasOffline && (
                        <p className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Sync recommended</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Queue Info */}
                  <div>
                    <h4 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                      Message Queue
                    </h4>
                    <div className="space-y-1 text-gray-600 dark:text-gray-400">
                      <p>
                        Queued:{" "}
                        <span className="font-medium">
                          {queueCount} messages
                        </span>
                      </p>
                      <p>
                        Status:{" "}
                        <span className="font-medium">
                          {isFlushing
                            ? "Sending..."
                            : queueCount > 0
                              ? "Waiting"
                              : "Empty"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  {hasPending && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFlush}
                        disabled={!isConnected || isFlushing}
                      >
                        Send Queued
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={clearQueue}
                        disabled={isFlushing}
                      >
                        Clear Queue
                      </Button>
                    </>
                  )}
                  {needsSync && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      Force Sync
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

export interface OfflineIndicatorCompactProps {
  /** Custom class name */
  className?: string;
}

export function OfflineIndicatorCompact({
  className,
}: OfflineIndicatorCompactProps) {
  const {
    isOnline,
    isConnected,
    queueCount,
    isSyncing,
    isFlushing,
    wasOffline,
    sync,
    flushQueue,
  } = useOfflineStatus();

  // Don't show if fully online with no issues
  if (isOnline && isConnected && queueCount === 0 && !wasOffline) {
    return null;
  }

  const handleAction = async () => {
    if (wasOffline) {
      await sync();
    } else {
      await flushQueue();
    }
  };

  const isOffline = !isOnline;
  const isLoading = isSyncing || isFlushing;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "rounded-full px-4 py-2 shadow-lg",
        "flex items-center gap-2 transition-all duration-300",
        isOffline
          ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <WifiOff className="h-4 w-4" />
      ) : isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wifi className="h-4 w-4" />
      )}

      <span className="text-sm font-medium">
        {isOffline
          ? "Offline"
          : isLoading
            ? "Syncing..."
            : queueCount > 0
              ? `${queueCount} pending`
              : wasOffline
                ? "Sync needed"
                : "Connected"}
      </span>

      {!isOffline && (queueCount > 0 || wasOffline) && (
        <button
          type="button"
          onClick={handleAction}
          disabled={isLoading}
          className="text-sm underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "..." : "Sync"}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Banner Variant
// =============================================================================

export interface OfflineBannerProps {
  /** Custom class name */
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOnline, queueCount } = useOfflineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-red-500 px-4 py-1 text-center text-sm font-medium text-white",
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="mr-2 inline-block h-4 w-4" />
      You are offline
      {queueCount > 0 &&
        ` - ${queueCount} message${queueCount !== 1 ? "s" : ""} will be sent when you reconnect`}
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// =============================================================================
// Exports
// =============================================================================

export default OfflineIndicator;
