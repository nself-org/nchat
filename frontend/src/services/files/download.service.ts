/**
 * File Download Service
 *
 * Generates secure download URLs and handles file retrieval.
 * Supports signed URLs with expiration, streaming for large files,
 * and access control integration.
 */

import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileRecord,
  DownloadUrlRequest,
  DownloadUrlResponse,
  ThumbnailRecord,
  ThumbnailSet,
  StorageConfig,
} from "./types";

import {
  getStorageConfig,
  getPublicFileUrl,
  FILE_SERVICE_CONSTANTS,
} from "./config";
import {
  getFileAccessService,
  type UserRole,
  type AccessCheckResult,
} from "./access.service";

import { logger } from "@/lib/logger";

// ============================================================================
// S3 Client Factory
// ============================================================================

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const config = getStorageConfig();

    s3ClientInstance = new S3Client({
      endpoint: config.endpoint,
      region: config.region || "us-east-1",
      credentials: {
        accessKeyId: config.accessKey || "",
        secretAccessKey: config.secretKey || "",
      },
      forcePathStyle: config.provider === "minio",
    });
  }
  return s3ClientInstance;
}

// ============================================================================
// Download Service Class
// ============================================================================

export class DownloadService {
  private storageConfig: StorageConfig;
  private s3Client: S3Client;

  constructor(storageConfig?: StorageConfig) {
    this.storageConfig = storageConfig || getStorageConfig();
    this.s3Client = getS3Client();
  }

  /**
   * Get a secure signed download URL for a file
   */
  async getDownloadUrl(
    request: DownloadUrlRequest,
  ): Promise<DownloadUrlResponse> {
    const {
      fileId,
      expiresIn = FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
      disposition = "inline",
    } = request;

    // Clamp expiry time
    const clampedExpiry = Math.min(
      expiresIn,
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );

    // Fetch file info
    const fileResponse = await fetch(`/api/files/${fileId}`);
    if (!fileResponse.ok) {
      throw new Error("File not found");
    }

    const file: FileRecord = await fileResponse.json();

    if (file.isDeleted) {
      throw new Error("File has been deleted");
    }

    // Generate signed URL
    const signedUrl = await this.generateSignedUrl(
      file.storagePath,
      file.bucket || this.storageConfig.bucket,
      clampedExpiry,
      disposition,
      file.name,
    );

    return {
      url: signedUrl,
      expiresAt: new Date(Date.now() + clampedExpiry * 1000),
      contentType: file.mimeType,
      filename: file.name,
      size: file.size,
    };
  }

  /**
   * Generate signed download URL with access control check
   */
  async getSignedDownloadUrl(
    storagePath: string,
    userId: string,
    options: {
      userRole?: UserRole;
      expiresIn?: number;
      disposition?: "inline" | "attachment";
      filename?: string;
      bucket?: string;
    } = {},
  ): Promise<{
    url: string;
    expiresAt: Date;
    accessCheck: AccessCheckResult;
  }> {
    const {
      userRole,
      expiresIn = FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
      disposition = "inline",
      filename,
      bucket,
    } = options;

    // Check access control
    const accessService = getFileAccessService();
    const accessCheck = await accessService.canAccessByStoragePath(
      userId,
      storagePath,
      userRole,
    );

    if (!accessCheck.allowed) {
      return {
        url: "",
        expiresAt: new Date(),
        accessCheck,
      };
    }

    // Clamp expiry time
    const clampedExpiry = Math.min(
      expiresIn,
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );

    // Generate signed URL
    const url = await this.generateSignedUrl(
      storagePath,
      bucket || this.storageConfig.bucket,
      clampedExpiry,
      disposition,
      filename,
    );

    return {
      url,
      expiresAt: new Date(Date.now() + clampedExpiry * 1000),
      accessCheck,
    };
  }

