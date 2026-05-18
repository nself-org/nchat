"use client";

/**
 * Voice Message Preview Component
 *
 * Displays a preview of a recorded voice message before sending,
 * with play, delete, send, and re-record options.
 */

import { useEffect, useState, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Send, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVoicePlayer, generateWaveform, formatDuration } from "@/lib/voice";
import { WaveformVisualizer } from "./waveform-visualizer";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceMessagePreviewProps {
  /** Audio URL for preview */
  audioUrl: string;
  /** Audio blob for reference */
  audioBlob?: Blob;
  /** Recording duration in seconds */
  duration: number;
  /** Callback when send is clicked */
  onSend?: () => void | Promise<void>;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Callback when re-record is clicked */
  onReRecord?: () => void;
  /** Whether send is in progress */
  isSending?: boolean;
  /** Whether to auto-play on mount */
  autoPlay?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Layout variant */
  variant?: "default" | "compact" | "card";
  /** Title text */
  title?: string;
  /** Show re-record button */
  showReRecord?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VoiceMessagePreview = memo(function VoiceMessagePreview({
  audioUrl,
  audioBlob,
  duration,
  onSend,
  onDelete,
  onReRecord,
  isSending = false,
  autoPlay = false,
  className,
  variant = "default",
  title = "Voice message preview",
  showReRecord = true,
}: VoiceMessagePreviewProps) {
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState(true);

  const {
    isPlaying,
    isLoading,
    progress,
    formattedCurrentTime,
    isReady,
    togglePlay,
    seekByPercentage,
    stop,
  } = useVoicePlayer({
    src: audioUrl,
    autoPlay,
    onEnd: () => {
      // Auto-stop when playback ends
    },
  });

  // Generate waveform from audio
  useEffect(() => {
    const generateWaveformData = async () => {
      setIsLoadingWaveform(true);
      try {
        const source = audioBlob || audioUrl;
        const data = await generateWaveform(source, 60);
        setWaveform(data.amplitudes);
      } catch (error) {
        logger.error("Failed to generate waveform:", error);
        // Use default bars
        setWaveform(new Array(60).fill(0.5));
      } finally {
        setIsLoadingWaveform(false);
      }
    };

    generateWaveformData();
  }, [audioUrl, audioBlob]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (isSending || !onSend) return;
    stop(); // Stop playback before sending
    await onSend();
  }, [isSending, onSend, stop]);

  // Handle delete
  const handleDelete = useCallback(() => {
    stop(); // Stop playback before deleting
    onDelete?.();
  }, [stop, onDelete]);

  // Handle re-record
  const handleReRecord = useCallback(() => {
    stop(); // Stop playback before re-recording
    onReRecord?.();
  }, [stop, onReRecord]);

  if (variant === "compact") {
    return (
      <CompactPreview
        isPlaying={isPlaying}
        isLoading={isLoading}
        progress={progress}
        formattedCurrentTime={formattedCurrentTime}
        duration={duration}
        waveform={waveform}
        isLoadingWaveform={isLoadingWaveform}
        isReady={isReady}
        isSending={isSending}
        togglePlay={togglePlay}
        seekByPercentage={seekByPercentage}
        onSend={handleSend}
        onDelete={handleDelete}
        className={className}
      />
    );
  }

  if (variant === "card") {
    return (
      <CardPreview
        title={title}
        isPlaying={isPlaying}
        isLoading={isLoading}
        progress={progress}
        formattedCurrentTime={formattedCurrentTime}
        duration={duration}
        waveform={waveform}
        isLoadingWaveform={isLoadingWaveform}
        isReady={isReady}
        isSending={isSending}
        togglePlay={togglePlay}
        seekByPercentage={seekByPercentage}
        onSend={handleSend}
        onDelete={handleDelete}
        onReRecord={showReRecord ? handleReRecord : undefined}
        className={className}
      />
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4",
        className,
      )}
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Waveform */}
      <div className="bg-muted/50 rounded-lg p-3">
        {isLoadingWaveform ? (
          <div className="flex h-12 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <WaveformVisualizer
            staticData={waveform || undefined}
            progress={progress}
            height={48}
            interactive
            onSeek={seekByPercentage}
            barCount={60}
            activeColor="hsl(var(--primary))"
            inactiveColor="hsl(var(--muted-foreground) / 0.2)"
          />
        )}
      </div>

      {/* Playback time */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{formattedCurrentTime}</span>
        <span className="font-mono tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Delete button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleDelete}
          disabled={isSending}
          className="hover:bg-destructive/10 h-10 w-10 rounded-full text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Center controls */}
        <div className="flex items-center gap-2">
          {/* Re-record button */}
          {showReRecord && onReRecord && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleReRecord}
              disabled={isSending}
              className="h-10 w-10 rounded-full"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Play/Pause button */}
          <Button
            variant="secondary"
            size="icon"
            onClick={togglePlay}
            disabled={!isReady || isSending}
            className="h-12 w-12 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Send button */}
        <Button
          variant="default"
          size="icon"
          onClick={handleSend}
          disabled={isSending || !onSend}
          className="h-10 w-10 rounded-full"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
});

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactPreviewProps {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  formattedCurrentTime: string;
  duration: number;
  waveform: number[] | null;
  isLoadingWaveform: boolean;
  isReady: boolean;
  isSending: boolean;
  togglePlay: () => void;
  seekByPercentage: (percentage: number) => void;
  onSend?: () => void;
  onDelete?: () => void;
  className?: string;
}

