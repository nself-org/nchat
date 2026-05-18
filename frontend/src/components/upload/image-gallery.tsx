/**
 * Image Gallery - Lightbox image viewer component
 *
 * Features:
 * - Full screen overlay
 * - Previous/next navigation
 * - Zoom controls
 * - Download button
 * - Close button
 * - Keyboard navigation
 * - Touch/swipe support
 */

"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface GalleryImage {
  /** Unique identifier */
  id: string;
  /** Image URL */
  src: string;
  /** Thumbnail URL (optional) */
  thumbnail?: string;
  /** Alt text */
  alt?: string;
  /** Image title/caption */
  title?: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
}

export interface ImageGalleryProps {
  /** List of images */
  images: GalleryImage[];
  /** Currently open image index (-1 if closed) */
  currentIndex: number;
  /** Callback to change current image */
  onIndexChange: (index: number) => void;
  /** Callback to close gallery */
  onClose: () => void;
  /** Enable zoom */
  enableZoom?: boolean;
  /** Enable rotation */
  enableRotation?: boolean;
  /** Enable download */
  enableDownload?: boolean;
  /** Enable fullscreen */
  enableFullscreen?: boolean;
  /** Show thumbnails strip */
  showThumbnails?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// ============================================================================
// Component
// ============================================================================

export function ImageGallery({
  images,
  currentIndex,
  onIndexChange,
  onClose,
  enableZoom = true,
  enableRotation = true,
  enableDownload = true,
  enableFullscreen = true,
  showThumbnails = true,
  className,
}: ImageGalleryProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{
    x: number;
    y: number;
    distance?: number;
  } | null>(null);

  const currentImage = images[currentIndex];
  const hasNext = currentIndex < images.length - 1;
  const hasPrev = currentIndex > 0;

  // Reset state when image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex < 0) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrev) onIndexChange(currentIndex - 1);
          break;
        case "ArrowRight":
          if (hasNext) onIndexChange(currentIndex + 1);
          break;
        case "+":
        case "=":
          if (enableZoom) handleZoomIn();
          break;
        case "-":
          if (enableZoom) handleZoomOut();
          break;
        case "0":
          if (enableZoom) setZoom(1);
          break;
        case "r":
        case "R":
          if (enableRotation) handleRotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    hasNext,
    hasPrev,
    onClose,
    onIndexChange,
    enableZoom,
    enableRotation,
  ]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Prevent body scroll when gallery is open
  useEffect(() => {
    if (currentIndex >= 0) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [currentIndex]);

  // Navigation handlers
  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(currentIndex + 1);
  }, [hasNext, currentIndex, onIndexChange]);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(currentIndex - 1);
  }, [hasPrev, currentIndex, onIndexChange]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Rotation handler
  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentImage.title || currentImage.alt || "image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentImage.src, "_blank");
    }
  }, [currentImage]);

  // Fullscreen handler
  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen not supported
    }
  }, [isFullscreen]);

  // Mouse drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [zoom, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y,
        });
      }
    },
    [isDragging, zoom],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2 && enableZoom) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        touchStartRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          distance,
        };
      }
    },
    [enableZoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      if (
        e.touches.length === 2 &&
        touchStartRef.current.distance &&
        enableZoom
      ) {
        // Pinch to zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const scale = distance / touchStartRef.current.distance;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * scale)));
        touchStartRef.current.distance = distance;
      }
    },
    [enableZoom],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || e.touches.length > 0) return;

      // Swipe to navigate
      if (zoom === 1 && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0 && hasPrev) {
            goPrev();
          } else if (deltaX < 0 && hasNext) {
            goNext();
          }
        }
      }

      touchStartRef.current = null;
    },
    [zoom, hasPrev, hasNext, goPrev, goNext],
  );

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!enableZoom) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    },
    [enableZoom],
  );

  if (currentIndex < 0 || !currentImage) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      className={cn("fixed inset-0 z-50 flex flex-col bg-black/95", className)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {/* Title & Counter */}
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.title && (
            <span className="text-sm text-white/80">{currentImage.title}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {enableZoom && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/10"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="w-12 text-center text-sm text-white">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/10"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Rotation */}
          {enableRotation && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/10"
              onClick={handleRotate}
            >
              <RotateCw className="h-5 w-5" />
            </Button>
          )}

          {/* Download */}
          {enableDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/10"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
          )}

          {/* Fullscreen */}
          {enableFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/10"
              onClick={handleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Image Area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        role="presentation"
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Image */}
        <img
          ref={imageRef}
          src={currentImage.src}
          alt={currentImage.alt || ""}
          className={cn(
            "max-h-full max-w-full object-contain transition-opacity duration-200",
            isLoading ? "opacity-0" : "opacity-100",
            !isDragging && "transition-transform duration-200",
          )}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          draggable={false}
        />

        {/* Navigation Buttons */}
        {hasPrev && (
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            onClick={goPrev}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            onClick={goNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>

      {/* Thumbnails Strip */}
      {showThumbnails && images.length > 1 && (
        <div className="flex h-20 items-center justify-center gap-2 overflow-x-auto bg-black/50 px-4 py-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={cn(
                "h-14 w-14 flex-shrink-0 overflow-hidden rounded border-2 transition-all",
                index === currentIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-50 hover:opacity-75",
              )}
              onClick={() => onIndexChange(index)}
            >
              <img
                src={image.thumbnail || image.src}
                alt={image.alt || `Image ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hook for controlling gallery
// ============================================================================

export interface UseImageGalleryReturn {
  /** Current open image index (-1 if closed) */
  currentIndex: number;
  /** Open gallery at specific index */
  open: (index: number) => void;
  /** Close gallery */
  close: () => void;
  /** Go to next image */
  next: () => void;
  /** Go to previous image */
  prev: () => void;
  /** Set current index */
  setIndex: (index: number) => void;
  /** Whether gallery is open */
  isOpen: boolean;
}

export function useImageGallery(imagesCount: number): UseImageGalleryReturn {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const open = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, imagesCount - 1)));
    },
    [imagesCount],
  );

  const close = useCallback(() => {
    setCurrentIndex(-1);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i < imagesCount - 1 ? i + 1 : i));
  }, [imagesCount]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  return {
    currentIndex,
    open,
    close,
    next,
    prev,
    setIndex: setCurrentIndex,
    isOpen: currentIndex >= 0,
  };
}

export default ImageGallery;
