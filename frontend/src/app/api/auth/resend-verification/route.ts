/**
 * Resend Email Verification API Route
 *
 * Handles resending email verification links.
 * POST /api/auth/resend-verification - Resend verification email
 */

import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { authConfig } from "@/config/auth.config";
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

// Rate limit: 3 requests per hour per IP
const RATE_LIMIT = { limit: 3, window: 60 * 60 };

// ============================================================================
// Resend Verification Email (POST)
// ============================================================================

async function handleResendVerification(
  request: NextRequest,
): Promise<NextResponse> {
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
          "If your account exists and is unverified, a verification email has been sent.",
      });
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Check if user exists and is unverified
    const userResult = await dbPool.query(
      `SELECT id, email, email_verified
       FROM auth.users
       WHERE LOWER(email) = LOWER($1)`,
      [email],
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return successResponse({
        message:
          "If your account exists and is unverified, a verification email has been sent.",
      });
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return successResponse({
        message: "Your email is already verified.",
        alreadyVerified: true,
      });
    }

    // Generate verification token (valid for 24 hours)
    const verificationToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        purpose: "email-verification",
      },
      getJWTSecret(),
      { expiresIn: "24h" },
    );

    // Send verification email
    try {
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;

      // Generate 6-digit verification code as alternative
      const verificationCode = randomInt(100000, 1000000).toString();

      await emailService.sendEmailVerification({
        to: user.email,
        userName: user.email.split("@")[0],
        verificationUrl,
        verificationCode,
        expiresInHours: 24,
      });

      logger.info(`[AUTH] Verification email resent to ${user.email}`);
    } catch (emailError) {
      logger.error("[AUTH] Failed to send verification email:", emailError);
      return internalErrorResponse("Failed to send verification email");
    }

    return successResponse({
      message: "Verification email has been sent.",
      // In development, include token for testing
      ...(process.env.NODE_ENV === "development" && { verificationToken }),
    });
  } catch (error) {
    logger.error("Resend verification error:", error);
    return internalErrorResponse("Failed to resend verification email");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleResendVerification);
