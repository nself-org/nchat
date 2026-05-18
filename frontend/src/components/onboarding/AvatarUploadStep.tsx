"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, User, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  AvatarUploadData,
} from "@/lib/onboarding/onboarding-types";

interface AvatarUploadStepProps extends OnboardingStepProps {
  initialData?: AvatarUploadData;
  userName?: string;
  onDataChange?: (data: AvatarUploadData) => void;
  onUpload?: (file: File) => Promise<string>;
}

const INITIALS_COLORS = [
  { bg: "#EF4444", text: "#FFFFFF" }, // Red
  { bg: "#F97316", text: "#FFFFFF" }, // Orange
  { bg: "#EAB308", text: "#000000" }, // Yellow
  { bg: "#22C55E", text: "#FFFFFF" }, // Green
  { bg: "#14B8A6", text: "#FFFFFF" }, // Teal
  { bg: "#3B82F6", text: "#FFFFFF" }, // Blue
  { bg: "#8B5CF6", text: "#FFFFFF" }, // Purple
  { bg: "#EC4899", text: "#FFFFFF" }, // Pink
];

export function AvatarUploadStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  initialData,
  userName,
  onDataChange,
  onUpload,
}: AvatarUploadStepProps) {
  const [avatarData, setAvatarData] = useState<AvatarUploadData>({
    useInitials: true,
    initialsColor: INITIALS_COLORS[0].text,
    initialsBackground: INITIALS_COLORS[0].bg,
    ...initialData,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.url || null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name?: string): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (file.size > maxSize) {
        setError("Image must be less than 5MB");
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a JPEG, PNG, GIF, or WebP image");
        return;
      }

      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload if handler provided
      if (onUpload) {
        setIsUploading(true);
        try {
          const url = await onUpload(file);
          const newData = { ...avatarData, url, file, useInitials: false };
          setAvatarData(newData);
          onDataChange?.(newData);
        } catch (err) {
          setError("Failed to upload image. Please try again.");
          setPreviewUrl(null);
        } finally {
          setIsUploading(false);
        }
      } else {
        const newData = { ...avatarData, file, useInitials: false };
        setAvatarData(newData);
        onDataChange?.(newData);
      }
    },
    [avatarData, onDataChange, onUpload],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setAvatarData({
      ...avatarData,
      file: undefined,
      url: undefined,
      useInitials: true,
    });
    onDataChange?.({
      ...avatarData,
      file: undefined,
      url: undefined,
      useInitials: true,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleColorSelect = (bg: string, text: string) => {
    const newData = {
      ...avatarData,
      initialsBackground: bg,
      initialsColor: text,
      useInitials: true,
    };
    setAvatarData(newData);
    onDataChange?.(newData);
    setPreviewUrl(null);
  };

  const handleUseInitials = () => {
    const newData = { ...avatarData, useInitials: true };
    setAvatarData(newData);
    onDataChange?.(newData);
    setPreviewUrl(null);
  };

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Add a Profile Picture
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Upload a photo or use your initials. You can always change this later.
        </p>
      </div>

      {/* Avatar Preview */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className={cn(
            "relative mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-zinc-200 dark:border-zinc-700",
            isDragging && "border-dashed border-primary",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : avatarData.useInitials ? (
            <div
              className="flex h-full w-full items-center justify-center text-4xl font-bold"
              style={{
                backgroundColor: avatarData.initialsBackground,
                color: avatarData.initialsColor,
              }}
            >
              {initials}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <User className="h-12 w-12 text-zinc-400" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Photo
        </Button>

        <p className="mt-2 text-xs text-zinc-500">
          JPEG, PNG, GIF, or WebP. Max 5MB.
        </p>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {/* Initials Colors */}
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Or use initials
          </span>
          {!avatarData.useInitials && previewUrl && (
            <Button variant="ghost" size="sm" onClick={handleUseInitials}>
              Use Initials
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {INITIALS_COLORS.map((color, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleColorSelect(color.bg, color.text)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all",
                avatarData.initialsBackground === color.bg &&
                  avatarData.useInitials &&
                  "ring-2 ring-primary ring-offset-2",
              )}
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {initials}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}
          <Button onClick={onNext} disabled={isUploading}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
