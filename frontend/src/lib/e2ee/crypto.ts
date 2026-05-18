/**
 * Low-level cryptographic operations for E2EE
 * Uses Web Crypto API and @noble libraries
 */

import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { randomBytes } from "@noble/hashes/utils";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ============================================================================
// CONSTANTS
// ============================================================================

export const PBKDF2_ITERATIONS = 100000;
export const SALT_LENGTH = 32;
export const KEY_LENGTH = 32;
export const IV_LENGTH = 12; // GCM nonce
export const AUTH_TAG_LENGTH = 16;

// ============================================================================
// RANDOM GENERATION
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return randomBytes(length);
}

/**
 * Generate a random device ID
 */
export function generateDeviceId(): string {
  const bytes = generateRandomBytes(16);
  return bytesToHex(bytes);
}

/**
 * Generate a random registration ID (14-bit number)
 */
export function generateRegistrationId(): number {
  const bytes = generateRandomBytes(2);
  return (bytes[0] << 6) | (bytes[1] >> 2); // 14 bits
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * SHA-256 hash
 */
export function hash256(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/**
 * SHA-512 hash
 */
export function hash512(data: Uint8Array): Uint8Array {
  return sha512(data);
}

/**
 * Generate fingerprint from public key
 */
export function generateFingerprint(publicKey: Uint8Array): string {
  const hash = hash256(publicKey);
  return bytesToHex(hash);
}

// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Derive master key from password using PBKDF2
 */
export async function deriveMasterKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  return pbkdf2(sha256, passwordBytes, salt, {
    c: iterations,
    dkLen: KEY_LENGTH,
  });
}

/**
 * Generate salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return generateRandomBytes(SALT_LENGTH);
}

/**
 * Verify master key against stored hash
 */
export function verifyMasterKey(
  masterKey: Uint8Array,
  keyHash: Uint8Array,
): boolean {
  const computedHash = hash256(masterKey);
  return constantTimeEqual(computedHash, keyHash);
}

// ============================================================================
// SYMMETRIC ENCRYPTION (AES-GCM)
// ============================================================================

/**
 * Encrypt data with AES-256-GCM
 */
export async function encryptAESGCM(
  plaintext: Uint8Array,
  key: Uint8Array,
): Promise<{
  ciphertext: Uint8Array;
  iv: Uint8Array;
}> {
  if (typeof window === "undefined") {
    throw new Error("Web Crypto API not available");
  }

  const iv = generateRandomBytes(IV_LENGTH);
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      tagLength: AUTH_TAG_LENGTH * 8,
    },
    cryptoKey,
    plaintext as BufferSource,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    iv,
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export async function decryptAESGCM(
  ciphertext: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    throw new Error("Web Crypto API not available");
  }

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
      tagLength: AUTH_TAG_LENGTH * 8,
    },
    cryptoKey,
    ciphertext as BufferSource,
  );

  return new Uint8Array(decrypted);
}

// ============================================================================
// DATA ENCODING
// ============================================================================

/**
 * Encode encrypted data with IV
 */
export function encodeEncryptedData(
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Uint8Array {
  const result = new Uint8Array(iv.length + ciphertext.length);
  result.set(iv, 0);
  result.set(ciphertext, iv.length);
  return result;
}

/**
 * Decode encrypted data with IV
 */
export function decodeEncryptedData(data: Uint8Array): {
  ciphertext: Uint8Array;
  iv: Uint8Array;
} {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return { ciphertext, iv };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Convert string to Uint8Array
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convert Uint8Array to Base64
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof window !== "undefined") {
    return window.btoa(String.fromCharCode(...bytes));
  }
  return Buffer.from(bytes).toString("base64");
}

/**
 * Convert Base64 to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof window !== "undefined") {
    const binary = window.atob(base64);
    return new Uint8Array(binary.split("").map((c) => c.charCodeAt(0)));
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Securely wipe sensitive data from memory
 */
export function secureWipe(data: Uint8Array): void {
  if (data && data.fill) {
    data.fill(0);
  }
}

// ============================================================================
// SAFETY NUMBER GENERATION
// ============================================================================

/**
 * Generate a 60-digit safety number from two identity keys
 * Following Signal's algorithm
 */
