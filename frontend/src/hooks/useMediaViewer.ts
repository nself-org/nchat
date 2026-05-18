/**
 * useMediaViewer Hook - Manage media viewer state and interactions
 *
 * Provides controls for viewing, zooming, panning, and navigating media items.
 */

import { useCallback, useEffect, useRef } from "react";
import { useMediaStore } from "@/stores/media-store";
import { MediaItem, ViewerState } from "@/lib/media/media-types";
import { useHotkeys } from "react-hotkeys-hook";

// ============================================================================
// Types
// ============================================================================

export interface UseMediaViewerOptions {
  enableKeyboardNavigation?: boolean;
  enableZoomGestures?: boolean;
  enableFullscreen?: boolean;
  loop?: boolean;
  autoplayCarousel?: boolean;
  carouselInterval?: number;
}

export interface UseMediaViewerReturn {
  // State
  isOpen: boolean;
  currentItem: MediaItem | null;
  currentIndex: number;
  items: MediaItem[];
  totalItems: number;

  // Navigation
  hasNext: boolean;
  hasPrevious: boolean;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;

  // Viewer controls
  open: (itemId: string) => void;
  close: () => void;

  // Zoom/Pan/Rotate
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPan: (x: number, y: number) => void;
  rotate: (degrees: number) => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  resetView: () => void;

  // Video/Audio controls
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;

  // Info panel
  showInfo: boolean;
  toggleInfo: () => void;

  // Carousel
  isCarouselMode: boolean;
  carouselAutoplay: boolean;
  carouselInterval: number;
  setCarouselMode: (enabled: boolean) => void;
  setCarouselAutoplay: (enabled: boolean) => void;
  startCarousel: () => void;
  stopCarousel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const ROTATION_STEP = 90;
const DEFAULT_CAROUSEL_INTERVAL = 5000;

// ============================================================================
// Hook
// ============================================================================

export function useMediaViewer(
  options: UseMediaViewerOptions = {},
): UseMediaViewerReturn {
  const {
    enableKeyboardNavigation = true,
    enableFullscreen = true,
    loop = false,
    autoplayCarousel = false,
    carouselInterval = DEFAULT_CAROUSEL_INTERVAL,
  } = options;

  // Store state and actions
  const {
    viewer,
    openViewer,
    closeViewer,
    nextItem,
    previousItem,
    goToItem,
    setZoom: storeSetZoom,
    setPan: storeSetPan,
    setRotation,
    resetView: storeResetView,
    toggleFullscreen: storeToggleFullscreen,
    toggleInfo: storeToggleInfo,
    setPlaying,
    setCurrentTime,
    setVolume: storeSetVolume,
    setMuted,
    setPlaybackRate: storeSetPlaybackRate,
    setCarouselMode: storeSetCarouselMode,
    setCarouselAutoplay: storeSetCarouselAutoplay,
    setCarouselInterval: storeSetCarouselInterval,
  } = useMediaStore();

  // Refs
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // Computed values
  const hasNext = viewer.currentIndex < viewer.items.length - 1 || loop;
  const hasPrevious = viewer.currentIndex > 0 || loop;

  // Navigation handlers
  const next = useCallback(() => {
    if (hasNext) {
      nextItem();
    }
  }, [hasNext, nextItem]);

  const previous = useCallback(() => {
    if (hasPrevious) {
      previousItem();
    }
  }, [hasPrevious, previousItem]);

  const goTo = useCallback(
    (index: number) => {
      goToItem(index);
    },
    [goToItem],
  );

  // Zoom handlers
  const setZoom = useCallback(
    (zoom: number) => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      storeSetZoom(clampedZoom);
    },
    [storeSetZoom],
  );

  const zoomIn = useCallback(() => {
    setZoom(viewer.zoom + ZOOM_STEP);
  }, [viewer.zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(viewer.zoom - ZOOM_STEP);
  }, [viewer.zoom, setZoom]);

  const resetZoom = useCallback(() => {
    storeSetZoom(1);
  }, [storeSetZoom]);

  // Pan handlers
  const setPan = useCallback(
    (x: number, y: number) => {
      storeSetPan(x, y);
    },
    [storeSetPan],
  );

  // Rotation handlers
  const rotate = useCallback(
    (degrees: number) => {
      setRotation(viewer.rotation + degrees);
    },
    [viewer.rotation, setRotation],
  );

  const rotateLeft = useCallback(() => {
    rotate(-ROTATION_STEP);
  }, [rotate]);

  const rotateRight = useCallback(() => {
    rotate(ROTATION_STEP);
  }, [rotate]);

  const resetView = useCallback(() => {
    storeResetView();
  }, [storeResetView]);

  // Video/Audio handlers
  const play = useCallback(() => {
    setPlaying(true);
  }, [setPlaying]);

