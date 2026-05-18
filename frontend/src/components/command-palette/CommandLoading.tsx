"use client";

/**
 * CommandLoading
 *
 * Loading state component for the command palette.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CommandLoadingProps {
  /** Custom message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show loading skeletons instead of spinner */
  showSkeletons?: boolean;
  /** Number of skeleton items to show */
  skeletonCount?: number;
}

// ============================================================================
// Skeleton Item
// ============================================================================

function CommandSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {/* Icon skeleton */}
      <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Shortcut skeleton */}
      <div className="h-5 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CommandLoading({
  message = "Loading...",
  className,
  showSkeletons = false,
  skeletonCount = 5,
}: CommandLoadingProps) {
  if (showSkeletons) {
    return (
      <div className={cn("py-2", className)}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <CommandSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default CommandLoading;
