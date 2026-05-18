/**
 * Windows Credential Manager Integration
 *
 * Secure storage implementation using Windows Credential Manager.
 * Supports Electron (via keytar) and Tauri (native DPAPI).
 *
 * Features:
 * - Windows Credential Manager integration
 * - DPAPI encryption
 * - Windows Hello support (fingerprint, face, PIN)
 * - TPM-backed storage on compatible hardware
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

const LOG_PREFIX = "[Windows Credential Manager]";

// ============================================================================
// Windows Hello Bridge Interface
// ============================================================================

interface WindowsHelloBridge {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<boolean>;
  getBiometricType(): Promise<"fingerprint" | "face" | "none">;
}

// ============================================================================
// Windows Credential Manager Storage Implementation
// ============================================================================

/**
 * Windows Credential Manager secure storage implementation
 */
export class WindowsCredentialManagerStorage implements ISecureStorage {
  readonly os = "windows" as const;
  private initialized = false;
  private credentialBridge: DesktopKeychainBridge | null = null;
  private helloBridge: WindowsHelloBridge | null = null;
  private hasWindowsHello = false;
  private biometricType: BiometricAuthType = "none";
  private hasTpm = false;
  private defaultService: string;
  private metadataCache = new Map<string, SecureStorageItemMeta>();
  private platform: "electron" | "tauri" | null = null;

  constructor(service: string = DEFAULT_SERVICE) {
    this.defaultService = service;
  }

  /**
   * Initialize the Windows Credential Manager storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const { credentialBridge, helloBridge, platform } =
        await this.loadNativeBridges();
      this.credentialBridge = credentialBridge;
      this.helloBridge = helloBridge;
      this.platform = platform;

      if (!this.credentialBridge) {
        throw new SecureStorageError(
          "Windows Credential Manager native bridge not available",
          "NOT_AVAILABLE",
        );
      }

      const isAvailable = await this.credentialBridge.isAvailable();
      if (!isAvailable) {
        throw new SecureStorageError(
          "Windows Credential Manager is not available on this system",
          "NOT_AVAILABLE",
        );
      }

      // Check Windows Hello availability
      if (this.helloBridge) {
        this.hasWindowsHello = await this.helloBridge.isAvailable();
        if (this.hasWindowsHello) {
          const bioType = await this.helloBridge.getBiometricType();
          this.biometricType = bioType;
        }
      }

      // Check TPM availability
      this.hasTpm = await this.checkTpmAvailability();

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`, {
        platform: this.platform,
        hasWindowsHello: this.hasWindowsHello,
        biometricType: this.biometricType,
        hasTpm: this.hasTpm,
      });
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      throw new SecureStorageError(
        `Failed to initialize Windows Credential Manager: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    const biometricTypes: BiometricAuthType[] = [];
    if (this.biometricType !== "none") {
      biometricTypes.push(this.biometricType);
    }

    return {
      hardwareStorage: this.hasTpm, // TPM provides hardware-backed storage
      biometricAuth: this.hasWindowsHello,
      biometricTypes,
      secureEnclave: this.hasTpm, // TPM is Windows' equivalent
      syncSupported: false, // No built-in sync like iCloud
      maxItemSize: MAX_ITEM_SIZE,
      accessGroupsSupported: false,
      os: "windows",
      securityLevel: this.hasTpm ? "hardware" : "system",
    };
  }

  /**
   * Store a secret value in the Credential Manager
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

      const success = await this.credentialBridge!.setPassword(
        service,
        account,
        value,
      );

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Failed to store item in Credential Manager",
          errorCode: "PLATFORM_ERROR",
        };
      }

      // Store metadata
      const now = new Date();
      const meta: SecureStorageItemMeta = {
        createdAt: now,
        modifiedAt: now,
        securityLevel: this.hasTpm ? "hardware" : "system",
        biometricProtected: options.requireBiometric ?? false,
        synchronizable: false,
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
   * Retrieve a secret value from the Credential Manager
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
            error: "Windows Hello authentication required",
            errorCode: "BIOMETRIC_FAILED",
          };
        }
      }

      const value = await this.credentialBridge!.getPassword(service, account);

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
   * Check if an item exists in the Credential Manager
   */
  async hasItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;
      const value = await this.credentialBridge!.getPassword(service, account);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Remove an item from the Credential Manager
   */
  async removeItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const service = options.service ?? this.defaultService;
      const account = STORAGE_KEY_PREFIX + key;

