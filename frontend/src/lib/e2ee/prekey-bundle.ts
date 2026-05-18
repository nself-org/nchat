/**
 * Pre-Key Bundle Management
 *
 * Manages the lifecycle of pre-key bundles for X3DH key agreement.
 * Handles bundle creation, storage, publishing, and rotation.
 *
 * Features:
 * - Pre-key bundle generation and validation
 * - One-time pre-key replenishment
 * - Signed pre-key rotation
 * - Bundle caching and persistence
 * - Server synchronization helpers
 */

import { logger } from "@/lib/logger";
import {
  type PreKeyBundle,
  type IdentityKeyPair,
  type SignedPreKey,
  type OneTimePreKey,
  generateIdentityKeyPair,
  generateSignedPreKey,
  generateOneTimePreKeys,
  generateRegistrationId,
} from "./x3dh";

// ============================================================================
// Constants
// ============================================================================

/** Minimum number of one-time pre-keys to maintain */
const MIN_ONE_TIME_PREKEYS = 10;

/** Default number of one-time pre-keys to generate */
const DEFAULT_ONE_TIME_PREKEY_COUNT = 100;

/** Signed pre-key rotation interval (7 days) */
const SIGNED_PREKEY_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/** Storage key for pre-key bundle */
const BUNDLE_STORAGE_KEY = "nchat_prekey_bundle";

/** Storage key for key state */
const KEY_STATE_STORAGE_KEY = "nchat_e2ee_key_state";

// ============================================================================
// Types
// ============================================================================

/**
 * Pre-key bundle state
 */
export interface PreKeyBundleState {
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Registration ID */
  registrationId: number;
  /** Identity key pair */
  identityKeyPair: SerializedKeyPair;
  /** Current signed pre-key */
  signedPreKey: SerializedSignedPreKey;
  /** Previous signed pre-key (for transition period) */
  previousSignedPreKey?: SerializedSignedPreKey;
  /** One-time pre-keys */
  oneTimePreKeys: SerializedOneTimePreKey[];
  /** When bundle was last updated */
  lastUpdatedAt: Date;
  /** When signed pre-key was last rotated */
  signedPreKeyRotatedAt: Date;
  /** Version number for conflict resolution */
  version: number;
}

/**
 * Serialized key pair for storage
 */
export interface SerializedKeyPair {
  publicKey: string; // Base64
  privateKey: string; // Base64
}

/**
 * Serialized signed pre-key for storage
 */
export interface SerializedSignedPreKey {
  keyId: number;
  keyPair: SerializedKeyPair;
  signature: string; // Base64
  timestamp: number;
  expiresAt?: number;
}

/**
 * Serialized one-time pre-key for storage
 */
export interface SerializedOneTimePreKey {
  keyId: number;
  publicKey: string; // Base64
  privateKey: string; // Base64
  used: boolean;
  createdAt: number;
}

/**
 * Pre-key bundle validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Server sync request for pre-keys
 */
export interface PreKeySyncRequest {
  registrationId: number;
  identityKey: string; // Base64
  signedPreKey: {
    keyId: number;
    publicKey: string; // Base64
    signature: string; // Base64
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string; // Base64
  }>;
}

/**
 * Server response for pre-key consumption
 */
