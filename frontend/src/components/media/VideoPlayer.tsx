"use client";

/**
 * VideoPlayer - Custom video player component with controls
 *
 * Features play/pause, seek, volume, fullscreen, and playback rate.
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { formatDuration } from "@/lib/media/media-manager";
import { Button } from "@/components/ui/button";
import { Slider } from "@radix-ui/react-slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

export interface VideoPlayerProps {
  item: MediaItem;
  isPlaying?: boolean;
  currentTime?: number;
  volume?: number;
  isMuted?: boolean;
  playbackRate?: number;
  isFullscreen?: boolean;
  autoPlay?: boolean;
  showControls?: boolean;
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

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SEEK_STEP = 10; // seconds

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
  showControls = true,
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

  // Handle play/pause
  const togglePlay = useCallback(() => {
    onPlayChange?.(!isPlaying);
  }, [isPlaying, onPlayChange]);

  // Handle seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const video = videoRef.current;
      if (!video) return;
      const time = value[0];
      video.currentTime = time;
      onTimeChange?.(time);
    },
    [onTimeChange],
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

  // Handle volume
  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0];
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

  // Handle fullscreen
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

  // Handle playback rate
  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      onPlaybackRateChange?.(rate);
    },
    [onPlaybackRateChange],
  );

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

  return (
    <div
      ref={containerRef}
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
        className="max-h-full max-w-full"
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
      >
        <track kind="captions" src="" label="Captions" default />
      </video>

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      )}

      {/* Play/Pause center overlay */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="rounded-full bg-black/50 p-4 transition-transform hover:scale-110"
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
        >
          {/* Progress bar */}
          <div className="mb-3 flex items-center gap-2">
            <span className="min-w-[45px] text-xs text-white">
              {formatDuration(currentTime)}
            </span>
            <div className="relative flex-1">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="relative flex h-1 w-full cursor-pointer items-center"
              >
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="absolute h-full bg-white"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </Slider>
            </div>
            <span className="min-w-[45px] text-right text-xs text-white">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={togglePlay}
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
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              {/* Skip forward */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={seekForward}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="relative flex h-1 w-full cursor-pointer items-center"
                  >
                    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/30">
                      <div
                        className="absolute h-full bg-white"
                        style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                      />
                    </div>
                  </Slider>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Playback rate */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-white hover:bg-white/20"
                  >
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[100px]">
                  {PLAYBACK_RATES.map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={cn(rate === playbackRate && "bg-accent")}
                    >
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Download */}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={onDownload}
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
