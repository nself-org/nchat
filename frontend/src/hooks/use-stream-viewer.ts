/**
 * Stream Viewer Hook
 *
 * React hook for viewers to watch live streams with HLS playback,
 * adaptive quality, and engagement features.
 *
 * @module hooks/use-stream-viewer
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "./use-socket";
import {
  HLSPlayerManager,
  createHLSPlayer,
  type HLSPlayerConfig,
  type Stream,
  type StreamQuality,
  type BitrateLevel,
  type HLSStats,
  StreamManager,
  createStreamManager,
  getStreamAnalytics,
} from "@/lib/streaming";

// ============================================================================
// Types
// ============================================================================

export interface UseStreamViewerOptions {
  streamId: string;
  autoStart?: boolean;
  lowLatencyMode?: boolean;
  onStreamEnded?: () => void;
  onError?: (error: Error) => void;
}

export interface UseStreamViewerReturn {
  // State
  stream: Stream | null;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentQuality: StreamQuality;
  availableLevels: BitrateLevel[];
  stats: HLSStats | null;
  viewerCount: number;
  error: string | null;

  // Actions
  play: () => Promise<void>;
  pause: () => void;
  setQuality: (quality: StreamQuality) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  goToLive: () => void;

  // Video Element
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Viewer Info
  latency: number;
  volume: number;
  isMuted: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useStreamViewer(
  options: UseStreamViewerOptions,
): UseStreamViewerReturn {
  const {
    streamId,
    autoStart = true,
    lowLatencyMode = true,
    onStreamEnded,
    onError,
  } = options;
  const { user } = useAuth();
  const { isConnected, emit, subscribe } = useSocket();

  // State
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<StreamQuality>("auto");
  const [availableLevels, setAvailableLevels] = useState<BitrateLevel[]>([]);
  const [stats, setStats] = useState<HLSStats | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMutedState] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HLSPlayerManager | null>(null);
  const streamManagerRef = useRef<StreamManager>(createStreamManager());
  const analyticsRef = useRef(getStreamAnalytics(streamId));
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const latencyIntervalRef = useRef<number | null>(null);

  // ==========================================================================
  // Load Stream
  // ==========================================================================

  const loadStream = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch stream details
      const streamData = await streamManagerRef.current.getStream(streamId);
      setStream(streamData);

      if (streamData.status !== "live") {
        throw new Error("Stream is not live");
      }

      // Get HLS manifest URL
      const manifestUrl =
        streamData.hlsManifestUrl ??
        (await streamManagerRef.current.getHlsManifestUrl(streamId));

      if (!manifestUrl) {
        throw new Error("Stream manifest not available");
      }

      // Initialize HLS player
      if (videoRef.current) {
        const config: HLSPlayerConfig = {
          manifestUrl,
          videoElement: videoRef.current,
          autoStart,
          lowLatencyMode,
          onError: (err) => {
            setError(err.details);
            onError?.(new Error(err.details));
            analyticsRef.current.trackEvent("player:error", {
              error: err.details,
            });
          },
          onQualityChange: (level) => {
            setCurrentQuality(
              playerRef.current?.levelToQuality(level.level) ?? "auto",
            );
            analyticsRef.current.trackQualityChange(
              currentQuality,
              level.name as StreamQuality,
            );
          },
          onStats: (newStats) => {
            setStats(newStats);
          },
        };

        playerRef.current = createHLSPlayer(config);
        await playerRef.current.initialize();

        setAvailableLevels(playerRef.current.getAvailableLevels());
      }

      // Join as viewer
      emit("stream:viewer-joined", {
        streamId,
        sessionId: sessionIdRef.current,
      });

      analyticsRef.current.trackViewerJoin(user?.id ?? "anonymous");
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    streamId,
    autoStart,
    lowLatencyMode,
    emit,
    user,
    currentQuality,
    onError,
  ]);

  useEffect(() => {
    loadStream();
  }, [loadStream]);

  // ==========================================================================
  // Video Element Events
  // ==========================================================================

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsPaused(false);
      analyticsRef.current.trackEvent("player:play", {});
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsPaused(true);
      analyticsRef.current.trackEvent("player:pause", {});
    };

    const handleWaiting = () => {
      setIsBuffering(true);
      analyticsRef.current.trackBufferingStart();
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      analyticsRef.current.trackBufferingEnd();
    };

    const handleVolumeChange = () => {
      setVolumeState(video.volume);
      setIsMutedState(video.muted);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  // ==========================================================================
  // Playback Controls
  // ==========================================================================

  const play = useCallback(async (): Promise<void> => {
    if (!playerRef.current) return;
    await playerRef.current.play();
  }, []);

  const pause = useCallback((): void => {
    if (!playerRef.current) return;
    playerRef.current.pause();
  }, []);

  const setQuality = useCallback((quality: StreamQuality): void => {
    if (!playerRef.current) return;
    playerRef.current.setQuality(quality);
    setCurrentQuality(quality);
  }, []);

  const setVolume = useCallback((vol: number): void => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(vol);
    setVolumeState(vol);
  }, []);

  const setMuted = useCallback((muted: boolean): void => {
    if (!playerRef.current) return;
    playerRef.current.setMuted(muted);
    setIsMutedState(muted);
  }, []);

  const goToLive = useCallback((): void => {
    if (!playerRef.current) return;
    playerRef.current.goToLive();
  }, []);

  // ==========================================================================
  // Latency Monitoring
  // ==========================================================================

  useEffect(() => {
    if (!playerRef.current) return;

    latencyIntervalRef.current = window.setInterval(() => {
      const currentLatency = playerRef.current?.getLatency() ?? 0;
      setLatency(currentLatency);
    }, 1000);

    return () => {
      if (latencyIntervalRef.current) {
        window.clearInterval(latencyIntervalRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // Socket Events
  // ==========================================================================

  useEffect(() => {
    if (!isConnected) return;

    const unsubViewerCount = subscribe<{ streamId: string; count: number }>(
      "stream:viewer-count",
      (data) => {
        if (data.streamId === streamId) {
          setViewerCount(data.count);
          analyticsRef.current.trackViewerCount(data.count);
        }
      },
    );

    const unsubStreamEnd = subscribe<{ streamId: string; reason: string }>(
      "stream:end",
      (data) => {
        if (data.streamId === streamId) {
          onStreamEnded?.();
          analyticsRef.current.trackEvent("stream:ended", {
            reason: data.reason,
          });
        }
      },
    );

    return () => {
      unsubViewerCount();
      unsubStreamEnd();
    };
  }, [isConnected, streamId, subscribe, onStreamEnded]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  useEffect(() => {
    return () => {
      // Leave as viewer
      emit("stream:viewer-left", {
        streamId,
        sessionId: sessionIdRef.current,
      });

      // Cleanup player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Cleanup latency interval
      if (latencyIntervalRef.current) {
        window.clearInterval(latencyIntervalRef.current);
      }
    };
  }, [streamId, emit]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    stream,
    isLoading,
    isPlaying,
    isPaused,
    isBuffering,
    currentQuality,
    availableLevels,
    stats,
    viewerCount,
    error,

    // Actions
    play,
    pause,
    setQuality,
    setVolume,
    setMuted,
    goToLive,

    // Video Element
    videoRef,

    // Viewer Info
    latency,
    volume,
    isMuted,
  };
}
