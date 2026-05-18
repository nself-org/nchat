/**
 * Double Ratchet Algorithm Implementation
 *
 * The Double Ratchet algorithm combines the Diffie-Hellman ratchet
 * and symmetric-key ratchet to provide forward secrecy and break-in
 * recovery for encrypted communications.
 *
 * Key concepts:
 * - DH Ratchet: Generates new DH keys periodically for forward secrecy
 * - Symmetric Ratchet: Derives message keys from chain keys
 * - Skipped Keys: Handles out-of-order message delivery
 *
 * Based on the Signal Protocol specification.
 */

import type {
  SessionState,
  MessageHeader,
  EncryptedMessage,
} from "@/types/encryption";
import {
  EncryptionError,
  EncryptionErrorType,
  PROTOCOL_CONSTANTS,
} from "@/types/encryption";
import {
  generateKeyPair,
  calculateSharedSecret,
  hkdfWithInfo,
  aesEncrypt,
  aesDecrypt,
  hmacSha256,
  concatUint8Arrays,
  uint8ArrayToHex,
  hexToUint8Array,
  uint8ArrayToBase64,
  base64ToUint8Array,
  KeyPair,
} from "./crypto-primitives";

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of message keys to skip (for out-of-order delivery) */
const MAX_SKIP = 1000;

/** Info strings for key derivation */
const KDF_INFO = {
  ROOT_KEY: PROTOCOL_CONSTANTS.HKDF_INFO.ROOT_KEY,
  CHAIN_KEY: PROTOCOL_CONSTANTS.HKDF_INFO.CHAIN_KEY,
  MESSAGE_KEY: PROTOCOL_CONSTANTS.HKDF_INFO.MESSAGE_KEY,
};

// ============================================================================
// Types
// ============================================================================

/**
 * Ratchet state for internal use
 */
interface RatchetState {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array | null;
  receivingChainKey: Uint8Array | null;
  sendingRatchetKeyPair: KeyPair | null;
  receivingRatchetKey: Uint8Array | null;
  sendingMessageNumber: number;
  receivingMessageNumber: number;
  previousChainLength: number;
  skippedKeys: Map<string, Uint8Array>;
}

/**
 * Message encryption result
 */
export interface EncryptedPayload {
  header: MessageHeader;
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

/**
 * Decrypted message result
 */
export interface DecryptedPayload {
  plaintext: Uint8Array;
  messageNumber: number;
}

// ============================================================================
// Double Ratchet Implementation
// ============================================================================

/**
 * Double Ratchet class
 *
 * Implements the Signal Protocol Double Ratchet algorithm for
 * encrypting and decrypting messages within an established session.
 */
export class DoubleRatchet {
  private state: RatchetState;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(state: RatchetState) {
    this.state = state;
  }

  /**
   * Initializes as the sender (Alice) after X3DH
   *
   * The sender starts with:
   * - A shared secret from X3DH
   * - The receiver's signed prekey as the initial receiving ratchet key
   *
   * @param sharedSecret - The shared secret from X3DH
   * @param remoteRatchetKey - The receiver's initial ratchet public key (signed prekey)
   * @returns Initialized DoubleRatchet instance
   */
  static async initializeAsSender(
    sharedSecret: Uint8Array,
    remoteRatchetKey: Uint8Array,
  ): Promise<DoubleRatchet> {
    // Generate initial sending ratchet key pair
    const sendingRatchetKeyPair = await generateKeyPair();

    // Derive initial root key from shared secret
    const initialRootKey = await hkdfWithInfo(
      sharedSecret,
      new Uint8Array(32),
      KDF_INFO.ROOT_KEY,
      32,
    );

    // Perform first DH ratchet step
    const dhOutput = await calculateSharedSecret(
      sendingRatchetKeyPair.privateKey,
      sendingRatchetKeyPair.publicKey,
      remoteRatchetKey,
    );

    // Derive new root key and sending chain key
    const { rootKey, chainKey } = await deriveRootAndChainKey(
      initialRootKey,
      dhOutput,
    );

    const state: RatchetState = {
      rootKey,
      sendingChainKey: chainKey,
      receivingChainKey: null,
      sendingRatchetKeyPair,
      receivingRatchetKey: remoteRatchetKey,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedKeys: new Map(),
    };

    return new DoubleRatchet(state);
  }

