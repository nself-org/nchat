/**
 * Recording Player Component
 *
 * Video/audio player for call recordings with:
 * - Playback controls
 * - Quality selection
 * - Redaction markers
 * - Thumbnail timeline
 * - Download button
 */

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Settings,
  SkipBack,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import type {
  Recording,
  RecordingVariant,
  RedactionSegment,
} from "@/services/recordings/types";

// ============================================================================
// Types
// ============================================================================

interface RecordingPlayerProps {
  recording: Recording;
  downloadUrl?: string;
  onDownload?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function RecordingPlayer({
  recording,
  downloadUrl,
  onDownload,
  onTimeUpdate,
  className,
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.durationSeconds || 0);
  const [volume, setVolume] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<string>(
    recording.quality,
  );
  const [showControls, setShowControls] = useState(true);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  // Available quality options
  const qualityOptions = [
    {
      value: recording.quality,
      label: recording.quality,
      url: recording.fileUrl,
    },
    ...recording.variants.map((v) => ({
      value: v.quality,
      label: v.quality,
      url: v.fileUrl,
    })),
  ];

  // Get current video URL based on selected quality
  const currentUrl =
    selectedQuality === recording.quality
      ? recording.fileUrl
      : recording.variants.find((v) => v.quality === selectedQuality)?.fileUrl;

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || !progressRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  // Handle progress hover
  const handleProgressHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;

      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      setHoveredTime(percent * duration);
    },
    [duration],
  );

  // Skip forward/backward
  const skip = useCallback(
    (seconds: number) => {
      if (!videoRef.current) return;

      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [currentTime, duration],
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoRef.current) return;

      const newVolume = parseFloat(e.target.value);
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    },
    [],
  );

  // Handle quality change
  const handleQualityChange = useCallback((quality: string) => {
    if (!videoRef.current) return;

    const savedTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;

    setSelectedQuality(quality);

    // Wait for source change, then restore position
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = savedTime;
        if (wasPlaying) {
          videoRef.current.play();
        }
      }
    }, 100);
  }, []);

  // Hide controls after inactivity
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const showControlsHandler = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      hideControls();
    };

    const container = videoRef.current?.parentElement;
    container?.addEventListener("mousemove", showControlsHandler);
    container?.addEventListener("touchstart", showControlsHandler);

    return () => {
      container?.removeEventListener("mousemove", showControlsHandler);
      container?.removeEventListener("touchstart", showControlsHandler);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration || recording.durationSeconds || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [recording.durationSeconds, onTimeUpdate]);

  // Check if current time is in a redacted segment
  const isInRedactedSegment = useCallback(
    (time: number): RedactionSegment | null => {
      return (
        recording.redactions.find(
          (r) => r.applied && time >= r.startSeconds && time <= r.endSeconds,
        ) || null
      );
    },
    [recording.redactions],
  );

  const currentRedaction = isInRedactedSegment(currentTime);

  return (
    <div
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        className,
      )}
    >
      {/* Video Element */}
      {recording.format === "audio_only" ? (
        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center text-white">
            <Volume2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Audio Recording</p>
            <p className="text-sm opacity-70">{formatTime(duration)}</p>
          </div>
          <audio ref={videoRef as any} src={currentUrl} preload="metadata" />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={currentUrl}
          className="w-full aspect-video"
          poster={recording.thumbnailUrl}
          preload="metadata"
          onClick={togglePlay}
        />
      )}

      {/* Redaction Warning Overlay */}
      {currentRedaction && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
            <p className="text-lg font-medium">Redacted Content</p>
            <p className="text-sm opacity-70">{currentRedaction.reason}</p>
          </div>
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
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="relative h-1 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoveredTime(null)}
          >
            {/* Played Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />

            {/* Buffered Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full -z-10"
              style={{ width: "100%" }}
            />

            {/* Redaction Markers */}
            {recording.redactions
              .filter((r) => r.applied)
              .map((redaction) => (
                <div
                  key={redaction.id}
                  className="absolute top-0 h-full bg-yellow-500/50 rounded"
                  style={{
                    left: `${(redaction.startSeconds / duration) * 100}%`,
                    width: `${((redaction.endSeconds - redaction.startSeconds) / duration) * 100}%`,
                  }}
                  title={`Redacted: ${redaction.reason}`}
                />
              ))}

            {/* Hover Time Tooltip */}
            {hoveredTime !== null && (
              <div
                className="absolute -top-8 transform -translate-x-1/2 bg-black px-2 py-1 rounded text-xs text-white"
                style={{ left: `${(hoveredTime / duration) * 100}%` }}
              >
                {formatTime(hoveredTime)}
              </div>
            )}

            {/* Scrubber Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => skip(-10)}
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => skip(10)}
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-white"
                />
              </div>

              {/* Time */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quality Selector */}
              {qualityOptions.length > 1 && (
                <Select
                  value={selectedQuality}
                  onValueChange={handleQualityChange}
                >
                  <SelectTrigger className="w-20 h-8 text-white border-white/30 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Download */}
              {downloadUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={onDownload}
                >
                  <Download className="w-5 h-5" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecordingPlayer;
