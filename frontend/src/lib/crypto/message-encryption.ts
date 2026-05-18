/**
 * Message Encryption - End-to-end encryption for chat messages
 *
 * Handles message encryption/decryption using AES-GCM,
 * session key derivation, and forward secrecy implementation.
 */

import { logger } from "@/lib/logger";
import {
  KeyPair,
  exportKey,
  importPublicKey,
  deriveEncryptionKey,
  generateKeyPair,
} from "./key-manager";

// ============================================================================
// Types
// ============================================================================

export interface EncryptedMessage {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded ephemeral public key (for forward secrecy) */
  ephemeralPublicKey: string;
  /** Message version for backward compatibility */
  version: number;
  /** Timestamp when message was encrypted */
  timestamp: number;
  /** Optional message signature */
  signature?: string;
}

export interface DecryptedMessage {
  /** The decrypted plaintext content */
  content: string;
  /** Timestamp from the encrypted message */
  timestamp: number;
  /** Whether the message integrity was verified */
  verified: boolean;
}

export interface SessionKey {
  /** The derived AES-GCM key */
  key: CryptoKey;
  /** Public key of the peer */
  peerPublicKey: JsonWebKey;
  /** When this session key was created */
  createdAt: Date;
  /** Number of messages encrypted with this key */
  messageCount: number;
  /** Maximum messages before ratchet */
  maxMessages: number;
}

export interface EncryptionOptions {
  /** Whether to use forward secrecy (ephemeral keys) */
  forwardSecrecy?: boolean;
  /** Whether to sign the message */
  sign?: boolean;
  /** Signing key for message authentication */
  signingKey?: CryptoKey;
  /** Additional authenticated data */
  additionalData?: string;
}

export interface DecryptionOptions {
  /** Verification key for signature checking */
  verificationKey?: CryptoKey;
  /** Expected additional authenticated data */
  additionalData?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CURRENT_VERSION = 1;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const MAX_MESSAGES_PER_SESSION = 100;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts an ArrayBuffer to a Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a string to an ArrayBuffer using UTF-8 encoding
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Converts an ArrayBuffer to a string using UTF-8 decoding
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Generates a random initialization vector
 */
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Validates an encrypted message structure
 */
export function validateEncryptedMessage(
  message: unknown,
): message is EncryptedMessage {
  if (!message || typeof message !== "object") return false;

  const msg = message as Record<string, unknown>;

  return (
    typeof msg.ciphertext === "string" &&
    typeof msg.iv === "string" &&
    typeof msg.ephemeralPublicKey === "string" &&
    typeof msg.version === "number" &&
    typeof msg.timestamp === "number"
  );
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypts a message using AES-GCM
 */
export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
  additionalData?: string,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = generateIV();
  const encodedText = stringToArrayBuffer(plaintext);

  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: iv as BufferSource,
  };

  if (additionalData) {
    const additionalBuffer = stringToArrayBuffer(additionalData);
    algorithm.additionalData = additionalBuffer as BufferSource;
  }

