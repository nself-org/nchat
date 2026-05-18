/**
 * File Utilities
 *
 * Utilities for handling files, formatting sizes, and determining file types
 */

// ============================================================================
// Types
// ============================================================================

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "other";

export interface FileTypeInfo {
  category: FileCategory;
  extension: string;
  icon: string;
  description: string;
}

// ============================================================================
// File Size Formatting
// ============================================================================

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

/**
 * Format file size in bytes to human readable string
 *
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 *
 * Examples:
 * - 1024 -> "1 KB"
 * - 1536 -> "1.5 KB"
 * - 1048576 -> "1 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "Invalid size";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${SIZE_UNITS[i]}`;
}

/**
 * Parse a file size string to bytes
 *
 * @param sizeStr - Size string like "1.5 MB", "500KB", etc.
 * @returns Size in bytes or NaN if invalid
 */
export function parseFileSize(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
  if (!match) return NaN;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const unitIndex = SIZE_UNITS.indexOf(unit);

  if (unitIndex === -1) return NaN;

  return value * Math.pow(1024, unitIndex);
}

// ============================================================================
// MIME Type Mappings
// ============================================================================

const MIME_TYPE_CATEGORIES: Record<string, FileCategory> = {
  // Images
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/bmp": "image",
  "image/tiff": "image",
  "image/ico": "image",
  "image/x-icon": "image",
  "image/heic": "image",
  "image/heif": "image",

  // Videos
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  "video/x-matroska": "video",
  "video/mpeg": "video",

  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  "audio/aac": "audio",
  "audio/flac": "audio",
  "audio/x-m4a": "audio",

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
  "text/rtf": "document",
  "application/rtf": "document",

  // Archives
  "application/zip": "archive",
  "application/x-zip-compressed": "archive",
  "application/x-rar-compressed": "archive",
  "application/x-7z-compressed": "archive",
  "application/gzip": "archive",
  "application/x-tar": "archive",
  "application/x-bzip2": "archive",

  // Code
  "text/javascript": "code",
  "application/javascript": "code",
  "application/json": "code",
  "text/html": "code",
  "text/css": "code",
  "text/xml": "code",
  "application/xml": "code",
  "text/markdown": "code",
  "text/x-python": "code",
  "text/x-java-source": "code",
  "text/x-c": "code",
  "text/x-c++": "code",
};

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Get the category of a file based on MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  // Normalize MIME type
  const normalizedMime = mimeType.toLowerCase().split(";")[0].trim();

  // Check exact match
  if (MIME_TYPE_CATEGORIES[normalizedMime]) {
    return MIME_TYPE_CATEGORIES[normalizedMime];
  }

  // Check prefix match
  if (normalizedMime.startsWith("image/")) return "image";
  if (normalizedMime.startsWith("video/")) return "video";
  if (normalizedMime.startsWith("audio/")) return "audio";
  if (normalizedMime.startsWith("text/")) return "document";

  return "other";
}

/**
 * Check if file is an image based on MIME type
 */
export function isImage(mimeType: string): boolean {
  return getFileCategory(mimeType) === "image";
}

/**
 * Check if file is a video based on MIME type
 */
export function isVideo(mimeType: string): boolean {
  return getFileCategory(mimeType) === "video";
}

/**
 * Check if file is audio based on MIME type
 */
export function isAudio(mimeType: string): boolean {
  return getFileCategory(mimeType) === "audio";
}

/**
 * Check if file is a document based on MIME type
 */
export function isDocument(mimeType: string): boolean {
  return getFileCategory(mimeType) === "document";
}

/**
 * Check if file is an archive based on MIME type
 */
export function isArchive(mimeType: string): boolean {
  return getFileCategory(mimeType) === "archive";
}

/**
 * Check if file is viewable in browser (image, video, audio, PDF)
 */
export function isPreviewable(mimeType: string): boolean {
  return (
    isImage(mimeType) ||
    isVideo(mimeType) ||
    isAudio(mimeType) ||
    mimeType === "application/pdf"
  );
}

// ============================================================================
// File Icons
// ============================================================================

const FILE_ICONS: Record<FileCategory, string> = {
  image: "image",
  video: "video",
  audio: "music",
  document: "file-text",
  archive: "archive",
  code: "code",
  other: "file",
};

