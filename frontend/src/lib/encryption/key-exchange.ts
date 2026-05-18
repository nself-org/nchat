/**
 * X3DH Key Exchange (Extended Triple Diffie-Hellman)
 *
 * Implements the Signal Protocol X3DH key agreement for establishing
 * initial shared secrets between two parties. X3DH provides forward
 * secrecy and cryptographic deniability.
 *
 * Protocol flow:
 * 1. Alice fetches Bob's prekey bundle (identity key, signed prekey, optional one-time prekey)
 * 2. Alice generates an ephemeral key pair
 * 3. Alice performs 3 or 4 DH calculations to derive a shared secret
 * 4. Alice sends an initial message with her identity key and ephemeral key
 * 5. Bob performs the same DH calculations to derive the same shared secret
 */

import type {
  IdentityKeyPair,
  PreKeyBundle,
  SignedPreKey,
  OneTimePreKey,
} from "@/types/encryption";
import {
  EncryptionError,
  EncryptionErrorType,
  PROTOCOL_CONSTANTS,
} from "@/types/encryption";
import {
  generateKeyPair,
  calculateSharedSecret,
  hkdfWithInfo,
  verify,
  concatUint8Arrays,
  uint8ArrayToHex,
  KeyPair,
} from "./crypto-primitives";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of X3DH key exchange from initiator's perspective
 */
export interface X3DHInitiatorResult {
  /** Shared secret derived from X3DH */
  sharedSecret: Uint8Array;
  /** Associated data for AEAD binding */
  associatedData: Uint8Array;
  /** Ephemeral key pair generated for this exchange */
  ephemeralKeyPair: KeyPair;
  /** Whether a one-time prekey was used */
  usedOneTimePreKey: boolean;
}

/**
 * Result of X3DH key exchange from responder's perspective
 */
export interface X3DHResponderResult {
  /** Shared secret derived from X3DH */
  sharedSecret: Uint8Array;
  /** Associated data for AEAD binding */
  associatedData: Uint8Array;
}

/**
 * Initial message sent after X3DH (prekey message)
 */
export interface X3DHInitialMessage {
  /** Sender's identity public key */
  identityKey: Uint8Array;
  /** Ephemeral public key generated for this exchange */
  ephemeralKey: Uint8Array;
  /** ID of the signed prekey used */
  signedPreKeyId: number;
  /** ID of the one-time prekey used (if any) */
  oneTimePreKeyId?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** F value for X3DH (32 bytes of 0xFF) - used when no one-time prekey is available */
const X3DH_F = new Uint8Array(32).fill(0xff);

/** Info string for X3DH key derivation */
const X3DH_INFO = "nchat_X3DH_v1";

// ============================================================================
// X3DH Implementation
// ============================================================================

/**
 * X3DH Key Exchange class
 *
 * Implements the X3DH protocol for establishing shared secrets.
 * This is used to initiate encrypted sessions between users.
 */
export class X3DH {
  /**
   * Performs X3DH as the initiator (Alice)
   *
   * Alice wants to send a message to Bob. She:
   * 1. Fetches Bob's prekey bundle from the server
   * 2. Verifies Bob's signed prekey signature
   * 3. Generates an ephemeral key pair
   * 4. Computes the shared secret using 3 or 4 DH operations
   *
   * @param aliceIdentity - Alice's identity key pair
   * @param bobPreKeyBundle - Bob's public prekey bundle from server
   * @returns X3DH result containing shared secret and associated data
   */
  static async initiatorCalculateSecret(
    aliceIdentity: IdentityKeyPair,
    bobPreKeyBundle: PreKeyBundle,
  ): Promise<X3DHInitiatorResult> {
    // Step 1: Verify Bob's signed prekey signature
    const signatureValid = await this.verifySignedPreKey(
      bobPreKeyBundle.identityKey,
      bobPreKeyBundle.signedPreKey.publicKey,
      bobPreKeyBundle.signedPreKey.signature,
    );

    if (!signatureValid) {
      throw new EncryptionError(
        EncryptionErrorType.INVALID_SIGNATURE,
        "Signed prekey signature verification failed",
      );
    }

    // Step 2: Generate ephemeral key pair
    const ephemeralKeyPair = await generateKeyPair();

    // Step 3: Compute DH values
    // DH1 = DH(IKa, SPKb) - Alice's identity with Bob's signed prekey
    const dh1 = await calculateSharedSecret(
      aliceIdentity.privateKey,
      aliceIdentity.publicKey,
      bobPreKeyBundle.signedPreKey.publicKey,
    );

    // DH2 = DH(EKa, IKb) - Alice's ephemeral with Bob's identity
    const dh2 = await calculateSharedSecret(
      ephemeralKeyPair.privateKey,
      ephemeralKeyPair.publicKey,
      bobPreKeyBundle.identityKey,
    );

    // DH3 = DH(EKa, SPKb) - Alice's ephemeral with Bob's signed prekey
    const dh3 = await calculateSharedSecret(
      ephemeralKeyPair.privateKey,
      ephemeralKeyPair.publicKey,
      bobPreKeyBundle.signedPreKey.publicKey,
    );

    // DH4 = DH(EKa, OPKb) - Alice's ephemeral with Bob's one-time prekey (if available)
    let dh4: Uint8Array | null = null;
    if (bobPreKeyBundle.oneTimePreKey) {
      dh4 = await calculateSharedSecret(
        ephemeralKeyPair.privateKey,
        ephemeralKeyPair.publicKey,
        bobPreKeyBundle.oneTimePreKey.publicKey,
      );
    }

    // Step 4: Concatenate DH outputs and derive shared secret
    // If no one-time prekey: SK = KDF(F || DH1 || DH2 || DH3)
    // With one-time prekey:  SK = KDF(F || DH1 || DH2 || DH3 || DH4)
    const dhConcat = dh4
      ? concatUint8Arrays(X3DH_F, dh1, dh2, dh3, dh4)
      : concatUint8Arrays(X3DH_F, dh1, dh2, dh3);

    const sharedSecret = await hkdfWithInfo(
      dhConcat,
      new Uint8Array(PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH), // Zero salt
      X3DH_INFO,
      PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH,
    );

    // Step 5: Calculate associated data (AD)
    // AD = Encode(IKa) || Encode(IKb)
    const associatedData = concatUint8Arrays(
      aliceIdentity.publicKey,
      bobPreKeyBundle.identityKey,
    );

    return {
      sharedSecret,
      associatedData,
      ephemeralKeyPair,
      usedOneTimePreKey: !!bobPreKeyBundle.oneTimePreKey,
    };
  }

