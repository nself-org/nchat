/* eslint-disable react-hooks/rules-of-hooks */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type ActivityItem, type Channel } from "./UserProfile";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Heart,
  FileText,
  Hash,
  UserPlus,
  Circle,
  Activity,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserProfileActivityProps extends React.HTMLAttributes<HTMLDivElement> {
  activities: ActivityItem[];
  onChannelClick?: (channel: Channel) => void;
  showLimit?: number;
}

// ============================================================================
// Helper: Get activity icon
// ============================================================================

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "message":
      return <MessageSquare className="h-4 w-4" />;
    case "reaction":
      return <Heart className="h-4 w-4" />;
    case "file":
      return <FileText className="h-4 w-4" />;
    case "channel_join":
      return <UserPlus className="h-4 w-4" />;
    case "status_change":
      return <Circle className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getActivityColor(type: ActivityItem["type"]) {
  switch (type) {
    case "message":
      return "bg-blue-500/10 text-blue-500";
    case "reaction":
      return "bg-pink-500/10 text-pink-500";
    case "file":
      return "bg-green-500/10 text-green-500";
    case "channel_join":
      return "bg-purple-500/10 text-purple-500";
    case "status_change":
      return "bg-yellow-500/10 text-yellow-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ============================================================================
// Component
// ============================================================================

const UserProfileActivity = React.forwardRef<
  HTMLDivElement,
  UserProfileActivityProps
>(
  (
    { className, activities, onChannelClick, showLimit = 20, ...props },
    ref,
  ) => {
    const [showAll, setShowAll] = React.useState(false);
    const displayedActivities = showAll
      ? activities
      : activities.slice(0, showLimit);
    const hasMore = activities.length > showLimit;

    if (activities.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-center",
            className,
          )}
          {...props}
        >
          <Activity className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No recent activity</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Activity will appear here when this user sends messages, reacts, or
            uploads files.
          </p>
        </div>
      );
    }

    // Group activities by date
    const groupedActivities = React.useMemo(() => {
      const groups: Record<string, ActivityItem[]> = {};
      displayedActivities.forEach((activity) => {
        const date = new Date(activity.timestamp);
        const dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(activity);
      });
      return groups;
    }, [displayedActivities]);

    return (
      <div ref={ref} className={cn("p-6", className)} {...props}>
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              <h3 className="sticky top-0 mb-3 bg-background py-1 text-sm font-medium text-muted-foreground">
                {date}
              </h3>
              <div className="space-y-3">
                {dateActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="hover:bg-muted/50 flex items-start gap-3 rounded-lg p-3 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        getActivityColor(activity.type),
                      )}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {activity.description}
                        {activity.channelName && activity.channelId && (
                          <button
                            onClick={() =>
                              onChannelClick?.({
                                id: activity.channelId!,
                                name: activity.channelName!,
                              })
                            }
                            className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Hash className="h-3 w-3" />
                            {activity.channelName}
                          </button>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll
                ? "Show Less"
                : `Show ${activities.length - showLimit} More`}
            </Button>
          </div>
        )}
      </div>
    );
  },
);
UserProfileActivity.displayName = "UserProfileActivity";

export { UserProfileActivity };
