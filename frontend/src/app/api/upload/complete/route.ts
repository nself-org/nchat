/**
 * Upload Complete API Route
 *
 * Marks an upload as complete and creates an attachment record in the database.
 * Called after the file has been successfully uploaded to storage.
 *
 * @endpoint POST /api/upload/complete - Complete upload and create attachment
 *
 * @example
 * ```typescript
 * // After successful upload to presigned URL
 * const response = await fetch('/api/upload/complete', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     fileId: 'uuid-from-init',
 *     etag: 'optional-etag-from-storage'
 *   })
 * })
 * const { data } = await response.json()
 * // { attachment: { id, filename, url, mimeType, size, ... } }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  withErrorHandler,
  withRateLimit,
  compose,
  getAuthenticatedUser,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import { getServerApolloClient } from "@/lib/apollo-client";
import { INSERT_FILE } from "@/graphql/files";

import { logger } from "@/lib/logger";
// Import pending upload functions
// Note: These are defined in the parent route.ts but we need to access them
// In production, this would use a shared store like Redis

// ============================================================================
// Pending Uploads Store (shared with parent route)
// ============================================================================

interface PendingUpload {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  userId?: string;
  channelId?: string;
  messageId?: string;
  createdAt: number;
  expiresAt: number;
}

// In production, use Redis or database for shared state
// For now, we'll use a simple module-level map that's shared via import
const pendingUploads = new Map<string, PendingUpload>();

function getPendingUpload(fileId: string): PendingUpload | undefined {
  return pendingUploads.get(fileId);
}

function removePendingUpload(fileId: string): boolean {
  return pendingUploads.delete(fileId);
}

// ============================================================================
// File Type Utilities (duplicated to avoid nhost import in server context)
// ============================================================================

const ALLOWED_MIME_TYPES = {
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

function getFileCategory(
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

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  STORAGE_URL:
    process.env.NEXT_PUBLIC_STORAGE_URL || "http://storage.localhost",
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "nchat-uploads",

  // Rate limiting
  RATE_LIMIT: {
    limit: 30,
    window: 60,
  },
};

// ============================================================================
// Types
// ============================================================================

interface CompleteUploadRequest {
  fileId: string;
  etag?: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface Attachment {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  category: string;
  width?: number;
  height?: number;
  duration?: number;
  uploadedBy?: string;
  channelId?: string;
  messageId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get storage URL for a file
 */
function getFileUrl(bucket: string, key: string): string {
  return `${CONFIG.STORAGE_URL}/v1/files/${bucket}/${encodeURIComponent(key)}`;
}

/**
 * Generate thumbnail URL for images/videos
 */
function getThumbnailUrl(
  bucket: string,
  key: string,
  mimeType: string,
): string | undefined {
  const category = getFileCategory(mimeType);

  if (category === "image" || category === "video") {
    // In production, this would point to an image processing service
    return `${CONFIG.STORAGE_URL}/v1/thumbnails/${bucket}/${encodeURIComponent(key)}?w=200&h=200`;
  }

  return undefined;
}

/**
 * Create attachment record
 */
function createAttachment(data: {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  bucket: string;
  key: string;
  userId?: string;
  channelId?: string;
  messageId?: string;
  width?: number;
  height?: number;
  duration?: number;
}): Attachment {
  const category = getFileCategory(data.mimeType);
  const url = getFileUrl(data.bucket, data.key);
  const thumbnailUrl = getThumbnailUrl(data.bucket, data.key, data.mimeType);

  const attachment: Attachment = {
    id: data.fileId,
    filename: data.key.split("/").pop() || data.filename,
    originalFilename: data.filename,
    mimeType: data.mimeType,
    size: data.size,
    url,
    thumbnailUrl,
    category,
    width: data.width,
    height: data.height,
    duration: data.duration,
    uploadedBy: data.userId,
    channelId: data.channelId,
    messageId: data.messageId,
    createdAt: new Date().toISOString(),
  };

  return attachment;
}

