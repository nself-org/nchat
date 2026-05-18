"use client";

import { useMemo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickerPreview, StickerPreviewSkeleton } from "./sticker-preview";
import type { Sticker } from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerGridProps {
  stickers: Sticker[];
  onStickerClick: (sticker: Sticker) => void;
  onStickerLongPress?: (sticker: Sticker) => void;
  onFavorite?: (sticker: Sticker) => void;
  favoriteIds?: Set<string>;
  columns?: 4 | 5 | 6 | 8;
  stickerSize?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingCount?: number;
  emptyMessage?: string;
  className?: string;
  maxHeight?: string | number;
  showHoverActions?: boolean;
}

export interface StickerGridSectionProps {
  title: string;
  stickers: Sticker[];
  onStickerClick: (sticker: Sticker) => void;
  onStickerLongPress?: (sticker: Sticker) => void;
  onFavorite?: (sticker: Sticker) => void;
  favoriteIds?: Set<string>;
  columns?: 4 | 5 | 6 | 8;
  stickerSize?: "sm" | "md" | "lg";
  showHoverActions?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerAction?: React.ReactNode;
  className?: string;
}

// ============================================================================
// GRID COLUMN CONFIG
// ============================================================================

const columnConfig = {
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  8: "grid-cols-8",
};

// ============================================================================
// STICKER GRID COMPONENT
// ============================================================================

