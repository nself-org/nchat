"use client";

/**
 * VideoPreview - Direct video link preview
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { VideoPreviewData } from "@/lib/link-preview";

export interface VideoPreviewProps {
  /** Video preview data */
  data: VideoPreviewData;
  /** Auto-play video */
  autoPlay?: boolean;
  /** Additional class name */
  className?: string;
  /** Children (for action buttons) */
  children?: React.ReactNode;
}

export function VideoPreview({
  data,
  autoPlay = false,
  className,
  children,
}: VideoPreviewProps) {
  const handleClick = () => {
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  // Check if this is an embeddable video
  const videoUrl = data.url;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Video or thumbnail */}
      <div className="relative aspect-video bg-black">
        {videoUrl && !data.image ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={videoUrl}
            controls
            autoPlay={autoPlay}
            muted={autoPlay}
            className="h-full w-full object-contain"
            preload="metadata"
          />
        ) : (
          <div
            className="relative h-full w-full cursor-pointer"
            onClick={handleClick}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }}
          >
            {data.image && (
              <img
                src={data.image}
                alt={data.title || "Video preview"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <svg
                  className="ml-1 h-8 w-8 text-black"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with info */}
      {(data.title || data.description) && (
        <div className="border-t p-3">
          {data.title && (
            <p className="truncate text-sm font-semibold">{data.title}</p>
          )}
          {data.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {data.description}
            </p>
          )}
          {data.domain && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {data.favicon && (
                <img src={data.favicon} alt="" className="h-4 w-4" />
              )}
              {data.domain}
            </p>
          )}
        </div>
      )}

      {/* Children (remove button, etc.) */}
      {children && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default VideoPreview;
