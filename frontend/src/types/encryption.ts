/**
 * Encryption Types for E2E Encryption (Signal Protocol)
 *
 * Type definitions for identity keys, prekeys, sessions,
 * encrypted messages, and security features.
 */

// ============================================================================
// Identity & Key Types
// ============================================================================

/**
 * Identity key pair for long-term user identity
 */
export interface IdentityKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Signed prekey for X3DH key agreement
 */
export interface SignedPreKey {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  signature: Uint8Array;
  timestamp: number;
}

/**
 * One-time prekey for X3DH forward secrecy
 */
export interface OneTimePreKey {
  keyId: number;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Public prekey bundle for initiating session
 */
export interface PreKeyBundle {
  identityKey: Uint8Array;
  registrationId: number;
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  };
  oneTimePreKey?: {
    keyId: number;
    publicKey: Uint8Array;
  };
}

/**
 * Local prekey bundle (includes private keys)
 */
export interface LocalPreKeyBundle {
  identityKeyPair: IdentityKeyPair;
  registrationId: number;
  signedPreKey: SignedPreKey;
  oneTimePreKeys: OneTimePreKey[];
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Double Ratchet session state
 */
export interface SessionState {
  /** Remote identity key */
  remoteIdentityKey: Uint8Array;
  /** Current root key */
  rootKey: Uint8Array;
  /** Sending chain key */
  sendingChainKey: Uint8Array | null;
  /** Receiving chain key */
  receivingChainKey: Uint8Array | null;
  /** Sending ratchet private key */
  sendingRatchetKey: Uint8Array | null;
  /** Receiving ratchet public key */
  receivingRatchetKey: Uint8Array | null;
  /** Number of messages sent in current sending chain */
  sendingMessageNumber: number;
  /** Number of messages received in current receiving chain */
  receivingMessageNumber: number;
  /** Length of previous sending chain */
  previousChainLength: number;
  /** Skipped message keys for out-of-order delivery */
  skippedMessageKeys: Array<{
    ratchetKey: string; // hex-encoded public key
    messageNumber: number;
    messageKey: Uint8Array;
  }>;
  /** Session creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}

/**
 * Session record stored in database
 */
export interface SessionRecord {
  id: string;
  userId: string;
  peerId: string;
  sessionState: SessionState;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Encrypted message envelope
 */
export interface EncryptedMessage {
  /** Message type: prekey (initial) or message (subsequent) */
  type: "prekey" | "message";
  /** Sender's registration ID */
  registrationId: number;
  /** PreKey ID used (only for prekey messages) */
  preKeyId?: number;
  /** Signed PreKey ID used */
  signedPreKeyId: number;
  /** Ephemeral base key (only for prekey messages) */
  baseKey?: Uint8Array;
  /** Message header */
  header: MessageHeader;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Message header containing ratchet info
 */
export interface MessageHeader {
  /** Current ratchet public key */
  ratchetKey: Uint8Array;
  /** Message number in current chain */
  messageNumber: number;
  /** Previous chain length */
  previousChainLength: number;
}

/**
 * Decrypted message result
 */
export interface DecryptedMessage {
  /** Plaintext content */
  plaintext: string;
  /** Message timestamp */
  timestamp: number;
  /** Whether signature was verified */
  verified: boolean;
  /** Attachments if any */
  attachments?: DecryptedAttachment[];
}

/**
 * Encrypted attachment
 */
export interface EncryptedAttachment {
  /** Unique attachment ID */
  id: string;
  /** Encrypted data */
  ciphertext: Uint8Array;
  /** Encryption key (encrypted with message key) */
  key: Uint8Array;
  /** HMAC for verification */
  hmac: Uint8Array;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** Original size */
  size: number;
}

/**
 * Decrypted attachment
 */
export interface DecryptedAttachment {
  id: string;
  data: Uint8Array;
  filename: string;
  mimeType: string;
  size: number;
}

// ============================================================================
// Safety Number Types
// ============================================================================

/**
 * Safety number for identity verification
 */
export interface SafetyNumber {
  /** 60-digit numeric string */
  displayString: string;
  /** Data for QR code */
  qrCodeData: Uint8Array;
  /** Fingerprint bytes */
  fingerprint: Uint8Array;
}

/**
 * Verification state for a contact
 */
export interface VerificationState {
  peerId: string;
  isVerified: boolean;
  verifiedAt?: Date;
  safetyNumber: SafetyNumber;
  verificationMethod?: "qr" | "numeric" | "in-person";
}

// ============================================================================
// Key Change Types
// ============================================================================

/**
 * Key change event
 */
export interface KeyChangeEvent {
  userId: string;
  oldKeyFingerprint: string;
  newKeyFingerprint: string;
  timestamp: Date;
  deviceId?: string;
}

/**
 * Key change response action
 */
export type KeyChangeAction = "accept" | "block" | "pending";

// ============================================================================
// Secret Chat Types
// ============================================================================

/**
 * Secret chat (E2E encrypted direct message)
 */
export interface SecretChat {
  id: string;
  participants: [string, string];
  isEncrypted: true;
  /** Disappearing message timer in seconds (0 = off) */
  disappearingMessageTimer: number;
  /** Secret chat creation timestamp */
  createdAt: Date;
  /** Last message timestamp */
  lastMessageAt?: Date;
  /** Chat status */
  status: "pending" | "active" | "ended";
  /** Initiator user ID */
  initiatorId: string;
  /** Layer (protocol version) */
  layer: number;
}

/**
 * Disappearing message state
 */
export interface DisappearingMessage {
  messageId: string;
  chatId: string;
  /** Timestamp when message should be deleted */
  expiresAt: Date;
  /** Timer duration in seconds */
  timerDuration: number;
  /** Whether timer started (message was read) */
  timerStarted: boolean;
  /** When timer started */
  timerStartedAt?: Date;
}

/**
 * View-once message state
 */
export interface ViewOnceMessage {
  messageId: string;
  chatId: string;
  /** Number of times viewed */
  viewCount: number;
  /** Maximum views allowed */
  maxViews: number;
  /** Whether message has been viewed */
  hasBeenViewed: boolean;
  /** First view timestamp */
  firstViewedAt?: Date;
}

// ============================================================================
// Device & Session Types
// ============================================================================

/**
 * Device information
 */
export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: "ios" | "android" | "web" | "desktop" | "unknown";
  osVersion?: string;
  appVersion?: string;
  lastSeen: Date;
  createdAt: Date;
  isCurrentDevice: boolean;
}

/**
 * Active session information
 */
export interface DeviceSession {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: DeviceInfo["platform"];
  ipAddress?: string;
  location?: string;
  lastActive: Date;
  createdAt: Date;
  isCurrentSession: boolean;
}

/**
 * Login alert
 */
export interface LoginAlert {
  id: string;
  timestamp: Date;
  device: string;
  location: string;
  ip: string;
  isNew: boolean;
  isAcknowledged: boolean;
  isSuspicious: boolean;
}

/**
 * Device link request
 */
export interface DeviceLinkRequest {
  code: string;
  expiresAt: Date;
  qrData: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  status: "pending" | "completed" | "expired" | "cancelled";
}

// ============================================================================
// App Security Types
// ============================================================================

/**
 * Biometric authentication type
 */
export type BiometricType = "face" | "fingerprint" | "iris" | "none";

/**
 * Biometric authentication state
 */
export interface BiometricState {
  isAvailable: boolean;
  isEnabled: boolean;
  type: BiometricType;
  lastAuthAt?: Date;
}

/**
 * Auto-lock interval options (in seconds)
 */
export type AutoLockInterval = 0 | 30 | 60 | 300 | 900 | 1800;

/**
 * App lock state
 */
export interface AppLockState {
  isLocked: boolean;
  lockType: "pin" | "biometric" | "both";
  autoLockInterval: AutoLockInterval;
  lockedAt?: Date;
  lastUnlockAt?: Date;
}

// ============================================================================
// Key Storage Types
// ============================================================================

/**
 * Stored key bundle
 */
export interface StoredKeyBundle {
  userId: string;
  identityKeyPair: IdentityKeyPair;
  registrationId: number;
  signedPreKey: SignedPreKey;
  oneTimePreKeys: OneTimePreKey[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

/**
 * Key store statistics
 */
export interface KeyStoreStats {
  hasIdentityKey: boolean;
  signedPreKeyCount: number;
  oneTimePreKeyCount: number;
  sessionCount: number;
  lastRotatedAt?: Date;
}

// ============================================================================
// Encryption Configuration
// ============================================================================

/**
 * Encryption configuration options
 */
export interface EncryptionConfig {
  /** Pool size for one-time prekeys */
  otpPoolSize: number;
  /** Threshold to replenish OTP pool */
  otpReplenishThreshold: number;
  /** Signed prekey rotation interval (ms) */
  signedPreKeyRotationInterval: number;
  /** Maximum skipped message keys to store */
  maxSkippedMessageKeys: number;
  /** Session timeout (ms) */
  sessionTimeout: number;
}

/**
 * Default encryption configuration
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  otpPoolSize: 100,
  otpReplenishThreshold: 20,
  signedPreKeyRotationInterval: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSkippedMessageKeys: 1000,
  sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// ============================================================================
// Protocol Constants
// ============================================================================

/**
 * Signal Protocol constants
 */
export const PROTOCOL_CONSTANTS = {
  /** X25519 key length in bytes */
  X25519_KEY_LENGTH: 32,
  /** Ed25519 signature length in bytes */
  ED25519_SIGNATURE_LENGTH: 64,
  /** AES-256-GCM key length in bytes */
  AES_KEY_LENGTH: 32,
  /** AES-GCM IV length in bytes */
  AES_IV_LENGTH: 12,
  /** AES-GCM auth tag length in bytes */
  AES_TAG_LENGTH: 16,
  /** HKDF output key length in bytes */
  HKDF_OUTPUT_LENGTH: 32,
  /** Maximum message size in bytes */
  MAX_MESSAGE_SIZE: 64 * 1024, // 64KB
  /** Protocol version */
  PROTOCOL_VERSION: 3,
  /** Info strings for HKDF */
  HKDF_INFO: {
    ROOT_KEY: "WhisperRatchet",
    CHAIN_KEY: "WhisperMessageKeys",
    MESSAGE_KEY: "WhisperMessageKeys",
  },
} as const;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Encryption error types
 */
export enum EncryptionErrorType {
  NO_SESSION = "NO_SESSION",
  INVALID_SESSION = "INVALID_SESSION",
  INVALID_MESSAGE = "INVALID_MESSAGE",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  KEY_NOT_FOUND = "KEY_NOT_FOUND",
  PREKEY_NOT_FOUND = "PREKEY_NOT_FOUND",
  DUPLICATE_MESSAGE = "DUPLICATE_MESSAGE",
  OUTDATED_MESSAGE = "OUTDATED_MESSAGE",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  KEY_GENERATION_FAILED = "KEY_GENERATION_FAILED",
  STORAGE_ERROR = "STORAGE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

/**
 * Custom encryption error
 */
export class EncryptionError extends Error {
  constructor(
    public type: EncryptionErrorType,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EncryptionError";
  }
}
