"use client";

/**
 * Connection Status Component
 *
 * Displays the realtime connection status with quality indicator.
 * Shows:
 * - Connection state (connected, connecting, offline, error)
 * - Connection quality (excellent, good, fair, poor)
 * - Reconnection attempts
 * - Offline queue count
 * - Manual reconnect button
 *
 * @module components/realtime/connection-status
 * @version 1.0.0
 */

import { useEffect, useState } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRealtimeIntegration,
  type IntegrationStatus,
} from "@/services/realtime/realtime-integration.service";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface ConnectionStatusProps {
  /** Show detailed status in dropdown */
  showDetails?: boolean;
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Show in header/navbar */
  variant?: "default" | "header" | "inline";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color based on connection state
 */
function getStatusColor(status: IntegrationStatus): string {
  if (!status.connected) {
    return "text-red-500";
  }
  if (!status.authenticated) {
    return "text-yellow-500";
  }

  switch (status.connectionQuality) {
    case "excellent":
    case "good":
      return "text-green-500";
    case "fair":
      return "text-yellow-500";
    case "poor":
      return "text-orange-500";
    default:
      return "text-gray-500";
  }
}

/**
 * Get status icon based on connection state
 */
function getStatusIcon(status: IntegrationStatus): React.ReactNode {
  if (!status.connected) {
    if (status.reconnectAttempts > 0) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <WifiOff className="h-4 w-4" />;
  }

  if (!status.authenticated) {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <Wifi className="h-4 w-4" />;
}

/**
 * Get status text based on connection state
 */
function getStatusText(status: IntegrationStatus): string {
  if (!status.connected) {
    if (status.reconnectAttempts > 0) {
      return `Reconnecting (${status.reconnectAttempts})...`;
    }
    return "Offline";
  }

  if (!status.authenticated) {
    return "Authenticating...";
  }

  return "Connected";
}

/**
 * Get quality badge variant
 */
function getQualityVariant(
  quality: IntegrationStatus["connectionQuality"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (quality) {
    case "excellent":
    case "good":
      return "default";
    case "fair":
      return "secondary";
    case "poor":
      return "destructive";
    default:
      return "outline";
  }
}

// ============================================================================
// Component
// ============================================================================

export function ConnectionStatus({
  showDetails = true,
  compact = false,
  variant = "default",
  className,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<IntegrationStatus>({
    connected: false,
    authenticated: false,
    presenceEnabled: false,
    typingEnabled: false,
    deliveryReceiptsEnabled: false,
    offlineQueueEnabled: false,
    queuedMessageCount: 0,
    connectionQuality: "unknown",
    reconnectAttempts: 0,
  });

  const [isReconnecting, setIsReconnecting] = useState(false);

  // Subscribe to status changes
  useEffect(() => {
    try {
      const integration = getRealtimeIntegration();

      if (!integration.initialized) {
        return;
      }

      const unsubscribe = integration.onStatusChange(setStatus);

      return () => {
        unsubscribe();
      };
    } catch (error) {
      // Integration not initialized yet
      return;
    }
  }, []);

  // Handle manual reconnect
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      const integration = getRealtimeIntegration();
      await integration.reconnect();
    } catch (error) {
      // Error will be shown in status
    } finally {
      setTimeout(() => setIsReconnecting(false), 1000);
    }
  };

  // Render compact version (icon only)
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("flex items-center", getStatusColor(status))}>
          {getStatusIcon(status)}
        </div>
      </div>
    );
  }

  // Render header variant (minimal)
  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
            <div className={cn("flex items-center", getStatusColor(status))}>
              {getStatusIcon(status)}
            </div>
            <span className="text-sm">{getStatusText(status)}</span>
          </Button>
        </DropdownMenuTrigger>
        {showDetails && (
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Connection Status</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="space-y-2 p-2">
              {/* Connection State */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">State:</span>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      status.connected ? "bg-green-500" : "bg-red-500",
                    )}
                  />
                  <span>{status.connected ? "Connected" : "Disconnected"}</span>
                </div>
              </div>

              {/* Connection Quality */}
              {status.connected && status.connectionQuality !== "unknown" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quality:</span>
                  <Badge variant={getQualityVariant(status.connectionQuality)}>
                    {status.connectionQuality}
                  </Badge>
                </div>
              )}

              {/* Offline Queue */}
              {status.offlineQueueEnabled && status.queuedMessageCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Queued:</span>
                  <Badge variant="secondary">
                    {status.queuedMessageCount} messages
                  </Badge>
                </div>
              )}

              {/* Features */}
              <div className="space-y-1 pt-2">
                <div className="mb-1 text-xs text-muted-foreground">
                  Features:
                </div>
                {status.presenceEnabled && (
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Presence</span>
                  </div>
                )}
                {status.typingEnabled && (
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Typing Indicators</span>
                  </div>
                )}
                {status.deliveryReceiptsEnabled && (
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>Read Receipts</span>
                  </div>
                )}
              </div>
            </div>

            {!status.connected && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                >
                  <RefreshCw
                    className={cn(
                      "mr-2 h-4 w-4",
                      isReconnecting && "animate-spin",
                    )}
                  />
                  Reconnect
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    );
  }

  // Render inline variant (status bar)
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-lg border px-4 py-2",
          status.connected
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center", getStatusColor(status))}>
            {getStatusIcon(status)}
          </div>
          <div>
            <div className="text-sm font-medium">{getStatusText(status)}</div>
            {status.connected && status.connectionQuality !== "unknown" && (
              <div className="text-xs text-muted-foreground">
                Connection quality: {status.connectionQuality}
              </div>
            )}
            {status.queuedMessageCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {status.queuedMessageCount} message
                {status.queuedMessageCount !== 1 ? "s" : ""} queued
              </div>
            )}
          </div>
        </div>
        {!status.connected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={isReconnecting}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isReconnecting && "animate-spin")}
            />
            Reconnect
          </Button>
        )}
      </div>
    );
  }

  // Render default variant (full card)
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Connection Status</h3>
        <div className={cn("flex items-center gap-2", getStatusColor(status))}>
          {getStatusIcon(status)}
          <span className="text-sm font-medium">{getStatusText(status)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Connection Quality */}
        {status.connected && status.connectionQuality !== "unknown" && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Connection Quality:
            </span>
            <Badge variant={getQualityVariant(status.connectionQuality)}>
              {status.connectionQuality}
            </Badge>
          </div>
        )}

        {/* Reconnect Attempts */}
        {status.reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Reconnect Attempts:
            </span>
            <span className="text-sm font-medium">
              {status.reconnectAttempts}
            </span>
          </div>
        )}

        {/* Offline Queue */}
        {status.offlineQueueEnabled && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Queued Messages:
            </span>
            <Badge
              variant={status.queuedMessageCount > 0 ? "secondary" : "outline"}
            >
              {status.queuedMessageCount}
            </Badge>
          </div>
        )}

        {/* Features */}
        <div className="border-t pt-2">
          <div className="mb-2 text-sm text-muted-foreground">
            Active Features:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status.presenceEnabled ? "bg-green-500" : "bg-gray-300",
                )}
              />
              <span>Presence</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status.typingEnabled ? "bg-green-500" : "bg-gray-300",
                )}
              />
              <span>Typing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status.deliveryReceiptsEnabled
                    ? "bg-green-500"
                    : "bg-gray-300",
                )}
              />
              <span>Receipts</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  status.offlineQueueEnabled ? "bg-green-500" : "bg-gray-300",
                )}
              />
              <span>Offline Queue</span>
            </div>
          </div>
        </div>

        {/* Reconnect Button */}
        {!status.connected && (
          <Button
            className="w-full"
            onClick={handleReconnect}
            disabled={isReconnecting}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isReconnecting && "animate-spin")}
            />
            Reconnect Now
          </Button>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
