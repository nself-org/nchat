"use client";

/**
 * Online/Offline Detection Hook
 *
 * React hook for detecting network connectivity status.
 */

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

export interface UseOnlineOptions {
  /** Called when going online */
  onOnline?: () => void;
  /** Called when going offline */
  onOffline?: () => void;
}

/**
 * Hook for detecting online/offline status
 *
 * @example
 * ```tsx
 * function NetworkStatus() {
 *   const isOnline = useOnline({
 *     onOffline: () => toast.error('You are offline'),
 *     onOnline: () => toast.success('Back online')
 *   })
 *
 *   return <div>{isOnline ? '🟢 Online' : '🔴 Offline'}</div>
 * }
 * ```
 */
export function useOnline(options: UseOnlineOptions = {}): boolean {
  const { onOnline, onOffline } = options;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info("Network connection restored");
      onOnline?.();
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.warn("Network connection lost");
      onOffline?.();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onOnline, onOffline]);

  return isOnline;
}

/**
 * Hook for detecting connection quality
 */
export function useConnectionQuality(): {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
} {
  const [quality, setQuality] = useState({
    effectiveType: "unknown" as const,
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
      return;
    }

    const connection = (navigator as any).connection;

    const updateQuality = () => {
      setQuality({
        effectiveType: connection.effectiveType || "unknown",
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      });
    };

    updateQuality();

    connection.addEventListener?.("change", updateQuality);
    return () => connection.removeEventListener?.("change", updateQuality);
  }, []);

  return quality;
}

/**
 * Hook for detecting slow connection
 */
export function useIsSlowConnection(): boolean {
  const { effectiveType, saveData } = useConnectionQuality();
  return effectiveType === "slow-2g" || effectiveType === "2g" || saveData;
}