export function generateSafetyNumber(
  localIdentityKey: Uint8Array,
  localUserId: string,
  remoteIdentityKey: Uint8Array,
  remoteUserId: string,
  version: number = 1,
): string {
  // Combine version + user ID + identity key for each party
  const localData = new Uint8Array(
    1 + localUserId.length + localIdentityKey.length,
  );
  localData[0] = version;
  localData.set(stringToBytes(localUserId), 1);
  localData.set(localIdentityKey, 1 + localUserId.length);

  const remoteData = new Uint8Array(
    1 + remoteUserId.length + remoteIdentityKey.length,
  );
  remoteData[0] = version;
  remoteData.set(stringToBytes(remoteUserId), 1);
  remoteData.set(remoteIdentityKey, 1 + remoteUserId.length);

  // Hash each combination
  const localHash = hash512(localData);
  const remoteHash = hash512(remoteData);

  // Determine order (lexicographic comparison of user IDs)
  const iterations = 5200; // Produces 60 digits
  let combinedHash: Uint8Array;

  if (localUserId < remoteUserId) {
    const combined = new Uint8Array(localHash.length + remoteHash.length);
    combined.set(localHash, 0);
    combined.set(remoteHash, localHash.length);
    combinedHash = combined;
  } else {
    const combined = new Uint8Array(remoteHash.length + localHash.length);
    combined.set(remoteHash, 0);
    combined.set(localHash, remoteHash.length);
    combinedHash = combined;
  }

  // Generate 60-digit number
  let safetyNumber = "";
  const hashBytes = hash512(combinedHash);

  for (let i = 0; i < 60; i++) {
    const byteIndex = Math.floor((i * hashBytes.length) / 60);
    const digit = hashBytes[byteIndex] % 10;
    safetyNumber += digit.toString();
  }

  return safetyNumber;
}

/**
 * Format safety number with spaces for display
 * Example: "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890"
 */
export function formatSafetyNumber(safetyNumber: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < safetyNumber.length; i += 5) {
    chunks.push(safetyNumber.slice(i, i + 5));
  }
  return chunks.join(" ");
}

/**
 * Generate QR code data for safety number verification
 */
export function generateSafetyNumberQR(
  localIdentityKey: Uint8Array,
  localUserId: string,
  remoteIdentityKey: Uint8Array,
  remoteUserId: string,
): string {
  const safetyNumber = generateSafetyNumber(
    localIdentityKey,
    localUserId,
    remoteIdentityKey,
    remoteUserId,
  );

  // Format: "v1:<localUserId>:<remoteUserId>:<safetyNumber>"
  return `v1:${localUserId}:${remoteUserId}:${safetyNumber}`;
}

// ============================================================================
// RECOVERY CODE GENERATION
// ============================================================================

/**
 * Generate a recovery code for master key backup
 */
export function generateRecoveryCode(): string {
  const words = [
    "alpha",
    "bravo",
    "charlie",
    "delta",
    "echo",
    "foxtrot",
    "golf",
    "hotel",
    "india",
    "juliet",
    "kilo",
    "lima",
    "mike",
    "november",
    "oscar",
    "papa",
    "quebec",
    "romeo",
    "sierra",
    "tango",
    "uniform",
    "victor",
    "whiskey",
    "xray",
    "yankee",
    "zulu",
  ];

  const randomWords: string[] = [];
  for (let i = 0; i < 12; i++) {
    const randomIndex = generateRandomBytes(1)[0] % words.length;
    randomWords.push(words[randomIndex]);
  }

  return randomWords.join("-");
}

/**
 * Derive key from recovery code
 */
export async function deriveRecoveryKey(
  recoveryCode: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  return deriveMasterKey(recoveryCode, salt, PBKDF2_ITERATIONS);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const crypto = {
  // Random generation
  generateRandomBytes,
  generateDeviceId,
  generateRegistrationId,

  // Hashing
  hash256,
  hash512,
  generateFingerprint,

  // Key derivation
  deriveMasterKey,
  generateSalt,
  verifyMasterKey,

  // Encryption
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,

  // Utilities
  constantTimeEqual,
  stringToBytes,
  bytesToString,
  bytesToBase64,
  base64ToBytes,
  secureWipe,

  // Safety numbers
  generateSafetyNumber,
  formatSafetyNumber,
  generateSafetyNumberQR,

  // Recovery
  generateRecoveryCode,
  deriveRecoveryKey,

  // Hex encoding (re-exported from @noble/hashes/utils)
  bytesToHex,
  hexToBytes,
};

// Named exports for direct import
export { bytesToHex, hexToBytes };

export default crypto;
