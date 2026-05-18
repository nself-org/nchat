"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
  memo,
  CSSProperties,
} from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface PinchZoomProps {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  doubleTapScale?: number;
  enableRotation?: boolean;
  enableDownload?: boolean;
  downloadUrl?: string;
  downloadFilename?: string;
  className?: string;
  onClose?: () => void;
  onZoomChange?: (scale: number) => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const DOUBLE_TAP_DELAY = 300;
const ROTATION_STEP = 90;

// ============================================================================
// Component
// ============================================================================

/**
 * Pinch-to-zoom component for images and content
 *
 * Features:
 * - Pinch to zoom (1x to 4x)
 * - Double-tap to zoom
 * - Pan when zoomed
 * - Rotation support
 * - Smooth animations
 * - Reset on close
 * - Download support
 * - Fullscreen mode
 *
 * @example
 * ```tsx
 * <PinchZoom
 *   minScale={1}
 *   maxScale={4}
 *   enableRotation
 *   downloadUrl={imageUrl}
 * >
 *   <img src={imageUrl} alt="Zoomable image" />
 * </PinchZoom>
 * ```
 */
export const PinchZoom = memo(function PinchZoom({
  children,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
  initialScale = MIN_SCALE,
  doubleTapScale = DOUBLE_TAP_SCALE,
  enableRotation = false,
  enableDownload = false,
  downloadUrl,
  downloadFilename = "image.jpg",
  className,
  onClose,
  onZoomChange,
}: PinchZoomProps) {
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const initialPinchDistance = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate distance between two touch points
  const getDistance = useCallback(
    (touch1: TouchPoint, touch2: TouchPoint): number => {
      const dx = touch2.x - touch1.x;
      const dy = touch2.y - touch1.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [],
  );

  // Get touch points
  const getTouchPoints = useCallback((e: TouchEvent): TouchPoint[] => {
    return Array.from(e.touches).map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
    }));
  }, []);

  // Handle pinch zoom
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch gesture started
        e.preventDefault();
        const points = getTouchPoints(e);
        initialPinchDistance.current = getDistance(points[0], points[1]);
        initialScaleRef.current = scale;
      }
    },
    [scale, getTouchPoints, getDistance],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance.current > 0) {
        // Pinch zoom
        e.preventDefault();
        const points = getTouchPoints(e);
        const currentDistance = getDistance(points[0], points[1]);
        const scaleChange = currentDistance / initialPinchDistance.current;
        const newScale = Math.min(
          Math.max(initialScaleRef.current * scaleChange, minScale),
          maxScale,
        );

        setScale(newScale);
        onZoomChange?.(newScale);
      }
    },
    [getTouchPoints, getDistance, minScale, maxScale, onZoomChange],
  );

  const handleTouchEnd = useCallback(() => {
    initialPinchDistance.current = 0;
  }, []);

  // Handle double-tap to zoom
  const handleDoubleTap = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();

      if (now - lastTapTime < DOUBLE_TAP_DELAY) {
        // Double tap detected
        e.preventDefault();

        const newScale = scale === minScale ? doubleTapScale : minScale;
        setScale(newScale);
        onZoomChange?.(newScale);

        if (newScale === minScale) {
          setPosition({ x: 0, y: 0 });
        }

        setLastTapTime(0);
      } else {
        setLastTapTime(now);
      }
    },
    [lastTapTime, scale, minScale, doubleTapScale, onZoomChange],
  );

  // Handle pan when zoomed
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (scale > minScale) {
        setPosition({
          x: position.x + info.delta.x,
          y: position.y + info.delta.y,
        });
      }
    },
    [scale, minScale, position],
  );

  // Zoom in
  const zoomIn = useCallback(() => {
    const newScale = Math.min(scale + 0.5, maxScale);
    setScale(newScale);
    onZoomChange?.(newScale);
  }, [scale, maxScale, onZoomChange]);

  // Zoom out
  const zoomOut = useCallback(() => {
    const newScale = Math.max(scale - 0.5, minScale);
    setScale(newScale);
    onZoomChange?.(newScale);

    if (newScale === minScale) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, minScale, onZoomChange]);

  // Rotate
  const rotate = useCallback(() => {
    setRotation((prev) => (prev + ROTATION_STEP) % 360);
  }, []);

  // Reset
  const reset = useCallback(() => {
    setScale(minScale);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    onZoomChange?.(minScale);
  }, [minScale, onZoomChange]);

  // Download
  const handleDownload = useCallback(async () => {
    if (!downloadUrl) return;

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to download image:", error);
    }
  }, [downloadUrl, downloadFilename]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }

    setShowControls(true);

    controlsTimeout.current = setTimeout(() => {
      if (scale === minScale) {
        setShowControls(false);
      }
    }, 3000);
  }, [scale, minScale]);

  // Setup touch event listeners
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Reset on close
  useEffect(() => {
    return () => {
      reset();
    };
  }, []);

  // Show controls on interaction
  useEffect(() => {
    resetControlsTimeout();
  }, [scale, position, resetControlsTimeout]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  const transformStyle: CSSProperties = {
    transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
    transformOrigin: "center center",
    transition: "none",
  };

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events */
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
        className,
      )}
      onTouchStart={handleDoubleTap as any}
      onClick={resetControlsTimeout}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          resetControlsTimeout();
        }
      }}
      role="application"
      tabIndex={0}
      aria-label="Pinch to zoom image viewer"
    >
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events */}
      {/* Zoomable content */}
      <motion.div
        ref={contentRef}
        drag={scale > minScale}
        dragElastic={0}
        dragConstraints={containerRef}
        onDrag={handleDrag}
        animate={controls}
        style={transformStyle}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* Controls overlay */}
      {showControls && (
        <>
          {/* Top controls */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
            {/* Scale indicator */}
            <div className="rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
              {Math.round(scale * 100)}%
            </div>

            {/* Close button */}
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="h-11 w-11 touch-manipulation rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-center gap-2">
              {/* Zoom out */}
              <Button
                onClick={zoomOut}
                disabled={scale <= minScale}
                variant="ghost"
                size="icon"
                className="h-11 w-11 touch-manipulation rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 disabled:opacity-30"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>

              {/* Reset */}
              {scale !== minScale && (
                <Button
                  onClick={reset}
                  variant="ghost"
                  size="sm"
                  className="touch-manipulation rounded-full bg-black/50 px-4 text-white backdrop-blur-sm hover:bg-black/70"
                >
                  Reset
                </Button>
              )}

              {/* Zoom in */}
              <Button
                onClick={zoomIn}
                disabled={scale >= maxScale}
                variant="ghost"
                size="icon"
                className="h-11 w-11 touch-manipulation rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 disabled:opacity-30"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>

              {/* Rotation */}
              {enableRotation && (
                <Button
                  onClick={rotate}
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 touch-manipulation rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                  aria-label="Rotate"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
              )}

              {/* Download */}
              {enableDownload && downloadUrl && (
                <Button
                  onClick={handleDownload}
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 touch-manipulation rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                  aria-label="Download"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default PinchZoom;
