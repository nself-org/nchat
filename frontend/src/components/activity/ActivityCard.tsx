"use client";

/**
 * ActivityCard Component
 *
 * Expanded view of an activity with full details
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ActivityIcon } from "./ActivityIcon";
import { ActivityAvatar } from "./ActivityAvatar";
import { ActivityDate } from "./ActivityDate";
import {
  formatActivityText,
  formatAggregatedActivityText,
  formatActivityDescription,
  getActivityActionUrl,
} from "@/lib/activity/activity-formatter";
import {
  isAggregatedActivity,
  flattenAggregatedActivities,
} from "@/lib/activity/activity-aggregator";
import type { ActivityCardProps } from "@/lib/activity/activity-types";

// Icon components
function XIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ActivityCard({
  activity,
  expanded = false,
  showActions = true,
  onClose,
  onJumpToContext,
  onMarkAsRead,
}: ActivityCardProps) {
  const isAggregated = isAggregatedActivity(activity);
  const isRead = activity.isRead;
  const createdAt = isAggregated ? activity.latestAt : activity.createdAt;
  const activityText = isAggregated
    ? formatAggregatedActivityText(activity)
    : formatActivityText(activity);

  // Get action URL
  const actionUrl = !isAggregated ? getActivityActionUrl(activity) : null;

  // Get description/preview
  const description = !isAggregated
    ? formatActivityDescription(activity)
    : null;

  // Get channel info
  const channel = "channel" in activity ? activity.channel : null;

  // Get message info
  const message = "message" in activity ? activity.message : null;

  // Get actors for aggregated
  const actors = isAggregated ? activity.actors : null;

  return (
    <Card className={cn("relative", !isRead && "ring-primary/20 ring-2")}>
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <ActivityIcon type={activity.type} size="lg" />

          {/* Content */}
          <div className="min-w-0 flex-1 pt-1">
            <p className={cn("text-sm leading-snug", !isRead && "font-medium")}>
              {activityText}
            </p>
            <ActivityDate date={createdAt} className="mt-1" format="absolute" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Actors list for aggregated */}
        {actors && actors.actors.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              From {actors.totalCount}{" "}
              {actors.totalCount === 1 ? "person" : "people"}
            </p>
            <div className="flex flex-wrap gap-2">
              {actors.actors.slice(0, 10).map((actor) => (
                <div
                  key={actor.id}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs"
                >
                  <ActivityAvatar actor={actor} size="sm" />
                  <span>{actor.displayName}</span>
                </div>
              ))}
              {actors.hasMore && (
                <div className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  +{actors.totalCount - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single actor */}
        {!isAggregated && (
          <div className="flex items-center gap-2">
            <ActivityAvatar actor={activity.actor} size="md" />
            <div>
              <p className="text-sm font-medium">
                {activity.actor.displayName}
              </p>
              {activity.actor.username && (
                <p className="text-xs text-muted-foreground">
                  @{activity.actor.username}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Message preview */}
        {message && (
          <div className="bg-muted/50 rounded-md border p-3">
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              <ActivityDate date={message.createdAt} format="absolute" />
            </p>
          </div>
        )}

        {/* Channel info */}
        {channel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">in</span>
            <span className="font-medium">#{channel.name}</span>
            {channel.isArchived && (
              <span className="text-xs text-muted-foreground">(archived)</span>
            )}
          </div>
        )}

        {/* Aggregated activities breakdown */}
        {isAggregated && expanded && (
          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Activity breakdown
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {activity.activities.slice(0, 10).map((subActivity) => (
                <div
                  key={subActivity.id}
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-md p-2 text-sm"
                >
                  <ActivityAvatar actor={subActivity.actor} size="sm" />
                  <span className="flex-1 truncate">
                    {formatActivityText(subActivity)}
                  </span>
                  <ActivityDate
                    date={subActivity.createdAt}
                    format="smart"
                    className="shrink-0"
                  />
                </div>
              ))}
              {activity.activities.length > 10 && (
                <p className="py-1 text-center text-xs text-muted-foreground">
                  and {activity.activities.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {showActions && (
        <CardFooter className="gap-2 pt-0">
          {!isRead && onMarkAsRead && (
            <Button variant="outline" size="sm" onClick={onMarkAsRead}>
              <CheckIcon className="mr-1 h-4 w-4" />
              Mark as read
            </Button>
          )}
          {(actionUrl || onJumpToContext) && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (onJumpToContext) {
                  onJumpToContext();
                } else if (actionUrl) {
                  window.location.href = actionUrl;
                }
              }}
            >
              <ExternalLinkIcon className="mr-1 h-4 w-4" />
              Jump to context
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default ActivityCard;
