/**
 * Registration Lock - Prevents account hijacking after SIM/device takeover
 *
 * Provides a PIN-based lock that must be entered during re-registration to
 * prevent attackers from taking over an account even if they have access
 * to the phone number or device.
 *
 * Features:
 * - Optional PIN lock (4-8 digits)
 * - Lock timeout and automatic expiration
 * - Failed attempt tracking with lockout
 * - Secure PIN storage using PBKDF2
 * - Recovery key bypass support
 * - Device binding for additional security
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Registration lock status
 */
export type RegistrationLockStatus =
  | "disabled" // Lock is not enabled
  | "active" // Lock is active and enforced
  | "expired" // Lock expired due to timeout
  | "locked_out" // Too many failed attempts
  | "bypassed"; // Lock was bypassed with recovery key

/**
 * PIN validation result
 */
export interface PinValidationResult {
  /** Whether the PIN is valid */
  valid: boolean;
  /** Remaining attempts before lockout */
  remainingAttempts: number;
  /** If locked out, when the lockout expires */
  lockoutExpiresAt: Date | null;
  /** Error message if invalid */
  error: string | null;
}

/**
 * Registration lock state
 */
export interface RegistrationLockState {
  /** Whether lock is enabled */
  enabled: boolean;
  /** Current lock status */
  status: RegistrationLockStatus;
  /** Hashed PIN (PBKDF2) */
  pinHash: string | null;
  /** Salt used for hashing */
  pinSalt: string | null;
  /** When the lock was created */
  createdAt: Date | null;
  /** When the lock expires (null = never) */
  expiresAt: Date | null;
  /** Number of failed attempts */
  failedAttempts: number;
  /** When the user is locked out until */
  lockedUntil: Date | null;
  /** Device IDs bound to this lock */
  boundDevices: string[];
  /** Last successful verification */
  lastVerifiedAt: Date | null;
  /** Recovery key hash for bypass */
  recoveryKeyHash: string | null;
}

/**
 * Registration lock configuration
 */
export interface RegistrationLockConfig {
  /** Minimum PIN length */
  minPinLength: number;
  /** Maximum PIN length */
  maxPinLength: number;
  /** PIN expiration in days (0 = never) */
  pinExpirationDays: number;
  /** Maximum failed attempts before lockout */
  maxFailedAttempts: number;
  /** Lockout duration in minutes */
  lockoutDurationMinutes: number;
  /** Progressive lockout (doubles each time) */
  progressiveLockout: boolean;
  /** Whether to bind lock to specific devices */
  deviceBinding: boolean;
  /** Maximum bound devices */
  maxBoundDevices: number;
  /** PBKDF2 iterations for PIN hashing */
  pbkdf2Iterations: number;
  /** Require re-verification after N days */
  reverificationDays: number;
}

/**
 * Lock attempt record
 */
export interface LockAttempt {
  /** Attempt ID */
  id: string;
  /** When the attempt was made */
  attemptedAt: Date;
  /** Whether it succeeded */
  success: boolean;
  /** IP address (if available) */
  ipAddress: string | null;
  /** Device ID (if available) */
  deviceId: string | null;
  /** User agent */
  userAgent: string | null;
  /** Failure reason */
  failureReason: string | null;
}

/**
 * Lock change event
 */
