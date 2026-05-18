/**
 * Cryptographic Primitives for Signal Protocol
 *
 * Low-level cryptographic operations using Web Crypto API.
 * Implements X25519 key exchange, Ed25519 signing (via ECDSA P-256 fallback),
 * AES-256-GCM encryption, and HKDF key derivation.
 *
 * IMPORTANT: This uses Web Crypto API which is available in all modern browsers.
 * For X25519/Ed25519, we use ECDH/ECDSA with P-256 as a secure fallback
 * since native X25519 support varies by browser.
 */

import { PROTOCOL_CONSTANTS } from "@/types/encryption";

// ============================================================================
// Type Definitions
// ============================================================================

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface DerivedKeys {
  rootKey: Uint8Array;
  chainKey: Uint8Array;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts ArrayBuffer to Uint8Array
 */
export function bufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Converts Uint8Array to ArrayBuffer
 * This ensures we get a proper ArrayBuffer, not ArrayBufferLike
 */
export function uint8ArrayToBuffer(array: Uint8Array): ArrayBuffer {
  // Use slice to create a new ArrayBuffer from the Uint8Array's underlying buffer
  // This handles cases where the Uint8Array might be a view into a larger buffer
  return (array.buffer as ArrayBuffer).slice(
    array.byteOffset,
    array.byteOffset + array.byteLength,
  );
}

/**
 * Helper to convert Uint8Array to BufferSource for Web Crypto API
 * Web Crypto APIs expect BufferSource which is ArrayBuffer | ArrayBufferView
 * But TypeScript's Uint8Array<ArrayBufferLike> doesn't match ArrayBufferView<ArrayBuffer>
 */
function toBufferSource(array: Uint8Array): ArrayBuffer {
  return uint8ArrayToBuffer(array);
}

/**
 * Converts Uint8Array to hex string
 */
export function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array to base64 string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates cryptographically secure random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Concatenates multiple Uint8Arrays
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generates an ECDH key pair for key exchange (using P-256)
 * Note: We use P-256 as it has broader Web Crypto support than X25519
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey,
  );
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  // Store the JWK d parameter as the private key bytes
  const privateKeyBase64Url = privateKeyJwk.d!;
  const privateKeyBase64 = privateKeyBase64Url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const privateKey = base64ToUint8Array(privateKeyBase64);

  return {
    publicKey: bufferToUint8Array(publicKeyBuffer),
    privateKey: privateKey,
  };
}

/**
 * Generates an ECDSA key pair for signing (using P-256)
 */
export async function generateSigningKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"],
  );

  const publicKeyBuffer = await crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey,
  );
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  const privateKeyBase64Url = privateKeyJwk.d!;
  const privateKeyBase64 = privateKeyBase64Url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const privateKey = base64ToUint8Array(privateKeyBase64);

  return {
    publicKey: bufferToUint8Array(publicKeyBuffer),
    privateKey: privateKey,
  };
}

/**
 * Generates a random registration ID (31-bit unsigned integer)
 */
export function generateRegistrationId(): number {
  const bytes = randomBytes(4);
  const view = new DataView(bytes.buffer);
  return view.getUint32(0, false) >>> 1; // 31-bit
}

// ============================================================================
// Key Import/Export
// ============================================================================

/**
 * Imports a raw public key for ECDH
 */
export async function importPublicKey(
  publicKey: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(publicKey),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

/**
 * Imports a private key for ECDH from raw bytes
 */
export async function importPrivateKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Promise<CryptoKey> {
  // Convert to base64url for JWK
  const dBase64 = uint8ArrayToBase64(privateKey)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Extract x and y coordinates from uncompressed public key (format: 04 || x || y)
  const x = publicKey.slice(1, 33);
  const y = publicKey.slice(33, 65);
  const xBase64 = uint8ArrayToBase64(x)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const yBase64 = uint8ArrayToBase64(y)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: xBase64,
    y: yBase64,
    d: dBase64,
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}

/**
 * Imports a raw public key for ECDSA verification
 */
export async function importSigningPublicKey(
  publicKey: Uint8Array,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(publicKey),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"],
  );
}

/**
 * Imports a private key for ECDSA signing
 */
export async function importSigningPrivateKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Promise<CryptoKey> {
  const dBase64 = uint8ArrayToBase64(privateKey)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const x = publicKey.slice(1, 33);
  const y = publicKey.slice(33, 65);
  const xBase64 = uint8ArrayToBase64(x)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const yBase64 = uint8ArrayToBase64(y)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: xBase64,
    y: yBase64,
    d: dBase64,
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );
}

// ============================================================================
// Diffie-Hellman Key Agreement
// ============================================================================

/**
 * Performs ECDH key agreement
 */
