/**
 * Mobile Orientation Hook
 *
 * Tracks device orientation and provides utilities for
 * locking orientation during calls.
 */

import { useState, useEffect, useCallback } from "react";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type OrientationType = "portrait" | "landscape";

export interface UseMobileOrientationReturn {
  /** Current orientation */
  orientation: OrientationType;
  /** Whether device is in portrait mode */
  isPortrait: boolean;
  /** Whether device is in landscape mode */
  isLandscape: boolean;
  /** Lock orientation to portrait */
  lockPortrait: () => Promise<void>;
  /** Lock orientation to landscape */
  lockLandscape: () => Promise<void>;
  /** Unlock orientation (allow rotation) */
  unlockOrientation: () => Promise<void>;
  /** Whether orientation lock is supported */
  isOrientationLockSupported: boolean;
}

// =============================================================================
// Get Current Orientation
// =============================================================================

function getCurrentOrientation(): OrientationType {
  if (typeof window === "undefined") return "portrait";

  // Check screen orientation API
  if (window.screen?.orientation) {
    const type = window.screen.orientation.type;
    return type.includes("portrait") ? "portrait" : "landscape";
  }

  // Fallback to window dimensions
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

// =============================================================================
// Check Orientation Lock Support
// =============================================================================

function checkOrientationLockSupport(): boolean {
  if (typeof window === "undefined") return false;

  // Check if running in Capacitor
  if ((window as any).Capacitor) {
    return true;
  }

  // Check Screen Orientation API
  return "orientation" in window.screen && "lock" in window.screen.orientation;
}

// =============================================================================
// Native Orientation Lock (iOS/Android)
// =============================================================================

async function lockOrientationNative(
  orientation: OrientationType,
): Promise<void> {
  // Try Capacitor plugin first
  if (typeof window !== "undefined" && (window as any).Capacitor) {
    const { ScreenOrientation } = (window as any).Capacitor.Plugins;

    if (ScreenOrientation) {
      try {
        const lockType = orientation === "portrait" ? "portrait" : "landscape";
        await ScreenOrientation.lock({ orientation: lockType });
        return;
      } catch (err) {
        logger.error("Capacitor orientation lock failed:", err);
      }
    }
  }

  // Fallback to Screen Orientation API
  const screenOrientation: any = window.screen?.orientation;
  if (screenOrientation?.lock) {
    try {
      const lockType =
        orientation === "portrait" ? "portrait-primary" : "landscape-primary";
      await screenOrientation.lock(lockType);
    } catch (err) {
      logger.error("Screen Orientation API lock failed:", err);
      throw err;
    }
  } else {
    throw new Error("Orientation lock not supported");
  }
}

async function unlockOrientationNative(): Promise<void> {
  // Try Capacitor plugin first
  if (typeof window !== "undefined" && (window as any).Capacitor) {
    const { ScreenOrientation } = (window as any).Capacitor.Plugins;

    if (ScreenOrientation) {
      try {
        await ScreenOrientation.unlock();
        return;
      } catch (err) {
        logger.error("Capacitor orientation unlock failed:", err);
      }
    }
  }

  // Fallback to Screen Orientation API
  if (window.screen?.orientation?.unlock) {
    try {
      window.screen.orientation.unlock();
    } catch (err) {
      logger.error("Screen Orientation API unlock failed:", err);
      throw err;
    }
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useMobileOrientation(): UseMobileOrientationReturn {
  const [orientation, setOrientation] = useState<OrientationType>(() =>
    getCurrentOrientation(),
  );
  const [isOrientationLockSupported, setIsOrientationLockSupported] =
    useState(false);

  // Check support on mount
  useEffect(() => {
    setIsOrientationLockSupported(checkOrientationLockSupport());
  }, []);

  // Listen for orientation changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOrientationChange = () => {
      setOrientation(getCurrentOrientation());
    };

    // Try Screen Orientation API first
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener(
        "change",
        handleOrientationChange,
      );

      return () => {
        window.screen.orientation.removeEventListener(
          "change",
          handleOrientationChange,
        );
      };
    }

    // Fallback to resize event
    window.addEventListener("resize", handleOrientationChange);
    return () => {
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  // Lock to portrait
  const lockPortrait = useCallback(async () => {
    if (!isOrientationLockSupported) {
      logger.warn("Orientation lock not supported");
      return;
    }

    try {
      await lockOrientationNative("portrait");
    } catch (err) {
      logger.error("Failed to lock to portrait:", err);
    }
  }, [isOrientationLockSupported]);

  // Lock to landscape
  const lockLandscape = useCallback(async () => {
    if (!isOrientationLockSupported) {
      logger.warn("Orientation lock not supported");
      return;
    }

    try {
      await lockOrientationNative("landscape");
    } catch (err) {
      logger.error("Failed to lock to landscape:", err);
    }
  }, [isOrientationLockSupported]);

  // Unlock orientation
  const unlockOrientation = useCallback(async () => {
    if (!isOrientationLockSupported) {
      return;
    }

    try {
      await unlockOrientationNative();
    } catch (err) {
      logger.error("Failed to unlock orientation:", err);
    }
  }, [isOrientationLockSupported]);

  return {
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    lockPortrait,
    lockLandscape,
    unlockOrientation,
    isOrientationLockSupported,
  };
}
