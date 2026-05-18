/**
 * API Route: /api/e2ee/initialize
 * Initialize E2EE for the current user
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering - E2EE uses native modules that can't be built statically
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { password, deviceId } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    // Get userId from request headers (set by auth middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Dynamic import to avoid loading native modules during build
    const [{ getApolloClient }, { getE2EEManager }] = await Promise.all([
      import("@/lib/apollo-client"),
      import("@/lib/e2ee"),
    ]);

    // Get Apollo client (with auth context)
    const apolloClient = getApolloClient();

    // Get E2EE manager
    const e2eeManager = getE2EEManager(apolloClient, userId);

    // Initialize E2EE
    await e2eeManager.initialize(password, deviceId);

    const status = e2eeManager.getStatus();
    const recoveryCode = e2eeManager.getRecoveryCode();

    return NextResponse.json({
      success: true,
      status,
      recoveryCode, // Only returned during initial setup
      message: "E2EE initialized successfully",
    });
  } catch (error) {
    logger.error("E2EE initialization error:", error);

    return NextResponse.json(
      {
        error: "Failed to initialize E2EE",
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

export async function GET(request: NextRequest) {
  try {
    // Get userId from request headers (set by auth middleware)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Dynamic import to avoid loading native modules during build
    const [{ getApolloClient }, { getE2EEManager }] = await Promise.all([
      import("@/lib/apollo-client"),
      import("@/lib/e2ee"),
    ]);

    const apolloClient = getApolloClient();
    const e2eeManager = getE2EEManager(apolloClient, userId);

    const status = e2eeManager.getStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error("E2EE status error:", error);

    return NextResponse.json(
      {
        error: "Failed to get E2EE status",
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
