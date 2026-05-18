"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isValidImageFile,
  getImageDimensions,
} from "@/lib/white-label/logo-processor";

interface LogoUploaderProps {
  value?: string;
  onChange: (dataUrl: string | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number; // width / height, e.g., 1 for square
  className?: string;
  placeholder?: string;
  showPreview?: boolean;
}

export function LogoUploader({
  value,
  onChange,
  accept = "image/png,image/jpeg,image/svg+xml,image/webp",
  maxSize = 5,
  minWidth,
  minHeight,
  aspectRatio,
  className,
  placeholder = "Drop your logo here or click to upload",
  showPreview = true,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    async (file: File): Promise<string | null> => {
      // Check file type
      if (!isValidImageFile(file)) {
        return "Please upload a valid image file (PNG, JPG, SVG, or WebP)";
      }

      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        return `File size must be less than ${maxSize}MB`;
      }

      // For non-SVG files, check dimensions
      if (!file.type.includes("svg")) {
        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });

          const dimensions = await getImageDimensions(dataUrl);

          if (minWidth && dimensions.width < minWidth) {
            return `Image width must be at least ${minWidth}px`;
          }

          if (minHeight && dimensions.height < minHeight) {
            return `Image height must be at least ${minHeight}px`;
          }

          if (aspectRatio) {
            const ratio = dimensions.width / dimensions.height;
            const tolerance = 0.1;
            if (Math.abs(ratio - aspectRatio) > tolerance) {
              return `Image aspect ratio should be ${aspectRatio}:1`;
            }
          }
        } catch (err) {
          return "Failed to validate image dimensions";
        }
      }

      return null;
    },
    [maxSize, minWidth, minHeight, aspectRatio],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      const validationError = await validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [validateFile, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onChange]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {showPreview && value ? (
        <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <img
            src={value}
            alt="Uploaded logo"
            className="mx-auto max-h-32 object-contain"
          />
          <button
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
            aria-label="Remove logo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
            isDragging
              ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
              : "border-zinc-300 hover:border-sky-400 dark:border-zinc-600 dark:hover:border-sky-500",
            isLoading && "pointer-events-none opacity-50",
          )}
          role="button"
          tabIndex={isLoading ? -1 : 0}
          aria-label="Upload logo"
        >
          {isLoading ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
          ) : isDragging ? (
            <Upload className="mx-auto h-10 w-10 text-sky-500" />
          ) : (
            <ImageIcon className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-500" />
          )}
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {isLoading ? "Processing..." : placeholder}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            PNG, JPG, SVG, or WebP up to {maxSize}MB
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload logo"
      />

      {!value && (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={isLoading}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Choose File
        </Button>
      )}
    </div>
  );
}
