"use client";

/**
 * Voice Message Component
 *
 * Displays a voice message in chat with playback controls,
 * waveform visualization, progress bar, and playback speed control.
 */

import { useEffect, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useVoicePlayer,
  generateWaveform,
  PLAYBACK_SPEEDS,
  type PlaybackSpeed,
  type WaveformData,
} from "@/lib/voice";
import { WaveformVisualizer } from "./waveform-visualizer";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceMessageProps {
  /** Audio source URL or Blob */
  src: string | Blob;
  /** Duration in seconds (if known ahead of time) */
  duration?: number;
  /** Message timestamp */
  timestamp?: Date | string;
  /** Sender name */
  senderName?: string;
  /** Whether this message is from the current user */
  isOwnMessage?: boolean;
  /** Whether the message is highlighted/selected */
  isHighlighted?: boolean;
  /** Pre-computed waveform data */
  waveformData?: WaveformData | number[];
  /** Show download button */
  showDownload?: boolean;
  /** Callback when download is clicked */
  onDownload?: () => void;
  /** Show playback speed control */
  showSpeedControl?: boolean;
  /** Show volume control */
  showVolumeControl?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact layout for tight spaces */
  compact?: boolean;
  /** Color theme variant */
  variant?: "default" | "primary" | "muted";
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VoiceMessage = memo(function VoiceMessage({
  src,
  duration: initialDuration,
  timestamp,
  senderName,
  isOwnMessage = false,
  isHighlighted = false,
  waveformData: precomputedWaveform,
  showDownload = true,
  onDownload,
  showSpeedControl = true,
  showVolumeControl = false,
  className,
  compact = false,
  variant = "default",
}: VoiceMessageProps) {
  const [waveform, setWaveform] = useState<number[] | null>(
    precomputedWaveform
      ? Array.isArray(precomputedWaveform)
        ? precomputedWaveform
        : precomputedWaveform.amplitudes
      : null,
  );
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(false);

  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    formattedCurrentTime,
    formattedDuration,
    playbackSpeed,
    volume,
    isMuted,
    error,
    isReady,
    togglePlay,
    seekByPercentage,
    setSpeed,
    cycleSpeed,
    setVolume,
    toggleMute,
    load,
  } = useVoicePlayer({
    src: typeof src === "string" ? src : undefined,
    onEnd: () => {
      // Optional: auto-rewind or other behavior
    },
  });

  // Load blob source if provided
  useEffect(() => {
    if (src instanceof Blob) {
      load(src);
    }
  }, [src, load]);

  // Generate waveform if not provided
  useEffect(() => {
    if (precomputedWaveform || !src || waveform) return;

    const generateWaveformData = async () => {
      setIsLoadingWaveform(true);
      try {
        const data = await generateWaveform(src, compact ? 30 : 50);
        setWaveform(data.amplitudes);
      } catch (error) {
        logger.error("Failed to generate waveform:", error);
        // Use default bars if waveform generation fails
        setWaveform(new Array(compact ? 30 : 50).fill(0.5));
      } finally {
        setIsLoadingWaveform(false);
      }
    };

    generateWaveformData();
  }, [src, precomputedWaveform, waveform, compact]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default download behavior
    try {
      let blob: Blob;
      if (src instanceof Blob) {
        blob = src;
      } else {
        const response = await fetch(src);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voice-message-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to download voice message:", error);
    }
  }, [src, onDownload]);

  // Get display duration
  const displayDuration = duration || initialDuration || 0;

  // Variant styles
  const variantStyles = {
    default: {
      bg: "bg-muted/50",
      activeBg: "bg-muted",
      waveformActive: "hsl(var(--primary))",
      waveformInactive: "hsl(var(--muted-foreground) / 0.3)",
    },
    primary: {
      bg: "bg-primary/10",
      activeBg: "bg-primary/20",
      waveformActive: "hsl(var(--primary))",
      waveformInactive: "hsl(var(--primary) / 0.2)",
    },
    muted: {
      bg: "bg-muted/30",
      activeBg: "bg-muted/50",
      waveformActive: "hsl(var(--foreground) / 0.7)",
      waveformInactive: "hsl(var(--foreground) / 0.2)",
    },
  };

  const styles = variantStyles[variant];

  if (compact) {
    return (
      <CompactVoiceMessage
        isPlaying={isPlaying}
        isLoading={isLoading}
        progress={progress}
        formattedCurrentTime={formattedCurrentTime}
        formattedDuration={formattedDuration}
        displayDuration={displayDuration}
        waveform={waveform}
        isLoadingWaveform={isLoadingWaveform}
        error={error}
        isReady={isReady}
        playbackSpeed={playbackSpeed}
        togglePlay={togglePlay}
        seekByPercentage={seekByPercentage}
        cycleSpeed={cycleSpeed}
        showSpeedControl={showSpeedControl}
        styles={styles}
        className={className}
        isHighlighted={isHighlighted}
      />
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl transition-colors",
        styles.bg,
        isHighlighted && styles.activeBg,
        "hover:" + styles.activeBg,
        className,
      )}
      role="region"
      aria-label="Voice message"
    >
      <div className="flex items-center gap-3 p-3">
        {/* Play/Pause button */}
        <PlayButton
          isPlaying={isPlaying}
          isLoading={isLoading}
          isReady={isReady}
          error={error}
          onClick={togglePlay}
        />

        {/* Waveform and progress */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Waveform */}
          <div className="relative">
            {isLoadingWaveform ? (
              <div className="flex h-8 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <WaveformVisualizer
                staticData={waveform || undefined}
                progress={progress}
                height={32}
                interactive
                onSeek={seekByPercentage}
                barCount={50}
                activeColor={styles.waveformActive}
                inactiveColor={styles.waveformInactive}
              />
            )}
          </div>

          {/* Time display */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {isPlaying || currentTime > 0
                ? formattedCurrentTime
                : formattedDuration}
            </span>
            {(isPlaying || currentTime > 0) && (
              <span className="font-mono tabular-nums">
                {formattedDuration}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Speed control */}
          {showSpeedControl && (
            <SpeedControl
              speed={playbackSpeed}
              onSpeedChange={setSpeed}
              onCycleSpeed={cycleSpeed}
            />
          )}

          {/* Volume control */}
          {showVolumeControl && (
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />
          )}

          {/* Download button */}
          {showDownload && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}

      {/* Metadata */}
      {(senderName || timestamp) && (
        <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground">
          {senderName && <span>{senderName}</span>}
          {timestamp && (
            <span>
              {typeof timestamp === "string"
                ? timestamp
                : timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  onClick: () => void;
}

const PlayButton = memo(function PlayButton({
  isPlaying,
  isLoading,
  isReady,
  error,
  onClick,
}: PlayButtonProps) {
  return (
    <Button
      variant="default"
      size="icon"
      onClick={onClick}
      disabled={!isReady || !!error}
      className="h-10 w-10 flex-shrink-0 rounded-full"
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </motion.div>
        ) : isPlaying ? (
          <motion.div
            key="pause"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Pause className="h-5 w-5" />
          </motion.div>
        ) : (
          <motion.div
            key="play"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Play className="ml-0.5 h-5 w-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
});

interface SpeedControlProps {
  speed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onCycleSpeed: () => void;
}

const SpeedControl = memo(function SpeedControl({
  speed,
  onSpeedChange,
  onCycleSpeed,
}: SpeedControlProps) {
  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-w-[3rem] px-2 text-xs font-medium"
                onClick={(e) => {
                  // Cycle speed on simple click, open menu on right-click or long press
                  if (e.detail === 1) {
                    e.preventDefault();
                    onCycleSpeed();
                  }
                }}
              >
                {speed}x
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Playback speed</p>
            <p className="text-xs text-muted-foreground">
              Click to cycle, right-click for menu
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        {PLAYBACK_SPEEDS.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onSpeedChange(s)}
            className={cn(s === speed && "bg-accent")}
          >
            {s}x {s === 1 && "(Normal)"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

const VolumeControl = memo(function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  return (
    <div className="group/volume relative">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              className="h-8 w-8"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Volume slider (shows on hover) */}
      <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded-lg bg-popover p-2 shadow-lg group-hover/volume:block">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="h-20 w-2 cursor-pointer appearance-none rounded-full bg-muted"
          style={{
            writingMode: "vertical-lr" as const,
            direction: "rtl" as const,
          }}
        />
      </div>
    </div>
  );
});

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactVoiceMessageProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  formattedCurrentTime: string;
  formattedDuration: string;
  displayDuration: number;
  waveform: number[] | null;
  isLoadingWaveform: boolean;
  error: string | null;
  isReady: boolean;
  playbackSpeed: PlaybackSpeed;
  togglePlay: () => void;
  seekByPercentage: (percentage: number) => void;
  cycleSpeed: () => void;
  showSpeedControl: boolean;
  styles: {
    bg: string;
    activeBg: string;
    waveformActive: string;
    waveformInactive: string;
  };
  className?: string;
  isHighlighted: boolean;
}

const CompactVoiceMessage = memo(function CompactVoiceMessage({
  isPlaying,
  isLoading,
  progress,
  formattedCurrentTime,
  formattedDuration,
  waveform,
  isLoadingWaveform,
  error,
  isReady,
  playbackSpeed,
  togglePlay,
  seekByPercentage,
  cycleSpeed,
  showSpeedControl,
  styles,
  className,
  isHighlighted,
}: CompactVoiceMessageProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        styles.bg,
        isHighlighted && styles.activeBg,
        className,
      )}
    >
      {/* Play button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        disabled={!isReady || !!error}
        className="h-7 w-7 flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" />
        )}
      </Button>

      {/* Waveform */}
      <div className="flex-1">
        {isLoadingWaveform ? (
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        ) : (
          <WaveformVisualizer
            staticData={waveform || undefined}
            progress={progress}
            height={20}
            interactive
            onSeek={seekByPercentage}
            barCount={30}
            activeColor={styles.waveformActive}
            inactiveColor={styles.waveformInactive}
          />
        )}
      </div>

      {/* Time */}
      <span className="min-w-[2.5rem] text-right font-mono text-xs tabular-nums text-muted-foreground">
        {isPlaying ? formattedCurrentTime : formattedDuration}
      </span>

      {/* Speed control */}
      {showSpeedControl && playbackSpeed !== 1 && (
        <button
          onClick={cycleSpeed}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {playbackSpeed}x
        </button>
      )}
    </div>
  );
});

export default VoiceMessage;
