/**
 * ID.me Verify API Route
 *
 * Initiates ID.me verification for a specific group/affiliation.
 *
 * GET /api/auth/idme/verify - Get verification status and supported groups
 * POST /api/auth/idme/verify - Start group-specific verification
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withErrorHandler,
  compose,
  withAuth,
  withOptionalAuth,
} from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  getIdMeVerificationService,
  VALID_GROUPS,
  GROUP_LABELS,
  type IdMeGroup,
} from "@/services/idme";
import { logger } from "@/lib/logger";

// ============================================================================
// GET Handler - Get verification status and supported groups
// ============================================================================

async function handleGetVerification(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const service = getIdMeVerificationService();

    // Check if ID.me is configured
    const isConfigured = service.isConfigured();

    // Get supported groups
    const supportedGroups = service.getSupportedGroups();

    // If userId is provided, get their verification status
    let verificationStatus = null;
    if (userId) {
      verificationStatus = await service.getVerificationStatus(userId);
    }

    return successResponse({
      configured: isConfigured,
      supportedGroups,
      groupLabels: GROUP_LABELS,
      validGroups: VALID_GROUPS,
      verification: verificationStatus,
    });
  } catch (error) {
    logger.error("ID.me verify GET error:", error);
    return internalErrorResponse("Failed to get verification information");
  }
}

// ============================================================================
// POST Handler - Initiate verification
// ============================================================================

async function handleVerifyRequest(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, group, returnUrl } = body;

    if (!userId) {
      return badRequestResponse("User ID is required");
    }

    const service = getIdMeVerificationService();

    // Check if ID.me is configured
    if (!service.isConfigured()) {
      return internalErrorResponse("ID.me verification is not configured");
    }

    // Validate group if provided
    if (group && !service.isValidGroup(group)) {
      return badRequestResponse(
        `Invalid group. Valid options: ${VALID_GROUPS.join(", ")}`,
      );
    }

    // Check if user already has a verification for this group
    if (group) {
      const hasVerification = await service.hasVerification(
        userId,
        group as IdMeGroup,
      );
      if (hasVerification) {
        return successResponse({
          success: true,
          alreadyVerified: true,
          group,
          message: `User is already verified for ${GROUP_LABELS[group as IdMeGroup]}`,
        });
      }
    }

    // Initiate verification
    const result = await service.initiateVerification(
      userId,
      group as IdMeGroup | undefined,
    );

    logger.info(
      `[AUTH] ID.me verification initiated for user: ${userId}, group: ${group || "any"}`,
    );

    return successResponse({
      success: result.success,
      authUrl: result.authUrl,
      state: result.state,
      group: result.group,
      expiresAt: result.expiresAt,
      message: result.message,
      returnUrl: returnUrl || "/settings/account",
    });
  } catch (error) {
    logger.error("ID.me verify error:", error);
    return internalErrorResponse(
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Failed to initiate ID.me verification",
    );
  }
}

// ============================================================================
// Export
// ============================================================================

export const GET = compose(withErrorHandler)(handleGetVerification);
export const POST = compose(withErrorHandler, withAuth)(handleVerifyRequest);
