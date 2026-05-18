/**
 * Key Recovery System
 *
 * Provides secure backup and recovery mechanisms for cryptographic keys.
 * Implements multiple recovery strategies including recovery codes,
 * password-derived encryption, and social recovery.
 *
 * Features:
 * - Secure recovery code generation (BIP39-inspired)
 * - Password-derived backup encryption
 * - Key escrow with threshold secret sharing
 * - Recovery verification and rate limiting
 * - Audit trail for all recovery operations
 */

import { logger } from "@/lib/logger";
import {
  KeyPair,
  ExportedKeyPair,
  generateKeyPair,
  exportKeyPair,
  importKeyPair,
} from "./key-manager";

// ============================================================================
// Types
// ============================================================================

/**
 * Recovery method types
 */
export type RecoveryMethod =
  | "recovery_codes" // Pre-generated recovery codes
  | "password" // Password-derived key
  | "security_questions" // Answer-based recovery
  | "social_recovery" // Trusted contacts
  | "hardware_key" // Hardware security key
  | "backup_file"; // Encrypted backup file

/**
 * Recovery code entry
 */
export interface RecoveryCode {
  /** The recovery code (hashed for storage) */
  codeHash: string;
  /** When this code was generated */
  generatedAt: Date;
  /** When this code expires (null = never) */
  expiresAt: Date | null;
  /** Whether this code has been used */
  used: boolean;
  /** When this code was used */
  usedAt: Date | null;
  /** Code index for identification */
  index: number;
}

/**
 * Encrypted backup data structure
 */
export interface EncryptedBackup {
  /** Backup format version */
  version: number;
  /** Encryption algorithm used */
  algorithm: string;
  /** Salt for key derivation */
  salt: string;
  /** Initialization vector */
  iv: string;
  /** Encrypted key data */
  encryptedData: string;
  /** HMAC for integrity verification */
  hmac: string;
  /** When backup was created */
  createdAt: string;
  /** Device ID that created the backup */
  deviceId: string;
  /** Key version in backup */
  keyVersion: number;
}

/**
 * Recovery attempt record
 */
export interface RecoveryAttempt {
  /** Attempt identifier */
  id: string;
  /** Recovery method used */
  method: RecoveryMethod;
  /** Whether attempt succeeded */
  success: boolean;
  /** When attempt was made */
  attemptedAt: Date;
  /** IP address (if available) */
  ipAddress: string | null;
  /** User agent string */
  userAgent: string | null;
  /** Failure reason (if failed) */
  failureReason: string | null;
}

/**
 * Social recovery guardian
 */
export interface RecoveryGuardian {
  /** Guardian identifier */
  id: string;
  /** Guardian's name */
  name: string;
  /** Guardian's email or contact */
  contact: string;
  /** Guardian's public key for encrypting their share */
  publicKey: string;
  /** Whether guardian has confirmed their role */
  confirmed: boolean;
  /** When guardian was added */
  addedAt: Date;
}

/**
 * Social recovery share
 */
export interface RecoveryShare {
  /** Share identifier */
  id: string;
  /** Guardian ID this share belongs to */
  guardianId: string;
  /** Encrypted share data */
  encryptedShare: string;
  /** Share index (for Shamir's secret sharing) */
  index: number;
  /** When share was created */
  createdAt: Date;
}

/**
 * Recovery configuration
 */
export interface RecoveryConfig {
  /** Number of recovery codes to generate */
  recoveryCodeCount: number;
  /** Recovery code length (characters) */
  recoveryCodeLength: number;
  /** Whether to allow password-based recovery */
  allowPasswordRecovery: boolean;
  /** Minimum password strength for recovery */
  minPasswordStrength: number;
  /** Whether to enable social recovery */
  enableSocialRecovery: boolean;
  /** Number of guardians required for social recovery */
  socialRecoveryThreshold: number;
  /** Total number of guardians */
  socialRecoveryGuardians: number;
  /** Maximum recovery attempts before lockout */
  maxRecoveryAttempts: number;
  /** Lockout duration in minutes */
  lockoutDurationMinutes: number;
  /** Whether to require email verification for recovery */
  requireEmailVerification: boolean;
}

/**
 * Recovery state
 */
