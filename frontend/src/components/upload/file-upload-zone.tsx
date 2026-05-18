/**
 * File Upload Zone - Drag and drop zone component
 *
 * Features:
 * - Drag and drop file support
 * - Visual feedback on drag over
 * - Click to open file picker
 * - Multiple file support
 * - File type filtering
 * - File size validation
 */

"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { Upload, FileUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttachmentStore } from "@/stores/attachment-store";
import {
  validateFiles,
  FileValidationOptions,
  formatFileSize,
} from "@/lib/upload/file-utils";

// ============================================================================
// Types
// ============================================================================

export interface FileUploadZoneProps {
  /** Callback when files are selected/dropped */
  onFilesSelected: (files: File[]) => void;
  /** Accepted file types (e.g., 'image/*,video/*,.pdf') */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Validation options */
  validation?: FileValidationOptions;
  /** Maximum number of files */
  maxFiles?: number;
  /** Whether the zone is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "inline";
  /** Custom placeholder content */
  children?: React.ReactNode;
  /** Callback when validation errors occur */
  onValidationError?: (errors: { file: File; error: string }[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function FileUploadZone({
  onFilesSelected,
  accept,
  multiple = true,
  validation,
  maxFiles,
  disabled = false,
  className,
  variant = "default",
  children,
  onValidationError,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const { setDragActive, dragActive } = useAttachmentStore();

  // Handle file selection
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const files = Array.from(fileList);

      // Check max files
      if (maxFiles && files.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate files
      if (validation || maxFiles) {
        const { valid, invalid } = validateFiles(files, {
          ...validation,
          maxFiles,
        });

        if (invalid.length > 0) {
          onValidationError?.(invalid);
          if (valid.length === 0) {
            setError(invalid[0].error);
            return;
          }
        }

        if (valid.length > 0) {
          onFilesSelected(valid);
        }
      } else {
        onFilesSelected(files);
      }
    },
    [onFilesSelected, validation, maxFiles, onValidationError],
  );

  // Handle drag events
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounterRef.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
        setDragActive(true);
      }
    },
    [disabled, setDragActive],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
        setDragActive(false);
      }
    },
    [setDragActive],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragActive(false);
      dragCounterRef.current = 0;

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles, setDragActive],
  );

  // Handle click
  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFiles],
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  // Generate accept string for input
  const inputAccept = accept || undefined;

  // Variant styles
  const variantStyles = {
    default: "min-h-[200px] p-8",
    compact: "min-h-[120px] p-4",
    inline: "min-h-[60px] p-3",
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-200",
        variantStyles[variant],
        isDragOver || dragActive
          ? "bg-primary/5 border-primary"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        disabled && "cursor-not-allowed opacity-50",
        !disabled && "cursor-pointer",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload files"
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={inputAccept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />

      {/* Content */}
      {children ? (
        children
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          {/* Icon */}
          <div
            className={cn(
              "rounded-full p-3 transition-colors",
              isDragOver || dragActive
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isDragOver ? (
              <FileUp className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>

          {/* Text */}
          {variant !== "inline" && (
            <>
              <div className="text-sm font-medium">
                {isDragOver ? (
                  "Drop files here"
                ) : (
                  <>
                    <span className="text-primary">Click to upload</span>
                    <span className="text-muted-foreground">
                      {" "}
                      or drag and drop
                    </span>
                  </>
                )}
              </div>

              {/* Hints */}
              <div className="text-xs text-muted-foreground">
                {accept && (
                  <span>
                    Accepted:{" "}
                    {accept
                      .split(",")
                      .map((t) => t.trim())
                      .join(", ")}
                  </span>
                )}
                {validation?.maxSize && (
                  <span className="ml-2">
                    Max size: {formatFileSize(validation.maxSize)}
                  </span>
                )}
                {maxFiles && (
                  <span className="ml-2">Max files: {maxFiles}</span>
                )}
              </div>
            </>
          )}

          {/* Inline variant text */}
          {variant === "inline" && (
            <span className="text-xs text-muted-foreground">
              {isDragOver ? "Drop files" : "Drop files or click to upload"}
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 absolute bottom-2 left-2 right-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag overlay */}
      {(isDragOver || dragActive) && (
        <div className="bg-primary/5 pointer-events-none absolute inset-0 rounded-lg" />
      )}
    </div>
  );
}

// ============================================================================
// Overlay variant for full-page drop zones
// ============================================================================

export interface FileUploadOverlayProps {
  /** Callback when files are dropped */
  onFilesDropped: (files: File[]) => void;
  /** Accepted file types */
  accept?: string;
  /** Whether the overlay is active */
  active?: boolean;
  /** Custom class name */
  className?: string;
}

export function FileUploadOverlay({
  onFilesDropped,
  accept,
  active = false,
  className,
}: FileUploadOverlayProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const { setDragActive } = useAttachmentStore();

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
        setDragActive(true);
      }
    },
    [setDragActive],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragOver(false);
        setDragActive(false);
      }
    },
    [setDragActive],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragActive(false);
      dragCounterRef.current = 0;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        // Filter by accept if specified
        let fileArray = Array.from(files);
        if (accept) {
          const acceptedTypes = accept
            .split(",")
            .map((t) => t.trim().toLowerCase());
          fileArray = fileArray.filter((file) => {
            const mimeType = file.type.toLowerCase();
            const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
            return acceptedTypes.some((type) => {
              if (type.endsWith("/*")) {
                return mimeType.startsWith(type.slice(0, -1));
              }
              return type === mimeType || type === extension;
            });
          });
        }
        if (fileArray.length > 0) {
          onFilesDropped(fileArray);
        }
      }
    },
    [accept, onFilesDropped, setDragActive],
  );

  if (!active && !isDragOver) return null;

  return (
    <div
      className={cn(
        "bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity",
        isDragOver ? "opacity-100" : "opacity-0",
        className,
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="bg-primary/5 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary p-12">
        <div className="bg-primary/10 rounded-full p-4">
          <FileUp className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">Drop files to upload</p>
          {accept && (
            <p className="text-sm text-muted-foreground">Accepted: {accept}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileUploadZone;
