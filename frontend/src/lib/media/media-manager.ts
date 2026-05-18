/**
 * Media Manager - Core media management functionality
 *
 * Provides functions for uploading, downloading, deleting, and managing media items.
 */

import {
  MediaItem,
  MediaType,
  UploadOptions,
  UploadResult,
  DownloadOptions,
  DeleteOptions,
  DeleteResult,
  ShareOptions,
  ShareResult,
  MediaUser,
  MediaMetadata,
} from "./media-types";
import { extractMediaMetadata } from "./media-metadata";
import { generateThumbnail, ThumbnailResult } from "./media-thumbnails";

import { logger } from "@/lib/logger";

// ============================================================================
// Type Detection
// ============================================================================

/**
 * Determine media type from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): MediaType {
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
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet") ||
    mimeType.startsWith("text/")
  ) {
    return "document";
  }
  return "other";
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Generate a unique ID for uploads
 */
export function generateMediaId(): string {
  return `media_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// File Size Utilities
// ============================================================================

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
 * Parse file size string to bytes
 */
export function parseFileSize(sizeStr: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeStr
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";

  return Math.floor(value * (units[unit] || 1));
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a file and create a media item
 */
export async function uploadMedia(
  file: File,
  options: UploadOptions = {},
  user: MediaUser,
): Promise<UploadResult> {
  try {
    const id = generateMediaId();
    const fileType = getMediaTypeFromMime(file.type);
    const fileExtension = getFileExtension(file.name);

    // Extract metadata if enabled
    let metadata: MediaMetadata = {};
    if (options.extractMetadata !== false) {
      metadata = await extractMediaMetadata(file);
    }

    // Generate thumbnail if enabled
    let thumbnailUrl: string | null = null;
    if (
      options.generateThumbnail !== false &&
      (fileType === "image" || fileType === "video")
    ) {
      const thumbnailResult: ThumbnailResult = await generateThumbnail(file, {
        maxWidth: options.maxWidth || 200,
        maxHeight: options.maxHeight || 200,
      });
      if (thumbnailResult.success && thumbnailResult.thumbnailUrl) {
        thumbnailUrl = thumbnailResult.thumbnailUrl;
      }
    }

    // Create the media item (in real app, this would upload to storage)
    const mediaItem: MediaItem = {
      id,
      fileName: file.name,
      fileType,
      mimeType: file.type,
      fileSize: file.size,
      fileExtension,
      url: URL.createObjectURL(file), // In production, this would be the storage URL
      thumbnailUrl,
      downloadUrl: URL.createObjectURL(file),
      channelId: options.channelId || null,
      threadId: options.threadId || null,
      messageId: options.messageId || null,
      uploadedBy: user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
      canDelete: true,
      canShare: true,
      canDownload: true,
    };

    return {
      success: true,
      mediaItem,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleMedia(
  files: File[],
  options: UploadOptions = {},
  user: MediaUser,
): Promise<{
  successful: MediaItem[];
  failed: { file: File; error: string }[];
}> {
  const successful: MediaItem[] = [];
  const failed: { file: File; error: string }[] = [];

  for (const file of files) {
    const result = await uploadMedia(file, options, user);
    if (result.success && result.mediaItem) {
      successful.push(result.mediaItem);
    } else {
      failed.push({ file, error: result.error || "Unknown error" });
    }
  }

  return { successful, failed };
}

// ============================================================================
// Download Functions
// ============================================================================

/**
 * Download a media item
 */
export async function downloadMedia(
  item: MediaItem,
  options: DownloadOptions = {},
): Promise<void> {
  const url = item.downloadUrl || item.url;
  const fileName = options.fileName || item.fileName;

  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    logger.error("Download failed:", error);
    throw error;
  }
}

/**
 * Download multiple media items as a zip (requires backend support)
 */
export async function downloadMultipleMedia(
  items: MediaItem[],
  zipFileName: string = "media.zip",
): Promise<void> {
  // In a real implementation, this would call a backend endpoint
  // that creates a zip file and returns a download URL
  logger.warn("Bulk download not implemented - downloading individually");

  for (const item of items) {
    await downloadMedia(item);
    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete a media item
 */
export async function deleteMedia(
  item: MediaItem,
  options: DeleteOptions = {},
): Promise<DeleteResult> {
  try {
    // In production, this would call the backend API
    // For now, just return success

    // Revoke blob URLs if they exist
    if (item.url.startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
    if (item.thumbnailUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.thumbnailUrl);
    }

    return {
      success: true,
      deletedCount: 1,
    };
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      errors: [
        {
          id: item.id,
          error: error instanceof Error ? error.message : "Delete failed",
        },
      ],
    };
  }
}

/**
 * Delete multiple media items
 */
export async function deleteMultipleMedia(
  items: MediaItem[],
  options: DeleteOptions = {},
): Promise<DeleteResult> {
  const errors: { id: string; error: string }[] = [];
  let deletedCount = 0;

  for (const item of items) {
    const result = await deleteMedia(item, options);
    if (result.success) {
      deletedCount += result.deletedCount;
    } else if (result.errors) {
      errors.push(...result.errors);
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Share Functions
// ============================================================================

/**
 * Generate a shareable link for a media item
 */
export async function shareMedia(
  item: MediaItem,
  options: ShareOptions = {},
): Promise<ShareResult> {
  try {
    // In production, this would call the backend API to create a share link
    const shareId = Math.random().toString(36).substring(2, 10);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${baseUrl}/shared/${shareId}`;

    const expiresAt = options.expiresIn
      ? new Date(Date.now() + options.expiresIn).toISOString()
      : undefined;

    return {
      success: true,
      shareUrl,
      expiresAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Share failed",
    };
  }
}

