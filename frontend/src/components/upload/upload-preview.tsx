/**
 * Upload Preview - Preview component for files before/during upload
 *
 * Features:
 * - Image thumbnails
 * - File info (name, size, type)
 * - Remove button
 * - Progress bar during upload
 * - Error state with retry
 */

"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  File,
  FolderArchive,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileType, UploadStatus } from "@/stores/attachment-store";
import {
  formatFileSize,
  truncateFileName,
  getFileTypeColor,
} from "@/lib/upload/file-utils";

// ============================================================================
// Types
// ============================================================================

export interface UploadPreviewProps {
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
  /** Upload status */
  status: UploadStatus;
  /** Upload progress (0-100) */
  progress?: number;
  /** Preview URL (blob URL for images/videos) */
  previewUrl?: string | null;
  /** Error message if failed */
  error?: string | null;
  /** Callback to remove/cancel */
  onRemove?: (id: string) => void;
  /** Callback to retry failed upload */
  onRetry?: (id: string) => void;
  /** Callback when preview is clicked */
  onClick?: (id: string) => void;
  /** Custom class name */
  className?: string;
  /** Preview size */
  size?: "sm" | "md" | "lg";
  /** Show file info below preview */
  showInfo?: boolean;
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

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "uploading":
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export function UploadPreview({
  id,
  fileName,
  fileSize,
  fileType,
  status,
  progress = 0,
  previewUrl,
  error,
  onRemove,
  onRetry,
  onClick,
  className,
  size = "md",
  showInfo = true,
}: UploadPreviewProps) {
  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "sm":
        return {
          container: "w-20 h-20",
          preview: "w-16 h-16",
          icon: "h-5 w-5",
        };
      case "lg":
        return {
          container: "w-40 h-40",
          preview: "w-36 h-36",
          icon: "h-8 w-8",
        };
      default:
        return {
          container: "w-28 h-28",
          preview: "w-24 h-24",
          icon: "h-6 w-6",
        };
    }
  }, [size]);

  // Determine if we can show image preview
  const canShowImagePreview = fileType === "image" && previewUrl;
  const canShowVideoPreview = fileType === "video" && previewUrl;

  // Is the upload in progress
  const isUploading =
    status === "uploading" || status === "processing" || status === "queued";
  const isPending = status === "pending";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-1",
        sizeConfig.container,
        className,
      )}
    >
      {/* Preview Container */}
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted",
          sizeConfig.preview,
          onClick && "cursor-pointer",
          isUploading && "opacity-75",
          isFailed && "border-destructive/50",
        )}
        {...(onClick
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
            src={previewUrl}
            alt={fileName}
            className="h-full w-full object-cover"
          />
        )}

        {/* Video Preview */}
        {canShowVideoPreview && (
          <video
            src={previewUrl}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
          />
        )}

        {/* File Type Icon (for non-previewable files) */}
        {!canShowImagePreview && !canShowVideoPreview && (
          <FileTypeIcon fileType={fileType} className={sizeConfig.icon} />
        )}

        {/* Progress Overlay */}
        {isUploading && (
          <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-medium">{progress}%</span>
            </div>
          </div>
        )}

        {/* Pending Overlay */}
        {isPending && (
          <div className="bg-background/30 absolute inset-0 flex items-center justify-center">
            <div className="bg-muted-foreground/50 h-3 w-3 rounded-full" />
          </div>
        )}

        {/* Error Overlay */}
        {isFailed && (
          <div className="bg-destructive/10 absolute inset-0 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-0.5">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Remove Button */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className={cn(
              "absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow-md transition-opacity",
              "opacity-0 focus:opacity-100 group-hover:opacity-100",
              "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
            )}
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Retry Button (for failed uploads) */}
        {isFailed && onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(id);
            }}
            className="absolute bottom-1 left-1 rounded-full bg-background p-1 shadow-md hover:bg-muted"
            aria-label="Retry upload"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* File Info */}
      {showInfo && (
        <div className="w-full text-center">
          <p className="truncate text-xs font-medium" title={fileName}>
            {truncateFileName(fileName, 15)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(fileSize)}
          </p>
        </div>
      )}

      {/* Progress Bar (below preview) */}
      {isUploading && size !== "sm" && (
        <Progress value={progress} className="h-1 w-full" />
      )}

      {/* Error Message */}
      {isFailed && error && size !== "sm" && (
        <p className="truncate text-xs text-destructive" title={error}>
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// List Item Variant
// ============================================================================

export interface UploadPreviewListItemProps extends Omit<
  UploadPreviewProps,
  "size" | "showInfo"
> {
  /** Show cancel button during upload */
  showCancel?: boolean;
  /** Callback to cancel upload */
  onCancel?: (id: string) => void;
}

export function UploadPreviewListItem({
  id,
  fileName,
  fileSize,
  fileType,
  status,
  progress = 0,
  previewUrl,
  error,
  onRemove,
  onRetry,
  onCancel,
  showCancel = true,
  onClick,
  className,
}: UploadPreviewListItemProps) {
  const isUploading =
    status === "uploading" || status === "processing" || status === "queued";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  // Image preview for images
  const canShowImagePreview = fileType === "image" && previewUrl;

  const interactiveProps = onClick
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
    : {};

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-2 transition-colors",
        isFailed && "border-destructive/50 bg-destructive/5",
        isCompleted && "border-green-500/50 bg-green-500/5",
        onClick && "hover:bg-muted/50 cursor-pointer",
        className,
      )}
      {...interactiveProps}
    >
      {/* Preview Thumbnail */}
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
        {canShowImagePreview ? (
          <img
            src={previewUrl}
            alt={fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileTypeIcon fileType={fileType} className="h-5 w-5" />
          </div>
        )}

        {/* Status overlay */}
        {isUploading && (
          <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={fileName}>
          {fileName}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(fileSize)}</span>
          {isUploading && <span>{progress}%</span>}
          {isFailed && error && (
            <span className="text-destructive">{error}</span>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && <Progress value={progress} className="mt-1 h-1" />}
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-1">
        <StatusIcon status={status} />

        {/* Retry Button */}
        {isFailed && onRetry && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(id);
            }}
            aria-label="Retry upload"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Cancel Button (during upload) */}
        {isUploading && showCancel && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(id);
            }}
            aria-label="Cancel upload"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Remove Button */}
        {!isUploading && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default UploadPreview;
