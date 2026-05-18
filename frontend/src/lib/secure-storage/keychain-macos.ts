/**
 * macOS Keychain Integration
 *
 * Secure storage implementation using macOS Keychain Services.
 * Supports both Electron (via keytar) and Tauri (native keychain API).
 *
 * Features:
 * - System keychain integration
 * - Touch ID support (on supported Macs)
 * - Keychain access groups
 * - iCloud Keychain synchronization
 */

import { logger } from "@/lib/logger";
import {
  type ISecureStorage,
  type SecureStorageCapabilities,
  type SecureStorageResult,
  type SecureStorageSetOptions,
  type SecureStorageGetOptions,
  type SecureStorageItemMeta,
  type DesktopKeychainBridge,
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

const LOG_PREFIX = "[macOS Keychain]";

// ============================================================================
// macOS Keychain Storage Implementation
// ============================================================================

/**
 * macOS Keychain secure storage implementation
 */
export class macOSKeychainStorage implements ISecureStorage {
  readonly os = "macos" as const;
  private initialized = false;
  private bridge: DesktopKeychainBridge | null = null;
  private hasTouchId = false;
  private defaultService: string;
  private metadataCache = new Map<string, SecureStorageItemMeta>();
  private platform: "electron" | "tauri" | null = null;

  constructor(service: string = DEFAULT_SERVICE) {
    this.defaultService = service;
  }

  /**
   * Initialize the macOS Keychain storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const { bridge, platform } = await this.loadNativeBridge();
      this.bridge = bridge;
      this.platform = platform;

      if (!this.bridge) {
        throw new SecureStorageError(
          "macOS Keychain native bridge not available",
          "NOT_AVAILABLE",
        );
      }

      const isAvailable = await this.bridge.isAvailable();
      if (!isAvailable) {
        throw new SecureStorageError(
          "macOS Keychain is not available on this system",
          "NOT_AVAILABLE",
        );
      }

      // Check for Touch ID availability
      this.hasTouchId = await this.checkTouchIdAvailability();

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`, {
        platform: this.platform,
        hasTouchId: this.hasTouchId,
      });
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      throw new SecureStorageError(
        `Failed to initialize macOS Keychain: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    const biometricTypes: BiometricAuthType[] = this.hasTouchId
      ? ["touchId"]
      : [];

    return {
      hardwareStorage: true, // macOS uses Secure Enclave on Apple Silicon
      biometricAuth: this.hasTouchId,
      biometricTypes,
      secureEnclave: await this.checkSecureEnclaveAvailability(),
      syncSupported: true, // iCloud Keychain
      maxItemSize: MAX_ITEM_SIZE,
      accessGroupsSupported: true,
      os: "macos",
      securityLevel: "system",
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
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;

      const success = await this.bridge!.setPassword(service, account, value);

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
        securityLevel: "system",
        biometricProtected: options.requireBiometric ?? false,
        synchronizable: options.synchronizable ?? false,
        accessControl: options.accessControl ?? "whenUnlocked",
        service,
        account,
      };

      await this.storeMetadata(key, meta, options);
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
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;

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

      const value = await this.bridge!.getPassword(service, account);

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
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;
      const value = await this.bridge!.getPassword(service, account);
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
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;

      const success = await this.bridge!.deletePassword(service, account);

      if (!success) {
        logger.info(`${LOG_PREFIX} Item not found for removal: ${key}`);
      }

      // Remove metadata
      await this.removeMetadata(key, options);
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
   * Get all keys stored in the Keychain for the service
   */
  async getAllKeys(options: SecureStorageGetOptions = {}): Promise<string[]> {
    this.ensureInitialized();

    try {
      const service = options.service ?? this.defaultService;
      const credentials = await this.bridge!.findCredentials(service);

      return credentials
        .map((c) => c.account)
        .filter(
          (a) =>
            a.startsWith(STORAGE_KEY_PREFIX) && !a.endsWith(METADATA_SUFFIX),
        )
        .map((a) => a.slice(STORAGE_KEY_PREFIX.length));
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get all keys`, error);
      return [];
    }
  }

  /**
   * Clear all items from the Keychain for the service
   */
  async clear(
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const keys = await this.getAllKeys(options);

      for (const key of keys) {
        await this.removeItem(key, options);
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
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageItemMeta | null> {
    // Check cache first
    const cached = this.metadataCache.get(key);
    if (cached) {
      return cached;
    }

    try {
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key + METADATA_SUFFIX;
      const metaString = await this.bridge!.getPassword(service, account);

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
    return this.hasTouchId;
  }

  /**
   * Authenticate using Touch ID
   */
  async authenticateBiometric(
    reason: string,
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    if (!this.hasTouchId) {
      return {
        success: false,
        data: null,
        error: "Touch ID not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      // For Electron, use @aspect-build/electron-touch-id or similar
      // For Tauri, use the native Touch ID API
      const success = await this.performTouchIdAuthentication(reason);

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Touch ID authentication failed",
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
          error: "User cancelled Touch ID authentication",
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
        "macOS Keychain storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Load the native bridge for macOS Keychain
   */
  private async loadNativeBridge(): Promise<{
    bridge: DesktopKeychainBridge | null;
    platform: "electron" | "tauri" | null;
  }> {
    // Check for Electron
    const windowWithElectron = globalThis as unknown as {
      electron?: {
        keytar?: DesktopKeychainBridge;
      };
      process?: {
        platform?: string;
      };
    };

    if (windowWithElectron.electron?.keytar) {
      if (windowWithElectron.process?.platform === "darwin") {
        return {
          bridge: windowWithElectron.electron.keytar,
          platform: "electron",
        };
      }
    }

    // Check for Tauri
    const windowWithTauri = globalThis as unknown as {
      __TAURI__?: {
        os?: {
          platform: () => Promise<string>;
        };
        keychain?: DesktopKeychainBridge;
      };
    };

    if (windowWithTauri.__TAURI__) {
      try {
        const platform = await windowWithTauri.__TAURI__?.os?.platform();
        if (platform === "darwin" && windowWithTauri.__TAURI__?.keychain) {
          return {
            bridge: windowWithTauri.__TAURI__.keychain,
            platform: "tauri",
          };
        }
      } catch {
        // Platform check failed
      }
    }

    // Try to dynamically import keytar for Electron
    try {
      // This would be handled by Electron's preload script
      const keytar = await this.loadKeytarModule();
      if (keytar) {
        return { bridge: keytar, platform: "electron" };
      }
    } catch {
      // keytar not available
    }

    return { bridge: null, platform: null };
  }

  /**
   * Load keytar module for Electron
   */
  private async loadKeytarModule(): Promise<DesktopKeychainBridge | null> {
    try {
      // In Electron, keytar would be exposed via preload script
      const windowWithKeytar = globalThis as unknown as {
        nchatKeytar?: DesktopKeychainBridge;
      };

      if (windowWithKeytar.nchatKeytar) {
        return windowWithKeytar.nchatKeytar;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check Touch ID availability
   */
  private async checkTouchIdAvailability(): Promise<boolean> {
    if (this.platform === "electron") {
      // Check via Electron API
      const windowWithElectron = globalThis as unknown as {
        electron?: {
          systemPreferences?: {
            canPromptTouchID: () => boolean;
          };
        };
      };

      return (
        windowWithElectron.electron?.systemPreferences?.canPromptTouchID?.() ??
        false
      );
    }

    if (this.platform === "tauri") {
      // Check via Tauri API
      const windowWithTauri = globalThis as unknown as {
        __TAURI__?: {
          touchId?: {
            isAvailable: () => Promise<boolean>;
          };
        };
      };

      try {
        return (
          (await windowWithTauri.__TAURI__?.touchId?.isAvailable?.()) ?? false
        );
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Check Secure Enclave availability (Apple Silicon)
   */
  private async checkSecureEnclaveAvailability(): Promise<boolean> {
    // Secure Enclave is available on all Apple Silicon Macs
    // and Intel Macs with T2 chip
    if (this.platform === "electron") {
      const windowWithElectron = globalThis as unknown as {
        electron?: {
          process?: {
            arch?: string;
          };
        };
      };

      // arm64 = Apple Silicon
      return windowWithElectron.electron?.process?.arch === "arm64";
    }

    if (this.platform === "tauri") {
      const windowWithTauri = globalThis as unknown as {
        __TAURI__?: {
          os?: {
            arch: () => Promise<string>;
          };
        };
      };

      try {
        const arch = await windowWithTauri.__TAURI__?.os?.arch?.();
        return arch === "aarch64";
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Perform Touch ID authentication
   */
  private async performTouchIdAuthentication(reason: string): Promise<boolean> {
    if (this.platform === "electron") {
      const windowWithElectron = globalThis as unknown as {
        electron?: {
          systemPreferences?: {
            promptTouchID: (reason: string) => Promise<void>;
          };
        };
      };

      // Don't catch errors - let them propagate for cancellation detection
      await windowWithElectron.electron?.systemPreferences?.promptTouchID?.(
        reason,
      );
      return true;
    }

    if (this.platform === "tauri") {
      const windowWithTauri = globalThis as unknown as {
        __TAURI__?: {
          touchId?: {
            authenticate: (reason: string) => Promise<boolean>;
          };
        };
      };

      // Don't catch errors - let them propagate for cancellation detection
      return (
        (await windowWithTauri.__TAURI__?.touchId?.authenticate?.(reason)) ??
        false
      );
    }

    return false;
  }

  /**
   * Store metadata for an item
   */
  private async storeMetadata(
    key: string,
    meta: SecureStorageItemMeta,
    options: SecureStorageSetOptions,
  ): Promise<void> {
    const service = options.service ?? this.defaultService;
    const account = STORAGE_KEY_PREFIX + key + METADATA_SUFFIX;
    await this.bridge!.setPassword(service, account, JSON.stringify(meta));
  }

  /**
   * Remove metadata for an item
   */
  private async removeMetadata(
    key: string,
    options: SecureStorageGetOptions,
  ): Promise<void> {
    const service = options.service ?? this.defaultService;
    const account = STORAGE_KEY_PREFIX + key + METADATA_SUFFIX;
    await this.bridge!.deletePassword(service, account);
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
 * Creates a macOS Keychain storage instance
 */
export function createmacOSKeychainStorage(
  service?: string,
): macOSKeychainStorage {
  return new macOSKeychainStorage(service);
}

/**
 * Checks if macOS Keychain is available on the current platform
 */
export function ismacOSKeychainAvailable(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  // Check for Electron on macOS
  const windowWithElectron = globalThis as unknown as {
    electron?: unknown;
    process?: { platform?: string };
  };

  if (
    windowWithElectron.electron &&
    windowWithElectron.process?.platform === "darwin"
  ) {
    return true;
  }

  // Check for Tauri on macOS
  const windowWithTauri = globalThis as unknown as {
    __TAURI__?: unknown;
  };

  if (windowWithTauri.__TAURI__) {
    // Would need to check platform asynchronously
    return true; // Assume available, actual check happens in initialize()
  }

  return false;
}
