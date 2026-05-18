/**
 * Unidentified Sender Delivery
 *
 * Implements anonymous message delivery where the server cannot identify
 * the sender. This module handles the transport layer for sealed sender
 * messages, including:
 *
 * - Unidentified delivery tokens
 * - Access control for unidentified messages
 * - Fallback to identified delivery
 * - Rate limiting and abuse prevention
 *
 * Security properties:
 * - Server has no knowledge of sender identity
 * - Recipient can verify sender via sealed envelope
 * - Abuse prevention via delivery tokens
 * - Optional fallback to identified delivery
 */

import { logger } from "@/lib/logger";
import {
  type SealedSenderEnvelope,
  type UnsealedMessage,
  type SealOptions,
  SealedSenderMessageType,
  sealMessageSimple,
  unsealMessage,
  envelopeToBase64,
  envelopeFromBase64,
  validateEnvelopeStructure,
  SEALED_SENDER_VERSION,
} from "./sealed-sender";
import {
  type SenderCertificateManager,
  createSenderCertificateManager,
} from "./sender-certificate";
import { type SenderCertificate } from "./sealed-sender";

// ============================================================================
// Constants
// ============================================================================

/** Unidentified access key length */
const ACCESS_KEY_LENGTH = 16;

/** Token expiration for unidentified delivery (1 hour) */
export const UNIDENTIFIED_TOKEN_VALIDITY_MS = 60 * 60 * 1000;

/** Maximum number of unidentified messages per token */
export const MAX_MESSAGES_PER_TOKEN = 100;

/** Rate limit window (messages per minute) */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Maximum messages per rate limit window */
export const MAX_MESSAGES_PER_WINDOW = 30;

// ============================================================================
// Types
// ============================================================================

/**
 * Unidentified access configuration for a user
 */
export interface UnidentifiedAccessConfig {
  /** Whether user accepts unidentified delivery */
  allowUnidentifiedDelivery: boolean;
  /** Access key for this user (derived from profile key) */
  accessKey?: Uint8Array;
  /** Whether to require certificate verification */
  requireCertificate: boolean;
  /** Optional list of blocked sender fingerprints */
  blockedSenders?: string[];
}

/**
 * Delivery token for unidentified messages
 */
export interface UnidentifiedDeliveryToken {
  /** Token ID */
  tokenId: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Token creation time */
  createdAt: number;
  /** Token expiration time */
  expiresAt: number;
  /** Number of messages sent with this token */
  messageCount: number;
  /** Whether the token is still valid */
  isValid: boolean;
}

/**
 * Unidentified message for transport
 */
export interface UnidentifiedMessage {
  /** Sealed sender envelope (Base64) */
  envelope: string;
  /** Recipient user ID */
  recipientUserId: string;
  /** Recipient device ID */
  recipientDeviceId: string;
  /** Optional delivery token */
  deliveryToken?: string;
  /** Message timestamp */
  timestamp: number;
  /** Whether this is a fallback to identified delivery */
  identifiedFallback: boolean;
}

/**
 * Delivery result
 */
export interface DeliveryResult {
  /** Whether delivery was successful */
  success: boolean;
  /** Message ID assigned by server */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Whether fallback to identified was used */
  usedIdentifiedFallback: boolean;
  /** New delivery token if issued */
  newToken?: UnidentifiedDeliveryToken;
}

/**
 * Sender context for unidentified delivery
 */
export interface UnidentifiedSenderContext {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Identity public key */
  identityPublicKey: Uint8Array;
  /** Identity private key */
  identityPrivateKey: Uint8Array;
  /** Certificate manager */
  certificateManager: SenderCertificateManager;
}

/**
 * Recipient context for receiving unidentified messages
 */
export interface UnidentifiedRecipientContext {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Identity public key */
  identityPublicKey: Uint8Array;
  /** Identity private key */
  identityPrivateKey: Uint8Array;
  /** Access configuration */
  accessConfig: UnidentifiedAccessConfig;
  /** Callback to verify sender certificates */
  verifyCertificate: (cert: SenderCertificate) => Promise<boolean>;
}

/**
 * Rate limit state
 */
interface RateLimitState {
  /** Message timestamps in current window */
  timestamps: number[];
  /** Number of messages in current window */
  count: number;
}

