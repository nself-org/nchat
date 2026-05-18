/**
 * E2EE Manager
 * Main entry point for End-to-End Encryption using Signal Protocol
 */

import type { ApolloClient } from "@apollo/client";
import { crypto } from "./crypto";
import KeyManager from "./key-manager";
import SessionManager from "./session-manager";
import type { EncryptedMessage } from "./signal-client";

// ============================================================================
// TYPES
// ============================================================================

export interface E2EEConfig {
  enabled: boolean;
  deviceId?: string;
  autoInitialize?: boolean;
}

export interface E2EEStatus {
  initialized: boolean;
  masterKeyInitialized: boolean;
  deviceKeysGenerated: boolean;
  deviceId?: string;
}

export interface MessageEncryptionResult {
  encryptedPayload: Uint8Array;
  type: "PreKey" | "Normal";
  deviceId: string;
}

// ============================================================================
// E2EE MANAGER CLASS
// ============================================================================

export class E2EEManager {
  private apolloClient: ApolloClient<any>;
  private keyManager: KeyManager;
  private sessionManager: SessionManager | null = null;
  private userId: string;
  private deviceId: string | null = null;
  private initialized: boolean = false;

  constructor(apolloClient: ApolloClient<any>, userId: string) {
    this.apolloClient = apolloClient;
    this.userId = userId;
    this.keyManager = new KeyManager(apolloClient);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize E2EE with user's password
   */
  async initialize(password: string, deviceId?: string): Promise<void> {
    // Initialize master key
    await this.keyManager.initializeMasterKey(password);

    // Generate or load device keys
    this.deviceId = deviceId || crypto.generateDeviceId();

    let deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);

    if (!deviceKeys) {
      // Generate new device keys
      deviceKeys = await this.keyManager.generateDeviceKeys(this.deviceId);
      await this.keyManager.uploadDeviceKeys(deviceKeys);
    }

    // Initialize session manager
    this.sessionManager = new SessionManager(
      this.apolloClient,
      this.keyManager,
      this.userId,
      this.deviceId,
    );

    this.initialized = true;

    // Store device ID in local storage
    if (typeof window !== "undefined") {
      localStorage.setItem("e2ee_device_id", this.deviceId);
    }
  }

  /**
   * Recover E2EE using recovery code
   */
  async recover(recoveryCode: string, deviceId?: string): Promise<void> {
    await this.keyManager.recoverMasterKey(recoveryCode);

    this.deviceId = deviceId || crypto.generateDeviceId();

    // Generate new device keys
    const deviceKeys = await this.keyManager.generateDeviceKeys(this.deviceId);
    await this.keyManager.uploadDeviceKeys(deviceKeys);

    // Initialize session manager
    this.sessionManager = new SessionManager(
      this.apolloClient,
      this.keyManager,
      this.userId,
      this.deviceId,
    );

    this.initialized = true;
  }

  /**
   * Get E2EE status
   */
  getStatus(): E2EEStatus {
    return {
      initialized: this.initialized,
      masterKeyInitialized: this.keyManager.getMasterKey() !== null,
      deviceKeysGenerated: this.deviceId !== null,
      deviceId: this.deviceId || undefined,
    };
  }

  /**
   * Check if E2EE is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  // ==========================================================================
  // MESSAGE ENCRYPTION/DECRYPTION
  // ==========================================================================

  /**
   * Encrypt a message for a specific user
   */
  async encryptMessage(
    plaintext: string,
    recipientUserId: string,
    recipientDeviceId: string,
  ): Promise<MessageEncryptionResult> {
    if (!this.initialized || !this.sessionManager || !this.deviceId) {
      throw new Error("E2EE not initialized");
    }

    const encryptedMessage = await this.sessionManager.encryptMessage(
      plaintext,
      recipientUserId,
      recipientDeviceId,
    );

    return {
      encryptedPayload: encryptedMessage.body,
      type: encryptedMessage.type,
      deviceId: this.deviceId,
    };
  }

