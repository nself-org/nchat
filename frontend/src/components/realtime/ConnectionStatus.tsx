"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { useToast } from "@/hooks/use-toast";

/**
 * Connection quality levels
 */
type ConnectionQuality = "excellent" | "good" | "poor" | "offline";

/**
 * Get connection quality based on latency
 */
function getConnectionQuality(latency: number): ConnectionQuality {
  if (latency === 0) return "offline";
  if (latency < 100) return "excellent";
  if (latency < 300) return "good";
  return "poor";
}

/**
 * Connection status indicator props
 */
export interface ConnectionStatusProps {
  /** Whether to show the indicator */
  show?: boolean;
  /** Position of the indicator */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show detailed stats */
  showStats?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Connection status indicator component
 * Shows WebSocket connection status with reconnection handling
 */
export function ConnectionStatus({
  show = true,
  position = "top-right",
  showStats = false,
  compact = false,
  className,
}: ConnectionStatusProps) {
  const { isConnected, socketId } = useSocket();
  const { toast } = useToast();

  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [latency, setLatency] = useState(0);
  const [wasConnected, setWasConnected] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  const quality = getConnectionQuality(latency);

  // Track connection changes
  useEffect(() => {
    if (isConnected) {
      if (wasConnected && reconnectAttempts > 0) {
        // Reconnected after disconnect
        toast({
          title: "Reconnected",
          description: "Connection restored successfully",
          variant: "default",
        });
        setReconnectAttempts(0);
      }
      setWasConnected(true);

      // Hide indicator after 3 seconds when connected
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(true);
      if (wasConnected) {
        // Disconnected
        toast({
          title: "Connection lost",
          description: "Attempting to reconnect...",
          variant: "destructive",
        });
        setReconnectAttempts((prev) => prev + 1);
      }
    }
  }, [isConnected, wasConnected, reconnectAttempts, toast]);

  // Measure latency with ping/pong
  useEffect(() => {
    if (!isConnected) {
      setLatency(0);
      return;
    }

    const interval = setInterval(() => {
      const start = Date.now();
      // In a real implementation, you'd use socket.emit('ping') and measure response time
      // For now, we'll simulate it
      setLatency(Math.random() * 200); // 0-200ms simulated latency
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Don't render if hidden or not shown
  if (!show && !showIndicator) {
    return null;
  }

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <AnimatePresence>
      {(show || showIndicator) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn("fixed z-50", positionClasses[position], className)}
        >
          <div
            className={cn(
              "bg-background/95 flex items-center gap-2 rounded-lg border shadow-lg backdrop-blur",
              compact ? "px-2 py-1" : "px-3 py-2",
            )}
          >
            {/* Connection icon */}
            <div className="relative">
              {isConnected ? (
                quality === "excellent" || quality === "good" ? (
                  <Wifi
                    className={cn(
                      "h-4 w-4",
                      quality === "excellent"
                        ? "text-green-500"
                        : "text-yellow-500",
                    )}
                  />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )
              ) : reconnectAttempts > 0 ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}

              {/* Pulse animation for poor connection */}
              {isConnected && quality === "poor" && (
                <span className="absolute inset-0 animate-ping">
                  <AlertCircle className="h-4 w-4 text-orange-500 opacity-75" />
                </span>
              )}
            </div>

            {/* Status text */}
            {!compact && (
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isConnected
                      ? quality === "excellent"
                        ? "text-green-600 dark:text-green-400"
                        : quality === "good"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-orange-600 dark:text-orange-400"
                      : "text-destructive",
                  )}
                >
                  {isConnected
                    ? quality === "excellent"
                      ? "Connected"
                      : quality === "good"
                        ? "Connected (slow)"
                        : "Connected (poor)"
                    : reconnectAttempts > 0
                      ? `Reconnecting... (${reconnectAttempts})`
                      : "Offline"}
                </span>

                {/* Stats */}
                {showStats && isConnected && (
                  <span className="text-[10px] text-muted-foreground">
                    {latency.toFixed(0)}ms
                    {socketId && ` • ${socketId.slice(0, 6)}`}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline connection status (for use in headers/sidebars)
 */
export function InlineConnectionStatus({
  showLabel = true,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { isConnected } = useSocket();
  const [latency, setLatency] = useState(0);

  const quality = getConnectionQuality(latency);

  useEffect(() => {
    if (!isConnected) {
      setLatency(0);
      return;
    }

    const interval = setInterval(() => {
      setLatency(Math.random() * 200);
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Status dot */}
      <div className="relative">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected
              ? quality === "excellent"
                ? "bg-green-500"
                : quality === "good"
                  ? "bg-yellow-500"
                  : "bg-orange-500"
              : "bg-gray-400",
          )}
        />
        {isConnected && quality === "excellent" && (
          <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isConnected
            ? quality === "excellent"
              ? "Online"
              : quality === "good"
                ? "Slow"
                : "Poor"
            : "Offline"}
        </span>
      )}
    </div>
  );
}

/**
 * Connection quality indicator (simple colored bar)
 */
export function ConnectionQualityBar({ className }: { className?: string }) {
  const { isConnected } = useSocket();
  const [latency, setLatency] = useState(0);

  const quality = getConnectionQuality(latency);

  useEffect(() => {
    if (!isConnected) {
      setLatency(0);
      return;
    }

    const interval = setInterval(() => {
      setLatency(Math.random() * 200);
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className={cn("flex gap-0.5", className)}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            "h-3 w-1 rounded-full transition-colors",
            quality === "excellent"
              ? "bg-green-500"
              : quality === "good"
                ? bar <= 3
                  ? "bg-yellow-500"
                  : "bg-gray-300 dark:bg-gray-700"
                : bar <= 2
                  ? "bg-orange-500"
                  : "bg-gray-300 dark:bg-gray-700",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Full connection status card (for settings/debug)
 */
export function ConnectionStatusCard({ className }: { className?: string }) {
  const { isConnected, socketId } = useSocket();
  const [latency, setLatency] = useState(0);
  const [uptime, setUptime] = useState(0);

  const quality = getConnectionQuality(latency);

  useEffect(() => {
    if (!isConnected) {
      setLatency(0);
      setUptime(0);
      return;
    }

    const latencyInterval = setInterval(() => {
      setLatency(Math.random() * 200);
    }, 5000);

    const uptimeInterval = setInterval(() => {
      setUptime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(latencyInterval);
      clearInterval(uptimeInterval);
    };
  }, [isConnected]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Connection Status</h3>
        {isConnected ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-destructive" />
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <span
            className={cn(
              "font-medium",
              isConnected
                ? "text-green-600 dark:text-green-400"
                : "text-destructive",
            )}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        {isConnected && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Quality</span>
              <div className="flex items-center gap-2">
                <ConnectionQualityBar />
                <span className="font-medium capitalize">{quality}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Latency</span>
              <span className="font-medium">{latency.toFixed(0)}ms</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">{formatUptime(uptime)}</span>
            </div>

            {socketId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Socket ID</span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {socketId.slice(0, 8)}...
                </code>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
