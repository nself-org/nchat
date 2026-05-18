/**
 * Media Parity Service
 *
 * Implements complete media/file lifecycle matching messaging app parity.
 * Supports platform-specific size limits (WhatsApp, Telegram, Discord, Slack)
 * and provides unified interfaces for uploads, previews, and galleries.
 */

import type {
  FileTypeConfig,
  ProcessingOperation,
} from "@/services/files/types";

// ============================================================================
// Platform Presets
// ============================================================================

export type PlatformPreset =
  | "whatsapp"
  | "telegram"
  | "discord"
  | "slack"
  | "default";

export interface PlatformLimits {
  /** Platform name */
  name: string;
  /** Maximum video file size in bytes */
  maxVideoSize: number;
  /** Maximum image file size in bytes */
  maxImageSize: number;
  /** Maximum audio file size in bytes */
  maxAudioSize: number;
  /** Maximum document/file size in bytes */
  maxFileSize: number;
  /** Maximum number of attachments per message */
  maxAttachments: number;
  /** Premium/upgraded limits */
  premium?: {
    maxVideoSize: number;
    maxImageSize: number;
    maxAudioSize: number;
    maxFileSize: number;
  };
  /** Supported file extensions */
  supportedExtensions: {
    images: string[];
    videos: string[];
    audio: string[];
    documents: string[];
    archives: string[];
  };
  /** Duration limits */
  maxVideoDuration?: number; // seconds
  maxVoiceMessageDuration?: number; // seconds
  /** Quality settings */
  maxVideoResolution?: { width: number; height: number };
  imageCompression?: boolean;
  videoCompression?: boolean;
}

export const PLATFORM_PRESETS: Record<PlatformPreset, PlatformLimits> = {
  whatsapp: {
    name: "WhatsApp",
    maxVideoSize: 16 * 1024 * 1024, // 16MB
    maxImageSize: 16 * 1024 * 1024, // 16MB
    maxAudioSize: 16 * 1024 * 1024, // 16MB
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxAttachments: 30,
    maxVideoDuration: 180, // 3 minutes
    maxVoiceMessageDuration: 900, // 15 minutes
    maxVideoResolution: { width: 1920, height: 1080 },
    imageCompression: true,
    videoCompression: true,
    supportedExtensions: {
      images: ["jpg", "jpeg", "png", "gif", "webp"],
      videos: ["mp4", "3gp", "mov", "mkv", "avi"],
      audio: ["mp3", "ogg", "opus", "aac", "m4a", "amr"],
      documents: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
      archives: ["zip"],
    },
  },
  telegram: {
    name: "Telegram",
    maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxImageSize: 10 * 1024 * 1024, // 10MB (uncompressed)
    maxAudioSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxAttachments: 10,
    premium: {
      maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
      maxImageSize: 10 * 1024 * 1024,
      maxAudioSize: 4 * 1024 * 1024 * 1024,
      maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
    },
    maxVideoDuration: 60 * 60, // 1 hour
    maxVoiceMessageDuration: 60 * 60, // 1 hour
    maxVideoResolution: { width: 1280, height: 720 }, // Video notes
    imageCompression: false, // Offers both compressed and original
    videoCompression: true,
    supportedExtensions: {
      images: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic"],
      videos: ["mp4", "mov", "avi", "mkv", "webm", "3gp", "flv"],
      audio: ["mp3", "ogg", "opus", "wav", "flac", "m4a", "aac"],
      documents: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "rtf",
        "odt",
        "ods",
      ],
      archives: ["zip", "rar", "7z", "tar", "gz"],
    },
  },
  discord: {
    name: "Discord",
    maxVideoSize: 8 * 1024 * 1024, // 8MB free
    maxImageSize: 8 * 1024 * 1024, // 8MB free
    maxAudioSize: 8 * 1024 * 1024, // 8MB free
    maxFileSize: 8 * 1024 * 1024, // 8MB free
    maxAttachments: 10,
    premium: {
      maxVideoSize: 50 * 1024 * 1024, // 50MB Nitro Basic
      maxImageSize: 50 * 1024 * 1024,
      maxAudioSize: 50 * 1024 * 1024,
      maxFileSize: 500 * 1024 * 1024, // 500MB Nitro
    },
    maxVideoDuration: undefined, // No limit
    maxVoiceMessageDuration: 120, // 2 minutes
    imageCompression: false,
    videoCompression: false,
    supportedExtensions: {
      images: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"],
      videos: ["mp4", "webm", "mov", "avi", "mkv", "flv", "wmv"],
      audio: ["mp3", "ogg", "wav", "flac", "m4a", "aac", "wma"],
      documents: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "md",
        "json",
      ],
      archives: ["zip", "rar", "7z", "tar", "gz", "bz2"],
    },
  },
  slack: {
    name: "Slack",
    maxVideoSize: 1024 * 1024 * 1024, // 1GB per file
    maxImageSize: 1024 * 1024 * 1024, // 1GB
    maxAudioSize: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    maxAttachments: 10,
    maxVideoDuration: undefined,
    imageCompression: false,
    videoCompression: false,
    supportedExtensions: {
      images: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "svg",
        "tiff",
        "heic",
        "avif",
      ],
      videos: ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "m4v", "ogv"],
      audio: ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "aiff"],
      documents: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "rtf",
        "csv",
        "md",
        "json",
        "xml",
      ],
      archives: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
    },
  },
  default: {
    name: "Default",
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    maxImageSize: 25 * 1024 * 1024, // 25MB
    maxAudioSize: 50 * 1024 * 1024, // 50MB
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxAttachments: 10,
    maxVideoDuration: 600, // 10 minutes
    maxVoiceMessageDuration: 600, // 10 minutes
    maxVideoResolution: { width: 1920, height: 1080 },
    imageCompression: true,
    videoCompression: true,
    supportedExtensions: {
      images: ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"],
      videos: ["mp4", "webm", "mov", "avi", "mkv"],
      audio: ["mp3", "wav", "ogg", "flac", "m4a", "aac"],
      documents: [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "md",
        "csv",
      ],
      archives: ["zip", "rar", "7z"],
    },
  },
};

