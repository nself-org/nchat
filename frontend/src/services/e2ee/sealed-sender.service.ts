/**
 * Sealed Sender Service
 *
 * High-level service for sealed sender messaging operations.
 * Integrates certificate management, message sealing/unsealing,
 * and unidentified delivery.
 *
 * Features:
 * - Automatic certificate management
 * - Server-side certificate issuance
 * - Client-side message sealing/unsealing
 * - Unidentified delivery with fallback
 * - Rate limiting and abuse prevention
 *
 * This service provides a complete implementation of Signal-style
 * sealed sender for sender privacy.
 */

import { logger } from "@/lib/logger";
import {
  type SealedSenderEnvelope,
  type UnsealedMessage,
  type SenderCertificate,
  SealedSenderMessageType,
  sealMessageSimple,
  unsealMessage,
  serializeEnvelope,
  deserializeEnvelope,
  envelopeToBase64,
  envelopeFromBase64,
  validateEnvelopeStructure,
  SEALED_SENDER_VERSION,
} from "@/lib/e2ee/sealed-sender";
import {
  type ServerSigningKeyPair,
  type CertificateRequest,
  type CertificateResponse,
  type CertificateValidationResult,
  issueCertificate,
  validateCertificate,
  verifyCertificateSignature,
  generateServerSigningKeyPair,
  SenderCertificateManager,
  createSenderCertificateManager,
  DEFAULT_CERTIFICATE_VALIDITY_MS,
  CERTIFICATE_RENEWAL_THRESHOLD_MS,
} from "@/lib/e2ee/sender-certificate";
import {
  type UnidentifiedAccessConfig,
  type UnidentifiedMessage,
  type UnidentifiedDeliveryToken,
  type DeliveryResult,
  UnidentifiedSender,
  UnidentifiedRecipient,
  UnidentifiedDeliveryRateLimiter,
  createUnidentifiedSender,
  createUnidentifiedRecipient,
  createDefaultAccessConfig,
  generateDeliveryToken,
  validateDeliveryToken,
  verifyThreatModel,
} from "@/lib/e2ee/unidentified-sender";

// ============================================================================
// Types
// ============================================================================

/**
 * Service configuration
 */
export interface SealedSenderServiceConfig {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Identity public key */
  identityPublicKey: Uint8Array;
  /** Identity private key */
  identityPrivateKey: Uint8Array;
  /** Storage for persistence */
  storage?: Storage;
  /** Enable unidentified delivery */
  enableUnidentifiedDelivery?: boolean;
  /** Access configuration */
  accessConfig?: UnidentifiedAccessConfig;
  /** Server URL for certificate API */
  serverUrl?: string;
}

/**
 * Service status
 */
export interface SealedSenderServiceStatus {
  /** Whether service is initialized */
  initialized: boolean;
  /** Whether sealed sender is available */
  sealedSenderAvailable: boolean;
  /** Certificate status */
  certificateStatus: {
    hasCertificate: boolean;
    needsRenewal: boolean;
    expiresAt: number | null;
    remainingValidityMs: number;
  };
  /** Unidentified delivery status */
  unidentifiedDeliveryStatus: {
    enabled: boolean;
    configured: boolean;
  };
  /** Rate limit status */
  rateLimitStatus: {
    remainingMessages: number;
    resetAt: number | null;
  };
}

/**
 * Message sealing options
 */
export interface SealingOptions {
  /** Message content */
  content: Uint8Array;
  /** Recipient user ID */
  recipientUserId: string;
  /** Recipient device ID */
  recipientDeviceId: string;
  /** Recipient identity key */
  recipientIdentityKey: Uint8Array;
  /** Message type */
  messageType?: SealedSenderMessageType;
  /** Use unidentified delivery if available */
  useUnidentifiedDelivery?: boolean;
}

/**
 * Message unsealing options
 */
export interface UnsealingOptions {
  /** Sealed envelope or Base64 string */
  envelope: SealedSenderEnvelope | string;
  /** Whether this is from unidentified delivery */
  fromUnidentifiedDelivery?: boolean;
}

/**
 * Server-side certificate management
 */
