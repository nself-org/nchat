"use client";

import { cn } from "@/lib/utils";
import {
  Skeleton,
  CircleSkeleton,
  LineSkeleton,
  TextBlockSkeleton,
} from "./skeleton";

interface MessageSkeletonProps {
  /** Number of message items to render */
  count?: number;
  /** Compact mode with smaller spacing */
  compact?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Show reactions */
  showReactions?: boolean;
  /** Show thread preview */
  showThreadPreview?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading skeleton for message list
 * Matches the message component layout
 */
export function MessageSkeleton({
  count = 3,
  compact = false,
  showAvatar = true,
  showReactions = false,
  showThreadPreview = false,
  className,
}: MessageSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col", compact ? "gap-2" : "gap-4", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeletonItem
          key={i}
          compact={compact}
          showAvatar={showAvatar}
          showReactions={showReactions && i === 0}
          showThreadPreview={showThreadPreview && i === 1}
        />
      ))}
    </div>
  );
}

interface MessageSkeletonItemProps {
  /** Compact mode */
  compact?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
  /** Show reactions */
  showReactions?: boolean;
  /** Show thread preview */
  showThreadPreview?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single message skeleton item
 */
export function MessageSkeletonItem({
  compact = false,
  showAvatar = true,
  showReactions = false,
  showThreadPreview = false,
  className,
}: MessageSkeletonItemProps) {
  return (
    <div
      className={cn(
        "flex",
        compact ? "gap-2 px-2 py-1" : "gap-3 px-4 py-2",
        className,
      )}
    >
      {/* Avatar */}
      {showAvatar && <CircleSkeleton size={compact ? 24 : 36} />}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header: username and timestamp */}
        <div className="mb-1 flex items-center gap-2">
          <LineSkeleton width={80} height={compact ? 12 : 14} />
          <LineSkeleton width={40} height={10} />
        </div>

        {/* Message content */}
        <TextBlockSkeleton
          lines={2}
          lastLineWidth="70%"
          lineHeight={compact ? 12 : 14}
          gap={4}
        />

        {/* Reactions */}
        {showReactions && (
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-6 w-10 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        )}

        {/* Thread preview */}
        {showThreadPreview && (
          <div className="mt-2 flex items-center gap-2 border-l-2 border-muted pl-2">
            <CircleSkeleton size={16} />
            <LineSkeleton width={100} height={12} />
            <LineSkeleton width={60} height={10} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grouped message skeleton (no avatar, indented)
 * For consecutive messages from the same user
 */
export function GroupedMessageSkeleton({
  compact = false,
  className,
}: Pick<MessageSkeletonItemProps, "compact" | "className">) {
  return (
    <div
      className={cn(
        "pl-12",
        compact ? "px-2 py-0.5" : "px-4 py-0.5",
        className,
      )}
    >
      <TextBlockSkeleton lines={1} lineHeight={compact ? 12 : 14} />
    </div>
  );
}

/**
 * System message skeleton
 * For join/leave/date divider messages
 */
export function SystemMessageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center py-2", className)}>
      <LineSkeleton width={200} height={12} />
    </div>
  );
}

/**
 * Message with attachment skeleton
 */
export function MessageWithAttachmentSkeleton({
  compact = false,
  className,
}: Pick<MessageSkeletonItemProps, "compact" | "className">) {
  return (
    <div
      className={cn(
        "flex gap-3",
        compact ? "px-2 py-1" : "px-4 py-2",
        className,
      )}
    >
      <CircleSkeleton size={compact ? 24 : 36} />

      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <LineSkeleton width={80} height={14} />
          <LineSkeleton width={40} height={10} />
        </div>

        {/* Message text */}
        <LineSkeleton width="60%" height={14} className="mb-2" />

        {/* Attachment preview */}
        <Skeleton className="h-40 w-64 max-w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Full message list skeleton with header and input
 */
export function MessageListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Channel header skeleton */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-6 w-6 rounded" />
        <LineSkeleton width={120} height={18} />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-hidden p-4">
        <MessageSkeleton count={5} />
      </div>

      {/* Input area skeleton */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}
