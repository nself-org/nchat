/**
 * Key Status API Route
 *
 * Provides key health checks, status information, and policy compliance.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const keyStatusQuerySchema = z.object({
  deviceId: z.string().optional(),
  includeHistory: z.enum(["true", "false"]).optional(),
});

// ============================================================================
// GET /api/keys/status
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
    const includeHistory = searchParams.get("includeHistory") === "true";

    // Would fetch from database
    const keyStatus = {
      // Current key information
      currentKey: {
        id: "key_current",
        version: 3,
        fingerprint: generateMockFingerprint(),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date(Date.now() - 60000).toISOString(),
        status: "active" as const,
      },

      // Health status
      health: {
        overall: "healthy" as const,
        issues: [] as string[],
        recommendations: [] as string[],
      },

      // Policy compliance
      compliance: {
        rotationRequired: false,
        rotationDueAt: new Date(
          Date.now() + 23 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        policyId: "default",
        isCompliant: true,
      },

      // Usage statistics
      usage: {
        totalOperations: 1542,
        operationsToday: 47,
        averageDailyUsage: 52.3,
      },

      // Security status
      security: {
        compromiseEvents: 0,
        unresolvedEvents: 0,
        trustScore: 95,
        biometricEnabled: false,
        hardwareBackedStorage: false,
      },

      // Recovery readiness
      recovery: {
        isSetUp: true,
        unusedRecoveryCodes: 8,
        backupAvailable: true,
        lastBackupAt: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },

      // Device information
      devices: deviceId
        ? [
            {
              id: deviceId,
              name: "Current Device",
              platform: "web",
              lastSeen: new Date().toISOString(),
            },
          ]
        : [
            {
              id: "device-1",
              name: "MacBook Pro",
              platform: "web",
              lastSeen: new Date().toISOString(),
            },
            {
              id: "device-2",
              name: "iPhone",
              platform: "ios",
              lastSeen: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
    };

    // Add recommendations based on status
    if (!keyStatus.recovery.backupAvailable) {
      keyStatus.health.recommendations.push("Create a key backup for recovery");
    }

    if (keyStatus.recovery.unusedRecoveryCodes < 3) {
      keyStatus.health.recommendations.push("Generate new recovery codes");
    }

    const daysUntilRotation = Math.floor(
      (new Date(keyStatus.compliance.rotationDueAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (daysUntilRotation <= 7) {
      keyStatus.health.recommendations.push(
        `Key rotation due in ${daysUntilRotation} days`,
      );
    }

    // Add history if requested
    let history = null;
    if (includeHistory) {
      history = {
        rotations: [
          {
            fromVersion: 2,
            toVersion: 3,
            rotatedAt: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            trigger: "scheduled",
          },
          {
            fromVersion: 1,
            toVersion: 2,
            rotatedAt: new Date(
              Date.now() - 37 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            trigger: "manual",
          },
        ],
        compromiseEvents: [],
        recoveryAttempts: [],
      };
    }

    return NextResponse.json({
      ...keyStatus,
      history,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get key status", {
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
// POST /api/keys/status (Health check)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      keyId: z.string().min(1),
      fingerprint: z.string().min(1),
      deviceId: z.string().min(1),
    });

    const validated = schema.parse(body);

    // Perform health check
    const healthCheck = {
      keyId: validated.keyId,
      deviceId: validated.deviceId,
      fingerprintMatch: true, // Would verify against stored fingerprint
      isRevoked: false,
      isExpired: false,
      rotationNeeded: false,
      compromiseDetected: false,
      status: "healthy" as "healthy" | "warning" | "critical",
      checkedAt: new Date().toISOString(),
    };

    // Determine overall status
    if (healthCheck.isRevoked || healthCheck.compromiseDetected) {
      healthCheck.status = "critical";
    } else if (healthCheck.isExpired || healthCheck.rotationNeeded) {
      healthCheck.status = "warning";
    }

    logger.info("Key health check performed", {
      keyId: validated.keyId,
      status: healthCheck.status,
    });

    return NextResponse.json(healthCheck);
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

    logger.error("Health check failed", {
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
// PUT /api/keys/status (Update key metadata)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const schema = z.object({
      keyId: z.string().min(1),
      metadata: z.object({
        label: z.string().optional(),
        policyId: z.string().optional(),
        biometricEnabled: z.boolean().optional(),
      }),
    });

    const validated = schema.parse(body);

    // Would update in database

    logger.info("Key metadata updated", {
      userId,
      keyId: validated.keyId,
    });

    return NextResponse.json({
      success: true,
      keyId: validated.keyId,
      updatedAt: new Date().toISOString(),
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

    logger.error("Metadata update failed", {
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

function generateMockFingerprint(): string {
  const bytes = randomBytes(32);
  const hex = bytes.toString("hex").toUpperCase();
  return hex.match(/.{1,4}/g)!.join(" ");
}
