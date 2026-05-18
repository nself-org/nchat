"use client";

/**
 * GIF Grid Component
 *
 * Masonry-style grid layout for displaying GIFs with lazy loading and infinite scroll.
 *
 * @example
 * ```tsx
 * <GifGrid
 *   gifs={gifs}
 *   onSelect={handleSelect}
 *   onLoadMore={loadMore}
 *   hasMore={hasMore}
 *   loading={loading}
 * />
 * ```
 */

import { useCallback, useRef, useEffect, memo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-intersection-observer";
import {
  GifPreview,
  GifPreviewWithActions,
  GifPreviewSkeleton,
} from "./gif-preview";
import type { Gif, GifGridProps } from "@/types/gif";

export const GifGrid = memo(function GifGrid({
  gifs,
  onSelect,
  loading = false,
  onLoadMore,
  hasMore = false,
  columns = 2,
  className,
}: GifGridProps) {
  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Trigger load more when sentinel is visible
  useEffect(() => {
    if (inView && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  // Handle GIF selection
  const handleSelect = useCallback(
    (gif: Gif) => {
      onSelect(gif);
    },
    [onSelect],
  );

  // Distribute GIFs into columns for masonry layout
  const distributeIntoColumns = useCallback(
    (items: Gif[], numColumns: number): Gif[][] => {
      const cols: Gif[][] = Array.from({ length: numColumns }, () => []);
      const heights: number[] = Array(numColumns).fill(0);

      items.forEach((gif) => {
        // Find the shortest column
        const shortestCol = heights.indexOf(Math.min(...heights));
        cols[shortestCol].push(gif);
        // Estimate height based on aspect ratio
        heights[shortestCol] += 1 / (gif.aspectRatio || 1);
      });

      return cols;
    },
    [],
  );

  const columnGifs = distributeIntoColumns(gifs, columns);

  // Empty state
  if (!loading && gifs.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No GIFs found</p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Masonry Grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {columnGifs.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-2">
            {column.map((gif) => (
              <GifPreview
                key={gif.id}
                gif={gif}
                onClick={handleSelect}
                showTitle
                size="md"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Loading state - skeletons */}
      {loading && gifs.length === 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <GifPreviewSkeleton
                  key={i}
                  aspectRatio={0.8 + Math.random() * 0.4}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Loading more indicator */}
      {loading && gifs.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading more...
          </span>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loading && (
        <div
          ref={loadMoreRef as React.RefObject<HTMLDivElement>}
          className="h-4 w-full"
          aria-hidden="true"
        />
      )}

      {/* End of results indicator */}
      {!hasMore && gifs.length > 0 && !loading && (
        <div className="flex items-center justify-center py-4">
          <span className="text-xs text-muted-foreground">
            No more GIFs to load
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// GIF Grid with Favorites Support
// ============================================================================

export interface GifGridWithFavoritesProps extends GifGridProps {
  favoriteGifIds?: Set<string>;
  onFavoriteToggle?: (gif: Gif) => void;
}

export const GifGridWithFavorites = memo(function GifGridWithFavorites({
  gifs,
  onSelect,
  loading = false,
  onLoadMore,
  hasMore = false,
  columns = 2,
  className,
  favoriteGifIds = new Set(),
  onFavoriteToggle,
}: GifGridWithFavoritesProps) {
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  const handleSelect = useCallback(
    (gif: Gif) => {
      onSelect(gif);
    },
    [onSelect],
  );

  const distributeIntoColumns = useCallback(
    (items: Gif[], numColumns: number): Gif[][] => {
      const cols: Gif[][] = Array.from({ length: numColumns }, () => []);
      const heights: number[] = Array(numColumns).fill(0);

      items.forEach((gif) => {
        const shortestCol = heights.indexOf(Math.min(...heights));
        cols[shortestCol].push(gif);
        heights[shortestCol] += 1 / (gif.aspectRatio || 1);
      });

      return cols;
    },
    [],
  );

  const columnGifs = distributeIntoColumns(gifs, columns);

  if (!loading && gifs.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No GIFs found</p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {columnGifs.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-2">
            {column.map((gif) => (
              <GifPreviewWithActions
                key={gif.id}
                gif={gif}
                onClick={handleSelect}
                showTitle
                size="md"
                isFavorite={favoriteGifIds.has(gif.id)}
                onFavoriteToggle={onFavoriteToggle}
              />
            ))}
          </div>
        ))}
      </div>

      {loading && gifs.length === 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <GifPreviewSkeleton
                  key={i}
                  aspectRatio={0.8 + Math.random() * 0.4}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {loading && gifs.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading more...
          </span>
        </div>
      )}

      {hasMore && !loading && (
        <div
          ref={loadMoreRef as React.RefObject<HTMLDivElement>}
          className="h-4 w-full"
          aria-hidden="true"
        />
      )}

      {!hasMore && gifs.length > 0 && !loading && (
        <div className="flex items-center justify-center py-4">
          <span className="text-xs text-muted-foreground">
            No more GIFs to load
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Simple Flat Grid (non-masonry)
// ============================================================================

export interface GifFlatGridProps {
  gifs: Gif[];
  onSelect: (gif: Gif) => void;
  loading?: boolean;
  columns?: number;
  className?: string;
}

export function GifFlatGrid({
  gifs,
  onSelect,
  loading = false,
  columns = 3,
  className,
}: GifFlatGridProps) {
  const handleSelect = useCallback(
    (gif: Gif) => {
      onSelect(gif);
    },
    [onSelect],
  );

  if (!loading && gifs.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">No GIFs</p>
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {loading &&
        gifs.length === 0 &&
        Array.from({ length: columns * 2 }).map((_, i) => (
          <GifPreviewSkeleton key={i} aspectRatio={1} />
        ))}
      {gifs.map((gif) => (
        <GifPreview
          key={gif.id}
          gif={gif}
          onClick={handleSelect}
          showTitle
          size="sm"
        />
      ))}
    </div>
  );
}

export default GifGrid;
