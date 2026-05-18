"use client";

/**
 * Activity Feed Page
 *
 * Main activity feed showing all activities
 */

import * as React from "react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import {
  ActivityFilterTabs,
  ActivityEmpty,
  ActivityLoading,
  UnreadBanner,
} from "@/components/activity";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ActivityCategory } from "@/lib/activity/activity-types";

// Settings icon
function SettingsIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Refresh icon
function RefreshIcon({ className }: { className?: string }) {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export default function ActivityPage() {
  const {
    activities,
    groupedActivities,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    activeCategory,
    setCategory,
    unreadCount,
    unreadByCategory,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
  } = useActivityFeed();

  // Handle activity click - navigate to context
  const handleActivityClick = React.useCallback(
    (activity: any) => {
      // Mark as read
      if (!activity.isRead) {
        markAsRead(activity.id);
      }

      // Navigate to activity context
      // In real app, this would use router.push() with proper URL
    },
    [markAsRead],
  );

  // Category counts for tabs
  const categoryCounts = React.useMemo(() => {
    return unreadByCategory as Record<ActivityCategory, number>;
  }, [unreadByCategory]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Stay up to date with what's happening
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
          >
            <RefreshIcon
              className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <SettingsIcon className="mr-1 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-muted/30 border-b px-6 py-3">
        <ActivityFilterTabs
          activeCategory={activeCategory}
          onChange={setCategory}
          counts={categoryCounts}
        />
      </div>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <UnreadBanner count={unreadCount} onMarkAllAsRead={markAllAsRead} />
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Loading state */}
          {isLoading && activities.length === 0 && (
            <ActivityLoading count={8} />
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={refresh}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && activities.length === 0 && (
            <ActivityEmpty category={activeCategory} />
          )}

          {/* Activity list */}
          {!isLoading && !error && activities.length > 0 && (
            <>
              {/* Grouped by date */}
              {groupedActivities.map((group) => (
                <div key={group.date} className="mb-6">
                  {/* Date separator */}
                  <div className="mb-2 flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Activities */}
                  <div className="space-y-1">
                    {group.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className={`hover:bg-muted/50 group relative flex cursor-pointer gap-3 rounded-lg p-3 transition-colors ${!activity.isRead ? "bg-primary/5" : ""} `}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleActivityClick(activity)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleActivityClick(activity);
                          }
                        }}
                      >
                        {/* Unread indicator */}
                        {!activity.isRead && (
                          <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                        )}

                        {/* Activity content - simplified */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${!activity.isRead ? "font-medium" : ""}`}
                          >
                            Activity: {activity.type}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {"latestAt" in activity
                              ? activity.latestAt
                              : activity.createdAt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