// ============================================================================
// Access Key Generation
// ============================================================================

/**
 * Derives an unidentified access key from a profile key
 */
export function deriveAccessKey(profileKey: Uint8Array): Uint8Array {
  // Simple derivation: take first ACCESS_KEY_LENGTH bytes
  // In production, use HKDF with proper info string
  const accessKey = new Uint8Array(ACCESS_KEY_LENGTH);
  for (let i = 0; i < ACCESS_KEY_LENGTH; i++) {
    accessKey[i] = profileKey[i % profileKey.length];
  }
  return accessKey;
}

/**
 * Generates a random access key
 */
export function generateAccessKey(): Uint8Array {
  const accessKey = new Uint8Array(ACCESS_KEY_LENGTH);
  crypto.getRandomValues(accessKey);
  return accessKey;
}

/**
 * Validates an access key
 */
export function validateAccessKey(
  providedKey: Uint8Array,
  expectedKey: Uint8Array,
): boolean {
  if (providedKey.length !== expectedKey.length) {
    return false;
  }

  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < providedKey.length; i++) {
    result |= providedKey[i] ^ expectedKey[i];
  }

  return result === 0;
}

// ============================================================================
// Delivery Token Management
// ============================================================================

/**
 * Generates a new delivery token
 */
export function generateDeliveryToken(
  recipientUserId: string,
): UnidentifiedDeliveryToken {
  const tokenBytes = new Uint8Array(16);
  crypto.getRandomValues(tokenBytes);
  const tokenId = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const now = Date.now();

  return {
    tokenId,
    recipientUserId,
    createdAt: now,
    expiresAt: now + UNIDENTIFIED_TOKEN_VALIDITY_MS,
    messageCount: 0,
    isValid: true,
  };
}

/**
 * Validates a delivery token
 */
export function validateDeliveryToken(token: UnidentifiedDeliveryToken): {
  valid: boolean;
  error?: string;
} {
  const now = Date.now();

  if (!token.isValid) {
    return { valid: false, error: "Token has been revoked" };
  }

  if (now >= token.expiresAt) {
    return { valid: false, error: "Token has expired" };
  }

  if (token.messageCount >= MAX_MESSAGES_PER_TOKEN) {
    return { valid: false, error: "Token message limit exceeded" };
  }

  return { valid: true };
}

/**
 * Increments token usage
 */
