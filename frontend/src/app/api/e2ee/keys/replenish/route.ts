/**
 * API Route: /api/e2ee/keys/replenish
 * Replenish one-time prekeys
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger.server";

// Force dynamic rendering - E2EE uses native modules that can't be built statically
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { count = 50 } = await request.json();

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

    if (!e2eeManager.isInitialized()) {
      return NextResponse.json(
        { error: "E2EE not initialized" },
        { status: 400 },
      );
    }

    // Replenish one-time prekeys
    await e2eeManager.replenishOneTimePreKeys(count);

    return NextResponse.json({
      success: true,
      message: `Successfully replenished ${count} one-time prekeys`,
      count,
    });
  } catch (error) {
    logger.error("Prekey replenishment error:", error);

    return NextResponse.json(
      {
        error: "Failed to replenish prekeys",
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
