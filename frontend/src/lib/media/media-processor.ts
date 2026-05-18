/**
 * Media Processor - Process and optimize uploaded media files
 *
 * Handles image resizing, compression, format conversion, and optimization.
 */

import { MediaType, MediaMetadata } from "./media-types";
import { getMediaTypeFromMime } from "./media-manager";

// ============================================================================
// Types
// ============================================================================

export interface ProcessingOptions {
  // Image options
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "jpeg" | "png" | "webp";
  preserveAspectRatio?: boolean;

  // General options
  stripMetadata?: boolean;
  generatePreview?: boolean;
  previewWidth?: number;
  previewHeight?: number;
}

export interface ProcessingResult {
  success: boolean;
  processedFile?: File | Blob;
  previewFile?: Blob;
  metadata?: MediaMetadata;
  error?: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  aspectRatio: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_QUALITY = 0.85;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const DEFAULT_PREVIEW_SIZE = 400;

// ============================================================================
// Image Processing
// ============================================================================

/**
 * Load an image from a file
 */
export function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image dimensions without loading the full image
 */
export function getImageInfo(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to get image info"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while preserving aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  preserveAspectRatio: boolean = true,
): { width: number; height: number } {
  if (!preserveAspectRatio) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);

  // Don't upscale
  if (ratio >= 1) {
    return { width: originalWidth, height: originalHeight };
  }

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

/**
 * Resize an image
 */
export async function resizeImage(
  file: File | Blob,
  options: ProcessingOptions = {},
): Promise<Blob> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    format = "jpeg",
    preserveAspectRatio = true,
  } = options;

  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight,
    preserveAspectRatio,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Use better quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      `image/${format}`,
      quality,
    );
  });
}

/**
 * Compress an image without resizing
 */
export async function compressImage(
  file: File | Blob,
  quality: number = DEFAULT_QUALITY,
  format: "jpeg" | "png" | "webp" = "jpeg",
): Promise<Blob> {
  const img = await loadImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      `image/${format}`,
      quality,
    );
  });
}

/**
 * Convert image to different format
 */
export async function convertImageFormat(
  file: File | Blob,
  targetFormat: "jpeg" | "png" | "webp",
  quality: number = DEFAULT_QUALITY,
): Promise<Blob> {
  return compressImage(file, quality, targetFormat);
}

/**
 * Crop an image
 */
export async function cropImage(
  file: File | Blob,
  cropArea: { x: number; y: number; width: number; height: number },
  outputOptions: { format?: "jpeg" | "png" | "webp"; quality?: number } = {},
): Promise<Blob> {
  const img = await loadImage(file);
  const { format = "jpeg", quality = DEFAULT_QUALITY } = outputOptions;

  const canvas = document.createElement("canvas");
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      `image/${format}`,
      quality,
    );
  });
}

/**
 * Rotate an image
 */
export async function rotateImage(
  file: File | Blob,
  degrees: number,
  outputOptions: { format?: "jpeg" | "png" | "webp"; quality?: number } = {},
): Promise<Blob> {
  const img = await loadImage(file);
  const { format = "jpeg", quality = DEFAULT_QUALITY } = outputOptions;

  const radians = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  const newWidth = img.naturalWidth * cos + img.naturalHeight * sin;
  const newHeight = img.naturalWidth * sin + img.naturalHeight * cos;

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      `image/${format}`,
      quality,
    );
  });
}

// ============================================================================
// Video Processing
// ============================================================================

/**
 * Generate a video thumbnail from a specific time
 */
export function generateVideoThumbnail(
  videoFile: File | Blob,
  options: { time?: number; width?: number; height?: number } = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { time = 1, width, height } = options;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      const targetWidth = width || video.videoWidth;
      const targetHeight = height || video.videoHeight;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create thumbnail"));
          }
        },
        "image/jpeg",
        0.8,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video"));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Get video metadata
 */
export function getVideoInfo(
  videoFile: File | Blob,
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };

    video.src = URL.createObjectURL(videoFile);
  });
}

