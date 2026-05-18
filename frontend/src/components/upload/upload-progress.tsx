/**
 * Upload Progress - Progress indicator component for uploads
 *
 * Features:
 * - Progress bar with percentage
 * - File name display
 * - Cancel button
 * - Upload speed / time remaining
 * - Multiple upload variants
 */

"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatFileSize, truncateFileName } from "@/lib/upload/file-utils";
import { UploadStatus } from "@/stores/attachment-store";

// ============================================================================
// Types
// ============================================================================

export interface UploadProgressProps {
  /** Unique identifier */
  id: string;
  /** File name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Upload status */
  status: UploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Bytes uploaded */
  uploadedBytes?: number;
  /** Upload start time */
  startedAt?: number | null;
  /** Error message if failed */
  error?: string | null;
  /** Callback to cancel upload */
  onCancel?: (id: string) => void;
  /** Callback to retry failed upload */
  onRetry?: (id: string) => void;
  /** Callback to remove/dismiss */
  onRemove?: (id: string) => void;
  /** Callback to pause upload (if supported) */
  onPause?: (id: string) => void;
  /** Callback to resume upload (if supported) */
  onResume?: (id: string) => void;
  /** Custom class name */
  className?: string;
  /** Show details (speed, time remaining) */
  showDetails?: boolean;
  /** Variant style */
  variant?: "default" | "compact" | "minimal";
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateUploadSpeed(
  uploadedBytes: number,
  startedAt: number | null | undefined,
): number | null {
  if (!startedAt || uploadedBytes === 0) return null;
  const elapsed = (Date.now() - startedAt) / 1000; // seconds
  if (elapsed <= 0) return null;
  return uploadedBytes / elapsed; // bytes per second
}

function calculateTimeRemaining(
  uploadedBytes: number,
  totalBytes: number,
  startedAt: number | null | undefined,
): number | null {
  const speed = calculateUploadSpeed(uploadedBytes, startedAt);
  if (!speed || speed === 0) return null;
  const remainingBytes = totalBytes - uploadedBytes;
  return remainingBytes / speed; // seconds
}

function formatSpeed(bytesPerSecond: number | null): string {
  if (bytesPerSecond === null) return "";
  if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`;
  if (bytesPerSecond < 1024 * 1024)
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null) return "";
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m remaining`;
  return `${Math.round(seconds / 3600)}h remaining`;
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: UploadStatus }) {
  const config = useMemo(() => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className: "bg-muted text-muted-foreground",
        };
      case "queued":
        return { label: "Queued", className: "bg-muted text-muted-foreground" };
      case "uploading":
        return { label: "Uploading", className: "bg-primary/10 text-primary" };
      case "processing":
        return {
          label: "Processing",
          className: "bg-yellow-500/10 text-yellow-600",
        };
      case "completed":
        return {
          label: "Completed",
          className: "bg-green-500/10 text-green-600",
        };
      case "failed":
        return {
          label: "Failed",
          className: "bg-destructive/10 text-destructive",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          className: "bg-muted text-muted-foreground",
        };
      default:
        return {
          label: "Unknown",
          className: "bg-muted text-muted-foreground",
        };
    }
  }, [status]);

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// Component
// ============================================================================

