"use client";

/**
 * UnreadActivities Component
 *
 * Shows unread activity count indicator
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { UnreadActivitiesProps } from "@/lib/activity/activity-types";

// Bell icon component
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function UnreadActivities({
  count,
  onClick,
  className,
  showBadge = true,
  animate = true,
}: UnreadActivitiesProps) {
  const hasUnread = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md p-2 transition-colors",
        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={
        hasUnread
          ? `${count} unread ${count === 1 ? "activity" : "activities"}`
          : "No unread activities"
      }
    >
      <BellIcon
        className={cn("h-5 w-5", hasUnread && animate && "animate-pulse")}
      />

      {showBadge && hasUnread && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex items-center justify-center",
            "h-[18px] min-w-[18px] rounded-full px-1",
            "text-primary-foreground bg-primary text-xs font-medium",
            animate && "animate-bounce",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/**
 * Inline unread indicator for lists
 */
export function UnreadIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-2 w-2 shrink-0 rounded-full bg-primary", className)}
      aria-label="Unread"
    />
  );
}

/**
 * Banner showing unread count with mark all as read
 */
export function UnreadBanner({
  count,
  onMarkAllAsRead,
  className,
}: {
  count: number;
  onMarkAllAsRead?: () => void;
  className?: string;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-primary/10 border-primary/20 flex items-center justify-between border-b px-4 py-2",
        className,
      )}
    >
      <p className="text-sm font-medium text-primary">
        {count} unread {count === 1 ? "activity" : "activities"}
      </p>
      {onMarkAllAsRead && (
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="text-sm text-primary hover:underline"
        >
          Mark all as read
        </button>
      )}
    </div>
  );
}

export default UnreadActivities;
