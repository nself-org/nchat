/**
 * File Service Types
 *
 * Type definitions for file upload, download, and processing services.
 * Integrates with the nself file-processing plugin.
 */

// ============================================================================
// Storage Provider Configuration
// ============================================================================

export type StorageProvider = "minio" | "s3" | "gcs" | "r2" | "b2" | "azure";

export interface StorageConfig {
  provider: StorageProvider;
  bucket: string;
  endpoint?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  publicUrlBase?: string;
}

// ============================================================================
// File Processing Status
// ============================================================================

export type ProcessingStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ProcessingOperation =
  | "thumbnail"
  | "optimize"
  | "scan"
  | "metadata";

export type ScanStatus = "clean" | "infected" | "error" | "timeout";

// ============================================================================
// File Record Types
// ============================================================================

export interface FileRecord {
  /** Unique file ID */
  id: string;
  /** Original filename */
  name: string;
  /** Stored path in bucket */
  storagePath: string;
  /** Public URL (if public) */
  url?: string;
  /** Secure URL (signed, temporary) */
  secureUrl?: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File extension */
  extension: string;
  /** Storage bucket */
  bucket: string;
  /** Storage provider */
  provider: StorageProvider;
  /** Who uploaded the file */
  uploadedBy: string;
  /** When file was uploaded */
  uploadedAt: Date;
  /** Processing status */
  processingStatus: ProcessingStatus;
  /** Processing job ID */
  processingJobId?: string;
  /** Associated channel ID */
  channelId?: string;
  /** Associated message ID */
  messageId?: string;
  /** Soft delete flag */
  isDeleted: boolean;
  /** Deletion timestamp */
  deletedAt?: Date;
  /** Content hash (SHA-256) */
  contentHash?: string;
}

// ============================================================================
// Thumbnail Types
// ============================================================================

export interface ThumbnailRecord {
  id: string;
  fileId: string;
  path: string;
  url?: string;
  width: number;
  height: number;
  size: number;
  format: "jpeg" | "png" | "webp";
  createdAt: Date;
}

export interface ThumbnailSet {
  small?: ThumbnailRecord; // ~100px
  medium?: ThumbnailRecord; // ~400px
  large?: ThumbnailRecord; // ~1200px
}

// ============================================================================
// File Metadata
// ============================================================================

export interface ImageFileMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  colorSpace?: string;
  bitDepth?: number;
  hasAlpha?: boolean;
  exifStripped: boolean;
  blurHash?: string;
  dominantColor?: string;
}

export interface VideoFileMetadata {
  width: number;
  height: number;
  duration: number;
  frameRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  hasAudio?: boolean;
}

export interface AudioFileMetadata {
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
  waveform?: number[];
}

export interface DocumentFileMetadata {
  pageCount?: number;
  author?: string;
  title?: string;
  subject?: string;
}

export type FileMetadata =
  | ImageFileMetadata
  | VideoFileMetadata
  | AudioFileMetadata
  | DocumentFileMetadata;

// ============================================================================
// Virus Scan Results
// ============================================================================

export interface ScanResult {
  fileId: string;
  status: ScanStatus;
  isClean: boolean;
  threatsFound: number;
  threatNames: string[];
  signatureVersion?: string;
  scanDuration: number;
  scannedAt: Date;
}

// ============================================================================
// Processing Results
// ============================================================================

export interface ProcessingResult {
  jobId: string;
  fileId: string;
  status: ProcessingStatus;
  thumbnails: ThumbnailRecord[];
  metadata?: FileMetadata;
  scan?: ScanResult;
  optimization?: OptimizationResult;
  error?: string;
  duration: number;
  completedAt: Date;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercent: number;
}

// ============================================================================
// Upload Types
// ============================================================================

export interface UploadRequest {
  file?: File;
  buffer?: Buffer;
  fileName?: string;
  fileType?: string;
  storageKey?: string;
  isPublic?: boolean;
  channelId?: string;
  messageId?: string;
  operations?: ProcessingOperation[];
  metadata?: Record<string, unknown>;
}

