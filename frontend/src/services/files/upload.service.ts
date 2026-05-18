/**
 * File Upload Service
 *
 * Handles file uploads to S3/MinIO-compatible storage.
 * Supports presigned URLs, direct uploads, and integration with the
 * file-processing plugin for thumbnails, optimization, and virus scanning.
 */

import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  FileRecord,
  UploadRequest,
  UploadResponse,
  UploadProgress,
  ProcessingOperation,
  FileTypeConfig,
  StorageConfig,
} from "./types";

import {
  validateFile,
  getDefaultOperations,
  getFileCategory,
  DEFAULT_FILE_CONFIG,
} from "./types";
import {
  getStorageConfig,
  getFileTypeConfig,
  getProcessingConfig,
  FILE_SERVICE_CONSTANTS,
} from "./config";
import { getFileAccessService, type UserRole } from "./access.service";

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

/**
 * Create S3 client from explicit config (for testing or custom configs)
 */
export function createS3Client(config: StorageConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region || "us-east-1",
    credentials: {
      accessKeyId: config.accessKey || "",
      secretAccessKey: config.secretKey || "",
    },
    forcePathStyle: config.provider === "minio",
  });
}

// ============================================================================
// Storage Path Generation
// ============================================================================

/**
 * Generate storage path for uploaded file
 * Format: {channelId}/{userId}/{uuid}-{filename}
 */
export function generateStoragePath(
  fileId: string,
  fileName: string,
  options: {
    channelId?: string;
    userId?: string;
    prefix?: string;
  } = {},
): string {
  const { channelId, userId, prefix } = options;

  // Sanitize filename - remove special characters but keep extension
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 100); // Limit filename length

  // Build path based on context
  if (channelId && userId) {
    return `${channelId}/${userId}/${fileId}-${sanitizedName}`;
  } else if (channelId) {
    return `${channelId}/${fileId}-${sanitizedName}`;
  } else if (userId) {
    return `users/${userId}/${fileId}-${sanitizedName}`;
  } else if (prefix) {
    return `${prefix}/${fileId}-${sanitizedName}`;
  }

  return `uploads/${fileId}-${sanitizedName}`;
}

// ============================================================================
// Upload Service Class
// ============================================================================

export class UploadService {
  private storageConfig: StorageConfig;
  private fileConfig: FileTypeConfig;
  private processingConfig: ReturnType<typeof getProcessingConfig>;
  private s3Client: S3Client;

  constructor(storageConfig?: StorageConfig, fileConfig?: FileTypeConfig) {
    this.storageConfig = storageConfig || getStorageConfig();
    this.fileConfig = fileConfig || getFileTypeConfig();
    this.processingConfig = getProcessingConfig();
    this.s3Client = storageConfig
      ? createS3Client(storageConfig)
      : getS3Client();
  }

