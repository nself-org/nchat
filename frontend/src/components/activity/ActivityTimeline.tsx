"use client";

/**
 * ActivityTimeline Component
 *
 * Timeline view for activities with connectors
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ActivityIcon } from "./ActivityIcon";
import { ActivityAvatar } from "./ActivityAvatar";
import { ActivityDate } from "./ActivityDate";
import {
  formatActivityText,
  formatAggregatedActivityText,
} from "@/lib/activity/activity-formatter";
import { isAggregatedActivity } from "@/lib/activity/activity-aggregator";
import type {
  Activity,
  AggregatedActivity,
  ActivityTimelineProps,
} from "@/lib/activity/activity-types";

interface TimelineItemProps {
  activity: Activity | AggregatedActivity;
  showConnector: boolean;
  isLast: boolean;
  onClick?: () => void;
}

function TimelineItem({
  activity,
  showConnector,
  isLast,
  onClick,
}: TimelineItemProps) {
  const isAggregated = isAggregatedActivity(activity);
  const isRead = activity.isRead;
  const createdAt = isAggregated ? activity.latestAt : activity.createdAt;
  const activityText = isAggregated
    ? formatAggregatedActivityText(activity)
    : formatActivityText(activity);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {showConnector && !isLast && (
        <div
          className="absolute bottom-0 left-4 top-10 w-0.5 bg-border"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div className="relative z-10 flex shrink-0">
        <ActivityIcon type={activity.type} size="md" />
      </div>

      {/* Content */}
      <div
        className={cn("min-w-0 flex-1 pb-6", onClick && "cursor-pointer")}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Avatar */}
            {isAggregated ? (
              <ActivityAvatar
                actor={activity.actors.actors[0]}
                actors={activity.actors}
                size="sm"
              />
            ) : (
              <ActivityAvatar actor={activity.actor} size="sm" />
            )}

            {/* Text */}
            <p className={cn("text-sm", !isRead && "font-medium")}>
              {activityText}
            </p>
          </div>

          {/* Timestamp */}
          <ActivityDate date={createdAt} className="shrink-0" />
        </div>

        {/* Message preview for certain types */}
        {!isAggregated &&
          "message" in activity &&
          activity.message &&
          (activity.type === "mention" ||
            activity.type === "reply" ||
            activity.type === "thread_reply") && (
            <div className="bg-muted/50 ml-8 mt-2 line-clamp-2 rounded-md p-2 text-sm text-muted-foreground">
              {activity.message.contentPreview || activity.message.content}
            </div>
          )}

        {/* Aggregated count */}
        {isAggregated && activity.count > 1 && (
          <p className="ml-8 mt-1 text-xs text-muted-foreground">
            and {activity.count - 1} more{" "}
            {activity.count - 1 === 1 ? "activity" : "activities"}
          </p>
        )}

        {/* Unread indicator */}
        {!isRead && (
          <div className="absolute left-0 top-0 h-8 w-1 rounded-r-full bg-primary" />
        )}
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
  className,
  showConnector = true,
  onActivityClick,
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-0", className)}>
      {activities.map((activity, index) => (
        <TimelineItem
          key={activity.id}
          activity={activity}
          showConnector={showConnector}
          isLast={index === activities.length - 1}
          onClick={
            onActivityClick ? () => onActivityClick(activity) : undefined
          }
        />
      ))}
    </div>
  );
}

export default ActivityTimeline;
