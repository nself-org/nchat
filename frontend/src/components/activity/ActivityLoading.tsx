"use client";

/**
 * ActivityLoading Component
 *
 * Loading skeleton for activity feed
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityLoadingProps } from "@/lib/activity/activity-types";

/**
 * Single activity item skeleton
 */
function ActivityItemSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex gap-3 rounded-lg p-3", compact && "gap-2 p-2")}>
      {/* Avatar skeleton */}
      <Skeleton
        className={cn("shrink-0 rounded-full", compact ? "h-6 w-6" : "h-8 w-8")}
      />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            {/* Title line */}
            <Skeleton className="h-4 w-3/4" />
            {/* Description line (only in non-compact mode) */}
            {!compact && <Skeleton className="h-3 w-1/2" />}
          </div>
          {/* Timestamp */}
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        {/* Message preview (only in non-compact mode) */}
        {!compact && <Skeleton className="h-10 w-full rounded-md" />}
      </div>
    </div>
  );
}

/**
 * Date separator skeleton
 */
function DateSeparatorSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border" />
      <Skeleton className="h-3 w-16" />
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ActivityLoading({
  count = 5,
  compact = false,
  className,
}: ActivityLoadingProps) {
  // Generate a mix of items and separators
  const items = React.useMemo(() => {
    const result: ("item" | "separator")[] = [];

    // Add a separator at the start
    result.push("separator");

    for (let i = 0; i < count; i++) {
      result.push("item");

      // Add separators periodically to simulate date grouping
      if (i === 2 || i === Math.floor(count * 0.6)) {
        result.push("separator");
      }
    }

    return result;
  }, [count]);

  return (
    <div className={cn("space-y-1", className)}>
      {items.map((type, index) =>
        type === "separator" ? (
          <DateSeparatorSkeleton key={`separator-${index}`} />
        ) : (
          <ActivityItemSkeleton key={`item-${index}`} compact={compact} />
        ),
      )}
    </div>
  );
}

/**
 * Full page loading state
 */
export function ActivityPageLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="bg-muted/50 flex w-fit gap-1 rounded-lg p-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>

      {/* Activity list skeleton */}
      <ActivityLoading count={8} />
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function ActivityInlineLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span>Loading more activities...</span>
    </div>
  );
}

export default ActivityLoading;