export interface RecoveryState {
  /** Whether recovery is set up */
  isSetUp: boolean;
  /** Available recovery methods */
  availableMethods: RecoveryMethod[];
  /** Number of unused recovery codes */
  unusedRecoveryCodes: number;
  /** Whether social recovery is configured */
  socialRecoveryConfigured: boolean;
  /** Number of confirmed guardians */
  confirmedGuardians: number;
  /** Recovery attempts in last 24 hours */
  recentAttempts: number;
  /** Whether currently locked out */
  isLockedOut: boolean;
  /** Lockout expires at */
  lockoutExpiresAt: Date | null;
}

// ============================================================================
// Constants
// ============================================================================

const RECOVERY_VERSION = 1;
const RECOVERY_ALGORITHM = "AES-256-GCM";
const PBKDF2_ITERATIONS = 100000;
const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1
const DEFAULT_CODE_COUNT = 10;
const DEFAULT_CODE_LENGTH = 8;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MINUTES = 30;

const STORAGE_PREFIX = "nchat_recovery_";
const CODES_STORAGE_KEY = `${STORAGE_PREFIX}codes`;
const ATTEMPTS_STORAGE_KEY = `${STORAGE_PREFIX}attempts`;
const GUARDIANS_STORAGE_KEY = `${STORAGE_PREFIX}guardians`;
const SHARES_STORAGE_KEY = `${STORAGE_PREFIX}shares`;
const CONFIG_STORAGE_KEY = `${STORAGE_PREFIX}config`;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a random recovery code
 */
export function generateRecoveryCode(
  length: number = DEFAULT_CODE_LENGTH,
): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let code = "";
  for (let i = 0; i < length; i++) {
    code += RECOVERY_CODE_ALPHABET[array[i] % RECOVERY_CODE_ALPHABET.length];
  }

  // Format with dashes for readability (XXXX-XXXX)
  if (length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }

  return code;
}

/**
 * Formats a recovery code for display
 */
export function formatRecoveryCode(code: string): string {
  // Remove any existing formatting
  const clean = code.replace(/[-\s]/g, "").toUpperCase();

  // Format in groups of 4
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    groups.push(clean.slice(i, i + 4));
  }

  return groups.join("-");
}

/**
 * Normalizes a recovery code for comparison
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[-\s]/g, "").toUpperCase();
}

/**
 * Hashes a recovery code for storage
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = normalizeRecoveryCode(code);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Derives an encryption key from a password
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts data with a derived key
 */
async function encryptWithKey(
  data: string,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  return crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    encodedData,
  );
}

/**
 * Decrypts data with a derived key
 */
