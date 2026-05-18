/**
 * Group Messaging Encryption
 *
 * Implements efficient encryption for group messages using a combination
 * of sender keys and pairwise sessions. This follows a hybrid approach
 * similar to Signal's sender key distribution protocol.
 *
 * Key concepts:
 * - Sender Keys: Each sender in a group has a sender key that they distribute
 *   to other group members via their pairwise Double Ratchet sessions.
 * - Chain Ratchet: Sender keys use a symmetric ratchet (no DH) for efficiency.
 * - Pairwise Distribution: Sender key distribution messages are encrypted
 *   using the normal pairwise encryption.
 */

import type {
  IdentityKeyPair,
  EncryptedMessage,
  MessageHeader,
} from "@/types/encryption";
import {
  EncryptionError,
  EncryptionErrorType,
  PROTOCOL_CONSTANTS,
} from "@/types/encryption";
import {
  generateKeyPair,
  randomBytes,
  aesEncrypt,
  aesDecrypt,
  hmacSha256,
  hkdfWithInfo,
  sign,
  verify,
  concatUint8Arrays,
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  hexToUint8Array,
  KeyPair,
} from "./crypto-primitives";
import { getIdentityManager } from "./identity";
import { getSessionManager } from "./session";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Sender key for group messaging
 */
export interface SenderKey {
  /** Unique key ID */
  keyId: number;
  /** Iteration counter (for chain ratchet) */
  iteration: number;
  /** Chain key for symmetric ratchet */
  chainKey: Uint8Array;
  /** Signing key for authentication */
  signingKeyPair: KeyPair;
  /** Group ID this key belongs to */
  groupId: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Sender key distribution message
 * Sent to new group members or after key rotation
 */
export interface SenderKeyDistribution {
  /** Group ID */
  groupId: string;
  /** Key ID */
  keyId: number;
  /** Current iteration */
  iteration: number;
  /** Chain key */
  chainKey: Uint8Array;
  /** Signing public key */
  signingKey: Uint8Array;
  /** Sender's user ID */
  senderId: string;
}

/**
 * Encrypted group message
 */
export interface EncryptedGroupMessage {
  /** Group ID */
  groupId: string;
  /** Sender's key ID */
  keyId: number;
  /** Message iteration number */
  iteration: number;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
  /** Initialization vector */
  iv: Uint8Array;
  /** Signature for authentication */
  signature: Uint8Array;
  /** Timestamp */
  timestamp: number;
}

/**
 * Stored sender key state
 */
interface StoredSenderKeyState {
  keyId: number;
  iteration: number;
  chainKey: string; // base64
  signingPrivateKey: string; // base64
  signingPublicKey: string; // base64
  groupId: string;
  createdAt: number;
}

/**
 * Received sender key record
 */
interface ReceivedSenderKey {
  senderId: string;
  keyId: number;
  iteration: number;
  chainKey: Uint8Array;
  signingKey: Uint8Array;
}

// ============================================================================
// Constants
// ============================================================================

const SENDER_KEY_STORAGE_PREFIX = "nchat_sender_key_";
const RECEIVED_KEY_STORAGE_PREFIX = "nchat_received_sender_key_";
const MAX_FUTURE_ITERATIONS = 2000;
const KEY_ROTATION_THRESHOLD = 1000;

// ============================================================================
// Group Encryption Manager
// ============================================================================

/**
 * Group Encryption Manager
 *
 * Manages sender keys for group messaging and handles encryption/decryption
 * of group messages.
 */
export class GroupEncryptionManager {
  private static instance: GroupEncryptionManager;
  private senderKeys: Map<string, SenderKey> = new Map();
  private receivedKeys: Map<string, ReceivedSenderKey[]> = new Map();
  private initialized = false;

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): GroupEncryptionManager {
    if (!GroupEncryptionManager.instance) {
      GroupEncryptionManager.instance = new GroupEncryptionManager();
    }
    return GroupEncryptionManager.instance;
  }

  /**
   * Initializes the group encryption manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadSenderKeys();
    await this.loadReceivedKeys();
    this.initialized = true;
  }

  /**
   * Creates a new sender key for a group
   *
   * @param groupId - The group ID
   * @returns The created sender key
   */
  async createSenderKey(groupId: string): Promise<SenderKey> {
    await this.ensureInitialized();

    const keyId = this.generateKeyId();
    const chainKey = randomBytes(32);
    const signingKeyPair = await generateKeyPair();

    const senderKey: SenderKey = {
      keyId,
      iteration: 0,
      chainKey,
      signingKeyPair,
      groupId,
      createdAt: Date.now(),
    };

    // Store the sender key
    this.senderKeys.set(groupId, senderKey);
    await this.saveSenderKey(senderKey);

    return senderKey;
  }

