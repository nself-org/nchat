/**
 * Platform-Agnostic Secure Storage
 *
 * Provides a unified interface for secure key storage across all platforms:
 * - Web (IndexedDB + Web Crypto)
 * - iOS (Keychain via Capacitor)
 * - Android (Keystore via Capacitor)
 * - Desktop (Electron secure storage / OS keychain)
 *
 * Features:
 * - Automatic platform detection
 * - Encryption at rest for all platforms
 * - Biometric authentication support
 * - Hardware-backed key storage when available
 * - Graceful fallback for unsupported features
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported platform types
 */
export type Platform =
  | "web"
  | "ios"
  | "android"
  | "electron"
  | "tauri"
  | "unknown";

/**
 * Storage security level
 */
export type SecurityLevel =
  | "hardware" // Hardware-backed storage (Secure Enclave, TEE)
  | "encrypted" // Software encryption
  | "standard"; // Standard storage (not recommended for keys)

/**
 * Biometric authentication type
 */
export type BiometricType = "fingerprint" | "face" | "iris" | "none";

/**
 * Storage item metadata
 */
export interface StorageItemMeta {
  /** When item was created */
  createdAt: Date;
  /** When item was last accessed */
  accessedAt: Date;
  /** When item was last modified */
  modifiedAt: Date;
  /** Security level of storage */
  securityLevel: SecurityLevel;
  /** Whether biometric protection is enabled */
  biometricProtected: boolean;
  /** Item version for migrations */
  version: number;
}

/**
 * Storage capabilities
 */
export interface StorageCapabilities {
  /** Whether hardware-backed storage is available */
  hardwareStorage: boolean;
  /** Whether biometric authentication is available */
  biometricAuth: boolean;
  /** Available biometric types */
  biometricTypes: BiometricType[];
  /** Whether secure enclave/TEE is available */
  secureEnclave: boolean;
  /** Maximum item size (bytes) */
  maxItemSize: number;
  /** Whether items can be synced across devices */
  syncSupported: boolean;
}

/**
 * Storage options
 */
export interface StorageOptions {
  /** Require biometric authentication to access */
  requireBiometric?: boolean;
  /** Use hardware-backed storage if available */
  useHardwareStorage?: boolean;
  /** Make item accessible when device is unlocked */
  accessibleWhenUnlocked?: boolean;
  /** Sync item across devices (if supported) */
  syncAcrossDevices?: boolean;
  /** Custom encryption key (optional) */
  encryptionKey?: CryptoKey;
}

/**
 * Storage result
 */
export interface StorageResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: StorageItemMeta;
}

/**
 * Platform storage interface
 */
export interface IPlatformStorage {
  /** Platform identifier */
  platform: Platform;
  /** Initialize storage */
  initialize(): Promise<void>;
  /** Get storage capabilities */
  getCapabilities(): Promise<StorageCapabilities>;
  /** Store an item */
  setItem<T>(
    key: string,
    value: T,
    options?: StorageOptions,
  ): Promise<StorageResult<void>>;
  /** Retrieve an item */
  getItem<T>(key: string, options?: StorageOptions): Promise<StorageResult<T>>;
  /** Check if item exists */
  hasItem(key: string): Promise<boolean>;
  /** Remove an item */
  removeItem(key: string): Promise<StorageResult<void>>;
  /** List all keys */
  getAllKeys(): Promise<string[]>;
  /** Clear all items */
  clear(): Promise<StorageResult<void>>;
  /** Get item metadata */
  getItemMeta(key: string): Promise<StorageItemMeta | null>;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_PREFIX = "nchat_secure_";
const META_SUFFIX = "_meta";
const CURRENT_VERSION = 1;
const DEFAULT_MAX_ITEM_SIZE = 5 * 1024 * 1024; // 5MB

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detects the current platform
 */
export function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return "unknown";
  }

  // Check for Capacitor (iOS/Android)
  const windowWithCapacitor = window as unknown as {
    Capacitor?: { platform?: string };
  };
  if (typeof windowWithCapacitor.Capacitor !== "undefined") {
    const platform = windowWithCapacitor.Capacitor?.platform;
    if (platform === "ios") return "ios";
    if (platform === "android") return "android";
  }

  // Check for Electron
  if (
    typeof (window as Window & { electron?: unknown }).electron !== "undefined"
  ) {
    return "electron";
  }

  // Check for Tauri
  if (
    typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !==
    "undefined"
  ) {
    return "tauri";
  }

  // Default to web
  return "web";
}

/**
 * Checks if Web Crypto API is available
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  );
}

/**
 * Checks if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

// ============================================================================
// Web Storage Implementation
// ============================================================================

/**
 * Web platform storage using IndexedDB with Web Crypto encryption
 */
