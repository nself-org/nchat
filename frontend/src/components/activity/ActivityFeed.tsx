"use client";

/**
 * ActivityFeed Component
 *
 * Main activity feed component with filtering, pagination, and real-time updates
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityList } from "./ActivityList";
import { ActivityFilters, ActivityFilterTabs } from "./ActivityFilters";
import { ActivityEmpty } from "./ActivityEmpty";
import { ActivityLoading, ActivityInlineLoading } from "./ActivityLoading";
import { UnreadBanner } from "./UnreadActivities";
import { processActivityFeed } from "@/lib/activity/activity-manager";
import { getCountsByCategory } from "@/lib/activity/activity-filters";
import {
  isAggregatedActivity,
  flattenAggregatedActivities,
} from "@/lib/activity/activity-aggregator";
import type {
  Activity,
  AggregatedActivity,
  ActivityFilters as ActivityFiltersType,
  ActivityFeedProps,
  ActivityCategory,
} from "@/lib/activity/activity-types";

interface ActivityFeedState {
  activities: Activity[];
  filters: ActivityFiltersType;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
}

export function ActivityFeed({
  className,
  options = {},
  onActivityClick,
  onMarkAsRead,
  onMarkAllAsRead,
  emptyComponent,
  loadingComponent,
}: ActivityFeedProps) {
  // State
  const [state, setState] = React.useState<ActivityFeedState>({
    activities: [],
    filters: options.filters || {},
    isLoading: true,
    isLoadingMore: false,
    error: null,
    hasMore: true,
  });

  const [activeCategory, setActiveCategory] = React.useState<ActivityCategory>(
    options.filters?.category || "all",
  );

  // Process activities with current options
  const processed = React.useMemo(() => {
    return processActivityFeed(state.activities, {
      ...options,
      filters: state.filters,
    });
  }, [state.activities, state.filters, options]);

  // Get counts by category
  const categoryCounts = React.useMemo(() => {
    const counts = getCountsByCategory(state.activities);
    return Object.fromEntries(
      Object.entries(counts).map(([cat, data]) => [cat, data.unread]),
    ) as Record<ActivityCategory, number>;
  }, [state.activities]);

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (newFilters: ActivityFiltersType) => {
      setState((prev) => ({
        ...prev,
        filters: newFilters,
      }));
    },
    [],
  );

  // Handle category change
  const handleCategoryChange = React.useCallback(
    (category: ActivityCategory) => {
      setActiveCategory(category);
      setState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          category: category === "all" ? undefined : category,
        },
      }));
    },
    [],
  );

  // Handle activity click
  const handleActivityClick = React.useCallback(
    (activity: Activity | AggregatedActivity) => {
      if (isAggregatedActivity(activity)) {
        // For aggregated activities, use the first one
        onActivityClick?.(activity.activities[0]);
      } else {
        onActivityClick?.(activity);
      }
    },
    [onActivityClick],
  );

  // Handle mark as read
  const handleMarkAsRead = React.useCallback(
    (activityId: string) => {
      setState((prev) => ({
        ...prev,
        activities: prev.activities.map((a) =>
          a.id === activityId
            ? { ...a, isRead: true, readAt: new Date().toISOString() }
            : a,
        ),
      }));
      onMarkAsRead?.(activityId);
    },
    [onMarkAsRead],
  );

  // Handle mark all as read
  const handleMarkAllAsRead = React.useCallback(() => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.isRead ? a : { ...a, isRead: true, readAt: now },
      ),
    }));
    onMarkAllAsRead?.();
  }, [onMarkAllAsRead]);

  // Load more activities
  const handleLoadMore = React.useCallback(() => {
    if (state.isLoadingMore || !state.hasMore) return;

    setState((prev) => ({ ...prev, isLoadingMore: true }));

    // Simulate loading more (in real app, this would be an API call)
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoadingMore: false,
        // In real app: append new activities and update hasMore
      }));
    }, 1000);
  }, [state.isLoadingMore, state.hasMore]);

  // Simulate initial load
  React.useEffect(() => {
    // In real app, this would fetch from API or use the store
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        // Activities would come from props or store
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Render loading state
  if (state.isLoading) {
    return (
      loadingComponent || <ActivityLoading count={8} className={className} />
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12",
          className,
        )}
      >
        <p className="text-sm text-destructive">{state.error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Filter tabs */}
      <div className="border-b px-4 py-3">
        <ActivityFilterTabs
          activeCategory={activeCategory}
          onChange={handleCategoryChange}
          counts={categoryCounts}
        />
      </div>

      {/* Unread banner */}
      {processed.unreadCount > 0 && (
        <UnreadBanner
          count={processed.unreadCount}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      )}

      {/* Activity list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {processed.activities.length === 0 ? (
            emptyComponent || <ActivityEmpty category={activeCategory} />
          ) : (
            <>
              <ActivityList
                activities={processed.activities}
                groupByDate={true}
                onActivityClick={handleActivityClick}
                onMarkAsRead={handleMarkAsRead}
              />

              {/* Load more */}
              {processed.hasMore && (
                <div className="mt-4">
                  {state.isLoadingMore ? (
                    <ActivityInlineLoading />
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={handleLoadMore}
                    >
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ActivityFeed;
