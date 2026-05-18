/**
 * Attachment Encryption Tests
 *
 * Comprehensive tests for file encryption/decryption functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  generateAttachmentKey,
  serializeAttachmentKey,
  deserializeAttachmentKey,
  validateAttachmentKey,
  wipeAttachmentKey,
  encryptAttachment,
  decryptAttachment,
  encryptSmallAttachment,
  decryptSmallAttachment,
  calculateEncryptedSize,
  shouldUseChunkedEncryption,
  validateEncryptedAttachment,
  extractHeader,
  type AttachmentKey,
  DEFAULT_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  ATTACHMENT_FORMAT_VERSION,
} from "../attachment-encryption";
import { generateRandomBytes } from "../crypto";

describe("Attachment Encryption", () => {
  // ==========================================================================
  // Key Generation Tests
  // ==========================================================================

  describe("generateAttachmentKey", () => {
    it("generates a key with correct structure", () => {
      const key = generateAttachmentKey();

      expect(key.key).toBeInstanceOf(Uint8Array);
      expect(key.key.length).toBe(32); // 256 bits
      expect(typeof key.keyId).toBe("string");
      expect(key.keyId.length).toBeGreaterThan(0);
      expect(key.keyHash).toBeInstanceOf(Uint8Array);
      expect(key.keyHash.length).toBe(32);
      expect(typeof key.createdAt).toBe("number");
    });

    it("generates unique keys each time", () => {
      const key1 = generateAttachmentKey();
      const key2 = generateAttachmentKey();

      expect(key1.key).not.toEqual(key2.key);
      expect(key1.keyId).not.toEqual(key2.keyId);
    });

    it("generates key with current timestamp", () => {
      const before = Date.now();
      const key = generateAttachmentKey();
      const after = Date.now();

      expect(key.createdAt).toBeGreaterThanOrEqual(before);
      expect(key.createdAt).toBeLessThanOrEqual(after);
    });

    it("generates key hash that matches key", () => {
      const key = generateAttachmentKey();
      expect(validateAttachmentKey(key)).toBe(true);
    });
  });

  // ==========================================================================
  // Key Serialization Tests
  // ==========================================================================

  describe("serializeAttachmentKey / deserializeAttachmentKey", () => {
    it("serializes and deserializes key correctly", () => {
      const original = generateAttachmentKey();
      const serialized = serializeAttachmentKey(original);
      const restored = deserializeAttachmentKey(serialized);

      expect(restored.key).toEqual(original.key);
      expect(restored.keyId).toEqual(original.keyId);
      expect(restored.keyHash).toEqual(original.keyHash);
      expect(restored.createdAt).toEqual(original.createdAt);
    });

    it("produces valid JSON", () => {
      const key = generateAttachmentKey();
      const serialized = serializeAttachmentKey(key);

      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("handles round-trip serialization", () => {
      const key = generateAttachmentKey();

      // Multiple round trips
      let current = key;
      for (let i = 0; i < 5; i++) {
        const serialized = serializeAttachmentKey(current);
        current = deserializeAttachmentKey(serialized);
      }

      expect(current.key).toEqual(key.key);
      expect(validateAttachmentKey(current)).toBe(true);
    });
  });

  // ==========================================================================
  // Key Validation Tests
  // ==========================================================================

  describe("validateAttachmentKey", () => {
    it("validates correct key", () => {
      const key = generateAttachmentKey();
      expect(validateAttachmentKey(key)).toBe(true);
    });

    it("rejects key with wrong length", () => {
      const key = generateAttachmentKey();
      const invalidKey: AttachmentKey = {
        ...key,
        key: new Uint8Array(16), // Wrong length
      };

      expect(validateAttachmentKey(invalidKey)).toBe(false);
    });

    it("rejects key with wrong hash", () => {
      const key = generateAttachmentKey();
      const invalidKey: AttachmentKey = {
        ...key,
        keyHash: generateRandomBytes(32), // Different hash
      };

      expect(validateAttachmentKey(invalidKey)).toBe(false);
    });

    it("rejects key with empty keyId", () => {
      const key = generateAttachmentKey();
      const invalidKey: AttachmentKey = {
        ...key,
        keyId: "",
      };

      expect(validateAttachmentKey(invalidKey)).toBe(false);
    });

    it("rejects key with short keyId", () => {
      const key = generateAttachmentKey();
      const invalidKey: AttachmentKey = {
        ...key,
        keyId: "abc",
      };

      expect(validateAttachmentKey(invalidKey)).toBe(false);
    });
  });

  // ==========================================================================
  // Key Wiping Tests
  // ==========================================================================

  describe("wipeAttachmentKey", () => {
    it("wipes key material", () => {
      const key = generateAttachmentKey();
      const originalKey = new Uint8Array(key.key);

      wipeAttachmentKey(key);

      // Key should be zeroed
      expect(key.key.every((b) => b === 0)).toBe(true);
      expect(key.keyHash.every((b) => b === 0)).toBe(true);
    });
  });

  // ==========================================================================
  // Small Attachment Encryption Tests
  // ==========================================================================

  describe("encryptSmallAttachment / decryptSmallAttachment", () => {
    it("encrypts and decrypts small file", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const key = generateAttachmentKey();

      const { encryptedData, plaintextHash } = await encryptSmallAttachment(
        plaintext,
        key,
      );
      const decrypted = await decryptSmallAttachment(encryptedData, key);

      expect(decrypted).toEqual(plaintext);
    });

    it("encrypted data is different from plaintext", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const key = generateAttachmentKey();

      const { encryptedData } = await encryptSmallAttachment(plaintext, key);

      expect(encryptedData).not.toEqual(plaintext);
      expect(encryptedData.length).toBeGreaterThan(plaintext.length); // IV + auth tag
    });

    it("produces different ciphertexts for same plaintext", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateAttachmentKey();

      const { encryptedData: enc1 } = await encryptSmallAttachment(
        plaintext,
        key,
      );
      const { encryptedData: enc2 } = await encryptSmallAttachment(
        plaintext,
        key,
      );

      expect(enc1).not.toEqual(enc2); // Different IVs
    });

    it("fails with wrong key", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key1 = generateAttachmentKey();
      const key2 = generateAttachmentKey();

      const { encryptedData } = await encryptSmallAttachment(plaintext, key1);

      await expect(
        decryptSmallAttachment(encryptedData, key2),
      ).rejects.toThrow();
    });

    it("handles empty file", async () => {
      const plaintext = new Uint8Array(0);
      const key = generateAttachmentKey();

      const { encryptedData } = await encryptSmallAttachment(plaintext, key);
      const decrypted = await decryptSmallAttachment(encryptedData, key);

      expect(decrypted.length).toBe(0);
    });

    it("handles various file sizes", async () => {
      const key = generateAttachmentKey();
      const sizes = [1, 16, 100, 1000, 4096];

      for (const size of sizes) {
        const plaintext = generateRandomBytes(size);
        const { encryptedData } = await encryptSmallAttachment(plaintext, key);
        const decrypted = await decryptSmallAttachment(encryptedData, key);

        expect(decrypted).toEqual(plaintext);
      }
    });

    it("generates auto key if not provided", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);

      const { attachmentKey, encryptedData } =
        await encryptSmallAttachment(plaintext);
      const decrypted = await decryptSmallAttachment(
        encryptedData,
        attachmentKey,
      );

      expect(decrypted).toEqual(plaintext);
      expect(validateAttachmentKey(attachmentKey)).toBe(true);
    });

    it("returns consistent plaintext hash", async () => {
      const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateAttachmentKey();

      const { plaintextHash: hash1 } = await encryptSmallAttachment(
        plaintext,
        key,
      );
      const { plaintextHash: hash2 } = await encryptSmallAttachment(
        plaintext,
        key,
      );

      expect(hash1).toEqual(hash2);
    });
  });

  // ==========================================================================
  // Chunked Attachment Encryption Tests
  // ==========================================================================

  describe("encryptAttachment / decryptAttachment", () => {
    it("encrypts and decrypts with chunking", async () => {
      // Create data that spans multiple chunks
      const plaintext = generateRandomBytes(5000);

      const result = await encryptAttachment(plaintext);

      const decrypted = await decryptAttachment(
        result.encryptedData,
        result.attachmentKey,
      );

      expect(decrypted.data).toEqual(plaintext);
    });

    it("uses correct chunk count based on chunk size", async () => {
      const dataSize = 5000;
      const plaintext = generateRandomBytes(dataSize);

      const result = await encryptAttachment(plaintext);

      // Chunk count depends on MIN_CHUNK_SIZE
      const expectedChunks = Math.ceil(dataSize / result.chunkSize);
      expect(result.chunkCount).toBe(expectedChunks);
    });

    it("handles single chunk file", async () => {
      const plaintext = generateRandomBytes(1000); // Small enough to be single chunk

      const result = await encryptAttachment(plaintext);

      expect(result.chunkCount).toBe(1);

      const decrypted = await decryptAttachment(
        result.encryptedData,
        result.attachmentKey,
      );
      expect(decrypted.data).toEqual(plaintext);
    });

    it("handles empty file", async () => {
      const plaintext = new Uint8Array(0);

      const result = await encryptAttachment(plaintext);
      expect(result.chunkCount).toBe(1); // At least one chunk

      const decrypted = await decryptAttachment(
        result.encryptedData,
        result.attachmentKey,
      );
      expect(decrypted.data.length).toBe(0);
    });

    it("reports progress during encryption", async () => {
      const plaintext = generateRandomBytes(5000);
      const progressUpdates: number[] = [];

      const result = await encryptAttachment(plaintext, {
        onProgress: (progress) => progressUpdates.push(progress),
      });

      // Should have progress updates equal to chunk count
      expect(progressUpdates.length).toBe(result.chunkCount);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("reports progress during decryption", async () => {
      const plaintext = generateRandomBytes(5000);
      const progressUpdates: number[] = [];

      const result = await encryptAttachment(plaintext);

      await decryptAttachment(result.encryptedData, result.attachmentKey, {
        onProgress: (progress) => progressUpdates.push(progress),
      });

      expect(progressUpdates.length).toBe(result.chunkCount);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("verifies plaintext hash on decryption", async () => {
      const plaintext = generateRandomBytes(3000);

      const result = await encryptAttachment(plaintext);

      const decrypted = await decryptAttachment(
        result.encryptedData,
        result.attachmentKey,
      );
      expect(decrypted.plaintextHash).toEqual(result.plaintextHash);
    });

    it("fails with corrupted data", async () => {
      const plaintext = generateRandomBytes(2000);

      const result = await encryptAttachment(plaintext);

      // Corrupt the encrypted data
      result.encryptedData[150] ^= 0xff;

      await expect(
        decryptAttachment(result.encryptedData, result.attachmentKey),
      ).rejects.toThrow();
    });

    it("fails with wrong key", async () => {
      const plaintext = generateRandomBytes(1000);
      const wrongKey = generateAttachmentKey();

      const result = await encryptAttachment(plaintext);

      await expect(
        decryptAttachment(result.encryptedData, wrongKey),
      ).rejects.toThrow();
    });

    it("enforces minimum chunk size", async () => {
      const plaintext = generateRandomBytes(1000);

      const result = await encryptAttachment(plaintext, {
        chunkSize: 100, // Too small - will be clamped to MIN_CHUNK_SIZE
      });

      // Should use MIN_CHUNK_SIZE instead
      expect(result.chunkSize).toBe(MIN_CHUNK_SIZE);
    });

    it("enforces maximum chunk size", async () => {
      const plaintext = generateRandomBytes(1000);

      const result = await encryptAttachment(plaintext, {
        chunkSize: MAX_CHUNK_SIZE * 2, // Too large
      });

      expect(result.chunkSize).toBe(MAX_CHUNK_SIZE);
    });

    it("stores correct original size", async () => {
      const plaintext = generateRandomBytes(5000);

      const result = await encryptAttachment(plaintext);

      expect(result.originalSize).toBe(5000);

      const decrypted = await decryptAttachment(
        result.encryptedData,
        result.attachmentKey,
      );
      expect(decrypted.originalSize).toBe(5000);
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe("calculateEncryptedSize", () => {
    it("calculates correct size for single chunk", () => {
      const plaintextSize = 1000;
      const chunkSize = DEFAULT_CHUNK_SIZE;

      const encryptedSize = calculateEncryptedSize(plaintextSize, chunkSize);

      // Header (100) + 1 chunk overhead (12 + 16) + plaintext
      expect(encryptedSize).toBe(100 + 28 + plaintextSize);
    });

    it("calculates correct size for multiple chunks", () => {
      const chunkSize = 1000;
      const plaintextSize = 2500; // 3 chunks

      const encryptedSize = calculateEncryptedSize(plaintextSize, chunkSize);

      // Header (100) + 3 chunk overheads (3 * 28) + plaintext
      expect(encryptedSize).toBe(100 + 3 * 28 + plaintextSize);
    });

    it("handles empty file", () => {
      const encryptedSize = calculateEncryptedSize(0);

      // Header + 1 chunk overhead (empty files still have 1 chunk)
      expect(encryptedSize).toBe(100 + 28 + 0);
    });
  });

  describe("shouldUseChunkedEncryption", () => {
    it("returns false for small files", () => {
      expect(shouldUseChunkedEncryption(1000)).toBe(false);
      expect(shouldUseChunkedEncryption(DEFAULT_CHUNK_SIZE - 1)).toBe(false);
      expect(shouldUseChunkedEncryption(DEFAULT_CHUNK_SIZE)).toBe(false);
    });

    it("returns true for large files", () => {
      expect(shouldUseChunkedEncryption(DEFAULT_CHUNK_SIZE + 1)).toBe(true);
      expect(shouldUseChunkedEncryption(DEFAULT_CHUNK_SIZE * 2)).toBe(true);
      expect(shouldUseChunkedEncryption(10 * 1024 * 1024)).toBe(true);
    });
  });

  describe("validateEncryptedAttachment", () => {
    it("validates correct encrypted attachment", async () => {
      const plaintext = generateRandomBytes(2000);

      const result = await encryptAttachment(plaintext);

      const validation = validateEncryptedAttachment(result.encryptedData);

      expect(validation.valid).toBe(true);
      expect(validation.header).toBeDefined();
      expect(validation.header?.originalSize).toBe(plaintext.length);
    });

    it("rejects too short data", () => {
      const data = new Uint8Array(50);

      const validation = validateEncryptedAttachment(data);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("too short");
    });

    it("rejects invalid magic bytes", () => {
      const data = new Uint8Array(200);
      data[0] = 0xff; // Wrong magic

      const validation = validateEncryptedAttachment(data);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("magic bytes");
    });

    it("rejects size mismatch", async () => {
      const plaintext = generateRandomBytes(1000);

      const result = await encryptAttachment(plaintext);

      // Truncate the data
      const truncated = result.encryptedData.slice(
        0,
        result.encryptedData.length - 100,
      );

      const validation = validateEncryptedAttachment(truncated);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Size mismatch");
    });
  });

  describe("extractHeader", () => {
    it("extracts header from encrypted attachment", async () => {
      const plaintext = generateRandomBytes(5000);

      const result = await encryptAttachment(plaintext);

      const header = extractHeader(result.encryptedData);

      expect(header.version).toBe(ATTACHMENT_FORMAT_VERSION);
      expect(header.originalSize).toBe(plaintext.length);
      expect(header.chunkSize).toBe(result.chunkSize);
      expect(header.plaintextHash).toEqual(result.plaintextHash);
    });

    it("throws for invalid data", () => {
      const data = new Uint8Array(50);

      expect(() => extractHeader(data)).toThrow();
    });
  });
});
