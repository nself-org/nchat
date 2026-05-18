/**
 * Attachment Key Manager
 *
 * Manages cryptographic keys for E2EE attachments.
 * Keys are derived from message session keys using HKDF,
 * ensuring proper key separation and forward secrecy.
 *
 * Key hierarchy:
 * - Message Key (from Double Ratchet) -> Attachment Key (via HKDF)
 * - Each attachment gets a unique derived key
 * - Keys can be cached for multi-device access
 *
 * Security properties:
 * - Keys derived deterministically from message context
 * - Attachment keys don't compromise message keys
 * - Support for key rotation and revocation
 */

import {
  generateRandomBytes,
  hash256,
  hash512,
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,
  bytesToBase64,
  base64ToBytes,
  stringToBytes,
  bytesToString,
  secureWipe,
  KEY_LENGTH,
} from "./crypto";
import {
  type AttachmentKey,
  generateAttachmentKey,
  validateAttachmentKey,
  wipeAttachmentKey,
} from "./attachment-encryption";

// ============================================================================
// Constants
// ============================================================================

/** HKDF info prefix for attachment key derivation */
const HKDF_INFO_PREFIX = "nchat-attachment-key-v1";

/** Maximum age for cached keys (24 hours) */
const KEY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Maximum number of keys to cache per conversation */
const MAX_CACHED_KEYS_PER_CONVERSATION = 100;

// ============================================================================
// Types
// ============================================================================

/**
 * Key derivation context
 */
export interface KeyDerivationContext {
  /** Conversation/channel ID */
  conversationId: string;
  /** Message ID this attachment belongs to */
  messageId: string;
  /** Attachment index within the message (for multiple attachments) */
  attachmentIndex: number;
  /** Sender's user ID */
  senderUserId: string;
  /** Recipient's user ID (for DMs) */
  recipientUserId?: string;
  /** Timestamp for key derivation */
  timestamp: number;
}

/**
 * Encrypted attachment key for transmission
 */
export interface EncryptedAttachmentKey {
  /** Key ID */
  keyId: string;
  /** Encrypted key data (base64) */
  encryptedKey: string;
  /** IV used for encryption (base64) */
  iv: string;
  /** Key derivation context hash (for verification) */
  contextHash: string;
  /** Timestamp */
  createdAt: number;
  /** Format version */
  version: number;
}

/**
 * Cached key entry
 */
interface CachedKeyEntry {
  attachmentKey: AttachmentKey;
  context: KeyDerivationContext;
  cachedAt: number;
  accessCount: number;
}

/**
 * Key manager configuration
 */
export interface AttachmentKeyManagerConfig {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Optional storage for persistence */
  storage?: Storage;
  /** Key cache TTL in milliseconds */
  keyCacheTtl?: number;
}

/**
 * Key derivation result
 */
export interface DerivedKeyResult {
  attachmentKey: AttachmentKey;
  contextHash: string;
  derivedAt: number;
}

// ============================================================================
// HKDF Implementation
// ============================================================================

/**
 * HKDF-Extract: Extracts a pseudorandom key from input keying material
 * Uses HMAC-SHA256(salt, ikm) construction
 */
function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  // HMAC-SHA256(salt, ikm) approximation using nested hash
  // H(salt XOR opad || H(salt XOR ipad || ikm))
  const blockSize = 64; // SHA-256 block size

  // Pad or hash the salt if needed
  let key = salt;
  if (key.length > blockSize) {
    key = hash256(key);
  }
  if (key.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(key, 0);
    key = padded;
  }

  // Create ipad (0x36) and opad (0x5c) keys
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = key[i] ^ 0x36;
    opad[i] = key[i] ^ 0x5c;
  }

  // Inner hash: H(ipad || ikm)
  const innerData = new Uint8Array(blockSize + ikm.length);
  innerData.set(ipad, 0);
  innerData.set(ikm, blockSize);
  const innerHash = hash256(innerData);

  // Outer hash: H(opad || inner_hash)
  const outerData = new Uint8Array(blockSize + innerHash.length);
  outerData.set(opad, 0);
  outerData.set(innerHash, blockSize);

  return hash256(outerData);
}

