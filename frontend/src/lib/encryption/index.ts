/**
 * E2E Encryption Module
 *
 * Complete end-to-end encryption implementation based on the Signal Protocol.
 * Provides secure messaging with forward secrecy, break-in recovery, and
 * multi-device support.
 *
 * Features:
 * - X3DH key agreement for session establishment
 * - Double Ratchet algorithm for message encryption
 * - Sender keys for efficient group messaging
 * - Multi-device key synchronization
 *
 * Usage:
 * ```typescript
 * import {
 *   initializeEncryption,
 *   encryptMessage,
 *   decryptMessage,
 * } from '@/lib/encryption'
 *
 * // Initialize encryption on app start
 * await initializeEncryption()
 *
 * // Encrypt a message
 * const encrypted = await encryptMessage(recipientId, 'Hello!')
 *
 * // Decrypt a message
 * const plaintext = await decryptMessage(senderId, encrypted)
 * ```
 */

// ============================================================================
// Re-exports from submodules
// ============================================================================

// Crypto primitives
export {
  // Key types
  type KeyPair,
  type DerivedKeys,
  // Utility functions
  bufferToUint8Array,
  uint8ArrayToBuffer,
  uint8ArrayToHex,
  hexToUint8Array,
  uint8ArrayToBase64,
  base64ToUint8Array,
  randomBytes,
  constantTimeEqual,
  concatUint8Arrays,
  // Key generation
  generateKeyPair,
  generateSigningKeyPair,
  generateRegistrationId,
  // Key import/export
  importPublicKey,
  importPrivateKey,
  importSigningPublicKey,
  importSigningPrivateKey,
  // Diffie-Hellman
  calculateAgreement,
  calculateSharedSecret,
  // Signing
  sign,
  verify,
  // HKDF
  hkdf,
  hkdfWithInfo,
  deriveRootAndChainKeys,
  // AES encryption
  importAesKey,
  aesEncrypt,
  aesDecrypt,
  // HMAC
  hmacSha256,
  verifyHmacSha256,
  // Hashing
  sha256,
  sha512,
  // Fingerprinting
  getKeyFingerprint,
  formatFingerprint,
} from "./crypto-primitives";

// Identity key management
export {
  IdentityKeyManager,
  getIdentityManager,
  generateIdentityKeyPair,
  hasIdentityKey,
  getIdentityPublicKey,
  getRegistrationId,
  getIdentityFingerprint,
  type StoredIdentity,
  type IdentityKeyInfo,
} from "./identity";

// Signed prekey management
export {
  SignedPreKeyManager,
  getSignedPreKeyManager,
  generateSignedPreKey,
  getCurrentSignedPreKey,
  needsSignedPreKeyRotation,
  rotateSignedPreKeyIfNeeded,
  verifySignedPreKey,
  type StoredSignedPreKey,
} from "./prekey";

// X3DH key exchange
export {
  X3DH,
  performX3DHInitiator,
  performX3DHResponder,
  verifySignedPreKeySignature,
  deriveInitialKeysFromX3DH,
  type X3DHInitiatorResult,
  type X3DHResponderResult,
  type X3DHInitialMessage,
} from "./key-exchange";

// Session management
export {
  SessionManager,
  getSessionManager,
  createSession,
  getSession,
  hasSession,
  deleteSession,
  getAllSessionInfo,
  type SessionId,
  type StoredSession,
  type SessionInfo,
} from "./session";

// Double Ratchet
export {
  DoubleRatchet,
  createSenderRatchet,
  createReceiverRatchet,
  restoreRatchet,
  encryptWithRatchet,
  decryptWithRatchet,
  type EncryptedPayload,
  type DecryptedPayload,
} from "./ratchet";

// Group encryption
export {
  GroupEncryptionManager,
  getGroupEncryptionManager,
  createGroupKeyDistribution,
  processGroupKeyDistribution,
  encryptForGroup,
  decryptGroupMessage,
  rotateGroupKey,
  type SenderKey,
  type SenderKeyDistribution,
  type EncryptedGroupMessage,
} from "./group-encryption";

// Multi-device key management
export {
  DeviceKeyManager,
  getDeviceKeyManager,
  getLocalDeviceId,
  getLinkedDevices,
  generateDeviceLinkCode,
  verifyDeviceLinkCode,
  unlinkDevice,
  type LocalDevice,
  type LinkedDevice,
} from "./device-keys";

