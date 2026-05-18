/**
 * Secure Storage - Encrypted browser storage for sensitive data
 *
 * Provides encrypted localStorage wrapper, memory-only storage for
 * highly sensitive data, and automatic cleanup on logout.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface StorageOptions {
  /** Whether to encrypt the data */
  encrypt?: boolean;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Storage key prefix */
  prefix?: string;
}

export interface StoredItem<T> {
  /** The stored value */
  value: T;
  /** When the item was stored */
  storedAt: number;
  /** When the item expires (if TTL set) */
  expiresAt: number | null;
  /** Whether the item is encrypted */
  encrypted: boolean;
  /** Storage version for migration */
  version: number;
}

export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded IV */
  iv: string;
  /** Encryption algorithm used */
  algorithm: string;
}

export interface SecureStorageConfig {
  /** Key prefix for all items */
  prefix?: string;
  /** Whether encryption is enabled by default */
  defaultEncrypt?: boolean;
  /** Default TTL in milliseconds */
  defaultTTL?: number | null;
  /** Storage version */
  version?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PREFIX = "nchat_secure_";
const STORAGE_VERSION = 1;
const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_STORAGE_KEY = "__secure_storage_key__";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a random encryption key for secure storage
 */
export async function generateStorageKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Exports a CryptoKey to a storable format
 */
export async function exportStorageKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

/**
 * Imports a storage key from JWK format
 */
export async function importStorageKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: ENCRYPTION_ALGORITHM },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Converts ArrayBuffer to Base64 string
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
 * Converts Base64 string to ArrayBuffer
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
 * Encrypts data with AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey,
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encodedData,
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    algorithm: ENCRYPTION_ALGORITHM,
  };
}

/**
 * Decrypts data with AES-GCM
 */
export async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey,
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encrypted.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(encrypted.iv));

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Checks if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if sessionStorage is available
 */
export function isSessionStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Memory-Only Storage
// ============================================================================

/**
 * In-memory storage for highly sensitive data that should never be persisted
 */
class MemoryStorage {
  private storage: Map<string, unknown> = new Map();
  private expirations: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Starts the automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (typeof window !== "undefined") {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, 60000); // Check every minute
    }
  }

  /**
   * Stops the cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Sets a value in memory storage
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    this.storage.set(key, value);

    if (ttlMs && ttlMs > 0) {
      this.expirations.set(key, Date.now() + ttlMs);
    } else {
      this.expirations.delete(key);
    }
  }

  /**
   * Gets a value from memory storage
   */
  get<T>(key: string): T | null {
    // Check expiration
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.delete(key);
      return null;
    }

    const value = this.storage.get(key);
    return value !== undefined ? (value as T) : null;
  }

  /**
   * Checks if a key exists
   */
  has(key: string): boolean {
    // Check expiration first
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.delete(key);
      return false;
    }

    return this.storage.has(key);
  }

  /**
   * Deletes a key from storage
   */
  delete(key: string): boolean {
    this.expirations.delete(key);
    return this.storage.delete(key);
  }

  /**
   * Clears all stored data
   */
  clear(): void {
    this.storage.clear();
    this.expirations.clear();
  }

  /**
   * Gets all keys
   */
  keys(): string[] {
    this.cleanupExpired();
    return Array.from(this.storage.keys());
  }

  /**
   * Gets the number of items
   */
  size(): number {
    this.cleanupExpired();
    return this.storage.size;
  }

  /**
   * Removes expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.expirations.forEach((expiration, key) => {
      if (now > expiration) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.delete(key));
  }
}

// Export singleton memory storage
export const memoryStorage = new MemoryStorage();

// ============================================================================
// Secure Storage Class
// ============================================================================

/**
 * SecureStorage provides encrypted localStorage with automatic cleanup
 */
export class SecureStorage {
  private config: Required<SecureStorageConfig>;
  private encryptionKey: CryptoKey | null = null;
  private initialized: boolean = false;
  private memoryFallback: MemoryStorage = new MemoryStorage();

  constructor(config: SecureStorageConfig = {}) {
    this.config = {
      prefix: config.prefix ?? DEFAULT_PREFIX,
      defaultEncrypt: config.defaultEncrypt ?? true,
      defaultTTL: config.defaultTTL ?? null,
      version: config.version ?? STORAGE_VERSION,
    };
  }