export async function calculateAgreement(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<Uint8Array> {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  return bufferToUint8Array(sharedBits);
}

/**
 * Calculates shared secret from raw keys
 */
export async function calculateSharedSecret(
  privateKey: Uint8Array,
  privateKeyPublic: Uint8Array,
  peerPublicKey: Uint8Array,
): Promise<Uint8Array> {
  const privKey = await importPrivateKey(privateKey, privateKeyPublic);
  const pubKey = await importPublicKey(peerPublicKey);
  return calculateAgreement(privKey, pubKey);
}

// ============================================================================
// Signing and Verification
// ============================================================================

/**
 * Signs data with ECDSA
 */
export async function sign(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const signingKey = await importSigningPrivateKey(privateKey, publicKey);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    toBufferSource(data),
  );
  return bufferToUint8Array(signature);
}

/**
 * Verifies ECDSA signature
 */
export async function verify(
  publicKey: Uint8Array,
  signature: Uint8Array,
  data: Uint8Array,
): Promise<boolean> {
  try {
    const verifyKey = await importSigningPublicKey(publicKey);
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      toBufferSource(signature),
      toBufferSource(data),
    );
  } catch {
    return false;
  }
}

// ============================================================================
// HKDF Key Derivation
// ============================================================================

/**
 * HKDF-SHA256 key derivation
 */
export async function hkdf(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number = PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH,
): Promise<Uint8Array> {
  // Import IKM as raw key material
  const ikm = await crypto.subtle.importKey(
    "raw",
    toBufferSource(inputKeyMaterial),
    "HKDF",
    false,
    ["deriveBits"],
  );

  // Derive bits using HKDF
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: toBufferSource(salt),
      info: toBufferSource(info),
    },
    ikm,
    length * 8,
  );

  return bufferToUint8Array(derivedBits);
}

/**
 * HKDF with string info parameter
 */
export async function hkdfWithInfo(
  inputKeyMaterial: Uint8Array,
  salt: Uint8Array,
  info: string,
  length: number = PROTOCOL_CONSTANTS.HKDF_OUTPUT_LENGTH,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  return hkdf(inputKeyMaterial, salt, encoder.encode(info), length);
}

/**
 * Derives root key and chain key from shared secret
 */
export async function deriveRootAndChainKeys(
  sharedSecret: Uint8Array,
  salt: Uint8Array = new Uint8Array(32),
): Promise<DerivedKeys> {
  const derived = await hkdfWithInfo(
    sharedSecret,
    salt,
    PROTOCOL_CONSTANTS.HKDF_INFO.ROOT_KEY,
    64,
  );

  return {
    rootKey: derived.slice(0, 32),
    chainKey: derived.slice(32, 64),
  };
}

// ============================================================================
// AES-256-GCM Encryption
// ============================================================================

/**
 * Imports a raw AES key
 */
export async function importAesKey(key: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBufferSource(key),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts data with AES-256-GCM
 */
export async function aesEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  associatedData?: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const aesKey = await importAesKey(key);
  const iv = randomBytes(PROTOCOL_CONSTANTS.AES_IV_LENGTH);

  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: toBufferSource(iv),
    tagLength: PROTOCOL_CONSTANTS.AES_TAG_LENGTH * 8,
  };

  if (associatedData) {
    algorithm.additionalData = toBufferSource(associatedData);
  }

  const ciphertext = await crypto.subtle.encrypt(
    algorithm,
    aesKey,
    toBufferSource(plaintext),
  );

  return {
    ciphertext: bufferToUint8Array(ciphertext),
    iv: iv,
  };
}

/**
 * Decrypts data with AES-256-GCM
 */
export async function aesDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  associatedData?: Uint8Array,
): Promise<Uint8Array> {
  const aesKey = await importAesKey(key);

  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: toBufferSource(iv),
    tagLength: PROTOCOL_CONSTANTS.AES_TAG_LENGTH * 8,
  };

  if (associatedData) {
    algorithm.additionalData = toBufferSource(associatedData);
  }

  const plaintext = await crypto.subtle.decrypt(
    algorithm,
    aesKey,
    toBufferSource(ciphertext),
  );

  return bufferToUint8Array(plaintext);
}

// ============================================================================
// HMAC
// ============================================================================

/**
 * Computes HMAC-SHA256
 */
export async function hmacSha256(
  key: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    toBufferSource(data),
  );
  return bufferToUint8Array(signature);
}

/**
 * Verifies HMAC-SHA256
 */
export async function verifyHmacSha256(
  key: Uint8Array,
  signature: Uint8Array,
  data: Uint8Array,
): Promise<boolean> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    "HMAC",
    cryptoKey,
    toBufferSource(signature),
    toBufferSource(data),
  );
}

// ============================================================================
// SHA-256 Hash
// ============================================================================

/**
 * Computes SHA-256 hash
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", toBufferSource(data));
  return bufferToUint8Array(hash);
}

/**
 * Computes SHA-512 hash
 */
export async function sha512(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-512", toBufferSource(data));
  return bufferToUint8Array(hash);
}

// ============================================================================
// Key Fingerprinting
// ============================================================================

/**
 * Generates a fingerprint for a public key
 */
export async function getKeyFingerprint(
  publicKey: Uint8Array,
): Promise<Uint8Array> {
  return sha256(publicKey);
}

/**
 * Formats fingerprint as hex string with spaces
 */
export function formatFingerprint(fingerprint: Uint8Array): string {
  return uint8ArrayToHex(fingerprint)
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join(" ");
}