// ============================================================================
// File Categories and MIME Types
// ============================================================================

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

export const MIME_TYPE_CATEGORIES: Record<string, FileCategory> = {
  // Images
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/avif": "image",
  "image/bmp": "image",
  "image/svg+xml": "image",
  "image/tiff": "image",
  "image/heic": "image",
  "image/heif": "image",
  "image/x-icon": "image",

  // Videos
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",
  "video/mpeg": "video",
  "video/3gpp": "video",
  "video/x-flv": "video",
  "video/x-ms-wmv": "video",
  "video/ogg": "video",

  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/wave": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
  "audio/flac": "audio",
  "audio/aac": "audio",
  "audio/x-m4a": "audio",
  "audio/m4a": "audio",
  "audio/webm": "audio",
  "audio/opus": "audio",
  "audio/amr": "audio",
  "audio/x-aiff": "audio",

  // Documents
  "application/pdf": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "document",
  "application/vnd.ms-powerpoint": "document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "document",
  "text/plain": "document",
  "text/csv": "document",
  "text/markdown": "document",
  "application/rtf": "document",
  "application/json": "document",
  "application/xml": "document",

  // Archives
  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-7z-compressed": "archive",
  "application/x-tar": "archive",
  "application/gzip": "archive",
  "application/x-bzip2": "archive",
  "application/x-xz": "archive",
};

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();

  if (MIME_TYPE_CATEGORIES[normalized]) {
    return MIME_TYPE_CATEGORIES[normalized];
  }

  // Fallback based on type prefix
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("text/")) return "document";

  return "other";
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.substring(lastDot + 1).toLowerCase();
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Validate file against platform limits
 */
