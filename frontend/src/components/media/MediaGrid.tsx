"use client";

/**
 * MediaGrid - Grid layout for media items with infinite scroll
 *
 * Supports grid, list, and masonry view modes with virtualization support.
 */

import * as React from "react";
import { useCallback, useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import {
  MediaItem as MediaItemType,
  MediaViewMode,
} from "@/lib/media/media-types";
import {
  calculateGridLayout,
  GalleryLayoutConfig,
} from "@/lib/media/media-gallery";
import { MediaItem } from "./MediaItem";
import { GalleryEmpty } from "./GalleryEmpty";
import { GalleryLoading } from "./GalleryLoading";

// ============================================================================
// Types
// ============================================================================

export interface MediaGridProps {
  items: MediaItemType[];
  viewMode?: MediaViewMode;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  selectedItems?: Set<string>;
  isSelectMode?: boolean;
  showItemInfo?: boolean;
  onItemClick?: (item: MediaItemType) => void;
  onItemSelect?: (item: MediaItemType) => void;
  onItemDoubleClick?: (item: MediaItemType) => void;
  onLoadMore?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
  gap?: number;
}

// ============================================================================
// Component
// ============================================================================

export function MediaGrid({
  items,
  viewMode = "grid",
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  selectedItems = new Set(),
  isSelectMode = false,
  showItemInfo = true,
  onItemClick,
  onItemSelect,
  onItemDoubleClick,
  onLoadMore,
  emptyMessage,
  emptyDescription,
  className,
  gap = 8,
}: MediaGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    setContainerWidth(container.offsetWidth);

    return () => resizeObserver.disconnect();
  }, []);

  // Trigger load more when in view
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoadingMore, onLoadMore]);

  // Calculate layout
  const layout: GalleryLayoutConfig = React.useMemo(() => {
    return calculateGridLayout(containerWidth, viewMode, gap);
  }, [containerWidth, viewMode, gap]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: MediaItemType) => {
      onItemClick?.(item);
    },
    [onItemClick],
  );

  // Handle item select
  const handleItemSelect = useCallback(
    (item: MediaItemType) => {
      onItemSelect?.(item);
    },
    [onItemSelect],
  );

  // Handle item double click
  const handleItemDoubleClick = useCallback(
    (item: MediaItemType) => {
      onItemDoubleClick?.(item);
    },
    [onItemDoubleClick],
  );

  // Show loading state
  if (isLoading && items.length === 0) {
    return <GalleryLoading viewMode={viewMode} />;
  }

  // Show empty state
  if (!isLoading && items.length === 0) {
    return (
      <GalleryEmpty message={emptyMessage} description={emptyDescription} />
    );
  }

  // Grid view styles
  const gridStyles: React.CSSProperties =
    viewMode === "grid" || viewMode === "masonry"
      ? {
          display: "grid",
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gap: `${gap}px`,
        }
      : {
          display: "flex",
          flexDirection: "column",
          gap: `${gap}px`,
        };

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {/* Items grid */}
      <div style={gridStyles}>
        {items.map((item) => (
          <MediaItem
            key={item.id}
            item={item}
            viewMode={viewMode}
            isSelected={selectedItems.has(item.id)}
            isSelectMode={isSelectMode}
            showInfo={showItemInfo}
            onClick={handleItemClick}
            onSelect={handleItemSelect}
            onDoubleClick={handleItemDoubleClick}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="mt-4 flex justify-center py-4">
          {isLoadingMore ? (
            <GalleryLoading variant="inline" />
          ) : (
            <div className="h-8" /> // Invisible trigger element
          )}
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && items.length > 0 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaGrid;
