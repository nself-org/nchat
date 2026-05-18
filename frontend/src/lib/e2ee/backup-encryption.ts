/**
 * Backup Encryption
 *
 * Provides comprehensive backup encryption for E2EE key material.
 * Implements a versioned backup format with integrity verification.
 *
 * Backup format structure:
 * - Version header for future compatibility
 * - Encrypted key bundle (identity keys, pre-keys, sessions)
 * - Device verification data
 * - Integrity checksums
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - HMAC integrity verification
 * - Device-bound decryption
 * - Tamper detection
 * - Forward-compatible versioning
 */

import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils";
import {
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,
  hash256,
  stringToBytes,
  bytesToString,
  bytesToBase64,
  base64ToBytes,
  constantTimeEqual,
} from "./crypto";
import { stretchKey } from "./backup-key-derivation";

// ============================================================================
// Constants
// ============================================================================

/** Current backup format version */
export const BACKUP_FORMAT_VERSION = 1;

/** Magic bytes to identify nchat backups */
const BACKUP_MAGIC = new Uint8Array([0x4e, 0x43, 0x48, 0x41, 0x54, 0x42, 0x4b]); // "NCHATBK"

/** Minimum backup file size */
const MIN_BACKUP_SIZE = 128;

/** Maximum backup file size (100MB) */
const MAX_BACKUP_SIZE = 100 * 1024 * 1024;

/** IV length for backup encryption */
const BACKUP_IV_LENGTH = 12;

/** HMAC key derivation purpose */
const HMAC_KEY_PURPOSE = "nchat-backup-hmac-v1";

/** Encryption key derivation purpose */
const ENCRYPTION_KEY_PURPOSE = "nchat-backup-encrypt-v1";

// ============================================================================
// Types
// ============================================================================

/**
 * Types of keys that can be backed up
 */
export enum BackupKeyType {
  IDENTITY_KEY = "identity",
  SIGNED_PREKEY = "signed_prekey",
  ONE_TIME_PREKEY = "one_time_prekey",
  SESSION_STATE = "session",
  SENDER_KEY = "sender_key",
  GROUP_SESSION = "group_session",
}

/**
 * Individual key entry in backup
 */
