/**
 * Media Thumbnails - Generate thumbnails for various media types
 *
 * Provides thumbnail generation for images, videos, documents, and more.
 */

import { MediaType } from "./media-types";
import { getMediaTypeFromMime } from "./media-manager";

// ============================================================================
// Types
// ============================================================================

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  fit?: "contain" | "cover" | "fill";
  background?: string;
  cropCenter?: boolean;
}

export interface ThumbnailResult {
  success: boolean;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
  width?: number;
  height?: number;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THUMBNAIL_SIZE = 200;
const DEFAULT_QUALITY = 0.8;

// Document type icons (base64 encoded simple SVG placeholders)
const DOCUMENT_ICONS: Record<string, string> = {
  pdf: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlZjQ0NDQiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PHBhdGggZD0iTTcgMTNoNiIvPjxwYXRoIGQ9Ik03IDE3aDQiLz48L3N2Zz4=",
  doc: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PHBhdGggZD0iTTcgMTNoNiIvPjxwYXRoIGQ9Ik03IDE3aDQiLz48L3N2Zz4=",
  xls: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxNjk3NGQiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PHBhdGggZD0iTTggMTNsNCA0Ii8+PHBhdGggZD0iTTEyIDEzbC00IDQiLz48L3N2Zz4=",
  ppt: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmOTczMTYiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PC9zdmc+",
  txt: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3MTcxNzEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PHBhdGggZD0iTTcgMTNoNiIvPjxwYXRoIGQ9Ik03IDE3aDQiLz48L3N2Zz4=",
  zip: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNhODU1ZjciIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PHJlY3QgeD0iOCIgeT0iMTIiIHdpZHRoPSI0IiBoZWlnaHQ9IjIiLz48cmVjdCB4PSI4IiB5PSIxNiIgd2lkdGg9IjQiIGhlaWdodD0iMiIvPjwvc3ZnPg==",
  audio:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwNmI2ZDQiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iNS41IiBjeT0iMTcuNSIgcj0iMi41Ii8+PGNpcmNsZSBjeD0iMTguNSIgY3k9IjE1LjUiIHI9IjIuNSIvPjxwYXRoIGQ9Ik04IDE3VjVsMTMtMnYxMiIvPjwvc3ZnPg==",
  default:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3MTcxNzEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTQgMmg4bDYgNnYxMmEyIDIgMCAwIDEtMiAySDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTEyIDJ2Nmg2Ii8+PC9zdmc+",
};

// ============================================================================
// Image Thumbnails
// ============================================================================

/**
 * Generate thumbnail for an image file
 */
export async function generateImageThumbnail(
  file: File | Blob,
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  const {
    maxWidth = DEFAULT_THUMBNAIL_SIZE,
    maxHeight = DEFAULT_THUMBNAIL_SIZE,
    quality = DEFAULT_QUALITY,
    format = "jpeg",
    fit = "cover",
    background = "#f3f4f6",
    cropCenter = true,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({ success: false, error: "Failed to get canvas context" });
          return;
        }

        let drawWidth: number;
        let drawHeight: number;
        let drawX = 0;
        let drawY = 0;

        if (fit === "cover" && cropCenter) {
          // Cover mode - crop to fill
          const scale = Math.max(
            maxWidth / img.naturalWidth,
            maxHeight / img.naturalHeight,
          );
          drawWidth = img.naturalWidth * scale;
          drawHeight = img.naturalHeight * scale;
          drawX = (maxWidth - drawWidth) / 2;
          drawY = (maxHeight - drawHeight) / 2;

          canvas.width = maxWidth;
          canvas.height = maxHeight;
        } else if (fit === "contain") {
          // Contain mode - fit within bounds
          const scale = Math.min(
            maxWidth / img.naturalWidth,
            maxHeight / img.naturalHeight,
          );
          drawWidth = img.naturalWidth * scale;
          drawHeight = img.naturalHeight * scale;

          canvas.width = maxWidth;
          canvas.height = maxHeight;
          drawX = (maxWidth - drawWidth) / 2;
          drawY = (maxHeight - drawHeight) / 2;

          // Fill background
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, maxWidth, maxHeight);
        } else {
          // Fill mode - stretch to fit
          canvas.width = maxWidth;
          canvas.height = maxHeight;
          drawWidth = maxWidth;
          drawHeight = maxHeight;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                success: true,
                thumbnailUrl: URL.createObjectURL(blob),
                thumbnailBlob: blob,
                width: canvas.width,
                height: canvas.height,
              });
            } else {
              resolve({
                success: false,
                error: "Failed to create thumbnail blob",
              });
            }
          },
          `image/${format}`,
          quality,
        );
      } catch (error) {
        resolve({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Thumbnail generation failed",
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve({ success: false, error: "Failed to load image" });
    };

    img.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// Video Thumbnails
// ============================================================================

/**
 * Generate thumbnail for a video file with custom options
 */
export async function generateVideoThumbnailWithOptions(
  file: File | Blob,
  options: ThumbnailOptions & { seekTime?: number } = {},
): Promise<ThumbnailResult> {
  const {
    maxWidth = DEFAULT_THUMBNAIL_SIZE,
    maxHeight = DEFAULT_THUMBNAIL_SIZE,
    quality = DEFAULT_QUALITY,
    format = "jpeg",
    seekTime = 1,
  } = options;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
    };

    video.onloadedmetadata = () => {
      // Seek to specified time (or 1 second, or half duration if too short)
      video.currentTime = Math.min(seekTime, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          cleanup();
          resolve({ success: false, error: "Failed to get canvas context" });
          return;
        }

        // Calculate dimensions maintaining aspect ratio
        const scale = Math.min(
          maxWidth / video.videoWidth,
          maxHeight / video.videoHeight,
        );
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve({
                success: true,
                thumbnailUrl: URL.createObjectURL(blob),
                thumbnailBlob: blob,
                width,
                height,
              });
            } else {
              resolve({
                success: false,
                error: "Failed to create thumbnail blob",
              });
            }
          },
          `image/${format}`,
          quality,
        );
      } catch (error) {
        cleanup();
        resolve({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Thumbnail generation failed",
        });
      }
    };

    video.onerror = () => {
      cleanup();
      resolve({ success: false, error: "Failed to load video" });
    };

    video.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// Document Thumbnails
