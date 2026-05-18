"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload, Loader2, ImageIcon } from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CoverPhotoUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  currentCoverUrl?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => Promise<void>;
  height?: "sm" | "md" | "lg";
  disabled?: boolean;
  maxSizeMB?: number;
}

// ============================================================================
// Constants
// ============================================================================

const HEIGHT_CLASSES = {
  sm: "h-24",
  md: "h-32",
  lg: "h-40",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// ============================================================================
// Component
// ============================================================================

const CoverPhotoUpload = React.forwardRef<
  HTMLDivElement,
  CoverPhotoUploadProps
>(
  (
    {
      className,
      currentCoverUrl,
      onUpload,
      onRemove,
      height = "md",
      disabled = false,
      maxSizeMB = 5,
      ...props
    },
    ref,
  ) => {
    const [isUploading, setIsUploading] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const handleFile = React.useCallback(
      async (file: File) => {
        // Reset state
        setError(null);

        // Validate file type
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Please select a JPEG, PNG, GIF, or WebP image");
          return;
        }

        // Validate file size
        if (file.size > maxSizeBytes) {
          setError(`Image must be less than ${maxSizeMB}MB`);
          return;
        }

        setIsUploading(true);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        try {
          await onUpload(file);
        } catch (err) {
          setError("Failed to upload image. Please try again.");
          setPreviewUrl(null);
          logger.error("Cover photo upload error:", err);
        } finally {
          setIsUploading(false);
        }
      },
      [onUpload, maxSizeBytes, maxSizeMB],
    );

    const handleFileSelect = React.useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await handleFile(file);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      [handleFile],
    );

    const handleDrop = React.useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
          await handleFile(file);
        }
      },
      [disabled, isUploading, handleFile],
    );

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDragEnter = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleRemove = React.useCallback(async () => {
      if (!onRemove) return;

      setIsUploading(true);
      setError(null);
      try {
        await onRemove();
        setPreviewUrl(null);
      } catch (err) {
        setError("Failed to remove image");
        logger.error("Cover photo remove error:", err);
      } finally {
        setIsUploading(false);
      }
    }, [onRemove]);

    const triggerFileSelect = () => {
      if (!disabled && !isUploading) {
        fileInputRef.current?.click();
      }
    };

    const displayUrl = previewUrl || currentCoverUrl;

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {/* Cover photo area */}
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-lg border-2 border-dashed",
            "transition-colors",
            HEIGHT_CLASSES[height],
            displayUrl ? "border-transparent" : "border-muted-foreground/25",
            isDragging && "bg-primary/5 border-primary",
            !disabled && !isUploading && "cursor-pointer",
          )}
          onClick={triggerFileSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileSelect();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          aria-label="Upload cover photo"
        >
          {/* Background */}
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="from-primary/20 via-primary/10 to-primary/5 flex h-full w-full items-center justify-center bg-gradient-to-r">
              <div className="text-center">
                <ImageIcon className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
                <p className="text-sm text-muted-foreground">
                  {isDragging
                    ? "Drop image here"
                    : "Click or drag to upload cover photo"}
                </p>
              </div>
            </div>
          )}

          {/* Hover overlay with actions */}
          {!disabled && !isUploading && displayUrl && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileSelect();
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                Change
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Info text and error */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Recommended size: 1500 x 500 pixels. Max {maxSizeMB}MB.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
          aria-label="Upload cover photo file"
        />
      </div>
    );
  },
);
CoverPhotoUpload.displayName = "CoverPhotoUpload";

export { CoverPhotoUpload };
