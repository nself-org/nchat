"use client";

import { useState, memo, useCallback } from "react";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
} from "date-fns";
import { Clock, Calendar, Copy, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface MessageTimestampProps {
  /** The timestamp to display */
  timestamp: Date | string | number;
  /** Display format variant */
  variant?: "relative" | "time" | "full" | "smart";
  /** Whether to show full datetime on click */
  expandable?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Size variant */
  size?: "xs" | "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

export interface TimestampDisplayProps {
  /** The timestamp to display */
  timestamp: Date;
  /** Display format */
  format: "relative" | "time" | "date" | "datetime" | "full";
}

// ============================================================================
// Format Utilities
// ============================================================================

/**
 * Format timestamp based on how recent it is (smart formatting)
 */
function formatSmartTime(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }

  if (isThisWeek(date)) {
    return `${format(date, "EEEE")} at ${format(date, "h:mm a")}`;
  }

  if (isThisYear(date)) {
    return `${format(date, "MMM d")} at ${format(date, "h:mm a")}`;
  }

  return `${format(date, "MMM d, yyyy")} at ${format(date, "h:mm a")}`;
}

/**
 * Format timestamp as relative time
 */
function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Format full datetime for display
 */
function formatFullDatetime(date: Date): string {
  return (
    format(date, "EEEE, MMMM d, yyyy") + " at " + format(date, "h:mm:ss a")
  );
}

/**
 * Format for copying
 */
function formatForCopy(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Timestamp popover with full datetime info
 */
const TimestampPopover = memo(function TimestampPopover({
  timestamp,
  children,
}: {
  timestamp: Date;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatForCopy(timestamp));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [timestamp]);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-3">
        <div className="space-y-3">
          {/* Full datetime */}
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(timestamp, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(timestamp, "h:mm:ss a")}
              </p>
            </div>
          </div>

          {/* Relative time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatRelative(timestamp)}</span>
          </div>

          {/* Copy button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy timestamp
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Message Timestamp Component
 *
 * Displays a message timestamp with multiple format options:
 * - relative: "5 minutes ago"
 * - time: "2:30 PM"
 * - full: "January 15, 2024 at 2:30 PM"
 * - smart: Adapts based on how recent (default)
 *
 * Features:
 * - Hover tooltip shows exact time
 * - Click to see full datetime details
 * - Copy timestamp functionality
 */
export const MessageTimestamp = memo(function MessageTimestamp({
  timestamp,
  variant = "smart",
  expandable = true,
  showTooltip = true,
  size = "default",
  className,
}: MessageTimestampProps) {
  const date = new Date(timestamp);

  // Get the display text based on variant
  const getDisplayText = () => {
    switch (variant) {
      case "relative":
        return formatRelative(date);
      case "time":
        return format(date, "h:mm a");
      case "full":
        return formatFullDatetime(date);
      case "smart":
      default:
        return formatSmartTime(date);
    }
  };

  const displayText = getDisplayText();
  const fullDatetime = formatFullDatetime(date);

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    default: "text-sm",
  };

  const timestampElement = (
    <time
      dateTime={date.toISOString()}
      className={cn(
        "text-muted-foreground",
        expandable && "cursor-pointer hover:text-foreground hover:underline",
        sizeClasses[size],
        className,
      )}
    >
      {displayText}
    </time>
  );

  // If expandable, wrap in popover
  if (expandable) {
    return (
      <TimestampPopover timestamp={date}>
        {showTooltip ? (
          <TooltipProvider>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>{timestampElement}</TooltipTrigger>
              <TooltipContent side="top">
                <p>{fullDatetime}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          timestampElement
        )}
      </TimestampPopover>
    );
  }

  // Just tooltip
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>{timestampElement}</TooltipTrigger>
          <TooltipContent side="top">
            <p>{fullDatetime}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return timestampElement;
});

// ============================================================================
// Variants
// ============================================================================

/**
 * Compact timestamp for grouped messages
 */
export const CompactTimestamp = memo(function CompactTimestamp({
  timestamp,
  className,
}: {
  timestamp: Date | string | number;
  className?: string;
}) {
  const date = new Date(timestamp);

  return (
    <MessageTimestamp
      timestamp={date}
      variant="time"
      expandable={false}
      showTooltip={true}
      size="xs"
      className={className}
    />
  );
});

/**
 * Relative timestamp with auto-update
 */
export const RelativeTimestamp = memo(function RelativeTimestamp({
  timestamp,
  className,
}: {
  timestamp: Date | string | number;
  className?: string;
}) {
  return (
    <MessageTimestamp
      timestamp={timestamp}
      variant="relative"
      expandable={true}
      size="sm"
      className={className}
    />
  );
});

/**
 * Date separator timestamp
 */
export const DateSeparatorTimestamp = memo(function DateSeparatorTimestamp({
  timestamp,
  className,
}: {
  timestamp: Date | string | number;
  className?: string;
}) {
  const date = new Date(timestamp);

  let displayText: string;
  if (isToday(date)) {
    displayText = "Today";
  } else if (isYesterday(date)) {
    displayText = "Yesterday";
  } else if (isThisYear(date)) {
    displayText = format(date, "EEEE, MMMM d");
  } else {
    displayText = format(date, "EEEE, MMMM d, yyyy");
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <time
            dateTime={date.toISOString()}
            className={cn(
              "text-xs font-medium text-muted-foreground",
              className,
            )}
          >
            {displayText}
          </time>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{formatFullDatetime(date)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default MessageTimestamp;