  /**
   * Initializes the secure storage with an encryption key
   */
  async initialize(existingKey?: CryptoKey): Promise<void> {
    if (existingKey) {
      this.encryptionKey = existingKey;
    } else {
      // Try to load existing key or generate new one
      const storedKeyJson = this.getRawItem(KEY_STORAGE_KEY);

      if (storedKeyJson) {
        try {
          const jwk = JSON.parse(storedKeyJson) as JsonWebKey;
          this.encryptionKey = await importStorageKey(jwk);
        } catch {
          // Key corrupted, generate new one
          this.encryptionKey = await generateStorageKey();
          await this.storeEncryptionKey();
        }
      } else {
        this.encryptionKey = await generateStorageKey();
        await this.storeEncryptionKey();
      }
    }

    this.initialized = true;
  }

  /**
   * Stores the encryption key in localStorage
   */
  private async storeEncryptionKey(): Promise<void> {
    if (!this.encryptionKey) return;

    const jwk = await exportStorageKey(this.encryptionKey);
    this.setRawItem(KEY_STORAGE_KEY, JSON.stringify(jwk));
  }

  /**
   * Checks if storage is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the full storage key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * Sets a raw item in localStorage (no encryption)
   */
  private setRawItem(key: string, value: string): void {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Gets a raw item from localStorage
   */
  private getRawItem(key: string): string | null {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Removes a raw item from localStorage
   */
  private removeRawItem(key: string): void {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Sets a value in secure storage
   */
  async set<T>(
    key: string,
    value: T,
    options: StorageOptions = {},
  ): Promise<void> {
    const encrypt = options.encrypt ?? this.config.defaultEncrypt;
    const ttl = options.ttl ?? this.config.defaultTTL;
    const fullKey = this.getFullKey(key);

    const item: StoredItem<T | EncryptedData> = {
      value: value as T,
      storedAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
      encrypted: false,
      version: this.config.version,
    };

    if (encrypt && this.encryptionKey) {
      const jsonValue = JSON.stringify(value);
      const encrypted = await encryptData(jsonValue, this.encryptionKey);
      item.value = encrypted;
      item.encrypted = true;
    }

    if (!isLocalStorageAvailable()) {
      // Fall back to memory storage
      this.memoryFallback.set(fullKey, item, ttl ?? undefined);
      return;
    }

    try {
      this.setRawItem(fullKey, JSON.stringify(item));
    } catch (error) {
      // Storage full or other error, use memory fallback
      logger.warn("SecureStorage: localStorage failed, using memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.memoryFallback.set(fullKey, item, ttl ?? undefined);
    }
  }

  /**
   * Gets a value from secure storage
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);

    // Try localStorage first
    let itemJson = this.getRawItem(fullKey);
    let item: StoredItem<T | EncryptedData> | null = null;

    if (itemJson) {
      try {
        item = JSON.parse(itemJson) as StoredItem<T | EncryptedData>;
      } catch {
        // Corrupted data, remove it
        this.removeRawItem(fullKey);
        return null;
      }
    } else {
      // Try memory fallback
      item = this.memoryFallback.get<StoredItem<T | EncryptedData>>(fullKey);
    }

    if (!item) return null;

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await this.remove(key);
      return null;
    }

    // Decrypt if needed
    if (item.encrypted && this.encryptionKey) {
      try {
        const decrypted = await decryptData(
          item.value as EncryptedData,
          this.encryptionKey,
        );
        return JSON.parse(decrypted) as T;
      } catch {
        // Decryption failed, remove corrupted data
        await this.remove(key);
        return null;
      }
    }

    return item.value as T;
  }

  /**
   * Checks if a key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Removes a key from storage
   */
  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.removeRawItem(fullKey);
    this.memoryFallback.delete(fullKey);
  }

  /**
   * Gets all keys with the configured prefix
   */
  getKeys(): string[] {
    const keys: string[] = [];

    if (isLocalStorageAvailable()) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          keys.push(key.slice(this.config.prefix.length));
        }
      }
    }

    // Add memory fallback keys
    this.memoryFallback.keys().forEach((key) => {
      if (key.startsWith(this.config.prefix)) {
        const shortKey = key.slice(this.config.prefix.length);
        if (!keys.includes(shortKey)) {
          keys.push(shortKey);
        }
      }
    });

    return keys;
  }

