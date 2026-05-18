/**
 * E2EE Backup Validation API
 *
 * POST /api/e2ee/backup/validate - Validates backup integrity without decrypting
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateBackup,
  parseBackup,
  BACKUP_FORMAT_VERSION,
} from "@/lib/e2ee/backup-encryption";

// ============================================================================
// Types
// ============================================================================

interface ErrorResponse {
  error: string;
  code: string;
}

interface ValidationResponse {
  valid: boolean;
  errors: string[];
  metadata?: {
    version: number;
    userId: string;
    deviceId: string;
    createdAt: string;
  };
  compatibility: {
    currentVersion: number;
    backupVersion: number;
    compatible: boolean;
  };
}

// ============================================================================
// POST - Validate Backup
// ============================================================================

/**
 * Validates a backup file without decrypting it
 *
 * This endpoint checks:
 * - Backup format validity
 * - Magic bytes
 * - Version compatibility
 * - Checksum integrity
 * - KDF parameters validity
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get("content-type");

    let backupData: string;

    if (contentType?.includes("application/json")) {
      const body = await req.json();
      if (!body.backup) {
        return NextResponse.json<ErrorResponse>(
          { error: "Backup data required", code: "MISSING_BACKUP" },
          { status: 400 },
        );
      }
      backupData =
        typeof body.backup === "string"
          ? body.backup
          : JSON.stringify(body.backup);
    } else if (contentType?.includes("text/plain")) {
      backupData = await req.text();
    } else {
      return NextResponse.json<ErrorResponse>(
        { error: "Unsupported content type", code: "INVALID_CONTENT_TYPE" },
        { status: 400 },
      );
    }

    // Parse the backup
    let backup;
    try {
      backup = parseBackup(backupData);
    } catch (parseError) {
      return NextResponse.json<ValidationResponse>({
        valid: false,
        errors: [
          `Failed to parse backup: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        ],
        compatibility: {
          currentVersion: BACKUP_FORMAT_VERSION,
          backupVersion: 0,
          compatible: false,
        },
      });
    }

    // Validate the backup
    const validation = validateBackup(backup);

    // Check version compatibility
    const backupVersion = backup.header.version;
    const compatible = backupVersion <= BACKUP_FORMAT_VERSION;

    const response: ValidationResponse = {
      valid: validation.valid,
      errors: validation.errors,
      metadata: validation.metadata
        ? {
            version: validation.metadata.version,
            userId: validation.metadata.userId,
            deviceId: validation.metadata.deviceId,
            createdAt: validation.metadata.createdAt.toISOString(),
          }
        : undefined,
      compatibility: {
        currentVersion: BACKUP_FORMAT_VERSION,
        backupVersion,
        compatible,
      },
    };

    if (!compatible) {
      response.errors.push(
        `Backup version ${backupVersion} is newer than supported version ${BACKUP_FORMAT_VERSION}`,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to validate backup:", error);
    return NextResponse.json<ErrorResponse>(
      { error: "Failed to validate backup", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
