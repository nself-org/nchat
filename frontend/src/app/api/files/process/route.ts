/**
 * File Processing API Route (Plugin Integration)
 *
 * POST /api/files/process - Process an uploaded file
 *
 * This endpoint proxies to the file-processing plugin for:
 * - Image resizing and optimization
 * - Video thumbnail generation
 * - Document preview generation
 * - EXIF metadata stripping
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withAuth,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, errorResponse } from "@/lib/api/response";

import { logger } from "@/lib/logger";

const FILE_PROCESSING_URL =
  process.env.NEXT_PUBLIC_FILE_PROCESSING_URL || "http://files.localhost:3104";

// ============================================================================
// POST - Process a file with the file-processing plugin
// ============================================================================

async function handleProcess(request: AuthenticatedRequest) {
  try {
    const formData = await request.formData();
    const fileId = formData.get("fileId") as string | null;
    const storagePath = formData.get("storagePath") as string | null;
    const operations = formData.get("operations") as string | null;

    if (!fileId || !storagePath) {
      return errorResponse(
        "fileId and storagePath are required",
        "MISSING_PARAMS",
        400,
      );
    }

    // Parse operations (default: all)
    const ops = operations
      ? JSON.parse(operations)
      : {
          resize: true,
          optimize: true,
          thumbnail: true,
          stripMetadata: true,
        };

    // Call file-processing plugin
    const response = await fetch(`${FILE_PROCESSING_URL}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        storagePath,
        operations: ops,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return errorResponse(
        errorData.message || "File processing failed",
        "PROCESSING_ERROR",
        response.status,
      );
    }

    const data = await response.json();
    return successResponse(data);
  } catch (error) {
    logger.error("[File Processing API] Error:", error);
    return errorResponse("Processing failed", "PROCESSING_ERROR", 500, {
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
  withRateLimit({ limit: 20, window: 60 }), // 20 processing requests per minute
  withAuth,
)(handleProcess);

// ============================================================================
// GET - Check processing status
// ============================================================================

async function handleStatus(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return errorResponse("fileId is required", "MISSING_PARAMS", 400);
    }

    const response = await fetch(`${FILE_PROCESSING_URL}/status/${fileId}`);

    if (!response.ok) {
      return errorResponse(
        "Failed to get processing status",
        "STATUS_ERROR",
        response.status,
      );
    }

    const data = await response.json();
    return successResponse(data);
  } catch (error) {
    logger.error("[File Processing API] Status check failed:", error);
    return errorResponse("Status check failed", "STATUS_ERROR", 500, {
      details:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown error",
    });
  }
}

export const GET = compose(
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(handleStatus);
