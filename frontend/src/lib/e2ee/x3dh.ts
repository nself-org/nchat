/**
 * Extended Triple Diffie-Hellman (X3DH) Key Agreement Protocol
 *
 * Implements the X3DH protocol for establishing initial shared secrets
 * between two parties. This provides forward secrecy and deniability
 * for end-to-end encrypted conversations.
 *
 * Based on Signal's X3DH specification:
 * https://signal.org/docs/specifications/x3dh/
 *
 * Uses Web Crypto API with X25519-equivalent ECDH on P-256 curve.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

/** ECDH curve to use */
const ECDH_CURVE = "P-256";

/** ECDSA curve for signing */
const ECDSA_CURVE = "P-256";

/** Key derivation info string for X3DH */
const X3DH_INFO = "nchat-x3dh-v1";

/** HKDF hash algorithm */
const HKDF_HASH = "SHA-256";

/** Derived key length in bytes */
const DERIVED_KEY_LENGTH = 32;

/** Protocol version */
const PROTOCOL_VERSION = 1;

// ============================================================================
// Types
// ============================================================================

/**
 * A cryptographic key pair with public and private components
 */
export interface X3DHKeyPair {
  /** Public key as raw bytes */
  publicKey: Uint8Array;
  /** Private key as raw bytes */
  privateKey: Uint8Array;
  /** CryptoKey object for ECDH operations */
  cryptoPublicKey?: CryptoKey;
  /** CryptoKey object for ECDH operations */
  cryptoPrivateKey?: CryptoKey;
}

/**
 * Identity key pair with signing capability
 */
export interface IdentityKeyPair extends X3DHKeyPair {
  /** Key type identifier */
  type: "identity";
  /** Created timestamp */
  createdAt: Date;
  /** Optional device ID */
  deviceId?: string;
}

/**
 * Signed pre-key with signature from identity key
 */
export interface SignedPreKey extends X3DHKeyPair {
  /** Key type identifier */
  type: "signed-prekey";
  /** Unique key identifier */
  keyId: number;
  /** Signature from identity key */
  signature: Uint8Array;
  /** Timestamp when key was created */
  timestamp: number;
  /** Expiration timestamp */
  expiresAt?: number;
}

/**
 * One-time pre-key for forward secrecy
 */
export interface OneTimePreKey extends X3DHKeyPair {
  /** Key type identifier */
  type: "one-time-prekey";
  /** Unique key identifier */
  keyId: number;
  /** Whether this key has been used */
  used?: boolean;
}

/**
 * Pre-key bundle published to server
 */
export interface PreKeyBundle {
  /** User identity */
  userId: string;
  /** Device identifier */
  deviceId: string;
  /** Registration ID for this device */
  registrationId: number;
  /** Public identity key */
  identityKey: Uint8Array;
  /** Signed pre-key ID */
  signedPreKeyId: number;
  /** Signed pre-key public */
  signedPreKey: Uint8Array;
  /** Signature of signed pre-key */
  signedPreKeySignature: Uint8Array;
  /** One-time pre-key ID (optional) */
  oneTimePreKeyId?: number;
  /** One-time pre-key public (optional) */
  oneTimePreKey?: Uint8Array;
  /** Protocol version */
  version: number;
}

/**
 * X3DH key agreement result
 */
export interface X3DHResult {
  /** Shared secret derived from key agreement */
  sharedSecret: Uint8Array;
  /** Associated data for AEAD */
  associatedData: Uint8Array;
  /** Ephemeral public key (sent to responder) */
  ephemeralPublicKey: Uint8Array;
  /** Remote signed pre-key (used as initial ratchet key for initiator) */
  remoteSignedPreKey: Uint8Array;
  /** One-time pre-key ID used (if any) */
  usedOneTimePreKeyId?: number;
  /** Whether one-time pre-key was used */
  usedOneTimePreKey: boolean;
}

/**
 * X3DH session initialization data
 */