  /**
   * Upload a single file
   */
  async uploadFile(
    request: UploadRequest,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResponse> {
    const { file, channelId, messageId, operations, metadata } = request;
    const userId = metadata?.userId as string | undefined;

    // Check if file exists
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file
    const validation = validateFile(file, this.fileConfig);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check file size limits based on user role
    if (userId) {
      const accessService = getFileAccessService();
      const limits = await accessService.getFileSizeLimits(
        userId,
        metadata?.userRole as UserRole | undefined,
      );
      if (file.size > limits.maxFileSize) {
        throw new Error(
          `File too large. Maximum size is ${formatBytes(limits.maxFileSize)}`,
        );
      }
    }

    // Generate file ID and storage path
    const fileId = uuidv4();
    const storagePath = generateStoragePath(fileId, file.name, {
      channelId,
      userId,
    });
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    // Create initial progress
    const progress: UploadProgress = {
      fileId,
      fileName: file.name,
      status: "pending",
      progress: 0,
      bytesUploaded: 0,
      bytesTotal: file.size,
      startedAt: new Date(),
    };

    onProgress?.(progress);

    try {
      // Upload to storage
      progress.status = "uploading";
      onProgress?.(progress);

      const uploadResult = await this.uploadToS3(
        file,
        storagePath,
        (uploaded, total) => {
          progress.bytesUploaded = uploaded;
          progress.progress = Math.round((uploaded / total) * 100);
          if (progress.startedAt) {
            const elapsed = Date.now() - progress.startedAt.getTime();
            progress.speed = uploaded / (elapsed / 1000);
            const remaining = total - uploaded;
            progress.timeRemaining =
              progress.speed > 0 ? remaining / progress.speed : undefined;
          }
          onProgress?.(progress);
        },
      );

      // Generate storage URL
      const storageUrl = this.getStorageUrl(storagePath);

      // Create file record
      const fileRecord: FileRecord = {
        id: fileId,
        name: file.name,
        storagePath,
        url: storageUrl,
        size: file.size,
        mimeType: file.type,
        extension,
        bucket: this.storageConfig.bucket,
        provider: this.storageConfig.provider,
        uploadedBy: userId || "",
        uploadedAt: new Date(),
        processingStatus: "pending",
        channelId,
        messageId,
        isDeleted: false,
        contentHash: uploadResult.hash,
      };

      // Trigger processing if needed
      let jobId: string | undefined;
      const fileCategory = getFileCategory(file.type);
      const shouldProcess =
        fileCategory === "image" ||
        fileCategory === "video" ||
        this.fileConfig.enableVirusScan;

      if (shouldProcess) {
        progress.status = "processing";
        onProgress?.(progress);

        const processingOps =
          operations || getDefaultOperations(file.type, this.fileConfig);
        const processingResult = await this.triggerProcessing(
          fileRecord,
          processingOps,
        );
        jobId = processingResult.jobId;
        fileRecord.processingJobId = jobId;
        fileRecord.processingStatus = "processing";
      } else {
        fileRecord.processingStatus = "completed";
      }

      // Mark upload as complete
      progress.status = "completed";
      progress.progress = 100;
      progress.completedAt = new Date();
      onProgress?.(progress);

      return {
        success: true,
        file: fileRecord,
        jobId,
      };
    } catch (error) {
      progress.status = "failed";
      progress.error = error instanceof Error ? error.message : "Upload failed";
      onProgress?.(progress);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    requests: UploadRequest[],
    onProgress?: (fileId: string, progress: UploadProgress) => void,
  ): Promise<UploadResponse[]> {
    const results: UploadResponse[] = [];
    const queue = [...requests];
    const inProgress = new Map<string, Promise<UploadResponse>>();

    while (queue.length > 0 || inProgress.size > 0) {
      // Start new uploads if below concurrency limit
      while (
        queue.length > 0 &&
        inProgress.size < FILE_SERVICE_CONSTANTS.MAX_CONCURRENT_UPLOADS
      ) {
        const request = queue.shift()!;
        const tempId = uuidv4(); // Temporary ID for tracking

        const promise = this.uploadFile(request, (progress) => {
          onProgress?.(tempId, progress);
        })
          .then((result) => {
            // Update tracking with real file ID
            results.push(result);
            return result;
          })
          .finally(() => {
            inProgress.delete(tempId);
          });

        inProgress.set(tempId, promise);
      }

      // Wait for at least one upload to complete
      if (inProgress.size > 0) {
        await Promise.race(inProgress.values());
      }
    }

    return results;
  }

  /**
   * Get a presigned upload URL for direct browser upload
   */
  async getPresignedUploadUrl(
    fileName: string,
    mimeType: string,
    size: number,
    options: {
      channelId?: string;
      userId?: string;
      expiresIn?: number;
      userRole?: UserRole;
    } = {},
  ): Promise<{
    uploadUrl: string;
    fileId: string;
    storagePath: string;
    fields?: Record<string, string>;
    expiresAt: Date;
    method: "PUT";
    headers: Record<string, string>;
  }> {
    // Check file size limits
    if (options.userId) {
      const accessService = getFileAccessService();
      const limits = await accessService.getFileSizeLimits(
        options.userId,
        options.userRole,
      );
      if (size > limits.maxFileSize) {
        throw new Error(
          `File too large. Maximum size is ${formatBytes(limits.maxFileSize)}`,
        );
      }
    }

    const fileId = uuidv4();
    const storagePath = generateStoragePath(fileId, fileName, {
      channelId: options.channelId,
      userId: options.userId,
    });

    const expiresIn = Math.min(
      options.expiresIn || 3600,
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );

    const command = new PutObjectCommand({
      Bucket: this.storageConfig.bucket,
      Key: storagePath,
      ContentType: mimeType,
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return {
      uploadUrl,
      fileId,
      storagePath,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
    };
  }

  /**
   * Cancel an in-progress upload (for multipart uploads)
   */
  async cancelUpload(
    fileId: string,
    uploadId?: string,
    storagePath?: string,
  ): Promise<void> {
    if (uploadId && storagePath) {
      try {
        await this.s3Client.send(
          new AbortMultipartUploadCommand({
            Bucket: this.storageConfig.bucket,
            Key: storagePath,
            UploadId: uploadId,
          }),
        );
      } catch (error) {
        logger.error("Failed to abort multipart upload:", error);
      }
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.storageConfig.bucket,
          Key: storagePath,
        }),
      );
      logger.info(`File deleted from storage: ${storagePath}`);
    } catch (error) {
      logger.error("Failed to delete file from storage:", error);
      throw error;
    }
  }

  /**
   * Get public URL for a file in storage
   */
  getStorageUrl(storagePath: string): string {
    // Use Nhost storage URL if available
    const nhostStorageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
    if (nhostStorageUrl) {
      return `${nhostStorageUrl}/files/${storagePath}`;
    }

    // Use public URL base if configured
    if (this.storageConfig.publicUrlBase) {
      return `${this.storageConfig.publicUrlBase}/${storagePath}`;
    }

    // Default MinIO URL pattern
    return `${this.storageConfig.endpoint}/${this.storageConfig.bucket}/${storagePath}`;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Upload file directly to S3/MinIO
   */
  private async uploadToS3(
    file: File,
    storagePath: string,
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<{ url: string; hash?: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate hash for deduplication
    let hash: string | undefined;
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Use multipart upload for large files
    if (file.size > FILE_SERVICE_CONSTANTS.CHUNK_SIZE) {
      await this.multipartUpload(buffer, storagePath, file.type, onProgress);
    } else {
      // Single upload for small files
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.storageConfig.bucket,
          Key: storagePath,
          Body: buffer,
          ContentType: file.type,
          ContentLength: file.size,
        }),
      );
      onProgress?.(file.size, file.size);
    }

    return {
      url: this.getStorageUrl(storagePath),
      hash,
    };
  }

