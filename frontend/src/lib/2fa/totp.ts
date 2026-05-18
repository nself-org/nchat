/**
 * TOTP (Time-based One-Time Password) Utility
 *
 * Handles TOTP secret generation, QR code generation, and token verification
 * for Two-Factor Authentication using authenticator apps.
 */

import * as speakeasy from "speakeasy";
import QRCode from "qrcode";

import { logger } from "@/lib/logger";

/**
 * Generate a new TOTP secret
 * @returns Base32 encoded secret and otpauth URL
 */
export function generateTOTPSecret(params: {
  name: string; // User identifier (email or username)
  issuer?: string; // App name
}): {
  secret: string;
  otpauthUrl: string;
  base32: string;
} {
  const { name, issuer = "nchat" } = params;

  const secret = speakeasy.generateSecret({
    name: `${issuer}:${name}`,
    issuer: issuer,
    length: 32, // 32 bytes = 256 bits of entropy
  });

  return {
    secret: secret.ascii,
    otpauthUrl: secret.otpauth_url || "",
    base32: secret.base32,
  };
}

/**
 * Generate QR code data URL from TOTP secret
 * @param otpauthUrl - otpauth:// URL from generateTOTPSecret
 * @returns Data URL for QR code image
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 300,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    logger.error("QR code generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Verify a TOTP token
 * @param token - 6-digit code from authenticator app
 * @param secret - Base32 encoded secret
 * @param window - Time window for validation (default: 1 = ±30 seconds)
 * @returns true if token is valid
 */
export function verifyTOTP(
  token: string,
  secret: string,
  window: number = 1,
): boolean {
  try {
    // Remove spaces and validate format
    const cleanToken = token.replace(/\s/g, "");

    if (!/^\d{6}$/.test(cleanToken)) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: cleanToken,
      window: window, // Allow ±30 seconds time drift
    });

    return verified;
  } catch (error) {
    logger.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate a TOTP token (for testing purposes only)
 * @param secret - Base32 encoded secret
 * @returns 6-digit TOTP token
 */
export function generateTOTPToken(secret: string): string {
  return speakeasy.totp({
    secret: secret,
    encoding: "base32",
  });
}

/**
 * Format secret for manual entry
 * @param secret - Base32 encoded secret
 * @returns Formatted secret with spaces (e.g., "ABCD EFGH IJKL MNOP")
 */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") || secret;
}

/**
 * Validate TOTP secret format
 * @param secret - Secret to validate
 * @returns true if valid base32 secret
 */
export function isValidTOTPSecret(secret: string): boolean {
  // Base32 alphabet: A-Z and 2-7
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(secret);
}

/**
 * Get current time step for TOTP
 * @returns Current 30-second time step
 */
export function getCurrentTimeStep(): number {
  return Math.floor(Date.now() / 1000 / 30);
}

/**
 * Get remaining seconds in current time step
 * @returns Seconds until next TOTP code
 */
export function getRemainingSeconds(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

/**
 * Development mode: Generate a test TOTP setup
 * @param email - User email
 * @returns Complete TOTP setup for testing
 */
export async function generateTestTOTPSetup(email: string): Promise<{
  secret: string;
  base32: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  manualEntryCode: string;
  currentToken: string;
}> {
  const { secret, base32, otpauthUrl } = generateTOTPSecret({
    name: email,
    issuer: "nchat-dev",
  });

  const qrCodeDataUrl = await generateQRCode(otpauthUrl);
  const manualEntryCode = formatSecretForDisplay(base32);
  const currentToken = generateTOTPToken(base32);

  return {
    secret,
    base32,
    otpauthUrl,
    qrCodeDataUrl,
    manualEntryCode,
    currentToken,
  };
}