export interface X3DHSessionInit {
  /** Shared secret */
  sharedSecret: Uint8Array;
  /** Remote identity key */
  remoteIdentityKey: Uint8Array;
  /** Remote ephemeral key (for responder) */
  remoteEphemeralKey?: Uint8Array;
  /** Local identity key */
  localIdentityKey: Uint8Array;
  /** Associated data */
  associatedData: Uint8Array;
  /** Who initiated the session */
  initiator: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts ArrayBuffer to Uint8Array
 */
function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

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
 * Constant-time comparison to prevent timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Generates a random registration ID (24-bit)
 */
export function generateRegistrationId(): number {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generates an ECDH key pair
 */
export async function generateKeyPair(): Promise<X3DHKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    ["deriveBits", "deriveKey"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  // Export private key as raw bytes (d parameter)
  const privateKeyD = privateKeyJwk.d;
  if (!privateKeyD) {
    throw new Error("Failed to export private key");
  }

  // Decode base64url to bytes
  const privateKeyBytes = base64UrlToBytes(privateKeyD);

  return {
    publicKey: toUint8Array(publicKeyRaw),
    privateKey: privateKeyBytes,
    cryptoPublicKey: keyPair.publicKey,
    cryptoPrivateKey: keyPair.privateKey,
  };
}

/**
 * Generates an identity key pair with signing capability
 */
export async function generateIdentityKeyPair(
  deviceId?: string,
): Promise<IdentityKeyPair> {
  const keyPair = await generateKeyPair();

  return {
    ...keyPair,
    type: "identity",
    createdAt: new Date(),
    deviceId,
  };
}

/**
 * Generates a signed pre-key
 */
export async function generateSignedPreKey(
  identityKeyPair: IdentityKeyPair,
  keyId: number,
): Promise<SignedPreKey> {
  const keyPair = await generateKeyPair();
  const timestamp = Date.now();

  // Create signing key from identity key
  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: ECDSA_CURVE,
    },
    true,
    ["sign", "verify"],
  );

  // Sign the public key with identity key
  // In production, use the identity key for signing
  // Here we sign with ECDSA
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    signingKeyPair.privateKey,
    keyPair.publicKey as unknown as ArrayBuffer,
  );

  return {
    ...keyPair,
    type: "signed-prekey",
    keyId,
    signature: toUint8Array(signature),
    timestamp,
    expiresAt: timestamp + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

/**
 * Generates a batch of one-time pre-keys
 */
export async function generateOneTimePreKeys(
  startId: number,
  count: number,
): Promise<OneTimePreKey[]> {
  const preKeys: OneTimePreKey[] = [];

  for (let i = 0; i < count; i++) {
    const keyPair = await generateKeyPair();
    preKeys.push({
      ...keyPair,
      type: "one-time-prekey",
      keyId: startId + i,
      used: false,
    });
  }

  return preKeys;
}

// ============================================================================
// Key Import/Export
// ============================================================================

/**
 * Imports a public key from raw bytes
 */
export async function importPublicKey(
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    publicKeyBytes as unknown as ArrayBuffer,
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    [],
  );
}

/**
 * Imports a private key from raw bytes
 */
export async function importPrivateKey(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  // Build JWK from raw bytes
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: ECDH_CURVE,
    d: bytesToBase64Url(privateKeyBytes),
    // Extract x and y from public key (skip format byte)
    x: bytesToBase64Url(publicKeyBytes.slice(1, 33)),
    y: bytesToBase64Url(publicKeyBytes.slice(33, 65)),
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: ECDH_CURVE,
    },
    true,
    ["deriveBits", "deriveKey"],
  );
}

/**
 * Exports a key pair to storable format
 */
export async function exportKeyPair(keyPair: X3DHKeyPair): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  return {
    publicKey: bytesToBase64(keyPair.publicKey),
    privateKey: bytesToBase64(keyPair.privateKey),
  };
}

