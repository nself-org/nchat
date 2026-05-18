"use client";

import * as React from "react";
import { X, AlertCircle, RotateCcw, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileIcon } from "./file-icon";
import { UploadProgress, type UploadStatus } from "./upload-progress";
import {
  formatFileSize,
  getFileCategory,
  createPreviewUrl,
  revokePreviewUrl,
} from "@/lib/storage/upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FilePreviewItemProps {
  /** File to preview */
  file: File;
  /** Unique identifier */
  id: string;
  /** Upload progress (0-100) */
  progress?: number;
  /** Upload status */
  status?: UploadStatus;
  /** Error message (when status is 'error') */
  errorMessage?: string;
  /** Whether the item can be removed */
  removable?: boolean;
  /** Show preview thumbnail for images */
  showThumbnail?: boolean;
  /** Show file details (name, size, type) */
  showDetails?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Remove callback */
  onRemove?: () => void;
  /** Retry upload callback */
  onRetry?: () => void;
  /** Cancel upload callback */
  onCancel?: () => void;
  /** Preview callback */
  onPreview?: () => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    container: "p-2",
    thumbnailSize: "h-8 w-8",
    iconSize: "sm" as const,
    fontSize: "text-xs",
    nameMaxWidth: "max-w-[120px]",
    gap: "gap-2",
  },
  md: {
    container: "p-3",
    thumbnailSize: "h-12 w-12",
    iconSize: "md" as const,
    fontSize: "text-sm",
    nameMaxWidth: "max-w-[180px]",
    gap: "gap-3",
  },
  lg: {
    container: "p-4",
    thumbnailSize: "h-16 w-16",
    iconSize: "lg" as const,
    fontSize: "text-base",
    nameMaxWidth: "max-w-[240px]",
    gap: "gap-4",
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FilePreviewItem - Individual file preview with progress and actions
 *
 * @example
 * ```tsx
 * <FilePreviewItem
 *   file={file}
 *   id="file-1"
 *   progress={45}
 *   status="uploading"
 *   removable
 *   onRemove={() => handleRemove(file)}
 *   onCancel={() => handleCancel(file)}
 * />
 * ```
 */
export function FilePreviewItem({
  file,
  id,
  progress = 0,
  status = "pending",
  errorMessage,
  removable = true,
  showThumbnail = true,
  showDetails = true,
  showProgress = true,
  size = "md",
  onRemove,
  onRetry,
  onCancel,
  onPreview,
  className,
}: FilePreviewItemProps) {
  const config = SIZE_CONFIG[size];
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const category = getFileCategory(file.type);
  const isImage = category === "image";
  const isVideo = category === "video";

  // Create thumbnail URL for images
  React.useEffect(() => {
    if (showThumbnail && (isImage || isVideo)) {
      const url = createPreviewUrl(file);
      setThumbnailUrl(url);

      return () => {
        revokePreviewUrl(url);
      };
    }
  }, [file, showThumbnail, isImage, isVideo]);

  // Determine border color based on status
  const getBorderColor = () => {
    switch (status) {
      case "completed":
        return "border-green-500/50";
      case "error":
        return "border-destructive/50";
      case "uploading":
        return "border-primary/50";
      default:
        return "border-border";
    }
  };

  // Render thumbnail or icon
  const renderThumbnail = () => {
    if (showThumbnail && thumbnailUrl && isImage) {
      return (
        <div
          className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-md bg-muted",
            config.thumbnailSize,
          )}
        >
          <img
            src={thumbnailUrl}
            alt={file.name}
            className="h-full w-full object-cover"
          />
          {/* Preview overlay */}
          {onPreview && status === "completed" && (
            <button
              onClick={onPreview}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
            >
              <Eye className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      );
    }

    if (showThumbnail && thumbnailUrl && isVideo) {
      return (
        <div
          className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-md bg-muted",
            config.thumbnailSize,
          )}
        >
          <video
            src={thumbnailUrl}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/90 pl-0.5">
              <div className="border-b-[4px] border-l-[6px] border-t-[4px] border-b-transparent border-l-gray-900 border-t-transparent" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-md",
          config.thumbnailSize,
        )}
      >
        <FileIcon file={file} size={config.iconSize} showBackground />
      </div>
    );
  };

  // Render action buttons
  const renderActions = () => {
    const buttons: React.ReactNode[] = [];

    // Preview button (for completed images)
    if (onPreview && status === "completed" && isImage) {
      buttons.push(
        <TooltipProvider key="preview">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onPreview}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="sr-only">Preview</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    }

    // Retry button (for errors)
    if (onRetry && status === "error") {
      buttons.push(
        <TooltipProvider key="retry">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={onRetry}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="sr-only">Retry</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retry upload</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    }

    // Remove button
    if (removable && onRemove) {
      buttons.push(
        <TooltipProvider key="remove">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remove</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
    }

    return buttons.length > 0 ? (
      <div className="flex items-center gap-0.5">{buttons}</div>
    ) : null;
  };

  return (
    <div
      className={cn(
        "flex items-start rounded-lg border bg-card transition-colors",
        getBorderColor(),
        config.container,
        config.gap,
        className,
      )}
      data-file-id={id}
    >
      {/* Thumbnail/Icon */}
      {renderThumbnail()}

      {/* File details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {showDetails && (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* File name */}
              <p
                className={cn(
                  "truncate font-medium",
                  config.fontSize,
                  config.nameMaxWidth,
                )}
                title={file.name}
              >
                {file.name}
              </p>
              {/* File meta */}
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
                {file.type && (
                  <>
                    {" "}
                    <span className="mx-1">·</span>{" "}
                    {file.type.split("/")[1]?.toUpperCase() || file.type}
                  </>
                )}
              </p>
            </div>

            {/* Action buttons */}
            {renderActions()}
          </div>
        )}

        {/* Progress bar */}
        {showProgress && status !== "pending" && (
          <UploadProgress
            progress={progress}
            status={status}
            errorMessage={errorMessage}
            showStatusIcon={false}
            showCancel={status === "uploading"}
            showRetry={false}
            showPercentage
            onCancel={onCancel}
            size="sm"
          />
        )}

        {/* Error state without progress */}
        {status === "error" && !showProgress && (
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-xs">{errorMessage || "Upload failed"}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CompactFilePreviewItem - Smaller preview for inline use
 */
export interface CompactFilePreviewItemProps {
  /** File to preview */
  file: File;
  /** Unique identifier */
  id: string;
  /** Upload status */
  status?: UploadStatus;
  /** Remove callback */
  onRemove?: () => void;
  /** Custom class name */
  className?: string;
}

export function CompactFilePreviewItem({
  file,
  id,
  status = "pending",
  onRemove,
  className,
}: CompactFilePreviewItemProps) {
  const category = getFileCategory(file.type);
  const isImage = category === "image";
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);

  // Create thumbnail URL for images
  React.useEffect(() => {
    if (isImage) {
      const url = createPreviewUrl(file);
      setThumbnailUrl(url);

      return () => {
        revokePreviewUrl(url);
      };
    }
  }, [file, isImage]);

  return (
    <div
      className={cn(
        "bg-muted/50 group relative inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
        status === "error" && "border-destructive/50",
        className,
      )}
      data-file-id={id}
    >
      {/* Thumbnail or icon */}
      {isImage && thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={file.name}
          className="h-4 w-4 rounded object-cover"
        />
      ) : (
        <FileIcon file={file} size="xs" />
      )}

      {/* File name */}
      <span className="max-w-[100px] truncate text-xs" title={file.name}>
        {file.name}
      </span>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Remove {file.name}</span>
        </button>
      )}
    </div>
  );
}