/**
 * HMAC-SHA256 helper for HKDF-Expand
 */
function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64; // SHA-256 block size

  // Pad or hash the key if needed
  let k = key;
  if (k.length > blockSize) {
    k = hash256(k);
  }
  if (k.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(k, 0);
    k = padded;
  }

  // Create ipad (0x36) and opad (0x5c) keys
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = k[i] ^ 0x36;
    opad[i] = k[i] ^ 0x5c;
  }

  // Inner hash: H(ipad || data)
  const innerData = new Uint8Array(blockSize + data.length);
  innerData.set(ipad, 0);
  innerData.set(data, blockSize);
  const innerHash = hash256(innerData);

  // Outer hash: H(opad || inner_hash)
  const outerData = new Uint8Array(blockSize + innerHash.length);
  outerData.set(opad, 0);
  outerData.set(innerHash, blockSize);

  return hash256(outerData);
}

/**
 * HKDF-Expand: Expands the PRK into output keying material
 * Uses HMAC-SHA256(PRK, prev || info || counter)
 */
function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  const hashLen = 32; // SHA-256 output length
  const n = Math.ceil(length / hashLen);

  if (n > 255) {
    throw new Error("HKDF output length too large");
  }

  const okm = new Uint8Array(n * hashLen);
  let prev: Uint8Array = new Uint8Array(0);

  for (let i = 1; i <= n; i++) {
    const data = new Uint8Array(prev.length + info.length + 1);
    data.set(prev, 0);
    data.set(info, prev.length);
    data[prev.length + info.length] = i;

    // Use HMAC with PRK as key
    const hmacResult = hmacSha256(prk, data);
    prev = new Uint8Array(hmacResult);
    okm.set(prev, (i - 1) * hashLen);
  }

  return okm.slice(0, length);
}

/**
 * Full HKDF key derivation
 */
