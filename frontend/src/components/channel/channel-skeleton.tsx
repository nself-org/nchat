"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ChannelSkeletonProps {
  className?: string;
  variant?: "list" | "header" | "info-panel" | "members";
}

// ============================================================================
// Skeleton Primitives
// ============================================================================

interface SkeletonPrimitiveProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className, style }: SkeletonPrimitiveProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      style={style}
    />
  );
}

// ============================================================================
// Channel List Skeleton
// ============================================================================

function ChannelListSkeleton() {
  return (
    <div className="space-y-4 p-2">
      {/* Search skeleton */}
      <div className="px-1">
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Starred section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-16" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>

      {/* Channels section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-20" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton
              className="h-4"
              style={{ width: `${60 + Math.random() * 80}px` }}
            />
          </div>
        ))}
      </div>

      {/* Private section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-14" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton
              className="h-4"
              style={{ width: `${50 + Math.random() * 60}px` }}
            />
          </div>
        ))}
      </div>

      {/* DMs section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1">
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-28" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Channel Header Skeleton
// ============================================================================

function ChannelHeaderSkeleton() {
  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

// ============================================================================
// Channel Info Panel Skeleton
// ============================================================================

function ChannelInfoPanelSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Channel Info */}
      <div className="border-b p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="mt-0.5 h-4 w-4" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Channel Members Skeleton
// ============================================================================

function ChannelMembersSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-3">
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Online section */}
      <div className="px-3 py-1">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-1 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="relative">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Offline section */}
      <div className="mt-4 px-3 py-1">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-1 px-1">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <div className="relative">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChannelSkeleton({
  className,
  variant = "list",
}: ChannelSkeletonProps) {
  const content = React.useMemo(() => {
    switch (variant) {
      case "header":
        return <ChannelHeaderSkeleton />;
      case "info-panel":
        return <ChannelInfoPanelSkeleton />;
      case "members":
        return <ChannelMembersSkeleton />;
      case "list":
      default:
        return <ChannelListSkeleton />;
    }
  }, [variant]);

  return <div className={className}>{content}</div>;
}

ChannelSkeleton.displayName = "ChannelSkeleton";

// Export individual skeletons for direct use
export {
  ChannelListSkeleton,
  ChannelHeaderSkeleton,
  ChannelInfoPanelSkeleton,
  ChannelMembersSkeleton,
  Skeleton,
};