export interface CertificateServer {
  /** Issue a certificate */
  issueCertificate: (
    request: CertificateRequest,
  ) => Promise<CertificateResponse>;
  /** Get server public keys */
  getPublicKeys: () => Array<{ keyId: number; publicKey: Uint8Array }>;
  /** Rotate signing key */
  rotateSigningKey: () => Promise<void>;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_PREFIX = "nchat_sealed_sender_";
const CERTIFICATE_KEY = `${STORAGE_PREFIX}certificate`;
const SERVER_KEYS_KEY = `${STORAGE_PREFIX}server_keys`;
const ACCESS_CONFIG_KEY = `${STORAGE_PREFIX}access_config`;
const TOKENS_KEY = `${STORAGE_PREFIX}tokens`;

// ============================================================================
// Sealed Sender Service
// ============================================================================

/**
 * Main sealed sender service
 */
export class SealedSenderService {
  private config: SealedSenderServiceConfig;
  private certificateManager: SenderCertificateManager | null = null;
  private unidentifiedSender: UnidentifiedSender | null = null;
  private unidentifiedRecipient: UnidentifiedRecipient | null = null;
  private serverPublicKeys: Map<number, Uint8Array> = new Map();
  private initialized = false;
  private refreshCertificateCallback:
    | ((request: CertificateRequest) => Promise<CertificateResponse>)
    | null = null;

  constructor(config: SealedSenderServiceConfig) {
    this.config = {
      ...config,
      enableUnidentifiedDelivery: config.enableUnidentifiedDelivery ?? true,
      accessConfig: config.accessConfig ?? createDefaultAccessConfig(),
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the sealed sender service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Sealed sender service already initialized");
      return;
    }

    try {
      // Create certificate manager
      this.certificateManager = createSenderCertificateManager(
        this.config.userId,
        this.config.deviceId,
        this.config.identityPublicKey,
      );

      // Load persisted state
      await this.loadState();

      // Set up certificate refresh callback
      if (this.refreshCertificateCallback) {
        this.certificateManager.setRefreshCallback(
          this.refreshCertificateCallback,
        );
      }

      // Create unidentified sender/recipient if enabled
      if (this.config.enableUnidentifiedDelivery && this.certificateManager) {
        this.unidentifiedSender = createUnidentifiedSender(
          this.config.userId,
          this.config.deviceId,
          this.config.identityPublicKey,
          this.config.identityPrivateKey,
          this.certificateManager,
        );

        this.unidentifiedRecipient = createUnidentifiedRecipient(
          this.config.userId,
          this.config.deviceId,
          this.config.identityPublicKey,
          this.config.identityPrivateKey,
          this.config.accessConfig!,
          (cert) => this.verifyCertificate(cert),
        );
      }

      this.initialized = true;

      logger.info("Sealed sender service initialized", {
        userId: this.config.userId,
        unidentifiedDelivery: this.config.enableUnidentifiedDelivery,
      });
    } catch (error) {
      logger.error("Failed to initialize sealed sender service", { error });
      throw error;
    }
  }

  /**
   * Sets the callback for refreshing certificates from server
   */
  setCertificateRefreshCallback(
    callback: (request: CertificateRequest) => Promise<CertificateResponse>,
  ): void {
    this.refreshCertificateCallback = callback;
    if (this.certificateManager) {
      this.certificateManager.setRefreshCallback(callback);
    }
  }

  /**
   * Adds a server public key for certificate verification
   */
  addServerPublicKey(keyId: number, publicKey: Uint8Array): void {
    this.serverPublicKeys.set(keyId, publicKey);
    if (this.certificateManager) {
      this.certificateManager.addServerPublicKey(keyId, publicKey);
    }
  }

  /**
   * Checks if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gets service status
   */
  getStatus(): SealedSenderServiceStatus {
    const certificate = this.certificateManager?.getCertificate();
    const now = Date.now();

    return {
      initialized: this.initialized,
      sealedSenderAvailable: this.initialized && !!certificate,
      certificateStatus: {
        hasCertificate: !!certificate,
        needsRenewal: certificate
          ? certificate.expiresAt - now < CERTIFICATE_RENEWAL_THRESHOLD_MS
          : true,
        expiresAt: certificate?.expiresAt ?? null,
        remainingValidityMs: certificate
          ? Math.max(0, certificate.expiresAt - now)
          : 0,
      },
      unidentifiedDeliveryStatus: {
        enabled: this.config.enableUnidentifiedDelivery ?? false,
        configured: !!this.unidentifiedSender && !!this.unidentifiedRecipient,
      },
      rateLimitStatus: {
        remainingMessages: 30, // Would need to track this properly
        resetAt: null,
      },
    };
  }

  // ==========================================================================
  // Message Sealing
  // ==========================================================================

