/**
 * FileUploader Component
 *
 * Drag-and-drop file upload component with progress tracking.
 */

"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  File,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  AlertCircle,
  CheckCircle,
  Loader2,
  RotateCcw,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFileUpload, type QueuedFile } from "@/hooks/use-file-upload";
import { formatBytes } from "@/services/files/types";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface FileUploaderProps {
  /** Channel ID for uploads */
  channelId?: string;
  /** Accept file types (e.g., "image/*,video/*") */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum number of files */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Auto-upload on file selection */
  autoUpload?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode (no drag-drop zone) */
  compact?: boolean;
  /** Show file list */
  showFileList?: boolean;
  /** Callback when files change */
  onChange?: (files: QueuedFile[]) => void;
  /** Callback when upload completes */
  onComplete?: (files: QueuedFile[]) => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FileUploader({
  channelId,
  accept,
  multiple = true,
  maxFiles = 10,
  maxSize,
  autoUpload = false,
  disabled = false,
  compact = false,
  showFileList = true,
  onChange,
  onComplete,
  className,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    files,
    isUploading,
    totalProgress,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    cancelUpload,
    retryUpload,
    validateFile,
  } = useFileUpload({
    channelId,
    autoUpload,
    onComplete: () => {
      onComplete?.(files);
    },
  });

  // Notify parent of changes
  React.useEffect(() => {
    onChange?.(files);
  }, [files, onChange]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || disabled) return;

      const fileArray = Array.from(selectedFiles).slice(
        0,
        maxFiles - files.length,
      );

      // Filter by max size if specified
      const validFiles = fileArray.filter((file) => {
        if (maxSize && file.size > maxSize) {
          logger.warn(
            `File ${file.name} exceeds maximum size of ${formatBytes(maxSize)}`,
          );
          return false;
        }
        const validation = validateFile(file);
        if (!validation.valid) {
          logger.warn(`File ${file.name}: ${validation.error}`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        addFiles(validFiles);
      }
    },
    [addFiles, disabled, files.length, maxFiles, maxSize, validateFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!disabled) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [disabled, handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFileSelect],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          disabled={disabled || files.length >= maxFiles}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Files
        </Button>
        {files.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      <motion.div
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "bg-primary/5 border-primary"
            : "hover:border-primary/50 border-border",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={!disabled ? { scale: 1.01 } : undefined}
        whileTap={!disabled ? { scale: 0.99 } : undefined}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "rounded-full p-4",
              isDragging ? "bg-primary/10" : "bg-muted",
            )}
          >
            <Upload
              className={cn(
                "h-8 w-8",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to browse
            </p>
          </div>

          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max file size: {formatBytes(maxSize)}
            </p>
          )}
        </div>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-primary/10 absolute inset-0 flex items-center justify-center rounded-lg"
            >
              <p className="text-lg font-medium text-primary">Drop to upload</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* File list */}
      {showFileList && files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </h4>
            <div className="flex items-center gap-2">
              {files.some((f) => f.progress.status === "pending") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1 h-4 w-4" />
                      Upload All
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFiles}
                disabled={isUploading}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Overall progress */}
          {isUploading && (
            <div className="space-y-1">
              <Progress value={totalProgress} className="h-2" />
              <p className="text-right text-xs text-muted-foreground">
                {totalProgress}% complete
              </p>
            </div>
          )}

          {/* File items */}
          <AnimatePresence mode="popLayout">
            {files.map((queuedFile) => (
              <FileItem
                key={queuedFile.id}
                file={queuedFile}
                onRemove={() => removeFile(queuedFile.id)}
                onCancel={() => cancelUpload(queuedFile.id)}
                onRetry={() => retryUpload(queuedFile.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// File Item Component
// ============================================================================

interface FileItemProps {
  file: QueuedFile;
  onRemove: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function FileItem({ file, onRemove, onCancel, onRetry }: FileItemProps) {
  const { status, progress, error } = file.progress;

  const Icon = getFileTypeIcon(file.file.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        status === "failed" && "border-destructive/50 bg-destructive/5",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "rounded-lg p-2",
          status === "completed"
            ? "bg-green-100 dark:bg-green-900/30"
            : status === "failed"
              ? "bg-destructive/10"
              : "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            status === "completed"
              ? "text-green-600 dark:text-green-400"
              : status === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatBytes(file.file.size)}</span>
          {status === "uploading" && (
            <>
              <span>-</span>
              <span>{progress}%</span>
            </>
          )}
          {status === "processing" && (
            <span className="text-blue-600 dark:text-blue-400">
              Processing...
            </span>
          )}
          {status === "completed" && (
            <span className="text-green-600 dark:text-green-400">Complete</span>
          )}
          {status === "failed" && error && (
            <span className="truncate text-destructive">{error}</span>
          )}
        </div>

        {/* Progress bar */}
        {(status === "uploading" || status === "processing") && (
          <Progress value={progress} className="mt-2 h-1" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {status === "uploading" && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === "failed" && (
          <Button variant="ghost" size="icon" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        {(status === "pending" ||
          status === "completed" ||
          status === "failed") && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === "completed" && (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        )}
        {status === "processing" && (
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("word")
  )
    return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return Archive;
  return File;
}