  /**
   * Gets or creates a sender key for a group
   *
   * @param groupId - The group ID
   * @returns The sender key
   */
  async getOrCreateSenderKey(groupId: string): Promise<SenderKey> {
    await this.ensureInitialized();

    let senderKey = this.senderKeys.get(groupId);

    if (!senderKey) {
      senderKey = await this.createSenderKey(groupId);
    }

    return senderKey;
  }

  /**
   * Creates a sender key distribution message
   *
   * This message should be encrypted with the pairwise session and
   * sent to each group member.
   *
   * @param groupId - The group ID
   * @returns The distribution message
   */
  async createDistributionMessage(
    groupId: string,
  ): Promise<SenderKeyDistribution> {
    await this.ensureInitialized();

    const senderKey = await this.getOrCreateSenderKey(groupId);
    const identityManager = getIdentityManager();
    const registrationId = await identityManager.getRegistrationId();

    return {
      groupId,
      keyId: senderKey.keyId,
      iteration: senderKey.iteration,
      chainKey: senderKey.chainKey,
      signingKey: senderKey.signingKeyPair.publicKey,
      senderId: registrationId.toString(),
    };
  }

  /**
   * Processes a received sender key distribution message
   *
   * @param senderId - The sender's user ID
   * @param distribution - The distribution message
   */
  async processSenderKeyDistribution(
    senderId: string,
    distribution: SenderKeyDistribution,
  ): Promise<void> {
    await this.ensureInitialized();

    const receivedKey: ReceivedSenderKey = {
      senderId,
      keyId: distribution.keyId,
      iteration: distribution.iteration,
      chainKey: distribution.chainKey,
      signingKey: distribution.signingKey,
    };

    // Get or create array for this group
    const key = `${distribution.groupId}:${senderId}`;
    let keys = this.receivedKeys.get(key);

    if (!keys) {
      keys = [];
      this.receivedKeys.set(key, keys);
    }

    // Replace or add the key
    const existingIndex = keys.findIndex((k) => k.keyId === distribution.keyId);
    if (existingIndex >= 0) {
      keys[existingIndex] = receivedKey;
    } else {
      keys.push(receivedKey);
    }

    await this.saveReceivedKey(distribution.groupId, receivedKey);
  }