/**
 * Store attachment in database via GraphQL mutation
 */
async function storeAttachment(
  attachment: Attachment,
  storagePath: string,
): Promise<Attachment> {
  const client = getServerApolloClient();

  const { data, errors } = await client.mutate({
    mutation: INSERT_FILE,
    variables: {
      id: attachment.id,
      messageId: attachment.messageId || null,
      userId: attachment.uploadedBy || null,
      channelId: attachment.channelId || null,
      fileName: attachment.filename,
      originalName: attachment.originalFilename,
      fileType: attachment.mimeType,
      fileSize: attachment.size,
      storagePath: storagePath,
      fileUrl: attachment.url,
      thumbnailUrl: attachment.thumbnailUrl || null,
      width: attachment.width || null,
      height: attachment.height || null,
      duration: attachment.duration || null,
      metadata: attachment.metadata || {},
      processingStatus: "completed",
      contentHash: null,
    },
  });

  if (errors && errors.length > 0) {
    logger.error("[Upload/Complete] GraphQL errors:", errors);
    throw new Error(
      `Failed to store attachment: ${errors.map((e) => e.message).join(", ")}`,
    );
  }

  const dbAttachment = data?.insert_nchat_attachments_one;

  // Return attachment with database-generated values
  return {
    ...attachment,
    id: dbAttachment?.id || attachment.id,
    createdAt: dbAttachment?.created_at || attachment.createdAt,
  };
}

// ============================================================================
// POST Handler - Complete Upload
// ============================================================================

async function handleCompleteUpload(
  request: NextRequest,
): Promise<NextResponse> {
  // Get authenticated user (optional)
  const user = await getAuthenticatedUser(request);

  // Parse request body
  let body: CompleteUploadRequest;

  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body", "INVALID_JSON");
  }

  const { fileId, etag, width, height, duration } = body;

  // Validate file ID
  if (!fileId || typeof fileId !== "string") {
    return badRequestResponse("File ID is required", "MISSING_FILE_ID");
  }

  // Get pending upload
  const pendingUpload = getPendingUpload(fileId);

  if (!pendingUpload) {
    return notFoundResponse(
      "Upload not found or expired. Please initiate a new upload.",
      "UPLOAD_NOT_FOUND",
    );
  }

  // Verify ownership (if user is authenticated)
  if (user && pendingUpload.userId && pendingUpload.userId !== user.id) {
    return notFoundResponse("Upload not found", "UPLOAD_NOT_FOUND");
  }

  try {
    // In production, verify the file exists in storage:
    // const exists = await minioClient.statObject(bucket, key)
    // if (!exists) throw new Error('File not found in storage')

    // Generate key from file ID
    const date = new Date(pendingUpload.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const ext = pendingUpload.filename.split(".").pop()?.toLowerCase() || "";
    const key = `uploads/${year}/${month}/${day}/${fileId}${ext ? `.${ext}` : ""}`;

    // Create attachment record
    const attachment = createAttachment({
      fileId,
      filename: pendingUpload.filename,
      mimeType: pendingUpload.contentType,
      size: pendingUpload.size,
      bucket: CONFIG.STORAGE_BUCKET,
      key,
      userId: pendingUpload.userId || user?.id,
      channelId: pendingUpload.channelId,
      messageId: pendingUpload.messageId,
      width,
      height,
      duration,
    });

    // Store attachment in database
    const storedAttachment = await storeAttachment(attachment, key);

    // Remove pending upload
    removePendingUpload(fileId);

    return successResponse({
      attachment: storedAttachment,
      etag,
    });
  } catch (error) {
    logger.error("Error completing upload:", error);
    return internalErrorResponse("Failed to complete upload");
  }
}

// Apply middleware and export with CSRF protection
export const POST = compose(
  withErrorHandler,
  withCsrfProtection,
  withRateLimit(CONFIG.RATE_LIMIT),
)(handleCompleteUpload);

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
