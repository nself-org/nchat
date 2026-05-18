/**
 * Sender Key Distribution for Group E2EE
 *
 * Implements Signal-style sender keys for efficient group messaging.
 * Each group member generates a sender key that is distributed to all
 * other members. Messages are encrypted once with the sender key and
 * distributed to all recipients.
 *
 * Key properties:
 * - O(1) encryption per message (instead of O(n) for pairwise)
 * - Forward secrecy through chain key ratcheting
 * - Sender authentication via signature
 * - Secure key distribution via existing pairwise sessions
 *
 * Uses Web Crypto API for all cryptographic operations.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

/** ECDSA curve for signing */
const ECDSA_CURVE = "P-256";

/** HKDF hash algorithm */
const HKDF_HASH = "SHA-256";

/** AES-GCM key length in bits */
const AES_KEY_LENGTH = 256;

/** AES-GCM IV length in bytes */
const AES_IV_LENGTH = 12;

/** AES-GCM auth tag length in bits */
const AES_TAG_LENGTH = 128;

/** Maximum chain iterations before requiring rekey */
const MAX_CHAIN_ITERATIONS = 2000;

/** Sender key chain info */
const SENDER_KEY_CHAIN_INFO = "nchat-sender-key-chain-v1";

/** Message key derivation info */
const MESSAGE_KEY_INFO = "nchat-sender-key-msg-v1";

// ============================================================================
// Types
// ============================================================================

/**
 * Sender key signing pair for message authentication
 */
export interface SenderKeySigningPair {
  /** Public key for signature verification */
  publicKey: Uint8Array;
  /** Private key for signing */
  privateKey: Uint8Array;
  /** CryptoKey for signing operations */
  cryptoPrivateKey?: CryptoKey;
  /** CryptoKey for verification operations */
  cryptoPublicKey?: CryptoKey;
}

/**
 * Sender key state for a single user in a group
 */
export interface SenderKeyState {
  /** Unique key ID for this sender key */
  keyId: number;
  /** Chain key for deriving message keys */
  chainKey: Uint8Array;
  /** Current chain iteration (message counter) */
  chainIteration: number;
  /** Signing key pair for authentication */
  signingKey: SenderKeySigningPair;
  /** Group ID this key belongs to */
  groupId: string;
  /** User ID of the key owner */
  userId: string;
  /** Device ID of the key owner */
  deviceId: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last used timestamp */
  lastUsedAt: number;
}

/**
 * Sender key message containing distribution data
 */
export interface SenderKeyDistributionMessage {
  /** Key ID */
  keyId: number;
  /** Initial chain key (encrypted for recipient) */
  chainKey: Uint8Array;
  /** Starting chain iteration */
  chainIteration: number;
  /** Signing public key */
  signingPublicKey: Uint8Array;
  /** Group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Creation timestamp */
  timestamp: number;
  /** Protocol version */
  version: number;
}

/**
 * Encrypted message using sender key
 */