  /**
   * Generate signed URL for storage path
   */
  async generateSignedUrl(
    storagePath: string,
    bucket: string,
    expiresIn: number,
    disposition: "inline" | "attachment" = "inline",
    filename?: string,
  ): Promise<string> {
    const downloadFilename =
      filename || storagePath.split("/").pop() || "download";

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ResponseContentDisposition:
        disposition === "attachment"
          ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
          : `inline; filename="${encodeURIComponent(downloadFilename)}"`,
      // Add caching headers for CDN
      ResponseCacheControl: "public, max-age=31536000, immutable",
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get public URL for a file (if available)
   */
  getPublicUrl(file: FileRecord): string | null {
    if (file.url) {
      return file.url;
    }

    // Generate public URL if storage supports it
    if (this.storageConfig.publicUrlBase) {
      return getPublicFileUrl(file.storagePath);
    }

    return null;
  }

  /**
   * Get file metadata from storage
   */
  async getFileMetadata(
    storagePath: string,
    bucket?: string,
  ): Promise<{
    contentType: string;
    contentLength: number;
    lastModified: Date;
    etag?: string;
  } | null> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket || this.storageConfig.bucket,
          Key: storagePath,
        }),
      );

      return {
        contentType: response.ContentType || "application/octet-stream",
        contentLength: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag,
      };
    } catch (error) {
      logger.error("[DownloadService] Failed to get file metadata:", error);
      return null;
    }
  }

  /**
   * Get thumbnail URLs for a file
   */
  async getThumbnails(fileId: string): Promise<ThumbnailSet> {
    const response = await fetch(`/api/files/${fileId}/thumbnails`);

    if (!response.ok) {
      return {};
    }

    const thumbnails: ThumbnailRecord[] = await response.json();
    const thumbnailSet: ThumbnailSet = {};

    for (const thumb of thumbnails) {
      if (thumb.width <= 100) {
        thumbnailSet.small = thumb;
      } else if (thumb.width <= 400) {
        thumbnailSet.medium = thumb;
      } else {
        thumbnailSet.large = thumb;
      }
    }

    return thumbnailSet;
  }

  /**
   * Get best thumbnail for a given size
   */
  async getBestThumbnail(
    fileId: string,
    maxWidth: number,
  ): Promise<ThumbnailRecord | null> {
    const thumbnails = await this.getThumbnails(fileId);

    // Return the smallest thumbnail that is >= requested size
    if (maxWidth <= 100 && thumbnails.small) {
      return thumbnails.small;
    }
    if (maxWidth <= 400 && thumbnails.medium) {
      return thumbnails.medium;
    }
    if (thumbnails.large) {
      return thumbnails.large;
    }

    // Fallback to whatever is available
    return thumbnails.medium || thumbnails.small || null;
  }

  /**
   * Download file to client
   */
  async downloadFile(
    fileId: string,
    options: {
      filename?: string;
      openInNewTab?: boolean;
    } = {},
  ): Promise<void> {
    const { url } = await this.getDownloadUrl({
      fileId,
      disposition: options.openInNewTab ? "inline" : "attachment",
    });

    if (options.openInNewTab) {
      window.open(url, "_blank");
    } else {
      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = options.filename || "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get URL for streaming video/audio with range support
   */
  async getStreamUrl(
    fileId: string,
    userId: string,
    options: {
      userRole?: UserRole;
      range?: { start: number; end?: number };
    } = {},
  ): Promise<{
    url: string;
    supportsByteRange: boolean;
    contentType: string;
    contentLength: number;
  }> {
    // Get file info first
    const fileResponse = await fetch(`/api/files/${fileId}`);
    if (!fileResponse.ok) {
      throw new Error("File not found");
    }

    const file: FileRecord = await fileResponse.json();

    // Check access
    const accessService = getFileAccessService();
    const accessCheck = await accessService.canAccessFile(
      userId,
      fileId,
      options.userRole,
    );

    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || "Access denied");
    }

    // Get signed URL for streaming
    const signedUrl = await this.generateSignedUrl(
      file.storagePath,
      file.bucket || this.storageConfig.bucket,
      FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
      "inline",
      file.name,
    );

    return {
      url: signedUrl,
      supportsByteRange: true, // S3/MinIO supports byte range requests
      contentType: file.mimeType,
      contentLength: file.size,
    };
  }

  /**
   * Get file blob for local processing
   */
  async getFileBlob(fileId: string): Promise<Blob> {
    const { url } = await this.getDownloadUrl({ fileId });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch file");
    }

    return response.blob();
  }

  /**
   * Get file as data URL (base64)
   */
  async getFileDataUrl(fileId: string): Promise<string> {
    const blob = await this.getFileBlob(fileId);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert to data URL"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate headers for CDN caching
   */
  getCacheHeaders(
    file: FileRecord,
    options: {
      maxAge?: number;
      immutable?: boolean;
      private?: boolean;
    } = {},
  ): Record<string, string> {
    const {
      maxAge = 31536000, // 1 year default
      immutable = true,
      private: isPrivate = false,
    } = options;

    const cacheControl = [
      isPrivate ? "private" : "public",
      `max-age=${maxAge}`,
    ];

    if (immutable) {
      cacheControl.push("immutable");
    }

    return {
      "Cache-Control": cacheControl.join(", "),
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      ETag: file.contentHash ? `"${file.contentHash}"` : "",
      "Accept-Ranges": "bytes",
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let downloadServiceInstance: DownloadService | null = null;

export function getDownloadService(): DownloadService {
  if (!downloadServiceInstance) {
    downloadServiceInstance = new DownloadService();
  }
  return downloadServiceInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a file URL has expired
 */
export function isUrlExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check for S3-style expiry parameter
    const expires = urlObj.searchParams.get("X-Amz-Expires");
    const date = urlObj.searchParams.get("X-Amz-Date");

    if (expires && date) {
      const expireSeconds = parseInt(expires, 10);
      const dateMatch = date.match(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      );

      if (dateMatch) {
        const signDate = new Date(
          `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4]}:${dateMatch[5]}:${dateMatch[6]}Z`,
        );
        const expiryTime = signDate.getTime() + expireSeconds * 1000;
        return Date.now() > expiryTime;
      }
    }

    // Check for generic expires parameter
    const genericExpires = urlObj.searchParams.get("expires");
    if (genericExpires) {
      const expiryTime = parseInt(genericExpires, 10) * 1000;
      return Date.now() > expiryTime;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extract content disposition filename from headers
 */
export function extractFilenameFromHeaders(headers: Headers): string | null {
  const disposition = headers.get("content-disposition");
  if (!disposition) return null;

  const filenameMatch = disposition.match(
    /filename[*]?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/,
  );
  return filenameMatch?.[1] || null;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Get appropriate icon for file type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "file-text";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return "table";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation"))
    return "presentation";
  if (mimeType.includes("zip") || mimeType.includes("compressed"))
    return "archive";
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml")
  ) {
    return "code";
  }
  return "file";
}

/**
 * Check if file type supports inline preview
 */
export function canPreviewInline(mimeType: string): boolean {
  const inlineTypes = [
    "image/",
    "video/",
    "audio/",
    "application/pdf",
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
  ];

  return inlineTypes.some(
    (type) => mimeType.startsWith(type) || mimeType === type,
  );
}

/**
 * Check if file type supports thumbnail generation
 */
export function supportsThumbnail(mimeType: string): boolean {
  const imageThumbnailTypes: readonly string[] =
    FILE_SERVICE_CONSTANTS.THUMBNAIL_SUPPORTED_TYPES;
  const videoThumbnailTypes: readonly string[] =
    FILE_SERVICE_CONSTANTS.VIDEO_THUMBNAIL_SUPPORTED_TYPES;

  return (
    imageThumbnailTypes.includes(mimeType) ||
    videoThumbnailTypes.includes(mimeType)
  );
}
