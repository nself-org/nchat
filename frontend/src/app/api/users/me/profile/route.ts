/**
 * Profile API Routes
 *
 * Handles GET and PATCH requests for user profile management.
 *
 * GET /api/users/me/profile - Get current user's profile
 * PATCH /api/users/me/profile - Update current user's profile
 *
 * @module app/api/users/me/profile
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
import { profileService, validateProfileInput } from "@/services/profile";
import { PROFILE_LIMITS, USERNAME_RULES } from "@/types/profile";

// ============================================================================
// Validation Schemas
// ============================================================================

const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .min(PROFILE_LIMITS.displayName.min)
    .max(PROFILE_LIMITS.displayName.max)
    .optional(),
  bio: z.string().max(PROFILE_LIMITS.bio).optional(),
  location: z.string().max(PROFILE_LIMITS.location).optional(),
  website: z
    .string()
    .max(PROFILE_LIMITS.website)
    .url()
    .optional()
    .or(z.literal("")),
  phone: z.string().max(PROFILE_LIMITS.phone).optional(),
  jobTitle: z.string().max(PROFILE_LIMITS.jobTitle).optional(),
  department: z.string().max(100).optional(),
  organization: z.string().max(PROFILE_LIMITS.organization).optional(),
  pronouns: z.string().max(PROFILE_LIMITS.pronouns).optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  socialLinks: z
    .object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      discord: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      youtube: z.string().optional(),
      twitch: z.string().optional(),
      custom: z
        .array(
          z.object({
            label: z.string(),
            url: z.string().url(),
          }),
        )
        .optional(),
    })
    .optional(),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/me/profile
 *
 * Get current user's profile
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;

  try {
    const profile = await profileService.getProfile(userId);

    if (!profile) {
      return errorResponse("Profile not found", "PROFILE_NOT_FOUND", 404);
    }

    return successResponse({ profile });
  } catch (error) {
    logger.error("[Profile] Error fetching profile:", error);
    return errorResponse("Failed to fetch profile", "INTERNAL_ERROR", 500);
  }
}

/**
 * PATCH /api/users/me/profile
 *
 * Update current user's profile
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

  // Zod validation
  const zodResult = UpdateProfileSchema.safeParse(body);
  if (!zodResult.success) {
    return badRequestResponse("Validation failed", "VALIDATION_ERROR", {
      errors: zodResult.error.flatten().fieldErrors,
    });
  }

  // Additional validation using profile service
  const validation = validateProfileInput(zodResult.data);
  if (!validation.valid) {
    return badRequestResponse("Validation failed", "VALIDATION_ERROR", {
      errors: validation.errors,
    });
  }

  try {
    const result = await profileService.updateProfile(userId, zodResult.data);

    if (!result.success) {
      if (result.fieldErrors) {
        return badRequestResponse(
          result.error || "Validation failed",
          "VALIDATION_ERROR",
          {
            errors: result.fieldErrors,
          },
        );
      }
      return errorResponse(
        result.error || "Failed to update profile",
        "UPDATE_FAILED",
        400,
      );
    }

    return successResponse({ profile: result.profile });
  } catch (error) {
    logger.error("[Profile] Error updating profile:", error);
    return errorResponse("Failed to update profile", "INTERNAL_ERROR", 500);
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
