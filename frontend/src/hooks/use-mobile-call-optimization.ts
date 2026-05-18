/**
 * Mobile Call Optimization Hook
 *
 * Integrates battery optimization, CallKit/Telecom, PiP, and mobile-specific
 * call features to provide the best mobile call experience.
 */

import { useEffect, useCallback, useRef } from "react";
import { useCallStore } from "@/stores/call-store";
import {
  useBatteryStatus,
  getRecommendedFrameRate,
  getRecommendedResolution,
  shouldDisableVideo,
} from "./use-battery-status";
import { useMobilePiP } from "./use-mobile-pip";
import { useMobileOrientation } from "./use-mobile-orientation";
// @ts-ignore - Capacitor integration (optional dependency)
import { callKitManager } from "@/platforms/capacitor/src/native/call-kit";
// @ts-ignore - VoIP push integration (optional dependency)
import { voipPushManager } from "@/lib/voip-push";
import { useToast } from "./use-toast";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface MobileCallOptimizationOptions {
  /** Auto-enable battery optimization */
  autoBatteryOptimization?: boolean;
  /** Auto-enable PiP when backgrounded */
  autoEnablePiP?: boolean;
  /** Lock orientation during calls */
  lockOrientation?: boolean;
  /** Enable CallKit/Telecom integration */
  enableNativeCallUI?: boolean;
  /** Enable VoIP push notifications */
  enableVoIPPush?: boolean;
}

