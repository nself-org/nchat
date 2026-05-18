/**
 * Storage Upload Utilities
 *
 * This module handles file uploads to MinIO/S3-compatible storage via Nhost.
 * It supports presigned URL workflow for secure uploads.
 */

import { nhost } from "@/lib/nhost";

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  /** Bucket name (defaults to 'default') */
  bucketId?: string;
  /** Custom file name (defaults to original) */
  name?: string;
  /** File path in bucket */
  path?: string;
  /** Upload progress callback */
  onProgress?: (progress: UploadProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface UploadProgress {
  /** Bytes uploaded */
  loaded: number;
  /** Total bytes */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

export interface UploadResult {
  /** File ID in storage */
  id: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** URL to access the file */
  url: string;
  /** Bucket ID */
  bucketId: string;
}

export interface UploadError {
  code:
    | "UPLOAD_FAILED"
    | "FILE_TOO_LARGE"
    | "INVALID_TYPE"
    | "CANCELED"
    | "NETWORK_ERROR";
  message: string;
  details?: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default bucket for file uploads */
export const DEFAULT_BUCKET = "default";

/** Maximum file size in bytes (default: 50MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Allowed MIME types by category */
export const ALLOWED_MIME_TYPES = {
  images: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
  ],
  videos: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/flac",
  ],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/markdown",
    "text/csv",
  ],
  archives: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/gzip",
    "application/x-tar",
  ],
  code: [
    "text/javascript",
    "application/javascript",
    "text/typescript",
    "application/json",
    "text/html",
    "text/css",
    "text/xml",
    "application/xml",
    "text/x-python",
    "text/x-java",
    "text/x-c",
    "text/x-cpp",
  ],
} as const;

/** All allowed MIME types */
export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.videos,
  ...ALLOWED_MIME_TYPES.audio,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.archives,
  ...ALLOWED_MIME_TYPES.code,
];

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get file category based on MIME type
 */
export function getFileCategory(
  mimeType: string,
): "image" | "video" | "audio" | "document" | "archive" | "code" | "other" {
  if (ALLOWED_MIME_TYPES.images.includes(mimeType as never)) return "image";
  if (ALLOWED_MIME_TYPES.videos.includes(mimeType as never)) return "video";
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType as never)) return "audio";
  if (ALLOWED_MIME_TYPES.documents.includes(mimeType as never))
    return "document";
  if (ALLOWED_MIME_TYPES.archives.includes(mimeType as never)) return "archive";
  if (ALLOWED_MIME_TYPES.code.includes(mimeType as never)) return "code";
  return "other";
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  },
): { valid: boolean; error?: UploadError } {
  const maxSize = options?.maxSize ?? MAX_FILE_SIZE;
  const allowedTypes = options?.allowedTypes ?? ALL_ALLOWED_MIME_TYPES;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxSize)})`,
      },
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: "INVALID_TYPE",
        message: `File type "${file.type}" is not allowed`,
      },
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Get file extension from name
 */
export function getFileExtension(filename: string): string {
  if (!filename.includes(".")) return "";
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext || "";
}

/**
 * Generate a unique file name
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName}-${timestamp}-${random}${ext ? `.${ext}` : ""}`;
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

/**
 * Upload a file to storage using Nhost storage client
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { bucketId = DEFAULT_BUCKET, name, onProgress, signal } = options;

  // Validate file first
  const validation = validateFile(file);
  if (!validation.valid && validation.error) {
    throw validation.error;
  }

  // Check for cancellation
  if (signal?.aborted) {
    throw { code: "CANCELED", message: "Upload was canceled" } as UploadError;
  }

  try {
    // Use Nhost storage client
    const { fileMetadata, error } = await nhost.storage.upload({
      file,
      bucketId,
      name: name || file.name,
    });

    if (error) {
      throw {
        code: "UPLOAD_FAILED",
        message: error.message,
        details: error,
      } as UploadError;
    }

    if (!fileMetadata) {
      throw {
        code: "UPLOAD_FAILED",
        message: "No file metadata returned",
      } as UploadError;
    }

    // Simulate progress completion for Nhost (doesn't support real progress)
    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
    }

    // Get the public URL
    const url = nhost.storage.getPublicUrl({
      fileId: fileMetadata.id,
    });

    return {
      id: fileMetadata.id,
      name: fileMetadata.name || file.name,
      size: file.size,
      mimeType: file.type,
      url,
      bucketId,
    };
  } catch (err) {
    if ((err as UploadError).code) {
      throw err;
    }
    throw {
      code: "NETWORK_ERROR",
      message:
        err instanceof Error ? err.message : "Network error during upload",
      details: err,
    } as UploadError;
  }
}

/**
 * Upload a file using XMLHttpRequest for progress tracking
 * This provides real progress updates during upload
 */
