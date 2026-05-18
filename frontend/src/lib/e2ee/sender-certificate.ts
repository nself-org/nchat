/**
 * Sender Certificate Management
 *
 * Generates and validates sender certificates for sealed sender protocol.
 * Certificates bind a sender's identity to their identity key and are
 * signed by a trusted server to prevent abuse.
 *
 * Certificate flow:
 * 1. Client requests certificate from server with identity proof
 * 2. Server validates identity and signs certificate
 * 3. Client uses certificate for sealed sender messages
 * 4. Recipients verify certificate signature
 *
 * Security properties:
 * - Sender identity is verifiable by recipient
 * - Certificates have limited lifetime (abuse prevention)
 * - Server signature prevents forgery
 * - Revocation support via server key rotation
 */

import { logger } from "@/lib/logger";
import {
  type SenderCertificate,
  SEALED_SENDER_VERSION,
  serializeCertificate,
  deserializeCertificate,
  validateCertificateStructure,
} from "./sealed-sender";

// ============================================================================
// Constants
// ============================================================================

/** Default certificate validity duration (24 hours) */
export const DEFAULT_CERTIFICATE_VALIDITY_MS = 24 * 60 * 60 * 1000;

/** Maximum certificate validity (7 days) */
export const MAX_CERTIFICATE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum certificate validity (1 hour) */
export const MIN_CERTIFICATE_VALIDITY_MS = 60 * 60 * 1000;

/** Certificate renewal threshold (renew if less than this time remaining) */
export const CERTIFICATE_RENEWAL_THRESHOLD_MS = 4 * 60 * 60 * 1000;

/** ECDSA curve for signing */
const ECDSA_CURVE = "P-256";

/** Signature hash algorithm */
const SIGNATURE_HASH = "SHA-256";

// ============================================================================
// Types
// ============================================================================

/**
 * Server signing key pair for certificates
 */
export interface ServerSigningKeyPair {
  /** Key ID for tracking key rotation */
  keyId: number;
  /** Private key for signing */
  privateKey: CryptoKey;
  /** Public key for verification */
  publicKey: CryptoKey;
  /** Public key bytes for distribution */
  publicKeyBytes: Uint8Array;
  /** When this key was created */
  createdAt: Date;
  /** When this key expires */
  expiresAt: Date;
}

/**
 * Request for a new sender certificate
 */
export interface CertificateRequest {
  /** User ID requesting certificate */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Identity public key */
  identityKey: Uint8Array;
  /** Requested validity period in milliseconds */
  validityMs?: number;
  /** Authentication token proving identity */
  authToken?: string;
}

/**
 * Response containing the issued certificate
 */
export interface CertificateResponse {
  /** The issued certificate */
  certificate: SenderCertificate;
  /** Server's signing key ID */
  serverKeyId: number;
  /** Server's public key for verification */
  serverPublicKey: Uint8Array;
}

/**
 * Certificate validation result
 */
export interface CertificateValidationResult {
  /** Whether the certificate is valid */
  valid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** Whether the certificate is expired */
  expired: boolean;
  /** Whether the certificate needs renewal */
  needsRenewal: boolean;
  /** Remaining validity in milliseconds */
  remainingValidityMs: number;
}

/**
 * Certificate store for caching
 */
export interface CertificateStore {
  /** Current certificate */
  certificate: SenderCertificate | null;
  /** Server public keys for verification */
  serverPublicKeys: Map<number, Uint8Array>;
  /** Last refresh timestamp */
  lastRefreshAt: Date | null;
}

// ============================================================================
// Utility Functions
// ============================================================================

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
 * Converts bytes to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// Server Key Management
// ============================================================================

/**
 * Generates a new server signing key pair
 */
export async function generateServerSigningKeyPair(
  keyId: number,
  validityMs: number = MAX_CERTIFICATE_VALIDITY_MS,
): Promise<ServerSigningKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: ECDSA_CURVE },
    true,
    ["sign", "verify"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + validityMs);

  logger.info("Generated new server signing key pair", { keyId, expiresAt });

  return {
    keyId,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyBytes: new Uint8Array(publicKeyRaw),
    createdAt: now,
    expiresAt,
  };
}