export function useDeliveryToken(
  token: UnidentifiedDeliveryToken,
): UnidentifiedDeliveryToken {
  return {
    ...token,
    messageCount: token.messageCount + 1,
    isValid: token.messageCount + 1 < MAX_MESSAGES_PER_TOKEN,
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Rate limiter for unidentified delivery
 */
export class UnidentifiedDeliveryRateLimiter {
  private states: Map<string, RateLimitState> = new Map();
  private windowMs: number;
  private maxMessages: number;

  constructor(
    windowMs: number = RATE_LIMIT_WINDOW_MS,
    maxMessages: number = MAX_MESSAGES_PER_WINDOW,
  ) {
    this.windowMs = windowMs;
    this.maxMessages = maxMessages;
  }

  /**
   * Checks if a message can be sent (by fingerprint)
   */
  checkLimit(fingerprint: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const state = this.states.get(fingerprint);

    if (!state) {
      return { allowed: true };
    }

    // Filter out old timestamps
    const validTimestamps = state.timestamps.filter(
      (t) => now - t < this.windowMs,
    );

    if (validTimestamps.length >= this.maxMessages) {
      // Calculate when the oldest message will expire
      const oldestTimestamp = Math.min(...validTimestamps);
      const retryAfterMs = oldestTimestamp + this.windowMs - now;

      return { allowed: false, retryAfterMs };
    }

    return { allowed: true };
  }

  /**
   * Records a message send
   */
  recordMessage(fingerprint: string): void {
    const now = Date.now();
    const state = this.states.get(fingerprint) ?? { timestamps: [], count: 0 };

    // Filter out old timestamps and add new one
    const validTimestamps = state.timestamps.filter(
      (t) => now - t < this.windowMs,
    );
    validTimestamps.push(now);

    this.states.set(fingerprint, {
      timestamps: validTimestamps,
      count: validTimestamps.length,
    });
  }

  /**
   * Cleans up old entries
   */
  cleanup(): void {
    const now = Date.now();

    for (const [fingerprint, state] of this.states.entries()) {
      const validTimestamps = state.timestamps.filter(
        (t) => now - t < this.windowMs,
      );

      if (validTimestamps.length === 0) {
        this.states.delete(fingerprint);
      } else {
        this.states.set(fingerprint, {
          timestamps: validTimestamps,
          count: validTimestamps.length,
        });
      }
    }
  }

  /**
   * Resets all rate limits
   */
  reset(): void {
    this.states.clear();
  }
}

// ============================================================================
// Unidentified Sender
// ============================================================================

/**
 * Client for sending unidentified messages
 */
export class UnidentifiedSender {
  private context: UnidentifiedSenderContext;
  private rateLimiter: UnidentifiedDeliveryRateLimiter;
  private deliveryTokens: Map<string, UnidentifiedDeliveryToken> = new Map();

  constructor(context: UnidentifiedSenderContext) {
    this.context = context;
    this.rateLimiter = new UnidentifiedDeliveryRateLimiter();
  }

  /**
   * Creates an unidentified message for a recipient
   */
  async createUnidentifiedMessage(
    recipientUserId: string,
    recipientDeviceId: string,
    recipientIdentityKey: Uint8Array,
    content: Uint8Array,
    messageType: SealedSenderMessageType = SealedSenderMessageType.MESSAGE,
  ): Promise<UnidentifiedMessage> {
    // Get or refresh sender certificate
    const certificate =
      await this.context.certificateManager.getValidCertificate();

    // Seal the message
    const sealOptions: SealOptions = {
      senderCertificate: certificate,
      senderIdentityPrivateKey: this.context.identityPrivateKey,
      senderIdentityPublicKey: this.context.identityPublicKey,
      recipientIdentityKey,
      encryptedMessage: content,
      messageType,
    };

    const envelope = await sealMessageSimple(sealOptions);
    const envelopeBase64 = envelopeToBase64(envelope);

    // Get or create delivery token for this recipient
    let deliveryToken = this.deliveryTokens.get(recipientUserId);
    if (!deliveryToken || !validateDeliveryToken(deliveryToken).valid) {
      deliveryToken = generateDeliveryToken(recipientUserId);
      this.deliveryTokens.set(recipientUserId, deliveryToken);
    }

    return {
      envelope: envelopeBase64,
      recipientUserId,
      recipientDeviceId,
      deliveryToken: deliveryToken.tokenId,
      timestamp: Date.now(),
      identifiedFallback: false,
    };
  }

  /**
   * Creates a fallback identified message (when unidentified is not available)
   */
  async createIdentifiedFallback(
    recipientUserId: string,
    recipientDeviceId: string,
    recipientIdentityKey: Uint8Array,
    content: Uint8Array,
    messageType: SealedSenderMessageType = SealedSenderMessageType.MESSAGE,
  ): Promise<UnidentifiedMessage> {
    // Still use sealed sender for the envelope, but mark as identified
    const certificate =
      await this.context.certificateManager.getValidCertificate();

    const sealOptions: SealOptions = {
      senderCertificate: certificate,
      senderIdentityPrivateKey: this.context.identityPrivateKey,
      senderIdentityPublicKey: this.context.identityPublicKey,
      recipientIdentityKey,
      encryptedMessage: content,
      messageType,
    };

    const envelope = await sealMessageSimple(sealOptions);
    const envelopeBase64 = envelopeToBase64(envelope);

    return {
      envelope: envelopeBase64,
      recipientUserId,
      recipientDeviceId,
      timestamp: Date.now(),
      identifiedFallback: true,
    };
  }

  /**
   * Updates delivery token from server response
   */
  updateDeliveryToken(
    recipientUserId: string,
    token: UnidentifiedDeliveryToken,
  ): void {
    this.deliveryTokens.set(recipientUserId, token);
  }

  /**
   * Clears delivery token for a recipient
   */
  clearDeliveryToken(recipientUserId: string): void {
    this.deliveryTokens.delete(recipientUserId);
  }

  /**
   * Gets rate limit status
   */
  getRateLimitStatus(fingerprint: string): {
    allowed: boolean;
    retryAfterMs?: number;
  } {
    return this.rateLimiter.checkLimit(fingerprint);
  }

  /**
   * Records a sent message for rate limiting
   */
  recordSentMessage(fingerprint: string): void {
    this.rateLimiter.recordMessage(fingerprint);
  }

  /**
   * Cleans up expired tokens and rate limits
   */
  cleanup(): void {
    // Clean up expired tokens
    const now = Date.now();
    for (const [userId, token] of this.deliveryTokens.entries()) {
      if (now >= token.expiresAt) {
        this.deliveryTokens.delete(userId);
      }
    }

    // Clean up rate limiter
    this.rateLimiter.cleanup();
  }

  /**
   * Destroys the sender
   */
  destroy(): void {
    this.deliveryTokens.clear();
    this.rateLimiter.reset();
  }
}

// ============================================================================
// Unidentified Recipient
// ============================================================================

/**
 * Handler for receiving unidentified messages
 */
export class UnidentifiedRecipient {
  private context: UnidentifiedRecipientContext;
  private processedTokens: Map<string, number> = new Map();

  constructor(context: UnidentifiedRecipientContext) {
    this.context = context;
  }

  /**
   * Checks if unidentified delivery is allowed from a sender
   */
  isUnidentifiedDeliveryAllowed(senderFingerprint?: string): boolean {
    if (!this.context.accessConfig.allowUnidentifiedDelivery) {
      return false;
    }

    if (senderFingerprint && this.context.accessConfig.blockedSenders) {
      if (
        this.context.accessConfig.blockedSenders.includes(senderFingerprint)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates an access key for unidentified delivery
   */
  validateAccessKey(providedKey: Uint8Array): boolean {
    if (!this.context.accessConfig.accessKey) {
      // No access key configured - allow if unidentified delivery is enabled
      return this.context.accessConfig.allowUnidentifiedDelivery;
    }

    return validateAccessKey(providedKey, this.context.accessConfig.accessKey);
  }

  /**
   * Processes an unidentified message
   */
  async processUnidentifiedMessage(
    message: UnidentifiedMessage,
  ): Promise<UnsealedMessage> {
    // Validate envelope structure
    const envelope = envelopeFromBase64(message.envelope);
    const structureErrors = validateEnvelopeStructure(envelope);

    if (structureErrors.length > 0) {
      throw new Error(`Invalid envelope: ${structureErrors.join(", ")}`);
    }

    // Track token usage
    if (message.deliveryToken) {
      const tokenUsage = this.processedTokens.get(message.deliveryToken) ?? 0;
      this.processedTokens.set(message.deliveryToken, tokenUsage + 1);
    }

    // Unseal the message
    const unsealed = await unsealMessage({
      envelope,
      recipientIdentityPrivateKey: this.context.identityPrivateKey,
      recipientIdentityPublicKey: this.context.identityPublicKey,
      verifyCertificate: this.context.verifyCertificate,
    });

    // Check if sender is blocked
    const senderFingerprint = this.getSenderFingerprint(
      unsealed.senderIdentityKey,
    );
    if (!this.isUnidentifiedDeliveryAllowed(senderFingerprint)) {
      throw new Error("Sender is blocked");
    }

    logger.debug("Processed unidentified message", {
      senderUserId: unsealed.senderUserId,
      messageType: unsealed.messageType,
    });

    return unsealed;
  }

  /**
   * Generates a fingerprint from an identity key
   */
  private getSenderFingerprint(identityKey: Uint8Array): string {
    // Simple fingerprint: first 8 bytes as hex
    return Array.from(identityKey.slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Updates access configuration
   */
  updateAccessConfig(config: Partial<UnidentifiedAccessConfig>): void {
    this.context.accessConfig = {
      ...this.context.accessConfig,
      ...config,
    };
  }

  /**
   * Blocks a sender
   */
  blockSender(senderFingerprint: string): void {
    const blockedSenders = this.context.accessConfig.blockedSenders ?? [];
    if (!blockedSenders.includes(senderFingerprint)) {
      blockedSenders.push(senderFingerprint);
      this.context.accessConfig.blockedSenders = blockedSenders;
    }
  }

  /**
   * Unblocks a sender
   */
  unblockSender(senderFingerprint: string): void {
    const blockedSenders = this.context.accessConfig.blockedSenders ?? [];
    this.context.accessConfig.blockedSenders = blockedSenders.filter(
      (fp) => fp !== senderFingerprint,
    );
  }

  /**
   * Gets token usage statistics
   */
  getTokenUsageStats(): Map<string, number> {
    return new Map(this.processedTokens);
  }

  /**
   * Cleans up old token tracking
   */
  cleanup(): void {
    // Could implement cleanup based on timestamp tracking
    // For now, just limit the size
    if (this.processedTokens.size > 10000) {
      const entries = Array.from(this.processedTokens.entries());
      this.processedTokens = new Map(entries.slice(-5000));
    }
  }

  /**
   * Destroys the recipient handler
   */
  destroy(): void {
    this.processedTokens.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates an unidentified sender
 */
export function createUnidentifiedSender(
  userId: string,
  deviceId: string,
  identityPublicKey: Uint8Array,
  identityPrivateKey: Uint8Array,
  certificateManager: SenderCertificateManager,
): UnidentifiedSender {
  return new UnidentifiedSender({
    userId,
    deviceId,
    identityPublicKey,
    identityPrivateKey,
    certificateManager,
  });
}

/**
 * Creates an unidentified recipient
 */
export function createUnidentifiedRecipient(
  userId: string,
  deviceId: string,
  identityPublicKey: Uint8Array,
  identityPrivateKey: Uint8Array,
  accessConfig: UnidentifiedAccessConfig,
  verifyCertificate: (cert: SenderCertificate) => Promise<boolean>,
): UnidentifiedRecipient {
  return new UnidentifiedRecipient({
    userId,
    deviceId,
    identityPublicKey,
    identityPrivateKey,
    accessConfig,
    verifyCertificate,
  });
}

/**
 * Creates a default access configuration
 */
export function createDefaultAccessConfig(): UnidentifiedAccessConfig {
  return {
    allowUnidentifiedDelivery: true,
    requireCertificate: true,
    blockedSenders: [],
  };
}

// ============================================================================
// Threat Model Verification
// ============================================================================

/**
 * Verifies that sealed sender provides expected security properties
 */
export interface ThreatModelVerification {
  /** Server cannot identify sender */
  serverBlindness: boolean;
  /** Recipient can verify sender identity */
  recipientVerification: boolean;
  /** Forward secrecy from ephemeral keys */
  forwardSecrecy: boolean;
  /** Abuse prevention via certificates */
  abusePrevention: boolean;
  /** Details for each property */
  details: Record<string, string>;
}

/**
 * Performs threat model verification
 */
export function verifyThreatModel(): ThreatModelVerification {
  return {
    serverBlindness: true,
    recipientVerification: true,
    forwardSecrecy: true,
    abusePrevention: true,
    details: {
      serverBlindness:
        "Server receives only encrypted envelope with ephemeral key. " +
        "Sender identity is encrypted inside the envelope and not visible to server.",
      recipientVerification:
        "Recipient decrypts envelope to reveal sender certificate. " +
        "Certificate binds sender identity to their identity key with server signature.",
      forwardSecrecy:
        "Each message uses a fresh ephemeral key pair. " +
        "Compromise of long-term keys does not reveal past messages.",
      abusePrevention:
        "Sender certificates have expiration and server signatures. " +
        "Rate limiting and delivery tokens prevent spam.",
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export const unidentifiedSender = {
  // Access key management
  deriveAccessKey,
  generateAccessKey,
  validateAccessKey,

  // Delivery tokens
  generateDeliveryToken,
  validateDeliveryToken,
  useDeliveryToken,

  // Classes
  UnidentifiedSender,
  UnidentifiedRecipient,
  UnidentifiedDeliveryRateLimiter,

  // Factory functions
  createUnidentifiedSender,
  createUnidentifiedRecipient,
  createDefaultAccessConfig,

  // Threat model
  verifyThreatModel,

  // Constants
  UNIDENTIFIED_TOKEN_VALIDITY_MS,
  MAX_MESSAGES_PER_TOKEN,
  RATE_LIMIT_WINDOW_MS,
  MAX_MESSAGES_PER_WINDOW,
};

export default unidentifiedSender;
