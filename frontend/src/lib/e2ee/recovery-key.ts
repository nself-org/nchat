/**
 * Recovery Key Generation and Management
 *
 * Provides secure recovery key generation, validation, and encryption.
 * Recovery keys serve as an alternative to passphrase for backup restoration.
 *
 * Recovery key format:
 * - 44 characters (encoded from 256 bits of entropy)
 * - Grouped for readability: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXX
 * - Checksum for error detection
 * - Case-insensitive for usability
 *
 * Security properties:
 * - 256 bits of entropy
 * - Cryptographically secure random generation
 * - Error detection via checksum
 * - Rate-limiting recommendations for verification
 */

import { sha256 } from "@noble/hashes/sha256";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,
  hash256,
  stringToBytes,
  bytesToString,
  bytesToBase64,
  base64ToBytes,
  constantTimeEqual,
} from "./crypto";

// ============================================================================
// Constants
// ============================================================================

/** Recovery key entropy in bytes (256 bits) */
const RECOVERY_KEY_ENTROPY = 32;

/** Recovery key checksum length in bytes */
const RECOVERY_KEY_CHECKSUM = 2;

/** Characters used in recovery key (case-insensitive, avoid confusing chars) */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Number of characters in a recovery key group */
const GROUP_SIZE = 5;

/**
 * Number of groups in a full recovery key.
 * 34 bytes (32 entropy + 2 checksum) * 8 bits / 5 bits per char = ~55 chars = 11 groups
 */
const NUM_GROUPS = 11;

/**
 * Total expected length of raw recovery key.
 * 34 bytes encoded in base32 = ceil(34 * 8 / 5) = 55 chars
 */
const EXPECTED_RAW_LENGTH = 55;

/** Domain separation for recovery key derivation */
const DOMAIN_RECOVERY = "nchat-recovery-key-v1";

/** Domain separation for master key encryption */
const DOMAIN_MASTER_KEY = "nchat-master-key-encrypt-v1";

// ============================================================================
// Types
// ============================================================================

/**
 * Generated recovery key result
 */
export interface RecoveryKeyResult {
  /** The recovery key in display format (with dashes) */
  displayKey: string;
  /** The recovery key raw (no dashes, uppercase) */
  rawKey: string;
  /** Key bytes for encryption operations */
  keyBytes: Uint8Array;
  /** Checksum bytes */
  checksum: Uint8Array;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Validated recovery key
 */
export interface ValidatedRecoveryKey {
  /** Whether the key is valid */
  valid: boolean;
  /** Normalized key (if valid) */
  normalizedKey?: string;
  /** Key bytes (if valid) */
  keyBytes?: Uint8Array;
  /** Error message (if invalid) */
  error?: string;
}

/**
 * Encrypted master key bundle
 */
export interface EncryptedMasterKey {
  /** Encrypted master key (base64) */
  encryptedKey: string;
  /** Recovery key hash for verification */
  recoveryKeyHash: string;
  /** Version for compatibility */
  version: number;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Recovery key verification attempt
 */
export interface VerificationAttempt {
  /** Timestamp of attempt */
  timestamp: number;
  /** Whether attempt was successful */
  success: boolean;
  /** Source IP or device identifier */
  source?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether operation is allowed */
  allowed: boolean;
  /** Seconds until next attempt allowed */
  waitSeconds: number;
  /** Number of remaining attempts */
  remainingAttempts: number;
}

// ============================================================================
// Recovery Key Generation
// ============================================================================

/**
 * Generates a new recovery key
 *
 * Creates a cryptographically secure recovery key with 256 bits of entropy.
 * The key includes a checksum for error detection.
 *
 * @returns Recovery key result
 */
export function generateRecoveryKey(): RecoveryKeyResult {
  // Generate random bytes
  const entropy = randomBytes(RECOVERY_KEY_ENTROPY);

  // Calculate checksum
  const hash = sha256(entropy);
  const checksum = hash.slice(0, RECOVERY_KEY_CHECKSUM);

  // Combine entropy and checksum
  const combined = new Uint8Array(entropy.length + checksum.length);
  combined.set(entropy, 0);
  combined.set(checksum, entropy.length);

  // Encode to recovery key format
  const rawKey = encodeToRecoveryFormat(combined);
  const displayKey = formatRecoveryKey(rawKey);

  return {
    displayKey,
    rawKey,
    keyBytes: entropy,
    checksum,
    createdAt: Date.now(),
  };
}

/**
 * Encodes bytes to recovery key format
 *
 * Uses a base32-like encoding with a carefully selected alphabet
 * that avoids ambiguous characters (0/O, 1/I/L).
 *
 * @param bytes - Bytes to encode
 * @returns Encoded string
 */
function encodeToRecoveryFormat(bytes: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      const index = (value >> bits) & 0x1f;
      result += RECOVERY_ALPHABET[index];
    }
  }