/**
 * Copy media URL to clipboard
 */
export async function copyMediaLink(item: MediaItem): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(item.url);
    return true;
  } catch (error) {
    logger.error("Failed to copy link:", error);
    return false;
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a file for upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {},
): { valid: boolean; error?: string } {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(options.maxSize)})`,
    };
  }

  // Check MIME type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    if (!options.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed`,
      };
    }
  }

  // Check extension
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    if (!options.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ".${extension}" is not allowed`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple files for upload
 */
export function validateFiles(
  files: File[],
  options: {
    maxSize?: number;
    maxFiles?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {},
): { valid: File[]; invalid: { file: File; error: string }[] } {
  const valid: File[] = [];
  const invalid: { file: File; error: string }[] = [];

  // Check max files
  if (options.maxFiles && files.length > options.maxFiles) {
    // Take only the allowed number of files
    const excess = files.slice(options.maxFiles);
    excess.forEach((file) => {
      invalid.push({
        file,
        error: `Maximum ${options.maxFiles} files allowed`,
      });
    });
    files = files.slice(0, options.maxFiles);
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file, options);
    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error || "Invalid file" });
    }
  }

  return { valid, invalid };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a file is previewable in the browser
 */
export function isPreviewable(item: MediaItem): boolean {
  return (
    item.fileType === "image" ||
    item.fileType === "video" ||
    item.fileType === "audio"
  );
}

/**
 * Check if an item can be displayed in a lightbox
 */
export function isLightboxCompatible(item: MediaItem): boolean {
  return item.fileType === "image";
}

/**
 * Get the appropriate icon name for a media type
 */
export function getMediaTypeIcon(type: MediaType): string {
  const icons: Record<MediaType, string> = {
    image: "Image",
    video: "Video",
    audio: "Music",
    document: "FileText",
    archive: "Archive",
    other: "File",
  };
  return icons[type];
}

/**
 * Get display name for media type
 */
export function getMediaTypeName(type: MediaType): string {
  const names: Record<MediaType, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    archive: "Archive",
    other: "File",
  };
  return names[type];
}

/**
 * Format duration in seconds to display string
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

/**
 * Group media items by date
 */
export function groupMediaByDate(items: MediaItem[]): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const date = new Date(item.createdAt);
    const dateKey = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  }

  return groups;
}

/**
 * Group media items by type
 */
export function groupMediaByType(
  items: MediaItem[],
): Map<MediaType, MediaItem[]> {
  const groups = new Map<MediaType, MediaItem[]>();

  for (const item of items) {
    if (!groups.has(item.fileType)) {
      groups.set(item.fileType, []);
    }
    groups.get(item.fileType)!.push(item);
  }

  return groups;
}

/**
 * Group media items by user
 */
export function groupMediaByUser(items: MediaItem[]): Map<string, MediaItem[]> {
  const groups = new Map<string, MediaItem[]>();

  for (const item of items) {
    const userId = item.uploadedBy.id;
    if (!groups.has(userId)) {
      groups.set(userId, []);
    }
    groups.get(userId)!.push(item);
  }

  return groups;
}