export interface LockChangeEvent {
  /** Event type */
  type:
    | "enabled"
    | "disabled"
    | "pin_changed"
    | "verified"
    | "failed"
    | "locked_out"
    | "bypassed";
  /** When the event occurred */
  timestamp: Date;
  /** Device ID (if available) */
  deviceId: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RegistrationLockConfig = {
  minPinLength: 4,
  maxPinLength: 8,
  pinExpirationDays: 0, // Never expires by default
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  progressiveLockout: true,
  deviceBinding: false,
  maxBoundDevices: 5,
  pbkdf2Iterations: 100000,
  reverificationDays: 30,
};

const STORAGE_PREFIX = "nchat_reg_lock_";
const STATE_STORAGE_KEY = `${STORAGE_PREFIX}state`;
const ATTEMPTS_STORAGE_KEY = `${STORAGE_PREFIX}attempts`;
const EVENTS_STORAGE_KEY = `${STORAGE_PREFIX}events`;

const RECOVERY_KEY_LENGTH = 32; // 256 bits
const RECOVERY_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Converts bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a random ID
 */
function generateId(): string {
  return bytesToHex(generateRandomBytes(16));
}

/**
 * Validates PIN format
 */
export function isValidPinFormat(
  pin: string,
  config: RegistrationLockConfig = DEFAULT_CONFIG,
): boolean {
  if (!pin || typeof pin !== "string") return false;
  if (pin.length < config.minPinLength || pin.length > config.maxPinLength)
    return false;
  return /^\d+$/.test(pin);
}

/**
 * Checks PIN strength
 */
export function checkPinStrength(pin: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (pin.length >= 6) {
    score += 20;
  } else {
    feedback.push("Use at least 6 digits for better security");
  }

  if (pin.length >= 8) {
    score += 10;
  }

  // Check for sequential digits (123, 234, etc.)
  let hasSequence = false;
  for (let i = 0; i < pin.length - 2; i++) {
    const d1 = parseInt(pin[i]);
    const d2 = parseInt(pin[i + 1]);
    const d3 = parseInt(pin[i + 2]);
    if (d2 - d1 === 1 && d3 - d2 === 1) {
      hasSequence = true;
      break;
    }
    if (d1 - d2 === 1 && d2 - d3 === 1) {
      hasSequence = true;
      break;
    }
  }
  if (hasSequence) {
    feedback.push("Avoid sequential digits (123, 321)");
  } else {
    score += 20;
  }

  // Check for repeated digits (1111, 2222, etc.)
  const allSame = pin.split("").every((d) => d === pin[0]);
  if (allSame) {
    feedback.push("Avoid using the same digit repeatedly");
  } else {
    score += 20;
  }

  // Check for common patterns (1234, 0000, birth years, etc.)
  const commonPatterns = [
    "1234",
    "4321",
    "0000",
    "1111",
    "1212",
    "6969",
    "1357",
    "2468",
  ];
  const hasCommon = commonPatterns.some((p) => pin.includes(p));
  if (hasCommon) {
    feedback.push("Avoid common PIN patterns");
  } else {
    score += 20;
  }

  // Check digit variety
  const uniqueDigits = new Set(pin.split("")).size;
  if (uniqueDigits >= 4) {
    score += 10;
  } else if (uniqueDigits >= 3) {
    score += 5;
  } else {
    feedback.push("Use more variety in your digits");
  }

  return { score: Math.min(100, score), feedback };
}

/**
 * Generates a recovery key
 */
export function generateRecoveryKey(): string {
  const bytes = generateRandomBytes(RECOVERY_KEY_LENGTH);
  let key = "";
  for (let i = 0; i < bytes.length; i++) {
    key += RECOVERY_KEY_ALPHABET[bytes[i] % RECOVERY_KEY_ALPHABET.length];
  }
  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += 4) {
    groups.push(key.slice(i, i + 4));
  }
  return groups.join("-");
}

/**
 * Normalizes a recovery key for comparison
 */
export function normalizeRecoveryKey(key: string): string {
  return key.replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Validates recovery key format
 */
export function isValidRecoveryKeyFormat(key: string): boolean {
  const normalized = normalizeRecoveryKey(key);
  if (normalized.length !== RECOVERY_KEY_LENGTH) return false;
  for (const char of normalized) {
    if (!RECOVERY_KEY_ALPHABET.includes(char)) return false;
  }
  return true;
}

// ============================================================================
// PIN Hashing
// ============================================================================

/**
 * Hashes a PIN using PBKDF2
 */
export async function hashPin(
  pin: string,
  salt?: Uint8Array,
  iterations: number = DEFAULT_CONFIG.pbkdf2Iterations,
): Promise<{ hash: string; salt: string }> {
  const pinSalt = salt || generateRandomBytes(32);
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    pinBuffer as unknown as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: pinSalt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return {
    hash: arrayBufferToBase64(derivedBits),
    salt: bytesToHex(pinSalt),
  };
}

/**
 * Verifies a PIN against its hash
 */
export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string,
  iterations: number = DEFAULT_CONFIG.pbkdf2Iterations,
): Promise<boolean> {
  try {
    const salt = hexToBytes(storedSalt);
    const { hash } = await hashPin(pin, salt, iterations);
    return hash === storedHash;
  } catch {
    return false;
  }
}

/**
 * Hashes a recovery key for storage
 */
