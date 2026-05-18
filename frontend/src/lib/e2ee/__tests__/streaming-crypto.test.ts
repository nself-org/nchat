/**
 * Streaming Crypto Tests
 *
 * Comprehensive tests for streaming encryption/decryption functionality.
 * Note: These tests require Web Streams API which may not be available in all environments.
 */

import { describe, it, expect, beforeAll } from "@jest/globals";
import {
  createEncryptionStream,
  createDecryptionStream,
  createChunkedStream,
  collectStream,
  calculateStreamEncryptedSize,
  STREAMING_CHUNK_SIZE,
} from "../streaming-crypto";
import { generateRandomBytes } from "../crypto";
import {
  generateAttachmentKey,
  MIN_CHUNK_SIZE,
} from "../attachment-encryption";

// Check if ReadableStream is available
const hasStreamsAPI = typeof ReadableStream !== "undefined";

// Skip streaming tests if ReadableStream is not available
const describeIfStreams = hasStreamsAPI ? describe : describe.skip;

describe("Streaming Crypto", () => {
  // ==========================================================================
  // Utility Function Tests (no streams needed)
  // ==========================================================================

  describe("calculateStreamEncryptedSize", () => {
    it("calculates size for single chunk", () => {
      const plaintextSize = 1000;
      const chunkSize = STREAMING_CHUNK_SIZE;

      const encryptedSize = calculateStreamEncryptedSize(
        plaintextSize,
        chunkSize,
      );

      // 1 chunk with IV (12) + auth tag (16) = 28 overhead
      expect(encryptedSize).toBe(plaintextSize + 28);
    });

    it("calculates size for multiple chunks", () => {
      const plaintextSize = STREAMING_CHUNK_SIZE * 3;
      const chunkSize = STREAMING_CHUNK_SIZE;

      const encryptedSize = calculateStreamEncryptedSize(
        plaintextSize,
        chunkSize,
      );

      // 3 chunks with 28 bytes overhead each
      expect(encryptedSize).toBe(plaintextSize + 3 * 28);
    });

    it("calculates size for partial last chunk", () => {
      const plaintextSize = STREAMING_CHUNK_SIZE + 100;
      const chunkSize = STREAMING_CHUNK_SIZE;

      const encryptedSize = calculateStreamEncryptedSize(
        plaintextSize,
        chunkSize,
      );

      // 2 chunks with 28 bytes overhead each
      expect(encryptedSize).toBe(plaintextSize + 2 * 28);
    });

    it("handles empty input", () => {
      const encryptedSize = calculateStreamEncryptedSize(0);

      // At least 1 chunk overhead
      expect(encryptedSize).toBe(28);
    });
  });

  describeIfStreams("createChunkedStream", () => {
    it("creates stream with correct chunks", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const chunkSize = 3;

      const stream = createChunkedStream(data, chunkSize);
      const chunks: Uint8Array[] = [];

      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.length).toBe(4); // 3+3+3+1
      expect(chunks[0]).toEqual(new Uint8Array([1, 2, 3]));
      expect(chunks[1]).toEqual(new Uint8Array([4, 5, 6]));
      expect(chunks[2]).toEqual(new Uint8Array([7, 8, 9]));
      expect(chunks[3]).toEqual(new Uint8Array([10]));
    });

    it("handles empty data", async () => {
      const data = new Uint8Array(0);
      const stream = createChunkedStream(data, 10);

      const collected = await collectStream(stream);
      expect(collected.length).toBe(0);
    });

    it("handles data smaller than chunk size", async () => {
      const data = new Uint8Array([1, 2, 3]);
      const stream = createChunkedStream(data, 10);

      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toEqual(data);
    });
  });

  describeIfStreams("collectStream", () => {
    it("collects stream into single array", async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const stream = createChunkedStream(data, 3);

      const collected = await collectStream(stream);

      expect(collected).toEqual(data);
    });

    it("handles empty stream", async () => {
      const stream = createChunkedStream(new Uint8Array(0), 10);

      const collected = await collectStream(stream);

      expect(collected.length).toBe(0);
    });
  });

  // ==========================================================================
  // Encryption Stream Tests
  // ==========================================================================

  describeIfStreams("createEncryptionStream", () => {
    it("creates working encryption transform", async () => {
      const key = generateAttachmentKey();
      const data = generateRandomBytes(1000);

      const inputStream = createChunkedStream(data, 100);
      const encryptStream = createEncryptionStream(key, { chunkSize: 100 });

      const encryptedStream = inputStream.pipeThrough(encryptStream);
      const encrypted = await collectStream(encryptedStream);

      // Should be larger due to IV + auth tag per chunk
      expect(encrypted.length).toBeGreaterThan(data.length);
    });

    it("produces different output for same input", async () => {
      const key = generateAttachmentKey();
      const data = generateRandomBytes(500);

      const stream1 = createChunkedStream(data, 100);
      const stream2 = createChunkedStream(data, 100);

      const encrypted1 = await collectStream(
        stream1.pipeThrough(createEncryptionStream(key, { chunkSize: 100 })),
      );
      const encrypted2 = await collectStream(
        stream2.pipeThrough(createEncryptionStream(key, { chunkSize: 100 })),
      );

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toEqual(encrypted2);
    });

    it("accepts raw key bytes", async () => {
      const keyBytes = generateRandomBytes(32);
      const data = generateRandomBytes(100);

      const inputStream = createChunkedStream(data, 50);
      const encryptStream = createEncryptionStream(keyBytes, { chunkSize: 50 });

      const encrypted = await collectStream(
        inputStream.pipeThrough(encryptStream),
      );

      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("reports progress", async () => {
      const key = generateAttachmentKey();
      const data = generateRandomBytes(300);
      const progressUpdates: number[] = [];

      const inputStream = createChunkedStream(data, 100);
      const encryptStream = createEncryptionStream(key, {
        chunkSize: 100,
        onProgress: (progress) =>
          progressUpdates.push(progress.chunksProcessed),
      });

      await collectStream(inputStream.pipeThrough(encryptStream));

      // Should have progress updates for each chunk
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Decryption Stream Tests
  // ==========================================================================

  describeIfStreams("createDecryptionStream", () => {
    it("creates working decryption transform", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(500);

      // Encrypt
      const encryptedStream = createChunkedStream(data, chunkSize).pipeThrough(
        createEncryptionStream(key, { chunkSize }),
      );
      const encrypted = await collectStream(encryptedStream);

      // Decrypt
      const decryptedStream = createChunkedStream(
        encrypted,
        encrypted.length,
      ).pipeThrough(createDecryptionStream(key, chunkSize));
      const decrypted = await collectStream(decryptedStream);

      expect(decrypted).toEqual(data);
    });

    it("decrypts multiple chunks correctly", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(350); // 4 chunks

      // Encrypt
      const encryptedStream = createChunkedStream(data, chunkSize).pipeThrough(
        createEncryptionStream(key, { chunkSize }),
      );
      const encrypted = await collectStream(encryptedStream);

      // Decrypt
      const decryptedStream = createChunkedStream(
        encrypted,
        encrypted.length,
      ).pipeThrough(createDecryptionStream(key, chunkSize));
      const decrypted = await collectStream(decryptedStream);

      expect(decrypted).toEqual(data);
    });

    it("reports progress during decryption", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(300);
      const progressUpdates: number[] = [];

      // Encrypt
      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      // Decrypt with progress
      const decryptedStream = createChunkedStream(
        encrypted,
        encrypted.length,
      ).pipeThrough(
        createDecryptionStream(key, chunkSize, {
          onProgress: (progress) =>
            progressUpdates.push(progress.chunksProcessed),
        }),
      );
      await collectStream(decryptedStream);

      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Round-Trip Tests
  // ==========================================================================

  describeIfStreams("Round-trip encryption/decryption", () => {
    it("handles empty data", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = new Uint8Array(0);

      // For empty data, we need to handle the edge case
      // The encryption stream may not produce output for empty input
      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      if (encrypted.length > 0) {
        const decrypted = await collectStream(
          createChunkedStream(encrypted, encrypted.length).pipeThrough(
            createDecryptionStream(key, chunkSize),
          ),
        );
        expect(decrypted.length).toBe(0);
      } else {
        // Empty input produces empty output
        expect(encrypted.length).toBe(0);
      }
    });

    it("handles single byte", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = new Uint8Array([42]);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const decrypted = await collectStream(
        createChunkedStream(encrypted, encrypted.length).pipeThrough(
          createDecryptionStream(key, chunkSize),
        ),
      );

      expect(decrypted).toEqual(data);
    });

    it("handles exact chunk size", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(chunkSize);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const decrypted = await collectStream(
        createChunkedStream(encrypted, encrypted.length).pipeThrough(
          createDecryptionStream(key, chunkSize),
        ),
      );

      expect(decrypted).toEqual(data);
    });

    it("handles data just under chunk size", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(chunkSize - 1);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const decrypted = await collectStream(
        createChunkedStream(encrypted, encrypted.length).pipeThrough(
          createDecryptionStream(key, chunkSize),
        ),
      );

      expect(decrypted).toEqual(data);
    });

    it("handles data just over chunk size", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(chunkSize + 1);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const decrypted = await collectStream(
        createChunkedStream(encrypted, encrypted.length).pipeThrough(
          createDecryptionStream(key, chunkSize),
        ),
      );

      expect(decrypted).toEqual(data);
    });

    it("handles large data", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 1024;
      const data = generateRandomBytes(10 * 1024); // 10KB

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const decrypted = await collectStream(
        createChunkedStream(encrypted, encrypted.length).pipeThrough(
          createDecryptionStream(key, chunkSize),
        ),
      );

      expect(decrypted).toEqual(data);
    });

    it("handles various data sizes", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const sizes = [1, 50, 99, 100, 101, 199, 200, 201, 500];

      for (const size of sizes) {
        const data = generateRandomBytes(size);

        const encrypted = await collectStream(
          createChunkedStream(data, chunkSize).pipeThrough(
            createEncryptionStream(key, { chunkSize }),
          ),
        );

        const decrypted = await collectStream(
          createChunkedStream(encrypted, encrypted.length).pipeThrough(
            createDecryptionStream(key, chunkSize),
          ),
        );

        expect(decrypted).toEqual(data);
      }
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describeIfStreams("Error handling", () => {
    it("fails decryption with wrong key", async () => {
      const key1 = generateAttachmentKey();
      const key2 = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(200);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key1, { chunkSize }),
        ),
      );

      // Decryption with wrong key should fail
      await expect(
        collectStream(
          createChunkedStream(encrypted, encrypted.length).pipeThrough(
            createDecryptionStream(key2, chunkSize),
          ),
        ),
      ).rejects.toThrow();
    });

    it("fails decryption with corrupted data", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(200);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      // Corrupt the data
      encrypted[50] ^= 0xff;

      await expect(
        collectStream(
          createChunkedStream(encrypted, encrypted.length).pipeThrough(
            createDecryptionStream(key, chunkSize),
          ),
        ),
      ).rejects.toThrow();
    });

    it("fails decryption with wrong chunk size", async () => {
      const key = generateAttachmentKey();
      const data = generateRandomBytes(200);

      const encrypted = await collectStream(
        createChunkedStream(data, 100).pipeThrough(
          createEncryptionStream(key, { chunkSize: 100 }),
        ),
      );

      // Try to decrypt with different chunk size
      await expect(
        collectStream(
          createChunkedStream(encrypted, encrypted.length).pipeThrough(
            createDecryptionStream(key, 50), // Wrong chunk size
          ),
        ),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Abort Signal Tests
  // ==========================================================================

  describeIfStreams("Abort signal handling", () => {
    it("respects abort signal during encryption", async () => {
      const key = generateAttachmentKey();
      const data = generateRandomBytes(1000);
      const controller = new AbortController();

      // Abort immediately
      controller.abort();

      const stream = createChunkedStream(data, 100).pipeThrough(
        createEncryptionStream(key, {
          chunkSize: 100,
          signal: controller.signal,
        }),
      );

      await expect(collectStream(stream)).rejects.toThrow("aborted");
    });

    it("respects abort signal during decryption", async () => {
      const key = generateAttachmentKey();
      const chunkSize = 100;
      const data = generateRandomBytes(500);

      const encrypted = await collectStream(
        createChunkedStream(data, chunkSize).pipeThrough(
          createEncryptionStream(key, { chunkSize }),
        ),
      );

      const controller = new AbortController();
      controller.abort();

      const stream = createChunkedStream(
        encrypted,
        encrypted.length,
      ).pipeThrough(
        createDecryptionStream(key, chunkSize, { signal: controller.signal }),
      );

      await expect(collectStream(stream)).rejects.toThrow("aborted");
    });
  });
});