export interface UploadResponse {
  success: boolean;
  error?: { message: string; code?: string };
  data?: {
    url: string;
    storageKey?: string;
    fileId?: string;
  };
  file?: FileRecord;
  uploadUrl?: string;
  fields?: Record<string, string>;
  jobId?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  status: ProcessingStatus;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed?: number;
  timeRemaining?: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Download Types
// ============================================================================

export interface DownloadUrlRequest {
  fileId: string;
  expiresIn?: number; // seconds, default 3600
  disposition?: "inline" | "attachment";
}

export interface DownloadUrlResponse {
  url: string;
  expiresAt: Date;
  contentType: string;
  filename: string;
  size: number;
}

// ============================================================================
// File List/Query Types
// ============================================================================

export interface FileQuery {
  channelId?: string;
  messageId?: string;
  uploadedBy?: string;
  mimeType?: string;
  minSize?: number;
  maxSize?: number;
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  status?: ProcessingStatus;
  limit?: number;
  offset?: number;
  orderBy?: "uploadedAt" | "name" | "size";
  orderDirection?: "asc" | "desc";
}

export interface FileListResponse {
  files: FileRecord[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Processing Plugin API Types
// ============================================================================

export interface CreateProcessingJobRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  operations?: ProcessingOperation[];
  priority?: number;
  webhookUrl?: string;
  webhookSecret?: string;
  callbackData?: Record<string, unknown>;
}

export interface CreateProcessingJobResponse {
  jobId: string;
  status: ProcessingStatus;
  estimatedDuration?: number;
}

export interface GetProcessingJobResponse {
  job: {
    id: string;
    fileId: string;
    status: ProcessingStatus;
    thumbnails: string[];
    durationMs?: number;
    error?: string;
  };
  thumbnails: ThumbnailRecord[];
  metadata?: FileMetadata;
  scan?: ScanResult;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface ProcessingWebhookPayload {
  event: "job.completed" | "job.failed";
  jobId: string;
  fileId: string;
  status: ProcessingStatus;
  thumbnails?: ThumbnailRecord[];
  metadata?: FileMetadata;
  scan?: ScanResult;
  optimization?: OptimizationResult;
  durationMs: number;
  callbackData?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Allowed File Types Configuration
// ============================================================================

export interface FileTypeConfig {
  /** Maximum file size in bytes */
  maxSize: number;
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Blocked MIME types */
  blockedMimeTypes: string[];
  /** Allowed extensions */
  allowedExtensions: string[];
  /** Blocked extensions */
  blockedExtensions: string[];
  /** Enable virus scanning */
  enableVirusScan: boolean;
  /** Enable image optimization */
  enableOptimization: boolean;
  /** Strip EXIF metadata */
  stripExif: boolean;
  /** Generate thumbnails */
  generateThumbnails: boolean;
  /** Thumbnail sizes to generate */
  thumbnailSizes: number[];
}

export const DEFAULT_FILE_CONFIG: FileTypeConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [],
  blockedMimeTypes: [
    "application/x-executable",
    "application/x-msdownload",
    "application/x-msdos-program",
  ],
  allowedExtensions: [],
  blockedExtensions: ["exe", "bat", "cmd", "com", "msi", "scr", "pif"],
  enableVirusScan: false,
  enableOptimization: true,
  stripExif: true,
  generateThumbnails: true,
  thumbnailSizes: [100, 400, 1200],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get file type category from MIME type
 */
export function getFileCategory(
  mimeType: string,
): "image" | "video" | "audio" | "document" | "archive" | "code" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation")
  ) {
    return "document";
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z") ||
    mimeType.includes("compressed")
  ) {
    return "archive";
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml") ||
    mimeType.includes("html") ||
    mimeType.includes("css") ||
    mimeType.startsWith("text/")
  ) {
    return "code";
  }
  return "other";
}

/**
 * Validate file against configuration
 */
export function validateFile(
  file: File,
  config: FileTypeConfig = DEFAULT_FILE_CONFIG,
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(config.maxSize)}`,
    };
  }

  // Check blocked MIME types
  if (config.blockedMimeTypes.includes(file.type)) {
    return { valid: false, error: "This file type is not allowed" };
  }

  // Check allowed MIME types (if specified)
  if (config.allowedMimeTypes.length > 0) {
    const allowed = config.allowedMimeTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", "/"));
      }
      return file.type === type;
    });
    if (!allowed) {
      return { valid: false, error: "This file type is not allowed" };
    }
  }

  // Check extension
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (config.blockedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Files with .${extension} extension are not allowed`,
    };
  }

  if (
    config.allowedExtensions.length > 0 &&
    !config.allowedExtensions.includes(extension)
  ) {
    return {
      valid: false,
      error: `Only ${config.allowedExtensions.join(", ")} files are allowed`,
    };
  }

  return { valid: true };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get processing operations based on file type
 */
export function getDefaultOperations(
  mimeType: string,
  config: FileTypeConfig = DEFAULT_FILE_CONFIG,
): ProcessingOperation[] {
  const operations: ProcessingOperation[] = ["metadata"];

  if (config.enableVirusScan) {
    operations.push("scan");
  }

  const category = getFileCategory(mimeType);

  if (category === "image") {
    if (config.generateThumbnails) {
      operations.push("thumbnail");
    }
    if (config.enableOptimization) {
      operations.push("optimize");
    }
  }

  if (category === "video" && config.generateThumbnails) {
    operations.push("thumbnail");
  }

  return operations;
}
