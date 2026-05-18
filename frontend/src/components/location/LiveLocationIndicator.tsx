"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatRemainingTime } from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LiveLocationIndicatorProps {
  /** When the sharing started */
  startedAt: Date;
  /** When the sharing will expire */
  expiresAt: Date;
  /** Duration in minutes */
  duration: number;
  /** Whether sharing is currently active */
  isActive?: boolean;
  /** Size of the indicator */
  size?: "sm" | "md" | "lg";
  /** Whether to show the countdown */
  showCountdown?: boolean;
  /** Whether to show pulse animation */
  showPulse?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Live Location Indicator Component
// ============================================================================

/**
 * Live Location Indicator
 *
 * Displays a pulsing indicator for active live location sharing,
 * with optional countdown timer.
 */
export function LiveLocationIndicator({
  startedAt,
  expiresAt,
  duration,
  isActive = true,
  size = "md",
  showCountdown = true,
  showPulse = true,
  className,
}: LiveLocationIndicatorProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!isActive) {
      setRemainingTime(0);
      setProgress(0);
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const start = new Date(startedAt).getTime();
      const end = new Date(expiresAt).getTime();
      const total = end - start;
      const remaining = Math.max(0, end - now);

      setRemainingTime(remaining);
      setProgress((remaining / total) * 100);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [startedAt, expiresAt, isActive]);

  const sizeConfig = {
    sm: {
      container: "gap-1.5",
      dot: "h-2 w-2",
      pulse: "h-4 w-4 -top-1 -left-1",
      text: "text-xs",
    },
    md: {
      container: "gap-2",
      dot: "h-2.5 w-2.5",
      pulse: "h-5 w-5 -top-1.5 -left-1.5",
      text: "text-sm",
    },
    lg: {
      container: "gap-2.5",
      dot: "h-3 w-3",
      pulse: "h-6 w-6 -top-1.5 -left-1.5",
      text: "text-base",
    },
  };

  const config = sizeConfig[size];

  if (!isActive) {
    return (
      <div className={cn("flex items-center", config.container, className)}>
        <div
          className={cn("bg-muted-foreground/30 rounded-full", config.dot)}
        />
        <span className={cn("text-muted-foreground", config.text)}>
          Location sharing ended
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", config.container, className)}>
      {/* Pulsing dot */}
      <div className="relative">
        {showPulse && (
          <div
            className={cn(
              "absolute animate-ping rounded-full bg-green-500/40",
              config.pulse,
            )}
          />
        )}
        <div className={cn("rounded-full bg-green-500", config.dot)} />
      </div>

      {/* Countdown text */}
      {showCountdown && (
        <span
          className={cn(
            "font-medium text-green-600 dark:text-green-400",
            config.text,
          )}
        >
          {formatRemainingTime(remainingTime)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Live Badge Component
// ============================================================================

interface LiveBadgeProps {
  /** Whether currently live */
  isLive?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Custom class name */
  className?: string;
}

/**
 * Simple "LIVE" badge for location sharing.
 */
export function LiveBadge({
  isLive = true,
  size = "md",
  className,
}: LiveBadgeProps) {
  if (!isLive) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-red-500 font-semibold text-white",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      LIVE
    </div>
  );
}

// ============================================================================
// Progress Ring Component
// ============================================================================

interface ProgressRingProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Size of the ring */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Ring color */
  color?: string;
  /** Background color */
  bgColor?: string;
  /** Children to render in center */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Circular progress ring for showing time remaining.
 */
export function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  color = "rgb(34, 197, 94)",
  bgColor = "rgba(34, 197, 94, 0.2)",
  children,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Live Location Timer Component
// ============================================================================

interface LiveLocationTimerProps {
  /** When sharing started */
  startedAt: Date;
  /** When sharing expires */
  expiresAt: Date;
  /** Size of the timer */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

/**
 * Timer with circular progress for live location.
 */
export function LiveLocationTimer({
  startedAt,
  expiresAt,
  size = "md",
  className,
}: LiveLocationTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const start = new Date(startedAt).getTime();
      const end = new Date(expiresAt).getTime();
      const total = end - start;
      const remaining = Math.max(0, end - now);

      setRemainingTime(remaining);
      setProgress((remaining / total) * 100);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [startedAt, expiresAt]);

  const sizeConfig = {
    sm: { ring: 32, text: "text-[10px]" },
    md: { ring: 44, text: "text-xs" },
    lg: { ring: 60, text: "text-sm" },
  };

  const config = sizeConfig[size];

  // Format remaining time for display in ring
  const formatTimeShort = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  return (
    <ProgressRing progress={progress} size={config.ring} className={className}>
      <span className={cn("font-medium text-green-600", config.text)}>
        {formatTimeShort(remainingTime)}
      </span>
    </ProgressRing>
  );
}

export default LiveLocationIndicator;