// ============================================================================
// Audio Processing
// ============================================================================

/**
 * Get audio metadata
 */
export function getAudioInfo(
  audioFile: File | Blob,
): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve({
        duration: audio.duration,
      });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error("Failed to load audio metadata"));
    };

    audio.src = URL.createObjectURL(audioFile);
  });
}

/**
 * Generate audio waveform data
 */
export async function generateAudioWaveform(
  audioFile: File | Blob,
  samples: number = 100,
): Promise<number[]> {
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioContext = new (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  )();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = blockSize * i;
      let sum = 0;

      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j]);
      }

      waveform.push(sum / blockSize);
    }

    // Normalize to 0-1
    const max = Math.max(...waveform);
    return waveform.map((v) => v / max);
  } finally {
    await audioContext.close();
  }
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Process a media file based on its type
 */
export async function processMedia(
  file: File,
  options: ProcessingOptions = {},
): Promise<ProcessingResult> {
  const mediaType: MediaType = getMediaTypeFromMime(file.type);

  try {
    switch (mediaType) {
      case "image":
        return await processImageFile(file, options);

      case "video":
        return await processVideoFile(file, options);

      case "audio":
        return await processAudioFile(file, options);

      default:
        // For documents and other files, just return metadata
        return {
          success: true,
          processedFile: file,
          metadata: {
            // Basic metadata for non-media files
          },
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

async function processImageFile(
  file: File,
  options: ProcessingOptions,
): Promise<ProcessingResult> {
  const imageInfo = await getImageInfo(file);

  // Resize if needed
  const needsResize =
    (options.maxWidth && imageInfo.width > options.maxWidth) ||
    (options.maxHeight && imageInfo.height > options.maxHeight);

  let processedFile: Blob | File = file;
  if (needsResize) {
    processedFile = await resizeImage(file, options);
  }

  // Generate preview
  let previewFile: Blob | undefined;
  if (options.generatePreview) {
    previewFile = await resizeImage(file, {
      maxWidth: options.previewWidth || DEFAULT_PREVIEW_SIZE,
      maxHeight: options.previewHeight || DEFAULT_PREVIEW_SIZE,
      quality: 0.7,
    });
  }

  return {
    success: true,
    processedFile,
    previewFile,
    metadata: {
      dimensions: {
        width: imageInfo.width,
        height: imageInfo.height,
      },
    },
  };
}

async function processVideoFile(
  file: File,
  options: ProcessingOptions,
): Promise<ProcessingResult> {
  const videoInfo = await getVideoInfo(file);

  // Generate preview thumbnail
  let previewFile: Blob | undefined;
  if (options.generatePreview !== false) {
    previewFile = await generateVideoThumbnail(file, {
      time: Math.min(1, videoInfo.duration / 2),
      width: options.previewWidth,
      height: options.previewHeight,
    });
  }

  return {
    success: true,
    processedFile: file,
    previewFile,
    metadata: {
      dimensions: {
        width: videoInfo.width,
        height: videoInfo.height,
      },
      duration: videoInfo.duration,
    },
  };
}

async function processAudioFile(
  file: File,
  _options: ProcessingOptions,
): Promise<ProcessingResult> {
  const audioInfo = await getAudioInfo(file);

  return {
    success: true,
    processedFile: file,
    metadata: {
      duration: audioInfo.duration,
    },
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process multiple files in parallel with a concurrency limit
 */
export async function processMediaBatch(
  files: File[],
  options: ProcessingOptions = {},
  concurrency: number = 3,
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];
  const queue = [...files];
  const inProgress: Promise<void>[] = [];

  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (inProgress.length < concurrency && queue.length > 0) {
      const file = queue.shift()!;
      const promise = processMedia(file, options).then((result) => {
        results.push(result);
      });
      inProgress.push(
        promise.then(() => {
          const index = inProgress.indexOf(promise);
          if (index > -1) inProgress.splice(index, 1);
        }),
      );
    }

    // Wait for at least one to complete
    if (inProgress.length > 0) {
      await Promise.race(inProgress);
    }
  }

  return results;
}