// ============================================================================
// High-Level API
// ============================================================================

import { IdentityKeyManager, getIdentityManager } from "./identity";
import { SignedPreKeyManager, getSignedPreKeyManager } from "./prekey";
import { SessionManager, getSessionManager, createSession } from "./session";
import {
  DoubleRatchet,
  createSenderRatchet,
  createReceiverRatchet,
  restoreRatchet,
} from "./ratchet";
import {
  GroupEncryptionManager,
  getGroupEncryptionManager,
} from "./group-encryption";
import { DeviceKeyManager, getDeviceKeyManager } from "./device-keys";
import { X3DH } from "./key-exchange";
import type {
  EncryptedMessage,
  PreKeyBundle,
  SessionState,
  MessageHeader,
} from "@/types/encryption";

import { EncryptionError, EncryptionErrorType } from "@/types/encryption";
import {
  concatUint8Arrays,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./crypto-primitives";

import { logger } from "@/lib/logger";

/**
 * Initializes the encryption system
 *
 * Call this on app startup to ensure all encryption components
 * are ready for use.
 */
export async function initializeEncryption(): Promise<void> {
  // Initialize identity key manager
  const identityManager = getIdentityManager();
  await identityManager.initialize();

  // Initialize signed prekey manager
  const signedPreKeyManager = getSignedPreKeyManager();
  await signedPreKeyManager.initialize();

  // Initialize session manager
  const sessionManager = getSessionManager();
  await sessionManager.initialize();

  // Initialize group encryption manager
  const groupManager = getGroupEncryptionManager();
  await groupManager.initialize();

  // Initialize device key manager
  const deviceManager = getDeviceKeyManager();
  await deviceManager.initialize();

  // Check if signed prekey rotation is needed
  await signedPreKeyManager.rotateIfNeeded();

  // REMOVED: console.log('E2E encryption initialized')
}

/**
 * Encrypts a message for a recipient
 *
 * @param recipientId - The recipient's user ID
 * @param plaintext - The plaintext message
 * @param preKeyBundle - The recipient's prekey bundle (for new sessions)
 * @returns The encrypted message
 */
export async function encryptMessage(
  recipientId: string,
  plaintext: string,
  preKeyBundle?: PreKeyBundle,
): Promise<EncryptedMessage> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const sessionManager = getSessionManager();
  let session = await sessionManager.getSession(recipientId);
  let isPreKeyMessage = false;

  // Create session if needed
  if (!session) {
    if (!preKeyBundle) {
      throw new EncryptionError(
        EncryptionErrorType.NO_SESSION,
        `No session with ${recipientId} and no prekey bundle provided`,
      );
    }

    await sessionManager.createSession(recipientId, preKeyBundle);
    session = await sessionManager.getSession(recipientId);
    isPreKeyMessage = true;
  }

  if (!session) {
    throw new EncryptionError(
      EncryptionErrorType.NO_SESSION,
      `Failed to establish session with ${recipientId}`,
    );
  }

  // Create Double Ratchet from session state
  const ratchet = await restoreRatchet(session);

  // Encrypt the message
  const { header, ciphertext, iv } = await ratchet.encrypt(plaintextBytes);

  // Update session state
  const updatedState = ratchet.exportSessionState();
  updatedState.remoteIdentityKey = session.remoteIdentityKey;
  await sessionManager.updateSession(recipientId, updatedState);

  // Get signed prekey ID
  const signedPreKeyManager = getSignedPreKeyManager();
  const signedPreKey = await signedPreKeyManager.getCurrentSignedPreKey();

  // Get registration ID
  const identityManager = getIdentityManager();
  const registrationId = await identityManager.getRegistrationId();

  const encryptedMessage: EncryptedMessage = {
    type: isPreKeyMessage ? "prekey" : "message",
    registrationId,
    signedPreKeyId: signedPreKey.keyId,
    header,
    ciphertext: concatUint8Arrays(iv, ciphertext),
    timestamp: Date.now(),
  };

  if (isPreKeyMessage) {
    const identityKeyPair = await identityManager.getIdentityKeyPair();
    encryptedMessage.baseKey = identityKeyPair.publicKey;
  }

  return encryptedMessage;
}

