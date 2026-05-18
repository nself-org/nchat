/**
 * Double Ratchet Algorithm Implementation
 *
 * Implements the Double Ratchet Algorithm for forward-secure end-to-end
 * encryption. Provides perfect forward secrecy and break-in recovery.
 *
 * Based on Signal's Double Ratchet specification:
 * https://signal.org/docs/specifications/doubleratchet/
 *
 * Uses Web Crypto API for all cryptographic operations.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

/** ECDH curve for ratchet key pairs */
const ECDH_CURVE = "P-256";

/** HKDF hash algorithm */
const HKDF_HASH = "SHA-256";

/** AES-GCM key length in bits */
const AES_KEY_LENGTH = 256;

/** AES-GCM IV length in bytes */
const AES_IV_LENGTH = 12;

/** AES-GCM auth tag length in bits */
const AES_TAG_LENGTH = 128;

/** Maximum skipped message keys to store */
const MAX_SKIP = 1000;

/** KDF chain info string */
const CHAIN_KEY_INFO = "nchat-chain-v1";

/** Root key info string */
const ROOT_KEY_INFO = "nchat-root-v1";

/** Message key info string */
const MESSAGE_KEY_INFO = "nchat-msg-v1";

// ============================================================================
// Types
// ============================================================================

/**
 * Ratchet key pair for DH operations
 */
export interface RatchetKeyPair {
  /** Public key as raw bytes */
  publicKey: Uint8Array;
  /** Private key as raw bytes */
  privateKey: Uint8Array;
  /** CryptoKey for operations */
  cryptoPublicKey?: CryptoKey;
  /** CryptoKey for operations */
  cryptoPrivateKey?: CryptoKey;
}

/**
 * Message header containing ratchet state info
 */
export interface MessageHeader {
  /** Sender's current ratchet public key */
  publicKey: Uint8Array;
  /** Previous chain message count */
  previousCounter: number;
  /** Current message number in chain */
  messageNumber: number;
}

/**
 * Encrypted message with header and ciphertext
 */
export interface EncryptedMessage {
  /** Message header (can be public) */
  header: MessageHeader;
  /** Encrypted message content */
  ciphertext: Uint8Array;
  /** Nonce/IV used for encryption */
  nonce: Uint8Array;
}

/**
 * Skipped message key for out-of-order messages
 */
export interface SkippedMessageKey {
  /** Ratchet public key that was active */
  publicKey: Uint8Array;
  /** Message number this key is for */
  messageNumber: number;
  /** The message key */
  messageKey: Uint8Array;
  /** When this key was stored */
  timestamp: number;
}

/**
 * Chain state for symmetric ratchet
 */
export interface ChainState {
  /** Current chain key */
  chainKey: Uint8Array;
  /** Message counter */
  messageNumber: number;
}

/**
 * Complete ratchet session state
 */
export interface RatchetState {
  /** Root key for deriving chain keys */
  rootKey: Uint8Array;
  /** Our current ratchet key pair */
  sendingRatchetKey: RatchetKeyPair | null;
  /** Their current ratchet public key */
  receivingRatchetKey: Uint8Array | null;
  /** Sending chain state */
  sendingChain: ChainState | null;
  /** Receiving chain state */
  receivingChain: ChainState | null;
  /** Previous sending chain length */
  previousSendingChainLength: number;
  /** Skipped message keys for out-of-order delivery */
  skippedMessageKeys: SkippedMessageKey[];
  /** Whether we've sent a message yet */
  hasSentMessage: boolean;
}

/**
 * Configuration for Double Ratchet
 */
export interface DoubleRatchetConfig {
  /** Maximum number of skipped keys to store */
  maxSkip: number;
  /** Associated data for AEAD */
  associatedData?: Uint8Array;
}

/**
 * Serialized state for storage
 */
