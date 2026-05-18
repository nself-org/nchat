/**
 * PIN Authentication Module
 *
 * Handles PIN validation, hashing, and secure storage.
 * Uses Web Crypto API for secure hashing and the secure storage
 * module for storing PIN hashes.
 */

import { getSecureStorage, type ISecureStorage } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";
import {
  type LockResult,
  type LockErrorCode,
  SECURE_STORAGE_SERVICE,
  STORAGE_KEYS,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[PinAuth]";
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 8;
const HASH_ALGORITHM = "SHA-256";
const HASH_ITERATIONS = 100000;
const SALT_LENGTH = 16;

// ============================================================================
// Types
// ============================================================================

/**
 * Stored PIN data structure
 */
interface StoredPinData {
  /** Base64-encoded hash of the PIN */
  hash: string;
  /** Base64-encoded salt used for hashing */
  salt: string;
  /** Number of iterations used */
  iterations: number;
  /** Hash algorithm used */
  algorithm: string;
  /** When the PIN was set */
  createdAt: string;
}

// ============================================================================
// Crypto Utilities
// ============================================================================

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (
    typeof globalThis.crypto !== "undefined" &&
    globalThis.crypto.getRandomValues
  ) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Fallback for environments without Web Crypto
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayToBase64(array: Uint8Array): string {
  if (typeof btoa === "function") {
    return btoa(String.fromCharCode(...array));
  }
  // Node.js environment
  return Buffer.from(array).toString("base64");
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  // Node.js environment
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Derive a key from PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    // Fallback: simple hash for environments without Web Crypto
    return fallbackHash(pin, salt);
  }

  try {
    // Import PIN as key material
    const pinBuffer = new TextEncoder().encode(pin);
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      pinBuffer,
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    // Derive bits using PBKDF2
    const derivedBits = await globalThis.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: HASH_ITERATIONS,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      256,
    );

    return new Uint8Array(derivedBits);
  } catch (error) {
    logger.warn(`${LOG_PREFIX} Web Crypto PBKDF2 failed, using fallback`, {
      error,
    });
    return fallbackHash(pin, salt);
  }
}

/**
 * Fallback hash function for environments without Web Crypto
 */
async function fallbackHash(
  pin: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  // Simple iterative hashing fallback
  let hash = pin + arrayToBase64(salt);
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    // Use a simple string hash for fallback
    let h = 0;
    for (let j = 0; j < hash.length; j++) {
      const char = hash.charCodeAt(j);
      h = (h << 5) - h + char;
      h = h & h; // Convert to 32bit integer
    }
    hash = h.toString(16) + hash.slice(0, 32);
  }
  return new TextEncoder().encode(hash.slice(0, 32));
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// ============================================================================
// PIN Authentication Class
// ============================================================================

/**
 * PIN Authentication Manager
 *
 * Handles all PIN-related operations including:
 * - Setting and changing PINs
 * - Validating PINs
 * - Secure storage of PIN hashes
 */
export class PinAuth {
  private storage: ISecureStorage;
  private pinLength: number;
  private initialized = false;

  constructor(storage?: ISecureStorage, pinLength: number = 6) {
    this.storage = storage || getSecureStorage();
    this.pinLength = Math.min(
      Math.max(pinLength, MIN_PIN_LENGTH),
      MAX_PIN_LENGTH,
    );
  }

  /**
   * Initialize the PIN auth module
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.storage.isInitialized()) {
      await this.storage.initialize();
    }

    this.initialized = true;
    logger.info(`${LOG_PREFIX} Initialized`, { pinLength: this.pinLength });
  }

  /**
   * Check if a PIN is set
   */
  async hasPinSet(): Promise<boolean> {
    await this.ensureInitialized();

    const hasPin = await this.storage.hasItem(STORAGE_KEYS.PIN_HASH, {
      service: SECURE_STORAGE_SERVICE,
    });

    return hasPin;
  }