/**
 * Decrypts a message from a sender
 *
 * @param senderId - The sender's user ID
 * @param encryptedMessage - The encrypted message
 * @returns The decrypted plaintext
 */
export async function decryptMessage(
  senderId: string,
  encryptedMessage: EncryptedMessage,
): Promise<string> {
  const sessionManager = getSessionManager();
  let session = await sessionManager.getSession(senderId);

  // Handle prekey messages (new session)
  if (encryptedMessage.type === "prekey" && !session) {
    if (!encryptedMessage.baseKey) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_MESSAGE,
        "Prekey message missing base key",
      );
    }

    session = await sessionManager.createSessionFromPreKeyMessage(senderId, {
      identityKey: encryptedMessage.baseKey,
      ephemeralKey: encryptedMessage.header.ratchetKey,
      signedPreKeyId: encryptedMessage.signedPreKeyId,
      oneTimePreKeyId: encryptedMessage.preKeyId,
    });
  }

  if (!session) {
    throw new EncryptionError(
      EncryptionErrorType.NO_SESSION,
      `No session with ${senderId}`,
    );
  }

  // Create Double Ratchet from session state
  const ratchet = await restoreRatchet(session);

  // Extract IV and ciphertext
  const iv = encryptedMessage.ciphertext.slice(0, 12);
  const ciphertext = encryptedMessage.ciphertext.slice(12);

  // Decrypt the message
  const { plaintext } = await ratchet.decrypt(
    encryptedMessage.header,
    ciphertext,
    iv,
  );

  // Update session state
  const updatedState = ratchet.exportSessionState();
  updatedState.remoteIdentityKey = session.remoteIdentityKey;
  await sessionManager.updateSession(senderId, updatedState);

  // Decode plaintext
  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Encrypts a message for a group
 *
 * @param groupId - The group ID
 * @param plaintext - The plaintext message
 * @returns The encrypted group message
 */
export async function encryptGroupMessage(
  groupId: string,
  plaintext: string,
): Promise<ReturnType<GroupEncryptionManager["encryptGroupMessage"]>> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  const groupManager = getGroupEncryptionManager();
  return groupManager.encryptGroupMessage(groupId, plaintextBytes);
}

/**
 * Decrypts a group message
 *
 * @param senderId - The sender's user ID
 * @param message - The encrypted group message
 * @returns The decrypted plaintext
 */
export async function decryptGroupMessageContent(
  senderId: string,
  message: Awaited<ReturnType<GroupEncryptionManager["encryptGroupMessage"]>>,
): Promise<string> {
  const groupManager = getGroupEncryptionManager();
  const plaintextBytes = await groupManager.decryptGroupMessage(
    senderId,
    message,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintextBytes);
}

/**
 * Checks if encryption is initialized
 */
export async function isEncryptionInitialized(): Promise<boolean> {
  try {
    const identityManager = getIdentityManager();
    return identityManager.hasIdentity();
  } catch {
    return false;
  }
}

/**
 * Gets the local user's prekey bundle for sharing
 */
export async function getLocalPreKeyBundle(): Promise<PreKeyBundle> {
  const identityManager = getIdentityManager();
  const signedPreKeyManager = getSignedPreKeyManager();

  const identityKeyPair = await identityManager.getIdentityKeyPair();
  const registrationId = await identityManager.getRegistrationId();
  const signedPreKey = await signedPreKeyManager.getPublicPreKeyData();

  return {
    identityKey: identityKeyPair.publicKey,
    registrationId,
    signedPreKey: {
      keyId: signedPreKey.keyId,
      publicKey: signedPreKey.publicKey,
      signature: signedPreKey.signature,
    },
    // oneTimePreKey would be included if available
  };
}

/**
 * Clears all encryption data (dangerous!)
 *
 * This removes all keys and sessions. Use with caution.
 */
export async function clearAllEncryptionData(): Promise<void> {
  const identityManager = getIdentityManager();
  const signedPreKeyManager = getSignedPreKeyManager();
  const sessionManager = getSessionManager();
  const groupManager = getGroupEncryptionManager();
  const deviceManager = getDeviceKeyManager();

  await identityManager.clearIdentity();
  await signedPreKeyManager.clear();
  await sessionManager.clearAllSessions();
  await groupManager.clearAll();
  await deviceManager.clearAllDeviceData();

  logger.warn("All encryption data cleared");
}