// ============================================================================

/**
 * Get a placeholder thumbnail for document files
 */
export function getDocumentThumbnail(
  mimeType: string,
  extension: string,
): ThumbnailResult {
  let iconKey = "default";

  // Determine icon based on MIME type or extension
  if (mimeType.includes("pdf") || extension === "pdf") {
    iconKey = "pdf";
  } else if (
    mimeType.includes("word") ||
    extension === "doc" ||
    extension === "docx"
  ) {
    iconKey = "doc";
  } else if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    extension === "xls" ||
    extension === "xlsx"
  ) {
    iconKey = "xls";
  } else if (
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation") ||
    extension === "ppt" ||
    extension === "pptx"
  ) {
    iconKey = "ppt";
  } else if (
    mimeType.startsWith("text/") ||
    extension === "txt" ||
    extension === "md"
  ) {
    iconKey = "txt";
  } else if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("gzip") ||
    mimeType.includes("tar")
  ) {
    iconKey = "zip";
  }

  return {
    success: true,
    thumbnailUrl: DOCUMENT_ICONS[iconKey] || DOCUMENT_ICONS.default,
    width: 48,
    height: 48,
  };
}

/**
 * Get a placeholder thumbnail for audio files
 */
export function getAudioThumbnail(): ThumbnailResult {
  return {
    success: true,
    thumbnailUrl: DOCUMENT_ICONS.audio,
    width: 48,
    height: 48,
  };
}

// ============================================================================
// Main Thumbnail Generator
// ============================================================================

/**
 * Generate thumbnail for any supported file type
 */
export async function generateThumbnail(
  file: File | Blob,
  options: ThumbnailOptions & { seekTime?: number } = {},
): Promise<ThumbnailResult> {
  const mimeType = file instanceof File ? file.type : "";
  const fileName = file instanceof File ? file.name : "";
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const mediaType: MediaType = getMediaTypeFromMime(mimeType);

  switch (mediaType) {
    case "image":
      return generateImageThumbnail(file, options);

    case "video":
      return generateVideoThumbnailWithOptions(file, options);

    case "audio":
      return getAudioThumbnail();

    case "document":
    case "archive":
      return getDocumentThumbnail(mimeType, extension);

    default:
      return getDocumentThumbnail(mimeType, extension);
  }
}

/**
 * Generate multiple thumbnails in batch
 */
export async function generateThumbnailBatch(
  files: (File | Blob)[],
  options: ThumbnailOptions = {},
  concurrency: number = 3,
): Promise<ThumbnailResult[]> {
  const results: ThumbnailResult[] = [];
  const queue = [...files];
  const inProgress: Promise<void>[] = [];

  while (queue.length > 0 || inProgress.length > 0) {
    while (inProgress.length < concurrency && queue.length > 0) {
      const file = queue.shift()!;
      const promise = generateThumbnail(file, options).then((result) => {
        results.push(result);
      });
      inProgress.push(
        promise.then(() => {
          const index = inProgress.indexOf(promise);
          if (index > -1) inProgress.splice(index, 1);
        }),
      );
    }

    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a data URL from a blob
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert data URL to blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeThumbnailUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Create a canvas with rounded corners
 */
export function createRoundedThumbnail(
  imageUrl: string,
  size: number,
  borderRadius: number = 8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      // Create rounded rectangle clip path
      ctx.beginPath();
      ctx.moveTo(borderRadius, 0);
      ctx.lineTo(size - borderRadius, 0);
      ctx.quadraticCurveTo(size, 0, size, borderRadius);
      ctx.lineTo(size, size - borderRadius);
      ctx.quadraticCurveTo(size, size, size - borderRadius, size);
      ctx.lineTo(borderRadius, size);
      ctx.quadraticCurveTo(0, size, 0, size - borderRadius);
      ctx.lineTo(0, borderRadius);
      ctx.quadraticCurveTo(0, 0, borderRadius, 0);
      ctx.closePath();
      ctx.clip();

      // Draw image
      ctx.drawImage(img, 0, 0, size, size);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}
