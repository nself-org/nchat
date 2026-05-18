"use client";

/**
 * ChannelActivity Component
 *
 * Displays channel-related activities (created, archived, etc.)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityAvatar } from "../ActivityAvatar";
import { ActivityDate } from "../ActivityDate";
import { ActivityIcon } from "../ActivityIcon";
import type {
  ChannelCreatedActivity,
  ChannelArchivedActivity,
  ChannelUnarchivedActivity,
} from "@/lib/activity/activity-types";

type ChannelActivityType =
  | ChannelCreatedActivity
  | ChannelArchivedActivity
  | ChannelUnarchivedActivity;

interface ChannelActivityProps {
  activity: ChannelActivityType;
  onClick?: () => void;
  className?: string;
}

export function ChannelActivity({
  activity,
  onClick,
  className,
}: ChannelActivityProps) {
  const { actor, channel, type, isRead, createdAt } = activity;

  const getActivityText = () => {
    switch (type) {
      case "channel_created":
        return "created a new channel";
      case "channel_archived":
        return "archived the channel";
      case "channel_unarchived":
        return "unarchived the channel";
      default:
        return "updated the channel";
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "channel_created":
        return "bg-indigo-50 dark:bg-indigo-950/30";
      case "channel_archived":
        return "bg-gray-50 dark:bg-gray-900/30";
      case "channel_unarchived":
        return "bg-indigo-50 dark:bg-indigo-950/30";
      default:
        return "";
    }
  };

  const getIndicatorColor = () => {
    switch (type) {
      case "channel_created":
        return "bg-indigo-500";
      case "channel_archived":
        return "bg-gray-500";
      case "channel_unarchived":
        return "bg-indigo-500";
      default:
        return "bg-primary";
    }
  };

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors",
        "hover:bg-muted/50",
        !isRead && getBackgroundColor(),
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
        <div
          className={cn(
            "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            getIndicatorColor(),
          )}
        />
      )}

      {/* Icon */}
      <ActivityIcon type={type} size="md" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Header */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              <span className="font-medium">{actor.displayName}</span>{" "}
              {getActivityText()}
            </p>

            {/* Channel info */}
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-background p-2">
              <span className="text-lg">#</span>
              <div>
                <p className="text-sm font-medium">{channel.name}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {channel.type} channel
                  {channel.isArchived && " (archived)"}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default ChannelActivity;
