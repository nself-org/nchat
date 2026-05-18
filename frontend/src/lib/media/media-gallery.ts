/**
 * Media Gallery - Gallery-specific logic and utilities
 *
 * Provides functions for gallery navigation, layout calculations,
 * infinite scroll, and gallery state management.
 */

import {
  MediaItem,
  MediaFilters,
  MediaSorting,
  MediaType,
  MediaViewMode,
  MediaFilterTab,
  defaultMediaFilters,
  GALLERY_PAGE_SIZE,
} from "./media-types";

// ============================================================================
// Types
// ============================================================================

export interface GalleryLayoutConfig {
  columns: number;
  gap: number;
  itemWidth: number;
  itemHeight: number;
}

export interface MasonryItem {
  item: MediaItem;
  column: number;
  top: number;
  height: number;
}

export interface InfiniteScrollConfig {
  threshold: number;
  rootMargin: string;
  pageSize: number;
}

export interface GalleryNavigationState {
  currentIndex: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter media items based on filters
 */
export function filterMediaItems(
  items: MediaItem[],
  filters: MediaFilters,
): MediaItem[] {
  let filtered = [...items];

  // Type filter
  if (filters.type !== "all") {
    const typeMap: Record<MediaFilterTab, MediaType[]> = {
      all: [],
      images: ["image"],
      videos: ["video"],
      audio: ["audio"],
      documents: ["document", "archive", "other"],
    };
    const allowedTypes = typeMap[filters.type];
    if (allowedTypes.length > 0) {
      filtered = filtered.filter((item) =>
        allowedTypes.includes(item.fileType),
      );
    }
  }

  // Multiple types filter (if specified)
  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter((item) =>
      filters.types!.includes(item.fileType),
    );
  }

  // Channel filter
  if (filters.channelId) {
    filtered = filtered.filter((item) => item.channelId === filters.channelId);
  }

  // Thread filter
  if (filters.threadId) {
    filtered = filtered.filter((item) => item.threadId === filters.threadId);
  }

  // User filter
  if (filters.userId) {
    filtered = filtered.filter((item) => item.uploadedBy.id === filters.userId);
  }

  // Search query
  if (filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.fileName.toLowerCase().includes(query) ||
        item.uploadedBy.displayName.toLowerCase().includes(query) ||
        item.uploadedBy.username.toLowerCase().includes(query),
    );
  }

  // Date range filter
  if (filters.dateRange.start || filters.dateRange.end) {
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.createdAt);

      if (filters.dateRange.start && itemDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && itemDate > filters.dateRange.end) {
        return false;
      }
      return true;
    });
  }

  // Size filter
  if (filters.minSize !== undefined) {
    filtered = filtered.filter((item) => item.fileSize >= filters.minSize!);
  }
  if (filters.maxSize !== undefined) {
    filtered = filtered.filter((item) => item.fileSize <= filters.maxSize!);
  }

  // MIME type filter
  if (filters.mimeTypes && filters.mimeTypes.length > 0) {
    filtered = filtered.filter((item) =>
      filters.mimeTypes!.includes(item.mimeType),
    );
  }

  // Extension filter
  if (filters.extensions && filters.extensions.length > 0) {
    filtered = filtered.filter((item) =>
      filters.extensions!.includes(item.fileExtension.toLowerCase()),
    );
  }

  // Favorites only
  if (filters.favoritesOnly) {
    filtered = filtered.filter((item) => item.isFavorite);
  }

  return filtered;
}

/**
 * Reset filters to defaults
 */