const EXTENSION_ICONS: Record<string, string> = {
  // Documents
  pdf: "file-text",
  doc: "file-text",
  docx: "file-text",
  xls: "table",
  xlsx: "table",
  ppt: "presentation",
  pptx: "presentation",
  txt: "file-text",

  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  svg: "image",
  webp: "image",

  // Videos
  mp4: "video",
  webm: "video",
  mov: "video",
  avi: "video",
  mkv: "video",

  // Audio
  mp3: "music",
  wav: "music",
  ogg: "music",
  flac: "music",
  m4a: "music",

  // Archives
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",

  // Code
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  html: "code",
  css: "code",
  json: "code",
  py: "code",
  java: "code",
  c: "code",
  cpp: "code",
  go: "code",
  rs: "code",
  md: "file-text",
};

/**
 * Get icon name for a file based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  const category = getFileCategory(mimeType);
  return FILE_ICONS[category] || FILE_ICONS.other;
}

/**
 * Get icon name for a file based on extension
 */
export function getFileIconByExtension(filename: string): string {
  const extension = getFileExtension(filename).toLowerCase();
  return EXTENSION_ICONS[extension] || FILE_ICONS.other;
}

// ============================================================================
// File Name Utilities
// ============================================================================

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }
  return filename.substring(lastDot + 1);
}

/**
 * Get filename without extension
 */
export function getFileBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return filename;
  }
  return filename.substring(0, lastDot);
}

/**
 * Sanitize filename for safe storage
 * Removes special characters and limits length
 */
export function sanitizeFileName(
  filename: string,
  maxLength: number = 255,
): string {
  // Get base name and extension
  const ext = getFileExtension(filename);
  let baseName = getFileBaseName(filename);

  // Remove or replace unsafe characters
  baseName = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") // Replace unsafe chars
    .replace(/\.+/g, ".") // Collapse multiple dots
    .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
    .trim();

  // Ensure we have a name
  if (!baseName) {
    baseName = "file";
  }

  // Truncate if needed (accounting for extension)
  const maxBaseLength = maxLength - (ext ? ext.length + 1 : 0);
  if (baseName.length > maxBaseLength) {
    baseName = baseName.substring(0, maxBaseLength);
  }

  return ext ? `${baseName}.${ext}` : baseName;
}

/**
 * Generate a unique filename by appending a number if file already exists
 */
export function generateUniqueFileName(
  filename: string,
  existingNames: string[],
): string {
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));

  if (!existingSet.has(filename.toLowerCase())) {
    return filename;
  }

  const ext = getFileExtension(filename);
  const baseName = getFileBaseName(filename);
  let counter = 1;

  while (true) {
    const newName = ext
      ? `${baseName} (${counter}).${ext}`
      : `${baseName} (${counter})`;
    if (!existingSet.has(newName.toLowerCase())) {
      return newName;
    }
    counter++;
  }
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Check if file size is within allowed limit
 */
export function isFileSizeAllowed(
  sizeBytes: number,
  maxSizeBytes: number,
): boolean {
  return sizeBytes > 0 && sizeBytes <= maxSizeBytes;
}

/**
 * Check if file type is allowed
 */
export function isFileTypeAllowed(
  mimeType: string,
  allowedTypes: string[],
): boolean {
  const normalizedMime = mimeType.toLowerCase();

  return allowedTypes.some((allowed) => {
    const normalizedAllowed = allowed.toLowerCase();

    // Exact match
    if (normalizedMime === normalizedAllowed) {
      return true;
    }

    // Wildcard match (e.g., "image/*")
    if (normalizedAllowed.endsWith("/*")) {
      const prefix = normalizedAllowed.slice(0, -1);
      return normalizedMime.startsWith(prefix);
    }

    return false;
  });
}

/**
 * Validate file for upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxNameLength?: number;
  } = {},
): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes, maxNameLength = 255 } = options;

  // Check file name length
  if (file.name.length > maxNameLength) {
    return {
      valid: false,
      error: `File name too long (max ${maxNameLength} characters)`,
    };
  }

  // Check file size
  if (maxSize && !isFileSizeAllowed(file.size, maxSize)) {
    return {
      valid: false,
      error: `File too large (max ${formatFileSize(maxSize)})`,
    };
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    if (!isFileTypeAllowed(file.type, allowedTypes)) {
      return {
        valid: false,
        error: "File type not allowed",
      };
    }
  }

  return { valid: true };
}
