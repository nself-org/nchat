"use client";

/**
 * ThumbnailStrip - Horizontal scrolling thumbnail navigation
 *
 * Features:
 * - Horizontal scrolling with overflow
 * - Active thumbnail highlighting
 * - Click to navigate
 * - Smooth scroll to active thumbnail
 * - Touch-friendly scrolling
 * - Lazy loading thumbnails
 * - Keyboard navigation support
 */

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { Play, FileText, Music, Archive, File } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ThumbnailStripProps {
  items: MediaItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  className?: string;

  // UI options
  thumbnailSize?: "sm" | "md" | "lg";
  showCounter?: boolean;
  showFileType?: boolean;
  autoScroll?: boolean;
  lazyLoad?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const THUMBNAIL_SIZES = {
  sm: { width: 48, height: 48 },
  md: { width: 64, height: 64 },
  lg: { width: 80, height: 80 },
};

const FILE_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  video: Play,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: File,
};

// ============================================================================
// Component
// ============================================================================

export function ThumbnailStrip({
  items,
  currentIndex,
  onSelect,
  className,
  thumbnailSize = "md",
  showCounter = true,
  showFileType = true,
  autoScroll = true,
  lazyLoad = true,
}: ThumbnailStripProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // State
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Dimensions
  const { width, height } = THUMBNAIL_SIZES[thumbnailSize];

  // ========================================================================
  // Auto-scroll to active thumbnail
  // ========================================================================

  useEffect(() => {
    if (!autoScroll) return;

    const container = containerRef.current;
    const activeThumbnail = thumbnailRefs.current[currentIndex];

    if (container && activeThumbnail) {
      const containerRect = container.getBoundingClientRect();
      const thumbnailRect = activeThumbnail.getBoundingClientRect();

      // Check if thumbnail is out of view
      const isOutOfView =
        thumbnailRect.left < containerRect.left ||
        thumbnailRect.right > containerRect.right;

      if (isOutOfView) {
        activeThumbnail.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentIndex, autoScroll]);

  // ========================================================================
  // Lazy loading
  // ========================================================================

  useEffect(() => {
    if (!lazyLoad) {
      // Load all images immediately
      setLoadedImages(new Set(items.map((_, i) => i)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-index") || "0",
              10,
            );
            setLoadedImages((prev) => new Set([...prev, index]));
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "50px",
        threshold: 0,
      },
    );

    thumbnailRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => observer.disconnect();
  }, [items, lazyLoad]);

  // ========================================================================
  // Keyboard Navigation
  // ========================================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (index > 0) {
            onSelect(index - 1);
            thumbnailRefs.current[index - 1]?.focus();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (index < items.length - 1) {
            onSelect(index + 1);
            thumbnailRefs.current[index + 1]?.focus();
          }
          break;
        case "Home":
          e.preventDefault();
          onSelect(0);
          thumbnailRefs.current[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          onSelect(items.length - 1);
          thumbnailRefs.current[items.length - 1]?.focus();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect(index);
          break;
      }
    },
    [items.length, onSelect],
  );

  // ========================================================================
  // Render thumbnail
  // ========================================================================

  const renderThumbnail = useCallback(
    (item: MediaItem, index: number) => {
      const isActive = index === currentIndex;
      const isLoaded = loadedImages.has(index);
      const FileTypeIcon =
        FILE_TYPE_ICONS[item.fileType] || FILE_TYPE_ICONS.other;

      return (
        <button
          key={item.id}
          ref={(el) => {
            thumbnailRefs.current[index] = el;
          }}
          data-index={index}
          onClick={() => onSelect(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
            "focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black",
            isActive
              ? "border-white opacity-100"
              : "border-transparent opacity-60 hover:opacity-80",
          )}
          style={{ width, height }}
          aria-label={`Go to ${item.fileName} (${index + 1} of ${items.length})`}
          aria-current={isActive ? "true" : undefined}
          data-testid={`thumbnail-${index}`}
        >
          {/* Thumbnail image or placeholder */}
          {item.fileType === "image" || item.thumbnailUrl ? (
            <>
              {isLoaded ? (
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.fileName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-white/10" />
              )}
            </>
          ) : (
            // Non-image placeholder
            <div className="flex h-full w-full items-center justify-center bg-white/10">
              <FileTypeIcon className="h-6 w-6 text-white/60" />
            </div>
          )}

          {/* File type indicator */}
          {showFileType && item.fileType !== "image" && (
            <div className="absolute bottom-1 right-1 rounded bg-black/60 p-0.5">
              <FileTypeIcon className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Active indicator ring */}
          {isActive && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-white ring-offset-1 ring-offset-black" />
          )}
        </button>
      );
    },
    [
      currentIndex,
      items.length,
      loadedImages,
      onSelect,
      handleKeyDown,
      showFileType,
      width,
      height,
    ],
  );

  // ========================================================================
  // Render
  // ========================================================================

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", className)} data-testid="thumbnail-strip">
      {/* Counter */}
      {showCounter && (
        <div
          className="mb-2 text-center text-sm font-medium text-white/70"
          data-testid="thumbnail-counter"
        >
          {currentIndex + 1} / {items.length}
        </div>
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20"
        role="listbox"
        aria-label="Image gallery thumbnails"
        aria-activedescendant={`thumbnail-${currentIndex}`}
        data-testid="thumbnail-container"
      >
        {items.map(renderThumbnail)}
      </div>
    </div>
  );
}

export default ThumbnailStrip;
