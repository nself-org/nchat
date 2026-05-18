"use client";

/**
 * MediaItem - Single media item component for galleries
 *
 * Displays a media item with thumbnail, info, and interaction states.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  MediaItem as MediaItemType,
  MediaViewMode,
} from "@/lib/media/media-types";
import {
  formatFileSize,
  formatDuration,
  getMediaTypeIcon,
} from "@/lib/media/media-manager";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@radix-ui/react-checkbox";
import {
  Image,
  Video,
  Music,
  FileText,
  Archive,
  File,
  Play,
  CheckCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface MediaItemProps {
  item: MediaItemType;
  viewMode?: MediaViewMode;
  isSelected?: boolean;
  isSelectMode?: boolean;
  showInfo?: boolean;
  onClick?: (item: MediaItemType) => void;
  onSelect?: (item: MediaItemType) => void;
  onDoubleClick?: (item: MediaItemType) => void;
  className?: string;
}

// ============================================================================
// Icon Map
// ============================================================================

const MediaTypeIcons = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  archive: Archive,
  other: File,
};

// ============================================================================
// Component
// ============================================================================

export function MediaItem({
  item,
  viewMode = "grid",
  isSelected = false,
  isSelectMode = false,
  showInfo = true,
  onClick,
  onSelect,
  onDoubleClick,
  className,
}: MediaItemProps) {
  const TypeIcon = MediaTypeIcons[item.fileType] || File;

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.(item);
    } else if ("shiftKey" in e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSelect?.(item);
    } else {
      onClick?.(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(e);
    }
  };

  const handleDoubleClick = () => {
    if (!isSelectMode) {
      onDoubleClick?.(item);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onSelect?.(item);
  };

  const handleCheckboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCheckboxClick(e);
    }
  };

  // Grid view
  if (viewMode === "grid" || viewMode === "masonry") {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-all",
          "hover:border-primary/50 hover:shadow-md",
          isSelected && "ring-primary/30 border-primary ring-2",
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Thumbnail */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.fileName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <TypeIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Video play overlay */}
          {item.fileType === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/90 p-3">
                <Play className="h-6 w-6 fill-current text-black" />
              </div>
            </div>
          )}

          {/* Duration badge for video/audio */}
          {item.metadata.duration && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              {formatDuration(item.metadata.duration)}
            </div>
          )}

          {/* Selection checkbox */}
          {(isSelectMode || isSelected) && (
            <div
              role="checkbox"
              tabIndex={0}
              aria-checked={isSelected ? "true" : "false"}
              className="absolute left-2 top-2 z-10"
              onClick={handleCheckboxClick}
              onKeyDown={handleCheckboxKeyDown}
            >
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected
                    ? "text-primary-foreground border-primary bg-primary"
                    : "hover:border-primary/50 border-white bg-black/30 text-transparent",
                )}
              >
                {isSelected && <CheckCircle className="h-4 w-4" />}
              </div>
            </div>
          )}

          {/* Type icon badge */}
          <div className="absolute right-2 top-2 rounded bg-black/50 p-1">
            <TypeIcon className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Info */}
        {showInfo && (
          <div className="p-2">
            <p className="truncate text-sm font-medium">{item.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)}
            </p>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        isSelected && "ring-primary/30 border-primary bg-accent ring-1",
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection checkbox */}
      {(isSelectMode || isSelected) && (
        <div
          role="checkbox"
          tabIndex={0}
          aria-checked={isSelected ? "true" : "false"}
          onClick={handleCheckboxClick}
          onKeyDown={handleCheckboxKeyDown}
        >
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              isSelected
                ? "text-primary-foreground border-primary bg-primary"
                : "border-muted-foreground/50 hover:border-primary/50 text-transparent",
            )}
          >
            {isSelected && <CheckCircle className="h-4 w-4" />}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.fileName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(item.fileSize)}</span>
          {item.metadata.duration && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span>{formatDuration(item.metadata.duration)}</span>
            </>
          )}
          <span className="text-muted-foreground/50">|</span>
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Uploader */}
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          {item.uploadedBy.avatarUrl && (
            <AvatarImage src={item.uploadedBy.avatarUrl} />
          )}
          <AvatarFallback className="text-xs">
            {item.uploadedBy.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {item.uploadedBy.displayName}
        </span>
      </div>

      {/* Type icon */}
      <TypeIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

export default MediaItem;
