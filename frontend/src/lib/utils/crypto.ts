/**
 * Crypto utilities for nself-chat
 * @module utils/crypto
 */

/**
 * Check if we're in a browser environment with Web Crypto
 */
const hasWebCrypto =
  typeof window !== "undefined" &&
  typeof window.crypto !== "undefined" &&
  typeof window.crypto.getRandomValues !== "undefined";

/**
 * Check if we have SubtleCrypto available
 */
const hasSubtleCrypto =
  hasWebCrypto && typeof window.crypto.subtle !== "undefined";

/**
 * Generate a cryptographically secure random ID
 * @param length - Length of the ID (default: 21, similar to nanoid)
 * @param alphabet - Character set to use (default: alphanumeric + symbols)
 * @returns Random ID string
 * @example
 * generateId() // 'V1StGXR8_Z5jdHi6B-myT'
 * generateId(10) // 'V1StGXR8_Z'
 * generateId(8, '0123456789') // '47382910'
 */
export function generateId(
  length: number = 21,
  alphabet: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",
): string {
  if (length <= 0) {
    return "";
  }

  const alphabetLength = alphabet.length;

  if (hasWebCrypto) {
    // Use Web Crypto for secure random generation
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    let id = "";
    for (let i = 0; i < length; i++) {
      id += alphabet[bytes[i] % alphabetLength];
    }
    return id;
  }

  // Fallback to Math.random (less secure, but works everywhere)
  let id = "";
  for (let i = 0; i < length; i++) {
    id += alphabet[Math.floor(Math.random() * alphabetLength)];
  }
  return id;
}

/**
 * Generate a UUID v4
 * @returns UUID string
 * @example
 * generateUUID() // '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUUID(): string {
  if (hasWebCrypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback implementation
  const bytes = new Uint8Array(16);

  if (hasWebCrypto) {
    crypto.getRandomValues(bytes);
  } else {
    // Math.random fallback
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate a short unique ID (useful for URLs)
 * @param length - Length of the ID (default: 8)
 * @returns Short ID string
 * @example
 * generateShortId() // 'x7Gh2k9P'
 */
export function generateShortId(length: number = 8): string {
  // Use a URL-safe alphabet (no special characters)
  return generateId(
    length,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  );
}

/**
 * Generate a numeric ID (useful for verification codes)
 * @param length - Length of the ID (default: 6)
 * @returns Numeric ID string
 * @example
 * generateNumericId() // '847293'
 */
export function generateNumericId(length: number = 6): string {
  return generateId(length, "0123456789");
}

/**
 * Generate a random string with specific character classes
 * @param length - Length of the string
 * @param options - Character class options
 * @returns Random string
 * @example
 * randomString(12, { uppercase: true, lowercase: true, numbers: true })
 */
export function randomString(
  length: number,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
    customAlphabet?: string;
  } = {},
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = false,
    customAlphabet = "",
  } = options;

  let alphabet = customAlphabet;

  if (uppercase) alphabet += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (lowercase) alphabet += "abcdefghijklmnopqrstuvwxyz";
  if (numbers) alphabet += "0123456789";
  if (symbols) alphabet += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (alphabet.length === 0) {
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  }

  return generateId(length, alphabet);
}

/**
 * Hash algorithm options
 */
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/**
 * Hash a string using Web Crypto API
 * @param str - String to hash
 * @param algorithm - Hash algorithm (default: 'SHA-256')
 * @returns Promise resolving to hex-encoded hash
 * @example
 * const hash = await hashString('hello world');
 * // 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
 */