  /**
   * Seals a message with sender privacy
   */
  async sealMessage(options: SealingOptions): Promise<SealedSenderEnvelope> {
    this.ensureInitialized();

    const certificate = await this.certificateManager!.getValidCertificate();

    const envelope = await sealMessageSimple({
      senderCertificate: certificate,
      senderIdentityPrivateKey: this.config.identityPrivateKey,
      senderIdentityPublicKey: this.config.identityPublicKey,
      recipientIdentityKey: options.recipientIdentityKey,
      encryptedMessage: options.content,
      messageType: options.messageType ?? SealedSenderMessageType.MESSAGE,
    });

    logger.debug("Message sealed", {
      recipientUserId: options.recipientUserId,
      messageType: options.messageType,
    });

    return envelope;
  }

  /**
   * Seals a message and returns Base64 for transport
   */
  async sealMessageBase64(options: SealingOptions): Promise<string> {
    const envelope = await this.sealMessage(options);
    return envelopeToBase64(envelope);
  }

  /**
   * Creates an unidentified message for delivery
   */
  async createUnidentifiedMessage(
    options: SealingOptions,
  ): Promise<UnidentifiedMessage> {
    this.ensureInitialized();

    if (!this.unidentifiedSender) {
      throw new Error("Unidentified delivery not configured");
    }

    return this.unidentifiedSender.createUnidentifiedMessage(
      options.recipientUserId,
      options.recipientDeviceId,
      options.recipientIdentityKey,
      options.content,
      options.messageType ?? SealedSenderMessageType.MESSAGE,
    );
  }

  // ==========================================================================
  // Message Unsealing
  // ==========================================================================

  /**
   * Unseals a message and reveals sender identity
   */
  async unsealMessage(options: UnsealingOptions): Promise<UnsealedMessage> {
    this.ensureInitialized();

    // Parse envelope if string
    const envelope =
      typeof options.envelope === "string"
        ? envelopeFromBase64(options.envelope)
        : options.envelope;

    // Validate envelope structure
    const errors = validateEnvelopeStructure(envelope);
    if (errors.length > 0) {
      throw new Error(`Invalid envelope: ${errors.join(", ")}`);
    }

    // Unseal the message
    const unsealed = await unsealMessage({
      envelope,
      recipientIdentityPrivateKey: this.config.identityPrivateKey,
      recipientIdentityPublicKey: this.config.identityPublicKey,
      verifyCertificate: (cert) => this.verifyCertificate(cert),
    });

    logger.debug("Message unsealed", {
      senderUserId: unsealed.senderUserId,
      messageType: unsealed.messageType,
    });

    return unsealed;
  }

  /**
   * Processes an unidentified message
   */
  async processUnidentifiedMessage(
    message: UnidentifiedMessage,
  ): Promise<UnsealedMessage> {
    this.ensureInitialized();

    if (!this.unidentifiedRecipient) {
      throw new Error("Unidentified delivery not configured");
    }

    return this.unidentifiedRecipient.processUnidentifiedMessage(message);
  }

  // ==========================================================================
  // Certificate Management
  // ==========================================================================

  /**
   * Gets the current sender certificate
   */
  getCertificate(): SenderCertificate | null {
    return this.certificateManager?.getCertificate() ?? null;
  }

  /**
   * Refreshes the sender certificate
   */
  async refreshCertificate(): Promise<void> {
    this.ensureInitialized();
    await this.certificateManager!.refreshCertificate();
    await this.persistState();
  }

  /**
   * Verifies a sender certificate
   */
  async verifyCertificate(certificate: SenderCertificate): Promise<boolean> {
    const serverPublicKey = this.serverPublicKeys.get(certificate.serverKeyId);
    if (!serverPublicKey) {
      logger.warn("Unknown server key ID for certificate", {
        serverKeyId: certificate.serverKeyId,
      });
      return false;
    }

    const validation = await validateCertificate(certificate, serverPublicKey);
    return validation.valid;
  }

  /**
   * Validates a certificate completely
   */
  async validateCertificateFull(
    certificate: SenderCertificate,
  ): Promise<CertificateValidationResult> {
    const serverPublicKey = this.serverPublicKeys.get(certificate.serverKeyId);
    if (!serverPublicKey) {
      return {
        valid: false,
        errors: [`Unknown server key ID: ${certificate.serverKeyId}`],
        expired: false,
        needsRenewal: false,
        remainingValidityMs: 0,
      };
    }

    return validateCertificate(certificate, serverPublicKey);
  }

  // ==========================================================================
  // Access Control
  // ==========================================================================

  /**
   * Updates unidentified delivery access configuration
   */
  updateAccessConfig(config: Partial<UnidentifiedAccessConfig>): void {
    this.config.accessConfig = {
      ...this.config.accessConfig!,
      ...config,
    };

    if (this.unidentifiedRecipient) {
      this.unidentifiedRecipient.updateAccessConfig(config);
    }

    this.persistState();
  }