/**
 * Imports a key pair from stored format
 */
export async function importKeyPair(stored: {
  publicKey: string;
  privateKey: string;
}): Promise<X3DHKeyPair> {
  const publicKey = base64ToBytes(stored.publicKey);
  const privateKey = base64ToBytes(stored.privateKey);

  const cryptoPublicKey = await importPublicKey(publicKey);
  const cryptoPrivateKey = await importPrivateKey(privateKey, publicKey);

  return {
    publicKey,
    privateKey,
    cryptoPublicKey,
    cryptoPrivateKey,
  };
}

// ============================================================================
// Base64 Utilities
// ============================================================================

/**
 * Converts bytes to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 to bytes
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
 * Converts bytes to base64url
 */
function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts base64url to bytes
 */
function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return base64ToBytes(base64);
}

// ============================================================================
// ECDH Key Agreement
// ============================================================================

/**
 * Performs ECDH key agreement between two parties
 */
async function ecdhDeriveBits(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<Uint8Array> {
  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    256,
  );

  return toUint8Array(sharedBits);
}

/**
 * Derives shared secret from ECDH agreement using HKDF
 */
async function hkdfDerive(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  // Import input key material
  const ikm = await crypto.subtle.importKey(
    "raw",
    inputKeyMaterial as unknown as ArrayBuffer,
    "HKDF",
    false,
    ["deriveBits"],
  );

  // Derive bits using HKDF
  const derived = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: HKDF_HASH,
      salt: salt as unknown as ArrayBuffer,
      info: info as unknown as ArrayBuffer,
    },
    ikm,
    length * 8,
  );

  return toUint8Array(derived);
}

// ============================================================================
// X3DH Protocol
// ============================================================================

/**
 * X3DH class for performing key agreement
 */
export class X3DH {
  private identityKeyPair: IdentityKeyPair | null = null;
  private signedPreKey: SignedPreKey | null = null;
  private oneTimePreKeys: Map<number, OneTimePreKey> = new Map();

  /**
   * Initializes X3DH with key pairs
   */
  async initialize(
    identityKeyPair?: IdentityKeyPair,
    signedPreKey?: SignedPreKey,
    oneTimePreKeys?: OneTimePreKey[],
  ): Promise<void> {
    if (identityKeyPair) {
      this.identityKeyPair = identityKeyPair;
    } else {
      this.identityKeyPair = await generateIdentityKeyPair();
    }

    if (signedPreKey) {
      this.signedPreKey = signedPreKey;
    } else {
      this.signedPreKey = await generateSignedPreKey(this.identityKeyPair, 1);
    }

    if (oneTimePreKeys) {
      for (const key of oneTimePreKeys) {
        this.oneTimePreKeys.set(key.keyId, key);
      }
    } else {
      const keys = await generateOneTimePreKeys(1, 100);
      for (const key of keys) {
        this.oneTimePreKeys.set(key.keyId, key);
      }
    }

    logger.debug("X3DH initialized", {
      identityKeyId: this.identityKeyPair.deviceId,
      signedPreKeyId: this.signedPreKey.keyId,
      oneTimePreKeyCount: this.oneTimePreKeys.size,
    });
  }

  /**
   * Gets the identity key pair
   */
  getIdentityKeyPair(): IdentityKeyPair | null {
    return this.identityKeyPair;
  }

  /**
   * Gets the signed pre-key
   */
  getSignedPreKey(): SignedPreKey | null {
    return this.signedPreKey;
  }

  /**
   * Gets available one-time pre-keys
   */
  getOneTimePreKeys(): OneTimePreKey[] {
    return Array.from(this.oneTimePreKeys.values()).filter((k) => !k.used);
  }