  /**
   * Performs X3DH as the responder (Bob)
   *
   * Bob receives Alice's initial message and:
   * 1. Retrieves his own prekeys that Alice used
   * 2. Computes the same shared secret using 3 or 4 DH operations
   *
   * @param bobIdentity - Bob's identity key pair
   * @param bobSignedPreKey - Bob's signed prekey (matching the ID in Alice's message)
   * @param bobOneTimePreKey - Bob's one-time prekey (if Alice used one)
   * @param aliceIdentityKey - Alice's identity public key
   * @param aliceEphemeralKey - Alice's ephemeral public key
   * @returns X3DH result containing shared secret and associated data
   */
  static async responderCalculateSecret(
    bobIdentity: IdentityKeyPair,
    bobSignedPreKey: SignedPreKey,
    bobOneTimePreKey: OneTimePreKey | null,
    aliceIdentityKey: Uint8Array,
    aliceEphemeralKey: Uint8Array,
  ): Promise<X3DHResponderResult> {
    // Compute DH values (mirror of initiator)
    // DH1 = DH(SPKb, IKa) - Bob's signed prekey with Alice's identity
    const dh1 = await calculateSharedSecret(
      bobSignedPreKey.privateKey,
      bobSignedPreKey.publicKey,
      aliceIdentityKey,
    );

    // DH2 = DH(IKb, EKa) - Bob's identity with Alice's ephemeral
    const dh2 = await calculateSharedSecret(
      bobIdentity.privateKey,
      bobIdentity.publicKey,
      aliceEphemeralKey,
    );

    // DH3 = DH(SPKb, EKa) - Bob's signed prekey with Alice's ephemeral
    const dh3 = await calculateSharedSecret(
      bobSignedPreKey.privateKey,
      bobSignedPreKey.publicKey,
      aliceEphemeralKey,
    );

    // DH4 = DH(OPKb, EKa) - Bob's one-time prekey with Alice's ephemeral (if used)
    let dh4: Uint8Array | null = null;
    if (bobOneTimePreKey) {
      dh4 = await calculateSharedSecret(
        bobOneTimePreKey.privateKey,
        bobOneTimePreKey.publicKey,
        aliceEphemeralKey,
      );
    }

    // Concatenate DH outputs and derive shared secret
    const dhConcat = dh4
      ? concatUint8Arrays(X3DH_F, dh1, dh2, dh3, dh4)
      : concatUint8Arrays(X3DH_F, dh1, dh2, dh3);

    const sharedSecret = await hkdfWithInfo(
      dhConcat,
      new Uint8Array(PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH), // Zero salt
      X3DH_INFO,
      PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH,
    );

    // Calculate associated data (AD)
    // AD = Encode(IKa) || Encode(IKb)
    const associatedData = concatUint8Arrays(
      aliceIdentityKey,
      bobIdentity.publicKey,
    );

    return {
      sharedSecret,
      associatedData,
    };
  }

