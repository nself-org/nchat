/**
 * Secret Status API
 *
 * Returns the status of configured secrets including:
 * - Which secrets are present
 * - Which required secrets are missing
 * - Rotation status for applicable secrets
 *
 * @route GET /api/admin/secrets/status
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  getSecretManager,
  SECRET_DEFINITIONS,
  SecretCategory,
} from "@/lib/secrets/secret-manager";
import {
  getSecretValidator,
  getSecretRotationStatus,
} from "@/lib/secrets/secret-validator";

// ============================================================================
// Types
// ============================================================================

interface SecretStatusItem {
  key: string;
  description: string;
  category: SecretCategory;
  required: boolean;
  configured: boolean;
  rotationStatus?: {
    requiresRotation: boolean;
    rotationIntervalDays?: number;
    isOverdue: boolean;
    daysUntilRotation?: number;
  };
}

interface SecretStatusResponse {
  success: boolean;
  timestamp: string;
  environment: string;
  summary: {
    total: number;
    configured: number;
    missing: number;
    missingRequired: number;
    overdueRotation: number;
  };
  byCategory: Record<
    SecretCategory,
    {
      total: number;
      configured: number;
      missing: number;
    }
  >;
  secrets: SecretStatusItem[];
}

// ============================================================================
// Authorization Check
// ============================================================================

/**
 * Check if the request is authorized to access secret status
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // In production, require admin authentication
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return false;

    // Check for admin API key
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
      logger.warn("[SecretStatus] ADMIN_API_KEY not configured in production");
      return false;
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    return token === adminKey;
  }

  // In development, allow access
  return true;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const manager = getSecretManager();
    const rotationStatuses = await getSecretRotationStatus();

    // Build status for each secret
    const secrets: SecretStatusItem[] = [];
    const byCategory: Record<
      SecretCategory,
      { total: number; configured: number; missing: number }
    > = {
      database: { total: 0, configured: 0, missing: 0 },
      api: { total: 0, configured: 0, missing: 0 },
      oauth: { total: 0, configured: 0, missing: 0 },
      encryption: { total: 0, configured: 0, missing: 0 },
      storage: { total: 0, configured: 0, missing: 0 },
      email: { total: 0, configured: 0, missing: 0 },
      payment: { total: 0, configured: 0, missing: 0 },
      monitoring: { total: 0, configured: 0, missing: 0 },
      other: { total: 0, configured: 0, missing: 0 },
    };

    let configured = 0;
    let missing = 0;
    let missingRequired = 0;
    let overdueRotation = 0;

    for (const definition of SECRET_DEFINITIONS) {
      const exists = await manager.exists(definition.key);
      const rotationStatus = rotationStatuses.find(
        (s) => s.key === definition.key,
      );

      const item: SecretStatusItem = {
        key: definition.key,
        description: definition.description,
        category: definition.category,
        required: definition.required,
        configured: exists,
      };

      if (rotationStatus) {
        item.rotationStatus = {
          requiresRotation: rotationStatus.requiresRotation,
          rotationIntervalDays: rotationStatus.rotationIntervalDays,
          isOverdue: rotationStatus.isOverdue,
          daysUntilRotation: rotationStatus.daysUntilRotation,
        };

        if (rotationStatus.isOverdue) {
          overdueRotation++;
        }
      }

      secrets.push(item);

      // Update counters
      byCategory[definition.category].total++;
      if (exists) {
        configured++;
        byCategory[definition.category].configured++;
      } else {
        missing++;
        byCategory[definition.category].missing++;
        if (definition.required) {
          missingRequired++;
        }
      }
    }

    const response: SecretStatusResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
      summary: {
        total: SECRET_DEFINITIONS.length,
        configured,
        missing,
        missingRequired,
        overdueRotation,
      },
      byCategory,
      secrets,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[SecretStatus] Error getting secret status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get secret status",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