export interface SenderKeyEncryptedMessage {
  /** Key ID used for encryption */
  keyId: number;
  /** Chain iteration (message number) */
  chainIteration: number;
  /** Encrypted content */
  ciphertext: Uint8Array;
  /** Nonce/IV */
  nonce: Uint8Array;
  /** Signature for authentication */
  signature: Uint8Array;
  /** Group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
}

/**
 * Stored sender key for receiving messages
 */
export interface StoredSenderKey {
  /** Key ID */
  keyId: number;
  /** Current chain key */
  chainKey: Uint8Array;
  /** Current chain iteration */
  chainIteration: number;
  /** Signing public key for verification */
  signingPublicKey: Uint8Array;
  /** Skipped message keys for out-of-order delivery */
  skippedMessageKeys: Map<number, Uint8Array>;
  /** Group ID */
  groupId: string;
  /** Sender user ID */
  senderUserId: string;
  /** Sender device ID */
  senderDeviceId: string;
  /** Received timestamp */
  receivedAt: number;
}

/**
 * Serialized sender key state for storage
 */
export interface SerializedSenderKeyState {
  keyId: number;
  chainKey: string;
  chainIteration: number;
  signingKey: {
    publicKey: string;
    privateKey: string;
  };
  groupId: string;
  userId: string;
  deviceId: string;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Serialized stored sender key
 */
export interface SerializedStoredSenderKey {
  keyId: number;
  chainKey: string;
  chainIteration: number;
  signingPublicKey: string;
  skippedMessageKeys: Array<{ iteration: number; key: string }>;
  groupId: string;
  senderUserId: string;
  senderDeviceId: string;
  receivedAt: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts ArrayBuffer to Uint8Array
 */
function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Concatenates multiple Uint8Arrays
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Bytes to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Securely wipe data from memory
 */
function secureWipe(data: Uint8Array): void {
  crypto.getRandomValues(data);
  data.fill(0);
}

/**
 * Generate a random key ID
 */
function generateKeyId(): number {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return new DataView(bytes.buffer).getUint32(0, false);
}

// ============================================================================
// Cryptographic Primitives
// ============================================================================

/**
 * Generates a new signing key pair for sender authentication
 */
async function generateSigningKeyPair(): Promise<SenderKeySigningPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: ECDSA_CURVE,
    },
    true,
    ["sign", "verify"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  const privateKeyD = privateKeyJwk.d;
  if (!privateKeyD) {
    throw new Error("Failed to export signing private key");
  }

  // Decode base64url to bytes
  let base64 = privateKeyD.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const privateKeyBytes = base64ToBytes(base64);

  return {
    publicKey: toUint8Array(publicKeyRaw),
    privateKey: privateKeyBytes,
    cryptoPrivateKey: keyPair.privateKey,
    cryptoPublicKey: keyPair.publicKey,
  };
}

/**
 * Imports a signing public key
 */
async function importSigningPublicKey(
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    publicKeyBytes as unknown as ArrayBuffer,
    {
      name: "ECDSA",
      namedCurve: ECDSA_CURVE,
    },
    true,
    ["verify"],
  );
}

/**
 * Imports a signing private key
 */
async function importSigningPrivateKey(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  const d = bytesToBase64(privateKeyBytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const x = bytesToBase64(publicKeyBytes.slice(1, 33))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const y = bytesToBase64(publicKeyBytes.slice(33, 65))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: ECDSA_CURVE,
    d,
    x,
    y,
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDSA",
      namedCurve: ECDSA_CURVE,
    },
    true,
    ["sign"],
  );
}

/**
 * Signs data with ECDSA
 */
async function sign(
  data: Uint8Array,
  privateKey: CryptoKey,
): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    privateKey,
    data as unknown as ArrayBuffer,
  );
  return toUint8Array(signature);
}

/**
 * Verifies ECDSA signature
 */
async function verify(
  data: Uint8Array,
  signature: Uint8Array,
  publicKey: CryptoKey,
): Promise<boolean> {
  return crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    publicKey,
    signature as unknown as ArrayBuffer,
    data as unknown as ArrayBuffer,
  );
}

/**
 * Derives a message key from chain key using HMAC-based KDF
 */
async function deriveMessageKey(chainKey: Uint8Array): Promise<{
  newChainKey: Uint8Array;
  messageKey: Uint8Array;
}> {
  // Import chain key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    chainKey as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Derive new chain key with constant 0x01
  const chainConstant = new Uint8Array([0x01]);
  const newChainKeyBuf = await crypto.subtle.sign("HMAC", key, chainConstant);
  const newChainKey = toUint8Array(newChainKeyBuf);

  // Derive message key with constant 0x02
  const messageConstant = new Uint8Array([0x02]);
  const messageKeyBuf = await crypto.subtle.sign("HMAC", key, messageConstant);
  const messageKey = toUint8Array(messageKeyBuf);

  return { newChainKey, messageKey };
}

/**
 * AES-GCM encryption
 */
async function aesGcmEncrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
  associatedData?: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const nonce = new Uint8Array(AES_IV_LENGTH);
  crypto.getRandomValues(nonce);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
      tagLength: AES_TAG_LENGTH,
      additionalData: associatedData as unknown as ArrayBuffer,
    },
    cryptoKey,
    plaintext as unknown as ArrayBuffer,
  );

  return {
    ciphertext: toUint8Array(encrypted),
    nonce,
  };
}

/**
 * AES-GCM decryption
 */
async function aesGcmDecrypt(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  associatedData?: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonce as unknown as ArrayBuffer,
      tagLength: AES_TAG_LENGTH,
      additionalData: associatedData as unknown as ArrayBuffer,
    },
    cryptoKey,
    ciphertext as unknown as ArrayBuffer,
  );

  return toUint8Array(decrypted);
}

