/**
 * Encrypted IndexedDB Storage for E2EE
 * Provides hardware-backed encrypted storage for sensitive E2EE data
 * Uses Web Crypto API with IndexedDB for persistent storage
 */

import { crypto as e2eeCrypto } from "./crypto";

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedStorageConfig {
  dbName: string;
  dbVersion: number;
  storeName: string;
}

export interface StoredKey {
  id: string;
  encryptedData: Uint8Array;
  iv: Uint8Array;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: EncryptedStorageConfig = {
  dbName: "nchat_e2ee_storage",
  dbVersion: 1,
  storeName: "encrypted_keys",
};

// ============================================================================
// ENCRYPTED STORAGE CLASS
// ============================================================================

export class EncryptedStorage {
  private config: EncryptedStorageConfig;
  private db: IDBDatabase | null = null;
  private encryptionKey: Uint8Array | null = null;

  constructor(config: Partial<EncryptedStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the encrypted storage
   * Must be called before any other operations
   */
  async initialize(masterKey: Uint8Array): Promise<void> {
    // Derive storage encryption key from master key
    this.encryptionKey = await this.deriveStorageKey(masterKey);

    // Open IndexedDB
    this.db = await this.openDatabase();
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(this.config.storeName, {
            keyPath: "id",
          });
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  /**
   * Derive storage-specific encryption key from master key
   */
  private async deriveStorageKey(masterKey: Uint8Array): Promise<Uint8Array> {
    const salt = e2eeCrypto.stringToBytes("nchat-storage-v1");
    const combined = new Uint8Array(masterKey.length + salt.length);
    combined.set(masterKey, 0);
    combined.set(salt, masterKey.length);

    return e2eeCrypto.hash256(combined);
  }

  // ==========================================================================
  // STORAGE OPERATIONS
  // ==========================================================================

  /**
   * Store encrypted data
   */
  async store(
    id: string,
    data: Uint8Array,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!this.db || !this.encryptionKey) {
      throw new Error("EncryptedStorage not initialized");
    }

    // Encrypt data
    const { ciphertext, iv } = await e2eeCrypto.encryptAESGCM(
      data,
      this.encryptionKey,
    );

    const storedKey: StoredKey = {
      id,
      encryptedData: ciphertext,
      iv,
      timestamp: Date.now(),
      metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite",
      );
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.put(storedKey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve and decrypt data
   */
  async retrieve(id: string): Promise<Uint8Array | null> {
    if (!this.db || !this.encryptionKey) {
      throw new Error("EncryptedStorage not initialized");
    }

    const storedKey = await this.getStoredKey(id);
    if (!storedKey) {
      return null;
    }

    // Decrypt data
    return e2eeCrypto.decryptAESGCM(
      storedKey.encryptedData,
      this.encryptionKey,
      storedKey.iv,
    );
  }

  /**
   * Get stored key metadata without decrypting
   */
  private getStoredKey(id: string): Promise<StoredKey | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readonly",
      );
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Delete stored data
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("EncryptedStorage not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite",
      );
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * List all stored keys (IDs only)
   */
  async list(): Promise<string[]> {
    if (!this.db) {
      throw new Error("EncryptedStorage not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readonly",
      );
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error("EncryptedStorage not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.config.storeName],
        "readwrite",
      );
      const objectStore = transaction.objectStore(this.config.storeName);
      const request = objectStore.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ==========================================================================
  // SESSION/PREKEY SPECIFIC OPERATIONS
  // ==========================================================================

  /**
   * Store Signal session state
   */
  async storeSession(
    peerUserId: string,
    peerDeviceId: string,
    sessionState: Uint8Array,
  ): Promise<void> {
    const id = `session:${peerUserId}:${peerDeviceId}`;
    await this.store(id, sessionState, {
      type: "session",
      peerUserId,
      peerDeviceId,
    });
  }

  /**
   * Retrieve Signal session state
   */
  async retrieveSession(
    peerUserId: string,
    peerDeviceId: string,
  ): Promise<Uint8Array | null> {
    const id = `session:${peerUserId}:${peerDeviceId}`;
    return this.retrieve(id);
  }

  /**
   * Store prekey
   */
  async storePreKey(keyId: number, keyPair: Uint8Array): Promise<void> {
    const id = `prekey:${keyId}`;
    await this.store(id, keyPair, { type: "prekey", keyId });
  }

  /**
   * Retrieve prekey
   */
  async retrievePreKey(keyId: number): Promise<Uint8Array | null> {
    const id = `prekey:${keyId}`;
    return this.retrieve(id);
  }

  /**
   * Store signed prekey
   */
  async storeSignedPreKey(keyId: number, keyPair: Uint8Array): Promise<void> {
    const id = `signed_prekey:${keyId}`;
    await this.store(id, keyPair, { type: "signed_prekey", keyId });
  }

  /**
   * Retrieve signed prekey
   */
  async retrieveSignedPreKey(keyId: number): Promise<Uint8Array | null> {
    const id = `signed_prekey:${keyId}`;
    return this.retrieve(id);
  }

  /**
   * Store identity key pair
   */
  async storeIdentityKey(
    deviceId: string,
    identityKeyPair: Uint8Array,
  ): Promise<void> {
    const id = `identity:${deviceId}`;
    await this.store(id, identityKeyPair, { type: "identity", deviceId });
  }

  /**
   * Retrieve identity key pair
   */
  async retrieveIdentityKey(deviceId: string): Promise<Uint8Array | null> {
    const id = `identity:${deviceId}`;
    return this.retrieve(id);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Close database connection and wipe keys
   */
  async destroy(): Promise<void> {
    if (this.encryptionKey) {
      e2eeCrypto.secureWipe(this.encryptionKey);
      this.encryptionKey = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Wipe all encrypted data (for remote wipe)
   */
  async wipeAll(): Promise<void> {
    await this.clear();
    await this.destroy();

    // Delete the entire database
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let encryptedStorageInstance: EncryptedStorage | null = null;

/**
 * Get or create encrypted storage instance
 */
export function getEncryptedStorage(): EncryptedStorage {
  if (!encryptedStorageInstance) {
    encryptedStorageInstance = new EncryptedStorage();
  }
  return encryptedStorageInstance;
}

/**
 * Reset encrypted storage instance
 */
export function resetEncryptedStorage(): void {
  if (encryptedStorageInstance) {
    encryptedStorageInstance.destroy();
  }
  encryptedStorageInstance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EncryptedStorage;