  /**
   * Decrypt a message from a specific user
   */
  async decryptMessage(
    encryptedPayload: Uint8Array,
    messageType: "PreKey" | "Normal",
    senderUserId: string,
    senderDeviceId: string,
  ): Promise<string> {
    if (!this.initialized || !this.sessionManager) {
      throw new Error("E2EE not initialized");
    }

    const encryptedMessage: EncryptedMessage = {
      type: messageType,
      body: encryptedPayload,
      registrationId: 0,
    };

    const plaintextBytes = await this.sessionManager.decryptMessage(
      encryptedMessage,
      senderUserId,
      senderDeviceId,
    );

    return crypto.bytesToString(plaintextBytes);
  }

  /**
   * Check if a session exists with a peer
   */
  async hasSession(peerUserId: string, peerDeviceId: string): Promise<boolean> {
    if (!this.initialized || !this.sessionManager) {
      return false;
    }

    return this.sessionManager.hasSession(peerUserId, peerDeviceId);
  }

  // ==========================================================================
  // KEY MANAGEMENT
  // ==========================================================================

  /**
   * Generate safety number with a peer
   */
  async generateSafetyNumber(
    localUserId: string,
    peerUserId: string,
    peerIdentityKey: Uint8Array,
  ): Promise<string> {
    if (!this.initialized || !this.deviceId) {
      throw new Error("E2EE not initialized");
    }

    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    return crypto.generateSafetyNumber(
      deviceKeys.identityKeyPair.publicKey,
      localUserId,
      peerIdentityKey,
      peerUserId,
    );
  }

  /**
   * Format safety number for display
   */
  formatSafetyNumber(safetyNumber: string): string {
    return crypto.formatSafetyNumber(safetyNumber);
  }

  /**
   * Generate QR code data for safety number
   */
  async generateSafetyNumberQR(
    localUserId: string,
    peerUserId: string,
    peerIdentityKey: Uint8Array,
  ): Promise<string> {
    if (!this.initialized || !this.deviceId) {
      throw new Error("E2EE not initialized");
    }

    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    return crypto.generateSafetyNumberQR(
      deviceKeys.identityKeyPair.publicKey,
      localUserId,
      peerIdentityKey,
      peerUserId,
    );
  }

  /**
   * Rotate signed prekey
   */
  async rotateSignedPreKey(): Promise<void> {
    if (!this.initialized || !this.deviceId) {
      throw new Error("E2EE not initialized");
    }

    await this.keyManager.rotateSignedPreKey(this.deviceId);
  }

  /**
   * Replenish one-time prekeys
   */
  async replenishOneTimePreKeys(count: number = 50): Promise<void> {
    if (!this.initialized || !this.deviceId) {
      throw new Error("E2EE not initialized");
    }

    await this.keyManager.replenishOneTimePreKeys(this.deviceId, count);
  }

  /**
   * Get recovery code (only available in session storage during setup)
   */
  getRecoveryCode(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    const recoveryCode = sessionStorage.getItem("e2ee_recovery_code");
    return recoveryCode;
  }

