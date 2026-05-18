/**
 * ID.me Verification Status API Route
 *
 * Returns the current verification status for a user.
 * GET /api/auth/idme/status - Get verification status
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, compose } from "@/lib/api/middleware";
import { successResponse, internalErrorResponse } from "@/lib/api/response";
import { authConfig } from "@/config/auth.config";
import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration
// ============================================================================

// ============================================================================
// Status Handler
// ============================================================================

async function handleGetStatus(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return successResponse({
        verified: false,
      });
    }

    // In dev mode, return mock status
    if (authConfig.useDevAuth) {
      return successResponse({
        verified: false,
      });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return successResponse({
        verified: false,
      });
    }

    // Get verification status from database
    const result = await dbPool.query(
      `SELECT verified, verification_type, verification_group, verified_at
       FROM nchat.nchat_idme_verifications
       WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return successResponse({
        verified: false,
      });
    }

    const verification = result.rows[0];

    return successResponse({
      verified: verification.verified,
      verificationType: verification.verification_type,
      verificationGroup: verification.verification_group,
      verifiedAt: verification.verified_at,
    });
  } catch (error) {
    logger.error("Get ID.me status error:", error);
    return internalErrorResponse("Failed to get verification status");
  }
}

// ============================================================================
// Export
// ============================================================================

export const GET = compose(withErrorHandler)(handleGetStatus);
