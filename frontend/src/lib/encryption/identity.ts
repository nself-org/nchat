/**
 * Identity Key Manager
 *
 * Manages the long-term identity key pair used for Signal Protocol.
 * The identity key is the user's cryptographic identity and should
 * be generated once and stored securely.
 */

import type { IdentityKeyPair } from "@/types/encryption";
import { EncryptionError, EncryptionErrorType } from "@/types/encryption";
import { logger } from "@/lib/logger";
import {
  generateKeyPair,
  generateSigningKeyPair,
  generateRegistrationId,
  getKeyFingerprint,
  formatFingerprint,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "./crypto-primitives";

// ============================================================================
// Types
// ============================================================================

export interface StoredIdentity {
  publicKey: string; // base64
  privateKey: string; // base64
  registrationId: number;
  createdAt: number;
  version: number;
}

export interface IdentityKeyInfo {
  publicKey: Uint8Array;
  fingerprint: string;
  registrationId: number;
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

const IDENTITY_STORAGE_KEY = "nchat_identity_key";
const CURRENT_VERSION = 1;

// ============================================================================
// Identity Key Manager
// ============================================================================

export class IdentityKeyManager {
  private static instance: IdentityKeyManager;
  private identityKeyPair: IdentityKeyPair | null = null;
  private registrationId: number | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): IdentityKeyManager {
    if (!IdentityKeyManager.instance) {
      IdentityKeyManager.instance = new IdentityKeyManager();
    }
    return IdentityKeyManager.instance;
  }

  /**
   * Initializes the identity key manager
   * Loads existing identity or generates new one
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const stored = this.loadFromStorage();

    if (stored) {
      this.identityKeyPair = {
        publicKey: base64ToUint8Array(stored.publicKey),
        privateKey: base64ToUint8Array(stored.privateKey),
      };
      this.registrationId = stored.registrationId;
    } else {
      await this.generateNewIdentity();
    }

    this.initialized = true;
  }

  /**
   * Generates a new identity key pair
   * WARNING: This will replace the existing identity!
   */
  async generateNewIdentity(): Promise<IdentityKeyPair> {
    // Generate a key pair for ECDH operations
    const keyPair = await generateKeyPair();

    this.identityKeyPair = keyPair;
    this.registrationId = generateRegistrationId();

    // Store the new identity
    this.saveToStorage();

    return keyPair;
  }

  /**
   * Gets the identity key pair
   */
  async getIdentityKeyPair(): Promise<IdentityKeyPair> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.identityKeyPair) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Identity key pair not found",
      );
    }

    return this.identityKeyPair;
  }

  /**
   * Gets only the public key (safe to share)
   */
  async getPublicKey(): Promise<Uint8Array> {
    const keyPair = await this.getIdentityKeyPair();
    return keyPair.publicKey;
  }

  /**
   * Gets the registration ID
   */
  async getRegistrationId(): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.registrationId === null) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Registration ID not found",
      );
    }

    return this.registrationId;
  }

  /**
   * Gets identity key information (public key, fingerprint, etc.)
   */
  async getIdentityInfo(): Promise<IdentityKeyInfo> {
    const keyPair = await this.getIdentityKeyPair();
    const registrationId = await this.getRegistrationId();
    const fingerprintBytes = await getKeyFingerprint(keyPair.publicKey);
    const stored = this.loadFromStorage();

    return {
      publicKey: keyPair.publicKey,
      fingerprint: formatFingerprint(fingerprintBytes),
      registrationId,
      createdAt: new Date(stored?.createdAt ?? Date.now()),
    };
  }

  /**
   * Checks if identity exists
   */
  hasIdentity(): boolean {
    return this.loadFromStorage() !== null;
  }

  /**
   * Clears the identity (dangerous - use with caution)
   */
  async clearIdentity(): Promise<void> {
    this.identityKeyPair = null;
    this.registrationId = null;
    this.initialized = false;

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(IDENTITY_STORAGE_KEY);
    }
  }

  /**
   * Exports the public key as base64 for sharing
   */
  async exportPublicKey(): Promise<string> {
    const publicKey = await this.getPublicKey();
    return uint8ArrayToBase64(publicKey);
  }

  /**
   * Generates a signing key pair from identity key
   * Used for signing prekeys
   */
  async getSigningKeyPair(): Promise<IdentityKeyPair> {
    // For signing, we generate a separate ECDSA key pair
    // In production, this should be derived from or stored alongside identity
    const stored = this.loadFromStorage();

    if (stored && stored.version >= 1) {
      // Use identity keys for signing (P-256 supports both ECDH and ECDSA)
      return this.getIdentityKeyPair();
    }

    // Generate fresh signing keys
    return generateSigningKeyPair();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Loads identity from storage
   */
  private loadFromStorage(): StoredIdentity | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as StoredIdentity;

      // Validate required fields
      if (!parsed.publicKey || !parsed.privateKey || !parsed.registrationId) {
        logger.warn("Invalid identity key in storage");
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error("Failed to load identity from storage:", error);
      return null;
    }
  }

  /**
   * Saves identity to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    if (!this.identityKeyPair || this.registrationId === null) {
      throw new EncryptionError(
        EncryptionErrorType.KEY_NOT_FOUND,
        "Cannot save: identity not initialized",
      );
    }

    const stored: StoredIdentity = {
      publicKey: uint8ArrayToBase64(this.identityKeyPair.publicKey),
      privateKey: uint8ArrayToBase64(this.identityKeyPair.privateKey),
      registrationId: this.registrationId,
      createdAt: Date.now(),
      version: CURRENT_VERSION,
    };

    try {
      localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.STORAGE_ERROR,
        "Failed to save identity to storage",
        error,
      );
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the global identity key manager instance
 */
export function getIdentityManager(): IdentityKeyManager {
  return IdentityKeyManager.getInstance();
}

/**
 * Generates a new identity key pair (standalone function)
 */
export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  return generateKeyPair();
}

/**
 * Checks if identity key exists
 */
export function hasIdentityKey(): boolean {
  return getIdentityManager().hasIdentity();
}

/**
 * Gets the current identity public key
 */
export async function getIdentityPublicKey(): Promise<Uint8Array> {
  return getIdentityManager().getPublicKey();
}

/**
 * Gets the current registration ID
 */
export async function getRegistrationId(): Promise<number> {
  return getIdentityManager().getRegistrationId();
}

/**
 * Gets identity fingerprint for display
 */
export async function getIdentityFingerprint(): Promise<string> {
  const info = await getIdentityManager().getIdentityInfo();
  return info.fingerprint;
}
