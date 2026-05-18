/**
 * Privacy Settings API Routes
 *
 * Handles GET and PATCH requests for user privacy settings.
 *
 * GET /api/users/me/privacy - Get current user's privacy settings
 * PATCH /api/users/me/privacy - Update current user's privacy settings
 *
 * @module app/api/users/me/privacy
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import type { ProfilePrivacySettings } from "@/types/profile";

// ============================================================================
// Validation Schemas
// ============================================================================

const PrivacyVisibilitySchema = z.enum(["everyone", "contacts", "nobody"]);

const UpdatePrivacySchema = z.object({
  onlineStatus: PrivacyVisibilitySchema.optional(),
  lastSeen: PrivacyVisibilitySchema.optional(),
  profilePhoto: PrivacyVisibilitySchema.optional(),
  bio: PrivacyVisibilitySchema.optional(),
  phone: PrivacyVisibilitySchema.optional(),
  addToGroups: PrivacyVisibilitySchema.optional(),
  calls: PrivacyVisibilitySchema.optional(),
  forwardedMessages: PrivacyVisibilitySchema.optional(),
  readReceipts: z.boolean().optional(),
  typingIndicator: z.boolean().optional(),
  searchableByUsername: z.boolean().optional(),
  searchableByEmail: z.boolean().optional(),
  showEmail: z.boolean().optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/me/privacy
 *
 * Get current user's privacy settings
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    const settings = await profileService.getPrivacySettings(userId);

    return successResponse({ privacySettings: settings });
  } catch (error) {
    logger.error("[Privacy] Error fetching privacy settings:", error);
    return errorResponse(
      "Failed to fetch privacy settings",
      "INTERNAL_ERROR",
      500,
    );
  }
}

/**
 * PATCH /api/users/me/privacy
 *
 * Update current user's privacy settings
 */
async function patchHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  // Validate with Zod
  const validation = UpdatePrivacySchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Validation failed", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Check that at least one field is provided
  if (Object.keys(validation.data).length === 0) {
    return badRequestResponse(
      "At least one setting must be provided",
      "EMPTY_UPDATE",
    );
  }

  try {
    const result = await profileService.updatePrivacySettings(
      userId,
      validation.data as Partial<ProfilePrivacySettings>,
    );

    if (!result.success) {
      return errorResponse(
        result.error || "Failed to update privacy settings",
        "UPDATE_FAILED",
        400,
      );
    }

    return successResponse({ privacySettings: result.settings });
  } catch (error) {
    logger.error("[Privacy] Error updating privacy settings:", error);
    return errorResponse(
      "Failed to update privacy settings",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(getHandler);

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }),
  withAuth,
)(patchHandler);