  /**
   * Multipart upload for large files
   */
  private async multipartUpload(
    buffer: Buffer,
    storagePath: string,
    contentType: string,
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<void> {
    const multipartUpload = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.storageConfig.bucket,
        Key: storagePath,
        ContentType: contentType,
      }),
    );

    const uploadId = multipartUpload.UploadId;
    const parts: { ETag: string; PartNumber: number }[] = [];
    let partNumber = 1;
    let offset = 0;
    let totalUploaded = 0;

    try {
      while (offset < buffer.length) {
        const end = Math.min(
          offset + FILE_SERVICE_CONSTANTS.CHUNK_SIZE,
          buffer.length,
        );
        const chunk = buffer.subarray(offset, end);

        const uploadPartResult = await this.s3Client.send(
          new UploadPartCommand({
            Bucket: this.storageConfig.bucket,
            Key: storagePath,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: chunk,
          }),
        );

        parts.push({
          ETag: uploadPartResult.ETag!,
          PartNumber: partNumber,
        });

        totalUploaded += chunk.length;
        onProgress?.(totalUploaded, buffer.length);

        partNumber++;
        offset = end;
      }

      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.storageConfig.bucket,
          Key: storagePath,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      );
    } catch (error) {
      // Abort on error
      await this.s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.storageConfig.bucket,
          Key: storagePath,
          UploadId: uploadId,
        }),
      );
      throw error;
    }
  }

  /**
   * Trigger file processing via the file-processing plugin
   */
  private async triggerProcessing(
    file: FileRecord,
    operations: ProcessingOperation[],
  ): Promise<{ jobId: string; status: string; estimatedDuration?: number }> {
    const jobRequest = {
      fileId: file.id,
      filePath: file.storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType,
      operations,
      priority: 5,
      webhookUrl: this.processingConfig.webhookUrl || undefined,
      webhookSecret: this.processingConfig.webhookSecret || undefined,
      callbackData: {
        channelId: file.channelId,
        messageId: file.messageId,
      },
    };

    try {
      const response = await fetch(
        `${this.processingConfig.baseUrl}/api/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobRequest),
          signal: AbortSignal.timeout(this.processingConfig.timeout),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create processing job: ${error}`);
      }

      return response.json();
    } catch (error) {
      // When the virus scanning service is unavailable, behavior is controlled by
      // NEXT_PUBLIC_ALLOW_UNSCANNED_UPLOADS. Default (flag absent/false): reject the
      // upload with a user-facing error so files are never silently skipped. If the
      // operator explicitly opts in to unscanned uploads, log a loud security warning
      // and a telemetry event before allowing the skipped-scan path.
      if (operations.includes("scan")) {
        const allowUnscanned =
          process.env.NEXT_PUBLIC_ALLOW_UNSCANNED_UPLOADS === "true";

        if (!allowUnscanned) {
          throw new Error(
            "Virus scanner unavailable. Please retry in a few minutes.",
          );
        }

        // Operator has explicitly opted in — emit loud security warning and telemetry.
        console.warn(
          `SECURITY: virus scan skipped for file ${file.id}; ALLOW_UNSCANNED_UPLOADS=true`,
        );
        // Fire-and-forget telemetry — must not block the rejection/upload path.
        void fetch("/api/telemetry/security-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "virus_scan_skipped",
            fileId: file.id,
            reason: "scanner_unavailable",
            allowUnscanned: true,
          }),
        }).catch(() => {
          // Telemetry failure must never affect the upload path.
        });
      }

      // Flag is ON or scan was not requested — return skipped job.
      return {
        jobId: `local-${file.id}`,
        status: "skipped",
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let uploadServiceInstance: UploadService | null = null;

export function getUploadService(): UploadService {
  if (!uploadServiceInstance) {
    uploadServiceInstance = new UploadService();
  }
  return uploadServiceInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate content hash for file deduplication
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get video metadata from file
 */
export function getVideoMetadata(
  file: File,
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

/**
 * Get audio duration from file
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio"));
    };

    audio.src = url;
  });
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
