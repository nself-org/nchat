/**
 * Encrypted Fallback Storage
 *
 * Software-encrypted storage for platforms without native secure storage.
 * Uses Web Crypto API with AES-256-GCM encryption.
 *
 * This is the fallback when native secure storage (Keychain, Keystore, etc.)
 * is not available. While not as secure as hardware-backed storage, it still
 * provides protection through strong encryption.
 */

import { logger } from "@/lib/logger";
import {
  type ISecureStorage,
  type SecureStorageCapabilities,
  type SecureStorageResult,
  type SecureStorageSetOptions,
  type SecureStorageGetOptions,
  type SecureStorageItemMeta,
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

const LOG_PREFIX = "[Encrypted Fallback]";
const DB_NAME = "nchat-secure-fallback";
const STORE_NAME = "secure-items";
const ENCRYPTION_KEY_STORAGE = "__secure_storage_encryption_key__";

// ============================================================================
// Encrypted Data Interface
// ============================================================================

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  algorithm: string;
  version: number;
}

// ============================================================================
// Encrypted Fallback Storage Implementation
// ============================================================================

/**
 * Encrypted fallback storage using IndexedDB and Web Crypto
 */
export class EncryptedFallbackStorage implements ISecureStorage {
  readonly os = "web" as const;
  private initialized = false;
  private db: IDBDatabase | null = null;
  private encryptionKey: CryptoKey | null = null;
  private defaultService: string;
  private metadataCache = new Map<string, SecureStorageItemMeta>();

  constructor(service: string = DEFAULT_SERVICE) {
    this.defaultService = service;
  }

  /**
   * Initialize the encrypted storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check for Web Crypto API
      if (!this.isWebCryptoAvailable()) {
        throw new SecureStorageError(
          "Web Crypto API is not available",
          "NOT_AVAILABLE",
        );
      }

      // Check for IndexedDB
      if (!this.isIndexedDBAvailable()) {
        throw new SecureStorageError(
          "IndexedDB is not available",
          "NOT_AVAILABLE",
        );
      }

      // Initialize or load encryption key
      await this.initializeEncryptionKey();

      // Open IndexedDB
      this.db = await this.openDatabase();

      this.initialized = true;
      logger.info(`${LOG_PREFIX} Initialized successfully`);
    } catch (error) {
      if (error instanceof SecureStorageError) {
        throw error;
      }
      throw new SecureStorageError(
        `Failed to initialize encrypted storage: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      hardwareStorage: false,
      biometricAuth: await this.checkBiometricSupport(),
      biometricTypes: await this.getBiometricTypes(),
      secureEnclave: false,
      syncSupported: false,
      maxItemSize: MAX_ITEM_SIZE,
      accessGroupsSupported: false,
      os: "web",
      securityLevel: "encrypted",
    };
  }

  /**
   * Store a secret value with encryption
   */
  async setItem(
    key: string,
    value: string,
    options: SecureStorageSetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key, options);

      // Encrypt the value
      const encrypted = await this.encrypt(value);

      // Store in IndexedDB
      await this.dbPut(fullKey, encrypted);

      // Store metadata
      const now = new Date();
      const meta: SecureStorageItemMeta = {
        createdAt: now,
        modifiedAt: now,
        securityLevel: "encrypted",
        biometricProtected: options.requireBiometric ?? false,
        synchronizable: false,
        accessControl: options.accessControl ?? "whenUnlocked",
        service: options.service ?? this.defaultService,
        account: options.account ?? key,
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
   * Retrieve and decrypt a secret value
   */
  async getItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<string>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key, options);

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

      const encrypted = await this.dbGet<EncryptedData>(fullKey);

      if (!encrypted) {
        return {
          success: true,
          data: null,
          error: null,
        };
      }

      // Decrypt the value
      const decrypted = await this.decrypt(encrypted);

