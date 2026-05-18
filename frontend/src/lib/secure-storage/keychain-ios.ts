/**
 * iOS Keychain Integration
 *
 * Secure storage implementation using iOS Keychain Services via Capacitor.
 * Provides hardware-backed security using the Secure Enclave when available.
 *
 * Features:
 * - Secure Enclave integration for hardware-backed keys
 * - Face ID / Touch ID biometric authentication
 * - iCloud Keychain synchronization support
 * - Access groups for app group sharing
 * - Access control policies (whenUnlocked, afterFirstUnlock, etc.)
 */

import { logger } from "@/lib/logger";
import {
  type ISecureStorage,
  type SecureStorageCapabilities,
  type SecureStorageResult,
  type SecureStorageSetOptions,
  type SecureStorageGetOptions,
  type SecureStorageItemMeta,
  type iOSKeychainBridge,
  type iOSKeychainOptions,
  type AccessControlPolicy,
  type BiometricAuthType,
  SecureStorageError,
  DEFAULT_SERVICE,
  MAX_ITEM_SIZE,
  STORAGE_KEY_PREFIX,
  METADATA_SUFFIX,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const LOG_PREFIX = "[iOS Keychain]";

/**
 * Maps our access control policy to iOS kSecAttrAccessible constants
 */
const ACCESS_CONTROL_MAP: Record<AccessControlPolicy, string> = {
  whenUnlocked: "kSecAttrAccessibleWhenUnlocked",
  afterFirstUnlock: "kSecAttrAccessibleAfterFirstUnlock",
  always: "kSecAttrAccessibleAlways",
  whenPasscodeSetThisDeviceOnly:
    "kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly",
  whenUnlockedThisDeviceOnly: "kSecAttrAccessibleWhenUnlockedThisDeviceOnly",
};

// ============================================================================
// iOS Keychain Storage Implementation
// ============================================================================

/**
 * iOS Keychain secure storage implementation
 */
export class iOSKeychainStorage implements ISecureStorage {
  readonly os = "ios" as const;
  private initialized = false;
  private bridge: iOSKeychainBridge | null = null;
  private biometricType: BiometricAuthType = "none";
  private defaultService: string;
  private metadataCache = new Map<string, SecureStorageItemMeta>();

  constructor(service: string = DEFAULT_SERVICE) {
    this.defaultService = service;
  }

  /**
   * Initialize the iOS Keychain storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.bridge = await this.loadNativeBridge();

      if (!this.bridge) {
        throw new SecureStorageError(
          "iOS Keychain native bridge not available",
          "NOT_AVAILABLE",
        );
      }

      const isAvailable = await this.bridge.isAvailable();
      if (!isAvailable) {
        throw new SecureStorageError(
          "iOS Keychain is not available on this device",
          "NOT_AVAILABLE",
        );
      }

      // Get biometric type
      const bioType = await this.bridge.getBiometricType();
      this.biometricType = bioType;

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`, {
        biometricType: this.biometricType,
      });
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      throw new SecureStorageError(
        `Failed to initialize iOS Keychain: ${error instanceof Error ? error.message : "Unknown error"}`,
        "PLATFORM_ERROR",
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
    return {
      hardwareStorage: true, // iOS Keychain uses Secure Enclave when available
      biometricAuth: this.biometricType !== "none",
      biometricTypes: this.biometricType !== "none" ? [this.biometricType] : [],
      secureEnclave: true, // Modern iOS devices have Secure Enclave
      syncSupported: true, // iCloud Keychain
      maxItemSize: MAX_ITEM_SIZE,
      accessGroupsSupported: true,
      os: "ios",
      securityLevel: "hardware",
    };
  }

  /**
   * Store a secret value in the Keychain
   */
  async setItem(
    key: string,
    value: string,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const keychainOptions = this.buildKeychainOptions(options);

      // Store the value
      const success = await this.bridge!.setItem(
        fullKey,
        value,
        keychainOptions,
      );

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Failed to store item in Keychain",
          errorCode: "PLATFORM_ERROR",
        };
      }

      // Store metadata
      const now = new Date();
      const meta: SecureStorageItemMeta = {
        createdAt: now,
        modifiedAt: now,
        securityLevel: "hardware",
        biometricProtected: options.requireBiometric ?? false,
        synchronizable: options.synchronizable ?? false,
        accessControl: options.accessControl ?? "whenUnlocked",
        service: options.service ?? this.defaultService,
        account: options.account ?? key,
      };

      await this.storeMetadata(key, meta);
      this.metadataCache.set(key, meta);

      logger.info(`${LOG_PREFIX} Stored item: ${key}`);

      return {
        success: true,
        data: null,
        error: null,
        meta,
      };
    } catch (error) {
      return this.handleError(error, "setItem");
    }
  }

  /**
   * Retrieve a secret value from the Keychain
   */
  async getItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<string>> {
    this.ensureInitialized();

    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const keychainOptions = this.buildKeychainOptionsForGet(options);

      // Check if biometric is required
      const meta =
        this.metadataCache.get(key) || (await this.getItemMeta(key, options));
      if (meta?.biometricProtected && options.biometricPrompt) {
        const authResult = await this.authenticateBiometric(
          options.biometricPrompt,
        );
        if (!authResult.success) {
          return {
            success: false,
            data: null,
            error: "Biometric authentication required",
            errorCode: "BIOMETRIC_FAILED",
          };
        }
      }

      const value = await this.bridge!.getItem(fullKey, keychainOptions);

      if (value === null) {
        return {
          success: true,
          data: null,
          error: null,
        };
      }

      return {
        success: true,
        data: value,
        error: null,
        meta: meta ?? undefined,
      };
    } catch (error) {
      return this.handleError(error, "getItem");
    }
  }

  /**
   * Check if an item exists in the Keychain
   */
  async hasItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const keychainOptions = this.buildKeychainOptionsForGet(options);
      const value = await this.bridge!.getItem(fullKey, keychainOptions);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Remove an item from the Keychain
   */
  async removeItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = STORAGE_KEY_PREFIX + key;
      const keychainOptions = this.buildKeychainOptionsForGet(options);

      const success = await this.bridge!.removeItem(fullKey, keychainOptions);

      if (!success) {
        // Item might not exist, which is fine
        logger.info(`${LOG_PREFIX} Item not found for removal: ${key}`);
      }

      // Remove metadata
      await this.removeMetadata(key);
      this.metadataCache.delete(key);

      logger.info(`${LOG_PREFIX} Removed item: ${key}`);

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (error) {
      return this.handleError(error, "removeItem");
    }
  }

  /**
   * Get all keys stored in the Keychain
   */
  async getAllKeys(options: SecureStorageGetOptions = {}): Promise<string[]> {
    this.ensureInitialized();

    try {
      const keychainOptions = this.buildKeychainOptionsForGet(options);
      const allKeys = await this.bridge!.getAllKeys(keychainOptions);

      return allKeys
        .filter(
          (k) =>
            k.startsWith(STORAGE_KEY_PREFIX) && !k.endsWith(METADATA_SUFFIX),
        )
        .map((k) => k.slice(STORAGE_KEY_PREFIX.length));
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get all keys`, error);
      return [];
    }
  }

  /**
   * Clear all items from the Keychain
   */
  async clear(
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const keychainOptions = this.buildKeychainOptionsForGet(options);
      const success = await this.bridge!.clear(keychainOptions);

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Failed to clear Keychain items",
          errorCode: "PLATFORM_ERROR",
        };
      }

      this.metadataCache.clear();

      logger.info(`${LOG_PREFIX} Cleared all items`);

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (error) {
      return this.handleError(error, "clear");
    }
  }

  /**
   * Get metadata for a stored item
   */
  async getItemMeta(
    key: string,
    _options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageItemMeta | null> {
    // Check cache first
    const cached = this.metadataCache.get(key);
    if (cached) {
      return cached;
    }

    try {
      const metaKey = key + METADATA_SUFFIX;
      const fullKey = STORAGE_KEY_PREFIX + metaKey;
      const keychainOptions: iOSKeychainOptions = {
        service: this.defaultService,
      };

      const metaString = await this.bridge!.getItem(fullKey, keychainOptions);
      if (!metaString) {
        return null;
      }

      const meta = JSON.parse(metaString) as SecureStorageItemMeta;
      meta.createdAt = new Date(meta.createdAt);
      meta.modifiedAt = new Date(meta.modifiedAt);

      this.metadataCache.set(key, meta);
      return meta;
    } catch {
      return null;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    this.ensureInitialized();
    return this.biometricType !== "none";
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateBiometric(
    reason: string,
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    if (this.biometricType === "none") {
      return {
        success: false,
        data: null,
        error: "Biometric authentication not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      const success = await this.bridge!.authenticateBiometric(reason);

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Biometric authentication failed",
          errorCode: "BIOMETRIC_FAILED",
        };
      }

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("cancel")) {
        return {
          success: false,
          data: null,
          error: "User cancelled biometric authentication",
          errorCode: "BIOMETRIC_CANCELLED",
        };
      }

      return this.handleError(error, "authenticateBiometric");
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure the storage is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new SecureStorageError(
        "iOS Keychain storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Load the native bridge for iOS Keychain
   */
  private async loadNativeBridge(): Promise<iOSKeychainBridge | null> {
    try {
      // Check for Capacitor
      const windowWithCapacitor = globalThis as unknown as {
        Capacitor?: {
          platform?: string;
          Plugins?: {
            SecureStoragePlugin?: iOSKeychainBridge;
          };
        };
      };

      if (windowWithCapacitor.Capacitor?.platform !== "ios") {
        return null;
      }

      // Try to load the Capacitor secure storage plugin
      const plugin =
        windowWithCapacitor.Capacitor?.Plugins?.SecureStoragePlugin;
      if (plugin) {
        return plugin;
      }

      // Attempt dynamic import of the Capacitor plugin
      try {
        const mod = await import(
          /* webpackIgnore: true */ "@capacitor-community/secure-storage-plugin"
        );
        return mod.SecureStoragePlugin as iOSKeychainBridge;
      } catch {
        // Plugin not installed
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build Keychain options for set operations
   */
  private buildKeychainOptions(
    options: SecureStorageSetOptions,
  ): iOSKeychainOptions {
    return {
      service: options.service ?? this.defaultService,
      accessControl: options.accessControl
        ? ACCESS_CONTROL_MAP[options.accessControl]
        : ACCESS_CONTROL_MAP.whenUnlocked,
      accessGroup: options.accessGroup,
      synchronizable: options.synchronizable ?? false,
      requireBiometric: options.requireBiometric ?? false,
    };
  }

  /**
   * Build Keychain options for get operations
   */
  private buildKeychainOptionsForGet(
    options: SecureStorageGetOptions,
  ): iOSKeychainOptions {
    return {
      service: options.service ?? this.defaultService,
    };
  }

  /**
   * Store metadata for an item
   */
  private async storeMetadata(
    key: string,
    meta: SecureStorageItemMeta,
  ): Promise<void> {
    const metaKey = key + METADATA_SUFFIX;
    const fullKey = STORAGE_KEY_PREFIX + metaKey;
    const keychainOptions: iOSKeychainOptions = {
      service: this.defaultService,
      synchronizable: false, // Don't sync metadata
    };

    await this.bridge!.setItem(fullKey, JSON.stringify(meta), keychainOptions);
  }

  /**
   * Remove metadata for an item
   */
  private async removeMetadata(key: string): Promise<void> {
    const metaKey = key + METADATA_SUFFIX;
    const fullKey = STORAGE_KEY_PREFIX + metaKey;
    const keychainOptions: iOSKeychainOptions = {
      service: this.defaultService,
    };

    await this.bridge!.removeItem(fullKey, keychainOptions);
  }

  /**
   * Handle errors and convert to result
   */
  private handleError<T>(
    error: unknown,
    operation: string,
  ): SecureStorageResult<T> {
    const message = error instanceof Error ? error.message : "Unknown error";
    const code =
      error instanceof SecureStorageError ? error.code : "PLATFORM_ERROR";

    logger.error(`${LOG_PREFIX} ${operation} failed: ${message}`, error);

    return {
      success: false,
      data: null,
      error: message,
      errorCode: code,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an iOS Keychain storage instance
 */
export function createiOSKeychainStorage(service?: string): iOSKeychainStorage {
  return new iOSKeychainStorage(service);
}

/**
 * Checks if iOS Keychain is available on the current platform
 */
export function isiOSKeychainAvailable(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  const windowWithCapacitor = globalThis as unknown as {
    Capacitor?: { platform?: string };
  };

  return windowWithCapacitor.Capacitor?.platform === "ios";
}