export interface BackupKeyEntry {
  /** Key type */
  type: BackupKeyType;
  /** Key identifier */
  id: string;
  /** Key ID for indexed keys (prekeys, etc.) */
  keyId?: number;
  /** Public key component (hex) */
  publicKey?: string;
  /** Private key component (hex, encrypted) */
  privateKey?: string;
  /** Additional key data (hex) */
  data?: string;
  /** Signature if applicable (hex) */
  signature?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp (for prekeys) */
  expiresAt?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Session backup entry
 */
export interface BackupSessionEntry {
  /** Peer user ID */
  peerUserId: string;
  /** Peer device ID */
  peerDeviceId: string;
  /** Serialized session state (encrypted) */
  sessionState: string;
  /** Root key fingerprint for verification */
  rootKeyFingerprint: string;
  /** Message counters */
  sendingCounter: number;
  receivingCounter: number;
  /** Timestamps */
  createdAt: number;
  lastActivity: number;
}

/**
 * Device information for verification
 */
export interface BackupDeviceInfo {
  /** Device ID that created the backup */
  deviceId: string;
  /** Device registration ID */
  registrationId: number;
  /** Device name/description */
  deviceName?: string;
  /** Platform (web, ios, android, desktop) */
  platform: string;
  /** App version */
  appVersion: string;
  /** Device fingerprint for verification */
  deviceFingerprint: string;
}

/**
 * Complete backup payload (before encryption)
 */
export interface BackupPayload {
  /** User ID */
  userId: string;
  /** Device that created the backup */
  device: BackupDeviceInfo;
  /** Identity keys */
  identityKeys: BackupKeyEntry[];
  /** Signed pre-keys */
  signedPreKeys: BackupKeyEntry[];
  /** One-time pre-keys */
  oneTimePreKeys: BackupKeyEntry[];
  /** Session states */
  sessions: BackupSessionEntry[];
  /** Group sender keys */
  senderKeys: BackupKeyEntry[];
  /** Backup creation timestamp */
  createdAt: number;
  /** Number of messages encrypted with these keys */
  messageCount: number;
  /** Additional user settings */
  settings?: Record<string, unknown>;
}

/**
 * Backup header (unencrypted metadata)
 */
export interface BackupHeader {
  /** Magic bytes (hex) */
  magic: string;
  /** Format version */
  version: number;
  /** Creation timestamp */
  createdAt: number;
  /** User ID (for identification) */
  userId: string;
  /** Device ID that created backup */
  deviceId: string;
  /** Key derivation parameters */
  kdf: {
    algorithm: "pbkdf2-sha512";
    iterations: number;
    salt: string;
  };
  /** Encrypted payload checksum (for quick validation) */
  payloadChecksum: string;
  /** Header checksum (HMAC of header fields) */
  headerChecksum: string;
}

/**
 * Complete encrypted backup
 */
export interface EncryptedBackup {
  /** Backup header */
  header: BackupHeader;
  /** Encrypted payload (base64) */
  encryptedPayload: string;
  /** HMAC of entire backup for integrity (hex) */
  integrityTag: string;
}

/**
 * Backup restore result
 */
export interface RestoreResult {
  /** Decrypted payload */
  payload: BackupPayload;
  /** Whether device verification passed */
  deviceVerified: boolean;
  /** Warning messages */
  warnings: string[];
  /** Backup metadata */
  metadata: {
    version: number;
    createdAt: Date;
    deviceId: string;
    messageCount: number;
  };
}

/**
 * Backup validation result
 */
export interface BackupValidation {
  /** Whether backup is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Backup metadata (if parseable) */
  metadata?: {
    version: number;
    userId: string;
    deviceId: string;
    createdAt: Date;
  };
}

// ============================================================================
// Backup Creation
// ============================================================================

/**
 * Creates an encrypted backup from a payload
 *
 * @param payload - The backup payload to encrypt
 * @param encryptionKey - The derived encryption key
 * @param kdfParams - Key derivation parameters to store
 * @returns Encrypted backup
 */
export async function createEncryptedBackup(
  payload: BackupPayload,
  encryptionKey: Uint8Array,
  kdfParams: { algorithm: "pbkdf2-sha512"; iterations: number; salt: string },
): Promise<EncryptedBackup> {
  // Derive separate keys for encryption and HMAC
  const encKey = stretchKey(encryptionKey, ENCRYPTION_KEY_PURPOSE);
  const hmacKey = stretchKey(encryptionKey, HMAC_KEY_PURPOSE);

  // Serialize payload
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = stringToBytes(payloadJson);

  // Encrypt payload
  const { ciphertext, iv } = await encryptAESGCM(payloadBytes, encKey);
  const encryptedPayload = encodeEncryptedData(ciphertext, iv);
  const encryptedPayloadBase64 = bytesToBase64(encryptedPayload);

  // Calculate payload checksum
  const payloadChecksum = bytesToHex(hash256(encryptedPayload));

  // Create header
  const header: BackupHeader = {
    magic: bytesToHex(BACKUP_MAGIC),
    version: BACKUP_FORMAT_VERSION,
    createdAt: payload.createdAt,
    userId: payload.userId,
    deviceId: payload.device.deviceId,
    kdf: kdfParams,
    payloadChecksum,
    headerChecksum: "", // Will be computed below
  };

  // Compute header checksum
  const headerForHmac = { ...header, headerChecksum: "" };
  const headerBytes = stringToBytes(JSON.stringify(headerForHmac));
  header.headerChecksum = bytesToHex(hmac(sha256, hmacKey, headerBytes));

  // Compute integrity tag over entire backup
  const backupData = stringToBytes(
    JSON.stringify(header) + encryptedPayloadBase64,
  );
  const integrityTag = bytesToHex(hmac(sha256, hmacKey, backupData));

  return {
    header,
    encryptedPayload: encryptedPayloadBase64,
    integrityTag,
  };
}

/**
 * Serializes an encrypted backup to a string
 *
 * @param backup - The encrypted backup
 * @returns JSON string representation
 */
export function serializeBackup(backup: EncryptedBackup): string {
  return JSON.stringify(backup, null, 2);
}

/**
 * Serializes an encrypted backup to bytes
 *
 * @param backup - The encrypted backup
 * @returns Binary representation
 */
export function serializeBackupToBytes(backup: EncryptedBackup): Uint8Array {
  return stringToBytes(serializeBackup(backup));
}

// ============================================================================
// Backup Restoration
// ============================================================================

/**
 * Parses a backup from string
 *
 * @param backupString - JSON string backup
 * @returns Parsed backup
 * @throws Error if parsing fails
 */
export function parseBackup(backupString: string): EncryptedBackup {
  try {
    const backup = JSON.parse(backupString) as EncryptedBackup;

    // Validate structure
    if (!backup.header || !backup.encryptedPayload || !backup.integrityTag) {
      throw new Error("Invalid backup structure");
    }

    return backup;
  } catch (error) {
    throw new Error(
      `Failed to parse backup: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Parses a backup from bytes
 *
 * @param backupBytes - Binary backup data
 * @returns Parsed backup
 */
export function parseBackupFromBytes(backupBytes: Uint8Array): EncryptedBackup {
  const backupString = bytesToString(backupBytes);
  return parseBackup(backupString);
}

/**
 * Validates backup integrity without decrypting
 *
 * @param backup - The backup to validate
 * @returns Validation result
 */
export function validateBackup(backup: EncryptedBackup): BackupValidation {
  const errors: string[] = [];

  // Check magic bytes
  try {
    const magic = hexToBytes(backup.header.magic);
    if (!constantTimeEqual(magic, BACKUP_MAGIC)) {
      errors.push("Invalid backup identifier");
    }
  } catch {
    errors.push("Invalid magic bytes format");
  }

  // Check version
  if (
    backup.header.version < 1 ||
    backup.header.version > BACKUP_FORMAT_VERSION
  ) {
    errors.push(`Unsupported backup version: ${backup.header.version}`);
  }

  // Check payload checksum format
  if (!/^[0-9a-f]{64}$/i.test(backup.header.payloadChecksum)) {
    errors.push("Invalid payload checksum format");
  }

  // Check header checksum format
  if (!/^[0-9a-f]{64}$/i.test(backup.header.headerChecksum)) {
    errors.push("Invalid header checksum format");
  }

  // Check integrity tag format
  if (!/^[0-9a-f]{64}$/i.test(backup.integrityTag)) {
    errors.push("Invalid integrity tag format");
  }

  // Check payload format
  try {
    const payloadBytes = base64ToBytes(backup.encryptedPayload);
    if (payloadBytes.length < MIN_BACKUP_SIZE) {
      errors.push("Backup payload too small");
    }
    if (payloadBytes.length > MAX_BACKUP_SIZE) {
      errors.push("Backup payload too large");
    }
  } catch {
    errors.push("Invalid encrypted payload format");
  }

  // Check KDF parameters
  if (
    !backup.header.kdf ||
    backup.header.kdf.algorithm !== "pbkdf2-sha512" ||
    backup.header.kdf.iterations < 100000
  ) {
    errors.push("Invalid or weak key derivation parameters");
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    metadata: valid
      ? {
          version: backup.header.version,
          userId: backup.header.userId,
          deviceId: backup.header.deviceId,
          createdAt: new Date(backup.header.createdAt),
        }
      : undefined,
  };
}

/**
 * Decrypts and restores a backup
 *
 * @param backup - The encrypted backup
 * @param encryptionKey - The derived encryption key
 * @param currentDeviceId - Current device ID for verification
 * @returns Restore result
 * @throws Error if decryption or verification fails
 */
export async function restoreBackup(
  backup: EncryptedBackup,
  encryptionKey: Uint8Array,
  currentDeviceId?: string,
): Promise<RestoreResult> {
  const warnings: string[] = [];

  // Derive separate keys for encryption and HMAC
  const encKey = stretchKey(encryptionKey, ENCRYPTION_KEY_PURPOSE);
  const hmacKey = stretchKey(encryptionKey, HMAC_KEY_PURPOSE);

  // Verify integrity tag
  const backupData = stringToBytes(
    JSON.stringify(backup.header) + backup.encryptedPayload,
  );
  const computedTag = hmac(sha256, hmacKey, backupData);
  if (!constantTimeEqual(computedTag, hexToBytes(backup.integrityTag))) {
    throw new Error(
      "Backup integrity verification failed - data may be corrupted or tampered",
    );
  }

  // Verify header checksum
  const headerForHmac = { ...backup.header, headerChecksum: "" };
  const headerBytes = stringToBytes(JSON.stringify(headerForHmac));
  const computedHeaderChecksum = hmac(sha256, hmacKey, headerBytes);
  if (
    !constantTimeEqual(
      computedHeaderChecksum,
      hexToBytes(backup.header.headerChecksum),
    )
  ) {
    throw new Error("Header integrity verification failed");
  }

  // Verify payload checksum
  const encryptedPayload = base64ToBytes(backup.encryptedPayload);
  const computedPayloadChecksum = hash256(encryptedPayload);
  if (
    !constantTimeEqual(
      computedPayloadChecksum,
      hexToBytes(backup.header.payloadChecksum),
    )
  ) {
    throw new Error("Payload checksum verification failed");
  }

  // Decrypt payload
  const { ciphertext, iv } = decodeEncryptedData(encryptedPayload);
  let payloadBytes: Uint8Array;
  try {
    payloadBytes = await decryptAESGCM(ciphertext, encKey, iv);
  } catch (error) {
    throw new Error(
      "Failed to decrypt backup - incorrect passphrase or corrupted data",
    );
  }

  // Parse payload
  const payloadJson = bytesToString(payloadBytes);
  const payload = JSON.parse(payloadJson) as BackupPayload;

  // Device verification
  let deviceVerified = false;
  if (currentDeviceId) {
    if (payload.device.deviceId === currentDeviceId) {
      deviceVerified = true;
    } else {
      warnings.push("Backup was created on a different device");
    }
  }

  // Version warnings
  if (backup.header.version < BACKUP_FORMAT_VERSION) {
    warnings.push(`Backup uses older format version ${backup.header.version}`);
  }

  // Age warnings
  const backupAge = Date.now() - backup.header.createdAt;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (backupAge > thirtyDays) {
    warnings.push("Backup is more than 30 days old");
  }

  return {
    payload,
    deviceVerified,
    warnings,
    metadata: {
      version: backup.header.version,
      createdAt: new Date(backup.header.createdAt),
      deviceId: payload.device.deviceId,
      messageCount: payload.messageCount,
    },
  };
}

// ============================================================================
// Helper Functions for Building Backup Payload
// ============================================================================

/**
 * Creates a backup key entry from raw key data
 *
 * @param type - Key type
 * @param id - Key identifier
 * @param publicKey - Public key bytes
 * @param privateKey - Private key bytes
 * @param options - Additional options
 * @returns Backup key entry
 */
export function createKeyEntry(
  type: BackupKeyType,
  id: string,
  publicKey: Uint8Array | null,
  privateKey: Uint8Array | null,
  options?: {
    keyId?: number;
    signature?: Uint8Array;
    data?: Uint8Array;
    expiresAt?: number;
    metadata?: Record<string, unknown>;
  },
): BackupKeyEntry {
  return {
    type,
    id,
    keyId: options?.keyId,
    publicKey: publicKey ? bytesToHex(publicKey) : undefined,
    privateKey: privateKey ? bytesToHex(privateKey) : undefined,
    signature: options?.signature ? bytesToHex(options.signature) : undefined,
    data: options?.data ? bytesToHex(options.data) : undefined,
    createdAt: Date.now(),
    expiresAt: options?.expiresAt,
    metadata: options?.metadata,
  };
}

/**
 * Creates a session backup entry
 *
 * @param peerUserId - Peer user ID
 * @param peerDeviceId - Peer device ID
 * @param sessionState - Serialized session state
 * @param rootKey - Root key for fingerprint
 * @param counters - Message counters
 * @returns Session backup entry
 */
export function createSessionEntry(
  peerUserId: string,
  peerDeviceId: string,
  sessionState: Uint8Array,
  rootKey: Uint8Array,
  counters: { sending: number; receiving: number },
  timestamps: { created: number; lastActivity: number },
): BackupSessionEntry {
  return {
    peerUserId,
    peerDeviceId,
    sessionState: bytesToBase64(sessionState),
    rootKeyFingerprint: bytesToHex(hash256(rootKey)).substring(0, 16),
    sendingCounter: counters.sending,
    receivingCounter: counters.receiving,
    createdAt: timestamps.created,
    lastActivity: timestamps.lastActivity,
  };
}

/**
 * Creates device info for backup
 *
 * @param deviceId - Device ID
 * @param registrationId - Registration ID
 * @param platform - Platform identifier
 * @param appVersion - App version
 * @param deviceName - Optional device name
 * @returns Device info
 */
export function createDeviceInfo(
  deviceId: string,
  registrationId: number,
  platform: string,
  appVersion: string,
  deviceName?: string,
): BackupDeviceInfo {
  // Create device fingerprint
  const fingerprintData = stringToBytes(
    `${deviceId}:${registrationId}:${platform}`,
  );
  const fingerprint = bytesToHex(hash256(fingerprintData)).substring(0, 32);

  return {
    deviceId,
    registrationId,
    deviceName,
    platform,
    appVersion,
    deviceFingerprint: fingerprint,
  };
}

/**
 * Extracts key bytes from a backup key entry
 *
 * @param entry - Backup key entry
 * @returns Key components
 */
export function extractKeyFromEntry(entry: BackupKeyEntry): {
  publicKey: Uint8Array | null;
  privateKey: Uint8Array | null;
  signature: Uint8Array | null;
  data: Uint8Array | null;
} {
  return {
    publicKey: entry.publicKey ? hexToBytes(entry.publicKey) : null,
    privateKey: entry.privateKey ? hexToBytes(entry.privateKey) : null,
    signature: entry.signature ? hexToBytes(entry.signature) : null,
    data: entry.data ? hexToBytes(entry.data) : null,
  };
}

/**
 * Extracts session state from a backup session entry
 *
 * @param entry - Session backup entry
 * @returns Session state bytes
 */
export function extractSessionState(entry: BackupSessionEntry): Uint8Array {
  return base64ToBytes(entry.sessionState);
}

// ============================================================================
// Backup Comparison and Merging
// ============================================================================

/**
 * Compares two backups and returns differences
 *
 * @param older - Older backup
 * @param newer - Newer backup
 * @returns Comparison result
 */
export function compareBackups(
  older: BackupPayload,
  newer: BackupPayload,
): {
  addedKeys: number;
  removedKeys: number;
  addedSessions: number;
  removedSessions: number;
  messageCountDiff: number;
} {
  const olderKeyIds = new Set([
    ...older.identityKeys.map((k) => k.id),
    ...older.signedPreKeys.map((k) => k.id),
    ...older.oneTimePreKeys.map((k) => k.id),
  ]);

  const newerKeyIds = new Set([
    ...newer.identityKeys.map((k) => k.id),
    ...newer.signedPreKeys.map((k) => k.id),
    ...newer.oneTimePreKeys.map((k) => k.id),
  ]);

  const olderSessionIds = new Set(
    older.sessions.map((s) => `${s.peerUserId}:${s.peerDeviceId}`),
  );
  const newerSessionIds = new Set(
    newer.sessions.map((s) => `${s.peerUserId}:${s.peerDeviceId}`),
  );

  let addedKeys = 0;
  let removedKeys = 0;
  for (const id of newerKeyIds) {
    if (!olderKeyIds.has(id)) addedKeys++;
  }
  for (const id of olderKeyIds) {
    if (!newerKeyIds.has(id)) removedKeys++;
  }

  let addedSessions = 0;
  let removedSessions = 0;
  for (const id of newerSessionIds) {
    if (!olderSessionIds.has(id)) addedSessions++;
  }
  for (const id of olderSessionIds) {
    if (!newerSessionIds.has(id)) removedSessions++;
  }

  return {
    addedKeys,
    removedKeys,
    addedSessions,
    removedSessions,
    messageCountDiff: newer.messageCount - older.messageCount,
  };
}

// ============================================================================
// Exports
// ============================================================================

export const backupEncryption = {
  // Backup creation
  createEncryptedBackup,
  serializeBackup,
  serializeBackupToBytes,

  // Backup restoration
  parseBackup,
  parseBackupFromBytes,
  validateBackup,
  restoreBackup,

  // Helper functions
  createKeyEntry,
  createSessionEntry,
  createDeviceInfo,
  extractKeyFromEntry,
  extractSessionState,
  compareBackups,

  // Constants
  BACKUP_FORMAT_VERSION,
  BackupKeyType,
};

export default backupEncryption;