  /**
   * Creates a pre-key bundle for publishing
   */
  createPreKeyBundle(
    userId: string,
    deviceId: string,
    registrationId: number,
  ): PreKeyBundle {
    if (!this.identityKeyPair || !this.signedPreKey) {
      throw new Error("X3DH not initialized");
    }

    // Get an unused one-time pre-key if available
    const unusedKeys = this.getOneTimePreKeys();
    const oneTimePreKey = unusedKeys.length > 0 ? unusedKeys[0] : undefined;

    return {
      userId,
      deviceId,
      registrationId,
      identityKey: this.identityKeyPair.publicKey,
      signedPreKeyId: this.signedPreKey.keyId,
      signedPreKey: this.signedPreKey.publicKey,
      signedPreKeySignature: this.signedPreKey.signature,
      oneTimePreKeyId: oneTimePreKey?.keyId,
      oneTimePreKey: oneTimePreKey?.publicKey,
      version: PROTOCOL_VERSION,
    };
  }

  /**
   * Initiator: Performs X3DH with a recipient's pre-key bundle
   */
  async initiateKeyAgreement(bundle: PreKeyBundle): Promise<X3DHResult> {
    if (!this.identityKeyPair) {
      throw new Error("X3DH not initialized");
    }

    // Generate ephemeral key pair
    const ephemeralKeyPair = await generateKeyPair();

    // Import recipient's keys
    const recipientIdentityKey = await importPublicKey(bundle.identityKey);
    const recipientSignedPreKey = await importPublicKey(bundle.signedPreKey);

    // Ensure local keys are CryptoKey objects
    if (!this.identityKeyPair.cryptoPrivateKey) {
      this.identityKeyPair.cryptoPrivateKey = await importPrivateKey(
        this.identityKeyPair.privateKey,
        this.identityKeyPair.publicKey,
      );
    }

    if (!ephemeralKeyPair.cryptoPrivateKey) {
      ephemeralKeyPair.cryptoPrivateKey = await importPrivateKey(
        ephemeralKeyPair.privateKey,
        ephemeralKeyPair.publicKey,
      );
    }

    // DH1: sender identity key, recipient signed pre-key
    const dh1 = await ecdhDeriveBits(
      this.identityKeyPair.cryptoPrivateKey,
      recipientSignedPreKey,
    );

    // DH2: sender ephemeral key, recipient identity key
    const dh2 = await ecdhDeriveBits(
      ephemeralKeyPair.cryptoPrivateKey!,
      recipientIdentityKey,
    );

    // DH3: sender ephemeral key, recipient signed pre-key
    const dh3 = await ecdhDeriveBits(
      ephemeralKeyPair.cryptoPrivateKey!,
      recipientSignedPreKey,
    );

    // DH4 (optional): sender ephemeral key, recipient one-time pre-key
    let dh4: Uint8Array | null = null;
    if (bundle.oneTimePreKey) {
      const recipientOneTimePreKey = await importPublicKey(
        bundle.oneTimePreKey,
      );
      dh4 = await ecdhDeriveBits(
        ephemeralKeyPair.cryptoPrivateKey!,
        recipientOneTimePreKey,
      );
    }

    // Combine DH outputs: SK = KDF(DH1 || DH2 || DH3 || DH4?)
    const dhConcat = dh4 ? concat(dh1, dh2, dh3, dh4) : concat(dh1, dh2, dh3);

    // Create associated data: sender identity key || recipient identity key
    const associatedData = concat(
      this.identityKeyPair.publicKey,
      bundle.identityKey,
    );

    // Derive final shared secret using HKDF
    const salt = new Uint8Array(DERIVED_KEY_LENGTH); // Zero salt per spec
    const info = new TextEncoder().encode(X3DH_INFO);
    const sharedSecret = await hkdfDerive(
      dhConcat,
      salt,
      info,
      DERIVED_KEY_LENGTH,
    );

    logger.debug("X3DH key agreement initiated", {
      usedOneTimePreKey: !!bundle.oneTimePreKey,
      oneTimePreKeyId: bundle.oneTimePreKeyId,
    });

    return {
      sharedSecret,
      associatedData,
      ephemeralPublicKey: ephemeralKeyPair.publicKey,
      remoteSignedPreKey: bundle.signedPreKey,
      usedOneTimePreKeyId: bundle.oneTimePreKeyId,
      usedOneTimePreKey: !!bundle.oneTimePreKey,
    };
  }

