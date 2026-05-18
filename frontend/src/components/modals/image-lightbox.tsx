"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export interface LightboxImage {
  id: string;
  url: string;
  name?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: LightboxImage[];
  initialIndex?: number;
  onDownload?: (image: LightboxImage) => void;
  showThumbnails?: boolean;
  enableKeyboardNavigation?: boolean;
  enableMouseWheel?: boolean;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const DEFAULT_ZOOM_INDEX = 3; // 100%
const MIN_ZOOM_INDEX = 0;
const MAX_ZOOM_INDEX = ZOOM_LEVELS.length - 1;

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
  onDownload,
  showThumbnails = true,
  enableKeyboardNavigation = true,
  enableMouseWheel = true,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];
  const zoom = ZOOM_LEVELS[zoomIndex];
  const hasMultipleImages = images.length > 1;
  const canZoomIn = zoomIndex < MAX_ZOOM_INDEX;
  const canZoomOut = zoomIndex > MIN_ZOOM_INDEX;

  // Reset state when modal opens or image changes
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      resetView();
    }
  }, [open, initialIndex]);

  // Reset view when changing images
  useEffect(() => {
    resetView();
    setIsLoading(true);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !enableKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused on an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (hasMultipleImages) navigatePrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasMultipleImages) navigateNext();
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
          e.preventDefault();
          handleZoomOut();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleRotate();
          break;
        case "0":
          e.preventDefault();
          resetView();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "d":
        case "D":
          e.preventDefault();
          handleDownload();
          break;
        case "Escape":
          e.preventDefault();
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onOpenChange(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasMultipleImages, isFullscreen, enableKeyboardNavigation]);

  const resetView = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, MAX_ZOOM_INDEX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, MIN_ZOOM_INDEX));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const navigatePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const navigateNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;

    if (onDownload) {
      onDownload(currentImage);
    } else {
      // Default download behavior
      const link = document.createElement("a");
      link.href = currentImage.url;
      link.download = currentImage.name || `image-${currentImage.id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentImage, onDownload]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!enableMouseWheel) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  if (!currentImage) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 outline-none",
            isFullscreen
              ? "inset-0"
              : "left-[50%] top-[50%] h-[90vh] w-[95vw] max-w-7xl translate-x-[-50%] translate-y-[-50%]",
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              Image: {currentImage.name || "Preview"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {hasMultipleImages
                ? `Image ${currentIndex + 1} of ${images.length}`
                : "Image preview"}
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          {/* Top toolbar */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center gap-2">
              {currentImage.name && (
                <span className="max-w-[200px] truncate text-sm font-medium text-white sm:max-w-[400px]">
                  {currentImage.name}
                </span>
              )}
              {hasMultipleImages && (
                <span className="text-sm text-white/60">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Zoom controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                className="text-white hover:bg-white/20 disabled:opacity-30"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-14 text-center font-mono text-sm text-white">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                className="text-white hover:bg-white/20 disabled:opacity-30"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <div className="mx-1 h-6 w-px bg-white/20" />

              {/* Other controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="text-white hover:bg-white/20"
                title="Rotate (R)"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetView}
                className="text-white hover:bg-white/20"
                title="Reset view (0)"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                title="Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
                title="Download (D)"
              >
                <Download className="h-4 w-4" />
              </Button>

              <div className="mx-1 h-6 w-px bg-white/20" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image container */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Application role manages own interaction */}
          <div
            ref={containerRef}
            className={cn(
              "flex h-full w-full items-center justify-center overflow-hidden",
              zoom > 1 ? "cursor-grab" : "cursor-default",
              isDragging && "cursor-grabbing",
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            role="application"
            aria-label="Image viewer - use mouse to pan and zoom"
          >
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}

            <img
              src={currentImage.url}
              alt={currentImage.name || "Preview"}
              className={cn(
                "max-h-full max-w-full select-none object-contain transition-opacity",
                isLoading ? "opacity-0" : "opacity-100",
              )}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>

          {/* Navigation arrows */}
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={navigatePrevious}
                className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-white hover:bg-white/20"
                title="Previous image (Left arrow)"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={navigateNext}
                className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full text-white hover:bg-white/20"
                title="Next image (Right arrow)"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Thumbnail strip */}
          {showThumbnails && hasMultipleImages && images.length <= 20 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex justify-center gap-2 overflow-x-auto py-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      index === currentIndex
                        ? "scale-110 border-white shadow-lg"
                        : "border-transparent opacity-60 hover:border-white/50 hover:opacity-100",
                    )}
                  >
                    <img
                      src={image.thumbnailUrl || image.url}
                      alt={image.name || `Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts help */}
          <div className="absolute bottom-4 left-4 hidden text-xs text-white/40 sm:block">
            Arrow keys: navigate | +/-: zoom | R: rotate | 0: reset | F:
            fullscreen | D: download
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
