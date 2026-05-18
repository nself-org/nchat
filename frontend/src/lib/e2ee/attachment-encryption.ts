/**
 * Attachment Encryption Module
 *
 * Provides file encryption/decryption for E2EE attachments.
 * Uses AES-256-GCM for symmetric encryption with chunking support
 * for large files.
 *
 * Security features:
 * - Unique key per attachment
 * - Random IV per chunk
 * - Authenticated encryption (GCM)
 * - Secure key derivation
 * - Memory-safe chunk processing
 */

import {
  generateRandomBytes,
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  decodeEncryptedData,
  hash256,
  bytesToBase64,
  base64ToBytes,
  secureWipe,
  IV_LENGTH,
  KEY_LENGTH,
  AUTH_TAG_LENGTH,
} from "./crypto";

// ============================================================================
// Constants
// ============================================================================

/** Default chunk size for file encryption (1MB) */
export const DEFAULT_CHUNK_SIZE = 1024 * 1024;

/** Maximum chunk size (16MB) */
export const MAX_CHUNK_SIZE = 16 * 1024 * 1024;

/** Minimum chunk size (64KB) */
export const MIN_CHUNK_SIZE = 64 * 1024;

/** Version byte for encrypted attachment format */
export const ATTACHMENT_FORMAT_VERSION = 1;

/** Magic bytes for encrypted attachment identification */
export const ATTACHMENT_MAGIC_BYTES = new Uint8Array([0x4e, 0x43, 0x41, 0x54]); // "NCAT"

// ============================================================================
// Types
// ============================================================================

/**
 * Attachment encryption key with derivation info
 */
export interface AttachmentKey {
  /** The raw encryption key (32 bytes) */
  key: Uint8Array;
  /** Key ID for reference */
  keyId: string;
  /** Hash of the key for verification */
  keyHash: Uint8Array;
  /** Timestamp when key was generated */
  createdAt: number;
}

/**
 * Encrypted attachment result
 */
export interface EncryptedAttachment {
  /** Encrypted data (includes header and all chunks) */
  encryptedData: Uint8Array;
  /** Attachment key used for encryption */
  attachmentKey: AttachmentKey;
  /** Original file size in bytes */
  originalSize: number;
  /** Number of chunks */
  chunkCount: number;
  /** Chunk size used */
  chunkSize: number;
  /** SHA-256 hash of original plaintext */
  plaintextHash: string;
  /** SHA-256 hash of encrypted data */
  ciphertextHash: string;
}

/**
 * Decrypted attachment result
 */
export interface DecryptedAttachment {
  /** Decrypted file data */
  data: Uint8Array;
  /** Verified plaintext hash */
  plaintextHash: string;
  /** Original file size */
  originalSize: number;
}

/**
 * Attachment encryption options
 */
export interface AttachmentEncryptionOptions {
  /** Chunk size for large files (default: 1MB) */
  chunkSize?: number;
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
}

/**
 * Encrypted attachment header structure
 */
