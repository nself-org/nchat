/**
 * Email Verification API Route
 *
 * Handles email verification for new accounts.
 * POST /api/auth/verify-email - Verify email with token
 * GET /api/auth/verify-email - Verify email via link (alternative)
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, compose } from "@/lib/api/middleware";
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
// Verify Email (POST/GET)
// ============================================================================

async function handleVerifyEmail(request: NextRequest): Promise<NextResponse> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    // Get token from query params (GET) or body (POST)
    let token: string | null = null;

    if (request.method === "GET") {
      const { searchParams } = new URL(request.url);
      token = searchParams.get("token") || searchParams.get("ticket");
    } else {
      const body = await request.json();
      token = body.token;
    }

    if (!token) {
      return badRequestResponse(
        "Verification token is required",
        "MISSING_TOKEN",
      );
    }

    // In dev mode, just return success
    if (authConfig.useDevAuth) {
      return successResponse({
        message: "Email verified successfully.",
        verified: true,
      });
    }

    // Verify token
    let decoded: { sub: string; email: string; purpose: string };
    try {
      decoded = jwt.verify(token, getJWTSecret()) as typeof decoded;
    } catch (err) {
      return badRequestResponse(
        "Invalid or expired verification token",
        "INVALID_TOKEN",
      );
    }

    if (decoded.purpose !== "email-verification") {
      return badRequestResponse("Invalid token purpose", "INVALID_TOKEN");
    }

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Verify user exists and email matches
    const userResult = await dbPool.query(
      `SELECT id, email, email_verified
       FROM auth.users
       WHERE id = $1 AND LOWER(email) = LOWER($2)`,
      [decoded.sub, decoded.email],
    );

    if (userResult.rows.length === 0) {
      return badRequestResponse("Invalid verification token", "INVALID_TOKEN");
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return successResponse({
        message: "Email has already been verified.",
        verified: true,
        alreadyVerified: true,
      });
    }

    // Mark email as verified
    await dbPool.query(
      `UPDATE auth.users
       SET email_verified = TRUE,
           email_verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    );

    logger.info(`[AUTH] Email verified for user: ${user.email}`);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail({
        to: user.email,
        userName: user.email.split("@")[0],
        loginUrl: `${baseUrl}/login`,
      });
    } catch (emailError) {
      logger.error("[AUTH] Failed to send welcome email:", emailError);
      // Continue - don't fail the request if email fails
    }

    // If GET request, redirect to success page
    if (request.method === "GET") {
      const successUrl = new URL("/auth/verify-success", baseUrl);
      return NextResponse.redirect(successUrl);
    }

    return successResponse({
      message: "Email verified successfully.",
      verified: true,
    });
  } catch (error) {
    logger.error("Email verification error:", error);
    return internalErrorResponse("Failed to verify email");
  }
}

// ============================================================================
// Export
// ============================================================================

export const GET = compose(withErrorHandler)(handleVerifyEmail);
export const POST = compose(withErrorHandler)(handleVerifyEmail);
