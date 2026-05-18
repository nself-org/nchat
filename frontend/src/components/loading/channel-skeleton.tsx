"use client";

import { cn } from "@/lib/utils";
import { Skeleton, LineSkeleton } from "./skeleton";

interface ChannelSkeletonProps {
  /** Number of channel items to render */
  count?: number;
  /** Show category headers */
  showCategories?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for channel list
 * Matches the sidebar channel layout
 */
export function ChannelSkeleton({
  count = 5,
  showCategories = true,
  compact = false,
  className,
}: ChannelSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1", className)}
    >
      {showCategories ? (
        <>
          {/* First category */}
          <ChannelCategorySkeleton itemCount={3} compact={compact} />
          {/* Second category */}
          {count > 3 && (
            <ChannelCategorySkeleton itemCount={count - 3} compact={compact} />
          )}
        </>
      ) : (
        Array.from({ length: count }).map((_, i) => (
          <ChannelSkeletonItem key={i} compact={compact} />
        ))
      )}
    </div>
  );
}

interface ChannelSkeletonItemProps {
  /** Compact mode */
  compact?: boolean;
  /** Indentation level for nested channels */
  indent?: number;
  /** Show unread badge */
  showUnread?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single channel skeleton item
 */
export function ChannelSkeletonItem({
  compact = false,
  indent = 0,
  showUnread = false,
  className,
}: ChannelSkeletonItemProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md",
        compact ? "gap-1.5 px-2 py-0.5" : "gap-2 px-3 py-1.5",
        className,
      )}
      style={{ paddingLeft: indent > 0 ? `${indent * 20 + 12}px` : undefined }}
    >
      {/* Channel icon (hash) */}
      <Skeleton className={cn("shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />

      {/* Channel name */}
      <LineSkeleton
        width={80 + Math.random() * 40}
        height={compact ? 12 : 14}
      />

      {/* Unread badge */}
      {showUnread && <Skeleton className="ml-auto h-4 w-6 rounded-full" />}
    </div>
  );
}

interface ChannelCategorySkeletonProps {
  /** Number of channels in category */
  itemCount?: number;
  /** Compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Channel category skeleton with header and items
 */
export function ChannelCategorySkeleton({
  itemCount = 3,
  compact = false,
  className,
}: ChannelCategorySkeletonProps) {
  return (
    <div className={cn("mb-4", className)}>
      {/* Category header */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <Skeleton className="h-3 w-3 rounded" />
        <LineSkeleton width={60} height={10} />
      </div>

      {/* Channels */}
      <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
        {Array.from({ length: itemCount }).map((_, i) => (
          <ChannelSkeletonItem key={i} compact={compact} showUnread={i === 0} />
        ))}
      </div>
    </div>
  );
}

/**
 * Private channel skeleton with lock icon
 */
export function PrivateChannelSkeletonItem({
  compact = false,
  className,
}: Pick<ChannelSkeletonItemProps, "compact" | "className">) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md",
        compact ? "gap-1.5 px-2 py-0.5" : "gap-2 px-3 py-1.5",
        className,
      )}
    >
      {/* Lock icon */}
      <Skeleton className={cn("shrink-0", compact ? "h-3 w-3" : "h-4 w-4")} />

      {/* Channel name */}
      <LineSkeleton width={70} height={compact ? 12 : 14} />
    </div>
  );
}

/**
 * Nested channel skeleton with tree lines
 */
export function NestedChannelSkeleton({
  depth = 1,
  compact = false,
  className,
}: ChannelSkeletonItemProps & { depth?: number }) {
  return (
    <div className={cn("relative", className)}>
      {/* Tree line */}
      <div
        className="absolute border-l border-zinc-300 dark:border-zinc-600"
        style={{
          left: `${depth * 20 + 3}px`,
          top: 0,
          bottom: "50%",
        }}
      />
      <div
        className="absolute border-t border-zinc-300 dark:border-zinc-600"
        style={{
          left: `${depth * 20 + 3}px`,
          width: "8px",
          top: "50%",
        }}
      />

      <ChannelSkeletonItem compact={compact} indent={depth} />
    </div>
  );
}

/**
 * Full channel list skeleton matching sidebar layout
 */
export function ChannelListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6 p-2", className)}>
      {/* Channels header */}
      <div className="flex items-center justify-between px-2">
        <LineSkeleton width={60} height={12} />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded" />
        </div>
      </div>

      {/* Channel categories */}
      <ChannelCategorySkeleton itemCount={4} />
      <ChannelCategorySkeleton itemCount={3} />
      <ChannelCategorySkeleton itemCount={2} />
    </div>
  );
}

/**
 * Direct messages skeleton
 */
export function DirectMessagesSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* DM header */}
      <div className="flex items-center justify-between px-2 py-1">
        <LineSkeleton width={100} height={12} />
        <Skeleton className="h-4 w-4 rounded" />
      </div>

      {/* DM items */}
      {Array.from({ length: count }).map((_, i) => (
        <DirectMessageSkeletonItem key={i} />
      ))}
    </div>
  );
}

/**
 * Single direct message item skeleton
 */
export function DirectMessageSkeletonItem({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5", className)}>
      {/* Avatar */}
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />

      {/* Name */}
      <LineSkeleton width={90} height={14} />

      {/* Status dot */}
      <Skeleton className="ml-auto h-2 w-2 rounded-full" />
    </div>
  );
}