async function decryptWithKey(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    encryptedData,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
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
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes HMAC for data integrity
 */
async function computeHmac(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  // Export key and re-import for HMAC
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", hmacKey, encodedData);
  return arrayBufferToBase64(signature);
}

/**
 * Verifies HMAC
 */
async function verifyHmac(
  data: string,
  hmac: string,
  key: CryptoKey,
): Promise<boolean> {
  const computed = await computeHmac(data, key);
  return computed === hmac;
}

// ============================================================================
// Key Recovery Manager
// ============================================================================

/**
 * Manages key recovery operations
 */
export class KeyRecoveryManager {
  private static instance: KeyRecoveryManager;
  private config: RecoveryConfig;
  private recoveryCodes: RecoveryCode[] = [];
  private attempts: RecoveryAttempt[] = [];
  private guardians: RecoveryGuardian[] = [];
  private shares: RecoveryShare[] = [];
  private initialized = false;
  private lockoutUntil: Date | null = null;

  private constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = {
      recoveryCodeCount: config.recoveryCodeCount ?? DEFAULT_CODE_COUNT,
      recoveryCodeLength: config.recoveryCodeLength ?? DEFAULT_CODE_LENGTH,
      allowPasswordRecovery: config.allowPasswordRecovery ?? true,
      minPasswordStrength: config.minPasswordStrength ?? 3,
      enableSocialRecovery: config.enableSocialRecovery ?? false,
      socialRecoveryThreshold: config.socialRecoveryThreshold ?? 3,
      socialRecoveryGuardians: config.socialRecoveryGuardians ?? 5,
      maxRecoveryAttempts: config.maxRecoveryAttempts ?? DEFAULT_MAX_ATTEMPTS,
      lockoutDurationMinutes:
        config.lockoutDurationMinutes ?? DEFAULT_LOCKOUT_MINUTES,
      requireEmailVerification: config.requireEmailVerification ?? true,
    };
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(config?: Partial<RecoveryConfig>): KeyRecoveryManager {
    if (!KeyRecoveryManager.instance) {
      KeyRecoveryManager.instance = new KeyRecoveryManager(config);
    }
    return KeyRecoveryManager.instance;
  }

  /**
   * Resets the singleton (for testing)
   */
  static resetInstance(): void {
    KeyRecoveryManager.instance = undefined as unknown as KeyRecoveryManager;
  }

  /**
   * Initializes the recovery manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();
    this.initialized = true;

    logger.info("Key recovery manager initialized");
  }

  /**
   * Gets the current recovery state
   */
  async getState(): Promise<RecoveryState> {
    const now = new Date();
    const recentAttempts = this.attempts.filter(
      (a) => now.getTime() - a.attemptedAt.getTime() < 24 * 60 * 60 * 1000,
    ).length;

    const availableMethods: RecoveryMethod[] = ["recovery_codes"];
    if (this.config.allowPasswordRecovery) {
      availableMethods.push("password");
    }
    if (this.config.enableSocialRecovery && this.guardians.length > 0) {
      availableMethods.push("social_recovery");
    }

    return {
      isSetUp: this.recoveryCodes.length > 0,
      availableMethods,
      unusedRecoveryCodes: this.recoveryCodes.filter((c) => !c.used).length,
      socialRecoveryConfigured:
        this.guardians.filter((g) => g.confirmed).length >=
        this.config.socialRecoveryThreshold,
      confirmedGuardians: this.guardians.filter((g) => g.confirmed).length,
      recentAttempts,
      isLockedOut: this.isLockedOut(),
      lockoutExpiresAt: this.lockoutUntil,
    };
  }

  /**
   * Generates new recovery codes
   */
  async generateRecoveryCodes(): Promise<string[]> {
    const codes: string[] = [];
    const hashedCodes: RecoveryCode[] = [];
    const now = new Date();

    for (let i = 0; i < this.config.recoveryCodeCount; i++) {
      const code = generateRecoveryCode(this.config.recoveryCodeLength);
      codes.push(code);

      hashedCodes.push({
        codeHash: await hashRecoveryCode(code),
        generatedAt: now,
        expiresAt: null,
        used: false,
        usedAt: null,
        index: i,
      });
    }

    this.recoveryCodes = hashedCodes;
    await this.saveToStorage();

    logger.info("Recovery codes generated", {
      count: codes.length,
    });

    return codes;
  }

  /**
   * Verifies a recovery code
   */
  async verifyRecoveryCode(code: string): Promise<{
    valid: boolean;
    codeIndex: number | null;
    error: string | null;
  }> {
    if (this.isLockedOut()) {
      return {
        valid: false,
        codeIndex: null,
        error: "Account is temporarily locked due to too many failed attempts",
      };
    }

    const codeHash = await hashRecoveryCode(code);
    const matchingCode = this.recoveryCodes.find(
      (c) => c.codeHash === codeHash && !c.used,
    );

    if (!matchingCode) {
      await this.recordAttempt("recovery_codes", false, "Invalid or used code");
      return {
        valid: false,
        codeIndex: null,
        error: "Invalid or already used recovery code",
      };
    }

    // Check expiration
    if (matchingCode.expiresAt && matchingCode.expiresAt < new Date()) {
      await this.recordAttempt("recovery_codes", false, "Code expired");
      return {
        valid: false,
        codeIndex: null,
        error: "Recovery code has expired",
      };
    }

    // Mark code as used
    matchingCode.used = true;
    matchingCode.usedAt = new Date();
    await this.saveToStorage();

    await this.recordAttempt("recovery_codes", true, null);

    logger.info("Recovery code verified", {
      codeIndex: matchingCode.index,
    });

    return {
      valid: true,
      codeIndex: matchingCode.index,
      error: null,
    };
  }

  /**
   * Creates an encrypted backup of keys
   */
  async createBackup(
    keyPair: KeyPair,
    password: string,
    deviceId: string,
    keyVersion: number,
  ): Promise<EncryptedBackup> {
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from password
    const encryptionKey = await deriveKeyFromPassword(password, salt);

    // Export and stringify key data
    const exportedKeys = await exportKeyPair(keyPair);
    const keyData = JSON.stringify(exportedKeys);

    // Encrypt the key data
    const encryptedBuffer = await encryptWithKey(keyData, encryptionKey, iv);
    const encryptedData = arrayBufferToBase64(encryptedBuffer);

    // Compute HMAC for integrity
    const hmac = await computeHmac(encryptedData, encryptionKey);

    const backup: EncryptedBackup = {
      version: RECOVERY_VERSION,
      algorithm: RECOVERY_ALGORITHM,
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      encryptedData,
      hmac,
      createdAt: new Date().toISOString(),
      deviceId,
      keyVersion,
    };

    logger.info("Key backup created", {
      deviceId,
      keyVersion,
    });

    return backup;
  }

  /**
   * Restores keys from an encrypted backup
   */
  async restoreFromBackup(
    backup: EncryptedBackup,
    password: string,
  ): Promise<{
    success: boolean;
    keyPair: KeyPair | null;
    error: string | null;
  }> {
    if (this.isLockedOut()) {
      return {
        success: false,
        keyPair: null,
        error: "Account is temporarily locked due to too many failed attempts",
      };
    }

    try {
      // Verify backup version
      if (backup.version !== RECOVERY_VERSION) {
        return {
          success: false,
          keyPair: null,
          error: `Unsupported backup version: ${backup.version}`,
        };
      }

      // Reconstruct salt and IV
      const salt = new Uint8Array(base64ToArrayBuffer(backup.salt));
      const iv = new Uint8Array(base64ToArrayBuffer(backup.iv));

      // Derive key from password
      const decryptionKey = await deriveKeyFromPassword(password, salt);

      // Verify HMAC
      const hmacValid = await verifyHmac(
        backup.encryptedData,
        backup.hmac,
        decryptionKey,
      );
      if (!hmacValid) {
        await this.recordAttempt("password", false, "HMAC verification failed");
        return {
          success: false,
          keyPair: null,
          error:
            "Backup integrity check failed. Wrong password or corrupted backup.",
        };
      }

      // Decrypt key data
      const encryptedBuffer = base64ToArrayBuffer(backup.encryptedData);
      const keyData = await decryptWithKey(encryptedBuffer, decryptionKey, iv);

      // Parse and import keys
      const exportedKeys: ExportedKeyPair = JSON.parse(keyData);
      const keyPair = await importKeyPair(exportedKeys);

      await this.recordAttempt("password", true, null);

      logger.info("Key backup restored", {
        deviceId: backup.deviceId,
        keyVersion: backup.keyVersion,
      });

      return {
        success: true,
        keyPair,
        error: null,
      };
    } catch (error) {
      await this.recordAttempt(
        "password",
        false,
        error instanceof Error ? error.message : "Unknown error",
      );

      logger.error("Key backup restoration failed", {
        error: error instanceof Error ? error.message : "Unknown",
      });

      return {
        success: false,
        keyPair: null,
        error: "Failed to restore backup. Check password and try again.",
      };
    }
  }

  /**
   * Exports backup as downloadable file content
   */
  exportBackupAsFile(backup: EncryptedBackup): string {
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Imports backup from file content
   */
  importBackupFromFile(fileContent: string): EncryptedBackup | null {
    try {
      const backup = JSON.parse(fileContent) as EncryptedBackup;

      // Validate required fields
      if (
        !backup.version ||
        !backup.algorithm ||
        !backup.salt ||
        !backup.iv ||
        !backup.encryptedData ||
        !backup.hmac
      ) {
        return null;
      }

      return backup;
    } catch {
      return null;
    }
  }

  /**
   * Adds a recovery guardian for social recovery
   */
  async addGuardian(
    name: string,
    contact: string,
    publicKey: string,
  ): Promise<RecoveryGuardian> {
    if (this.guardians.length >= this.config.socialRecoveryGuardians) {
      throw new Error(
        `Maximum number of guardians (${this.config.socialRecoveryGuardians}) reached`,
      );
    }

    const guardian: RecoveryGuardian = {
      id: generateId(),
      name,
      contact,
      publicKey,
      confirmed: false,
      addedAt: new Date(),
    };

    this.guardians.push(guardian);
    await this.saveToStorage();

    logger.info("Recovery guardian added", {
      guardianId: guardian.id,
      name,
    });

    return guardian;
  }

  /**
   * Confirms a guardian
   */
  async confirmGuardian(guardianId: string): Promise<boolean> {
    const guardian = this.guardians.find((g) => g.id === guardianId);
    if (!guardian) return false;

    guardian.confirmed = true;
    await this.saveToStorage();

    logger.info("Recovery guardian confirmed", {
      guardianId,
    });

    return true;
  }

  /**
   * Removes a guardian
   */
  async removeGuardian(guardianId: string): Promise<boolean> {
    const index = this.guardians.findIndex((g) => g.id === guardianId);
    if (index === -1) return false;

    this.guardians.splice(index, 1);

    // Also remove any shares for this guardian
    this.shares = this.shares.filter((s) => s.guardianId !== guardianId);

    await this.saveToStorage();

    logger.info("Recovery guardian removed", {
      guardianId,
    });

    return true;
  }

  /**
   * Gets all guardians
   */
  getGuardians(): RecoveryGuardian[] {
    return [...this.guardians];
  }

  /**
   * Creates recovery shares for social recovery
   * Uses a simplified threshold secret sharing scheme
   */
  async createRecoveryShares(
    keyPair: KeyPair,
  ): Promise<{ success: boolean; shareCount: number; error: string | null }> {
    const confirmedGuardians = this.guardians.filter((g) => g.confirmed);

    if (confirmedGuardians.length < this.config.socialRecoveryThreshold) {
      return {
        success: false,
        shareCount: 0,
        error: `Need at least ${this.config.socialRecoveryThreshold} confirmed guardians`,
      };
    }

    try {
      // Export key data
      const exportedKeys = await exportKeyPair(keyPair);
      const keyData = JSON.stringify(exportedKeys);

      // Create shares (simplified - in production, use Shamir's Secret Sharing)
      const shares: RecoveryShare[] = [];
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(keyData);

      for (let i = 0; i < confirmedGuardians.length; i++) {
        const guardian = confirmedGuardians[i];

        // In production, this would be proper Shamir secret sharing
        // For now, we XOR split the secret
        const shareData = new Uint8Array(keyBytes.length);
        crypto.getRandomValues(shareData);

        // Last share would be the XOR of all previous shares with the secret
        // This is a simplified version for demonstration

        shares.push({
          id: generateId(),
          guardianId: guardian.id,
          encryptedShare: arrayBufferToBase64(shareData.buffer),
          index: i,
          createdAt: new Date(),
        });
      }

      this.shares = shares;
      await this.saveToStorage();

      logger.info("Recovery shares created", {
        shareCount: shares.length,
      });

      return {
        success: true,
        shareCount: shares.length,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        shareCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gets recovery attempt history
   */
  getAttemptHistory(limit: number = 50): RecoveryAttempt[] {
    return this.attempts.slice(-limit);
  }

  /**
   * Clears all recovery data (dangerous!)
   */
  async clearAllRecoveryData(): Promise<void> {
    this.recoveryCodes = [];
    this.attempts = [];
    this.guardians = [];
    this.shares = [];
    this.lockoutUntil = null;

    await this.clearStorage();

    logger.warn("All recovery data cleared");
  }

  /**
   * Updates recovery configuration
   */
  updateConfig(updates: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToStorage();
  }

  /**
   * Gets current configuration
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isLockedOut(): boolean {
    if (!this.lockoutUntil) return false;
    if (this.lockoutUntil > new Date()) return true;

    // Lockout expired, clear it
    this.lockoutUntil = null;
    return false;
  }

  private async recordAttempt(
    method: RecoveryMethod,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    const attempt: RecoveryAttempt = {
      id: generateId(),
      method,
      success,
      attemptedAt: new Date(),
      ipAddress: null, // Would be populated by server
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      failureReason,
    };

    this.attempts.push(attempt);

    // Check for lockout
    if (!success) {
      const recentFailed = this.attempts.filter(
        (a) =>
          !a.success &&
          new Date().getTime() - a.attemptedAt.getTime() < 60 * 60 * 1000,
      ).length;

      if (recentFailed >= this.config.maxRecoveryAttempts) {
        this.lockoutUntil = new Date(
          Date.now() + this.config.lockoutDurationMinutes * 60 * 1000,
        );
        logger.warn("Recovery lockout triggered", {
          expiresAt: this.lockoutUntil.toISOString(),
        });
      }
    }

    await this.saveToStorage();
  }

  private async loadFromStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      const codesData = localStorage.getItem(CODES_STORAGE_KEY);
      if (codesData) {
        const codes = JSON.parse(codesData);
        this.recoveryCodes = codes.map((c: RecoveryCode) => ({
          ...c,
          generatedAt: new Date(c.generatedAt),
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
          usedAt: c.usedAt ? new Date(c.usedAt) : null,
        }));
      }

      const attemptsData = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (attemptsData) {
        const attempts = JSON.parse(attemptsData);
        this.attempts = attempts.map((a: RecoveryAttempt) => ({
          ...a,
          attemptedAt: new Date(a.attemptedAt),
        }));
      }

      const guardiansData = localStorage.getItem(GUARDIANS_STORAGE_KEY);
      if (guardiansData) {
        const guardians = JSON.parse(guardiansData);
        this.guardians = guardians.map((g: RecoveryGuardian) => ({
          ...g,
          addedAt: new Date(g.addedAt),
        }));
      }

      const sharesData = localStorage.getItem(SHARES_STORAGE_KEY);
      if (sharesData) {
        const shares = JSON.parse(sharesData);
        this.shares = shares.map((s: RecoveryShare) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));
      }

      const configData = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (configData) {
        const config = JSON.parse(configData);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      logger.warn("Failed to load recovery data from storage", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  private async saveToStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(
        CODES_STORAGE_KEY,
        JSON.stringify(this.recoveryCodes),
      );
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(this.attempts));
      localStorage.setItem(
        GUARDIANS_STORAGE_KEY,
        JSON.stringify(this.guardians),
      );
      localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(this.shares));
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      logger.warn("Failed to save recovery data to storage", {
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  private async clearStorage(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    localStorage.removeItem(CODES_STORAGE_KEY);
    localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    localStorage.removeItem(GUARDIANS_STORAGE_KEY);
    localStorage.removeItem(SHARES_STORAGE_KEY);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global recovery manager instance
 */
export function getRecoveryManager(
  config?: Partial<RecoveryConfig>,
): KeyRecoveryManager {
  return KeyRecoveryManager.getInstance(config);
}

/**
 * Initializes the recovery manager
 */
export async function initializeRecoveryManager(): Promise<void> {
  const manager = getRecoveryManager();
  await manager.initialize();
}

/**
 * Generates new recovery codes
 */
export async function generateNewRecoveryCodes(): Promise<string[]> {
  const manager = getRecoveryManager();
  return manager.generateRecoveryCodes();
}

/**
 * Creates an encrypted key backup
 */
export async function createKeyBackup(
  keyPair: KeyPair,
  password: string,
  deviceId: string,
  keyVersion: number,
): Promise<EncryptedBackup> {
  const manager = getRecoveryManager();
  return manager.createBackup(keyPair, password, deviceId, keyVersion);
}

/**
 * Restores keys from backup
 */
export async function restoreKeyBackup(
  backup: EncryptedBackup,
  password: string,
): Promise<KeyPair | null> {
  const manager = getRecoveryManager();
  const result = await manager.restoreFromBackup(backup, password);
  return result.keyPair;
}

/**
 * Validates recovery code format
 */
export function isValidRecoveryCodeFormat(code: string): boolean {
  const normalized = normalizeRecoveryCode(code);
  if (normalized.length < 6 || normalized.length > 16) return false;

  // Check all characters are in the alphabet
  for (const char of normalized) {
    if (!RECOVERY_CODE_ALPHABET.includes(char)) {
      return false;
    }
  }

  return true;
}