export function validateFileForPlatform(
  file: File,
  preset: PlatformPreset = "default",
  isPremium: boolean = false,
): ValidationResult {
  const limits = PLATFORM_PRESETS[preset];
  const category = getFileCategory(file.type);
  const extension = getFileExtension(file.name);
  const warnings: string[] = [];

  // Get applicable limits based on premium status
  const effectiveLimits = isPremium && limits.premium ? limits.premium : limits;

  // Check file size based on category
  let maxSize: number;
  switch (category) {
    case "video":
      maxSize = effectiveLimits.maxVideoSize;
      break;
    case "image":
      maxSize = effectiveLimits.maxImageSize;
      break;
    case "audio":
      maxSize = effectiveLimits.maxAudioSize;
      break;
    default:
      maxSize = effectiveLimits.maxFileSize;
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds maximum for ${category}s (${formatBytes(maxSize)})`,
    };
  }

  // Check file extension
  const supportedCategory = Object.entries(limits.supportedExtensions).find(
    ([, extensions]) => extensions.includes(extension),
  );

  if (!supportedCategory && extension) {
    warnings.push(`File extension '.${extension}' may not be fully supported`);
  }

  // Check if compression is recommended
  if (
    category === "image" &&
    limits.imageCompression &&
    file.size > 1024 * 1024
  ) {
    warnings.push("Image compression is recommended for optimal delivery");
  }

  if (
    category === "video" &&
    limits.videoCompression &&
    file.size > 10 * 1024 * 1024
  ) {
    warnings.push("Video compression is recommended for optimal delivery");
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate multiple files for a message
 */
export function validateAttachments(
  files: File[],
  preset: PlatformPreset = "default",
  isPremium: boolean = false,
): ValidationResult {
  const limits = PLATFORM_PRESETS[preset];

  if (files.length > limits.maxAttachments) {
    return {
      valid: false,
      error: `Maximum ${limits.maxAttachments} attachments allowed per message`,
    };
  }

  const warnings: string[] = [];

  for (const file of files) {
    const result = validateFileForPlatform(file, preset, isPremium);
    if (!result.valid) {
      return result;
    }
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// Upload Configuration
// ============================================================================

export interface UploadConfig {
  /** Enable drag-and-drop */
  dragDrop: boolean;
  /** Enable paste from clipboard */
  paste: boolean;
  /** Enable multi-file selection */
  multiFile: boolean;
  /** Enable resume for interrupted uploads */
  resumable: boolean;
  /** Enable automatic compression */
  compression: boolean;
  /** Compression options */
  compressionOptions?: {
    imageQuality: number;
    maxImageWidth: number;
    maxImageHeight: number;
    videoQuality: "low" | "medium" | "high";
    maxVideoWidth: number;
    maxVideoHeight: number;
  };
  /** Chunk size for resumable uploads (bytes) */
  chunkSize: number;
  /** Maximum concurrent uploads */
  maxConcurrent: number;
  /** Retry count for failed chunks */
  maxRetries: number;
}

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  dragDrop: true,
  paste: true,
  multiFile: true,
  resumable: true,
  compression: true,
  compressionOptions: {
    imageQuality: 0.85,
    maxImageWidth: 2048,
    maxImageHeight: 2048,
    videoQuality: "high",
    maxVideoWidth: 1920,
    maxVideoHeight: 1080,
  },
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  maxConcurrent: 3,
  maxRetries: 3,
};

/**
 * Get upload config for a platform preset
 */
export function getUploadConfigForPlatform(
  preset: PlatformPreset,
): UploadConfig {
  const limits = PLATFORM_PRESETS[preset];

  return {
    ...DEFAULT_UPLOAD_CONFIG,
    compression: limits.imageCompression || limits.videoCompression || false,
    compressionOptions: {
      imageQuality: preset === "whatsapp" ? 0.7 : 0.85,
      maxImageWidth: limits.maxVideoResolution?.width || 2048,
      maxImageHeight: limits.maxVideoResolution?.height || 2048,
      videoQuality: preset === "telegram" ? "high" : "medium",
      maxVideoWidth: limits.maxVideoResolution?.width || 1920,
      maxVideoHeight: limits.maxVideoResolution?.height || 1080,
    },
  };
}

// ============================================================================
// File Type Configuration
// ============================================================================

/**
 * Get FileTypeConfig for a platform preset
 */
export function getFileTypeConfigForPlatform(
  preset: PlatformPreset,
  isPremium: boolean = false,
): FileTypeConfig {
  const limits = PLATFORM_PRESETS[preset];
  const effectiveLimits = isPremium && limits.premium ? limits.premium : limits;

  // Combine all supported extensions
  const allExtensions = [
    ...limits.supportedExtensions.images,
    ...limits.supportedExtensions.videos,
    ...limits.supportedExtensions.audio,
    ...limits.supportedExtensions.documents,
    ...limits.supportedExtensions.archives,
  ];

  return {
    maxSize: Math.max(
      effectiveLimits.maxVideoSize,
      effectiveLimits.maxImageSize,
      effectiveLimits.maxAudioSize,
      effectiveLimits.maxFileSize,
    ),
    allowedMimeTypes: [], // Allow based on extension instead
    blockedMimeTypes: [
      "application/x-executable",
      "application/x-msdownload",
      "application/x-msdos-program",
      "application/x-sh",
      "application/x-bash",
    ],
    allowedExtensions: allExtensions,
    blockedExtensions: [
      "exe",
      "bat",
      "cmd",
      "com",
      "msi",
      "scr",
      "pif",
      "vbs",
      "js",
      "ps1",
    ],
    enableVirusScan: true,
    enableOptimization: limits.imageCompression || false,
    stripExif: true,
    generateThumbnails: true,
    thumbnailSizes: [100, 400, 1200],
  };
}

// ============================================================================
// Processing Operations
// ============================================================================

/**
 * Get processing operations based on file type and platform
 */
export function getProcessingOperations(
  mimeType: string,
  preset: PlatformPreset = "default",
): ProcessingOperation[] {
  const category = getFileCategory(mimeType);
  const limits = PLATFORM_PRESETS[preset];
  const operations: ProcessingOperation[] = ["metadata"];

  // Always scan for viruses if enabled
  operations.push("scan");

  switch (category) {
    case "image":
      operations.push("thumbnail");
      if (limits.imageCompression) {
        operations.push("optimize");
      }
      break;
    case "video":
      operations.push("thumbnail");
      // Note: Video transcoding would require additional backend support
      break;
    case "audio":
      // Audio waveform generation is handled client-side
      break;
  }

  return operations;
}

// ============================================================================
// Resume Upload Support
// ============================================================================

export interface ResumableUploadState {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadId?: string;
  storagePath: string;
  uploadedChunks: number[];
  totalChunks: number;
  bytesUploaded: number;
  startedAt: Date;
  lastChunkAt?: Date;
  error?: string;
}

/**
 * Calculate chunk information for a file
 */
export function calculateChunks(
  fileSize: number,
  chunkSize: number = DEFAULT_UPLOAD_CONFIG.chunkSize,
): { totalChunks: number; lastChunkSize: number } {
  const totalChunks = Math.ceil(fileSize / chunkSize);
  const lastChunkSize = fileSize % chunkSize || chunkSize;
  return { totalChunks, lastChunkSize };
}

/**
 * Get a specific chunk from a file
 */
export function getFileChunk(
  file: File,
  chunkIndex: number,
  chunkSize: number = DEFAULT_UPLOAD_CONFIG.chunkSize,
): Blob {
  const start = chunkIndex * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  return file.slice(start, end);
}

/**
 * Calculate upload progress from chunk state
 */
export function calculateUploadProgress(state: ResumableUploadState): number {
  if (state.totalChunks === 0) return 0;
  return Math.round((state.uploadedChunks.length / state.totalChunks) * 100);
}

// ============================================================================
// Album/Grouping Support
// ============================================================================

export interface MediaAlbum {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  items: string[]; // Media item IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  channelId?: string;
  isPrivate: boolean;
}

/**
 * Group media items by date for display
 */
export function groupMediaByDate<T extends { createdAt: string | Date }>(
  items: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const date = new Date(item.createdAt);
    let dateKey: string;

    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    } else if (date.getFullYear() === today.getFullYear()) {
      dateKey = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });
    } else {
      dateKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  }

  return groups;
}

/**
 * Group media items by sender
 */
export function groupMediaBySender<T extends { uploadedBy: { id: string } }>(
  items: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const userId = item.uploadedBy.id;
    if (!groups.has(userId)) {
      groups.set(userId, []);
    }
    groups.get(userId)!.push(item);
  }

  return groups;
}

/**
 * Group media items by type
 */
export function groupMediaByType<T extends { mimeType: string }>(
  items: T[],
): Map<FileCategory, T[]> {
  const groups = new Map<FileCategory, T[]>();

  for (const item of items) {
    const category = getFileCategory(item.mimeType);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(item);
  }

  return groups;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "Invalid size";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format duration in seconds to human-readable string
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
 * Get appropriate icon for file category
 */
export function getFileCategoryIcon(category: FileCategory): string {
  const icons: Record<FileCategory, string> = {
    image: "Image",
    video: "Video",
    audio: "Music",
    document: "FileText",
    archive: "Archive",
    other: "File",
  };
  return icons[category] || "File";
}

/**
 * Get friendly name for file category
 */
export function getFileCategoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    archive: "Archive",
    other: "File",
  };
  return labels[category] || "File";
}

/**
 * Check if file is previewable in browser
 */
export function isPreviewable(mimeType: string): boolean {
  const category = getFileCategory(mimeType);
  const normalized = mimeType.toLowerCase();

  switch (category) {
    case "image":
      // Most images are previewable except HEIC/HEIF without browser support
      return !["image/heic", "image/heif", "image/tiff"].includes(normalized);
    case "video":
      // MP4 and WebM are universally supported
      return ["video/mp4", "video/webm", "video/ogg"].includes(normalized);
    case "audio":
      // Most audio formats have good browser support
      return [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/webm",
      ].includes(normalized);
    case "document":
      // PDFs and plain text are previewable
      return [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
      ].includes(normalized);
    default:
      return false;
  }
}

/**
 * Get recommended thumbnail sizes for a file category
 */
export function getRecommendedThumbnailSizes(category: FileCategory): number[] {
  switch (category) {
    case "image":
    case "video":
      return [100, 400, 1200]; // Small, medium, large
    case "audio":
      return []; // Audio uses waveform, not thumbnails
    case "document":
      return [400]; // Single preview size for documents
    default:
      return [];
  }
}
