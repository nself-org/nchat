/**
 * Android Keystore Integration
 *
 * Secure storage implementation using Android Keystore system via Capacitor.
 * Provides hardware-backed security using StrongBox (when available) or TEE.
 *
 * Features:
 * - Hardware-backed key storage (StrongBox/TEE)
 * - Fingerprint, Face, and Iris biometric authentication
 * - User authentication requirements
 * - Key invalidation on biometric changes
 */

import { logger } from "@/lib/logger";
import {
  type ISecureStorage,
  type SecureStorageCapabilities,
  type SecureStorageResult,
  type SecureStorageSetOptions,
  type SecureStorageGetOptions,
  type SecureStorageItemMeta,
  type AndroidKeystoreBridge,
  type AndroidKeystoreOptions,
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

const LOG_PREFIX = "[Android Keystore]";

// ============================================================================
// Android Keystore Storage Implementation
// ============================================================================

/**
 * Android Keystore secure storage implementation
 */
export class AndroidKeystoreStorage implements ISecureStorage {
  readonly os = "android" as const;
  private initialized = false;
  private bridge: AndroidKeystoreBridge | null = null;
  private biometricType: BiometricAuthType = "none";
  private strongBoxAvailable = false;
  private defaultService: string;
  private metadataCache = new Map<string, SecureStorageItemMeta>();

  constructor(service: string = DEFAULT_SERVICE) {
    this.defaultService = service;
  }

  /**
   * Initialize the Android Keystore storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.bridge = await this.loadNativeBridge();

      if (!this.bridge) {
        throw new SecureStorageError(
          "Android Keystore native bridge not available",
          "NOT_AVAILABLE",
        );
      }

      const isAvailable = await this.bridge.isAvailable();
      if (!isAvailable) {
        throw new SecureStorageError(
          "Android Keystore is not available on this device",
          "NOT_AVAILABLE",
        );
      }

      // Check biometric type
      const bioType = await this.bridge.getBiometricType();
      this.biometricType = bioType;

      // Check StrongBox availability
      this.strongBoxAvailable = await this.bridge.isStrongBoxAvailable();

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`, {
        biometricType: this.biometricType,
        strongBoxAvailable: this.strongBoxAvailable,
      });
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      throw new SecureStorageError(
        `Failed to initialize Android Keystore: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      hardwareStorage: true, // Android Keystore uses TEE/StrongBox
      biometricAuth: this.biometricType !== "none",
      biometricTypes: this.biometricType !== "none" ? [this.biometricType] : [],
      secureEnclave: this.strongBoxAvailable, // StrongBox is Android's equivalent
      syncSupported: false, // Android doesn't have built-in sync like iCloud
      maxItemSize: MAX_ITEM_SIZE,
      accessGroupsSupported: false, // Not available on Android
      os: "android",
      securityLevel: this.strongBoxAvailable ? "hardware" : "system",
    };
  }

  /**
   * Store a secret value in the Keystore
   */
  async setItem(
    key: string,
    value: string,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key);
      const keystoreOptions = this.buildKeystoreOptions(options);

      const success = await this.bridge!.setItem(
        fullKey,
        value,
        keystoreOptions,
      );

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Failed to store item in Android Keystore",
          errorCode: "PLATFORM_ERROR",
        };
      }

      // Store metadata
      const now = new Date();
      const meta: SecureStorageItemMeta = {
        createdAt: now,
        modifiedAt: now,
        securityLevel: this.strongBoxAvailable ? "hardware" : "system",
        biometricProtected: options.requireBiometric ?? false,
        synchronizable: false,
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
   * Retrieve a secret value from the Keystore
   */
  async getItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<string>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key);
      const keystoreOptions = this.buildKeystoreOptionsForGet(options);

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

      const value = await this.bridge!.getItem(fullKey, keystoreOptions);

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
   * Check if an item exists in the Keystore
   */
  async hasItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key);
      const keystoreOptions = this.buildKeystoreOptionsForGet(options);
      const value = await this.bridge!.getItem(fullKey, keystoreOptions);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Remove an item from the Keystore
   */
  async removeItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key);
      const keystoreOptions = this.buildKeystoreOptionsForGet(options);

      const success = await this.bridge!.removeItem(fullKey, keystoreOptions);

      if (!success) {
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
   * Get all keys stored in the Keystore
   */
  async getAllKeys(_options: SecureStorageGetOptions = {}): Promise<string[]> {
    this.ensureInitialized();

    try {
      const allKeys = await this.bridge!.getAllKeys();

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
   * Clear all items from the Keystore
   */
  async clear(
    _options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const success = await this.bridge!.clear();

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Failed to clear Keystore items",
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
      const metaKey = this.buildFullKey(key + METADATA_SUFFIX);
      const metaString = await this.bridge!.getItem(metaKey, {});

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
        "Android Keystore storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Build the full key with prefix and service
   */
  private buildFullKey(key: string): string {
    return `${STORAGE_KEY_PREFIX}${this.defaultService}_${key}`;
  }

  /**
   * Load the native bridge for Android Keystore
   */
  private async loadNativeBridge(): Promise<AndroidKeystoreBridge | null> {
    try {
      // Check for Capacitor
      const windowWithCapacitor = globalThis as unknown as {
        Capacitor?: {
          platform?: string;
          Plugins?: {
            SecureStoragePlugin?: AndroidKeystoreBridge;
          };
        };
      };

      if (windowWithCapacitor.Capacitor?.platform !== "android") {
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
        return mod.SecureStoragePlugin as AndroidKeystoreBridge;
      } catch {
        // Plugin not installed
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build Keystore options for set operations
   */
  private buildKeystoreOptions(
    options: SecureStorageSetOptions,
  ): AndroidKeystoreOptions {
    return {
      requireBiometric: options.requireBiometric ?? false,
      invalidateOnBiometricChange: true, // Security best practice
      userAuthenticationRequired: options.requireBiometric ?? false,
      useStrongBox: this.strongBoxAvailable,
    };
  }

  /**
   * Build Keystore options for get operations
   */
  private buildKeystoreOptionsForGet(
    _options: SecureStorageGetOptions,
  ): AndroidKeystoreOptions {
    return {};
  }

  /**
   * Store metadata for an item
   */
  private async storeMetadata(
    key: string,
    meta: SecureStorageItemMeta,
  ): Promise<void> {
    const metaKey = this.buildFullKey(key + METADATA_SUFFIX);
    await this.bridge!.setItem(metaKey, JSON.stringify(meta), {});
  }

  /**
   * Remove metadata for an item
   */
  private async removeMetadata(key: string): Promise<void> {
    const metaKey = this.buildFullKey(key + METADATA_SUFFIX);
    await this.bridge!.removeItem(metaKey, {});
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
 * Creates an Android Keystore storage instance
 */
export function createAndroidKeystoreStorage(
  service?: string,
): AndroidKeystoreStorage {
  return new AndroidKeystoreStorage(service);
}

/**
 * Checks if Android Keystore is available on the current platform
 */
export function isAndroidKeystoreAvailable(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  const windowWithCapacitor = globalThis as unknown as {
    Capacitor?: { platform?: string };
  };

  return windowWithCapacitor.Capacitor?.platform === "android";
}
