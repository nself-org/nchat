"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCountdown, DisappearingMessageData } from "@/lib/disappearing";

interface DisappearingCountdownProps {
  /** Message disappearing data */
  disappearing: DisappearingMessageData;
  /** Callback when countdown reaches zero */
  onExpired?: () => void;
  /** Seconds threshold to show warning state */
  warningThreshold?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Display variant */
  variant?: "text" | "badge" | "pill" | "minimal";
  /** Additional class names */
  className?: string;
}

/**
 * Countdown timer showing time remaining until message disappears.
 */
export function DisappearingCountdown({
  disappearing,
  onExpired,
  warningThreshold = 60,
  showProgress = false,
  size = "sm",
  variant = "text",
  className,
}: DisappearingCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    calculateRemaining(disappearing),
  );

  // Calculate initial duration for progress
  const totalDuration = disappearing.timerDuration || 0;

  useEffect(() => {
    if (!disappearing.expiresAt) return;

    const interval = setInterval(() => {
      const remaining = calculateRemaining(disappearing);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [disappearing, onExpired]);

  // Don't render if no expiration or already expired
  if (!disappearing.expiresAt || remainingSeconds < 0) {
    return null;
  }

  const isWarning =
    remainingSeconds <= warningThreshold && remainingSeconds > 0;
  const isUrgent = remainingSeconds <= 10 && remainingSeconds > 0;
  const progress =
    totalDuration > 0
      ? ((totalDuration - remainingSeconds) / totalDuration) * 100
      : 0;

  const formattedTime = formatCountdown(remainingSeconds);

  if (variant === "minimal") {
    return (
      <span
        className={cn(
          "text-xs text-muted-foreground",
          isWarning && "text-amber-500",
          isUrgent && "animate-pulse text-red-500",
          className,
        )}
      >
        {formattedTime}
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
          "text-xs font-medium transition-colors",
          !isWarning && !isUrgent && "bg-muted text-muted-foreground",
          isWarning && !isUrgent && "bg-amber-500/10 text-amber-500",
          isUrgent && "animate-pulse bg-red-500/10 text-red-500",
          className,
        )}
      >
        <Clock size={10} />
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md p-2",
          "border text-sm transition-colors",
          !isWarning && !isUrgent && "bg-muted/50 border-muted",
          isWarning &&
            !isUrgent &&
            "border-amber-500/20 bg-amber-500/10 text-amber-600",
          isUrgent && "border-red-500/20 bg-red-500/10 text-red-600",
          className,
        )}
      >
        {isWarning ? (
          <AlertTriangle
            size={16}
            className={isUrgent ? "animate-bounce" : ""}
          />
        ) : (
          <Clock size={16} />
        )}
        <div className="flex flex-col">
          <span className="font-medium">
            {isUrgent ? "Expiring soon" : "Time remaining"}
          </span>
          <span
            className={cn("text-xs", !isWarning && "text-muted-foreground")}
          >
            {formattedTime}
          </span>
        </div>
        {showProgress && (
          <Progress
            value={progress}
            className={cn(
              "h-1.5 w-16",
              isWarning && "[&>div]:bg-amber-500",
              isUrgent && "[&>div]:bg-red-500",
            )}
          />
        )}
      </div>
    );
  }

  // Default text variant
  const textSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Clock
        size={iconSize}
        className={cn(
          "text-muted-foreground",
          isWarning && "text-amber-500",
          isUrgent && "animate-pulse text-red-500",
        )}
      />
      <span
        className={cn(
          textSize,
          "text-muted-foreground transition-colors",
          isWarning && "font-medium text-amber-500",
          isUrgent && "animate-pulse font-medium text-red-500",
        )}
      >
        {formattedTime}
      </span>
      {showProgress && (
        <Progress
          value={progress}
          className={cn(
            "h-1 w-12",
            isWarning && "[&>div]:bg-amber-500",
            isUrgent && "[&>div]:bg-red-500",
          )}
        />
      )}
    </div>
  );
}

/**
 * Calculate remaining seconds from disappearing data.
 */
function calculateRemaining(disappearing: DisappearingMessageData): number {
  if (!disappearing.expiresAt) return -1;
  const remaining = Math.floor(
    (new Date(disappearing.expiresAt).getTime() - Date.now()) / 1000,
  );
  return Math.max(-1, remaining);
}

/**
 * Burn countdown - shows countdown during burn after reading.
 */
export function BurnCountdown({
  seconds,
  onComplete,
  className,
}: {
  seconds: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onComplete?.();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * 100;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md p-2",
        "border border-red-500/20 bg-red-500/10 text-red-600",
        className,
      )}
    >
      <div className="relative">
        <div
          className="h-8 w-8 rounded-full border-2 border-red-500/30"
          style={{
            background: `conic-gradient(rgb(239 68 68) ${progress}%, transparent ${progress}%)`,
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
          {remaining}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">Burning...</span>
        <span className="text-xs text-red-500/70">Message will disappear</span>
      </div>
    </div>
  );
}

/**
 * Circular countdown for view-once viewing.
 */
export function CircularCountdown({
  seconds,
  onComplete,
  size = "md",
  className,
}: {
  seconds: number;
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onComplete?.();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, onComplete]);

  const progress = ((seconds - remaining) / seconds) * 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - progress / 100);

  const dimensions =
    size === "sm" ? "w-12 h-12" : size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className={cn("relative", dimensions, className)}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-1000 ease-linear"
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-bold",
          textSize,
        )}
      >
        {remaining}
      </span>
    </div>
  );
}

export default DisappearingCountdown;
