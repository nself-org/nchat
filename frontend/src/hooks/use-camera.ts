/**
 * Use Camera Hook
 *
 * Manages camera device selection, permissions, and video stream.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MediaManager,
  createMediaManager,
  type VideoConstraints,
} from "@/lib/webrtc/media-manager";
import { type MediaDevice } from "@/lib/webrtc/media-manager";

// =============================================================================
// Types
// =============================================================================

export interface UseCameraOptions {
  autoStart?: boolean;
  defaultDeviceId?: string;
  constraints?: VideoConstraints;
  onError?: (error: Error) => void;
}

export interface UseCameraReturn {
  // State
  stream: MediaStream | null;
  isActive: boolean;
  isEnabled: boolean;
  devices: MediaDevice[];
  selectedDevice: MediaDevice | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;

  // Permissions
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

// =============================================================================
// Hook
// =============================================================================

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { autoStart = false, defaultDeviceId, constraints, onError } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MediaDevice | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const mediaManagerRef = useRef<MediaManager | null>(null);

  // ===========================================================================
  // Initialization
  // ===========================================================================

  useEffect(() => {
    mediaManagerRef.current = createMediaManager({
      onDeviceChange: (devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);

        // Update selected device if it's in the new list
        if (selectedDevice) {
          const updated = videoDevices.find(
            (d) => d.deviceId === selectedDevice.deviceId,
          );
          if (updated) {
            setSelectedDevice(updated);
          }
        }
      },
      onStreamError: (err) => {
        setError(err.message);
        onError?.(err);
        setIsActive(false);
      },
    });

    // Enumerate devices on mount
    refreshDevices();

    // Check permissions
    checkPermission();

    // Auto-start if requested
    if (autoStart) {
      start();
    }

    return () => {
      if (mediaManagerRef.current) {
        mediaManagerRef.current.cleanup();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===========================================================================
  // Device Management
  // ===========================================================================

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!mediaManagerRef.current) return;

    try {
      const allDevices = await mediaManagerRef.current.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);

      // Auto-select device
      if (!selectedDevice && videoDevices.length > 0) {
        const defaultDevice =
          videoDevices.find((d) => d.deviceId === defaultDeviceId) ||
          videoDevices[0];
        setSelectedDevice(defaultDevice);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to enumerate devices");
      setError(error.message);
      onError?.(error);
    }
  }, [defaultDeviceId, selectedDevice, onError]);

  const selectDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      const device = devices.find((d) => d.deviceId === deviceId);
      if (!device) {
        setError("Device not found");
        return;
      }

      setSelectedDevice(device);

      // If camera is active, restart with new device
      if (isActive && mediaManagerRef.current) {
        try {
          await mediaManagerRef.current.switchVideoDevice(deviceId);
          const newStream = mediaManagerRef.current.stream;
          if (newStream) {
            setStream(newStream);
          }
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error("Failed to switch device");
          setError(error.message);
          onError?.(error);
        }
      }
    },
    [devices, isActive, onError],
  );

  // ===========================================================================
  // Permissions
  // ===========================================================================

  const checkPermission = useCallback(async (): Promise<void> => {
    if (!mediaManagerRef.current) return;

    try {
      const permissions = await mediaManagerRef.current.checkPermissions();
      setHasPermission(permissions.video);
    } catch (err) {
      setHasPermission(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!mediaManagerRef.current) return false;

    try {
      const permissions = await mediaManagerRef.current.requestPermissions(
        false,
        true,
      );
      setHasPermission(permissions.video);
      await refreshDevices();
      return permissions.video;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Permission denied");
      setError(error.message);
      onError?.(error);
      return false;
    }
  }, [refreshDevices, onError]);

  // ===========================================================================
  // Stream Control
  // ===========================================================================

  const start = useCallback(async (): Promise<void> => {
    if (isActive || !mediaManagerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if needed
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error("Camera permission denied");
        }
      }

      const videoConstraints: VideoConstraints = {
        ...constraints,
        ...(selectedDevice && { deviceId: { exact: selectedDevice.deviceId } }),
      };

      const newStream = await mediaManagerRef.current.getVideoStream(
        undefined,
        videoConstraints,
      );
      setStream(newStream);
      setIsActive(true);
      setIsEnabled(true);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to start camera");
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isActive,
    hasPermission,
    constraints,
    selectedDevice,
    requestPermission,
    onError,
  ]);

  const stop = useCallback((): void => {
    if (!isActive || !mediaManagerRef.current) return;

    mediaManagerRef.current.stopLocalStream();
    setStream(null);
    setIsActive(false);
    setIsEnabled(false);
  }, [isActive]);

  const toggle = useCallback(async (): Promise<void> => {
    if (isActive) {
      // Toggle enabled state without stopping stream
      if (mediaManagerRef.current) {
        const newEnabled = !isEnabled;
        mediaManagerRef.current.enableVideo(newEnabled);
        setIsEnabled(newEnabled);
      }
    } else {
      await start();
    }
  }, [isActive, isEnabled, start]);

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // State
    stream,
    isActive,
    isEnabled,
    devices,
    selectedDevice,
    error,
    isLoading,

    // Actions
    start,
    stop,
    toggle,
    selectDevice,
    refreshDevices,

    // Permissions
    hasPermission,
    requestPermission,
  };
}
