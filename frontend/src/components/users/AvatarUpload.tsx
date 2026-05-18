"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload, Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AvatarUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  currentAvatarUrl?: string;
  fallback?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => Promise<void>;
  size?: "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  maxSizeMB?: number;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES = {
  sm: "h-16 w-16",
  md: "h-20 w-20",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const BUTTON_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
  xl: "h-9 w-9",
};

const ICON_SIZE_CLASSES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
  xl: "h-4 w-4",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// ============================================================================
// Component
// ============================================================================

const AvatarUpload = React.forwardRef<HTMLDivElement, AvatarUploadProps>(
  (
    {
      className,
      currentAvatarUrl,
      fallback = "?",
      onUpload,
      onRemove,
      size = "lg",
      disabled = false,
      maxSizeMB = 2,
      ...props
    },
    ref,
  ) => {
    const [isUploading, setIsUploading] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const handleFileSelect = React.useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
          logger.error("Avatar upload error:", err);
        } finally {
          setIsUploading(false);
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      },
      [onUpload, maxSizeBytes, maxSizeMB],
    );

    const handleRemove = React.useCallback(async () => {
      if (!onRemove) return;

      setIsUploading(true);
      setError(null);
      try {
        await onRemove();
        setPreviewUrl(null);
      } catch (err) {
        setError("Failed to remove image");
        logger.error("Avatar remove error:", err);
      } finally {
        setIsUploading(false);
      }
    }, [onRemove]);

    const triggerFileSelect = () => {
      if (!disabled && !isUploading) {
        fileInputRef.current?.click();
      }
    };

    const displayUrl = previewUrl || currentAvatarUrl;

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-4", className)}
        {...props}
      >
        {/* Avatar with overlay */}
        <div className="group relative">
          <Avatar className={cn(SIZE_CLASSES[size], "border-2 border-muted")}>
            <AvatarImage src={displayUrl} alt="Avatar" />
            <AvatarFallback className="text-lg font-medium">
              {fallback.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Hover overlay */}
          {!disabled && !isUploading && (
            <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={triggerFileSelect}
                className={cn(
                  "flex items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30",
                  BUTTON_SIZE_CLASSES[size],
                )}
                aria-label="Upload new avatar"
              >
                <Camera className={ICON_SIZE_CLASSES[size]} />
              </button>
              {displayUrl && onRemove && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className={cn(
                    "flex items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-red-500/80",
                    BUTTON_SIZE_CLASSES[size],
                  )}
                  aria-label="Remove avatar"
                >
                  <Trash2 className={ICON_SIZE_CLASSES[size]} />
                </button>
              )}
            </div>
          )}

          {/* Loading indicator */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Upload info and button */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFileSelect}
              disabled={disabled || isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading..." : "Upload Photo"}
            </Button>
            {displayUrl && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, GIF, or WebP. Max {maxSizeMB}MB.
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
        />
      </div>
    );
  },
);
AvatarUpload.displayName = "AvatarUpload";

export { AvatarUpload };