  try {
    const ciphertext = await crypto.subtle.encrypt(algorithm, key, encodedText);

    return { ciphertext, iv };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decrypts a message using AES-GCM
 */
export async function decryptWithKey(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  additionalData?: string,
): Promise<string> {
  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: iv as BufferSource,
  };

  if (additionalData) {
    const additionalBuffer = stringToArrayBuffer(additionalData);
    algorithm.additionalData = additionalBuffer as BufferSource;
  }

  try {
    const decrypted = await crypto.subtle.decrypt(algorithm, key, ciphertext);

    return arrayBufferToString(decrypted);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Encrypts a message for a recipient with forward secrecy
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: JsonWebKey,
  senderPrivateKey: CryptoKey,
  options: EncryptionOptions = {},
): Promise<EncryptedMessage> {
  const { forwardSecrecy = true, additionalData } = options;

  let encryptionKey: CryptoKey;
  let ephemeralPublicKeyJwk: JsonWebKey;

  if (forwardSecrecy) {
    // Generate ephemeral key pair for forward secrecy
    const ephemeralKeyPair = await generateKeyPair();
    ephemeralPublicKeyJwk = await exportKey(ephemeralKeyPair.publicKey);

    // Derive encryption key from ephemeral private key and recipient's public key
    const recipientKey = await importPublicKey(recipientPublicKey);
    encryptionKey = await deriveEncryptionKey(
      ephemeralKeyPair.privateKey,
      recipientKey,
    );
  } else {
    // Derive encryption key from sender's static key pair
    ephemeralPublicKeyJwk = {} as JsonWebKey; // Empty when not using forward secrecy
    const recipientKey = await importPublicKey(recipientPublicKey);
    encryptionKey = await deriveEncryptionKey(senderPrivateKey, recipientKey);
  }

  const { ciphertext, iv } = await encryptWithKey(
    plaintext,
    encryptionKey,
    additionalData,
  );

  const encryptedMessage: EncryptedMessage = {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    ephemeralPublicKey: JSON.stringify(ephemeralPublicKeyJwk),
    version: CURRENT_VERSION,
    timestamp: Date.now(),
  };

  return encryptedMessage;
}

/**
 * Decrypts a message from a sender
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  recipientPrivateKey: CryptoKey,
  senderPublicKey?: JsonWebKey,
  options: DecryptionOptions = {},
): Promise<DecryptedMessage> {
  const { additionalData } = options;

  // Validate message structure
  if (!validateEncryptedMessage(encryptedMessage)) {
    throw new Error("Invalid encrypted message format");
  }

  // Check version compatibility
  if (encryptedMessage.version > CURRENT_VERSION) {
    throw new Error(`Unsupported message version: ${encryptedMessage.version}`);
  }

  let encryptionKey: CryptoKey;

  // Parse ephemeral public key
  const ephemeralPublicKeyJwk = JSON.parse(encryptedMessage.ephemeralPublicKey);

  // Check if forward secrecy was used (ephemeral key has required fields)
  const usedForwardSecrecy =
    ephemeralPublicKeyJwk.kty && ephemeralPublicKeyJwk.crv;

  if (usedForwardSecrecy) {
    // Derive key from ephemeral public key
    const ephemeralPublicKey = await importPublicKey(ephemeralPublicKeyJwk);
    encryptionKey = await deriveEncryptionKey(
      recipientPrivateKey,
      ephemeralPublicKey,
    );
  } else if (senderPublicKey) {
    // Derive key from sender's static public key
    const senderKey = await importPublicKey(senderPublicKey);
    encryptionKey = await deriveEncryptionKey(recipientPrivateKey, senderKey);
  } else {
    throw new Error(
      "Sender public key required when forward secrecy is disabled",
    );
  }

  // Decode and decrypt
  const ciphertext = base64ToArrayBuffer(encryptedMessage.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedMessage.iv));

  const content = await decryptWithKey(
    ciphertext,
    encryptionKey,
    iv,
    additionalData,
  );

  // Verify message signature if present
  let verified = false;
  if (encryptedMessage.signature && options.verificationKey) {
    try {
      verified = await verifyMessageSignature(
        content,
        encryptedMessage.signature,
        options.verificationKey,
      );
    } catch (error) {
      logger.error("Signature verification failed:", error);
      verified = false;
    }
  } else {
    // If no signature is present, consider it unverified but not failed
    verified = !encryptedMessage.signature;
  }

  return {
    content,
    timestamp: encryptedMessage.timestamp,
    verified,
  };
}

// ============================================================================
// Session Key Management
// ============================================================================

/**
 * Creates a new session key with a peer
 */
export async function createSessionKey(
  ownPrivateKey: CryptoKey,
  peerPublicKey: JsonWebKey,
  maxMessages: number = MAX_MESSAGES_PER_SESSION,
): Promise<SessionKey> {
  const peerKey = await importPublicKey(peerPublicKey);
  const key = await deriveEncryptionKey(ownPrivateKey, peerKey);

  return {
    key,
    peerPublicKey,
    createdAt: new Date(),
    messageCount: 0,
    maxMessages,
  };
}

/**
 * Checks if a session key needs to be rotated
 */
export function shouldRotateSessionKey(session: SessionKey): boolean {
  return session.messageCount >= session.maxMessages;
}

/**
 * Increments the message count for a session key
 */
export function incrementSessionKeyCount(session: SessionKey): SessionKey {
  return {
    ...session,
    messageCount: session.messageCount + 1,
  };
}

/**
 * Encrypts a message using a session key
 */
export async function encryptWithSessionKey(
  plaintext: string,
  session: SessionKey,
  additionalData?: string,
): Promise<{ encrypted: EncryptedMessage; updatedSession: SessionKey }> {
  if (shouldRotateSessionKey(session)) {
    throw new Error(
      "Session key has reached maximum message count. Please rotate.",
    );
  }

  const { ciphertext, iv } = await encryptWithKey(
    plaintext,
    session.key,
    additionalData,
  );

  const encrypted: EncryptedMessage = {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    ephemeralPublicKey: JSON.stringify({}), // Session keys don't use ephemeral keys
    version: CURRENT_VERSION,
    timestamp: Date.now(),
  };

  return {
    encrypted,
    updatedSession: incrementSessionKeyCount(session),
  };
}

/**
 * Decrypts a message using a session key
 */
export async function decryptWithSessionKey(
  encryptedMessage: EncryptedMessage,
  session: SessionKey,
  additionalData?: string,
): Promise<DecryptedMessage> {
  const ciphertext = base64ToArrayBuffer(encryptedMessage.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedMessage.iv));

  const content = await decryptWithKey(
    ciphertext,
    session.key,
    iv,
    additionalData,
  );

  return {
    content,
    timestamp: encryptedMessage.timestamp,
    verified: true,
  };
}

// ============================================================================
// Forward Secrecy (Ratcheting)
// ============================================================================

export interface RatchetState {
  /** Current chain key for sending */
  sendingChainKey: CryptoKey | null;
  /** Current chain key for receiving */
  receivingChainKey: CryptoKey | null;
  /** Current message number in the sending chain */
  sendingMessageNumber: number;
  /** Current message number in the receiving chain */
  receivingMessageNumber: number;
  /** Previous sending chain keys (for out-of-order messages) */
  previousChainKeys: Map<number, CryptoKey>;
  /** Root key for deriving new chain keys */
  rootKey: CryptoKey | null;
}

/**
 * Initializes a new ratchet state
 */
export function initializeRatchetState(): RatchetState {
  return {
    sendingChainKey: null,
    receivingChainKey: null,
    sendingMessageNumber: 0,
    receivingMessageNumber: 0,
    previousChainKeys: new Map(),
    rootKey: null,
  };
}

/**
 * Derives a new chain key using HKDF
 */
export async function deriveChainKey(
  rootKey: CryptoKey,
  info: string,
): Promise<CryptoKey> {
  // Export root key for derivation
  const rawRootKey = await crypto.subtle.exportKey("raw", rootKey);

  // Use HKDF to derive new key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    rawRootKey,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32), // In production, use a proper salt
      info: stringToArrayBuffer(info),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/**
 * Advances the ratchet state after sending a message
 */
export async function ratchetSend(state: RatchetState): Promise<RatchetState> {
  if (!state.sendingChainKey || !state.rootKey) {
    throw new Error("Ratchet state not initialized for sending");
  }

  // Derive new chain key
  const newChainKey = await deriveChainKey(
    state.sendingChainKey,
    `chain-key-send-${state.sendingMessageNumber + 1}`,
  );

  return {
    ...state,
    sendingChainKey: newChainKey,
    sendingMessageNumber: state.sendingMessageNumber + 1,
    previousChainKeys: new Map([
      ...state.previousChainKeys,
      [state.sendingMessageNumber, state.sendingChainKey],
    ]),
  };
}

/**
 * Advances the ratchet state after receiving a message
 */
export async function ratchetReceive(
  state: RatchetState,
  messageNumber: number,
): Promise<RatchetState> {
  if (!state.receivingChainKey || !state.rootKey) {
    throw new Error("Ratchet state not initialized for receiving");
  }

  // Check if we need to catch up
  if (messageNumber > state.receivingMessageNumber) {
    // Store intermediate keys for out-of-order messages
    let currentKey = state.receivingChainKey;
    const newPreviousKeys = new Map(state.previousChainKeys);

    for (let i = state.receivingMessageNumber; i < messageNumber; i++) {
      newPreviousKeys.set(i, currentKey);
      currentKey = await deriveChainKey(currentKey, `chain-key-recv-${i + 1}`);
    }

    return {
      ...state,
      receivingChainKey: currentKey,
      receivingMessageNumber: messageNumber,
      previousChainKeys: newPreviousKeys,
    };
  }

  return state;
}

// ============================================================================
// Message Signing
// ============================================================================

/**
 * Signs a message with an ECDSA private key
 */
export async function signMessage(
  message: string,
  signingKey: CryptoKey,
): Promise<string> {
  try {
    const encodedMessage = stringToArrayBuffer(message);

    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      signingKey,
      encodedMessage,
    );

    return arrayBufferToBase64(signature);
  } catch (error) {
    throw new Error(
      `Message signing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Verifies a message signature with an ECDSA public key
 */
export async function verifyMessageSignature(
  message: string,
  signature: string,
  verificationKey: CryptoKey,
): Promise<boolean> {
  try {
    const encodedMessage = stringToArrayBuffer(message);
    const signatureBuffer = base64ToArrayBuffer(signature);

    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verificationKey,
      signatureBuffer,
      encodedMessage,
    );
  } catch (error) {
    throw new Error(
      `Signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Encrypts multiple messages in batch
 */
export async function encryptMessageBatch(
  messages: string[],
  recipientPublicKey: JsonWebKey,
  senderPrivateKey: CryptoKey,
  options: EncryptionOptions = {},
): Promise<EncryptedMessage[]> {
  return Promise.all(
    messages.map((msg) =>
      encryptMessage(msg, recipientPublicKey, senderPrivateKey, options),
    ),
  );
}

/**
 * Decrypts multiple messages in batch
 */
export async function decryptMessageBatch(
  encryptedMessages: EncryptedMessage[],
  recipientPrivateKey: CryptoKey,
  senderPublicKey?: JsonWebKey,
  options: DecryptionOptions = {},
): Promise<DecryptedMessage[]> {
  return Promise.all(
    encryptedMessages.map((msg) =>
      decryptMessage(msg, recipientPrivateKey, senderPublicKey, options),
    ),
  );
}

// ============================================================================
// Message Encryption Manager
// ============================================================================

export class MessageEncryption {
  private ownKeyPair: KeyPair | null = null;
  private sessionKeys: Map<string, SessionKey> = new Map();

  /**
   * Initializes the message encryption with a key pair
   */
  initialize(keyPair: KeyPair): void {
    this.ownKeyPair = keyPair;
  }

  /**
   * Checks if the encryption manager is initialized
   */
  isInitialized(): boolean {
    return this.ownKeyPair !== null;
  }

  /**
   * Gets or creates a session key for a peer
   */
  async getOrCreateSessionKey(
    peerId: string,
    peerPublicKey: JsonWebKey,
  ): Promise<SessionKey> {
    if (!this.ownKeyPair) {
      throw new Error("Message encryption not initialized");
    }

    const existing = this.sessionKeys.get(peerId);
    if (existing && !shouldRotateSessionKey(existing)) {
      return existing;
    }

    const session = await createSessionKey(
      this.ownKeyPair.privateKey,
      peerPublicKey,
    );
    this.sessionKeys.set(peerId, session);
    return session;
  }

  /**
   * Encrypts a message for a peer
   */
  async encrypt(
    plaintext: string,
    peerId: string,
    peerPublicKey: JsonWebKey,
    options: EncryptionOptions = {},
  ): Promise<EncryptedMessage> {
    if (!this.ownKeyPair) {
      throw new Error("Message encryption not initialized");
    }

    // For forward secrecy, use the full encryption flow
    if (options.forwardSecrecy !== false) {
      return encryptMessage(
        plaintext,
        peerPublicKey,
        this.ownKeyPair.privateKey,
        options,
      );
    }

    // For session-based encryption
    const session = await this.getOrCreateSessionKey(peerId, peerPublicKey);
    const { encrypted, updatedSession } = await encryptWithSessionKey(
      plaintext,
      session,
      options.additionalData,
    );
    this.sessionKeys.set(peerId, updatedSession);
    return encrypted;
  }

  /**
   * Decrypts a message from a peer
   */
  async decrypt(
    encryptedMessage: EncryptedMessage,
    senderPublicKey?: JsonWebKey,
    options: DecryptionOptions = {},
  ): Promise<DecryptedMessage> {
    if (!this.ownKeyPair) {
      throw new Error("Message encryption not initialized");
    }

    return decryptMessage(
      encryptedMessage,
      this.ownKeyPair.privateKey,
      senderPublicKey,
      options,
    );
  }

  /**
   * Clears all session keys
   */
  clearSessionKeys(): void {
    this.sessionKeys.clear();
  }

  /**
   * Removes a specific session key
   */
  removeSessionKey(peerId: string): void {
    this.sessionKeys.delete(peerId);
  }

  /**
   * Gets the number of active session keys
   */
  getSessionKeyCount(): number {
    return this.sessionKeys.size;
  }

  /**
   * Resets the encryption manager
   */
  reset(): void {
    this.ownKeyPair = null;
    this.sessionKeys.clear();
  }
}

// Export singleton instance
export const messageEncryption = new MessageEncryption();
