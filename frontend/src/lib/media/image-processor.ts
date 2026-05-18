/**
 * Image Processor - Comprehensive image processing utilities
 *
 * Handles image resizing, thumbnail generation, EXIF extraction,
 * format detection, and optimization.
 */

// ============================================================================
// Types
// ============================================================================

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageFormat;
  preserveAspectRatio?: boolean;
  fit?: "contain" | "cover" | "fill";
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
}

export interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  orientation?: number;
  flash?: boolean;
  exposureMode?: string;
  whiteBalance?: string;
  colorSpace?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  format: ImageFormat;
  hasAlpha: boolean;
  colorDepth?: number;
  exif?: ExifData;
  fileSize?: number;
}

export type ImageFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "bmp"
  | "svg"
  | "unknown";

export interface OptimizationResult {
  blob: Blob;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_JPEG_QUALITY = 0.85;
export const DEFAULT_WEBP_QUALITY = 0.8;
export const DEFAULT_PNG_QUALITY = 1.0;
export const DEFAULT_THUMBNAIL_SIZE = 200;
export const MAX_CANVAS_SIZE = 4096;

export const IMAGE_MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  unknown: "application/octet-stream",
};

export const MIME_TO_FORMAT: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

// ============================================================================
// Format Detection
// ============================================================================

/**
 * Detect image format from MIME type
 */
export function detectFormatFromMime(mimeType: string): ImageFormat {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  return MIME_TO_FORMAT[normalized] || "unknown";
}

/**
 * Detect image format from file extension
 */
export function detectFormatFromExtension(filename: string): ImageFormat {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const extensionMap: Record<string, ImageFormat> = {
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    webp: "webp",
    gif: "gif",
    bmp: "bmp",
    svg: "svg",
  };
  return extensionMap[ext] || "unknown";
}

/**
 * Detect image format from file (uses MIME type first, then extension)
 */
export function detectFormat(file: File): ImageFormat {
  const fromMime = detectFormatFromMime(file.type);
  if (fromMime !== "unknown") return fromMime;
  return detectFormatFromExtension(file.name);
}

/**
 * Get MIME type for image format
 */
export function getMimeType(format: ImageFormat): string {
  return IMAGE_MIME_TYPES[format] || IMAGE_MIME_TYPES.unknown;
}

/**
 * Check if format supports transparency
 */
export function supportsTransparency(format: ImageFormat): boolean {
  return (
    format === "png" ||
    format === "webp" ||
    format === "gif" ||
    format === "svg"
  );
}

/**
 * Check if format supports animation
 */
export function supportsAnimation(format: ImageFormat): boolean {
  return format === "gif" || format === "webp";
}

// ============================================================================
// Image Loading
// ============================================================================

/**
 * Load an image from a File or Blob
 */
export function loadImage(
  source: File | Blob | string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isUrl = typeof source === "string";

    img.onload = () => {
      if (!isUrl) {
        URL.revokeObjectURL(img.src);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error("Failed to load image"));
    };

    if (isUrl) {
      img.crossOrigin = "anonymous";
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get image dimensions without fully loading the image
 */
export function getImageDimensions(
  source: File | Blob | string,
): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isUrl = typeof source === "string";

    img.onload = () => {
      if (!isUrl) {
        URL.revokeObjectURL(img.src);
      }
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };

    img.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error("Failed to get image dimensions"));
    };

    if (isUrl) {
      img.crossOrigin = "anonymous";
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

// ============================================================================
// Dimension Calculations
// ============================================================================

/**
 * Calculate scaled dimensions while preserving aspect ratio
 */
export function calculateScaledDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  fit: "contain" | "cover" | "fill" = "contain",
): { width: number; height: number } {
  if (fit === "fill") {
    return { width: maxWidth, height: maxHeight };
  }

  const originalRatio = originalWidth / originalHeight;
  const targetRatio = maxWidth / maxHeight;

  let width: number;
  let height: number;

  if (fit === "contain") {
    if (originalRatio > targetRatio) {
      width = Math.min(originalWidth, maxWidth);
      height = Math.round(width / originalRatio);
    } else {
      height = Math.min(originalHeight, maxHeight);
      width = Math.round(height * originalRatio);
    }
  } else {
    // cover
    if (originalRatio > targetRatio) {
      height = Math.min(originalHeight, maxHeight);
      width = Math.round(height * originalRatio);
    } else {
      width = Math.min(originalWidth, maxWidth);
      height = Math.round(width / originalRatio);
    }
  }

  return { width, height };
}