// ============================================================================
// Sender Key Class
// ============================================================================

/**
 * Manages sender key for outgoing group messages
 */
export class SenderKey {
  private state: SenderKeyState | null = null;

  /**
   * Generates a new sender key for a group
   */
  async generate(
    groupId: string,
    userId: string,
    deviceId: string,
  ): Promise<SenderKeyState> {
    const keyId = generateKeyId();
    const chainKey = new Uint8Array(32);
    crypto.getRandomValues(chainKey);
    const signingKey = await generateSigningKeyPair();

    this.state = {
      keyId,
      chainKey,
      chainIteration: 0,
      signingKey,
      groupId,
      userId,
      deviceId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    logger.debug("Sender key generated", { keyId, groupId, userId, deviceId });

    return this.state;
  }

  /**
   * Gets the current sender key state
   */
  getState(): SenderKeyState | null {
    return this.state;
  }

  /**
   * Checks if sender key is initialized
   */
  isInitialized(): boolean {
    return this.state !== null;
  }

  /**
   * Checks if rekey is needed (chain exhausted)
   */
  needsRekey(): boolean {
    if (!this.state) return true;
    return this.state.chainIteration >= MAX_CHAIN_ITERATIONS;
  }

  /**
   * Creates a sender key distribution message
   */
  createDistributionMessage(): SenderKeyDistributionMessage {
    if (!this.state) {
      throw new Error("Sender key not initialized");
    }

    return {
      keyId: this.state.keyId,
      chainKey: this.state.chainKey.slice(), // Clone to prevent modification
      chainIteration: this.state.chainIteration,
      signingPublicKey: this.state.signingKey.publicKey,
      groupId: this.state.groupId,
      senderUserId: this.state.userId,
      senderDeviceId: this.state.deviceId,
      timestamp: Date.now(),
      version: 1,
    };
  }

  /**
   * Encrypts a message with the sender key
   */
  async encrypt(plaintext: Uint8Array): Promise<SenderKeyEncryptedMessage> {
    if (!this.state) {
      throw new Error("Sender key not initialized");
    }

    if (this.needsRekey()) {
      throw new Error("Sender key chain exhausted, rekey required");
    }

    // Derive message key
    const { newChainKey, messageKey } = await deriveMessageKey(
      this.state.chainKey,
    );

    // Create associated data
    const associatedData = new TextEncoder().encode(
      `${this.state.groupId}:${this.state.userId}:${this.state.deviceId}:${this.state.keyId}:${this.state.chainIteration}`,
    );

    // Encrypt plaintext
    const { ciphertext, nonce } = await aesGcmEncrypt(
      plaintext,
      messageKey,
      associatedData,
    );

    // Sign the ciphertext for authentication
    if (!this.state.signingKey.cryptoPrivateKey) {
      this.state.signingKey.cryptoPrivateKey = await importSigningPrivateKey(
        this.state.signingKey.privateKey,
        this.state.signingKey.publicKey,
      );
    }

    const dataToSign = concat(
      new Uint8Array(new Uint32Array([this.state.keyId]).buffer),
      new Uint8Array(new Uint32Array([this.state.chainIteration]).buffer),
      nonce,
      ciphertext,
    );
    const signature = await sign(
      dataToSign,
      this.state.signingKey.cryptoPrivateKey,
    );

    const message: SenderKeyEncryptedMessage = {
      keyId: this.state.keyId,
      chainIteration: this.state.chainIteration,
      ciphertext,
      nonce,
      signature,
      groupId: this.state.groupId,
      senderUserId: this.state.userId,
      senderDeviceId: this.state.deviceId,
    };

    // Update chain state
    secureWipe(this.state.chainKey);
    this.state.chainKey = newChainKey;
    this.state.chainIteration++;
    this.state.lastUsedAt = Date.now();

    // Wipe message key
    secureWipe(messageKey);

    logger.debug("Message encrypted with sender key", {
      keyId: this.state.keyId,
      iteration: this.state.chainIteration - 1,
    });

    return message;
  }

  /**
   * Serializes state for storage
   */
  serializeState(): SerializedSenderKeyState | null {
    if (!this.state) return null;

    return {
      keyId: this.state.keyId,
      chainKey: bytesToBase64(this.state.chainKey),
      chainIteration: this.state.chainIteration,
      signingKey: {
        publicKey: bytesToBase64(this.state.signingKey.publicKey),
        privateKey: bytesToBase64(this.state.signingKey.privateKey),
      },
      groupId: this.state.groupId,
      userId: this.state.userId,
      deviceId: this.state.deviceId,
      createdAt: this.state.createdAt,
      lastUsedAt: this.state.lastUsedAt,
    };
  }

  /**
   * Deserializes state from storage
   */
  async deserializeState(serialized: SerializedSenderKeyState): Promise<void> {
    const publicKey = base64ToBytes(serialized.signingKey.publicKey);
    const privateKey = base64ToBytes(serialized.signingKey.privateKey);

    this.state = {
      keyId: serialized.keyId,
      chainKey: base64ToBytes(serialized.chainKey),
      chainIteration: serialized.chainIteration,
      signingKey: {
        publicKey,
        privateKey,
        cryptoPublicKey: await importSigningPublicKey(publicKey),
        cryptoPrivateKey: await importSigningPrivateKey(privateKey, publicKey),
      },
      groupId: serialized.groupId,
      userId: serialized.userId,
      deviceId: serialized.deviceId,
      createdAt: serialized.createdAt,
      lastUsedAt: serialized.lastUsedAt,
    };

    logger.debug("Sender key state deserialized", { keyId: this.state.keyId });
  }

  /**
   * Destroys the sender key and wipes all key material
   */
  destroy(): void {
    if (this.state) {
      secureWipe(this.state.chainKey);
      secureWipe(this.state.signingKey.privateKey);
      this.state = null;
    }
    logger.debug("Sender key destroyed");
  }
}

// ============================================================================
// Sender Key Receiver
// ============================================================================

/**
 * Manages received sender keys for decrypting group messages
 */
export class SenderKeyReceiver {
  private storedKeys: Map<string, StoredSenderKey> = new Map();
  private maxSkippedKeys = 100;

