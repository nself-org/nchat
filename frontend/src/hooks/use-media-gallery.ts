/**
 * useMediaGallery Hook - Custom hook for managing media gallery state
 *
 * Provides a comprehensive interface for opening/closing the gallery,
 * navigating items, and downloading media.
 */

import { useCallback, useEffect, useRef } from "react";
import { useGalleryStore, GalleryItem } from "@/stores/gallery-store";

// ============================================================================
// Types
// ============================================================================

export interface UseMediaGalleryOptions {
  channelId?: string;
  autoplay?: boolean;
  loop?: boolean;
  interval?: number;
}

export interface UseMediaGalleryReturn {
  // Lightbox state
  isOpen: boolean;
  currentItem: GalleryItem | null;
  currentIndex: number;
  items: GalleryItem[];
  totalItems: number;

  // Navigation
  canGoNext: boolean;
  canGoPrevious: boolean;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;

  // Open/Close
  open: (items: GalleryItem[], startIndex?: number) => void;
  openItem: (item: GalleryItem, context?: GalleryItem[]) => void;
  close: () => void;

  // Carousel
  isAutoplayEnabled: boolean;
  startAutoplay: () => void;
  stopAutoplay: () => void;
  toggleAutoplay: () => void;

  // Viewer controls
  zoom: number;
  rotation: number;
  zoomIn: () => void;
  zoomOut: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  resetView: () => void;
  setZoom: (zoom: number) => void;
  setRotation: (degrees: number) => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Info panel
  showInfo: boolean;
  toggleInfo: () => void;

  // Download
  download: (item?: GalleryItem) => void;