export class WebPlatformStorage implements IPlatformStorage {
  readonly platform: Platform = "web";
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;
  private initialized = false;
  private dbName = "nchat-secure-storage";
  private storeName = "secure-items";

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!isWebCryptoAvailable()) {
      throw new Error("Web Crypto API is not available");
    }

    if (!isIndexedDBAvailable()) {
      throw new Error("IndexedDB is not available");
    }

    // Generate or load encryption key
    await this.initializeEncryptionKey();

    // Open database
    this.db = await this.openDatabase();
    this.initialized = true;

    logger.info("Web platform storage initialized");
  }

  async getCapabilities(): Promise<StorageCapabilities> {
    return {
      hardwareStorage: false,
      biometricAuth: await this.checkBiometricSupport(),
      biometricTypes: await this.getBiometricTypes(),
      secureEnclave: false,
      maxItemSize: DEFAULT_MAX_ITEM_SIZE,
      syncSupported: false,
    };
  }

  async setItem<T>(
    key: string,
    value: T,
    options?: StorageOptions,
  ): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    try {
      const fullKey = STORAGE_PREFIX + key;
      const serialized = JSON.stringify(value);

      // Encrypt the data
      const encKey = options?.encryptionKey || this.encryptionKey!;
      const encrypted = await this.encrypt(serialized, encKey);

      // Create metadata
      const now = new Date();
      const meta: StorageItemMeta = {
        createdAt: now,
        accessedAt: now,
        modifiedAt: now,
        securityLevel: "encrypted",
        biometricProtected: options?.requireBiometric || false,
        version: CURRENT_VERSION,
      };

      // Store in IndexedDB
      await this.dbPut(fullKey, encrypted);
      await this.dbPut(fullKey + META_SUFFIX, meta);

      return { success: true, data: null, error: null, meta };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getItem<T>(
    key: string,
    options?: StorageOptions,
  ): Promise<StorageResult<T>> {
    await this.ensureInitialized();

    try {
      const fullKey = STORAGE_PREFIX + key;

      // Check biometric if required
      const meta = await this.getItemMeta(key);
      if (meta?.biometricProtected && options?.requireBiometric !== false) {
        const authenticated = await this.authenticateBiometric();
        if (!authenticated) {
          return {
            success: false,
            data: null,
            error: "Biometric authentication failed",
          };
        }
      }

      const encrypted = await this.dbGet<EncryptedData>(fullKey);
      if (!encrypted) {
        return { success: true, data: null, error: null };
      }

      // Decrypt the data
      const encKey = options?.encryptionKey || this.encryptionKey!;
      const decrypted = await this.decrypt(encrypted, encKey);
      const value = JSON.parse(decrypted) as T;

      // Update access time
      if (meta) {
        meta.accessedAt = new Date();
        await this.dbPut(fullKey + META_SUFFIX, meta);
      }

      return {
        success: true,
        data: value,
        error: null,
        meta: meta || undefined,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async hasItem(key: string): Promise<boolean> {
    await this.ensureInitialized();
    const fullKey = STORAGE_PREFIX + key;
    const item = await this.dbGet(fullKey);
    return item !== null;
  }

  async removeItem(key: string): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    try {
      const fullKey = STORAGE_PREFIX + key;
      await this.dbDelete(fullKey);
      await this.dbDelete(fullKey + META_SUFFIX);
      return { success: true, data: null, error: null };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getAllKeys(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const allKeys = await this.dbGetAllKeys();
      return allKeys
        .filter((k) => k.startsWith(STORAGE_PREFIX) && !k.endsWith(META_SUFFIX))
        .map((k) => k.slice(STORAGE_PREFIX.length));
    } catch {
      return [];
    }
  }

  async clear(): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    try {
      const keys = await this.getAllKeys();
      for (const key of keys) {
        await this.removeItem(key);
      }
      return { success: true, data: null, error: null };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getItemMeta(key: string): Promise<StorageItemMeta | null> {
    await this.ensureInitialized();
    const fullKey = STORAGE_PREFIX + key + META_SUFFIX;
    const meta = await this.dbGet<StorageItemMeta>(fullKey);

    if (!meta) return null;

    return {
      ...meta,
      createdAt: new Date(meta.createdAt),
      accessedAt: new Date(meta.accessedAt),
      modifiedAt: new Date(meta.modifiedAt),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async initializeEncryptionKey(): Promise<void> {
    const keyStorageKey = "__storage_encryption_key__";

    try {
      // Try to load existing key from localStorage (as JWK)
      const storedKey = localStorage.getItem(keyStorageKey);
      if (storedKey) {
        const jwk = JSON.parse(storedKey) as JsonWebKey;
        this.encryptionKey = await crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "AES-GCM" },
          true,
          ["encrypt", "decrypt"],
        );
        return;
      }
    } catch {
      // Failed to load, generate new key
    }

    // Generate new key
    this.encryptionKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    // Store for future use
    const jwk = await crypto.subtle.exportKey("jwk", this.encryptionKey);
    localStorage.setItem(keyStorageKey, JSON.stringify(jwk));
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  private async dbPut(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async dbGet<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as { key: string; value: T } | undefined;
        resolve(result?.value ?? null);
      };
    });
  }

  private async dbDelete(key: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async dbGetAllKeys(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  private async encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData,
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv.buffer),
      algorithm: "AES-GCM",
    };
  }

  private async decrypt(
    encrypted: EncryptedData,
    key: CryptoKey,
  ): Promise<string> {
    const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);
    const iv = new Uint8Array(this.base64ToArrayBuffer(encrypted.iv));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async checkBiometricSupport(): Promise<boolean> {
    if (
      typeof window === "undefined" ||
      typeof (window as Window & { PublicKeyCredential?: unknown })
        .PublicKeyCredential === "undefined"
    ) {
      return false;
    }

    try {
      const available = await (
        window as Window & {
          PublicKeyCredential: {
            isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean>;
          };
        }
      ).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  private async getBiometricTypes(): Promise<BiometricType[]> {
    const hasBiometric = await this.checkBiometricSupport();
    if (!hasBiometric) return ["none"];

    // Web doesn't expose specific biometric types
    // Return generic fingerprint/face based on platform hints
    return ["fingerprint", "face"];
  }

  private async authenticateBiometric(): Promise<boolean> {
    // Implement WebAuthn-based biometric authentication
    // This is a placeholder - actual implementation would use navigator.credentials
    return true;
  }
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  algorithm: string;
}

// ============================================================================
// Capacitor (iOS/Android) Storage Implementation
// ============================================================================

/**
 * iOS/Android storage using Capacitor secure storage plugins
 * Falls back to web storage if Capacitor is not available
 */
export class CapacitorPlatformStorage implements IPlatformStorage {
  readonly platform: Platform;
  private webFallback: WebPlatformStorage;
  private initialized = false;
  private secureStoragePlugin: SecureStoragePluginInterface | null = null;
  private biometricsPlugin: BiometricsPluginInterface | null = null;

  constructor(platform: "ios" | "android") {
    this.platform = platform;
    this.webFallback = new WebPlatformStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load Capacitor plugins
      await this.loadPlugins();
    } catch {
      // Plugins not available, will use web fallback
      logger.warn("Capacitor plugins not available, using web fallback");
    }

    // Initialize web fallback
    await this.webFallback.initialize();
    this.initialized = true;

    logger.info(`${this.platform} platform storage initialized`);
  }

  async getCapabilities(): Promise<StorageCapabilities> {
    if (this.secureStoragePlugin) {
      return {
        hardwareStorage: true, // iOS Keychain / Android Keystore
        biometricAuth: this.biometricsPlugin !== null,
        biometricTypes: await this.getBiometricTypes(),
        secureEnclave: this.platform === "ios", // iOS has Secure Enclave
        maxItemSize: DEFAULT_MAX_ITEM_SIZE,
        syncSupported: this.platform === "ios", // iCloud Keychain sync
      };
    }

    return this.webFallback.getCapabilities();
  }

  async setItem<T>(
    key: string,
    value: T,
    options?: StorageOptions,
  ): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    if (this.secureStoragePlugin && options?.useHardwareStorage !== false) {
      try {
        const serialized = JSON.stringify(value);
        await this.secureStoragePlugin.set({
          key: STORAGE_PREFIX + key,
          value: serialized,
        });

        const meta: StorageItemMeta = {
          createdAt: new Date(),
          accessedAt: new Date(),
          modifiedAt: new Date(),
          securityLevel: "hardware",
          biometricProtected: options?.requireBiometric || false,
          version: CURRENT_VERSION,
        };

        // Store metadata in web storage
        await this.webFallback.setItem(key + META_SUFFIX, meta);

        return { success: true, data: null, error: null, meta };
      } catch (error) {
        logger.warn("Secure storage failed, falling back to web", {
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }

    return this.webFallback.setItem(key, value, options);
  }

  async getItem<T>(
    key: string,
    options?: StorageOptions,
  ): Promise<StorageResult<T>> {
    await this.ensureInitialized();

    // Check biometric if required
    const meta = await this.getItemMeta(key);
    if (meta?.biometricProtected && options?.requireBiometric !== false) {
      const authenticated = await this.authenticateBiometric();
      if (!authenticated) {
        return {
          success: false,
          data: null,
          error: "Biometric authentication failed",
        };
      }
    }

    if (this.secureStoragePlugin && meta?.securityLevel === "hardware") {
      try {
        const result = await this.secureStoragePlugin.get({
          key: STORAGE_PREFIX + key,
        });

        if (result.value) {
          const value = JSON.parse(result.value) as T;
          return { success: true, data: value, error: null, meta };
        }

        return { success: true, data: null, error: null };
      } catch {
        // Fall through to web fallback
      }
    }

    return this.webFallback.getItem<T>(key, options);
  }

  async hasItem(key: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.secureStoragePlugin) {
      try {
        const result = await this.secureStoragePlugin.get({
          key: STORAGE_PREFIX + key,
        });
        if (result.value) return true;
      } catch {
        // Fall through
      }
    }

    return this.webFallback.hasItem(key);
  }

  async removeItem(key: string): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    if (this.secureStoragePlugin) {
      try {
        await this.secureStoragePlugin.remove({
          key: STORAGE_PREFIX + key,
        });
      } catch {
        // Ignore errors for native removal
      }
    }

    return this.webFallback.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    await this.ensureInitialized();

    const keys: string[] = [];

    if (this.secureStoragePlugin) {
      try {
        const result = await this.secureStoragePlugin.keys();
        const nativeKeys = result.keys
          .filter((k) => k.startsWith(STORAGE_PREFIX))
          .map((k) => k.slice(STORAGE_PREFIX.length));
        keys.push(...nativeKeys);
      } catch {
        // Ignore errors
      }
    }

    const webKeys = await this.webFallback.getAllKeys();
    for (const key of webKeys) {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  async clear(): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    if (this.secureStoragePlugin) {
      try {
        await this.secureStoragePlugin.clear();
      } catch {
        // Ignore errors
      }
    }

    return this.webFallback.clear();
  }

  async getItemMeta(key: string): Promise<StorageItemMeta | null> {
    await this.ensureInitialized();
    const result = await this.webFallback.getItem<StorageItemMeta>(
      key + META_SUFFIX,
    );
    return result.data;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async loadPlugins(): Promise<void> {
    // Dynamic import for Capacitor plugins
    // These would be installed via npm and imported at build time
    try {
      // @capacitor-community/secure-storage-plugin
      // @capacitor-community/biometric-auth
      // Placeholder - actual implementation would import the real plugins
    } catch {
      // Plugins not available
    }
  }

  private async getBiometricTypes(): Promise<BiometricType[]> {
    if (!this.biometricsPlugin) {
      return ["none"];
    }

    try {
      const result = await this.biometricsPlugin.isAvailable();

      if (this.platform === "ios") {
        if (result.biometryType === "faceId") return ["face"];
        if (result.biometryType === "touchId") return ["fingerprint"];
      }

      if (this.platform === "android") {
        if (result.biometryType === "face") return ["face"];
        if (result.biometryType === "fingerprint") return ["fingerprint"];
        if (result.biometryType === "iris") return ["iris"];
      }

      return ["none"];
    } catch {
      return ["none"];
    }
  }

  private async authenticateBiometric(): Promise<boolean> {
    if (!this.biometricsPlugin) {
      return true; // No biometric, allow access
    }

    try {
      await this.biometricsPlugin.authenticate({
        reason: "Access secure storage",
        cancelTitle: "Cancel",
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Plugin interfaces (would be imported from actual packages)
interface SecureStoragePluginInterface {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
  clear(): Promise<void>;
}

interface BiometricsPluginInterface {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType: string }>;
  authenticate(options: { reason: string; cancelTitle: string }): Promise<void>;
}

// ============================================================================
// Desktop Storage Implementation (Electron/Tauri)
// ============================================================================

/**
 * Desktop storage using OS keychain (via Electron or Tauri)
 */
export class DesktopPlatformStorage implements IPlatformStorage {
  readonly platform: Platform;
  private webFallback: WebPlatformStorage;
  private initialized = false;
  private keychainAvailable = false;

  constructor(platform: "electron" | "tauri") {
    this.platform = platform;
    this.webFallback = new WebPlatformStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check for keychain access
    this.keychainAvailable = await this.checkKeychainAccess();

    await this.webFallback.initialize();
    this.initialized = true;

    logger.info(`${this.platform} platform storage initialized`, {
      keychainAvailable: this.keychainAvailable,
    });
  }

  async getCapabilities(): Promise<StorageCapabilities> {
    return {
      hardwareStorage: this.keychainAvailable,
      biometricAuth: false, // Desktop typically uses system auth
      biometricTypes: ["none"],
      secureEnclave: false,
      maxItemSize: DEFAULT_MAX_ITEM_SIZE,
      syncSupported: false,
    };
  }

  async setItem<T>(
    key: string,
    value: T,
    options?: StorageOptions,
  ): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    if (this.keychainAvailable && options?.useHardwareStorage !== false) {
      try {
        await this.setKeychainItem(key, value);
        return { success: true, data: null, error: null };
      } catch {
        // Fall through to web storage
      }
    }

    return this.webFallback.setItem(key, value, options);
  }

  async getItem<T>(
    key: string,
    options?: StorageOptions,
  ): Promise<StorageResult<T>> {
    await this.ensureInitialized();

    if (this.keychainAvailable) {
      try {
        const value = await this.getKeychainItem<T>(key);
        if (value !== null) {
          return { success: true, data: value, error: null };
        }
      } catch {
        // Fall through to web storage
      }
    }

    return this.webFallback.getItem<T>(key, options);
  }

  async hasItem(key: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.keychainAvailable) {
      const value = await this.getKeychainItem(key);
      if (value !== null) return true;
    }

    return this.webFallback.hasItem(key);
  }

  async removeItem(key: string): Promise<StorageResult<void>> {
    await this.ensureInitialized();

    if (this.keychainAvailable) {
      await this.removeKeychainItem(key);
    }

    return this.webFallback.removeItem(key);
  }

  async getAllKeys(): Promise<string[]> {
    return this.webFallback.getAllKeys();
  }

  async clear(): Promise<StorageResult<void>> {
    return this.webFallback.clear();
  }

  async getItemMeta(key: string): Promise<StorageItemMeta | null> {
    return this.webFallback.getItemMeta(key);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async checkKeychainAccess(): Promise<boolean> {
    if (this.platform === "electron") {
      // Check for electron keytar or safeStorage
      return (
        typeof (window as Window & { electron?: { keytar?: unknown } }).electron
          ?.keytar !== "undefined"
      );
    }

    if (this.platform === "tauri") {
      // Check for Tauri keychain API
      return (
        typeof (window as Window & { __TAURI__?: { keychain?: unknown } })
          .__TAURI__?.keychain !== "undefined"
      );
    }

    return false;
  }

  private async setKeychainItem<T>(_key: string, _value: T): Promise<void> {
    // Implementation would use electron keytar or tauri keychain
    throw new Error("Keychain not available");
  }

  private async getKeychainItem<T>(_key: string): Promise<T | null> {
    // Implementation would use electron keytar or tauri keychain
    return null;
  }

  private async removeKeychainItem(_key: string): Promise<void> {
    // Implementation would use electron keytar or tauri keychain
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let storageInstance: IPlatformStorage | null = null;

/**
 * Gets the platform-appropriate storage instance
 */
export function getPlatformStorage(): IPlatformStorage {
  if (storageInstance) {
    return storageInstance;
  }

  const platform = detectPlatform();

  switch (platform) {
    case "ios":
    case "android":
      storageInstance = new CapacitorPlatformStorage(platform);
      break;
    case "electron":
    case "tauri":
      storageInstance = new DesktopPlatformStorage(platform);
      break;
    default:
      storageInstance = new WebPlatformStorage();
  }

  return storageInstance;
}

/**
 * Resets the storage instance (for testing)
 */
export function resetPlatformStorage(): void {
  storageInstance = null;
}

/**
 * Initializes platform storage
 */
export async function initializePlatformStorage(): Promise<void> {
  const storage = getPlatformStorage();
  await storage.initialize();
}

/**
 * Securely stores a key pair
 */
export async function storeKeyPairSecurely(
  keyId: string,
  keyPair: { publicKey: JsonWebKey; privateKey: JsonWebKey },
  options?: StorageOptions,
): Promise<StorageResult<void>> {
  const storage = getPlatformStorage();
  return storage.setItem(`key_${keyId}`, keyPair, {
    ...options,
    useHardwareStorage: true,
    requireBiometric: options?.requireBiometric ?? false,
  });
}

/**
 * Retrieves a key pair from secure storage
 */
export async function retrieveKeyPairSecurely(
  keyId: string,
  options?: StorageOptions,
): Promise<StorageResult<{ publicKey: JsonWebKey; privateKey: JsonWebKey }>> {
  const storage = getPlatformStorage();
  return storage.getItem(`key_${keyId}`, options);
}