  /**
   * Verifies the signature on a signed prekey
   *
   * @param identityKey - The identity public key that signed the prekey
   * @param signedPreKeyPublic - The signed prekey's public key
   * @param signature - The signature to verify
   * @returns True if signature is valid
   */
  static async verifySignedPreKey(
    identityKey: Uint8Array,
    signedPreKeyPublic: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    return verify(identityKey, signature, signedPreKeyPublic);
  }

  /**
   * Derives initial root key and chain key from X3DH shared secret
   *
   * @param sharedSecret - The shared secret from X3DH
   * @returns Root key and chain key for Double Ratchet initialization
   */
  static async deriveInitialKeys(sharedSecret: Uint8Array): Promise<{
    rootKey: Uint8Array;
    chainKey: Uint8Array;
  }> {
    // Derive 64 bytes: first 32 for root key, second 32 for chain key
    const derived = await hkdfWithInfo(
      sharedSecret,
      new Uint8Array(32), // Zero salt
      PROTOCOL_CONSTANTS.HKDF_INFO.ROOT_KEY,
      64,
    );

    return {
      rootKey: derived.slice(0, 32),
      chainKey: derived.slice(32, 64),
    };
  }

  /**
   * Creates an initial message structure for the responder
   *
   * @param identityKey - Sender's identity public key
   * @param ephemeralKey - Ephemeral public key used in X3DH
   * @param signedPreKeyId - ID of the signed prekey used
   * @param oneTimePreKeyId - ID of the one-time prekey used (if any)
   * @returns Initial message structure
   */
  static createInitialMessage(
    identityKey: Uint8Array,
    ephemeralKey: Uint8Array,
    signedPreKeyId: number,
    oneTimePreKeyId?: number,
  ): X3DHInitialMessage {
    return {
      identityKey,
      ephemeralKey,
      signedPreKeyId,
      ...(oneTimePreKeyId !== undefined && { oneTimePreKeyId }),
    };
  }

  /**
   * Generates a fingerprint for an identity key
   * Used for visual verification between users
   *
   * @param identityKey - The identity public key
   * @returns Hex string fingerprint
   */
  static getKeyFingerprint(identityKey: Uint8Array): string {
    return uint8ArrayToHex(identityKey).toUpperCase();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Performs X3DH key exchange as initiator
 */
export async function performX3DHInitiator(
  identityKeyPair: IdentityKeyPair,
  preKeyBundle: PreKeyBundle,
): Promise<X3DHInitiatorResult> {
  return X3DH.initiatorCalculateSecret(identityKeyPair, preKeyBundle);
}

/**
 * Performs X3DH key exchange as responder
 */
export async function performX3DHResponder(
  identityKeyPair: IdentityKeyPair,
  signedPreKey: SignedPreKey,
  oneTimePreKey: OneTimePreKey | null,
  remoteIdentityKey: Uint8Array,
  remoteEphemeralKey: Uint8Array,
): Promise<X3DHResponderResult> {
  return X3DH.responderCalculateSecret(
    identityKeyPair,
    signedPreKey,
    oneTimePreKey,
    remoteIdentityKey,
    remoteEphemeralKey,
  );
}

/**
 * Verifies a signed prekey
 */
export async function verifySignedPreKeySignature(
  identityKey: Uint8Array,
  signedPreKeyPublic: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  return X3DH.verifySignedPreKey(identityKey, signedPreKeyPublic, signature);
}

/**
 * Derives initial keys from X3DH shared secret
 */
export async function deriveInitialKeysFromX3DH(
  sharedSecret: Uint8Array,
): Promise<{
  rootKey: Uint8Array;
  chainKey: Uint8Array;
}> {
  return X3DH.deriveInitialKeys(sharedSecret);
}
