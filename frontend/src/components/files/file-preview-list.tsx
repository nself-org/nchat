"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  FilePreviewItem,
  CompactFilePreviewItem,
  type FilePreviewItemProps,
} from "./file-preview-item";
import type { UploadStatus } from "./upload-progress";

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploadState {
  /** Unique identifier */
  id: string;
  /** The file object */
  file: File;
  /** Upload progress (0-100) */
  progress: number;
  /** Upload status */
  status: UploadStatus;
  /** Error message (when status is 'error') */
  errorMessage?: string;
  /** Uploaded file URL (when status is 'completed') */
  url?: string;
}

export interface FilePreviewListProps {
  /** List of files with upload state */
  files: FileUploadState[];
  /** Layout variant */
  variant?: "list" | "grid" | "compact" | "horizontal";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Maximum height before scrolling */
  maxHeight?: number | string;
  /** Show thumbnails for images */
  showThumbnails?: boolean;
  /** Show file details */
  showDetails?: boolean;
  /** Show progress bars */
  showProgress?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Remove file callback */
  onRemove?: (id: string) => void;
  /** Retry upload callback */
  onRetry?: (id: string) => void;
  /** Cancel upload callback */
  onCancel?: (id: string) => void;
  /** Preview file callback */
  onPreview?: (id: string) => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FilePreviewList - List of file previews with various layouts
 *
 * @example
 * ```tsx
 * <FilePreviewList
 *   files={uploadFiles}
 *   variant="grid"
 *   onRemove={(id) => handleRemove(id)}
 *   onRetry={(id) => handleRetry(id)}
 * />
 * ```
 */
export function FilePreviewList({
  files,
  variant = "list",
  size = "md",
  maxHeight,
  showThumbnails = true,
  showDetails = true,
  showProgress = true,
  emptyMessage,
  onRemove,
  onRetry,
  onCancel,
  onPreview,
  className,
}: FilePreviewListProps) {
  // Don't render if no files and no empty message
  if (files.length === 0 && !emptyMessage) {
    return null;
  }

  // Render empty state
  if (files.length === 0 && emptyMessage) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground",
          className,
        )}
      >
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  // Get layout classes based on variant
  const getLayoutClasses = () => {
    switch (variant) {
      case "grid":
        return "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4";
      case "compact":
        return "flex flex-wrap gap-2";
      case "horizontal":
        return "flex gap-3";
      case "list":
      default:
        return "flex flex-col gap-2";
    }
  };

  // Render file item based on variant
  const renderFileItem = (fileState: FileUploadState) => {
    const commonProps = {
      key: fileState.id,
      id: fileState.id,
      file: fileState.file,
      progress: fileState.progress,
      status: fileState.status,
      errorMessage: fileState.errorMessage,
      onRemove: onRemove ? () => onRemove(fileState.id) : undefined,
      onRetry: onRetry ? () => onRetry(fileState.id) : undefined,
      onCancel: onCancel ? () => onCancel(fileState.id) : undefined,
      onPreview: onPreview ? () => onPreview(fileState.id) : undefined,
    };

    if (variant === "compact") {
      return (
        <CompactFilePreviewItem
          key={fileState.id}
          id={fileState.id}
          file={fileState.file}
          status={fileState.status}
          onRemove={onRemove ? () => onRemove(fileState.id) : undefined}
        />
      );
    }

    return (
      <FilePreviewItem
        {...commonProps}
        size={size}
        showThumbnail={showThumbnails}
        showDetails={showDetails}
        showProgress={showProgress}
      />
    );
  };

  // Horizontal variant with horizontal scroll
  if (variant === "horizontal") {
    return (
      <ScrollArea className={cn("w-full", className)}>
        <div className={getLayoutClasses()}>{files.map(renderFileItem)}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Other variants with optional vertical scroll
  const content = (
    <div className={getLayoutClasses()}>{files.map(renderFileItem)}</div>
  );

  if (maxHeight) {
    return (
      <ScrollArea className={cn("w-full", className)} style={{ maxHeight }}>
        {content}
      </ScrollArea>
    );
  }

  return <div className={className}>{content}</div>;
}

/**
 * Get summary statistics for file list
 */
export function getFileListStats(files: FileUploadState[]) {
  const total = files.length;
  const pending = files.filter((f) => f.status === "pending").length;
  const uploading = files.filter((f) => f.status === "uploading").length;
  const completed = files.filter((f) => f.status === "completed").length;
  const failed = files.filter((f) => f.status === "error").length;
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const uploadedSize = files
    .filter((f) => f.status === "completed")
    .reduce((sum, f) => sum + f.file.size, 0);

  const overallProgress =
    total > 0 ? files.reduce((sum, f) => sum + f.progress, 0) / total : 0;

  return {
    total,
    pending,
    uploading,
    completed,
    failed,
    totalSize,
    uploadedSize,
    overallProgress,
    isComplete: completed === total,
    hasErrors: failed > 0,
    isUploading: uploading > 0,
  };
}

/**
 * FilePreviewListHeader - Optional header with stats
 */
export interface FilePreviewListHeaderProps {
  /** Files state */
  files: FileUploadState[];
  /** Title */
  title?: string;
  /** Show stats */
  showStats?: boolean;
  /** Clear all callback */
  onClearAll?: () => void;
  /** Retry all failed callback */
  onRetryFailed?: () => void;
  /** Custom class name */
  className?: string;
}

export function FilePreviewListHeader({
  files,
  title = "Files",
  showStats = true,
  onClearAll,
  onRetryFailed,
  className,
}: FilePreviewListHeaderProps) {
  const stats = getFileListStats(files);

  if (files.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b pb-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {showStats && (
          <span className="text-xs text-muted-foreground">
            {stats.completed}/{stats.total}
            {stats.hasErrors && (
              <span className="ml-1 text-destructive">
                ({stats.failed} failed)
              </span>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Retry failed button */}
        {stats.hasErrors && onRetryFailed && (
          <button
            onClick={onRetryFailed}
            className="text-xs text-primary hover:underline"
          >
            Retry failed
          </button>
        )}

        {/* Clear all button */}
        {onClearAll && stats.isComplete && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
