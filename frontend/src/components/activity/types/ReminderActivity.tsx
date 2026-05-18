"use client";

/**
 * ReminderActivity Component
 *
 * Displays a reminder due activity
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityDate } from "../ActivityDate";
import { ActivityIcon } from "../ActivityIcon";
import type { ReminderDueActivity } from "@/lib/activity/activity-types";

interface ReminderActivityProps {
  activity: ReminderDueActivity;
  onClick?: () => void;
  className?: string;
}

export function ReminderActivity({
  activity,
  onClick,
  className,
}: ReminderActivityProps) {
  const { reminderText, message, channel, isRead, createdAt } = activity;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && "bg-amber-50 dark:bg-amber-950/30",
        className,
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber-500" />
      )}

      {/* Icon */}
      <ActivityIcon type="reminder_due" size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "text-sm font-medium",
                  !isRead && "text-amber-700 dark:text-amber-300",
                )}
              >
                Reminder
              </p>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Due now
              </span>
            </div>

            {/* Reminder text */}
            <p className="mt-1 text-sm">{reminderText}</p>

            {/* Related message if available */}
            {message && (
              <div className="mt-2 rounded-md border-l-2 border-amber-300 bg-background p-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {message.contentPreview || message.content}
                </p>
              </div>
            )}

            {/* Channel context if available */}
            {channel && (
              <p className="mt-1 text-xs text-muted-foreground">
                from <span className="font-medium">#{channel.name}</span>
              </p>
            )}

            {/* Action buttons */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle mark complete
                }}
                className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
              >
                Mark complete
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle snooze
                }}
                className="hover:bg-muted/80 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground transition-colors"
              >
                Snooze
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default ReminderActivity;
