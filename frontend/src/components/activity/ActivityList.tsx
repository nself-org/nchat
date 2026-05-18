"use client";

/**
 * ActivityList Component
 *
 * Displays a list of activities with optional date grouping
 */

import * as React from "react";
import { ActivityItem } from "./ActivityItem";
import { ActivityDateSeparator } from "./ActivityDate";
import { groupActivitiesByDateGroup } from "@/lib/activity/activity-manager";
import type {
  Activity,
  AggregatedActivity,
  ActivityListProps,
} from "@/lib/activity/activity-types";

export function ActivityList({
  activities,
  groupByDate = true,
  compact = false,
  onActivityClick,
  onMarkAsRead,
}: ActivityListProps) {
  if (activities.length === 0) {
    return null;
  }

  if (!groupByDate) {
    return (
      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            compact={compact}
            onClick={() => onActivityClick?.(activity)}
            onMarkAsRead={() => onMarkAsRead?.(activity.id)}
          />
        ))}
      </div>
    );
  }

  // Group activities by date
  const groupedActivities = groupActivitiesByDateGroup(activities);

  return (
    <div className="space-y-4">
      {groupedActivities.map((group) => (
        <div key={group.date}>
          <ActivityDateSeparator label={group.label} />
          <div className="mt-2 space-y-1">
            {group.activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                compact={compact}
                onClick={() => onActivityClick?.(activity)}
                onMarkAsRead={() => onMarkAsRead?.(activity.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityList;
