"use client";

import * as React from "react";
import {
  useDropzone,
  type DropzoneOptions,
  type FileRejection,
} from "react-dropzone";
import {
  Upload,
  FileUp,
  AlertCircle,
  Image as ImageIcon,
  Film,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateFile,
  formatFileSize,
  MAX_FILE_SIZE,
  ALL_ALLOWED_MIME_TYPES,
  ALLOWED_MIME_TYPES,
  type UploadError,
} from "@/lib/storage/upload";

// ============================================================================
// TYPES
// ============================================================================

export interface FileUploadZoneProps {
  /** Callback when files are accepted */
  onFilesAccepted: (files: File[]) => void;
  /** Callback when files are rejected */
  onFilesRejected?: (rejections: FileRejection[]) => void;
  /** Accepted file types (MIME types or extensions) */
  accept?: Record<string, string[]>;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Disable the dropzone */
  disabled?: boolean;
  /** Variant style */
  variant?: "default" | "compact" | "inline" | "minimal";
  /** Show accepted file types */
  showAcceptedTypes?: boolean;
  /** Show size limit */
  showSizeLimit?: boolean;
  /** Custom placeholder */
  placeholder?: React.ReactNode;
  /** Custom drag active placeholder */
  dragActivePlaceholder?: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Children to render inside */
  children?: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default accept configuration */
const DEFAULT_ACCEPT: Record<string, string[]> = {
  "image/*": [...ALLOWED_MIME_TYPES.images],
  "video/*": [...ALLOWED_MIME_TYPES.videos],
  "audio/*": [...ALLOWED_MIME_TYPES.audio],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "application/zip": [".zip"],
  "application/x-rar-compressed": [".rar"],
  "application/x-7z-compressed": [".7z"],
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FileUploadZone - Drag and drop file upload area
 *
 * @example
 * ```tsx
 * <FileUploadZone
 *   onFilesAccepted={(files) => handleUpload(files)}
 *   maxSize={10 * 1024 * 1024} // 10MB
 *   multiple
 * />
 * ```
 */
export function FileUploadZone({
  onFilesAccepted,
  onFilesRejected,
  accept = DEFAULT_ACCEPT,
  maxSize = MAX_FILE_SIZE,
  maxFiles,
  multiple = true,
  disabled = false,
  variant = "default",
  showAcceptedTypes = true,
  showSizeLimit = true,
  placeholder,
  dragActivePlaceholder,
  className,
  children,
}: FileUploadZoneProps) {
  const [error, setError] = React.useState<string | null>(null);

  // Handle drop
  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      // Validate each file
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of acceptedFiles) {
        const validation = validateFile(file, { maxSize });
        if (validation.valid) {
          validFiles.push(file);
        } else if (validation.error) {
          errors.push(`${file.name}: ${validation.error.message}`);
        }
      }

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        for (const rejection of rejectedFiles) {
          const fileErrors = rejection.errors.map((e) => e.message).join(", ");
          errors.push(`${rejection.file.name}: ${fileErrors}`);
        }
        onFilesRejected?.(rejectedFiles);
      }

      // Set error if any
      if (errors.length > 0) {
        setError(errors.slice(0, 3).join("\n"));
      }

