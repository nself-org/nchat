"use client";

/**
 * ImageViewer - Zoomable, pannable image viewer component
 *
 * Supports zoom, pan, rotation, and keyboard controls.
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Download,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ImageViewerProps {
  item: MediaItem;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (x: number, y: number) => void;
  onRotationChange?: (degrees: number) => void;
  onDownload?: () => void;
  showControls?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const ROTATION_STEP = 90;

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
  onZoomChange,
  onPanChange,
  onRotationChange,
  onDownload,
  showControls = true,
  className,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + ZOOM_STEP, maxZoom);
    onZoomChange?.(newZoom);
  }, [zoom, maxZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - ZOOM_STEP, minZoom);
    onZoomChange?.(newZoom);
  }, [zoom, minZoom, onZoomChange]);

  const handleResetZoom = useCallback(() => {
    onZoomChange?.(1);
    onPanChange?.(0, 0);
  }, [onZoomChange, onPanChange]);

  // Handle rotation
  const handleRotateLeft = useCallback(() => {
    onRotationChange?.((rotation - ROTATION_STEP + 360) % 360);
  }, [rotation, onRotationChange]);

  const handleRotateRight = useCallback(() => {
    onRotationChange?.((rotation + ROTATION_STEP) % 360);
  }, [rotation, onRotationChange]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));
      onZoomChange?.(newZoom);
    },
    [zoom, minZoom, maxZoom, onZoomChange],
  );

  // Handle pan start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
      }
    },
    [zoom, panX, panY],
  );

  // Handle pan move
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

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle double click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      onZoomChange?.(2);
    } else {
      handleResetZoom();
    }
  }, [zoom, onZoomChange, handleResetZoom]);

  // Image styles with transforms
  const imageStyles: React.CSSProperties = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
    transition: isDragging ? "none" : "transform 0.2s ease-out",
    cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Application role manages own interaction
    <div
      ref={containerRef}
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
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
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
      />

      {/* Controls overlay */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/60 p-1 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="min-w-[50px] text-center text-sm text-white">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-white/30" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateLeft}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateRight}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-white/30" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleResetZoom}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {onDownload && (
            <>
              <div className="mx-1 h-4 w-px bg-white/30" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={onDownload}
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
