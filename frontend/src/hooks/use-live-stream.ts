/**
 * Live Stream Hook (Broadcaster)
 *
 * React hook for broadcasters to manage live streams including starting,
 * stopping, and monitoring stream health.
 *
 * @module hooks/use-live-stream
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "./use-socket";
import { logger } from "@/lib/logger";
import {
  StreamClient,
  createStreamClient,
  type StreamClientConfig,
  type StreamClientError,
  type Stream,
  type StreamQuality,
  type StreamQualityMetrics,
  type CreateStreamInput,
  StreamManager,
  createStreamManager,
} from "@/lib/streaming";

// ============================================================================
// Types
// ============================================================================

export interface UseLiveStreamOptions {
  onStreamCreated?: (stream: Stream) => void;
  onStreamStarted?: (stream: Stream) => void;
  onStreamEnded?: (stream: Stream) => void;
  onError?: (error: Error) => void;
}

export interface UseLiveStreamReturn {
  // State
  stream: Stream | null;
  isCreating: boolean;
  isStarting: boolean;
  isBroadcasting: boolean;
  isEnding: boolean;
  localStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | null;
  qualityMetrics: StreamQualityMetrics | null;
  viewerCount: number;
  error: string | null;

  // Actions
  createStream: (input: CreateStreamInput) => Promise<Stream>;
  startBroadcast: (quality?: StreamQuality) => Promise<void>;
  stopBroadcast: () => void;
  endStream: () => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  changeQuality: (quality: StreamQuality) => Promise<void>;
  toggleVideo: (enabled: boolean) => void;
  toggleAudio: (enabled: boolean) => void;

  // Devices
  availableCameras: MediaDeviceInfo[];
  availableMicrophones: MediaDeviceInfo[];

  // Stream Info
  duration: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useLiveStream(
  options: UseLiveStreamOptions = {},
): UseLiveStreamReturn {
  const { onStreamCreated, onStreamStarted, onStreamEnded, onError } = options;
  const { user } = useAuth();
  const { isConnected, emit, subscribe } = useSocket();

  // State
  const [stream, setStream] = useState<Stream | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState | null>(null);
  const [qualityMetrics, setQualityMetrics] =
    useState<StreamQualityMetrics | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [availableMicrophones, setAvailableMicrophones] = useState<
    MediaDeviceInfo[]
  >([]);
  const [duration, setDuration] = useState(0);

  // Refs
  const streamClientRef = useRef<StreamClient | null>(null);
  const streamManagerRef = useRef<StreamManager>(createStreamManager());
  const durationIntervalRef = useRef<number | null>(null);

  // ==========================================================================
  // Device Enumeration
  // ==========================================================================

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableCameras(devices.filter((d) => d.kind === "videoinput"));
      setAvailableMicrophones(devices.filter((d) => d.kind === "audioinput"));
    } catch (err) {
      logger.error("Failed to enumerate devices:", err);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        enumerateDevices,
      );
    };
  }, [enumerateDevices]);

  // ==========================================================================
  // Duration Timer
  // ==========================================================================

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
    }

    setDuration(0);
    durationIntervalRef.current = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // ==========================================================================
  // Stream Creation
  // ==========================================================================

  const createStream = useCallback(
    async (input: CreateStreamInput): Promise<Stream> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      setIsCreating(true);
      setError(null);

      try {
        const newStream = await streamManagerRef.current.createStream(input);
        setStream(newStream);
        onStreamCreated?.(newStream);
        return newStream;
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [user, onStreamCreated, onError],
  );

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  const startBroadcast = useCallback(
    async (quality: StreamQuality = "720p"): Promise<void> => {
      if (!stream || !user) {
        throw new Error("Stream not created or user not authenticated");
      }

      if (isBroadcasting) {
        throw new Error("Already broadcasting");
      }

      setIsStarting(true);
      setError(null);

      try {
        // Create stream client
        const config: StreamClientConfig = {
          streamId: stream.id,
          streamKey: stream.streamKey ?? "",
          ingestUrl: stream.ingestUrl ?? "",
          userId: user.id,
          onConnectionStateChange: (state) => {
            setConnectionState(state);
          },
          onError: (err) => {
            setError(err.message);
            onError?.(new Error(err.message));
          },
          onQualityMetrics: (metrics) => {
            setQualityMetrics(metrics);
          },
        };

        streamClientRef.current = createStreamClient(config);

        // Start broadcasting
        const mediaStream =
          await streamClientRef.current.startBroadcast(quality);
        setLocalStream(mediaStream);

        // Update stream status to live
        const liveStream = await streamManagerRef.current.startStream(
          stream.id,
        );
        setStream(liveStream);

        // Emit stream start event
        emit("stream:start", {
          streamId: stream.id,
          hlsManifestUrl: liveStream.hlsManifestUrl,
        });

        setIsBroadcasting(true);
        startDurationTimer();
        onStreamStarted?.(liveStream);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        onError?.(error);
        throw error;
      } finally {
        setIsStarting(false);
      }
    },
    [
      stream,
      user,
      isBroadcasting,
      emit,
      startDurationTimer,
      onStreamStarted,
      onError,
    ],
  );

  const stopBroadcast = useCallback(() => {
    if (streamClientRef.current) {
      streamClientRef.current.stopBroadcast();
      streamClientRef.current = null;
    }

    setLocalStream(null);
    setConnectionState(null);
    setIsBroadcasting(false);
    stopDurationTimer();
  }, [stopDurationTimer]);

  const endStream = useCallback(async (): Promise<void> => {
    if (!stream) return;

    setIsEnding(true);
    setError(null);

    try {
      // Stop broadcasting
      stopBroadcast();

      // End stream in database
      const endedStream = await streamManagerRef.current.endStream(stream.id);
      setStream(endedStream);

      // Emit stream end event
      emit("stream:end", {
        streamId: stream.id,
        reason: "completed",
      });

      onStreamEnded?.(endedStream);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
      throw error;
    } finally {
      setIsEnding(false);
    }
  }, [stream, stopBroadcast, emit, onStreamEnded, onError]);

  // ==========================================================================
  // Device Controls
  // ==========================================================================

  const switchCamera = useCallback(async (deviceId: string): Promise<void> => {
    if (!streamClientRef.current) return;
    await streamClientRef.current.switchCamera(deviceId);
  }, []);

  const switchMicrophone = useCallback(
    async (deviceId: string): Promise<void> => {
      if (!streamClientRef.current) return;
      await streamClientRef.current.switchMicrophone(deviceId);
    },
    [],
  );

  const changeQuality = useCallback(
    async (quality: StreamQuality): Promise<void> => {
      if (!streamClientRef.current) return;
      await streamClientRef.current.changeQuality(quality);
    },
    [],
  );

  const toggleVideo = useCallback((enabled: boolean): void => {
    if (!streamClientRef.current) return;
    streamClientRef.current.toggleVideo(enabled);
  }, []);

  const toggleAudio = useCallback((enabled: boolean): void => {
    if (!streamClientRef.current) return;
    streamClientRef.current.toggleAudio(enabled);
  }, []);

  // ==========================================================================
  // Socket Events
  // ==========================================================================

  useEffect(() => {
    if (!isConnected || !stream) return;

    const unsubViewerCount = subscribe<{ streamId: string; count: number }>(
      "stream:viewer-count",
      (data) => {
        if (data.streamId === stream.id) {
          setViewerCount(data.count);
        }
      },
    );

    return () => {
      unsubViewerCount();
    };
  }, [isConnected, stream, subscribe]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    return () => {
      stopBroadcast();
      stopDurationTimer();
    };
  }, [stopBroadcast, stopDurationTimer]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    stream,
    isCreating,
    isStarting,
    isBroadcasting,
    isEnding,
    localStream,
    connectionState,
    qualityMetrics,
    viewerCount,
    error,

    // Actions
    createStream,
    startBroadcast,
    stopBroadcast,
    endStream,
    switchCamera,
    switchMicrophone,
    changeQuality,
    toggleVideo,
    toggleAudio,

    // Devices
    availableCameras,
    availableMicrophones,

    // Stream Info
    duration,
  };
}
