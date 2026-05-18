"use client";

/**
 * VideoPlayer Component - Custom video player with controls
 *
 * Features play/pause, seek, volume, fullscreen, and playback rate.
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Download,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface VideoPlayerItem {
  id: string;
  url: string;
  fileName: string;
  thumbnailUrl?: string | null;
}

export interface VideoPlayerProps {
  item: VideoPlayerItem;
  isPlaying?: boolean;
  currentTime?: number;
  volume?: number;
  isMuted?: boolean;
  playbackRate?: number;
  isFullscreen?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  showVolume?: boolean;
  showPlaybackRate?: boolean;
  showDownload?: boolean;
  onPlayChange?: (isPlaying: boolean) => void;
  onTimeChange?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (isMuted: boolean) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onDownload?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP = 10;

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

export function VideoPlayer({
  item,
  isPlaying = false,
  currentTime = 0,
  volume = 1,
  isMuted = false,
  playbackRate = 1,
  isFullscreen = false,
  autoPlay = false,
  loop = false,
  showControls = true,
  showProgress = true,
  showVolume = true,
  showPlaybackRate = true,
  showDownload = false,
  onPlayChange,
  onTimeChange,
  onVolumeChange,
  onMutedChange,
  onPlaybackRateChange,
  onFullscreenChange,
  onDurationChange,
  onEnded,
  onDownload,
  className,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync video element with props
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  // Play/Pause
  const togglePlay = useCallback(() => {
    onPlayChange?.(!isPlaying);
  }, [isPlaying, onPlayChange]);

  // Seek
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      const progress = progressRef.current;
      if (!video || !progress) return;

      const rect = progress.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * duration;
      video.currentTime = time;
      onTimeChange?.(time);
    },
    [duration, onTimeChange],
  );

  const seekForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.min(video.currentTime + SEEK_STEP, duration);
    video.currentTime = newTime;
    onTimeChange?.(newTime);
  }, [duration, onTimeChange]);

  const seekBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(video.currentTime - SEEK_STEP, 0);
    video.currentTime = newTime;
    onTimeChange?.(newTime);
  }, [onTimeChange]);

  // Volume
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      onVolumeChange?.(newVolume);
      if (newVolume > 0 && isMuted) {
        onMutedChange?.(false);
      }
    },
    [isMuted, onVolumeChange, onMutedChange],
  );

  const toggleMute = useCallback(() => {
    onMutedChange?.(!isMuted);
  }, [isMuted, onMutedChange]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      onFullscreenChange?.(true);
    } else {
      document.exitFullscreen?.();
      onFullscreenChange?.(false);
    }
  }, [onFullscreenChange]);

  // Playback rate
  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    onPlaybackRateChange?.(PLAYBACK_RATES[nextIndex]);
  }, [playbackRate, onPlaybackRateChange]);

  // Video event handlers
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    onDurationChange?.(video.duration);
  }, [onDurationChange]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    onTimeChange?.(video.currentTime);
  }, [onTimeChange]);

  const handleEnded = useCallback(() => {
    onPlayChange?.(false);
    onEnded?.();
  }, [onPlayChange, onEnded]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
  }, []);

  // Show/hide controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControlsOverlay(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControlsOverlay(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      data-testid="video-player"
      className={cn(
        "group relative flex h-full w-full items-center justify-center bg-black",
        className,
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={item.url}
        poster={item.thumbnailUrl || undefined}
        className="max-h-full max-w-full"
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
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
            className="rounded-full bg-black/50 p-4 transition-transform hover:scale-110"
            data-testid="play-overlay-button"
          >
            <Play className="h-12 w-12 fill-white text-white" />
          </button>
        </div>
      )}

      {/* Controls overlay */}
      {showControls && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
            showControlsOverlay || !isPlaying
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
          data-testid="controls"
        >
          {/* Progress bar */}
          {showProgress && (
            <div className="mb-3 flex items-center gap-2">
              <span
                className="min-w-[45px] text-xs text-white"
                data-testid="current-time"
              >
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressRef}
                role="button"
                tabIndex={0}
                aria-label="Video progress - click to seek"
                className="relative h-1 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/30"
                onClick={handleProgressClick}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    seekForward();
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    seekBackward();
                  } else if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePlay();
                  }
                }}
                data-testid="progress-bar"
              >
                <div
                  className="absolute h-full bg-white transition-all"
                  style={{ width: `${progressPercent}%` }}
                  data-testid="progress-fill"
                />
              </div>
              <span
                className="min-w-[45px] text-right text-xs text-white"
                data-testid="duration"
              >
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={togglePlay}
                data-testid="play-pause-button"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              {/* Skip back */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={seekBackward}
                data-testid="skip-back-button"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              {/* Skip forward */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={seekForward}
                data-testid="skip-forward-button"
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              {/* Volume */}
              {showVolume && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={toggleMute}
                    data-testid="mute-button"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/30"
                    data-testid="volume-slider"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Playback rate */}
              {showPlaybackRate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-white hover:bg-white/20"
                  onClick={cyclePlaybackRate}
                  data-testid="playback-rate-button"
                >
                  {playbackRate}x
                </Button>
              )}

              {/* Download */}
              {showDownload && onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={onDownload}
                  data-testid="download-button"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={toggleFullscreen}
                data-testid="fullscreen-button"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
