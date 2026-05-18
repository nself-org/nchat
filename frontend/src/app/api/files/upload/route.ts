/**
 * File Upload API Route
 *
 * POST /api/files/upload - Get presigned upload URL
 *
 * This endpoint generates a presigned URL for direct upload to S3/MinIO.
 * After upload, client should call POST /api/files/complete to finalize.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import {
  withAuth,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  getStorageConfig,
  getFileTypeConfig,
  FILE_SERVICE_CONSTANTS,
} from "@/services/files/config";
import { validateFile, getFileCategory } from "@/services/files/types";
import { getFileAccessService } from "@/services/files/access.service";
import { generateStoragePath } from "@/services/files/upload.service";

import { logger } from "@/lib/logger";

// Initialize S3 client
function getS3Client() {
  const config = getStorageConfig();

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
// POST - Get presigned upload URL or upload file directly
// ============================================================================

async function handleUpload(request: AuthenticatedRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const user = request.user;
    const fileConfig = getFileTypeConfig();
    const storageConfig = getStorageConfig();
    const accessService = getFileAccessService();
    const s3Client = getS3Client();

    // Get file size limits for user
    const limits = await accessService.getFileSizeLimits(user.id, user.role);

    // Check if this is a direct upload (multipart form) or presigned URL request (JSON)
    if (contentType.includes("multipart/form-data")) {
      // Direct file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const channelId = formData.get("channelId") as string | null;
      const messageId = formData.get("messageId") as string | null;

      if (!file) {
        return errorResponse("No file provided", "MISSING_FILE", 400);
      }

      // Check file size
      if (file.size > limits.maxFileSize) {
        return errorResponse(
          `File too large. Maximum size is ${formatBytes(limits.maxFileSize)}`,
          "FILE_TOO_LARGE",
          400,
        );
      }

      // Validate file type
      const validation = validateFile(file as unknown as File, fileConfig);
      if (!validation.valid) {
        return errorResponse(
          validation.error || "Invalid file",
          "INVALID_FILE",
          400,
        );
      }

      // Check channel access if uploading to channel
      if (channelId) {
        const accessCheck = await accessService.canUploadToChannel(
          user.id,
          channelId,
          user.role,
        );
        if (!accessCheck.allowed) {
          return errorResponse(
            accessCheck.reason || "Not authorized to upload to this channel",
            "ACCESS_DENIED",
            403,
          );
        }
      }

      // Generate file ID and storage path
      const fileId = uuidv4();
      const storagePath = generateStoragePath(fileId, file.name, {
        channelId: channelId || undefined,
        userId: user.id,
      });

      // Calculate content hash
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentHash = crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

      // Upload to S3/MinIO
      if (file.size > FILE_SERVICE_CONSTANTS.CHUNK_SIZE) {
        // Multipart upload for large files
        const multipartUpload = await s3Client.send(
          new CreateMultipartUploadCommand({
            Bucket: storageConfig.bucket,
            Key: storagePath,
            ContentType: file.type,
          }),
        );

        const uploadId = multipartUpload.UploadId;
        const parts: { ETag: string; PartNumber: number }[] = [];
        let partNumber = 1;
        let offset = 0;

        while (offset < file.size) {
          const end = Math.min(
            offset + FILE_SERVICE_CONSTANTS.CHUNK_SIZE,
            file.size,
          );
          const chunk = buffer.subarray(offset, end);

          const uploadPartResult = await s3Client.send(
            new UploadPartCommand({
              Bucket: storageConfig.bucket,
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

          partNumber++;
          offset = end;
        }

        await s3Client.send(
          new CompleteMultipartUploadCommand({
            Bucket: storageConfig.bucket,
            Key: storagePath,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
          }),
        );
      } else {
        // Single upload for small files
        await s3Client.send(
          new PutObjectCommand({
            Bucket: storageConfig.bucket,
            Key: storagePath,
            Body: buffer,
            ContentType: file.type,
            ContentLength: file.size,
          }),
        );
      }

      // Generate public URL
      const publicUrl = storageConfig.publicUrlBase
        ? `${storageConfig.publicUrlBase}/${storagePath}`
        : `${storageConfig.endpoint}/${storageConfig.bucket}/${storagePath}`;

      return successResponse({
        fileId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        storagePath,
        url: publicUrl,
        hash: contentHash,
        channelId,
        messageId,
        category: getFileCategory(file.type),
      });
    } else {
      // Presigned URL request
      const body = await request.json();
      const { fileName, mimeType, size, channelId, expiresIn = 3600 } = body;

      if (!fileName || !mimeType || !size) {
        return errorResponse(
          "fileName, mimeType, and size are required",
          "MISSING_PARAMS",
          400,
        );
      }

      // Check file size
      if (size > limits.maxFileSize) {
        return errorResponse(
          `File too large. Maximum size is ${formatBytes(limits.maxFileSize)}`,
          "FILE_TOO_LARGE",
          400,
        );
      }

      // Check channel access if uploading to channel
      if (channelId) {
        const accessCheck = await accessService.canUploadToChannel(
          user.id,
          channelId,
          user.role,
        );
        if (!accessCheck.allowed) {
          return errorResponse(
            accessCheck.reason || "Not authorized to upload to this channel",
            "ACCESS_DENIED",
            403,
          );
        }
      }

      // Generate file ID and storage path
      const fileId = uuidv4();
      const storagePath = generateStoragePath(fileId, fileName, {
        channelId: channelId || undefined,
        userId: user.id,
      });

      // Clamp expiry time
      const clampedExpiry = Math.min(
        expiresIn,
        FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
      );

      // Generate presigned URL
      const command = new PutObjectCommand({
        Bucket: storageConfig.bucket,
        Key: storagePath,
        ContentType: mimeType,
        ContentLength: size,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: clampedExpiry,
      });

      return successResponse({
        uploadUrl,
        fileId,
        storagePath,
        fileName,
        mimeType,
        size,
        channelId,
        expiresAt: new Date(Date.now() + clampedExpiry * 1000).toISOString(),
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
      });
    }
  } catch (error) {
    logger.error("File upload error:", error);
    return errorResponse("Upload failed", "UPLOAD_ERROR", 500, {
      details:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown error",
    });
  }
}

// Apply middleware
export const POST = compose(
  withRateLimit({ limit: 30, window: 60 }), // 30 uploads per minute
  withAuth,
)(handleUpload);

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// Route configuration
// ============================================================================

export const config = {
  api: {
    bodyParser: false,
  },
};