export function resetFilters(): MediaFilters {
  return { ...defaultMediaFilters };
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: MediaFilters): boolean {
  return (
    filters.type !== "all" ||
    filters.searchQuery.trim() !== "" ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.channelId !== undefined ||
    filters.threadId !== undefined ||
    filters.userId !== undefined ||
    filters.minSize !== undefined ||
    filters.maxSize !== undefined ||
    (filters.mimeTypes && filters.mimeTypes.length > 0) ||
    (filters.extensions && filters.extensions.length > 0) ||
    filters.favoritesOnly === true
  );
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(filters: MediaFilters): number {
  let count = 0;

  if (filters.type !== "all") count++;
  if (filters.searchQuery.trim()) count++;
  if (filters.dateRange.start || filters.dateRange.end) count++;
  if (filters.channelId) count++;
  if (filters.threadId) count++;
  if (filters.userId) count++;
  if (filters.minSize !== undefined || filters.maxSize !== undefined) count++;
  if (filters.mimeTypes && filters.mimeTypes.length > 0) count++;
  if (filters.extensions && filters.extensions.length > 0) count++;
  if (filters.favoritesOnly) count++;

  return count;
}

// ============================================================================
// Sort Functions
// ============================================================================

/**
 * Sort media items
 */
export function sortMediaItems(
  items: MediaItem[],
  sorting: MediaSorting,
): MediaItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sorting.sortBy) {
      case "date_asc":
      case "date_desc":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;

      case "name_asc":
      case "name_desc":
        comparison = a.fileName.localeCompare(b.fileName);
        break;

      case "size_asc":
      case "size_desc":
        comparison = a.fileSize - b.fileSize;
        break;

      case "type":
        comparison = a.fileType.localeCompare(b.fileType);
        break;

      default:
        comparison = 0;
    }

    // Apply direction
    if (sorting.sortBy.endsWith("_desc") || sorting.direction === "desc") {
      comparison = -comparison;
    }

    return comparison;
  });

  return sorted;
}

// ============================================================================
// Layout Functions
// ============================================================================

/**
 * Calculate grid layout configuration
 */
export function calculateGridLayout(
  containerWidth: number,
  viewMode: MediaViewMode,
  gap: number = 8,
): GalleryLayoutConfig {
  let columns: number;
  let itemWidth: number;
  let itemHeight: number;

  switch (viewMode) {
    case "grid":
      // Responsive columns based on container width
      if (containerWidth < 400) {
        columns = 2;
      } else if (containerWidth < 600) {
        columns = 3;
      } else if (containerWidth < 900) {
        columns = 4;
      } else if (containerWidth < 1200) {
        columns = 5;
      } else {
        columns = 6;
      }
      itemWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      itemHeight = itemWidth; // Square items
      break;

    case "list":
      columns = 1;
      itemWidth = containerWidth;
      itemHeight = 72; // Fixed height for list items
      break;

    case "masonry":
      // Similar to grid but items have variable height
      if (containerWidth < 400) {
        columns = 2;
      } else if (containerWidth < 600) {
        columns = 3;
      } else if (containerWidth < 900) {
        columns = 4;
      } else {
        columns = 5;
      }
      itemWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      itemHeight = 0; // Variable height
      break;

    default:
      columns = 4;
      itemWidth = Math.floor((containerWidth - gap * 3) / 4);
      itemHeight = itemWidth;
  }

  return { columns, gap, itemWidth, itemHeight };
}

/**
 * Calculate masonry layout positions
 */
export function calculateMasonryLayout(
  items: MediaItem[],
  layout: GalleryLayoutConfig,
): MasonryItem[] {
  const { columns, gap, itemWidth } = layout;
  const columnHeights = new Array(columns).fill(0);
  const result: MasonryItem[] = [];

  for (const item of items) {
    // Find the shortest column
    const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));

    // Calculate item height based on aspect ratio
    let itemHeight = itemWidth;
    if (item.metadata.dimensions) {
      const aspectRatio =
        item.metadata.dimensions.width / item.metadata.dimensions.height;
      itemHeight = Math.round(itemWidth / aspectRatio);
    }

    result.push({
      item,
      column: shortestColumn,
      top: columnHeights[shortestColumn],
      height: itemHeight,
    });

    columnHeights[shortestColumn] += itemHeight + gap;
  }

  return result;
}

/**
 * Get total masonry height
 */
export function getMasonryHeight(
  masonryItems: MasonryItem[],
  gap: number,
): number {
  if (masonryItems.length === 0) return 0;

  let maxHeight = 0;
  for (const item of masonryItems) {
    maxHeight = Math.max(maxHeight, item.top + item.height);
  }

  return maxHeight + gap;
}

// ============================================================================
// Navigation Functions
// ============================================================================

/**
 * Get navigation state for gallery viewer
 */
export function getNavigationState(
  items: MediaItem[],
  currentIndex: number,
): GalleryNavigationState {
  return {
    currentIndex,
    totalItems: items.length,
    hasNext: currentIndex < items.length - 1,
    hasPrevious: currentIndex > 0,
  };
}

/**
 * Navigate to next item
 */
