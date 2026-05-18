/**
 * 2FA Setup API Route
 *
 * Generates TOTP secret and backup codes for two-factor authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateTOTPSecret,
  generateQRCode,
  formatSecretForDisplay,
} from "@/lib/2fa/totp";
import { generateBackupCodes } from "@/lib/2fa/backup-codes";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 },
      );
    }

    // Generate TOTP secret
    const { base32, otpauthUrl } = generateTOTPSecret({
      name: email,
      issuer: "nchat",
    });

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(otpauthUrl);

    // Generate backup codes (10 codes)
    const backupCodes = generateBackupCodes(10);

    // Format secret for manual entry
    const manualEntryCode = formatSecretForDisplay(base32);

    return NextResponse.json({
      success: true,
      data: {
        secret: base32,
        qrCodeDataUrl,
        otpauthUrl,
        backupCodes,
        manualEntryCode,
      },
    });
  } catch (error) {
    logger.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up 2FA" },
      { status: 500 },
    );
  }
}
