/**
 * Key Manager - Cryptographic key management for end-to-end encryption
 *
 * Handles key pair generation, storage in IndexedDB, export/import, and rotation.
 * Uses Web Crypto API for all cryptographic operations.
 */

// ============================================================================
// Types
// ============================================================================

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface StoredKeyData {
  id: string;
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  createdAt: string;
  rotatedAt: string | null;
  deviceId: string;
  version: number;
}

export interface KeyManagerConfig {
  dbName?: string;
  storeName?: string;
  keyAlgorithm?: EcKeyGenParams;
}

export type KeyStatus = "active" | "rotated" | "revoked" | "expired";

export interface KeyMetadata {
  id: string;
  deviceId: string;
  status: KeyStatus;
  createdAt: Date;
  rotatedAt: Date | null;
  version: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DB_NAME = "nchat-encryption";
const DEFAULT_STORE_NAME = "keys";
const CURRENT_KEY_ID = "current-identity-key";

const DEFAULT_KEY_ALGORITHM: EcKeyGenParams = {
  name: "ECDH",
  namedCurve: "P-256",
};

// ============================================================================
// IndexedDB Helpers
// ============================================================================

/**
 * Opens an IndexedDB database for key storage
 */
export async function openKeyDatabase(
  dbName: string = DEFAULT_DB_NAME,
  storeName: string = DEFAULT_STORE_NAME,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => {
      reject(
        new Error(`Failed to open key database: ${request.error?.message}`),
      );
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
  });
}

/**
 * Deletes the key database
 */
export async function deleteKeyDatabase(
  dbName: string = DEFAULT_DB_NAME,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);

    request.onerror = () => {
      reject(
        new Error(`Failed to delete key database: ${request.error?.message}`),
      );
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generates a new ECDH key pair for key exchange
 */
export async function generateKeyPair(
  algorithm: EcKeyGenParams = DEFAULT_KEY_ALGORITHM,
): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(algorithm, true, [
      "deriveKey",
      "deriveBits",
    ]);

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate key pair: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generates a signing key pair (ECDSA) for message authentication
 */
export async function generateSigningKeyPair(): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"],
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate signing key pair: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generates a random device ID
 */
export function generateDeviceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// Key Export/Import
// ============================================================================

/**
 * Exports a CryptoKey to JWK format
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  try {
    return await crypto.subtle.exportKey("jwk", key);
  } catch (error) {
    throw new Error(
      `Failed to export key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Exports a key pair to JWK format
 */
export async function exportKeyPair(
  keyPair: KeyPair,
): Promise<ExportedKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    exportKey(keyPair.publicKey),
    exportKey(keyPair.privateKey),
  ]);

  return { publicKey, privateKey };
}

/**
 * Imports a public key from JWK format
 */
export async function importPublicKey(
  jwk: JsonWebKey,
  algorithm: EcKeyImportParams = { name: "ECDH", namedCurve: "P-256" },
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey("jwk", jwk, algorithm, true, []);
  } catch (error) {
    throw new Error(
      `Failed to import public key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Imports a private key from JWK format
 */
export async function importPrivateKey(
  jwk: JsonWebKey,
  algorithm: EcKeyImportParams = { name: "ECDH", namedCurve: "P-256" },
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey("jwk", jwk, algorithm, true, [
      "deriveKey",
      "deriveBits",
    ]);
  } catch (error) {
    throw new Error(
      `Failed to import private key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Imports a key pair from JWK format
 */
export async function importKeyPair(
  exported: ExportedKeyPair,
  algorithm: EcKeyImportParams = { name: "ECDH", namedCurve: "P-256" },
): Promise<KeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    importPublicKey(exported.publicKey, algorithm),
    importPrivateKey(exported.privateKey, algorithm),
  ]);

  return { publicKey, privateKey };
}

/**
 * Imports a signing public key from JWK format
 */