  // Selection
  selectedItems: Set<string>;
  isSelectMode: boolean;
  selectItem: (itemId: string) => void;
  deselectItem: (itemId: string) => void;
  toggleSelection: (itemId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectMode: (enabled: boolean) => void;
  getSelectedItems: () => GalleryItem[];
}

// ============================================================================
// Hook
// ============================================================================

export function useMediaGallery(
  options: UseMediaGalleryOptions = {},
): UseMediaGalleryReturn {
  const { channelId, autoplay = false, loop = true, interval = 5000 } = options;

  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store state and actions
  const lightbox = useGalleryStore((state) => state.lightbox);
  const carousel = useGalleryStore((state) => state.carousel);
  const controls = useGalleryStore((state) => state.controls);
  const selectedItems = useGalleryStore((state) => state.selectedItems);
  const isSelectMode = useGalleryStore((state) => state.isSelectMode);

  const openLightbox = useGalleryStore((state) => state.openLightbox);
  const openLightboxWithItem = useGalleryStore(
    (state) => state.openLightboxWithItem,
  );
  const closeLightbox = useGalleryStore((state) => state.closeLightbox);
  const nextItem = useGalleryStore((state) => state.nextItem);
  const previousItem = useGalleryStore((state) => state.previousItem);
  const goToItem = useGalleryStore((state) => state.goToItem);
  const canGoNextFn = useGalleryStore((state) => state.canGoNext);
  const canGoPreviousFn = useGalleryStore((state) => state.canGoPrevious);

  const setCarouselAutoplay = useGalleryStore(
    (state) => state.setCarouselAutoplay,
  );
  const setCarouselLoop = useGalleryStore((state) => state.setCarouselLoop);
  const setCarouselInterval = useGalleryStore(
    (state) => state.setCarouselInterval,
  );

  const storeZoomIn = useGalleryStore((state) => state.zoomIn);
  const storeZoomOut = useGalleryStore((state) => state.zoomOut);
  const storeRotateLeft = useGalleryStore((state) => state.rotateLeft);
  const storeRotateRight = useGalleryStore((state) => state.rotateRight);
  const storeResetView = useGalleryStore((state) => state.resetView);
  const storeSetZoom = useGalleryStore((state) => state.setZoom);
  const storeSetRotation = useGalleryStore((state) => state.setRotation);
  const storeToggleFullscreen = useGalleryStore(
    (state) => state.toggleFullscreen,
  );
  const storeToggleInfo = useGalleryStore((state) => state.toggleInfo);

  const storeSelectItem = useGalleryStore((state) => state.selectItem);
  const storeDeselectItem = useGalleryStore((state) => state.deselectItem);
  const storeToggleItemSelection = useGalleryStore(
    (state) => state.toggleItemSelection,
  );
  const storeSelectAll = useGalleryStore((state) => state.selectAll);
  const storeClearSelection = useGalleryStore((state) => state.clearSelection);
  const storeSetSelectMode = useGalleryStore((state) => state.setSelectMode);
  const storeGetSelectedItems = useGalleryStore(
    (state) => state.getSelectedItems,
  );

  // Initialize carousel settings
  useEffect(() => {
    setCarouselLoop(loop);
    setCarouselInterval(interval);
  }, [loop, interval, setCarouselLoop, setCarouselInterval]);

  // Handle autoplay
  useEffect(() => {
    if (carousel.autoplay && lightbox.isOpen && lightbox.items.length > 1) {
      autoplayTimerRef.current = setInterval(() => {
        nextItem();
      }, carousel.interval);
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [
    carousel.autoplay,
    carousel.interval,
    lightbox.isOpen,
    lightbox.items.length,
    nextItem,
  ]);

  // Auto-enable autoplay if specified
  useEffect(() => {
    if (autoplay && lightbox.isOpen) {
      setCarouselAutoplay(true);
    }
  }, [autoplay, lightbox.isOpen, setCarouselAutoplay]);

  // Open gallery
  const open = useCallback(
    (items: GalleryItem[], startIndex: number = 0) => {
      openLightbox(items, startIndex);
    },
    [openLightbox],
  );

  // Open with specific item
  const openItem = useCallback(
    (item: GalleryItem, context?: GalleryItem[]) => {
      openLightboxWithItem(item, context);
    },
    [openLightboxWithItem],
  );

  // Close gallery
  const close = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    closeLightbox();
  }, [closeLightbox]);

  // Navigation
  const next = useCallback(() => {
    nextItem();
  }, [nextItem]);

  const previous = useCallback(() => {
    previousItem();
  }, [previousItem]);

  const goTo = useCallback(
    (index: number) => {
      goToItem(index);
    },
    [goToItem],
  );

  // Autoplay controls
  const startAutoplay = useCallback(() => {
    setCarouselAutoplay(true);
  }, [setCarouselAutoplay]);

  const stopAutoplay = useCallback(() => {
    setCarouselAutoplay(false);
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, [setCarouselAutoplay]);

  const toggleAutoplay = useCallback(() => {
    if (carousel.autoplay) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }, [carousel.autoplay, startAutoplay, stopAutoplay]);

  // Viewer controls
  const zoomIn = useCallback(() => {
    storeZoomIn();
  }, [storeZoomIn]);

  const zoomOut = useCallback(() => {
    storeZoomOut();
  }, [storeZoomOut]);

  const rotateLeft = useCallback(() => {
    storeRotateLeft();
  }, [storeRotateLeft]);

  const rotateRight = useCallback(() => {
    storeRotateRight();
  }, [storeRotateRight]);

  const resetView = useCallback(() => {
    storeResetView();
  }, [storeResetView]);

  const setZoom = useCallback(
    (zoom: number) => {
      storeSetZoom(zoom);
    },
    [storeSetZoom],
  );

  const setRotation = useCallback(
    (degrees: number) => {
      storeSetRotation(degrees);
    },
    [storeSetRotation],
  );

  const toggleFullscreen = useCallback(() => {
    storeToggleFullscreen();
  }, [storeToggleFullscreen]);

  const toggleInfo = useCallback(() => {
    storeToggleInfo();
  }, [storeToggleInfo]);

  // Download
  const download = useCallback(
    (item?: GalleryItem) => {
      const targetItem = item || lightbox.currentItem;
      if (!targetItem) return;

      const url = targetItem.downloadUrl || targetItem.url;
      const link = document.createElement("a");
      link.href = url;
      link.download = targetItem.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [lightbox.currentItem],
  );

  // Selection
  const selectItem = useCallback(
    (itemId: string) => {
      storeSelectItem(itemId);
    },
    [storeSelectItem],
  );

  const deselectItem = useCallback(
    (itemId: string) => {
      storeDeselectItem(itemId);
    },
    [storeDeselectItem],
  );

  const toggleSelection = useCallback(
    (itemId: string) => {
      storeToggleItemSelection(itemId);
    },
    [storeToggleItemSelection],
  );

  const selectAll = useCallback(() => {
    storeSelectAll(channelId);
  }, [storeSelectAll, channelId]);

  const clearSelection = useCallback(() => {
    storeClearSelection();
  }, [storeClearSelection]);

  const setSelectMode = useCallback(
    (enabled: boolean) => {
      storeSetSelectMode(enabled);
    },
    [storeSetSelectMode],
  );

  const getSelectedItems = useCallback(() => {
    return storeGetSelectedItems();
  }, [storeGetSelectedItems]);

  return {
    // Lightbox state
    isOpen: lightbox.isOpen,
    currentItem: lightbox.currentItem,
    currentIndex: lightbox.currentIndex,
    items: lightbox.items,
    totalItems: lightbox.items.length,

    // Navigation
    canGoNext: canGoNextFn(),
    canGoPrevious: canGoPreviousFn(),
    next,
    previous,
    goTo,

    // Open/Close
    open,
    openItem,
    close,

    // Carousel
    isAutoplayEnabled: carousel.autoplay,
    startAutoplay,
    stopAutoplay,
    toggleAutoplay,

    // Viewer controls
    zoom: controls.zoom,
    rotation: controls.rotation,
    zoomIn,
    zoomOut,
    rotateLeft,
    rotateRight,
    resetView,
    setZoom,
    setRotation,

    // Fullscreen
    isFullscreen: controls.isFullscreen,
    toggleFullscreen,

    // Info panel
    showInfo: controls.showInfo,
    toggleInfo,

    // Download
    download,

    // Selection
    selectedItems,
    isSelectMode,
    selectItem,
    deselectItem,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectMode,
    getSelectedItems,
  };
}

export default useMediaGallery;
