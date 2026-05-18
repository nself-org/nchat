/**
 * useCallQuality Hook
 *
 * React hook for monitoring call quality.
 * Provides real-time quality metrics and alerts.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CallQualityMonitor,
  createQualityMonitor,
  type QualityLevel,
  type QualityMetrics,
  type QualityAlert,
  type QualityMonitorConfig,
} from "@/lib/calls/call-quality-monitor";
import { useToast } from "./use-toast";

// =============================================================================
// Types
// =============================================================================

export interface UseCallQualityOptions extends QualityMonitorConfig {
  showAlerts?: boolean;
}

export interface UseCallQualityReturn {
  // Current quality
  quality: QualityLevel;
  metrics: QualityMetrics | null;

  // Quality checks
  isExcellent: boolean;
  isGood: boolean;
  isFair: boolean;
  isPoor: boolean;
  isCritical: boolean;

  // History
  history: QualityMetrics[];
  averageMetrics: Partial<QualityMetrics> | null;

  // Alerts
  lastAlert: QualityAlert | null;

  // Control
  start: (peerConnection: RTCPeerConnection) => void;
  stop: () => void;
  isMonitoring: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useCallQuality(
  options: UseCallQualityOptions = {},
): UseCallQualityReturn {
  const { showAlerts = true, ...config } = options;
  const { toast } = useToast();

  // Monitor instance
  const monitorRef = useRef<CallQualityMonitor | null>(null);

  // State
  const [quality, setQuality] = useState<QualityLevel>("excellent");
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [history, setHistory] = useState<QualityMetrics[]>([]);
  const [lastAlert, setLastAlert] = useState<QualityAlert | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize monitor
  useEffect(() => {
    monitorRef.current = createQualityMonitor({
      ...config,
      onMetrics: (newMetrics) => {
        setMetrics(newMetrics);
        setHistory((prev) => [...prev.slice(-29), newMetrics]); // Keep last 30

        if (config.onMetrics) {
          config.onMetrics(newMetrics);
        }
      },
      onQualityChange: (newQuality, prevQuality) => {
        setQuality(newQuality);

        // Show toast for significant changes
        if (showAlerts) {
          const qualityOrder: QualityLevel[] = [
            "excellent",
            "good",
            "fair",
            "poor",
            "critical",
          ];
          const prevIndex = qualityOrder.indexOf(prevQuality);
          const currIndex = qualityOrder.indexOf(newQuality);

          if (currIndex > prevIndex) {
            // Quality degraded
            toast({
              title: "Call quality degraded",
              description: `Quality changed from ${prevQuality} to ${newQuality}`,
              variant: currIndex >= 3 ? "destructive" : "default",
            });
          }
        }

        if (config.onQualityChange) {
          config.onQualityChange(newQuality, prevQuality);
        }
      },
      onAlert: (alert) => {
        setLastAlert(alert);

        // Show toast for alerts
        if (showAlerts && alert.type !== "improvement") {
          toast({
            title: alert.message,
            description: alert.suggestions[0] || "",
            variant: alert.type === "critical" ? "destructive" : "default",
          });
        }

        if (config.onAlert) {
          config.onAlert(alert);
        }
      },
    });

    return () => {
      if (monitorRef.current) {
        monitorRef.current.stop();
        monitorRef.current.cleanup();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quality checks
  const isExcellent = quality === "excellent";
  const isGood = quality === "good";
  const isFair = quality === "fair";
  const isPoor = quality === "poor";
  const isCritical = quality === "critical";

  // Average metrics
  const averageMetrics = monitorRef.current?.getAverageMetrics(5) || null;

  // Control
  const start = useCallback((peerConnection: RTCPeerConnection) => {
    if (monitorRef.current) {
      monitorRef.current.start(peerConnection);
      setIsMonitoring(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.stop();
      setIsMonitoring(false);
    }
  }, []);

  return {
    // Current quality
    quality,
    metrics,

    // Quality checks
    isExcellent,
    isGood,
    isFair,
    isPoor,
    isCritical,

    // History
    history,
    averageMetrics,

    // Alerts
    lastAlert,

    // Control
    start,
    stop,
    isMonitoring,
  };
}
