/**
 * ID.me Revoke Verification API Route
 *
 * Allows users to revoke their ID.me verification and unlink their account.
 *
 * POST /api/auth/idme/revoke - Revoke ID.me verification
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, compose, withAuth } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { authConfig } from "@/config/auth.config";
import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration
// ============================================================================

// ============================================================================
// Revoke Handler
// ============================================================================

async function handleRevokeVerification(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return badRequestResponse("User ID is required");
    }

    // In dev mode, just return success
    if (authConfig.useDevAuth) {
      logger.info(
        `[AUTH] ID.me verification revoked (dev mode) for user: ${userId}`,
      );
      return successResponse({
        revoked: true,
        message: "ID.me verification revoked successfully",
      });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database not available");
    }

    // Check if user has an ID.me verification
    const checkResult = await dbPool.query(
      `SELECT id, verified, verification_type FROM nchat.nchat_idme_verifications WHERE user_id = $1`,
      [userId],
    );

    if (checkResult.rows.length === 0) {
      return badRequestResponse("No ID.me verification found for this user");
    }

    const verification = checkResult.rows[0];

    // Update verification record to mark as revoked
    await dbPool.query(
      `UPDATE nchat.nchat_idme_verifications
       SET verified = FALSE,
           revoked_at = NOW(),
           revoke_reason = $2,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, reason || "User requested revocation"],
    );

    // Update user metadata to remove ID.me verification flag
    await dbPool.query(
      `UPDATE nchat.nchat_users
       SET metadata = jsonb_set(
         COALESCE(metadata, '{}'::jsonb),
         '{idme_verified}',
         'false'::jsonb
       )
       WHERE id = $1`,
      [userId],
    );

    logger.info(
      `[AUTH] ID.me verification revoked for user: ${userId} (type: ${verification.verification_type})`,
    );

    return successResponse({
      revoked: true,
      message: "ID.me verification revoked successfully",
      previousType: verification.verification_type,
    });
  } catch (error) {
    logger.error("Revoke ID.me verification error:", error);
    return internalErrorResponse("Failed to revoke ID.me verification");
  }
}

// ============================================================================
// Export
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withAuth,
)(handleRevokeVerification);
