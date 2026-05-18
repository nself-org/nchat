/**
 * Attachment Preview - Preview attachments in message composer
 *
 * Features:
 * - Grid layout for multiple attachments
 * - Image preview thumbnails
 * - File cards for documents
 * - Remove button on each item
 * - Support for uploads in progress
 */

"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  File,
  FolderArchive,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { FileType, UploadStatus } from "@/stores/attachment-store";
import {
  formatFileSize,
  truncateFileName,
  getFileTypeColor,
  formatDuration,
} from "@/lib/upload/file-utils";

// ============================================================================
// Types
// ============================================================================

export interface AttachmentItem {
  /** Unique identifier */
  id: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** File type category */
  fileType: FileType;
  /** MIME type */
  mimeType?: string;
  /** Preview URL (blob URL or uploaded URL) */
  previewUrl?: string | null;
  /** Thumbnail URL */
  thumbnailUrl?: string | null;
  /** Upload status (if uploading) */
  status?: UploadStatus;
  /** Upload progress (0-100) */
  progress?: number;
  /** Error message */
  error?: string | null;
  /** Media dimensions */
  width?: number;
  height?: number;
  /** Duration for audio/video */
  duration?: number;
}

export interface AttachmentPreviewProps {
  /** List of attachments */
  attachments: AttachmentItem[];
  /** Callback to remove attachment */
  onRemove?: (id: string) => void;
  /** Callback when attachment is clicked */
  onClick?: (id: string) => void;
  /** Callback to retry failed upload */
  onRetry?: (id: string) => void;
  /** Maximum visible attachments (rest shown as +N) */
  maxVisible?: number;
  /** Custom class name */
  className?: string;
  /** Grid columns */
  columns?: 2 | 3 | 4 | 5 | "auto";
  /** Preview size */
  size?: "sm" | "md" | "lg";
  /** Show file names */
  showNames?: boolean;
  /** Read-only mode (no remove buttons) */
  readOnly?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

function FileTypeIcon({
  fileType,
  className,
}: {
  fileType: FileType;
  className?: string;
}) {
  const iconClass = cn("h-6 w-6", getFileTypeColor(fileType), className);

  switch (fileType) {
    case "image":
      return <ImageIcon className={iconClass} />;
    case "video":
      return <FileVideo className={iconClass} />;
    case "audio":
      return <FileAudio className={iconClass} />;
    case "document":
      return <FileText className={iconClass} />;
    case "archive":
      return <FolderArchive className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
}

// ============================================================================
// Single Attachment Preview Item
// ============================================================================

interface AttachmentPreviewItemProps {
  attachment: AttachmentItem;
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  onRetry?: (id: string) => void;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  readOnly?: boolean;
}

function AttachmentPreviewItem({
  attachment,
  onRemove,
  onClick,
  onRetry,
  size = "md",
  showName = false,
  readOnly = false,
}: AttachmentPreviewItemProps) {
  const {
    id,
    fileName,
    fileSize,
    fileType,
    previewUrl,
    thumbnailUrl,
    status,
    progress = 0,
    error,
    duration,
  } = attachment;

  const isUploading =
    status === "uploading" || status === "processing" || status === "queued";
  const isPending = status === "pending";
  const isFailed = status === "failed";
  const isCompleted = status === "completed" || !status;

  // Size configuration
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return { container: "w-16 h-16", icon: "h-5 w-5" };
      case "lg":
        return { container: "w-32 h-32", icon: "h-8 w-8" };
      default:
        return { container: "w-24 h-24", icon: "h-6 w-6" };
    }
  }, [size]);

  // Preview image URL
  const imageUrl = thumbnailUrl || previewUrl;
  const canShowImagePreview = fileType === "image" && imageUrl;
  const canShowVideoPreview =
    fileType === "video" && (thumbnailUrl || previewUrl);

  return (
    <div className="group relative flex flex-col items-center gap-1">
      {/* Preview Container */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted transition-all",
          sizeConfig.container,
          onClick && !isFailed && "hover:border-primary/50 cursor-pointer",
          isUploading && "opacity-75",
          isFailed && "border-destructive/50 bg-destructive/5",
        )}
        {...(onClick && !isFailed
          ? {
              onClick: () => onClick(id),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(id);
                }
              },
              role: "button" as const,
              tabIndex: 0,
            }
          : {})}
      >
        {/* Image Preview */}
        {canShowImagePreview && (
          <img
            src={imageUrl}
            alt={fileName}
            className="h-full w-full object-cover"
          />
        )}

        {/* Video Preview with Play Icon */}
        {canShowVideoPreview && (
          <>
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={fileName}
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={previewUrl || undefined}
                className="h-full w-full object-cover"
                muted
                preload="metadata"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-black/60 p-2">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
            {duration !== undefined && (
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-xs text-white">
                {formatDuration(duration)}
              </span>
            )}
          </>
        )}

        {/* Audio Preview */}
        {fileType === "audio" && !canShowImagePreview && (
          <div className="flex flex-col items-center gap-1">
            <FileTypeIcon fileType="audio" className={sizeConfig.icon} />
            {duration !== undefined && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        )}

        {/* File Type Icon (for non-previewable files) */}
        {!canShowImagePreview &&
          !canShowVideoPreview &&
          fileType !== "audio" && (
            <FileTypeIcon fileType={fileType} className={sizeConfig.icon} />
          )}

        {/* Uploading Overlay */}
        {isUploading && (
          <div className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-medium">{progress}%</span>
          </div>
        )}

        {/* Pending Overlay */}
        {isPending && (
          <div className="bg-background/30 absolute inset-0 flex items-center justify-center">
            <div className="bg-muted-foreground/50 h-2 w-2 rounded-full" />
          </div>
        )}

        {/* Failed Overlay */}
        {isFailed && (
          <div className="bg-destructive/10 absolute inset-0 flex flex-col items-center justify-center gap-1">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {onRetry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(id);
                }}
                className="text-xs text-destructive underline hover:no-underline"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Remove Button */}
        {!readOnly && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className={cn(
              "absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow-md transition-opacity",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
              "opacity-0 focus:opacity-100 group-hover:opacity-100",
            )}
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Progress Bar at Bottom */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={progress} className="h-1 rounded-none" />
          </div>
        )}
      </div>

      {/* File Name */}
      {showName && (
        <span
          className="max-w-full truncate text-xs text-muted-foreground"
          title={fileName}
        >
          {truncateFileName(fileName, 12)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Overflow Counter
// ============================================================================

interface OverflowCounterProps {
  count: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

function OverflowCounter({
  count,
  onClick,
  size = "md",
}: OverflowCounterProps) {
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return "w-16 h-16 text-sm";
      case "lg":
        return "w-32 h-32 text-lg";
      default:
        return "w-24 h-24 text-base";
    }
  }, [size]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted/80 flex items-center justify-center rounded-lg border bg-muted font-medium text-muted-foreground transition-colors",
        sizeConfig,
        onClick && "cursor-pointer",
      )}
    >
      +{count}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AttachmentPreview({
  attachments,
  onRemove,
  onClick,
  onRetry,
  maxVisible = 6,
  className,
  columns = "auto",
  size = "md",
  showNames = false,
  readOnly = false,
}: AttachmentPreviewProps) {
  // Grid columns class - must be before early return
  const gridColumnsClass = useMemo(() => {
    if (columns === "auto") {
      return "grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]";
    }
    return {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
    }[columns];
  }, [columns]);

  if (attachments.length === 0) {
    return null;
  }

  // Determine visible attachments
  const visibleAttachments = attachments.slice(0, maxVisible);
  const overflowCount = attachments.length - maxVisible;

  return (
    <div className={cn("bg-muted/30 rounded-lg border p-3", className)}>
      <div className={cn("grid gap-3", gridColumnsClass)}>
        {visibleAttachments.map((attachment) => (
          <AttachmentPreviewItem
            key={attachment.id}
            attachment={attachment}
            onRemove={onRemove}
            onClick={onClick}
            onRetry={onRetry}
            size={size}
            showName={showNames}
            readOnly={readOnly}
          />
        ))}

        {overflowCount > 0 && (
          <OverflowCounter
            count={overflowCount}
            onClick={
              onClick ? () => onClick(attachments[maxVisible].id) : undefined
            }
            size={size}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Inline Attachment Strip (for single row)
// ============================================================================

export interface AttachmentStripProps {
  /** List of attachments */
  attachments: AttachmentItem[];
  /** Callback to remove attachment */
  onRemove?: (id: string) => void;
  /** Callback when attachment is clicked */
  onClick?: (id: string) => void;
  /** Maximum visible attachments */
  maxVisible?: number;
  /** Custom class name */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}

export function AttachmentStrip({
  attachments,
  onRemove,
  onClick,
  maxVisible = 5,
  className,
  readOnly = false,
}: AttachmentStripProps) {
  if (attachments.length === 0) {
    return null;
  }

  const visibleAttachments = attachments.slice(0, maxVisible);
  const overflowCount = attachments.length - maxVisible;

  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto", className)}>
      {visibleAttachments.map((attachment) => (
        <div key={attachment.id} className="group relative flex-shrink-0">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center overflow-hidden rounded border bg-muted",
              onClick && "hover:border-primary/50 cursor-pointer",
            )}
            {...(onClick
              ? {
                  onClick: () => onClick(attachment.id),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick(attachment.id);
                    }
                  },
                  role: "button" as const,
                  tabIndex: 0,
                }
              : {})}
          >
            {attachment.fileType === "image" &&
            (attachment.thumbnailUrl || attachment.previewUrl) ? (
              <img
                src={attachment.thumbnailUrl || attachment.previewUrl || ""}
                alt={attachment.fileName}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileTypeIcon
                fileType={attachment.fileType}
                className="h-5 w-5"
              />
            )}

            {/* Uploading indicator */}
            {(attachment.status === "uploading" ||
              attachment.status === "queued") && (
              <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Remove button */}
          {!readOnly && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(attachment.id);
              }}
              className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {overflowCount > 0 && (
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border bg-muted text-sm font-medium text-muted-foreground",
            onClick && "hover:bg-muted/80 cursor-pointer",
          )}
          {...(onClick
            ? {
                onClick: () => onClick(attachments[maxVisible].id),
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick(attachments[maxVisible].id);
                  }
                },
                role: "button" as const,
                tabIndex: 0,
              }
            : {})}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

export default AttachmentPreview;
