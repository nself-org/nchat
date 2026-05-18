/**
 * Password Reset API Route
 *
 * Handles password reset request and confirmation.
 * POST /api/auth/password-reset - Request reset email
 * PUT /api/auth/password-reset - Reset password with token
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { authConfig, validatePassword } from "@/config/auth.config";
import { emailService } from "@/lib/email/email.service";

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

// Rate limit: 3 reset requests per 15 minutes per IP
const RATE_LIMIT = { limit: 3, window: 15 * 60 };

// ============================================================================
// Request Password Reset (POST)
// ============================================================================

async function handleRequestReset(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return badRequestResponse("Email is required", "MISSING_EMAIL");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse("Invalid email format", "INVALID_EMAIL");
    }

    // In dev mode, just return success
    if (authConfig.useDevAuth) {
      return successResponse({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Check if user exists
    const userResult = await dbPool.query(
      `SELECT id, email FROM auth.users WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return successResponse({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const user = userResult.rows[0];

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: "password-reset",
      },
      getJWTSecret(),
      { expiresIn: "1h" },
    );

    // Store reset token hash in database
    const tokenHash = await bcrypt.hash(resetToken, 10);
    await dbPool.query(
      `UPDATE auth.users
       SET password_reset_token = $1,
           password_reset_expires = NOW() + INTERVAL '1 hour',
           updated_at = NOW()
       WHERE id = $2`,
      [tokenHash, user.id],
    );

    // Send password reset email
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
      await emailService.sendPasswordReset({
        to: user.email,
        userName: user.email.split("@")[0],
        resetUrl,
        expiresInMinutes: 60,
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      logger.info(`[AUTH] Password reset email sent to ${user.email}`);
    } catch (emailError) {
      logger.error("[AUTH] Failed to send password reset email:", emailError);
      // Continue - don't fail the request if email fails
    }

    return successResponse({
      message:
        "If an account exists with this email, a password reset link has been sent.",
      // In development, include token for testing
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (error) {
    logger.error("Password reset request error:", error);
    return internalErrorResponse("Failed to process password reset request");
  }
}

// ============================================================================
// Reset Password with Token (PUT)
// ============================================================================

async function handleResetPassword(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return badRequestResponse(
        "Token and new password are required",
        "MISSING_FIELDS",
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return badRequestResponse(
        passwordValidation.errors.join(". "),
        "WEAK_PASSWORD",
      );
    }

    // In dev mode, just return success
    if (authConfig.useDevAuth) {
      return successResponse({
        message: "Password has been reset successfully.",
      });
    }

    // Verify token
    let decoded: { sub: string; email: string; purpose: string };
    try {
      decoded = jwt.verify(token, getJWTSecret()) as typeof decoded;
    } catch (err) {
      return badRequestResponse(
        "Invalid or expired reset token",
        "INVALID_TOKEN",
      );
    }

    if (decoded.purpose !== "password-reset") {
      return badRequestResponse("Invalid token purpose", "INVALID_TOKEN");
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Get user and verify token hasn't been used
    const userResult = await dbPool.query(
      `SELECT id, password_reset_token, password_reset_expires
       FROM auth.users
       WHERE id = $1 AND password_reset_expires > NOW()`,
      [decoded.sub],
    );

    if (userResult.rows.length === 0) {
      return badRequestResponse(
        "Invalid or expired reset token",
        "INVALID_TOKEN",
      );
    }

    const user = userResult.rows[0];

    // Verify token hash matches
    if (!user.password_reset_token) {
      return badRequestResponse(
        "Reset token has already been used",
        "TOKEN_USED",
      );
    }

    const tokenValid = await bcrypt.compare(token, user.password_reset_token);
    if (!tokenValid) {
      return badRequestResponse("Invalid reset token", "INVALID_TOKEN");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await dbPool.query(
      `UPDATE auth.users
       SET encrypted_password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, user.id],
    );

    // Send password changed confirmation email
    try {
      await emailService.sendPasswordChangedNotification({
        to: decoded.email,
        userName: decoded.email.split("@")[0],
        ipAddress:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
      logger.info(
        `[AUTH] Password changed notification sent to ${decoded.email}`,
      );
    } catch (emailError) {
      logger.error("[AUTH] Failed to send password changed email:", emailError);
      // Continue - don't fail the request if email fails
    }

    return successResponse({
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    logger.error("Password reset error:", error);
    return internalErrorResponse("Failed to reset password");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleRequestReset);

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 5, window: 15 * 60 }),
)(handleResetPassword);
