"use client";

/**
 * ImageViewer Component - Zoomable, pannable image viewer
 *
 * Features zoom/pan controls, rotation, download button, and navigation arrows.
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ImageViewerItem {
  id: string;
  url: string;
  fileName: string;
  width?: number;
  height?: number;
}

export interface ImageViewerProps {
  item: ImageViewerItem;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  rotationStep?: number;
  showControls?: boolean;
  showNavigation?: boolean;
  showClose?: boolean;
  showDownload?: boolean;
  showInfo?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (x: number, y: number) => void;
  onRotationChange?: (degrees: number) => void;
  onDownload?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  onInfoClick?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 5;
const DEFAULT_ZOOM_STEP = 0.25;
const DEFAULT_ROTATION_STEP = 90;

// ============================================================================
// Component
// ============================================================================

export function ImageViewer({
  item,
  zoom = 1,
  panX = 0,
  panY = 0,
  rotation = 0,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomStep = DEFAULT_ZOOM_STEP,
  rotationStep = DEFAULT_ROTATION_STEP,
  showControls = true,
  showNavigation = true,
  showClose = true,
  showDownload = true,
  showInfo = false,
  canGoNext = false,
  canGoPrevious = false,
  onZoomChange,
  onPanChange,
  onRotationChange,
  onDownload,
  onNext,
  onPrevious,
  onClose,
  onInfoClick,
  className,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [item.id]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + zoomStep, maxZoom);
    onZoomChange?.(newZoom);
  }, [zoom, zoomStep, maxZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - zoomStep, minZoom);
    onZoomChange?.(newZoom);
  }, [zoom, zoomStep, minZoom, onZoomChange]);

  const handleResetZoom = useCallback(() => {
    onZoomChange?.(1);
    onPanChange?.(0, 0);
    onRotationChange?.(0);
  }, [onZoomChange, onPanChange, onRotationChange]);

  // Rotation handlers
  const handleRotateLeft = useCallback(() => {
    onRotationChange?.((rotation - rotationStep + 360) % 360);
  }, [rotation, rotationStep, onRotationChange]);

  const handleRotateRight = useCallback(() => {
    onRotationChange?.((rotation + rotationStep) % 360);
  }, [rotation, rotationStep, onRotationChange]);

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));
      onZoomChange?.(newZoom);
    },
    [zoom, minZoom, maxZoom, zoomStep, onZoomChange],
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
      }
    },
    [zoom, panX, panY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        onPanChange?.(newX, newY);
      }
    },
    [isDragging, dragStart, onPanChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      onZoomChange?.(2);
    } else {
      handleResetZoom();
    }
  }, [zoom, onZoomChange, handleResetZoom]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (canGoPrevious) onPrevious?.();
          break;
        case "ArrowRight":
          if (canGoNext) onNext?.();
          break;
        case "Escape":
          onClose?.();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleResetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canGoNext,
    canGoPrevious,
    onNext,
    onPrevious,
    onClose,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  ]);

  // Image styles
  const imageStyles: React.CSSProperties = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
    transition: isDragging ? "none" : "transform 0.2s ease-out",
    cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Application role manages own interaction
    <div
      ref={containerRef}
      data-testid="image-viewer"
      role="application"
      aria-label="Image viewer - use mouse or keyboard to pan and zoom"
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black/95",
        className,
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Loading indicator */}
      {!isLoaded && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          data-testid="loading-indicator"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="flex flex-col items-center justify-center text-white"
          data-testid="error-state"
        >
          <p className="text-lg">Failed to load image</p>
          <p className="mt-1 text-sm text-white/60">{item.fileName}</p>
        </div>
      )}

      {/* Image */}
      <img
        ref={imageRef}
        src={item.url}
        alt={item.fileName}
        style={imageStyles}
        className={cn(
          "max-h-full max-w-full select-none object-contain",
          !isLoaded && "opacity-0",
        )}
        draggable={false}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        data-testid="viewer-image"
      />

      {/* Navigation arrows */}
      {showNavigation && (
        <>
          {canGoPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onPrevious}
              data-testid="previous-button"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}
          {canGoNext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onNext}
              data-testid="next-button"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </>
      )}

      {/* Top toolbar */}
      {(showClose || showInfo) && (
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {showInfo && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onInfoClick}
              data-testid="info-button"
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
          {showClose && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={onClose}
              data-testid="close-button"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Bottom controls */}
      {showControls && (
        <div
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/60 p-1 backdrop-blur-sm"
          data-testid="controls"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            data-testid="zoom-out-button"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span
            className="min-w-[50px] text-center text-sm text-white"
            data-testid="zoom-level"
          >
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            data-testid="zoom-in-button"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-white/30" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateLeft}
            data-testid="rotate-left-button"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateRight}
            data-testid="rotate-right-button"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-white/30" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleResetZoom}
            data-testid="reset-button"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {showDownload && onDownload && (
            <>
              <div className="mx-1 h-4 w-px bg-white/30" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={onDownload}
                data-testid="download-button"
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageViewer;