export function getNextIndex(
  currentIndex: number,
  totalItems: number,
  loop: boolean = false,
): number {
  if (currentIndex >= totalItems - 1) {
    return loop ? 0 : currentIndex;
  }
  return currentIndex + 1;
}

/**
 * Navigate to previous item
 */
export function getPreviousIndex(
  currentIndex: number,
  totalItems: number,
  loop: boolean = false,
): number {
  if (currentIndex <= 0) {
    return loop ? totalItems - 1 : currentIndex;
  }
  return currentIndex - 1;
}

/**
 * Find index of item by ID
 */
export function findItemIndex(items: MediaItem[], itemId: string): number {
  return items.findIndex((item) => item.id === itemId);
}

// ============================================================================
// Infinite Scroll Functions
// ============================================================================

/**
 * Get default infinite scroll configuration
 */
export function getInfiniteScrollConfig(): InfiniteScrollConfig {
  return {
    threshold: 0.8,
    rootMargin: "100px",
    pageSize: GALLERY_PAGE_SIZE,
  };
}

/**
 * Check if should load more items
 */
export function shouldLoadMore(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold: number = 0.8,
): boolean {
  const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
  return scrollPercentage >= threshold;
}

/**
 * Calculate visible items for virtualization
 */
export function getVisibleItems(
  items: MediaItem[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3,
): { startIndex: number; endIndex: number; visibleItems: MediaItem[] } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex + 1),
  };
}

// ============================================================================
// Selection Functions
// ============================================================================

/**
 * Toggle item selection
 */
export function toggleSelection(
  selectedItems: Set<string>,
  itemId: string,
): Set<string> {
  const newSelection = new Set(selectedItems);
  if (newSelection.has(itemId)) {
    newSelection.delete(itemId);
  } else {
    newSelection.add(itemId);
  }
  return newSelection;
}

/**
 * Select all items
 */
export function selectAll(items: MediaItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/**
 * Clear selection
 */
export function clearSelection(): Set<string> {
  return new Set();
}

/**
 * Select range of items (for shift+click)
 */
export function selectRange(
  items: MediaItem[],
  startIndex: number,
  endIndex: number,
): Set<string> {
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);

  return new Set(items.slice(start, end + 1).map((item) => item.id));
}

/**
 * Get selected items
 */
export function getSelectedItems(
  items: MediaItem[],
  selectedIds: Set<string>,
): MediaItem[] {
  return items.filter((item) => selectedIds.has(item.id));
}

// ============================================================================
// Grouping Functions
// ============================================================================

/**
 * Group items by date (for display with date headers)
 */
export function groupByDate(items: MediaItem[]): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    } else if (date.getFullYear() === today.getFullYear()) {
      dateKey = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
    } else {
      dateKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  }

  return groups;
}

/**
 * Group items by month
 */
export function groupByMonth(items: MediaItem[]): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    const monthKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(item);
  }

  return groups;
}

/**
 * Group items by type
 */
export function groupByType(items: MediaItem[]): Map<MediaType, MediaItem[]> {
  const groups = new Map<MediaType, MediaItem[]>();

  for (const item of items) {
    if (!groups.has(item.fileType)) {
      groups.set(item.fileType, []);
    }
    groups.get(item.fileType)!.push(item);
  }

  return groups;
}

/**
 * Group items by sender
 */
export function groupBySender(
  items: MediaItem[],
): Map<string, { user: MediaItem["uploadedBy"]; items: MediaItem[] }> {
  const groups = new Map<
    string,
    { user: MediaItem["uploadedBy"]; items: MediaItem[] }
  >();

  for (const item of items) {
    const userId = item.uploadedBy.id;
    if (!groups.has(userId)) {
      groups.set(userId, { user: item.uploadedBy, items: [] });
    }
    groups.get(userId)!.items.push(item);
  }

  return groups;
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Get gallery statistics
 */
export function getGalleryStats(items: MediaItem[]): {
  totalCount: number;
  totalSize: number;
  byType: Record<MediaType, number>;
} {
  const byType: Record<MediaType, number> = {
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    archive: 0,
    other: 0,
  };

  let totalSize = 0;

  for (const item of items) {
    byType[item.fileType]++;
    totalSize += item.fileSize;
  }

  return {
    totalCount: items.length,
    totalSize,
    byType,
  };
}
