"use client";

/**
 * LinkPreviewSkeleton - Loading state for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface LinkPreviewSkeletonProps {
  /** Layout variant */
  variant?: "vertical" | "horizontal" | "compact";
  /** Show image placeholder */
  showImage?: boolean;
  /** Additional class name */
  className?: string;
}

export function LinkPreviewSkeleton({
  variant = "vertical",
  showImage = true,
  className,
}: LinkPreviewSkeletonProps) {
  // Vertical layout
  if (variant === "vertical") {
    return (
      <div
        className={cn("overflow-hidden rounded-lg border bg-card", className)}
      >
        {showImage && <Skeleton className="aspect-video w-full rounded-none" />}
        <div className="space-y-2 p-3">
          {/* Domain */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Title */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          {/* Description */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  // Horizontal layout
  if (variant === "horizontal") {
    return (
      <div
        className={cn(
          "flex overflow-hidden rounded-lg border bg-card",
          className,
        )}
      >
        {showImage && (
          <Skeleton className="w-32 flex-shrink-0 rounded-none sm:w-40" />
        )}
        <div className="flex-1 space-y-2 p-3">
          {/* Domain */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Title */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          {/* Description */}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  // Compact layout
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-2",
        className,
      )}
    >
      {showImage && <Skeleton className="h-12 w-12 flex-shrink-0 rounded" />}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-4 flex-shrink-0 rounded" />
    </div>
  );
}

export default LinkPreviewSkeleton;
