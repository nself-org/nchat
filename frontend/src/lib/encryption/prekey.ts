/**
 * Signed PreKey Manager
 *
 * Manages signed prekeys for the Signal Protocol X3DH key agreement.
 * Signed prekeys are medium-term keys that should be rotated periodically
 * (typically every 7 days).
 */

import type { SignedPreKey, IdentityKeyPair } from "@/types/encryption";
import { EncryptionError, EncryptionErrorType } from "@/types/encryption";
import {
  generateKeyPair,
  sign,
  verify,
  uint8ArrayToBase64,
  base64ToUint8Array,
  randomBytes,
} from "./crypto-primitives";
import { getIdentityManager } from "./identity";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface StoredSignedPreKey {
  keyId: number;
  publicKey: string; // base64
  privateKey: string; // base64
  signature: string; // base64
  timestamp: number;
  version: number;
}

// ============================================================================
// Constants
// ============================================================================

const SIGNED_PREKEY_STORAGE_KEY = "nchat_signed_prekey";
const SIGNED_PREKEY_ARCHIVE_KEY = "nchat_signed_prekey_archive";
const ROTATION_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
const ARCHIVE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const CURRENT_VERSION = 1;

// ============================================================================
// Signed PreKey Manager
// ============================================================================

export class SignedPreKeyManager {
  private static instance: SignedPreKeyManager;
  private currentPreKey: SignedPreKey | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): SignedPreKeyManager {
    if (!SignedPreKeyManager.instance) {
      SignedPreKeyManager.instance = new SignedPreKeyManager();
    }
    return SignedPreKeyManager.instance;
  }

  /**
   * Initializes the signed prekey manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const stored = this.loadFromStorage();

    if (stored) {
      this.currentPreKey = {
        keyId: stored.keyId,
        publicKey: base64ToUint8Array(stored.publicKey),
        privateKey: base64ToUint8Array(stored.privateKey),
        signature: base64ToUint8Array(stored.signature),
        timestamp: stored.timestamp,
      };
    }

    this.initialized = true;
  }

  /**
   * Generates a new signed prekey
   */
  async generateSignedPreKey(
    identityKeyPair?: IdentityKeyPair,
  ): Promise<SignedPreKey> {
    // Get identity key pair for signing
    const identity =
      identityKeyPair ?? (await getIdentityManager().getIdentityKeyPair());

    // Generate new key pair for the prekey
    const keyPair = await generateKeyPair();

    // Generate a unique key ID
    const keyId = this.generateKeyId();

    // Sign the public key with identity key
    const signature = await sign(
      identity.privateKey,
      identity.publicKey,
      keyPair.publicKey,
    );

    const signedPreKey: SignedPreKey = {
      keyId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      signature,
      timestamp: Date.now(),
    };

    // Archive the old prekey if exists
    if (this.currentPreKey) {
      this.archivePreKey(this.currentPreKey);
    }

    this.currentPreKey = signedPreKey;
    this.saveToStorage();

    return signedPreKey;
  }

  /**
   * Gets the current signed prekey
   */
  async getCurrentSignedPreKey(): Promise<SignedPreKey> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.currentPreKey) {
      // Generate a new one if none exists
      return this.generateSignedPreKey();
    }

    return this.currentPreKey;
  }

  /**
   * Gets signed prekey by ID (for decryption of old messages)
   */
  async getSignedPreKey(keyId: number): Promise<SignedPreKey | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check current prekey
    if (this.currentPreKey && this.currentPreKey.keyId === keyId) {
      return this.currentPreKey;
    }

    // Check archived prekeys
    return this.getArchivedPreKey(keyId);
  }

  /**
   * Checks if the current prekey needs rotation
   */
  async needsRotation(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.currentPreKey) {
      return true;
    }

    const age = Date.now() - this.currentPreKey.timestamp;
    return age >= ROTATION_INTERVAL;
  }

  /**
   * Rotates the signed prekey if needed
   */
  async rotateIfNeeded(): Promise<SignedPreKey | null> {
    const needs = await this.needsRotation();
    if (needs) {
      return this.generateSignedPreKey();
    }
    return null;
  }

  /**
   * Forces rotation of the signed prekey
   */
  async forceRotate(): Promise<SignedPreKey> {
    return this.generateSignedPreKey();
  }

  /**
   * Verifies a signed prekey signature
   */
  async verifySignedPreKey(
    identityPublicKey: Uint8Array,
    signedPreKeyPublic: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    return verify(identityPublicKey, signature, signedPreKeyPublic);
  }

  /**
   * Gets the public prekey data for sharing
   */
  async getPublicPreKeyData(): Promise<{
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  }> {
    const preKey = await this.getCurrentSignedPreKey();
    return {
      keyId: preKey.keyId,
      publicKey: preKey.publicKey,
      signature: preKey.signature,
    };
  }

  /**
   * Clears all signed prekeys
   */
  async clear(): Promise<void> {
    this.currentPreKey = null;
    this.initialized = false;

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(SIGNED_PREKEY_STORAGE_KEY);
      localStorage.removeItem(SIGNED_PREKEY_ARCHIVE_KEY);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generates a unique key ID
   */
  private generateKeyId(): number {
    const bytes = randomBytes(4);
    const view = new DataView(bytes.buffer);
    return view.getUint32(0, false) >>> 8; // 24-bit ID
  }

  /**
   * Loads the current prekey from storage
   */
  private loadFromStorage(): StoredSignedPreKey | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(SIGNED_PREKEY_STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as StoredSignedPreKey;

      if (!parsed.publicKey || !parsed.privateKey || !parsed.signature) {
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error("Failed to load signed prekey:", error);
      return null;
    }
  }

  /**
   * Saves the current prekey to storage
   */
  private saveToStorage(): void {
    if (typeof localStorage === "undefined") return;
    if (!this.currentPreKey) return;

    const stored: StoredSignedPreKey = {
      keyId: this.currentPreKey.keyId,
      publicKey: uint8ArrayToBase64(this.currentPreKey.publicKey),
      privateKey: uint8ArrayToBase64(this.currentPreKey.privateKey),
      signature: uint8ArrayToBase64(this.currentPreKey.signature),
      timestamp: this.currentPreKey.timestamp,
      version: CURRENT_VERSION,
    };

    try {
      localStorage.setItem(SIGNED_PREKEY_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      throw new EncryptionError(
        EncryptionErrorType.STORAGE_ERROR,
        "Failed to save signed prekey",
        error,
      );
    }
  }

  /**
   * Archives an old prekey
   */
  private archivePreKey(preKey: SignedPreKey): void {
    if (typeof localStorage === "undefined") return;

    try {
      const stored = localStorage.getItem(SIGNED_PREKEY_ARCHIVE_KEY);
      const archive: StoredSignedPreKey[] = stored ? JSON.parse(stored) : [];

      // Add to archive
      archive.push({
        keyId: preKey.keyId,
        publicKey: uint8ArrayToBase64(preKey.publicKey),
        privateKey: uint8ArrayToBase64(preKey.privateKey),
        signature: uint8ArrayToBase64(preKey.signature),
        timestamp: preKey.timestamp,
        version: CURRENT_VERSION,
      });

      // Clean up old entries
      const cutoff = Date.now() - ARCHIVE_MAX_AGE;
      const filtered = archive.filter((pk) => pk.timestamp > cutoff);

      localStorage.setItem(SIGNED_PREKEY_ARCHIVE_KEY, JSON.stringify(filtered));
    } catch (error) {
      logger.error("Failed to archive prekey:", error);
    }
  }

  /**
   * Gets an archived prekey by ID
   */
  private getArchivedPreKey(keyId: number): SignedPreKey | null {
    if (typeof localStorage === "undefined") return null;

    try {
      const stored = localStorage.getItem(SIGNED_PREKEY_ARCHIVE_KEY);
      if (!stored) return null;

      const archive: StoredSignedPreKey[] = JSON.parse(stored);
      const found = archive.find((pk) => pk.keyId === keyId);

      if (!found) return null;

      return {
        keyId: found.keyId,
        publicKey: base64ToUint8Array(found.publicKey),
        privateKey: base64ToUint8Array(found.privateKey),
        signature: base64ToUint8Array(found.signature),
        timestamp: found.timestamp,
      };
    } catch (error) {
      logger.error("Failed to get archived prekey:", error);
      return null;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Gets the signed prekey manager instance
 */
export function getSignedPreKeyManager(): SignedPreKeyManager {
  return SignedPreKeyManager.getInstance();
}

/**
 * Generates a new signed prekey
 */
export async function generateSignedPreKey(
  identityKeyPair?: IdentityKeyPair,
): Promise<SignedPreKey> {
  return getSignedPreKeyManager().generateSignedPreKey(identityKeyPair);
}

/**
 * Gets the current signed prekey
 */
export async function getCurrentSignedPreKey(): Promise<SignedPreKey> {
  return getSignedPreKeyManager().getCurrentSignedPreKey();
}

/**
 * Checks if signed prekey rotation is needed
 */
export async function needsSignedPreKeyRotation(): Promise<boolean> {
  return getSignedPreKeyManager().needsRotation();
}

/**
 * Rotates signed prekey if needed
 */
export async function rotateSignedPreKeyIfNeeded(): Promise<SignedPreKey | null> {
  return getSignedPreKeyManager().rotateIfNeeded();
}

/**
 * Verifies a signed prekey
 */
export async function verifySignedPreKey(
  identityPublicKey: Uint8Array,
  signedPreKeyPublic: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  return getSignedPreKeyManager().verifySignedPreKey(
    identityPublicKey,
    signedPreKeyPublic,
    signature,
  );
}
