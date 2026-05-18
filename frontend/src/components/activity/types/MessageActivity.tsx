"use client";

/**
 * MessageActivity Component
 *
 * Displays a message activity
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import type { MessageActivity as MessageActivityType } from "@/lib/activity/activity-types";

interface MessageActivityProps {
  activity: MessageActivityType;
  onClick?: () => void;
  className?: string;
}

export function MessageActivity({
  activity,
  onClick,
  className,
}: MessageActivityProps) {
  const { actor, message, channel, isRead, createdAt } = activity;

  return (
    <div
      className={cn(
        "group flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && "bg-primary/5",
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
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
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
              {" sent a message in "}
              <span className="font-medium text-primary">#{channel.name}</span>
            </p>

            {/* Message preview */}
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {message.contentPreview || message.content}
            </p>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default MessageActivity;
