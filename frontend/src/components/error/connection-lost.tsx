"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

interface ConnectionLostProps {
  /**
   * Current connection state
   */
  connectionState: ConnectionState;
  /**
   * Callback to trigger reconnection
   */
  onReconnect?: () => void;
  /**
   * Auto-reconnect interval in ms (0 to disable)
   */
  autoReconnectInterval?: number;
  /**
   * Maximum auto-reconnect attempts
   */
  maxAutoReconnects?: number;
  /**
   * Show as overlay
   */
  overlay?: boolean;
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Connection lost component for WebSocket disconnection.
 * Shows reconnecting indicator and manual reconnect button.
 */
export function ConnectionLost({
  connectionState,
  onReconnect,
  autoReconnectInterval = 5000,
  maxAutoReconnects = 5,
  overlay = false,
  className,
}: ConnectionLostProps) {
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startReconnectCountdown = useCallback(() => {
    if (autoReconnectInterval <= 0) return;
    if (reconnectAttempts >= maxAutoReconnects) return;

    const seconds = Math.ceil(autoReconnectInterval / 1000);
    setCountdown(seconds);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts((prev) => prev + 1);
      onReconnect?.();
    }, autoReconnectInterval);
  }, [
    autoReconnectInterval,
    maxAutoReconnects,
    reconnectAttempts,
    onReconnect,
  ]);

  // Reset on connection restored
  useEffect(() => {
    if (connectionState === "connected") {
      setReconnectAttempts(0);
      setCountdown(0);
      clearTimers();
    }
  }, [connectionState, clearTimers]);

  // Start auto-reconnect when disconnected
  useEffect(() => {
    if (connectionState === "disconnected" && autoReconnectInterval > 0) {
      startReconnectCountdown();
    }

    return clearTimers;
  }, [
    connectionState,
    startReconnectCountdown,
    autoReconnectInterval,
    clearTimers,
  ]);

  const handleManualReconnect = () => {
    clearTimers();
    setReconnectAttempts(0);
    setCountdown(0);
    onReconnect?.();
  };

  if (connectionState === "connected") {
    return null;
  }

  const isReconnecting = connectionState === "reconnecting";
  const hasExhaustedRetries = reconnectAttempts >= maxAutoReconnects;

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-6 text-center",
        !overlay && "rounded-lg border border-amber-200 dark:border-amber-800",
        !overlay && "bg-amber-50 dark:bg-amber-900/20",
        className,
      )}
    >
      {/* Icon */}
      <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
        {isReconnecting ? (
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
        ) : (
          <WifiOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        )}
      </div>

      {/* Status message */}
      <div>
        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {isReconnecting ? "Reconnecting..." : "Connection Lost"}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isReconnecting
            ? "Attempting to restore connection..."
            : hasExhaustedRetries
              ? "Unable to reconnect automatically. Please try manually."
              : countdown > 0
                ? `Reconnecting in ${countdown} second${countdown !== 1 ? "s" : ""}...`
                : "Real-time updates are temporarily unavailable."}
        </p>
      </div>

      {/* Reconnect button */}
      {!isReconnecting && (
        <Button
          onClick={handleManualReconnect}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reconnect Now
        </Button>
      )}

      {/* Attempt counter */}
      {reconnectAttempts > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Reconnect attempts: {reconnectAttempts}/{maxAutoReconnects}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-sm rounded-lg bg-white shadow-xl dark:bg-zinc-900">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

/**
 * Inline connection status indicator
 */
export function ConnectionStatusDot({
  connectionState,
  className,
}: {
  connectionState: ConnectionState;
  className?: string;
}) {
  const colors = {
    connected: "bg-green-500",
    disconnected: "bg-red-500",
    reconnecting: "bg-amber-500",
  };

  const labels = {
    connected: "Connected",
    disconnected: "Disconnected",
    reconnecting: "Reconnecting",
  };

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      title={labels[connectionState]}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          colors[connectionState],
          connectionState === "reconnecting" && "animate-pulse",
        )}
      />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {labels[connectionState]}
      </span>
    </div>
  );
}

export default ConnectionLost;
