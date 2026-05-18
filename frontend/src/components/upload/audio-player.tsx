/**
 * Audio Player - Audio attachment player component
 *
 * Features:
 * - Waveform visualization
 * - Play/pause button
 * - Progress bar with seeking
 * - Duration display
 * - Download button
 * - Playback speed control
 */

"use client";

import * as React from "react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Volume1,
  SkipBack,
  SkipForward,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/upload/file-utils";

// ============================================================================
// Types
// ============================================================================

export interface AudioPlayerProps {
  /** Audio source URL */
  src: string;
  /** Audio title */
  title?: string;
  /** Artist name */
  artist?: string;
  /** Cover/artwork image URL */
  coverUrl?: string;
  /** Audio MIME type */
  mimeType?: string;
  /** Pre-computed waveform data (0-1 values) */
  waveformData?: number[];
  /** Enable download button */
  enableDownload?: boolean;
  /** Show waveform visualization */
  showWaveform?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "minimal";
  /** Callback when audio ends */
  onEnded?: () => void;
  /** Callback when audio starts playing */
  onPlay?: () => void;
  /** Callback when audio is paused */
  onPause?: () => void;
  /** Callback when error occurs */
  onError?: (error: MediaError | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SKIP_SECONDS = 10;
const WAVEFORM_BARS = 50;

// ============================================================================
// Waveform Component
// ============================================================================

interface WaveformProps {
  data: number[];
  progress: number;
  onSeek: (progress: number) => void;
  className?: string;
}

function Waveform({ data, progress, onSeek, className }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(1, percent)));
      }
    },
    [onSeek],
  );

  // Normalize waveform data to WAVEFORM_BARS
  const normalizedData = useMemo(() => {
    if (!data || data.length === 0) {
      return Array(WAVEFORM_BARS).fill(0.3);
    }

    const step = data.length / WAVEFORM_BARS;
    const result: number[] = [];

    for (let i = 0; i < WAVEFORM_BARS; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += data[j] || 0;
      }
      result.push(sum / (end - start) || 0.1);
    }

    return result;
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={cn("flex h-10 cursor-pointer items-end gap-0.5", className)}
      onClick={handleClick}
      role="slider"
      aria-label="Audio progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
      }}
    >
      {normalizedData.map((value, index) => {
        const isPlayed = index / normalizedData.length <= progress;
        const height = Math.max(10, value * 100);
        return (
          <div
            key={index}
            className={cn(
              "flex-1 rounded-sm transition-colors",
              isPlayed ? "bg-primary" : "bg-muted-foreground/30",
            )}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Simple Progress Bar
// ============================================================================

interface ProgressBarProps {
  progress: number;
  buffered: number;
  onSeek: (progress: number) => void;
  className?: string;
}

function ProgressBar({
  progress,
  buffered,
  onSeek,
  className,
}: ProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressPercent = Math.round(progress * 100);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(1, percent)));
      }
    },
    [onSeek],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-muted-foreground/20 group relative h-1.5 cursor-pointer rounded-full",
        className,
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
      }}
      role="slider"
      aria-label="Audio progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent}
      tabIndex={0}
    >
      {/* Buffered */}
      <div
        className="bg-muted-foreground/30 absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${buffered * 100}%` }}
      />
      {/* Progress */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${progress * 100}%` }}
      />
      {/* Thumb */}
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100"
        style={{ left: `${progress * 100}%`, marginLeft: "-6px" }}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AudioPlayer({
  src,
  title,
  artist,
  coverUrl,
  mimeType,
  waveformData,
  enableDownload = true,
  showWaveform = true,
  className,
  variant = "default",
  onEnded,
  onPlay,
  onPause,
  onError,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleProgress = useCallback(() => {
    if (audioRef.current && audioRef.current.buffered.length > 0) {
      const bufferedEnd = audioRef.current.buffered.end(
        audioRef.current.buffered.length - 1,
      );
      setBuffered(bufferedEnd / audioRef.current.duration);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.(audioRef.current?.error ?? null);
  }, [onError]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Control handlers
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
      }
    },
    [],
  );

  const handleSeek = useCallback(
    (progress: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = progress * duration;
      }
    },
    [duration],
  );

  const skip = useCallback(
    (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(
          0,
          Math.min(audioRef.current.currentTime + seconds, duration),
        );
      }
    },
    [duration],
  );

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = title || "audio";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [src, title]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          skip(-SKIP_SECONDS);
          break;
        case "ArrowRight":
          skip(SKIP_SECONDS);
          break;
        case "m":
          toggleMute();
          break;
      }
    };

    // Only attach if component is focused
    return () => {};
  }, [togglePlay, skip, toggleMute]);

  // Volume icon
  const VolumeIcon =
    isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Progress
  const progress = duration > 0 ? currentTime / duration : 0;

  // Minimal variant
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onCanPlay={handleCanPlay}
        >
          {mimeType && <source src={src} type={mimeType} />}
        </audio>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={togglePlay}
          disabled={hasError}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <span className="text-xs text-muted-foreground">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-2",
          className,
        )}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onCanPlay={handleCanPlay}
        >
          {mimeType && <source src={src} type={mimeType} />}
        </audio>

        {/* Play Button */}
        <Button
          variant="secondary"
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full"
          onClick={togglePlay}
          disabled={hasError}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        {/* Progress & Info */}
        <div className="min-w-0 flex-1">
          {title && <p className="truncate text-sm font-medium">{title}</p>}
          <ProgressBar
            progress={progress}
            buffered={buffered}
            onSeek={handleSeek}
            className="mt-1"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Download */}
        {enableDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onCanPlay={handleCanPlay}
      >
        {mimeType && <source src={src} type={mimeType} />}
      </audio>

      {/* Header with Cover */}
      {(coverUrl || title || artist) && (
        <div className="mb-4 flex items-center gap-3">
          {coverUrl && (
            <img
              src={coverUrl}
              alt={title || "Cover"}
              className="h-12 w-12 rounded object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            {title && <p className="truncate font-medium">{title}</p>}
            {artist && (
              <p className="truncate text-sm text-muted-foreground">{artist}</p>
            )}
          </div>
        </div>
      )}

      {/* Waveform or Progress Bar */}
      {showWaveform && waveformData ? (
        <Waveform
          data={waveformData}
          progress={progress}
          onSeek={handleSeek}
          className="mb-2"
        />
      ) : (
        <ProgressBar
          progress={progress}
          buffered={buffered}
          onSeek={handleSeek}
          className="mb-2"
        />
      )}

      {/* Time */}
      <div className="mb-3 flex justify-between text-xs text-muted-foreground">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Skip Back */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => skip(-SKIP_SECONDS)}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={togglePlay}
            disabled={hasError}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => skip(SKIP_SECONDS)}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Volume */}
          <div className="group flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
            >
              <VolumeIcon className="h-4 w-4" />
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="bg-muted-foreground/30 ml-1 h-1 w-0 cursor-pointer appearance-none rounded-full opacity-0 transition-all group-hover:w-16 group-hover:opacity-100"
            />
          </div>

          {/* Download */}
          {enableDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <p className="mt-2 text-center text-sm text-destructive">
          Failed to load audio file
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Voice Message Player (specialized for chat)
// ============================================================================

export interface VoiceMessagePlayerProps {
  /** Audio source URL */
  src: string;
  /** Duration in seconds */
  duration?: number;
  /** Waveform data */
  waveformData?: number[];
  /** Custom class name */
  className?: string;
  /** Callback when playback ends */
  onEnded?: () => void;
}

export function VoiceMessagePlayer({
  src,
  duration: initialDuration,
  waveformData,
  className,
  onEnded,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    onEnded?.();
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (progress: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = progress * duration;
      }
    },
    [duration],
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-muted px-3 py-2",
        className,
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="text-primary-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1">
        {waveformData ? (
          <Waveform
            data={waveformData}
            progress={progress}
            onSeek={handleSeek}
            className="h-6"
          />
        ) : (
          <ProgressBar progress={progress} buffered={1} onSeek={handleSeek} />
        )}
      </div>

      {/* Duration */}
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {formatDuration(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
}

export default AudioPlayer;
