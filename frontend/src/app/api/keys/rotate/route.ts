/**
 * Key Rotation API Route
 *
 * Handles key rotation requests including scheduled and emergency rotations.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const rotateKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  reason: z.enum([
    "scheduled",
    "usage_threshold",
    "compromise",
    "manual",
    "policy_change",
    "device_added",
    "device_removed",
  ]),
  force: z.boolean().optional().default(false),
  newPublicKey: z.string().optional(), // Base64-encoded public key
});

const scheduleRotationSchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  scheduledAt: z.string().datetime(),
  policyId: z.string().optional().default("default"),
});

// ============================================================================
// POST /api/keys/rotate
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = rotateKeySchema.parse(body);

    // Get user from session (would use actual auth)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Log rotation request
    logger.info("Key rotation requested", {
      userId,
      keyId: validated.keyId,
      deviceId: validated.deviceId,
      reason: validated.reason,
      force: validated.force,
    });

    // Validate that the key belongs to this user (would check database)
    // For now, we simulate the rotation

    const rotationResult = {
      success: true,
      keyId: validated.keyId,
      previousVersion: 1,
      newVersion: 2,
      rotatedAt: new Date().toISOString(),
      reason: validated.reason,
      publicKeyFingerprint: generateMockFingerprint(),
    };

    // If a new public key was provided, validate it
    if (validated.newPublicKey) {
      try {
        // Would validate the key format and store it
        rotationResult.publicKeyFingerprint = await computeFingerprint(
          validated.newPublicKey,
        );
      } catch {
        return NextResponse.json(
          { error: "Invalid public key format", code: "INVALID_KEY" },
          { status: 400 },
        );
      }
    }

    logger.info("Key rotation completed", {
      userId,
      keyId: validated.keyId,
      newVersion: rotationResult.newVersion,
    });

    return NextResponse.json(rotationResult);
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

    logger.error("Key rotation failed", {
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
// PUT /api/keys/rotate (Schedule rotation)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = scheduleRotationSchema.parse(body);

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const scheduledAt = new Date(validated.scheduledAt);
    if (scheduledAt <= new Date()) {
      return NextResponse.json(
        { error: "Scheduled time must be in the future", code: "INVALID_TIME" },
        { status: 400 },
      );
    }

    const schedule = {
      id: `sch_${Date.now().toString(36)}`,
      keyId: validated.keyId,
      scheduledAt: scheduledAt.toISOString(),
      policyId: validated.policyId,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    logger.info("Key rotation scheduled", {
      userId,
      keyId: validated.keyId,
      scheduledAt: schedule.scheduledAt,
    });

    return NextResponse.json(schedule, { status: 201 });
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

    logger.error("Failed to schedule rotation", {
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
// GET /api/keys/rotate (Get rotation history)
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
    const keyId = searchParams.get("keyId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Would fetch from database
    const history = {
      events: [
        {
          id: "rot_1",
          keyId: keyId || "default-key",
          previousVersion: 1,
          newVersion: 2,
          trigger: "scheduled",
          status: "completed",
          initiatedAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 86400000 + 1000).toISOString(),
        },
      ],
      scheduledRotations: [],
      total: 1,
    };

    return NextResponse.json(history);
  } catch (error) {
    logger.error("Failed to get rotation history", {
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
// DELETE /api/keys/rotate (Cancel scheduled rotation)
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
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "Schedule ID is required", code: "MISSING_SCHEDULE_ID" },
        { status: 400 },
      );
    }

    // Would delete from database

    logger.info("Scheduled rotation cancelled", {
      userId,
      scheduleId,
    });

    return NextResponse.json({ success: true, cancelledId: scheduleId });
  } catch (error) {
    logger.error("Failed to cancel scheduled rotation", {
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

async function computeFingerprint(publicKeyBase64: string): Promise<string> {
  try {
    const keyBytes = Buffer.from(publicKeyBase64, "base64");
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("")
      .match(/.{1,4}/g)!
      .join(" ");
  } catch {
    return generateMockFingerprint();
  }
}
