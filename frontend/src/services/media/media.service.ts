/**
 * Media Service
 *
 * Core service for media management including upload, download, and metadata operations.
 * Uses Nhost storage for file storage and Hasura GraphQL for metadata.
 */

import {
  ApolloClient,
  NormalizedCacheObject,
  ApolloError,
} from "@apollo/client";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import type { APIResponse } from "@/types/api";
import {
  GET_USER_MEDIA,
  GET_MEDIA_BY_ID,
  GET_MEDIA_BY_CHANNEL,
  SEARCH_MEDIA,
  GET_USER_MEDIA_STATS,
  INSERT_MEDIA,
  UPDATE_MEDIA,
  DELETE_MEDIA,
  BULK_DELETE_MEDIA,
  UPDATE_PROCESSING_STATUS,
  type MediaRecord,
  type MediaMetadata,
} from "@/graphql/media";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default max file size (25MB) */
export const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Allowed MIME type categories */
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
    "video/x-ms-wmv",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/flac",
    "audio/mp4",
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
    "text/csv",
    "application/json",
    "application/xml",
  ],
};

/** All allowed MIME types flattened */
export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

// ============================================================================
// TYPES
// ============================================================================

export interface MediaServiceConfig {
  apolloClient: ApolloClient<NormalizedCacheObject>;
  storageUrl?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

export interface UploadMediaOptions {
  channelId?: string;
  metadata?: MediaMetadata;
  generateThumbnail?: boolean;
}

export interface ListMediaOptions {
  limit?: number;
  offset?: number;
  mimeTypeFilter?: string;
  channelId?: string;
  orderBy?: "created_at" | "name" | "size";
  orderDirection?: "asc" | "desc";
}

export interface ListMediaResult {
  media: TransformedMedia[];
  totalCount: number;
  hasMore: boolean;
}

export interface TransformedMedia {
  id: string;
  userId: string;
  channelId?: string | null;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string | null;
  metadata?: MediaMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  channel?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface MediaStats {
  total: number;
  totalSize: number;
  images: number;
  videos: number;
  audio: number;
  documents: number;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

// ============================================================================
// MEDIA SERVICE CLASS
// ============================================================================

export class MediaService {
  private client: ApolloClient<NormalizedCacheObject>;
  private storageUrl: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];

  constructor(config: MediaServiceConfig) {
    this.client = config.apolloClient;
    this.storageUrl =
      config.storageUrl ||
      process.env.NEXT_PUBLIC_STORAGE_URL ||
      "http://storage.localhost/v1/storage";
    this.maxFileSize = config.maxFileSize || DEFAULT_MAX_FILE_SIZE;
    this.allowedMimeTypes = config.allowedMimeTypes || ALL_ALLOWED_MIME_TYPES;
  }

  // ==========================================================================
  // UPLOAD OPERATIONS
  // ==========================================================================

  /**
   * Upload media file to storage and create database record
   */
  async uploadMedia(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    userId: string,
    options: UploadMediaOptions = {},
  ): Promise<APIResponse<TransformedMedia>> {
    try {
      logger.debug("MediaService.uploadMedia", {
        userId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });

      // Validate file
      const validation = this.validateFile(file.mimetype, file.size);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: validation.error!,
          },
        };
      }

      // Generate unique filename
      const fileId = uuidv4();
      const extension = file.originalname.split(".").pop() || "";
      const storageName = `${fileId}.${extension}`;
      const storagePath = options.channelId
        ? `channels/${options.channelId}/${storageName}`
        : `users/${userId}/${storageName}`;

      // Upload to Nhost storage
      const uploadResult = await this.uploadToStorage(
        file.buffer,
        storagePath,
        file.mimetype,
      );

      if (!uploadResult.success) {
        return {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            status: 500,
            message: uploadResult.error || "Failed to upload file to storage",
          },
        };
      }

      // Build metadata
      const metadata: MediaMetadata = {
        ...options.metadata,
        storage_path: storagePath,
        bucket: "default",
        processing_status: this.shouldProcess(file.mimetype)
          ? "pending"
          : "completed",
      };

