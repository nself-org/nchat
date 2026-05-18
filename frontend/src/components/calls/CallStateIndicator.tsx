/**
 * CallStateIndicator Component
 *
 * Displays current call state with visual indicator and duration.
 */

"use client";

import { CallState } from "@/lib/calls";
import { cn } from "@/lib/utils";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Loader2,
  PauseCircle,
  ArrowRightLeft,
  PhoneOff,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface CallStateIndicatorProps {
  state: CallState;
  duration?: number;
  displayName?: string;
  className?: string;
  showIcon?: boolean;
  showDuration?: boolean;
  size?: "sm" | "md" | "lg";
}

// =============================================================================
// Component
// =============================================================================

export function CallStateIndicator({
  state,
  duration,
  displayName,
  className,
  showIcon = true,
  showDuration = true,
  size = "md",
}: CallStateIndicatorProps) {
  const config = getStateConfig(state);

  const sizeClasses = {
    sm: {
      container: "text-xs",
      icon: "h-3 w-3",
      dot: "h-1.5 w-1.5",
    },
    md: {
      container: "text-sm",
      icon: "h-4 w-4",
      dot: "h-2 w-2",
    },
    lg: {
      container: "text-base",
      icon: "h-5 w-5",
      dot: "h-2.5 w-2.5",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        sizes.container,
        className,
      )}
    >
      {/* State icon or dot */}
      {showIcon && config.icon ? (
        <config.icon
          className={cn(
            sizes.icon,
            config.iconClassName,
            config.animated && "animate-spin",
          )}
        />
      ) : (
        <span
          className={cn(
            "rounded-full",
            sizes.dot,
            config.dotClassName,
            config.animated && "animate-pulse",
          )}
        />
      )}

      {/* State label */}
      <span className={cn("font-medium", config.textClassName)}>
        {displayName || config.label}
      </span>

      {/* Duration */}
      {showDuration && duration !== undefined && duration > 0 && (
        <span className="text-muted-foreground">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// State Configuration
// =============================================================================

interface StateConfig {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  dotClassName?: string;
  textClassName?: string;
  animated?: boolean;
}

function getStateConfig(state: CallState): StateConfig {
  const configs: Record<CallState, StateConfig> = {
    idle: {
      label: "Idle",
      dotClassName: "bg-gray-400",
      textClassName: "text-muted-foreground",
    },
    initiating: {
      label: "Starting call...",
      icon: Loader2,
      iconClassName: "text-blue-600",
      dotClassName: "bg-blue-600",
      textClassName: "text-blue-600",
      animated: true,
    },
    ringing: {
      label: "Ringing...",
      icon: PhoneOutgoing,
      iconClassName: "text-blue-600",
      dotClassName: "bg-blue-600",
      textClassName: "text-blue-600",
      animated: true,
    },
    connecting: {
      label: "Connecting...",
      icon: Loader2,
      iconClassName: "text-yellow-600",
      dotClassName: "bg-yellow-600",
      textClassName: "text-yellow-600",
      animated: true,
    },
    connected: {
      label: "Connected",
      icon: Phone,
      iconClassName: "text-green-600",
      dotClassName: "bg-green-600",
      textClassName: "text-green-600",
    },
    reconnecting: {
      label: "Reconnecting...",
      icon: Loader2,
      iconClassName: "text-orange-600",
      dotClassName: "bg-orange-600",
      textClassName: "text-orange-600",
      animated: true,
    },
    held: {
      label: "On Hold",
      icon: PauseCircle,
      iconClassName: "text-yellow-600",
      dotClassName: "bg-yellow-600",
      textClassName: "text-yellow-600",
    },
    transferring: {
      label: "Transferring...",
      icon: ArrowRightLeft,
      iconClassName: "text-blue-600",
      dotClassName: "bg-blue-600",
      textClassName: "text-blue-600",
      animated: true,
    },
    ending: {
      label: "Ending call...",
      icon: PhoneOff,
      iconClassName: "text-red-600",
      dotClassName: "bg-red-600",
      textClassName: "text-red-600",
    },
    ended: {
      label: "Ended",
      icon: PhoneOff,
      iconClassName: "text-gray-600",
      dotClassName: "bg-gray-600",
      textClassName: "text-muted-foreground",
    },
  };

  return configs[state];
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