  /**
   * Gets current access configuration
   */
  getAccessConfig(): UnidentifiedAccessConfig {
    return { ...this.config.accessConfig! };
  }

  /**
   * Blocks a sender from unidentified delivery
   */
  blockSender(senderFingerprint: string): void {
    if (this.unidentifiedRecipient) {
      this.unidentifiedRecipient.blockSender(senderFingerprint);
    }
    this.persistState();
  }

  /**
   * Unblocks a sender
   */
  unblockSender(senderFingerprint: string): void {
    if (this.unidentifiedRecipient) {
      this.unidentifiedRecipient.unblockSender(senderFingerprint);
    }
    this.persistState();
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Loads persisted state from storage
   */
  private async loadState(): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    try {
      // Load server public keys
      const serverKeysJson = this.config.storage.getItem(SERVER_KEYS_KEY);
      if (serverKeysJson) {
        const serverKeys = JSON.parse(serverKeysJson);
        for (const { keyId, publicKey } of serverKeys) {
          const keyBytes = new Uint8Array(
            atob(publicKey)
              .split("")
              .map((c) => c.charCodeAt(0)),
          );
          this.serverPublicKeys.set(keyId, keyBytes);
          this.certificateManager?.addServerPublicKey(keyId, keyBytes);
        }
      }

      // Load certificate
      const certificateJson = this.config.storage.getItem(CERTIFICATE_KEY);
      if (certificateJson && this.certificateManager) {
        const state = JSON.parse(certificateJson);
        if (state.certificate) {
          // Reconstruct certificate with Uint8Arrays
          const cert: SenderCertificate = {
            ...state.certificate,
            senderIdentityKey: new Uint8Array(
              atob(state.certificate.senderIdentityKey)
                .split("")
                .map((c: string) => c.charCodeAt(0)),
            ),
            signature: new Uint8Array(
              atob(state.certificate.signature)
                .split("")
                .map((c: string) => c.charCodeAt(0)),
            ),
          };
          this.certificateManager.setCertificate(cert);
        }
      }

      // Load access config
      const accessConfigJson = this.config.storage.getItem(ACCESS_CONFIG_KEY);
      if (accessConfigJson) {
        this.config.accessConfig = JSON.parse(accessConfigJson);
      }

      logger.debug("Loaded sealed sender state from storage");
    } catch (error) {
      logger.error("Failed to load sealed sender state", { error });
    }
  }

  /**
   * Persists state to storage
   */
  private async persistState(): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    try {
      // Save server public keys
      const serverKeys = Array.from(this.serverPublicKeys.entries()).map(
        ([keyId, publicKey]) => ({
          keyId,
          publicKey: btoa(String.fromCharCode(...publicKey)),
        }),
      );
      this.config.storage.setItem(SERVER_KEYS_KEY, JSON.stringify(serverKeys));

      // Save certificate
      const certificate = this.certificateManager?.getCertificate();
      if (certificate) {
        const certState = {
          certificate: {
            ...certificate,
            senderIdentityKey: btoa(
              String.fromCharCode(...certificate.senderIdentityKey),
            ),
            signature: btoa(String.fromCharCode(...certificate.signature)),
          },
        };
        this.config.storage.setItem(CERTIFICATE_KEY, JSON.stringify(certState));
      }

      // Save access config
      this.config.storage.setItem(
        ACCESS_CONFIG_KEY,
        JSON.stringify(this.config.accessConfig),
      );

      logger.debug("Persisted sealed sender state to storage");
    } catch (error) {
      logger.error("Failed to persist sealed sender state", { error });
    }
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Performs maintenance tasks
   */
  async performMaintenance(): Promise<void> {
    this.ensureInitialized();

    // Cleanup unidentified sender
    this.unidentifiedSender?.cleanup();

    // Cleanup unidentified recipient
    this.unidentifiedRecipient?.cleanup();

    // Check certificate renewal
    const certificate = this.certificateManager?.getCertificate();
    if (certificate) {
      const remainingMs = certificate.expiresAt - Date.now();
      if (remainingMs < CERTIFICATE_RENEWAL_THRESHOLD_MS) {
        try {
          await this.refreshCertificate();
        } catch (error) {
          logger.warn("Failed to refresh certificate during maintenance", {
            error,
          });
        }
      }
    }

    await this.persistState();
    logger.debug("Sealed sender maintenance completed");
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the service
   */
  destroy(): void {
    this.unidentifiedSender?.destroy();
    this.unidentifiedRecipient?.destroy();
    this.certificateManager?.clear();
    this.serverPublicKeys.clear();
    this.initialized = false;

    logger.info("Sealed sender service destroyed");
  }

  /**
   * Clears all persisted data
   */
  clearPersistedData(): void {
    if (this.config.storage) {
      this.config.storage.removeItem(CERTIFICATE_KEY);
      this.config.storage.removeItem(SERVER_KEYS_KEY);
      this.config.storage.removeItem(ACCESS_CONFIG_KEY);
      this.config.storage.removeItem(TOKENS_KEY);
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Ensures service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.certificateManager) {
      throw new Error("Sealed sender service not initialized");
    }
  }
}

// ============================================================================
// Server-Side Certificate Authority
// ============================================================================

/**
 * Server-side certificate authority for issuing sender certificates
 */
export class SealedSenderCertificateAuthority {
  private signingKeys: Map<number, ServerSigningKeyPair> = new Map();
  private currentKeyId: number = 0;
  private keyRotationIntervalMs: number;
  private lastRotationAt: Date | null = null;

