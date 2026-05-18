"use client";

/**
 * Video Embed Component
 *
 * Displays direct video links with:
 * - Video player
 * - Thumbnail preview
 * - Play button
 * - Controls
 *
 * @example
 * ```tsx
 * <VideoEmbed url="https://example.com/video.mp4" />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ParsedVideoUrl } from "@/lib/embeds/embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface VideoEmbedProps {
  /**
   * The video URL
   */
  url: string;

  /**
   * Parsed URL data
   */
  parsed?: ParsedVideoUrl;

  /**
   * Video title/alt text
   */
  title?: string;

  /**
   * Poster/thumbnail image URL
   */
  poster?: string;

  /**
   * Maximum width for the preview
   * @default 480
   */
  maxWidth?: number;

  /**
   * Maximum height for the preview
   * @default 360
   */
  maxHeight?: number;

  /**
   * Whether to autoplay when visible
   * @default false
   */
  autoPlay?: boolean;

  /**
   * Whether to loop the video
   * @default false
   */
  loop?: boolean;

  /**
   * Whether to mute the video initially
   * @default false
   */
  muted?: boolean;

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

export function VideoEmbed({
  url,
  parsed,
  title = "Video",
  poster,
  maxWidth = 480,
  maxHeight = 360,
  autoPlay = false,
  loop = false,
  muted = false,
  showCloseButton = true,
  onClose,
  className,
}: VideoEmbedProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showControls, setShowControls] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // File info
  const extension = parsed?.extension || getExtensionFromUrl(url);
  const filename = getFilenameFromUrl(url);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setShowControls(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleVideoError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    videoRef.current.currentTime = percentage * duration;
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch(() => {
          // Fullscreen not supported
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Handle fullscreen change
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (error) {
    return (
      <VideoEmbedError
        url={url}
        filename={filename}
        showCloseButton={showCloseButton}
        onClose={onClose}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-black",
        className,
      )}
      style={{
        maxWidth,
        maxHeight: isPlaying ? undefined : maxHeight,
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* Close button */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={cn(
            "absolute right-2 top-2 z-20",
            "rounded-full bg-black/50 p-1 backdrop-blur-sm",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-black/70",
          )}
          aria-label="Remove video"
        >
          <CloseIcon className="h-4 w-4 text-white" />
        </button>
      )}

      {/* Video element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- User-provided video, captions not available */}
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        className="h-auto w-full"
        style={{ maxHeight }}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onLoadedMetadata={handleVideoLoadedMetadata}
        onTimeUpdate={handleVideoTimeUpdate}
        onError={handleVideoError}
        onEnded={handleVideoEnded}
        onClick={handlePlay}
        title={title}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && !isLoading && (
        <div
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
          onClick={handlePlay}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handlePlay();
            }
          }}
          aria-label="Play video"
        >
          <div
            className={cn(
              "rounded-full bg-white/90 p-4 shadow-lg",
              "transform transition-transform group-hover:scale-110",
            )}
          >
            <PlayIcon className="h-8 w-8 text-black" />
          </div>
        </div>
      )}

      {/* Duration badge (when not playing) */}
      {!isPlaying && duration && (
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
          {formatDuration(duration)}
        </div>
      )}

      {/* File type badge */}
      {!isPlaying && extension && (
        <div className="absolute left-2 top-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium uppercase text-white">
          {extension}
        </div>
      )}

      {/* Custom controls overlay */}
      {showControls && isPlaying && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-10",
            "bg-gradient-to-t from-black/80 via-black/50 to-transparent",
            "p-3 transition-opacity",
            isPlaying ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Progress bar */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="relative mb-2 h-1 w-full cursor-pointer rounded-full bg-white/30"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
            {/* Progress handle */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md"
              style={{
                left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlay}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5 text-white" />
                ) : (
                  <PlayIcon className="h-5 w-5 text-white" />
                )}
              </button>

              {/* Time display */}
              <span className="text-xs text-white">
                {formatDuration(currentTime)} / {formatDuration(duration || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen button */}
              <button
                onClick={toggleFullscreen}
                className="rounded-full p-1 transition-colors hover:bg-white/20"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <MinimizeIcon className="h-5 w-5 text-white" />
                ) : (
                  <FullscreenIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

interface VideoEmbedErrorProps {
  url: string;
  filename: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

function VideoEmbedError({
  url,
  filename,
  showCloseButton,
  onClose,
  className,
}: VideoEmbedErrorProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        "max-w-sm",
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
            "bg-background/80 rounded-full p-1",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background",
          )}
          aria-label="Remove"
        >
          <CloseIcon className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <VideoIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {filename}
        </p>
        <p className="text-xs text-muted-foreground">Failed to load video</p>
      </div>
      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

export interface VideoEmbedSkeletonProps {
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

export function VideoEmbedSkeleton({
  maxWidth = 480,
  maxHeight = 270,
  className,
}: VideoEmbedSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse overflow-hidden rounded-lg border border-border bg-black",
        className,
      )}
      style={{
        width: maxWidth,
        height: maxHeight,
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div className="rounded-full bg-white/20 p-4">
          <PlayIcon className="h-8 w-8 text-white/50" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VIDEO EMBED
// ============================================================================

export interface VideoEmbedCompactProps {
  url: string;
  title?: string;
  poster?: string;
  duration?: number;
  showCloseButton?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

export function VideoEmbedCompact({
  url,
  title,
  poster,
  duration,
  showCloseButton,
  onClose,
  onClick,
  className,
}: VideoEmbedCompactProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const filename = title || getFilenameFromUrl(url);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-border bg-card p-2",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        "max-w-md",
        className,
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-md bg-black">
        {poster ? (
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <VideoIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="rounded-full bg-white/90 p-1">
            <PlayIcon className="h-3 w-3 text-black" />
          </div>
        </div>
        {/* Duration */}
        {duration && (
          <div className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] font-medium text-white">
            {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {filename}
        </p>
        <p className="text-xs text-muted-foreground">Video</p>
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
          aria-label="Remove"
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
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "video";
    return decodeURIComponent(filename);
  } catch {
    return "video";
  }
}

function getExtensionFromUrl(url: string): string {
  const filename = getFilenameFromUrl(url);
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || "";
  }
  return "";
}

// ============================================================================
// ICONS
// ============================================================================

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
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

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
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

function FullscreenIcon({ className }: { className?: string }) {
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
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
      />
    </svg>
  );
}

function MinimizeIcon({ className }: { className?: string }) {
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
        d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
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

export default VideoEmbed;
