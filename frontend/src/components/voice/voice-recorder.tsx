"use client";

/**
 * Voice Recorder Component
 *
 * Full-featured voice recording interface with waveform visualization,
 * recording controls, and preview functionality.
 */

import { useCallback, useRef, memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Pause,
  Play,
  Send,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder, type UseVoiceRecorderOptions } from "@/lib/voice";
import { WaveformVisualizer } from "./waveform-visualizer";
import { CompactRecordingIndicator } from "./recording-indicator";
import { VoiceMessagePreview } from "./voice-message-preview";

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceRecorderProps {
  /** Callback when recording is complete and ready to send */
  onSend?: (
    audioBlob: Blob,
    audioFile: File,
    duration: number,
  ) => void | Promise<void>;
  /** Callback when recording is cancelled */
  onCancel?: () => void;
  /** Maximum recording duration in seconds (0 for unlimited) */
  maxDuration?: number;
  /** Whether to show preview before sending */
  showPreview?: boolean;
  /** Whether to auto-start recording on mount */
  autoStart?: boolean;
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Recorder options */
  recorderOptions?: UseVoiceRecorderOptions["recorderOptions"];
  /** Custom placeholder/idle content */
  idleContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Whether the recorder is disabled */
  disabled?: boolean;
  /** Layout variant */
  variant?: "default" | "compact" | "inline";
}

// ============================================================================
// COMPONENT
// ============================================================================

