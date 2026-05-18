/**
 * Two-Factor Authentication Utilities
 *
 * Handles 2FA secret generation, QR code generation, code verification,
 * and backup codes management
 */

import { createHmac, randomBytes } from "crypto";
import * as QRCodeLib from "qrcode";

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
  base32: string;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export interface BackupCode {
  code: string;
  hash: string;
}

// ============================================================================
// Constants
// ============================================================================

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const SECRET_LENGTH = 20;

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ============================================================================
// Base32 Encoding/Decoding
// ============================================================================

/**
 * Encode a buffer to base32
 */
export function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Decode a base32 string to buffer
 */
export function base32Decode(encoded: string): Buffer {
  const cleanEncoded = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanEncoded) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ============================================================================
// TOTP Implementation
// ============================================================================

/**
 * Generate a cryptographically secure random secret
 */
export function generateSecret(): TwoFactorSecret {
  const buffer = randomBytes(SECRET_LENGTH);
  const base32Secret = base32Encode(buffer);

  return {
    secret: buffer.toString("hex"),
    base32: base32Secret,
    otpauthUrl: "", // Will be set by generateOtpauthUrl
  };
}

/**
 * Generate the otpauth URL for QR code generation
 */
export function generateOtpauthUrl(
  secret: string,
  accountName: string,
  issuer: string = "nchat",
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  const encodedSecret = encodeURIComponent(secret);

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate a TOTP code for a given secret and time
 */
export function generateTOTP(secret: string, time?: number): string {
  const currentTime = time || Math.floor(Date.now() / 1000);
  const counter = Math.floor(currentTime / TOTP_PERIOD);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Decode the base32 secret
  const secretBuffer = base32Decode(secret);

  // Generate HMAC-SHA1
  const hmac = createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Get the last 6 digits
  const otp = code % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Verify a TOTP code against a secret
 * Allows for time drift by checking adjacent time windows
 */
export function verifyTOTP(
  code: string,
  secret: string,
  window: number = 1,
): boolean {
  if (code.length !== TOTP_DIGITS) return false;

  const currentTime = Math.floor(Date.now() / 1000);

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, currentTime + i * TOTP_PERIOD);
    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Backup Codes
// ============================================================================

/**
 * Generate a single backup code
 */
function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar-looking characters
  let code = "";

  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    const randomIndex = randomBytes(1)[0] % chars.length;
    code += chars[randomIndex];
    // Add hyphen in the middle for readability
    if (i === 3) code += "-";
  }

  return code;
}

/**
 * Generate a set of backup codes with their hashes
 */
export function generateBackupCodes(): BackupCode[] {
  const codes: BackupCode[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    const hash = hashBackupCode(code);
    codes.push({ code, hash });
  }

  return codes;
}

/**
 * Hash a backup code for secure storage
 */
export function hashBackupCode(code: string): string {
  const cleanCode = code.replace(/-/g, "").toUpperCase();
  const hmac = createHmac(
    "sha256",
    process.env.BACKUP_CODE_SECRET || "default-secret",
  );
  hmac.update(cleanCode);
  return hmac.digest("hex");
}

/**
 * Verify a backup code against a hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
  const computedHash = hashBackupCode(code);
  return computedHash === hash;
}

// ============================================================================
// QR Code Generation (Client-side compatible)
// ============================================================================

/**
 * Generate QR code data URL from otpauth URL
 * Uses the 'qrcode' library for server-side generation
 * Returns a data URL suitable for rendering in <img> tags (CSP-safe)
 */
export async function generateQRCodeDataUrl(
  otpauthUrl: string,
  options: { width?: number; margin?: number } = {},
): Promise<string> {
  try {
    const { width = 200, margin = 4 } = options;

    // Generate QR code as data URL using qrcode library
    // This produces a PNG data URL that can be safely rendered in img tags
    const qrCodeDataUrl = await QRCodeLib.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M", // Medium error correction (handles ~7.5% data loss)
      margin: margin, // Quiet zone around QR code
      width: width, // Size in pixels
      color: {
        dark: "#000000", // QR code modules
        light: "#FFFFFF", // Background
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(
      `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Complete Setup Flow
// ============================================================================

/**
 * Generate complete 2FA setup data including secret, QR code, and backup codes
 */
export async function generateTwoFactorSetup(
  accountName: string,
  issuer: string = "nchat",
): Promise<TwoFactorSetupData> {
  // Generate secret
  const secretData = generateSecret();

  // Generate otpauth URL
  const otpauthUrl = generateOtpauthUrl(secretData.base32, accountName, issuer);

  // Generate QR code
  const qrCodeDataUrl = await generateQRCodeDataUrl(otpauthUrl);

  // Generate backup codes
  const backupCodesData = generateBackupCodes();
  const backupCodes = backupCodesData.map((bc) => bc.code);

  return {
    secret: secretData.base32,
    qrCodeDataUrl,
    backupCodes,
    otpauthUrl,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate TOTP code format
 */
export function isValidTOTPFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate backup code format
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Format: XXXX-XXXX (with or without hyphen)
  const cleanCode = code.replace(/-/g, "").toUpperCase();
  return /^[A-Z0-9]{8}$/.test(cleanCode);
}

// ============================================================================
// Password Strength Utilities
// ============================================================================

export interface PasswordStrength {
  score: number; // 0-4
  label: "Weak" | "Fair" | "Good" | "Strong" | "Very Strong";
  suggestions: string[];
  isAcceptable: boolean;
}

/**
 * Calculate password strength
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character type checks
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (hasLowercase && hasUppercase) score++;
  if (hasNumbers) score++;
  if (hasSpecial) score++;

  // Suggestions based on what's missing
  if (password.length < 8) {
    suggestions.push("Use at least 8 characters");
  }
  if (!hasLowercase || !hasUppercase) {
    suggestions.push("Mix uppercase and lowercase letters");
  }
  if (!hasNumbers) {
    suggestions.push("Add numbers");
  }
  if (!hasSpecial) {
    suggestions.push("Add special characters (!@#$%^&*)");
  }

  // Common patterns to avoid
  if (/^[a-zA-Z]+$/.test(password)) {
    suggestions.push("Avoid using only letters");
    score = Math.max(0, score - 1);
  }
  if (/^[0-9]+$/.test(password)) {
    suggestions.push("Avoid using only numbers");
    score = Math.max(0, score - 1);
  }
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push("Avoid repeating characters");
    score = Math.max(0, score - 1);
  }

  // Normalize score to 0-4
  const normalizedScore = Math.min(4, Math.max(0, Math.floor(score / 1.5)));

  const labels: PasswordStrength["label"][] = [
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very Strong",
  ];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    suggestions,
    isAcceptable: normalizedScore >= 2,
  };
}

/**
 * Get color for password strength indicator
 */
export function getStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return "bg-red-500";
    case 1:
      return "bg-orange-500";
    case 2:
      return "bg-yellow-500";
    case 3:
      return "bg-green-500";
    case 4:
      return "bg-emerald-500";
    default:
      return "bg-gray-300";
  }
}
