"use client";

/**
 * FullscreenMediaViewer - Complete media viewing experience
 *
 * Features:
 * - Full-screen modal with dark overlay
 * - Keyboard navigation (arrows, escape)
 * - Swipe between images on touch
 * - Pinch-to-zoom for images
 * - Full video controls
 * - Thumbnail strip navigation
 * - Image counter
 * - Download, share, delete actions
 * - Info panel
 * - Accessibility support
 * - Reduced motion support
 */

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { useGestures, type SwipeDirection } from "@/hooks/use-gestures";
import { ZoomableImage } from "./ZoomableImage";
import { EnhancedVideoPlayer } from "./EnhancedVideoPlayer";
import { ThumbnailStrip } from "./ThumbnailStrip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Download,
  Share2,
  Trash2,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface FullscreenMediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;

  // Callbacks
  onDownload?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  onIndexChange?: (index: number) => void;

  // Options
  showThumbnails?: boolean;
  showInfo?: boolean;
  showActions?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  reducedMotion?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }
  return "Just now";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ============================================================================
// Component
// ============================================================================

export function FullscreenMediaViewer({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
  onShare,
  onDelete,
  onIndexChange,
  showThumbnails = true,
  showInfo: initialShowInfo = false,
  showActions = true,
  loop = false,
  autoPlay = false,
  reducedMotion = false,
}: FullscreenMediaViewerProps) {
  // State
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(initialShowInfo);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Computed
  const currentItem = items[currentIndex] || null;
  const hasNext = loop || currentIndex < items.length - 1;
  const hasPrevious = loop || currentIndex > 0;
  const totalItems = items.length;

  // ========================================================================
  // Navigation
  // ========================================================================

  const goToIndex = useCallback(
    (index: number) => {
      let newIndex = index;

      if (loop) {
        if (index < 0) {
          newIndex = items.length - 1;
        } else if (index >= items.length) {
          newIndex = 0;
        }
      } else {
        newIndex = Math.max(0, Math.min(index, items.length - 1));
      }

      setCurrentIndex(newIndex);
      setIsLoading(true);
      onIndexChange?.(newIndex);
    },
    [items.length, loop, onIndexChange],
  );

  const goNext = useCallback(() => {
    if (hasNext) {
      goToIndex(currentIndex + 1);
    }
  }, [currentIndex, hasNext, goToIndex]);

  const goPrevious = useCallback(() => {
    if (hasPrevious) {
      goToIndex(currentIndex - 1);
    }
  }, [currentIndex, hasPrevious, goToIndex]);

  // ========================================================================
  // Swipe Gesture Handler
  // ========================================================================

  const handleSwipe = useCallback(
    (swipe: SwipeDirection) => {
      if (swipe.direction === "left" && hasNext) {
        goNext();
      } else if (swipe.direction === "right" && hasPrevious) {
        goPrevious();
      }
    },
    [hasNext, hasPrevious, goNext, goPrevious],
  );

  // Use gestures for swipe navigation (only for non-zoomed state)
  useGestures(
    {
      onSwipe: handleSwipe,
    },
    {
      enableSwipe: true,
      enablePinchZoom: false,
      enableWheelZoom: false,
      enablePan: false,
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
    },
  );

  // ========================================================================
  // Keyboard Navigation
  // ========================================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen?.();
          } else {
            onClose();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Home":
          e.preventDefault();
          goToIndex(0);
          break;
        case "End":
          e.preventDefault();
          goToIndex(items.length - 1);
          break;
        case "i":
          e.preventDefault();
          setShowInfo((prev) => !prev);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    isFullscreen,
    goPrevious,
    goNext,
    goToIndex,
    items.length,
    onClose,
  ]);

  // ========================================================================
  // Fullscreen
  // ========================================================================

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ========================================================================
  // Actions
  // ========================================================================

  const handleDownload = useCallback(() => {
    if (currentItem) {
      onDownload?.(currentItem);
    }
  }, [currentItem, onDownload]);

  const handleShare = useCallback(() => {
    if (currentItem) {
      onShare?.(currentItem);
    }
  }, [currentItem, onShare]);

  const handleDelete = useCallback(() => {
    if (currentItem) {
      onDelete?.(currentItem);
    }
  }, [currentItem, onDelete]);

  // ========================================================================
  // Reset on open/close
  // ========================================================================

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsLoading(true);
    }
  }, [isOpen, initialIndex]);

  // ========================================================================
  // Render Media
  // ========================================================================

  const renderMedia = () => {
    if (!currentItem) return null;

    switch (currentItem.fileType) {
      case "image":
        return (
          <ZoomableImage
            src={currentItem.url}
            alt={currentItem.fileName}
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            showControls={true}
            enableRotation={true}
            enableMomentum={!reducedMotion}
            reducedMotion={reducedMotion}
          />
        );

      case "video":
        return (
          <EnhancedVideoPlayer
            src={currentItem.url}
            poster={currentItem.thumbnailUrl || undefined}
            title={currentItem.fileName}
            autoPlay={autoPlay}
            onPlay={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            showControls={true}
            showPictureInPicture={true}
          />
        );

      case "audio":
        return (
          <div className="flex h-full w-full items-center justify-center p-8">
            <EnhancedVideoPlayer
              src={currentItem.url}
              title={currentItem.fileName}
              autoPlay={autoPlay}
              showControls={true}
              showFullscreen={false}
              showPictureInPicture={false}
              className="max-w-md"
            />
          </div>
        );

      default:
        return (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <div className="mb-4 rounded-xl bg-white/10 p-6">
              <svg
                className="h-20 w-20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">{currentItem.fileName}</p>
            <p className="mt-1 text-sm text-white/60">
              {formatFileSize(currentItem.fileSize)}
            </p>
            {onDownload && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        );
    }
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (!isOpen || !currentItem) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          data-testid="viewer-overlay"
        />

        {/* Content */}
        <Dialog.Content
          ref={containerRef}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          aria-label="Media viewer"
          data-testid="fullscreen-media-viewer"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-black/50 px-4 py-2">
            <div className="flex items-center gap-3">
              {/* Uploader info */}
              <Avatar className="h-8 w-8">
                {currentItem.uploadedBy.avatarUrl && (
                  <AvatarImage src={currentItem.uploadedBy.avatarUrl} />
                )}
                <AvatarFallback>
                  {currentItem.uploadedBy.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">
                  {currentItem.uploadedBy.displayName}
                </p>
                <p className="text-xs text-white/60">
                  {getRelativeTime(currentItem.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Counter */}
              {totalItems > 1 && (
                <span
                  className="mr-4 text-sm text-white/60"
                  data-testid="media-counter"
                >
                  {currentIndex + 1} / {totalItems}
                </span>
              )}

              {/* Info toggle */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 text-white hover:bg-white/20",
                  showInfo && "bg-white/20",
                )}
                onClick={() => setShowInfo(!showInfo)}
                aria-label={showInfo ? "Hide info" : "Show info"}
                data-testid="info-button"
              >
                <Info className="h-5 w-5" />
              </Button>

              {/* Actions */}
              {showActions && (
                <>
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={handleDownload}
                      aria-label="Download"
                      data-testid="download-button"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  )}

                  {onShare && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-white hover:bg-white/20"
                      onClick={handleShare}
                      aria-label="Share"
                      data-testid="share-button"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  )}

                  {onDelete && currentItem.canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-white hover:bg-red-500/20"
                      onClick={handleDelete}
                      aria-label="Delete"
                      data-testid="delete-button"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}

              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                }
                data-testid="fullscreen-button"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>

              {/* Close */}
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/20"
                  aria-label="Close"
                  data-testid="close-button"
                >
                  <X className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          {/* Main content */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* Media viewer */}
            <div
              ref={swipeContainerRef}
              className={cn("flex-1", showInfo && "mr-80")}
              data-testid="media-container"
            >
              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}

              {renderMedia()}
            </div>

            {/* Navigation buttons */}
            {hasPrevious && (
              <button
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={goPrevious}
                aria-label="Previous"
                data-testid="previous-button"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {hasNext && (
              <button
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={goNext}
                aria-label="Next"
                data-testid="next-button"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Info panel */}
            {showInfo && (
              <div
                className="absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-black/80 p-4 backdrop-blur-sm"
                data-testid="info-panel"
              >
                <h3 className="mb-4 text-lg font-semibold text-white">
                  Details
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <dt className="text-white/60">File name</dt>
                    <dd className="text-white">{currentItem.fileName}</dd>
                  </div>

                  <div>
                    <dt className="text-white/60">Type</dt>
                    <dd className="text-white capitalize">
                      {currentItem.fileType}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-white/60">Size</dt>
                    <dd className="text-white">
                      {formatFileSize(currentItem.fileSize)}
                    </dd>
                  </div>

                  {currentItem.metadata.dimensions && (
                    <div>
                      <dt className="text-white/60">Dimensions</dt>
                      <dd className="text-white">
                        {currentItem.metadata.dimensions.width} x{" "}
                        {currentItem.metadata.dimensions.height}
                      </dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-white/60">Uploaded by</dt>
                    <dd className="text-white">
                      {currentItem.uploadedBy.displayName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-white/60">Uploaded</dt>
                    <dd className="text-white">
                      {new Date(currentItem.createdAt).toLocaleString()}
                    </dd>
                  </div>

                  {currentItem.channelName && (
                    <div>
                      <dt className="text-white/60">Channel</dt>
                      <dd className="text-white">#{currentItem.channelName}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with thumbnails */}
          <div className="bg-black/50 px-4 py-3">
            {showThumbnails && totalItems > 1 ? (
              <ThumbnailStrip
                items={items}
                currentIndex={currentIndex}
                onSelect={goToIndex}
                thumbnailSize="md"
                showCounter={false}
              />
            ) : (
              <p className="text-center text-sm text-white">
                {currentItem.fileName}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default FullscreenMediaViewer;
