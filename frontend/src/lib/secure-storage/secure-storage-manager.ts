/**
 * Secure Storage Manager
 *
 * Unified interface for secure storage across all platforms.
 * Automatically detects the platform and uses the appropriate
 * native secure storage implementation with fallback to encrypted storage.
 *
 * Priority order:
 * 1. iOS Keychain (iOS)
 * 2. Android Keystore (Android)
 * 3. macOS Keychain (macOS via Electron/Tauri)
 * 4. Windows Credential Manager (Windows via Electron/Tauri)
 * 5. Encrypted Fallback (Web/Linux/Unknown)
 *
 * Features:
 * - Automatic platform detection
 * - Seamless fallback to encrypted storage
 * - Unified API across all platforms
 * - Biometric authentication support
 * - Secrets never persist in plaintext
 */

import { logger } from "@/lib/logger";
import {
  type ISecureStorage,
  type SecureStorageCapabilities,
  type SecureStorageResult,
  type SecureStorageSetOptions,
  type SecureStorageGetOptions,
  type SecureStorageItemMeta,
  type OperatingSystem,
  type SecureStorageManagerOptions,
  SecureStorageError,
  DEFAULT_SERVICE,
} from "./types";
import { iOSKeychainStorage, isiOSKeychainAvailable } from "./keychain-ios";
import {
  AndroidKeystoreStorage,
  isAndroidKeystoreAvailable,
} from "./keystore-android";
import {
  macOSKeychainStorage,
  ismacOSKeychainAvailable,
} from "./keychain-macos";
import {
  WindowsCredentialManagerStorage,
  isWindowsCredentialManagerAvailable,
} from "./credential-manager-windows";
import {
  EncryptedFallbackStorage,
  isEncryptedFallbackAvailable,
} from "./encrypted-fallback";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[SecureStorageManager]";

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detects the current operating system
 */
export function detectOperatingSystem(): OperatingSystem {
  if (typeof globalThis === "undefined" || typeof window === "undefined") {
    return "unknown";
  }

  // Check for Capacitor (iOS/Android)
  const windowWithCapacitor = globalThis as unknown as {
    Capacitor?: { platform?: string };
  };

  if (windowWithCapacitor.Capacitor?.platform === "ios") {
    return "ios";
  }
  if (windowWithCapacitor.Capacitor?.platform === "android") {
    return "android";
  }

  // Check for Electron
  const windowWithElectron = globalThis as unknown as {
    electron?: unknown;
    process?: { platform?: string };
  };

  if (windowWithElectron.electron && windowWithElectron.process?.platform) {
    switch (windowWithElectron.process.platform) {
      case "darwin":
        return "macos";
      case "win32":
        return "windows";
      case "linux":
        return "linux";
    }
  }

  // Check for Tauri
  const windowWithTauri = globalThis as unknown as {
    __TAURI__?: unknown;
  };

  if (windowWithTauri.__TAURI__) {
    // Would need async platform check, return unknown for sync detection
    return "unknown";
  }

  // Default to web
  return "web";
}

// ============================================================================
// Secure Storage Manager Implementation
// ============================================================================

/**
 * Secure Storage Manager - Unified interface for all platforms
 */
export class SecureStorageManager implements ISecureStorage {
  readonly os: OperatingSystem;
  private storage: ISecureStorage | null = null;
  private fallbackStorage: ISecureStorage | null = null;
  private initialized = false;
  private options: SecureStorageManagerOptions;
  private initPromise: Promise<void> | null = null;

  constructor(options: SecureStorageManagerOptions = {}) {
    this.options = {
      service: options.service ?? DEFAULT_SERVICE,
      preferHardwareStorage: options.preferHardwareStorage ?? true,
      debug: options.debug ?? false,
      fallbackStorage: options.fallbackStorage,
    };
    this.os = detectOperatingSystem();
  }

