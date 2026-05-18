/**
 * API Route: /api/e2ee/recover
 * Recover E2EE using recovery code
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering - E2EE uses native modules that can't be built statically
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { recoveryCode, deviceId } = await request.json();

    if (!recoveryCode) {
      return NextResponse.json(
        { error: "Recovery code is required" },
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

    // Recover E2EE
    await e2eeManager.recover(recoveryCode, deviceId);

    const status = e2eeManager.getStatus();

    return NextResponse.json({
      success: true,
      status,
      message: "E2EE recovered successfully",
    });
  } catch (error) {
    logger.error("E2EE recovery error:", error);

    return NextResponse.json(
      {
        error: "Failed to recover E2EE",
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