export interface PreKeyConsumptionResponse {
  consumedKeyIds: number[];
  remainingCount: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

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

/**
 * Serializes an identity key pair
 */
function serializeIdentityKeyPair(keyPair: IdentityKeyPair): SerializedKeyPair {
  return {
    publicKey: bytesToBase64(keyPair.publicKey),
    privateKey: bytesToBase64(keyPair.privateKey),
  };
}

/**
 * Deserializes an identity key pair
 */
function deserializeIdentityKeyPair(
  serialized: SerializedKeyPair,
): IdentityKeyPair {
  return {
    type: "identity",
    publicKey: base64ToBytes(serialized.publicKey),
    privateKey: base64ToBytes(serialized.privateKey),
    createdAt: new Date(),
  };
}

/**
 * Serializes a signed pre-key
 */
function serializeSignedPreKey(key: SignedPreKey): SerializedSignedPreKey {
  return {
    keyId: key.keyId,
    keyPair: {
      publicKey: bytesToBase64(key.publicKey),
      privateKey: bytesToBase64(key.privateKey),
    },
    signature: bytesToBase64(key.signature),
    timestamp: key.timestamp,
    expiresAt: key.expiresAt,
  };
}

/**
 * Deserializes a signed pre-key
 */
function deserializeSignedPreKey(
  serialized: SerializedSignedPreKey,
): SignedPreKey {
  return {
    type: "signed-prekey",
    keyId: serialized.keyId,
    publicKey: base64ToBytes(serialized.keyPair.publicKey),
    privateKey: base64ToBytes(serialized.keyPair.privateKey),
    signature: base64ToBytes(serialized.signature),
    timestamp: serialized.timestamp,
    expiresAt: serialized.expiresAt,
  };
}

/**
 * Serializes a one-time pre-key
 */
function serializeOneTimePreKey(key: OneTimePreKey): SerializedOneTimePreKey {
  return {
    keyId: key.keyId,
    publicKey: bytesToBase64(key.publicKey),
    privateKey: bytesToBase64(key.privateKey),
    used: key.used ?? false,
    createdAt: Date.now(),
  };
}

/**
 * Deserializes a one-time pre-key
 */
function deserializeOneTimePreKey(
  serialized: SerializedOneTimePreKey,
): OneTimePreKey {
  return {
    type: "one-time-prekey",
    keyId: serialized.keyId,
    publicKey: base64ToBytes(serialized.publicKey),
    privateKey: base64ToBytes(serialized.privateKey),
    used: serialized.used,
  };
}

// ============================================================================
// Pre-Key Bundle Manager Class
// ============================================================================

/**
 * Manages pre-key bundles for E2EE
 */
export class PreKeyBundleManager {
  private state: PreKeyBundleState | null = null;
  private storage: Storage | null = null;
  private initialized = false;