export interface SerializedRatchetState {
  rootKey: string;
  sendingRatchetKey: { publicKey: string; privateKey: string } | null;
  receivingRatchetKey: string | null;
  sendingChain: { chainKey: string; messageNumber: number } | null;
  receivingChain: { chainKey: string; messageNumber: number } | null;
  previousSendingChainLength: number;
  skippedMessageKeys: Array<{
    publicKey: string;
    messageNumber: number;
    messageKey: string;
    timestamp: number;
  }>;
  hasSentMessage: boolean;
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
 * Constant-time comparison
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
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
 * Bytes to Base64URL
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Base64URL to bytes
 */
function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return base64ToBytes(base64);
}

/**
 * Securely wipe data from memory
 */
function secureWipe(data: Uint8Array): void {
  crypto.getRandomValues(data);
  data.fill(0);
}

// ============================================================================
// Cryptographic Primitives
// ============================================================================

/**
 * Generates a new ratchet key pair
 */
async function generateRatchetKeyPair(): Promise<RatchetKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    ["deriveBits", "deriveKey"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  const privateKeyD = privateKeyJwk.d;
  if (!privateKeyD) {
    throw new Error("Failed to export private key");
  }

  return {
    publicKey: toUint8Array(publicKeyRaw),
    privateKey: base64UrlToBytes(privateKeyD),
    cryptoPublicKey: keyPair.publicKey,
    cryptoPrivateKey: keyPair.privateKey,
  };
}

/**
 * Imports a public key from raw bytes
 */
async function importPublicKey(publicKeyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    publicKeyBytes as unknown as ArrayBuffer,
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    [],
  );
}

/**
 * Imports a private key from raw bytes
 */
async function importPrivateKey(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: ECDH_CURVE,
    d: bytesToBase64Url(privateKeyBytes),
    x: bytesToBase64Url(publicKeyBytes.slice(1, 33)),
    y: bytesToBase64Url(publicKeyBytes.slice(33, 65)),
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    ["deriveBits", "deriveKey"],
  );
}

/**
 * Performs ECDH key agreement
 */
async function ecdhDeriveBits(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<Uint8Array> {
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256,
  );

  return toUint8Array(sharedBits);
}

/**
 * HKDF key derivation
 */
async function hkdfDerive(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const ikm = await crypto.subtle.importKey(
    "raw",
    inputKeyMaterial as unknown as ArrayBuffer,
    "HKDF",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt: salt as unknown as ArrayBuffer,
      info: info as unknown as ArrayBuffer,
    },
    ikm,
    length * 8,
  );

  return toUint8Array(derived);
}

/**
 * KDF for root key derivation (DH ratchet step)
 * Returns (new_root_key, chain_key)
 */
async function kdfRootKey(
  rootKey: Uint8Array,
  dhOutput: Uint8Array,
): Promise<[Uint8Array, Uint8Array]> {
  const info = new TextEncoder().encode(ROOT_KEY_INFO);
  const output = await hkdfDerive(dhOutput, rootKey, info, 64);

  return [output.slice(0, 32), output.slice(32, 64)];
}

/**
 * KDF for chain key derivation (symmetric ratchet step)
 * Returns (new_chain_key, message_key)
 */
