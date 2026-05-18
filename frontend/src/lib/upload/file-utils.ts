/**
 * File Utilities - Helper functions for file handling in nself-chat
 *
 * Provides utilities for file type detection, formatting, validation,
 * thumbnail generation, and dimension extraction.
 */

import { FileType } from "@/stores/attachment-store";

// ============================================================================
// Constants
// ============================================================================

export const FILE_ICONS: Record<string, string> = {
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",

  // Videos
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",

  // Audio
  "audio/mpeg": "music",
  "audio/wav": "music",
  "audio/ogg": "music",
  "audio/webm": "music",
  "audio/flac": "music",
  "audio/aac": "music",

  // Documents
  "application/pdf": "file-text",
  "application/msword": "file-text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "file-text",
  "text/plain": "file-text",
  "text/markdown": "file-text",
  "text/html": "file-code",
  "text/css": "file-code",
  "text/javascript": "file-code",
  "application/json": "file-code",
  "application/xml": "file-code",

  // Spreadsheets
  "application/vnd.ms-excel": "table",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "table",
  "text/csv": "table",

  // Presentations
  "application/vnd.ms-powerpoint": "presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "presentation",

  // Archives
  "application/zip": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-7z-compressed": "archive",
  "application/gzip": "archive",
  "application/x-tar": "archive",

  // Default
  default: "file",
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  archive: "Archive",
  other: "File",
};

export const PREVIEWABLE_TYPES: FileType[] = ["image", "video", "audio"];

export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "tiff",
];
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "mkv", "ogv"];
export const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
  "wma",
];
export const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "md",
  "rtf",
  "odt",
];
export const SPREADSHEET_EXTENSIONS = ["xls", "xlsx", "csv", "ods"];
export const PRESENTATION_EXTENSIONS = ["ppt", "pptx", "odp"];
export const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "gz", "tar", "bz2"];

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get the file type category from a MIME type
 */
export function getFileTypeFromMime(mimeType: string): FileType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("gzip") ||
    mimeType.includes("tar")
  ) {
    return "archive";
  }

  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation") ||
    mimeType.startsWith("text/")
  ) {
    return "document";
  }

  return "other";
}

/**
 * Get the file type from a file extension
 */
export function getFileTypeFromExtension(extension: string): FileType {
  const ext = extension.toLowerCase().replace(".", "");

  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio";
  if (
    DOCUMENT_EXTENSIONS.includes(ext) ||
    SPREADSHEET_EXTENSIONS.includes(ext) ||
    PRESENTATION_EXTENSIONS.includes(ext)
  ) {
    return "document";
  }
  if (ARCHIVE_EXTENSIONS.includes(ext)) return "archive";

  return "other";
}

/**
 * Get the file type from a File object
 */
export function getFileType(file: File): FileType {
  // Try MIME type first
  if (file.type) {
    const typeFromMime = getFileTypeFromMime(file.type);
    if (typeFromMime !== "other") return typeFromMime;
  }

  // Fall back to extension
  const extension = getFileExtension(file.name);
  return getFileTypeFromExtension(extension);
}

// ============================================================================
// File Extension & Name Utilities
// ============================================================================

/**
 * Get the file extension from a filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Get the filename without extension
 */
export function getFileBaseName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

/**
 * Truncate a filename to a maximum length
 */
export function truncateFileName(
  fileName: string,
  maxLength: number = 30,
): string {
  if (fileName.length <= maxLength) return fileName;

  const extension = getFileExtension(fileName);
  const baseName = getFileBaseName(fileName);
  const availableLength = maxLength - extension.length - 4; // 4 for "..." and "."

  if (availableLength <= 0) {
    return fileName.substring(0, maxLength - 3) + "...";
  }

  return `${baseName.substring(0, availableLength)}...${extension ? "." + extension : ""}`;
}

/**
 * Sanitize a filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ============================================================================
// File Size Formatting
// ============================================================================

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Parse a file size string to bytes
 */
export function parseFileSize(sizeString: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase();

  return Math.round(value * (units[unit] || 1));
}

// ============================================================================
// File Icon Utilities
// ============================================================================

/**
 * Get the icon name for a file based on its MIME type
 */
export function getFileIcon(mimeType: string): string {
  return FILE_ICONS[mimeType] || FILE_ICONS.default;
}

/**
 * Get the icon name for a file type category
 */
export function getFileTypeIcon(fileType: FileType): string {
  switch (fileType) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "music";
    case "document":
      return "file-text";
    case "archive":
      return "archive";
    default:
      return "file";
  }
}

/**
 * Get the color class for a file type
 */
export function getFileTypeColor(fileType: FileType): string {
  switch (fileType) {
    case "image":
      return "text-blue-500";
    case "video":
      return "text-purple-500";
    case "audio":
      return "text-green-500";
    case "document":
      return "text-orange-500";
    case "archive":
      return "text-yellow-500";
    default:
      return "text-gray-500";
  }
}