/**
 * Exports server public key for distribution
 */
export async function exportServerPublicKey(
  keyPair: ServerSigningKeyPair,
): Promise<{ keyId: number; publicKey: string; expiresAt: number }> {
  return {
    keyId: keyPair.keyId,
    publicKey: bytesToBase64(keyPair.publicKeyBytes),
    expiresAt: keyPair.expiresAt.getTime(),
  };
}

/**
 * Imports server public key for verification
 */
export async function importServerPublicKey(
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    publicKeyBytes as unknown as ArrayBuffer,
    { name: "ECDSA", namedCurve: ECDSA_CURVE },
    true,
    ["verify"],
  );
}

// ============================================================================
// Certificate Generation
// ============================================================================

/**
 * Creates the content to be signed for a certificate
 */
function createCertificateSigningContent(
  userId: string,
  deviceId: string,
  identityKey: Uint8Array,
  expiresAt: number,
): Uint8Array {
  const encoder = new TextEncoder();
  const userIdBytes = encoder.encode(userId);
  const deviceIdBytes = encoder.encode(deviceId);

  // Format: version(1) + userIdLen(2) + userId + deviceIdLen(2) + deviceId
  //         + identityKey + expiresAt(8)
  const expiresAtView = new DataView(new ArrayBuffer(8));
  expiresAtView.setBigUint64(0, BigInt(expiresAt), false);

  return concat(
    new Uint8Array([SEALED_SENDER_VERSION]),
    new Uint8Array([
      (userIdBytes.length >> 8) & 0xff,
      userIdBytes.length & 0xff,
    ]),
    userIdBytes,
    new Uint8Array([
      (deviceIdBytes.length >> 8) & 0xff,
      deviceIdBytes.length & 0xff,
    ]),
    deviceIdBytes,
    identityKey,
    new Uint8Array(expiresAtView.buffer),
  );
}

/**
 * Issues a sender certificate (server-side)
 */
export async function issueCertificate(
  request: CertificateRequest,
  serverKeyPair: ServerSigningKeyPair,
): Promise<SenderCertificate> {
  // Validate request
  if (!request.userId || request.userId.length === 0) {
    throw new Error("Invalid user ID");
  }

  if (!request.deviceId || request.deviceId.length === 0) {
    throw new Error("Invalid device ID");
  }

  if (!request.identityKey || request.identityKey.length !== 65) {
    throw new Error("Invalid identity key");
  }

  // Calculate validity period
  const validityMs = Math.min(
    Math.max(
      request.validityMs ?? DEFAULT_CERTIFICATE_VALIDITY_MS,
      MIN_CERTIFICATE_VALIDITY_MS,
    ),
    MAX_CERTIFICATE_VALIDITY_MS,
  );

  const expiresAt = Date.now() + validityMs;

  // Create content to sign
  const signingContent = createCertificateSigningContent(
    request.userId,
    request.deviceId,
    request.identityKey,
    expiresAt,
  );

  // Sign the content
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: SIGNATURE_HASH },
    serverKeyPair.privateKey,
    signingContent as unknown as ArrayBuffer,
  );

  logger.info("Certificate issued", {
    userId: request.userId,
    deviceId: request.deviceId,
    expiresAt: new Date(expiresAt).toISOString(),
    serverKeyId: serverKeyPair.keyId,
  });

  return {
    version: SEALED_SENDER_VERSION,
    senderUserId: request.userId,
    senderDeviceId: request.deviceId,
    senderIdentityKey: request.identityKey,
    expiresAt,
    signature: new Uint8Array(signature),
    serverKeyId: serverKeyPair.keyId,
  };
}

/**
 * Verifies a sender certificate signature (client-side)
 */
