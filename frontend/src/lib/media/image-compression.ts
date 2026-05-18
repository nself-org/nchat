/**
 * Image Compression Library
 * Provides aggressive image compression (70-90% size reduction) for uploads
 */

import {
  loadImage,
  canvasToBlob,
  imageToCanvas,
  detectFormat,
  type ImageFormat,
} from "./image-processor";

// ============================================================================
// Types
// ============================================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number;
  format?: ImageFormat;
  preserveAspectRatio?: boolean;
  stripMetadata?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  width: number;
  height: number;
  format: ImageFormat;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.7;
const MIN_QUALITY = 0.1;
const QUALITY_STEP = 0.05;
const MAX_ITERATIONS = 10;

// Compression presets
export const COMPRESSION_PRESETS = {
  high: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
  },
  medium: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.7,
  },
  low: {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.5,
  },
  thumbnail: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.6,
  },
  aggressive: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.4,
  },
} as const;

// ============================================================================
// Main Compression Functions
// ============================================================================

/**
 * Compress image with automatic quality adjustment to meet target size
 */
export async function compressImage(
  source: File | Blob,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    targetSizeKB,
    format: targetFormat,
    preserveAspectRatio = true,
    stripMetadata = true,
  } = options;

  const originalSize = source.size;
  const sourceFormat = source instanceof File ? detectFormat(source) : "jpeg";
  const format =
    targetFormat || (sourceFormat === "png" ? "jpeg" : sourceFormat);

  // Load image
  const img = await loadImage(source);

  // Calculate target dimensions
  const { width, height } = calculateTargetDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight,
    preserveAspectRatio,
  );

  // Create canvas with resized image
  const canvas = imageToCanvas(img, width, height);

  // Initial compression
  let compressed = await canvasToBlob(canvas, format, quality);

  // If target size specified, iteratively adjust quality
  if (targetSizeKB) {
    compressed = await compressToTargetSize(
      canvas,
      format,
      targetSizeKB * 1024,
      quality,
    );
  }

  const reductionPercent =
    ((originalSize - compressed.size) / originalSize) * 100;

  return {
    blob: compressed,
    originalSize,
    compressedSize: compressed.size,
    reductionPercent,
    width,
    height,
    format,
  };
}

/**
 * Compress image to specific target file size (in bytes)
 */
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  targetSizeBytes: number,
  initialQuality: number,
): Promise<Blob> {
  let quality = initialQuality;
  let bestBlob: Blob | null = null;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const blob = await canvasToBlob(canvas, format, quality);

    // If we're within 10% of target size, accept it
    const sizeDiff = Math.abs(blob.size - targetSizeBytes);
    if (sizeDiff / targetSizeBytes < 0.1) {
      return blob;
    }

    // Store best result so far
    if (
      !bestBlob ||
      Math.abs(blob.size - targetSizeBytes) <
        Math.abs(bestBlob.size - targetSizeBytes)
    ) {
      bestBlob = blob;
    }

    // If too large, decrease quality
    if (blob.size > targetSizeBytes) {
      quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    } else {
      // Close enough
      return blob;
    }

    iterations++;

    // If quality is too low, give up
    if (quality <= MIN_QUALITY) {
      break;
    }
  }

  return bestBlob || (await canvasToBlob(canvas, format, MIN_QUALITY));
}

/**
 * Aggressive compression (70-90% reduction) - suitable for chat uploads
 */
export async function aggressiveCompress(
  source: File | Blob,
  options: Partial<CompressionOptions> = {},
): Promise<CompressionResult> {
  return compressImage(source, {
    ...COMPRESSION_PRESETS.aggressive,
    ...options,
  });
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  sources: (File | Blob)[],
  options: CompressionOptions = {},
): Promise<CompressionResult[]> {
  return Promise.all(sources.map((source) => compressImage(source, options)));
}

/**
 * Compress image with progress callback
 */
