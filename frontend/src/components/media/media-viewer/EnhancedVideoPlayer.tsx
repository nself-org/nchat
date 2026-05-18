"use client";

/**
 * EnhancedVideoPlayer - Full-featured video player component
 *
 * Features:
 * - Play/pause with keyboard support
 * - Progress scrubbing with preview
 * - Volume control with mute
 * - Playback rate adjustment
 * - Full-screen mode
 * - Picture-in-Picture support
 * - Keyboard shortcuts
 * - Touch-friendly controls
 * - Buffering indicator
 * - Time display
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  PictureInPicture,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface EnhancedVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  className?: string;

  // Playback options
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";

  // Initial state
  initialTime?: number;
  initialVolume?: number;
  initialPlaybackRate?: number;

  // UI options
  showControls?: boolean;
  showProgress?: boolean;
  showVolume?: boolean;
  showPlaybackRate?: boolean;
  showFullscreen?: boolean;
  showPictureInPicture?: boolean;
  showSkipButtons?: boolean;
  showTimeDisplay?: boolean;

  // Callbacks
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onPictureInPictureChange?: (isPip: boolean) => void;

  // Control overrides
  isPlaying?: boolean;
  currentTime?: number;
  volume?: number;
  playbackRate?: number;
  isFullscreen?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SKIP_SECONDS = 10;
const HIDE_CONTROLS_DELAY = 3000;

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

// ============================================================================
// Component
// ============================================================================

export function EnhancedVideoPlayer({
  src,
  poster,
  title,
  className,
  autoPlay = false,
  loop = false,
  muted = false,
  preload = "metadata",
  initialTime = 0,
  initialVolume = 1,
  initialPlaybackRate = 1,
  showControls = true,
  showProgress = true,
  showVolume = true,
  showPlaybackRate = true,
  showFullscreen = true,
  showPictureInPicture = true,
  showSkipButtons = true,
  showTimeDisplay = true,
  onPlay,
  onPause,
  onTimeUpdate,
  onDurationChange,
  onVolumeChange: onVolumeChangeProp,
  onEnded,
  onError,
  onFullscreenChange,
  onPictureInPictureChange,
  isPlaying: controlledIsPlaying,
  currentTime: controlledCurrentTime,
  volume: controlledVolume,
  playbackRate: controlledPlaybackRate,
  isFullscreen: controlledIsFullscreen,
}: EnhancedVideoPlayerProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // State
  const [internalIsPlaying, setInternalIsPlaying] = useState(autoPlay);
  const [internalCurrentTime, setInternalCurrentTime] = useState(initialTime);
  const [internalVolume, setInternalVolume] = useState(initialVolume);
  const [internalPlaybackRate, setInternalPlaybackRate] =
    useState(initialPlaybackRate);
  const [internalIsFullscreen, setInternalIsFullscreen] = useState(false);

  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [showPlaybackRateMenu, setShowPlaybackRateMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  // Controlled vs uncontrolled
  const isPlaying = controlledIsPlaying ?? internalIsPlaying;
  const currentTime = controlledCurrentTime ?? internalCurrentTime;
  const volume = controlledVolume ?? internalVolume;
  const playbackRate = controlledPlaybackRate ?? internalPlaybackRate;
  const isFullscreen = controlledIsFullscreen ?? internalIsFullscreen;

  // ========================================================================
  // Playback Control
  // ========================================================================

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setInternalIsPlaying(true);
      onPlay?.();
    } catch (error) {
      console.error("Failed to play video:", error);
    }
  }, [onPlay]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setInternalIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // ========================================================================
  // Seeking
  // ========================================================================

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedTime = Math.max(0, Math.min(time, duration));
      video.currentTime = clampedTime;
      setInternalCurrentTime(clampedTime);
      onTimeUpdate?.(clampedTime);
    },
    [duration, onTimeUpdate],
  );

  const skipForward = useCallback(() => {
    seek(currentTime + SKIP_SECONDS);
  }, [currentTime, seek]);

  const skipBackward = useCallback(() => {
    seek(currentTime - SKIP_SECONDS);
  }, [currentTime, seek]);

  // ========================================================================
  // Volume Control
  // ========================================================================

  const setVolume = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      video.volume = clampedVolume;
      setInternalVolume(clampedVolume);
      onVolumeChangeProp?.(clampedVolume);

      if (clampedVolume > 0 && isMuted) {
        video.muted = false;
        setIsMuted(false);
      }
    },
    [isMuted, onVolumeChangeProp],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // ========================================================================
  // Playback Rate
  // ========================================================================

  const setPlaybackRateValue = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setInternalPlaybackRate(rate);
    setShowPlaybackRateMenu(false);
  }, []);

  // ========================================================================
  // Fullscreen
  // ========================================================================

  const enterFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
      setInternalIsFullscreen(true);
      onFullscreenChange?.(true);
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
    }
  }, [onFullscreenChange]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setInternalIsFullscreen(false);
      onFullscreenChange?.(false);
    } catch (error) {
      console.error("Failed to exit fullscreen:", error);
    }
  }, [onFullscreenChange]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // ========================================================================
  // Picture-in-Picture
  // ========================================================================

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
        onPictureInPictureChange?.(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPictureInPicture(true);
        onPictureInPictureChange?.(true);
      }
    } catch (error) {
      console.error("Failed to toggle Picture-in-Picture:", error);
    }
  }, [onPictureInPictureChange]);

  // ========================================================================
  // Video Event Handlers
  // ========================================================================

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
    onDurationChange?.(video.duration);

    // Set initial time
    if (initialTime > 0) {
      video.currentTime = initialTime;
    }

    // Set initial playback rate
    video.playbackRate = initialPlaybackRate;
  }, [initialTime, initialPlaybackRate, onDurationChange]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isSeeking) return;

    setInternalCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime);
  }, [isSeeking, onTimeUpdate]);

  const handleEnded = useCallback(() => {
    setInternalIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const error = video.error;
    onError?.(new Error(error?.message || "Video playback error"));
  }, [onError]);

  // ========================================================================
  // Controls Visibility
  // ========================================================================

  const showControlsTemporarily = useCallback(() => {
    setShowControlsOverlay(true);

    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControlsOverlay(false);
        setShowPlaybackRateMenu(false);
      }, HIDE_CONTROLS_DELAY);
    }
  }, [isPlaying]);

  // ========================================================================
  // Keyboard Shortcuts
  // ========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video container is focused or video is in focus
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (isFullscreen) {
            e.preventDefault();
            exitFullscreen();
          }
          break;
      }

      showControlsTemporarily();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    skipBackward,
    skipForward,
    setVolume,
    volume,
    toggleMute,
    toggleFullscreen,
    isFullscreen,
    exitFullscreen,
    showControlsTemporarily,
  ]);

  // ========================================================================
  // Fullscreen Change Detection
  // ========================================================================

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setInternalIsFullscreen(isNowFullscreen);
      onFullscreenChange?.(isNowFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenChange]);

  // ========================================================================
  // Cleanup
  // ========================================================================

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  // ========================================================================
  // Progress Percentage
  // ========================================================================

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ========================================================================
  // Volume Icon
  // ========================================================================

  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative flex h-full w-full items-center justify-center bg-black",
        className,
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControlsOverlay(false)}
      tabIndex={0}
      role="application"
      aria-label={`Video player${title ? `: ${title}` : ""}`}
      data-testid="enhanced-video-player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="max-h-full max-w-full"
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        preload={preload}
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={handleError}
        data-testid="video-element"
      >
        <track kind="captions" src="" label="Captions" default />
      </video>

      {/* Buffering indicator */}
      {isBuffering && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30"
          data-testid="buffering-indicator"
        >
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      )}

      {/* Play/Pause center overlay */}
      {!isPlaying && !isBuffering && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          data-testid="play-overlay"
        >
          <button
            onClick={togglePlay}
            className="rounded-full bg-black/50 p-5 transition-transform hover:scale-110"
            aria-label="Play video"
            data-testid="center-play-button"
          >
            <Play className="h-14 w-14 fill-white text-white" />
          </button>
        </div>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 transition-opacity",
            showControlsOverlay || !isPlaying
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
          data-testid="controls"
        >
          {/* Progress bar */}
          {showProgress && (
            <div className="mb-3 flex items-center gap-3">
              {showTimeDisplay && (
                <span
                  className="min-w-[50px] text-xs font-medium text-white"
                  data-testid="current-time"
                >
                  {formatTime(currentTime)}
                </span>
              )}

              <div className="relative flex-1">
                <Slider
                  value={[progressPercent]}
                  max={100}
                  step={0.1}
                  onValueChange={([value]) => {
                    setIsSeeking(true);
                    const time = (value / 100) * duration;
                    seek(time);
                  }}
                  onValueCommit={() => {
                    setIsSeeking(false);
                  }}
                  className="cursor-pointer"
                  aria-label="Video progress"
                  data-testid="progress-slider"
                />
              </div>

              {showTimeDisplay && (
                <span
                  className="min-w-[50px] text-right text-xs font-medium text-white"
                  data-testid="duration"
                >
                  {formatTime(duration)}
                </span>
              )}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                data-testid="play-pause-button"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Skip buttons */}
              {showSkipButtons && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-white/20"
                    onClick={skipBackward}
                    aria-label={`Skip back ${SKIP_SECONDS} seconds`}
                    data-testid="skip-back-button"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-white/20"
                    onClick={skipForward}
                    aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
                    data-testid="skip-forward-button"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* Volume */}
              {showVolume && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-white/20"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    data-testid="mute-button"
                  >
                    <VolumeIcon className="h-5 w-5" />
                  </Button>
                  <div className="w-20">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={([value]) => setVolume(value / 100)}
                      className="cursor-pointer"
                      aria-label="Volume"
                      data-testid="volume-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Playback rate */}
              {showPlaybackRate && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-sm font-medium text-white hover:bg-white/20"
                    onClick={() =>
                      setShowPlaybackRateMenu(!showPlaybackRateMenu)
                    }
                    aria-label="Playback speed"
                    data-testid="playback-rate-button"
                  >
                    {playbackRate}x
                  </Button>

                  {showPlaybackRateMenu && (
                    <div
                      className="absolute bottom-full right-0 mb-2 rounded-lg bg-black/90 py-2 backdrop-blur-sm"
                      data-testid="playback-rate-menu"
                    >
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          className={cn(
                            "block w-full px-4 py-1.5 text-left text-sm text-white hover:bg-white/20",
                            rate === playbackRate && "bg-white/10",
                          )}
                          onClick={() => setPlaybackRateValue(rate)}
                          data-testid={`rate-${rate}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Picture-in-Picture */}
              {showPictureInPicture && document.pictureInPictureEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/20"
                  onClick={togglePictureInPicture}
                  aria-label={
                    isPictureInPicture
                      ? "Exit Picture-in-Picture"
                      : "Picture-in-Picture"
                  }
                  data-testid="pip-button"
                >
                  <PictureInPicture className="h-5 w-5" />
                </Button>
              )}

              {/* Fullscreen */}
              {showFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  data-testid="fullscreen-button"
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedVideoPlayer;
