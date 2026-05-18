/**
 * Secure Metadata Module
 *
 * Handles encryption and protection of attachment metadata.
 * Metadata includes filename, MIME type, dimensions, duration,
 * and other properties that should remain confidential.
 *
 * Security considerations:
 * - Filenames can reveal sensitive information
 * - MIME types and sizes can be used for traffic analysis
 * - Metadata is encrypted alongside content
 * - Thumbnails are treated as sensitive data
 */

import {
  generateRandomBytes,
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,
  hash256,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  bytesToString,
  KEY_LENGTH,
} from "./crypto";
import { type AttachmentKey } from "./attachment-encryption";

// ============================================================================
// Constants
// ============================================================================

/** Maximum filename length (bytes) */
export const MAX_FILENAME_LENGTH = 255;

/** Maximum MIME type length */
export const MAX_MIME_TYPE_LENGTH = 127;

/** Supported metadata version */
export const METADATA_VERSION = 1;

/** Maximum metadata size (64KB) */
export const MAX_METADATA_SIZE = 64 * 1024;

/** Maximum thumbnail size (256KB) */
export const MAX_THUMBNAIL_SIZE = 256 * 1024;

// ============================================================================
// Types
// ============================================================================

/**
 * Image-specific metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  colorSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
}

/**
 * Video-specific metadata
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number; // seconds
  frameRate?: number;
  codec?: string;
  hasAudio?: boolean;
}

/**
 * Audio-specific metadata
 */
export interface AudioMetadata {
  duration: number; // seconds
  sampleRate?: number;
  channels?: number;
  codec?: string;
  bitrate?: number;
}

/**
 * Document-specific metadata
 */
export interface DocumentMetadata {
  pageCount?: number;
  author?: string;
  title?: string;
  createdAt?: number;
  modifiedAt?: number;
}

/**
 * Attachment metadata (plaintext)
 */
export interface AttachmentMetadata {
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Creation timestamp */
  createdAt: number;
  /** Modification timestamp (if different) */
  modifiedAt?: number;
  /** Type-specific metadata */
  image?: ImageMetadata;
  video?: VideoMetadata;
  audio?: AudioMetadata;
  document?: DocumentMetadata;
  /** Custom metadata (limited) */
  custom?: Record<string, string | number | boolean>;
  /** Thumbnail data (small preview) */
  thumbnail?: ThumbnailData;
}

/**
 * Thumbnail data
 */
export interface ThumbnailData {
  /** Thumbnail image data (JPEG or WebP) */
  data: Uint8Array;
  /** MIME type of thumbnail */
  mimeType: "image/jpeg" | "image/webp";
  /** Thumbnail width */
  width: number;
  /** Thumbnail height */
  height: number;
}

/**
 * Encrypted metadata for storage/transmission
 */
export interface EncryptedMetadata {
  /** Encrypted metadata blob (base64) */
  encryptedData: string;
  /** IV used for encryption (base64) */
  iv: string;
  /** Metadata version */
  version: number;
  /** Hash of plaintext metadata (for verification) */
  metadataHash: string;
  /** Whether thumbnail is included */
  hasThumbnail: boolean;
  /** Encrypted thumbnail (separate for lazy loading) */
  encryptedThumbnail?: EncryptedThumbnail;
}

/**
 * Encrypted thumbnail
 */
export interface EncryptedThumbnail {
  /** Encrypted thumbnail data (base64) */
  encryptedData: string;
  /** IV used for encryption (base64) */
  iv: string;
  /** Original width */
  width: number;
  /** Original height */
  height: number;
  /** Hash of plaintext thumbnail */
  thumbnailHash: string;
}

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  /** Strip file extension from filename */
  stripExtension?: boolean;
  /** Anonymize filename */
  anonymizeFilename?: boolean;
  /** Strip custom metadata */
  stripCustomMetadata?: boolean;
  /** Strip timestamps */
  stripTimestamps?: boolean;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates a filename for security
 */
