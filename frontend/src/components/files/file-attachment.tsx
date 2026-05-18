"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileIcon } from "./file-icon";
import { formatFileSize, getFileCategory } from "@/lib/storage/upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FileAttachmentData {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** URL to access the file */
  url: string;
  /** Thumbnail URL (for images) */
  thumbnailUrl?: string;
  /** Width (for images/videos) */
  width?: number;
  /** Height (for images/videos) */
  height?: number;
  /** Duration in seconds (for audio/video) */
  duration?: number;
}

export interface FileAttachmentProps {
  /** File data */
  file: FileAttachmentData;
  /** Maximum width for images */
  maxImageWidth?: number;
  /** Maximum height for images */
  maxImageHeight?: number;
  /** Show file name */
  showFileName?: boolean;
  /** Show file size */
  showFileSize?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Compact mode (inline style) */
  compact?: boolean;
  /** Click to open lightbox (for images) */
  onImageClick?: () => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FileAttachment - Rendered attachment in a message
 *
 * @example
 * ```tsx
 * <FileAttachment
 *   file={{
 *     id: '123',
 *     name: 'photo.jpg',
 *     size: 1024,
 *     mimeType: 'image/jpeg',
 *     url: 'https://...',
 *   }}
 *   onImageClick={() => openLightbox()}
 * />
 * ```
 */
export function FileAttachment({
  file,
  maxImageWidth = 400,
  maxImageHeight = 300,
  showFileName = true,
  showFileSize = true,
  showDownload = true,
  compact = false,
  onImageClick,
  className,
}: FileAttachmentProps) {
  const category = getFileCategory(file.mimeType);

  // Render based on file type
  switch (category) {
    case "image":
      return (
        <ImageAttachment
          file={file}
          maxWidth={maxImageWidth}
          maxHeight={maxImageHeight}
          showFileName={showFileName}
          showFileSize={showFileSize}
          showDownload={showDownload}
          compact={compact}
          onClick={onImageClick}
          className={className}
        />
      );

    case "video":
      return (
        <VideoAttachment
          file={file}
          maxWidth={maxImageWidth}
          maxHeight={maxImageHeight}
          showFileName={showFileName}
          showFileSize={showFileSize}
          showDownload={showDownload}
          compact={compact}
          className={className}
        />
      );

    case "audio":
      return (
        <AudioAttachment
          file={file}
          showFileName={showFileName}
          showFileSize={showFileSize}
          showDownload={showDownload}
          compact={compact}
          className={className}
        />
      );

    default:
      return (
        <GenericAttachment
          file={file}
          showFileName={showFileName}
          showFileSize={showFileSize}
          showDownload={showDownload}
          compact={compact}
          className={className}
        />
      );
  }
}

// ============================================================================
// IMAGE ATTACHMENT
// ============================================================================

interface ImageAttachmentProps {
  file: FileAttachmentData;
  maxWidth?: number;
  maxHeight?: number;
  showFileName?: boolean;
  showFileSize?: boolean;
  showDownload?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

function ImageAttachment({
  file,
  maxWidth = 400,
  maxHeight = 300,
  showFileName,
  showFileSize,
  showDownload,
  compact,
  onClick,
  className,
}: ImageAttachmentProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  // Calculate display size while maintaining aspect ratio
  const displayStyle = React.useMemo(() => {
    if (file.width && file.height) {
      const aspectRatio = file.width / file.height;
      let width = Math.min(file.width, maxWidth);
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      return { width, height };
    }
    return { maxWidth, maxHeight };
  }, [file.width, file.height, maxWidth, maxHeight]);

  if (error) {
    return (
      <GenericAttachment
        file={file}
        showFileName={showFileName}
        showFileSize={showFileSize}
        showDownload={showDownload}
        compact={compact}
        className={className}
      />
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  const imageContent = (
    <>
      {/* Loading skeleton */}
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}

      <img
        src={file.thumbnailUrl || file.url}
        alt={file.name}
        className={cn(
          "h-full w-full object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />

      {/* Hover overlay */}
      {onClick && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <Maximize2 className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}
    </>
  );

  const fileInfo = (showFileName || showFileSize || showDownload) &&
    !compact && (
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showFileName && (
            <p
              className="truncate text-xs text-muted-foreground"
              title={file.name}
            >
              {file.name}
            </p>
          )}
          {showFileSize && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          )}
        </div>
        {showDownload && (
          <DownloadButton url={file.url} name={file.name} size="sm" />
        )}
      </div>
    );

  if (onClick) {
    return (
      <div className={cn("group relative inline-block", className)}>
        <div
          className="relative cursor-pointer overflow-hidden rounded-lg bg-muted"
          style={displayStyle}
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={handleKeyDown}
        >
          {imageContent}
        </div>
        {fileInfo}
      </div>
    );
  }

  return (
    <div className={cn("group relative inline-block", className)}>
      <div
        className="relative overflow-hidden rounded-lg bg-muted"
        style={displayStyle}
      >
        {imageContent}
      </div>
      {fileInfo}
    </div>
  );
}

// ============================================================================
// VIDEO ATTACHMENT
// ============================================================================

interface VideoAttachmentProps {
  file: FileAttachmentData;
  maxWidth?: number;
  maxHeight?: number;
  showFileName?: boolean;
  showFileSize?: boolean;
  showDownload?: boolean;
  compact?: boolean;
  className?: string;
}

function VideoAttachment({
  file,
  maxWidth = 400,
  maxHeight = 300,
  showFileName,
  showFileSize,
  showDownload,
  compact,
  className,
}: VideoAttachmentProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={cn("group relative inline-block", className)}>
      {/* Video player */}
      <div
        className="relative overflow-hidden rounded-lg bg-black"
        style={{ maxWidth, maxHeight }}
      >
        <video
          ref={videoRef}
          src={file.url}
          className="h-full w-full"
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <track kind="captions" />
        </video>

        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <button
            onClick={togglePlay}
            className="rounded-full bg-white/90 p-3 opacity-0 transition-opacity hover:bg-white group-hover:opacity-100"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 pl-0.5" />
            )}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={toggleMute}
            className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Duration badge */}
        {file.duration && (
          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
            {formatDuration(file.duration)}
          </div>
        )}
      </div>

