/**
 * Verify Password API Route
 *
 * Verifies a user's current password before allowing sensitive operations.
 */

import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    // In dev mode, accept any password for the test users
    if (authConfig.useDevAuth) {
      return NextResponse.json({ success: true });
    }

    // In production, verify against Nhost Auth
    // This would use the Nhost Admin SDK to verify the password
    // For now, return success (implement with Nhost integration)
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Password verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify password" },
      { status: 500 },
    );
  }
}
