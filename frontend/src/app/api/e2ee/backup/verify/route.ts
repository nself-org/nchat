/**
 * E2EE Backup Verification API
 *
 * POST /api/e2ee/backup/verify - Verify recovery key and record attempt
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  validateRecoveryKey,
  verifyRecoveryKeyHash,
  checkRateLimit,
  recordVerificationAttempt,
  type VerificationAttempt,
} from "@/lib/e2ee/recovery-key";
import { hash256 } from "@/lib/e2ee/crypto";
import { bytesToHex } from "@noble/hashes/utils";

// ============================================================================
// Types
// ============================================================================

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
  remainingAttempts?: number;
}

// ============================================================================
// In-memory storage
// ============================================================================

const verificationAttemptsStore = new Map<string, VerificationAttempt[]>();
const recoveryKeyHashStore = new Map<string, string>(); // userId -> recoveryKeyHash

// ============================================================================
// Helper Functions
// ============================================================================

function getClientIdentifier(req: NextRequest): string {
  const deviceId = req.headers.get("x-device-id");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return `${deviceId ?? "unknown"}-${ip}`;
}

// ============================================================================
// POST - Verify Recovery Key
// ============================================================================

/**
 * Verifies a recovery key against stored hash
 *
 * This endpoint:
 * 1. Validates recovery key format
 * 2. Checks rate limiting
 * 3. Verifies against stored hash
 * 4. Records the attempt
 *
 * Used before allowing backup restoration with recovery key.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    if (!body.userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "User ID required", code: "MISSING_USER_ID" },
        { status: 400 },
      );
    }

    if (!body.recoveryKey) {
      return NextResponse.json<ErrorResponse>(
        { error: "Recovery key required", code: "MISSING_RECOVERY_KEY" },
        { status: 400 },
      );
    }

    const { userId, recoveryKey } = body as {
      userId: string;
      recoveryKey: string;
    };

    // Check rate limiting
    const clientId = getClientIdentifier(req);
    const attempts = verificationAttemptsStore.get(clientId) ?? [];
    const rateLimit = checkRateLimit(attempts);

    if (!rateLimit.allowed) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Too many failed attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimit.waitSeconds,
          remainingAttempts: 0,
        },
        { status: 429 },
      );
    }

    // Validate recovery key format
    const validation = validateRecoveryKey(recoveryKey);
    if (!validation.valid) {
      // Record failed attempt
      const updatedAttempts = recordVerificationAttempt(
        attempts,
        false,
        clientId,
      );
      verificationAttemptsStore.set(clientId, updatedAttempts);

      return NextResponse.json<ErrorResponse>(
        {
          error: validation.error ?? "Invalid recovery key format",
          code: "INVALID_FORMAT",
          remainingAttempts: rateLimit.remainingAttempts - 1,
        },
        { status: 400 },
      );
    }

    // Get stored hash
    const storedHash = recoveryKeyHashStore.get(userId);

    if (!storedHash) {
      // Don't reveal whether user exists - treat as failed verification
      const updatedAttempts = recordVerificationAttempt(
        attempts,
        false,
        clientId,
      );
      verificationAttemptsStore.set(clientId, updatedAttempts);

      return NextResponse.json<ErrorResponse>(
        {
          error: "Verification failed",
          code: "VERIFICATION_FAILED",
          remainingAttempts: rateLimit.remainingAttempts - 1,
        },
        { status: 401 },
      );
    }

    // Verify the recovery key
    const isValid = verifyRecoveryKeyHash(validation.keyBytes!, storedHash);

    if (!isValid) {
      // Record failed attempt
      const updatedAttempts = recordVerificationAttempt(
        attempts,
        false,
        clientId,
      );
      verificationAttemptsStore.set(clientId, updatedAttempts);

      return NextResponse.json<ErrorResponse>(
        {
          error: "Invalid recovery key",
          code: "VERIFICATION_FAILED",
          remainingAttempts: rateLimit.remainingAttempts - 1,
        },
        { status: 401 },
      );
    }

    // Record successful attempt
    const updatedAttempts = recordVerificationAttempt(attempts, true, clientId);
    verificationAttemptsStore.set(clientId, updatedAttempts);

    // Generate a short-lived verification token
    // In production, this would be a signed JWT
    const verificationToken = bytesToHex(
      hash256(
        new TextEncoder().encode(
          `${userId}:${Date.now()}:${randomBytes(16).toString("hex")}`,
        ),
      ),
    );

    return NextResponse.json({
      success: true,
      verified: true,
      verificationToken,
      expiresIn: 300, // 5 minutes
    });
  } catch (error) {
    console.error("Failed to verify recovery key:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Verification failed", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
