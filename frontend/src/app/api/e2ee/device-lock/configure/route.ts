/**
 * API Route: /api/e2ee/device-lock/configure
 * Configure device lock policy
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { logger } from "@/lib/logger";
import {
  DeviceLockManager,
  type DeviceLockPolicy,
} from "@/lib/e2ee/device-lock/device-lock-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceId, policy, pin } = body;

    // Validate inputs
    if (!userId || !deviceId || !policy) {
      return NextResponse.json(
        { error: "Missing required fields: userId, deviceId, policy" },
        { status: 400 },
      );
    }

    // Validate policy structure
    const validTypes = ["pin", "biometric", "pin_biometric", "none"];
    if (!validTypes.includes(policy.type)) {
      return NextResponse.json(
        { error: `Invalid policy type: ${policy.type}` },
        { status: 400 },
      );
    }

    // Validate PIN if required
    if (["pin", "pin_biometric"].includes(policy.type) && !pin) {
      return NextResponse.json(
        { error: "PIN is required for this policy type" },
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

    // Configure policy
    const policyConfig: DeviceLockPolicy = {
      type: policy.type,
      pinLength: policy.pinLength || 6,
      biometricFallbackAllowed: policy.biometricFallbackAllowed !== false,
      requirePinInterval: policy.requirePinInterval || "never",
      timeoutMinutes: policy.timeoutMinutes || 5,
      wipeAfterFailedAttempts: policy.wipeAfterFailedAttempts || 10,
    };

    await deviceLockManager.configure(policyConfig, pin);

    return NextResponse.json({
      success: true,
      policy: policyConfig,
      message: "Device lock policy configured successfully",
    });
  } catch (error) {
    logger.error("Device lock configuration error:", error);

    return NextResponse.json(
      {
        error: "Failed to configure device lock",
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
