"use client";

/**
 * ZoomableImage - Image component with pinch-to-zoom and pan support
 *
 * Features:
 * - Pinch-to-zoom on touch devices
 * - Mouse wheel zoom on desktop
 * - Double-tap/click to toggle zoom
 * - Pan with momentum scrolling
 * - Boundary constraints
 * - Hardware-accelerated transforms
 * - Accessibility support
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useGestures, type Point } from "@/hooks/use-gestures";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;

  // Zoom controls
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  zoomStep?: number;

  // Callbacks
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
  onDoubleTap?: () => void;
  onLoad?: () => void;
  onError?: () => void;

  // UI options
  showControls?: boolean;
  showZoomLevel?: boolean;
  enableRotation?: boolean;
  enableMomentum?: boolean;
  reducedMotion?: boolean;

  // Constraints
  constrainToContainer?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MIN_ZOOM = 0.5;
const DEFAULT_MAX_ZOOM = 5;
const DEFAULT_ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;

// ============================================================================
// Component
// ============================================================================

export function ZoomableImage({
  src,
  alt,
  className,
  containerClassName,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  initialZoom = 1,
  zoomStep = DEFAULT_ZOOM_STEP,
  onZoomChange,
  onPanChange,
  onRotationChange,
  onDoubleTap,
  onLoad,
  onError,
  showControls = true,
  showZoomLevel = true,
  enableRotation = true,
  enableMomentum = true,
  reducedMotion = false,
  constrainToContainer = true,
}: ZoomableImageProps) {
  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle double tap to toggle zoom
  const handleDoubleTap = useCallback(
    (point: Point) => {
      onDoubleTap?.();

      // Get current zoom from gesture state
      const currentZoom = gestureReturn.state.scale;

      if (currentZoom === 1) {
        // Zoom in to point
        gestureReturn.zoomToPoint(DOUBLE_TAP_ZOOM, point);
      } else {
        // Reset zoom
        gestureReturn.reset();
      }
    },
    [onDoubleTap],
  );

  // Initialize gesture hook
  const gestureReturn = useGestures(
    {
      onZoomChange: (scale) => {
        onZoomChange?.(scale);
      },
      onPanChange: (x, y) => {
        onPanChange?.(x, y);
      },
      onDoubleTap: handleDoubleTap,
      onRotationChange: (rot) => {
        setRotation(rot);
        onRotationChange?.(rot);
      },
    },
    {
      minScale: minZoom,
      maxScale: maxZoom,
      initialScale: initialZoom,
      enablePinchZoom: true,
      enableWheelZoom: true,
      enablePan: true,
      enableDoubleTap: true,
      enableMomentum,
      enableRotation: false, // We'll handle rotation separately with buttons
      reducedMotion,
    },
  );

  const {
    state,
    zoomIn: gestureZoomIn,
    zoomOut: gestureZoomOut,
    reset,
    getTransformStyle,
  } = gestureReturn;

  // Control handlers
  const handleZoomIn = useCallback(() => {
    gestureZoomIn(zoomStep);
  }, [gestureZoomIn, zoomStep]);

  const handleZoomOut = useCallback(() => {
    gestureZoomOut(zoomStep);
  }, [gestureZoomOut, zoomStep]);

  const handleRotateLeft = useCallback(() => {
    const newRotation = (rotation - 90 + 360) % 360;
    setRotation(newRotation);
    onRotationChange?.(newRotation);
  }, [rotation, onRotationChange]);

  const handleRotateRight = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    onRotationChange?.(newRotation);
  }, [rotation, onRotationChange]);

  const handleReset = useCallback(() => {
    reset();
    setRotation(0);
    onRotationChange?.(0);
  }, [reset, onRotationChange]);

  // Image load handlers
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  }, [onError]);

  // Controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControlsOverlay(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      setShowControlsOverlay(false);
    }, 3000);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    reset();
    setRotation(0);
  }, [src, reset]);

  // Get combined transform style
  const transformStyle = getTransformStyle();
  const combinedStyle: React.CSSProperties = {
    ...transformStyle,
    transform: `${transformStyle.transform} rotate(${rotation}deg)`.replace(
      /rotate\(0deg\)\s*rotate/,
      "rotate",
    ),
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black/95",
        containerClassName,
      )}
      onMouseMove={handleMouseMove}
      data-testid="zoomable-image-container"
    >
      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          data-testid="loading-indicator"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="flex flex-col items-center justify-center text-white/60"
          data-testid="error-state"
        >
          <svg
            className="mb-2 h-16 w-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>Failed to load image</p>
        </div>
      )}

      {/* Image */}
      <div
        ref={gestureReturn.ref as React.RefObject<HTMLDivElement>}
        className="relative flex h-full w-full items-center justify-center"
        role="application"
        aria-label="Zoomable image viewer - use pinch or mouse wheel to zoom, drag to pan"
        data-testid="gesture-container"
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          style={combinedStyle}
          className={cn(
            "max-h-full max-w-full select-none object-contain",
            !isLoaded && "opacity-0",
            className,
          )}
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
          data-testid="zoomable-image"
        />
      </div>

      {/* Zoom level indicator */}
      {showZoomLevel && isLoaded && (
        <div
          className={cn(
            "absolute left-4 top-4 rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-opacity",
            showControlsOverlay ? "opacity-100" : "opacity-0",
          )}
          data-testid="zoom-level"
        >
          {Math.round(state.scale * 100)}%
        </div>
      )}

      {/* Controls overlay */}
      {showControls && isLoaded && (
        <div
          className={cn(
            "absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/60 p-1 backdrop-blur-sm transition-opacity",
            showControlsOverlay
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
          data-testid="controls"
        >
          {/* Zoom out */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={state.scale <= minZoom}
            aria-label="Zoom out"
            data-testid="zoom-out-button"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>

          {/* Zoom level display */}
          <span
            className="min-w-[60px] text-center text-sm font-medium text-white"
            data-testid="zoom-display"
          >
            {Math.round(state.scale * 100)}%
          </span>

          {/* Zoom in */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={state.scale >= maxZoom}
            aria-label="Zoom in"
            data-testid="zoom-in-button"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>

          {/* Separator */}
          <div className="mx-1 h-5 w-px bg-white/30" />

          {/* Rotation controls */}
          {enableRotation && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={handleRotateLeft}
                aria-label="Rotate left"
                data-testid="rotate-left-button"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={handleRotateRight}
                aria-label="Rotate right"
                data-testid="rotate-right-button"
              >
                <RotateCw className="h-5 w-5" />
              </Button>

              {/* Separator */}
              <div className="mx-1 h-5 w-px bg-white/30" />
            </>
          )}

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/20"
            onClick={handleReset}
            aria-label="Reset view"
            data-testid="reset-button"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ZoomableImage;