function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Uint8Array {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Creates a unique context hash for key derivation
 */
export function createContextHash(context: KeyDerivationContext): string {
  const contextString = [
    context.conversationId,
    context.messageId,
    context.attachmentIndex.toString(),
    context.senderUserId,
    context.recipientUserId ?? "",
    context.timestamp.toString(),
  ].join("|");

  const hashBytes = hash256(stringToBytes(contextString));
  return bytesToBase64(hashBytes);
}

/**
 * Derives an attachment key from a message key and context
 *
 * @param messageKey - The message encryption key (from Double Ratchet)
 * @param context - Key derivation context
 * @returns Derived attachment key
 */
export function deriveAttachmentKey(
  messageKey: Uint8Array,
  context: KeyDerivationContext,
): DerivedKeyResult {
  // Create salt from context hash
  const contextHash = createContextHash(context);
  const salt = hash256(base64ToBytes(contextHash));

  // Create info string - include full context for uniqueness
  const info = stringToBytes(`${HKDF_INFO_PREFIX}:${contextHash}`);

  // Derive key using HKDF
  const derivedKeyBytes = hkdf(messageKey, salt, info, KEY_LENGTH);

  // Create attachment key
  const keyId = bytesToBase64(generateRandomBytes(12));
  const keyHash = hash256(derivedKeyBytes);

  const attachmentKey: AttachmentKey = {
    key: derivedKeyBytes,
    keyId,
    keyHash,
    createdAt: context.timestamp,
  };

  return {
    attachmentKey,
    contextHash,
    derivedAt: Date.now(),
  };
}

/**
 * Derives an attachment key for a specific attachment index
 * Useful for messages with multiple attachments
 */
export function deriveAttachmentKeyForIndex(
  messageKey: Uint8Array,
  baseContext: Omit<KeyDerivationContext, "attachmentIndex">,
  attachmentIndex: number,
): DerivedKeyResult {
  const context: KeyDerivationContext = {
    ...baseContext,
    attachmentIndex,
  };

  return deriveAttachmentKey(messageKey, context);
}

// ============================================================================
// Key Encryption/Decryption
// ============================================================================

/**
 * Encrypts an attachment key for transmission
 *
 * @param attachmentKey - The attachment key to encrypt
 * @param wrappingKey - Key to wrap the attachment key with
 * @param context - Key derivation context
 * @returns Encrypted attachment key
 */
export async function encryptAttachmentKey(
  attachmentKey: AttachmentKey,
  wrappingKey: Uint8Array,
  context: KeyDerivationContext,
): Promise<EncryptedAttachmentKey> {
  // Serialize the key
  const keyData = new Uint8Array(KEY_LENGTH + 8); // key + timestamp
  keyData.set(attachmentKey.key, 0);

  // Add timestamp
  const view = new DataView(keyData.buffer, KEY_LENGTH, 8);
  const timestamp = BigInt(attachmentKey.createdAt);
  view.setUint32(0, Number(timestamp >> 32n));
  view.setUint32(4, Number(timestamp & 0xffffffffn));

  // Encrypt
  const { ciphertext, iv } = await encryptAESGCM(keyData, wrappingKey);

  return {
    keyId: attachmentKey.keyId,
    encryptedKey: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
    contextHash: createContextHash(context),
    createdAt: attachmentKey.createdAt,
    version: 1,
  };
}

/**
 * Decrypts an encrypted attachment key
 *
 * @param encryptedKey - The encrypted attachment key
 * @param wrappingKey - Key to unwrap the attachment key with
 * @returns Decrypted attachment key
 */
export async function decryptAttachmentKey(
  encryptedKey: EncryptedAttachmentKey,
  wrappingKey: Uint8Array,
): Promise<AttachmentKey> {
  // Decrypt
  const ciphertext = base64ToBytes(encryptedKey.encryptedKey);
  const iv = base64ToBytes(encryptedKey.iv);

  const keyData = await decryptAESGCM(ciphertext, wrappingKey, iv);

  // Extract key and timestamp
  const key = keyData.slice(0, KEY_LENGTH);

  const view = new DataView(keyData.buffer, keyData.byteOffset + KEY_LENGTH, 8);
  const timestampHigh = BigInt(view.getUint32(0));
  const timestampLow = BigInt(view.getUint32(4));
  const createdAt = Number((timestampHigh << 32n) | timestampLow);

  const keyHash = hash256(key);

  return {
    key,
    keyId: encryptedKey.keyId,
    keyHash,
    createdAt,
  };
}

// ============================================================================
// Attachment Key Manager Class
// ============================================================================

/**
 * Manages attachment keys with caching and lifecycle management
 */
export class AttachmentKeyManager {
  private config: AttachmentKeyManagerConfig;
  private keyCache: Map<string, CachedKeyEntry> = new Map();
  private initialized = false;

  constructor(config: AttachmentKeyManagerConfig) {
    this.config = {
      ...config,
      keyCacheTtl: config.keyCacheTtl ?? KEY_CACHE_MAX_AGE_MS,
    };
  }

  /**
   * Initializes the key manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load cached keys from storage if available
    await this.loadFromStorage();

    this.initialized = true;
  }

  /**
   * Generates a new attachment key (not derived from message key)
   */
  generateKey(): AttachmentKey {
    return generateAttachmentKey();
  }

  /**
   * Derives an attachment key from a message key
   */
  deriveKey(
    messageKey: Uint8Array,
    context: KeyDerivationContext,
  ): AttachmentKey {
    // Check cache first
    const cacheKey = this.getCacheKey(context);
    const cached = this.keyCache.get(cacheKey);

    if (cached && this.isKeyValid(cached)) {
      cached.accessCount++;
      return cached.attachmentKey;
    }

    // Derive new key
    const result = deriveAttachmentKey(messageKey, context);

    // Cache the key
    this.cacheKey(cacheKey, result.attachmentKey, context);

    return result.attachmentKey;
  }

  /**
   * Gets a cached key by context
   */
  getKey(context: KeyDerivationContext): AttachmentKey | null {
    const cacheKey = this.getCacheKey(context);
    const cached = this.keyCache.get(cacheKey);

    if (cached && this.isKeyValid(cached)) {
      cached.accessCount++;
      return cached.attachmentKey;
    }

    return null;
  }

  /**
   * Stores a key in the cache
   */
  storeKey(attachmentKey: AttachmentKey, context: KeyDerivationContext): void {
    const cacheKey = this.getCacheKey(context);
    this.cacheKey(cacheKey, attachmentKey, context);
  }

  /**
   * Encrypts a key for transmission to another device
   */
  async encryptKeyForTransmission(
    attachmentKey: AttachmentKey,
    wrappingKey: Uint8Array,
    context: KeyDerivationContext,
  ): Promise<EncryptedAttachmentKey> {
    return encryptAttachmentKey(attachmentKey, wrappingKey, context);
  }

  /**
   * Decrypts a key received from another device
   */
  async decryptKeyFromTransmission(
    encryptedKey: EncryptedAttachmentKey,
    wrappingKey: Uint8Array,
  ): Promise<AttachmentKey> {
    return decryptAttachmentKey(encryptedKey, wrappingKey);
  }

  /**
   * Removes a key from the cache
   */
  removeKey(context: KeyDerivationContext): void {
    const cacheKey = this.getCacheKey(context);
    const cached = this.keyCache.get(cacheKey);

    if (cached) {
      wipeAttachmentKey(cached.attachmentKey);
      this.keyCache.delete(cacheKey);
    }
  }

  /**
   * Removes all keys for a conversation
   */
  removeKeysForConversation(conversationId: string): number {
    let removed = 0;

    for (const [key, entry] of this.keyCache.entries()) {
      if (entry.context.conversationId === conversationId) {
        wipeAttachmentKey(entry.attachmentKey);
        this.keyCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Cleans up expired keys
   */
  cleanupExpiredKeys(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.keyCache.entries()) {
      if (now - entry.cachedAt > this.config.keyCacheTtl!) {
        wipeAttachmentKey(entry.attachmentKey);
        this.keyCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    totalKeys: number;
    conversationCount: number;
    oldestKey: number | null;
    newestKey: number | null;
  } {
    const conversations = new Set<string>();
    let oldestKey: number | null = null;
    let newestKey: number | null = null;

    for (const entry of this.keyCache.values()) {
      conversations.add(entry.context.conversationId);

      if (oldestKey === null || entry.cachedAt < oldestKey) {
        oldestKey = entry.cachedAt;
      }

      if (newestKey === null || entry.cachedAt > newestKey) {
        newestKey = entry.cachedAt;
      }
    }

    return {
      totalKeys: this.keyCache.size,
      conversationCount: conversations.size,
      oldestKey,
      newestKey,
    };
  }

  /**
   * Saves key cache to storage
   */
  async saveToStorage(): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    const serialized = this.serializeCache();
    this.config.storage.setItem(
      `nchat_attachment_keys_${this.config.userId}_${this.config.deviceId}`,
      serialized,
    );
  }

  /**
   * Loads key cache from storage
   */
  async loadFromStorage(): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    const data = this.config.storage.getItem(
      `nchat_attachment_keys_${this.config.userId}_${this.config.deviceId}`,
    );

    if (data) {
      this.deserializeCache(data);
    }
  }

  /**
   * Clears all cached keys and storage
   */
  clear(): void {
    // Wipe all keys
    for (const entry of this.keyCache.values()) {
      wipeAttachmentKey(entry.attachmentKey);
    }

    this.keyCache.clear();

    // Clear storage
    if (this.config.storage) {
      this.config.storage.removeItem(
        `nchat_attachment_keys_${this.config.userId}_${this.config.deviceId}`,
      );
    }
  }

  /**
   * Destroys the key manager
   */
  destroy(): void {
    this.clear();
    this.initialized = false;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private getCacheKey(context: KeyDerivationContext): string {
    return `${context.conversationId}:${context.messageId}:${context.attachmentIndex}`;
  }

  private cacheKey(
    cacheKey: string,
    attachmentKey: AttachmentKey,
    context: KeyDerivationContext,
  ): void {
    // Enforce cache size limit per conversation
    this.enforceConversationLimit(context.conversationId);

    this.keyCache.set(cacheKey, {
      attachmentKey,
      context,
      cachedAt: Date.now(),
      accessCount: 0,
    });
  }

  private isKeyValid(entry: CachedKeyEntry): boolean {
    const age = Date.now() - entry.cachedAt;
    return (
      age < this.config.keyCacheTtl! &&
      validateAttachmentKey(entry.attachmentKey)
    );
  }

  private enforceConversationLimit(conversationId: string): void {
    const conversationKeys: Array<[string, CachedKeyEntry]> = [];

    for (const [key, entry] of this.keyCache.entries()) {
      if (entry.context.conversationId === conversationId) {
        conversationKeys.push([key, entry]);
      }
    }

    if (conversationKeys.length >= MAX_CACHED_KEYS_PER_CONVERSATION) {
      // Sort by access count, then by age (oldest first)
      conversationKeys.sort((a, b) => {
        if (a[1].accessCount !== b[1].accessCount) {
          return a[1].accessCount - b[1].accessCount;
        }
        return a[1].cachedAt - b[1].cachedAt;
      });

      // Remove the least used/oldest keys
      const toRemove = conversationKeys.slice(
        0,
        conversationKeys.length - MAX_CACHED_KEYS_PER_CONVERSATION + 1,
      );

      for (const [key, entry] of toRemove) {
        wipeAttachmentKey(entry.attachmentKey);
        this.keyCache.delete(key);
      }
    }
  }

  private serializeCache(): string {
    const entries: Array<{
      context: KeyDerivationContext;
      key: string;
      keyId: string;
      keyHash: string;
      cachedAt: number;
    }> = [];

    for (const entry of this.keyCache.values()) {
      entries.push({
        context: entry.context,
        key: bytesToBase64(entry.attachmentKey.key),
        keyId: entry.attachmentKey.keyId,
        keyHash: bytesToBase64(entry.attachmentKey.keyHash),
        cachedAt: entry.cachedAt,
      });
    }

    return JSON.stringify(entries);
  }

  private deserializeCache(data: string): void {
    try {
      const entries = JSON.parse(data) as Array<{
        context: KeyDerivationContext;
        key: string;
        keyId: string;
        keyHash: string;
        cachedAt: number;
      }>;

      for (const entry of entries) {
        const attachmentKey: AttachmentKey = {
          key: base64ToBytes(entry.key),
          keyId: entry.keyId,
          keyHash: base64ToBytes(entry.keyHash),
          createdAt: entry.context.timestamp,
        };

        if (validateAttachmentKey(attachmentKey)) {
          const cacheKey = this.getCacheKey(entry.context);
          this.keyCache.set(cacheKey, {
            attachmentKey,
            context: entry.context,
            cachedAt: entry.cachedAt,
            accessCount: 0,
          });
        }
      }
    } catch {
      // Invalid data, ignore
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes an attachment key manager
 */
export async function createAttachmentKeyManager(
  config: AttachmentKeyManagerConfig,
): Promise<AttachmentKeyManager> {
  const manager = new AttachmentKeyManager(config);
  await manager.initialize();
  return manager;
}

// ============================================================================
// Exports
// ============================================================================

export const attachmentKeyManager = {
  // Key derivation
  createContextHash,
  deriveAttachmentKey,
  deriveAttachmentKeyForIndex,

  // Key encryption
  encryptAttachmentKey,
  decryptAttachmentKey,

  // Manager
  AttachmentKeyManager,
  createAttachmentKeyManager,
};

export default attachmentKeyManager;