  /**
   * Clears all items with the configured prefix
   */
  async clear(): Promise<void> {
    const keys = this.getKeys();
    await Promise.all(keys.map((key) => this.remove(key)));
  }

  /**
   * Clears all storage and resets encryption key
   */
  async clearAll(): Promise<void> {
    await this.clear();
    this.removeRawItem(KEY_STORAGE_KEY);
    this.encryptionKey = null;
    this.initialized = false;
    this.memoryFallback.clear();
  }

  /**
   * Removes expired items
   */
  async cleanupExpired(): Promise<number> {
    const keys = this.getKeys();
    let removed = 0;

    for (const key of keys) {
      const fullKey = this.getFullKey(key);
      const itemJson = this.getRawItem(fullKey);

      if (itemJson) {
        try {
          const item = JSON.parse(itemJson) as StoredItem<unknown>;
          if (item.expiresAt && Date.now() > item.expiresAt) {
            await this.remove(key);
            removed++;
          }
        } catch {
          // Corrupted, remove it
          this.removeRawItem(fullKey);
          removed++;
        }
      }
    }

    return removed;
  }

  /**
   * Gets storage statistics
   */
  getStats(): {
    itemCount: number;
    encryptedCount: number;
    expiredCount: number;
    totalSize: number;
  } {
    const keys = this.getKeys();
    let encryptedCount = 0;
    let expiredCount = 0;
    let totalSize = 0;

    for (const key of keys) {
      const fullKey = this.getFullKey(key);
      const itemJson = this.getRawItem(fullKey);

      if (itemJson) {
        totalSize += itemJson.length;
        try {
          const item = JSON.parse(itemJson) as StoredItem<unknown>;
          if (item.encrypted) encryptedCount++;
          if (item.expiresAt && Date.now() > item.expiresAt) expiredCount++;
        } catch {
          // Skip corrupted items
        }
      }
    }

    return {
      itemCount: keys.length,
      encryptedCount,
      expiredCount,
      totalSize,
    };
  }

  /**
   * Exports all data (for backup purposes)
   */
  async exportData(): Promise<Record<string, unknown>> {
    const keys = this.getKeys();
    const data: Record<string, unknown> = {};

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Imports data (for restore purposes)
   */
  async importData(
    data: Record<string, unknown>,
    options: StorageOptions = {},
  ): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value, options);
    }
  }
}

// ============================================================================
// Session Storage Wrapper
// ============================================================================

/**
 * Secure session storage (cleared when browser closes)
 */
export class SecureSessionStorage {
  private prefix: string;

  constructor(prefix: string = "nchat_session_") {
    this.prefix = prefix;
  }

  /**
   * Gets the full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Sets a value in session storage
   */
  set<T>(key: string, value: T): void {
    if (isSessionStorageAvailable()) {
      sessionStorage.setItem(this.getFullKey(key), JSON.stringify(value));
    }
  }

  /**
   * Gets a value from session storage
   */
  get<T>(key: string): T | null {
    if (!isSessionStorageAvailable()) return null;

    const item = sessionStorage.getItem(this.getFullKey(key));
    if (!item) return null;

    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a key exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Removes a key
   */
  remove(key: string): void {
    if (isSessionStorageAvailable()) {
      sessionStorage.removeItem(this.getFullKey(key));
    }
  }

  /**
   * Clears all session storage with prefix
   */
  clear(): void {
    if (!isSessionStorageAvailable()) return;

    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }
}

// ============================================================================
// Auto-Clear on Logout
// ============================================================================

/**
 * Clears all sensitive storage on logout
 */
export async function clearAllSecureStorage(
  secureStorage: SecureStorage,
  sessionStorage: SecureSessionStorage,
): Promise<void> {
  await secureStorage.clearAll();
  sessionStorage.clear();
  memoryStorage.clear();
}

/**
 * Sets up automatic clearing when window unloads (for sensitive data)
 */
export function setupAutoClearOnUnload(
  storage: SecureStorage,
  keysToPreserve: string[] = [],
): () => void {
  const handler = async () => {
    const keys = storage.getKeys();
    for (const key of keys) {
      if (!keysToPreserve.includes(key)) {
        await storage.remove(key);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }

  return () => {};
}

// ============================================================================
// Export Singletons
// ============================================================================

export const secureStorage = new SecureStorage();
export const secureSessionStorage = new SecureSessionStorage();
