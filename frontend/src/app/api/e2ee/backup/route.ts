/**
 * E2EE Backup API Routes
 *
 * Provides endpoints for managing E2EE key backups.
 *
 * POST /api/e2ee/backup - Create a new backup
 * GET /api/e2ee/backup - Get backup history/metadata
 * DELETE /api/e2ee/backup - Delete backup data
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { headers } from "next/headers";
import {
  validateBackup,
  parseBackup,
  BACKUP_FORMAT_VERSION,
} from "@/lib/e2ee/backup-encryption";
import {
  checkRateLimit,
  recordVerificationAttempt,
  type VerificationAttempt,
} from "@/lib/e2ee/recovery-key";

// ============================================================================
// Types
// ============================================================================

interface BackupMetadataRecord {
  backupId: string;
  userId: string;
  deviceId: string;
  createdAt: number;
  keyCount: number;
  sessionCount: number;
  size: number;
  hasRecoveryKey: boolean;
  description?: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ============================================================================
// In-memory storage (would be replaced with database in production)
// ============================================================================

const backupMetadataStore = new Map<string, BackupMetadataRecord[]>();
const verificationAttemptsStore = new Map<string, VerificationAttempt[]>();

// ============================================================================
// Helper Functions
// ============================================================================

function getUserId(req: NextRequest): string | null {
  // In production, this would validate the auth token and extract user ID
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  // For demo purposes, extract from a custom header
  const userId = req.headers.get("x-user-id");
  return userId;
}

function getDeviceId(req: NextRequest): string | null {
  return req.headers.get("x-device-id");
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

function generateBackupId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}

// ============================================================================
// POST - Create Backup Metadata
// ============================================================================

/**
 * Stores backup metadata on the server
 *
 * Note: The actual encrypted backup is stored client-side or on user's storage.
 * This endpoint only stores metadata for backup management.
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

    // Validate request body
    if (!body.keyCount || typeof body.keyCount !== "number") {
      return NextResponse.json<ErrorResponse>(
        { error: "Invalid key count", code: "INVALID_KEY_COUNT" },
        { status: 400 },
      );
    }

    if (!body.size || typeof body.size !== "number") {
      return NextResponse.json<ErrorResponse>(
        { error: "Invalid backup size", code: "INVALID_SIZE" },
        { status: 400 },
      );
    }

    // Create metadata record
    const backupId = generateBackupId();
    const metadata: BackupMetadataRecord = {
      backupId,
      userId,
      deviceId,
      createdAt: Date.now(),
      keyCount: body.keyCount,
      sessionCount: body.sessionCount ?? 0,
      size: body.size,
      hasRecoveryKey: body.hasRecoveryKey ?? false,
      description: body.description,
    };

    // Store metadata
    const userBackups = backupMetadataStore.get(userId) ?? [];
    userBackups.unshift(metadata);

    // Keep only last 10 backups
    const trimmed = userBackups.slice(0, 10);
    backupMetadataStore.set(userId, trimmed);

    return NextResponse.json({
      success: true,
      backupId,
      metadata: {
        backupId: metadata.backupId,
        createdAt: new Date(metadata.createdAt).toISOString(),
        keyCount: metadata.keyCount,
        sessionCount: metadata.sessionCount,
        size: metadata.size,
      },
    });
  } catch (error) {
    console.error("Failed to create backup metadata:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to create backup", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Backup History
// ============================================================================

/**
 * Retrieves backup history for the authenticated user
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const userBackups = backupMetadataStore.get(userId) ?? [];

    // Format for response
    const backups = userBackups.map((b) => ({
      backupId: b.backupId,
      deviceId: b.deviceId,
      createdAt: new Date(b.createdAt).toISOString(),
      keyCount: b.keyCount,
      sessionCount: b.sessionCount,
      size: b.size,
      hasRecoveryKey: b.hasRecoveryKey,
      description: b.description,
    }));

    return NextResponse.json({
      success: true,
      backups,
      total: backups.length,
    });
  } catch (error) {
    console.error("Failed to get backup history:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to get backups", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete Backup Metadata
// ============================================================================

/**
 * Deletes backup metadata
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

    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get("backupId");

    if (backupId) {
      // Delete specific backup
      const userBackups = backupMetadataStore.get(userId) ?? [];
      const filtered = userBackups.filter((b) => b.backupId !== backupId);
      backupMetadataStore.set(userId, filtered);

      return NextResponse.json({
        success: true,
        deleted: backupId,
      });
    } else {
      // Delete all backups for user
      backupMetadataStore.delete(userId);
      verificationAttemptsStore.delete(userId);

      return NextResponse.json({
        success: true,
        message: "All backup data deleted",
      });
    }
  } catch (error) {
    console.error("Failed to delete backup:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to delete backup", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
