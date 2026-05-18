"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload } from "lucide-react";

import { logger } from "@/lib/logger";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  fallback?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-20 w-20",
  lg: "h-24 w-24",
  xl: "h-32 w-32",
};

const buttonSizeClasses = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
  xl: "h-9 w-9",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
  xl: "h-4.5 w-4.5",
};

export function AvatarUpload({
  currentAvatarUrl,
  fallback = "?",
  onUpload,
  onRemove,
  size = "lg",
  className,
  disabled = false,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be less than 2MB");
        return;
      }

      setError(null);
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
        setError("Failed to upload image");
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
    [onUpload],
  );

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;

    setIsUploading(true);
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
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Avatar with overlay buttons */}
      <div className="group relative">
        <Avatar className={cn(sizeClasses[size], "border-2 border-muted")}>
          <AvatarImage src={displayUrl} alt="Avatar" />
          <AvatarFallback className="text-lg font-medium">
            {fallback.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        {!disabled && (
          <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={triggerFileSelect}
              className={cn(
                "flex items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30",
                buttonSizeClasses[size],
              )}
              disabled={isUploading}
              aria-label="Upload new avatar"
            >
              <Camera className={iconSizeClasses[size]} />
            </button>
            {displayUrl && onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                className={cn(
                  "flex items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-red-500/80",
                  buttonSizeClasses[size],
                )}
                disabled={isUploading}
                aria-label="Remove avatar"
              >
                <Trash2 className={iconSizeClasses[size]} />
              </button>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {isUploading && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60"
            aria-label="Uploading"
            role="status"
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
          JPG, PNG, or GIF. Max 2MB.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
        aria-label="Upload profile picture"
      />
    </div>
  );
}
