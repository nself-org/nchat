/**
 * Sign In API Route
 *
 * Handles email/password authentication.
 * In production, proxies to Nhost Auth.
 * In development, uses mock authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  authConfig,
  validatePassword,
  isEmailDomainAllowed,
} from "@/config/auth.config";

import { logger } from "@/lib/logger";

// ============================================================================
// Database Configuration (Production Only)
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

// Rate limit: 5 login attempts per 15 minutes per IP
const RATE_LIMIT = {
  limit: authConfig.security.maxLoginAttempts,
  window: authConfig.security.lockoutDurationMinutes * 60,
};

// ============================================================================
// Request Handler
// ============================================================================

async function handleSignIn(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequestResponse(
        "Email and password are required",
        "MISSING_CREDENTIALS",
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse("Invalid email format", "INVALID_EMAIL");
    }

    // Check email domain restrictions (production only)
    if (!authConfig.useDevAuth && !isEmailDomainAllowed(email)) {
      return badRequestResponse(
        "Email domain is not allowed",
        "DOMAIN_NOT_ALLOWED",
      );
    }

    // ==========================================================================
    // Development Mode: Mock Authentication
    // ==========================================================================

    if (authConfig.useDevAuth) {
      const normalizedEmail = email.toLowerCase().trim();

      // Find user from predefined list
      const predefinedUser = authConfig.devAuth.availableUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail,
      );

      if (predefinedUser) {
        const jwtSecret = getJWTSecret();

        const accessToken = jwt.sign(
          {
            sub: predefinedUser.id,
            email: predefinedUser.email,
            username: predefinedUser.username,
            displayName: predefinedUser.displayName,
            role: predefinedUser.role,
          },
          jwtSecret,
          { expiresIn: "24h" },
        );

        const refreshToken = jwt.sign({ sub: predefinedUser.id }, jwtSecret, {
          expiresIn: "30d",
        });

        return successResponse({
          user: {
            id: predefinedUser.id,
            email: predefinedUser.email,
            username: predefinedUser.username,
            displayName: predefinedUser.displayName,
            avatarUrl: predefinedUser.avatarUrl,
            role: predefinedUser.role,
          },
          accessToken,
          refreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        });
      }

      // For non-predefined users in dev mode, create a temporary user
      const devUser = {
        id: `dev-user-${Date.now()}`,
        email: normalizedEmail,
        username: normalizedEmail.split("@")[0],
        displayName: normalizedEmail.split("@")[0],
        role: "member" as const,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedEmail}`,
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

      const refreshToken = jwt.sign({ sub: devUser.id }, jwtSecret, {
        expiresIn: "30d",
      });

      return successResponse({
        user: devUser,
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      });
    }

    // ==========================================================================
    // Production Mode: Database Authentication
    // ==========================================================================

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Query the database for the user
    const userQuery = `
      SELECT
        au.id as auth_id,
        au.email,
        au.encrypted_password,
        au.email_verified,
        au.mfa_enabled,
        au.mfa_ticket,
        nu.id,
        nu.username,
        nu.display_name,
        nu.avatar_url,
        nu.status,
        r.name as role,
        r.priority as role_priority
      FROM auth.users au
      LEFT JOIN nchat.nchat_users nu ON au.id = nu.user_id
      LEFT JOIN nchat.nchat_user_roles ur ON nu.id = ur.user_id
      LEFT JOIN nchat.nchat_roles r ON ur.role_id = r.id
      WHERE LOWER(au.email) = LOWER($1)
      ORDER BY r.priority DESC NULLS LAST
      LIMIT 1
    `;

    const result = await dbPool.query(userQuery, [email]);

    if (result.rows.length === 0) {
      return unauthorizedResponse("Invalid email or password");
    }

    const user = result.rows[0];

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(
      password,
      user.encrypted_password,
    );

    if (!isValidPassword) {
      return unauthorizedResponse("Invalid email or password");
    }

    // Check if email verification is required
    if (authConfig.security.requireEmailVerification && !user.email_verified) {
      return NextResponse.json(
        {
          success: false,
          error: "Email verification required",
          errorCode: "EMAIL_NOT_VERIFIED",
          requiresEmailVerification: true,
        },
        { status: 403 },
      );
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      // Generate MFA ticket
      const mfaTicket = jwt.sign({ sub: user.id, mfa: true }, getJWTSecret(), {
        expiresIn: "5m",
      });

      return NextResponse.json(
        {
          success: true,
          requires2FA: true,
          mfaTicket,
        },
        { status: 200 },
      );
    }

    const jwtSecret = getJWTSecret();

    // Generate JWT tokens
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

    // Update last login timestamp
    await dbPool.query(
      `UPDATE nchat.nchat_users SET last_seen_at = NOW() WHERE id = $1`,
      [user.id],
    );

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url,
        role: user.role || "member",
        status: user.status || "online",
        emailVerified: user.email_verified,
      },
      accessToken,
      refreshToken,
      expiresIn: authConfig.security.jwtExpiresInMinutes * 60,
    });
  } catch (error) {
    logger.error("Sign in error:", error);
    return internalErrorResponse("Sign in failed");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleSignIn);
