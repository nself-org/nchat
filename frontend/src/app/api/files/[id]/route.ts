/**
 * File Detail API Route
 *
 * GET /api/files/[id] - Get file information and signed download URL
 * DELETE /api/files/[id] - Delete a file (owner or admin only)
 * PATCH /api/files/[id] - Update file metadata
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerApolloClient } from "@/lib/apollo-client";
import {
  withAuth,
  withOptionalAuth,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";
import {
  GET_FILE_BY_ID,
  UPDATE_FILE,
  DELETE_FILE,
  HARD_DELETE_FILE,
} from "@/graphql/files";
import {
  getStorageConfig,
  getProcessingConfig,
  FILE_SERVICE_CONSTANTS,
} from "@/services/files/config";
import { getFileAccessService } from "@/services/files/access.service";

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
// GET - Get file information and signed download URL
// ============================================================================

async function handleGet(
  request: NextRequest & { user?: { id: string; role: string } },
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const user = (request as any).user;
    const { searchParams } = new URL(request.url);
    const disposition = (searchParams.get("disposition") || "inline") as
      | "inline"
      | "attachment";
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600", 10);

    // Get file from database
    const client = getServerApolloClient();
    const { data, errors } = await client.query({
      query: GET_FILE_BY_ID,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (errors && errors.length > 0) {
      logger.error("[Files/Get] GraphQL errors:", errors);
      return errorResponse("Failed to fetch file", "DATABASE_ERROR", 500);
    }

    const attachment = data?.nchat_attachments_by_pk;
    if (!attachment) {
      return errorResponse("File not found", "NOT_FOUND", 404);
    }

    if (attachment.is_deleted) {
      return errorResponse("File has been deleted", "DELETED", 410);
    }

    // Check access control
    if (user) {
      const accessService = getFileAccessService();
      const accessCheck = await accessService.canAccessFile(
        user.id,
        id,
        user.role as any,
      );

      if (!accessCheck.allowed) {
        return errorResponse(
          accessCheck.reason || "Access denied",
          "ACCESS_DENIED",
          403,
        );
      }
    } else {
      // Unauthenticated access - only allow for public channels
      // For now, require authentication
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // Generate signed download URL
    const storageConfig = getStorageConfig();
    const s3Client = getS3Client();

    const clampedExpiry = Math.min(
      expiresIn,
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );

    const command = new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: attachment.storage_path,
      ResponseContentDisposition:
        disposition === "attachment"
          ? `attachment; filename="${encodeURIComponent(attachment.file_name)}"`
          : `inline; filename="${encodeURIComponent(attachment.file_name)}"`,
      ResponseCacheControl: "public, max-age=31536000, immutable",
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: clampedExpiry,
    });

    // Get processing status if processing
    let processingInfo = null;
    if (
      attachment.processing_status === "processing" &&
      attachment.processing_job_id
    ) {
      const processingConfig = getProcessingConfig();
      try {
        const jobResponse = await fetch(
          `${processingConfig.baseUrl}/api/jobs/${attachment.processing_job_id}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (jobResponse.ok) {
          processingInfo = await jobResponse.json();
        }
      } catch {
        // Processing service unavailable
      }
    }

    return successResponse({
      id: attachment.id,
      messageId: attachment.message_id,
      userId: attachment.user_id,
      channelId: attachment.channel_id,
      fileName: attachment.file_name,
      originalName: attachment.original_name,
      mimeType: attachment.file_type,
      size: attachment.file_size,
      storagePath: attachment.storage_path,
      url: attachment.file_url,
      downloadUrl,
      downloadUrlExpiresAt: new Date(
        Date.now() + clampedExpiry * 1000,
      ).toISOString(),
      thumbnailUrl: attachment.thumbnail_url,
      width: attachment.width,
      height: attachment.height,
      duration: attachment.duration,
      metadata: attachment.metadata,
      processingStatus: attachment.processing_status,
      processingJobId: attachment.processing_job_id,
      contentHash: attachment.content_hash,
      createdAt: attachment.created_at,
      updatedAt: attachment.updated_at,
      processing: processingInfo,
      message: attachment.message,
    });
  } catch (error) {
    logger.error("[Files/Get] Error:", error);
    return errorResponse("Failed to get file", "ERROR", 500);
  }
}

// ============================================================================
// DELETE - Delete a file
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const user = request.user;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    // Check delete permission
    const accessService = getFileAccessService();
    const accessCheck = await accessService.canDeleteFile(
      user.id,
      id,
      user.role as any,
    );

    if (!accessCheck.allowed) {
      return errorResponse(
        accessCheck.reason || "Not authorized to delete this file",
        "ACCESS_DENIED",
        403,
      );
    }

    // Get file info first
    const client = getServerApolloClient();
    const { data: fileData } = await client.query({
      query: GET_FILE_BY_ID,
      variables: { id },
      fetchPolicy: "network-only",
    });

    const attachment = fileData?.nchat_attachments_by_pk;
    if (!attachment) {
      return errorResponse("File not found", "NOT_FOUND", 404);
    }

    if (permanent) {
      // Delete from storage
      const s3Client = getS3Client();
      const storageConfig = getStorageConfig();

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: storageConfig.bucket,
            Key: attachment.storage_path,
          }),
        );

        // Delete thumbnail if exists
        if (attachment.thumbnail_url) {
          const thumbnailPath = attachment.storage_path.replace(
            /(\.[^.]+)$/,
            "_thumb$1",
          );
          try {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucket,
                Key: thumbnailPath,
              }),
            );
          } catch {
            // Thumbnail may not exist
          }
        }
      } catch (error) {
        logger.error("[Files/Delete] Storage deletion error:", error);
        // Continue with database deletion even if storage fails
      }

      // Hard delete from database
      const { errors } = await client.mutate({
        mutation: HARD_DELETE_FILE,
        variables: { id },
      });

      if (errors && errors.length > 0) {
        logger.error("[Files/Delete] GraphQL errors:", errors);
        return errorResponse("Failed to delete file", "DATABASE_ERROR", 500);
      }

      return successResponse({ success: true, deleted: true, permanent: true });
    } else {
      // Soft delete
      const { errors } = await client.mutate({
        mutation: DELETE_FILE,
        variables: { id },
      });

      if (errors && errors.length > 0) {
        logger.error("[Files/Delete] GraphQL errors:", errors);
        return errorResponse("Failed to delete file", "DATABASE_ERROR", 500);
      }

      return successResponse({
        success: true,
        deleted: true,
        permanent: false,
      });
    }
  } catch (error) {
    logger.error("[Files/Delete] Error:", error);
    return errorResponse("Failed to delete file", "ERROR", 500);
  }
}

// ============================================================================
// PATCH - Update file metadata
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const user = request.user;
    const body = await request.json();

    // Check access permission
    const accessService = getFileAccessService();
    const accessCheck = await accessService.canDeleteFile(
      user.id,
      id,
      user.role as any,
    );

    // Allow update if user can delete (owner or admin)
    if (!accessCheck.allowed) {
      return errorResponse(
        "Not authorized to update this file",
        "ACCESS_DENIED",
        403,
      );
    }

    // Allowed fields to update
    const { fileName, thumbnailUrl, width, height, duration, metadata } = body;

    const client = getServerApolloClient();
    const { data, errors } = await client.mutate({
      mutation: UPDATE_FILE,
      variables: {
        id,
        fileName: fileName || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        width: width || undefined,
        height: height || undefined,
        duration: duration || undefined,
        metadata: metadata || undefined,
      },
    });

    if (errors && errors.length > 0) {
      logger.error("[Files/Patch] GraphQL errors:", errors);
      return errorResponse("Failed to update file", "DATABASE_ERROR", 500);
    }

    return successResponse(data?.update_nchat_attachments_by_pk);
  } catch (error) {
    logger.error("[Files/Patch] Error:", error);
    return errorResponse("Failed to update file", "ERROR", 500);
  }
}

// ============================================================================
// POST - Processing complete callback
// ============================================================================

async function handlePost(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate webhook secret if configured
    const processingConfig = getProcessingConfig();
    if (processingConfig.webhookSecret) {
      const signature = request.headers.get("x-webhook-signature");
      if (!signature) {
        return errorResponse("Missing webhook signature", "UNAUTHORIZED", 401);
      }
      // Verify signature (implementation depends on signing method)
    }

    const { status, thumbnails, metadata, width, height, duration, error } =
      body;

    // Update file processing status
    const client = getServerApolloClient();
    const { errors } = await client.mutate({
      mutation: UPDATE_FILE,
      variables: {
        id,
        processingStatus: status,
        thumbnailUrl: thumbnails?.[0]?.url || undefined,
        width: width || undefined,
        height: height || undefined,
        duration: duration || undefined,
        metadata: metadata
          ? { ...metadata, processingError: error }
          : undefined,
      },
    });

    if (errors && errors.length > 0) {
      logger.error("[Files/Post] GraphQL errors:", errors);
      return errorResponse(
        "Failed to update processing status",
        "DATABASE_ERROR",
        500,
      );
    }

    return successResponse({ success: true });
  } catch (error) {
    logger.error("[Files/Post] Error:", error);
    return errorResponse("Failed to update processing status", "ERROR", 500);
  }
}

// Apply middleware
// Note: Type casting needed due to generic constraints in middleware
export const GET = compose(
  withRateLimit({ limit: 100, window: 60 }),
  withOptionalAuth,
)(handleGet as any) as any;

export const DELETE = compose(
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handleDelete as any) as any;

export const PATCH = compose(
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(handlePatch as any) as any;

export const POST = withRateLimit({ limit: 100, window: 60 })(
  handlePost as any,
) as any;
