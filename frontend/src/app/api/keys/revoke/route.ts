/**
 * Key Revocation API Route
 *
 * Handles key revocation requests for compromised or unused keys.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const revokeKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  reason: z.string().min(1, "Reason is required"),
  compromiseEventId: z.string().optional(),
  notifyDevices: z.boolean().optional().default(true),
});

const verifyRevocationSchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  fingerprint: z.string().optional(),
});

// ============================================================================
// POST /api/keys/revoke
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = revokeKeySchema.parse(body);

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Log revocation request
    logger.warn("Key revocation requested", {
      userId,
      keyId: validated.keyId,
      deviceId: validated.deviceId,
      reason: validated.reason,
    });

    // Create revocation record
    const revocation = {
      id: `rev_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`,
      keyId: validated.keyId,
      deviceId: validated.deviceId,
      reason: validated.reason,
      initiatedBy: "user" as const,
      revokedAt: new Date().toISOString(),
      compromiseEventId: validated.compromiseEventId || null,
      propagated: false,
      notifiedDevices: [] as string[],
    };

    // Propagate revocation to other devices if requested
    if (validated.notifyDevices) {
      // Would send notifications to other linked devices
      revocation.propagated = true;
      revocation.notifiedDevices = ["device-1", "device-2"]; // Mock device IDs
    }

    // Would store revocation in database

    logger.warn("Key revoked", {
      userId,
      revocationId: revocation.id,
      keyId: validated.keyId,
    });

    return NextResponse.json({
      success: true,
      revocation,
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

    logger.error("Key revocation failed", {
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
// GET /api/keys/revoke (Check revocation status)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");
    const fingerprint = searchParams.get("fingerprint");

    if (!keyId && !fingerprint) {
      return NextResponse.json(
        {
          error: "Key ID or fingerprint is required",
          code: "MISSING_IDENTIFIER",
        },
        { status: 400 },
      );
    }

    // Would check database for revocation status
    // For now, simulate response

    const isRevoked = false; // Mock result
    const revocation = null; // Mock result

    return NextResponse.json({
      keyId: keyId || "unknown",
      fingerprint: fingerprint || null,
      isRevoked,
      revocation,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to check revocation status", {
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
// PUT /api/keys/revoke (Bulk check revocations)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const schema = z.object({
      keyIds: z.array(z.string()).min(1).max(100),
    });

    const validated = schema.parse(body);

    // Would check database for revocation status of all keys
    const results = validated.keyIds.map((keyId) => ({
      keyId,
      isRevoked: false,
      revocationId: null as string | null,
    }));

    return NextResponse.json({
      results,
      checkedAt: new Date().toISOString(),
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

    logger.error("Bulk revocation check failed", {
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
// DELETE /api/keys/revoke (Undo revocation - admin only)
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Only admins can undo revocations
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - admin access required", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const revocationId = searchParams.get("revocationId");

    if (!revocationId) {
      return NextResponse.json(
        { error: "Revocation ID is required", code: "MISSING_REVOCATION_ID" },
        { status: 400 },
      );
    }

    // Would undo revocation in database
    // This is a rare and sensitive operation

    logger.warn("Key revocation undone", {
      adminId: userId,
      revocationId,
    });

    return NextResponse.json({
      success: true,
      undoneRevocationId: revocationId,
      undoneAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to undo revocation", {
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