async function kdfChainKey(
  chainKey: Uint8Array,
): Promise<[Uint8Array, Uint8Array]> {
  // Use constant inputs for deriving the two keys
  const chainConstant = new Uint8Array([0x01]);
  const messageConstant = new Uint8Array([0x02]);

  // Import chain key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    chainKey as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Derive new chain key
  const newChainKeyBuf = await crypto.subtle.sign("HMAC", key, chainConstant);
  const newChainKey = toUint8Array(newChainKeyBuf);

  // Derive message key
  const messageKeyBuf = await crypto.subtle.sign("HMAC", key, messageConstant);
  const messageKey = toUint8Array(messageKeyBuf);

  return [newChainKey, messageKey];
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

/**
 * Encrypts a message header (optional, for header encryption)
 */
async function encryptHeader(
  header: MessageHeader,
  headerKey: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const headerBytes = encodeHeader(header);
  return aesGcmEncrypt(headerBytes, headerKey);
}

/**
 * Decrypts a message header
 */
async function decryptHeader(
  encryptedHeader: Uint8Array,
  nonce: Uint8Array,
  headerKey: Uint8Array,
): Promise<MessageHeader> {
  const decrypted = await aesGcmDecrypt(encryptedHeader, headerKey, nonce);
  return decodeHeader(decrypted);
}

/**
 * Encodes a message header to bytes
 */
function encodeHeader(header: MessageHeader): Uint8Array {
  // Format: publicKey (65 bytes) + previousCounter (4 bytes) + messageNumber (4 bytes)
  const buffer = new Uint8Array(header.publicKey.length + 8);
  buffer.set(header.publicKey, 0);
  const view = new DataView(buffer.buffer);
  view.setUint32(header.publicKey.length, header.previousCounter, false);
  view.setUint32(header.publicKey.length + 4, header.messageNumber, false);
  return buffer;
}

/**
 * Decodes a message header from bytes
 */
function decodeHeader(bytes: Uint8Array): MessageHeader {
  // Assuming P-256 uncompressed public key (65 bytes)
  const publicKeyLength = 65;
  const publicKey = bytes.slice(0, publicKeyLength);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const previousCounter = view.getUint32(publicKeyLength, false);
  const messageNumber = view.getUint32(publicKeyLength + 4, false);

  return {
    publicKey,
    previousCounter,
    messageNumber,
  };
}

// ============================================================================
// Double Ratchet Class
// ============================================================================

/**
 * Double Ratchet implementation for forward-secure messaging
 */
export class DoubleRatchet {
  private state: RatchetState;
  private config: DoubleRatchetConfig;
  private initialized = false;

  constructor(config?: Partial<DoubleRatchetConfig>) {
    this.config = {
      maxSkip: config?.maxSkip ?? MAX_SKIP,
      associatedData: config?.associatedData,
    };

    this.state = {
      rootKey: new Uint8Array(0),
      sendingRatchetKey: null,
      receivingRatchetKey: null,
      sendingChain: null,
      receivingChain: null,
      previousSendingChainLength: 0,
      skippedMessageKeys: [],
      hasSentMessage: false,
    };
  }

  /**
   * Initializes as session initiator (Alice)
   * Called after X3DH key agreement
   */
  async initializeAsInitiator(
    sharedSecret: Uint8Array,
    remoteRatchetPublicKey: Uint8Array,
  ): Promise<void> {
    // Generate our first ratchet key pair
    const sendingRatchetKey = await generateRatchetKeyPair();

    // Perform first DH ratchet step
    const remotePublicCrypto = await importPublicKey(remoteRatchetPublicKey);
    if (!sendingRatchetKey.cryptoPrivateKey) {
      sendingRatchetKey.cryptoPrivateKey = await importPrivateKey(
        sendingRatchetKey.privateKey,
        sendingRatchetKey.publicKey,
      );
    }

    const dhOutput = await ecdhDeriveBits(
      sendingRatchetKey.cryptoPrivateKey,
      remotePublicCrypto,
    );

    // Derive root key and sending chain key
    const [rootKey, sendingChainKey] = await kdfRootKey(sharedSecret, dhOutput);

    this.state = {
      rootKey,
      sendingRatchetKey,
      receivingRatchetKey: remoteRatchetPublicKey,
      sendingChain: {
        chainKey: sendingChainKey,
        messageNumber: 0,
      },
      receivingChain: null,
      previousSendingChainLength: 0,
      skippedMessageKeys: [],
      hasSentMessage: false,
    };

    this.initialized = true;

    logger.debug("Double Ratchet initialized as initiator");
  }

  /**
   * Initializes as session responder (Bob)
   * Called after X3DH key agreement
   */
  async initializeAsResponder(
    sharedSecret: Uint8Array,
    ownRatchetKeyPair: RatchetKeyPair,
  ): Promise<void> {
    this.state = {
      rootKey: sharedSecret,
      sendingRatchetKey: ownRatchetKeyPair,
      receivingRatchetKey: null,
      sendingChain: null,
      receivingChain: null,
      previousSendingChainLength: 0,
      skippedMessageKeys: [],
      hasSentMessage: false,
    };

    this.initialized = true;

    logger.debug("Double Ratchet initialized as responder");
  }

  /**
   * Checks if ratchet is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets the current sending ratchet public key
   */
  getSendingRatchetPublicKey(): Uint8Array | null {
    return this.state.sendingRatchetKey?.publicKey ?? null;
  }

  /**
   * Encrypts a message
   */
  async encrypt(plaintext: Uint8Array): Promise<EncryptedMessage> {
    if (!this.initialized) {
      throw new Error("Double Ratchet not initialized");
    }

    // Ensure we have a sending chain
    if (!this.state.sendingChain) {
      // This shouldn't happen for initiator but handles edge cases
      throw new Error("No sending chain available");
    }

    if (!this.state.sendingRatchetKey) {
      throw new Error("No sending ratchet key");
    }

    // Derive message key from chain
    const [newChainKey, messageKey] = await kdfChainKey(
      this.state.sendingChain.chainKey,
    );

    // Create message header
    const header: MessageHeader = {
      publicKey: this.state.sendingRatchetKey.publicKey,
      previousCounter: this.state.previousSendingChainLength,
      messageNumber: this.state.sendingChain.messageNumber,
    };

    // Encrypt the message
    const { ciphertext, nonce } = await aesGcmEncrypt(
      plaintext,
      messageKey,
      this.config.associatedData,
    );

    // Update chain state
    secureWipe(this.state.sendingChain.chainKey);
    this.state.sendingChain.chainKey = newChainKey;
    this.state.sendingChain.messageNumber++;
    this.state.hasSentMessage = true;

    // Wipe message key
    secureWipe(messageKey);

    logger.debug("Message encrypted", {
      messageNumber: header.messageNumber,
      previousCounter: header.previousCounter,
    });

    return {
      header,
      ciphertext,
      nonce,
    };
  }

  /**
   * Decrypts a message
   */
  async decrypt(encryptedMessage: EncryptedMessage): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error("Double Ratchet not initialized");
    }

    const { header, ciphertext, nonce } = encryptedMessage;

    // Try to find a skipped message key first
    const skippedKey = this.findSkippedMessageKey(
      header.publicKey,
      header.messageNumber,
    );
    if (skippedKey) {
      const plaintext = await aesGcmDecrypt(
        ciphertext,
        skippedKey,
        nonce,
        this.config.associatedData,
      );
      this.removeSkippedMessageKey(header.publicKey, header.messageNumber);
      secureWipe(skippedKey);
      return plaintext;
    }

    // Check if we need to perform a DH ratchet step
    if (
      !constantTimeEqual(
        header.publicKey,
        this.state.receivingRatchetKey ?? new Uint8Array(0),
      )
    ) {
      // Store any skipped message keys from current receiving chain
      await this.skipMessageKeys(header.previousCounter);

      // Perform DH ratchet step
      await this.dhRatchetStep(header.publicKey);
    }

    // Store any skipped message keys
    await this.skipMessageKeys(header.messageNumber);

    // Derive message key
    if (!this.state.receivingChain) {
      throw new Error("No receiving chain available");
    }

    const [newChainKey, messageKey] = await kdfChainKey(
      this.state.receivingChain.chainKey,
    );

    // Decrypt message
    const plaintext = await aesGcmDecrypt(
      ciphertext,
      messageKey,
      nonce,
      this.config.associatedData,
    );

    // Update chain state
    secureWipe(this.state.receivingChain.chainKey);
    this.state.receivingChain.chainKey = newChainKey;
    this.state.receivingChain.messageNumber++;

    // Wipe message key
    secureWipe(messageKey);

    logger.debug("Message decrypted", {
      messageNumber: header.messageNumber,
    });

    return plaintext;
  }

  /**
   * Performs a DH ratchet step (when receiving new ratchet key)
   */
  private async dhRatchetStep(newRemotePublicKey: Uint8Array): Promise<void> {
    // Save current sending chain length
    this.state.previousSendingChainLength =
      this.state.sendingChain?.messageNumber ?? 0;

    // Update receiving ratchet key
    this.state.receivingRatchetKey = newRemotePublicKey;
    const remotePublicCrypto = await importPublicKey(newRemotePublicKey);

    // Derive receiving chain key
    if (!this.state.sendingRatchetKey?.cryptoPrivateKey) {
      if (this.state.sendingRatchetKey) {
        this.state.sendingRatchetKey.cryptoPrivateKey = await importPrivateKey(
          this.state.sendingRatchetKey.privateKey,
          this.state.sendingRatchetKey.publicKey,
        );
      } else {
        throw new Error("No sending ratchet key");
      }
    }

    const dhOutput1 = await ecdhDeriveBits(
      this.state.sendingRatchetKey.cryptoPrivateKey,
      remotePublicCrypto,
    );
    const [rootKey1, receivingChainKey] = await kdfRootKey(
      this.state.rootKey,
      dhOutput1,
    );

    // Wipe old root key
    secureWipe(this.state.rootKey);
    this.state.rootKey = rootKey1;

    // Set receiving chain
    if (this.state.receivingChain) {
      secureWipe(this.state.receivingChain.chainKey);
    }
    this.state.receivingChain = {
      chainKey: receivingChainKey,
      messageNumber: 0,
    };

    // Generate new sending ratchet key pair
    const newSendingRatchetKey = await generateRatchetKeyPair();
    if (!newSendingRatchetKey.cryptoPrivateKey) {
      newSendingRatchetKey.cryptoPrivateKey = await importPrivateKey(
        newSendingRatchetKey.privateKey,
        newSendingRatchetKey.publicKey,
      );
    }

    // Derive new sending chain key
    const dhOutput2 = await ecdhDeriveBits(
      newSendingRatchetKey.cryptoPrivateKey,
      remotePublicCrypto,
    );
    const [rootKey2, sendingChainKey] = await kdfRootKey(
      this.state.rootKey,
      dhOutput2,
    );

    // Wipe old keys
    secureWipe(this.state.rootKey);
    if (this.state.sendingRatchetKey) {
      secureWipe(this.state.sendingRatchetKey.privateKey);
    }
    if (this.state.sendingChain) {
      secureWipe(this.state.sendingChain.chainKey);
    }

    // Update state
    this.state.rootKey = rootKey2;
    this.state.sendingRatchetKey = newSendingRatchetKey;
    this.state.sendingChain = {
      chainKey: sendingChainKey,
      messageNumber: 0,
    };

    logger.debug("DH ratchet step completed");
  }

  /**
   * Skips message keys up to a certain number
   */
  private async skipMessageKeys(until: number): Promise<void> {
    if (!this.state.receivingChain) {
      return;
    }

    if (until - this.state.receivingChain.messageNumber > this.config.maxSkip) {
      throw new Error("Too many skipped messages");
    }

    while (this.state.receivingChain.messageNumber < until) {
      const [newChainKey, messageKey] = await kdfChainKey(
        this.state.receivingChain.chainKey,
      );

      // Store skipped key
      this.state.skippedMessageKeys.push({
        publicKey: this.state.receivingRatchetKey!,
        messageNumber: this.state.receivingChain.messageNumber,
        messageKey,
        timestamp: Date.now(),
      });

      // Update chain
      secureWipe(this.state.receivingChain.chainKey);
      this.state.receivingChain.chainKey = newChainKey;
      this.state.receivingChain.messageNumber++;
    }

    // Trim old skipped keys
    this.trimSkippedMessageKeys();
  }

  /**
   * Finds a skipped message key
   */
  private findSkippedMessageKey(
    publicKey: Uint8Array,
    messageNumber: number,
  ): Uint8Array | null {
    for (const skipped of this.state.skippedMessageKeys) {
      if (
        constantTimeEqual(skipped.publicKey, publicKey) &&
        skipped.messageNumber === messageNumber
      ) {
        return skipped.messageKey;
      }
    }
    return null;
  }

  /**
   * Removes a skipped message key after use
   */
  private removeSkippedMessageKey(
    publicKey: Uint8Array,
    messageNumber: number,
  ): void {
    const index = this.state.skippedMessageKeys.findIndex(
      (k) =>
        constantTimeEqual(k.publicKey, publicKey) &&
        k.messageNumber === messageNumber,
    );
    if (index >= 0) {
      secureWipe(this.state.skippedMessageKeys[index].messageKey);
      this.state.skippedMessageKeys.splice(index, 1);
    }
  }

  /**
   * Trims old skipped message keys
   */
  private trimSkippedMessageKeys(): void {
    // Remove keys older than 1 hour or if we have too many
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.state.skippedMessageKeys = this.state.skippedMessageKeys.filter(
      (k) => {
        if (k.timestamp < oneHourAgo) {
          secureWipe(k.messageKey);
          return false;
        }
        return true;
      },
    );

    // Keep only the most recent keys if still too many
    while (this.state.skippedMessageKeys.length > this.config.maxSkip) {
      const oldest = this.state.skippedMessageKeys.shift();
      if (oldest) {
        secureWipe(oldest.messageKey);
      }
    }
  }

  /**
   * Gets the number of skipped message keys
   */
  getSkippedMessageKeyCount(): number {
    return this.state.skippedMessageKeys.length;
  }

  /**
   * Serializes state for storage
   */
  serializeState(): SerializedRatchetState {
    return {
      rootKey: bytesToBase64(this.state.rootKey),
      sendingRatchetKey: this.state.sendingRatchetKey
        ? {
            publicKey: bytesToBase64(this.state.sendingRatchetKey.publicKey),
            privateKey: bytesToBase64(this.state.sendingRatchetKey.privateKey),
          }
        : null,
      receivingRatchetKey: this.state.receivingRatchetKey
        ? bytesToBase64(this.state.receivingRatchetKey)
        : null,
      sendingChain: this.state.sendingChain
        ? {
            chainKey: bytesToBase64(this.state.sendingChain.chainKey),
            messageNumber: this.state.sendingChain.messageNumber,
          }
        : null,
      receivingChain: this.state.receivingChain
        ? {
            chainKey: bytesToBase64(this.state.receivingChain.chainKey),
            messageNumber: this.state.receivingChain.messageNumber,
          }
        : null,
      previousSendingChainLength: this.state.previousSendingChainLength,
      skippedMessageKeys: this.state.skippedMessageKeys.map((k) => ({
        publicKey: bytesToBase64(k.publicKey),
        messageNumber: k.messageNumber,
        messageKey: bytesToBase64(k.messageKey),
        timestamp: k.timestamp,
      })),
      hasSentMessage: this.state.hasSentMessage,
    };
  }

  /**
   * Deserializes state from storage
   */
  async deserializeState(serialized: SerializedRatchetState): Promise<void> {
    this.state.rootKey = base64ToBytes(serialized.rootKey);

    if (serialized.sendingRatchetKey) {
      const publicKey = base64ToBytes(serialized.sendingRatchetKey.publicKey);
      const privateKey = base64ToBytes(serialized.sendingRatchetKey.privateKey);
      this.state.sendingRatchetKey = {
        publicKey,
        privateKey,
        cryptoPublicKey: await importPublicKey(publicKey),
        cryptoPrivateKey: await importPrivateKey(privateKey, publicKey),
      };
    } else {
      this.state.sendingRatchetKey = null;
    }

    this.state.receivingRatchetKey = serialized.receivingRatchetKey
      ? base64ToBytes(serialized.receivingRatchetKey)
      : null;

    this.state.sendingChain = serialized.sendingChain
      ? {
          chainKey: base64ToBytes(serialized.sendingChain.chainKey),
          messageNumber: serialized.sendingChain.messageNumber,
        }
      : null;

    this.state.receivingChain = serialized.receivingChain
      ? {
          chainKey: base64ToBytes(serialized.receivingChain.chainKey),
          messageNumber: serialized.receivingChain.messageNumber,
        }
      : null;

    this.state.previousSendingChainLength =
      serialized.previousSendingChainLength;

    this.state.skippedMessageKeys = serialized.skippedMessageKeys.map((k) => ({
      publicKey: base64ToBytes(k.publicKey),
      messageNumber: k.messageNumber,
      messageKey: base64ToBytes(k.messageKey),
      timestamp: k.timestamp,
    }));

    this.state.hasSentMessage = serialized.hasSentMessage;
    this.initialized = true;

    logger.debug("Double Ratchet state deserialized");
  }

  /**
   * Destroys the ratchet and wipes all key material
   */
  destroy(): void {
    secureWipe(this.state.rootKey);

    if (this.state.sendingRatchetKey) {
      secureWipe(this.state.sendingRatchetKey.privateKey);
    }

    if (this.state.sendingChain) {
      secureWipe(this.state.sendingChain.chainKey);
    }

    if (this.state.receivingChain) {
      secureWipe(this.state.receivingChain.chainKey);
    }

    for (const skipped of this.state.skippedMessageKeys) {
      secureWipe(skipped.messageKey);
    }

    this.state = {
      rootKey: new Uint8Array(0),
      sendingRatchetKey: null,
      receivingRatchetKey: null,
      sendingChain: null,
      receivingChain: null,
      previousSendingChainLength: 0,
      skippedMessageKeys: [],
      hasSentMessage: false,
    };

    this.initialized = false;

    logger.debug("Double Ratchet destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a Double Ratchet session for the initiator (Alice)
 */
export async function createInitiatorRatchet(
  sharedSecret: Uint8Array,
  remoteRatchetPublicKey: Uint8Array,
  config?: Partial<DoubleRatchetConfig>,
): Promise<DoubleRatchet> {
  const ratchet = new DoubleRatchet(config);
  await ratchet.initializeAsInitiator(sharedSecret, remoteRatchetPublicKey);
  return ratchet;
}

/**
 * Creates a Double Ratchet session for the responder (Bob)
 */
export async function createResponderRatchet(
  sharedSecret: Uint8Array,
  ownRatchetKeyPair: RatchetKeyPair,
  config?: Partial<DoubleRatchetConfig>,
): Promise<DoubleRatchet> {
  const ratchet = new DoubleRatchet(config);
  await ratchet.initializeAsResponder(sharedSecret, ownRatchetKeyPair);
  return ratchet;
}

/**
 * Generates a ratchet key pair
 */
export async function generateRatchetKey(): Promise<RatchetKeyPair> {
  return generateRatchetKeyPair();
}

// ============================================================================
// Message Encoding/Decoding
// ============================================================================

/**
 * Encodes an encrypted message to bytes for transmission
 */
export function encodeEncryptedMessage(message: EncryptedMessage): Uint8Array {
  const headerBytes = encodeHeader(message.header);
  // Format: headerLength (4 bytes) + header + nonceLength (1 byte) + nonce + ciphertext
  const buffer = new Uint8Array(
    4 +
      headerBytes.length +
      1 +
      message.nonce.length +
      message.ciphertext.length,
  );
  const view = new DataView(buffer.buffer);

  let offset = 0;
  view.setUint32(offset, headerBytes.length, false);
  offset += 4;

  buffer.set(headerBytes, offset);
  offset += headerBytes.length;

  buffer[offset] = message.nonce.length;
  offset += 1;

  buffer.set(message.nonce, offset);
  offset += message.nonce.length;

  buffer.set(message.ciphertext, offset);

  return buffer;
}

/**
 * Decodes an encrypted message from bytes
 */
export function decodeEncryptedMessage(bytes: Uint8Array): EncryptedMessage {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  const headerLength = view.getUint32(offset, false);
  offset += 4;

  const headerBytes = bytes.slice(offset, offset + headerLength);
  const header = decodeHeader(headerBytes);
  offset += headerLength;

  const nonceLength = bytes[offset];
  offset += 1;

  const nonce = bytes.slice(offset, offset + nonceLength);
  offset += nonceLength;

  const ciphertext = bytes.slice(offset);

  return {
    header,
    ciphertext,
    nonce,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default DoubleRatchet;
