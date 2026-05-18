/**
 * Backup Codes Utility
 *
 * Handles generation, hashing, and verification of backup codes
 * for Two-Factor Authentication recovery.
 */

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { logger } from "@/lib/logger";

/**
 * Generate backup codes
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8 random bytes = 16 hex characters
    const code = randomBytes(4).toString("hex").toUpperCase();
    // Format as XXXX-XXXX for better readability
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formattedCode);
  }

  return codes;
}

/**
 * Hash a backup code using bcrypt
 * @param code - Backup code to hash
 * @returns Bcrypt hash
 */
export async function hashBackupCode(code: string): Promise<string> {
  const saltRounds = 10;
  // Normalize code: remove dashes/spaces and uppercase for consistent hashing
  const normalizedCode = code.replace(/[-\s]/g, "").toUpperCase();
  const hash = await bcrypt.hash(normalizedCode, saltRounds);
  return hash;
}

/**
 * Verify a backup code against its hash
 * @param code - Backup code to verify
 * @param hash - Stored hash
 * @returns true if code matches hash
 */
export async function verifyBackupCode(
  code: string,
  hash: string,
): Promise<boolean> {
  try {
    const cleanCode = code.replace(/[-\s]/g, "").toUpperCase();
    const isMatch = await bcrypt.compare(cleanCode, hash);
    return isMatch;
  } catch (error) {
    logger.error("Backup code verification error:", error);
    return false;
  }
}

/**
 * Validate backup code format
 * @param code - Code to validate
 * @returns true if valid format (XXXX-XXXX)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Accept with or without dash: XXXX-XXXX or XXXXXXXX
  const cleanCode = code.replace(/[-\s]/g, "");
  return /^[A-F0-9]{8}$/i.test(cleanCode);
}

/**
 * Format backup code for display
 * @param code - Code to format
 * @returns Formatted code (XXXX-XXXX)
 */
export function formatBackupCode(code: string): string {
  const cleanCode = code.replace(/[-\s]/g, "").toUpperCase();
  if (cleanCode.length !== 8) {
    return code; // Return as-is if invalid length
  }
  return `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
}

/**
 * Generate and hash backup codes
 * @param count - Number of codes to generate
 * @returns Array of objects with code and hash
 */
export async function generateAndHashBackupCodes(
  count: number = 10,
): Promise<Array<{ code: string; hash: string }>> {
  const codes = generateBackupCodes(count);
  const hashedCodes = await Promise.all(
    codes.map(async (code) => ({
      code,
      hash: await hashBackupCode(code),
    })),
  );
  return hashedCodes;
}

/**
 * Convert backup codes to downloadable text format
 * @param codes - Array of backup codes
 * @param username - User identifier
 * @returns Formatted text for download
 */
export function formatBackupCodesForDownload(
  codes: string[],
  username: string,
): string {
  const header = `nchat Backup Codes for ${username}`;
  const divider = "=".repeat(header.length);
  const date = new Date().toISOString().split("T")[0];

  let text = `${header}\n${divider}\n\n`;
  text += `Generated: ${date}\n\n`;
  text +=
    "Keep these codes in a safe place. Each code can only be used once.\n\n";
  text += "Backup Codes:\n\n";

  codes.forEach((code, index) => {
    text += `${String(index + 1).padStart(2, " ")}. ${code}\n`;
  });

  text += "\n" + divider + "\n";
  text += "IMPORTANT: Store these codes securely and do not share them.\n";

  return text;
}

/**
 * Convert backup codes to printable HTML format
 * @param codes - Array of backup codes
 * @param username - User identifier
 * @returns HTML string for printing
 */
export function formatBackupCodesForPrint(
  codes: string[],
  username: string,
): string {
  const date = new Date().toLocaleDateString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>nchat Backup Codes</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
        }
        h1 {
          font-size: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .meta {
          color: #666;
          margin-bottom: 20px;
        }
        .codes {
          list-style: none;
          padding: 0;
        }
        .codes li {
          padding: 8px;
          margin: 4px 0;
          background: #f5f5f5;
          font-size: 16px;
          letter-spacing: 2px;
        }
        .warning {
          margin-top: 30px;
          padding: 15px;
          background: #fff3cd;
          border: 1px solid #ffc107;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <h1>nchat Backup Codes for ${username}</h1>
      <div class="meta">
        <p>Generated: ${date}</p>
        <p>Keep these codes in a safe place. Each code can only be used once.</p>
      </div>
      <ul class="codes">
        ${codes.map((code, i) => `<li>${String(i + 1).padStart(2, "0")}. ${code}</li>`).join("")}
      </ul>
      <div class="warning">
        <strong>IMPORTANT:</strong> Store these codes securely and do not share them with anyone.
        If you lose access to your authenticator app, you can use these codes to sign in.
      </div>
    </body>
    </html>
  `;
}

/**
 * Mask backup code for display (show only last 4 characters)
 * @param code - Full backup code
 * @returns Masked code (****-XXXX)
 */
export function maskBackupCode(code: string): string {
  const cleanCode = code.replace(/[-\s]/g, "");
  if (cleanCode.length !== 8) {
    return "****-****";
  }
  return `****-${cleanCode.slice(4)}`;
}

/**
 * Count remaining backup codes
 * @param codes - Array of backup code objects with 'used_at' property
 * @returns Number of unused codes
 */
export function countRemainingCodes(
  codes: Array<{ used_at: Date | null }>,
): number {
  return codes.filter((code) => code.used_at === null).length;
}

/**
 * Check if backup codes need regeneration
 * @param remainingCount - Number of remaining codes
 * @param threshold - Threshold to trigger warning (default: 3)
 * @returns true if codes should be regenerated
 */
export function shouldRegenerateCodes(
  remainingCount: number,
  threshold: number = 3,
): boolean {
  return remainingCount <= threshold;
}
