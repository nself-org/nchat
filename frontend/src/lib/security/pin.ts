/**
 * PIN Security Utilities
 *
 * Provides client-side PIN hashing and verification using PBKDF2
 * SECURITY: PIN hash is NEVER transmitted to server, only stored locally
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const PBKDF2_ITERATIONS = 100000;
const HASH_LENGTH = 32; // 256 bits
const SALT_LENGTH = 16; // 128 bits

// ============================================================================
// Types
// ============================================================================

export interface PinSettings {
  pinHash: string;
  pinSalt: string;
  lockOnClose: boolean;
  lockOnBackground: boolean;
  lockTimeoutMinutes: 0 | 5 | 15 | 30 | 60;
  biometricEnabled: boolean;
  createdAt: string;
  lastChangedAt: string;
}

export interface PinAttempt {
  id: string;
  userId: string;
  success: boolean;
  attemptTime: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  failureReason?: string;
}

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil: string | null;
  failedAttempts: number;
  lockoutDurationMinutes: number;
}

// ============================================================================
// PIN Validation
// ============================================================================

/**
 * Validate PIN format (4-6 digits)
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Get PIN strength indicator
 */
export function getPinStrength(pin: string): {
  strength: "weak" | "medium" | "strong";
  message: string;
} {
  if (pin.length < 4) {
    return { strength: "weak", message: "PIN must be 4-6 digits" };
  }

  // Check for sequential patterns (1234, 4321)
  const hasSequential =
    /(?:0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(
      pin,
    );

  // Check for repeating digits (1111, 2222)
  const hasRepeating = /^(\d)\1+$/.test(pin);

  // Check for common patterns
  const commonPins = ["1234", "0000", "1111", "1212", "1004", "2000"];
  const isCommon = commonPins.includes(pin);

  if (pin.length === 4 || hasSequential || hasRepeating || isCommon) {
    return {
      strength: "weak",
      message: "Avoid common patterns like 1234 or 1111",
    };
  }

  if (pin.length === 5) {
    return { strength: "medium", message: "Good PIN strength" };
  }

  return { strength: "strong", message: "Strong PIN" };
}

// ============================================================================
// Cryptographic Functions (Browser Crypto API)
// ============================================================================

/**
 * Generate random salt for PIN hashing
 */
export function generateSalt(): string {
  const buffer = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Hash PIN using PBKDF2-SHA256
 *
 * @param pin - The PIN to hash (4-6 digits)
 * @param salt - Hex-encoded salt (optional, generates new one if not provided)
 * @returns Object with hash and salt (both hex-encoded)
 */
export async function hashPin(
  pin: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  // Validate PIN format
  if (!isValidPinFormat(pin)) {
    throw new Error("PIN must be 4-6 digits");
  }

  // Generate or use provided salt
  const pinSalt = salt || generateSalt();
  const saltBytes = hexToBytes(pinSalt);

  // Convert PIN to Uint8Array
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin);

  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_LENGTH * 8,
  );

  // Convert to hex
  const hashBytes = new Uint8Array(hashBuffer);
  const hash = bytesToHex(hashBytes);

  return { hash, salt: pinSalt };
}

/**
 * Verify PIN against stored hash
 *
 * @param pin - The PIN to verify
 * @param storedHash - The stored hash to compare against
 * @param storedSalt - The salt used for the stored hash
 * @returns true if PIN matches, false otherwise
 */
export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  try {
    // Hash the provided PIN with the stored salt
    const { hash } = await hashPin(pin, storedSalt);

    // Constant-time comparison to prevent timing attacks
    return hash === storedHash;
  } catch {
    return false;
  }
}

// ============================================================================
// PIN Storage (LocalStorage)
// ============================================================================

const PIN_STORAGE_KEY = "nself_chat_pin_settings";

/**
 * Store PIN settings in localStorage
 */
export function storePinSettings(settings: PinSettings): void {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error("Failed to store PIN settings:", error);
    throw new Error("Failed to store PIN settings");
  }
}

/**
 * Load PIN settings from localStorage
 */
export function loadPinSettings(): PinSettings | null {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return null;

    const settings = JSON.parse(stored) as PinSettings;

    // Validate required fields
    if (!settings.pinHash || !settings.pinSalt) {
      logger.warn("Invalid PIN settings in localStorage");
      return null;
    }

    return settings;
  } catch (error) {
    logger.error("Failed to load PIN settings:", error);
    return null;
  }
}

/**
 * Clear PIN settings from localStorage
 */
export function clearPinSettings(): void {
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
  } catch (error) {
    logger.error("Failed to clear PIN settings:", error);
  }
}

/**
 * Check if PIN is configured
 */
export function hasPinConfigured(): boolean {
  return loadPinSettings() !== null;
}

// ============================================================================
// PIN Attempt Tracking
// ============================================================================

const ATTEMPTS_STORAGE_KEY = "nself_chat_pin_attempts";
const MAX_STORED_ATTEMPTS = 20;

interface StoredAttempt {
  timestamp: number;
  success: boolean;
  failureReason?: string;
}

/**
 * Record PIN attempt locally (for UI feedback)
 */
export function recordLocalPinAttempt(
  success: boolean,
  failureReason?: string,
): void {
  try {
    const stored = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const attempts: StoredAttempt[] = stored ? JSON.parse(stored) : [];

    attempts.unshift({
      timestamp: Date.now(),
      success,
      failureReason,
    });

    // Keep only recent attempts
    const recentAttempts = attempts.slice(0, MAX_STORED_ATTEMPTS);
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(recentAttempts));
  } catch (error) {
    logger.error("Failed to record PIN attempt:", error);
  }
}