/**
 * Calculate thumbnail dimensions
 */
export function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  thumbnailSize: number = DEFAULT_THUMBNAIL_SIZE,
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  if (originalWidth <= thumbnailSize && originalHeight <= thumbnailSize) {
    return { width: originalWidth, height: originalHeight };
  }

  if (aspectRatio >= 1) {
    return {
      width: thumbnailSize,
      height: Math.round(thumbnailSize / aspectRatio),
    };
  }

  return {
    width: Math.round(thumbnailSize * aspectRatio),
    height: thumbnailSize,
  };
}

// ============================================================================
// Canvas Operations
// ============================================================================

/**
 * Create a canvas with an image drawn to it
 */
export function imageToCanvas(
  img: HTMLImageElement,
  width?: number,
  height?: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const targetWidth = width || img.naturalWidth;
  const targetHeight = height || img.naturalHeight;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Convert canvas to Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat = "jpeg",
  quality: number = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = getMimeType(format);
    const qualityValue = format === "png" ? undefined : quality;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      mimeType,
      qualityValue,
    );
  });
}

/**
 * Convert canvas to data URL
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: ImageFormat = "jpeg",
  quality: number = DEFAULT_JPEG_QUALITY,
): string {
  const mimeType = getMimeType(format);
  const qualityValue = format === "png" ? undefined : quality;
  return canvas.toDataURL(mimeType, qualityValue);
}

// ============================================================================
// Image Resizing
// ============================================================================

/**
 * Resize an image
 */
export async function resizeImage(
  source: File | Blob,
  options: ResizeOptions = {},
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = DEFAULT_JPEG_QUALITY,
    format = "jpeg",
    preserveAspectRatio = true,
    fit = "contain",
  } = options;

  const img = await loadImage(source);

  const { width, height } = preserveAspectRatio
    ? calculateScaledDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight,
        fit,
      )
    : { width: maxWidth, height: maxHeight };

  const canvas = imageToCanvas(img, width, height);
  return canvasToBlob(canvas, format, quality);
}

/**
 * Generate a thumbnail from an image
 */
export async function generateThumbnail(
  source: File | Blob,
  options: ThumbnailOptions = {},
): Promise<Blob> {
  const {
    width: targetWidth,
    height: targetHeight,
    quality = 0.7,
    format = "jpeg",
  } = options;

  const img = await loadImage(source);
  const size = targetWidth || targetHeight || DEFAULT_THUMBNAIL_SIZE;

  const { width, height } = calculateThumbnailDimensions(
    img.naturalWidth,
    img.naturalHeight,
    size,
  );

  const canvas = imageToCanvas(img, width, height);
  return canvasToBlob(canvas, format, quality);
}

// ============================================================================
// Image Transformation
// ============================================================================

/**
 * Crop an image
 */
export async function cropImage(
  source: File | Blob,
  cropArea: CropArea,
  options: { format?: ImageFormat; quality?: number } = {},
): Promise<Blob> {
  const { format = "jpeg", quality = DEFAULT_JPEG_QUALITY } = options;

  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height,
  );

  return canvasToBlob(canvas, format, quality);
}

/**
 * Rotate an image
 */
export async function rotateImage(
  source: File | Blob,
  degrees: number,
  options: { format?: ImageFormat; quality?: number } = {},
): Promise<Blob> {
  const { format = "jpeg", quality = DEFAULT_JPEG_QUALITY } = options;

  const img = await loadImage(source);
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  const newWidth = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
  const newHeight = Math.round(
    img.naturalWidth * sin + img.naturalHeight * cos,
  );

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return canvasToBlob(canvas, format, quality);
}

/**
 * Flip an image horizontally or vertically
 */
export async function flipImage(
  source: File | Blob,
  direction: "horizontal" | "vertical",
  options: { format?: ImageFormat; quality?: number } = {},
): Promise<Blob> {
  const { format = "jpeg", quality = DEFAULT_JPEG_QUALITY } = options;

  const img = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas 2D context");
  }

  if (direction === "horizontal") {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }

  ctx.drawImage(img, 0, 0);

  return canvasToBlob(canvas, format, quality);
}

// ============================================================================
// Format Conversion
// ============================================================================

/**
 * Convert image to a different format
 */
