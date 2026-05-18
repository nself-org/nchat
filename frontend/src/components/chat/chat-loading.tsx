"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Types
// ============================================================================

interface ChatLoadingProps {
  showHeader?: boolean;
  showInput?: boolean;
  messageCount?: number;
  className?: string;
}

// ============================================================================
// Header Skeleton
// ============================================================================

function HeaderSkeleton() {
  return (
    <div className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-32" />
        <div className="h-4 w-px bg-border" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

// ============================================================================
// Message Skeleton Item
// ============================================================================

interface MessageSkeletonItemProps {
  showAvatar?: boolean;
  lines?: number;
  compact?: boolean;
}

function MessageSkeletonItem({
  showAvatar = true,
  lines = 2,
  compact = false,
}: MessageSkeletonItemProps) {
  return (
    <div className={cn("flex gap-3", compact && "gap-2")}>
      {showAvatar && (
        <Skeleton
          className={cn(
            "shrink-0 rounded-full",
            compact ? "h-6 w-6" : "h-9 w-9",
          )}
        />
      )}
      <div className="flex-1 space-y-2">
        {showAvatar && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
        )}
        <div className="space-y-1.5">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-4",
                i === 0 && "w-full max-w-[300px]",
                i === 1 && "w-full max-w-[220px]",
                i === 2 && "w-full max-w-[180px]",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Message Group Skeleton (multiple messages from same user)
// ============================================================================

function MessageGroupSkeleton({ messageCount = 3 }: { messageCount?: number }) {
  return (
    <div className="space-y-2">
      {/* First message with avatar */}
      <MessageSkeletonItem showAvatar lines={2} />
      {/* Following messages without avatar (grouped) */}
      {Array.from({ length: messageCount - 1 }).map((_, i) => (
        <div key={i} className="pl-12">
          <Skeleton className="h-4 w-full max-w-[240px]" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Date Separator Skeleton
// ============================================================================

function DateSeparatorSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex-1 border-t" />
      <Skeleton className="h-4 w-24" />
      <div className="flex-1 border-t" />
    </div>
  );
}

// ============================================================================
// Input Skeleton
// ============================================================================

function InputSkeleton() {
  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ============================================================================
// Chat Loading Component
// ============================================================================

export function ChatLoading({
  showHeader = true,
  showInput = true,
  messageCount = 6,
  className,
}: ChatLoadingProps) {
  // Generate varied message skeletons
  const messageGroups = React.useMemo(() => {
    const groups: Array<{ type: "date" | "messages"; count?: number }> = [];

    // Start with a date separator
    groups.push({ type: "date" });

    // Add message groups with some variation
    let remaining = messageCount;
    while (remaining > 0) {
      const groupSize = Math.min(remaining, Math.floor(Math.random() * 3) + 1);
      groups.push({ type: "messages", count: groupSize });
      remaining -= groupSize;

      // Occasionally add a date separator
      if (remaining > 2 && Math.random() > 0.7) {
        groups.push({ type: "date" });
      }
    }

    return groups;
  }, [messageCount]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      {showHeader && <HeaderSkeleton />}

      {/* Messages Area */}
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {messageGroups.map((group, index) =>
          group.type === "date" ? (
            <DateSeparatorSkeleton key={`date-${index}`} />
          ) : (
            <MessageGroupSkeleton
              key={`group-${index}`}
              messageCount={group.count}
            />
          ),
        )}
      </div>

      {/* Input */}
      {showInput && <InputSkeleton />}
    </div>
  );
}

// ============================================================================
// Minimal Loading Spinner
// ============================================================================

export function ChatLoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <svg
          className="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm">Loading messages...</span>
      </div>
    </div>
  );
}

// ============================================================================
// Loading More Messages Indicator
// ============================================================================

export function LoadingMoreIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center border-b py-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex gap-1">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-current"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-current"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-current"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-xs">Loading more messages</span>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  HeaderSkeleton,
  MessageSkeletonItem,
  MessageGroupSkeleton,
  DateSeparatorSkeleton,
  InputSkeleton,
};
