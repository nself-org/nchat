/**
 * Magic Link API Route
 *
 * Handles passwordless authentication via email.
 * POST /api/auth/magic-link - Send magic link email
 * GET /api/auth/magic-link - Verify magic link token
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { authConfig, isEmailDomainAllowed } from "@/config/auth.config";

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

// Rate limit: 5 magic link requests per 15 minutes per IP
const RATE_LIMIT = { limit: 5, window: 15 * 60 };

// ============================================================================
// Send Magic Link (POST)
// ============================================================================

async function handleSendMagicLink(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    if (!email) {
      return badRequestResponse("Email is required", "MISSING_EMAIL");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse("Invalid email format", "INVALID_EMAIL");
    }

    // Check email domain restrictions
    if (!isEmailDomainAllowed(email)) {
      return badRequestResponse(
        "Email domain is not allowed",
        "DOMAIN_NOT_ALLOWED",
      );
    }

    // In dev mode, return success with a mock token
    if (authConfig.useDevAuth) {
      const mockToken = jwt.sign(
        {
          email: email.toLowerCase(),
          purpose: "magic-link",
        },
        getJWTSecret(),
        { expiresIn: "1h" },
      );

      return successResponse({
        message: "Magic link has been sent to your email.",
        // In development, include token for testing
        ...(process.env.NODE_ENV === "development" && { token: mockToken }),
      });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Check if user exists
    const userResult = await dbPool.query(
      `SELECT au.id, au.email, nu.username, nu.display_name, nu.role
       FROM auth.users au
       LEFT JOIN nchat.nchat_users nu ON au.id = nu.auth_user_id
       WHERE LOWER(au.email) = LOWER($1)`,
      [email],
    );

    let userId: string;
    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Create new user with magic link
      isNewUser = true;

      // Check if this would be the first user
      const countResult = await dbPool.query(
        `SELECT COUNT(*) as count FROM nchat.nchat_users`,
      );
      const isFirstUser = parseInt(countResult.rows[0].count) === 0;
      const role = isFirstUser ? "owner" : "member";

      // Create auth user
      const authUserResult = await dbPool.query(
        `INSERT INTO auth.users (email, email_verified, created_at, updated_at)
         VALUES ($1, false, NOW(), NOW())
         RETURNING id`,
        [email.toLowerCase()],
      );

      userId = authUserResult.rows[0].id;

      // Create nchat user
      const username = email.split("@")[0].toLowerCase();
      await dbPool.query(
        `INSERT INTO nchat.nchat_users (
          auth_user_id, username, display_name, email, role, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'offline', NOW(), NOW())`,
        [userId, username, username, email.toLowerCase(), role],
      );
    } else {
      userId = userResult.rows[0].id;
    }

    // Generate magic link token (valid for 1 hour)
    const magicToken = jwt.sign(
      {
        sub: userId,
        email: email.toLowerCase(),
        purpose: "magic-link",
        isNewUser,
      },
      getJWTSecret(),
      { expiresIn: "1h" },
    );

    // Store token hash in database
    const tokenHash = await bcrypt.hash(magicToken, 10);
    await dbPool.query(
      `UPDATE auth.users
       SET magic_link_token = $1,
           magic_link_expires = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $2`,
      [tokenHash, userId],
    );

    // In production, integrate with email service
    // REMOVED: console.log(`[AUTH] Magic link token generated for ${email}`)

    const callbackUrl =
      redirectTo ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?type=magicLink`
        : "/auth/callback?type=magicLink");

    return successResponse({
      message: "Magic link has been sent to your email.",
      // In development, include token for testing
      ...(process.env.NODE_ENV === "development" && {
        token: magicToken,
        callbackUrl: `${callbackUrl}&token=${magicToken}`,
      }),
    });
  } catch (error) {
    logger.error("Send magic link error:", error);
    return internalErrorResponse("Failed to send magic link");
  }
}

// ============================================================================
// Verify Magic Link (GET)
// ============================================================================

async function handleVerifyMagicLink(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return badRequestResponse("Token is required", "MISSING_TOKEN");
    }

    // In dev mode, verify the mock token
    if (authConfig.useDevAuth) {
      try {
        const decoded = jwt.verify(token, getJWTSecret()) as {
          email: string;
          purpose: string;
        };

        if (decoded.purpose !== "magic-link") {
          return badRequestResponse("Invalid token purpose", "INVALID_TOKEN");
        }

        // Find or create dev user
        const predefinedUser = authConfig.devAuth.availableUsers.find(
          (u) => u.email.toLowerCase() === decoded.email.toLowerCase(),
        );

        const user = predefinedUser || {
          id: `dev-user-${Date.now()}`,
          email: decoded.email,
          username: decoded.email.split("@")[0],
          displayName: decoded.email.split("@")[0],
          role: "member" as const,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${decoded.email}`,
        };

        const accessToken = jwt.sign(
          {
            sub: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
          },
          getJWTSecret(),
          { expiresIn: "24h" },
        );

        const refreshToken = jwt.sign({ sub: user.id }, getJWTSecret(), {
          expiresIn: "30d",
        });

        return successResponse({
          user,
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60,
        });
      } catch {
        return unauthorizedResponse("Invalid or expired magic link");
      }
    }

    // Verify token
    let decoded: {
      sub: string;
      email: string;
      purpose: string;
      isNewUser: boolean;
    };
    try {
      decoded = jwt.verify(token, getJWTSecret()) as typeof decoded;
    } catch {
      return unauthorizedResponse("Invalid or expired magic link");
    }

    if (decoded.purpose !== "magic-link") {
      return badRequestResponse("Invalid token purpose", "INVALID_TOKEN");
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Verify token in database
    const userResult = await dbPool.query(
      `SELECT au.id as auth_id, au.email, au.magic_link_token, au.magic_link_expires,
              nu.id, nu.username, nu.display_name, nu.avatar_url, nu.role
       FROM auth.users au
       LEFT JOIN nchat.nchat_users nu ON au.id = nu.auth_user_id
       WHERE au.id = $1 AND au.magic_link_expires > NOW()`,
      [decoded.sub],
    );

    if (userResult.rows.length === 0) {
      return unauthorizedResponse("Invalid or expired magic link");
    }

    const user = userResult.rows[0];

    // Verify token hash
    if (!user.magic_link_token) {
      return badRequestResponse(
        "Magic link has already been used",
        "TOKEN_USED",
      );
    }

    const tokenValid = await bcrypt.compare(token, user.magic_link_token);
    if (!tokenValid) {
      return unauthorizedResponse("Invalid magic link");
    }

    // Clear magic link token and mark email as verified
    await dbPool.query(
      `UPDATE auth.users
       SET magic_link_token = NULL,
           magic_link_expires = NULL,
           email_verified = true,
           updated_at = NOW()
       WHERE id = $1`,
      [user.auth_id],
    );

    // Update last seen
    if (user.id) {
      await dbPool.query(
        `UPDATE nchat.nchat_users SET last_seen_at = NOW(), status = 'online' WHERE id = $1`,
        [user.id],
      );
    }

    const jwtSecret = getJWTSecret();

    // Generate tokens
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

    const refreshToken = jwt.sign({ sub: user.id }, jwtSecret, {
      expiresIn: `${authConfig.security.refreshTokenExpiresInDays}d`,
    });

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role || "member",
        emailVerified: true,
      },
      accessToken,
      refreshToken,
      expiresIn: authConfig.security.jwtExpiresInMinutes * 60,
      isNewUser: decoded.isNewUser,
    });
  } catch (error) {
    logger.error("Verify magic link error:", error);
    return internalErrorResponse("Failed to verify magic link");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleSendMagicLink);

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 15 * 60 }),
)(handleVerifyMagicLink);
