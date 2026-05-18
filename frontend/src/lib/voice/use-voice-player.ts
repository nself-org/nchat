"use client";

/**
 * Voice Player Hook
 *
 * React hook for audio playback with support for play/pause,
 * seeking, playback speed control, and progress tracking.
 */

import { useState, useCallback, useRef, useEffect } from "react";

// ============================================================================
// TYPES
// ============================================================================

export type PlaybackState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface VoicePlayerState {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether audio is loading */
  isLoading: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Formatted current time (MM:SS) */
  formattedCurrentTime: string;
  /** Formatted duration (MM:SS) */
  formattedDuration: string;
  /** Formatted remaining time (MM:SS) */
  formattedRemainingTime: string;
  /** Current playback speed */
  playbackSpeed: PlaybackSpeed;
  /** Current volume (0-1) */
  volume: number;
  /** Whether audio is muted */
  isMuted: boolean;
  /** Error message (if any) */
  error: string | null;
  /** Whether the audio is ready to play */
  isReady: boolean;
}

export interface VoicePlayerActions {
  /** Play the audio */
  play: () => Promise<void>;
  /** Pause the audio */
  pause: () => void;
  /** Toggle play/pause */
  togglePlay: () => Promise<void>;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Seek by percentage (0-100) */
  seekByPercentage: (percentage: number) => void;
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Cycle through playback speeds */
  cycleSpeed: () => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Toggle mute */
  toggleMute: () => void;
  /** Stop and reset to beginning */
  stop: () => void;
  /** Skip forward by seconds */
  skipForward: (seconds?: number) => void;
  /** Skip backward by seconds */
  skipBackward: (seconds?: number) => void;
  /** Load a new audio source */
  load: (src: string | Blob) => void;
  /** Unload the audio */
  unload: () => void;
}

export type UseVoicePlayerReturn = VoicePlayerState & VoicePlayerActions;