export async function uploadFileWithProgress(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { bucketId = DEFAULT_BUCKET, name, onProgress, signal } = options;

  // Validate file first
  const validation = validateFile(file);
  if (!validation.valid && validation.error) {
    throw validation.error;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject({
          code: "CANCELED",
          message: "Upload was canceled",
        } as UploadError);
      });
    }

    // Track progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          const fileId =
            response.id || response.fileId || response.fileMetadata?.id;

          if (!fileId) {
            reject({
              code: "UPLOAD_FAILED",
              message: "No file ID in response",
              details: response,
            } as UploadError);
            return;
          }

          const url = nhost.storage.getPublicUrl({ fileId });

          resolve({
            id: fileId,
            name: name || file.name,
            size: file.size,
            mimeType: file.type,
            url,
            bucketId,
          });
        } catch {
          reject({
            code: "UPLOAD_FAILED",
            message: "Failed to parse response",
            details: xhr.responseText,
          } as UploadError);
        }
      } else {
        reject({
          code: "UPLOAD_FAILED",
          message: `Upload failed with status ${xhr.status}`,
          details: xhr.responseText,
        } as UploadError);
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject({
        code: "NETWORK_ERROR",
        message: "Network error during upload",
      } as UploadError);
    });

    // Prepare form data
    const formData = new FormData();
    formData.append("file", file);
    if (name) {
      formData.append("name", name);
    }
    formData.append("bucket-id", bucketId);

    // Get storage URL from nhost config
    const storageUrl = nhost.storage.url || "https://storage.localhost";

    // Send request
    xhr.open("POST", `${storageUrl}/v1/files`);

    // Add auth header if available
    const accessToken = nhost.auth.getAccessToken();
    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    xhr.send(formData);
  });
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions & {
    onFileProgress?: (fileIndex: number, progress: UploadProgress) => void;
    onFileComplete?: (fileIndex: number, result: UploadResult) => void;
    onFileError?: (fileIndex: number, error: UploadError) => void;
  } = {},
): Promise<{
  results: UploadResult[];
  errors: { index: number; error: UploadError }[];
}> {
  const results: UploadResult[] = [];
  const errors: { index: number; error: UploadError }[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadFileWithProgress(files[i], {
        ...options,
        onProgress: (progress) => {
          options.onFileProgress?.(i, progress);
          options.onProgress?.(progress);
        },
      });
      results.push(result);
      options.onFileComplete?.(i, result);
    } catch (err) {
      const uploadError = err as UploadError;
      errors.push({ index: i, error: uploadError });
      options.onFileError?.(i, uploadError);
    }
  }

  return { results, errors };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileId: string): Promise<void> {
  const { error } = await nhost.storage.delete({ fileId });

  if (error) {
    throw {
      code: "UPLOAD_FAILED",
      message: error.message,
      details: error,
    } as UploadError;
  }
}

/**
 * Get a download URL for a file
 */
export function getDownloadUrl(fileId: string): string {
  return nhost.storage.getPublicUrl({ fileId });
}

/**
 * Get a presigned URL for private file access
 */
export async function getPresignedUrl(fileId: string): Promise<string> {
  const { presignedUrl, error } = await nhost.storage.getPresignedUrl({
    fileId,
  });

  if (error) {
    throw {
      code: "UPLOAD_FAILED",
      message: error.message,
      details: error,
    } as UploadError;
  }

  return presignedUrl?.url || "";
}

/**
 * Create a blob URL for local preview before upload
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