export async function verifyCertificateSignature(
  certificate: SenderCertificate,
  serverPublicKey: Uint8Array | CryptoKey,
): Promise<boolean> {
  try {
    // Import server public key if needed
    const publicKey =
      serverPublicKey instanceof Uint8Array
        ? await importServerPublicKey(serverPublicKey)
        : serverPublicKey;

    // Recreate the signing content
    const signingContent = createCertificateSigningContent(
      certificate.senderUserId,
      certificate.senderDeviceId,
      certificate.senderIdentityKey,
      certificate.expiresAt,
    );

    // Verify signature
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: SIGNATURE_HASH },
      publicKey,
      certificate.signature as unknown as ArrayBuffer,
      signingContent as unknown as ArrayBuffer,
    );

    return isValid;
  } catch (error) {
    logger.error("Certificate signature verification failed", { error });
    return false;
  }
}

// ============================================================================
// Certificate Validation
// ============================================================================

/**
 * Validates a sender certificate completely
 */
export async function validateCertificate(
  certificate: SenderCertificate,
  serverPublicKey: Uint8Array | CryptoKey,
  options?: {
    /** Current time for testing */
    now?: number;
    /** Whether to allow expired certificates (for testing) */
    allowExpired?: boolean;
  },
): Promise<CertificateValidationResult> {
  const now = options?.now ?? Date.now();
  const errors: string[] = [];

  // Structure validation
  const structureErrors = validateCertificateStructure(certificate);
  errors.push(...structureErrors);

  // Expiration check
  const expired = certificate.expiresAt < now;
  const remainingValidityMs = Math.max(0, certificate.expiresAt - now);
  const needsRenewal = remainingValidityMs < CERTIFICATE_RENEWAL_THRESHOLD_MS;

  if (expired && !options?.allowExpired) {
    errors.push("Certificate has expired");
  }

  // Signature verification
  if (structureErrors.length === 0) {
    const signatureValid = await verifyCertificateSignature(
      certificate,
      serverPublicKey,
    );
    if (!signatureValid) {
      errors.push("Invalid certificate signature");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    expired,
    needsRenewal,
    remainingValidityMs,
  };
}

/**
 * Checks if a certificate should be renewed
 */
export function shouldRenewCertificate(
  certificate: SenderCertificate | null,
  now?: number,
): boolean {
  if (!certificate) {
    return true;
  }

  const currentTime = now ?? Date.now();
  const remainingMs = certificate.expiresAt - currentTime;

  return remainingMs < CERTIFICATE_RENEWAL_THRESHOLD_MS;
}

// ============================================================================
// Certificate Manager
// ============================================================================

/**
 * Client-side certificate manager
 */
export class SenderCertificateManager {
  private certificate: SenderCertificate | null = null;
  private serverPublicKeys: Map<number, Uint8Array> = new Map();
  private refreshCallback:
    | ((request: CertificateRequest) => Promise<CertificateResponse>)
    | null = null;
  private userId: string;
  private deviceId: string;
  private identityKey: Uint8Array;
  private lastRefreshAt: Date | null = null;

  constructor(userId: string, deviceId: string, identityKey: Uint8Array) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.identityKey = identityKey;
  }

  /**
   * Sets the callback for refreshing certificates
   */
  setRefreshCallback(
    callback: (request: CertificateRequest) => Promise<CertificateResponse>,
  ): void {
    this.refreshCallback = callback;
  }

  /**
   * Adds a server public key for verification
   */
  addServerPublicKey(keyId: number, publicKey: Uint8Array): void {
    this.serverPublicKeys.set(keyId, publicKey);
    logger.debug("Added server public key", { keyId });
  }

  /**
   * Removes a server public key (for revocation)
   */
  removeServerPublicKey(keyId: number): void {
    this.serverPublicKeys.delete(keyId);
    logger.debug("Removed server public key", { keyId });
  }

  /**
   * Gets the current certificate
   */
  getCertificate(): SenderCertificate | null {
    return this.certificate;
  }

  /**
   * Sets the current certificate
   */
  setCertificate(certificate: SenderCertificate): void {
    this.certificate = certificate;
    this.lastRefreshAt = new Date();
  }

  /**
   * Gets a valid certificate, refreshing if necessary
   */
  async getValidCertificate(): Promise<SenderCertificate> {
    // Check if we need to refresh
    if (shouldRenewCertificate(this.certificate)) {
      await this.refreshCertificate();
    }

    if (!this.certificate) {
      throw new Error("No valid certificate available");
    }

    return this.certificate;
  }

  /**
   * Refreshes the certificate from the server
   */
  async refreshCertificate(): Promise<void> {
    if (!this.refreshCallback) {
      throw new Error("No refresh callback configured");
    }

    try {
      const request: CertificateRequest = {
        userId: this.userId,
        deviceId: this.deviceId,
        identityKey: this.identityKey,
      };

      const response = await this.refreshCallback(request);

      // Add the server's public key if we don't have it
      if (!this.serverPublicKeys.has(response.serverKeyId)) {
        this.serverPublicKeys.set(
          response.serverKeyId,
          response.serverPublicKey,
        );
      }

      // Validate the new certificate
      const validation = await this.validateCertificateInternal(
        response.certificate,
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid certificate from server: ${validation.errors.join(", ")}`,
        );
      }

      this.certificate = response.certificate;
      this.lastRefreshAt = new Date();

      logger.info("Certificate refreshed", {
        expiresAt: new Date(this.certificate.expiresAt).toISOString(),
      });
    } catch (error) {
      logger.error("Failed to refresh certificate", { error });
      throw error;
    }
  }

  /**
   * Validates a certificate using stored server keys
   */
  async validateCertificateInternal(
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

  /**
   * Verifies a received certificate
   */
  async verifyCertificate(certificate: SenderCertificate): Promise<boolean> {
    const validation = await this.validateCertificateInternal(certificate);
    return validation.valid;
  }

  /**
   * Gets store state for persistence
   */
  getState(): CertificateStore {
    return {
      certificate: this.certificate,
      serverPublicKeys: new Map(this.serverPublicKeys),
      lastRefreshAt: this.lastRefreshAt,
    };
  }

  /**
   * Restores from persisted state
   */
  restoreState(state: CertificateStore): void {
    this.certificate = state.certificate;
    this.serverPublicKeys = new Map(state.serverPublicKeys);
    this.lastRefreshAt = state.lastRefreshAt;
  }

  /**
   * Clears all state
   */
  clear(): void {
    this.certificate = null;
    this.serverPublicKeys.clear();
    this.lastRefreshAt = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a sender certificate manager
 */
export function createSenderCertificateManager(
  userId: string,
  deviceId: string,
  identityKey: Uint8Array,
): SenderCertificateManager {
  return new SenderCertificateManager(userId, deviceId, identityKey);
}

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Exports a certificate to Base64 for transport
 */
export function certificateToBase64(certificate: SenderCertificate): string {
  const bytes = serializeCertificate(certificate);
  return bytesToBase64(bytes);
}

/**
 * Imports a certificate from Base64
 */
export function certificateFromBase64(base64: string): SenderCertificate {
  const bytes = base64ToBytes(base64);
  return deserializeCertificate(bytes);
}

// ============================================================================
// Exports
// ============================================================================

export const senderCertificate = {
  // Server key management
  generateServerSigningKeyPair,
  exportServerPublicKey,
  importServerPublicKey,

  // Certificate operations
  issueCertificate,
  verifyCertificateSignature,
  validateCertificate,
  shouldRenewCertificate,

  // Serialization
  certificateToBase64,
  certificateFromBase64,

  // Manager
  createSenderCertificateManager,
  SenderCertificateManager,

  // Constants
  DEFAULT_CERTIFICATE_VALIDITY_MS,
  MAX_CERTIFICATE_VALIDITY_MS,
  MIN_CERTIFICATE_VALIDITY_MS,
  CERTIFICATE_RENEWAL_THRESHOLD_MS,
};

export default senderCertificate;
