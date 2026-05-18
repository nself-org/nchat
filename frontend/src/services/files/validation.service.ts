/**
 * File Validation Service
 *
 * Provides comprehensive file validation including:
 * - Size limits based on user tier
 * - MIME type and extension validation
 * - Virus scanning (ClamAV, VirusTotal, or plugin backend)
 * - EXIF metadata stripping
 */

import { getFileTypeConfig, FILE_SERVICE_CONSTANTS } from "./config";
import type { FileTypeConfig } from "./types";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  warnings?: string[];
}

export interface FileValidationOptions {
  /** Maximum file size in bytes (overrides config) */
  maxSize?: number;
  /** Allowed MIME types (overrides config) */
  allowedTypes?: string[];
  /** Blocked MIME types (overrides config) */
  blockedTypes?: string[];
  /** Allowed extensions (overrides config) */
  allowedExtensions?: string[];
  /** Blocked extensions (overrides config) */
  blockedExtensions?: string[];
  /** Check for executable content */
  checkExecutable?: boolean;
  /** User tier for size limits */
  userTier?: "guest" | "member" | "premium" | "admin";
}

// ============================================================================
// Constants
// ============================================================================

/** Size limits by user tier */
export const SIZE_LIMITS = {
  guest: 5 * 1024 * 1024, // 5MB
  member: 25 * 1024 * 1024, // 25MB
  premium: 100 * 1024 * 1024, // 100MB
  admin: 500 * 1024 * 1024, // 500MB
} as const;

/** Dangerous MIME types */
const DANGEROUS_MIME_TYPES = [
  "application/x-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-ms-shortcut",
  "application/x-sh",
  "application/x-shellscript",
  "application/bat",
  "application/x-bat",
  "application/cmd",
  "application/x-cmd",
];

/** Dangerous file extensions */
const DANGEROUS_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "pif",
  "vbs",
  "vbe",
  "js",
  "jse",
  "ws",
  "wsf",
  "wsh",
  "ps1",
  "ps1xml",
  "ps2",
  "ps2xml",
  "psc1",
  "psc2",
  "msh",
  "msh1",
  "msh2",
  "mshxml",
  "msh1xml",
  "msh2xml",
  "scf",
  "lnk",
  "inf",
  "reg",
  "dll",
  "cpl",
  "msc",
  "jar",
];

