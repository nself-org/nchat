/**
 * Sign Out API Route
 *
 * Handles user sign out and session invalidation.
 * POST /api/auth/signout - Sign out user
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthPool } from "@/lib/db/pool";
import {
  withErrorHandler,
  withAuth,
  compose,
  AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, internalErrorResponse } from "@/lib/api/response";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration
// ============================================================================

// ============================================================================
// Sign Out Handler
// ============================================================================

async function handleSignOut(
  request: AuthenticatedRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const { refreshToken, allDevices } = body;

    // In dev mode, just return success
    if (authConfig.useDevAuth) {
      return successResponse({ message: "Signed out successfully" });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return successResponse({ message: "Signed out successfully" });
    }

    const userId = request.user.id;

    // Update user status to offline
    await dbPool.query(
      `UPDATE nchat.nchat_users
       SET status = 'offline', last_seen_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    // If allDevices is true, invalidate all refresh tokens
    // This would require a token blacklist or version system
    if (allDevices) {
      // Increment token version to invalidate all existing tokens
      await dbPool.query(
        `UPDATE auth.users
         SET token_version = COALESCE(token_version, 0) + 1,
             updated_at = NOW()
         WHERE id = (
           SELECT auth_user_id FROM nchat.nchat_users WHERE id = $1
         )`,
        [userId],
      );

      // Clear all trusted devices
      await dbPool.query(
        `DELETE FROM nchat.nchat_user_trusted_devices WHERE user_id = $1`,
        [userId],
      );
    }

    // This prevents the token from being used after sign out

    // Create response with cleared cookies
    const response = successResponse({ message: "Signed out successfully" });

    // Clear auth cookies
    response.cookies.set(authConfig.session.cookieName, "", {
      httpOnly: true,
      secure: authConfig.session.secureOnly,
      sameSite: authConfig.session.sameSite,
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("nchat-refresh-token", "", {
      httpOnly: true,
      secure: authConfig.session.secureOnly,
      sameSite: authConfig.session.sameSite,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("Sign out error:", error);
    return internalErrorResponse("Failed to sign out");
  }
}

// ============================================================================
// Public Sign Out (without auth requirement)
// ============================================================================

async function handlePublicSignOut(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    // Clear cookies even without authentication
    const response = successResponse({ message: "Signed out successfully" });

    response.cookies.set(authConfig.session.cookieName, "", {
      httpOnly: true,
      secure: authConfig.session.secureOnly,
      sameSite: authConfig.session.sameSite,
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("nchat-refresh-token", "", {
      httpOnly: true,
      secure: authConfig.session.secureOnly,
      sameSite: authConfig.session.sameSite,
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("Sign out error:", error);
    return internalErrorResponse("Failed to sign out");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(withErrorHandler)(handlePublicSignOut);

// DELETE method for sign out from all devices (requires auth)
export const DELETE = compose(withErrorHandler, withAuth)(handleSignOut as any);
