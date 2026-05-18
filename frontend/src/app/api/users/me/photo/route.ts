/**
 * Profile Photo API Routes
 *
 * Handles profile photo upload, update, and deletion.
 *
 * POST /api/users/me/photo - Upload new profile photo
 * DELETE /api/users/me/photo - Delete profile photo
 *
 * @module app/api/users/me/photo
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from "@/lib/api/response";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * POST /api/users/me/photo
 *
 * Upload new profile photo
 */
async function postHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cropData = formData.get("crop") as string | null;

    if (!file) {
      return badRequestResponse("No file provided");
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return badRequestResponse(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        "INVALID_FILE_TYPE",
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return badRequestResponse(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        "FILE_TOO_LARGE",
      );
    }

    // Parse crop data if provided
    let crop:
      | { x: number; y: number; width: number; height: number }
      | undefined;
    if (cropData) {
      try {
        crop = JSON.parse(cropData);
      } catch {
        return badRequestResponse("Invalid crop data format");
      }
    }

    // Upload photo
    const result = await profileService.uploadPhoto(userId, { file, crop });

    if (!result.success) {
      return errorResponse(
        result.error || "Failed to upload photo",
        "UPLOAD_FAILED",
        400,
      );
    }

    return successResponse({ photo: result.photo }, { status: 201 });
  } catch (error) {
    logger.error("[ProfilePhoto] Error uploading photo:", error);
    return errorResponse("Failed to upload photo", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/users/me/photo
 *
 * Delete current profile photo
 */
async function deleteHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    const result = await profileService.deletePhoto(userId);

    if (!result.success) {
      return errorResponse(
        result.error || "Failed to delete photo",
        "DELETE_FAILED",
        400,
      );
    }

    return successResponse({ message: "Photo deleted successfully" });
  } catch (error) {
    logger.error("[ProfilePhoto] Error deleting photo:", error);
    return errorResponse("Failed to delete photo", "INTERNAL_ERROR", 500);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }), // More restrictive for uploads
  withAuth,
)(postHandler);

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(deleteHandler);
