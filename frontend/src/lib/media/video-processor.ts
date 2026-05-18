/**
 * Video Processor - Comprehensive video processing utilities
 *
 * Handles video thumbnail extraction, metadata retrieval, duration calculation,
 * preview generation, and format detection.
 */

// ============================================================================
// Types
// ============================================================================

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  aspectRatio: number;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  hasAudio?: boolean;
}

export interface ThumbnailOptions {
  time?: number;
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export interface PreviewOptions {
  frameCount?: number;
  interval?: number;
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export interface VideoFrame {
  time: number;
  blob: Blob;
  dataUrl?: string;
}

export type VideoFormat =
  | "mp4"
  | "webm"
  | "ogg"
  | "quicktime"
  | "avi"
  | "mkv"
  | "unknown";

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_THUMBNAIL_TIME = 1;
export const DEFAULT_THUMBNAIL_QUALITY = 0.8;
export const DEFAULT_PREVIEW_FRAMES = 5;
export const DEFAULT_PREVIEW_INTERVAL = 2;
export const MAX_VIDEO_DURATION = 3600; // 1 hour
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

export const VIDEO_MIME_TYPES: Record<VideoFormat, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  quicktime: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  unknown: "application/octet-stream",
};

export const MIME_TO_VIDEO_FORMAT: Record<string, VideoFormat> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogg",
  "video/quicktime": "quicktime",
  "video/x-msvideo": "avi",
  "video/avi": "avi",
  "video/x-matroska": "mkv",
  "video/mkv": "mkv",
  "video/mpeg": "mp4",
};

export const SUPPORTED_VIDEO_FORMATS: VideoFormat[] = [
  "mp4",
  "webm",
  "ogg",
  "quicktime",
];

// ============================================================================
// Format Detection
// ============================================================================

/**
 * Detect video format from MIME type
 */
export function detectFormatFromMime(mimeType: string): VideoFormat {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  return MIME_TO_VIDEO_FORMAT[normalized] || "unknown";
}

/**
 * Detect video format from file extension
 */
export function detectFormatFromExtension(filename: string): VideoFormat {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const extensionMap: Record<string, VideoFormat> = {
    mp4: "mp4",
    m4v: "mp4",
    webm: "webm",
    ogg: "ogg",
    ogv: "ogg",
    mov: "quicktime",
    avi: "avi",
    mkv: "mkv",
  };
  return extensionMap[ext] || "unknown";
}

/**
 * Detect video format from file
 */
export function detectFormat(file: File): VideoFormat {
  const fromMime = detectFormatFromMime(file.type);
  if (fromMime !== "unknown") return fromMime;
  return detectFormatFromExtension(file.name);
}

/**
 * Get MIME type for video format
 */
export function getMimeType(format: VideoFormat): string {
  return VIDEO_MIME_TYPES[format] || VIDEO_MIME_TYPES.unknown;
}

/**
 * Check if format is supported for playback in browser
 */
export function isFormatSupported(format: VideoFormat): boolean {
  return SUPPORTED_VIDEO_FORMATS.includes(format);
}

/**
 * Check if file is a video based on MIME type
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("video/");
}

// ============================================================================
// Video Loading
// ============================================================================

/**
 * Load a video element from a File, Blob, or URL
 */