export async function hashRecoveryKey(key: string): Promise<string> {
  const normalized = normalizeRecoveryKey(key);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Verifies a recovery key against its hash
 */
export async function verifyRecoveryKey(
  key: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const hash = await hashRecoveryKey(key);
    return hash === storedHash;
  } catch {
    return false;
  }
}

// ============================================================================
// Registration Lock Manager
// ============================================================================

/**
 * Manages registration lock operations
 */
export class RegistrationLockManager {
  private static instance: RegistrationLockManager;
  private config: RegistrationLockConfig;
  private state: RegistrationLockState;
  private attempts: LockAttempt[] = [];
  private events: LockChangeEvent[] = [];
  private initialized = false;
  private lockoutCount = 0; // For progressive lockout

  private constructor(config: Partial<RegistrationLockConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.getDefaultState();
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(
    config?: Partial<RegistrationLockConfig>,
  ): RegistrationLockManager {
    if (!RegistrationLockManager.instance) {
      RegistrationLockManager.instance = new RegistrationLockManager(config);
    }
    return RegistrationLockManager.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    RegistrationLockManager.instance =
      undefined as unknown as RegistrationLockManager;
  }

  /**
   * Gets the default state
   */
  private getDefaultState(): RegistrationLockState {
    return {
      enabled: false,
      status: "disabled",
      pinHash: null,
      pinSalt: null,
      createdAt: null,
      expiresAt: null,
      failedAttempts: 0,
      lockedUntil: null,
      boundDevices: [],
      lastVerifiedAt: null,
      recoveryKeyHash: null,
    };
  }

  /**
   * Initializes the lock manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();
    this.updateStatus();
    this.initialized = true;

    logger.info("Registration lock manager initialized", {
      enabled: this.state.enabled,
      status: this.state.status,
    });
  }

  /**
   * Gets the current lock state
   */
  getState(): RegistrationLockState {
    this.updateStatus();
    return { ...this.state };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): RegistrationLockConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   */
  updateConfig(updates: Partial<RegistrationLockConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Enables the registration lock with a PIN
   */
  async enableLock(
    pin: string,
    deviceId?: string,
  ): Promise<{
    success: boolean;
    recoveryKey: string | null;
    error: string | null;
  }> {
    // Validate PIN
    if (!isValidPinFormat(pin, this.config)) {
      return {
        success: false,
        recoveryKey: null,
        error: `PIN must be ${this.config.minPinLength}-${this.config.maxPinLength} digits`,
      };
    }

    // Check PIN strength
    const strength = checkPinStrength(pin);
    if (strength.score < 40) {
      return {
        success: false,
        recoveryKey: null,
        error: `PIN is too weak: ${strength.feedback.join(", ")}`,
      };
    }

    try {
      // Hash the PIN
      const { hash, salt } = await hashPin(
        pin,
        undefined,
        this.config.pbkdf2Iterations,
      );

      // Generate recovery key
      const recoveryKey = generateRecoveryKey();
      const recoveryKeyHash = await hashRecoveryKey(recoveryKey);

      // Calculate expiration
      const now = new Date();
      const expiresAt =
        this.config.pinExpirationDays > 0
          ? new Date(
              now.getTime() +
                this.config.pinExpirationDays * 24 * 60 * 60 * 1000,
            )
          : null;

      // Update state
      this.state = {
        enabled: true,
        status: "active",
        pinHash: hash,
        pinSalt: salt,
        createdAt: now,
        expiresAt,
        failedAttempts: 0,
        lockedUntil: null,
        boundDevices: deviceId ? [deviceId] : [],
        lastVerifiedAt: now,
        recoveryKeyHash,
      };

      await this.saveToStorage();
      this.recordEvent("enabled", deviceId);

      logger.info("Registration lock enabled", {
        deviceId,
        expiresAt: expiresAt?.toISOString() ?? "never",
      });

      return {
        success: true,
        recoveryKey,
        error: null,
      };
    } catch (error) {
      logger.error("Failed to enable registration lock", { error });
      return {
        success: false,
        recoveryKey: null,
        error: "Failed to enable lock",
      };
    }
  }

  /**
   * Disables the registration lock
   */
  async disableLock(
    pin: string,
    deviceId?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.state.enabled) {
      return { success: false, error: "Lock is not enabled" };
    }

    // Verify PIN
    const validation = await this.verifyPin(pin, deviceId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Disable lock
    this.state = this.getDefaultState();
    this.lockoutCount = 0;

    await this.saveToStorage();
    this.recordEvent("disabled", deviceId);

    logger.info("Registration lock disabled", { deviceId });

    return { success: true, error: null };
  }

  /**
   * Changes the PIN
   */
  async changePin(
    currentPin: string,
    newPin: string,
    deviceId?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.state.enabled) {
      return { success: false, error: "Lock is not enabled" };
    }

    // Verify current PIN
    const validation = await this.verifyPin(currentPin, deviceId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Validate new PIN
    if (!isValidPinFormat(newPin, this.config)) {
      return {
        success: false,
        error: `PIN must be ${this.config.minPinLength}-${this.config.maxPinLength} digits`,
      };
    }

    // Check new PIN strength
    const strength = checkPinStrength(newPin);
    if (strength.score < 40) {
      return {
        success: false,
        error: `New PIN is too weak: ${strength.feedback.join(", ")}`,
      };
    }

    // Don't allow same PIN
    const isSame = await verifyPin(
      newPin,
      this.state.pinHash!,
      this.state.pinSalt!,
      this.config.pbkdf2Iterations,
    );
    if (isSame) {
      return {
        success: false,
        error: "New PIN must be different from current PIN",
      };
    }

    try {
      // Hash new PIN
      const { hash, salt } = await hashPin(
        newPin,
        undefined,
        this.config.pbkdf2Iterations,
      );

      // Update state
      const now = new Date();
      this.state.pinHash = hash;
      this.state.pinSalt = salt;
      this.state.expiresAt =
        this.config.pinExpirationDays > 0
          ? new Date(
              now.getTime() +
                this.config.pinExpirationDays * 24 * 60 * 60 * 1000,
            )
          : null;
      this.state.lastVerifiedAt = now;

      await this.saveToStorage();
      this.recordEvent("pin_changed", deviceId);

      logger.info("Registration lock PIN changed", { deviceId });

      return { success: true, error: null };
    } catch (error) {
      logger.error("Failed to change PIN", { error });
      return { success: false, error: "Failed to change PIN" };
    }
  }

  /**
   * Verifies the PIN
   */
  async verifyPin(
    pin: string,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<PinValidationResult> {
    // Check if lock is enabled
    if (!this.state.enabled) {
      return {
        valid: false,
        remainingAttempts: 0,
        lockoutExpiresAt: null,
        error: "Lock is not enabled",
      };
    }

    // Update status first
    this.updateStatus();

    // Check if locked out
    if (this.state.status === "locked_out") {
      return {
        valid: false,
        remainingAttempts: 0,
        lockoutExpiresAt: this.state.lockedUntil,
        error: "Too many failed attempts. Please try again later.",
      };
    }

    // Check if expired
    if (this.state.status === "expired") {
      return {
        valid: false,
        remainingAttempts: 0,
        lockoutExpiresAt: null,
        error: "PIN has expired. Please set a new PIN.",
      };
    }

    // Check device binding
    if (
      this.config.deviceBinding &&
      deviceId &&
      this.state.boundDevices.length > 0 &&
      !this.state.boundDevices.includes(deviceId)
    ) {
      this.recordAttempt(false, deviceId, ipAddress, "Unrecognized device");
      return {
        valid: false,
        remainingAttempts:
          this.config.maxFailedAttempts - this.state.failedAttempts,
        lockoutExpiresAt: null,
        error: "This device is not authorized for this lock",
      };
    }

    // Verify PIN
    const isValid = await verifyPin(
      pin,
      this.state.pinHash!,
      this.state.pinSalt!,
      this.config.pbkdf2Iterations,
    );

    if (isValid) {
      // Reset failed attempts
      this.state.failedAttempts = 0;
      this.state.lastVerifiedAt = new Date();
      this.lockoutCount = 0;

      this.recordAttempt(true, deviceId, ipAddress);
      this.recordEvent("verified", deviceId);
      await this.saveToStorage();

      return {
        valid: true,
        remainingAttempts: this.config.maxFailedAttempts,
        lockoutExpiresAt: null,
        error: null,
      };
    }

    // PIN invalid
    this.state.failedAttempts++;
    this.recordAttempt(false, deviceId, ipAddress, "Invalid PIN");

    const remaining = this.config.maxFailedAttempts - this.state.failedAttempts;

    // Check for lockout
    if (remaining <= 0) {
      this.triggerLockout();
      this.recordEvent("locked_out", deviceId);
    } else {
      this.recordEvent("failed", deviceId);
    }

    await this.saveToStorage();

    return {
      valid: false,
      remainingAttempts: Math.max(0, remaining),
      lockoutExpiresAt: this.state.lockedUntil,
      error:
        remaining <= 0
          ? "Too many failed attempts. Account locked."
          : `Invalid PIN. ${remaining} attempt(s) remaining.`,
    };
  }

  /**
   * Bypasses the lock using a recovery key
   */
  async bypassWithRecoveryKey(
    recoveryKey: string,
    deviceId?: string,
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.state.enabled) {
      return { success: false, error: "Lock is not enabled" };
    }

    if (!this.state.recoveryKeyHash) {
      return { success: false, error: "No recovery key is set" };
    }

    // Validate format
    if (!isValidRecoveryKeyFormat(recoveryKey)) {
      return { success: false, error: "Invalid recovery key format" };
    }

    // Verify recovery key
    const isValid = await verifyRecoveryKey(
      recoveryKey,
      this.state.recoveryKeyHash,
    );

    if (!isValid) {
      return { success: false, error: "Invalid recovery key" };
    }

    // Bypass successful - disable lock
    this.state.status = "bypassed";
    this.state.enabled = false;
    this.state.lockedUntil = null;
    this.state.failedAttempts = 0;
    this.lockoutCount = 0;

    await this.saveToStorage();
    this.recordEvent("bypassed", deviceId);

    logger.info("Registration lock bypassed with recovery key", { deviceId });

    return { success: true, error: null };
  }

  /**
   * Adds a device to the bound devices list
   */
  async addBoundDevice(
    deviceId: string,
    pin: string,
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.state.enabled) {
      return { success: false, error: "Lock is not enabled" };
    }

    // Verify PIN
    const validation = await this.verifyPin(pin);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Check max devices
    if (this.state.boundDevices.length >= this.config.maxBoundDevices) {
      return { success: false, error: "Maximum bound devices reached" };
    }

    // Add device
    if (!this.state.boundDevices.includes(deviceId)) {
      this.state.boundDevices.push(deviceId);
      await this.saveToStorage();
    }

    logger.info("Device added to registration lock", { deviceId });

    return { success: true, error: null };
  }

  /**
   * Removes a device from the bound devices list
   */
  async removeBoundDevice(
    deviceId: string,
    pin: string,
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.state.enabled) {
      return { success: false, error: "Lock is not enabled" };
    }

    // Verify PIN
    const validation = await this.verifyPin(pin);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Remove device
    const index = this.state.boundDevices.indexOf(deviceId);
    if (index !== -1) {
      this.state.boundDevices.splice(index, 1);
      await this.saveToStorage();
    }

    logger.info("Device removed from registration lock", { deviceId });

    return { success: true, error: null };
  }

