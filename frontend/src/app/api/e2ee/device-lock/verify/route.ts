/**
 * API Route: /api/e2ee/device-lock/verify
 * Verify device lock (PIN or biometric)
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { DeviceLockManager } from "@/lib/e2ee/device-lock/device-lock-manager";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, type, credential } = body;

    // Validate inputs
    if (!userId || !deviceId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: userId, deviceId, type" },
        { status: 400 },
      );
    }

    if (!["pin", "biometric"].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid verification type. Must be "pin" or "biometric"' },
        { status: 400 },
      );
    }

    if (type === "pin" && !credential) {
      return NextResponse.json(
        { error: "PIN credential is required for PIN verification" },
        { status: 400 },
      );
    }

    // Get Apollo client
    const apolloClient = getApolloClient();

    // Create device lock manager
    const deviceLockManager = new DeviceLockManager(
      apolloClient,
      userId,
      deviceId,
    );

    // Verify device lock
    const result = await deviceLockManager.verify(type, credential);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          remainingAttempts: result.remainingAttempts,
          shouldWipe: result.shouldWipe,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        token: result.session!.token,
        expiresAt: result.session!.expiresAt.toISOString(),
        method: result.session!.method,
      },
      message: "Device lock verified successfully",
    });
  } catch (error) {
    logger.error("Device lock verification error:", error);

    return NextResponse.json(
      {
        error: "Failed to verify device lock",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET: Check device lock status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const deviceId = searchParams.get("deviceId");

    if (!userId || !deviceId) {
      return NextResponse.json(
        { error: "Missing required parameters: userId, deviceId" },
        { status: 400 },
      );
    }

    const apolloClient = getApolloClient();
    const deviceLockManager = new DeviceLockManager(
      apolloClient,
      userId,
      deviceId,
    );

    const status = await deviceLockManager.getStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error("Device lock status error:", error);

    return NextResponse.json(
      {
        error: "Failed to get device lock status",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}
