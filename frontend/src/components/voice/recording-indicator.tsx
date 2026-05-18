"use client";

/**
 * Recording Indicator Component
 *
 * Displays recording state with a pulsing red dot, timer,
 * and optional cancel hint.
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface RecordingIndicatorProps {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is paused */
  isPaused?: boolean;
  /** Current recording duration in seconds */
  duration?: number;
  /** Formatted duration string (if not provided, will format from duration) */
  formattedDuration?: string;
  /** Show cancel hint text */
  showCancelHint?: boolean;
  /** Custom cancel hint text */
  cancelHintText?: string;
  /** Recording label text */
  recordingText?: string;
  /** Paused label text */
  pausedText?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Custom indicator color */
  indicatorColor?: string;
  /** Show elapsed time */
  showTimer?: boolean;
  /** Pulsing animation enabled */
  animate?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZES = {
  sm: {
    dot: "h-2 w-2",
    text: "text-xs",
    gap: "gap-1.5",
    container: "px-2 py-1",
  },
  md: {
    dot: "h-2.5 w-2.5",
    text: "text-sm",
    gap: "gap-2",
    container: "px-3 py-1.5",
  },
  lg: {
    dot: "h-3 w-3",
    text: "text-base",
    gap: "gap-2.5",
    container: "px-4 py-2",
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const RecordingIndicator = memo(function RecordingIndicator({
  isRecording,
  isPaused = false,
  duration = 0,
  formattedDuration,
  showCancelHint = true,
  cancelHintText = "Slide to cancel",
  recordingText = "Recording",
  pausedText = "Paused",
  size = "md",
  className,
  indicatorColor,
  showTimer = true,
  animate = true,
}: RecordingIndicatorProps) {
  const sizeStyles = SIZES[size];
  const displayDuration = formattedDuration || formatRecordingTime(duration);
  const statusText = isPaused ? pausedText : recordingText;

  if (!isRecording && !isPaused) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-destructive/10 flex items-center rounded-full",
        sizeStyles.gap,
        sizeStyles.container,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`${statusText}: ${displayDuration}`}
    >
      {/* Pulsing indicator dot */}
      <RecordingDot
        isPaused={isPaused}
        size={sizeStyles.dot}
        color={indicatorColor}
        animate={animate && isRecording && !isPaused}
      />

      {/* Status and timer */}
      <div className={cn("flex items-center", sizeStyles.gap)}>
        {/* Recording/Paused text */}
        <span
          className={cn(
            "font-medium text-destructive",
            sizeStyles.text,
            isPaused && "opacity-70",
          )}
        >
          {statusText}
        </span>

        {/* Timer */}
        {showTimer && (
          <span
            className={cn(
              "font-mono font-semibold tabular-nums text-destructive",
              sizeStyles.text,
            )}
          >
            {displayDuration}
          </span>
        )}
      </div>

      {/* Cancel hint */}
      {showCancelHint && !isPaused && (
        <span
          className={cn(
            "ml-2 text-muted-foreground",
            sizeStyles.text,
            size === "sm" && "hidden sm:inline",
          )}
        >
          {cancelHintText}
        </span>
      )}
    </div>
  );
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface RecordingDotProps {
  isPaused: boolean;
  size: string;
  color?: string;
  animate: boolean;
}

const RecordingDot = memo(function RecordingDot({
  isPaused,
  size,
  color,
  animate,
}: RecordingDotProps) {
  return (
    <span className="relative flex">
      {/* Animated pulse ring */}
      {animate && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            size,
          )}
          style={{ backgroundColor: color || "rgb(239, 68, 68)" }}
        />
      )}
      {/* Core dot */}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          size,
          isPaused && "opacity-50",
        )}
        style={{ backgroundColor: color || "rgb(239, 68, 68)" }}
      />
    </span>
  );
});

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export interface CompactRecordingIndicatorProps {
  /** Whether currently recording */
  isRecording: boolean;
  /** Current recording duration in seconds */
  duration?: number;
  /** Formatted duration string */
  formattedDuration?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact recording indicator for use in tight spaces (e.g., message input)
 */
export const CompactRecordingIndicator = memo(
  function CompactRecordingIndicator({
    isRecording,
    duration = 0,
    formattedDuration,
    className,
  }: CompactRecordingIndicatorProps) {
    if (!isRecording) return null;

    const displayDuration = formattedDuration || formatRecordingTime(duration);

    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
        </span>
        <span className="font-mono text-xs font-medium tabular-nums text-destructive">
          {displayDuration}
        </span>
      </div>
    );
  },
);

// ============================================================================
// FLOATING INDICATOR
// ============================================================================

export interface FloatingRecordingIndicatorProps {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether recording is paused */
  isPaused?: boolean;
  /** Current recording duration in seconds */
  duration?: number;
  /** Formatted duration string */
  formattedDuration?: string;
  /** Position on screen */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center";
  /** Show cancel button */
  showCancel?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Floating recording indicator that appears at a fixed position
 */
export const FloatingRecordingIndicator = memo(
  function FloatingRecordingIndicator({
    isRecording,
    isPaused = false,
    duration = 0,
    formattedDuration,
    position = "top-right",
    showCancel = true,
    onCancel,
    className,
  }: FloatingRecordingIndicatorProps) {
    if (!isRecording && !isPaused) return null;

    const displayDuration = formattedDuration || formatRecordingTime(duration);

    const positionClasses = {
      "top-right": "top-4 right-4",
      "top-left": "top-4 left-4",
      "bottom-right": "bottom-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "top-center": "top-4 left-1/2 -translate-x-1/2",
    };

    return (
      <div
        className={cn(
          "fixed z-50 flex items-center gap-3 rounded-full bg-destructive px-4 py-2 shadow-lg",
          positionClasses[position],
          className,
        )}
        role="status"
        aria-live="assertive"
      >
        {/* Pulsing dot */}
        <span className="relative flex h-3 w-3">
          {!isPaused && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-3 w-3 rounded-full bg-white",
              isPaused && "opacity-50",
            )}
          />
        </span>

        {/* Timer */}
        <span className="font-mono text-sm font-semibold tabular-nums text-white">
          {displayDuration}
        </span>

        {/* Cancel button */}
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="ml-1 rounded-full bg-white/20 p-1 text-white transition-colors hover:bg-white/30"
            aria-label="Cancel recording"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format recording time in seconds to MM:SS
 */
function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default RecordingIndicator;
