/**
 * Key Backup API Route
 *
 * Handles encrypted key backup creation and restoration.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const createBackupSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  keyVersion: z.number().int().positive(),
  encryptedData: z.string().min(1, "Encrypted data is required"),
  salt: z.string().min(1, "Salt is required"),
  iv: z.string().min(1, "IV is required"),
  hmac: z.string().min(1, "HMAC is required"),
});

const verifyBackupSchema = z.object({
  backupId: z.string().min(1, "Backup ID is required"),
  hmac: z.string().min(1, "HMAC is required"),
});

// ============================================================================
// POST /api/keys/backup (Create backup)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createBackupSchema.parse(body);

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Create backup record
    const backup = {
      id: `bak_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`,
      userId,
      deviceId: validated.deviceId,
      keyVersion: validated.keyVersion,
      algorithm: "AES-256-GCM",
      version: 1,
      createdAt: new Date().toISOString(),
      size: Buffer.from(validated.encryptedData, "base64").length,
      checksum: computeChecksum(validated.encryptedData),
    };

    // Would store encrypted backup data in secure storage
    // The actual encrypted data would go to blob storage, not database

    logger.info("Key backup created", {
      userId,
      backupId: backup.id,
      deviceId: validated.deviceId,
      keyVersion: validated.keyVersion,
    });

    return NextResponse.json(
      {
        success: true,
        backup: {
          id: backup.id,
          createdAt: backup.createdAt,
          keyVersion: backup.keyVersion,
          checksum: backup.checksum,
        },
      },
      { status: 201 },
    );
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

    logger.error("Backup creation failed", {
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
// GET /api/keys/backup (List backups)
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

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Would fetch from database
    const backups = [
      {
        id: "bak_sample1",
        deviceId: deviceId || "device-1",
        keyVersion: 2,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        size: 1024,
        checksum: "abc123",
      },
    ];

    return NextResponse.json({
      backups,
      total: backups.length,
    });
  } catch (error) {
    logger.error("Failed to list backups", {
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
// PUT /api/keys/backup (Verify backup integrity)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyBackupSchema.parse(body);

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Would fetch backup and verify HMAC
    // For now, simulate verification

    const isValid = true; // Mock result

    logger.info("Backup verification", {
      userId,
      backupId: validated.backupId,
      isValid,
    });

    return NextResponse.json({
      backupId: validated.backupId,
      isValid,
      verifiedAt: new Date().toISOString(),
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

    logger.error("Backup verification failed", {
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
// DELETE /api/keys/backup (Delete backup)
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

    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get("backupId");

    if (!backupId) {
      return NextResponse.json(
        { error: "Backup ID is required", code: "MISSING_BACKUP_ID" },
        { status: 400 },
      );
    }

    // Would delete from database and storage
    // This is irreversible

    logger.info("Backup deleted", {
      userId,
      backupId,
    });

    return NextResponse.json({
      success: true,
      deletedId: backupId,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Backup deletion failed", {
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

function computeChecksum(data: string): string {
  // Simple checksum for demonstration
  // In production, would use proper cryptographic hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