const CompactPreview = memo(function CompactPreview({
  isPlaying,
  isLoading,
  progress,
  formattedCurrentTime,
  duration,
  waveform,
  isLoadingWaveform,
  isReady,
  isSending,
  togglePlay,
  seekByPercentage,
  onSend,
  onDelete,
  className,
}: CompactPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-center gap-2 rounded-full border bg-card px-3 py-2",
        className,
      )}
    >
      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isSending}
        className="hover:bg-destructive/10 h-8 w-8 rounded-full text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        disabled={!isReady || isSending}
        className="h-8 w-8 rounded-full"
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
          <div className="h-6 w-full animate-pulse rounded bg-muted" />
        ) : (
          <WaveformVisualizer
            staticData={waveform || undefined}
            progress={progress}
            height={24}
            interactive
            onSeek={seekByPercentage}
            barCount={30}
          />
        )}
      </div>

      {/* Time */}
      <span className="min-w-[2.5rem] text-right font-mono text-xs tabular-nums text-muted-foreground">
        {isPlaying ? formattedCurrentTime : formatDuration(duration)}
      </span>

      {/* Send button */}
      <Button
        variant="default"
        size="icon"
        onClick={onSend}
        disabled={isSending || !onSend}
        className="h-8 w-8 rounded-full"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </motion.div>
  );
});

// ============================================================================
// CARD VARIANT
// ============================================================================

interface CardPreviewProps {
  title: string;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  formattedCurrentTime: string;
  duration: number;
  waveform: number[] | null;
  isLoadingWaveform: boolean;
  isReady: boolean;
  isSending: boolean;
  togglePlay: () => void;
  seekByPercentage: (percentage: number) => void;
  onSend?: () => void;
  onDelete?: () => void;
  onReRecord?: () => void;
  className?: string;
}

const CardPreview = memo(function CardPreview({
  title,
  isPlaying,
  isLoading,
  progress,
  formattedCurrentTime,
  duration,
  waveform,
  isLoadingWaveform,
  isReady,
  isSending,
  togglePlay,
  seekByPercentage,
  onSend,
  onDelete,
  onReRecord,
  className,
}: CardPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h4 className="font-medium">{title}</h4>
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="ml-1 font-mono text-sm tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Waveform */}
      <div className="p-4">
        <div className="bg-muted/30 rounded-lg p-4">
          {isLoadingWaveform ? (
            <div className="flex h-16 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <WaveformVisualizer
              staticData={waveform || undefined}
              progress={progress}
              height={64}
              interactive
              onSeek={seekByPercentage}
              barCount={70}
              activeColor="hsl(var(--primary))"
              inactiveColor="hsl(var(--muted-foreground) / 0.15)"
              style="bars"
            />
          )}
        </div>

        {/* Time display */}
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formattedCurrentTime}</span>
          <span className="font-mono tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        {/* Left actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isSending}
            className="hover:bg-destructive/10 text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>

          {onReRecord && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReRecord}
              disabled={isSending}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Re-record
            </Button>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            disabled={!isReady || isSending}
            className="h-9 w-9 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </Button>

          <Button
            onClick={onSend}
            disabled={isSending || !onSend}
            className="gap-1.5"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

export default VoiceMessagePreview;