// ============================================================================
// File Validation
// ============================================================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  minSize?: number;
}

/**
 * Validate a file against specified constraints
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {},
): FileValidationResult {
  const { maxSize, allowedTypes, allowedExtensions, minSize } = options;

  // Check minimum size
  if (minSize !== undefined && file.size < minSize) {
    return {
      valid: false,
      error: `File is too small. Minimum size is ${formatFileSize(minSize)}.`,
    };
  }

  // Check maximum size
  if (maxSize !== undefined && file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${formatFileSize(maxSize)}.`,
    };
  }

  // Check allowed MIME types
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const prefix = type.slice(0, -1);
        return file.type.startsWith(prefix);
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: "File type is not allowed.",
      };
    }
  }

  // Check allowed extensions
  if (allowedExtensions && allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    const normalizedExtensions = allowedExtensions.map((ext) =>
      ext.toLowerCase().replace(".", ""),
    );

    if (!normalizedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: FileValidationOptions & { maxFiles?: number } = {},
): {
  valid: File[];
  invalid: { file: File; error: string }[];
} {
  const { maxFiles, ...fileOptions } = options;
  const valid: File[] = [];
  const invalid: { file: File; error: string }[] = [];

  // Check max files
  if (maxFiles !== undefined && files.length > maxFiles) {
    files.slice(maxFiles).forEach((file) => {
      invalid.push({ file, error: `Maximum ${maxFiles} files allowed.` });
    });
    files = files.slice(0, maxFiles);
  }

  // Validate each file
  files.forEach((file) => {
    const result = validateFile(file, fileOptions);
    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error! });
    }
  });

  return { valid, invalid };
}

// ============================================================================
// Image/Video Dimension Utilities
// ============================================================================

export interface MediaDimensions {
  width: number;
  height: number;
}

/**
 * Get dimensions of an image file
 */
export function getImageDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get dimensions and duration of a video file
 */
export function getVideoDimensions(
  file: File,
): Promise<MediaDimensions & { duration: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("video/")) {
      reject(new Error("File is not a video"));
      return;
    }

    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

/**
 * Get duration of an audio file
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("audio/")) {
      reject(new Error("File is not audio"));
      return;
    }

    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio"));
    };

    audio.src = url;
  });
}

// ============================================================================
// Thumbnail Generation
// ============================================================================

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Generate a thumbnail for an image file
 */
export function generateImageThumbnail(
  file: File,
  options: ThumbnailOptions = {},
): Promise<Blob> {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions maintaining aspect ratio
      let { naturalWidth: width, naturalHeight: height } = img;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and draw
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to generate thumbnail"));
          }
        },
        format,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Generate a thumbnail for a video file (captures first frame)
 */
export function generateVideoThumbnail(
  file: File,
  options: ThumbnailOptions & { captureTime?: number } = {},
): Promise<Blob> {
  const {
    maxWidth = 200,
    maxHeight = 200,
    quality = 0.8,
    format = "image/jpeg",
    captureTime = 0,
  } = options;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("video/")) {
      reject(new Error("File is not a video"));
      return;
    }

    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadeddata = () => {
      video.currentTime = Math.min(captureTime, video.duration);
    };

    video.onseeked = () => {
      URL.revokeObjectURL(url);

      // Calculate dimensions maintaining aspect ratio
      let { videoWidth: width, videoHeight: height } = video;
      const aspectRatio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and draw
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to generate thumbnail"));
          }
        },
        format,
        quality,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// Preview URL Utilities
// ============================================================================

/**
 * Create a preview URL for a file (blob URL)
 */
export function createPreviewUrl(file: File): string | null {
  const fileType = getFileType(file);
  if (PREVIEWABLE_TYPES.includes(fileType)) {
    return URL.createObjectURL(file);
  }
  return null;
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string | null): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// MIME Type Utilities
// ============================================================================

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase().replace(".", "");

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tiff: "image/tiff",

    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    m4a: "audio/mp4",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    rtf: "application/rtf",

    // Spreadsheets
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",

    // Presentations
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    gz: "application/gzip",
    tar: "application/x-tar",

    // Code
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    xml: "application/xml",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Check if a file is previewable in the browser
 */
export function isPreviewable(file: File): boolean {
  const fileType = getFileType(file);
  return PREVIEWABLE_TYPES.includes(fileType);
}

/**
 * Check if a file is an image
 */
export function isImage(file: File): boolean {
  return getFileType(file) === "image";
}

/**
 * Check if a file is a video
 */
export function isVideo(file: File): boolean {
  return getFileType(file) === "video";
}

/**
 * Check if a file is audio
 */
export function isAudio(file: File): boolean {
  return getFileType(file) === "audio";
}

/**
 * Check if a file is a document
 */
export function isDocument(file: File): boolean {
  return getFileType(file) === "document";
}
