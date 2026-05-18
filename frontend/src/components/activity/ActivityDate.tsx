"use client";

/**
 * ActivityDate Component
 *
 * Displays formatted date/time for an activity
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  formatRelativeTimeShort,
  formatMessageTime,
  formatMessageTimeTooltip,
} from "@/lib/date";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivityDateProps } from "@/lib/activity/activity-types";

export function ActivityDate({
  date,
  className,
  format = "smart",
}: ActivityDateProps) {
  const [formattedDate, setFormattedDate] = React.useState<string>("");
  const [tooltipDate, setTooltipDate] = React.useState<string>("");

  React.useEffect(() => {
    // Format based on format type
    let formatted: string;
    switch (format) {
      case "relative":
        formatted = formatRelativeTime(date);
        break;
      case "absolute":
        formatted = formatMessageTime(date);
        break;
      case "smart":
      default:
        // Use short relative for recent, absolute for older
        const diffMs = Date.now() - new Date(date).getTime();
        const hourMs = 60 * 60 * 1000;
        const dayMs = 24 * hourMs;

        if (diffMs < 24 * hourMs) {
          formatted = formatRelativeTimeShort(date);
        } else if (diffMs < 7 * dayMs) {
          formatted = formatRelativeTime(date);
        } else {
          formatted = formatMessageTime(date);
        }
        break;
    }

    setFormattedDate(formatted);
    setTooltipDate(formatMessageTimeTooltip(date));

    // Update relative times periodically
    if (format === "relative" || format === "smart") {
      const interval = setInterval(() => {
        const diffMs = Date.now() - new Date(date).getTime();

        if (diffMs < 60 * 1000) {
          // Update every second for "just now"
          setFormattedDate(formatRelativeTimeShort(date));
        } else if (diffMs < 60 * 60 * 1000) {
          // Update every minute for "X minutes ago"
          setFormattedDate(
            format === "smart"
              ? formatRelativeTimeShort(date)
              : formatRelativeTime(date),
          );
        }
      }, 60 * 1000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [date, format]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time
            dateTime={date}
            className={cn(
              "whitespace-nowrap text-xs text-muted-foreground",
              className,
            )}
          >
            {formattedDate}
          </time>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipDate}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Date separator for grouping activities
 */
export function ActivityDateSeparator({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default ActivityDate;