export async function convertFormat(
  source: File | Blob,
  targetFormat: ImageFormat,
  quality: number = DEFAULT_JPEG_QUALITY,
): Promise<Blob> {
  const img = await loadImage(source);
  const canvas = imageToCanvas(img);
  return canvasToBlob(canvas, targetFormat, quality);
}

/**
 * Convert image to WebP format for optimization
 */
export async function convertToWebP(
  source: File | Blob,
  quality: number = DEFAULT_WEBP_QUALITY,
): Promise<Blob> {
  return convertFormat(source, "webp", quality);
}

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Optimize an image (resize + compress)
 */
export async function optimizeImage(
  source: File | Blob,
  options: ResizeOptions = {},
): Promise<OptimizationResult> {
  const originalSize = source.size;

  const blob = await resizeImage(source, {
    maxWidth: options.maxWidth || 1920,
    maxHeight: options.maxHeight || 1080,
    quality: options.quality || DEFAULT_JPEG_QUALITY,
    format: options.format || "jpeg",
    preserveAspectRatio: options.preserveAspectRatio !== false,
  });

  return {
    blob,
    originalSize,
    optimizedSize: blob.size,
    compressionRatio: blob.size / originalSize,
  };
}

/**
 * Compress an image without resizing
 */
export async function compressImage(
  source: File | Blob,
  quality: number = DEFAULT_JPEG_QUALITY,
  format: ImageFormat = "jpeg",
): Promise<Blob> {
  const img = await loadImage(source);
  const canvas = imageToCanvas(img);
  return canvasToBlob(canvas, format, quality);
}

// ============================================================================
// EXIF Extraction
// ============================================================================

/**
 * Extract EXIF data from image
 * Note: Full EXIF extraction requires a library like exif-js
 * This provides a basic implementation
 */
export async function extractExifData(
  source: File | Blob,
): Promise<ExifData | null> {
  try {
    const buffer = await source.arrayBuffer();
    const view = new DataView(buffer);

    // Check for JPEG magic number
    if (view.getUint16(0) !== 0xffd8) {
      return null; // Not a JPEG
    }

    // Find EXIF marker (0xFFE1)
    let offset = 2;
    while (offset < buffer.byteLength) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        // Found EXIF marker
        const length = view.getUint16(offset + 2);
        const exifStart = offset + 4;

        // Check for "Exif" signature
        if (
          view.getUint32(exifStart) === 0x45786966 && // "Exif"
          view.getUint16(exifStart + 4) === 0x0000
        ) {
          // Basic EXIF parsing - returns empty object for now
          // Full implementation would require parsing IFD tags
          return {};
        }
        break;
      }

      // Move to next marker
      if ((marker & 0xff00) !== 0xff00) {
        break;
      }

      const markerLength = view.getUint16(offset + 2);
      offset += 2 + markerLength;
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// Image Metadata
// ============================================================================

/**
 * Get comprehensive metadata for an image
 */
export async function getImageMetadata(file: File): Promise<ImageMetadata> {
  const dimensions = await getImageDimensions(file);
  const format = detectFormat(file);
  const exif = await extractExifData(file);

  return {
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: dimensions.aspectRatio,
    format,
    hasAlpha: supportsTransparency(format),
    exif: exif || undefined,
    fileSize: file.size,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if image needs resizing based on max dimensions
 */
export function needsResize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): boolean {
  return width > maxWidth || height > maxHeight;
}

/**
 * Calculate file size after potential compression
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number,
  format: ImageFormat,
): number {
  const baseRatio =
    format === "webp"
      ? 0.6
      : format === "jpeg"
        ? 0.7
        : format === "png"
          ? 0.95
          : 1.0;
  return Math.round(originalSize * baseRatio * quality);
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: ImageFormat[];
    maxDimensions?: { width: number; height: number };
  } = {},
): { valid: boolean; error?: string } {
  const { maxSize, allowedFormats, maxDimensions } = options;

  // Check file size
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check format
  if (allowedFormats) {
    const format = detectFormat(file);
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `File format '${format}' is not allowed. Allowed formats: ${allowedFormats.join(", ")}`,
      };
    }
  }

  // Note: maxDimensions check would require async operation
  // This is a sync validation only

  return { valid: true };
}

/**
 * Create a blob URL for an image
 */
export function createImageUrl(source: File | Blob): string {
  return URL.createObjectURL(source);
}

/**
 * Revoke a blob URL
 */
export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if a URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith("blob:");
}