export function StickerGrid({
  stickers,
  onStickerClick,
  onStickerLongPress,
  onFavorite,
  favoriteIds = new Set(),
  columns = 5,
  stickerSize = "md",
  loading = false,
  loadingCount = 15,
  emptyMessage = "No stickers found",
  className,
  maxHeight = "300px",
  showHoverActions = true,
}: StickerGridProps) {
  const gridClass = columnConfig[columns];

  // Render loading skeletons
  if (loading) {
    return (
      <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
        <div className={cn("grid gap-1 p-2", gridClass)}>
          {Array.from({ length: loadingCount }).map((_, i) => (
            <StickerPreviewSkeleton key={i} size={stickerSize} />
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Render empty state
  if (stickers.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className,
        )}
        style={{ minHeight: "150px" }}
      >
        <div className="mb-2 text-4xl">:-/</div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
      <div className={cn("grid gap-1 p-2", gridClass)}>
        {stickers.map((sticker) => (
          <StickerPreview
            key={sticker.id}
            sticker={sticker}
            size={stickerSize}
            onClick={onStickerClick}
            onLongPress={onStickerLongPress}
            onFavorite={onFavorite}
            isFavorite={favoriteIds.has(sticker.id)}
            showHoverActions={showHoverActions}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// STICKER GRID SECTION (with title)
// ============================================================================

export function StickerGridSection({
  title,
  stickers,
  onStickerClick,
  onStickerLongPress,
  onFavorite,
  favoriteIds = new Set(),
  columns = 5,
  stickerSize = "md",
  showHoverActions = true,
  collapsible = false,
  defaultCollapsed = false,
  headerAction,
  className,
}: StickerGridSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const gridClass = columnConfig[columns];

  if (stickers.length === 0) {
    return null;
  }

  return (
    <div className={cn("mb-4", className)}>
      {/* Section Header */}
      <div
        className={cn(
          "bg-background/95 sticky top-0 z-10 flex items-center justify-between px-2 py-1.5 backdrop-blur-sm",
          collapsible && "hover:bg-accent/50 cursor-pointer rounded-md",
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsCollapsed(!isCollapsed);
                }
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <span
              className={cn(
                "text-muted-foreground transition-transform",
                isCollapsed && "-rotate-90",
              )}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M4 3l4 3-4 3V3z" />
              </svg>
            </span>
          )}
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            ({stickers.length})
          </span>
        </div>
        {headerAction && !isCollapsed && (
          <div onClick={(e) => e.stopPropagation()} role="presentation">
            {headerAction}
          </div>
        )}
      </div>

      {/* Stickers Grid */}
      {!isCollapsed && (
        <div className={cn("grid gap-1 p-2", gridClass)}>
          {stickers.map((sticker) => (
            <StickerPreview
              key={sticker.id}
              sticker={sticker}
              size={stickerSize}
              onClick={onStickerClick}
              onLongPress={onStickerLongPress}
              onFavorite={onFavorite}
              isFavorite={favoriteIds.has(sticker.id)}
              showHoverActions={showHoverActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STICKER GRID VIRTUALIZED (for large lists)
// ============================================================================

export interface VirtualizedStickerGridProps extends Omit<
  StickerGridProps,
  "maxHeight"
> {
  height: number;
  rowHeight?: number;
}

export function VirtualizedStickerGrid({
  stickers,
  onStickerClick,
  onStickerLongPress,
  onFavorite,
  favoriteIds = new Set(),
  columns = 5,
  stickerSize = "md",
  loading = false,
  loadingCount = 15,
  emptyMessage = "No stickers found",
  className,
  height,
  rowHeight = 80,
  showHoverActions = true,
}: VirtualizedStickerGridProps) {
  const gridClass = columnConfig[columns];

  // Calculate rows
  const rows = useMemo(() => {
    const result: Sticker[][] = [];
    for (let i = 0; i < stickers.length; i += columns) {
      result.push(stickers.slice(i, i + columns));
    }
    return result;
  }, [stickers, columns]);

  // Calculate visible range based on scroll position
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / rowHeight);
    const visibleRows = Math.ceil(height / rowHeight) + 1;
    return {
      start: Math.max(0, startRow - 1),
      end: Math.min(rows.length, startRow + visibleRows + 1),
    };
  }, [scrollTop, rowHeight, height, rows.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  if (loading) {
    return (
      <div className={cn("overflow-auto", className)} style={{ height }}>
        <div className={cn("grid gap-1 p-2", gridClass)}>
          {Array.from({ length: loadingCount }).map((_, i) => (
            <StickerPreviewSkeleton key={i} size={stickerSize} />
          ))}
        </div>
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center text-center",
          className,
        )}
        style={{ height }}
      >
        <div className="mb-2 text-4xl">:-/</div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const totalHeight = rows.length * rowHeight;

  return (
    <div
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {rows
          .slice(visibleRange.start, visibleRange.end)
          .map((row, rowIndex) => (
            <div
              key={visibleRange.start + rowIndex}
              className={cn(
                "absolute left-0 right-0 grid gap-1 px-2",
                gridClass,
              )}
              style={{
                top: (visibleRange.start + rowIndex) * rowHeight,
                height: rowHeight,
              }}
            >
              {row.map((sticker) => (
                <StickerPreview
                  key={sticker.id}
                  sticker={sticker}
                  size={stickerSize}
                  onClick={onStickerClick}
                  onLongPress={onStickerLongPress}
                  onFavorite={onFavorite}
                  isFavorite={favoriteIds.has(sticker.id)}
                  showHoverActions={showHoverActions}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// STICKER GRID WITH CATEGORIES
// ============================================================================

export interface CategoryGroup {
  id: string;
  name: string;
  stickers: Sticker[];
}

export interface CategorizedStickerGridProps {
  categories: CategoryGroup[];
  onStickerClick: (sticker: Sticker) => void;
  onStickerLongPress?: (sticker: Sticker) => void;
  onFavorite?: (sticker: Sticker) => void;
  favoriteIds?: Set<string>;
  columns?: 4 | 5 | 6 | 8;
  stickerSize?: "sm" | "md" | "lg";
  showHoverActions?: boolean;
  collapsible?: boolean;
  className?: string;
  maxHeight?: string | number;
}

export function CategorizedStickerGrid({
  categories,
  onStickerClick,
  onStickerLongPress,
  onFavorite,
  favoriteIds = new Set(),
  columns = 5,
  stickerSize = "md",
  showHoverActions = true,
  collapsible = true,
  className,
  maxHeight = "400px",
}: CategorizedStickerGridProps) {
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.stickers.length > 0);
  }, [categories]);

  if (filteredCategories.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          className,
        )}
        style={{ minHeight: "150px" }}
      >
        <div className="mb-2 text-4xl">:-/</div>
        <p className="text-sm text-muted-foreground">No stickers available</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
      {filteredCategories.map((category) => (
        <StickerGridSection
          key={category.id}
          title={category.name}
          stickers={category.stickers}
          onStickerClick={onStickerClick}
          onStickerLongPress={onStickerLongPress}
          onFavorite={onFavorite}
          favoriteIds={favoriteIds}
          columns={columns}
          stickerSize={stickerSize}
          showHoverActions={showHoverActions}
          collapsible={collapsible}
        />
      ))}
    </ScrollArea>
  );
}

export default StickerGrid;