export interface AttachmentHeader {
  /** Format version */
  version: number;
  /** Original file size */
  originalSize: number;
  /** Chunk size used */
  chunkSize: number;
  /** Number of chunks */
  chunkCount: number;
  /** SHA-256 hash of plaintext (hex) */
  plaintextHash: string;
  /** Reserved for future use */
  reserved: Uint8Array;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generates a new attachment encryption key
 */
export function generateAttachmentKey(): AttachmentKey {
  const key = generateRandomBytes(KEY_LENGTH);
  const keyId = bytesToBase64(generateRandomBytes(12));
  const keyHash = hash256(key);
  const createdAt = Date.now();

  return {
    key,
    keyId,
    keyHash,
    createdAt,
  };
}

/**
 * Reconstructs an attachment key from serialized form
 */
export function deserializeAttachmentKey(serialized: string): AttachmentKey {
  const parsed = JSON.parse(serialized);

  return {
    key: base64ToBytes(parsed.key),
    keyId: parsed.keyId,
    keyHash: base64ToBytes(parsed.keyHash),
    createdAt: parsed.createdAt,
  };
}

/**
 * Serializes an attachment key for storage/transmission
 * Note: The key should be encrypted before transmission
 */
export function serializeAttachmentKey(attachmentKey: AttachmentKey): string {
  return JSON.stringify({
    key: bytesToBase64(attachmentKey.key),
    keyId: attachmentKey.keyId,
    keyHash: bytesToBase64(attachmentKey.keyHash),
    createdAt: attachmentKey.createdAt,
  });
}

/**
 * Validates an attachment key
 */
export function validateAttachmentKey(attachmentKey: AttachmentKey): boolean {
  // Check key length
  if (attachmentKey.key.length !== KEY_LENGTH) {
    return false;
  }

  // Check key ID format
  if (!attachmentKey.keyId || attachmentKey.keyId.length < 8) {
    return false;
  }

  // Verify key hash
  const computedHash = hash256(attachmentKey.key);
  if (computedHash.length !== attachmentKey.keyHash.length) {
    return false;
  }

  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== attachmentKey.keyHash[i]) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Header Operations
// ============================================================================

/**
 * Creates and encodes an attachment header
 */
function encodeHeader(header: AttachmentHeader): Uint8Array {
  // Header format:
  // - 4 bytes: magic bytes ("NCAT")
  // - 1 byte: version
  // - 8 bytes: original size (big-endian)
  // - 4 bytes: chunk size (big-endian)
  // - 4 bytes: chunk count (big-endian)
  // - 64 bytes: plaintext hash (hex string, padded)
  // - 15 bytes: reserved

  const headerSize = 100;
  const headerData = new Uint8Array(headerSize);
  let offset = 0;

  // Magic bytes
  headerData.set(ATTACHMENT_MAGIC_BYTES, offset);
  offset += 4;

  // Version
  headerData[offset] = header.version;
  offset += 1;

  // Original size (8 bytes, big-endian)
  const sizeView = new DataView(headerData.buffer, offset, 8);
  // Handle large files (split into two 32-bit writes for BigInt compatibility)
  const sizeBigInt = BigInt(header.originalSize);
  sizeView.setUint32(0, Number(sizeBigInt >> 32n));
  sizeView.setUint32(4, Number(sizeBigInt & 0xffffffffn));
  offset += 8;

  // Chunk size (4 bytes, big-endian)
  const chunkView = new DataView(headerData.buffer, offset, 4);
  chunkView.setUint32(0, header.chunkSize);
  offset += 4;

  // Chunk count (4 bytes, big-endian)
  const countView = new DataView(headerData.buffer, offset, 4);
  countView.setUint32(0, header.chunkCount);
  offset += 4;

  // Plaintext hash (64 bytes, hex string)
  const hashBytes = new TextEncoder().encode(
    header.plaintextHash.padEnd(64, "\0"),
  );
  headerData.set(hashBytes.slice(0, 64), offset);
  offset += 64;

  // Reserved (15 bytes)
  headerData.set(header.reserved.slice(0, 15), offset);

  return headerData;
}

/**
 * Decodes an attachment header
 */
function decodeHeader(headerData: Uint8Array): AttachmentHeader {
  if (headerData.length < 100) {
    throw new Error("Invalid header: too short");
  }

  let offset = 0;

  // Verify magic bytes
  for (let i = 0; i < ATTACHMENT_MAGIC_BYTES.length; i++) {
    if (headerData[offset + i] !== ATTACHMENT_MAGIC_BYTES[i]) {
      throw new Error("Invalid header: magic bytes mismatch");
    }
  }
  offset += 4;

  // Version
  const version = headerData[offset];
  if (version !== ATTACHMENT_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${version}`);
  }
  offset += 1;

  // Original size (8 bytes, big-endian)
  const sizeView = new DataView(
    headerData.buffer,
    headerData.byteOffset + offset,
    8,
  );
  const sizeHigh = BigInt(sizeView.getUint32(0));
  const sizeLow = BigInt(sizeView.getUint32(4));
  const originalSize = Number((sizeHigh << 32n) | sizeLow);
  offset += 8;

  // Chunk size (4 bytes, big-endian)
  const chunkView = new DataView(
    headerData.buffer,
    headerData.byteOffset + offset,
    4,
  );
  const chunkSize = chunkView.getUint32(0);
  offset += 4;

  // Chunk count (4 bytes, big-endian)
  const countView = new DataView(
    headerData.buffer,
    headerData.byteOffset + offset,
    4,
  );
  const chunkCount = countView.getUint32(0);
  offset += 4;

  // Plaintext hash (64 bytes)
  const hashBytes = headerData.slice(offset, offset + 64);
  const plaintextHash = new TextDecoder().decode(hashBytes).replace(/\0+$/, "");
  offset += 64;

  // Reserved (15 bytes)
  const reserved = headerData.slice(offset, offset + 15);

  return {
    version,
    originalSize,
    chunkSize,
    chunkCount,
    plaintextHash,
    reserved,
  };
}

// ============================================================================
// Encryption Operations
// ============================================================================

/**
 * Encrypts a file/attachment with chunking support
 *
 * @param data - The file data to encrypt
 * @param options - Encryption options
 * @returns Encrypted attachment with key and metadata
 */
export async function encryptAttachment(
  data: Uint8Array,
  options: AttachmentEncryptionOptions = {},
): Promise<EncryptedAttachment> {
  const chunkSize = Math.min(
    Math.max(options.chunkSize ?? DEFAULT_CHUNK_SIZE, MIN_CHUNK_SIZE),
    MAX_CHUNK_SIZE,
  );

  // Generate attachment key
  const attachmentKey = generateAttachmentKey();

  // Calculate plaintext hash
  const plaintextHashBytes = hash256(data);
  const plaintextHash = bytesToBase64(plaintextHashBytes);

  // Calculate number of chunks
  const chunkCount = Math.ceil(data.length / chunkSize) || 1; // At least 1 chunk for empty files

  // Create header
  const header: AttachmentHeader = {
    version: ATTACHMENT_FORMAT_VERSION,
    originalSize: data.length,
    chunkSize,
    chunkCount,
    plaintextHash,
    reserved: new Uint8Array(15),
  };

  const encodedHeader = encodeHeader(header);

  // Calculate encrypted chunk sizes
  // Each chunk: IV (12 bytes) + ciphertext (data + 16 byte auth tag)
  const encryptedChunkOverhead = IV_LENGTH + AUTH_TAG_LENGTH;
  const totalEncryptedSize =
    encodedHeader.length + chunkCount * encryptedChunkOverhead + data.length;

  // Allocate output buffer
  const encryptedData = new Uint8Array(totalEncryptedSize);

  // Write header
  encryptedData.set(encodedHeader, 0);
  let writeOffset = encodedHeader.length;

  // Encrypt each chunk
  for (let i = 0; i < chunkCount; i++) {
    const chunkStart = i * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, data.length);
    const chunk = data.slice(chunkStart, chunkEnd);

    // Encrypt chunk
    const { ciphertext, iv } = await encryptAESGCM(chunk, attachmentKey.key);

    // Write IV + ciphertext
    encryptedData.set(iv, writeOffset);
    writeOffset += iv.length;
    encryptedData.set(ciphertext, writeOffset);
    writeOffset += ciphertext.length;

    // Report progress
    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / chunkCount) * 100));
    }
  }

  // Calculate ciphertext hash
  const ciphertextHashBytes = hash256(encryptedData);
  const ciphertextHash = bytesToBase64(ciphertextHashBytes);

  return {
    encryptedData,
    attachmentKey,
    originalSize: data.length,
    chunkCount,
    chunkSize,
    plaintextHash,
    ciphertextHash,
  };
}

/**
 * Decrypts an encrypted attachment
 *
 * @param encryptedData - The encrypted attachment data
 * @param attachmentKey - The attachment encryption key
 * @param options - Decryption options (for progress reporting)
 * @returns Decrypted attachment data
 */
export async function decryptAttachment(
  encryptedData: Uint8Array,
  attachmentKey: AttachmentKey,
  options: { onProgress?: (progress: number) => void } = {},
): Promise<DecryptedAttachment> {
  // Validate key
  if (!validateAttachmentKey(attachmentKey)) {
    throw new Error("Invalid attachment key");
  }

  // Decode header
  const header = decodeHeader(encryptedData);

  // Allocate output buffer
  const decryptedData = new Uint8Array(header.originalSize);

  // Calculate read positions
  let readOffset = 100; // Header size
  let writeOffset = 0;

  // Decrypt each chunk
  for (let i = 0; i < header.chunkCount; i++) {
    // Read IV
    const iv = encryptedData.slice(readOffset, readOffset + IV_LENGTH);
    readOffset += IV_LENGTH;

    // Calculate expected plaintext size for this chunk
    const remainingData = header.originalSize - writeOffset;
    const expectedChunkSize = Math.min(header.chunkSize, remainingData);

    // Read ciphertext (plaintext size + auth tag)
    const ciphertextSize = expectedChunkSize + AUTH_TAG_LENGTH;
    const ciphertext = encryptedData.slice(
      readOffset,
      readOffset + ciphertextSize,
    );
    readOffset += ciphertextSize;

    // Decrypt chunk
    const plaintext = await decryptAESGCM(ciphertext, attachmentKey.key, iv);

    // Write to output
    decryptedData.set(plaintext, writeOffset);
    writeOffset += plaintext.length;

    // Report progress
    if (options.onProgress) {
      options.onProgress(Math.round(((i + 1) / header.chunkCount) * 100));
    }
  }

  // Verify plaintext hash
  const computedHashBytes = hash256(decryptedData);
  const computedHash = bytesToBase64(computedHashBytes);

  if (computedHash !== header.plaintextHash) {
    throw new Error(
      "Plaintext hash verification failed: data may be corrupted",
    );
  }

  return {
    data: decryptedData,
    plaintextHash: header.plaintextHash,
    originalSize: header.originalSize,
  };
}

// ============================================================================
// Single-Shot Encryption (for small files)
// ============================================================================

/**
 * Simple encryption for small files (< 1MB)
 * Uses a single encryption operation without chunking
 */
export async function encryptSmallAttachment(
  data: Uint8Array,
  attachmentKey?: AttachmentKey,
): Promise<{
  encryptedData: Uint8Array;
  attachmentKey: AttachmentKey;
  plaintextHash: string;
}> {
  const key = attachmentKey ?? generateAttachmentKey();

  // Calculate plaintext hash
  const plaintextHashBytes = hash256(data);
  const plaintextHash = bytesToBase64(plaintextHashBytes);

  // Encrypt
  const { ciphertext, iv } = await encryptAESGCM(data, key.key);

  // Encode with IV prefix
  const encryptedData = encodeEncryptedData(ciphertext, iv);

  return {
    encryptedData,
    attachmentKey: key,
    plaintextHash,
  };
}

/**
 * Simple decryption for small files
 */
export async function decryptSmallAttachment(
  encryptedData: Uint8Array,
  attachmentKey: AttachmentKey,
): Promise<Uint8Array> {
  // Validate key
  if (!validateAttachmentKey(attachmentKey)) {
    throw new Error("Invalid attachment key");
  }

  // Decode IV and ciphertext
  const { ciphertext, iv } = decodeEncryptedData(encryptedData);

  // Decrypt
  return decryptAESGCM(ciphertext, attachmentKey.key, iv);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates the encrypted size for a given plaintext size
 */
export function calculateEncryptedSize(
  plaintextSize: number,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): number {
  const chunkCount = Math.ceil(plaintextSize / chunkSize) || 1;
  const headerSize = 100;
  const chunkOverhead = IV_LENGTH + AUTH_TAG_LENGTH;

  return headerSize + chunkCount * chunkOverhead + plaintextSize;
}

/**
 * Determines if a file should use chunked encryption
 */
export function shouldUseChunkedEncryption(fileSize: number): boolean {
  return fileSize > DEFAULT_CHUNK_SIZE;
}

/**
 * Securely wipes an attachment key from memory
 */
export function wipeAttachmentKey(attachmentKey: AttachmentKey): void {
  secureWipe(attachmentKey.key);
  secureWipe(attachmentKey.keyHash);
}

/**
 * Validates encrypted attachment structure without decrypting
 */
export function validateEncryptedAttachment(encryptedData: Uint8Array): {
  valid: boolean;
  error?: string;
  header?: AttachmentHeader;
} {
  try {
    if (encryptedData.length < 100) {
      return { valid: false, error: "Data too short for header" };
    }

    const header = decodeHeader(encryptedData);

    // Validate header values
    if (header.originalSize < 0) {
      return { valid: false, error: "Invalid original size" };
    }

    if (
      header.chunkSize < MIN_CHUNK_SIZE ||
      header.chunkSize > MAX_CHUNK_SIZE
    ) {
      return { valid: false, error: "Invalid chunk size" };
    }

    if (header.chunkCount < 1) {
      return { valid: false, error: "Invalid chunk count" };
    }

    // Calculate expected encrypted size
    const expectedSize = calculateEncryptedSize(
      header.originalSize,
      header.chunkSize,
    );
    if (encryptedData.length !== expectedSize) {
      return {
        valid: false,
        error: `Size mismatch: expected ${expectedSize}, got ${encryptedData.length}`,
      };
    }

    return { valid: true, header };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extracts header from encrypted attachment without decrypting
 */
export function extractHeader(encryptedData: Uint8Array): AttachmentHeader {
  return decodeHeader(encryptedData);
}

// ============================================================================
// Exports
// ============================================================================

export const attachmentEncryption = {
  // Key operations
  generateAttachmentKey,
  deserializeAttachmentKey,
  serializeAttachmentKey,
  validateAttachmentKey,
  wipeAttachmentKey,

  // Chunked encryption
  encryptAttachment,
  decryptAttachment,

  // Simple encryption
  encryptSmallAttachment,
  decryptSmallAttachment,

  // Utilities
  calculateEncryptedSize,
  shouldUseChunkedEncryption,
  validateEncryptedAttachment,
  extractHeader,
};

export default attachmentEncryption;
