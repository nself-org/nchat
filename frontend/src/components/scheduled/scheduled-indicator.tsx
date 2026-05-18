/* eslint-disable react-hooks/rules-of-hooks */
"use client";

/**
 * Scheduled Indicator Component
 *
 * Shows in the message input area when a message is set to be scheduled.
 * Displays the scheduled time and allows clicking to change the schedule.
 *
 * @example
 * ```tsx
 * <ScheduledIndicator
 *   scheduledAt={scheduledDate}
 *   timezone={timezone}
 *   onClick={openScheduleModal}
 *   onClear={clearSchedule}
 * />
 * ```
 */

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarClock, X, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isScheduledInPast } from "@/lib/scheduled/scheduled-store";

// ============================================================================
// Types
// ============================================================================

interface ScheduledIndicatorProps {
  scheduledAt: Date | null;
  timezone?: string;
  onClick?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatScheduledTime(date: Date, timezone?: string): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) {
    return "Past due";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  }

  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }

  if (diffDays < 7) {
    return `in ${diffDays}d`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================================
// Component
// ============================================================================

export function ScheduledIndicator({
  scheduledAt,
  timezone,
  onClick,
  onClear,
  disabled = false,
  variant = "default",
  className,
}: ScheduledIndicatorProps) {
  // Don't render if no scheduled time
  if (!scheduledAt) {
    return null;
  }

  const isPast = useMemo(() => isScheduledInPast(scheduledAt), [scheduledAt]);
  const formattedTime = useMemo(
    () => formatScheduledTime(scheduledAt, timezone),
    [scheduledAt, timezone],
  );
  const relativeTime = useMemo(
    () => formatRelativeTime(scheduledAt),
    [scheduledAt],
  );

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!disabled && onClear) {
        onClear();
      }
    },
    [disabled, onClear],
  );

  // Compact variant - just a badge
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isPast ? "destructive" : "secondary"}
              className={cn(
                "cursor-pointer gap-1",
                disabled && "cursor-default opacity-50",
                className,
              )}
              onClick={handleClick}
            >
              {isPast ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {relativeTime}
              {onClear && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:bg-secondary-foreground/20 ml-1 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Scheduled for:</p>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline variant - minimal styling
  if (variant === "inline") {
    const isInteractive = onClick && !disabled;
    const inlineContent = (
      <>
        {isPast ? (
          <AlertTriangle className="h-3.5 w-3.5" />
        ) : (
          <CalendarClock className="h-3.5 w-3.5" />
        )}
        <span>{relativeTime}</span>
        {onClear && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </>
    );

    if (isInteractive) {
      return (
        <span
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 text-sm hover:text-foreground",
            isPast ? "text-destructive" : "text-muted-foreground",
            className,
          )}
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          {inlineContent}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm",
          isPast ? "text-destructive" : "text-muted-foreground",
          disabled && "opacity-50",
          className,
        )}
      >
        {inlineContent}
      </span>
    );
  }

  // Default variant - full indicator bar
  const isDefaultInteractive = onClick && !disabled;
  const defaultContent = (
    <>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full",
          isPast
            ? "bg-destructive/20 text-destructive"
            : "bg-primary/20 text-primary",
        )}
      >
        {isPast ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CalendarClock className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", isPast && "text-destructive")}>
          {isPast ? "Schedule expired" : "Scheduled to send"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formattedTime}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={isPast ? "destructive" : "secondary"}>
          {relativeTime}
        </Badge>
        {onClear && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  );

  if (isDefaultInteractive) {
    return (
      <div
        className={cn(
          "hover:bg-primary/10 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
          isPast
            ? "bg-destructive/10 border-destructive/30"
            : "bg-primary/5 border-primary/20",
          className,
        )}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {defaultContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2",
        isPast
          ? "bg-destructive/10 border-destructive/30"
          : "bg-primary/5 border-primary/20",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {defaultContent}
    </div>
  );
}

// ============================================================================
// Schedule Button Component
// ============================================================================

interface ScheduleButtonProps {
  hasSchedule?: boolean;
  scheduledAt?: Date | null;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A button to toggle/open the schedule modal
 * Shows different states based on whether a schedule is set
 */
export function ScheduleButton({
  hasSchedule = false,
  scheduledAt,
  onClick,
  disabled = false,
  className,
}: ScheduleButtonProps) {
  const relativeTime = useMemo(
    () => (scheduledAt ? formatRelativeTime(scheduledAt) : null),
    [scheduledAt],
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={hasSchedule ? "secondary" : "ghost"}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={cn(hasSchedule && "text-primary", className)}
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasSchedule && relativeTime ? (
            <p>
              Scheduled {relativeTime}
              <br />
              <span className="text-xs text-muted-foreground">
                Click to change
              </span>
            </p>
          ) : (
            <p>Schedule message</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Pending Count Badge Component
// ============================================================================

interface ScheduledCountBadgeProps {
  count: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Shows the count of pending scheduled messages
 * Useful for navigation items or headers
 */
export function ScheduledCountBadge({
  count,
  onClick,
  className,
}: ScheduledCountBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1",
        onClick && "hover:bg-secondary/80 cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <CalendarClock className="h-3 w-3" />
      {count}
    </Badge>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ScheduledIndicator;