export interface UseVoicePlayerOptions {
  /** Initial audio source URL or Blob */
  src?: string | Blob;
  /** Auto-play when loaded */
  autoPlay?: boolean;
  /** Initial playback speed */
  initialSpeed?: PlaybackSpeed;
  /** Initial volume */
  initialVolume?: number;
  /** Loop playback */
  loop?: boolean;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when playback ends */
  onEnd?: () => void;
  /** Callback when time updates */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when loading starts */
  onLoadStart?: () => void;
  /** Callback when audio is ready */
  onReady?: (duration: number) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Available playback speeds */
export const PLAYBACK_SPEEDS: PlaybackSpeed[] = [
  0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
];

/** Default skip duration in seconds */
const DEFAULT_SKIP_DURATION = 5;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format time in seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return "00:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format time with hours if needed (HH:MM:SS)
 */
export function formatTimeWithHours(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return "00:00";
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for voice message playback
 *
 * @example
 * ```tsx
 * function VoiceMessage({ audioUrl }: { audioUrl: string }) {
 *   const {
 *     isPlaying,
 *     progress,
 *     formattedCurrentTime,
 *     formattedDuration,
 *     playbackSpeed,
 *     togglePlay,
 *     seekByPercentage,
 *     cycleSpeed,
 *   } = useVoicePlayer({
 *     src: audioUrl,
 *     onEnd: () => // console.log('Playback ended'),
 *   })
 *
 *   return (
 *     <div>
 *       <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
 *       <input
 *         type="range"
 *         value={progress}
 *         onChange={(e) => seekByPercentage(Number(e.target.value))}
 *       />
 *       <span>{formattedCurrentTime} / {formattedDuration}</span>
 *       <button onClick={cycleSpeed}>{playbackSpeed}x</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useVoicePlayer(
  options: UseVoicePlayerOptions = {},
): UseVoicePlayerReturn {
  const {
    src: initialSrc,
    autoPlay = false,
    initialSpeed = 1,
    initialVolume = 1,
    loop = false,
    onPlay,
    onPause,
    onEnd,
    onTimeUpdate,
    onError,
    onLoadStart,
    onReady,
  } = options;

  // State
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] =
    useState<PlaybackSpeed>(initialSpeed);
  const [volume, setVolumeState] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const srcUrlRef = useRef<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    return () => {
      // Cleanup
      audio.pause();
      audio.src = "";
      audio.load();

      if (srcUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(srcUrlRef.current);
      }
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setPlaybackState("loading");
      setError(null);
      onLoadStart?.();
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsReady(true);
      setPlaybackState("idle");
      onReady?.(audio.duration);
    };

    const handleCanPlay = () => {
      setIsReady(true);
      if (playbackState === "loading") {
        setPlaybackState("idle");
      }
    };

    const handlePlay = () => {
      setPlaybackState("playing");
      onPlay?.();
    };

    const handlePause = () => {
      if (playbackState !== "ended") {
        setPlaybackState("paused");
        onPause?.();
      }
    };

    const handleEnded = () => {
      setPlaybackState("ended");
      setCurrentTime(audio.duration);
      onEnd?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime, audio.duration);
    };

    const handleError = () => {
      const errorMessage = getAudioErrorMessage(audio.error);
      setError(errorMessage);
      setPlaybackState("error");
      setIsReady(false);
      onError?.(errorMessage);
    };

    // Add listeners
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("error", handleError);
    };
  }, [
    playbackState,
    onPlay,
    onPause,
    onEnd,
    onTimeUpdate,
    onError,
    onLoadStart,
    onReady,
  ]);

  // Load initial source
  useEffect(() => {
    if (initialSrc) {
      loadAudio(initialSrc);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update playback speed on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Update volume on audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update loop setting
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = loop;
    }
  }, [loop]);

  // ============================================================================
  // Internal functions
  // ============================================================================

  const loadAudio = useCallback((source: string | Blob) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Revoke previous blob URL
    if (srcUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(srcUrlRef.current);
    }

    // Create URL from Blob if needed
    let srcUrl: string;
    if (source instanceof Blob) {
      srcUrl = URL.createObjectURL(source);
    } else {
      srcUrl = source;
    }

    srcUrlRef.current = srcUrl;
    audio.src = srcUrl;
    audio.load();

    // Reset state
    setCurrentTime(0);
    setPlaybackState("loading");
    setError(null);
    setIsReady(false);
  }, []);

  // ============================================================================
  // Actions
  // ============================================================================

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    try {
      // If ended, restart from beginning
      if (playbackState === "ended") {
        audio.currentTime = 0;
      }

      await audio.play();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to play audio";
      setError(errorMessage);
      setPlaybackState("error");
      onError?.(errorMessage);
    }
  }, [isReady, playbackState, onError]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(async () => {
    if (playbackState === "playing") {
      pause();
    } else {
      await play();
    }
  }, [playbackState, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const clampedTime = Math.max(0, Math.min(time, audio.duration || 0));
      audio.currentTime = clampedTime;
      setCurrentTime(clampedTime);

      // If ended, reset state to paused
      if (playbackState === "ended") {
        setPlaybackState("paused");
      }
    },
    [playbackState],
  );

  const seekByPercentage = useCallback(
    (percentage: number) => {
      const audio = audioRef.current;
      if (!audio || !audio.duration) return;

      const time = (percentage / 100) * audio.duration;
      seek(time);
    },
    [seek],
  );

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  }, []);

  const cycleSpeed = useCallback(() => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  }, [playbackSpeed]);

  const setVolume = useCallback((vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVolume);
    if (clampedVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setPlaybackState("idle");
  }, []);

  const skipForward = useCallback(
    (seconds: number = DEFAULT_SKIP_DURATION) => {
      const audio = audioRef.current;
      if (!audio) return;

      seek(audio.currentTime + seconds);
    },
    [seek],
  );

  const skipBackward = useCallback(
    (seconds: number = DEFAULT_SKIP_DURATION) => {
      const audio = audioRef.current;
      if (!audio) return;

      seek(audio.currentTime - seconds);
    },
    [seek],
  );

  const load = useCallback(
    (src: string | Blob) => {
      loadAudio(src);
      if (autoPlay) {
        // Wait for loading before playing
        const audio = audioRef.current;
        if (audio) {
          const handleCanPlay = () => {
            audio.removeEventListener("canplay", handleCanPlay);
            play();
          };
          audio.addEventListener("canplay", handleCanPlay);
        }
      }
    },
    [loadAudio, autoPlay, play],
  );

  const unload = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = "";
    audio.load();

    if (srcUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(srcUrlRef.current);
    }
    srcUrlRef.current = null;

    setCurrentTime(0);
    setDuration(0);
    setPlaybackState("idle");
    setError(null);
    setIsReady(false);
  }, []);

  // ============================================================================
  // Computed values
  // ============================================================================

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(0, duration - currentTime);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    playbackState,
    isPlaying: playbackState === "playing",
    isLoading: playbackState === "loading",
    currentTime,
    duration,
    progress,
    formattedCurrentTime: formatTime(currentTime),
    formattedDuration: formatTime(duration),
    formattedRemainingTime: formatTime(remainingTime),
    playbackSpeed,
    volume,
    isMuted,
    error,
    isReady,

    // Actions
    play,
    pause,
    togglePlay,
    seek,
    seekByPercentage,
    setSpeed,
    cycleSpeed,
    setVolume,
    toggleMute,
    stop,
    skipForward,
    skipBackward,
    load,
    unload,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getAudioErrorMessage(error: MediaError | null): string {
  if (!error) return "Unknown audio error";

  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "Audio loading was aborted";
    case MediaError.MEDIA_ERR_NETWORK:
      return "Network error while loading audio";
    case MediaError.MEDIA_ERR_DECODE:
      return "Audio decoding failed";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "Audio format not supported";
    default:
      return error.message || "Unknown audio error";
  }
}

export default useVoicePlayer;