/** Known safe MIME types for common file categories */
export const SAFE_MIME_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/avif",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/ogg",
    "video/3gpp",
    "video/3gpp2",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/flac",
    "audio/x-m4a",
    "audio/mp4",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/html",
    "application/rtf",
  ],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-bzip2",
  ],
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a file against configuration and options
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {},
): ValidationResult {
  const config = getFileTypeConfig();
  const warnings: string[] = [];

  // Determine max size based on user tier
  const maxSize = options.maxSize || SIZE_LIMITS[options.userTier || "member"];

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(maxSize)}`,
      errorCode: "FILE_TOO_LARGE",
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
      errorCode: "FILE_EMPTY",
    };
  }

  // Get extension
  const extension = getExtension(file.name);

  // Check blocked extensions
  const blockedExtensions =
    options.blockedExtensions ||
    config.blockedExtensions ||
    DANGEROUS_EXTENSIONS;
  if (blockedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Files with .${extension} extension are not allowed`,
      errorCode: "BLOCKED_EXTENSION",
    };
  }

  // Check allowed extensions (if specified)
  const allowedExtensions =
    options.allowedExtensions || config.allowedExtensions;
  if (allowedExtensions && allowedExtensions.length > 0) {
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Only ${allowedExtensions.join(", ")} files are allowed`,
        errorCode: "EXTENSION_NOT_ALLOWED",
      };
    }
  }

  // Check blocked MIME types
  const blockedTypes =
    options.blockedTypes || config.blockedMimeTypes || DANGEROUS_MIME_TYPES;
  if (blockedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "This file type is not allowed",
      errorCode: "BLOCKED_MIME_TYPE",
    };
  }

  // Check allowed MIME types (if specified)
  const allowedTypes = options.allowedTypes || config.allowedMimeTypes;
  if (allowedTypes && allowedTypes.length > 0) {
    const typeAllowed = allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", "/"));
      }
      return file.type === type;
    });

    if (!typeAllowed) {
      return {
        valid: false,
        error: "This file type is not allowed",
        errorCode: "MIME_TYPE_NOT_ALLOWED",
      };
    }
  }

  // Check for executable content
  if (options.checkExecutable !== false) {
    const execCheck = checkExecutableContent(file.type, extension);
    if (!execCheck.valid) {
      return execCheck;
    }
  }

  // Add warnings for potentially problematic files
  if (file.type === "application/octet-stream") {
    warnings.push("File type could not be determined");
  }

  if (file.name.includes("..")) {
    warnings.push("Filename contains path traversal characters");
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if file contains executable content
 */
function checkExecutableContent(
  mimeType: string,
  extension: string,
): ValidationResult {
  // Check for dangerous MIME types
  if (DANGEROUS_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: "Executable files are not allowed",
      errorCode: "EXECUTABLE_CONTENT",
    };
  }

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
    return {
      valid: false,
      error: "Executable files are not allowed",
      errorCode: "EXECUTABLE_EXTENSION",
    };
  }

  return { valid: true };
}

/**
 * Validate file for image uploads
 */
export function validateImageFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: string[];
    userTier?: "guest" | "member" | "premium" | "admin";
  } = {},
): ValidationResult {
  const allowedTypes = options.allowedFormats?.map((f) => `image/${f}`) || [
    ...SAFE_MIME_TYPES.image,
  ];

  return validateFile(file, {
    ...options,
    allowedTypes,
    checkExecutable: true,
  });
}

/**
 * Validate file for video uploads
 */
export function validateVideoFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: string[];
    userTier?: "guest" | "member" | "premium" | "admin";
  } = {},
): ValidationResult {
  const allowedTypes = options.allowedFormats?.map((f) => `video/${f}`) || [
    ...SAFE_MIME_TYPES.video,
  ];

  // Videos typically need larger size limits
  const maxSize =
    options.maxSize || SIZE_LIMITS[options.userTier || "member"] * 2;

  return validateFile(file, {
    ...options,
    maxSize,
    allowedTypes,
    checkExecutable: true,
  });
}

/**
 * Validate file for document uploads
 */
export function validateDocumentFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: string[];
    userTier?: "guest" | "member" | "premium" | "admin";
  } = {},
): ValidationResult {
  const allowedTypes = options.allowedFormats || [...SAFE_MIME_TYPES.document];

  return validateFile(file, {
    ...options,
    allowedTypes,
    checkExecutable: true,
  });
}

// ============================================================================
// Virus Scanning Integration
// ============================================================================

import {
  getVirusScannerService,
  type VirusScanResult,
  type ScannerHealth,
} from "./virus-scanner.service";

/**
 * Scan a file for viruses using the configured scanner backend
 *
 * Supports multiple backends:
 * - ClamAV (local/remote clamd server)
 * - VirusTotal API
 * - File-processing plugin scanner
 *
 * Configuration via environment variables:
 * - FILE_ENABLE_VIRUS_SCAN: Enable/disable scanning (default: false)
 * - CLAMAV_HOST, CLAMAV_PORT: ClamAV server configuration
 * - VIRUSTOTAL_API_KEY: VirusTotal API key
 * - FILE_PROCESSING_URL: Plugin scanner URL
 *
 * @example
 * ```typescript
 * const result = await scanFileForViruses(file, { fileName: 'document.pdf' })
 * if (!result.clean) {
 *   console.log('Threats found:', result.threats)
 *   // Handle infected file
 * }
 * ```
 */
export async function scanFileForViruses(
  file: File | Buffer | ArrayBuffer,
  options: {
    timeout?: number;
    fileName?: string;
    fileId?: string;
  } = {},
): Promise<{
  scanned: boolean;
  clean: boolean;
  threats: string[];
  error?: string;
  backend?: string;
  scanDuration?: number;
  shouldBlock?: boolean;
}> {
  const scanner = getVirusScannerService();
  const config = scanner.getConfigSummary();

  // Log status for debugging
  if (!config.enabled) {
    logger.debug("[FileValidation] Virus scanning is disabled");
  }

  try {
    const result = await scanner.scanFile(file, {
      fileName: options.fileName,
      fileId: options.fileId,
      timeout: options.timeout,
    });

    // Log warning if scanner is unavailable but scanning is enabled
    if (config.enabled && !result.scanned && config.backend !== "none") {
      logger.warn(
        "[FileValidation] Virus scanning failed - scanner unavailable",
        {
          backend: config.backend,
          error: result.error,
        },
      );
    }

    return {
      scanned: result.scanned,
      clean: result.clean,
      threats: result.threats,
      error: result.error,
      backend: result.backend,
      scanDuration: result.scanDuration,
      shouldBlock: result.shouldBlock,
    };
  } catch (error) {
    logger.error("[FileValidation] Virus scan error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      scanned: false,
      clean: true, // Default to clean on error (configurable)
      threats: [],
      error: error instanceof Error ? error.message : "Scan failed",
      shouldBlock: config.blockOnScannerUnavailable,
    };
  }
}

/**
 * Get the current health status of the virus scanner
 */
export async function getVirusScannerHealth(): Promise<ScannerHealth> {
  const scanner = getVirusScannerService();
  return scanner.checkHealth();
}

/**
 * Get virus scanner configuration summary (safe for logging)
 */
export function getVirusScannerConfig(): {
  enabled: boolean;
  backend: string;
  fallbackBackend?: string;
  blockOnScannerUnavailable: boolean;
} {
  const scanner = getVirusScannerService();
  return scanner.getConfigSummary();
}

/**
 * Quarantine an infected file
 */
export async function quarantineInfectedFile(
  fileId: string,
  storagePath: string,
  threats: string[],
): Promise<{ quarantined: boolean; quarantinePath?: string; error?: string }> {
  const scanner = getVirusScannerService();
  return scanner.quarantineFile(fileId, storagePath, threats);
}

// ============================================================================
// EXIF Stripping
// ============================================================================

/**
 * Sensitive EXIF fields that should be stripped for privacy
 */
export const SENSITIVE_EXIF_FIELDS = [
  // GPS/Location data
  "gps",
  "GPSLatitude",
  "GPSLongitude",
  "GPSAltitude",
  "GPSTimeStamp",
  "GPSDateStamp",
  "GPSProcessingMethod",
  "GPSAreaInformation",
  "GPSDestLatitude",
  "GPSDestLongitude",
  // Device information
  "Make",
  "Model",
  "Software",
  "HostComputer",
  "SerialNumber",
  "LensSerialNumber",
  "BodySerialNumber",
  "CameraSerialNumber",
  "InternalSerialNumber",
  "DeviceSettingDescription",
  // Personal information
  "Artist",
  "Copyright",
  "ImageDescription",
  "UserComment",
  "OwnerName",
  "CameraOwnerName",
  "Author",
  // Date/time (can be used for tracking)
  "DateTimeOriginal",
  "CreateDate",
  "ModifyDate",
  "DateTimeDigitized",
  "SubSecTimeOriginal",
  "SubSecTimeDigitized",
  // Other potentially sensitive
  "MakerNote",
  "ImageUniqueID",
  "DocumentName",
  "PageName",
  "XPAuthor",
  "XPComment",
  "XPKeywords",
  "XPSubject",
  "XPTitle",
] as const;

export interface ExifStrippingOptions {
  /** Which fields to strip (default: all sensitive fields) */
  fieldsToStrip?: string[];
  /** Preserve orientation for correct image display */
  preserveOrientation?: boolean;
  /** Preserve color profile (ICC) for accurate colors */
  preserveColorProfile?: boolean;
  /** Log the stripped metadata for debugging */
  logStrippedData?: boolean;
}

export interface ExifStrippingResult {
  /** The processed file with EXIF stripped */
  file: File;
  /** The processed buffer (for server-side use) */
  buffer?: Buffer;
  /** Whether stripping was performed */
  stripped: boolean;
  /** Fields that were stripped */
  strippedFields?: string[];
  /** Original metadata before stripping (if requested) */
  originalMetadata?: Record<string, unknown>;
  /** Any error that occurred */
  error?: string;
  /** Processing time in milliseconds */
  processingTime?: number;
}

/**
 * Check if the current environment supports sharp (Node.js only)
 */
function isSharpAvailable(): boolean {
  if (typeof window !== "undefined") {
    return false; // Browser environment
  }
  try {
    require.resolve("sharp");
    return true;
  } catch {
    return false;
  }
}

/**
 * Strip EXIF metadata from image files using sharp
 *
 * Removes sensitive metadata including:
 * - GPS/location data
 * - Device information (make, model, serial numbers)
 * - Personal information (artist, copyright, comments)
 * - Date/time stamps
 * - Maker notes
 *
 * @example
 * ```typescript
 * const result = await stripExifMetadata(imageFile)
 * if (result.stripped) {
 *   console.log('Stripped fields:', result.strippedFields)
 *   // Use result.file for the cleaned image
 * }
 * ```
 */
export async function stripExifMetadata(
  file: File | Buffer | ArrayBuffer,
  options: ExifStrippingOptions = {},
): Promise<ExifStrippingResult> {
  const startTime = Date.now();
  const {
    preserveOrientation = true,
    preserveColorProfile = true,
    logStrippedData = false,
  } = options;

  // Determine file type
  let mimeType: string;
  let fileName: string;

  if (file instanceof File) {
    mimeType = file.type;
    fileName = file.name;
  } else {
    // For Buffer/ArrayBuffer, assume JPEG unless we can detect otherwise
    mimeType = "image/jpeg";
    fileName = "image.jpg";
  }

  // Check if file is an image that might contain EXIF
  const exifSupportedTypes = [
    "image/jpeg",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/webp",
  ];

  // Helper to create a File from various input types
  const createFile = (input: File | Buffer | ArrayBuffer): File => {
    if (input instanceof File) return input;
    // Convert Buffer/ArrayBuffer to Uint8Array for File constructor
    const uint8Array =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input);
    return new File([uint8Array], fileName, { type: mimeType });
  };

  if (
    !exifSupportedTypes.some((type) =>
      mimeType.toLowerCase().includes(type.split("/")[1]),
    )
  ) {
    return {
      file: createFile(file),
      stripped: false,
      processingTime: Date.now() - startTime,
    };
  }

  // Check if we're in a Node.js environment with sharp available
  if (!isSharpAvailable()) {
    logger.warn(
      "[FileValidation] EXIF stripping requires sharp (Node.js only). Skipping in browser.",
    );
    return {
      file: createFile(file),
      stripped: false,
      error: "EXIF stripping only available in Node.js environment",
      processingTime: Date.now() - startTime,
    };
  }

  try {
    // Dynamic import to avoid issues in browser builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpModule = require("sharp");
    // Handle both CommonJS default export and direct export
    const sharp: (input: Buffer) => import("sharp").Sharp =
      typeof sharpModule === "function" ? sharpModule : sharpModule.default;

    // Convert input to Buffer
    let inputBuffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else if (file instanceof ArrayBuffer) {
      inputBuffer = Buffer.from(file);
    } else {
      inputBuffer = file;
    }

    // Get original metadata for logging/returning
    const sharpInstance = sharp(inputBuffer);
    const originalMetadata = await sharpInstance.metadata();

    // Extract fields that will be stripped (for reporting)
    const strippedFields: string[] = [];

    if (originalMetadata.exif) {
      // We're stripping all EXIF, so add all sensitive fields that might exist
      SENSITIVE_EXIF_FIELDS.forEach((field) => {
        strippedFields.push(field);
      });
    }

    // Create a new sharp instance for processing
    const processedSharp = sharp(inputBuffer);

    // Configure sharp to strip metadata
    // By default, sharp removes all metadata when you just process the image
    // We need to explicitly handle what to keep

    let outputBuffer: Buffer;

    if (preserveOrientation && preserveColorProfile) {
      // Rotate based on EXIF orientation, then strip all metadata
      // The rotation "applies" the orientation so we don't need the EXIF anymore
      // Use withMetadata() to preserve a web-friendly sRGB ICC profile
      outputBuffer = await processedSharp
        .rotate() // Auto-rotate based on EXIF orientation
        .withMetadata() // Preserves sRGB color profile by default
        .toBuffer();
    } else if (preserveOrientation) {
      // Just rotate and strip everything (including color profile)
      outputBuffer = await processedSharp.rotate().toBuffer();
    } else if (preserveColorProfile) {
      // Keep color profile (sRGB) but strip everything else
      outputBuffer = await processedSharp.withMetadata().toBuffer();
    } else {
      // Strip everything
      outputBuffer = await processedSharp.toBuffer();
    }

    // Verify metadata was stripped
    const verifySharp = sharp(outputBuffer);
    const newMetadata = await verifySharp.metadata();

    if (logStrippedData) {
      logger.info("[FileValidation] EXIF metadata stripped", {
        originalHadExif: !!originalMetadata.exif,
        strippedHasExif: !!newMetadata.exif,
        strippedFields: strippedFields.length,
        preservedOrientation: preserveOrientation,
        preservedColorProfile: preserveColorProfile && !!newMetadata.icc,
      });
    }

    // Create a new File from the processed buffer
    const processedFile = new File([new Uint8Array(outputBuffer)], fileName, {
      type: mimeType,
    });

    return {
      file: processedFile,
      buffer: outputBuffer,
      stripped: true,
      strippedFields,
      originalMetadata: logStrippedData
        ? {
            format: originalMetadata.format,
            width: originalMetadata.width,
            height: originalMetadata.height,
            hasExif: !!originalMetadata.exif,
            hasIcc: !!originalMetadata.icc,
            orientation: originalMetadata.orientation,
          }
        : undefined,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("[FileValidation] Failed to strip EXIF metadata", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      file: createFile(file),
      stripped: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to strip EXIF metadata",
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Strip EXIF metadata from a Buffer (server-side convenience function)
 */
export async function stripExifFromBuffer(
  buffer: Buffer,
  mimeType: string = "image/jpeg",
  options: ExifStrippingOptions = {},
): Promise<{
  buffer: Buffer;
  stripped: boolean;
  error?: string;
}> {
  const result = await stripExifMetadata(buffer, options);
  return {
    buffer: result.buffer || buffer,
    stripped: result.stripped,
    error: result.error,
  };
}

/**
 * Check if an image contains EXIF data
 */
export async function hasExifData(file: File | Buffer): Promise<boolean> {
  if (!isSharpAvailable()) {
    logger.warn(
      "[FileValidation] EXIF detection requires sharp (Node.js only)",
    );
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpModule = require("sharp");
    const sharp: (input: Buffer) => import("sharp").Sharp =
      typeof sharpModule === "function" ? sharpModule : sharpModule.default;

    let inputBuffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    const sharpInstance = sharp(inputBuffer);
    const metadata = await sharpInstance.metadata();

    return !!metadata.exif;
  } catch {
    return false;
  }
}

/**
 * Extract EXIF metadata from an image (for debugging/auditing)
 */
export async function extractExifMetadata(file: File | Buffer): Promise<{
  hasExif: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}> {
  if (!isSharpAvailable()) {
    return {
      hasExif: false,
      error: "EXIF extraction requires sharp (Node.js only)",
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpModule = require("sharp");
    const sharp: (input: Buffer) => import("sharp").Sharp =
      typeof sharpModule === "function" ? sharpModule : sharpModule.default;

    let inputBuffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
    } else {
      inputBuffer = file;
    }

    const sharpInstance = sharp(inputBuffer);
    const metadata = await sharpInstance.metadata();

    return {
      hasExif: !!metadata.exif,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        chromaSubsampling: metadata.chromaSubsampling,
        isProgressive: metadata.isProgressive,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        exifSize: metadata.exif?.length,
        iccSize: metadata.icc?.length,
      },
    };
  } catch (error) {
    return {
      hasExif: false,
      error:
        error instanceof Error ? error.message : "Failed to extract metadata",
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get file extension from filename
 */
export function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Get MIME type category
 */
export function getMimeCategory(
  mimeType: string,
): "image" | "video" | "audio" | "document" | "archive" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";

  if (
    SAFE_MIME_TYPES.document.includes(mimeType as any) ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return "document";
  }

  if (
    SAFE_MIME_TYPES.archive.includes(mimeType as any) ||
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("compressed")
  ) {
    return "archive";
  }

  return "other";
}

/**
 * Check if MIME type is safe
 */
export function isSafeMimeType(mimeType: string): boolean {
  const allSafe = [
    ...SAFE_MIME_TYPES.image,
    ...SAFE_MIME_TYPES.video,
    ...SAFE_MIME_TYPES.audio,
    ...SAFE_MIME_TYPES.document,
    ...SAFE_MIME_TYPES.archive,
  ];

  return (
    allSafe.includes(mimeType as any) ||
    !DANGEROUS_MIME_TYPES.includes(mimeType)
  );
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars with underscore
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^[._-]+/, "") // Remove leading dots, underscores, dashes
    .replace(/[._-]+$/, "") // Remove trailing dots, underscores, dashes
    .substring(0, 200); // Limit length
}

/**
 * Generate safe unique filename
 */
export function generateSafeFilename(
  originalName: string,
  fileId: string,
): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = getExtension(sanitized);

  if (ext) {
    const nameWithoutExt = sanitized.slice(0, -(ext.length + 1));
    return `${fileId}-${nameWithoutExt}.${ext}`;
  }

  return `${fileId}-${sanitized}`;
}

// ============================================================================
// Service Instance
// ============================================================================

/**
 * Validation Service class for API compatibility
 */
class ValidationService {
  validateFile(
    file: { name: string; type: string; size: number },
    options?: FileValidationOptions,
  ): ValidationResult {
    // Convert plain object to File-like object for validation
    const fileObject = new File([], file.name, { type: file.type });
    Object.defineProperty(fileObject, "size", { value: file.size });
    return validateFile(fileObject, options);
  }

  validateImageFile(
    file: { name: string; type: string; size: number },
    options?: {
      maxSize?: number;
      allowedFormats?: string[];
      userTier?: "guest" | "member" | "premium" | "admin";
    },
  ): ValidationResult {
    const fileObject = new File([], file.name, { type: file.type });
    Object.defineProperty(fileObject, "size", { value: file.size });
    return validateImageFile(fileObject, options);
  }

  validateVideoFile(
    file: { name: string; type: string; size: number },
    options?: {
      maxSize?: number;
      allowedFormats?: string[];
      userTier?: "guest" | "member" | "premium" | "admin";
    },
  ): ValidationResult {
    const fileObject = new File([], file.name, { type: file.type });
    Object.defineProperty(fileObject, "size", { value: file.size });
    return validateVideoFile(fileObject, options);
  }

  validateDocumentFile(
    file: { name: string; type: string; size: number },
    options?: {
      maxSize?: number;
      allowedFormats?: string[];
      userTier?: "guest" | "member" | "premium" | "admin";
    },
  ): ValidationResult {
    const fileObject = new File([], file.name, { type: file.type });
    Object.defineProperty(fileObject, "size", { value: file.size });
    return validateDocumentFile(fileObject, options);
  }
}

let validationServiceInstance: ValidationService | null = null;

/**
 * Get validation service singleton
 */
export function getValidationService(): ValidationService {
  if (!validationServiceInstance) {
    validationServiceInstance = new ValidationService();
  }
  return validationServiceInstance;
}