export async function importSigningPublicKey(
  jwk: JsonWebKey,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );
  } catch (error) {
    throw new Error(
      `Failed to import signing public key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Imports a signing private key from JWK format
 */
export async function importSigningPrivateKey(
  jwk: JsonWebKey,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"],
    );
  } catch (error) {
    throw new Error(
      `Failed to import signing private key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Key Storage
// ============================================================================

/**
 * Stores a key pair in IndexedDB
 */
export async function storeKeyPair(
  keyPair: KeyPair,
  deviceId: string,
  config?: KeyManagerConfig,
): Promise<StoredKeyData> {
  const dbName = config?.dbName ?? DEFAULT_DB_NAME;
  const storeName = config?.storeName ?? DEFAULT_STORE_NAME;

  const exported = await exportKeyPair(keyPair);
  const now = new Date().toISOString();

  const keyData: StoredKeyData = {
    id: CURRENT_KEY_ID,
    publicKey: exported.publicKey,
    privateKey: exported.privateKey,
    createdAt: now,
    rotatedAt: null,
    deviceId,
    version: 1,
  };

  const db = await openKeyDatabase(dbName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(keyData);

    request.onerror = () => {
      reject(new Error(`Failed to store key pair: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(keyData);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieves the current key pair from IndexedDB
 */
export async function retrieveKeyPair(
  config?: KeyManagerConfig,
): Promise<KeyPair | null> {
  const dbName = config?.dbName ?? DEFAULT_DB_NAME;
  const storeName = config?.storeName ?? DEFAULT_STORE_NAME;

  const db = await openKeyDatabase(dbName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(CURRENT_KEY_ID);

    request.onerror = () => {
      reject(
        new Error(`Failed to retrieve key pair: ${request.error?.message}`),
      );
    };

    request.onsuccess = async () => {
      const data = request.result as StoredKeyData | undefined;

      if (!data) {
        resolve(null);
        return;
      }

      try {
        const keyPair = await importKeyPair({
          publicKey: data.publicKey,
          privateKey: data.privateKey,
        });
        resolve(keyPair);
      } catch (error) {
        reject(error);
      }
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Retrieves key metadata without loading the actual keys
 */
export async function retrieveKeyMetadata(
  config?: KeyManagerConfig,
): Promise<KeyMetadata | null> {
  const dbName = config?.dbName ?? DEFAULT_DB_NAME;
  const storeName = config?.storeName ?? DEFAULT_STORE_NAME;

  const db = await openKeyDatabase(dbName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(CURRENT_KEY_ID);

    request.onerror = () => {
      reject(
        new Error(`Failed to retrieve key metadata: ${request.error?.message}`),
      );
    };

    request.onsuccess = () => {
      const data = request.result as StoredKeyData | undefined;

      if (!data) {
        resolve(null);
        return;
      }

      resolve({
        id: data.id,
        deviceId: data.deviceId,
        status: "active",
        createdAt: new Date(data.createdAt),
        rotatedAt: data.rotatedAt ? new Date(data.rotatedAt) : null,
        version: data.version,
      });
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Deletes all stored keys
 */
export async function clearStoredKeys(
  config?: KeyManagerConfig,
): Promise<void> {
  const dbName = config?.dbName ?? DEFAULT_DB_NAME;
  const storeName = config?.storeName ?? DEFAULT_STORE_NAME;

  const db = await openKeyDatabase(dbName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => {
      reject(
        new Error(`Failed to clear stored keys: ${request.error?.message}`),
      );
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

// ============================================================================
// Key Rotation
// ============================================================================

/**
 * Rotates the current key pair, generating a new one and archiving the old
 */
export async function rotateKeyPair(
  config?: KeyManagerConfig,
): Promise<{ newKeyPair: KeyPair; oldKeyData: StoredKeyData | null }> {
  const dbName = config?.dbName ?? DEFAULT_DB_NAME;
  const storeName = config?.storeName ?? DEFAULT_STORE_NAME;
  const algorithm = config?.keyAlgorithm ?? DEFAULT_KEY_ALGORITHM;

  const db = await openKeyDatabase(dbName, storeName);

  // Get existing key data
  const existingData = await new Promise<StoredKeyData | null>(
    (resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(CURRENT_KEY_ID);

      request.onerror = () =>
        reject(
          new Error(`Failed to get existing key: ${request.error?.message}`),
        );
      request.onsuccess = () => resolve(request.result as StoredKeyData | null);
    },
  );

  // Generate new key pair
  const newKeyPair = await generateKeyPair(algorithm);
  const exported = await exportKeyPair(newKeyPair);
  const now = new Date().toISOString();

  // Archive old key if exists
  let oldKeyData: StoredKeyData | null = null;
  if (existingData) {
    oldKeyData = {
      ...existingData,
      id: `archived-${existingData.version}-${Date.now()}`,
      rotatedAt: now,
    };
  }

  // Store new key
  const newKeyData: StoredKeyData = {
    id: CURRENT_KEY_ID,
    publicKey: exported.publicKey,
    privateKey: exported.privateKey,
    createdAt: now,
    rotatedAt: null,
    deviceId: existingData?.deviceId ?? generateDeviceId(),
    version: (existingData?.version ?? 0) + 1,
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    // Store archived key if exists
    if (oldKeyData) {
      store.put(oldKeyData);
    }

    // Store new key
    const request = store.put(newKeyData);

    request.onerror = () =>
      reject(
        new Error(`Failed to store rotated key: ${request.error?.message}`),
      );

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });

  return { newKeyPair, oldKeyData };
}

/**
 * Checks if key rotation is needed based on age
 */
export function isKeyRotationNeeded(
  metadata: KeyMetadata,
  maxAgeInDays: number = 30,
): boolean {
  // Use UTC calendar days to avoid DST-induced off-by-one errors near boundaries
  const today = new Date();
  const created = new Date(metadata.createdAt);
  today.setUTCHours(0, 0, 0, 0);
  created.setUTCHours(0, 0, 0, 0);
  const ageInDays =
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays >= maxAgeInDays;
}

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derives a shared secret from own private key and peer's public key
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
  length: number = 256,
): Promise<ArrayBuffer> {
  try {
    return await crypto.subtle.deriveBits(
      {
        name: "ECDH",
        public: peerPublicKey,
      },
      privateKey,
      length,
    );
  } catch (error) {
    throw new Error(
      `Failed to derive shared secret: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Derives an AES-GCM key from a shared secret for message encryption
 */
export async function deriveEncryptionKey(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<CryptoKey> {
  try {
    return await crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: peerPublicKey,
      },
      privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    throw new Error(
      `Failed to derive encryption key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Key Fingerprinting
// ============================================================================

/**
 * Generates a fingerprint for a public key (for verification)
 */
export async function getKeyFingerprint(publicKey: CryptoKey): Promise<string> {
  const exported = await exportKey(publicKey);
  const keyString = JSON.stringify(exported);
  const encoder = new TextEncoder();
  const data = encoder.encode(keyString);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Format as groups of 4 hex chars separated by spaces
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .match(/.{1,4}/g)!
    .join(" ")
    .toUpperCase();
}

/**
 * Compares two key fingerprints
 */
export function compareFingerprints(
  fingerprint1: string,
  fingerprint2: string,
): boolean {
  return (
    fingerprint1.replace(/\s/g, "").toLowerCase() ===
    fingerprint2.replace(/\s/g, "").toLowerCase()
  );
}

// ============================================================================
// Key Manager Class
// ============================================================================

/**
 * KeyManager class provides a high-level interface for key management
 */
export class KeyManager {
  private config: KeyManagerConfig;
  private currentKeyPair: KeyPair | null = null;
  private deviceId: string | null = null;

  constructor(config: KeyManagerConfig = {}) {
    this.config = {
      dbName: config.dbName ?? DEFAULT_DB_NAME,
      storeName: config.storeName ?? DEFAULT_STORE_NAME,
      keyAlgorithm: config.keyAlgorithm ?? DEFAULT_KEY_ALGORITHM,
    };
  }

  /**
   * Initializes the key manager, loading or generating keys
   */
  async initialize(): Promise<KeyPair> {
    // Try to load existing key pair
    const existingPair = await retrieveKeyPair(this.config);

    if (existingPair) {
      this.currentKeyPair = existingPair;
      const metadata = await retrieveKeyMetadata(this.config);
      this.deviceId = metadata?.deviceId ?? null;
      return existingPair;
    }

    // Generate new key pair
    return this.generateAndStoreKeys();
  }

  /**
   * Generates and stores a new key pair
   */
  async generateAndStoreKeys(): Promise<KeyPair> {
    const keyPair = await generateKeyPair(this.config.keyAlgorithm);
    this.deviceId = generateDeviceId();
    await storeKeyPair(keyPair, this.deviceId, this.config);
    this.currentKeyPair = keyPair;
    return keyPair;
  }

  /**
   * Gets the current key pair
   */
  getCurrentKeyPair(): KeyPair | null {
    return this.currentKeyPair;
  }

  /**
   * Gets the device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Gets the public key fingerprint
   */
  async getFingerprint(): Promise<string | null> {
    if (!this.currentKeyPair) return null;
    return getKeyFingerprint(this.currentKeyPair.publicKey);
  }

  /**
   * Exports the public key for sharing
   */
  async exportPublicKey(): Promise<JsonWebKey | null> {
    if (!this.currentKeyPair) return null;
    return exportKey(this.currentKeyPair.publicKey);
  }

  /**
   * Derives an encryption key with a peer
   */
  async deriveKeyWithPeer(peerPublicKeyJwk: JsonWebKey): Promise<CryptoKey> {
    if (!this.currentKeyPair) {
      throw new Error("Key manager not initialized");
    }

    const peerPublicKey = await importPublicKey(peerPublicKeyJwk);
    return deriveEncryptionKey(this.currentKeyPair.privateKey, peerPublicKey);
  }

  /**
   * Rotates the current key pair
   */
  async rotateKeys(): Promise<KeyPair> {
    const { newKeyPair } = await rotateKeyPair(this.config);
    this.currentKeyPair = newKeyPair;
    return newKeyPair;
  }

  /**
   * Checks if key rotation is needed
   */
  async shouldRotateKeys(maxAgeInDays: number = 30): Promise<boolean> {
    const metadata = await retrieveKeyMetadata(this.config);
    if (!metadata) return false;
    return isKeyRotationNeeded(metadata, maxAgeInDays);
  }

  /**
   * Clears all stored keys and resets the manager
   */
  async clearKeys(): Promise<void> {
    await clearStoredKeys(this.config);
    this.currentKeyPair = null;
    this.deviceId = null;
  }

  /**
   * Gets key metadata
   */
  async getKeyMetadata(): Promise<KeyMetadata | null> {
    return retrieveKeyMetadata(this.config);
  }
}

// Export singleton instance for convenience
export const keyManager = new KeyManager();
