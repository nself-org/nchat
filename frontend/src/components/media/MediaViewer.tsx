"use client";

/**
 * MediaViewer - Full-screen media viewer with navigation
 *
 * Displays images, videos, audio, and documents in a modal lightbox.
 */

import * as React from "react";
import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MediaItem as MediaItemType } from "@/lib/media/media-types";
import { formatFileSize, getRelativeTime } from "@/lib/media/media-manager";
import { useMediaViewer } from "@/hooks/useMediaViewer";
import { ImageViewer } from "./ImageViewer";
import { VideoPlayer } from "./VideoPlayer";
import { AudioPlayer } from "./AudioPlayer";
import { DocumentViewer } from "./DocumentViewer";
import { MediaInfo } from "./MediaInfo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

// ============================================================================
// Types
// ============================================================================

export interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: MediaItemType) => void;
  onShare?: (item: MediaItemType) => void;
  onDelete?: (item: MediaItemType) => void;
}

// ============================================================================
// Component
// ============================================================================

export function MediaViewer({
  isOpen,
  onClose,
  onDownload,
  onShare,
  onDelete,
}: MediaViewerProps) {
  const {
    currentItem,
    currentIndex,
    totalItems,
    hasNext,
    hasPrevious,
    next,
    previous,
    zoom,
    panX,
    panY,
    rotation,
    setZoom,
    setPan,
    rotate,
    resetView,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    isFullscreen,
    toggleFullscreen,
    showInfo,
    toggleInfo,
  } = useMediaViewer({
    enableKeyboardNavigation: true,
    enableFullscreen: true,
  });

  // Handle download
  const handleDownload = useCallback(() => {
    if (currentItem) {
      onDownload?.(currentItem);
    }
  }, [currentItem, onDownload]);

  // Handle share
  const handleShare = useCallback(() => {
    if (currentItem) {
      onShare?.(currentItem);
    }
  }, [currentItem, onShare]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (currentItem) {
      onDelete?.(currentItem);
    }
  }, [currentItem, onDelete]);

  // Render media based on type
  const renderMedia = () => {
    if (!currentItem) return null;

    switch (currentItem.fileType) {
      case "image":
        return (
          <ImageViewer
            item={currentItem}
            zoom={zoom}
            panX={panX}
            panY={panY}
            rotation={rotation}
            onZoomChange={setZoom}
            onPanChange={setPan}
            onRotationChange={(deg) => rotate(deg - rotation)}
            onDownload={handleDownload}
            showControls={true}
          />
        );

      case "video":
        return (
          <VideoPlayer
            item={currentItem}
            isPlaying={isPlaying}
            currentTime={currentTime}
            volume={volume}
            isMuted={isMuted}
            playbackRate={playbackRate}
            isFullscreen={isFullscreen}
            onPlayChange={togglePlay}
            onTimeChange={seek}
            onVolumeChange={setVolume}
            onMutedChange={toggleMute}
            onPlaybackRateChange={setPlaybackRate}
            onFullscreenChange={toggleFullscreen}
            onDownload={handleDownload}
          />
        );

      case "audio":
        return (
          <div className="flex h-full w-full items-center justify-center p-8">
            <AudioPlayer
              item={currentItem}
              isPlaying={isPlaying}
              currentTime={currentTime}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              onPlayChange={togglePlay}
              onTimeChange={seek}
              onVolumeChange={setVolume}
              onMutedChange={toggleMute}
              onPlaybackRateChange={setPlaybackRate}
              onDownload={handleDownload}
            />
          </div>
        );

      case "document":
      case "archive":
      default:
        return (
          <DocumentViewer
            item={currentItem}
            embedPdf={currentItem.mimeType === "application/pdf"}
            onDownload={handleDownload}
            onOpenExternal={() => window.open(currentItem.url, "_blank")}
          />
        );
    }
  };

  if (!isOpen || !currentItem) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" />

        <Dialog.Content className="fixed inset-0 z-50 flex flex-col outline-none">
          {/* Header */}
          <div className="flex items-center justify-between bg-black/50 px-4 py-2">
            <div className="flex items-center gap-3">
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
                <span className="mr-4 text-sm text-white/60">
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
                onClick={toggleInfo}
              >
                <Info className="h-5 w-5" />
              </Button>

              {/* Download */}
              {onDownload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}

              {/* Share */}
              {onShare && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-white/20"
                  onClick={handleShare}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              )}

              {/* Delete */}
              {onDelete && currentItem.canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:bg-red-500/20"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* Media viewer */}
            <div className={cn("flex-1", showInfo && "mr-80")}>
              {renderMedia()}
            </div>

            {/* Navigation buttons */}
            {hasPrevious && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
                onClick={previous}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {hasNext && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:bg-black/70"
                onClick={next}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Info panel */}
            {showInfo && (
              <div className="absolute right-0 top-0 h-full w-80 border-l border-white/10 bg-black/80 backdrop-blur-sm">
                <MediaInfo item={currentItem} />
              </div>
            )}
          </div>

          {/* File name footer */}
          <div className="bg-black/50 px-4 py-2 text-center">
            <p className="text-sm text-white">{currentItem.fileName}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MediaViewer;
