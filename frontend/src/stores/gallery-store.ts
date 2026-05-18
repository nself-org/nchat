/**
 * Gallery Store - Zustand store for media gallery state management
 *
 * Manages gallery items organized by channel, lightbox state,
 * carousel navigation, and media viewer controls.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type MediaType = "image" | "video" | "audio" | "document" | "other";

export interface GalleryItem {
  id: string;
  fileName: string;
  fileType: MediaType;
  mimeType: string;
  fileSize: number;
  url: string;
  thumbnailUrl: string | null;
  previewUrl?: string | null;
  downloadUrl?: string;
  channelId: string | null;
  messageId: string | null;
  uploadedBy: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: unknown;
  };
}

export interface LightboxState {
  isOpen: boolean;
  currentItem: GalleryItem | null;
  currentIndex: number;
  items: GalleryItem[];
}

export interface CarouselState {
  enabled: boolean;
  autoplay: boolean;
  interval: number;
  loop: boolean;
}

export interface ViewerControls {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showInfo: boolean;
  showControls: boolean;
}

export interface GalleryState {
  // Items organized by channel
  itemsByChannel: Map<string, GalleryItem[]>;

  // All items (flattened)
  allItems: GalleryItem[];

  // Lightbox state
  lightbox: LightboxState;

  // Carousel state
  carousel: CarouselState;

  // Viewer controls
  controls: ViewerControls;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Selection
  selectedItems: Set<string>;
  isSelectMode: boolean;
}

export interface GalleryActions {
  // Item management
  setItemsForChannel: (channelId: string, items: GalleryItem[]) => void;
  addItemsToChannel: (channelId: string, items: GalleryItem[]) => void;
  removeItemFromChannel: (channelId: string, itemId: string) => void;
  updateItem: (itemId: string, updates: Partial<GalleryItem>) => void;
  clearChannel: (channelId: string) => void;
  clearAllItems: () => void;
  getItemsByChannel: (channelId: string) => GalleryItem[];

  // Lightbox
  openLightbox: (items: GalleryItem[], startIndex?: number) => void;
  openLightboxWithItem: (item: GalleryItem, context?: GalleryItem[]) => void;
  closeLightbox: () => void;
  nextItem: () => void;
  previousItem: () => void;
  goToItem: (index: number) => void;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;

  // Carousel
  setCarouselEnabled: (enabled: boolean) => void;
  setCarouselAutoplay: (autoplay: boolean) => void;
  setCarouselInterval: (interval: number) => void;
  setCarouselLoop: (loop: boolean) => void;
  startCarousel: () => void;
  stopCarousel: () => void;

  // Viewer controls
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (x: number, y: number) => void;
  setRotation: (degrees: number) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  resetView: () => void;
  toggleFullscreen: () => void;
  toggleInfo: () => void;
  toggleControls: () => void;

  // Playback controls
  setPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Loading state
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Selection
  selectItem: (itemId: string) => void;
  deselectItem: (itemId: string) => void;
  toggleItemSelection: (itemId: string) => void;
  selectAll: (channelId?: string) => void;
  clearSelection: () => void;
  setSelectMode: (enabled: boolean) => void;
  getSelectedItems: () => GalleryItem[];

  // Utility
  reset: () => void;
}

export type GalleryStore = GalleryState & GalleryActions;

// ============================================================================
// Constants
// ============================================================================

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.25;
export const ROTATION_STEP = 90;
export const DEFAULT_CAROUSEL_INTERVAL = 5000;

// ============================================================================
// Initial State
// ============================================================================

const initialLightboxState: LightboxState = {
  isOpen: false,
  currentItem: null,
  currentIndex: 0,
  items: [],
};

const initialCarouselState: CarouselState = {
  enabled: false,
  autoplay: false,
  interval: DEFAULT_CAROUSEL_INTERVAL,
  loop: true,
};

const initialViewerControls: ViewerControls = {
  zoom: 1,
  panX: 0,
  panY: 0,
  rotation: 0,
  isPlaying: false,
  currentTime: 0,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  showInfo: false,
  showControls: true,
};

const initialState: GalleryState = {
  itemsByChannel: new Map(),
  allItems: [],
  lightbox: { ...initialLightboxState },
  carousel: { ...initialCarouselState },
  controls: { ...initialViewerControls },
  isLoading: false,
  error: null,
  selectedItems: new Set(),
  isSelectMode: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

function flattenItems(
  itemsByChannel: Map<string, GalleryItem[]>,
): GalleryItem[] {
  const all: GalleryItem[] = [];
  const seen = new Set<string>();

  itemsByChannel.forEach((items) => {
    items.forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    });
  });

  return all;
}

// ============================================================================
// Store
// ============================================================================

export const useGalleryStore = create<GalleryStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ================================================================
        // Item Management
        // ================================================================

        setItemsForChannel: (channelId, items) =>
          set(
            (state) => {
              state.itemsByChannel.set(channelId, items);
              state.allItems = flattenItems(state.itemsByChannel);
            },
            false,
            "gallery/setItemsForChannel",
          ),

        addItemsToChannel: (channelId, items) =>
          set(
            (state) => {
              const existing = state.itemsByChannel.get(channelId) || [];
              const existingIds = new Set(existing.map((i) => i.id));
              const newItems = items.filter((i) => !existingIds.has(i.id));
              state.itemsByChannel.set(channelId, [...existing, ...newItems]);
              state.allItems = flattenItems(state.itemsByChannel);
            },
            false,
            "gallery/addItemsToChannel",
          ),

        removeItemFromChannel: (channelId, itemId) =>
          set(
            (state) => {
              const items = state.itemsByChannel.get(channelId);
              if (items) {
                state.itemsByChannel.set(
                  channelId,
                  items.filter((i) => i.id !== itemId),
                );
                state.allItems = flattenItems(state.itemsByChannel);
              }
              state.selectedItems.delete(itemId);
            },
            false,
            "gallery/removeItemFromChannel",
          ),

        updateItem: (itemId, updates) =>
          set(
            (state) => {
              state.itemsByChannel.forEach((items, channelId) => {
                const index = items.findIndex((i) => i.id === itemId);
                if (index !== -1) {
                  state.itemsByChannel.set(channelId, [
                    ...items.slice(0, index),
                    { ...items[index], ...updates },
                    ...items.slice(index + 1),
                  ]);
                }
              });
              state.allItems = flattenItems(state.itemsByChannel);

              // Update lightbox if current item matches
              if (state.lightbox.currentItem?.id === itemId) {
                state.lightbox.currentItem = {
                  ...state.lightbox.currentItem,
                  ...updates,
                };
              }
            },
            false,
            "gallery/updateItem",
          ),

        clearChannel: (channelId) =>
          set(
            (state) => {
              state.itemsByChannel.delete(channelId);
              state.allItems = flattenItems(state.itemsByChannel);
            },
            false,
            "gallery/clearChannel",
          ),

        clearAllItems: () =>
          set(
            (state) => {
              state.itemsByChannel = new Map();
              state.allItems = [];
              state.selectedItems = new Set();
            },
            false,
            "gallery/clearAllItems",
          ),

        getItemsByChannel: (channelId) => {
          return get().itemsByChannel.get(channelId) || [];
        },

        // ================================================================
        // Lightbox
        // ================================================================

        openLightbox: (items, startIndex = 0) =>
          set(
            (state) => {
              state.lightbox.isOpen = true;
              state.lightbox.items = items;
              state.lightbox.currentIndex = Math.min(
                startIndex,
                items.length - 1,
              );
              state.lightbox.currentItem = items[state.lightbox.currentIndex];
              state.controls = { ...initialViewerControls };
            },
            false,
            "gallery/openLightbox",
          ),

        openLightboxWithItem: (item, context) =>
          set(
            (state) => {
              const items = context || [item];
              const index = items.findIndex((i) => i.id === item.id);
              state.lightbox.isOpen = true;
              state.lightbox.items = items;
              state.lightbox.currentIndex = index >= 0 ? index : 0;
              state.lightbox.currentItem = item;
              state.controls = { ...initialViewerControls };
            },
            false,
            "gallery/openLightboxWithItem",
          ),

        closeLightbox: () =>
          set(
            (state) => {
              state.lightbox = { ...initialLightboxState };
              state.controls = { ...initialViewerControls };
            },
            false,
            "gallery/closeLightbox",
          ),

        nextItem: () =>
          set(
            (state) => {
              const { items, currentIndex } = state.lightbox;
              if (items.length === 0) return;

              let nextIndex = currentIndex + 1;
              if (nextIndex >= items.length) {
                nextIndex = state.carousel.loop ? 0 : items.length - 1;
              }

              if (nextIndex !== currentIndex) {
                state.lightbox.currentIndex = nextIndex;
                state.lightbox.currentItem = items[nextIndex];
                state.controls = { ...initialViewerControls };
              }
            },
            false,
            "gallery/nextItem",
          ),

        previousItem: () =>
          set(
            (state) => {
              const { items, currentIndex } = state.lightbox;
              if (items.length === 0) return;

              let prevIndex = currentIndex - 1;
              if (prevIndex < 0) {
                prevIndex = state.carousel.loop ? items.length - 1 : 0;
              }

              if (prevIndex !== currentIndex) {
                state.lightbox.currentIndex = prevIndex;
                state.lightbox.currentItem = items[prevIndex];
                state.controls = { ...initialViewerControls };
              }
            },
            false,
            "gallery/previousItem",
          ),

        goToItem: (index) =>
          set(
            (state) => {
              const { items } = state.lightbox;
              if (index >= 0 && index < items.length) {
                state.lightbox.currentIndex = index;
                state.lightbox.currentItem = items[index];
                state.controls = { ...initialViewerControls };
              }
            },
            false,
            "gallery/goToItem",
          ),

        canGoNext: () => {
          const { items, currentIndex } = get().lightbox;
          const { loop } = get().carousel;
          return items.length > 1 && (loop || currentIndex < items.length - 1);
        },

        canGoPrevious: () => {
          const { items, currentIndex } = get().lightbox;
          const { loop } = get().carousel;
          return items.length > 1 && (loop || currentIndex > 0);
        },

        // ================================================================
        // Carousel
        // ================================================================

        setCarouselEnabled: (enabled) =>
          set(
            (state) => {
              state.carousel.enabled = enabled;
            },
            false,
            "gallery/setCarouselEnabled",
          ),

        setCarouselAutoplay: (autoplay) =>
          set(
            (state) => {
              state.carousel.autoplay = autoplay;
            },
            false,
            "gallery/setCarouselAutoplay",
          ),

        setCarouselInterval: (interval) =>
          set(
            (state) => {
              state.carousel.interval = interval;
            },
            false,
            "gallery/setCarouselInterval",
          ),

        setCarouselLoop: (loop) =>
          set(
            (state) => {
              state.carousel.loop = loop;
            },
            false,
            "gallery/setCarouselLoop",
          ),

        startCarousel: () =>
          set(
            (state) => {
              state.carousel.enabled = true;
              state.carousel.autoplay = true;
            },
            false,
            "gallery/startCarousel",
          ),

        stopCarousel: () =>
          set(
            (state) => {
              state.carousel.autoplay = false;
            },
            false,
            "gallery/stopCarousel",
          ),

        // ================================================================
        // Viewer Controls
        // ================================================================

        setZoom: (zoom) =>
          set(
            (state) => {
              state.controls.zoom = Math.max(
                MIN_ZOOM,
                Math.min(MAX_ZOOM, zoom),
              );
            },
            false,
            "gallery/setZoom",
          ),

        zoomIn: () =>
          set(
            (state) => {
              state.controls.zoom = Math.min(
                MAX_ZOOM,
                state.controls.zoom + ZOOM_STEP,
              );
            },
            false,
            "gallery/zoomIn",
          ),

        zoomOut: () =>
          set(
            (state) => {
              state.controls.zoom = Math.max(
                MIN_ZOOM,
                state.controls.zoom - ZOOM_STEP,
              );
            },
            false,
            "gallery/zoomOut",
          ),

        setPan: (x, y) =>
          set(
            (state) => {
              state.controls.panX = x;
              state.controls.panY = y;
            },
            false,
            "gallery/setPan",
          ),

        setRotation: (degrees) =>
          set(
            (state) => {
              state.controls.rotation = degrees % 360;
            },
            false,
            "gallery/setRotation",
          ),

        rotateLeft: () =>
          set(
            (state) => {
              state.controls.rotation =
                (state.controls.rotation - ROTATION_STEP + 360) % 360;
            },
            false,
            "gallery/rotateLeft",
          ),

        rotateRight: () =>
          set(
            (state) => {
              state.controls.rotation =
                (state.controls.rotation + ROTATION_STEP) % 360;
            },
            false,
            "gallery/rotateRight",
          ),

        resetView: () =>
          set(
            (state) => {
              state.controls.zoom = 1;
              state.controls.panX = 0;
              state.controls.panY = 0;
              state.controls.rotation = 0;
            },
            false,
            "gallery/resetView",
          ),

        toggleFullscreen: () =>
          set(
            (state) => {
              state.controls.isFullscreen = !state.controls.isFullscreen;
            },
            false,
            "gallery/toggleFullscreen",
          ),

        toggleInfo: () =>
          set(
            (state) => {
              state.controls.showInfo = !state.controls.showInfo;
            },
            false,
            "gallery/toggleInfo",
          ),

        toggleControls: () =>
          set(
            (state) => {
              state.controls.showControls = !state.controls.showControls;
            },
            false,
            "gallery/toggleControls",
          ),

        // ================================================================
        // Playback Controls
        // ================================================================

        setPlaying: (isPlaying) =>
          set(
            (state) => {
              state.controls.isPlaying = isPlaying;
            },
            false,
            "gallery/setPlaying",
          ),

        togglePlayback: () =>
          set(
            (state) => {
              state.controls.isPlaying = !state.controls.isPlaying;
            },
            false,
            "gallery/togglePlayback",
          ),

        setCurrentTime: (time) =>
          set(
            (state) => {
              state.controls.currentTime = time;
            },
            false,
            "gallery/setCurrentTime",
          ),

        setVolume: (volume) =>
          set(
            (state) => {
              state.controls.volume = Math.max(0, Math.min(1, volume));
            },
            false,
            "gallery/setVolume",
          ),

        toggleMute: () =>
          set(
            (state) => {
              state.controls.isMuted = !state.controls.isMuted;
            },
            false,
            "gallery/toggleMute",
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
            "gallery/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "gallery/setError",
          ),

        // ================================================================
        // Selection
        // ================================================================

        selectItem: (itemId) =>
          set(
            (state) => {
              state.selectedItems.add(itemId);
            },
            false,
            "gallery/selectItem",
          ),

        deselectItem: (itemId) =>
          set(
            (state) => {
              state.selectedItems.delete(itemId);
            },
            false,
            "gallery/deselectItem",
          ),

        toggleItemSelection: (itemId) =>
          set(
            (state) => {
              if (state.selectedItems.has(itemId)) {
                state.selectedItems.delete(itemId);
              } else {
                state.selectedItems.add(itemId);
              }
            },
            false,
            "gallery/toggleItemSelection",
          ),

        selectAll: (channelId) =>
          set(
            (state) => {
              const items = channelId
                ? state.itemsByChannel.get(channelId) || []
                : state.allItems;
              state.selectedItems = new Set(items.map((i) => i.id));
            },
            false,
            "gallery/selectAll",
          ),

        clearSelection: () =>
          set(
            (state) => {
              state.selectedItems = new Set();
            },
            false,
            "gallery/clearSelection",
          ),

        setSelectMode: (enabled) =>
          set(
            (state) => {
              state.isSelectMode = enabled;
              if (!enabled) {
                state.selectedItems = new Set();
              }
            },
            false,
            "gallery/setSelectMode",
          ),

        getSelectedItems: () => {
          const state = get();
          return state.allItems.filter((item) =>
            state.selectedItems.has(item.id),
          );
        },

        // ================================================================
        // Utility
        // ================================================================

        reset: () =>
          set(
            () => ({
              ...initialState,
              itemsByChannel: new Map(),
              selectedItems: new Set(),
            }),
            false,
            "gallery/reset",
          ),
      })),
    ),
    { name: "gallery-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllItems = (state: GalleryStore) => state.allItems;
export const selectItemsByChannel =
  (channelId: string) => (state: GalleryStore) =>
    state.itemsByChannel.get(channelId) || [];
export const selectLightbox = (state: GalleryStore) => state.lightbox;
export const selectIsLightboxOpen = (state: GalleryStore) =>
  state.lightbox.isOpen;
export const selectCurrentItem = (state: GalleryStore) =>
  state.lightbox.currentItem;
export const selectCurrentIndex = (state: GalleryStore) =>
  state.lightbox.currentIndex;
export const selectLightboxItems = (state: GalleryStore) =>
  state.lightbox.items;
export const selectCarousel = (state: GalleryStore) => state.carousel;
export const selectControls = (state: GalleryStore) => state.controls;
export const selectZoom = (state: GalleryStore) => state.controls.zoom;
export const selectRotation = (state: GalleryStore) => state.controls.rotation;
export const selectIsPlaying = (state: GalleryStore) =>
  state.controls.isPlaying;
export const selectVolume = (state: GalleryStore) => state.controls.volume;
export const selectIsMuted = (state: GalleryStore) => state.controls.isMuted;
export const selectIsFullscreen = (state: GalleryStore) =>
  state.controls.isFullscreen;
export const selectIsLoading = (state: GalleryStore) => state.isLoading;
export const selectError = (state: GalleryStore) => state.error;
export const selectSelectedItems = (state: GalleryStore) => state.selectedItems;
export const selectIsSelectMode = (state: GalleryStore) => state.isSelectMode;
export const selectSelectionCount = (state: GalleryStore) =>
  state.selectedItems.size;
export const selectHasSelection = (state: GalleryStore) =>
  state.selectedItems.size > 0;
