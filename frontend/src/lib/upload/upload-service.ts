/**
 * Upload Service - Handles file uploads to MinIO/S3 storage
 *
 * Provides functionality for:
 * - Getting presigned URLs for direct upload
 * - Uploading files with progress tracking
 * - Retry logic with exponential backoff
 * - Upload cancellation
 */

import {
  getFileType,
  generateImageThumbnail,
  generateVideoThumbnail,
} from "./file-utils";
import { FileType } from "@/stores/attachment-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UploadConfig {
  /** Base URL for the storage service */
  storageUrl: string;
  /** Authentication token */
  authToken?: string;
  /** Bucket name (defaults to 'uploads') */
  bucket?: string;
  /** Max retries for failed uploads */
  maxRetries?: number;
  /** Retry delay in ms (will be multiplied for exponential backoff) */
  retryDelay?: number;
  /** Chunk size for multipart uploads (5MB default) */
  chunkSize?: number;
  /** Whether to generate thumbnails for images/videos */
  generateThumbnails?: boolean;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileId: string;
  publicUrl: string;
  expiresAt: number;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: FileType;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface UploadProgressCallback {
  (progress: number, uploadedBytes: number, totalBytes: number): void;
}

export interface UploadOptions {
  /** Progress callback */
  onProgress?: UploadProgressCallback;
  /** AbortController signal for cancellation */
  signal?: AbortSignal;
  /** Custom file ID (generated if not provided) */
  fileId?: string;
  /** Custom path prefix */
  pathPrefix?: string;
  /** Custom metadata to include */
  metadata?: Record<string, string>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<UploadConfig, "authToken">> = {
  storageUrl:
    process.env.NEXT_PUBLIC_STORAGE_URL ||
    "http://storage.localhost/v1/storage",
  bucket: "uploads",
  maxRetries: 3,
  retryDelay: 1000,
  chunkSize: 5 * 1024 * 1024, // 5MB
  generateThumbnails: true,
};

// ============================================================================
// Upload Service Class
// ============================================================================

export class UploadService {
  private config: Required<Omit<UploadConfig, "authToken">> & {
    authToken?: string;
  };

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      storageUrl: config.storageUrl ?? DEFAULT_CONFIG.storageUrl,
      bucket: config.bucket ?? DEFAULT_CONFIG.bucket,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      retryDelay: config.retryDelay ?? DEFAULT_CONFIG.retryDelay,
      chunkSize: config.chunkSize ?? DEFAULT_CONFIG.chunkSize,
      generateThumbnails:
        config.generateThumbnails ?? DEFAULT_CONFIG.generateThumbnails,
      authToken: config.authToken,
    };
  }

  /**
   * Update the authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Get presigned URL for direct upload
   */
  async getPresignedUrl(
    fileName: string,
    mimeType: string,
    fileSize: number,
    pathPrefix?: string,
  ): Promise<PresignedUrlResponse> {
    const path = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

    const response = await fetch(`${this.config.storageUrl}/presigned-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.authToken && {
          Authorization: `Bearer ${this.config.authToken}`,
        }),
      },
      body: JSON.stringify({
        bucket: this.config.bucket,
        path,
        mimeType,
        fileSize,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to get presigned URL" }));
      throw new Error(error.message || "Failed to get presigned URL");
    }

    return response.json();
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const { onProgress, signal, fileId, pathPrefix, metadata } = options;

    // Generate unique file ID if not provided
    const id = fileId || this.generateFileId();
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFileName(file.name);
    const path = pathPrefix
      ? `${pathPrefix}/${timestamp}-${id}-${sanitizedName}`
      : `${timestamp}-${id}-${sanitizedName}`;

    // Get file type
    const fileType = getFileType(file);

    // Try to get presigned URL first (preferred method)
    try {
      const presignedResponse = await this.getPresignedUrl(
        path,
        file.type,
        file.size,
        pathPrefix,
      );

      // Upload using presigned URL
      const result = await this.uploadWithPresignedUrl(
        file,
        presignedResponse,
        onProgress,
        signal,
      );

      // Generate thumbnail if needed
      let thumbnailUrl: string | undefined;
      if (this.config.generateThumbnails) {
        thumbnailUrl = await this.uploadThumbnail(
          file,
          presignedResponse.fileId,
          pathPrefix,
        );
      }

      return {
        id: presignedResponse.fileId,
        url: presignedResponse.publicUrl,
        thumbnailUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        mimeType: file.type,
        ...result.dimensions,
      };
    } catch {
      // Fall back to direct upload via API
      return this.uploadDirect(file, id, path, onProgress, signal, metadata);
    }
  }

  /**
   * Upload using presigned URL
   */
  private async uploadWithPresignedUrl(
    file: File,
    presigned: PresignedUrlResponse,
    onProgress?: UploadProgressCallback,
    signal?: AbortSignal,
  ): Promise<{
    dimensions?: { width?: number; height?: number; duration?: number };
  }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress, event.loaded, event.total);
          }
        });
      }

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ dimensions: undefined });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      // Handle cancellation
      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
        });
      }

      // Start upload
      xhr.open("PUT", presigned.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  /**
   * Direct upload via API (fallback)
   */
  private async uploadDirect(
    file: File,
    fileId: string,
    path: string,
    onProgress?: UploadProgressCallback,
    signal?: AbortSignal,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", this.config.bucket);
    formData.append("path", path);
    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    // Get file type
    const fileType = getFileType(file);

    // Use XMLHttpRequest for progress tracking
    const result = await new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress, event.loaded, event.total);
          }
        });
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              id: response.id || fileId,
              url:
                response.url ||
                `${this.config.storageUrl}/files/${this.config.bucket}/${path}`,
              thumbnailUrl: response.thumbnailUrl,
              fileName: file.name,
              fileSize: file.size,
              fileType,
              mimeType: file.type,
              width: response.width,
              height: response.height,
              duration: response.duration,
            });
          } catch {
            resolve({
              id: fileId,
              url: `${this.config.storageUrl}/files/${this.config.bucket}/${path}`,
              fileName: file.name,
              fileSize: file.size,
              fileType,
              mimeType: file.type,
            });
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
        });
      }

      xhr.open("POST", `${this.config.storageUrl}/upload`);
      if (this.config.authToken) {
        xhr.setRequestHeader(
          "Authorization",
          `Bearer ${this.config.authToken}`,
        );
      }
      xhr.send(formData);
    });

    // Generate thumbnail if needed and not already provided
    if (this.config.generateThumbnails && !result.thumbnailUrl) {
      result.thumbnailUrl = await this.uploadThumbnail(file, result.id);
    }

    return result;
  }

  /**
   * Upload with retry logic
   */
  async uploadWithRetry(
    file: File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    let lastError: Error | null = null;
    let retryCount = 0;

    while (retryCount <= this.config.maxRetries) {
      try {
        return await this.uploadFile(file, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Upload failed");

        // Don't retry if cancelled
        if (
          options.signal?.aborted ||
          lastError.message === "Upload cancelled"
        ) {
          throw lastError;
        }

        retryCount++;

        if (retryCount <= this.config.maxRetries) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Upload failed after retries");
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    options: Omit<UploadOptions, "fileId"> & {
      concurrency?: number;
      onFileProgress?: (
        fileIndex: number,
        progress: number,
        uploadedBytes: number,
        totalBytes: number,
      ) => void;
      onFileComplete?: (fileIndex: number, result: UploadResult) => void;
      onFileError?: (fileIndex: number, error: Error) => void;
    } = {},
  ): Promise<{
    results: UploadResult[];
    errors: { index: number; error: Error }[];
  }> {
    const {
      concurrency = 3,
      onFileProgress,
      onFileComplete,
      onFileError,
      ...uploadOptions
    } = options;
    const results: UploadResult[] = [];
    const errors: { index: number; error: Error }[] = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        try {
          const result = await this.uploadWithRetry(file, {
            ...uploadOptions,
            onProgress: onFileProgress
              ? (progress, uploaded, total) =>
                  onFileProgress(fileIndex, progress, uploaded, total)
              : undefined,
          });
          results[fileIndex] = result;
          onFileComplete?.(fileIndex, result);
          return result;
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error("Upload failed");
          errors.push({ index: fileIndex, error: err });
          onFileError?.(fileIndex, err);
          throw error;
        }
      });

      // Wait for batch to complete (but don't fail if some fail)
      await Promise.allSettled(batchPromises);
    }

    return { results, errors };
  }

  /**
   * Generate and upload thumbnail for image/video
   */
  private async uploadThumbnail(
    file: File,
    fileId: string,
    pathPrefix?: string,
  ): Promise<string | undefined> {
    const fileType = getFileType(file);

    if (fileType !== "image" && fileType !== "video") {
      return undefined;
    }

    try {
      let thumbnailBlob: Blob;

      if (fileType === "image") {
        thumbnailBlob = await generateImageThumbnail(file, {
          maxWidth: 200,
          maxHeight: 200,
          quality: 0.8,
          format: "image/jpeg",
        });
      } else {
        thumbnailBlob = await generateVideoThumbnail(file, {
          maxWidth: 200,
          maxHeight: 200,
          quality: 0.8,
          format: "image/jpeg",
          captureTime: 1, // Capture at 1 second
        });
      }

      // Convert blob to file
      const thumbnailFile = new File([thumbnailBlob], `${fileId}_thumb.jpg`, {
        type: "image/jpeg",
      });

      // Upload thumbnail
      const path = pathPrefix
        ? `${pathPrefix}/thumbnails/${fileId}_thumb.jpg`
        : `thumbnails/${fileId}_thumb.jpg`;

      const formData = new FormData();
      formData.append("file", thumbnailFile);
      formData.append("bucket", this.config.bucket);
      formData.append("path", path);

      const response = await fetch(`${this.config.storageUrl}/upload`, {
        method: "POST",
        headers: {
          ...(this.config.authToken && {
            Authorization: `Bearer ${this.config.authToken}`,
          }),
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return (
          result.url ||
          `${this.config.storageUrl}/files/${this.config.bucket}/${path}`
        );
      }
    } catch (error) {
      logger.warn("Failed to generate thumbnail:", { context: error });
    }

    return undefined;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.config.storageUrl}/files/${fileId}`, {
      method: "DELETE",
      headers: {
        ...(this.config.authToken && {
          Authorization: `Bearer ${this.config.authToken}`,
        }),
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to delete file" }));
      throw new Error(error.message || "Failed to delete file");
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(fileId: string): string {
    return `${this.config.storageUrl}/files/${this.config.bucket}/${fileId}`;
  }

  /**
   * Generate a unique file ID
   */
  private generateFileId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sanitize filename for storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 200); // Limit length
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let uploadServiceInstance: UploadService | null = null;

/**
 * Get the upload service singleton
 */
export function getUploadService(
  config?: Partial<UploadConfig>,
): UploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = new UploadService(config);
  } else if (config) {
    // Update config if provided
    uploadServiceInstance = new UploadService(config);
  }
  return uploadServiceInstance;
}

/**
 * Create a new upload service instance
 */
export function createUploadService(
  config?: Partial<UploadConfig>,
): UploadService {
  return new UploadService(config);
}

export default UploadService;
