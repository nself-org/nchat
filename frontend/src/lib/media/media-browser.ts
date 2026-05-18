/**
 * Media Browser Service
 *
 * Shared media browser providing album management, media search,
 * grid/list view modes, document preview, and platform-aware behavior.
 * Integrates with the media parity module for cross-platform UX consistency.
 */

import type {
  MediaItem,
  MediaFilters,
  MediaSorting,
  MediaViewMode,
  MediaType,
  MediaPagination,
} from "./media-types";
import type { PlatformPreset, PlatformLimits } from "./media-parity";
import { PLATFORM_PRESETS, getFileCategory } from "./media-parity";
import {
  filterMediaItems,
  sortMediaItems,
  groupByDate,
  groupByType,
  groupBySender,
} from "./media-gallery";
import {
  searchMedia,
  searchWithFilters,
  type SearchResult,
  type SearchOptions,
} from "./media-search";
import type { Album, AlbumType, AlbumSortBy } from "./albums";
import {
  createAlbum,
  createAutoAlbums,
  sortAlbums,
  filterAlbumsByType,
  getAlbumStats,
  mergeAlbums,
  getAlbumCoverCandidates,
} from "./albums";
import type {
  DocumentPreviewConfig,
  DocumentPreviewResult,
} from "./document-preview";
import {
  getDocumentPreviewConfig,
  canPreviewDocument,
  getPreviewCapabilities,
} from "./document-preview";

// ============================================================================
// Types
// ============================================================================

export type BrowserTab = "media" | "documents" | "links" | "albums";

export type GroupingMode = "none" | "date" | "type" | "sender" | "channel";

export interface MediaBrowserConfig {
  /** Active platform preset for behavior/limits */
  platform: PlatformPreset;
  /** Whether user has premium tier */
  isPremium: boolean;
  /** Default view mode */
  defaultViewMode: MediaViewMode;
  /** Default tab */
  defaultTab: BrowserTab;
  /** Default grouping */
  defaultGrouping: GroupingMode;
  /** Items per page */
  pageSize: number;
  /** Enable album features */
  albumsEnabled: boolean;
  /** Enable document preview */
  documentPreviewEnabled: boolean;
  /** Enable media search */
  searchEnabled: boolean;
  /** Enable multi-select */
  multiSelectEnabled: boolean;
  /** Maximum selection count */
  maxSelection: number;
  /** Thumbnail size for grid view */
  thumbnailSize: "small" | "medium" | "large";
  /** Show file info overlay on hover */
  showInfoOverlay: boolean;
  /** Enable keyboard navigation */
  keyboardNavigation: boolean;
  /** Auto-play video previews on hover */
  autoPlayPreviews: boolean;
}

export interface MediaBrowserState {
  /** Current active tab */
  activeTab: BrowserTab;
  /** Current view mode */
  viewMode: MediaViewMode;
  /** Current grouping mode */
  grouping: GroupingMode;
  /** Current filters */
  filters: MediaFilters;
  /** Current sorting */
  sorting: MediaSorting;
  /** Current pagination */
  pagination: MediaPagination;
  /** Selected item IDs */
  selectedIds: Set<string>;
  /** Whether multi-select is active */
  isSelecting: boolean;
  /** Currently focused item ID */
  focusedItemId: string | null;
  /** Search query */
  searchQuery: string;
  /** Whether search results are being shown */
  isSearchActive: boolean;
  /** Currently open album ID */
  openAlbumId: string | null;
  /** Error state */
  error: string | null;
  /** Loading state */
  isLoading: boolean;
}

export interface BrowseResult {
  items: MediaItem[];
  groups: Map<string, MediaItem[]> | null;
  totalCount: number;
  filteredCount: number;
  pagination: MediaPagination;
}

export interface MediaBrowserStats {
  totalItems: number;
  totalSize: number;
  byType: Record<MediaType, number>;
  byChannel: Map<string, number>;
  bySender: Map<string, number>;
  albumCount: number;
  dateRange: { earliest: Date | null; latest: Date | null };
}

