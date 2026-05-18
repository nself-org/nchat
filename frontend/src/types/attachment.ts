/**
 * Attachment Types for nself-chat
 *
 * Type definitions for file attachments, uploads, and media handling.
 * Supports images, videos, audio, and general files.
 */

// ============================================================================
// Attachment Type Definitions
// ============================================================================

/**
 * Types of attachments supported.
 */
export type AttachmentType = "image" | "video" | "audio" | "file";

/**
 * Attachment categories for filtering and display.
 */
export type AttachmentCategory =
  | "media"
  | "documents"
  | "archives"
  | "code"
  | "other";

/**
 * MIME type categories for file type detection.
 */
export const MimeTypeCategories: Record<AttachmentCategory, string[]> = {
  media: ["image/*", "video/*", "audio/*"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/rtf",
  ],
  archives: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
  ],
  code: [
    "text/javascript",
    "text/typescript",
    "text/html",
    "text/css",
    "application/json",
    "application/xml",
    "text/x-python",
    "text/x-java",
  ],
  other: [],
};

// ============================================================================
// File Metadata Types
// ============================================================================

/**
 * File metadata extracted from uploaded files.
 */
export interface FileMetadata {
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File extension (without dot) */
  extension: string;
  /** Last modified date */
  lastModified?: Date;
  /** File hash (for deduplication) */
  hash?: string;
}

/**
 * Image-specific metadata.
 */
export interface ImageMetadata extends FileMetadata {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
  /** Color space (RGB, CMYK, etc.) */
  colorSpace?: string;
  /** Has alpha/transparency channel */
  hasAlpha?: boolean;
  /** Blur hash for placeholder */
  blurHash?: string;
  /** Dominant color (hex) */
  dominantColor?: string;
  /** EXIF data */
  exif?: ImageExifData;
}

/**
 * Image EXIF data.
 */
export interface ImageExifData {
  /** Camera make */
  make?: string;
  /** Camera model */
  model?: string;
  /** Date taken */
  dateTaken?: Date;
  /** GPS coordinates */
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  /** Orientation (1-8) */
  orientation?: number;
  /** ISO speed */
  iso?: number;
  /** Aperture (f-stop) */
  aperture?: string;
  /** Shutter speed */
  shutterSpeed?: string;
  /** Focal length */
  focalLength?: string;
}

/**
 * Video-specific metadata.
 */
export interface VideoMetadata extends FileMetadata {
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Frame rate (fps) */
  frameRate?: number;
  /** Video codec */
  videoCodec?: string;
  /** Audio codec */
  audioCodec?: string;
  /** Bitrate in kbps */
  bitrate?: number;
  /** Has audio track */
  hasAudio?: boolean;
}

/**
 * Audio-specific metadata.
 */
export interface AudioMetadata extends FileMetadata {
  /** Duration in seconds */
  duration: number;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Number of channels */
  channels?: number;
  /** Bitrate in kbps */
  bitrate?: number;
  /** Audio codec */
  codec?: string;
  /** ID3 tags */
  tags?: AudioTags;
  /** Waveform data for visualization */
  waveform?: number[];
}

/**
 * Audio ID3 tags.
 */
export interface AudioTags {
  /** Track title */
  title?: string;
  /** Artist name */
  artist?: string;
  /** Album name */
  album?: string;
  /** Year */
  year?: number;
  /** Genre */
  genre?: string;
  /** Track number */
  track?: number;
  /** Album art URL */
  albumArt?: string;
}

// ============================================================================
// Main Attachment Interface
// ============================================================================

/**
 * Core Attachment interface.
 */
export interface Attachment {
  /** Unique attachment ID */
  id: string;
  /** Attachment type */
  type: AttachmentType;
  /** URL to the attachment */
  url: string;
  /** Secure/signed URL (if different) */
  secureUrl?: string;
  /** Original filename */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File extension */
  extension?: string;
  /** Width in pixels (for images/videos) */
  width?: number;
  /** Height in pixels (for images/videos) */
  height?: number;
  /** Duration in seconds (for audio/video) */
  duration?: number;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Preview URL (for lower resolution) */
  previewUrl?: string;
  /** Blur hash for image placeholder */
  blurHash?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Who uploaded the attachment */
  uploadedBy: string;
  /** When the attachment was uploaded */
  uploadedAt: Date;
  /** Full metadata (type-specific) */
  metadata?: ImageMetadata | VideoMetadata | AudioMetadata | FileMetadata;
}

/**
 * Image attachment with full metadata.
 */
export interface ImageAttachment extends Omit<Attachment, "type" | "metadata"> {
  type: "image";
  width: number;
  height: number;
  metadata?: ImageMetadata;
}

/**
 * Video attachment with full metadata.
 */
export interface VideoAttachment extends Omit<Attachment, "type" | "metadata"> {
  type: "video";
  width: number;
  height: number;
  duration: number;
  metadata?: VideoMetadata;
}

/**
 * Audio attachment with full metadata.
 */
export interface AudioAttachment extends Omit<Attachment, "type" | "metadata"> {
  type: "audio";
  duration: number;
  metadata?: AudioMetadata;
}

/**
 * Generic file attachment.
 */
export interface FileAttachment extends Omit<Attachment, "type" | "metadata"> {
  type: "file";
  metadata?: FileMetadata;
}

/**
 * Union type for all attachment types.
 */
export type AnyAttachment =
  | ImageAttachment
  | VideoAttachment
  | AudioAttachment
  | FileAttachment;

// ============================================================================
// Upload Types
// ============================================================================

/**
 * Upload progress state.
 */
