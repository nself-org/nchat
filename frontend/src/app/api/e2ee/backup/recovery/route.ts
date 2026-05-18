/**
 * E2EE Recovery Key API
 *
 * POST /api/e2ee/backup/recovery - Store encrypted master key for recovery
 * GET /api/e2ee/backup/recovery - Get encrypted master key
 * DELETE /api/e2ee/backup/recovery - Delete recovery data
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  recordVerificationAttempt,
  type VerificationAttempt,
  type EncryptedMasterKey,
} from "@/lib/e2ee/recovery-key";

// ============================================================================
// Types
// ============================================================================

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

interface RecoveryDataRecord {
  userId: string;
  deviceId: string;
  encryptedMasterKey: EncryptedMasterKey;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// In-memory storage (would be replaced with database in production)
// ============================================================================

const recoveryDataStore = new Map<string, RecoveryDataRecord>();
const verificationAttemptsStore = new Map<string, VerificationAttempt[]>();

// ============================================================================
// Helper Functions
// ============================================================================

function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return req.headers.get("x-user-id");
}

function getDeviceId(req: NextRequest): string | null {
  return req.headers.get("x-device-id");
}

function getClientIdentifier(req: NextRequest): string {
  const deviceId = getDeviceId(req);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return `${deviceId ?? "unknown"}-${ip}`;
}

// ============================================================================
// POST - Store Encrypted Master Key
// ============================================================================

/**
 * Stores the encrypted master key for recovery
 *
 * The master key is encrypted with the recovery key before sending.
 * This allows recovery without knowing the original passphrase.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const deviceId = getDeviceId(req);
    if (!deviceId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Device ID required", code: "MISSING_DEVICE_ID" },
        { status: 400 },
      );
    }

    const body = await req.json();

    // Validate encrypted master key structure
    if (!body.encryptedMasterKey) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Encrypted master key required",
          code: "MISSING_ENCRYPTED_KEY",
        },
        { status: 400 },
      );
    }

    const { encryptedMasterKey } = body as {
      encryptedMasterKey: EncryptedMasterKey;
    };

    if (
      !encryptedMasterKey.encryptedKey ||
      !encryptedMasterKey.recoveryKeyHash
    ) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Invalid encrypted master key structure",
          code: "INVALID_KEY_STRUCTURE",
        },
        { status: 400 },
      );
    }

    // Store or update recovery data
    const now = Date.now();
    const existing = recoveryDataStore.get(userId);

    const record: RecoveryDataRecord = {
      userId,
      deviceId,
      encryptedMasterKey,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    recoveryDataStore.set(userId, record);

    return NextResponse.json({
      success: true,
      message: "Recovery data stored",
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    });
  } catch (error) {
    console.error("Failed to store recovery data:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to store recovery data", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Encrypted Master Key
// ============================================================================

/**
 * Retrieves the encrypted master key for recovery
 *
 * Rate-limited to prevent brute-force attacks on recovery key.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // For recovery, we allow retrieval without full auth (user is recovering)
    // But we need to identify the user somehow - email or user ID from URL
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "User ID required", code: "MISSING_USER_ID" },
        { status: 400 },
      );
    }

    // Check rate limiting
    const clientId = getClientIdentifier(req);
    const attempts = verificationAttemptsStore.get(clientId) ?? [];
    const rateLimit = checkRateLimit(attempts);

    if (!rateLimit.allowed) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Too many attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: rateLimit.waitSeconds,
        },
        { status: 429 },
      );
    }

    // Get recovery data
    const record = recoveryDataStore.get(userId);

    if (!record) {
      // Record failed attempt (user not found counts as attempt to prevent enumeration)
      const updatedAttempts = recordVerificationAttempt(
        attempts,
        false,
        clientId,
      );
      verificationAttemptsStore.set(clientId, updatedAttempts);

      return NextResponse.json<ErrorResponse>(
        { error: "No recovery data found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Don't record successful retrieval - only record verification attempts
    // The actual verification happens client-side when they try to decrypt

    return NextResponse.json({
      success: true,
      encryptedMasterKey: record.encryptedMasterKey,
      deviceId: record.deviceId,
      createdAt: new Date(record.createdAt).toISOString(),
      remainingAttempts: rateLimit.remainingAttempts,
    });
  } catch (error) {
    console.error("Failed to get recovery data:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to get recovery data", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete Recovery Data
// ============================================================================

/**
 * Deletes recovery data for the authenticated user
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const existed = recoveryDataStore.has(userId);
    recoveryDataStore.delete(userId);

    return NextResponse.json({
      success: true,
      message: existed ? "Recovery data deleted" : "No recovery data found",
    });
  } catch (error) {
    console.error("Failed to delete recovery data:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to delete recovery data", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
