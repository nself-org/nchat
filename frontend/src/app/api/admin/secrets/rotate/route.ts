/**
 * Secret Rotation API
 *
 * Handles secret rotation for applicable secrets.
 * Generates new secrets and tracks version history.
 *
 * @route POST /api/admin/secrets/rotate
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  getSecretManager,
  SECRET_DEFINITIONS,
} from "@/lib/secrets/secret-manager";
import { getSecretRotationStatus } from "@/lib/secrets/secret-validator";

// ============================================================================
// Types
// ============================================================================

interface RotateRequest {
  /** Secret key to rotate */
  key: string;
  /** New value (optional - auto-generated if not provided) */
  newValue?: string;
  /** Force rotation even if not overdue */
  force?: boolean;
}

interface RotateResponse {
  success: boolean;
  key: string;
  previousVersion: number;
  newVersion: number;
  generatedValue?: string;
  message: string;
}

// ============================================================================
// Authorization Check
// ============================================================================

/**
 * Check if the request is authorized for secret rotation
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Always require authentication for rotation
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // In development, allow with any bearer token
    if (process.env.NODE_ENV === "development") {
      return authHeader.startsWith("Bearer ");
    }
    logger.warn("[SecretRotate] ADMIN_API_KEY not configured");
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  return token === adminKey;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate rotation request
 */
function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: RotateRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const request = body as Record<string, unknown>;

  if (!request.key || typeof request.key !== "string") {
    return { valid: false, error: "Secret key is required" };
  }

  // Check if secret exists in definitions
  const definition = SECRET_DEFINITIONS.find((d) => d.key === request.key);
  if (!definition) {
    return { valid: false, error: `Unknown secret key: ${request.key}` };
  }

  // If new value provided, validate it
  if (request.newValue !== undefined && typeof request.newValue !== "string") {
    return { valid: false, error: "newValue must be a string" };
  }

  // Validate minimum length if provided
  if (
    request.newValue &&
    definition.minLength &&
    request.newValue.length < definition.minLength
  ) {
    return {
      valid: false,
      error: `New value must be at least ${definition.minLength} characters`,
    };
  }

  // Validate pattern if defined
  if (
    request.newValue &&
    definition.pattern &&
    !definition.pattern.test(request.newValue)
  ) {
    return { valid: false, error: "New value does not match expected pattern" };
  }

  return {
    valid: true,
    data: {
      key: request.key,
      newValue: request.newValue as string | undefined,
      force: request.force === true,
    },
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authorization check
    if (!(await isAuthorized(request))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const { key, newValue, force } = validation.data;
    const manager = getSecretManager();

    // Check if secret exists
    const exists = await manager.exists(key);
    if (!exists && !newValue) {
      return NextResponse.json(
        {
          success: false,
          error: `Secret '${key}' does not exist. Provide a newValue to create it.`,
        },
        { status: 400 },
      );
    }

    // Check rotation status
    const rotationStatuses = await getSecretRotationStatus();
    const rotationStatus = rotationStatuses.find((s) => s.key === key);

    if (!force && rotationStatus && !rotationStatus.isOverdue) {
      return NextResponse.json(
        {
          success: false,
          error: `Secret '${key}' is not due for rotation. Use force=true to rotate anyway.`,
          daysUntilRotation: rotationStatus.daysUntilRotation,
        },
        { status: 400 },
      );
    }

    // Generate new value if not provided
    let finalValue = newValue;
    let generated = false;

    if (!finalValue) {
      const definition = SECRET_DEFINITIONS.find((d) => d.key === key);
      const length = definition?.minLength
        ? Math.max(definition.minLength, 32)
        : 32;
      finalValue = manager.generateSecret(length);
      generated = true;
    }

    // Perform rotation
    const result = await manager.rotate(key, finalValue);

    // Log the rotation
    logger.info(
      `[SecretRotate] Rotated secret '${key}' from v${result.oldVersion} to v${result.newVersion}`,
    );

    const response: RotateResponse = {
      success: true,
      key,
      previousVersion: result.oldVersion,
      newVersion: result.newVersion,
      message: `Secret '${key}' rotated successfully`,
    };

    // Only include generated value in development
    if (generated && process.env.NODE_ENV === "development") {
      response.generatedValue = finalValue;
    } else if (generated) {
      response.message += ". New value was auto-generated.";
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[SecretRotate] Error rotating secret:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to rotate secret",
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

// ============================================================================
// GET Handler - List secrets that need rotation
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

    const rotationStatuses = await getSecretRotationStatus();

    const overdueSecrets = rotationStatuses.filter((s) => s.isOverdue);
    const upcomingRotations = rotationStatuses
      .filter(
        (s) =>
          !s.isOverdue &&
          s.daysUntilRotation !== undefined &&
          s.daysUntilRotation < 30,
      )
      .sort((a, b) => (a.daysUntilRotation ?? 0) - (b.daysUntilRotation ?? 0));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overdue: overdueSecrets.map((s) => ({
        key: s.key,
        lastRotatedAt: s.lastRotatedAt,
        rotationIntervalDays: s.rotationIntervalDays,
      })),
      upcoming: upcomingRotations.map((s) => ({
        key: s.key,
        daysUntilRotation: s.daysUntilRotation,
        rotationIntervalDays: s.rotationIntervalDays,
      })),
      summary: {
        totalRequiringRotation: rotationStatuses.length,
        overdue: overdueSecrets.length,
        upcomingIn30Days: upcomingRotations.length,
      },
    });
  } catch (error) {
    logger.error("[SecretRotate] Error getting rotation status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get rotation status",
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
