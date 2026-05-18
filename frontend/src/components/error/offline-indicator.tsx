"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WifiOff, Wifi, X } from "lucide-react";

interface OfflineIndicatorProps {
  /**
   * Position of the indicator
   */
  position?: "top" | "bottom";
  /**
   * Auto-hide when back online
   */
  autoHide?: boolean;
  /**
   * Duration to show "back online" message (ms)
   */
  reconnectMessageDuration?: number;
  /**
   * Allow user to dismiss the indicator
   */
  dismissible?: boolean;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Callback when online status changes
   */
  onStatusChange?: (isOnline: boolean) => void;
}

type ConnectionStatus = "online" | "offline" | "reconnected";

/**
 * Offline indicator component that shows a banner
 * when the user loses internet connection.
 */
export function OfflineIndicator({
  position = "bottom",
  autoHide = true,
  reconnectMessageDuration = 3000,
  dismissible = true,
  className,
  onStatusChange,
}: OfflineIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const updateOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine;

    setStatus((prevStatus) => {
      if (isOnline && prevStatus === "offline") {
        // Just came back online
        return "reconnected";
      }
      return isOnline ? "online" : "offline";
    });

    onStatusChange?.(isOnline);
    setDismissed(false);
  }, [onStatusChange]);

  useEffect(() => {
    // Check initial status
    if (!navigator.onLine) {
      setStatus("offline");
    }

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  // Handle visibility
  useEffect(() => {
    if (dismissed) {
      setIsVisible(false);
      return;
    }

    if (status === "offline") {
      setIsVisible(true);
    } else if (status === "reconnected") {
      setIsVisible(true);

      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setStatus("online");
        }, reconnectMessageDuration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [status, dismissed, autoHide, reconnectMessageDuration]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!isVisible) {
    return null;
  }

  const isOffline = status === "offline";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed left-0 right-0 z-50 transition-all duration-300 ease-out",
        position === "top" ? "top-0" : "bottom-0",
        isVisible
          ? "translate-y-0 opacity-100"
          : position === "top"
            ? "-translate-y-full opacity-0"
            : "translate-y-full opacity-0",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-3 px-4 py-3",
          "text-sm font-medium",
          isOffline ? "bg-amber-500 text-white" : "bg-green-500 text-white",
        )}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>
              You are currently offline. Some features may be unavailable.
            </span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4" />
            <span>You are back online!</span>
          </>
        )}

        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              "ml-auto rounded-full p-1 transition-colors",
              "hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50",
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to track online status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export default OfflineIndicator;
