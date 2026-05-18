"use client";

/**
 * MediaInfo - Information panel for media viewer
 *
 * Displays metadata about the currently viewed media item.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media/media-types";
import { formatFileSize, getRelativeTime } from "@/lib/media/media-manager";

export interface MediaInfoProps {
  /** Media item to display info for */
  item: MediaItem;
  /** Additional class name */
  className?: string;
}

export function MediaInfo({ item, className }: MediaInfoProps) {
  return (
    <div className={cn("p-4 text-sm text-white", className)}>
      <h3 className="mb-4 text-lg font-semibold">File Information</h3>

      <div className="space-y-3">
        {/* File name */}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
            Name
          </p>
          <p className="break-all">{item.fileName}</p>
        </div>

        {/* File type */}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
            Type
          </p>
          <p>{item.mimeType}</p>
        </div>

        {/* File size */}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
            Size
          </p>
          <p>{formatFileSize(item.fileSize)}</p>
        </div>

        {/* Dimensions (for images/videos) */}
        {item.metadata.dimensions && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
              Dimensions
            </p>
            <p>
              {item.metadata.dimensions.width} x{" "}
              {item.metadata.dimensions.height} px
            </p>
          </div>
        )}

        {/* Duration (for audio/video) */}
        {item.metadata.duration && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
              Duration
            </p>
            <p>{formatDuration(item.metadata.duration)}</p>
          </div>
        )}

        {/* Uploaded by */}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
            Uploaded by
          </p>
          <p>{item.uploadedBy.displayName}</p>
        </div>

        {/* Upload date */}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
            Uploaded
          </p>
          <p>{getRelativeTime(item.createdAt)}</p>
        </div>

        {/* Channel/DM info */}
        {item.channelName && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-white/60">
              Shared in
            </p>
            <p>#{item.channelName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default MediaInfo;