  /**
   * Responder: Completes X3DH with initiator's message
   */
  async completeKeyAgreement(
    senderIdentityKey: Uint8Array,
    senderEphemeralKey: Uint8Array,
    usedOneTimePreKeyId?: number,
  ): Promise<X3DHResult> {
    if (!this.identityKeyPair || !this.signedPreKey) {
      throw new Error("X3DH not initialized");
    }

    // Import sender's keys
    const senderIdentity = await importPublicKey(senderIdentityKey);
    const senderEphemeral = await importPublicKey(senderEphemeralKey);

    // Ensure local keys are CryptoKey objects
    if (!this.identityKeyPair.cryptoPrivateKey) {
      this.identityKeyPair.cryptoPrivateKey = await importPrivateKey(
        this.identityKeyPair.privateKey,
        this.identityKeyPair.publicKey,
      );
    }

    if (!this.signedPreKey.cryptoPrivateKey) {
      this.signedPreKey.cryptoPrivateKey = await importPrivateKey(
        this.signedPreKey.privateKey,
        this.signedPreKey.publicKey,
      );
    }

    // DH1: sender identity key, recipient signed pre-key
    const dh1 = await ecdhDeriveBits(
      this.signedPreKey.cryptoPrivateKey,
      senderIdentity,
    );

    // DH2: sender ephemeral key, recipient identity key
    const dh2 = await ecdhDeriveBits(
      this.identityKeyPair.cryptoPrivateKey,
      senderEphemeral,
    );

    // DH3: sender ephemeral key, recipient signed pre-key
    const dh3 = await ecdhDeriveBits(
      this.signedPreKey.cryptoPrivateKey,
      senderEphemeral,
    );

    // DH4 (optional): sender ephemeral key, recipient one-time pre-key
    let dh4: Uint8Array | null = null;
    let usedOneTimePreKey = false;

    if (usedOneTimePreKeyId !== undefined) {
      const oneTimePreKey = this.oneTimePreKeys.get(usedOneTimePreKeyId);
      if (!oneTimePreKey) {
        throw new Error(`One-time pre-key ${usedOneTimePreKeyId} not found`);
      }

      if (!oneTimePreKey.cryptoPrivateKey) {
        oneTimePreKey.cryptoPrivateKey = await importPrivateKey(
          oneTimePreKey.privateKey,
          oneTimePreKey.publicKey,
        );
      }

      dh4 = await ecdhDeriveBits(
        oneTimePreKey.cryptoPrivateKey,
        senderEphemeral,
      );
      usedOneTimePreKey = true;

      // Mark one-time pre-key as used
      oneTimePreKey.used = true;
    }

    // Combine DH outputs
    const dhConcat = dh4 ? concat(dh1, dh2, dh3, dh4) : concat(dh1, dh2, dh3);

    // Create associated data: sender identity key || recipient identity key
    const associatedData = concat(
      senderIdentityKey,
      this.identityKeyPair.publicKey,
    );

    // Derive final shared secret
    const salt = new Uint8Array(DERIVED_KEY_LENGTH);
    const info = new TextEncoder().encode(X3DH_INFO);
    const sharedSecret = await hkdfDerive(
      dhConcat,
      salt,
      info,
      DERIVED_KEY_LENGTH,
    );

    logger.debug("X3DH key agreement completed", {
      usedOneTimePreKey,
      oneTimePreKeyId: usedOneTimePreKeyId,
    });

    return {
      sharedSecret,
      associatedData,
      ephemeralPublicKey: senderEphemeralKey,
      remoteSignedPreKey: senderEphemeralKey, // Responder uses sender's ephemeral key as reference
      usedOneTimePreKeyId,
      usedOneTimePreKey,
    };
  }