  /**
   * Initializes as the receiver (Bob) after X3DH
   *
   * The receiver starts with:
   * - A shared secret from X3DH
   * - Their own signed prekey as the initial ratchet key pair
   *
   * @param sharedSecret - The shared secret from X3DH
   * @param localRatchetKeyPair - The local ratchet key pair (signed prekey)
   * @returns Initialized DoubleRatchet instance
   */
  static async initializeAsReceiver(
    sharedSecret: Uint8Array,
    localRatchetKeyPair: KeyPair,
  ): Promise<DoubleRatchet> {
    // Derive initial root key from shared secret
    const rootKey = await hkdfWithInfo(
      sharedSecret,
      new Uint8Array(32),
      KDF_INFO.ROOT_KEY,
      32,
    );

    const state: RatchetState = {
      rootKey,
      sendingChainKey: null,
      receivingChainKey: null,
      sendingRatchetKeyPair: localRatchetKeyPair,
      receivingRatchetKey: null,
      sendingMessageNumber: 0,
      receivingMessageNumber: 0,
      previousChainLength: 0,
      skippedKeys: new Map(),
    };

    return new DoubleRatchet(state);
  }

  /**
   * Restores a DoubleRatchet from session state
   *
   * @param sessionState - The stored session state
   * @returns Restored DoubleRatchet instance
   */
  static async fromSessionState(
    sessionState: SessionState,
  ): Promise<DoubleRatchet> {
    // Reconstruct sending key pair from private key
    let sendingRatchetKeyPair: KeyPair | null = null;
    if (sessionState.sendingRatchetKey) {
      // We need to regenerate the public key from the private key
      // For now, we'll store both in the session state
      const keyPair = await generateKeyPair();
      sendingRatchetKeyPair = {
        privateKey: sessionState.sendingRatchetKey,
        publicKey: keyPair.publicKey, // This is a simplification
      };
    }

    const state: RatchetState = {
      rootKey: sessionState.rootKey,
      sendingChainKey: sessionState.sendingChainKey,
      receivingChainKey: sessionState.receivingChainKey,
      sendingRatchetKeyPair,
      receivingRatchetKey: sessionState.receivingRatchetKey,
      sendingMessageNumber: sessionState.sendingMessageNumber,
      receivingMessageNumber: sessionState.receivingMessageNumber,
      previousChainLength: sessionState.previousChainLength,
      skippedKeys: new Map(
        sessionState.skippedMessageKeys.map((k) => [
          `${k.ratchetKey}:${k.messageNumber}`,
          k.messageKey,
        ]),
      ),
    };

    return new DoubleRatchet(state);
  }

  /**
   * Encrypts a message
   *
   * @param plaintext - The plaintext to encrypt
   * @param associatedData - Additional authenticated data (optional)
   * @returns Encrypted payload with header and ciphertext
   */
  async encrypt(
    plaintext: Uint8Array,
    associatedData?: Uint8Array,
  ): Promise<EncryptedPayload> {
    // Ensure we have a sending chain
    if (!this.state.sendingChainKey) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_SESSION,
        "No sending chain key available",
      );
    }

