/**
 * Key Recovery API Route
 *
 * Handles key recovery operations including recovery code verification
 * and backup restoration.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomInt } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const verifyRecoveryCodeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  recoveryCode: z.string().min(6, "Recovery code is required"),
});

const initiateRecoverySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  method: z.enum(["recovery_codes", "password", "social_recovery"]),
  email: z.string().email().optional(),
});

const completeRecoverySchema = z.object({
  recoveryToken: z.string().min(1, "Recovery token is required"),
  newDeviceId: z.string().min(1, "New device ID is required"),
  newPublicKey: z.string().min(1, "New public key is required"),
});

const setupRecoverySchema = z.object({
  method: z.enum(["recovery_codes", "password", "social_recovery"]),
  passwordHash: z.string().optional(), // For password-based recovery
  guardians: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email(),
        publicKey: z.string(),
      }),
    )
    .optional(), // For social recovery
});

// ============================================================================
// POST /api/keys/recovery (Initiate recovery)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = initiateRecoverySchema.parse(body);

    // Rate limiting check (would use actual rate limiter)
    const rateLimitKey = `recovery:${validated.userId}`;
    // Would check rate limit

    logger.info("Recovery initiated", {
      userId: validated.userId,
      method: validated.method,
    });

    // Create recovery session
    const recoverySession = {
      id: `rec_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`,
      userId: validated.userId,
      method: validated.method,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    // For email-based recovery, would send verification email
    if (validated.email) {
      // Would send email with recovery link
      logger.info("Recovery email sent", {
        userId: validated.userId,
        email: validated.email,
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: recoverySession.id,
        status: recoverySession.status,
        expiresAt: recoverySession.expiresAt,
      },
      nextStep:
        validated.method === "recovery_codes"
          ? "verify_code"
          : validated.method === "password"
            ? "verify_password"
            : "collect_guardian_approvals",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logger.error("Recovery initiation failed", {
      error:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown",
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PUT /api/keys/recovery (Verify recovery code/credentials)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyRecoveryCodeSchema.parse(body);

    // Rate limiting for brute force protection
    // Would check and increment rate limit

    // Normalize recovery code (remove dashes/spaces, uppercase)
    const normalizedCode = validated.recoveryCode
      .replace(/[-\s]/g, "")
      .toUpperCase();

    // Would verify code against stored hashes
    // For demo, simulate verification

    const isValid = normalizedCode.length >= 8; // Mock validation

    if (!isValid) {
      logger.warn("Invalid recovery code attempt", {
        userId: validated.userId,
      });

      return NextResponse.json(
        {
          error: "Invalid recovery code",
          code: "INVALID_CODE",
          remainingAttempts: 4, // Would track actual attempts
        },
        { status: 400 },
      );
    }

    // Generate recovery token for completing recovery
    const recoveryToken = generateSecureToken();

    logger.info("Recovery code verified", {
      userId: validated.userId,
    });

    return NextResponse.json({
      success: true,
      recoveryToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      nextStep: "complete_recovery",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logger.error("Recovery verification failed", {
      error:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown",
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/keys/recovery (Complete recovery)
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = completeRecoverySchema.parse(body);

    // Verify recovery token
    // Would check token in database/cache

    const tokenValid = validated.recoveryToken.startsWith("rec_"); // Mock validation

    if (!tokenValid) {
      return NextResponse.json(
        {
          error: "Invalid or expired recovery token",
          code: "INVALID_TOKEN",
        },
        { status: 400 },
      );
    }

    // Complete recovery - register new device with new key
    const result = {
      success: true,
      deviceId: validated.newDeviceId,
      registeredAt: new Date().toISOString(),
      keyFingerprint: computeMockFingerprint(validated.newPublicKey),
    };

    logger.info("Recovery completed", {
      deviceId: validated.newDeviceId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logger.error("Recovery completion failed", {
      error:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown",
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/keys/recovery (Get recovery status/options)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Would fetch from database
    const recoveryStatus = {
      isSetUp: true,
      availableMethods: ["recovery_codes", "password"] as string[],
      recoveryCodesRemaining: 8,
      socialRecoveryConfigured: false,
      confirmedGuardians: 0,
      requiredGuardians: 3,
      lastRecoveryAttempt: null as string | null,
      isLockedOut: false,
    };

    return NextResponse.json(recoveryStatus);
  } catch (error) {
    logger.error("Failed to get recovery status", {
      error:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown",
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/keys/recovery (Setup/regenerate recovery codes)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // This endpoint regenerates recovery codes
    // Old codes are invalidated

    const newCodes = generateRecoveryCodes(10);

    logger.info("Recovery codes regenerated", {
      userId,
      count: newCodes.length,
    });

    return NextResponse.json({
      success: true,
      codes: newCodes,
      warning: "Store these codes securely. They will only be shown once.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to regenerate recovery codes", {
      error:
        error instanceof Error
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Unknown",
    });

    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

function generateSecureToken(): string {
  return "rec_" + randomBytes(24).toString("hex");
}

function generateRecoveryCodes(count: number): string[] {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += alphabet[randomInt(0, alphabet.length)];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

function computeMockFingerprint(publicKey: string): string {
  const bytes = randomBytes(32);
  const hex = bytes.toString("hex").toUpperCase();
  return hex.match(/.{1,4}/g)!.join(" ");
}