      // Call callback with valid files
      if (validFiles.length > 0) {
        onFilesAccepted(validFiles);
      }
    },
    [maxSize, onFilesAccepted, onFilesRejected],
  );

  // Handle paste from clipboard
  const onPaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      if (disabled) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        onDrop(files, []);
      }
    },
    [disabled, onDrop],
  );

  // Dropzone options
  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple,
    disabled,
    noClick: variant === "inline",
    noKeyboard: variant === "inline",
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    open,
  } = useDropzone(dropzoneOptions);

  // Render placeholder based on variant
  const renderPlaceholder = () => {
    if (placeholder && !isDragActive) {
      return placeholder;
    }

    if (dragActivePlaceholder && isDragActive) {
      return dragActivePlaceholder;
    }

    if (variant === "minimal") {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span className="text-sm">
            {isDragActive ? "Drop files here" : "Drag files or click to upload"}
          </span>
        </div>
      );
    }

    if (variant === "compact") {
      return (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          {isDragActive ? (
            <>
              <FileUp className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium">Drop files here</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop or{" "}
                <span className="cursor-pointer text-primary hover:underline">
                  browse
                </span>
              </p>
            </>
          )}
        </div>
      );
    }

    // Default variant
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        {isDragActive ? (
          <>
            <div className="bg-primary/10 rounded-full p-4">
              <FileUp className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Drop files here</p>
              <p className="text-sm text-muted-foreground">
                Release to upload your files
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Drag & drop files here</p>
              <p className="text-sm text-muted-foreground">
                or{" "}
                <span className="cursor-pointer text-primary hover:underline">
                  browse
                </span>{" "}
                to upload
              </p>
            </div>

            {/* Accepted types */}
            {showAcceptedTypes && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Images
                </span>
                <span className="flex items-center gap-1">
                  <Film className="h-3.5 w-3.5" /> Videos
                </span>
                <span className="flex items-center gap-1">
                  <File className="h-3.5 w-3.5" /> Documents
                </span>
              </div>
            )}

            {/* Size limit */}
            {showSizeLimit && (
              <p className="text-xs text-muted-foreground">
                Max file size: {formatFileSize(maxSize)}
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  // Get border styles based on state
  const getBorderStyles = () => {
    if (disabled) {
      return "border-muted bg-muted/30 cursor-not-allowed opacity-60";
    }
    if (isDragReject) {
      return "border-destructive bg-destructive/5 border-2";
    }
    if (isDragAccept) {
      return "border-primary bg-primary/5 border-2";
    }
    if (isDragActive) {
      return "border-primary border-2";
    }
    return "border-border hover:border-primary/50 cursor-pointer";
  };

  // Inline variant wraps children
  if (variant === "inline" && children) {
    return (
      <div
        {...getRootProps()}
        onPaste={onPaste}
        className={cn(
          "relative",
          isDragActive && "ring-2 ring-primary ring-offset-2",
          className,
        )}
      >
        <input {...getInputProps()} />
        {children}

        {/* Drag overlay */}
        {isDragActive && (
          <div className="bg-background/90 absolute inset-0 z-50 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <FileUp className="h-8 w-8 animate-bounce text-primary" />
              <p className="font-medium">Drop files to upload</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        onPaste={onPaste}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          getBorderStyles(),
          variant === "minimal" && "border-0 p-2",
          variant === "compact" && "p-2",
          variant === "default" && "p-4",
        )}
      >
        <input {...getInputProps()} />
        {renderPlaceholder()}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-start gap-2 text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="whitespace-pre-line text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * useFileUploadZone - Hook for programmatic access to dropzone
 */
export function useFileUploadZone(
  options: Omit<FileUploadZoneProps, "className" | "children">,
) {
  const {
    onFilesAccepted,
    onFilesRejected,
    accept = DEFAULT_ACCEPT,
    maxSize = MAX_FILE_SIZE,
    maxFiles,
    multiple = true,
    disabled = false,
  } = options;

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const validFiles: File[] = [];

      for (const file of acceptedFiles) {
        const validation = validateFile(file, { maxSize });
        if (validation.valid) {
          validFiles.push(file);
        }
      }

      if (rejectedFiles.length > 0) {
        onFilesRejected?.(rejectedFiles);
      }

      if (validFiles.length > 0) {
        onFilesAccepted(validFiles);
      }
    },
    [maxSize, onFilesAccepted, onFilesRejected],
  );

  const dropzone = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    multiple,
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  return {
    ...dropzone,
    /** Open file picker */
    openFilePicker: dropzone.open,
  };
}
