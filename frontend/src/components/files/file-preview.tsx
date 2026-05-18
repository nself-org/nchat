/**
 * FilePreview Component
 *
 * Preview component for displaying file attachments with thumbnails.
 */

"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  File,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Code,
  Download,
  ExternalLink,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatBytes } from "@/services/files/types";
import type { Attachment } from "@/types/attachment";
import type { AttachmentItem } from "@/hooks/use-attachments";

// ============================================================================
// Types
// ============================================================================

export interface FilePreviewProps {
  /** Attachment to preview */
  attachment: Attachment | AttachmentItem;
  /** Show file name */
  showName?: boolean;
  /** Show file size */
  showSize?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Enable click to open full preview */
  clickToOpen?: boolean;
  /** Enable remove button */
  removable?: boolean;
  /** Remove callback */
  onRemove?: () => void;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// Component
// ============================================================================

export function FilePreview({
  attachment,
  showName = true,
  showSize = true,
  showDownload = true,
  clickToOpen = true,
  removable = false,
  onRemove,
  className,
  size = "md",
}: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const previewUrl =
    "previewUrl" in attachment
      ? attachment.previewUrl
      : attachment.thumbnailUrl;

  const handleClick = useCallback(() => {
    if (clickToOpen) {
      setIsOpen(true);
    }
  }, [clickToOpen]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (attachment.url) {
        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },
    [attachment],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove],
  );

  // ============================================================================
  // Size variants
  // ============================================================================

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  // ============================================================================
  // Render based on type
  // ============================================================================

  const renderPreview = () => {
    const isLoading = "status" in attachment && attachment.status !== "ready";
    const isFailed = "status" in attachment && attachment.status === "failed";

    if (isLoading && !isFailed) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <Loader2
            className={cn(
              "animate-spin text-muted-foreground",
              iconSizes[size],
            )}
          />
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="bg-destructive/10 flex h-full w-full flex-col items-center justify-center">
          <File className={cn("text-destructive", iconSizes[size])} />
          <p className="mt-1 text-xs text-destructive">Failed</p>
        </div>
      );
    }

    switch (attachment.type) {
      case "image":
        return (
          <img
            src={previewUrl || attachment.url}
            alt={attachment.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        );

      case "video":
        return (
          <div className="relative h-full w-full bg-black">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={attachment.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Video
                className={cn(
                  "absolute inset-0 m-auto text-white/60",
                  iconSizes[size],
                )}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="h-8 w-8 text-white" />
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Music
              className={cn(
                "text-purple-600 dark:text-purple-400",
                iconSizes[size],
              )}
            />
            {attachment.duration && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDuration(attachment.duration)}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="flex h-full w-full flex-col items-center justify-center bg-muted">
            <FileTypeIcon
              mimeType={attachment.mimeType}
              className={iconSizes[size]}
            />
          </div>
        );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <>
      <motion.div
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-lg border",
          sizeClasses[size],
          className,
        )}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {renderPreview()}

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50"
            >
              {clickToOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              {showDownload && attachment.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remove button */}
        {removable && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </motion.div>

      {/* File info below */}
      {(showName || showSize) && (
        <div className={cn("mt-1", sizeClasses[size].split(" ")[0])}>
          {showName && (
            <p className="truncate text-xs font-medium" title={attachment.name}>
              {attachment.name}
            </p>
          )}
          {showSize && attachment.size && (
            <p className="text-xs text-muted-foreground">
              {formatBytes(attachment.size)}
            </p>
          )}
        </div>
      )}

      {/* Full preview dialog */}
      <FilePreviewDialog
        attachment={attachment}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}

// ============================================================================
// File Preview Dialog
// ============================================================================

interface FilePreviewDialogProps {
  attachment: Attachment | AttachmentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FilePreviewDialog({
  attachment,
  open,
  onOpenChange,
}: FilePreviewDialogProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = useCallback(() => {
    const media = videoRef.current || audioRef.current;
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const media = videoRef.current || audioRef.current;
    if (media) {
      media.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleDownload = useCallback(() => {
    if (attachment.url) {
      const link = document.createElement("a");
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [attachment]);

  const renderContent = () => {
    switch (attachment.type) {
      case "image":
        return (
          <div className="flex max-h-[80vh] items-center justify-center">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[80vh] max-w-full object-contain"
            />
          </div>
        );

      case "video":
        return (
          <div className="relative">
            <video
              ref={videoRef}
              src={attachment.url}
              className="max-h-[80vh] max-w-full"
              controls={false}
              onEnded={() => setIsPlaying(false)}
            >
              <track kind="captions" />
            </video>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8">
              <Music className="h-16 w-16 text-purple-600 dark:text-purple-400" />
            </div>
            <audio
              ref={audioRef}
              src={attachment.url}
              onEnded={() => setIsPlaying(false)}
            >
              <track kind="captions" />
            </audio>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={togglePlay}>
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={toggleMute}>
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="rounded-full bg-muted p-8">
              <FileTypeIcon
                mimeType={attachment.mimeType}
                className="h-16 w-16"
              />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">{attachment.name}</p>
              {attachment.size && (
                <p className="text-sm text-muted-foreground">
                  {formatBytes(attachment.size)}
                </p>
              )}
            </div>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogTitle className="sr-only">{attachment.name}</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileTypeIcon
              mimeType={attachment.mimeType}
              className="h-5 w-5 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{attachment.name}</p>
              {attachment.size && (
                <p className="text-xs text-muted-foreground">
                  {formatBytes(attachment.size)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {attachment.url && (
              <>
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.url, "_blank")}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface FileTypeIconProps {
  mimeType?: string;
  className?: string;
}

function FileTypeIcon({ mimeType = "", className }: FileTypeIconProps) {
  if (mimeType.startsWith("image/"))
    return (
      <ImageIcon
        className={cn("text-blue-600 dark:text-blue-400", className)}
      />
    );
  if (mimeType.startsWith("video/"))
    return (
      <Video
        className={cn("text-purple-600 dark:text-purple-400", className)}
      />
    );
  if (mimeType.startsWith("audio/"))
    return (
      <Music className={cn("text-pink-600 dark:text-pink-400", className)} />
    );
  if (mimeType.includes("pdf"))
    return (
      <FileText className={cn("text-red-600 dark:text-red-400", className)} />
    );
  if (mimeType.includes("document") || mimeType.includes("word"))
    return (
      <FileText className={cn("text-blue-600 dark:text-blue-400", className)} />
    );
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return (
      <Archive
        className={cn("text-yellow-600 dark:text-yellow-400", className)}
      />
    );
  if (
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml")
  )
    return (
      <Code className={cn("text-green-600 dark:text-green-400", className)} />
    );
  return <File className={cn("text-muted-foreground", className)} />;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