      {/* File info */}
      {(showFileName || showFileSize || showDownload) && !compact && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {showFileName && (
              <p
                className="truncate text-xs text-muted-foreground"
                title={file.name}
              >
                {file.name}
              </p>
            )}
            {showFileSize && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            )}
          </div>
          {showDownload && (
            <DownloadButton url={file.url} name={file.name} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AUDIO ATTACHMENT
// ============================================================================

interface AudioAttachmentProps {
  file: FileAttachmentData;
  showFileName?: boolean;
  showFileSize?: boolean;
  showDownload?: boolean;
  compact?: boolean;
  className?: string;
}

function AudioAttachment({
  file,
  showFileName,
  showFileSize,
  showDownload,
  compact,
  className,
}: AudioAttachmentProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(file.duration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        compact && "p-2",
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={file.url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) =>
          setDuration((e.target as HTMLAudioElement).duration)
        }
      >
        <track kind="captions" />
      </audio>

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="text-primary-foreground hover:bg-primary/90 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 pl-0.5" />
        )}
      </button>

      {/* Progress and info */}
      <div className="min-w-0 flex-1">
        {/* Progress bar */}
        <div className="relative">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Time and file info */}
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
          {showFileSize && <span>{formatFileSize(file.size)}</span>}
        </div>

        {/* File name */}
        {showFileName && (
          <p className="mt-0.5 truncate text-sm font-medium" title={file.name}>
            {file.name}
          </p>
        )}
      </div>

      {/* Download button */}
      {showDownload && (
        <DownloadButton url={file.url} name={file.name} size="sm" />
      )}
    </div>
  );
}

// ============================================================================
// GENERIC ATTACHMENT
// ============================================================================

interface GenericAttachmentProps {
  file: FileAttachmentData;
  showFileName?: boolean;
  showFileSize?: boolean;
  showDownload?: boolean;
  compact?: boolean;
  className?: string;
}

function GenericAttachment({
  file,
  showFileName,
  showFileSize,
  showDownload,
  compact,
  className,
}: GenericAttachmentProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card",
        compact ? "p-2" : "p-3",
        className,
      )}
    >
      {/* File icon */}
      <FileIcon file={file.name} size={compact ? "md" : "lg"} showBackground />

      {/* File info */}
      <div className="min-w-0 flex-1">
        {showFileName && (
          <p
            className={cn(
              "truncate font-medium",
              compact ? "text-sm" : "text-base",
            )}
            title={file.name}
          >
            {file.name}
          </p>
        )}
        {showFileSize && (
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {showDownload && (
          <DownloadButton
            url={file.url}
            name={file.name}
            size={compact ? "sm" : "default"}
          />
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={compact ? "h-8 w-8" : "h-9 w-9"}
                asChild
              >
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Open in new tab</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in new tab</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

interface DownloadButtonProps {
  url: string;
  name: string;
  size?: "sm" | "default";
}

function DownloadButton({ url, name, size = "default" }: DownloadButtonProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={size === "sm" ? "h-8 w-8" : "h-9 w-9"}
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download {name}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Format duration in seconds to mm:ss
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