export function validateFilename(filename: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = filename;

  // Check length
  if (filename.length > MAX_FILENAME_LENGTH) {
    errors.push("Filename too long");
    sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
  }

  // Remove path separators
  if (sanitized.includes("/") || sanitized.includes("\\")) {
    errors.push("Filename contains path separators");
    sanitized = sanitized.replace(/[/\\]/g, "_");
  }

  // Remove null bytes
  if (sanitized.includes("\0")) {
    errors.push("Filename contains null bytes");
    sanitized = sanitized.replace(/\0/g, "");
  }

  // Check for directory traversal attempts
  if (sanitized.includes("..")) {
    errors.push("Filename contains directory traversal");
    sanitized = sanitized.replace(/\.\./g, "_");
  }

  // Remove control characters
  const controlCharsRegex = /[\x00-\x1f\x7f]/g;
  if (controlCharsRegex.test(sanitized)) {
    errors.push("Filename contains control characters");
    sanitized = sanitized.replace(controlCharsRegex, "");
  }

  // Check for empty filename after sanitization
  if (sanitized.length === 0) {
    errors.push("Filename is empty after sanitization");
    sanitized = "unnamed_file";
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Validates a MIME type
 */
export function validateMimeType(mimeType: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = mimeType.toLowerCase().trim();

  // Check length
  if (sanitized.length > MAX_MIME_TYPE_LENGTH) {
    errors.push("MIME type too long");
    sanitized = sanitized.substring(0, MAX_MIME_TYPE_LENGTH);
  }

  // Check format (type/subtype)
  const mimeRegex =
    /^[a-z0-9][a-z0-9!#$&\-^_.+]*\/[a-z0-9][a-z0-9!#$&\-^_.+]*$/;
  if (!mimeRegex.test(sanitized)) {
    errors.push("Invalid MIME type format");
    sanitized = "application/octet-stream";
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Validates complete metadata
 */
export function validateMetadata(metadata: AttachmentMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate filename
  const filenameResult = validateFilename(metadata.filename);
  if (!filenameResult.valid) {
    errors.push(...filenameResult.errors.map((e) => `filename: ${e}`));
  }

  // Validate MIME type
  const mimeResult = validateMimeType(metadata.mimeType);
  if (!mimeResult.valid) {
    errors.push(...mimeResult.errors.map((e) => `mimeType: ${e}`));
  }

  // Validate size
  if (metadata.size < 0) {
    errors.push("size: must be non-negative");
  }

  // Validate timestamps
  if (metadata.createdAt < 0) {
    errors.push("createdAt: invalid timestamp");
  }

  if (metadata.modifiedAt !== undefined && metadata.modifiedAt < 0) {
    errors.push("modifiedAt: invalid timestamp");
  }

  // Validate image metadata
  if (metadata.image) {
    if (metadata.image.width <= 0 || metadata.image.height <= 0) {
      errors.push("image: invalid dimensions");
    }
  }

  // Validate video metadata
  if (metadata.video) {
    if (metadata.video.width <= 0 || metadata.video.height <= 0) {
      errors.push("video: invalid dimensions");
    }
    if (metadata.video.duration < 0) {
      errors.push("video: invalid duration");
    }
  }

  // Validate audio metadata
  if (metadata.audio) {
    if (metadata.audio.duration < 0) {
      errors.push("audio: invalid duration");
    }
  }

  // Validate thumbnail
  if (metadata.thumbnail) {
    if (metadata.thumbnail.data.length > MAX_THUMBNAIL_SIZE) {
      errors.push("thumbnail: exceeds maximum size");
    }
    if (metadata.thumbnail.width <= 0 || metadata.thumbnail.height <= 0) {
      errors.push("thumbnail: invalid dimensions");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitizes metadata, removing potentially dangerous content
 */
export function sanitizeMetadata(
  metadata: AttachmentMetadata,
  options: SanitizationOptions = {},
): AttachmentMetadata {
  const sanitized: AttachmentMetadata = { ...metadata };

  // Sanitize filename
  const filenameResult = validateFilename(metadata.filename);
  sanitized.filename = filenameResult.sanitized;

  // Optionally strip extension
  if (options.stripExtension) {
    const lastDot = sanitized.filename.lastIndexOf(".");
    if (lastDot > 0) {
      sanitized.filename = sanitized.filename.substring(0, lastDot);
    }
  }

  // Optionally anonymize filename
  if (options.anonymizeFilename) {
    const extension = sanitized.filename.includes(".")
      ? sanitized.filename.substring(sanitized.filename.lastIndexOf("."))
      : "";
    sanitized.filename = `file_${bytesToBase64(generateRandomBytes(6))}${extension}`;
  }

  // Sanitize MIME type
  const mimeResult = validateMimeType(metadata.mimeType);
  sanitized.mimeType = mimeResult.sanitized;

  // Optionally strip custom metadata
  if (options.stripCustomMetadata) {
    delete sanitized.custom;
  }

  // Optionally strip timestamps
  if (options.stripTimestamps) {
    sanitized.createdAt = 0;
    delete sanitized.modifiedAt;
    if (sanitized.document) {
      delete sanitized.document.createdAt;
      delete sanitized.document.modifiedAt;
    }
  }

  // Sanitize document metadata
  if (sanitized.document) {
    if (sanitized.document.author) {
      sanitized.document.author = sanitized.document.author.substring(0, 255);
    }
    if (sanitized.document.title) {
      sanitized.document.title = sanitized.document.title.substring(0, 255);
    }
  }

  return sanitized;
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serializes metadata to bytes
 */
function serializeMetadata(metadata: AttachmentMetadata): Uint8Array {
  // Remove thumbnail from serialization (handled separately)
  const { thumbnail, ...metadataWithoutThumbnail } = metadata;

  const json = JSON.stringify(metadataWithoutThumbnail);
  const bytes = stringToBytes(json);

  if (bytes.length > MAX_METADATA_SIZE) {
    throw new Error(
      `Metadata too large: ${bytes.length} bytes (max: ${MAX_METADATA_SIZE})`,
    );
  }

  return bytes;
}

/**
 * Deserializes metadata from bytes
 */
function deserializeMetadata(
  data: Uint8Array,
): Omit<AttachmentMetadata, "thumbnail"> {
  const json = bytesToString(data);
  return JSON.parse(json);
}

// ============================================================================
// Encryption
// ============================================================================

/**
 * Encrypts attachment metadata
 *
 * @param metadata - The metadata to encrypt
 * @param key - The encryption key (attachment key or derived key)
 * @returns Encrypted metadata
 */
export async function encryptMetadata(
  metadata: AttachmentMetadata,
  key: Uint8Array | AttachmentKey,
): Promise<EncryptedMetadata> {
  const keyBytes = "key" in key ? key.key : key;

  // Validate and sanitize metadata
  const validation = validateMetadata(metadata);
  if (!validation.valid) {
    throw new Error(`Invalid metadata: ${validation.errors.join(", ")}`);
  }

  const sanitized = sanitizeMetadata(metadata);

  // Serialize metadata (without thumbnail)
  const metadataBytes = serializeMetadata(sanitized);

  // Calculate hash of plaintext metadata
  const metadataHash = bytesToBase64(hash256(metadataBytes));

  // Encrypt metadata
  const { ciphertext, iv } = await encryptAESGCM(metadataBytes, keyBytes);

  // Build result
  const result: EncryptedMetadata = {
    encryptedData: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    version: METADATA_VERSION,
    metadataHash,
    hasThumbnail: !!metadata.thumbnail,
  };

  // Encrypt thumbnail separately if present
  if (metadata.thumbnail) {
    result.encryptedThumbnail = await encryptThumbnail(
      metadata.thumbnail,
      keyBytes,
    );
  }

  return result;
}

/**
 * Decrypts attachment metadata
 *
 * @param encryptedMetadata - The encrypted metadata
 * @param key - The decryption key
 * @returns Decrypted metadata
 */
export async function decryptMetadata(
  encryptedMetadata: EncryptedMetadata,
  key: Uint8Array | AttachmentKey,
): Promise<AttachmentMetadata> {
  const keyBytes = "key" in key ? key.key : key;

  // Check version
  if (encryptedMetadata.version !== METADATA_VERSION) {
    throw new Error(
      `Unsupported metadata version: ${encryptedMetadata.version}`,
    );
  }

  // Decrypt metadata
  const ciphertext = base64ToBytes(encryptedMetadata.encryptedData);
  const iv = base64ToBytes(encryptedMetadata.iv);

  const metadataBytes = await decryptAESGCM(ciphertext, keyBytes, iv);

  // Verify hash
  const computedHash = bytesToBase64(hash256(metadataBytes));
  if (computedHash !== encryptedMetadata.metadataHash) {
    throw new Error("Metadata hash verification failed");
  }

  // Deserialize
  const metadata = deserializeMetadata(metadataBytes) as AttachmentMetadata;

  // Decrypt thumbnail if present
  if (encryptedMetadata.hasThumbnail && encryptedMetadata.encryptedThumbnail) {
    metadata.thumbnail = await decryptThumbnail(
      encryptedMetadata.encryptedThumbnail,
      keyBytes,
    );
  }

  return metadata;
}

// ============================================================================
// Thumbnail Operations
// ============================================================================

/**
 * Encrypts a thumbnail
 */
export async function encryptThumbnail(
  thumbnail: ThumbnailData,
  key: Uint8Array,
): Promise<EncryptedThumbnail> {
  if (thumbnail.data.length > MAX_THUMBNAIL_SIZE) {
    throw new Error(`Thumbnail too large: ${thumbnail.data.length} bytes`);
  }

  // Calculate hash
  const thumbnailHash = bytesToBase64(hash256(thumbnail.data));

  // Encrypt
  const { ciphertext, iv } = await encryptAESGCM(thumbnail.data, key);

  return {
    encryptedData: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    width: thumbnail.width,
    height: thumbnail.height,
    thumbnailHash,
  };
}

/**
 * Decrypts a thumbnail
 */
export async function decryptThumbnail(
  encryptedThumbnail: EncryptedThumbnail,
  key: Uint8Array,
): Promise<ThumbnailData> {
  // Decrypt
  const ciphertext = base64ToBytes(encryptedThumbnail.encryptedData);
  const iv = base64ToBytes(encryptedThumbnail.iv);

  const data = await decryptAESGCM(ciphertext, key, iv);

  // Verify hash
  const computedHash = bytesToBase64(hash256(data));
  if (computedHash !== encryptedThumbnail.thumbnailHash) {
    throw new Error("Thumbnail hash verification failed");
  }

  // Detect MIME type from magic bytes
  let mimeType: "image/jpeg" | "image/webp" = "image/jpeg";
  if (data.length >= 4) {
    // RIFF....WEBP
    if (
      data[0] === 0x52 &&
      data[1] === 0x49 &&
      data[2] === 0x46 &&
      data[3] === 0x46
    ) {
      mimeType = "image/webp";
    }
  }

  return {
    data,
    mimeType,
    width: encryptedThumbnail.width,
    height: encryptedThumbnail.height,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates minimal metadata from a file
 */
export function createMinimalMetadata(
  filename: string,
  mimeType: string,
  size: number,
): AttachmentMetadata {
  return {
    filename,
    mimeType,
    size,
    createdAt: Date.now(),
  };
}

/**
 * Creates metadata from a File object (browser)
 */
export function createMetadataFromFile(file: File): AttachmentMetadata {
  return {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    createdAt: file.lastModified,
  };
}

/**
 * Extracts file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/json": ".json",
    "text/plain": ".txt",
    "text/html": ".html",
    "text/css": ".css",
    "text/javascript": ".js",
  };

  return mimeToExt[mimeType.toLowerCase()] || "";
}

/**
 * Detects MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";

  const extToMime: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    zip: "application/zip",
    json: "application/json",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
  };

  return extToMime[ext] || "application/octet-stream";
}

/**
 * Checks if a MIME type is an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}

/**
 * Checks if a MIME type is a video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("video/");
}

/**
 * Checks if a MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("audio/");
}

/**
 * Gets a human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// ============================================================================
// Exports
// ============================================================================

export const secureMetadata = {
  // Validation
  validateFilename,
  validateMimeType,
  validateMetadata,

  // Sanitization
  sanitizeMetadata,

  // Encryption
  encryptMetadata,
  decryptMetadata,
  encryptThumbnail,
  decryptThumbnail,

  // Utilities
  createMinimalMetadata,
  createMetadataFromFile,
  getExtensionFromMimeType,
  getMimeTypeFromExtension,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
  formatFileSize,
};

export default secureMetadata;
