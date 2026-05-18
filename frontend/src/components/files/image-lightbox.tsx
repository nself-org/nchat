"use client";

import * as React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FileAttachmentData } from "./file-attachment";

// ============================================================================
// TYPES
// ============================================================================

export interface ImageLightboxProps {
  /** Images to display */
  images: FileAttachmentData[];
  /** Currently selected image index */
  initialIndex?: number;
  /** Whether the lightbox is open */
  isOpen: boolean;
  /** Callback when lightbox should close */
  onClose: () => void;
  /** Callback when image changes */
  onImageChange?: (index: number) => void;
  /** Show image counter */
  showCounter?: boolean;
  /** Show thumbnails */
  showThumbnails?: boolean;
  /** Enable zoom */
  enableZoom?: boolean;
  /** Enable rotation */
  enableRotation?: boolean;
  /** Enable download */
  enableDownload?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ImageLightbox - Full-screen image viewer with zoom and navigation
 *
 * @example
 * ```tsx
 * <ImageLightbox
 *   images={images}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   enableZoom
 *   enableDownload
 * />
 * ```
 */
export function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onImageChange,
  showCounter = true,
  showThumbnails = true,
  enableZoom = true,
  enableRotation = true,
  enableDownload = true,
  className,
}: ImageLightboxProps) {
  // State
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  // Current image
  const currentImage = images[currentIndex];

  // Reset state when image changes
  React.useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Sync with initialIndex
  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Handle keyboard events
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "+":
        case "=":
          if (enableZoom) handleZoomIn();
          break;
        case "-":
          if (enableZoom) handleZoomOut();
          break;
        case "0":
          if (enableZoom) resetZoom();
          break;
        case "r":
          if (enableRotation) handleRotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, enableZoom, enableRotation]);

  // Handle body scroll lock
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Navigation
  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    onImageChange?.(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onImageChange?.(newIndex);
  };

  // Zoom
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Rotation
  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Download
  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = currentImage.name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!enableZoom) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
  };

  // Handle drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 z-50 flex flex-col bg-black/95", className)}
      onWheel={handleWheel}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Counter and file info */}
        <div className="flex items-center gap-4">
          {showCounter && images.length > 1 && (
            <span className="text-sm text-white/70">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <span className="max-w-[300px] truncate text-sm text-white/70">
            {currentImage.name}
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          {enableZoom && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={handleZoomOut}
                      disabled={zoom <= MIN_ZOOM}
                    >
                      <ZoomOut className="h-4 w-4" />
                      <span className="sr-only">Zoom out</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom out (-)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="w-12 text-center text-sm text-white/70">
                {Math.round(zoom * 100)}%
              </span>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={handleZoomIn}
                      disabled={zoom >= MAX_ZOOM}
                    >
                      <ZoomIn className="h-4 w-4" />
                      <span className="sr-only">Zoom in</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Zoom in (+)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Rotation */}
          {enableRotation && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="sr-only">Rotate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rotate (R)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Download */}
          {enableDownload && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Fullscreen */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Close */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close (Esc)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main image area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        role="button"
        tabIndex={0}
        aria-label={`Image ${currentIndex + 1} of ${images.length}: ${currentImage.name}`}
        onClick={handleBackdropClick}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        {/* Image */}
        <img
          ref={imageRef}
          src={currentImage.url}
          alt={currentImage.name}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />

        {/* Previous button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={handlePrevious}
          >
            <ChevronLeft className="h-8 w-8" />
            <span className="sr-only">Previous</span>
          </Button>
        )}

        {/* Next button */}
        {images.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50"
            onClick={handleNext}
          >
            <ChevronRight className="h-8 w-8" />
            <span className="sr-only">Next</span>
          </Button>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => {
                setCurrentIndex(index);
                onImageChange?.(index);
              }}
              className={cn(
                "h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all",
                index === currentIndex
                  ? "border-white"
                  : "border-transparent opacity-50 hover:opacity-100",
              )}
            >
              <img
                src={image.thumbnailUrl || image.url}
                alt={image.name}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing lightbox state
 */
export function useLightbox(images: FileAttachmentData[]) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [initialIndex, setInitialIndex] = React.useState(0);

  const open = React.useCallback((index: number = 0) => {
    setInitialIndex(index);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const openImage = React.useCallback(
    (imageId: string) => {
      const index = images.findIndex((img) => img.id === imageId);
      if (index !== -1) {
        open(index);
      }
    },
    [images, open],
  );

  return {
    isOpen,
    initialIndex,
    open,
    close,
    openImage,
  };
}
