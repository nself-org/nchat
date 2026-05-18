/**
 * Mobile Picture-in-Picture Hook
 *
 * Provides Picture-in-Picture functionality for mobile browsers
 * and native apps using both Web API and native implementations.
 */

import { useState, useCallback, useEffect } from "react";
import { useCallStore } from "@/stores/call-store";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseMobilePiPReturn {
  /** Whether PiP is currently active */
  isPiPActive: boolean;
  /** Whether PiP is supported on this device */
  isPiPSupported: boolean;
  /** Enable Picture-in-Picture mode */
  enablePiP: () => Promise<void>;
  /** Disable Picture-in-Picture mode */
  disablePiP: () => Promise<void>;
  /** Toggle Picture-in-Picture mode */
  togglePiP: () => Promise<void>;
  /** Error if PiP failed */
  error: string | null;
}

// =============================================================================
// Check Native PiP Support
// =============================================================================

function checkNativePiPSupport(): boolean {
  // Check if running in Capacitor
  if (typeof window !== "undefined" && (window as any).Capacitor) {
    return true;
  }

  // Check Web PiP API
  if (typeof document !== "undefined") {
    return "pictureInPictureEnabled" in document;
  }

  return false;
}

// =============================================================================
// Native PiP Implementation (iOS/Android)
// =============================================================================

async function enterNativePiP(videoElement: HTMLVideoElement): Promise<void> {
  // Check if running in Capacitor
  if (typeof window !== "undefined" && (window as any).Capacitor) {
    const { PiPPlugin } = (window as any).Capacitor.Plugins;

    if (PiPPlugin) {
      try {
        await PiPPlugin.enterPiP();
        return;
      } catch (err) {
        logger.error("Native PiP failed:", err);
      }
    }
  }

  // Fallback to Web PiP API
  if ("requestPictureInPicture" in videoElement) {
    try {
      await videoElement.requestPictureInPicture();
    } catch (err) {
      logger.error("Web PiP failed:", err);
      throw err;
    }
  } else {
    throw new Error("Picture-in-Picture not supported");
  }
}

async function exitNativePiP(): Promise<void> {
  // Check if running in Capacitor
  if (typeof window !== "undefined" && (window as any).Capacitor) {
    const { PiPPlugin } = (window as any).Capacitor.Plugins;

    if (PiPPlugin) {
      try {
        await PiPPlugin.exitPiP();
        return;
      } catch (err) {
        logger.error("Native PiP exit failed:", err);
      }
    }
  }

  // Fallback to Web PiP API
  if (document.pictureInPictureElement) {
    try {
      await document.exitPictureInPicture();
    } catch (err) {
      logger.error("Web PiP exit failed:", err);
      throw err;
    }
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useMobilePiP(): UseMobilePiPReturn {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCall = useCallStore((state) => state.activeCall);
  const setPictureInPicture = useCallStore(
    (state) => state.setPictureInPicture,
  );

  // Check PiP support on mount
  useEffect(() => {
    setIsPiPSupported(checkNativePiPSupport());
  }, []);

  // Listen for PiP state changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleEnterPiP = () => {
      setIsPiPActive(true);
      setPictureInPicture(true);
    };

    const handleExitPiP = () => {
      setIsPiPActive(false);
      setPictureInPicture(false);
    };

    document.addEventListener("enterpictureinpicture", handleEnterPiP);
    document.addEventListener("leavepictureinpicture", handleExitPiP);

    return () => {
      document.removeEventListener("enterpictureinpicture", handleEnterPiP);
      document.removeEventListener("leavepictureinpicture", handleExitPiP);
    };
  }, [setPictureInPicture]);

  // Auto-exit PiP when call ends
  useEffect(() => {
    if (!activeCall && isPiPActive) {
      disablePiP();
    }
  }, [activeCall, isPiPActive]);

  // Enable PiP
  const enablePiP = useCallback(async () => {
    if (!isPiPSupported) {
      setError("Picture-in-Picture not supported on this device");
      return;
    }

    if (!activeCall) {
      setError("No active call");
      return;
    }

    try {
      setError(null);

      // Find video element
      const videoElement = document.querySelector("video") as HTMLVideoElement;

      if (!videoElement) {
        throw new Error("No video element found");
      }

      await enterNativePiP(videoElement);
      setIsPiPActive(true);
      setPictureInPicture(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enable PiP";
      setError(message);
      logger.error("PiP error:", err);
    }
  }, [isPiPSupported, activeCall, setPictureInPicture]);

  // Disable PiP
  const disablePiP = useCallback(async () => {
    if (!isPiPActive) return;

    try {
      setError(null);
      await exitNativePiP();
      setIsPiPActive(false);
      setPictureInPicture(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to disable PiP";
      setError(message);
      logger.error("PiP disable error:", err);
    }
  }, [isPiPActive, setPictureInPicture]);

  // Toggle PiP
  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await disablePiP();
    } else {
      await enablePiP();
    }
  }, [isPiPActive, enablePiP, disablePiP]);

  return {
    isPiPActive,
    isPiPSupported,
    enablePiP,
    disablePiP,
    togglePiP,
    error,
  };
}