export function loadVideo(
  source: File | Blob | string,
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const isUrl = typeof source === "string";

    video.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      resolve(video);
    };

    video.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error("Failed to load video"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Create a video element that persists (doesn't auto-revoke URL)
 */
export function createVideoElement(
  source: File | Blob | string,
): HTMLVideoElement {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;

  if (typeof source === "string") {
    video.crossOrigin = "anonymous";
    video.src = source;
  } else {
    video.src = URL.createObjectURL(source);
  }

  return video;
}

// ============================================================================
// Video Metadata
// ============================================================================

/**
 * Get video metadata (dimensions, duration, etc.)
 */
export function getVideoMetadata(
  source: File | Blob | string,
): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const isUrl = typeof source === "string";

    video.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        aspectRatio: video.videoWidth / video.videoHeight,
        hasAudio: hasAudioTrack(video),
      });
    };

    video.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error("Failed to load video metadata"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get video duration
 */
export function getVideoDuration(
  source: File | Blob | string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const isUrl = typeof source === "string";

    video.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      resolve(video.duration);
    };

    video.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error("Failed to get video duration"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get video dimensions
 */
export function getVideoDimensions(
  source: File | Blob | string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const isUrl = typeof source === "string";

    video.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
      reject(new Error("Failed to get video dimensions"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Check if video has audio track
 */
function hasAudioTrack(video: HTMLVideoElement): boolean {
  // Check via media capabilities if available
  if ("mozHasAudio" in video) {
    return (video as HTMLVideoElement & { mozHasAudio: boolean }).mozHasAudio;
  }
  if ("webkitAudioDecodedByteCount" in video) {
    return (
      (video as HTMLVideoElement & { webkitAudioDecodedByteCount: number })
        .webkitAudioDecodedByteCount > 0
    );
  }
  // Default assumption
  return true;
}

// ============================================================================
// Thumbnail Generation
// ============================================================================

/**
 * Generate a thumbnail from video at specific time
 */
export function generateThumbnail(
  source: File | Blob | string,
  options: ThumbnailOptions = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const {
      time = DEFAULT_THUMBNAIL_TIME,
      width,
      height,
      quality = DEFAULT_THUMBNAIL_QUALITY,
      format = "jpeg",
    } = options;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const isUrl = typeof source === "string";

    const cleanup = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onloadedmetadata = () => {
      // Clamp time to video duration
      video.currentTime = Math.min(time, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
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
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          `image/${format}`,
          quality,
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Generate thumbnail at percentage of video duration
 */
export function generateThumbnailAtPercentage(
  source: File | Blob | string,
  percentage: number,
  options: Omit<ThumbnailOptions, "time"> = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    getVideoDuration(source)
      .then((duration) => {
        const time = (percentage / 100) * duration;
        return generateThumbnail(source, { ...options, time });
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Generate thumbnail as data URL
 */
export async function generateThumbnailDataUrl(
  source: File | Blob | string,
  options: ThumbnailOptions = {},
): Promise<string> {
  const blob = await generateThumbnail(source, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Failed to convert thumbnail to data URL"));
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// Video Preview Generation
// ============================================================================

/**
 * Generate multiple frames for video preview
 */
export async function generatePreviewFrames(
  source: File | Blob | string,
  options: PreviewOptions = {},
): Promise<VideoFrame[]> {
  const {
    frameCount = DEFAULT_PREVIEW_FRAMES,
    interval,
    width,
    height,
    quality = DEFAULT_THUMBNAIL_QUALITY,
    format = "jpeg",
  } = options;

  const metadata = await getVideoMetadata(source);
  const frames: VideoFrame[] = [];

  // Calculate frame times
  const frameInterval = interval || metadata.duration / (frameCount + 1);
  const times: number[] = [];

  for (let i = 1; i <= frameCount; i++) {
    const time = Math.min(i * frameInterval, metadata.duration - 0.1);
    times.push(time);
  }

  // Generate frames sequentially
  for (const time of times) {
    try {
      const blob = await generateThumbnail(source, {
        time,
        width,
        height,
        quality,
        format,
      });
      frames.push({ time, blob });
    } catch {
      // Skip failed frames
    }
  }

  return frames;
}

/**
 * Generate animated preview GIF-like frames as data URLs
 */
export async function generateAnimatedPreview(
  source: File | Blob | string,
  options: PreviewOptions = {},
): Promise<string[]> {
  const frames = await generatePreviewFrames(source, options);
  const dataUrls: string[] = [];

  for (const frame of frames) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to convert frame"));
      reader.readAsDataURL(frame.blob);
    });
    dataUrls.push(dataUrl);
  }

  return dataUrls;
}

// ============================================================================
// Video Validation
// ============================================================================

/**
 * Validate video file
 */
export async function validateVideo(
  file: File,
  options: {
    maxSize?: number;
    maxDuration?: number;
    allowedFormats?: VideoFormat[];
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {},
): Promise<VideoValidationResult> {
  const {
    maxSize = MAX_VIDEO_SIZE,
    maxDuration = MAX_VIDEO_DURATION,
    allowedFormats,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Video size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check format
  if (allowedFormats) {
    const format = detectFormat(file);
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `Video format '${format}' is not allowed`,
      };
    }
  }

  // Check duration and dimensions
  try {
    const metadata = await getVideoMetadata(file);

    if (metadata.duration > maxDuration) {
      return {
        valid: false,
        error: `Video duration exceeds maximum of ${Math.round(maxDuration / 60)} minutes`,
      };
    }

    if (minWidth && metadata.width < minWidth) {
      return {
        valid: false,
        error: `Video width must be at least ${minWidth}px`,
      };
    }

    if (minHeight && metadata.height < minHeight) {
      return {
        valid: false,
        error: `Video height must be at least ${minHeight}px`,
      };
    }

    if (maxWidth && metadata.width > maxWidth) {
      return {
        valid: false,
        error: `Video width must not exceed ${maxWidth}px`,
      };
    }

    if (maxHeight && metadata.height > maxHeight) {
      return {
        valid: false,
        error: `Video height must not exceed ${maxHeight}px`,
      };
    }
  } catch {
    return {
      valid: false,
      error: "Failed to read video metadata",
    };
  }

  return { valid: true };
}

/**
 * Quick validation (size and format only, no async)
 */
export function validateVideoSync(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: VideoFormat[];
  } = {},
): VideoValidationResult {
  const { maxSize = MAX_VIDEO_SIZE, allowedFormats } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Video size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  if (allowedFormats) {
    const format = detectFormat(file);
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `Video format '${format}' is not allowed`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(durationStr: string): number {
  const parts = durationStr.split(":").map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] || 0;
}

/**
 * Calculate video size estimate based on bitrate
 */
export function estimateFileSize(
  durationSeconds: number,
  bitrateKbps: number,
): number {
  return (durationSeconds * bitrateKbps * 1024) / 8;
}

/**
 * Calculate recommended bitrate based on resolution
 */
export function getRecommendedBitrate(width: number, height: number): number {
  const pixels = width * height;

  if (pixels >= 3840 * 2160) return 35000; // 4K
  if (pixels >= 1920 * 1080) return 8000; // 1080p
  if (pixels >= 1280 * 720) return 5000; // 720p
  if (pixels >= 854 * 480) return 2500; // 480p
  return 1000; // Lower resolutions
}

/**
 * Create a video URL for playback
 */
export function createVideoUrl(source: File | Blob): string {
  return URL.createObjectURL(source);
}

/**
 * Revoke a video URL
 */
export function revokeVideoUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if browser can play video format
 */
export function canPlayFormat(format: VideoFormat): boolean {
  const video = document.createElement("video");
  const mimeType = getMimeType(format);
  const canPlay = video.canPlayType(mimeType);
  return canPlay === "probably" || canPlay === "maybe";
}

/**
 * Get supported video formats for current browser
 */
export function getSupportedFormats(): VideoFormat[] {
  return Object.keys(VIDEO_MIME_TYPES)
    .filter((format) => format !== "unknown")
    .filter((format) => canPlayFormat(format as VideoFormat)) as VideoFormat[];
}

/**
 * Extract frame at specific time as ImageData
 */
export async function extractFrameImageData(
  source: File | Blob | string,
  time: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const isUrl = typeof source === "string";

    const cleanup = () => {
      if (!isUrl) {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        cleanup();
        resolve(imageData);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to extract frame"));
    };

    if (isUrl) {
      video.crossOrigin = "anonymous";
      video.src = source;
    } else {
      video.src = URL.createObjectURL(source);
    }
  });
}