  /**
   * Initialize the storage manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  /**
   * Perform actual initialization
   */
  private async doInitialize(): Promise<void> {
    try {
      // Create platform-specific storage
      this.storage = await this.createPlatformStorage();

      if (this.storage) {
        await this.storage.initialize();
        logger.info(`${LOG_PREFIX} Using ${this.storage.os} storage`);
      }

      // Create fallback storage
      if (!this.storage || this.options.fallbackStorage) {
        this.fallbackStorage =
          this.options.fallbackStorage ??
          new EncryptedFallbackStorage(this.options.service);
        await this.fallbackStorage.initialize();

        if (!this.storage) {
          this.storage = this.fallbackStorage;
          logger.info(`${LOG_PREFIX} Using encrypted fallback storage`);
        }
      }

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`, {
        os: this.os,
        primaryStorage: this.storage?.os,
        hasFallback: this.fallbackStorage !== null,
      });
    } catch (error) {
      // If primary storage fails, try fallback
      if (!this.fallbackStorage && isEncryptedFallbackAvailable()) {
        try {
          this.fallbackStorage = new EncryptedFallbackStorage(
            this.options.service,
          );
          await this.fallbackStorage.initialize();
          this.storage = this.fallbackStorage;
          this.initialized = true;
          logger.warn(`${LOG_PREFIX} Primary storage failed, using fallback`, {
            error,
          });
          return;
        } catch {
          // Fallback also failed
        }
      }

      throw new SecureStorageError(
        `Failed to initialize secure storage: ${error instanceof Error ? error.message : "Unknown error"}`,
        "NOT_AVAILABLE",
        error,
      );
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get storage capabilities
   */
  async getCapabilities(): Promise<SecureStorageCapabilities> {
    await this.ensureInitialized();
    return this.storage!.getCapabilities();
  }

  /**
   * Store a secret value
   */
  async setItem(
    key: string,
    value: string,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const result = await this.storage!.setItem(key, value, opts);

    if (
      !result.success &&
      this.fallbackStorage &&
      this.storage !== this.fallbackStorage
    ) {
      logger.warn(
        `${LOG_PREFIX} Primary storage failed, using fallback for setItem`,
      );
      return this.fallbackStorage.setItem(key, value, opts);
    }

    return result;
  }

  /**
   * Retrieve a secret value
   */
  async getItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<string>> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const result = await this.storage!.getItem(key, opts);

    // If not found in primary and we have fallback, try fallback
    if (
      result.success &&
      result.data === null &&
      this.fallbackStorage &&
      this.storage !== this.fallbackStorage
    ) {
      const fallbackResult = await this.fallbackStorage.getItem(key, opts);
      if (fallbackResult.success && fallbackResult.data !== null) {
        return fallbackResult;
      }
    }

    if (
      !result.success &&
      this.fallbackStorage &&
      this.storage !== this.fallbackStorage
    ) {
      logger.warn(
        `${LOG_PREFIX} Primary storage failed, using fallback for getItem`,
      );
      return this.fallbackStorage.getItem(key, opts);
    }

    return result;
  }

  /**
   * Check if an item exists
   */
  async hasItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<boolean> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const exists = await this.storage!.hasItem(key, opts);

    if (
      !exists &&
      this.fallbackStorage &&
      this.storage !== this.fallbackStorage
    ) {
      return this.fallbackStorage.hasItem(key, opts);
    }

    return exists;
  }

  /**
   * Remove an item
   */
  async removeItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };

    // Remove from both storages
    const result = await this.storage!.removeItem(key, opts);

    if (this.fallbackStorage && this.storage !== this.fallbackStorage) {
      await this.fallbackStorage.removeItem(key, opts);
    }

    return result;
  }

  /**
   * Get all keys
   */
  async getAllKeys(options: SecureStorageGetOptions = {}): Promise<string[]> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const keys = new Set<string>(await this.storage!.getAllKeys(opts));

    // Merge keys from fallback if available
    if (this.fallbackStorage && this.storage !== this.fallbackStorage) {
      const fallbackKeys = await this.fallbackStorage.getAllKeys(opts);
      fallbackKeys.forEach((k) => keys.add(k));
    }

    return Array.from(keys);
  }

  /**
   * Clear all items
   */
  async clear(
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const result = await this.storage!.clear(opts);

    // Clear fallback as well
    if (this.fallbackStorage && this.storage !== this.fallbackStorage) {
      await this.fallbackStorage.clear(opts);
    }

    return result;
  }

  /**
   * Get item metadata
   */
  async getItemMeta(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageItemMeta | null> {
    await this.ensureInitialized();

    const opts = {
      ...options,
      service: options.service ?? this.options.service,
    };
    const meta = await this.storage!.getItemMeta(key, opts);

    if (
      !meta &&
      this.fallbackStorage &&
      this.storage !== this.fallbackStorage
    ) {
      return this.fallbackStorage.getItemMeta(key, opts);
    }

    return meta;
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    await this.ensureInitialized();
    return this.storage!.isBiometricAvailable();
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateBiometric(
    reason: string,
  ): Promise<SecureStorageResult<void>> {
    await this.ensureInitialized();
    return this.storage!.authenticateBiometric(reason);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Store a JSON-serializable value
   */
  async setJSON<T>(
    key: string,
    value: T,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized, options);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Failed to serialize value: ${error instanceof Error ? error.message : "Unknown error"}`,
        errorCode: "SERIALIZATION_FAILED",
      };
    }
  }

  /**
   * Retrieve and parse a JSON value
   */
  async getJSON<T>(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<T>> {
    const result = await this.getItem(key, options);

    if (!result.success) {
      return {
        success: false,
        data: null,
        error: result.error,
        errorCode: result.errorCode,
      };
    }

    if (result.data === null) {
      return {
        success: true,
        data: null,
        error: null,
      };
    }

    try {
      const parsed = JSON.parse(result.data) as T;
      return {
        success: true,
        data: parsed,
        error: null,
        meta: result.meta,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Failed to parse value: ${error instanceof Error ? error.message : "Unknown error"}`,
        errorCode: "DESERIALIZATION_FAILED",
      };
    }
  }

  /**
   * Store a cryptographic key pair
   */
  async storeKeyPair(
    keyId: string,
    keyPair: { publicKey: JsonWebKey; privateKey: JsonWebKey },
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    return this.setJSON(`keypair_${keyId}`, keyPair, {
      ...options,
      requireBiometric: options.requireBiometric ?? false,
    });
  }

  /**
   * Retrieve a cryptographic key pair
   */
  async retrieveKeyPair(
    keyId: string,
    options: SecureStorageGetOptions = {},
  ): Promise<
    SecureStorageResult<{ publicKey: JsonWebKey; privateKey: JsonWebKey }>
  > {
    return this.getJSON(`keypair_${keyId}`, options);
  }

  /**
   * Store an encryption key
   */
  async storeEncryptionKey(
    keyId: string,
    key: JsonWebKey,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    return this.setJSON(`enckey_${keyId}`, key, {
      ...options,
      requireBiometric: options.requireBiometric ?? false,
    });
  }

  /**
   * Retrieve an encryption key
   */
  async retrieveEncryptionKey(
    keyId: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<JsonWebKey>> {
    return this.getJSON(`enckey_${keyId}`, options);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure the storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create the platform-specific storage instance
   */
  private async createPlatformStorage(): Promise<ISecureStorage | null> {
    const service = this.options.service;

    // iOS
    if (isiOSKeychainAvailable()) {
      return new iOSKeychainStorage(service);
    }

    // Android
    if (isAndroidKeystoreAvailable()) {
      return new AndroidKeystoreStorage(service);
    }

    // macOS
    if (ismacOSKeychainAvailable()) {
      return new macOSKeychainStorage(service);
    }

    // Windows
    if (isWindowsCredentialManagerAvailable()) {
      return new WindowsCredentialManagerStorage(service);
    }

    // Web/Linux/Unknown - use encrypted fallback
    if (isEncryptedFallbackAvailable()) {
      return new EncryptedFallbackStorage(service);
    }

    return null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let secureStorageInstance: SecureStorageManager | null = null;

/**
 * Get the singleton SecureStorageManager instance
 */
export function getSecureStorage(
  options?: SecureStorageManagerOptions,
): SecureStorageManager {
  if (!secureStorageInstance) {
    secureStorageInstance = new SecureStorageManager(options);
  }
  return secureStorageInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSecureStorage(): void {
  secureStorageInstance = null;
}

/**
 * Initialize the secure storage singleton
 */
export async function initializeSecureStorage(
  options?: SecureStorageManagerOptions,
): Promise<SecureStorageManager> {
  const storage = getSecureStorage(options);
  await storage.initialize();
  return storage;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new SecureStorageManager instance
 */
export function createSecureStorageManager(
  options?: SecureStorageManagerOptions,
): SecureStorageManager {
  return new SecureStorageManager(options);
}
