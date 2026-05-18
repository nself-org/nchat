"use client";

import { cn } from "@/lib/utils";
import {
  Skeleton,
  CircleSkeleton,
  LineSkeleton,
  TextBlockSkeleton,
} from "./skeleton";

interface SearchSkeletonProps {
  /** Number of result items */
  count?: number;
  /** Show search input */
  showInput?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Search results skeleton
 * Shows loading state for search results
 */
export function SearchSkeleton({
  count = 5,
  showInput = true,
  showFilters = true,
  className,
}: SearchSkeletonProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Search input */}
      {showInput && (
        <div className="border-b p-4">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      )}

      {/* Filters */}
      {showFilters && <SearchFiltersSkeleton />}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Results count */}
          <LineSkeleton width={100} height={12} className="mb-4" />

          {/* Result items */}
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <SearchResultSkeleton
                key={i}
                type={i % 3 === 0 ? "file" : "message"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Search filters skeleton
 */
export function SearchFiltersSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex gap-2 overflow-x-auto border-b px-4 py-2", className)}
    >
      <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
      <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
      <Skeleton className="h-7 w-14 shrink-0 rounded-full" />
      <Skeleton className="w-18 h-7 shrink-0 rounded-full" />
      <div className="mx-1 h-7 w-px bg-border" />
      <Skeleton className="h-7 w-24 shrink-0 rounded-full" />
    </div>
  );
}

interface SearchResultSkeletonProps {
  /** Type of result */
  type?: "message" | "file" | "channel" | "user";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single search result skeleton
 * Adapts based on result type
 */
export function SearchResultSkeleton({
  type = "message",
  className,
}: SearchResultSkeletonProps) {
  switch (type) {
    case "message":
      return <MessageResultSkeleton className={className} />;
    case "file":
      return <FileResultSkeleton className={className} />;
    case "channel":
      return <ChannelResultSkeleton className={className} />;
    case "user":
      return <UserResultSkeleton className={className} />;
    default:
      return <MessageResultSkeleton className={className} />;
  }
}

/**
 * Message search result skeleton
 */
export function MessageResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hover:bg-muted/50 flex gap-3 rounded-lg border p-3 transition-colors",
        className,
      )}
    >
      {/* Avatar */}
      <CircleSkeleton size={32} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header: user and channel */}
        <div className="mb-1 flex items-center gap-2">
          <LineSkeleton width={80} height={12} />
          <LineSkeleton width={4} height={4} />
          <LineSkeleton width={60} height={12} />
          <LineSkeleton width={50} height={10} className="ml-auto" />
        </div>

        {/* Message content with highlight placeholder */}
        <TextBlockSkeleton lines={2} lineHeight={14} lastLineWidth="70%" />
      </div>
    </div>
  );
}

/**
 * File search result skeleton
 */
export function FileResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hover:bg-muted/50 flex gap-3 rounded-lg border p-3 transition-colors",
        className,
      )}
    >
      {/* File icon/preview */}
      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Filename */}
        <LineSkeleton width={160} height={14} className="mb-1" />

        {/* File info */}
        <div className="flex items-center gap-2">
          <LineSkeleton width={40} height={12} />
          <LineSkeleton width={4} height={4} />
          <LineSkeleton width={60} height={12} />
          <LineSkeleton width={4} height={4} />
          <LineSkeleton width={50} height={12} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 gap-1">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

/**
 * Channel search result skeleton
 */
export function ChannelResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors",
        className,
      )}
    >
      {/* Channel icon */}
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />

      {/* Channel info */}
      <div className="min-w-0 flex-1">
        <LineSkeleton width={100} height={14} className="mb-1" />
        <LineSkeleton width={180} height={12} />
      </div>

      {/* Member count */}
      <div className="flex shrink-0 items-center gap-1">
        <CircleSkeleton size={16} />
        <LineSkeleton width={20} height={12} />
      </div>
    </div>
  );
}

/**
 * User search result skeleton
 */
export function UserResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors",
        className,
      )}
    >
      {/* Avatar */}
      <CircleSkeleton size={40} />

      {/* User info */}
      <div className="min-w-0 flex-1">
        <LineSkeleton width={100} height={14} className="mb-1" />
        <LineSkeleton width={80} height={12} />
      </div>

      {/* Role badge */}
      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
    </div>
  );
}

/**
 * Quick search dropdown skeleton
 */
export function QuickSearchSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-lg",
        className,
      )}
    >
      {/* Input */}
      <div className="border-b p-3">
        <Skeleton className="h-8 w-full rounded" />
      </div>

      {/* Recent searches */}
      <div className="p-2">
        <LineSkeleton width={80} height={10} className="mb-2 px-2" />
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded px-2 py-1.5"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <LineSkeleton width={120 + Math.random() * 60} height={14} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="border-t p-2">
        <div className="flex gap-1">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="w-18 h-7 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty search state skeleton
 */
export function EmptySearchSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className,
      )}
    >
      <Skeleton className="mb-4 h-16 w-16 rounded-full" />
      <LineSkeleton width={150} height={16} className="mb-2" />
      <LineSkeleton width={200} height={14} />
    </div>
  );
}
