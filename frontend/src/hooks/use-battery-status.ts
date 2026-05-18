/**
 * Battery Status Hook
 *
 * Monitors device battery level and charging status,
 * provides warnings during calls, and suggests battery-saving modes.
 */

import { useState, useEffect, useCallback } from "react";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

export interface Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export interface UseBatteryStatusReturn {
  /** Current battery level (0-100) */
  batteryLevel: number;
  /** Whether device is charging */
  isCharging: boolean;
  /** Time until full charge (seconds) */
  chargingTime: number | null;
  /** Time until battery depleted (seconds) */
  dischargingTime: number | null;
  /** Whether battery is low (<20%) */
  isLowBattery: boolean;
  /** Whether battery is critical (<10%) */
  isCriticalBattery: boolean;
  /** Whether battery API is supported */
  isSupported: boolean;
  /** Suggested video quality based on battery */
  suggestedVideoQuality: "high" | "medium" | "low" | "audio-only";
}

// =============================================================================
// Battery Thresholds
// =============================================================================

const LOW_BATTERY_THRESHOLD = 20;
const CRITICAL_BATTERY_THRESHOLD = 10;
const MEDIUM_QUALITY_THRESHOLD = 30;
const LOW_QUALITY_THRESHOLD = 20;

// =============================================================================
// Check Battery API Support
// =============================================================================

function isBatteryAPISupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return "getBattery" in navigator;
}

// =============================================================================
// Get Suggested Video Quality
// =============================================================================

function getSuggestedVideoQuality(
  batteryLevel: number,
  isCharging: boolean,
): "high" | "medium" | "low" | "audio-only" {
  // Always use high quality if charging
  if (isCharging) {
    return "high";
  }

  // Critical battery - suggest audio only
  if (batteryLevel < CRITICAL_BATTERY_THRESHOLD) {
    return "audio-only";
  }

  // Low battery - use low quality
  if (batteryLevel < LOW_QUALITY_THRESHOLD) {
    return "low";
  }

  // Medium battery - use medium quality
  if (batteryLevel < MEDIUM_QUALITY_THRESHOLD) {
    return "medium";
  }

  // Good battery - use high quality
  return "high";
}

// =============================================================================
// Hook
// =============================================================================

export function useBatteryStatus(): UseBatteryStatusReturn {
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [chargingTime, setChargingTime] = useState<number | null>(null);
  const [dischargingTime, setDischargingTime] = useState<number | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Battery API is supported
    if (!isBatteryAPISupported()) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    let battery: BatteryManager | null = null;

    // Get battery status
    const initBattery = async () => {
      try {
        battery = await (navigator as Navigator).getBattery!();

        // Set initial values
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        setChargingTime(
          battery.chargingTime === Infinity ? null : battery.chargingTime,
        );
        setDischargingTime(
          battery.dischargingTime === Infinity ? null : battery.dischargingTime,
        );

        // Listen for changes
        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingchange", handleChargingChange);
        battery.addEventListener(
          "chargingtimechange",
          handleChargingTimeChange,
        );
        battery.addEventListener(
          "dischargingtimechange",
          handleDischargingTimeChange,
        );
      } catch (err) {
        logger.error("Failed to get battery status:", err);
        setIsSupported(false);
      }
    };

    const handleLevelChange = (event: Event) => {
      const target = event.target as BatteryManager;
      setBatteryLevel(Math.round(target.level * 100));
    };

    const handleChargingChange = (event: Event) => {
      const target = event.target as BatteryManager;
      setIsCharging(target.charging);
    };

    const handleChargingTimeChange = (event: Event) => {
      const target = event.target as BatteryManager;
      setChargingTime(
        target.chargingTime === Infinity ? null : target.chargingTime,
      );
    };

    const handleDischargingTimeChange = (event: Event) => {
      const target = event.target as BatteryManager;
      setDischargingTime(
        target.dischargingTime === Infinity ? null : target.dischargingTime,
      );
    };

    initBattery();

    // Cleanup
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", handleLevelChange);
        battery.removeEventListener("chargingchange", handleChargingChange);
        battery.removeEventListener(
          "chargingtimechange",
          handleChargingTimeChange,
        );
        battery.removeEventListener(
          "dischargingtimechange",
          handleDischargingTimeChange,
        );
      }
    };
  }, []);

  const isLowBattery = batteryLevel < LOW_BATTERY_THRESHOLD && !isCharging;
  const isCriticalBattery =
    batteryLevel < CRITICAL_BATTERY_THRESHOLD && !isCharging;
  const suggestedVideoQuality = getSuggestedVideoQuality(
    batteryLevel,
    isCharging,
  );

  return {
    batteryLevel,
    isCharging,
    chargingTime,
    dischargingTime,
    isLowBattery,
    isCriticalBattery,
    isSupported,
    suggestedVideoQuality,
  };
}

// =============================================================================
// Battery Optimization Utilities
// =============================================================================

/**
 * Get recommended frame rate based on battery level
 */
export function getRecommendedFrameRate(
  batteryLevel: number,
  isCharging: boolean,
): number {
  if (isCharging) return 30;

  if (batteryLevel < CRITICAL_BATTERY_THRESHOLD) return 15;
  if (batteryLevel < LOW_BATTERY_THRESHOLD) return 20;
  if (batteryLevel < MEDIUM_QUALITY_THRESHOLD) return 24;

  return 30;
}

/**
 * Get recommended resolution based on battery level
 */
export function getRecommendedResolution(
  batteryLevel: number,
  isCharging: boolean,
): { width: number; height: number } {
  if (isCharging) {
    return { width: 1280, height: 720 }; // 720p
  }

  if (batteryLevel < CRITICAL_BATTERY_THRESHOLD) {
    return { width: 320, height: 240 }; // 240p
  }

  if (batteryLevel < LOW_BATTERY_THRESHOLD) {
    return { width: 480, height: 360 }; // 360p
  }

  if (batteryLevel < MEDIUM_QUALITY_THRESHOLD) {
    return { width: 640, height: 480 }; // 480p
  }

  return { width: 1280, height: 720 }; // 720p
}

/**
 * Should disable video based on battery level
 */
export function shouldDisableVideo(
  batteryLevel: number,
  isCharging: boolean,
): boolean {
  return batteryLevel < CRITICAL_BATTERY_THRESHOLD && !isCharging;
}

/**
 * Should show battery warning
 */
export function shouldShowBatteryWarning(
  batteryLevel: number,
  isCharging: boolean,
  callDuration: number,
): boolean {
  // Don't show if charging
  if (isCharging) return false;

  // Show if critical
  if (batteryLevel < CRITICAL_BATTERY_THRESHOLD) return true;

  // Show if low and call is longer than 1 minute
  if (batteryLevel < LOW_BATTERY_THRESHOLD && callDuration > 60) return true;

  return false;
}

/**
 * Get battery warning message
 */
export function getBatteryWarningMessage(batteryLevel: number): string {
  if (batteryLevel < CRITICAL_BATTERY_THRESHOLD) {
    return `Critical battery (${batteryLevel}%). Consider ending the call soon.`;
  }

  if (batteryLevel < LOW_BATTERY_THRESHOLD) {
    return `Low battery (${batteryLevel}%). Switch to audio-only to save battery.`;
  }

  return `Battery at ${batteryLevel}%.`;
}