  const pause = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  const togglePlay = useCallback(() => {
    setPlaying(!viewer.isPlaying);
  }, [viewer.isPlaying, setPlaying]);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(Math.max(0, Math.min(time, viewer.duration)));
    },
    [viewer.duration, setCurrentTime],
  );

  const setVolume = useCallback(
    (volume: number) => {
      storeSetVolume(Math.max(0, Math.min(1, volume)));
      if (volume > 0 && viewer.isMuted) {
        setMuted(false);
      }
    },
    [viewer.isMuted, storeSetVolume, setMuted],
  );

  const toggleMute = useCallback(() => {
    setMuted(!viewer.isMuted);
  }, [viewer.isMuted, setMuted]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      storeSetPlaybackRate(rate);
    },
    [storeSetPlaybackRate],
  );

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (enableFullscreen) {
      storeToggleFullscreen();

      // Actually toggle browser fullscreen
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  }, [enableFullscreen, storeToggleFullscreen]);

  const enterFullscreen = useCallback(() => {
    if (enableFullscreen && !viewer.isFullscreen) {
      toggleFullscreen();
    }
  }, [enableFullscreen, viewer.isFullscreen, toggleFullscreen]);

  const exitFullscreen = useCallback(() => {
    if (viewer.isFullscreen) {
      toggleFullscreen();
    }
  }, [viewer.isFullscreen, toggleFullscreen]);

  // Info panel handlers
  const toggleInfo = useCallback(() => {
    storeToggleInfo();
  }, [storeToggleInfo]);

  // Carousel handlers
  const setCarouselMode = useCallback(
    (enabled: boolean) => {
      storeSetCarouselMode(enabled);
    },
    [storeSetCarouselMode],
  );

  const setCarouselAutoplay = useCallback(
    (enabled: boolean) => {
      storeSetCarouselAutoplay(enabled);
    },
    [storeSetCarouselAutoplay],
  );

  const startCarousel = useCallback(() => {
    setCarouselMode(true);
    setCarouselAutoplay(true);
  }, [setCarouselMode, setCarouselAutoplay]);

  const stopCarousel = useCallback(() => {
    setCarouselAutoplay(false);
  }, [setCarouselAutoplay]);

  // Set up carousel timer
  useEffect(() => {
    if (viewer.isCarouselMode && viewer.carouselAutoplay && viewer.isOpen) {
      carouselTimerRef.current = setInterval(() => {
        next();
      }, viewer.carouselInterval);

      return () => {
        if (carouselTimerRef.current) {
          clearInterval(carouselTimerRef.current);
        }
      };
    }
  }, [
    viewer.isCarouselMode,
    viewer.carouselAutoplay,
    viewer.carouselInterval,
    viewer.isOpen,
    next,
  ]);

  // Initialize carousel settings
  useEffect(() => {
    if (autoplayCarousel) {
      storeSetCarouselAutoplay(true);
    }
    storeSetCarouselInterval(carouselInterval);
  }, [
    autoplayCarousel,
    carouselInterval,
    storeSetCarouselAutoplay,
    storeSetCarouselInterval,
  ]);

  // Keyboard navigation
  useHotkeys(
    "left",
    (e) => {
      e.preventDefault();
      previous();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "right",
    (e) => {
      e.preventDefault();
      next();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "escape",
    (e) => {
      e.preventDefault();
      if (viewer.isFullscreen) {
        exitFullscreen();
      } else {
        closeViewer();
      }
    },
    { enabled: viewer.isOpen },
  );

  useHotkeys(
    "f",
    (e) => {
      e.preventDefault();
      toggleFullscreen();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "i",
    (e) => {
      e.preventDefault();
      toggleInfo();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      togglePlay();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "plus,=",
    (e) => {
      e.preventDefault();
      zoomIn();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "minus,-",
    (e) => {
      e.preventDefault();
      zoomOut();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "0",
    (e) => {
      e.preventDefault();
      resetView();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "r",
    (e) => {
      e.preventDefault();
      rotateRight();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  useHotkeys(
    "shift+r",
    (e) => {
      e.preventDefault();
      rotateLeft();
    },
    { enabled: enableKeyboardNavigation && viewer.isOpen },
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isOpen: viewer.isOpen,
    currentItem: viewer.currentItem,
    currentIndex: viewer.currentIndex,
    items: viewer.items,
    totalItems: viewer.items.length,

    // Navigation
    hasNext,
    hasPrevious,
    next,
    previous,
    goTo,

    // Viewer controls
    open: openViewer,
    close: closeViewer,

    // Zoom/Pan/Rotate
    zoom: viewer.zoom,
    panX: viewer.panX,
    panY: viewer.panY,
    rotation: viewer.rotation,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setPan,
    rotate,
    rotateLeft,
    rotateRight,
    resetView,

    // Video/Audio controls
    isPlaying: viewer.isPlaying,
    currentTime: viewer.currentTime,
    duration: viewer.duration,
    volume: viewer.volume,
    isMuted: viewer.isMuted,
    playbackRate: viewer.playbackRate,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,

    // Fullscreen
    isFullscreen: viewer.isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,

    // Info panel
    showInfo: viewer.showInfo,
    toggleInfo,

    // Carousel
    isCarouselMode: viewer.isCarouselMode,
    carouselAutoplay: viewer.carouselAutoplay,
    carouselInterval: viewer.carouselInterval,
    setCarouselMode,
    setCarouselAutoplay,
    startCarousel,
    stopCarousel,
  };
}

export default useMediaViewer;
