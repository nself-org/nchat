/**
 * Token Refresh API Route
 *
 * Handles access token refresh using refresh token.
 * POST /api/auth/refresh - Refresh access token
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration
// ============================================================================

let JWT_SECRET: string | null = null;

function getJWTSecret() {
  if (JWT_SECRET) return JWT_SECRET;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  if (secret.length < 32) {
    throw new Error("FATAL: JWT_SECRET must be at least 32 characters");
  }

  JWT_SECRET = secret;
  return JWT_SECRET;
}

// ============================================================================
// Rate Limiting
// ============================================================================

// Rate limit: 20 refresh requests per minute per IP
const RATE_LIMIT = { limit: 20, window: 60 };

// ============================================================================
// Refresh Token Handler
// ============================================================================

async function handleRefresh(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return badRequestResponse("Refresh token is required", "MISSING_TOKEN");
    }

    // In dev mode, just generate a new dev token
    if (authConfig.useDevAuth) {
      try {
        const decoded = jwt.verify(refreshToken, getJWTSecret()) as {
          sub: string;
        };

        // Find the dev user
        const devUser = authConfig.devAuth.availableUsers.find(
          (u) => u.id === decoded.sub,
        ) || {
          id: decoded.sub,
          email: "dev@nself.org",
          username: "dev",
          displayName: "Dev User",
          role: "member" as const,
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
        };

        const jwtSecret = getJWTSecret();

        const accessToken = jwt.sign(
          {
            sub: devUser.id,
            email: devUser.email,
            username: devUser.username,
            displayName: devUser.displayName,
            role: devUser.role,
          },
          jwtSecret,
          { expiresIn: "24h" },
        );

        const newRefreshToken = jwt.sign({ sub: devUser.id }, jwtSecret, {
          expiresIn: "30d",
        });

        return successResponse({
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 24 * 60 * 60,
        });
      } catch {
        return unauthorizedResponse("Invalid refresh token");
      }
    }

    // Verify refresh token
    let decoded: { sub: string };
    try {
      decoded = jwt.verify(refreshToken, getJWTSecret()) as typeof decoded;
    } catch {
      return unauthorizedResponse("Invalid or expired refresh token");
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Get user from database
    const userResult = await dbPool.query(
      `SELECT
        au.id as auth_id,
        au.email,
        nu.id,
        nu.username,
        nu.display_name,
        nu.avatar_url,
        nu.role,
        nu.status
      FROM nchat.nchat_users nu
      JOIN auth.users au ON au.id = nu.auth_user_id
      WHERE nu.id = $1`,
      [decoded.sub],
    );

    if (userResult.rows.length === 0) {
      return unauthorizedResponse("User not found");
    }

    const user = userResult.rows[0];
    const jwtSecret = getJWTSecret();

    // Generate new tokens
    const accessToken = jwt.sign(
      {
        sub: user.id,
        auth_id: user.auth_id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        role: user.role || "member",
      },
      jwtSecret,
      { expiresIn: `${authConfig.security.jwtExpiresInMinutes}m` },
    );

    const newRefreshToken = jwt.sign({ sub: user.id }, jwtSecret, {
      expiresIn: `${authConfig.security.refreshTokenExpiresInDays}d`,
    });

    // Update last seen
    await dbPool.query(
      `UPDATE nchat.nchat_users SET last_seen_at = NOW() WHERE id = $1`,
      [user.id],
    );

    return successResponse({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: authConfig.security.jwtExpiresInMinutes * 60,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role || "member",
      },
    });
  } catch (error) {
    logger.error("Token refresh error:", error);
    return internalErrorResponse("Failed to refresh token");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleRefresh);
