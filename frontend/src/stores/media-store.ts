/**
 * Media Store - Zustand store for media gallery state management
 *
 * Manages gallery items, filters, sorting, selection, and viewer state.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  MediaItem,
  MediaFilters,
  MediaSorting,
  MediaPagination,
  MediaViewMode,
  ViewerState,
  defaultMediaFilters,
  defaultViewerState,
  MediaType,
  MediaFilterTab,
  GALLERY_PAGE_SIZE,
} from "@/lib/media/media-types";
import {
  filterMediaItems,
  sortMediaItems,
  hasActiveFilters,
  getActiveFilterCount,
  getNavigationState,
  getNextIndex,
  getPreviousIndex,
  findItemIndex,
} from "@/lib/media/media-gallery";

// ============================================================================
// Types
// ============================================================================

export interface MediaState {
  // Items
  items: MediaItem[];
  filteredItems: MediaItem[];

  // Loading state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Filters
  filters: MediaFilters;

  // Sorting
  sorting: MediaSorting;

  // Pagination
  pagination: MediaPagination;

  // View mode
  viewMode: MediaViewMode;

  // Selection
  selectedItems: Set<string>;
  isSelectMode: boolean;
  lastSelectedId: string | null;

  // Viewer state
  viewer: ViewerState;

  // Context (for scoped galleries)
  context: {
    channelId: string | null;
    threadId: string | null;
    userId: string | null;
  };
}

export interface MediaActions {
  // Item management
  setItems: (items: MediaItem[]) => void;
  addItems: (items: MediaItem[]) => void;
  removeItem: (itemId: string) => void;
  removeItems: (itemIds: string[]) => void;
  updateItem: (itemId: string, updates: Partial<MediaItem>) => void;
  clearItems: () => void;

  // Loading state
  setLoading: (isLoading: boolean) => void;
  setLoadingMore: (isLoadingMore: boolean) => void;
  setError: (error: string | null) => void;

  // Filters
  setFilters: (filters: Partial<MediaFilters>) => void;
  setTypeFilter: (type: MediaFilterTab) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // Sorting
  setSorting: (sorting: Partial<MediaSorting>) => void;
  toggleSortDirection: () => void;

  // Pagination
  setPagination: (pagination: Partial<MediaPagination>) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // View mode
  setViewMode: (mode: MediaViewMode) => void;

  // Selection
  selectItem: (itemId: string) => void;
  deselectItem: (itemId: string) => void;
  toggleSelection: (itemId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectRange: (itemId: string) => void;
  setSelectMode: (enabled: boolean) => void;
  getSelectedItems: () => MediaItem[];

  // Viewer
  openViewer: (itemId: string) => void;
  closeViewer: () => void;
  nextItem: () => void;
  previousItem: () => void;
  goToItem: (index: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setRotation: (degrees: number) => void;
  resetView: () => void;
  toggleFullscreen: () => void;
  toggleInfo: () => void;
  toggleControls: () => void;

  // Video/Audio player
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  setPlaybackRate: (rate: number) => void;

  // Carousel
  setCarouselMode: (enabled: boolean) => void;
  setCarouselAutoplay: (enabled: boolean) => void;
  setCarouselInterval: (ms: number) => void;

  // Context
  setContext: (context: {
    channelId?: string | null;
    threadId?: string | null;
    userId?: string | null;
  }) => void;
  clearContext: () => void;

  // Utility
  applyFiltersAndSort: () => void;
  reset: () => void;
}

export type MediaStore = MediaState & MediaActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: MediaState = {
  items: [],
  filteredItems: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filters: { ...defaultMediaFilters },
  sorting: {
    sortBy: "date_desc",
    direction: "desc",
  },
  pagination: {
    page: 1,
    limit: GALLERY_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasMore: false,
    cursor: null,
  },
  viewMode: "grid",
  selectedItems: new Set(),
  isSelectMode: false,
  lastSelectedId: null,
  viewer: { ...defaultViewerState },
  context: {
    channelId: null,
    threadId: null,
    userId: null,
  },
};

// ============================================================================
// Store
// ============================================================================

export const useMediaStore = create<MediaStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // ================================================================
          // Item Management
          // ================================================================

          setItems: (items) =>
            set(
              (state) => {
                state.items = items;
                state.pagination.total = items.length;
                state.pagination.totalPages = Math.ceil(
                  items.length / state.pagination.limit,
                );
              },
              false,
              "media/setItems",
            ),

          addItems: (items) =>
            set(
              (state) => {
                state.items.push(...items);
                state.pagination.total = state.items.length;
                state.pagination.totalPages = Math.ceil(
                  state.items.length / state.pagination.limit,
                );
              },
              false,
              "media/addItems",
            ),

          removeItem: (itemId) =>
            set(
              (state) => {
                state.items = state.items.filter((item) => item.id !== itemId);
                state.filteredItems = state.filteredItems.filter(
                  (item) => item.id !== itemId,
                );
                state.selectedItems.delete(itemId);
                state.pagination.total = state.items.length;
              },
              false,
              "media/removeItem",
            ),

          removeItems: (itemIds) =>
            set(
              (state) => {
                const idSet = new Set(itemIds);
                state.items = state.items.filter((item) => !idSet.has(item.id));
                state.filteredItems = state.filteredItems.filter(
                  (item) => !idSet.has(item.id),
                );
                itemIds.forEach((id) => state.selectedItems.delete(id));
                state.pagination.total = state.items.length;
              },
              false,
              "media/removeItems",
            ),

          updateItem: (itemId, updates) =>
            set(
              (state) => {
                const index = state.items.findIndex(
                  (item) => item.id === itemId,
                );
                if (index !== -1) {
                  state.items[index] = { ...state.items[index], ...updates };
                }
                const filteredIndex = state.filteredItems.findIndex(
                  (item) => item.id === itemId,
                );
                if (filteredIndex !== -1) {
                  state.filteredItems[filteredIndex] = {
                    ...state.filteredItems[filteredIndex],
                    ...updates,
                  };
                }
              },
              false,
              "media/updateItem",
            ),

          clearItems: () =>
            set(
              (state) => {
                state.items = [];
                state.filteredItems = [];
                state.pagination.total = 0;
                state.pagination.totalPages = 0;
              },
              false,
              "media/clearItems",
            ),

          // ================================================================
          // Loading State
          // ================================================================

          setLoading: (isLoading) =>
            set(
              (state) => {
                state.isLoading = isLoading;
              },
              false,
              "media/setLoading",
            ),

          setLoadingMore: (isLoadingMore) =>
            set(
              (state) => {
                state.isLoadingMore = isLoadingMore;
              },
              false,
              "media/setLoadingMore",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "media/setError",
            ),

          // ================================================================
          // Filters
          // ================================================================

          setFilters: (filters) =>
            set(
              (state) => {
                state.filters = { ...state.filters, ...filters };
                state.pagination.page = 1;
              },
              false,
              "media/setFilters",
            ),

          setTypeFilter: (type) =>
            set(
              (state) => {
                state.filters.type = type;
                state.pagination.page = 1;
              },
              false,
              "media/setTypeFilter",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.filters.searchQuery = query;
                state.pagination.page = 1;
              },
              false,
              "media/setSearchQuery",
            ),

          setDateRange: (start, end) =>
            set(
              (state) => {
                state.filters.dateRange = { start, end };
                state.pagination.page = 1;
              },
              false,
              "media/setDateRange",
            ),

          clearFilters: () =>
            set(
              (state) => {
                state.filters = { ...defaultMediaFilters };
                state.pagination.page = 1;
              },
              false,
              "media/clearFilters",
            ),

          hasActiveFilters: () => hasActiveFilters(get().filters),

          getActiveFilterCount: () => getActiveFilterCount(get().filters),

          // ================================================================
          // Sorting
          // ================================================================

          setSorting: (sorting) =>
            set(
              (state) => {
                state.sorting = { ...state.sorting, ...sorting };
              },
              false,
              "media/setSorting",
            ),

          toggleSortDirection: () =>
            set(
              (state) => {
                state.sorting.direction =
                  state.sorting.direction === "asc" ? "desc" : "asc";
              },
              false,
              "media/toggleSortDirection",
            ),

          // ================================================================
          // Pagination
          // ================================================================

          setPagination: (pagination) =>
            set(
              (state) => {
                state.pagination = { ...state.pagination, ...pagination };
              },
              false,
              "media/setPagination",
            ),

          nextPage: () =>
            set(
              (state) => {
                if (state.pagination.page < state.pagination.totalPages) {
                  state.pagination.page++;
                }
              },
              false,
              "media/nextPage",
            ),

          previousPage: () =>
            set(
              (state) => {
                if (state.pagination.page > 1) {
                  state.pagination.page--;
                }
              },
              false,
              "media/previousPage",
            ),

          goToPage: (page) =>
            set(
              (state) => {
                state.pagination.page = Math.max(
                  1,
                  Math.min(page, state.pagination.totalPages),
                );
              },
              false,
              "media/goToPage",
            ),

          setPageSize: (size) =>
            set(
              (state) => {
                state.pagination.limit = size;
                state.pagination.totalPages = Math.ceil(
                  state.pagination.total / size,
                );
                state.pagination.page = 1;
              },
              false,
              "media/setPageSize",
            ),

          // ================================================================
          // View Mode
          // ================================================================

          setViewMode: (mode) =>
            set(
              (state) => {
                state.viewMode = mode;
              },
              false,
              "media/setViewMode",
            ),

          // ================================================================
          // Selection
          // ================================================================

          selectItem: (itemId) =>
            set(
              (state) => {
                state.selectedItems.add(itemId);
                state.lastSelectedId = itemId;
              },
              false,
              "media/selectItem",
            ),

          deselectItem: (itemId) =>
            set(
              (state) => {
                state.selectedItems.delete(itemId);
              },
              false,
              "media/deselectItem",
            ),

          toggleSelection: (itemId) =>
            set(
              (state) => {
                if (state.selectedItems.has(itemId)) {
                  state.selectedItems.delete(itemId);
                } else {
                  state.selectedItems.add(itemId);
                  state.lastSelectedId = itemId;
                }
              },
              false,
              "media/toggleSelection",
            ),

          selectAll: () =>
            set(
              (state) => {
                state.selectedItems = new Set(
                  state.filteredItems.map((item) => item.id),
                );
              },
              false,
              "media/selectAll",
            ),

          clearSelection: () =>
            set(
              (state) => {
                state.selectedItems = new Set();
                state.lastSelectedId = null;
              },
              false,
              "media/clearSelection",
            ),

          selectRange: (itemId) =>
            set(
              (state) => {
                if (!state.lastSelectedId) {
                  state.selectedItems.add(itemId);
                  state.lastSelectedId = itemId;
                  return;
                }

                const startIndex = state.filteredItems.findIndex(
                  (item) => item.id === state.lastSelectedId,
                );
                const endIndex = state.filteredItems.findIndex(
                  (item) => item.id === itemId,
                );

                if (startIndex === -1 || endIndex === -1) return;

                const start = Math.min(startIndex, endIndex);
                const end = Math.max(startIndex, endIndex);

                for (let i = start; i <= end; i++) {
                  state.selectedItems.add(state.filteredItems[i].id);
                }
              },
              false,
              "media/selectRange",
            ),

          setSelectMode: (enabled) =>
            set(
              (state) => {
                state.isSelectMode = enabled;
                if (!enabled) {
                  state.selectedItems = new Set();
                  state.lastSelectedId = null;
                }
              },
              false,
              "media/setSelectMode",
            ),

          getSelectedItems: () => {
            const state = get();
            return state.items.filter((item) =>
              state.selectedItems.has(item.id),
            );
          },

          // ================================================================
          // Viewer
          // ================================================================

          openViewer: (itemId) =>
            set(
              (state) => {
                const index = findItemIndex(state.filteredItems, itemId);
                if (index !== -1) {
                  state.viewer.isOpen = true;
                  state.viewer.currentItem = state.filteredItems[index];
                  state.viewer.currentIndex = index;
                  state.viewer.items = state.filteredItems;
                }
              },
              false,
              "media/openViewer",
            ),

          closeViewer: () =>
            set(
              (state) => {
                state.viewer = { ...defaultViewerState };
              },
              false,
              "media/closeViewer",
            ),

          nextItem: () =>
            set(
              (state) => {
                const nextIndex = getNextIndex(
                  state.viewer.currentIndex,
                  state.viewer.items.length,
                  state.viewer.isCarouselMode,
                );
                if (nextIndex !== state.viewer.currentIndex) {
                  state.viewer.currentIndex = nextIndex;
                  state.viewer.currentItem = state.viewer.items[nextIndex];
                  // Reset view state for new item
                  state.viewer.zoom = 1;
                  state.viewer.panX = 0;
                  state.viewer.panY = 0;
                  state.viewer.rotation = 0;
                }
              },
              false,
              "media/nextItem",
            ),

          previousItem: () =>
            set(
              (state) => {
                const prevIndex = getPreviousIndex(
                  state.viewer.currentIndex,
                  state.viewer.items.length,
                  state.viewer.isCarouselMode,
                );
                if (prevIndex !== state.viewer.currentIndex) {
                  state.viewer.currentIndex = prevIndex;
                  state.viewer.currentItem = state.viewer.items[prevIndex];
                  state.viewer.zoom = 1;
                  state.viewer.panX = 0;
                  state.viewer.panY = 0;
                  state.viewer.rotation = 0;
                }
              },
              false,
              "media/previousItem",
            ),

          goToItem: (index) =>
            set(
              (state) => {
                if (index >= 0 && index < state.viewer.items.length) {
                  state.viewer.currentIndex = index;
                  state.viewer.currentItem = state.viewer.items[index];
                  state.viewer.zoom = 1;
                  state.viewer.panX = 0;
                  state.viewer.panY = 0;
                  state.viewer.rotation = 0;
                }
              },
              false,
              "media/goToItem",
            ),

          setZoom: (zoom) =>
            set(
              (state) => {
                state.viewer.zoom = Math.max(0.1, Math.min(5, zoom));
              },
              false,
              "media/setZoom",
            ),

          setPan: (x, y) =>
            set(
              (state) => {
                state.viewer.panX = x;
                state.viewer.panY = y;
              },
              false,
              "media/setPan",
            ),

          setRotation: (degrees) =>
            set(
              (state) => {
                state.viewer.rotation = degrees % 360;
              },
              false,
              "media/setRotation",
            ),

          resetView: () =>
            set(
              (state) => {
                state.viewer.zoom = 1;
                state.viewer.panX = 0;
                state.viewer.panY = 0;
                state.viewer.rotation = 0;
              },
              false,
              "media/resetView",
            ),

          toggleFullscreen: () =>
            set(
              (state) => {
                state.viewer.isFullscreen = !state.viewer.isFullscreen;
              },
              false,
              "media/toggleFullscreen",
            ),

          toggleInfo: () =>
            set(
              (state) => {
                state.viewer.showInfo = !state.viewer.showInfo;
              },
              false,
              "media/toggleInfo",
            ),

          toggleControls: () =>
            set(
              (state) => {
                state.viewer.showControls = !state.viewer.showControls;
              },
              false,
              "media/toggleControls",
            ),

          // ================================================================
          // Video/Audio Player
          // ================================================================

          setPlaying: (isPlaying) =>
            set(
              (state) => {
                state.viewer.isPlaying = isPlaying;
              },
              false,
              "media/setPlaying",
            ),

          setCurrentTime: (time) =>
            set(
              (state) => {
                state.viewer.currentTime = time;
              },
              false,
              "media/setCurrentTime",
            ),

          setVolume: (volume) =>
            set(
              (state) => {
                state.viewer.volume = Math.max(0, Math.min(1, volume));
              },
              false,
              "media/setVolume",
            ),

          setMuted: (isMuted) =>
            set(
              (state) => {
                state.viewer.isMuted = isMuted;
              },
              false,
              "media/setMuted",
            ),

          setPlaybackRate: (rate) =>
            set(
              (state) => {
                state.viewer.playbackRate = rate;
              },
              false,
              "media/setPlaybackRate",
            ),

          // ================================================================
          // Carousel
          // ================================================================

          setCarouselMode: (enabled) =>
            set(
              (state) => {
                state.viewer.isCarouselMode = enabled;
              },
              false,
              "media/setCarouselMode",
            ),

          setCarouselAutoplay: (enabled) =>
            set(
              (state) => {
                state.viewer.carouselAutoplay = enabled;
              },
              false,
              "media/setCarouselAutoplay",
            ),

          setCarouselInterval: (ms) =>
            set(
              (state) => {
                state.viewer.carouselInterval = ms;
              },
              false,
              "media/setCarouselInterval",
            ),

          // ================================================================
          // Context
          // ================================================================

          setContext: (context) =>
            set(
              (state) => {
                if (context.channelId !== undefined)
                  state.context.channelId = context.channelId;
                if (context.threadId !== undefined)
                  state.context.threadId = context.threadId;
                if (context.userId !== undefined)
                  state.context.userId = context.userId;
              },
              false,
              "media/setContext",
            ),

          clearContext: () =>
            set(
              (state) => {
                state.context = {
                  channelId: null,
                  threadId: null,
                  userId: null,
                };
              },
              false,
              "media/clearContext",
            ),

          // ================================================================
          // Utility
          // ================================================================

          applyFiltersAndSort: () =>
            set(
              (state) => {
                let result = filterMediaItems(state.items, state.filters);
                result = sortMediaItems(result, state.sorting);
                state.filteredItems = result;
                state.pagination.total = result.length;
                state.pagination.totalPages = Math.ceil(
                  result.length / state.pagination.limit,
                );
                state.pagination.hasMore =
                  state.pagination.page < state.pagination.totalPages;
              },
              false,
              "media/applyFiltersAndSort",
            ),

          reset: () =>
            set(
              () => ({
                ...initialState,
                selectedItems: new Set(),
              }),
              false,
              "media/reset",
            ),
        })),
        {
          name: "nchat-media-store",
          partialize: (state) => ({
            viewMode: state.viewMode,
            sorting: state.sorting,
          }),
        },
      ),
    ),
    { name: "media-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectMediaItems = (state: MediaStore) => state.items;
export const selectFilteredMediaItems = (state: MediaStore) =>
  state.filteredItems;
export const selectMediaLoading = (state: MediaStore) => state.isLoading;
export const selectMediaLoadingMore = (state: MediaStore) =>
  state.isLoadingMore;
export const selectMediaError = (state: MediaStore) => state.error;
export const selectMediaFilters = (state: MediaStore) => state.filters;
export const selectMediaSorting = (state: MediaStore) => state.sorting;
export const selectMediaPagination = (state: MediaStore) => state.pagination;
export const selectMediaViewMode = (state: MediaStore) => state.viewMode;
export const selectSelectedMediaItems = (state: MediaStore) =>
  state.selectedItems;
export const selectIsSelectMode = (state: MediaStore) => state.isSelectMode;
export const selectMediaViewer = (state: MediaStore) => state.viewer;
export const selectIsViewerOpen = (state: MediaStore) => state.viewer.isOpen;
export const selectCurrentViewerItem = (state: MediaStore) =>
  state.viewer.currentItem;
export const selectMediaContext = (state: MediaStore) => state.context;

export const selectMediaByType = (type: MediaType) => (state: MediaStore) =>
  state.items.filter((item) => item.fileType === type);

export const selectMediaByChannel =
  (channelId: string) => (state: MediaStore) =>
    state.items.filter((item) => item.channelId === channelId);

export const selectSelectionCount = (state: MediaStore) =>
  state.selectedItems.size;

export const selectHasSelection = (state: MediaStore) =>
  state.selectedItems.size > 0;