export interface UseMobileCallOptimizationReturn {
  /** Initialize mobile call optimizations */
  initialize: () => Promise<void>;
  /** Cleanup mobile call optimizations */
  cleanup: () => Promise<void>;
  /** Optimize call quality based on battery */
  optimizeCallQuality: () => Promise<void>;
  /** Enable battery saving mode */
  enableBatterySavingMode: () => Promise<void>;
  /** Disable battery saving mode */
  disableBatterySavingMode: () => Promise<void>;
  /** Check if battery saving is active */
  isBatterySavingActive: boolean;
  /** Current optimization status */
  optimizationStatus: {
    batteryOptimized: boolean;
    pipEnabled: boolean;
    callKitEnabled: boolean;
    voipPushEnabled: boolean;
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useMobileCallOptimization(
  options: MobileCallOptimizationOptions = {},
): UseMobileCallOptimizationReturn {
  const {
    autoBatteryOptimization = true,
    autoEnablePiP = true,
    lockOrientation = true,
    enableNativeCallUI = true,
    enableVoIPPush = true,
  } = options;

  const activeCall = useCallStore((state) => state.activeCall);
  const setLocalVideoEnabled = useCallStore(
    (state) => state.setLocalVideoEnabled,
  );

  const { toast } = useToast();
  const {
    batteryLevel,
    isCharging,
    isLowBattery,
    isCriticalBattery,
    suggestedVideoQuality,
  } = useBatteryStatus();
  const { enablePiP, disablePiP, isPiPSupported, isPiPActive } = useMobilePiP();
  const { lockPortrait, unlockOrientation, isOrientationLockSupported } =
    useMobileOrientation();

  const batterySavingModeRef = useRef(false);
  const callKitInitializedRef = useRef(false);
  const voipPushInitializedRef = useRef(false);
  const originalVideoSettingsRef = useRef<{
    frameRate: number;
    resolution: { width: number; height: number };
  } | null>(null);

  // =============================================================================
  // Initialize Mobile Optimizations
  // =============================================================================

  const initialize = useCallback(async () => {
    try {
      // Initialize CallKit/Telecom
      if (enableNativeCallUI && !callKitInitializedRef.current) {
        await callKitManager.initialize("nChat");
        callKitInitializedRef.current = true;
      }

      // Initialize VoIP Push
      if (enableVoIPPush && !voipPushInitializedRef.current) {
        await voipPushManager.initialize();
        voipPushInitializedRef.current = true;
      }
    } catch (error) {
      logger.error("[MobileCallOptimization] Initialization failed:", error);
      throw error;
    }
  }, [enableNativeCallUI, enableVoIPPush]);

  // =============================================================================
  // Cleanup Mobile Optimizations
  // =============================================================================

  const cleanup = useCallback(async () => {
    try {
      // Disable PiP
      if (isPiPActive) {
        await disablePiP();
      }

      // Unlock orientation
      if (isOrientationLockSupported) {
        await unlockOrientation();
      }

      // Unregister VoIP Push
      if (voipPushInitializedRef.current) {
        await voipPushManager.unregister();
        voipPushInitializedRef.current = false;
      }
    } catch (error) {
      logger.error("[MobileCallOptimization] Cleanup failed:", error);
    }
  }, [isPiPActive, disablePiP, isOrientationLockSupported, unlockOrientation]);

  // =============================================================================
  // Optimize Call Quality Based on Battery
  // =============================================================================

  const optimizeCallQuality = useCallback(async () => {
    if (!activeCall) return;

    try {
      const recommendedFrameRate = getRecommendedFrameRate(
        batteryLevel,
        isCharging,
      );
      const recommendedResolution = getRecommendedResolution(
        batteryLevel,
        isCharging,
      );

      // Store original settings if not already stored
      if (!originalVideoSettingsRef.current) {
        originalVideoSettingsRef.current = {
          frameRate: 30,
          resolution: { width: 1280, height: 720 },
        };
      }

      // Apply optimizations to media stream
      if (activeCall.localStream) {
        const videoTrack = activeCall.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await videoTrack.applyConstraints({
            frameRate: { ideal: recommendedFrameRate },
            width: { ideal: recommendedResolution.width },
            height: { ideal: recommendedResolution.height },
          });
        }
      }

      // Disable video if battery is critical
      if (
        shouldDisableVideo(batteryLevel, isCharging) &&
        activeCall.isLocalVideoEnabled
      ) {
        setLocalVideoEnabled(false);
        toast({
          title: "Video Disabled",
          description: `Critical battery (${batteryLevel}%). Video has been disabled to save battery.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error(
        "[MobileCallOptimization] Failed to optimize call quality:",
        error,
      );
    }
  }, [activeCall, batteryLevel, isCharging, setLocalVideoEnabled, toast]);

  // =============================================================================
  // Battery Saving Mode
  // =============================================================================

  const enableBatterySavingMode = useCallback(async () => {
    if (batterySavingModeRef.current) return;

    try {
      batterySavingModeRef.current = true;

      // Disable video
      if (activeCall?.isLocalVideoEnabled) {
        setLocalVideoEnabled(false);
      }

      // Apply minimal quality constraints
      if (activeCall?.localStream) {
        const videoTrack = activeCall.localStream.getVideoTracks()[0];
        const audioTrack = activeCall.localStream.getAudioTracks()[0];

        if (videoTrack) {
          videoTrack.enabled = false;
        }

        if (audioTrack) {
          await audioTrack.applyConstraints({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
        }
      }

      toast({
        title: "Battery Saving Mode Enabled",
        description:
          "Video disabled and audio optimized to extend battery life.",
      });
    } catch (error) {
      logger.error(
        "[MobileCallOptimization] Failed to enable battery saving mode:",
        error,
      );
    }
  }, [activeCall, setLocalVideoEnabled, toast]);

  const disableBatterySavingMode = useCallback(async () => {
    if (!batterySavingModeRef.current) return;

    try {
      batterySavingModeRef.current = false;

      // Restore original video settings if available
      if (activeCall?.localStream && originalVideoSettingsRef.current) {
        const videoTrack = activeCall.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          await videoTrack.applyConstraints({
            frameRate: { ideal: originalVideoSettingsRef.current.frameRate },
            width: { ideal: originalVideoSettingsRef.current.resolution.width },
            height: {
              ideal: originalVideoSettingsRef.current.resolution.height,
            },
          });
        }
      }

      toast({
        title: "Battery Saving Mode Disabled",
        description: "Call quality restored to normal.",
      });
    } catch (error) {
      logger.error(
        "[MobileCallOptimization] Failed to disable battery saving mode:",
        error,
      );
    }
  }, [activeCall, toast]);

  // =============================================================================
  // Auto-Optimize on Battery Changes
  // =============================================================================

  useEffect(() => {
    if (!autoBatteryOptimization || !activeCall) return;

    // Auto-enable battery saving on critical battery
    if (isCriticalBattery && !batterySavingModeRef.current) {
      enableBatterySavingMode();
    }

    // Auto-disable battery saving when charging
    if (isCharging && batterySavingModeRef.current) {
      disableBatterySavingMode();
    }

    // Optimize call quality on battery level changes
    optimizeCallQuality();
  }, [
    autoBatteryOptimization,
    activeCall,
    isCriticalBattery,
    isCharging,
    enableBatterySavingMode,
    disableBatterySavingMode,
    optimizeCallQuality,
  ]);

  // =============================================================================
  // Auto-Enable PiP on Background
  // =============================================================================

  useEffect(() => {
    if (!autoEnablePiP || !activeCall || !isPiPSupported) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !isPiPActive) {
        enablePiP();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoEnablePiP, activeCall, isPiPSupported, isPiPActive, enablePiP]);

  // =============================================================================
  // Lock Orientation During Calls
  // =============================================================================

  useEffect(() => {
    if (!lockOrientation || !activeCall || !isOrientationLockSupported) return;

    // Lock to portrait for voice calls, allow rotation for video calls
    if (activeCall.type === "voice") {
      lockPortrait();
    }

    return () => {
      unlockOrientation();
    };
  }, [
    lockOrientation,
    activeCall,
    isOrientationLockSupported,
    lockPortrait,
    unlockOrientation,
  ]);

  // =============================================================================
  // Report Call to CallKit/Telecom
  // =============================================================================

  useEffect(() => {
    if (!enableNativeCallUI || !activeCall || !callKitInitializedRef.current)
      return;

    const reportCall = async () => {
      try {
        const participants = Array.from(activeCall.participants.values());
        const participant = participants[0];

        if (!participant) return;

        if (activeCall.direction === "incoming") {
          // Incoming call already reported via VoIP push
          // Just report connected state
          if (activeCall.state === "connected") {
            await callKitManager.reportCallConnected(activeCall.id);
          }
        } else {
          // Outgoing call
          await callKitManager.startOutgoingCall({
            uuid: activeCall.id,
            handle: participant.id,
            hasVideo: activeCall.type === "video",
          });

          if (activeCall.state === "connected") {
            await callKitManager.reportCallConnected(activeCall.id);
          }
        }
      } catch (error) {
        logger.error(
          "[MobileCallOptimization] Failed to report call to CallKit:",
          error,
        );
      }
    };

    reportCall();
  }, [enableNativeCallUI, activeCall]);

  // =============================================================================
  // Cleanup on Call End
  // =============================================================================

  useEffect(() => {
    if (activeCall) return;

    // Reset battery saving mode
    batterySavingModeRef.current = false;
    originalVideoSettingsRef.current = null;

    // Unlock orientation
    if (isOrientationLockSupported) {
      unlockOrientation();
    }

    // Disable PiP
    if (isPiPActive) {
      disablePiP();
    }
  }, [
    activeCall,
    isOrientationLockSupported,
    unlockOrientation,
    isPiPActive,
    disablePiP,
  ]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    initialize,
    cleanup,
    optimizeCallQuality,
    enableBatterySavingMode,
    disableBatterySavingMode,
    isBatterySavingActive: batterySavingModeRef.current,
    optimizationStatus: {
      batteryOptimized:
        batterySavingModeRef.current || suggestedVideoQuality !== "high",
      pipEnabled: isPiPActive,
      callKitEnabled: callKitInitializedRef.current,
      voipPushEnabled: voipPushInitializedRef.current,
    },
  };
}