export async function compressImageWithProgress(
  source: File | Blob,
  options: CompressionOptions,
  onProgress?: (percent: number) => void,
): Promise<CompressionResult> {
  onProgress?.(0);

  const originalSize = source.size;
  onProgress?.(25);

  const img = await loadImage(source);
  onProgress?.(50);

  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    format = "jpeg",
  } = options;

  const { width, height } = calculateTargetDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight,
    true,
  );

  onProgress?.(75);

  const canvas = imageToCanvas(img, width, height);
  const compressed = await canvasToBlob(canvas, format, quality);

  onProgress?.(100);

  const reductionPercent =
    ((originalSize - compressed.size) / originalSize) * 100;

  return {
    blob: compressed,
    originalSize,
    compressedSize: compressed.size,
    reductionPercent,
    width,
    height,
    format,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate target dimensions while preserving aspect ratio
 */
function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  preserveAspectRatio: boolean,
): { width: number; height: number } {
  if (!preserveAspectRatio) {
    return { width: maxWidth, height: maxHeight };
  }

  // If image is smaller than max, don't upscale
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width, height };
}

/**
 * Estimate compressed size without actually compressing
 */
export function estimateCompressedSize(
  originalSize: number,
  originalWidth: number,
  originalHeight: number,
  options: CompressionOptions,
): number {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  // Calculate resize factor
  const widthFactor = maxWidth / originalWidth;
  const heightFactor = maxHeight / originalHeight;
  const resizeFactor = Math.min(widthFactor, heightFactor, 1);

  // Size reduction from resizing (proportional to pixel count reduction)
  const pixelReduction = resizeFactor * resizeFactor;

  // Size reduction from quality
  const qualityReduction = quality;

  // Combined reduction (this is an approximation)
  const estimatedSize = originalSize * pixelReduction * qualityReduction;

  return Math.round(estimatedSize);
}

/**
 * Check if image needs compression
 */
export function needsCompression(file: File, maxSizeKB: number = 500): boolean {
  return file.size > maxSizeKB * 1024;
}

/**
 * Get compression ratio as human-readable string
 */
export function getCompressionRatioText(reductionPercent: number): string {
  if (reductionPercent >= 90) return "Excellent (90%+)";
  if (reductionPercent >= 70) return "Good (70-90%)";
  if (reductionPercent >= 50) return "Moderate (50-70%)";
  if (reductionPercent >= 30) return "Slight (30-50%)";
  return "Minimal (<30%)";
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Batch compress with concurrency limit
 */
export async function batchCompress(
  sources: (File | Blob)[],
  options: CompressionOptions = {},
  concurrency: number = 3,
  onProgress?: (completed: number, total: number) => void,
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  const queue = [...sources];
  let completed = 0;

  const processNext = async (): Promise<void> => {
    const source = queue.shift();
    if (!source) return;

    const result = await compressImage(source, options);
    results.push(result);
    completed++;
    onProgress?.(completed, sources.length);

    if (queue.length > 0) {
      await processNext();
    }
  };

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, sources.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);

  return results;
}

/**
 * Create thumbnail with aggressive compression
 */
export async function createCompressedThumbnail(
  source: File | Blob,
  size: number = 200,
): Promise<Blob> {
  const result = await compressImage(source, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.6,
    format: "jpeg",
  });

  return result.blob;
}

/**
 * Convert image to WebP format (best compression)
 */
export async function convertToWebP(
  source: File | Blob,
  quality: number = 0.8,
): Promise<CompressionResult> {
  return compressImage(source, {
    format: "webp",
    quality,
    maxWidth: 2048,
    maxHeight: 2048,
  });
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

/**
 * Get optimal format for compression
 */
export function getOptimalFormat(sourceFormat: ImageFormat): ImageFormat {
  // Use WebP if supported
  if (supportsWebP()) {
    return "webp";
  }

  // PNG to JPEG for better compression (unless transparency is needed)
  if (sourceFormat === "png") {
    return "jpeg";
  }

  return sourceFormat;
}

/**
 * Smart compress - automatically chooses best settings
 */
export async function smartCompress(
  source: File | Blob,
  targetContext: "chat" | "profile" | "attachment" = "chat",
): Promise<CompressionResult> {
  const presetMap = {
    chat: COMPRESSION_PRESETS.aggressive,
    profile: COMPRESSION_PRESETS.medium,
    attachment: COMPRESSION_PRESETS.high,
  };

  const preset = presetMap[targetContext];
  const sourceFormat = source instanceof File ? detectFormat(source) : "jpeg";
  const format = getOptimalFormat(sourceFormat);

  return compressImage(source, {
    ...preset,
    format,
  });
}
