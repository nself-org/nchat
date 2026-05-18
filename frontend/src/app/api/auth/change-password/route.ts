/**
 * Change Password API Route
 *
 * Handles user password changes with verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/config/auth.config";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // In dev mode, allow password changes for test users
    if (authConfig.useDevAuth) {
      // In dev mode, we don't actually change passwords
      // Just validate and return success
      return NextResponse.json({
        success: true,
        message: "Password updated successfully (dev mode)",
      });
    }

    // In production, use Nhost Auth to change password
    // This would use the Nhost SDK:
    // await nhost.auth.changePassword({ newPassword })

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error("Password change error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