    if (!this.state.sendingRatchetKeyPair) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_SESSION,
        "No sending ratchet key available",
      );
    }

    // Derive message key from chain key
    const { messageKey, nextChainKey } = await deriveMessageKey(
      this.state.sendingChainKey,
    );

    // Update chain key
    this.state.sendingChainKey = nextChainKey;

    // Create message header
    const header: MessageHeader = {
      ratchetKey: this.state.sendingRatchetKeyPair.publicKey,
      messageNumber: this.state.sendingMessageNumber,
      previousChainLength: this.state.previousChainLength,
    };

    // Increment message number
    this.state.sendingMessageNumber++;

    // Construct associated data for AEAD
    const ad = associatedData
      ? concatUint8Arrays(this.serializeHeader(header), associatedData)
      : this.serializeHeader(header);

    // Encrypt plaintext with message key
    const { ciphertext, iv } = await aesEncrypt(messageKey, plaintext, ad);

    return {
      header,
      ciphertext,
      iv,
    };
  }

  /**
   * Decrypts a message
   *
   * @param header - The message header
   * @param ciphertext - The encrypted ciphertext
   * @param iv - The initialization vector
   * @param associatedData - Additional authenticated data (optional)
   * @returns Decrypted payload with plaintext
   */
  async decrypt(
    header: MessageHeader,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    associatedData?: Uint8Array,
  ): Promise<DecryptedPayload> {
    // Try to find a skipped message key first
    const ratchetKeyHex = uint8ArrayToHex(header.ratchetKey);
    const skippedKey = this.state.skippedKeys.get(
      `${ratchetKeyHex}:${header.messageNumber}`,
    );

    if (skippedKey) {
      // Use the skipped key and remove it
      this.state.skippedKeys.delete(`${ratchetKeyHex}:${header.messageNumber}`);

      const ad = associatedData
        ? concatUint8Arrays(this.serializeHeader(header), associatedData)
        : this.serializeHeader(header);

      const plaintext = await aesDecrypt(skippedKey, ciphertext, iv, ad);
      return { plaintext, messageNumber: header.messageNumber };
    }

    // Check if we need to perform a DH ratchet step
    const headerKeyHex = uint8ArrayToHex(header.ratchetKey);
    const currentReceivingKeyHex = this.state.receivingRatchetKey
      ? uint8ArrayToHex(this.state.receivingRatchetKey)
      : null;

    if (headerKeyHex !== currentReceivingKeyHex) {
      // Skip any remaining messages in the current receiving chain
      if (this.state.receivingChainKey && this.state.receivingRatchetKey) {
        await this.skipMessageKeys(header.previousChainLength);
      }

      // Perform DH ratchet step
      await this.dhRatchet(header.ratchetKey);
    }

    // Skip to the correct message in the chain
    await this.skipMessageKeys(header.messageNumber);

    // Derive message key
    if (!this.state.receivingChainKey) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_SESSION,
        "No receiving chain key available",
      );
    }

    const { messageKey, nextChainKey } = await deriveMessageKey(
      this.state.receivingChainKey,
    );
    this.state.receivingChainKey = nextChainKey;
    this.state.receivingMessageNumber++;

    // Decrypt
    const ad = associatedData
      ? concatUint8Arrays(this.serializeHeader(header), associatedData)
      : this.serializeHeader(header);

    try {
      const plaintext = await aesDecrypt(messageKey, ciphertext, iv, ad);
      return { plaintext, messageNumber: header.messageNumber };
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.DECRYPTION_FAILED,
        "Failed to decrypt message",
        error,
      );
    }
  }

  /**
   * Performs a DH ratchet step
   *
   * Called when receiving a message with a new ratchet public key.
   *
   * @param remoteRatchetKey - The new remote ratchet public key
   */
  private async dhRatchet(remoteRatchetKey: Uint8Array): Promise<void> {
    // Store the previous chain length
    this.state.previousChainLength = this.state.sendingMessageNumber;

    // Reset message numbers
    this.state.sendingMessageNumber = 0;
    this.state.receivingMessageNumber = 0;

    // Update receiving ratchet key
    this.state.receivingRatchetKey = remoteRatchetKey;

    // Calculate DH output with current sending key
    if (this.state.sendingRatchetKeyPair) {
      const dhOutput = await calculateSharedSecret(
        this.state.sendingRatchetKeyPair.privateKey,
        this.state.sendingRatchetKeyPair.publicKey,
        remoteRatchetKey,
      );

      // Derive new root key and receiving chain key
      const { rootKey, chainKey } = await deriveRootAndChainKey(
        this.state.rootKey,
        dhOutput,
      );
      this.state.rootKey = rootKey;
      this.state.receivingChainKey = chainKey;
    }

    // Generate new sending ratchet key pair
    this.state.sendingRatchetKeyPair = await generateKeyPair();

    // Calculate DH output with new sending key
    const dhOutput = await calculateSharedSecret(
      this.state.sendingRatchetKeyPair.privateKey,
      this.state.sendingRatchetKeyPair.publicKey,
      remoteRatchetKey,
    );

    // Derive new root key and sending chain key
    const { rootKey, chainKey } = await deriveRootAndChainKey(
      this.state.rootKey,
      dhOutput,
    );
    this.state.rootKey = rootKey;
    this.state.sendingChainKey = chainKey;
  }

  /**
   * Skips message keys for out-of-order delivery
   *
   * @param until - The message number to skip to
   */
  private async skipMessageKeys(until: number): Promise<void> {
    if (!this.state.receivingChainKey) return;

    if (until - this.state.receivingMessageNumber > MAX_SKIP) {
      throw new EncryptionError(
        EncryptionErrorType.OUTDATED_MESSAGE,
        `Too many skipped messages: ${until - this.state.receivingMessageNumber}`,
      );
    }

    const ratchetKeyHex = this.state.receivingRatchetKey
      ? uint8ArrayToHex(this.state.receivingRatchetKey)
      : "";

    while (this.state.receivingMessageNumber < until) {
      const { messageKey, nextChainKey } = await deriveMessageKey(
        this.state.receivingChainKey,
      );

      // Store the skipped key
      const key = `${ratchetKeyHex}:${this.state.receivingMessageNumber}`;
      this.state.skippedKeys.set(key, messageKey);

      // Limit the number of stored skipped keys
      if (this.state.skippedKeys.size > MAX_SKIP) {
        // Remove oldest key (first in iteration order)
        const firstKey = this.state.skippedKeys.keys().next().value;
        if (firstKey) {
          this.state.skippedKeys.delete(firstKey);
        }
      }

      this.state.receivingChainKey = nextChainKey;
      this.state.receivingMessageNumber++;
    }
  }

  /**
   * Serializes message header for AEAD
   */
  private serializeHeader(header: MessageHeader): Uint8Array {
    const encoder = new TextEncoder();
    const numberBytes = new Uint8Array(8);
    const view = new DataView(numberBytes.buffer);
    view.setUint32(0, header.messageNumber, false);
    view.setUint32(4, header.previousChainLength, false);

    return concatUint8Arrays(header.ratchetKey, numberBytes);
  }

  /**
   * Exports the current session state
   */
  exportSessionState(): SessionState {
    const skippedMessageKeys: SessionState["skippedMessageKeys"] = [];

    for (const [key, messageKey] of this.state.skippedKeys) {
      const [ratchetKey, messageNumber] = key.split(":");
      skippedMessageKeys.push({
        ratchetKey,
        messageNumber: parseInt(messageNumber, 10),
        messageKey,
      });
    }

    return {
      remoteIdentityKey: new Uint8Array(0), // Should be set by session manager
      rootKey: this.state.rootKey,
      sendingChainKey: this.state.sendingChainKey,
      receivingChainKey: this.state.receivingChainKey,
      sendingRatchetKey: this.state.sendingRatchetKeyPair?.privateKey || null,
      receivingRatchetKey: this.state.receivingRatchetKey,
      sendingMessageNumber: this.state.sendingMessageNumber,
      receivingMessageNumber: this.state.receivingMessageNumber,
      previousChainLength: this.state.previousChainLength,
      skippedMessageKeys,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
  }

  /**
   * Gets the current sending ratchet public key
   */
  getSendingRatchetPublicKey(): Uint8Array | null {
    return this.state.sendingRatchetKeyPair?.publicKey || null;
  }

  /**
   * Gets the number of skipped keys stored
   */
  getSkippedKeyCount(): number {
    return this.state.skippedKeys.size;
  }
}

