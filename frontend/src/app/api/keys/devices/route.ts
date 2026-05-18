/**
 * Device Management API Route
 *
 * Handles device registration, linking, and management for multi-device support.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomInt, randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

// ============================================================================
// Request Schemas
// ============================================================================

const registerDeviceSchema = z.object({
  deviceName: z.string().min(1).max(100),
  platform: z.enum(["web", "ios", "android", "desktop", "unknown"]),
  publicKey: z.string().min(1, "Public key is required"),
  registrationId: z.number().int().positive(),
});

const linkDeviceSchema = z.object({
  linkCode: z.string().length(6, "Link code must be 6 characters"),
  qrData: z.string().optional(),
  deviceName: z.string().min(1).max(100),
  platform: z.enum(["web", "ios", "android", "desktop", "unknown"]),
  publicKey: z.string().min(1),
});

const updateDeviceSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1).max(100).optional(),
  pushToken: z.string().optional(),
  lastLocation: z.string().optional(),
});

// ============================================================================
// POST /api/keys/devices (Register new device)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerDeviceSchema.parse(body);

    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // Generate device ID
    const deviceId = generateDeviceId();

    // Create device record
    const device = {
      id: deviceId,
      userId,
      deviceName: validated.deviceName,
      platform: validated.platform,
      registrationId: validated.registrationId,
      publicKeyFingerprint: computeFingerprint(validated.publicKey),
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      isVerified: true, // First device is auto-verified
      isCurrentDevice: true,
    };

    // Would store device and public key in database

    logger.info("Device registered", {
      userId,
      deviceId,
      platform: validated.platform,
    });

    return NextResponse.json(
      {
        success: true,
        device: {
          id: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
          publicKeyFingerprint: device.publicKeyFingerprint,
          createdAt: device.createdAt,
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

    logger.error("Device registration failed", {
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
// GET /api/keys/devices (List devices)
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
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Would fetch from database
    const devices = [
      {
        id: "device-1",
        deviceName: "MacBook Pro",
        platform: "web",
        publicKeyFingerprint: generateMockFingerprint(),
        createdAt: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        lastSeenAt: new Date().toISOString(),
        isVerified: true,
        isCurrentDevice: true,
        trustScore: 95,
      },
      {
        id: "device-2",
        deviceName: "iPhone 15 Pro",
        platform: "ios",
        publicKeyFingerprint: generateMockFingerprint(),
        createdAt: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
        isVerified: true,
        isCurrentDevice: false,
        trustScore: 90,
      },
    ];

    // Filter inactive if needed
    const filteredDevices = includeInactive
      ? devices
      : devices.filter((d) => {
          const lastSeen = new Date(d.lastSeenAt);
          const daysSinceLastSeen =
            (Date.now() - lastSeen.getTime()) / (24 * 60 * 60 * 1000);
          return daysSinceLastSeen < 30;
        });

    return NextResponse.json({
      devices: filteredDevices,
      total: filteredDevices.length,
    });
  } catch (error) {
    logger.error("Failed to list devices", {
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
// PUT /api/keys/devices (Link device)
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's an update or link request
    if (body.deviceId) {
      // Update device
      const validated = updateDeviceSchema.parse(body);

      const userId = request.headers.get("x-user-id");
      if (!userId) {
        return NextResponse.json(
          { error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 },
        );
      }

      // Would update device in database

      logger.info("Device updated", {
        userId,
        deviceId: validated.deviceId,
      });

      return NextResponse.json({
        success: true,
        deviceId: validated.deviceId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Link device
      const validated = linkDeviceSchema.parse(body);

      // Verify link code
      const isValidCode = validated.linkCode.length === 6; // Mock validation

      if (!isValidCode) {
        return NextResponse.json(
          { error: "Invalid or expired link code", code: "INVALID_LINK_CODE" },
          { status: 400 },
        );
      }

      // Generate new device ID
      const deviceId = generateDeviceId();

      const linkedDevice = {
        id: deviceId,
        deviceName: validated.deviceName,
        platform: validated.platform,
        publicKeyFingerprint: computeFingerprint(validated.publicKey),
        linkedAt: new Date().toISOString(),
        isVerified: false, // Needs verification from source device
      };

      logger.info("Device link initiated", {
        deviceId,
        platform: validated.platform,
      });

      return NextResponse.json({
        success: true,
        device: linkedDevice,
        status: "pending_verification",
        message: "Device link pending. Please verify on your other device.",
      });
    }
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

    logger.error("Device operation failed", {
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
// PATCH /api/keys/devices (Generate link code)
// ============================================================================

export async function PATCH(request: NextRequest) {
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
      deviceId: z.string().min(1, "Device ID is required"),
      action: z.enum(["generate_link_code", "verify_link", "reject_link"]),
      pendingDeviceId: z.string().optional(),
    });

    const validated = schema.parse(body);

    if (validated.action === "generate_link_code") {
      // Generate link code
      const linkCode = generateLinkCode();
      const qrData = generateQRData(linkCode, validated.deviceId);

      logger.info("Link code generated", {
        userId,
        deviceId: validated.deviceId,
      });

      return NextResponse.json({
        linkCode,
        qrData,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      });
    }

    if (validated.action === "verify_link" && validated.pendingDeviceId) {
      // Verify pending device link

      logger.info("Device link verified", {
        userId,
        sourceDeviceId: validated.deviceId,
        newDeviceId: validated.pendingDeviceId,
      });

      return NextResponse.json({
        success: true,
        verifiedDeviceId: validated.pendingDeviceId,
        verifiedAt: new Date().toISOString(),
      });
    }

    if (validated.action === "reject_link" && validated.pendingDeviceId) {
      // Reject pending device link

      logger.info("Device link rejected", {
        userId,
        sourceDeviceId: validated.deviceId,
        rejectedDeviceId: validated.pendingDeviceId,
      });

      return NextResponse.json({
        success: true,
        rejectedDeviceId: validated.pendingDeviceId,
      });
    }

    return NextResponse.json(
      { error: "Invalid action", code: "INVALID_ACTION" },
      { status: 400 },
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

    logger.error("Device action failed", {
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
// DELETE /api/keys/devices (Unlink device)
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
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required", code: "MISSING_DEVICE_ID" },
        { status: 400 },
      );
    }

    // Would delete device from database and revoke its keys

    logger.warn("Device unlinked", {
      userId,
      deviceId,
    });

    return NextResponse.json({
      success: true,
      unlinkedDeviceId: deviceId,
      unlinkedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Device unlink failed", {
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

function generateDeviceId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "dev_";
  for (let i = 0; i < 24; i++) {
    id += chars[randomInt(0, chars.length)];
  }
  return id;
}

function generateLinkCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += digits[randomInt(0, digits.length)];
  }
  return code;
}

function generateQRData(linkCode: string, deviceId: string): string {
  const data = {
    code: linkCode,
    deviceId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

function computeFingerprint(_publicKey: string): string {
  return generateMockFingerprint();
}

function generateMockFingerprint(): string {
  const hex = randomBytes(32).toString("hex").toUpperCase();
  return hex.match(/.{1,4}/g)!.join(" ");
}
