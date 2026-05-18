"use client";

import { Clock, Eye, Flame } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DisappearingMessageType,
  formatDuration,
  DISAPPEARING_TYPE_LABELS,
} from "@/lib/disappearing";

interface DisappearingIndicatorProps {
  /** Type of disappearing message */
  type: DisappearingMessageType;
  /** Timer duration in seconds (for regular type) */
  duration?: number;
  /** Burn timer in seconds (for burn_after_reading type) */
  burnTimer?: number;
  /** Whether message has been viewed (for view_once) */
  hasBeenViewed?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show label text */
  showLabel?: boolean;
  /** Position relative to message */
  position?: "inline" | "corner";
  /** Additional class names */
  className?: string;
}

/**
 * Indicator showing that a message will disappear.
 */
export function DisappearingIndicator({
  type,
  duration,
  burnTimer,
  hasBeenViewed,
  size = "sm",
  showLabel = false,
  position = "inline",
  className,
}: DisappearingIndicatorProps) {
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const textSize =
    size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";

  const Icon = getIcon(type);
  const label = getLabel(type, duration, burnTimer, hasBeenViewed);
  const tooltipText = getTooltipText(type, duration, burnTimer, hasBeenViewed);
  const colorClass = getColorClass(type, hasBeenViewed);

  if (position === "corner") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute right-1 top-1 rounded-full p-0.5",
                "bg-background/80 backdrop-blur-sm",
                colorClass,
                className,
              )}
            >
              <Icon size={iconSize} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1",
              colorClass,
              className,
            )}
          >
            <Icon size={iconSize} />
            {showLabel && (
              <span className={cn(textSize, "whitespace-nowrap")}>{label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Get icon component for message type.
 */
function getIcon(type: DisappearingMessageType) {
  switch (type) {
    case "view_once":
      return Eye;
    case "burn_after_reading":
      return Flame;
    default:
      return Clock;
  }
}

/**
 * Get label text for indicator.
 */
function getLabel(
  type: DisappearingMessageType,
  duration?: number,
  burnTimer?: number,
  hasBeenViewed?: boolean,
): string {
  switch (type) {
    case "view_once":
      return hasBeenViewed ? "Viewed" : "View once";
    case "burn_after_reading":
      return burnTimer ? `${burnTimer}s after read` : "Burn after read";
    default:
      return duration ? formatDuration(duration) : "Auto-delete";
  }
}

/**
 * Get tooltip text for indicator.
 */
function getTooltipText(
  type: DisappearingMessageType,
  duration?: number,
  burnTimer?: number,
  hasBeenViewed?: boolean,
): string {
  switch (type) {
    case "view_once":
      return hasBeenViewed
        ? "This message was viewed and is no longer available"
        : "This message will disappear after you view it";
    case "burn_after_reading":
      return burnTimer
        ? `This message will disappear ${burnTimer} seconds after reading`
        : "This message will disappear shortly after reading";
    default:
      return duration
        ? `This message will disappear after ${formatDuration(duration)}`
        : "This message will automatically disappear";
  }
}

/**
 * Get color class for indicator.
 */
function getColorClass(
  type: DisappearingMessageType,
  hasBeenViewed?: boolean,
): string {
  switch (type) {
    case "view_once":
      return hasBeenViewed
        ? "text-muted-foreground"
        : "text-amber-500 dark:text-amber-400";
    case "burn_after_reading":
      return "text-red-500 dark:text-red-400";
    default:
      return "text-blue-500 dark:text-blue-400";
  }
}

/**
 * Compact indicator for message list.
 */
export function DisappearingIndicatorCompact({
  type,
  className,
}: Pick<DisappearingIndicatorProps, "type" | "className">) {
  const Icon = getIcon(type);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "h-4 w-4 rounded-full",
        type === "view_once" && "bg-amber-500/10 text-amber-500",
        type === "burn_after_reading" && "bg-red-500/10 text-red-500",
        type === "regular" && "bg-blue-500/10 text-blue-500",
        className,
      )}
    >
      <Icon size={10} />
    </span>
  );
}

/**
 * Badge indicator for channel header.
 */
export function DisappearingBadge({
  duration,
  className,
}: {
  duration: number;
  className?: string;
}) {
  if (duration === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "bg-primary/10 text-xs font-medium text-primary",
        className,
      )}
    >
      <Clock size={12} />
      <span>{formatDuration(duration)}</span>
    </div>
  );
}

export default DisappearingIndicator;
