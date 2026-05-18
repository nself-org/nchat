/**
 * Call Stats Hook
 *
 * Monitors WebRTC connection quality and statistics.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PeerConnectionManager } from "@/lib/webrtc/peer-connection";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface CallStats {
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number | null;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "disconnected";
}

export interface UseCallStatsOptions {
  peerConnection: PeerConnectionManager | null;
  updateInterval?: number;
  onQualityChange?: (quality: CallStats["connectionQuality"]) => void;
}

export interface UseCallStatsReturn {
  stats: CallStats | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  refreshStats: () => Promise<void>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateConnectionQuality(
  packetsLost: number,
  roundTripTime: number | null,
): CallStats["connectionQuality"] {
  // If no RTT, assume disconnected
  if (roundTripTime === null || roundTripTime === 0) {
    return "disconnected";
  }

  // Convert RTT from seconds to milliseconds
  const rttMs = roundTripTime * 1000;

  // Calculate quality based on packet loss and latency
  if (packetsLost > 50 || rttMs > 500) {
    return "poor";
  } else if (packetsLost > 20 || rttMs > 300) {
    return "fair";
  } else if (packetsLost > 5 || rttMs > 150) {
    return "good";
  } else {
    return "excellent";
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useCallStats(options: UseCallStatsOptions): UseCallStatsReturn {
  const { peerConnection, updateInterval = 2000, onQualityChange } = options;

  const [stats, setStats] = useState<CallStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const previousQualityRef = useRef<CallStats["connectionQuality"] | null>(
    null,
  );

  // ==========================================================================
  // Fetch Stats
  // ==========================================================================

  const fetchStats = useCallback(async () => {
    if (!peerConnection) {
      setStats(null);
      return;
    }

    try {
      const connectionStats = await peerConnection.getConnectionStats();

      if (!connectionStats) {
        setStats(null);
        return;
      }

      const quality = calculateConnectionQuality(
        connectionStats.packetsLost,
        connectionStats.roundTripTime,
      );

      const newStats: CallStats = {
        ...connectionStats,
        connectionQuality: quality,
      };

      setStats(newStats);

      // Notify quality change
      if (previousQualityRef.current !== quality) {
        previousQualityRef.current = quality;
        onQualityChange?.(quality);
      }
    } catch (error) {
      logger.error("Failed to fetch call stats:", error);
      setStats(null);
    }
  }, [peerConnection, onQualityChange]);

  // ==========================================================================
  // Start Monitoring
  // ==========================================================================

  const startMonitoring = useCallback(() => {
    if (isMonitoring || !peerConnection) return;

    setIsMonitoring(true);

    // Initial fetch
    fetchStats();

    // Set up interval
    intervalRef.current = window.setInterval(() => {
      fetchStats();
    }, updateInterval);
  }, [isMonitoring, peerConnection, fetchStats, updateInterval]);

  // ==========================================================================
  // Stop Monitoring
  // ==========================================================================

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsMonitoring(false);
    setStats(null);
    previousQualityRef.current = null;
  }, []);

  // ==========================================================================
  // Auto-start/stop based on peer connection
  // ==========================================================================

  useEffect(() => {
    if (peerConnection && peerConnection.isConnected) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
  }, [peerConnection, startMonitoring, stopMonitoring]);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshStats: fetchStats,
  };
}
