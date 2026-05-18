"use client";

/**
 * AudioPlayer - Custom audio player component with waveform
 *
 * Features play/pause, seek, volume, and playback rate controls.
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
  SkipBack,
  SkipForward,
  Download,
  Music,
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

export interface AudioPlayerProps {
  item: MediaItem;
  isPlaying?: boolean;
  currentTime?: number;
  volume?: number;
  isMuted?: boolean;
  playbackRate?: number;
  autoPlay?: boolean;
  showWaveform?: boolean;
  compact?: boolean;
  onPlayChange?: (isPlaying: boolean) => void;
  onTimeChange?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (isMuted: boolean) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onDownload?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SEEK_STEP = 10; // seconds

// ============================================================================
// Component
// ============================================================================

export function AudioPlayer({
  item,
  isPlaying = false,
  currentTime = 0,
  volume = 1,
  isMuted = false,
  playbackRate = 1,
  autoPlay = false,
  showWaveform = true,
  compact = false,
  onPlayChange,
  onTimeChange,
  onVolumeChange,
  onMutedChange,
  onPlaybackRateChange,
  onDurationChange,
  onEnded,
  onDownload,
  className,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync audio element with props
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    onPlayChange?.(!isPlaying);
  }, [isPlaying, onPlayChange]);

  // Handle seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const audio = audioRef.current;
      if (!audio) return;
      const time = value[0];
      audio.currentTime = time;
      onTimeChange?.(time);
    },
    [onTimeChange],
  );

  const seekForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.min(audio.currentTime + SEEK_STEP, duration);
    audio.currentTime = newTime;
    onTimeChange?.(newTime);
  }, [duration, onTimeChange]);

  const seekBackward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(audio.currentTime - SEEK_STEP, 0);
    audio.currentTime = newTime;
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

  // Handle playback rate
  const handlePlaybackRateChange = useCallback(
    (rate: number) => {
      onPlaybackRateChange?.(rate);
    },
    [onPlaybackRateChange],
  );

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setIsLoaded(true);
    onDurationChange?.(audio.duration);
  }, [onDurationChange]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    onTimeChange?.(audio.currentTime);
  }, [onTimeChange]);

  const handleEnded = useCallback(() => {
    onPlayChange?.(false);
    onEnded?.();
  }, [onPlayChange, onEnded]);

  // Compact mode
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card p-2",
          className,
        )}
      >
        <audio
          ref={audioRef}
          src={item.url}
          autoPlay={autoPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        >
          <track kind="captions" src="" label="Captions" default />
        </audio>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="relative flex h-1 w-full cursor-pointer items-center"
          >
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute h-full bg-primary"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </Slider>
        </div>

        <span className="text-xs text-muted-foreground">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border bg-card p-6",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={item.url}
        autoPlay={autoPlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      >
        <track kind="captions" src="" label="Captions" default />
      </audio>

      {/* Album art / Icon */}
      <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-muted">
        <Music className="h-16 w-16 text-muted-foreground" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="font-semibold">{item.fileName}</h3>
        <p className="text-sm text-muted-foreground">
          {item.uploadedBy.displayName}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2">
          <span className="min-w-[45px] text-xs text-muted-foreground">
            {formatDuration(currentTime)}
          </span>
          <div className="flex-1">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="relative flex h-2 w-full cursor-pointer items-center"
            >
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute h-full bg-primary transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </Slider>
          </div>
          <span className="min-w-[45px] text-right text-xs text-muted-foreground">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={seekBackward}
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          variant="default"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="ml-1 h-6 w-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={seekForward}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Volume and settings */}
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <div className="w-24">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="relative flex h-1 w-full cursor-pointer items-center"
            >
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute h-full bg-primary"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </Slider>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Playback rate */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                {playbackRate}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              className="h-8 w-8"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
