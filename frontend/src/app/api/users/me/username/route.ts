/**
 * Username API Routes
 *
 * Handles username validation, availability checking, and changing.
 *
 * GET /api/users/me/username?check=<username> - Check username availability
 * PATCH /api/users/me/username - Change username
 *
 * @module app/api/users/me/username
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
import { profileService, validateUsername } from "@/services/profile";
import { USERNAME_RULES } from "@/types/profile";

// ============================================================================
// Validation Schemas
// ============================================================================

const ChangeUsernameSchema = z.object({
  username: z
    .string()
    .min(
      USERNAME_RULES.minLength,
      `Username must be at least ${USERNAME_RULES.minLength} characters`,
    )
    .max(
      USERNAME_RULES.maxLength,
      `Username must be at most ${USERNAME_RULES.maxLength} characters`,
    )
    .regex(
      USERNAME_RULES.pattern,
      "Username can only contain lowercase letters, numbers, and underscores",
    )
    .refine((val) => /^[a-z]/.test(val), {
      message: "Username must start with a letter",
    })
    .refine((val) => !val.endsWith("_"), {
      message: "Username cannot end with an underscore",
    })
    .refine(
      (val) =>
        !(USERNAME_RULES.reserved as readonly string[]).includes(
          val.toLowerCase(),
        ),
      {
        message: "This username is reserved",
      },
    ),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/me/username?check=<username>
 *
 * Check username availability
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;
  const searchParams = request.nextUrl.searchParams;
  const usernameToCheck = searchParams.get("check");

  if (!usernameToCheck) {
    return badRequestResponse('Missing "check" query parameter');
  }

  try {
    // First validate format
    const formatValidation = validateUsername(usernameToCheck);
    if (!formatValidation.valid) {
      return successResponse({
        username: usernameToCheck,
        valid: false,
        available: false,
        error: formatValidation.error,
      });
    }

    // Check availability
    const result = await profileService.checkUsernameAvailability(
      usernameToCheck,
      userId,
    );

    return successResponse({
      username: usernameToCheck.toLowerCase(),
      valid: result.valid,
      available: result.available,
      error: result.error,
      suggestions: result.suggestions,
    });
  } catch (error) {
    logger.error("[Username] Error checking availability:", error);
    return errorResponse(
      "Failed to check username availability",
      "INTERNAL_ERROR",
      500,
    );
  }
}

/**
 * PATCH /api/users/me/username
 *
 * Change username (with rate limiting - 30 day cooldown enforced by service)
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
  const validation = ChangeUsernameSchema.safeParse(body);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    const firstError = fieldErrors.username?.[0] || "Invalid username";
    return badRequestResponse(firstError, "VALIDATION_ERROR", {
      errors: fieldErrors,
    });
  }

  const newUsername = validation.data.username.toLowerCase();

  try {
    const result = await profileService.changeUsername(userId, newUsername);

    if (!result.success) {
      if (result.cooldownEndsAt) {
        return errorResponse(
          result.error || "Username change on cooldown",
          "COOLDOWN_ACTIVE",
          429,
          {
            cooldownEndsAt: result.cooldownEndsAt.toISOString(),
          },
        );
      }
      return badRequestResponse(
        result.error || "Failed to change username",
        "CHANGE_FAILED",
      );
    }

    return successResponse({
      message: "Username changed successfully",
      username: newUsername,
    });
  } catch (error) {
    logger.error("[Username] Error changing username:", error);
    return errorResponse("Failed to change username", "INTERNAL_ERROR", 500);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }), // Higher limit for availability checks
  withAuth,
)(getHandler);

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 5, window: 60 }), // Very restrictive for actual changes
  withAuth,
)(patchHandler);