export function UploadProgress({
  id,
  fileName,
  fileSize,
  status,
  progress,
  uploadedBytes = 0,
  startedAt,
  error,
  onCancel,
  onRetry,
  onRemove,
  onPause,
  onResume,
  className,
  showDetails = true,
  variant = "default",
}: UploadProgressProps) {
  const isUploading = status === "uploading";
  const isProcessing = status === "processing";
  const isQueued = status === "queued" || status === "pending";
  const isFailed = status === "failed";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";
  const isPaused = false; // Would need to add to status type

  const speed = useMemo(
    () => calculateUploadSpeed(uploadedBytes, startedAt),
    [uploadedBytes, startedAt],
  );

  const timeRemaining = useMemo(
    () => calculateTimeRemaining(uploadedBytes, fileSize, startedAt),
    [uploadedBytes, fileSize, startedAt],
  );

  // Minimal variant
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isUploading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {isFailed && <AlertCircle className="h-4 w-4 text-destructive" />}
        <span className="text-sm">{progress}%</span>
        {onCancel && isUploading && (
          <button
            type="button"
            onClick={() => onCancel(id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm">
              {truncateFileName(fileName, 25)}
            </span>
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {isUploading ? `${progress}%` : formatFileSize(fileSize)}
            </span>
          </div>
          {isUploading && <Progress value={progress} className="mt-1 h-1" />}
        </div>
        {onCancel && isUploading && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => onCancel(id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        {isFailed && onRetry && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => onRetry(id)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isFailed && "border-destructive/50 bg-destructive/5",
        isCompleted && "border-green-500/30 bg-green-500/5",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={fileName}>
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatFileSize(uploadedBytes)} / {formatFileSize(fileSize)}
            </span>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Pause/Resume (if supported) */}
          {isUploading && onPause && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPause(id)}
              aria-label="Pause upload"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {isPaused && onResume && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onResume(id)}
              aria-label="Resume upload"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Cancel */}
          {(isUploading || isQueued || isProcessing) && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onCancel(id)}
              aria-label="Cancel upload"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Retry */}
          {isFailed && onRetry && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRetry(id)}
              aria-label="Retry upload"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Remove/Dismiss */}
          {(isCompleted || isFailed || isCancelled) && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onRemove(id)}
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(isUploading || isProcessing || isQueued) && (
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Details */}
      {showDetails && isUploading && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}%</span>
          <div className="flex items-center gap-3">
            {speed !== null && <span>{formatSpeed(speed)}</span>}
            {timeRemaining !== null && (
              <span>{formatTimeRemaining(timeRemaining)}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {isFailed && error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// Aggregate Progress Bar
// ============================================================================

export interface AggregateUploadProgressProps {
  /** Total files being uploaded */
  totalFiles: number;
  /** Completed files */
  completedFiles: number;
  /** Overall progress (0-100) */
  progress: number;
  /** Total bytes to upload */
  totalBytes: number;
  /** Bytes uploaded */
  uploadedBytes: number;
  /** Callback to cancel all */
  onCancelAll?: () => void;
  /** Custom class name */
  className?: string;
}

export function AggregateUploadProgress({
  totalFiles,
  completedFiles,
  progress,
  totalBytes,
  uploadedBytes,
  onCancelAll,
  className,
}: AggregateUploadProgressProps) {
  const isComplete = completedFiles === totalFiles;

  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isComplete && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          <span className="text-sm font-medium">
            {isComplete
              ? `${totalFiles} files uploaded`
              : `Uploading ${completedFiles + 1} of ${totalFiles}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}
          </span>
          {onCancelAll && !isComplete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onCancelAll}
            >
              Cancel all
            </Button>
          )}
        </div>
      </div>

      <Progress value={progress} className="mt-2 h-1.5" />

      <div className="mt-1 text-right text-xs text-muted-foreground">
        {progress}%
      </div>
    </div>
  );
}

// ============================================================================
// Toast-style Upload Progress
// ============================================================================

export interface UploadProgressToastProps {
  /** Files being uploaded */
  uploads: Array<{
    id: string;
    fileName: string;
    progress: number;
    status: UploadStatus;
  }>;
  /** Callback to cancel all */
  onCancelAll?: () => void;
  /** Callback to dismiss toast */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
}

export function UploadProgressToast({
  uploads,
  onCancelAll,
  onDismiss,
  className,
}: UploadProgressToastProps) {
  const activeUploads = uploads.filter(
    (u) =>
      u.status === "uploading" ||
      u.status === "queued" ||
      u.status === "pending",
  );
  const completedUploads = uploads.filter((u) => u.status === "completed");
  const failedUploads = uploads.filter((u) => u.status === "failed");

  const totalProgress =
    uploads.length > 0
      ? Math.round(
          uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length,
        )
      : 0;

  const isComplete = activeUploads.length === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg",
        className,
      )}
    >
      {/* Icon */}
      {!isComplete && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      {isComplete && failedUploads.length === 0 && (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      )}
      {isComplete && failedUploads.length > 0 && (
        <AlertCircle className="h-5 w-5 text-yellow-500" />
      )}

      {/* Text */}
      <div className="flex-1">
        <p className="text-sm font-medium">
          {!isComplete && `Uploading ${activeUploads.length} file(s)...`}
          {isComplete &&
            failedUploads.length === 0 &&
            `${completedUploads.length} file(s) uploaded`}
          {isComplete && failedUploads.length > 0 && (
            <>
              {completedUploads.length} uploaded, {failedUploads.length} failed
            </>
          )}
        </p>
        {!isComplete && (
          <Progress value={totalProgress} className="mt-1 h-1 w-32" />
        )}
      </div>

      {/* Actions */}
      {!isComplete && onCancelAll && (
        <Button variant="ghost" size="sm" onClick={onCancelAll}>
          Cancel
        </Button>
      )}
      {isComplete && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default UploadProgress;
