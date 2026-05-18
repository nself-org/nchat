/**
 * Token Encryption Utilities
 * Encrypts/decrypts OAuth tokens for secure storage
 */

import crypto from "crypto";

import { logger } from "@/lib/logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const key = process.env.SOCIAL_MEDIA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "SOCIAL_MEDIA_ENCRYPTION_KEY environment variable is required",
    );
  }
  // Use PBKDF2 to derive a key from the password
  return crypto.pbkdf2Sync(key, "social-media-salt", 100000, 32, "sha256");
}

/**
 * Encrypt a token for secure storage
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const result = Buffer.concat([iv, authTag, Buffer.from(encrypted, "hex")]);

    return result.toString("base64");
  } catch (error) {
    logger.error("Token encryption failed:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt a token from storage
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encryptedToken, "base64");

    // Extract IV, authTag, and encrypted data
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Token decryption failed:", error);
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Generate a secure random encryption key
 * This should be run once and stored in environment variables
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * Validate that an encrypted token is valid
 */
export function isValidEncryptedToken(encryptedToken: string): boolean {
  try {
    const buffer = Buffer.from(encryptedToken, "base64");
    return buffer.length >= IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}
