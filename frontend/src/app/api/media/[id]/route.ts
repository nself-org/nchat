/**
 * Single Media API Route
 *
 * Handles operations on a specific media item.
 *
 * GET /api/media/[id] - Get media details and signed URL
 * PATCH /api/media/[id] - Update media metadata (name, description)
 * DELETE /api/media/[id] - Delete specific media
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getMediaService } from "@/services/media/media.service";
import {
  withAuth,
  withRateLimit,
  withErrorHandler,
  compose,
  getClientIp,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateMediaSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  altText: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

// 60 downloads per minute
const downloadRateLimit = withRateLimit({
  limit: 60,
  window: 60,
});

// 30 updates per minute
const updateRateLimit = withRateLimit({
  limit: 30,
  window: 60,
});

// ============================================================================
// SERVICES
// ============================================================================

const mediaService = getMediaService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateMediaId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// GET /api/media/[id] - Get media details and signed URL
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  const { id } = await context.params;
  const { user } = request;

  logger.info("GET /api/media/[id] - Get media request", {
    mediaId: id,
    userId: user.id,
  });

  // Validate media ID
  if (!validateMediaId(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid media ID format" },
      { status: 400 },
    );
  }

  // Get media info
  const mediaResult = await mediaService.getMediaInfo(id);

  if (!mediaResult.success || !mediaResult.data) {
    return NextResponse.json(
      {
        success: false,
        error: mediaResult.error?.message || "Media not found",
      },
      { status: mediaResult.error?.status || 404 },
    );
  }

  const media = mediaResult.data;

  // Check ownership or channel access
  // For now, users can only access their own media
  if (media.userId !== user.id) {
    // Check if user has access via channel
    // For now, just deny access
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 },
    );
  }

  // Get signed URL for download
  const expiresIn = parseInt(
    request.nextUrl.searchParams.get("expiresIn") || "3600",
    10,
  );
  const signedUrlResult = await mediaService.getSignedUrl(id, expiresIn);

  if (!signedUrlResult.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          signedUrlResult.error?.message || "Failed to generate download URL",
      },
      { status: signedUrlResult.error?.status || 500 },
    );
  }

  logger.info("GET /api/media/[id] - Success", {
    mediaId: id,
    userId: user.id,
  });

  return NextResponse.json({
    success: true,
    media: {
      ...media,
      signedUrl: signedUrlResult.data!.url,
      signedUrlExpiresAt: signedUrlResult.data!.expiresAt,
    },
  });
}

export const GET = compose(
  withErrorHandler,
  downloadRateLimit,
  withAuth,
)(handleGet as any);

// ============================================================================
// PATCH /api/media/[id] - Update media metadata
// ============================================================================

async function handlePatch(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  const { id } = await context.params;
  const { user } = request;

  logger.info("PATCH /api/media/[id] - Update media request", {
    mediaId: id,
    userId: user.id,
  });

  // Validate media ID
  if (!validateMediaId(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid media ID format" },
      { status: 400 },
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const validation = UpdateMediaSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const updates = validation.data;

  // Check if there are any updates
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No updates provided" },
      { status: 400 },
    );
  }

  // Get existing media to verify ownership
  const mediaResult = await mediaService.getMediaInfo(id);

  if (!mediaResult.success || !mediaResult.data) {
    return NextResponse.json(
      { success: false, error: "Media not found" },
      { status: 404 },
    );
  }

  const existingMedia = mediaResult.data;

  // Verify ownership
  if (existingMedia.userId !== user.id) {
    return NextResponse.json(
      {
        success: false,
        error: "You do not have permission to update this media",
      },
      { status: 403 },
    );
  }

  // Build metadata updates
  const metadataUpdates: Record<string, unknown> = {};
  if (updates.description !== undefined) {
    metadataUpdates.description = updates.description;
  }
  if (updates.altText !== undefined) {
    metadataUpdates.alt_text = updates.altText;
  }
  if (updates.tags !== undefined) {
    metadataUpdates.tags = updates.tags;
  }

  // Update media
  const updateResult = await mediaService.updateMedia(id, {
    name: updates.name,
    metadata:
      Object.keys(metadataUpdates).length > 0 ? metadataUpdates : undefined,
  });

  if (!updateResult.success || !updateResult.data) {
    return NextResponse.json(
      {
        success: false,
        error: updateResult.error?.message || "Failed to update media",
      },
      { status: updateResult.error?.status || 500 },
    );
  }

  logger.info("PATCH /api/media/[id] - Update success", {
    mediaId: id,
    userId: user.id,
    updates: Object.keys(updates),
  });

  return NextResponse.json({
    success: true,
    media: updateResult.data,
    message: "Media updated successfully",
  });
}

export const PATCH = compose(
  withErrorHandler,
  updateRateLimit,
  withAuth,
)(handlePatch as any);

// ============================================================================
// DELETE /api/media/[id] - Delete specific media
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
): Promise<NextResponse> {
  const { id } = await context.params;
  const { user } = request;

  logger.info("DELETE /api/media/[id] - Delete media request", {
    mediaId: id,
    userId: user.id,
  });

  // Validate media ID
  if (!validateMediaId(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid media ID format" },
      { status: 400 },
    );
  }

  // Get existing media to verify ownership and get info for audit
  const mediaResult = await mediaService.getMediaInfo(id);

  if (!mediaResult.success || !mediaResult.data) {
    return NextResponse.json(
      { success: false, error: "Media not found" },
      { status: 404 },
    );
  }

  const existingMedia = mediaResult.data;

  // Delete media (service checks ownership)
  const deleteResult = await mediaService.deleteMedia(id, user.id);

  if (!deleteResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: deleteResult.error?.message || "Failed to delete media",
      },
      { status: deleteResult.error?.status || 500 },
    );
  }

  // Log to audit trail
  logSecurityEvent("media_delete", "info", {
    userId: user.id,
    mediaId: id,
    fileName: existingMedia.originalName,
    fileSize: existingMedia.size,
    mimeType: existingMedia.mimeType,
    channelId: existingMedia.channelId,
    ip: getClientIp(request),
  });

  logger.info("DELETE /api/media/[id] - Delete success", {
    mediaId: id,
    userId: user.id,
    fileName: existingMedia.originalName,
  });

  return NextResponse.json({
    success: true,
    message: "Media deleted successfully",
    mediaId: id,
  });
}

export const DELETE = compose(
  withErrorHandler,
  updateRateLimit,
  withAuth,
)(handleDelete as any);

// ============================================================================
// OPTIONS - Handle CORS preflight
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