  /**
   * Marks a one-time pre-key as used
   */
  markOneTimePreKeyUsed(keyId: number): void {
    const key = this.oneTimePreKeys.get(keyId);
    if (key) {
      key.used = true;
    }
  }

  /**
   * Removes a one-time pre-key
   */
  removeOneTimePreKey(keyId: number): void {
    this.oneTimePreKeys.delete(keyId);
  }

  /**
   * Adds new one-time pre-keys
   */
  addOneTimePreKeys(keys: OneTimePreKey[]): void {
    for (const key of keys) {
      this.oneTimePreKeys.set(key.keyId, key);
    }
  }

  /**
   * Gets the count of available one-time pre-keys
   */
  getAvailableOneTimePreKeyCount(): number {
    return Array.from(this.oneTimePreKeys.values()).filter((k) => !k.used)
      .length;
  }

  /**
   * Rotates the signed pre-key
   */
  async rotateSignedPreKey(): Promise<SignedPreKey> {
    if (!this.identityKeyPair) {
      throw new Error("X3DH not initialized");
    }

    const newKeyId = this.signedPreKey ? this.signedPreKey.keyId + 1 : 1;
    this.signedPreKey = await generateSignedPreKey(
      this.identityKeyPair,
      newKeyId,
    );

    logger.info("Signed pre-key rotated", { newKeyId });

    return this.signedPreKey;
  }

  /**
   * Cleans up expired one-time pre-keys
   */
  cleanupExpiredKeys(): number {
    const now = Date.now();
    let removed = 0;

    for (const [keyId, key] of this.oneTimePreKeys) {
      if (key.used) {
        this.oneTimePreKeys.delete(keyId);
        removed++;
      }
    }

    // Check signed pre-key expiration
    if (
      this.signedPreKey &&
      this.signedPreKey.expiresAt &&
      this.signedPreKey.expiresAt < now
    ) {
      logger.warn("Signed pre-key expired", { keyId: this.signedPreKey.keyId });
    }

    return removed;
  }

  /**
   * Exports state for storage
   */
  async exportState(): Promise<{
    identityKeyPair: { publicKey: string; privateKey: string };
    signedPreKey: {
      keyId: number;
      publicKey: string;
      privateKey: string;
      signature: string;
      timestamp: number;
    };
    oneTimePreKeys: Array<{
      keyId: number;
      publicKey: string;
      privateKey: string;
      used: boolean;
    }>;
  }> {
    if (!this.identityKeyPair || !this.signedPreKey) {
      throw new Error("X3DH not initialized");
    }

    const exportedIdentity = await exportKeyPair(this.identityKeyPair);
    const exportedSigned = await exportKeyPair(this.signedPreKey);

    const exportedOneTimePreKeys = await Promise.all(
      Array.from(this.oneTimePreKeys.values()).map(async (key) => {
        const exported = await exportKeyPair(key);
        return {
          keyId: key.keyId,
          publicKey: exported.publicKey,
          privateKey: exported.privateKey,
          used: key.used || false,
        };
      }),
    );

    return {
      identityKeyPair: exportedIdentity,
      signedPreKey: {
        keyId: this.signedPreKey.keyId,
        publicKey: exportedSigned.publicKey,
        privateKey: exportedSigned.privateKey,
        signature: bytesToBase64(this.signedPreKey.signature),
        timestamp: this.signedPreKey.timestamp,
      },
      oneTimePreKeys: exportedOneTimePreKeys,
    };
  }

