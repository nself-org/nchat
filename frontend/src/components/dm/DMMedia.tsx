"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Image as ImageIcon,
  Play,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DirectMessage, DMMediaItem } from "@/lib/dm/dm-types";
import { useDMStore, selectMediaItems } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMMediaProps {
  dm: DirectMessage;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DMMedia({ dm, className }: DMMediaProps) {
  const mediaItems = useDMStore(selectMediaItems(dm.id));
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const selectedItem =
    selectedIndex !== null ? mediaItems[selectedIndex] : null;

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < mediaItems.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleDownload = (item: DMMediaItem) => {
    window.open(item.url, "_blank");
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-3 gap-1", className)}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
      >
        <ImageIcon className="text-muted-foreground/50 mb-4 h-12 w-12" />
        <h3 className="text-sm font-medium">No media</h3>
        <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
          Photos and videos shared in this conversation will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ImageIcon className="h-4 w-4" />
          Media ({mediaItems.length})
        </h3>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-3 gap-1">
          {mediaItems.map((item, index) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Lightbox */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => !open && setSelectedIndex(null)}
      >
        <DialogContent className="h-[90vh] max-w-4xl border-none bg-black/95 p-0">
          <div className="relative flex h-full flex-col">
            {/* Header */}
            <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
              <div className="text-sm text-white">
                {selectedIndex !== null && (
                  <span>
                    {selectedIndex + 1} of {mediaItems.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedItem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setSelectedIndex(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 items-center justify-center p-4">
              {selectedItem && (
                <>
                  {selectedItem.type === "video" ? (
                    <video
                      src={selectedItem.url}
                      controls
                      autoPlay
                      className="max-h-full max-w-full object-contain"
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <img
                      src={selectedItem.url}
                      alt="Media content"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </>
              )}
            </div>

            {/* Navigation */}
            {selectedIndex !== null && selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {selectedIndex !== null &&
              selectedIndex < mediaItems.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

            {/* Footer with info */}
            {selectedItem && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                <div className="text-sm text-white">
                  <p className="font-medium">{selectedItem.user.displayName}</p>
                  <p className="text-xs text-white/70">
                    {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Media Thumbnail Component
// ============================================================================

interface MediaThumbnailProps {
  item: DMMediaItem;
  onClick: () => void;
}

function MediaThumbnail({ item, onClick }: MediaThumbnailProps) {
  const isVideo = item.type === "video";

  return (
    <button
      className="group relative aspect-square w-full overflow-hidden rounded-sm"
      onClick={onClick}
    >
      <img
        src={item.thumbnailUrl || item.url}
        alt="Media thumbnail"
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
      />
      {/* Video indicator */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </div>
        </div>
      )}
      {/* Duration badge for videos */}
      {isVideo && item.duration && (
        <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {formatDuration(item.duration)}
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
    </button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

DMMedia.displayName = "DMMedia";
