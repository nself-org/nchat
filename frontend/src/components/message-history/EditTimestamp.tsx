"use client";

import { Clock, Calendar } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatMessageTime,
  formatMessageTimeTooltip,
  formatRelativeTime,
  formatRelativeTimeShort,
} from "@/lib/date";

export interface EditTimestampProps {
  /** The timestamp to display */
  timestamp: Date;
  /** Format style */
  format?: "relative" | "absolute" | "short";
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Icon to show (defaults to Clock) */
  icon?: "clock" | "calendar";
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md";
}

/**
 * Displays a timestamp for when an edit was made.
 * Shows relative time by default with full date on hover.
 */
export function EditTimestamp({
  timestamp,
  format = "relative",
  showIcon = false,
  icon = "clock",
  className,
  size = "sm",
}: EditTimestampProps) {
  const getFormattedTime = () => {
    switch (format) {
      case "relative":
        return formatRelativeTime(timestamp);
      case "short":
        return formatRelativeTimeShort(timestamp);
      case "absolute":
        return formatMessageTime(timestamp);
      default:
        return formatRelativeTime(timestamp);
    }
  };

  const fullDateTime = formatMessageTimeTooltip(timestamp);

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  const Icon = icon === "calendar" ? Calendar : Clock;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground",
              sizeClasses[size],
              className,
            )}
          >
            {showIcon && <Icon className={iconSizes[size]} />}
            <span>{getFormattedTime()}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{fullDateTime}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Displays a time range between two timestamps.
 */
export interface TimeRangeProps {
  /** Start timestamp */
  from: Date;
  /** End timestamp */
  to: Date;
  /** Whether to show icons */
  showIcons?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function TimeRange({
  from,
  to,
  showIcons = false,
  className,
}: TimeRangeProps) {
  const duration = to.getTime() - from.getTime();
  const durationText = formatDuration(duration);

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <EditTimestamp timestamp={from} showIcon={showIcons} format="absolute" />
      <span className="text-muted-foreground/50">-</span>
      <EditTimestamp timestamp={to} showIcon={showIcons} format="absolute" />
      <span className="text-xs">({durationText})</span>
    </div>
  );
}

/**
 * Format a duration in milliseconds to human-readable string.
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (seconds > 0) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  return "just now";
}

/**
 * Version timestamp with version number.
 */
export interface VersionTimestampProps {
  /** Version number */
  versionNumber: number;
  /** When the version was created */
  createdAt: Date;
  /** Whether this is the original version */
  isOriginal?: boolean;
  /** Whether this is the current version */
  isCurrent?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function VersionTimestamp({
  versionNumber,
  createdAt,
  isOriginal = false,
  isCurrent = false,
  className,
}: VersionTimestampProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="font-medium text-foreground">
        Version {versionNumber}
        {isOriginal && (
          <span className="ml-1 text-xs text-muted-foreground">(original)</span>
        )}
        {isCurrent && (
          <span className="ml-1 text-xs text-primary">(current)</span>
        )}
      </span>
      <span className="text-muted-foreground">-</span>
      <EditTimestamp timestamp={createdAt} format="relative" />
    </div>
  );
}

/**
 * Edit timing information showing time since original.
 */
export interface EditTimingProps {
  /** Original creation time */
  originalAt: Date;
  /** Edit time */
  editedAt: Date;
  /** Additional CSS classes */
  className?: string;
}

export function EditTiming({
  originalAt,
  editedAt,
  className,
}: EditTimingProps) {
  const timeSinceOriginal = editedAt.getTime() - originalAt.getTime();
  const timingText = formatDuration(timeSinceOriginal);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-xs text-muted-foreground", className)}>
            {timingText} after original
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div>
              <span className="text-muted-foreground">Original: </span>
              <span>{formatMessageTimeTooltip(originalAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Edited: </span>
              <span>{formatMessageTimeTooltip(editedAt)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