  /**
   * Gets the map key for a sender key
   */
  private getMapKey(
    groupId: string,
    userId: string,
    deviceId: string,
    keyId: number,
  ): string {
    return `${groupId}:${userId}:${deviceId}:${keyId}`;
  }

  /**
   * Processes a sender key distribution message
   */
  async processSenderKeyDistribution(
    message: SenderKeyDistributionMessage,
  ): Promise<void> {
    const mapKey = this.getMapKey(
      message.groupId,
      message.senderUserId,
      message.senderDeviceId,
      message.keyId,
    );

    // Check if we already have this key
    if (this.storedKeys.has(mapKey)) {
      logger.debug("Sender key already stored", { keyId: message.keyId });
      return;
    }

    const storedKey: StoredSenderKey = {
      keyId: message.keyId,
      chainKey: message.chainKey.slice(),
      chainIteration: message.chainIteration,
      signingPublicKey: message.signingPublicKey,
      skippedMessageKeys: new Map(),
      groupId: message.groupId,
      senderUserId: message.senderUserId,
      senderDeviceId: message.senderDeviceId,
      receivedAt: Date.now(),
    };

    this.storedKeys.set(mapKey, storedKey);

    logger.debug("Sender key distribution processed", {
      keyId: message.keyId,
      groupId: message.groupId,
      senderUserId: message.senderUserId,
    });
  }

  /**
   * Checks if we have a sender key for a specific sender
   */
  hasSenderKey(
    groupId: string,
    userId: string,
    deviceId: string,
    keyId: number,
  ): boolean {
    const mapKey = this.getMapKey(groupId, userId, deviceId, keyId);
    return this.storedKeys.has(mapKey);
  }