export const VoiceRecorder = memo(function VoiceRecorder({
  onSend,
  onCancel,
  maxDuration = 300, // 5 minutes default
  showPreview = true,
  autoStart = false,
  showCancel = true,
  recorderOptions,
  idleContent,
  className,
  onError,
  disabled = false,
  variant = "default",
}: VoiceRecorderProps) {
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isPaused,
    duration,
    formattedDuration,
    waveformData,
    audioBlob,
    audioUrl,
    audioFile,
    error,
    permission,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearRecording,
    requestPermission,
    clearError,
  } = useVoiceRecorder({
    maxDuration,
    recorderOptions,
    onMaxDurationReached: () => {
      // Auto-stop and show preview when max duration is reached
      if (showPreview) {
        setShowPreviewPanel(true);
      }
    },
    onError: (err) => {
      onError?.(err.message);
    },
  });

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && !disabled) {
      startRecording();
    }
  }, [autoStart, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle recording stop
  const handleStop = useCallback(async () => {
    await stopRecording();
    if (showPreview) {
      setShowPreviewPanel(true);
    }
  }, [stopRecording, showPreview]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!audioBlob || !audioFile || !onSend) return;

    setIsSending(true);
    try {
      await onSend(audioBlob, audioFile, duration);
      clearRecording();
      setShowPreviewPanel(false);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to send voice message",
      );
    } finally {
      setIsSending(false);
    }
  }, [audioBlob, audioFile, duration, onSend, clearRecording, onError]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelRecording();
    setShowPreviewPanel(false);
    onCancel?.();
  }, [cancelRecording, onCancel]);

  // Handle re-record from preview
  const handleReRecord = useCallback(() => {
    clearRecording();
    setShowPreviewPanel(false);
    startRecording();
  }, [clearRecording, startRecording]);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      onError?.("Microphone permission was denied");
    }
  }, [requestPermission, onError]);

  // Check if browser supports recording
  if (!isSupported) {
    return (
      <div
        className={cn(
          "border-destructive/50 bg-destructive/10 flex items-center justify-center gap-2 rounded-lg border p-4",
          className,
        )}
      >
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm text-destructive">
          Voice recording is not supported in this browser
        </span>
      </div>
    );
  }

  // Permission denied state
  if (permission === "denied") {
    return (
      <div
        className={cn(
          "border-destructive/50 bg-destructive/10 flex flex-col items-center justify-center gap-3 rounded-lg border p-4",
          className,
        )}
      >
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-center text-sm text-destructive">
          Microphone access was denied. Please enable it in your browser
          settings.
        </p>
      </div>
    );
  }

  // Show preview panel
  if (showPreviewPanel && audioUrl && audioBlob) {
    return (
      <VoiceMessagePreview
        audioUrl={audioUrl}
        audioBlob={audioBlob}
        duration={duration}
        onSend={handleSend}
        onDelete={handleCancel}
        onReRecord={handleReRecord}
        isSending={isSending}
        className={className}
      />
    );
  }

  // Render based on variant
  if (variant === "compact") {
    return (
      <CompactVoiceRecorder
        isRecording={isRecording}
        isPaused={isPaused}
        duration={duration}
        formattedDuration={formattedDuration}
        waveformData={waveformData}
        error={error}
        disabled={disabled}
        onStart={startRecording}
        onStop={handleStop}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onCancel={handleCancel}
        showCancel={showCancel}
        className={className}
      />
    );
  }

  if (variant === "inline") {
    return (
      <InlineVoiceRecorder
        isRecording={isRecording}
        isPaused={isPaused}
        duration={duration}
        formattedDuration={formattedDuration}
        waveformData={waveformData}
        error={error}
        disabled={disabled}
        onStart={startRecording}
        onStop={handleStop}
        onCancel={handleCancel}
        className={className}
      />
    );
  }

  // Default variant
  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col rounded-lg border bg-card p-4", className)}
    >
      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error.message}</span>
            <button
              type="button"
              onClick={clearError}
              className="ml-auto hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waveform visualizer */}
      <div className="bg-muted/50 mb-4 rounded-lg p-3">
        <WaveformVisualizer
          realtimeData={waveformData}
          height={60}
          animated={isRecording && !isPaused}
          barCount={40}
          activeColor="hsl(var(--primary))"
          inactiveColor="hsl(var(--muted-foreground) / 0.2)"
          style="bars"
        />
      </div>

      {/* Timer and status */}
      <div className="mb-4 flex items-center justify-center">
        {isRecording || isPaused ? (
          <CompactRecordingIndicator
            isRecording={isRecording && !isPaused}
            duration={duration}
            formattedDuration={formattedDuration}
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {idleContent || "Press record to start"}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Cancel button */}
        {showCancel && (isRecording || isPaused) && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleCancel}
            className="h-10 w-10 rounded-full"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        {/* Pause/Resume button */}
        {(isRecording || isPaused) && (
          <Button
            variant="outline"
            size="icon"
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="h-10 w-10 rounded-full"
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Main record/stop button */}
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="icon"
          onClick={isRecording || isPaused ? handleStop : startRecording}
          disabled={disabled || permission === "prompt"}
          className="h-14 w-14 rounded-full"
        >
          {isRecording || isPaused ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* Quick send (without preview) */}
        {!showPreview && (isRecording || isPaused) && (
          <Button
            variant="default"
            size="icon"
            onClick={async () => {
              const blob = await stopRecording();
              if (blob && audioFile) {
                handleSend();
              }
            }}
            className="h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Permission prompt */}
      {permission === "prompt" && !isRecording && (
        <div className="mt-4 text-center">
          <Button
            variant="link"
            size="sm"
            onClick={handleRequestPermission}
            className="text-xs"
          >
            Click here to enable microphone
          </Button>
        </div>
      )}

      {/* Max duration indicator */}
      {maxDuration > 0 && isRecording && (
        <div className="mt-3 text-center">
          <span className="text-xs text-muted-foreground">
            Max: {formatMaxDuration(maxDuration)}
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface CompactVoiceRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  formattedDuration: string;
  waveformData: ReturnType<typeof useVoiceRecorder>["waveformData"];
  error: ReturnType<typeof useVoiceRecorder>["error"];
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  showCancel: boolean;
  className?: string;
}

const CompactVoiceRecorder = memo(function CompactVoiceRecorder({
  isRecording,
  isPaused,
  duration,
  formattedDuration,
  waveformData,
  error,
  disabled,
  onStart,
  onStop,
  onPause,
  onResume,
  onCancel,
  showCancel,
  className,
}: CompactVoiceRecorderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border bg-card px-4 py-2",
        className,
      )}
    >
      {isRecording || isPaused ? (
        <>
          {/* Cancel */}
          {showCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Waveform */}
          <div className="flex-1">
            <WaveformVisualizer
              realtimeData={waveformData}
              height={24}
              animated={isRecording && !isPaused}
              barCount={20}
            />
          </div>

          {/* Timer */}
          <span className="font-mono text-sm font-medium tabular-nums text-destructive">
            {formattedDuration}
          </span>

          {/* Pause/Resume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={isPaused ? onResume : onPause}
            className="h-8 w-8 rounded-full"
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>

          {/* Stop */}
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-8 w-8 rounded-full"
          >
            <Square className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-muted-foreground">
            {error ? error.message : "Record a voice message"}
          </span>
          <Button
            variant="default"
            size="icon"
            onClick={onStart}
            disabled={disabled}
            className="h-8 w-8 rounded-full"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
});

// ============================================================================
// INLINE VARIANT
// ============================================================================

interface InlineVoiceRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  formattedDuration: string;
  waveformData: ReturnType<typeof useVoiceRecorder>["waveformData"];
  error: ReturnType<typeof useVoiceRecorder>["error"];
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  className?: string;
}

const InlineVoiceRecorder = memo(function InlineVoiceRecorder({
  isRecording,
  isPaused,
  formattedDuration,
  waveformData,
  disabled,
  onStart,
  onStop,
  onCancel,
  className,
}: InlineVoiceRecorderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isRecording || isPaused ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            <span className="font-mono text-xs font-medium text-destructive">
              {formattedDuration}
            </span>
            <div className="flex-1">
              <WaveformVisualizer
                realtimeData={waveformData}
                height={16}
                animated
                barCount={15}
              />
            </div>
          </div>

          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-8 w-8"
          >
            <Square className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={onStart}
          disabled={disabled}
          className="h-8 w-8"
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});

// ============================================================================
// UTILITIES
// ============================================================================

function formatMaxDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default VoiceRecorder;