  // Handle remaining bits
  if (bits > 0) {
    const index = (value << (5 - bits)) & 0x1f;
    result += RECOVERY_ALPHABET[index];
  }

  return result;
}

/**
 * Decodes recovery key format to bytes
 *
 * @param encoded - Encoded recovery key
 * @returns Decoded bytes
 * @throws Error if invalid character encountered
 */
function decodeFromRecoveryFormat(encoded: string): Uint8Array {
  const normalizedEncoded = encoded.toUpperCase().replace(/-/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of normalizedEncoded) {
    const index = RECOVERY_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in recovery key: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    while (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Formats a raw recovery key with dashes for display
 *
 * @param rawKey - Raw recovery key without dashes
 * @returns Formatted key with dashes
 */
export function formatRecoveryKey(rawKey: string): string {
  const normalized = rawKey.toUpperCase().replace(/-/g, "");
  const groups: string[] = [];

  for (let i = 0; i < normalized.length; i += GROUP_SIZE) {
    groups.push(normalized.slice(i, i + GROUP_SIZE));
  }

  return groups.join("-");
}

/**
 * Normalizes a recovery key (removes formatting, uppercase)
 *
 * @param key - Input recovery key
 * @returns Normalized key
 */
export function normalizeRecoveryKey(key: string): string {
  return key.toUpperCase().replace(/[\s-]/g, "");
}

// ============================================================================
// Recovery Key Validation
// ============================================================================

/**
 * Validates a recovery key format and checksum
 *
 * @param key - Recovery key to validate
 * @returns Validation result
 */
export function validateRecoveryKey(key: string): ValidatedRecoveryKey {
  // Normalize the key
  const normalized = normalizeRecoveryKey(key);

  // Check length (55 chars for 34 bytes encoded in base32)
  if (normalized.length !== EXPECTED_RAW_LENGTH) {
    return {
      valid: false,
      error: `Invalid recovery key length: expected ${EXPECTED_RAW_LENGTH}, got ${normalized.length}`,
    };
  }

  // Check for invalid characters
  for (const char of normalized) {
    if (!RECOVERY_ALPHABET.includes(char)) {
      return {
        valid: false,
        error: `Invalid character in recovery key: ${char}`,
      };
    }
  }

  // Decode and verify checksum
  try {
    const decoded = decodeFromRecoveryFormat(normalized);

    // Split entropy and checksum
    const entropy = decoded.slice(0, RECOVERY_KEY_ENTROPY);
    const providedChecksum = decoded.slice(RECOVERY_KEY_ENTROPY);

    // Calculate expected checksum
    const hash = sha256(entropy);
    const expectedChecksum = hash.slice(0, RECOVERY_KEY_CHECKSUM);

    // Verify checksum
    if (!constantTimeEqual(providedChecksum, expectedChecksum)) {
      return {
        valid: false,
        error: "Invalid recovery key checksum - key may be mistyped",
      };
    }

    return {
      valid: true,
      normalizedKey: normalized,
      keyBytes: entropy,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to decode recovery key: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Checks if a recovery key looks potentially valid (format only)
 *
 * @param key - Key to check
 * @returns True if format appears valid
 */
export function looksLikeRecoveryKey(key: string): boolean {
  const normalized = normalizeRecoveryKey(key);

  if (normalized.length !== EXPECTED_RAW_LENGTH) {
    return false;
  }

  for (const char of normalized) {
    if (!RECOVERY_ALPHABET.includes(char)) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Master Key Encryption with Recovery Key
// ============================================================================

/**
 * Encrypts a master key with a recovery key
 *
 * @param masterKey - The master key to encrypt
 * @param recoveryKeyBytes - The recovery key bytes
 * @returns Encrypted master key bundle
 */
export async function encryptMasterKeyWithRecovery(
  masterKey: Uint8Array,
  recoveryKeyBytes: Uint8Array,
): Promise<EncryptedMasterKey> {
  // Derive encryption key from recovery key
  const encryptionKey = deriveFromRecoveryKey(
    recoveryKeyBytes,
    DOMAIN_MASTER_KEY,
  );

  // Encrypt master key
  const { ciphertext, iv } = await encryptAESGCM(masterKey, encryptionKey);
  const encrypted = encodeEncryptedData(ciphertext, iv);

  // Create recovery key hash for verification
  const recoveryKeyHash = bytesToHex(hash256(recoveryKeyBytes));

  return {
    encryptedKey: bytesToBase64(encrypted),
    recoveryKeyHash,
    version: 1,
    createdAt: Date.now(),
  };
}

/**
 * Decrypts a master key using a recovery key
 *
 * @param encryptedMasterKey - The encrypted master key bundle
 * @param recoveryKeyBytes - The recovery key bytes
 * @returns Decrypted master key
 * @throws Error if decryption fails
 */
export async function decryptMasterKeyWithRecovery(
  encryptedMasterKey: EncryptedMasterKey,
  recoveryKeyBytes: Uint8Array,
): Promise<Uint8Array> {
  // Verify recovery key hash
  const computedHash = bytesToHex(hash256(recoveryKeyBytes));
  if (computedHash !== encryptedMasterKey.recoveryKeyHash) {
    throw new Error("Invalid recovery key");
  }

  // Derive encryption key from recovery key
  const encryptionKey = deriveFromRecoveryKey(
    recoveryKeyBytes,
    DOMAIN_MASTER_KEY,
  );

  // Decrypt master key
  const encrypted = base64ToBytes(encryptedMasterKey.encryptedKey);
  const { ciphertext, iv } = decodeEncryptedData(encrypted);

  try {
    return await decryptAESGCM(ciphertext, encryptionKey, iv);
  } catch (error) {
    throw new Error("Failed to decrypt master key with recovery key");
  }
}

/**
 * Derives a key from recovery key bytes with domain separation
 *
 * @param recoveryKeyBytes - Recovery key bytes
 * @param domain - Domain separation string
 * @returns Derived key
 */
function deriveFromRecoveryKey(
  recoveryKeyBytes: Uint8Array,
  domain: string,
): Uint8Array {
  const domainBytes = stringToBytes(domain);
  const combined = new Uint8Array(recoveryKeyBytes.length + domainBytes.length);
  combined.set(recoveryKeyBytes, 0);
  combined.set(domainBytes, recoveryKeyBytes.length);
  return hash256(combined);
}

// ============================================================================
// Recovery Key Storage
// ============================================================================

/**
 * Creates a hash of recovery key for storage (verification only)
 *
 * @param recoveryKeyBytes - Recovery key bytes
 * @returns Hash for storage
 */
export function createRecoveryKeyHash(recoveryKeyBytes: Uint8Array): string {
  const hashBytes = hash256(recoveryKeyBytes);
  return bytesToHex(hashBytes);
}

/**
 * Verifies a recovery key against a stored hash
 *
 * @param recoveryKeyBytes - Recovery key to verify
 * @param storedHash - Stored hash to compare against
 * @returns True if recovery key matches
 */
export function verifyRecoveryKeyHash(
  recoveryKeyBytes: Uint8Array,
  storedHash: string,
): boolean {
  const computedHash = bytesToHex(hash256(recoveryKeyBytes));
  return constantTimeEqual(
    stringToBytes(computedHash),
    stringToBytes(storedHash),
  );
}

// ============================================================================
// Rate Limiting for Recovery Key Verification
// ============================================================================

/**
 * Maximum verification attempts before lockout
 */
export const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Lockout duration in seconds
 */
export const LOCKOUT_DURATION_SECONDS = 300; // 5 minutes

/**
 * Window for counting attempts in seconds
 */
export const ATTEMPT_WINDOW_SECONDS = 60; // 1 minute

/**
 * Checks if a verification attempt is allowed based on rate limiting
 *
 * @param attempts - Previous verification attempts
 * @returns Rate limit check result
 */
export function checkRateLimit(
  attempts: VerificationAttempt[],
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - ATTEMPT_WINDOW_SECONDS * 1000;

  // Filter attempts within the window
  const recentAttempts = attempts.filter((a) => a.timestamp > windowStart);
  const failedAttempts = recentAttempts.filter((a) => !a.success);

  // Check for lockout
  if (failedAttempts.length >= MAX_VERIFICATION_ATTEMPTS) {
    const oldestFailure = Math.min(...failedAttempts.map((a) => a.timestamp));
    const lockoutEnd = oldestFailure + LOCKOUT_DURATION_SECONDS * 1000;
    const waitMs = lockoutEnd - now;

    if (waitMs > 0) {
      return {
        allowed: false,
        waitSeconds: Math.ceil(waitMs / 1000),
        remainingAttempts: 0,
      };
    }
  }

  return {
    allowed: true,
    waitSeconds: 0,
    remainingAttempts: MAX_VERIFICATION_ATTEMPTS - failedAttempts.length,
  };
}

/**
 * Records a verification attempt
 *
 * @param attempts - Existing attempts array
 * @param success - Whether the attempt was successful
 * @param source - Optional source identifier
 * @returns Updated attempts array
 */
export function recordVerificationAttempt(
  attempts: VerificationAttempt[],
  success: boolean,
  source?: string,
): VerificationAttempt[] {
  const now = Date.now();
  const windowStart = now - LOCKOUT_DURATION_SECONDS * 1000;

  // Filter out old attempts
  const recentAttempts = attempts.filter((a) => a.timestamp > windowStart);

  // Add new attempt
  recentAttempts.push({
    timestamp: now,
    success,
    source,
  });

  return recentAttempts;
}

// ============================================================================
// Recovery Key Display Helpers
// ============================================================================

/**
 * Generates HTML for displaying a recovery key with styling hints
 *
 * @param displayKey - Formatted recovery key
 * @returns Array of groups for rendering
 */
export function getRecoveryKeyGroups(displayKey: string): string[] {
  return displayKey.split("-");
}

/**
 * Calculates the strength of a custom recovery passphrase
 * (not the generated recovery key)
 *
 * @param phrase - The passphrase to check
 * @returns Strength level (0-4)
 */
export function getRecoveryPhraseStrength(phrase: string): number {
  let strength = 0;

  if (phrase.length >= 12) strength++;
  if (phrase.length >= 16) strength++;
  if (/[a-z]/.test(phrase) && /[A-Z]/.test(phrase)) strength++;
  if (/[0-9]/.test(phrase)) strength++;
  if (/[^a-zA-Z0-9]/.test(phrase)) strength++;

  return Math.min(strength, 4);
}

/**
 * Masks a recovery key for partial display
 *
 * @param displayKey - The full recovery key
 * @param visibleGroups - Number of groups to show (from start and end)
 * @returns Masked recovery key
 */
export function maskRecoveryKey(
  displayKey: string,
  visibleGroups: number = 2,
): string {
  const groups = displayKey.split("-");

  if (groups.length <= visibleGroups * 2) {
    return displayKey;
  }

  const startGroups = groups.slice(0, visibleGroups);
  const endGroups = groups.slice(-visibleGroups);
  const middleCount = groups.length - visibleGroups * 2;

  return [
    ...startGroups,
    ...Array(middleCount).fill("*****"),
    ...endGroups,
  ].join("-");
}

// ============================================================================
// QR Code Data
// ============================================================================

/**
 * Creates QR code data for a recovery key
 *
 * @param recoveryKey - The recovery key result
 * @param userId - User ID for context
 * @returns QR code data string
 */
export function createRecoveryKeyQR(
  recoveryKey: RecoveryKeyResult,
  userId: string,
): string {
  return JSON.stringify({
    type: "nchat-recovery-key",
    version: 1,
    userId,
    key: recoveryKey.rawKey,
    createdAt: recoveryKey.createdAt,
  });
}

/**
 * Parses QR code data for a recovery key
 *
 * @param qrData - QR code data string
 * @returns Parsed data or null if invalid
 */
export function parseRecoveryKeyQR(qrData: string): {
  userId: string;
  recoveryKey: string;
  createdAt: number;
} | null {
  try {
    const parsed = JSON.parse(qrData);

    if (parsed.type !== "nchat-recovery-key" || parsed.version !== 1) {
      return null;
    }

    return {
      userId: parsed.userId,
      recoveryKey: parsed.key,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const recoveryKey = {
  // Generation
  generateRecoveryKey,
  formatRecoveryKey,
  normalizeRecoveryKey,

  // Validation
  validateRecoveryKey,
  looksLikeRecoveryKey,

  // Master key encryption
  encryptMasterKeyWithRecovery,
  decryptMasterKeyWithRecovery,

  // Storage helpers
  createRecoveryKeyHash,
  verifyRecoveryKeyHash,

  // Rate limiting
  checkRateLimit,
  recordVerificationAttempt,
  MAX_VERIFICATION_ATTEMPTS,
  LOCKOUT_DURATION_SECONDS,
  ATTEMPT_WINDOW_SECONDS,

  // Display helpers
  getRecoveryKeyGroups,
  getRecoveryPhraseStrength,
  maskRecoveryKey,

  // QR code
  createRecoveryKeyQR,
  parseRecoveryKeyQR,
};

export default recoveryKey;