  /**
   * Gets all stored sender keys for a group
   */
  getSenderKeysForGroup(groupId: string): StoredSenderKey[] {
    const keys: StoredSenderKey[] = [];
    for (const key of this.storedKeys.values()) {
      if (key.groupId === groupId) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Decrypts a message using the appropriate sender key
   */
  async decrypt(message: SenderKeyEncryptedMessage): Promise<Uint8Array> {
    const mapKey = this.getMapKey(
      message.groupId,
      message.senderUserId,
      message.senderDeviceId,
      message.keyId,
    );

    const storedKey = this.storedKeys.get(mapKey);
    if (!storedKey) {
      throw new Error(
        `Sender key not found for ${message.senderUserId}:${message.senderDeviceId} key ${message.keyId}`,
      );
    }

    // Verify signature first
    const signingPublicKey = await importSigningPublicKey(
      storedKey.signingPublicKey,
    );
    const dataToVerify = concat(
      new Uint8Array(new Uint32Array([message.keyId]).buffer),
      new Uint8Array(new Uint32Array([message.chainIteration]).buffer),
      message.nonce,
      message.ciphertext,
    );

    const isValid = await verify(
      dataToVerify,
      message.signature,
      signingPublicKey,
    );
    if (!isValid) {
      throw new Error("Invalid sender key signature");
    }

    // Check if we have a skipped message key
    const skippedKey = storedKey.skippedMessageKeys.get(message.chainIteration);
    if (skippedKey) {
      const associatedData = new TextEncoder().encode(
        `${message.groupId}:${message.senderUserId}:${message.senderDeviceId}:${message.keyId}:${message.chainIteration}`,
      );

      const plaintext = await aesGcmDecrypt(
        message.ciphertext,
        skippedKey,
        message.nonce,
        associatedData,
      );

      // Remove used skipped key
      storedKey.skippedMessageKeys.delete(message.chainIteration);
      secureWipe(skippedKey);

      return plaintext;
    }

    // Check if message is from the future
    if (message.chainIteration > storedKey.chainIteration) {
      // Skip to the message iteration
      await this.skipToIteration(storedKey, message.chainIteration);
    } else if (message.chainIteration < storedKey.chainIteration) {
      throw new Error(
        `Message iteration ${message.chainIteration} is behind current ${storedKey.chainIteration} and no skipped key found`,
      );
    }

    // Derive message key
    const { newChainKey, messageKey } = await deriveMessageKey(
      storedKey.chainKey,
    );

    // Create associated data
    const associatedData = new TextEncoder().encode(
      `${message.groupId}:${message.senderUserId}:${message.senderDeviceId}:${message.keyId}:${message.chainIteration}`,
    );

    // Decrypt
    const plaintext = await aesGcmDecrypt(
      message.ciphertext,
      messageKey,
      message.nonce,
      associatedData,
    );

    // Update chain state
    secureWipe(storedKey.chainKey);
    storedKey.chainKey = newChainKey;
    storedKey.chainIteration++;

    // Wipe message key
    secureWipe(messageKey);

    logger.debug("Message decrypted with sender key", {
      keyId: message.keyId,
      iteration: message.chainIteration,
    });

    return plaintext;
  }

  /**
   * Skips to a specific chain iteration, storing skipped keys
   */
  private async skipToIteration(
    storedKey: StoredSenderKey,
    targetIteration: number,
  ): Promise<void> {
    const skipsNeeded = targetIteration - storedKey.chainIteration;

    if (skipsNeeded > this.maxSkippedKeys) {
      throw new Error(`Too many skipped messages: ${skipsNeeded}`);
    }

    while (storedKey.chainIteration < targetIteration) {
      const { newChainKey, messageKey } = await deriveMessageKey(
        storedKey.chainKey,
      );

      // Store skipped key
      storedKey.skippedMessageKeys.set(storedKey.chainIteration, messageKey);

      // Update chain
      secureWipe(storedKey.chainKey);
      storedKey.chainKey = newChainKey;
      storedKey.chainIteration++;
    }

    // Trim old skipped keys if we have too many
    this.trimSkippedKeys(storedKey);
  }

  /**
   * Trims old skipped keys to prevent memory bloat
   */
  private trimSkippedKeys(storedKey: StoredSenderKey): void {
    if (storedKey.skippedMessageKeys.size <= this.maxSkippedKeys) {
      return;
    }

    // Sort keys by iteration and remove oldest
    const iterations = Array.from(storedKey.skippedMessageKeys.keys()).sort(
      (a, b) => a - b,
    );
    const toRemove = iterations.slice(
      0,
      iterations.length - this.maxSkippedKeys,
    );

    for (const iteration of toRemove) {
      const key = storedKey.skippedMessageKeys.get(iteration);
      if (key) {
        secureWipe(key);
        storedKey.skippedMessageKeys.delete(iteration);
      }
    }
  }

  /**
   * Removes all sender keys for a specific sender in a group
   */
  removeSenderKeys(groupId: string, userId: string, deviceId: string): void {
    const keysToRemove: string[] = [];

    for (const [mapKey, storedKey] of this.storedKeys) {
      if (
        storedKey.groupId === groupId &&
        storedKey.senderUserId === userId &&
        storedKey.senderDeviceId === deviceId
      ) {
        secureWipe(storedKey.chainKey);
        for (const key of storedKey.skippedMessageKeys.values()) {
          secureWipe(key);
        }
        keysToRemove.push(mapKey);
      }
    }

    for (const mapKey of keysToRemove) {
      this.storedKeys.delete(mapKey);
    }

    logger.debug("Sender keys removed", {
      groupId,
      userId,
      deviceId,
      count: keysToRemove.length,
    });
  }

  /**
   * Removes all sender keys for a group
   */
  removeGroupKeys(groupId: string): void {
    const keysToRemove: string[] = [];

    for (const [mapKey, storedKey] of this.storedKeys) {
      if (storedKey.groupId === groupId) {
        secureWipe(storedKey.chainKey);
        for (const key of storedKey.skippedMessageKeys.values()) {
          secureWipe(key);
        }
        keysToRemove.push(mapKey);
      }
    }

    for (const mapKey of keysToRemove) {
      this.storedKeys.delete(mapKey);
    }

    logger.debug("Group sender keys removed", {
      groupId,
      count: keysToRemove.length,
    });
  }

  /**
   * Serializes all stored keys
   */
  serializeState(): SerializedStoredSenderKey[] {
    const serialized: SerializedStoredSenderKey[] = [];

    for (const storedKey of this.storedKeys.values()) {
      const skippedMessageKeys: Array<{ iteration: number; key: string }> = [];
      for (const [iteration, key] of storedKey.skippedMessageKeys) {
        skippedMessageKeys.push({ iteration, key: bytesToBase64(key) });
      }

      serialized.push({
        keyId: storedKey.keyId,
        chainKey: bytesToBase64(storedKey.chainKey),
        chainIteration: storedKey.chainIteration,
        signingPublicKey: bytesToBase64(storedKey.signingPublicKey),
        skippedMessageKeys,
        groupId: storedKey.groupId,
        senderUserId: storedKey.senderUserId,
        senderDeviceId: storedKey.senderDeviceId,
        receivedAt: storedKey.receivedAt,
      });
    }

    return serialized;
  }

  /**
   * Deserializes stored keys
   */
  deserializeState(serialized: SerializedStoredSenderKey[]): void {
    this.storedKeys.clear();

    for (const s of serialized) {
      const skippedMessageKeys = new Map<number, Uint8Array>();
      for (const { iteration, key } of s.skippedMessageKeys) {
        skippedMessageKeys.set(iteration, base64ToBytes(key));
      }

      const storedKey: StoredSenderKey = {
        keyId: s.keyId,
        chainKey: base64ToBytes(s.chainKey),
        chainIteration: s.chainIteration,
        signingPublicKey: base64ToBytes(s.signingPublicKey),
        skippedMessageKeys,
        groupId: s.groupId,
        senderUserId: s.senderUserId,
        senderDeviceId: s.senderDeviceId,
        receivedAt: s.receivedAt,
      };

      const mapKey = this.getMapKey(
        s.groupId,
        s.senderUserId,
        s.senderDeviceId,
        s.keyId,
      );
      this.storedKeys.set(mapKey, storedKey);
    }

    logger.debug("Sender key receiver state deserialized", {
      keyCount: this.storedKeys.size,
    });
  }

  /**
   * Destroys all stored keys
   */
  destroy(): void {
    for (const storedKey of this.storedKeys.values()) {
      secureWipe(storedKey.chainKey);
      for (const key of storedKey.skippedMessageKeys.values()) {
        secureWipe(key);
      }
    }
    this.storedKeys.clear();
    logger.debug("Sender key receiver destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new sender key for a group
 */
export async function createSenderKey(
  groupId: string,
  userId: string,
  deviceId: string,
): Promise<SenderKey> {
  const senderKey = new SenderKey();
  await senderKey.generate(groupId, userId, deviceId);
  return senderKey;
}

/**
 * Creates a sender key receiver
 */
export function createSenderKeyReceiver(): SenderKeyReceiver {
  return new SenderKeyReceiver();
}

// ============================================================================
// Exports
// ============================================================================

export default SenderKey;
