/**
 * Signed URL API Route
 *
 * POST /api/files/signed-url - Generate signed URLs for file operations
 *
 * Supports both upload and download signed URL generation with access control.
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  withAuth,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  getStorageConfig,
  FILE_SERVICE_CONSTANTS,
} from "@/services/files/config";
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
// POST - Generate signed URL
// ============================================================================

async function handleSignedUrl(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    const body = await request.json();

    const {
      operation = "download", // 'download' | 'upload'
      fileId,
      storagePath,
      bucket,
      expiresIn = FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
      disposition = "inline",
      filename,
      mimeType,
      size,
      channelId,
    } = body;

    const storageConfig = getStorageConfig();
    const s3Client = getS3Client();
    const targetBucket = bucket || storageConfig.bucket;
    const accessService = getFileAccessService();

    // Clamp expiry time
    const clampedExpiry = Math.min(
      expiresIn,
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );

    if (operation === "upload") {
      // Generate presigned URL for upload
      if (!filename || !mimeType) {
        return errorResponse(
          "filename and mimeType are required for upload",
          "MISSING_PARAMS",
          400,
        );
      }

      // Check file size limits
      if (size) {
        const limits = await accessService.getFileSizeLimits(
          user.id,
          user.role as any,
        );
        if (size > limits.maxFileSize) {
          return errorResponse(
            `File too large. Maximum size is ${formatBytes(limits.maxFileSize)}`,
            "FILE_TOO_LARGE",
            400,
          );
        }
      }

      // Check channel access if uploading to channel
      if (channelId) {
        const accessCheck = await accessService.canUploadToChannel(
          user.id,
          channelId,
          user.role as any,
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
      const newFileId = fileId || uuidv4();
      const path =
        storagePath ||
        generateStoragePath(newFileId, filename, {
          channelId: channelId || undefined,
          userId: user.id,
        });

      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: path,
        ContentType: mimeType || "application/octet-stream",
        ContentLength: size,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: clampedExpiry,
      });

      return successResponse({
        uploadUrl: signedUrl,
        fileId: newFileId,
        storagePath: path,
        expiresAt: new Date(Date.now() + clampedExpiry * 1000).toISOString(),
        method: "PUT",
        headers: {
          "Content-Type": mimeType || "application/octet-stream",
        },
      });
    } else {
      // Generate presigned URL for download
      if (!storagePath) {
        return errorResponse(
          "storagePath is required for download",
          "MISSING_PARAMS",
          400,
        );
      }

      // Check access control
      const accessCheck = await accessService.canAccessByStoragePath(
        user.id,
        storagePath,
        user.role as any,
      );

      if (!accessCheck.allowed) {
        return errorResponse(
          accessCheck.reason || "Access denied",
          "ACCESS_DENIED",
          403,
        );
      }

      const downloadFilename =
        filename || storagePath.split("/").pop() || "download";

      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: storagePath,
        ResponseContentDisposition:
          disposition === "attachment"
            ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
            : `inline; filename="${encodeURIComponent(downloadFilename)}"`,
        ResponseCacheControl: "public, max-age=31536000, immutable",
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: clampedExpiry,
      });

      return successResponse({
        url: signedUrl,
        expiresAt: new Date(Date.now() + clampedExpiry * 1000).toISOString(),
        filename: downloadFilename,
      });
    }
  } catch (error) {
    logger.error("Signed URL generation error:", error);
    return errorResponse(
      "Failed to generate signed URL",
      "SIGNED_URL_ERROR",
      500,
      {
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
    );
  }
}

// Apply middleware
export const POST = compose(
  withRateLimit({ limit: 100, window: 60 }), // 100 signed URLs per minute
  withAuth,
)(handleSignedUrl);

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