export interface UploadProgress {
  /** Upload ID */
  id: string;
  /** Original file */
  file: File;
  /** Upload status */
  status: UploadStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Bytes uploaded */
  bytesUploaded: number;
  /** Total bytes */
  bytesTotal: number;
  /** Upload speed in bytes/second */
  speed?: number;
  /** Estimated time remaining in seconds */
  timeRemaining?: number;
  /** Error message (if failed) */
  error?: string;
  /** Resulting attachment (when complete) */
  attachment?: Attachment;
  /** When upload started */
  startedAt: Date;
  /** When upload completed/failed */
  completedAt?: Date;
}

/**
 * Upload status values.
 */
export type UploadStatus =
  | "pending"
  | "preparing"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Upload queue item.
 */
export interface UploadQueueItem {
  /** Queue item ID */
  id: string;
  /** File to upload */
  file: File;
  /** Channel ID for the upload */
  channelId: string;
  /** Message ID (if editing) */
  messageId?: string;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Current status */
  status: UploadStatus;
  /** Upload progress */
  progress: UploadProgress;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retries allowed */
  maxRetries: number;
}

/**
 * Upload settings and constraints.
 */
export interface UploadSettings {
  /** Maximum file size in bytes */
  maxFileSize: number;
  /** Maximum total size per message */
  maxTotalSize: number;
  /** Maximum number of files per message */
  maxFilesPerMessage: number;
  /** Allowed MIME types (empty = all) */
  allowedMimeTypes: string[];
  /** Blocked MIME types */
  blockedMimeTypes: string[];
  /** Allowed file extensions (empty = all) */
  allowedExtensions: string[];
  /** Blocked file extensions */
  blockedExtensions: string[];
  /** Enable image compression */
  compressImages: boolean;
  /** Max image dimension before compression */
  maxImageDimension: number;
  /** Image compression quality (0-100) */
  imageQuality: number;
  /** Generate thumbnails */
  generateThumbnails: boolean;
  /** Thumbnail max dimension */
  thumbnailSize: number;
  /** Generate blur hashes */
  generateBlurHash: boolean;
  /** Extract metadata */
  extractMetadata: boolean;
  /** Scan for viruses */
  virusScan: boolean;
}

/**
 * Default upload settings.
 */
export const DefaultUploadSettings: UploadSettings = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 25 * 1024 * 1024, // 25MB
  maxFilesPerMessage: 10,
  allowedMimeTypes: [],
  blockedMimeTypes: ["application/x-executable", "application/x-msdownload"],
  allowedExtensions: [],
  blockedExtensions: ["exe", "bat", "cmd", "com", "msi"],
  compressImages: true,
  maxImageDimension: 4096,
  imageQuality: 85,
  generateThumbnails: true,
  thumbnailSize: 400,
  generateBlurHash: true,
  extractMetadata: true,
  virusScan: false,
};

// ============================================================================
// Upload Input Types
// ============================================================================

/**
 * Input for initiating a file upload.
 */
export interface UploadFileInput {
  /** File to upload */
  file: File;
  /** Channel ID */
  channelId: string;
  /** Message ID (if editing) */
  messageId?: string;
  /** Alt text for accessibility */
  altText?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for uploading multiple files.
 */
export interface UploadFilesInput {
  /** Files to upload */
  files: File[];
  /** Channel ID */
  channelId: string;
  /** Message ID (if editing) */
  messageId?: string;
}

/**
 * Pre-signed upload URL response.
 */
export interface PresignedUploadUrl {
  /** Upload URL */
  uploadUrl: string;
  /** Fields to include in form data */
  fields: Record<string, string>;
  /** Final file URL (after upload) */
  fileUrl: string;
  /** Expiration time */
  expiresAt: Date;
  /** Maximum file size allowed */
  maxSize: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get attachment type from MIME type.
 */
export function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

/**
 * Get attachment category from MIME type.
 */
export function getAttachmentCategory(mimeType: string): AttachmentCategory {
  for (const [category, types] of Object.entries(MimeTypeCategories)) {
    for (const type of types) {
      if (type.endsWith("/*")) {
        if (mimeType.startsWith(type.replace("/*", "/"))) {
          return category as AttachmentCategory;
        }
      } else if (mimeType === type) {
        return category as AttachmentCategory;
      }
    }
  }
  return "other";
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if file type is allowed.
 */
export function isFileTypeAllowed(
  file: File,
  settings: UploadSettings,
): { allowed: boolean; reason?: string } {
  // Check blocked extensions
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (settings.blockedExtensions.includes(extension)) {
    return { allowed: false, reason: `File type .${extension} is not allowed` };
  }

  // Check blocked MIME types
  if (settings.blockedMimeTypes.includes(file.type)) {
    return { allowed: false, reason: `File type ${file.type} is not allowed` };
  }

  // Check allowed extensions (if specified)
  if (
    settings.allowedExtensions.length > 0 &&
    !settings.allowedExtensions.includes(extension)
  ) {
    return {
      allowed: false,
      reason: `Only ${settings.allowedExtensions.join(", ")} files are allowed`,
    };
  }

  // Check allowed MIME types (if specified)
  if (settings.allowedMimeTypes.length > 0) {
    const allowed = settings.allowedMimeTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", "/"));
      }
      return file.type === type;
    });
    if (!allowed) {
      return { allowed: false, reason: "This file type is not allowed" };
    }
  }

  // Check file size
  if (file.size > settings.maxFileSize) {
    return {
      allowed: false,
      reason: `File is too large. Maximum size is ${formatFileSize(settings.maxFileSize)}`,
    };
  }

  return { allowed: true };
}

/**
 * Get file icon name based on MIME type.
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "file-pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "file-word";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return "file-excel";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
    return "file-powerpoint";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("compressed") ||
    mimeType.includes("archive")
  )
    return "file-archive";
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("xml")
  )
    return "file-code";
  return "file";
}