  /**
   * Clear recovery code from session storage
   */
  clearRecoveryCode(): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("e2ee_recovery_code");
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear E2EE state (logout)
   */
  destroy(): void {
    this.keyManager.clearMasterKey();
    this.sessionManager = null;
    this.deviceId = null;
    this.initialized = false;

    if (typeof window !== "undefined") {
      localStorage.removeItem("e2ee_device_id");
      sessionStorage.removeItem("e2ee_recovery_code");
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let e2eeManagerInstance: E2EEManager | null = null;

/**
 * Get or create E2EE manager instance
 */
export function getE2EEManager(
  apolloClient: ApolloClient<any>,
  userId: string,
): E2EEManager {
  if (!e2eeManagerInstance) {
    e2eeManagerInstance = new E2EEManager(apolloClient, userId);
  }
  return e2eeManagerInstance;
}

/**
 * Reset E2EE manager instance
 */
export function resetE2EEManager(): void {
  if (e2eeManagerInstance) {
    e2eeManagerInstance.destroy();
  }
  e2eeManagerInstance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { crypto } from "./crypto";
export { KeyManager } from "./key-manager";
export { SessionManager } from "./session-manager";
export { signalClient } from "./signal-client";

// Attachment E2EE exports
export {
  attachmentEncryption,
  generateAttachmentKey,
  encryptAttachment,
  decryptAttachment,
  encryptSmallAttachment,
  decryptSmallAttachment,
  validateAttachmentKey,
  wipeAttachmentKey,
  type AttachmentKey,
  type EncryptedAttachment,
  type DecryptedAttachment,
} from "./attachment-encryption";

export {
  attachmentKeyManager,
  AttachmentKeyManager,
  createAttachmentKeyManager,
  deriveAttachmentKey,
  createContextHash,
  encryptAttachmentKey,
  decryptAttachmentKey,
  type KeyDerivationContext,
  type EncryptedAttachmentKey,
} from "./attachment-key-manager";

export {
  secureMetadata,
  encryptMetadata,
  decryptMetadata,
  validateMetadata,
  sanitizeMetadata,
  createMinimalMetadata,
  type AttachmentMetadata,
  type EncryptedMetadata,
  type ThumbnailData,
} from "./secure-metadata";

export {
  streamingCrypto,
  createEncryptionStream,
  createDecryptionStream,
  encryptStream,
  decryptStream,
  encryptFileStream,
  decryptBlobStream,
  type StreamProgress,
  type StreamingEncryptionResult,
  type StreamingDecryptionResult,
} from "./streaming-crypto";

// Sealed Sender exports (Task 86)
export {
  sealedSender,
  sealMessageSimple,
  unsealMessage,
  serializeCertificate,
  deserializeCertificate,
  serializeEnvelope,
  deserializeEnvelope,
  envelopeToBase64,
  envelopeFromBase64,
  validateCertificateStructure,
  validateEnvelopeStructure,
  SealedSenderMessageType,
  SEALED_SENDER_VERSION,
  type SenderCertificate,
  type SealedSenderEnvelope,
  type SealedSenderContent,
  type UnsealedMessage,
  type SealOptions,
  type UnsealOptions,
} from "./sealed-sender";

export {
  senderCertificate,
  generateServerSigningKeyPair,
  exportServerPublicKey,
  importServerPublicKey,
  issueCertificate,
  verifyCertificateSignature,
  validateCertificate,
  shouldRenewCertificate,
  SenderCertificateManager,
  createSenderCertificateManager,
  certificateToBase64,
  certificateFromBase64,
  DEFAULT_CERTIFICATE_VALIDITY_MS,
  MAX_CERTIFICATE_VALIDITY_MS,
  MIN_CERTIFICATE_VALIDITY_MS,
  CERTIFICATE_RENEWAL_THRESHOLD_MS,
  type ServerSigningKeyPair,
  type CertificateRequest,
  type CertificateResponse,
  type CertificateValidationResult,
  type CertificateStore,
} from "./sender-certificate";

export {
  unidentifiedSender,
  deriveAccessKey,
  generateAccessKey,
  validateAccessKey,
  generateDeliveryToken,
  validateDeliveryToken,
  useDeliveryToken,
  UnidentifiedSender,
  UnidentifiedRecipient,
  UnidentifiedDeliveryRateLimiter,
  createUnidentifiedSender,
  createUnidentifiedRecipient,
  createDefaultAccessConfig,
  verifyThreatModel,
  UNIDENTIFIED_TOKEN_VALIDITY_MS,
  MAX_MESSAGES_PER_TOKEN,
  RATE_LIMIT_WINDOW_MS,
  MAX_MESSAGES_PER_WINDOW,
  type UnidentifiedAccessConfig,
  type UnidentifiedDeliveryToken,
  type UnidentifiedMessage,
  type DeliveryResult,
  type UnidentifiedSenderContext,
  type UnidentifiedRecipientContext,
  type ThreatModelVerification,
} from "./unidentified-sender";

// Backup and Recovery exports (Task 78)
export {
  backupKeyDerivation,
  deriveBackupKey,
  verifyAndDeriveKey,
  toStorableParams,
  assessPassphraseStrength,
  isValidPassphrase,
  generateSuggestedPassphrase,
  stretchKey,
  deriveMultipleKeys,
  SecurityLevel,
  ITERATION_COUNTS,
  MIN_PASSPHRASE_LENGTH,
  type DerivedKeyResult,
  type DerivedKeyParams,
  type PassphraseStrength,
} from "./backup-key-derivation";

export {
  backupEncryption,
  createEncryptedBackup,
  restoreBackup,
  validateBackup,
  parseBackup,
  parseBackupFromBytes,
  serializeBackup,
  serializeBackupToBytes,
  createKeyEntry,
  createSessionEntry,
  createDeviceInfo,
  extractKeyFromEntry,
  extractSessionState,
  compareBackups,
  BackupKeyType,
  BACKUP_FORMAT_VERSION,
  type EncryptedBackup,
  type BackupPayload,
  type BackupKeyEntry,
  type BackupSessionEntry,
  type BackupDeviceInfo,
  type RestoreResult,
  type BackupValidation,
  type BackupHeader,
} from "./backup-encryption";

export {
  recoveryKey,
  generateRecoveryKey,
  formatRecoveryKey,
  normalizeRecoveryKey,
  validateRecoveryKey,
  looksLikeRecoveryKey,
  encryptMasterKeyWithRecovery,
  decryptMasterKeyWithRecovery,
  createRecoveryKeyHash,
  verifyRecoveryKeyHash,
  checkRateLimit,
  recordVerificationAttempt,
  getRecoveryKeyGroups,
  getRecoveryPhraseStrength,
  maskRecoveryKey,
  createRecoveryKeyQR,
  parseRecoveryKeyQR,
  MAX_VERIFICATION_ATTEMPTS,
  LOCKOUT_DURATION_SECONDS,
  ATTEMPT_WINDOW_SECONDS,
  type RecoveryKeyResult,
  type ValidatedRecoveryKey,
  type EncryptedMasterKey,
  type VerificationAttempt,
  type RateLimitResult,
} from "./recovery-key";

// Safety Number Verification exports (Task 79)
export {
  safetyNumber,
  generateSafetyNumber,
  generateSafetyNumberSimple,
  generateFingerprint,
  generateScannableFingerprint,
  formatSafetyNumber,
  createDisplayGrid,
  parseSafetyNumber,
  validateSafetyNumberFormat,
  compareSafetyNumbers,
  verifySafetyNumber,
  verifyFingerprint,
  detectKeyChange,
  createKeyChangeEvent,
  createVerificationRecord,
  invalidateVerification,
  createVerificationState,
  updateVerificationState,
  handleKeyChangeInState,
  serializeVerificationRecord,
  deserializeVerificationRecord,
  serializeVerificationState,
  deserializeVerificationState,
  formatFingerprintHex,
  getShortFingerprint,
  SAFETY_NUMBER_VERSION,
  SAFETY_NUMBER_LENGTH,
  SAFETY_NUMBER_GROUP_SIZE,
  SAFETY_NUMBER_GROUP_COUNT,
  FINGERPRINT_ITERATIONS,
  FINGERPRINT_SIZE,
  type SafetyNumberResult,
  type SafetyNumberInput,
  type IdentityKeyChange,
  type VerificationRecord,
  type VerificationMethod,
  type TrustLevel,
  type VerificationState,
  type MismatchResult,
} from "./safety-number";

export {
  verificationQR,
  generateQRCode,
  generateScannableData,
  parseQRCode,
  parseScannableData,
  verifyQRCode,
  verifyScannedFingerprint,
  performMutualVerification,
  isValidQRCodeData,
  getQRCodeAge,
  isQRCodeExpired,
  createCompactSafetyNumber,
  generateQRCodeDataUrl,
  parseQRCodeDataUrl,
  QR_FORMAT_VERSION,
  MAX_QR_DATA_SIZE,
  QR_PREFIX,
  DEFAULT_ERROR_CORRECTION,
  type QRCodePayload,
  type QRGenerationResult,
  type QRScanResult,
  type QRVerificationResult,
  type ScannableFingerprintData,
  type QRGenerationOptions,
  type QRErrorCorrectionLevel,
} from "./verification-qr";

export default E2EEManager;