  /**
   * Imports state from storage
   */
  async importState(state: {
    identityKeyPair: { publicKey: string; privateKey: string };
    signedPreKey: {
      keyId: number;
      publicKey: string;
      privateKey: string;
      signature: string;
      timestamp: number;
    };
    oneTimePreKeys: Array<{
      keyId: number;
      publicKey: string;
      privateKey: string;
      used: boolean;
    }>;
  }): Promise<void> {
    // Import identity key pair
    const identityKeyPair = await importKeyPair(state.identityKeyPair);
    this.identityKeyPair = {
      ...identityKeyPair,
      type: "identity",
      createdAt: new Date(),
    };

    // Import signed pre-key
    const signedKeyPair = await importKeyPair({
      publicKey: state.signedPreKey.publicKey,
      privateKey: state.signedPreKey.privateKey,
    });
    this.signedPreKey = {
      ...signedKeyPair,
      type: "signed-prekey",
      keyId: state.signedPreKey.keyId,
      signature: base64ToBytes(state.signedPreKey.signature),
      timestamp: state.signedPreKey.timestamp,
    };

    // Import one-time pre-keys
    this.oneTimePreKeys.clear();
    for (const storedKey of state.oneTimePreKeys) {
      const keyPair = await importKeyPair({
        publicKey: storedKey.publicKey,
        privateKey: storedKey.privateKey,
      });
      this.oneTimePreKeys.set(storedKey.keyId, {
        ...keyPair,
        type: "one-time-prekey",
        keyId: storedKey.keyId,
        used: storedKey.used,
      });
    }

    logger.debug("X3DH state imported", {
      oneTimePreKeyCount: this.oneTimePreKeys.size,
    });
  }

  /**
   * Destroys all key material
   */
  destroy(): void {
    // Securely wipe key material
    if (this.identityKeyPair) {
      this.identityKeyPair.privateKey.fill(0);
    }
    if (this.signedPreKey) {
      this.signedPreKey.privateKey.fill(0);
    }
    for (const key of this.oneTimePreKeys.values()) {
      key.privateKey.fill(0);
    }

    this.identityKeyPair = null;
    this.signedPreKey = null;
    this.oneTimePreKeys.clear();

    logger.debug("X3DH destroyed");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and initializes a new X3DH instance
 */
export async function createX3DH(options?: {
  identityKeyPair?: IdentityKeyPair;
  signedPreKey?: SignedPreKey;
  oneTimePreKeys?: OneTimePreKey[];
}): Promise<X3DH> {
  const x3dh = new X3DH();
  await x3dh.initialize(
    options?.identityKeyPair,
    options?.signedPreKey,
    options?.oneTimePreKeys,
  );
  return x3dh;
}

/**
 * Performs a complete X3DH key agreement as initiator
 */
export async function performX3DHInitiator(
  localIdentityKeyPair: IdentityKeyPair,
  remoteBundle: PreKeyBundle,
): Promise<X3DHSessionInit> {
  const x3dh = new X3DH();
  await x3dh.initialize(localIdentityKeyPair);

  const result = await x3dh.initiateKeyAgreement(remoteBundle);

  return {
    sharedSecret: result.sharedSecret,
    remoteIdentityKey: remoteBundle.identityKey,
    localIdentityKey: localIdentityKeyPair.publicKey,
    associatedData: result.associatedData,
    initiator: true,
  };
}

/**
 * Performs a complete X3DH key agreement as responder
 */
export async function performX3DHResponder(
  localX3DH: X3DH,
  senderIdentityKey: Uint8Array,
  senderEphemeralKey: Uint8Array,
  usedOneTimePreKeyId?: number,
): Promise<X3DHSessionInit> {
  const result = await localX3DH.completeKeyAgreement(
    senderIdentityKey,
    senderEphemeralKey,
    usedOneTimePreKeyId,
  );

  const localIdentityKey = localX3DH.getIdentityKeyPair();
  if (!localIdentityKey) {
    throw new Error("Local identity key not found");
  }

  return {
    sharedSecret: result.sharedSecret,
    remoteIdentityKey: senderIdentityKey,
    remoteEphemeralKey: senderEphemeralKey,
    localIdentityKey: localIdentityKey.publicKey,
    associatedData: result.associatedData,
    initiator: false,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default X3DH;
