/**
 * ImageGallery Component
 *
 * Lightbox gallery for viewing multiple images with navigation.
 */

"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Attachment } from "@/types/attachment";
import type { AttachmentItem } from "@/hooks/use-attachments";

// ============================================================================
// Types
// ============================================================================

type GalleryImage = Attachment | AttachmentItem;

export interface ImageGalleryProps {
  /** Images to display */
  images: GalleryImage[];
  /** Initially selected image index */
  initialIndex?: number;
  /** Whether gallery is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Enable keyboard navigation */
  enableKeyboard?: boolean;
  /** Enable swipe gestures */
  enableSwipe?: boolean;
  /** Show thumbnail strip */
  showThumbnails?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ImageGallery({
  images,
  initialIndex = 0,
  open = false,
  onOpenChange,
  className,
  enableKeyboard = true,
  enableSwipe = true,
  showThumbnails = true,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [images.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  // ============================================================================
  // Zoom Controls
  // ============================================================================

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // ============================================================================
  // Keyboard Navigation
  // ============================================================================

  useEffect(() => {
    if (!open || !enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange?.(false);
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoomIn();
          break;
        case "-":
          e.preventDefault();
          zoomOut();
          break;
        case "0":
          e.preventDefault();
          resetZoom();
          break;
        case "r":
        case "R":
          e.preventDefault();
          rotate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    enableKeyboard,
    goToNext,
    goToPrev,
    onOpenChange,
    zoomIn,
    zoomOut,
    resetZoom,
    rotate,
  ]);

  // ============================================================================
  // Mouse/Touch Drag
  // ============================================================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsDragging(true);
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [zoom, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - startPos.current.x,
        y: e.clientY - startPos.current.y,
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ============================================================================
  // Touch Swipe
  // ============================================================================

  const touchStart = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe || zoom > 1) return;

      const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.current.y;

      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          goToPrev();
        } else {
          goToNext();
        }
      }
    },
    [enableSwipe, zoom, goToPrev, goToNext],
  );

  // ============================================================================
  // Download
  // ============================================================================

  const handleDownload = useCallback(() => {
    const image = images[currentIndex];
    if (image.url) {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = image.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [images, currentIndex]);

  // ============================================================================
  // Render
  // ============================================================================

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];
  const imageUrl =
    currentImage.url ||
    ("previewUrl" in currentImage ? currentImage.previewUrl : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "h-screen w-screen max-w-none gap-0 border-0 bg-black/95 p-0",
          className,
        )}
      >
        <DialogTitle className="sr-only">
          Image Gallery - {currentImage.name}
        </DialogTitle>
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center gap-4 text-white">
            <span className="text-sm opacity-75">
              {currentIndex + 1} / {images.length}
            </span>
            <span className="max-w-[200px] truncate text-sm font-medium">
              {currentImage.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={zoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="w-12 text-center text-sm text-white">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={zoomIn}
              disabled={zoom >= 5}
            >
              <ZoomIn className="h-5 w-5" />
            </Button>

            {/* Rotate */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={rotate}
            >
              <RotateCw className="h-5 w-5" />
            </Button>

            {/* Reset */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={resetZoom}
            >
              <Maximize className="h-5 w-5" />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
            </Button>

            {/* Open in new tab */}
            {currentImage.url && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => window.open(currentImage.url, "_blank")}
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => onOpenChange?.(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main image area */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          ref={imageRef}
          className="flex flex-1 items-center justify-center overflow-hidden"
          role="img"
          aria-label={`Image ${currentIndex + 1} of ${images.length}: ${currentImage.name}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.2s",
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={currentImage.name}
                  className="max-h-[80vh] max-w-[90vw] select-none object-contain"
                  draggable={false}
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-white/10">
                  <p className="text-white/60">No preview available</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 h-12 w-12 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goToPrev}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Thumbnail strip */}
        {showThumbnails && images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex items-center justify-center gap-2 overflow-x-auto">
              {images.map((image, index) => {
                const thumbUrl =
                  image.thumbnailUrl ||
                  ("previewUrl" in image ? image.previewUrl : image.url);
                return (
                  <motion.button
                    key={image.id}
                    className={cn(
                      "h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      index === currentIndex
                        ? "scale-110 border-white"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                    onClick={() => goToIndex(index)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={image.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/20">
                        <Grid className="h-6 w-6 text-white/60" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Grid Gallery Component
// ============================================================================

export interface ImageGalleryGridProps {
  /** Images to display */
  images: GalleryImage[];
  /** Maximum images to show before "show more" */
  maxVisible?: number;
  /** Image size */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
  /** Click handler */
  onImageClick?: (index: number) => void;
}

export function ImageGalleryGrid({
  images,
  maxVisible = 4,
  size = "md",
  className,
  onImageClick,
}: ImageGalleryGridProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const visibleImages = images.slice(0, maxVisible);
  const remainingCount = images.length - maxVisible;

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleClick = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setGalleryOpen(true);
      onImageClick?.(index);
    },
    [onImageClick],
  );

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {visibleImages.map((image, index) => {
          const thumbUrl =
            image.thumbnailUrl ||
            ("previewUrl" in image ? image.previewUrl : image.url);

          const isLast = index === maxVisible - 1 && remainingCount > 0;

          return (
            <motion.button
              key={image.id}
              className={cn(
                "relative overflow-hidden rounded-lg border",
                sizeClasses[size],
              )}
              onClick={() => handleClick(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={image.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <Grid className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              {isLast && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="font-medium text-white">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <ImageGallery
        images={images}
        initialIndex={selectedIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </>
  );
}