export interface PlatformBehavior {
  /** Platform display name */
  name: string;
  /** Maximum attachments per message */
  maxAttachments: number;
  /** Whether to auto-compress images */
  autoCompress: boolean;
  /** Whether to strip EXIF data */
  stripExif: boolean;
  /** Supported media types for preview */
  previewableTypes: MediaType[];
  /** Grid column count (responsive breakpoints) */
  gridColumns: { mobile: number; tablet: number; desktop: number };
  /** Thumbnail quality setting */
  thumbnailQuality: number;
  /** Whether albums are supported */
  albumsSupported: boolean;
  /** Whether document preview is supported */
  documentPreviewSupported: boolean;
  /** Maximum gallery items to display at once */
  maxGalleryItems: number;
  /** Message attachment layout style */
  attachmentLayout: "grid" | "stacked" | "carousel";
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_BROWSER_CONFIG: MediaBrowserConfig = {
  platform: "default",
  isPremium: false,
  defaultViewMode: "grid",
  defaultTab: "media",
  defaultGrouping: "none",
  pageSize: 50,
  albumsEnabled: true,
  documentPreviewEnabled: true,
  searchEnabled: true,
  multiSelectEnabled: true,
  maxSelection: 100,
  thumbnailSize: "medium",
  showInfoOverlay: true,
  keyboardNavigation: true,
  autoPlayPreviews: true,
};

export const DEFAULT_BROWSER_STATE: MediaBrowserState = {
  activeTab: "media",
  viewMode: "grid",
  grouping: "none",
  filters: {
    type: "all",
    searchQuery: "",
    dateRange: { start: null, end: null },
  },
  sorting: {
    sortBy: "date_desc",
    direction: "desc",
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
    cursor: null,
  },
  selectedIds: new Set(),
  isSelecting: false,
  focusedItemId: null,
  searchQuery: "",
  isSearchActive: false,
  openAlbumId: null,
  error: null,
  isLoading: false,
};

export const THUMBNAIL_SIZES: Record<"small" | "medium" | "large", number> = {
  small: 100,
  medium: 200,
  large: 400,
};

// ============================================================================
// Platform Behavior Configuration
// ============================================================================

export const PLATFORM_BEHAVIORS: Record<PlatformPreset, PlatformBehavior> = {
  whatsapp: {
    name: "WhatsApp",
    maxAttachments: 30,
    autoCompress: true,
    stripExif: true,
    previewableTypes: ["image", "video", "audio", "document"],
    gridColumns: { mobile: 2, tablet: 3, desktop: 4 },
    thumbnailQuality: 0.7,
    albumsSupported: false,
    documentPreviewSupported: true,
    maxGalleryItems: 30,
    attachmentLayout: "grid",
  },
  telegram: {
    name: "Telegram",
    maxAttachments: 10,
    autoCompress: false,
    stripExif: false,
    previewableTypes: ["image", "video", "audio", "document"],
    gridColumns: { mobile: 3, tablet: 4, desktop: 5 },
    thumbnailQuality: 0.85,
    albumsSupported: true,
    documentPreviewSupported: true,
    maxGalleryItems: 100,
    attachmentLayout: "grid",
  },
  discord: {
    name: "Discord",
    maxAttachments: 10,
    autoCompress: false,
    stripExif: false,
    previewableTypes: ["image", "video", "audio"],
    gridColumns: { mobile: 2, tablet: 3, desktop: 4 },
    thumbnailQuality: 0.85,
    albumsSupported: false,
    documentPreviewSupported: false,
    maxGalleryItems: 50,
    attachmentLayout: "stacked",
  },
  slack: {
    name: "Slack",
    maxAttachments: 10,
    autoCompress: false,
    stripExif: false,
    previewableTypes: ["image", "video", "audio", "document"],
    gridColumns: { mobile: 2, tablet: 3, desktop: 5 },
    thumbnailQuality: 0.85,
    albumsSupported: true,
    documentPreviewSupported: true,
    maxGalleryItems: 100,
    attachmentLayout: "stacked",
  },
  default: {
    name: "Default",
    maxAttachments: 10,
    autoCompress: true,
    stripExif: true,
    previewableTypes: ["image", "video", "audio", "document"],
    gridColumns: { mobile: 2, tablet: 4, desktop: 6 },
    thumbnailQuality: 0.85,
    albumsSupported: true,
    documentPreviewSupported: true,
    maxGalleryItems: 100,
    attachmentLayout: "grid",
  },
};

// ============================================================================
// Core Browser Functions
// ============================================================================

/**
 * Get platform behavior configuration
 */
export function getPlatformBehavior(preset: PlatformPreset): PlatformBehavior {
  return PLATFORM_BEHAVIORS[preset] || PLATFORM_BEHAVIORS.default;
}

/**
 * Get platform limits
 */
export function getPlatformLimits(
  preset: PlatformPreset,
  isPremium: boolean = false,
): PlatformLimits {
  const limits = PLATFORM_PRESETS[preset];
  if (isPremium && limits.premium) {
    return {
      ...limits,
      maxVideoSize: limits.premium.maxVideoSize,
      maxImageSize: limits.premium.maxImageSize,
      maxAudioSize: limits.premium.maxAudioSize,
      maxFileSize: limits.premium.maxFileSize,
    };
  }
  return limits;
}

/**
 * Create a browser configuration from a platform preset
 */
export function createBrowserConfig(
  preset: PlatformPreset,
  overrides?: Partial<MediaBrowserConfig>,
): MediaBrowserConfig {
  const behavior = getPlatformBehavior(preset);

  return {
    ...DEFAULT_BROWSER_CONFIG,
    platform: preset,
    albumsEnabled: behavior.albumsSupported,
    documentPreviewEnabled: behavior.documentPreviewSupported,
    ...overrides,
  };
}

/**
 * Create initial browser state from config
 */
export function createBrowserState(
  config: MediaBrowserConfig,
): MediaBrowserState {
  return {
    ...DEFAULT_BROWSER_STATE,
    activeTab: config.defaultTab,
    viewMode: config.defaultViewMode,
    grouping: config.defaultGrouping,
    pagination: {
      ...DEFAULT_BROWSER_STATE.pagination,
      limit: config.pageSize,
    },
  };
}

// ============================================================================
// Browse & Filter Functions
// ============================================================================

/**
 * Browse media items with full filtering, sorting, grouping, and pagination
 */
export function browseMedia(
  items: MediaItem[],
  state: MediaBrowserState,
  config: MediaBrowserConfig,
): BrowseResult {
  // Apply tab-based type filter
  let filtered = applyTabFilter(items, state.activeTab);

  // Apply user filters
  filtered = filterMediaItems(filtered, state.filters);

  // Apply search if active
  if (state.isSearchActive && state.searchQuery.trim()) {
    const searchResults = searchMedia(filtered, state.searchQuery);
    filtered = searchResults.map((r) => r.item);
  }

  const filteredCount = filtered.length;

  // Apply sorting
  const sorted = sortMediaItems(filtered, state.sorting);

  // Apply grouping
  let groups: Map<string, MediaItem[]> | null = null;
  if (state.grouping !== "none") {
    groups = applyGrouping(sorted, state.grouping);
  }

  // Apply pagination
  const totalPages = Math.ceil(sorted.length / state.pagination.limit);
  const startIndex = (state.pagination.page - 1) * state.pagination.limit;
  const endIndex = startIndex + state.pagination.limit;
  const paginatedItems = sorted.slice(startIndex, endIndex);

  const pagination: MediaPagination = {
    page: state.pagination.page,
    limit: state.pagination.limit,
    total: sorted.length,
    totalPages,
    hasMore: state.pagination.page < totalPages,
    cursor:
      paginatedItems.length > 0
        ? paginatedItems[paginatedItems.length - 1].id
        : null,
  };

  return {
    items: paginatedItems,
    groups,
    totalCount: items.length,
    filteredCount,
    pagination,
  };
}

/**
 * Apply tab-based type filtering
 */
export function applyTabFilter(
  items: MediaItem[],
  tab: BrowserTab,
): MediaItem[] {
  switch (tab) {
    case "media":
      return items.filter((item) =>
        ["image", "video", "audio"].includes(item.fileType),
      );
    case "documents":
      return items.filter((item) =>
        ["document", "archive", "other"].includes(item.fileType),
      );
    case "links":
      // Links would typically be extracted from message content
      // For now, filter items that have URLs in their metadata
      return items.filter(
        (item) => item.url && item.metadata?.["isLink"] === true,
      );
    case "albums":
      // Albums tab shows all items (albums are displayed separately)
      return items;
    default:
      return items;
  }
}

/**
 * Apply grouping to items
 */
export function applyGrouping(
  items: MediaItem[],
  mode: GroupingMode,
): Map<string, MediaItem[]> {
  switch (mode) {
    case "date":
      return groupByDate(items);
    case "type": {
      const typeGroups = groupByType(items);
      const result = new Map<string, MediaItem[]>();
      for (const [type, typeItems] of typeGroups) {
        result.set(type, typeItems);
      }
      return result;
    }
    case "sender": {
      const senderGroups = groupBySender(items);
      const result = new Map<string, MediaItem[]>();
      for (const [userId, group] of senderGroups) {
        result.set(group.user.displayName || userId, group.items);
      }
      return result;
    }
    case "channel": {
      const groups = new Map<string, MediaItem[]>();
      for (const item of items) {
        const key = item.channelName || item.channelId || "Unknown Channel";
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      }
      return groups;
    }
    default:
      return new Map();
  }
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search media within the browser context
 */
export function browserSearch(
  items: MediaItem[],
  query: string,
  state: MediaBrowserState,
  options?: SearchOptions,
): SearchResult[] {
  // First apply tab filter
  const tabFiltered = applyTabFilter(items, state.activeTab);

  // Then search with filters
  return searchWithFilters(tabFiltered, query, state.filters, options);
}

/**
 * Search media by type within browser
 */
export function searchByMediaType(
  items: MediaItem[],
  types: MediaType[],
): MediaItem[] {
  return items.filter((item) => types.includes(item.fileType));
}

/**
 * Search media by date range
 */
export function searchByDateRange(
  items: MediaItem[],
  startDate: Date,
  endDate: Date,
): MediaItem[] {
  return items.filter((item) => {
    const date = new Date(item.createdAt);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Search media by sender
 */
export function searchBySender(
  items: MediaItem[],
  userId: string,
): MediaItem[] {
  return items.filter((item) => item.uploadedBy.id === userId);
}

/**
 * Search media by channel
 */
export function searchByChannel(
  items: MediaItem[],
  channelId: string,
): MediaItem[] {
  return items.filter((item) => item.channelId === channelId);
}

/**
 * Search media by file extension
 */
export function searchByExtension(
  items: MediaItem[],
  extensions: string[],
): MediaItem[] {
  const normalizedExtensions = extensions.map((e) =>
    e.toLowerCase().replace(/^\./, ""),
  );
  return items.filter((item) =>
    normalizedExtensions.includes(item.fileExtension.toLowerCase()),
  );
}

/**
 * Search media by size range
 */
export function searchBySizeRange(
  items: MediaItem[],
  minSize?: number,
  maxSize?: number,
): MediaItem[] {
  return items.filter((item) => {
    if (minSize !== undefined && item.fileSize < minSize) return false;
    if (maxSize !== undefined && item.fileSize > maxSize) return false;
    return true;
  });
}

// ============================================================================
// Selection Functions
// ============================================================================

/**
 * Toggle item selection
 */
export function toggleItemSelection(
  state: MediaBrowserState,
  itemId: string,
  maxSelection: number,
): Set<string> {
  const newSelected = new Set(state.selectedIds);

  if (newSelected.has(itemId)) {
    newSelected.delete(itemId);
  } else if (newSelected.size < maxSelection) {
    newSelected.add(itemId);
  }

  return newSelected;
}

/**
 * Select range of items (shift+click)
 */
export function selectItemRange(
  items: MediaItem[],
  fromId: string,
  toId: string,
  existing: Set<string>,
): Set<string> {
  const fromIndex = items.findIndex((i) => i.id === fromId);
  const toIndex = items.findIndex((i) => i.id === toId);

  if (fromIndex === -1 || toIndex === -1) return existing;

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);

  const newSelected = new Set(existing);
  for (let i = start; i <= end; i++) {
    newSelected.add(items[i].id);
  }

  return newSelected;
}

/**
 * Select all visible items
 */
export function selectAllItems(items: MediaItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/**
 * Clear all selections
 */
export function clearSelection(): Set<string> {
  return new Set();
}

/**
 * Get selected items from IDs
 */
export function getSelectedItems(
  items: MediaItem[],
  selectedIds: Set<string>,
): MediaItem[] {
  return items.filter((item) => selectedIds.has(item.id));
}

// ============================================================================
// Album Integration Functions
// ============================================================================

/**
 * Create album from selected items
 */
export function createAlbumFromSelection(
  items: MediaItem[],
  selectedIds: Set<string>,
  name: string,
  userId: string,
  channelId?: string,
): Album {
  const selectedItems = items.filter((i) => selectedIds.has(i.id));
  return createAlbum({
    name,
    type: "custom",
    itemIds: selectedItems.map((i) => i.id),
    createdBy: userId,
    channelId,
  });
}

/**
 * Generate auto-albums for a set of media items
 */
export function generateAutoAlbums(
  items: MediaItem[],
  channelId?: string,
): Album[] {
  return createAutoAlbums(items, channelId);
}

/**
 * Get items belonging to an album
 */
export function getAlbumItems(items: MediaItem[], album: Album): MediaItem[] {
  const idSet = new Set(album.itemIds);
  return items.filter((item) => idSet.has(item.id));
}

/**
 * Add items to album
 */
export function addItemsToAlbum(album: Album, itemIds: string[]): Album {
  const existingIds = new Set(album.itemIds);
  const newIds = itemIds.filter((id) => !existingIds.has(id));

  return {
    ...album,
    itemIds: [...album.itemIds, ...newIds],
    itemCount: album.itemCount + newIds.length,
    updatedAt: new Date(),
  };
}

/**
 * Remove items from album
 */
export function removeItemsFromAlbum(
  album: Album,
  itemIdsToRemove: string[],
): Album {
  const removeSet = new Set(itemIdsToRemove);
  const remaining = album.itemIds.filter((id) => !removeSet.has(id));

  return {
    ...album,
    itemIds: remaining,
    itemCount: remaining.length,
    coverItemId: removeSet.has(album.coverItemId || "")
      ? remaining[0] || null
      : album.coverItemId,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Statistics & Summary
// ============================================================================

/**
 * Get comprehensive browser statistics
 */
export function getBrowserStats(
  items: MediaItem[],
  albums: Album[],
): MediaBrowserStats {
  const byType: Record<MediaType, number> = {
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    archive: 0,
    other: 0,
  };

  const byChannel = new Map<string, number>();
  const bySender = new Map<string, number>();

  let totalSize = 0;
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const item of items) {
    byType[item.fileType]++;
    totalSize += item.fileSize;

    const channel = item.channelId || "unknown";
    byChannel.set(channel, (byChannel.get(channel) || 0) + 1);

    const sender = item.uploadedBy.id;
    bySender.set(sender, (bySender.get(sender) || 0) + 1);

    const date = new Date(item.createdAt);
    if (!earliest || date < earliest) earliest = date;
    if (!latest || date > latest) latest = date;
  }

  return {
    totalItems: items.length,
    totalSize,
    byType,
    byChannel,
    bySender,
    albumCount: albums.length,
    dateRange: { earliest, latest },
  };
}

/**
 * Get summary text for current browse state
 */
export function getBrowseSummary(
  result: BrowseResult,
  state: MediaBrowserState,
): string {
  const parts: string[] = [];

  if (state.isSearchActive && state.searchQuery) {
    parts.push(`Search: "${state.searchQuery}"`);
  }

  parts.push(
    `${result.filteredCount} item${result.filteredCount !== 1 ? "s" : ""}`,
  );

  if (result.filteredCount !== result.totalCount) {
    parts.push(`(${result.totalCount} total)`);
  }

  if (state.pagination.totalPages > 1) {
    parts.push(
      `Page ${state.pagination.page} of ${result.pagination.totalPages}`,
    );
  }

  return parts.join(" - ");
}

// ============================================================================
// View Mode Helpers
// ============================================================================

/**
 * Get grid columns for current viewport and platform
 */
export function getGridColumns(
  platform: PlatformPreset,
  viewport: "mobile" | "tablet" | "desktop",
): number {
  const behavior = getPlatformBehavior(platform);
  return behavior.gridColumns[viewport];
}

/**
 * Get thumbnail size in pixels
 */
export function getThumbnailSize(size: "small" | "medium" | "large"): number {
  return THUMBNAIL_SIZES[size];
}

/**
 * Check if view mode is available for the current tab
 */
export function isViewModeAvailable(
  viewMode: MediaViewMode,
  tab: BrowserTab,
): boolean {
  switch (tab) {
    case "media":
      return true; // All modes available for media
    case "documents":
      return viewMode === "list" || viewMode === "grid"; // List preferred for documents
    case "links":
      return viewMode === "list"; // Links always list view
    case "albums":
      return viewMode === "grid" || viewMode === "masonry"; // Albums are visual
    default:
      return true;
  }
}

/**
 * Get recommended view mode for a tab
 */
export function getRecommendedViewMode(tab: BrowserTab): MediaViewMode {
  switch (tab) {
    case "media":
      return "grid";
    case "documents":
      return "list";
    case "links":
      return "list";
    case "albums":
      return "grid";
    default:
      return "grid";
  }
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Calculate next focused item based on keyboard input
 */
export function getNextFocusedItem(
  items: MediaItem[],
  currentId: string | null,
  direction: "up" | "down" | "left" | "right",
  columns: number,
): string | null {
  if (items.length === 0) return null;
  if (!currentId) return items[0]?.id || null;

  const currentIndex = items.findIndex((i) => i.id === currentId);
  if (currentIndex === -1) return items[0]?.id || null;

  let nextIndex: number;

  switch (direction) {
    case "left":
      nextIndex = Math.max(0, currentIndex - 1);
      break;
    case "right":
      nextIndex = Math.min(items.length - 1, currentIndex + 1);
      break;
    case "up":
      nextIndex = Math.max(0, currentIndex - columns);
      break;
    case "down":
      nextIndex = Math.min(items.length - 1, currentIndex + columns);
      break;
    default:
      nextIndex = currentIndex;
  }

  return items[nextIndex]?.id || null;
}

// ============================================================================
// Platform-Aware Utility Functions
// ============================================================================

/**
 * Check if a media type is previewable on the current platform
 */
export function isTypePreviewable(
  mimeType: string,
  platform: PlatformPreset,
): boolean {
  const behavior = getPlatformBehavior(platform);
  const category = getFileCategory(mimeType) as MediaType;
  return behavior.previewableTypes.includes(category);
}

/**
 * Get attachment layout style for platform
 */
export function getAttachmentLayout(
  platform: PlatformPreset,
): "grid" | "stacked" | "carousel" {
  return getPlatformBehavior(platform).attachmentLayout;
}

/**
 * Get maximum gallery items for platform
 */
export function getMaxGalleryItems(platform: PlatformPreset): number {
  return getPlatformBehavior(platform).maxGalleryItems;
}

/**
 * Check if feature is available on platform
 */
export function isFeatureAvailable(
  feature: "albums" | "documentPreview" | "autoCompress" | "stripExif",
  platform: PlatformPreset,
): boolean {
  const behavior = getPlatformBehavior(platform);

  switch (feature) {
    case "albums":
      return behavior.albumsSupported;
    case "documentPreview":
      return behavior.documentPreviewSupported;
    case "autoCompress":
      return behavior.autoCompress;
    case "stripExif":
      return behavior.stripExif;
    default:
      return false;
  }
}

// ============================================================================
// Export for convenience
// ============================================================================

export {
  createAlbum,
  createAutoAlbums,
  sortAlbums,
  filterAlbumsByType,
  getAlbumStats,
  mergeAlbums,
  getAlbumCoverCandidates,
} from "./albums";

export type { Album, AlbumType, AlbumSortBy } from "./albums";

export {
  getDocumentPreviewConfig,
  canPreviewDocument,
  getPreviewCapabilities,
} from "./document-preview";

export type {
  DocumentPreviewConfig,
  DocumentPreviewResult,
} from "./document-preview";
