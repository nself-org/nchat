/**
 * Screen Share Hook
 *
 * Manages screen sharing functionality with advanced features.
 * Supports screen/window/tab capture, system audio, quality controls,
 * pause/resume, source switching, multi-share management, and
 * integration with the new ScreenCaptureManager.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  MediaManager,
  createMediaManager,
  type ScreenShareOptions,
  DEFAULT_SCREEN_SHARE_OPTIONS,
} from "@/lib/webrtc/media-manager";
import {
  ScreenCaptureManager,
  createScreenCaptureManager,
  type ScreenCaptureOptions,
  type ScreenShare,
  type ScreenCaptureQuality,
  type SharePermissionStatus,
  type MultiShareConfig,
  type PerformanceMetrics,
  supportsSystemAudio,
  getOptimalQuality,
} from "@/lib/webrtc/screen-capture";
import { useCallStore } from "@/stores/call-store";

// =============================================================================
// Types
// =============================================================================

export interface UseScreenShareOptions {
  userId?: string;
  userName?: string;
  onScreenShareStarted?: (stream: MediaStream) => void;
  onScreenShareStopped?: () => void;
  onScreenSharePaused?: () => void;
  onScreenShareResumed?: () => void;
  onSourceSwitched?: () => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
  onQualityChanged?: (quality: ScreenCaptureQuality) => void;
  useAdvancedCapture?: boolean; // Use new ScreenCaptureManager
  enablePerformanceMonitoring?: boolean;
  multiShareConfig?: Partial<MultiShareConfig>;
}

export interface UseScreenShareReturn {
  // State
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  error: string | null;
  isPaused: boolean;
  permissionStatus: SharePermissionStatus | null;

  // Actions
  startScreenShare: (
    options?: ScreenShareOptions | ScreenCaptureOptions,
  ) => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  pauseScreenShare: () => boolean;
  resumeScreenShare: () => boolean;
  togglePause: () => boolean;
  switchSource: (options?: ScreenCaptureOptions) => Promise<MediaStream | null>;

  // Permission
  checkPermission: () => Promise<SharePermissionStatus>;
  requestPermission: () => Promise<SharePermissionStatus>;

  // Advanced features (when useAdvancedCapture is true)
  activeShares: ScreenShare[];
  updateQuality: (quality: ScreenCaptureQuality) => Promise<void>;
  updateFrameRate: (frameRate: number) => Promise<void>;
  getVideoSettings: () => MediaTrackSettings | null;
  getPerformanceMetrics: () => Promise<PerformanceMetrics | null>;

  // Multi-share (group calls)
  canShare: () => { allowed: boolean; reason?: string };
  configureMultiShare: (config: Partial<MultiShareConfig>) => void;

  // Helper
  isSupported: boolean;
  supportsSystemAudio: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useScreenShare(
  options: UseScreenShareOptions = {},
): UseScreenShareReturn {
  const {
    userId = "default-user",
    userName = "User",
    onScreenShareStarted,
    onScreenShareStopped,
    onScreenSharePaused,
    onScreenShareResumed,
    onSourceSwitched,
    onError,
    onPermissionDenied,
    onQualityChanged,
    useAdvancedCapture = true, // Default to new advanced capture
    enablePerformanceMonitoring = false,
    multiShareConfig,
  } = options;

  // Store
  const activeCall = useCallStore((state) => state.activeCall);
  const setLocalScreenSharing = useCallStore(
    (state) => state.setLocalScreenSharing,
  );

  // Local state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeShares, setActiveShares] = useState<ScreenShare[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<SharePermissionStatus | null>(null);

  // Refs
  const mediaManagerRef = useRef<MediaManager | null>(null);
  const captureManagerRef = useRef<ScreenCaptureManager | null>(null);
  const currentShareRef = useRef<ScreenShare | null>(null);

  // Check if screen sharing is supported
  const isSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getDisplayMedia" in navigator.mediaDevices;

  // ==========================================================================
  // Initialize
  // ==========================================================================

  useEffect(() => {
    if (useAdvancedCapture) {
      captureManagerRef.current = createScreenCaptureManager({
        onStreamStarted: (stream) => {
          // Stream started
        },
        onStreamEnded: (streamId) => {
          setActiveShares((prev) => prev.filter((s) => s.id !== streamId));
          if (currentShareRef.current?.id === streamId) {
            stopScreenShare();
          }
        },
        onStreamPaused: (streamId) => {
          if (currentShareRef.current?.id === streamId) {
            setIsPaused(true);
            onScreenSharePaused?.();
          }
        },
        onStreamResumed: (streamId) => {
          if (currentShareRef.current?.id === streamId) {
            setIsPaused(false);
            onScreenShareResumed?.();
          }
        },
        onSourceSwitched: (streamId, newType) => {
          if (currentShareRef.current?.id === streamId) {
            onSourceSwitched?.();
          }
        },
        onError: (err) => {
          setError(err.message);
          onError?.(err);
        },
        onTrackEnded: (kind) => {
          if (kind === "video") {
            stopScreenShare();
          }
        },
        onPermissionDenied: () => {
          setPermissionStatus("denied");
          onPermissionDenied?.();
        },
        onQualityChanged: (streamId, quality) => {
          onQualityChanged?.(quality);
        },
      });

      // Configure multi-share if provided
      if (multiShareConfig) {
        captureManagerRef.current.configureMultiShare(multiShareConfig);
      }

      // Start performance monitoring if enabled
      if (enablePerformanceMonitoring) {
        captureManagerRef.current.startPerformanceMonitoring();
      }

      return () => {
        captureManagerRef.current?.cleanup();
        captureManagerRef.current = null;
      };
    }
  }, [useAdvancedCapture, onError, enablePerformanceMonitoring]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================================================
  // Start Screen Share
  // ==========================================================================

  const startScreenShare = useCallback(
    async (
      shareOptions:
        | ScreenShareOptions
        | ScreenCaptureOptions = DEFAULT_SCREEN_SHARE_OPTIONS,
    ) => {
      if (!isSupported) {
        const err = new Error(
          "Screen sharing is not supported in this browser",
        );
        setError(err.message);
        onError?.(err);
        return null;
      }

      try {
        setError(null);

        if (useAdvancedCapture && captureManagerRef.current) {
          // Use new advanced capture manager
          const share = await captureManagerRef.current.startCapture(
            userId,
            userName,
            shareOptions as ScreenCaptureOptions,
          );

          currentShareRef.current = share;
          setScreenStream(share.stream);
          setActiveShares((prev) => [...prev, share]);
          setIsScreenSharing(true);
          setLocalScreenSharing(true);
          onScreenShareStarted?.(share.stream);

          return share.stream;
        } else {
          // Use legacy media manager
          if (!mediaManagerRef.current) {
            mediaManagerRef.current = createMediaManager({
              onStreamError: (err) => {
                setError(err.message);
                onError?.(err);
              },
              onTrackEnded: () => {
                stopScreenShare();
              },
            });
          }

          const stream = await mediaManagerRef.current.getDisplayMedia(
            shareOptions as ScreenShareOptions,
          );

          // Handle track ended
          stream.getVideoTracks().forEach((track) => {
            track.onended = () => {
              stopScreenShare();
            };
          });

          setScreenStream(stream);
          setIsScreenSharing(true);
          setLocalScreenSharing(true);
          onScreenShareStarted?.(stream);

          return stream;
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to start screen share");
        setError(error.message);
        onError?.(error);
        return null;
      }
    },
    [
      isSupported,
      useAdvancedCapture,
      userId,
      userName,
      onError,
      onScreenShareStarted,
      setLocalScreenSharing,
    ],
  );

  // ==========================================================================
  // Stop Screen Share
  // ==========================================================================

  const stopScreenShare = useCallback(() => {
    if (
      useAdvancedCapture &&
      captureManagerRef.current &&
      currentShareRef.current
    ) {
      captureManagerRef.current.stopCapture(currentShareRef.current.id);
      currentShareRef.current = null;
    } else if (mediaManagerRef.current) {
      mediaManagerRef.current.stopScreenShare();
    }

    setScreenStream(null);
    setIsScreenSharing(false);
    setLocalScreenSharing(false);
    onScreenShareStopped?.();
  }, [useAdvancedCapture, onScreenShareStopped, setLocalScreenSharing]);

  // ==========================================================================
  // Update Quality (Advanced Mode Only)
  // ==========================================================================

  const updateQuality = useCallback(
    async (quality: "auto" | "720p" | "1080p" | "4k"): Promise<void> => {
      if (
        !useAdvancedCapture ||
        !captureManagerRef.current ||
        !currentShareRef.current
      ) {
        throw new Error("Advanced capture not enabled or no active share");
      }

      await captureManagerRef.current.updateQuality(
        currentShareRef.current.id,
        quality,
      );
    },
    [useAdvancedCapture],
  );

  // ==========================================================================
  // Update Frame Rate (Advanced Mode Only)
  // ==========================================================================

  const updateFrameRate = useCallback(
    async (frameRate: number): Promise<void> => {
      if (
        !useAdvancedCapture ||
        !captureManagerRef.current ||
        !currentShareRef.current
      ) {
        throw new Error("Advanced capture not enabled or no active share");
      }

      await captureManagerRef.current.updateFrameRate(
        currentShareRef.current.id,
        frameRate,
      );
    },
    [useAdvancedCapture],
  );

  // ==========================================================================
  // Get Video Settings (Advanced Mode Only)
  // ==========================================================================

  const getVideoSettings = useCallback((): MediaTrackSettings | null => {
    if (
      !useAdvancedCapture ||
      !captureManagerRef.current ||
      !currentShareRef.current
    ) {
      return null;
    }

    return captureManagerRef.current.getVideoSettings(
      currentShareRef.current.id,
    );
  }, [useAdvancedCapture]);

  // ==========================================================================
  // Pause/Resume (Advanced Mode Only)
  // ==========================================================================

  const pauseScreenShare = useCallback((): boolean => {
    if (
      !useAdvancedCapture ||
      !captureManagerRef.current ||
      !currentShareRef.current
    ) {
      return false;
    }

    return captureManagerRef.current.pauseCapture(currentShareRef.current.id);
  }, [useAdvancedCapture]);

  const resumeScreenShare = useCallback((): boolean => {
    if (
      !useAdvancedCapture ||
      !captureManagerRef.current ||
      !currentShareRef.current
    ) {
      return false;
    }

    return captureManagerRef.current.resumeCapture(currentShareRef.current.id);
  }, [useAdvancedCapture]);

  const togglePause = useCallback((): boolean => {
    if (
      !useAdvancedCapture ||
      !captureManagerRef.current ||
      !currentShareRef.current
    ) {
      return false;
    }

    return captureManagerRef.current.togglePause(currentShareRef.current.id);
  }, [useAdvancedCapture]);

  // ==========================================================================
  // Switch Source (Advanced Mode Only)
  // ==========================================================================

  const switchSource = useCallback(
    async (
      switchOptions?: ScreenCaptureOptions,
    ): Promise<MediaStream | null> => {
      if (
        !useAdvancedCapture ||
        !captureManagerRef.current ||
        !currentShareRef.current
      ) {
        return null;
      }

      const newShare = await captureManagerRef.current.switchSource(
        currentShareRef.current.id,
        switchOptions,
      );

      if (newShare) {
        currentShareRef.current = newShare;
        setScreenStream(newShare.stream);
        setActiveShares((prev) =>
          prev.map((s) => (s.id === newShare.id ? newShare : s)),
        );
        return newShare.stream;
      }

      return null;
    },
    [useAdvancedCapture],
  );

  // ==========================================================================
  // Permission Handling
  // ==========================================================================

  const checkPermission =
    useCallback(async (): Promise<SharePermissionStatus> => {
      const status = await ScreenCaptureManager.checkPermission();
      setPermissionStatus(status);
      return status;
    }, []);

  const requestPermission =
    useCallback(async (): Promise<SharePermissionStatus> => {
      const status = await ScreenCaptureManager.requestPermission();
      setPermissionStatus(status);
      return status;
    }, []);

  // ==========================================================================
  // Multi-Share Management
  // ==========================================================================

  const canShare = useCallback((): { allowed: boolean; reason?: string } => {
    if (!useAdvancedCapture || !captureManagerRef.current) {
      return { allowed: isSupported };
    }

    return captureManagerRef.current.canUserShare(userId);
  }, [useAdvancedCapture, isSupported, userId]);

  const configureMultiShare = useCallback(
    (config: Partial<MultiShareConfig>): void => {
      if (useAdvancedCapture && captureManagerRef.current) {
        captureManagerRef.current.configureMultiShare(config);
      }
    },
    [useAdvancedCapture],
  );

  // ==========================================================================
  // Performance Metrics
  // ==========================================================================

  const getPerformanceMetrics =
    useCallback(async (): Promise<PerformanceMetrics | null> => {
      if (!useAdvancedCapture || !captureManagerRef.current) {
        return null;
      }

      return captureManagerRef.current.getPerformanceMetrics();
    }, [useAdvancedCapture]);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (mediaManagerRef.current) {
        mediaManagerRef.current.stopScreenShare();
        mediaManagerRef.current = null;
      }
    };
  }, []);

  // ==========================================================================
  // Auto-stop when call ends
  // ==========================================================================

  useEffect(() => {
    if (!activeCall && isScreenSharing) {
      stopScreenShare();
    }
  }, [activeCall, isScreenSharing, stopScreenShare]);

  return {
    // State
    isScreenSharing,
    screenStream,
    error,
    isPaused,
    permissionStatus,

    // Actions
    startScreenShare,
    stopScreenShare,
    pauseScreenShare,
    resumeScreenShare,
    togglePause,
    switchSource,

    // Permission
    checkPermission,
    requestPermission,

    // Advanced features
    activeShares,
    updateQuality,
    updateFrameRate,
    getVideoSettings,
    getPerformanceMetrics,

    // Multi-share (group calls)
    canShare,
    configureMultiShare,

    // Helper
    isSupported,
    supportsSystemAudio: supportsSystemAudio(),
  };
}
