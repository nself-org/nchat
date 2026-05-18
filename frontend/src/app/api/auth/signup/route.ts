/**
 * Sign Up API Route
 *
 * Handles user registration.
 * In production, creates user in Nhost Auth and nchat database.
 * In development, uses mock authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getAuthPool } from "@/lib/db/pool";
import { withErrorHandler, withRateLimit, compose } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  conflictResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import {
  authConfig,
  validatePassword,
  isEmailDomainAllowed,
} from "@/config/auth.config";
import { emailService } from "@/lib/email/email.service";

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

// Rate limit: 3 signup attempts per hour per IP
const RATE_LIMIT = { limit: 3, window: 60 * 60 };

// ============================================================================
// Request Handler
// ============================================================================

async function handleSignUp(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password, username, displayName } = body;

    // ==========================================================================
    // Validation
    // ==========================================================================

    if (!email || !password || !username) {
      return badRequestResponse(
        "Email, password, and username are required",
        "MISSING_FIELDS",
      );
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

    // Validate username format (alphanumeric, underscores, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return badRequestResponse(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores",
        "INVALID_USERNAME",
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return badRequestResponse(
        passwordValidation.errors.join(". "),
        "WEAK_PASSWORD",
      );
    }

    // ==========================================================================
    // Development Mode: Mock Registration
    // ==========================================================================

    if (authConfig.useDevAuth) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists (by email)
      const existingUser = authConfig.devAuth.availableUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail,
      );

      if (existingUser) {
        return conflictResponse("An account with this email already exists");
      }

      // Check if this would be the first user
      // In dev mode, we assume it's not the first user unless no predefined users exist
      const isFirstUser = authConfig.devAuth.availableUsers.length === 0;

      const newUser = {
        id: `dev-user-${Date.now()}`,
        email: normalizedEmail,
        username,
        displayName: displayName || username,
        role: isFirstUser ? ("owner" as const) : ("member" as const),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      };

      const jwtSecret = getJWTSecret();

      const accessToken = jwt.sign(
        {
          sub: newUser.id,
          email: newUser.email,
          username: newUser.username,
          displayName: newUser.displayName,
          role: newUser.role,
        },
        jwtSecret,
        { expiresIn: "24h" },
      );

      const refreshToken = jwt.sign({ sub: newUser.id }, jwtSecret, {
        expiresIn: "30d",
      });

      // Send welcome email in dev mode too
      try {
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/signin`;
        await emailService.sendWelcomeEmail({
          to: newUser.email,
          userName: newUser.displayName,
          loginUrl,
        });
        logger.info(`[AUTH] Welcome email sent to ${newUser.email}`);
      } catch (emailError) {
        logger.error("[AUTH] Failed to send welcome email:", emailError);
      }

      return successResponse({
        user: newUser,
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      });
    }

    // ==========================================================================
    // Production Mode: Database Registration
    // ==========================================================================

    const dbPool = getAuthPool();
    if (!dbPool) {
      return internalErrorResponse("Database connection not available");
    }

    // Start transaction
    const client = await dbPool.connect();

    try {
      await client.query("BEGIN");

      // Check if email already exists
      const emailCheck = await client.query(
        `SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)`,
        [email],
      );

      if (emailCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return conflictResponse("An account with this email already exists");
      }

      // Check if username already exists
      const usernameCheck = await client.query(
        `SELECT id FROM nchat.nchat_users WHERE LOWER(username) = LOWER($1)`,
        [username],
      );

      if (usernameCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return conflictResponse("This username is already taken");
      }

      // Check if this is the first user
      const userCountResult = await client.query(
        `SELECT COUNT(*) as count FROM nchat.nchat_users`,
      );
      const isFirstUser = parseInt(userCountResult.rows[0].count) === 0;
      const role = isFirstUser ? "owner" : "member";

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create auth user
      const authUserResult = await client.query(
        `INSERT INTO auth.users (
          email,
          encrypted_password,
          display_name,
          email_verified,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id`,
        [
          email.toLowerCase(),
          hashedPassword,
          displayName || username,
          !authConfig.security.requireEmailVerification,
        ],
      );

      const authUserId = authUserResult.rows[0].id;

      // Create nchat user
      const nchatUserResult = await client.query(
        `INSERT INTO nchat.nchat_users (
          auth_user_id,
          username,
          display_name,
          email,
          role,
          avatar_url,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'online', NOW(), NOW())
        RETURNING id`,
        [
          authUserId,
          username.toLowerCase(),
          displayName || username,
          email.toLowerCase(),
          role,
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        ],
      );

      const nchatUserId = nchatUserResult.rows[0].id;

      // Get or create role
      const roleResult = await client.query(
        `SELECT id FROM nchat.nchat_roles WHERE name = $1`,
        [role],
      );

      if (roleResult.rows.length > 0) {
        // Assign role to user
        await client.query(
          `INSERT INTO nchat.nchat_user_roles (user_id, role_id, created_at)
           VALUES ($1, $2, NOW())`,
          [nchatUserId, roleResult.rows[0].id],
        );
      }

      await client.query("COMMIT");

      // If email verification is required, don't return tokens
      if (authConfig.security.requireEmailVerification) {
        // Send email verification
        try {
          const verificationToken = jwt.sign(
            {
              sub: nchatUserId,
              email: email.toLowerCase(),
              purpose: "email-verification",
            },
            getJWTSecret(),
            { expiresIn: "24h" },
          );

          const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;

          // Generate 6-digit verification code as alternative
          const verificationCode = randomInt(100000, 1000000).toString();

          await emailService.sendEmailVerification({
            to: email.toLowerCase(),
            userName: displayName || username,
            verificationUrl,
            verificationCode,
            expiresInHours: 24,
          });
          logger.info(
            `[AUTH] Verification email sent to ${email.toLowerCase()}`,
          );
        } catch (emailError) {
          logger.error("[AUTH] Failed to send verification email:", emailError);
        }

        return successResponse({
          user: {
            id: nchatUserId,
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            displayName: displayName || username,
            role,
          },
          requiresEmailVerification: true,
        });
      }

      // Generate tokens
      const jwtSecret = getJWTSecret();

      const accessToken = jwt.sign(
        {
          sub: nchatUserId,
          auth_id: authUserId,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          displayName: displayName || username,
          role,
        },
        jwtSecret,
        { expiresIn: `${authConfig.security.jwtExpiresInMinutes}m` },
      );

      const refreshToken = jwt.sign({ sub: nchatUserId }, jwtSecret, {
        expiresIn: `${authConfig.security.refreshTokenExpiresInDays}d`,
      });

      // Send welcome email
      try {
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/signin`;
        await emailService.sendWelcomeEmail({
          to: email.toLowerCase(),
          userName: displayName || username,
          loginUrl,
        });
        logger.info(`[AUTH] Welcome email sent to ${email.toLowerCase()}`);
      } catch (emailError) {
        logger.error("[AUTH] Failed to send welcome email:", emailError);
      }

      return successResponse({
        user: {
          id: nchatUserId,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          displayName: displayName || username,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          role,
          emailVerified: !authConfig.security.requireEmailVerification,
        },
        accessToken,
        refreshToken,
        expiresIn: authConfig.security.jwtExpiresInMinutes * 60,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Sign up error:", error);
    return internalErrorResponse("Sign up failed");
  }
}

// ============================================================================
// Export with Middleware
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit(RATE_LIMIT),
)(handleSignUp);