      // Create database record
      const { data, errors } = await this.client.mutate({
        mutation: INSERT_MEDIA,
        variables: {
          userId,
          channelId: options.channelId || null,
          name: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: uploadResult.url,
          thumbnailUrl: null,
          metadata,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const media = this.transformMedia(data.insert_nchat_media_one);

      logger.info("MediaService.uploadMedia success", {
        mediaId: media.id,
        userId,
        size: file.size,
      });

      return {
        success: true,
        data: media,
      };
    } catch (error) {
      logger.error("MediaService.uploadMedia failed", error as Error, {
        userId,
        filename: file.originalname,
      });
      return this.handleError(error);
    }
  }

  /**
   * Upload file to Nhost storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    path: string,
    mimeType: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const formData = new FormData();
      // Convert Buffer to ArrayBuffer for Blob compatibility
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: mimeType });
      formData.append("file", blob, path);

      const response = await fetch(`${this.storageUrl}/files`, {
        method: "POST",
        body: formData,
        headers: {
          // Auth token would be added here in production
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Storage upload failed: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();
      const fileUrl = `${this.storageUrl}/files/${result.id || result.fileId}`;

      return {
        success: true,
        url: fileUrl,
      };
    } catch (error) {
      logger.error("MediaService.uploadToStorage failed", error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get media item by ID
   */
  async getMediaInfo(
    mediaId: string,
  ): Promise<APIResponse<TransformedMedia | null>> {
    try {
      logger.debug("MediaService.getMediaInfo", { mediaId });

      const { data, error } = await this.client.query({
        query: GET_MEDIA_BY_ID,
        variables: { id: mediaId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const media = data.nchat_media_by_pk
        ? this.transformMedia(data.nchat_media_by_pk)
        : null;

      return {
        success: true,
        data: media,
      };
    } catch (error) {
      logger.error("MediaService.getMediaInfo failed", error as Error, {
        mediaId,
      });
      return this.handleError(error);
    }
  }

  /**
   * List user's media with pagination and filters
   */
  async listUserMedia(
    userId: string,
    options: ListMediaOptions = {},
  ): Promise<APIResponse<ListMediaResult>> {
    const { limit = 50, offset = 0, mimeTypeFilter, channelId } = options;

    try {
      logger.debug("MediaService.listUserMedia", { userId, limit, offset });

      const { data, error } = await this.client.query({
        query: GET_USER_MEDIA,
        variables: {
          userId,
          limit,
          offset,
          mimeTypeFilter: mimeTypeFilter ? `${mimeTypeFilter}%` : null,
          channelId: channelId || null,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const media = this.transformMediaList(data.nchat_media);
      const totalCount = data.nchat_media_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          media,
          totalCount,
          hasMore: offset + media.length < totalCount,
        },
      };
    } catch (error) {
      logger.error("MediaService.listUserMedia failed", error as Error, {
        userId,
      });
      return this.handleError(error);
    }
  }

  /**
   * List media for a specific channel
   */
  async listChannelMedia(
    channelId: string,
    options: Omit<ListMediaOptions, "channelId"> = {},
  ): Promise<APIResponse<ListMediaResult>> {
    const { limit = 50, offset = 0, mimeTypeFilter } = options;

    try {
      logger.debug("MediaService.listChannelMedia", {
        channelId,
        limit,
        offset,
      });

      const { data, error } = await this.client.query({
        query: GET_MEDIA_BY_CHANNEL,
        variables: {
          channelId,
          limit,
          offset,
          mimeTypeFilter: mimeTypeFilter ? `${mimeTypeFilter}%` : null,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const media = this.transformMediaList(data.nchat_media);
      const totalCount = data.nchat_media_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          media,
          totalCount,
          hasMore: offset + media.length < totalCount,
        },
      };
    } catch (error) {
      logger.error("MediaService.listChannelMedia failed", error as Error, {
        channelId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Search media by name
   */
  async searchMedia(
    userId: string,
    query: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<APIResponse<ListMediaResult>> {
    const { limit = 20, offset = 0 } = options;

    try {
      logger.debug("MediaService.searchMedia", { userId, query });

      const { data, error } = await this.client.query({
        query: SEARCH_MEDIA,
        variables: {
          userId,
          query: `%${query}%`,
          limit,
          offset,
        },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      const media = this.transformMediaList(data.nchat_media);
      const totalCount = data.nchat_media_aggregate?.aggregate?.count || 0;

      return {
        success: true,
        data: {
          media,
          totalCount,
          hasMore: offset + media.length < totalCount,
        },
      };
    } catch (error) {
      logger.error("MediaService.searchMedia failed", error as Error, {
        userId,
        query,
      });
      return this.handleError(error);
    }
  }

  /**
   * Get media statistics for a user
   */
  async getUserMediaStats(userId: string): Promise<APIResponse<MediaStats>> {
    try {
      logger.debug("MediaService.getUserMediaStats", { userId });

      const { data, error } = await this.client.query({
        query: GET_USER_MEDIA_STATS,
        variables: { userId },
        fetchPolicy: "network-only",
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          total: data.total?.aggregate?.count || 0,
          totalSize: data.total?.aggregate?.sum?.size || 0,
          images: data.images?.aggregate?.count || 0,
          videos: data.videos?.aggregate?.count || 0,
          audio: data.audio?.aggregate?.count || 0,
          documents: data.documents?.aggregate?.count || 0,
        },
      };
    } catch (error) {
      logger.error("MediaService.getUserMediaStats failed", error as Error, {
        userId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // SIGNED URL OPERATIONS
  // ==========================================================================

  /**
   * Generate a signed URL for downloading media
   */
  async getSignedUrl(
    mediaId: string,
    expiresIn: number = 3600,
  ): Promise<APIResponse<SignedUrlResult>> {
    try {
      logger.debug("MediaService.getSignedUrl", { mediaId, expiresIn });

      // First get the media record to get storage path
      const mediaResult = await this.getMediaInfo(mediaId);
      if (!mediaResult.success || !mediaResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Media not found",
          },
        };
      }

      const media = mediaResult.data;
      const storagePath = media.metadata?.storage_path;

      if (!storagePath) {
        // If no storage path, return the direct URL
        return {
          success: true,
          data: {
            url: media.url,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
        };
      }

      // Request signed URL from storage service
      const response = await fetch(
        `${this.storageUrl}/files/presigned?path=${encodeURIComponent(storagePath)}&expires=${expiresIn}`,
        {
          method: "GET",
          headers: {
            // Auth token would be added here
          },
        },
      );

      if (!response.ok) {
        // Fall back to direct URL if presigned fails
        return {
          success: true,
          data: {
            url: media.url,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
        };
      }

      const result = await response.json();

      return {
        success: true,
        data: {
          url: result.url || media.url,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      };
    } catch (error) {
      logger.error("MediaService.getSignedUrl failed", error as Error, {
        mediaId,
      });
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Update media metadata (name, description, etc.)
   */
  async updateMedia(
    mediaId: string,
    updates: { name?: string; metadata?: Partial<MediaMetadata> },
  ): Promise<APIResponse<TransformedMedia>> {
    try {
      logger.debug("MediaService.updateMedia", { mediaId, updates });

      const { data, errors } = await this.client.mutate({
        mutation: UPDATE_MEDIA,
        variables: {
          id: mediaId,
          name: updates.name,
          metadata: updates.metadata || null,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const media = this.transformMedia(data.update_nchat_media_by_pk);

      logger.info("MediaService.updateMedia success", { mediaId });

      return {
        success: true,
        data: media,
      };
    } catch (error) {
      logger.error("MediaService.updateMedia failed", error as Error, {
        mediaId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(
    mediaId: string,
    status: "pending" | "processing" | "completed" | "failed",
    options: { jobId?: string; thumbnailUrl?: string } = {},
  ): Promise<APIResponse<{ updated: boolean }>> {
    try {
      logger.debug("MediaService.updateProcessingStatus", { mediaId, status });

      const { errors } = await this.client.mutate({
        mutation: UPDATE_PROCESSING_STATUS,
        variables: {
          id: mediaId,
          status,
          jobId: options.jobId || null,
          thumbnailUrl: options.thumbnailUrl || null,
        },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      logger.error(
        "MediaService.updateProcessingStatus failed",
        error as Error,
        {
          mediaId,
        },
      );
      return this.handleError(error);
    }
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete media from storage and database
   */
  async deleteMedia(
    mediaId: string,
    userId: string,
  ): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      logger.debug("MediaService.deleteMedia", { mediaId, userId });

      // First get the media to verify ownership and get storage path
      const mediaResult = await this.getMediaInfo(mediaId);
      if (!mediaResult.success || !mediaResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Media not found",
          },
        };
      }

      const media = mediaResult.data;

      // Verify ownership
      if (media.userId !== userId) {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "You do not have permission to delete this media",
          },
        };
      }

      // Delete from storage
      const storagePath = media.metadata?.storage_path;
      if (storagePath) {
        await this.deleteFromStorage(storagePath);
      }

      // Delete database record
      const { errors } = await this.client.mutate({
        mutation: DELETE_MEDIA,
        variables: { id: mediaId },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      logger.info("MediaService.deleteMedia success", { mediaId, userId });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      logger.error("MediaService.deleteMedia failed", error as Error, {
        mediaId,
      });
      return this.handleError(error);
    }
  }

  /**
   * Bulk delete media
   */
  async bulkDeleteMedia(
    mediaIds: string[],
    userId: string,
  ): Promise<APIResponse<{ deletedCount: number; deletedIds: string[] }>> {
    try {
      logger.debug("MediaService.bulkDeleteMedia", {
        count: mediaIds.length,
        userId,
      });

      // Verify ownership of all media items
      const verificationPromises = mediaIds.map((id) => this.getMediaInfo(id));
      const verificationResults = await Promise.all(verificationPromises);

      const validIds: string[] = [];
      const storagePaths: string[] = [];

      for (let i = 0; i < verificationResults.length; i++) {
        const result = verificationResults[i];
        if (result.success && result.data && result.data.userId === userId) {
          validIds.push(mediaIds[i]);
          if (result.data.metadata?.storage_path) {
            storagePaths.push(result.data.metadata.storage_path);
          }
        }
      }

      if (validIds.length === 0) {
        return {
          success: true,
          data: { deletedCount: 0, deletedIds: [] },
        };
      }

      // Delete from storage (best effort)
      await Promise.allSettled(
        storagePaths.map((path) => this.deleteFromStorage(path)),
      );

      // Delete database records
      const { data, errors } = await this.client.mutate({
        mutation: BULK_DELETE_MEDIA,
        variables: { ids: validIds },
      });

      if (errors && errors.length > 0) {
        throw new Error(errors[0].message);
      }

      const result = data.delete_nchat_media;

      logger.info("MediaService.bulkDeleteMedia success", {
        deletedCount: result.affected_rows,
        userId,
      });

      return {
        success: true,
        data: {
          deletedCount: result.affected_rows,
          deletedIds: result.returning.map((m: { id: string }) => m.id),
        },
      };
    } catch (error) {
      logger.error("MediaService.bulkDeleteMedia failed", error as Error, {
        count: mediaIds.length,
      });
      return this.handleError(error);
    }
  }

  /**
   * Delete file from storage
   */
  private async deleteFromStorage(path: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.storageUrl}/files?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
          headers: {
            // Auth token would be added here
          },
        },
      );

      if (!response.ok) {
        logger.warn("Failed to delete file from storage", { path });
      }
    } catch (error) {
      logger.warn("Error deleting file from storage", { path, error });
    }
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate file for upload
   */
  validateFile(
    mimeType: string,
    size: number,
  ): { valid: boolean; error?: string } {
    // Check size
    if (size > this.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.formatBytes(this.maxFileSize)}`,
      };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `File type ${mimeType} is not allowed`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if media should be processed (thumbnails, etc.)
   */
  private shouldProcess(mimeType: string): boolean {
    return (
      ALLOWED_MIME_TYPES.images.includes(mimeType) ||
      ALLOWED_MIME_TYPES.videos.includes(mimeType)
    );
  }

  /**
   * Get media category from MIME type
   */
  getMediaCategory(
    mimeType: string,
  ): "image" | "video" | "audio" | "document" | "other" {
    if (ALLOWED_MIME_TYPES.images.includes(mimeType)) return "image";
    if (ALLOWED_MIME_TYPES.videos.includes(mimeType)) return "video";
    if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return "audio";
    if (ALLOWED_MIME_TYPES.documents.includes(mimeType)) return "document";
    return "other";
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * Transform GraphQL media data to TransformedMedia type
   */
  private transformMedia(data: MediaRecord): TransformedMedia {
    return {
      id: data.id,
      userId: data.user_id,
      channelId: data.channel_id,
      name: data.name,
      originalName: data.original_name,
      mimeType: data.mime_type,
      size: data.size,
      url: data.url,
      thumbnailUrl: data.thumbnail_url,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      user: data.user
        ? {
            id: data.user.id,
            displayName: data.user.display_name,
            avatarUrl: data.user.avatar_url,
          }
        : undefined,
      channel: data.channel
        ? {
            id: data.channel.id,
            name: data.channel.name,
            slug: data.channel.slug,
          }
        : null,
    };
  }

  /**
   * Transform multiple media records
   */
  private transformMediaList(data: MediaRecord[]): TransformedMedia[] {
    return data.map((m) => this.transformMedia(m));
  }

  /**
   * Handle errors and return API response
   */
  private handleError<T>(error: unknown): APIResponse<T> {
    const apolloError = error as ApolloError;

    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        status: 500,
        message: apolloError.message || "An error occurred",
        details: apolloError.graphQLErrors?.[0]?.message,
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let mediaServiceInstance: MediaService | null = null;

/**
 * Get or create the media service singleton
 */
export function getMediaService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  config?: Partial<MediaServiceConfig>,
): MediaService {
  if (!mediaServiceInstance) {
    mediaServiceInstance = new MediaService({
      apolloClient,
      ...config,
    });
  }
  return mediaServiceInstance;
}

/**
 * Create a new media service instance (for testing)
 */
export function createMediaService(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  config?: Partial<MediaServiceConfig>,
): MediaService {
  return new MediaService({
    apolloClient,
    ...config,
  });
}

export default MediaService;