  /**
   * Checks if re-verification is needed
   */
  needsReverification(): boolean {
    if (!this.state.enabled || !this.state.lastVerifiedAt) {
      return false;
    }

    if (this.config.reverificationDays <= 0) {
      return false;
    }

    const daysSinceVerification =
      (Date.now() - this.state.lastVerifiedAt.getTime()) /
      (1000 * 60 * 60 * 24);

    return daysSinceVerification >= this.config.reverificationDays;
  }

  /**
   * Gets recent lock attempts
   */
  getAttempts(limit: number = 50): LockAttempt[] {
    return this.attempts.slice(-limit);
  }

  /**
   * Gets recent lock events
   */
  getEvents(limit: number = 50): LockChangeEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clears all lock data
   */
  async clearAll(): Promise<void> {
    this.state = this.getDefaultState();
    this.attempts = [];
    this.events = [];
    this.lockoutCount = 0;

    await this.clearStorage();

    logger.warn("Registration lock data cleared");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Updates the lock status
   */
  private updateStatus(): void {
    if (!this.state.enabled) {
      this.state.status = "disabled";
      return;
    }

    // Check lockout
    if (this.state.lockedUntil && this.state.lockedUntil > new Date()) {
      this.state.status = "locked_out";
      return;
    }

    // Clear expired lockout
    if (this.state.lockedUntil && this.state.lockedUntil <= new Date()) {
      this.state.lockedUntil = null;
      this.state.failedAttempts = 0;
    }

    // Check expiration
    if (this.state.expiresAt && this.state.expiresAt <= new Date()) {
      this.state.status = "expired";
      return;
    }

    this.state.status = "active";
  }

  /**
   * Triggers a lockout
   */
  private triggerLockout(): void {
    this.lockoutCount++;

    // Calculate lockout duration with progressive increase
    let duration = this.config.lockoutDurationMinutes;
    if (this.config.progressiveLockout) {
      duration = duration * Math.pow(2, Math.min(this.lockoutCount - 1, 5));
    }

    this.state.lockedUntil = new Date(Date.now() + duration * 60 * 1000);
    this.state.status = "locked_out";

    logger.warn("Registration lock lockout triggered", {
      duration,
      lockoutCount: this.lockoutCount,
      expiresAt: this.state.lockedUntil.toISOString(),
    });
  }

  /**
   * Records an attempt
   */
  private recordAttempt(
    success: boolean,
    deviceId?: string,
    ipAddress?: string,
    failureReason?: string,
  ): void {
    this.attempts.push({
      id: generateId(),
      attemptedAt: new Date(),
      success,
      ipAddress: ipAddress ?? null,
      deviceId: deviceId ?? null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      failureReason: failureReason ?? null,
    });

    // Keep only last 100 attempts
    if (this.attempts.length > 100) {
      this.attempts = this.attempts.slice(-100);
    }
  }

  /**
   * Records an event
   */
  private recordEvent(
    type: LockChangeEvent["type"],
    deviceId?: string,
    metadata: Record<string, unknown> = {},
  ): void {
    this.events.push({
      type,
      timestamp: new Date(),
      deviceId: deviceId ?? null,
      metadata,
    });

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  /**
   * Loads state from storage
   */
  private async loadFromStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      const stateJson = localStorage.getItem(STATE_STORAGE_KEY);
      if (stateJson) {
        const storedState = JSON.parse(stateJson);
        this.state = {
          ...storedState,
          createdAt: storedState.createdAt
            ? new Date(storedState.createdAt)
            : null,
          expiresAt: storedState.expiresAt
            ? new Date(storedState.expiresAt)
            : null,
          lockedUntil: storedState.lockedUntil
            ? new Date(storedState.lockedUntil)
            : null,
          lastVerifiedAt: storedState.lastVerifiedAt
            ? new Date(storedState.lastVerifiedAt)
            : null,
        };
      }

      const attemptsJson = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (attemptsJson) {
        this.attempts = JSON.parse(attemptsJson).map(
          (a: LockAttempt & { attemptedAt: string }) => ({
            ...a,
            attemptedAt: new Date(a.attemptedAt),
          }),
        );
      }

      const eventsJson = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (eventsJson) {
        this.events = JSON.parse(eventsJson).map(
          (e: LockChangeEvent & { timestamp: string }) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }),
        );
      }
    } catch (error) {
      logger.warn("Failed to load registration lock state", { error });
    }
  }

  /**
   * Saves state to storage
   */
  private async saveToStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(this.state));
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(this.attempts));
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      logger.warn("Failed to save registration lock state", { error });
    }
  }

  /**
   * Clears storage
   */
  private async clearStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    localStorage.removeItem(STATE_STORAGE_KEY);
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(EVENTS_STORAGE_KEY);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global registration lock manager instance
 */
export function getRegistrationLockManager(
  config?: Partial<RegistrationLockConfig>,
): RegistrationLockManager {
  return RegistrationLockManager.getInstance(config);
}

/**
 * Initializes the registration lock manager
 */
export async function initializeRegistrationLock(): Promise<void> {
  const manager = getRegistrationLockManager();
  await manager.initialize();
}

/**
 * Checks if registration lock is enabled
 */
export function isRegistrationLockEnabled(): boolean {
  const manager = getRegistrationLockManager();
  return manager.getState().enabled;
}

/**
 * Gets the registration lock status
 */
export function getRegistrationLockStatus(): RegistrationLockStatus {
  const manager = getRegistrationLockManager();
  return manager.getState().status;
}

/**
 * Enforces registration lock - returns true if lock should block registration
 */
export function shouldBlockRegistration(): boolean {
  const manager = getRegistrationLockManager();
  const state = manager.getState();
  return state.enabled && state.status === "active";
}
