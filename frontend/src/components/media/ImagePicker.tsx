"use client";

/**
 * ImagePicker Component
 * Multi-select image picker with compression and preview
 */

import * as React from "react";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, Image as ImageIcon, X, Edit2, Check } from "lucide-react";
import { camera } from "@/lib/capacitor/camera";
import {
  compressImage,
  formatSize,
  type CompressionResult,
} from "@/lib/media/image-compression";
import { Capacitor } from "@capacitor/core";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ImagePickerProps {
  maxImages?: number;
  maxSizeMB?: number;
  allowCamera?: boolean;
  allowGallery?: boolean;
  autoCompress?: boolean;
  compressionQuality?: number;
  onImagesSelected?: (images: SelectedImage[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface SelectedImage {
  id: string;
  file: File;
  blob: Blob;
  preview: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

// ============================================================================
// Component
// ============================================================================

export function ImagePicker({
  maxImages = 10,
  maxSizeMB = 10,
  allowCamera = true,
  allowGallery = true,
  autoCompress = true,
  compressionQuality = 0.7,
  onImagesSelected,
  onError,
  className,
}: ImagePickerProps) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file input change
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      await processFiles(files);
    },
    [selectedImages],
  );

  /**
   * Process selected files
   */
  const processFiles = async (files: File[]) => {
    // Check max images limit
    if (selectedImages.length + files.length > maxImages) {
      onError?.(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate files
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        onError?.(`${file.name} is not an image file`);
        return false;
      }

      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > maxSizeMB) {
        onError?.(`${file.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setIsCompressing(true);
    setCompressionProgress(0);

    const newImages: SelectedImage[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      try {
        let resultBlob: Blob;
        let compressedSize: number;
        let width: number;
        let height: number;

        if (autoCompress) {
          const result = await compressImage(file, {
            quality: compressionQuality,
            maxWidth: 1920,
            maxHeight: 1920,
          });

          resultBlob = result.blob;
          compressedSize = result.compressedSize;
          width = result.width;
          height = result.height;
        } else {
          resultBlob = file;
          compressedSize = file.size;

          // Get dimensions
          const img = await loadImage(file);
          width = img.naturalWidth;
          height = img.naturalHeight;
        }

        const preview = URL.createObjectURL(resultBlob);

        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          blob: resultBlob,
          preview,
          originalSize: file.size,
          compressedSize,
          width,
          height,
        });

        setCompressionProgress(((i + 1) / validFiles.length) * 100);
      } catch (error) {
        logger.error("Failed to process image:", error);
        onError?.(`Failed to process ${file.name}`);
      }
    }

    setSelectedImages((prev) => [...prev, ...newImages]);
    setIsCompressing(false);

    onImagesSelected?.([...selectedImages, ...newImages]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handle camera capture
   */
  const handleCameraCapture = async () => {
    try {
      const hasPermission = await camera.requestCameraPermission();
      if (!hasPermission) {
        onError?.("Camera permission denied");
        return;
      }

      const photo = await camera.takePhoto();
      if (!photo) {
        onError?.("Failed to capture photo");
        return;
      }

      // Convert to File object
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const file = new File([blob], photo.filename, { type: "image/jpeg" });

      await processFiles([file]);
    } catch (error) {
      logger.error("Camera capture failed:", error);
      onError?.("Failed to capture photo");
    }
  };

  /**
   * Handle gallery selection
   */
  const handleGallerySelect = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await camera.pickPhoto();
        if (!photo) return;

        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const file = new File([blob], photo.filename, { type: "image/jpeg" });

        await processFiles([file]);
      } catch (error) {
        logger.error("Gallery selection failed:", error);
        onError?.("Failed to select photo");
      }
    } else {
      // Web: use file input
      fileInputRef.current?.click();
    }
  };

  /**
   * Remove image
   */
  const handleRemoveImage = (id: string) => {
    setSelectedImages((prev) => {
      const updated = prev.filter((img) => {
        if (img.id === id) {
          URL.revokeObjectURL(img.preview);
          return false;
        }
        return true;
      });

      onImagesSelected?.(updated);
      return updated;
    });
  };

  /**
   * Load image helper
   */
  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action Buttons */}
      <div className="flex gap-2">
        {allowCamera && Capacitor.isNativePlatform() && (
          <Button onClick={handleCameraCapture} variant="outline">
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
        )}
        {allowGallery && (
          <Button onClick={handleGallerySelect} variant="outline">
            <ImageIcon className="mr-2 h-4 w-4" />
            Choose from Gallery
          </Button>
        )}

        {/* Hidden file input for web */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Compression Progress */}
      {isCompressing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Compressing images...</span>
            <span>{Math.round(compressionProgress)}%</span>
          </div>
          <Progress value={compressionProgress} />
        </div>
      )}

      {/* Selected Images Grid */}
      {selectedImages.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected Images ({selectedImages.length}/{maxImages})
            </span>
            {autoCompress && (
              <Badge variant="secondary">Auto-compression enabled</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {selectedImages.map((image) => (
              <div key={image.id} className="group relative aspect-square">
                <img
                  src={image.preview}
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/50" />

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Image info */}
                <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/70 p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <span>
                      {image.width} × {image.height}
                    </span>
                    {autoCompress && (
                      <span className="text-green-400">
                        {formatSize(image.compressedSize)}
                      </span>
                    )}
                  </div>
                  {autoCompress && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Original: {formatSize(image.originalSize)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedImages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 font-medium">No images selected</p>
          <p className="text-sm text-muted-foreground">
            Select up to {maxImages} images from your gallery or take photos
          </p>
        </div>
      )}
    </div>
  );
}

export default ImagePicker;