      const success = await this.credentialBridge!.deletePassword(
        service,
        account,
      );

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
   * Get all keys stored in the Credential Manager for the service
   */
  async getAllKeys(options: SecureStorageGetOptions = {}): Promise<string[]> {
    this.ensureInitialized();

    try {
      const service = options.service ?? this.defaultService;
      const credentials = await this.credentialBridge!.findCredentials(service);

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
   * Clear all items from the Credential Manager for the service
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
      const metaString = await this.credentialBridge!.getPassword(
        service,
        account,
      );

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
   * Check if biometric authentication is available (Windows Hello)
   */
  async isBiometricAvailable(): Promise<boolean> {
    this.ensureInitialized();
    return this.hasWindowsHello;
  }

  /**
   * Authenticate using Windows Hello
   */
  async authenticateBiometric(
    reason: string,
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    if (!this.hasWindowsHello || !this.helloBridge) {
      return {
        success: false,
        data: null,
        error: "Windows Hello not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      const success = await this.helloBridge.authenticate(reason);

      if (!success) {
        return {
          success: false,
          data: null,
          error: "Windows Hello authentication failed",
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
          error: "User cancelled Windows Hello authentication",
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
        "Windows Credential Manager storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Load native bridges for Windows
   */
  private async loadNativeBridges(): Promise<{
    credentialBridge: DesktopKeychainBridge | null;
    helloBridge: WindowsHelloBridge | null;
    platform: "electron" | "tauri" | null;
  }> {
    // Check for Electron
    const windowWithElectron = globalThis as unknown as {
      electron?: {
        keytar?: DesktopKeychainBridge;
        windowsHello?: WindowsHelloBridge;
      };
      process?: {
        platform?: string;
      };
    };

    if (windowWithElectron.electron?.keytar) {
      if (windowWithElectron.process?.platform === "win32") {
        return {
          credentialBridge: windowWithElectron.electron.keytar,
          helloBridge: windowWithElectron.electron.windowsHello ?? null,
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
        credential?: DesktopKeychainBridge;
        windowsHello?: WindowsHelloBridge;
      };
    };

    if (windowWithTauri.__TAURI__) {
      try {
        const platform = await windowWithTauri.__TAURI__?.os?.platform();
        if (platform === "windows") {
          return {
            credentialBridge: windowWithTauri.__TAURI__?.credential ?? null,
            helloBridge: windowWithTauri.__TAURI__?.windowsHello ?? null,
            platform: "tauri",
          };
        }
      } catch {
        // Platform check failed
      }
    }

    // Try to load via exposed API
    try {
      const keytar = await this.loadKeytarModule();
      if (keytar) {
        return {
          credentialBridge: keytar,
          helloBridge: null,
          platform: "electron",
        };
      }
    } catch {
      // keytar not available
    }

    return { credentialBridge: null, helloBridge: null, platform: null };
  }

  /**
   * Load keytar module for Electron
   */
  private async loadKeytarModule(): Promise<DesktopKeychainBridge | null> {
    try {
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
   * Check TPM availability
   */
  private async checkTpmAvailability(): Promise<boolean> {
    if (this.platform === "electron") {
      // Check via Electron API
      const windowWithElectron = globalThis as unknown as {
        electron?: {
          tpm?: {
            isAvailable: () => Promise<boolean>;
          };
        };
      };

      try {
        return (
          (await windowWithElectron.electron?.tpm?.isAvailable?.()) ?? false
        );
      } catch {
        return false;
      }
    }

    if (this.platform === "tauri") {
      // Check via Tauri API
      const windowWithTauri = globalThis as unknown as {
        __TAURI__?: {
          tpm?: {
            isAvailable: () => Promise<boolean>;
          };
        };
      };

      try {
        return (await windowWithTauri.__TAURI__?.tpm?.isAvailable?.()) ?? false;
      } catch {
        return false;
      }
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
    await this.credentialBridge!.setPassword(
      service,
      account,
      JSON.stringify(meta),
    );
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
    await this.credentialBridge!.deletePassword(service, account);
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
 * Creates a Windows Credential Manager storage instance
 */
export function createWindowsCredentialManagerStorage(
  service?: string,
): WindowsCredentialManagerStorage {
  return new WindowsCredentialManagerStorage(service);
}

/**
 * Checks if Windows Credential Manager is available on the current platform
 */
export function isWindowsCredentialManagerAvailable(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  // Check for Electron on Windows
  const windowWithElectron = globalThis as unknown as {
    electron?: unknown;
    process?: { platform?: string };
  };

  if (
    windowWithElectron.electron &&
    windowWithElectron.process?.platform === "win32"
  ) {
    return true;
  }

  // Check for Tauri on Windows
  const windowWithTauri = globalThis as unknown as {
    __TAURI__?: unknown;
  };

  if (windowWithTauri.__TAURI__) {
    return true; // Assume available, actual check happens in initialize()
  }

  return false;
}