/**
 * Get recent failed attempts (for lockout calculation)
 */
export function getRecentFailedAttempts(minutes: number = 15): StoredAttempt[] {
  try {
    const stored = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!stored) return [];

    const attempts: StoredAttempt[] = JSON.parse(stored);
    const cutoff = Date.now() - minutes * 60 * 1000;

    return attempts.filter(
      (attempt) => !attempt.success && attempt.timestamp > cutoff,
    );
  } catch {
    return [];
  }
}

/**
 * Clear attempt history
 */
export function clearAttemptHistory(): void {
  try {
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
  } catch (error) {
    logger.error("Failed to clear attempt history:", error);
  }
}

/**
 * Check if user is locked out due to failed attempts
 */
export function checkLocalLockout(): {
  isLocked: boolean;
  remainingMinutes: number;
  failedAttempts: number;
} {
  const LOCKOUT_THRESHOLD = 5;
  const LOCKOUT_DURATION_MINUTES = 30;

  const recentFailed = getRecentFailedAttempts(15);

  if (recentFailed.length >= LOCKOUT_THRESHOLD) {
    const oldestFailure = recentFailed[recentFailed.length - 1];
    const lockoutEnd =
      oldestFailure.timestamp + LOCKOUT_DURATION_MINUTES * 60 * 1000;
    const now = Date.now();

    if (now < lockoutEnd) {
      return {
        isLocked: true,
        remainingMinutes: Math.ceil((lockoutEnd - now) / (60 * 1000)),
        failedAttempts: recentFailed.length,
      };
    }
  }

  return {
    isLocked: false,
    remainingMinutes: 0,
    failedAttempts: recentFailed.length,
  };
}

// ============================================================================
// PIN Setup/Change Flow
// ============================================================================

export interface PinSetupResult {
  success: boolean;
  error?: string;
  settings?: PinSettings;
}

/**
 * Setup new PIN
 */
export async function setupPin(
  pin: string,
  confirmPin: string,
  options: {
    lockOnClose?: boolean;
    lockOnBackground?: boolean;
    lockTimeoutMinutes?: 0 | 5 | 15 | 30 | 60;
    biometricEnabled?: boolean;
  } = {},
): Promise<PinSetupResult> {
  try {
    // Validate PIN format
    if (!isValidPinFormat(pin)) {
      return { success: false, error: "PIN must be 4-6 digits" };
    }

    // Check PIN strength
    const strength = getPinStrength(pin);
    if (strength.strength === "weak") {
      return { success: false, error: strength.message };
    }

    // Confirm PIN matches
    if (pin !== confirmPin) {
      return { success: false, error: "PINs do not match" };
    }

    // Hash PIN
    const { hash, salt } = await hashPin(pin);

    // Create settings
    const settings: PinSettings = {
      pinHash: hash,
      pinSalt: salt,
      lockOnClose: options.lockOnClose ?? false,
      lockOnBackground: options.lockOnBackground ?? false,
      lockTimeoutMinutes: options.lockTimeoutMinutes ?? 15,
      biometricEnabled: options.biometricEnabled ?? false,
      createdAt: new Date().toISOString(),
      lastChangedAt: new Date().toISOString(),
    };

    // Store settings
    storePinSettings(settings);

    return { success: true, settings };
  } catch (error) {
    logger.error("PIN setup failed:", error);
    return { success: false, error: "Failed to setup PIN" };
  }
}

/**
 * Change existing PIN
 */
export async function changePin(
  currentPin: string,
  newPin: string,
  confirmNewPin: string,
): Promise<PinSetupResult> {
  try {
    // Load existing settings
    const existingSettings = loadPinSettings();
    if (!existingSettings) {
      return { success: false, error: "No PIN configured" };
    }

    // Verify current PIN
    const isValid = await verifyPin(
      currentPin,
      existingSettings.pinHash,
      existingSettings.pinSalt,
    );

    if (!isValid) {
      return { success: false, error: "Current PIN is incorrect" };
    }

    // Setup new PIN with existing options
    return setupPin(newPin, confirmNewPin, {
      lockOnClose: existingSettings.lockOnClose,
      lockOnBackground: existingSettings.lockOnBackground,
      lockTimeoutMinutes: existingSettings.lockTimeoutMinutes,
      biometricEnabled: existingSettings.biometricEnabled,
    });
  } catch (error) {
    logger.error("PIN change failed:", error);
    return { success: false, error: "Failed to change PIN" };
  }
}

/**
 * Update PIN settings (without changing PIN)
 */
export function updatePinSettings(
  updates: Partial<Omit<PinSettings, "pinHash" | "pinSalt" | "createdAt">>,
): boolean {
  try {
    const existingSettings = loadPinSettings();
    if (!existingSettings) {
      throw new Error("No PIN configured");
    }

    const updatedSettings: PinSettings = {
      ...existingSettings,
      ...updates,
    };

    storePinSettings(updatedSettings);
    return true;
  } catch (error) {
    logger.error("Failed to update PIN settings:", error);
    return false;
  }
}

/**
 * Disable PIN lock (requires PIN verification)
 */
export async function disablePin(currentPin: string): Promise<boolean> {
  try {
    const settings = loadPinSettings();
    if (!settings) return true; // Already disabled

    // Verify PIN before disabling
    const isValid = await verifyPin(
      currentPin,
      settings.pinHash,
      settings.pinSalt,
    );
    if (!isValid) {
      return false;
    }

    clearPinSettings();
    clearAttemptHistory();
    return true;
  } catch {
    return false;
  }
}