  constructor(storage?: Storage) {
    this.storage =
      storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the bundle manager
   */
  async initialize(userId: string, deviceId: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Try to load existing state
    const loadedState = this.loadState();
    if (
      loadedState &&
      loadedState.userId === userId &&
      loadedState.deviceId === deviceId
    ) {
      this.state = loadedState;
      logger.info("Pre-key bundle loaded from storage");
    } else {
      // Generate new keys
      await this.generateNewBundle(userId, deviceId);
      logger.info("Generated new pre-key bundle");
    }

    this.initialized = true;
  }

  /**
   * Generates a completely new bundle
   */
  async generateNewBundle(userId: string, deviceId: string): Promise<void> {
    const registrationId = generateRegistrationId();
    const identityKeyPair = await generateIdentityKeyPair(deviceId);
    const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
    const oneTimePreKeys = await generateOneTimePreKeys(
      1,
      DEFAULT_ONE_TIME_PREKEY_COUNT,
    );

    this.state = {
      userId,
      deviceId,
      registrationId,
      identityKeyPair: serializeIdentityKeyPair(identityKeyPair),
      signedPreKey: serializeSignedPreKey(signedPreKey),
      oneTimePreKeys: oneTimePreKeys.map(serializeOneTimePreKey),
      lastUpdatedAt: new Date(),
      signedPreKeyRotatedAt: new Date(),
      version: 1,
    };

    this.saveState();
  }

  /**
   * Checks if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.state !== null;
  }

  // ==========================================================================
  // Bundle Access
  // ==========================================================================

  /**
   * Gets the current pre-key bundle for publishing
   */
  getPreKeyBundle(): PreKeyBundle {
    if (!this.state) {
      throw new Error("Pre-key bundle manager not initialized");
    }

    const unusedOneTimePreKey = this.state.oneTimePreKeys.find((k) => !k.used);

    return {
      userId: this.state.userId,
      deviceId: this.state.deviceId,
      registrationId: this.state.registrationId,
      identityKey: base64ToBytes(this.state.identityKeyPair.publicKey),
      signedPreKeyId: this.state.signedPreKey.keyId,
      signedPreKey: base64ToBytes(this.state.signedPreKey.keyPair.publicKey),
      signedPreKeySignature: base64ToBytes(this.state.signedPreKey.signature),
      oneTimePreKeyId: unusedOneTimePreKey?.keyId,
      oneTimePreKey: unusedOneTimePreKey
        ? base64ToBytes(unusedOneTimePreKey.publicKey)
        : undefined,
      version: 1,
    };
  }

  /**
   * Gets the identity key pair
   */
  getIdentityKeyPair(): IdentityKeyPair | null {
    if (!this.state) {
      return null;
    }
    return deserializeIdentityKeyPair(this.state.identityKeyPair);
  }

  /**
   * Gets the signed pre-key
   */
  getSignedPreKey(): SignedPreKey | null {
    if (!this.state) {
      return null;
    }
    return deserializeSignedPreKey(this.state.signedPreKey);
  }

  /**
   * Gets a specific one-time pre-key by ID
   */
  getOneTimePreKey(keyId: number): OneTimePreKey | null {
    if (!this.state) {
      return null;
    }

    const serialized = this.state.oneTimePreKeys.find((k) => k.keyId === keyId);
    if (!serialized) {
      return null;
    }

    return deserializeOneTimePreKey(serialized);
  }

  /**
   * Gets all unused one-time pre-keys
   */
  getUnusedOneTimePreKeys(): OneTimePreKey[] {
    if (!this.state) {
      return [];
    }

    return this.state.oneTimePreKeys
      .filter((k) => !k.used)
      .map(deserializeOneTimePreKey);
  }

  /**
   * Gets the count of unused one-time pre-keys
   */
  getUnusedOneTimePreKeyCount(): number {
    if (!this.state) {
      return 0;
    }
    return this.state.oneTimePreKeys.filter((k) => !k.used).length;
  }

  /**
   * Gets the registration ID
   */
  getRegistrationId(): number {
    return this.state?.registrationId ?? 0;
  }

  // ==========================================================================
  // One-Time Pre-Key Management
  // ==========================================================================

  /**
   * Marks a one-time pre-key as used
   */
  markOneTimePreKeyUsed(keyId: number): void {
    if (!this.state) {
      return;
    }

    const key = this.state.oneTimePreKeys.find((k) => k.keyId === keyId);
    if (key) {
      key.used = true;
      this.saveState();
      logger.debug("Marked one-time pre-key as used", { keyId });
    }
  }

  /**
   * Removes used one-time pre-keys
   */
  cleanupUsedOneTimePreKeys(): number {
    if (!this.state) {
      return 0;
    }

    const before = this.state.oneTimePreKeys.length;
    this.state.oneTimePreKeys = this.state.oneTimePreKeys.filter(
      (k) => !k.used,
    );
    const removed = before - this.state.oneTimePreKeys.length;

    if (removed > 0) {
      this.saveState();
      logger.debug("Cleaned up used one-time pre-keys", { removed });
    }

    return removed;
  }

  /**
   * Replenishes one-time pre-keys if needed
   */
  async replenishOneTimePreKeysIfNeeded(): Promise<OneTimePreKey[]> {
    if (!this.state) {
      return [];
    }

    const unusedCount = this.getUnusedOneTimePreKeyCount();
    if (unusedCount >= MIN_ONE_TIME_PREKEYS) {
      return [];
    }

    const countToGenerate = DEFAULT_ONE_TIME_PREKEY_COUNT - unusedCount;
    return this.generateMoreOneTimePreKeys(countToGenerate);
  }

  /**
   * Generates more one-time pre-keys
   */
  async generateMoreOneTimePreKeys(count: number): Promise<OneTimePreKey[]> {
    if (!this.state) {
      return [];
    }

    const maxKeyId = Math.max(
      0,
      ...this.state.oneTimePreKeys.map((k) => k.keyId),
    );
    const newKeys = await generateOneTimePreKeys(maxKeyId + 1, count);

    // Add to state
    for (const key of newKeys) {
      this.state.oneTimePreKeys.push(serializeOneTimePreKey(key));
    }

    this.state.lastUpdatedAt = new Date();
    this.state.version++;
    this.saveState();

    logger.info("Generated new one-time pre-keys", { count });

    return newKeys;
  }

  // ==========================================================================
  // Signed Pre-Key Rotation
  // ==========================================================================

  /**
   * Checks if signed pre-key needs rotation
   */
  needsSignedPreKeyRotation(): boolean {
    if (!this.state) {
      return false;
    }

    const timeSinceRotation =
      Date.now() - this.state.signedPreKeyRotatedAt.getTime();
    return timeSinceRotation >= SIGNED_PREKEY_ROTATION_INTERVAL_MS;
  }

  /**
   * Rotates the signed pre-key
   */
  async rotateSignedPreKey(): Promise<SignedPreKey> {
    if (!this.state) {
      throw new Error("Pre-key bundle manager not initialized");
    }

    const identityKeyPair = deserializeIdentityKeyPair(
      this.state.identityKeyPair,
    );
    const newKeyId = this.state.signedPreKey.keyId + 1;
    const newSignedPreKey = await generateSignedPreKey(
      identityKeyPair,
      newKeyId,
    );

    // Keep previous signed pre-key for transition
    this.state.previousSignedPreKey = this.state.signedPreKey;
    this.state.signedPreKey = serializeSignedPreKey(newSignedPreKey);
    this.state.signedPreKeyRotatedAt = new Date();
    this.state.lastUpdatedAt = new Date();
    this.state.version++;

    this.saveState();

    logger.info("Rotated signed pre-key", { newKeyId });

    return newSignedPreKey;
  }

  /**
   * Rotates signed pre-key if needed
   */
  async rotateSignedPreKeyIfNeeded(): Promise<SignedPreKey | null> {
    if (this.needsSignedPreKeyRotation()) {
      return this.rotateSignedPreKey();
    }
    return null;
  }

  // ==========================================================================
  // Server Synchronization
  // ==========================================================================

  /**
   * Creates a sync request for the server
   */
  createSyncRequest(): PreKeySyncRequest {
    if (!this.state) {
      throw new Error("Pre-key bundle manager not initialized");
    }

    return {
      registrationId: this.state.registrationId,
      identityKey: this.state.identityKeyPair.publicKey,
      signedPreKey: {
        keyId: this.state.signedPreKey.keyId,
        publicKey: this.state.signedPreKey.keyPair.publicKey,
        signature: this.state.signedPreKey.signature,
      },
      oneTimePreKeys: this.state.oneTimePreKeys
        .filter((k) => !k.used)
        .map((k) => ({
          keyId: k.keyId,
          publicKey: k.publicKey,
        })),
    };
  }

  /**
   * Creates a partial sync request for replenishment
   */
  createReplenishmentRequest(
    newKeys: OneTimePreKey[],
  ): PreKeySyncRequest["oneTimePreKeys"] {
    return newKeys.map((k) => ({
      keyId: k.keyId,
      publicKey: bytesToBase64(k.publicKey),
    }));
  }

  /**
   * Handles server response about consumed pre-keys
   */
  handleConsumptionResponse(response: PreKeyConsumptionResponse): void {
    if (!this.state) {
      return;
    }

    for (const keyId of response.consumedKeyIds) {
      this.markOneTimePreKeyUsed(keyId);
    }

    logger.debug("Handled pre-key consumption response", {
      consumed: response.consumedKeyIds.length,
      remaining: response.remainingCount,
    });
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validates the current bundle state
   */
  validateBundle(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.state) {
      return { valid: false, errors: ["Bundle not initialized"], warnings: [] };
    }

    // Check identity key
    if (
      !this.state.identityKeyPair.publicKey ||
      !this.state.identityKeyPair.privateKey
    ) {
      errors.push("Missing identity key pair");
    }

    // Check signed pre-key
    if (
      !this.state.signedPreKey.keyPair.publicKey ||
      !this.state.signedPreKey.signature
    ) {
      errors.push("Missing or invalid signed pre-key");
    }

    // Check signed pre-key age
    if (this.needsSignedPreKeyRotation()) {
      warnings.push("Signed pre-key needs rotation");
    }

    // Check one-time pre-keys
    const unusedCount = this.getUnusedOneTimePreKeyCount();
    if (unusedCount === 0) {
      warnings.push("No one-time pre-keys available");
    } else if (unusedCount < MIN_ONE_TIME_PREKEYS) {
      warnings.push(`Low one-time pre-key count: ${unusedCount}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a remote pre-key bundle
   */
  static validateRemoteBundle(bundle: PreKeyBundle): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!bundle.userId) {
      errors.push("Missing user ID");
    }
    if (!bundle.deviceId) {
      errors.push("Missing device ID");
    }
    if (!bundle.identityKey || bundle.identityKey.length === 0) {
      errors.push("Missing identity key");
    }
    if (!bundle.signedPreKey || bundle.signedPreKey.length === 0) {
      errors.push("Missing signed pre-key");
    }
    if (
      !bundle.signedPreKeySignature ||
      bundle.signedPreKeySignature.length === 0
    ) {
      errors.push("Missing signed pre-key signature");
    }

    // Check optional one-time pre-key
    if (!bundle.oneTimePreKey) {
      warnings.push("No one-time pre-key in bundle");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // Persistence
  // ==========================================================================

  /**
   * Saves state to storage
   */
  private saveState(): void {
    if (!this.storage || !this.state) {
      return;
    }

    try {
      const serialized = JSON.stringify({
        ...this.state,
        lastUpdatedAt: this.state.lastUpdatedAt.toISOString(),
        signedPreKeyRotatedAt: this.state.signedPreKeyRotatedAt.toISOString(),
      });
      this.storage.setItem(KEY_STATE_STORAGE_KEY, serialized);
    } catch (error) {
      logger.error("Failed to save pre-key bundle state", { error });
    }
  }

  /**
   * Loads state from storage
   */
  private loadState(): PreKeyBundleState | null {
    if (!this.storage) {
      return null;
    }

    try {
      const serialized = this.storage.getItem(KEY_STATE_STORAGE_KEY);
      if (!serialized) {
        return null;
      }

      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        lastUpdatedAt: new Date(parsed.lastUpdatedAt),
        signedPreKeyRotatedAt: new Date(parsed.signedPreKeyRotatedAt),
      };
    } catch (error) {
      logger.error("Failed to load pre-key bundle state", { error });
      return null;
    }
  }

  /**
   * Clears stored state
   */
  clearState(): void {
    if (this.storage) {
      this.storage.removeItem(KEY_STATE_STORAGE_KEY);
    }
    this.state = null;
    this.initialized = false;
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  /**
   * Exports the current state for backup
   */
  exportState(): PreKeyBundleState | null {
    return this.state
      ? {
          ...this.state,
          // Ensure dates are properly formatted
          lastUpdatedAt: new Date(this.state.lastUpdatedAt),
          signedPreKeyRotatedAt: new Date(this.state.signedPreKeyRotatedAt),
        }
      : null;
  }

  /**
   * Imports state from backup
   */
  importState(state: PreKeyBundleState): void {
    this.state = {
      ...state,
      lastUpdatedAt: new Date(state.lastUpdatedAt),
      signedPreKeyRotatedAt: new Date(state.signedPreKeyRotatedAt),
    };
    this.saveState();
    this.initialized = true;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the manager and wipes key material
   */
  destroy(): void {
    if (this.state) {
      // Wipe private keys from memory (best effort)
      this.state.identityKeyPair.privateKey = "";
      this.state.signedPreKey.keyPair.privateKey = "";
      for (const key of this.state.oneTimePreKeys) {
        key.privateKey = "";
      }
    }

    this.state = null;
    this.initialized = false;

    logger.debug("Pre-key bundle manager destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes a pre-key bundle manager
 */
export async function createPreKeyBundleManager(
  userId: string,
  deviceId: string,
  storage?: Storage,
): Promise<PreKeyBundleManager> {
  const manager = new PreKeyBundleManager(storage);
  await manager.initialize(userId, deviceId);
  return manager;
}

// ============================================================================
// Exports
// ============================================================================

export default PreKeyBundleManager;