  constructor(keyRotationIntervalMs: number = 7 * 24 * 60 * 60 * 1000) {
    this.keyRotationIntervalMs = keyRotationIntervalMs;
  }

  /**
   * Initializes the CA with a signing key
   */
  async initialize(): Promise<void> {
    await this.rotateSigningKey();
    logger.info("Certificate authority initialized");
  }

  /**
   * Gets current signing key
   */
  getCurrentSigningKey(): ServerSigningKeyPair | null {
    return this.signingKeys.get(this.currentKeyId) ?? null;
  }

  /**
   * Gets all active public keys
   */
  getPublicKeys(): Array<{
    keyId: number;
    publicKey: Uint8Array;
    expiresAt: Date;
  }> {
    return Array.from(this.signingKeys.values()).map((key) => ({
      keyId: key.keyId,
      publicKey: key.publicKeyBytes,
      expiresAt: key.expiresAt,
    }));
  }

  /**
   * Issues a certificate
   */
  async issueCertificateForUser(
    request: CertificateRequest,
  ): Promise<CertificateResponse> {
    const signingKey = this.getCurrentSigningKey();
    if (!signingKey) {
      throw new Error("No signing key available");
    }

    const certificate = await issueCertificate(request, signingKey);

    return {
      certificate,
      serverKeyId: signingKey.keyId,
      serverPublicKey: signingKey.publicKeyBytes,
    };
  }

  /**
   * Rotates the signing key
   */
  async rotateSigningKey(): Promise<ServerSigningKeyPair> {
    const newKeyId = this.currentKeyId + 1;
    const newKey = await generateServerSigningKeyPair(newKeyId);

    this.signingKeys.set(newKeyId, newKey);
    this.currentKeyId = newKeyId;
    this.lastRotationAt = new Date();

    // Clean up very old keys (keep last 3)
    const keyIds = Array.from(this.signingKeys.keys()).sort((a, b) => a - b);
    while (keyIds.length > 3) {
      const oldKeyId = keyIds.shift()!;
      this.signingKeys.delete(oldKeyId);
    }

    logger.info("Signing key rotated", { newKeyId });

    return newKey;
  }

  /**
   * Checks if key rotation is needed
   */
  needsKeyRotation(): boolean {
    if (!this.lastRotationAt) {
      return true;
    }

    const elapsed = Date.now() - this.lastRotationAt.getTime();
    return elapsed >= this.keyRotationIntervalMs;
  }

  /**
   * Destroys the CA
   */
  destroy(): void {
    this.signingKeys.clear();
    this.currentKeyId = 0;
    this.lastRotationAt = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes a sealed sender service
 */
export async function createSealedSenderService(
  config: SealedSenderServiceConfig,
): Promise<SealedSenderService> {
  const service = new SealedSenderService(config);
  await service.initialize();
  return service;
}

/**
 * Creates and initializes a certificate authority
 */
export async function createCertificateAuthority(
  keyRotationIntervalMs?: number,
): Promise<SealedSenderCertificateAuthority> {
  const ca = new SealedSenderCertificateAuthority(keyRotationIntervalMs);
  await ca.initialize();
  return ca;
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Re-export types from sealed-sender
  type SealedSenderEnvelope,
  type UnsealedMessage,
  type SenderCertificate,
  SealedSenderMessageType,
  SEALED_SENDER_VERSION,

  // Re-export types from sender-certificate
  type CertificateRequest,
  type CertificateResponse,
  type CertificateValidationResult,

  // Re-export types from unidentified-sender
  type UnidentifiedAccessConfig,
  type UnidentifiedMessage,
  type UnidentifiedDeliveryToken,
  type DeliveryResult,

  // Re-export utility functions
  verifyThreatModel,
};

export default SealedSenderService;
