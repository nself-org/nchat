/**
 * Media API Route
 *
 * Handles media operations for file uploads, listing, and bulk deletion.
 *
 * GET /api/media - List user's media with pagination and filters
 * POST /api/media - Upload new media (multipart/form-data)
 * DELETE /api/media - Bulk delete media (requires ids in query)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import {
  getMediaService,
  DEFAULT_MAX_FILE_SIZE,
  ALL_ALLOWED_MIME_TYPES,
} from "@/services/media/media.service";
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

const ListMediaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(["image", "video", "audio", "document", "all"]).optional(),
  channelId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

// 10 uploads per minute for uploads
const uploadRateLimit = withRateLimit({
  limit: 10,
  window: 60,
});

// 60 requests per minute for reads
const readRateLimit = withRateLimit({
  limit: 60,
  window: 60,
});

// ============================================================================
// SERVICES
// ============================================================================

const mediaService = getMediaService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function getMimeTypeFilter(type?: string): string | undefined {
  switch (type) {
    case "image":
      return "image/";
    case "video":
      return "video/";
    case "audio":
      return "audio/";
    case "document":
      return "application/";
    default:
      return undefined;
  }
}

// ============================================================================
// GET /api/media - List user's media
// ============================================================================

async function handleGet(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { user } = request;

  logger.info("GET /api/media - List media request", { userId: user.id });

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
    type: searchParams.get("type") || undefined,
    channelId: searchParams.get("channelId") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const validation = ListMediaQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid query parameters",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const params = validation.data;

  // If search query provided, use search
  if (params.search) {
    const result = await mediaService.searchMedia(user.id, params.search, {
      limit: params.limit,
      offset: params.offset,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || "Search failed" },
        { status: result.error?.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      media: result.data!.media,
      pagination: {
        total: result.data!.totalCount,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.data!.hasMore,
      },
    });
  }

  // Regular listing
  const result = await mediaService.listUserMedia(user.id, {
    limit: params.limit,
    offset: params.offset,
    mimeTypeFilter: getMimeTypeFilter(params.type),
    channelId: params.channelId,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to list media",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("GET /api/media - Success", {
    userId: user.id,
    total: result.data!.totalCount,
    returned: result.data!.media.length,
  });

  return NextResponse.json({
    success: true,
    media: result.data!.media,
    pagination: {
      total: result.data!.totalCount,
      offset: params.offset,
      limit: params.limit,
      hasMore: result.data!.hasMore,
    },
  });
}

export const GET = compose(
  withErrorHandler,
  readRateLimit,
  withAuth,
)(handleGet);

// ============================================================================
// POST /api/media - Upload new media
// ============================================================================

async function handlePost(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { user } = request;

  logger.info("POST /api/media - Upload media request", { userId: user.id });

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const channelId = formData.get("channelId") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file
    const validation = mediaService.validateFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    // Validate channelId if provided
    if (channelId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(channelId)) {
        return NextResponse.json(
          { success: false, error: "Invalid channel ID format" },
          { status: 400 },
        );
      }
    }

    // Convert File to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload media
    const result = await mediaService.uploadMedia(
      {
        buffer,
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
      },
      user.id,
      {
        channelId: channelId || undefined,
        metadata: {
          description: description || undefined,
        },
      },
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error?.message || "Upload failed" },
        { status: result.error?.status || 500 },
      );
    }

    // Log to audit trail
    logSecurityEvent("media_upload", "info", {
      userId: user.id,
      mediaId: result.data.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      channelId,
      ip: getClientIp(request),
    });

    logger.info("POST /api/media - Upload success", {
      userId: user.id,
      mediaId: result.data.id,
      size: file.size,
      mimeType: file.type,
    });

    return NextResponse.json(
      {
        success: true,
        media: result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/media - Error", error as Error, {
      userId: user.id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload media",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const POST = compose(
  withErrorHandler,
  uploadRateLimit,
  withAuth,
)(handlePost);

// ============================================================================
// DELETE /api/media - Bulk delete media
// ============================================================================

async function handleDelete(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { user } = request;

  logger.info("DELETE /api/media - Bulk delete request", { userId: user.id });

  // Get IDs from query parameter
  const searchParams = request.nextUrl.searchParams;
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json(
      { success: false, error: "ids query parameter is required" },
      { status: 400 },
    );
  }

  // Parse IDs (comma-separated or JSON array)
  let ids: string[];
  try {
    if (idsParam.startsWith("[")) {
      ids = JSON.parse(idsParam);
    } else {
      ids = idsParam.split(",").map((id) => id.trim());
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid ids format" },
      { status: 400 },
    );
  }

  // Validate
  const validation = BulkDeleteSchema.safeParse({ ids });
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // Bulk delete
  const result = await mediaService.bulkDeleteMedia(
    validation.data.ids,
    user.id,
  );

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to delete media",
      },
      { status: result.error?.status || 500 },
    );
  }

  // Log to audit trail
  logSecurityEvent("media_bulk_delete", "info", {
    userId: user.id,
    deletedCount: result.data!.deletedCount,
    deletedIds: result.data!.deletedIds,
    ip: getClientIp(request),
  });

  logger.info("DELETE /api/media - Bulk delete success", {
    userId: user.id,
    deletedCount: result.data!.deletedCount,
  });

  return NextResponse.json({
    success: true,
    deletedCount: result.data!.deletedCount,
    deletedIds: result.data!.deletedIds,
    message: `${result.data!.deletedCount} media item(s) deleted`,
  });
}

export const DELETE = compose(
  withErrorHandler,
  readRateLimit,
  withAuth,
)(handleDelete);

// ============================================================================
// OPTIONS - Handle CORS preflight
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
