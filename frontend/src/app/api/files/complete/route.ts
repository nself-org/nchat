/**
 * File Upload Complete API Route
 *
 * POST /api/files/complete - Finalize upload and create database record
 *
 * Called after a file has been uploaded via presigned URL to create
 * the database record and trigger processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerApolloClient } from "@/lib/apollo-client";
import {
  withAuth,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";
import { INSERT_FILE } from "@/graphql/files";
import {
  getStorageConfig,
  getFileTypeConfig,
  getProcessingConfig,
} from "@/services/files/config";
import { getFileCategory, getDefaultOperations } from "@/services/files/types";
import { getFileAccessService } from "@/services/files/access.service";

import { logger } from "@/lib/logger";

// ============================================================================
// POST - Finalize upload and create database record
// ============================================================================

async function handleComplete(request: AuthenticatedRequest) {
  try {
    const user = request.user;
    const body = await request.json();

    const {
      fileId,
      fileName,
      originalName,
      mimeType,
      size,
      storagePath,
      channelId,
      messageId,
      contentHash,
      width,
      height,
      duration,
      metadata,
    } = body;

    // Validate required fields
    if (!fileId || !fileName || !mimeType || !size || !storagePath) {
      return errorResponse(
        "fileId, fileName, mimeType, size, and storagePath are required",
        "MISSING_PARAMS",
        400,
      );
    }

    // Check channel access if uploading to channel
    if (channelId) {
      const accessService = getFileAccessService();
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

    // Generate file URL
    const storageConfig = getStorageConfig();
    const fileUrl = storageConfig.publicUrlBase
      ? `${storageConfig.publicUrlBase}/${storagePath}`
      : `${storageConfig.endpoint}/${storageConfig.bucket}/${storagePath}`;

    // Determine processing status
    const fileConfig = getFileTypeConfig();
    const fileCategory = getFileCategory(mimeType);
    const shouldProcess =
      fileCategory === "image" ||
      fileCategory === "video" ||
      fileConfig.enableVirusScan;

    let processingStatus = "completed";
    let processingJobId: string | undefined;

    // Trigger processing if needed
    if (shouldProcess) {
      processingStatus = "pending";
      const processingConfig = getProcessingConfig();
      const operations = getDefaultOperations(mimeType, fileConfig);

      try {
        const processingResponse = await fetch(
          `${processingConfig.baseUrl}/api/jobs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileId,
              filePath: storagePath,
              fileName,
              fileSize: size,
              mimeType,
              operations,
              priority: 5,
              webhookUrl: processingConfig.webhookUrl || undefined,
              webhookSecret: processingConfig.webhookSecret || undefined,
              callbackData: { channelId, messageId },
            }),
            signal: AbortSignal.timeout(processingConfig.timeout),
          },
        );

        if (processingResponse.ok) {
          const processingData = await processingResponse.json();
          processingJobId = processingData.jobId;
          processingStatus = "processing";
        }
      } catch (error) {
        // Log warning if virus scanning is enabled but service unavailable
        if (operations.includes("scan")) {
          console.warn(
            "[Files/Complete] Virus scanning service unavailable. File saved without scanning.",
          );
        }
        // Continue without processing - file is still saved
      }
    }

    // Create file record in database
    const client = getServerApolloClient();
    const { data, errors } = await client.mutate({
      mutation: INSERT_FILE,
      variables: {
        id: fileId,
        messageId: messageId || null,
        userId: user.id,
        channelId: channelId || null,
        fileName: fileName,
        originalName: originalName || fileName,
        fileType: mimeType,
        fileSize: size,
        storagePath,
        fileUrl,
        width: width || null,
        height: height || null,
        duration: duration || null,
        metadata: metadata || {},
        processingStatus,
        processingJobId: processingJobId || null,
        contentHash: contentHash || null,
      },
    });

    if (errors && errors.length > 0) {
      logger.error("[Files/Complete] GraphQL errors:", errors);
      return errorResponse(
        "Failed to create file record",
        "DATABASE_ERROR",
        500,
        {
          errors: errors.map((e) => e.message),
        },
      );
    }

    const attachment = data?.insert_nchat_attachments_one;

    return successResponse({
      file: {
        id: attachment?.id || fileId,
        fileName,
        originalName: originalName || fileName,
        mimeType,
        size,
        storagePath,
        url: fileUrl,
        channelId,
        messageId,
        processingStatus,
        processingJobId,
        contentHash,
        createdAt: attachment?.created_at || new Date().toISOString(),
      },
      jobId: processingJobId,
    });
  } catch (error) {
    logger.error("File complete error:", error);
    return errorResponse("Failed to complete upload", "COMPLETE_ERROR", 500, {
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
  withRateLimit({ limit: 60, window: 60 }), // 60 completions per minute
  withAuth,
)(handleComplete);
