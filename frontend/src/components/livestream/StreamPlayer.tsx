"use client";

/**
 * Stream Player Component
 *
 * HLS video player for viewers with quality selection,
 * full-screen mode, and picture-in-picture support.
 *
 * @module components/livestream/StreamPlayer
 */

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Radio,
  PictureInPicture,
  RefreshCw,
} from "lucide-react";
import type { StreamQuality } from "@/services/livestream/types";

// ============================================================================
// Types
// ============================================================================

export interface StreamPlayerProps {
  streamId: string;
  hlsManifestUrl?: string;
  title?: string;
  isLive?: boolean;
  autoPlay?: boolean;
  lowLatencyMode?: boolean;
  onQualityChange?: (quality: StreamQuality) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface PlayerControls {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  isPiP: boolean;
  currentQuality: StreamQuality;
  availableQualities: StreamQuality[];
  latency: number;
  isBuffering: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function StreamPlayer({
  streamId,
  hlsManifestUrl,
  title = "Live Stream",
  isLive = true,
  autoPlay = true,
  lowLatencyMode = true,
  onQualityChange,
  onError,
  className,
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [controls, setControls] = useState<PlayerControls>({
    isPlaying: false,
    isMuted: false,
    volume: 1,
    isFullscreen: false,
    isPiP: false,
    currentQuality: "auto",
    availableQualities: ["auto", "1080p", "720p", "480p", "360p"],
    latency: 0,
    isBuffering: false,
  });

  // ==========================================================================
  // Video Event Handlers
  // ==========================================================================

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setControls((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setControls((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleWaiting = () => {
      setControls((prev) => ({ ...prev, isBuffering: true }));
    };

    const handlePlaying = () => {
      setControls((prev) => ({ ...prev, isBuffering: false }));
    };

    const handleVolumeChange = () => {
      setControls((prev) => ({
        ...prev,
        volume: video.volume,
        isMuted: video.muted,
      }));
    };

    const handleError = () => {
      onError?.(new Error("Video playback error"));
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("error", handleError);
    };
  }, [onError]);

  // ==========================================================================
  // Controls Visibility
  // ==========================================================================

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setShowControls(true);

    controlsTimeoutRef.current = setTimeout(() => {
      if (controls.isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [controls.isPlaying]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (controls.isPlaying) {
      setShowControls(false);
    }
  };

  // ==========================================================================
  // Playback Controls
  // ==========================================================================

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [onError]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value[0];
    video.muted = value[0] === 0;
  }, []);

  const handleQualityChange = useCallback(
    (quality: StreamQuality) => {
      setControls((prev) => ({ ...prev, currentQuality: quality }));
      onQualityChange?.(quality);
    },
    [onQualityChange],
  );

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setControls((prev) => ({ ...prev, isFullscreen: false }));
      } else {
        await container.requestFullscreen();
        setControls((prev) => ({ ...prev, isFullscreen: true }));
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setControls((prev) => ({ ...prev, isPiP: false }));
      } else {
        await video.requestPictureInPicture();
        setControls((prev) => ({ ...prev, isPiP: true }));
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  }, []);

  const goToLive = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Seek to live edge
    if (video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
    }
  }, []);

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "p":
          if (e.shiftKey) {
            e.preventDefault();
            togglePiP();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePiP]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden group",
        controls.isFullscreen ? "fixed inset-0 z-50" : "aspect-video",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        playsInline
        muted={autoPlay} // Muted for autoplay to work
      >
        {hlsManifestUrl && (
          <source src={hlsManifestUrl} type="application/x-mpegURL" />
        )}
      </video>

      {/* Buffering Indicator */}
      {controls.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <RefreshCw className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Live Badge */}
      {isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </div>
          {controls.latency > 0 && (
            <div className="bg-black/60 text-white px-2 py-1 rounded text-xs">
              {controls.latency.toFixed(1)}s latency
            </div>
          )}
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Center Play Button */}
        <button
          className="absolute inset-0 flex items-center justify-center"
          onClick={togglePlay}
          aria-label={controls.isPlaying ? "Pause" : "Play"}
        >
          {!controls.isPlaying && !controls.isBuffering && (
            <div className="bg-black/60 rounded-full p-4">
              <Play className="h-12 w-12 text-white" />
            </div>
          )}
        </button>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={togglePlay}
          >
            {controls.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Go to Live */}
          {isLive && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 text-xs"
              onClick={goToLive}
            >
              Go Live
            </Button>
          )}

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {controls.isMuted || controls.volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              className="w-20"
              value={[controls.isMuted ? 0 : controls.volume]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
            />
          </div>

          <div className="flex-1" />

          {/* Quality Selector */}
          <Select
            value={controls.currentQuality}
            onValueChange={handleQualityChange}
          >
            <SelectTrigger className="w-20 bg-transparent border-none text-white text-xs">
              <Settings className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {controls.availableQualities.map((quality) => (
                <SelectItem key={quality} value={quality}>
                  {quality === "auto" ? "Auto" : quality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Picture-in-Picture */}
          {"pictureInPictureEnabled" in document && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={togglePiP}
            >
              <PictureInPicture className="h-5 w-5" />
            </Button>
          )}

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {controls.isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StreamPlayer;
