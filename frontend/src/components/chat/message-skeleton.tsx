"use client";

import { cn } from "@/lib/utils";

interface MessageSkeletonProps {
  count?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Loading skeleton for messages
 * Shows animated placeholder content while messages are loading
 */
export function MessageSkeleton({
  count = 3,
  compact = false,
  className,
}: MessageSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeletonItem key={i} compact={compact} />
      ))}
    </div>
  );
}

interface MessageSkeletonItemProps {
  compact?: boolean;
  showAvatar?: boolean;
}

export function MessageSkeletonItem({
  compact = false,
  showAvatar = true,
}: MessageSkeletonItemProps) {
  return (
    <div className={cn("flex animate-pulse gap-3", compact && "gap-2")}>
      {/* Avatar */}
      {showAvatar && (
        <div
          className={cn(
            "shrink-0 rounded-full bg-muted",
            compact ? "h-6 w-6" : "h-9 w-9",
          )}
        />
      )}

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>

        {/* Message lines */}
        <div className="space-y-1.5">
          <div className="h-4 w-full max-w-[280px] rounded bg-muted" />
          <div className="h-4 w-full max-w-[200px] rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grouped message skeleton (no avatar, indented)
 */
export function GroupedMessageSkeleton() {
  return (
    <div className="animate-pulse pl-12">
      <div className="space-y-1.5">
        <div className="h-4 w-full max-w-[260px] rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Full-page loading skeleton for message list
 */
export function MessageListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Channel header skeleton */}
      <div className="flex items-center gap-3 border-b p-4">
        <div className="h-6 w-6 animate-pulse rounded bg-muted" />
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden p-4">
        <MessageSkeleton count={5} />
      </div>

      {/* Input area skeleton */}
      <div className="border-t p-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
