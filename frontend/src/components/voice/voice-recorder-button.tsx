"use client";

/**
 * Voice Recorder Button Component
 *
 * A microphone button that triggers voice recording with press-and-hold behavior
 * and permission handling.
 */

import {
  useCallback,
  useRef,
  useState,
  useEffect,
  memo,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  isRecordingSupported,
  type MicrophonePermissionState,
} from "@/lib/voice";

// ============================================================================
// TYPES
// ============================================================================

export type RecorderButtonState =
  | "idle"
  | "permission-prompt"
  | "permission-denied"
  | "recording"
  | "unsupported";

export interface VoiceRecorderButtonProps extends Omit<
  ButtonProps,
  "onClick" | "onMouseDown" | "onMouseUp" | "onTouchStart" | "onTouchEnd"
> {
  /** Current recording state from parent */
  isRecording?: boolean;
  /** Whether recording is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?: ButtonProps["variant"];
  /** Button size */
  size?: ButtonProps["size"];
  /** Callback when recording should start */
  onStartRecording?: () => void;
  /** Callback when recording should stop */
  onStopRecording?: () => void;
  /** Callback when permission is denied */
  onPermissionDenied?: () => void;
  /** Callback when recording is not supported */
  onNotSupported?: () => void;
  /** Whether to use hold-to-record behavior (vs click to toggle) */
  holdToRecord?: boolean;
  /** Minimum hold duration before recording starts (ms) */
  minHoldDuration?: number;
  /** Show tooltip with instructions */
  showTooltip?: boolean;
  /** Custom tooltip content */
  tooltipContent?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show permission status indicator */
  showPermissionIndicator?: boolean;
  /** Icon size */
  iconSize?: number;
  /** Pulsing animation when recording */
  pulseWhenRecording?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MIN_HOLD_DURATION = 200; // ms
const DEFAULT_ICON_SIZE = 16;

// ============================================================================
// COMPONENT
// ============================================================================

export const VoiceRecorderButton = memo(function VoiceRecorderButton({
  isRecording = false,
  disabled = false,
  variant = "ghost",
  size = "icon",
  onStartRecording,
  onStopRecording,
  onPermissionDenied,
  onNotSupported,
  holdToRecord = false,
  minHoldDuration = DEFAULT_MIN_HOLD_DURATION,
  showTooltip = true,
  tooltipContent,
  className,
  showPermissionIndicator = false,
  iconSize = DEFAULT_ICON_SIZE,
  pulseWhenRecording = true,
  ...buttonProps
}: VoiceRecorderButtonProps) {
  const [permission, setPermission] =
    useState<MicrophonePermissionState | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);

  // Check support and permission on mount
  useEffect(() => {
    const supported = isRecordingSupported();
    setIsSupported(supported);

    if (!supported) {
      onNotSupported?.();
      return;
    }

    checkMicrophonePermission().then(setPermission);
  }, [onNotSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // Determine button state
  const buttonState: RecorderButtonState = (() => {
    if (!isSupported) return "unsupported";
    if (isRecording) return "recording";
    if (permission?.state === "denied") return "permission-denied";
    if (permission?.state === "prompt") return "permission-prompt";
    return "idle";
  })();

  // Request permission and start recording
  const handleStartRecording = useCallback(async () => {
    if (!isSupported) {
      onNotSupported?.();
      return;
    }

    // Check permission
    if (permission?.state === "denied") {
      onPermissionDenied?.();
      return;
    }

    if (permission?.state === "prompt") {
      setIsCheckingPermission(true);
      const granted = await requestMicrophonePermission();
      setIsCheckingPermission(false);

      if (!granted) {
        setPermission({ state: "denied", canRequest: false });
        onPermissionDenied?.();
        return;
      }

      setPermission({ state: "granted", canRequest: false });
    }

    onStartRecording?.();
  }, [
    isSupported,
    permission,
    onStartRecording,
    onPermissionDenied,
    onNotSupported,
  ]);

  // Handle click (toggle mode)
  const handleClick = useCallback(() => {
    if (holdToRecord) return; // Ignore click in hold-to-record mode

    if (isRecording) {
      onStopRecording?.();
    } else {
      handleStartRecording();
    }
  }, [holdToRecord, isRecording, handleStartRecording, onStopRecording]);

  // Handle hold start
  const handleHoldStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!holdToRecord || isRecording || disabled) return;

      e.preventDefault();
      setIsHolding(true);
      holdStartTimeRef.current = Date.now();

      // Start recording after minimum hold duration
      holdTimerRef.current = setTimeout(() => {
        handleStartRecording();
      }, minHoldDuration);
    },
    [
      holdToRecord,
      isRecording,
      disabled,
      minHoldDuration,
      handleStartRecording,
    ],
  );

  // Handle hold end
  const handleHoldEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!holdToRecord) return;

      e.preventDefault();
      setIsHolding(false);

      // Clear the timer
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      // Stop recording if it was started
      if (isRecording) {
        onStopRecording?.();
      }

      holdStartTimeRef.current = null;
    },
    [holdToRecord, isRecording, onStopRecording],
  );

  // Handle touch cancel (e.g., slide away to cancel)
  const handleTouchCancel = useCallback(() => {
    if (!holdToRecord) return;

    setIsHolding(false);

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // Recording should be cancelled externally by the parent component
    holdStartTimeRef.current = null;
  }, [holdToRecord]);

  // Get tooltip text
  const getTooltipText = () => {
    if (tooltipContent) return tooltipContent;
    if (!isSupported) return "Voice recording not supported";
    if (permission?.state === "denied") return "Microphone access denied";
    if (isRecording) return holdToRecord ? "Release to stop" : "Stop recording";
    if (holdToRecord) return "Hold to record";
    return "Record voice message";
  };

  // Get icon
  const getIcon = () => {
    if (!isSupported || permission?.state === "denied") {
      return (
        <MicOff
          className="text-muted-foreground"
          style={{ width: iconSize, height: iconSize }}
        />
      );
    }
    if (isCheckingPermission) {
      return (
        <Loader2
          className="animate-spin"
          style={{ width: iconSize, height: iconSize }}
        />
      );
    }
    return <Mic style={{ width: iconSize, height: iconSize }} />;
  };

  const buttonContent = (
    <Button
      variant={isRecording ? "destructive" : variant}
      size={size}
      disabled={
        disabled ||
        !isSupported ||
        permission?.state === "denied" ||
        isCheckingPermission
      }
      onClick={handleClick}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onTouchCancel={handleTouchCancel}
      className={cn(
        "relative",
        isRecording && pulseWhenRecording && "animate-pulse",
        isHolding && "scale-95",
        className,
      )}
      aria-label={getTooltipText()}
      aria-pressed={isRecording}
      {...buttonProps}
    >
      {/* Icon */}
      {getIcon()}

      {/* Recording indicator */}
      {isRecording && (
        <motion.span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
        />
      )}

      {/* Permission indicator */}
      {showPermissionIndicator && permission?.state === "prompt" && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
        </span>
      )}
    </Button>
  );

  if (!showTooltip) {
    return buttonContent;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
          {holdToRecord &&
            !isRecording &&
            isSupported &&
            permission?.state !== "denied" && (
              <p className="text-xs text-muted-foreground">
                Hold to record, release to stop
              </p>
            )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// ANIMATED VARIANT
// ============================================================================

export interface AnimatedVoiceRecorderButtonProps extends VoiceRecorderButtonProps {
  /** Show animation ring when recording */
  showRing?: boolean;
  /** Ring color */
  ringColor?: string;
}

/**
 * Animated voice recorder button with visual feedback
 */
export const AnimatedVoiceRecorderButton = memo(
  function AnimatedVoiceRecorderButton({
    isRecording = false,
    showRing = true,
    ringColor,
    className,
    ...props
  }: AnimatedVoiceRecorderButtonProps) {
    return (
      <div className="relative inline-flex">
        {/* Animated ring */}
        <AnimatePresence>
          {isRecording && showRing && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                backgroundColor: ringColor || "hsl(var(--destructive))",
              }}
            />
          )}
        </AnimatePresence>

        <VoiceRecorderButton
          isRecording={isRecording}
          className={cn("relative z-10", className)}
          pulseWhenRecording={false}
          {...props}
        />
      </div>
    );
  },
);

// ============================================================================
// FLOATING ACTION BUTTON VARIANT
// ============================================================================

export interface FloatingVoiceButtonProps extends VoiceRecorderButtonProps {
  /** Position on screen */
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  /** Offset from edge */
  offset?: number;
}

/**
 * Floating voice recorder button (FAB style)
 */
export const FloatingVoiceButton = memo(function FloatingVoiceButton({
  position = "bottom-right",
  offset = 16,
  className,
  ...props
}: FloatingVoiceButtonProps) {
  const positionClasses = {
    "bottom-right": "bottom-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      className={cn("fixed z-50", positionClasses[position])}
      style={{
        margin: offset,
      }}
    >
      <AnimatedVoiceRecorderButton
        size="lg"
        className={cn("h-14 w-14 rounded-full shadow-lg", className)}
        {...props}
      />
    </div>
  );
});

export default VoiceRecorderButton;