export async function hashString(
  str: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  if (!hasSubtleCrypto) {
    // Fallback to a simple hash for non-crypto environments
    return simpleHash(str);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Simple non-cryptographic hash function (fallback)
 * @param str - String to hash
 * @returns Hash string
 */
export function simpleHash(str: string): string {
  let hash = 0;

  if (str.length === 0) {
    return hash.toString(16);
  }

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to positive hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generate a hash-based message authentication code (HMAC)
 * @param message - Message to authenticate
 * @param secret - Secret key
 * @param algorithm - Hash algorithm (default: 'SHA-256')
 * @returns Promise resolving to hex-encoded HMAC
 */
export async function generateHMAC(
  message: string,
  secret: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  if (!hasSubtleCrypto) {
    throw new Error("HMAC requires SubtleCrypto API");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));

  return signatureArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify an HMAC
 * @param message - Original message
 * @param secret - Secret key
 * @param signature - HMAC signature to verify
 * @param algorithm - Hash algorithm
 * @returns Promise resolving to whether signature is valid
 */
export async function verifyHMAC(
  message: string,
  secret: string,
  signature: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  const expectedSignature = await generateHMAC(message, secret, algorithm);
  return constantTimeCompare(signature, expectedSignature);
}

/**
 * Constant-time string comparison (prevents timing attacks)
 * @param a - First string
 * @param b - Second string
 * @returns Whether strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Encode a string to base64
 * @param str - String to encode
 * @returns Base64-encoded string
 */
export function base64Encode(str: string): string {
  if (typeof btoa === "function") {
    // Browser
    return btoa(unescape(encodeURIComponent(str)));
  }

  // Node.js fallback
  return Buffer.from(str, "utf-8").toString("base64");
}

/**
 * Decode a base64 string
 * @param base64 - Base64-encoded string
 * @returns Decoded string
 */
export function base64Decode(base64: string): string {
  if (typeof atob === "function") {
    // Browser
    return decodeURIComponent(escape(atob(base64)));
  }

  // Node.js fallback
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Encode a string to URL-safe base64
 * @param str - String to encode
 * @returns URL-safe base64-encoded string
 */
export function base64UrlEncode(str: string): string {
  return base64Encode(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode a URL-safe base64 string
 * @param base64url - URL-safe base64-encoded string
 * @returns Decoded string
 */
export function base64UrlDecode(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if necessary
  const padding = 4 - (base64.length % 4);
  if (padding !== 4) {
    base64 += "=".repeat(padding);
  }

  return base64Decode(base64);
}

/**
 * Convert ArrayBuffer to hex string
 * @param buffer - ArrayBuffer to convert
 * @returns Hex string
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to ArrayBuffer
 * @param hex - Hex string to convert
 * @returns ArrayBuffer
 */
export function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  return bytes.buffer;
}

/**
 * Generate a random bytes array
 * @param length - Number of bytes
 * @returns Uint8Array of random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  if (hasWebCrypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return bytes;
}

/**
 * Generate a secure token (URL-safe base64)
 * @param byteLength - Number of random bytes (default: 32)
 * @returns Secure token string
 */
export function generateSecureToken(byteLength: number = 32): string {
  const bytes = randomBytes(byteLength);
  const base64 = btoa(String.fromCharCode(...bytes));

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Hash a password (for client-side pre-hashing before sending to server)
 * Note: This is NOT a replacement for server-side password hashing
 * @param password - Password to hash
 * @param salt - Salt to use (optional, will be prepended)
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(
  password: string,
  salt?: string,
): Promise<string> {
  const saltedPassword = salt ? salt + password : password;
  return hashString(saltedPassword, "SHA-256");
}

/**
 * Create a fingerprint from multiple values
 * @param values - Values to include in fingerprint
 * @returns Promise resolving to fingerprint hash
 */
export async function createFingerprint(...values: string[]): Promise<string> {
  const combined = values.join("|");
  return hashString(combined, "SHA-256");
}

/**
 * Generate a slug ID (readable but unique)
 * @returns Slug-like ID
 * @example
 * generateSlugId() // 'happy-blue-cat-7x3k'
 */
export function generateSlugId(): string {
  const adjectives = [
    "happy",
    "quick",
    "bright",
    "calm",
    "cool",
    "warm",
    "fresh",
    "bold",
    "swift",
    "neat",
    "fair",
    "kind",
    "wise",
    "keen",
    "pure",
    "safe",
  ];

  const colors = [
    "red",
    "blue",
    "green",
    "gold",
    "pink",
    "teal",
    "cyan",
    "lime",
    "gray",
    "rose",
    "mint",
    "plum",
    "rust",
    "sage",
    "navy",
    "jade",
  ];

  const animals = [
    "cat",
    "dog",
    "fox",
    "owl",
    "bee",
    "ant",
    "bat",
    "elk",
    "emu",
    "jay",
    "koi",
    "lynx",
    "newt",
    "puma",
    "seal",
    "wolf",
  ];

  const randomPick = <T>(arr: T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  const adjective = randomPick(adjectives);
  const color = randomPick(colors);
  const animal = randomPick(animals);
  const suffix = generateId(4, "abcdefghijklmnopqrstuvwxyz0123456789");

  return `${adjective}-${color}-${animal}-${suffix}`;
}

/**
 * Check if Web Crypto is available
 * @returns Whether Web Crypto is available
 */
export function isCryptoAvailable(): boolean {
  return hasWebCrypto;
}

/**
 * Check if SubtleCrypto is available
 * @returns Whether SubtleCrypto is available
 */
export function isSubtleCryptoAvailable(): boolean {
  return hasSubtleCrypto;
}