// ============================================================================
// Key Derivation Functions
// ============================================================================

/**
 * Derives root key and chain key from DH output
 *
 * @param rootKey - Current root key
 * @param dhOutput - DH shared secret
 * @returns New root key and chain key
 */
async function deriveRootAndChainKey(
  rootKey: Uint8Array,
  dhOutput: Uint8Array,
): Promise<{ rootKey: Uint8Array; chainKey: Uint8Array }> {
  const input = concatUint8Arrays(rootKey, dhOutput);
  const derived = await hkdfWithInfo(
    input,
    new Uint8Array(32),
    KDF_INFO.ROOT_KEY,
    64,
  );

  return {
    rootKey: derived.slice(0, 32),
    chainKey: derived.slice(32, 64),
  };
}

/**
 * Derives message key from chain key
 *
 * @param chainKey - Current chain key
 * @returns Message key and next chain key
 */
async function deriveMessageKey(
  chainKey: Uint8Array,
): Promise<{ messageKey: Uint8Array; nextChainKey: Uint8Array }> {
  // Derive message key: HMAC(chain_key, 0x01)
  const messageKey = await hmacSha256(chainKey, new Uint8Array([0x01]));

  // Derive next chain key: HMAC(chain_key, 0x02)
  const nextChainKey = await hmacSha256(chainKey, new Uint8Array([0x02]));

  return { messageKey, nextChainKey };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Creates a new Double Ratchet as sender
 */
export async function createSenderRatchet(
  sharedSecret: Uint8Array,
  remoteRatchetKey: Uint8Array,
): Promise<DoubleRatchet> {
  return DoubleRatchet.initializeAsSender(sharedSecret, remoteRatchetKey);
}

/**
 * Creates a new Double Ratchet as receiver
 */
export async function createReceiverRatchet(
  sharedSecret: Uint8Array,
  localRatchetKeyPair: KeyPair,
): Promise<DoubleRatchet> {
  return DoubleRatchet.initializeAsReceiver(sharedSecret, localRatchetKeyPair);
}

/**
 * Restores a Double Ratchet from session state
 */
export async function restoreRatchet(
  sessionState: SessionState,
): Promise<DoubleRatchet> {
  return DoubleRatchet.fromSessionState(sessionState);
}

/**
 * Encrypts a message using Double Ratchet
 */
export async function encryptWithRatchet(
  ratchet: DoubleRatchet,
  plaintext: Uint8Array,
  associatedData?: Uint8Array,
): Promise<EncryptedPayload> {
  return ratchet.encrypt(plaintext, associatedData);
}

/**
 * Decrypts a message using Double Ratchet
 */
export async function decryptWithRatchet(
  ratchet: DoubleRatchet,
  header: MessageHeader,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  associatedData?: Uint8Array,
): Promise<DecryptedPayload> {
  return ratchet.decrypt(header, ciphertext, iv, associatedData);
}