  /**
   * Encrypts a message for a group
   *
   * @param groupId - The group ID
   * @param plaintext - The plaintext to encrypt
   * @returns The encrypted group message
   */
  async encryptGroupMessage(
    groupId: string,
    plaintext: Uint8Array,
  ): Promise<EncryptedGroupMessage> {
    await this.ensureInitialized();

    const senderKey = await this.getOrCreateSenderKey(groupId);

    // Derive message key from chain key
    const messageKey = await this.deriveMessageKey(
      senderKey.chainKey,
      senderKey.iteration,
    );

    // Ratchet the chain key
    const nextChainKey = await this.ratchetChainKey(senderKey.chainKey);
    senderKey.chainKey = nextChainKey;
    senderKey.iteration++;

    // Check if we need to rotate the key
    if (senderKey.iteration >= KEY_ROTATION_THRESHOLD) {
      // Mark key for rotation (actual rotation happens when distributing new keys)
      console.warn(
        `Sender key for group ${groupId} should be rotated (iteration ${senderKey.iteration})`,
      );
    }

    // Save updated sender key
    await this.saveSenderKey(senderKey);

    // Create associated data for AEAD
    const ad = this.createAssociatedData(
      groupId,
      senderKey.keyId,
      senderKey.iteration - 1,
    );

    // Encrypt the plaintext
    const { ciphertext, iv } = await aesEncrypt(messageKey, plaintext, ad);

    // Sign the ciphertext
    const signature = await sign(
      senderKey.signingKeyPair.privateKey,
      senderKey.signingKeyPair.publicKey,
      concatUint8Arrays(ad, ciphertext),
    );

    return {
      groupId,
      keyId: senderKey.keyId,
      iteration: senderKey.iteration - 1,
      ciphertext,
      iv,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypts a group message
   *
   * @param senderId - The sender's user ID
   * @param message - The encrypted group message
   * @returns The decrypted plaintext
   */
  async decryptGroupMessage(
    senderId: string,
    message: EncryptedGroupMessage,
  ): Promise<Uint8Array> {
    await this.ensureInitialized();

    // Get the sender's key for this group
    const key = `${message.groupId}:${senderId}`;
    const keys = this.receivedKeys.get(key);

    if (!keys || keys.length === 0) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        `No sender key found for ${senderId} in group ${message.groupId}`,
      );
    }

    // Find the matching key
    const senderKey = keys.find((k) => k.keyId === message.keyId);

    if (!senderKey) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        `Sender key ${message.keyId} not found for ${senderId}`,
      );
    }

    // Create associated data
    const ad = this.createAssociatedData(
      message.groupId,
      message.keyId,
      message.iteration,
    );

    // Verify signature
    const signatureValid = await verify(
      senderKey.signingKey,
      message.signature,
      concatUint8Arrays(ad, message.ciphertext),
    );

    if (!signatureValid) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_SIGNATURE,
        "Group message signature verification failed",
      );
    }

    // Derive message key (ratcheting if needed)
    const messageKey = await this.deriveMessageKeyForIteration(
      senderKey,
      message.iteration,
    );

    // Decrypt the ciphertext
    try {
      const plaintext = await aesDecrypt(
        messageKey,
        message.ciphertext,
        message.iv,
        ad,
      );
      return plaintext;
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.DECRYPTION_FAILED,
        "Failed to decrypt group message",
        error,
      );
    }
  }

  /**
   * Rotates the sender key for a group
   *
   * This should be called periodically or when members leave the group.
   *
   * @param groupId - The group ID
   * @returns The new sender key
   */
  async rotateSenderKey(groupId: string): Promise<SenderKey> {
    await this.ensureInitialized();

    // Create a new sender key (the old one will be garbage collected)
    return this.createSenderKey(groupId);
  }

  /**
   * Deletes all sender keys for a group
   *
   * Called when leaving a group.
   *
   * @param groupId - The group ID
   */
  async deleteSenderKeyForGroup(groupId: string): Promise<void> {
    await this.ensureInitialized();

    this.senderKeys.delete(groupId);

    // Delete received keys for this group
    for (const [key] of this.receivedKeys) {
      if (key.startsWith(`${groupId}:`)) {
        this.receivedKeys.delete(key);
      }
    }

    // Delete from storage
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SENDER_KEY_STORAGE_PREFIX + groupId);

      // Delete received keys
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(RECEIVED_KEY_STORAGE_PREFIX + groupId)) {
          keysToDelete.push(storageKey);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
    }
  }

  /**
   * Clears all group encryption state
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    this.senderKeys.clear();
    this.receivedKeys.clear();

    if (typeof localStorage !== "undefined") {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith(SENDER_KEY_STORAGE_PREFIX) ||
          key?.startsWith(RECEIVED_KEY_STORAGE_PREFIX)
        ) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensures the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generates a unique key ID
   */
  private generateKeyId(): number {
    const bytes = randomBytes(4);
    const view = new DataView(bytes.buffer);
    return view.getUint32(0, false) >>> 8; // 24-bit ID
  }

  /**
   * Derives message key from chain key and iteration
   */
  private async deriveMessageKey(
    chainKey: Uint8Array,
    iteration: number,
  ): Promise<Uint8Array> {
    const iterationBytes = new Uint8Array(4);
    const view = new DataView(iterationBytes.buffer);
    view.setUint32(0, iteration, false);

    return hmacSha256(chainKey, iterationBytes);
  }

  /**
   * Ratchets the chain key forward
   */
  private async ratchetChainKey(chainKey: Uint8Array): Promise<Uint8Array> {
    return hmacSha256(chainKey, new Uint8Array([0x01]));
  }

  /**
   * Derives message key for a specific iteration, ratcheting if needed
   */
  private async deriveMessageKeyForIteration(
    senderKey: ReceivedSenderKey,
    targetIteration: number,
  ): Promise<Uint8Array> {
    // Check for out-of-order messages
    if (targetIteration < senderKey.iteration) {
      throw new EncryptionError(
        EncryptionErrorType.DUPLICATE_MESSAGE,
        `Message iteration ${targetIteration} is before current iteration ${senderKey.iteration}`,
      );
    }

    // Check for too far in the future
    if (targetIteration > senderKey.iteration + MAX_FUTURE_ITERATIONS) {
      throw new EncryptionError(
        EncryptionErrorType.OUTDATED_MESSAGE,
        `Message iteration ${targetIteration} is too far ahead of current ${senderKey.iteration}`,
      );
    }

    // Ratchet to the target iteration
    let chainKey = senderKey.chainKey;
    for (let i = senderKey.iteration; i < targetIteration; i++) {
      chainKey = await this.ratchetChainKey(chainKey);
    }

    // Update the stored state
    senderKey.chainKey = await this.ratchetChainKey(chainKey);
    senderKey.iteration = targetIteration + 1;

    return this.deriveMessageKey(chainKey, targetIteration);
  }

  /**
   * Creates associated data for AEAD
   */
  private createAssociatedData(
    groupId: string,
    keyId: number,
    iteration: number,
  ): Uint8Array {
    const encoder = new TextEncoder();
    const groupIdBytes = encoder.encode(groupId);
    const numbers = new Uint8Array(8);
    const view = new DataView(numbers.buffer);
    view.setUint32(0, keyId, false);
    view.setUint32(4, iteration, false);

    return concatUint8Arrays(groupIdBytes, numbers);
  }

  /**
   * Loads sender keys from storage
   */
  private async loadSenderKeys(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SENDER_KEY_STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed: StoredSenderKeyState = JSON.parse(stored);
            const senderKey: SenderKey = {
              keyId: parsed.keyId,
              iteration: parsed.iteration,
              chainKey: base64ToUint8Array(parsed.chainKey),
              signingKeyPair: {
                privateKey: base64ToUint8Array(parsed.signingPrivateKey),
                publicKey: base64ToUint8Array(parsed.signingPublicKey),
              },
              groupId: parsed.groupId,
              createdAt: parsed.createdAt,
            };
            this.senderKeys.set(parsed.groupId, senderKey);
          }
        } catch (error) {
          logger.error(`Failed to load sender key ${key}:`, error);
        }
      }
    }
  }

  /**
   * Saves a sender key to storage
   */
  private async saveSenderKey(senderKey: SenderKey): Promise<void> {
    if (typeof localStorage === "undefined") return;

    const stored: StoredSenderKeyState = {
      keyId: senderKey.keyId,
      iteration: senderKey.iteration,
      chainKey: uint8ArrayToBase64(senderKey.chainKey),
      signingPrivateKey: uint8ArrayToBase64(
        senderKey.signingKeyPair.privateKey,
      ),
      signingPublicKey: uint8ArrayToBase64(senderKey.signingKeyPair.publicKey),
      groupId: senderKey.groupId,
      createdAt: senderKey.createdAt,
    };

    localStorage.setItem(
      SENDER_KEY_STORAGE_PREFIX + senderKey.groupId,
      JSON.stringify(stored),
    );
  }

  /**
   * Loads received sender keys from storage
   */
  private async loadReceivedKeys(): Promise<void> {
    if (typeof localStorage === "undefined") return;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(RECEIVED_KEY_STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const receivedKey: ReceivedSenderKey = {
              senderId: parsed.senderId,
              keyId: parsed.keyId,
              iteration: parsed.iteration,
              chainKey: base64ToUint8Array(parsed.chainKey),
              signingKey: base64ToUint8Array(parsed.signingKey),
            };

            const mapKey = `${parsed.groupId}:${parsed.senderId}`;
            let keys = this.receivedKeys.get(mapKey);
            if (!keys) {
              keys = [];
              this.receivedKeys.set(mapKey, keys);
            }
            keys.push(receivedKey);
          }
        } catch (error) {
          logger.error(`Failed to load received key ${key}:`, error);
        }
      }
    }
  }

  /**
   * Saves a received sender key to storage
   */
  private async saveReceivedKey(
    groupId: string,
    receivedKey: ReceivedSenderKey,
  ): Promise<void> {
    if (typeof localStorage === "undefined") return;

    const storageKey = `${RECEIVED_KEY_STORAGE_PREFIX}${groupId}_${receivedKey.senderId}_${receivedKey.keyId}`;

    const stored = {
      groupId,
      senderId: receivedKey.senderId,
      keyId: receivedKey.keyId,
      iteration: receivedKey.iteration,
      chainKey: uint8ArrayToBase64(receivedKey.chainKey),
      signingKey: uint8ArrayToBase64(receivedKey.signingKey),
    };

    localStorage.setItem(storageKey, JSON.stringify(stored));
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global group encryption manager instance
 */
export function getGroupEncryptionManager(): GroupEncryptionManager {
  return GroupEncryptionManager.getInstance();
}

/**
 * Creates a sender key distribution for a group
 */
export async function createGroupKeyDistribution(
  groupId: string,
): Promise<SenderKeyDistribution> {
  return getGroupEncryptionManager().createDistributionMessage(groupId);
}

/**
 * Processes a received sender key distribution
 */
export async function processGroupKeyDistribution(
  senderId: string,
  distribution: SenderKeyDistribution,
): Promise<void> {
  return getGroupEncryptionManager().processSenderKeyDistribution(
    senderId,
    distribution,
  );
}

/**
 * Encrypts a message for a group
 */
export async function encryptForGroup(
  groupId: string,
  plaintext: Uint8Array,
): Promise<EncryptedGroupMessage> {
  return getGroupEncryptionManager().encryptGroupMessage(groupId, plaintext);
}

/**
 * Decrypts a group message
 */
export async function decryptGroupMessage(
  senderId: string,
  message: EncryptedGroupMessage,
): Promise<Uint8Array> {
  return getGroupEncryptionManager().decryptGroupMessage(senderId, message);
}

/**
 * Rotates the sender key for a group
 */
export async function rotateGroupKey(groupId: string): Promise<SenderKey> {
  return getGroupEncryptionManager().rotateSenderKey(groupId);
}
