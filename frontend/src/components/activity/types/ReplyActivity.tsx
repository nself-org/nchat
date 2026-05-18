"use client";

/**
 * ReplyActivity Component
 *
 * Displays a reply activity (reply to user's message)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import type { ReplyActivity as ReplyActivityType } from "@/lib/activity/activity-types";

interface ReplyActivityProps {
  activity: ReplyActivityType;
  onClick?: () => void;
  className?: string;
}

export function ReplyActivity({
  activity,
  onClick,
  className,
}: ReplyActivityProps) {
  const { actor, message, parentMessage, channel, isRead, createdAt } =
    activity;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && "bg-green-50 dark:bg-green-950/30",
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
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-green-500" />
      )}

      {/* Avatar */}
      <ActivityAvatar actor={actor} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              <span className="font-medium">{actor.displayName}</span>
              {" replied to your message"}
            </p>

            {/* Parent message (the message being replied to) */}
            <div className="bg-muted/50 border-muted-foreground/30 mt-2 rounded-md border-l-2 p-2">
              <p className="mb-1 text-xs text-muted-foreground">
                Your message:
              </p>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {parentMessage.contentPreview || parentMessage.content}
              </p>
            </div>

            {/* Reply message */}
            <div className="mt-2 rounded-md border bg-background p-2">
              <p className="line-clamp-2 text-sm">
                {message.contentPreview || message.content}
              </p>
            </div>

            {/* Channel info */}
            <p className="mt-1 text-xs text-muted-foreground">
              in <span className="font-medium">#{channel.name}</span>
            </p>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default ReplyActivity;
