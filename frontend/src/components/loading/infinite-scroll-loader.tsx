"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { Button } from "@/components/ui/button";

interface InfiniteScrollLoaderProps {
  /** Whether more items are being loaded */
  isLoading?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Callback when load more is triggered */
  onLoadMore: () => void;
  /** Mode: auto triggers on scroll, manual shows button */
  mode?: "auto" | "manual";
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
  /** Custom loading content */
  loadingContent?: React.ReactNode;
  /** Custom "load more" button content */
  loadMoreContent?: React.ReactNode;
  /** Custom "end of list" content */
  endContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Infinite scroll loader component
 * Triggers load more when scrolled into view or shows manual button
 */
export function InfiniteScrollLoader({
  isLoading = false,
  hasMore = true,
  onLoadMore,
  mode = "auto",
  rootMargin = "100px",
  threshold = 0.1,
  loadingContent,
  loadMoreContent,
  endContent,
  className,
}: InfiniteScrollLoaderProps) {
  const loaderRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading && mode === "auto") {
        onLoadMore();
      }
    },
    [hasMore, isLoading, mode, onLoadMore],
  );

  useEffect(() => {
    if (mode !== "auto") return;

    const element = loaderRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection, mode, rootMargin, threshold]);

  // Nothing more to load
  if (!hasMore && !isLoading) {
    return endContent ? (
      <div className={cn("py-4 text-center", className)}>{endContent}</div>
    ) : null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        ref={loaderRef}
        className={cn("flex justify-center py-4", className)}
      >
        {loadingContent ?? <Spinner size="md" text="Loading more..." />}
      </div>
    );
  }

  // Manual mode - show button
  if (mode === "manual") {
    return (
      <div className={cn("flex justify-center py-4", className)}>
        <Button variant="outline" onClick={onLoadMore}>
          {loadMoreContent ?? "Load more"}
        </Button>
      </div>
    );
  }

  // Auto mode - invisible trigger element
  return (
    <div ref={loaderRef} className={cn("h-4", className)} aria-hidden="true" />
  );
}

interface LoadMoreButtonProps {
  /** Whether loading */
  isLoading?: boolean;
  /** Whether there are more items */
  hasMore?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Items remaining count (optional) */
  remainingCount?: number;
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "link";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standalone load more button
 */
export function LoadMoreButton({
  isLoading = false,
  hasMore = true,
  onClick,
  remainingCount,
  variant = "outline",
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className={cn("flex justify-center py-4", className)}>
      <Button variant={variant} onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Loading...
          </>
        ) : remainingCount !== undefined ? (
          `Load ${remainingCount} more`
        ) : (
          "Load more"
        )}
      </Button>
    </div>
  );
}

interface EndOfListProps {
  /** Message to display */
  message?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * End of list indicator
 */
export function EndOfList({
  message = "You've reached the end",
  showIcon = true,
  className,
}: EndOfListProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-muted-foreground",
        className,
      )}
    >
      {showIcon && (
        <div className="mb-2 text-2xl opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </div>
      )}
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface PullToRefreshProps {
  /** Whether refreshing */
  isRefreshing?: boolean;
  /** Refresh callback */
  onRefresh: () => Promise<void>;
  /** Pull threshold in pixels */
  threshold?: number;
  /** Children content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pull to refresh container
 * Note: This is a simplified implementation - for production use a library
 */
export function PullToRefresh({
  isRefreshing = false,
  onRefresh,
  threshold = 80,
  children,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current > 0) {
      pullDistance.current = e.touches[0].clientY - startY.current;
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance.current > threshold && !isRefreshing) {
      await onRefresh();
    }
    startY.current = 0;
    pullDistance.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh indicator */}
      {isRefreshing && (
        <div className="absolute left-0 right-0 top-0 flex justify-center py-4">
          <Spinner size="md" />
        </div>
      )}

      {children}
    </div>
  );
}
