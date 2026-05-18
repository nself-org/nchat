"use client";

/**
 * YouTube Embed Component
 *
 * Displays YouTube content with:
 * - Video thumbnail
 * - Play button overlay
 * - Video title
 * - Channel name
 * - Duration
 * - Inline player option
 *
 * @example
 * ```tsx
 * <YouTubeEmbed
 *   url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   videoId="dQw4w9WgXcQ"
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  parseYouTubeUrl,
  type ParsedYouTubeUrl,
} from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface YouTubeEmbedData {
  /**
   * Video ID
   */
  videoId: string;

  /**
   * Video title
   */
  title?: string;

  /**
   * Channel name
   */
  channelName?: string;

  /**
   * Channel avatar URL
   */
  channelAvatar?: string;

  /**
   * Video duration in seconds
   */
  duration?: number;

  /**
   * View count
   */
  views?: number;

  /**
   * Like count
   */
  likes?: number;

  /**
   * Upload date
   */
  uploadedAt?: string;

  /**
   * Video description
   */
  description?: string;
}

export interface YouTubeEmbedProps {
  /**
   * The YouTube URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedYouTubeUrl;

  /**
   * Pre-fetched video data (optional)
   */
  data?: YouTubeEmbedData;

  /**
   * Whether to auto-play when clicked
   * @default true
   */
  autoPlayOnClick?: boolean;

  /**
   * Whether to show the close button
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * Callback when close button is clicked
   */
  onClose?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function YouTubeEmbed({
  url,
  parsed: parsedProp,
  data,
  autoPlayOnClick = true,
  showCloseButton = true,
  onClose,
  className,
}: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState(false);

  // Parse URL if not provided
  const parsed = parsedProp || parseYouTubeUrl(url);

  if (!parsed) {
    return (
      <YouTubeEmbedFallback
        url={url}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  const { videoId, timestamp, isShort, isLive } = parsed;

  // Get thumbnail URL (try highest quality first)
  const getThumbnailUrl = () => {
    if (thumbnailError) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Get embed URL with parameters
  const getEmbedUrl = () => {
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
    });

    if (timestamp) {
      params.set("start", timestamp.toString());
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const handlePlay = () => {
    if (autoPlayOnClick) {
      setIsPlaying(true);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Display values
  const title = data?.title || "YouTube Video";
  const channelName = data?.channelName;
  const duration = data?.duration;
  const views = data?.views;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card",
        "max-w-2xl",
        className,
      )}
    >
      {/* Close button */}
      {showCloseButton && onClose && !isPlaying && (
        <button
          onClick={onClose}
          className={cn(
            "absolute right-2 top-2 z-10",
            "rounded-full bg-black/50 p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-black/70",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-4 w-4 text-white" />
        </button>
      )}

      {isPlaying ? (
        // Embedded player
        <div className="relative aspect-video">
          <iframe
            src={getEmbedUrl()}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        </div>
      ) : (
        // Thumbnail with overlay
        <>
          <div
            className="relative aspect-video cursor-pointer"
            onClick={handlePlay}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePlay();
              }
            }}
            aria-label={`Play ${title}`}
          >
            {/* Thumbnail */}
            <img
              src={getThumbnailUrl()}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setThumbnailError(true)}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  "rounded-xl bg-[#FF0000] p-4 shadow-lg",
                  "transform transition-transform group-hover:scale-110",
                )}
              >
                <PlayIcon className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Duration badge */}
            {duration && (
              <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
                {formatDuration(duration)}
              </div>
            )}

            {/* Live badge */}
            {isLive && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-[#FF0000] px-2 py-0.5 text-xs font-medium text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                LIVE
              </div>
            )}

            {/* Shorts badge */}
            {isShort && (
              <div className="absolute left-2 top-2 rounded bg-[#FF0000] px-2 py-0.5 text-xs font-medium text-white">
                Shorts
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="p-3">
            <div className="flex gap-3">
              {/* Channel avatar */}
              {data?.channelAvatar && (
                <img
                  src={data.channelAvatar}
                  alt=""
                  className="h-9 w-9 flex-shrink-0 rounded-full"
                />
              )}

              <div className="min-w-0 flex-1">
                {/* Title */}
                <h4 className="line-clamp-2 font-medium text-foreground">
                  {title}
                </h4>

                {/* Channel name and stats */}
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  {channelName && (
                    <span className="truncate">{channelName}</span>
                  )}
                  {views !== undefined && channelName && (
                    <span className="flex-shrink-0">-</span>
                  )}
                  {views !== undefined && (
                    <span className="flex-shrink-0">
                      {formatViews(views)} views
                    </span>
                  )}
                </div>
              </div>

              {/* YouTube logo */}
              <YouTubeIcon className="h-5 w-5 flex-shrink-0 text-[#FF0000]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export interface YouTubeEmbedSkeletonProps {
  className?: string;
}

export function YouTubeEmbedSkeleton({ className }: YouTubeEmbedSkeletonProps) {
  return (
    <div
      className={cn(
        "max-w-2xl overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="relative aspect-video animate-pulse bg-muted" />
      <div className="p-3">
        <div className="flex gap-3">
          <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FALLBACK
// ============================================================================

interface YouTubeEmbedFallbackProps {
  url: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function YouTubeEmbedFallback({
  url,
  showCloseButton,
  onClose,
  className,
}: YouTubeEmbedFallbackProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4",
        "cursor-pointer transition-colors hover:border-[#FF0000]/30",
        "max-w-lg",
        className,
      )}
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
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "absolute right-2 top-2 z-10",
            "bg-background/80 rounded-full p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF0000]">
          <YouTubeIcon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Watch on YouTube</p>
          <p className="truncate text-sm text-muted-foreground">{url}</p>
        </div>
        <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT EMBED
// ============================================================================

export interface YouTubeEmbedCompactProps {
  url: string;
  parsed?: ParsedYouTubeUrl;
  data?: YouTubeEmbedData;
  showCloseButton?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

export function YouTubeEmbedCompact({
  url,
  parsed: parsedProp,
  data,
  showCloseButton,
  onClose,
  onClick,
  className,
}: YouTubeEmbedCompactProps) {
  const parsed = parsedProp || parseYouTubeUrl(url);
  const videoId = parsed?.videoId;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const thumbnailUrl = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : undefined;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-2",
        "hover:bg-accent/5 cursor-pointer transition-colors",
        "max-w-md",
        className,
      )}
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
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-md">
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="rounded-full bg-[#FF0000] p-1">
              <PlayIcon className="h-3 w-3 text-white" />
            </div>
          </div>
          {/* Duration */}
          {data?.duration && (
            <div className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] font-medium text-white">
              {formatDuration(data.duration)}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-foreground">
          {data?.title || "YouTube Video"}
        </p>
        {data?.channelName && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {data.channelName}
          </p>
        )}
      </div>

      {/* Close button */}
      {showCloseButton && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "rounded-full p-1",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-muted",
          )}
          aria-label="Remove embed"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(views: number): string {
  if (views >= 1000000000) {
    return (views / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return views.toLocaleString();
}

// ============================================================================
// ICONS
// ============================================================================

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export default YouTubeEmbed;