  /**
   * Set or change the PIN
   */
  async setPin(pin: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Validate PIN format
    const validationResult = this.validatePinFormat(pin);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      // Generate salt
      const salt = generateRandomBytes(SALT_LENGTH);

      // Derive key from PIN
      const hash = await deriveKey(pin, salt);

      // Create stored data
      const storedData: StoredPinData = {
        hash: arrayToBase64(hash),
        salt: arrayToBase64(salt),
        iterations: HASH_ITERATIONS,
        algorithm: HASH_ALGORITHM,
        createdAt: new Date().toISOString(),
      };

      // Store in secure storage
      const result = await this.storage.setItem(
        STORAGE_KEYS.PIN_HASH,
        JSON.stringify(storedData),
        { service: SECURE_STORAGE_SERVICE },
      );

      if (!result.success) {
        return {
          success: false,
          data: null,
          error: result.error || "Failed to store PIN",
          errorCode: "STORAGE_ERROR",
        };
      }

      logger.info(`${LOG_PREFIX} PIN set successfully`);

      return {
        success: true,
        data: null,
        error: null,
        errorCode: null,
      };
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Failed to set PIN`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "ENCRYPTION_ERROR",
      };
    }
  }

  /**
   * Verify a PIN
   */
  async verifyPin(pin: string): Promise<LockResult<boolean>> {
    await this.ensureInitialized();

    // Validate PIN format first
    const validationResult = this.validatePinFormat(pin);
    if (!validationResult.success) {
      return {
        success: false,
        data: false,
        error: validationResult.error,
        errorCode: validationResult.errorCode,
      };
    }

    try {
      // Retrieve stored PIN data
      const result = await this.storage.getItem(STORAGE_KEYS.PIN_HASH, {
        service: SECURE_STORAGE_SERVICE,
      });

      if (!result.success || !result.data) {
        return {
          success: false,
          data: false,
          error: "PIN not set",
          errorCode: "PIN_NOT_SET",
        };
      }

      const storedData: StoredPinData = JSON.parse(result.data);

      // Derive key from provided PIN using stored salt
      const salt = base64ToArray(storedData.salt);
      const derivedHash = await deriveKey(pin, salt);

      // Compare hashes using constant-time comparison
      const storedHash = base64ToArray(storedData.hash);
      const isValid = constantTimeCompare(derivedHash, storedHash);

      return {
        success: true,
        data: isValid,
        error: isValid ? null : "Invalid PIN",
        errorCode: isValid ? null : "INVALID_PIN",
      };
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} PIN verification failed`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        data: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Change the PIN (requires current PIN verification)
   */
  async changePin(currentPin: string, newPin: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Verify current PIN
    const verifyResult = await this.verifyPin(currentPin);
    if (!verifyResult.success || !verifyResult.data) {
      return {
        success: false,
        data: null,
        error: "Current PIN is invalid",
        errorCode: "INVALID_PIN",
      };
    }

    // Set new PIN
    return this.setPin(newPin);
  }

  /**
   * Remove the PIN
   */
  async removePin(currentPin: string): Promise<LockResult> {
    await this.ensureInitialized();

    // Verify current PIN
    const verifyResult = await this.verifyPin(currentPin);
    if (!verifyResult.success || !verifyResult.data) {
      return {
        success: false,
        data: null,
        error: "Current PIN is invalid",
        errorCode: "INVALID_PIN",
      };
    }

    try {
      const result = await this.storage.removeItem(STORAGE_KEYS.PIN_HASH, {
        service: SECURE_STORAGE_SERVICE,
      });

      if (!result.success) {
        return {
          success: false,
          data: null,
          error: result.error || "Failed to remove PIN",
          errorCode: "STORAGE_ERROR",
        };
      }

      logger.info(`${LOG_PREFIX} PIN removed successfully`);

      return {
        success: true,
        data: null,
        error: null,
        errorCode: null,
      };
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Failed to remove PIN`,
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "STORAGE_ERROR",
      };
    }
  }

  /**
   * Force remove PIN (for admin/recovery purposes)
   */
  async forceRemovePin(): Promise<LockResult> {
    await this.ensureInitialized();

    try {
      await this.storage.removeItem(STORAGE_KEYS.PIN_HASH, {
        service: SECURE_STORAGE_SERVICE,
      });

      logger.info(`${LOG_PREFIX} PIN force removed`);

      return {
        success: true,
        data: null,
        error: null,
        errorCode: null,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "STORAGE_ERROR",
      };
    }
  }

  /**
   * Update PIN length requirement
   */
  setPinLength(length: number): void {
    this.pinLength = Math.min(Math.max(length, MIN_PIN_LENGTH), MAX_PIN_LENGTH);
  }

  /**
   * Get current PIN length requirement
   */
  getPinLength(): number {
    return this.pinLength;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure the module is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Validate PIN format
   */
  private validatePinFormat(pin: string): LockResult {
    if (!pin || typeof pin !== "string") {
      return {
        success: false,
        data: null,
        error: "PIN is required",
        errorCode: "INVALID_PIN",
      };
    }

    // Check if PIN contains only digits
    if (!/^\d+$/.test(pin)) {
      return {
        success: false,
        data: null,
        error: "PIN must contain only digits",
        errorCode: "INVALID_PIN",
      };
    }

    if (pin.length < this.pinLength) {
      return {
        success: false,
        data: null,
        error: `PIN must be at least ${this.pinLength} digits`,
        errorCode: "PIN_TOO_SHORT",
      };
    }

    if (pin.length > MAX_PIN_LENGTH) {
      return {
        success: false,
        data: null,
        error: `PIN must not exceed ${MAX_PIN_LENGTH} digits`,
        errorCode: "PIN_TOO_LONG",
      };
    }

    return {
      success: true,
      data: null,
      error: null,
      errorCode: null,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let pinAuthInstance: PinAuth | null = null;

/**
 * Get the singleton PinAuth instance
 */
export function getPinAuth(
  storage?: ISecureStorage,
  pinLength?: number,
): PinAuth {
  if (!pinAuthInstance) {
    pinAuthInstance = new PinAuth(storage, pinLength);
  }
  return pinAuthInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPinAuth(): void {
  pinAuthInstance = null;
}

/**
 * Create a new PinAuth instance
 */
export function createPinAuth(
  storage?: ISecureStorage,
  pinLength?: number,
): PinAuth {
  return new PinAuth(storage, pinLength);
}