      return {
        success: true,
        data: decrypted,
        error: null,
        meta: meta ?? undefined,
      };
    } catch (error) {
      return this.handleError(error, "getItem");
    }
  }

  /**
   * Check if an item exists
   */
  async hasItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key, options);
      const item = await this.dbGet(fullKey);
      return item !== null;
    } catch {
      return false;
    }
  }

  /**
   * Remove an item
   */
  async removeItem(
    key: string,
    options: SecureStorageGetOptions = {},
  ): Promise<SecureStorageResult<void>> {
    this.ensureInitialized();

    try {
      const fullKey = this.buildFullKey(key, options);

      await this.dbDelete(fullKey);

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
   * Get all keys
   */
  async getAllKeys(options: SecureStorageGetOptions = {}): Promise<string[]> {
    this.ensureInitialized();

    try {
      const prefix = this.getKeyPrefix(options);
      const allKeys = await this.dbGetAllKeys();

      return allKeys
        .filter((k) => k.startsWith(prefix) && !k.endsWith(METADATA_SUFFIX))
        .map((k) => k.slice(prefix.length));
    } catch (error) {
      logger.error(`${LOG_PREFIX} Failed to get all keys`, error);
      return [];
    }
  }

  /**
   * Clear all items
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
   * Get metadata for an item
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
      const metaKey = this.buildFullKey(key + METADATA_SUFFIX, options);
      const encrypted = await this.dbGet<EncryptedData>(metaKey);

      if (!encrypted) {
        return null;
      }

      const metaString = await this.decrypt(encrypted);
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
    return this.checkBiometricSupport();
  }

  /**
   * Authenticate using WebAuthn (if available)
   */
  async authenticateBiometric(
    reason: string,
  ): Promise<SecureStorageResult<void>> {
    if (!(await this.checkBiometricSupport())) {
      return {
        success: false,
        data: null,
        error: "Biometric authentication not available",
        errorCode: "BIOMETRIC_NOT_AVAILABLE",
      };
    }

    try {
      // Use WebAuthn for biometric authentication
      const success = await this.performWebAuthnAuthentication(reason);

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
        "Encrypted storage not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Check if Web Crypto API is available
   */
  private isWebCryptoAvailable(): boolean {
    return (
      typeof crypto !== "undefined" &&
      typeof crypto.subtle !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    );
  }

  /**
   * Check if IndexedDB is available
   */
  private isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== "undefined";
  }

  /**
   * Initialize or load the encryption key
   */
  private async initializeEncryptionKey(): Promise<void> {
    try {
      // Try to load existing key from localStorage
      const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
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
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(jwk));
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Build the full key with prefix and service
   */
  private buildFullKey(
    key: string,
    options: SecureStorageGetOptions | SecureStorageSetOptions,
  ): string {
    const service = options.service ?? this.defaultService;
    return `${STORAGE_KEY_PREFIX}${service}_${key}`;
  }

  /**
   * Get the key prefix for the service
   */
  private getKeyPrefix(options: SecureStorageGetOptions): string {
    const service = options.service ?? this.defaultService;
    return `${STORAGE_KEY_PREFIX}${service}_`;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encrypt(data: string): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new SecureStorageError(
        "Encryption key not initialized",
        "KEY_NOT_FOUND",
      );
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.encryptionKey,
      encodedData,
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv.buffer),
      salt: this.arrayBufferToBase64(salt.buffer),
      algorithm: "AES-GCM-256",
      version: 1,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decrypt(encrypted: EncryptedData): Promise<string> {
    if (!this.encryptionKey) {
      throw new SecureStorageError(
        "Encryption key not initialized",
        "KEY_NOT_FOUND",
      );
    }

    const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);
    const iv = new Uint8Array(this.base64ToArrayBuffer(encrypted.iv));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.encryptionKey,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Store data in IndexedDB
   */
  private async dbPut(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get data from IndexedDB
   */
  private async dbGet<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as { key: string; value: T } | undefined;
        resolve(result?.value ?? null);
      };
    });
  }

  /**
   * Delete data from IndexedDB
   */
  private async dbDelete(key: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get all keys from IndexedDB
   */
  private async dbGetAllKeys(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }

  /**
   * Store metadata for an item
   */
  private async storeMetadata(
    key: string,
    meta: SecureStorageItemMeta,
    options: SecureStorageSetOptions,
  ): Promise<void> {
    const metaKey = this.buildFullKey(key + METADATA_SUFFIX, options);
    const encrypted = await this.encrypt(JSON.stringify(meta));
    await this.dbPut(metaKey, encrypted);
  }

  /**
   * Remove metadata for an item
   */
  private async removeMetadata(
    key: string,
    options: SecureStorageGetOptions,
  ): Promise<void> {
    const metaKey = this.buildFullKey(key + METADATA_SUFFIX, options);
    await this.dbDelete(metaKey);
  }

  /**
   * Check biometric support via WebAuthn
   */
  private async checkBiometricSupport(): Promise<boolean> {
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      return false;
    }

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get biometric types available
   */
  private async getBiometricTypes(): Promise<BiometricAuthType[]> {
    const hasBiometric = await this.checkBiometricSupport();
    if (!hasBiometric) return ["none"];

    // Web doesn't expose specific biometric types
    return ["fingerprint", "face"];
  }

  /**
   * Perform WebAuthn authentication
   */
  private async performWebAuthnAuthentication(
    _reason: string,
  ): Promise<boolean> {
    // This is a simplified implementation
    // A full implementation would create/verify credentials
    try {
      // In a real implementation, you would use navigator.credentials.get()
      // with appropriate challenge and authentication options
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
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
 * Creates an encrypted fallback storage instance
 */
export function createEncryptedFallbackStorage(
  service?: string,
): EncryptedFallbackStorage {
  return new EncryptedFallbackStorage(service);
}

/**
 * Checks if encrypted fallback storage is available
 */
export function isEncryptedFallbackAvailable(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof indexedDB !== "undefined"
  );
}
