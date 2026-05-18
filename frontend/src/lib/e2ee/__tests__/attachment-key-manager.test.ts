/**
 * Attachment Key Manager Tests
 *
 * Comprehensive tests for key derivation and management functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  createContextHash,
  deriveAttachmentKey,
  deriveAttachmentKeyForIndex,
  encryptAttachmentKey,
  decryptAttachmentKey,
  AttachmentKeyManager,
  createAttachmentKeyManager,
  type KeyDerivationContext,
  type EncryptedAttachmentKey,
} from "../attachment-key-manager";
import {
  generateAttachmentKey,
  validateAttachmentKey,
} from "../attachment-encryption";
import { generateRandomBytes, bytesToBase64 } from "../crypto";

describe("Attachment Key Manager", () => {
  // Test fixtures
  const testContext: KeyDerivationContext = {
    conversationId: "conv-123",
    messageId: "msg-456",
    attachmentIndex: 0,
    senderUserId: "user-alice",
    recipientUserId: "user-bob",
    timestamp: Date.now(),
  };

  const testMessageKey = generateRandomBytes(32);

  // ==========================================================================
  // Context Hash Tests
  // ==========================================================================

  describe("createContextHash", () => {
    it("creates consistent hash for same context", () => {
      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(testContext);

      expect(hash1).toEqual(hash2);
    });

    it("creates different hash for different conversation", () => {
      const context2 = { ...testContext, conversationId: "conv-999" };

      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(context2);

      expect(hash1).not.toEqual(hash2);
    });

    it("creates different hash for different message", () => {
      const context2 = { ...testContext, messageId: "msg-999" };

      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(context2);

      expect(hash1).not.toEqual(hash2);
    });

    it("creates different hash for different attachment index", () => {
      const context2 = { ...testContext, attachmentIndex: 1 };

      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(context2);

      expect(hash1).not.toEqual(hash2);
    });

    it("creates different hash for different sender", () => {
      const context2 = { ...testContext, senderUserId: "user-charlie" };

      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(context2);

      expect(hash1).not.toEqual(hash2);
    });

    it("creates different hash for different timestamp", () => {
      const context2 = {
        ...testContext,
        timestamp: testContext.timestamp + 1000,
      };

      const hash1 = createContextHash(testContext);
      const hash2 = createContextHash(context2);

      expect(hash1).not.toEqual(hash2);
    });

    it("handles missing recipientUserId", () => {
      const context1 = { ...testContext, recipientUserId: undefined };
      const context2 = { ...testContext, recipientUserId: undefined };

      const hash1 = createContextHash(context1);
      const hash2 = createContextHash(context2);

      expect(hash1).toEqual(hash2);
    });

    it("returns base64 encoded string", () => {
      const hash = createContextHash(testContext);

      // Base64 characters only
      expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  // ==========================================================================
  // Key Derivation Tests
  // ==========================================================================

  describe("deriveAttachmentKey", () => {
    it("derives valid attachment key", () => {
      const result = deriveAttachmentKey(testMessageKey, testContext);

      expect(validateAttachmentKey(result.attachmentKey)).toBe(true);
      expect(result.contextHash).toBeDefined();
      expect(result.derivedAt).toBeLessThanOrEqual(Date.now());
    });

    it("derives consistent key for same inputs", () => {
      const result1 = deriveAttachmentKey(testMessageKey, testContext);
      const result2 = deriveAttachmentKey(testMessageKey, testContext);

      expect(result1.attachmentKey.key).toEqual(result2.attachmentKey.key);
      expect(result1.contextHash).toEqual(result2.contextHash);
    });

    it("derives different key for different message key", () => {
      // Use explicitly different message keys
      const messageKey1 = new Uint8Array(32).fill(1);
      const messageKey2 = new Uint8Array(32).fill(2);

      // Use fixed context for this test
      const fixedContext: KeyDerivationContext = {
        conversationId: "conv-test",
        messageId: "msg-test",
        attachmentIndex: 0,
        senderUserId: "sender",
        recipientUserId: "recipient",
        timestamp: 1700000000000,
      };

      const result1 = deriveAttachmentKey(messageKey1, fixedContext);
      const result2 = deriveAttachmentKey(messageKey2, fixedContext);

      // Different message keys should produce different attachment keys
      expect(result1.attachmentKey.key).not.toEqual(result2.attachmentKey.key);
    });

    it("derives different key for different context", () => {
      const context2 = { ...testContext, messageId: "msg-999" };

      const result1 = deriveAttachmentKey(testMessageKey, testContext);
      const result2 = deriveAttachmentKey(testMessageKey, context2);

      expect(result1.attachmentKey.key).not.toEqual(result2.attachmentKey.key);
    });

    it("derives 32-byte key", () => {
      const result = deriveAttachmentKey(testMessageKey, testContext);

      expect(result.attachmentKey.key.length).toBe(32);
    });
  });

  describe("deriveAttachmentKeyForIndex", () => {
    it("derives key for specific index", () => {
      // Use fixed timestamp for deterministic tests
      const fixedTimestamp = 1700000000000;
      const baseContext = {
        conversationId: "conv-123",
        messageId: "msg-456",
        senderUserId: "user-alice",
        timestamp: fixedTimestamp,
      };

      // Debug: check context hashes
      const ctx0: KeyDerivationContext = { ...baseContext, attachmentIndex: 0 };
      const ctx1: KeyDerivationContext = { ...baseContext, attachmentIndex: 1 };
      const ctx2: KeyDerivationContext = { ...baseContext, attachmentIndex: 2 };

      const hash0 = createContextHash(ctx0);
      const hash1 = createContextHash(ctx1);
      const hash2 = createContextHash(ctx2);

      // Context hashes should be different
      expect(hash0).not.toEqual(hash1);
      expect(hash1).not.toEqual(hash2);
      expect(hash0).not.toEqual(hash2);

      const result0 = deriveAttachmentKeyForIndex(
        testMessageKey,
        baseContext,
        0,
      );
      const result1 = deriveAttachmentKeyForIndex(
        testMessageKey,
        baseContext,
        1,
      );
      const result2 = deriveAttachmentKeyForIndex(
        testMessageKey,
        baseContext,
        2,
      );

      // All should be valid
      expect(validateAttachmentKey(result0.attachmentKey)).toBe(true);
      expect(validateAttachmentKey(result1.attachmentKey)).toBe(true);
      expect(validateAttachmentKey(result2.attachmentKey)).toBe(true);

      // All should be different due to different attachment indices
      expect(result0.attachmentKey.key).not.toEqual(result1.attachmentKey.key);
      expect(result1.attachmentKey.key).not.toEqual(result2.attachmentKey.key);
      expect(result0.attachmentKey.key).not.toEqual(result2.attachmentKey.key);
    });

    it("consistent for same index", () => {
      // Use fixed timestamp for deterministic tests
      const fixedTimestamp = 1700000000000;
      const baseContext = {
        conversationId: "conv-123",
        messageId: "msg-456",
        senderUserId: "user-alice",
        timestamp: fixedTimestamp,
      };

      const result1 = deriveAttachmentKeyForIndex(
        testMessageKey,
        baseContext,
        5,
      );
      const result2 = deriveAttachmentKeyForIndex(
        testMessageKey,
        baseContext,
        5,
      );

      expect(result1.attachmentKey.key).toEqual(result2.attachmentKey.key);
    });
  });

  // ==========================================================================
  // Key Encryption/Decryption Tests
  // ==========================================================================

  describe("encryptAttachmentKey / decryptAttachmentKey", () => {
    it("encrypts and decrypts key correctly", async () => {
      const attachmentKey = generateAttachmentKey();
      const wrappingKey = generateRandomBytes(32);

      const encrypted = await encryptAttachmentKey(
        attachmentKey,
        wrappingKey,
        testContext,
      );
      const decrypted = await decryptAttachmentKey(encrypted, wrappingKey);

      expect(decrypted.key).toEqual(attachmentKey.key);
      expect(decrypted.keyId).toEqual(attachmentKey.keyId);
      expect(decrypted.createdAt).toEqual(attachmentKey.createdAt);
    });

    it("encrypted key has correct structure", async () => {
      const attachmentKey = generateAttachmentKey();
      const wrappingKey = generateRandomBytes(32);

      const encrypted = await encryptAttachmentKey(
        attachmentKey,
        wrappingKey,
        testContext,
      );

      expect(encrypted.keyId).toEqual(attachmentKey.keyId);
      expect(typeof encrypted.encryptedKey).toBe("string");
      expect(typeof encrypted.iv).toBe("string");
      expect(typeof encrypted.contextHash).toBe("string");
      expect(encrypted.version).toBe(1);
    });

    it("fails with wrong wrapping key", async () => {
      const attachmentKey = generateAttachmentKey();
      const wrappingKey = generateRandomBytes(32);
      const wrongKey = generateRandomBytes(32);

      const encrypted = await encryptAttachmentKey(
        attachmentKey,
        wrappingKey,
        testContext,
      );

      await expect(decryptAttachmentKey(encrypted, wrongKey)).rejects.toThrow();
    });

    it("preserves timestamp in encryption", async () => {
      const attachmentKey = generateAttachmentKey();
      const wrappingKey = generateRandomBytes(32);

      const encrypted = await encryptAttachmentKey(
        attachmentKey,
        wrappingKey,
        testContext,
      );
      const decrypted = await decryptAttachmentKey(encrypted, wrappingKey);

      expect(decrypted.createdAt).toEqual(attachmentKey.createdAt);
    });

    it("includes context hash", async () => {
      const attachmentKey = generateAttachmentKey();
      const wrappingKey = generateRandomBytes(32);

      const encrypted = await encryptAttachmentKey(
        attachmentKey,
        wrappingKey,
        testContext,
      );

      expect(encrypted.contextHash).toEqual(createContextHash(testContext));
    });
  });

  // ==========================================================================
  // Key Manager Class Tests
  // ==========================================================================

  describe("AttachmentKeyManager", () => {
    let manager: AttachmentKeyManager;

    beforeEach(async () => {
      manager = await createAttachmentKeyManager({
        userId: "user-123",
        deviceId: "device-456",
      });
    });

    afterEach(() => {
      manager.destroy();
    });

    describe("initialization", () => {
      it("initializes successfully", async () => {
        const stats = manager.getCacheStats();
        expect(stats.totalKeys).toBe(0);
      });
    });

    describe("generateKey", () => {
      it("generates valid key", () => {
        const key = manager.generateKey();
        expect(validateAttachmentKey(key)).toBe(true);
      });
    });

    describe("deriveKey", () => {
      it("derives and caches key", () => {
        const key = manager.deriveKey(testMessageKey, testContext);

        expect(validateAttachmentKey(key)).toBe(true);
        expect(manager.getCacheStats().totalKeys).toBe(1);
      });

      it("returns cached key on second call", () => {
        const key1 = manager.deriveKey(testMessageKey, testContext);
        const key2 = manager.deriveKey(testMessageKey, testContext);

        // Should be same object from cache
        expect(key1).toBe(key2);
      });
    });

    describe("getKey", () => {
      it("returns null for non-existent key", () => {
        const key = manager.getKey(testContext);
        expect(key).toBeNull();
      });

      it("returns cached key", () => {
        const derived = manager.deriveKey(testMessageKey, testContext);
        const retrieved = manager.getKey(testContext);

        expect(retrieved).toBe(derived);
      });
    });

    describe("storeKey", () => {
      it("stores key in cache", () => {
        const key = generateAttachmentKey();
        manager.storeKey(key, testContext);

        const retrieved = manager.getKey(testContext);
        expect(retrieved).toBe(key);
      });
    });

    describe("removeKey", () => {
      it("removes key from cache", () => {
        manager.deriveKey(testMessageKey, testContext);
        expect(manager.getCacheStats().totalKeys).toBe(1);

        manager.removeKey(testContext);
        expect(manager.getCacheStats().totalKeys).toBe(0);
      });

      it("does nothing for non-existent key", () => {
        manager.removeKey(testContext);
        expect(manager.getCacheStats().totalKeys).toBe(0);
      });
    });

    describe("removeKeysForConversation", () => {
      it("removes all keys for conversation", () => {
        // Add keys for multiple conversations
        const conv1Context1 = { ...testContext, messageId: "msg-1" };
        const conv1Context2 = { ...testContext, messageId: "msg-2" };
        const conv2Context = {
          ...testContext,
          conversationId: "conv-other",
          messageId: "msg-3",
        };

        manager.deriveKey(testMessageKey, conv1Context1);
        manager.deriveKey(testMessageKey, conv1Context2);
        manager.deriveKey(testMessageKey, conv2Context);

        expect(manager.getCacheStats().totalKeys).toBe(3);

        const removed = manager.removeKeysForConversation("conv-123");

        expect(removed).toBe(2);
        expect(manager.getCacheStats().totalKeys).toBe(1);
      });
    });

    describe("getCacheStats", () => {
      it("returns correct statistics", () => {
        const context1 = { ...testContext, messageId: "msg-1" };
        const context2 = {
          ...testContext,
          messageId: "msg-2",
          conversationId: "conv-other",
        };

        manager.deriveKey(testMessageKey, context1);
        manager.deriveKey(testMessageKey, context2);

        const stats = manager.getCacheStats();

        expect(stats.totalKeys).toBe(2);
        expect(stats.conversationCount).toBe(2);
        expect(stats.oldestKey).toBeLessThanOrEqual(Date.now());
        expect(stats.newestKey).toBeLessThanOrEqual(Date.now());
      });

      it("returns null timestamps for empty cache", () => {
        const stats = manager.getCacheStats();

        expect(stats.totalKeys).toBe(0);
        expect(stats.oldestKey).toBeNull();
        expect(stats.newestKey).toBeNull();
      });
    });

    describe("encryptKeyForTransmission", () => {
      it("encrypts key for transmission", async () => {
        const key = generateAttachmentKey();
        const wrappingKey = generateRandomBytes(32);

        const encrypted = await manager.encryptKeyForTransmission(
          key,
          wrappingKey,
          testContext,
        );

        expect(encrypted.keyId).toEqual(key.keyId);
        expect(encrypted.encryptedKey).toBeDefined();
      });
    });

    describe("decryptKeyFromTransmission", () => {
      it("decrypts key from transmission", async () => {
        const key = generateAttachmentKey();
        const wrappingKey = generateRandomBytes(32);

        const encrypted = await manager.encryptKeyForTransmission(
          key,
          wrappingKey,
          testContext,
        );
        const decrypted = await manager.decryptKeyFromTransmission(
          encrypted,
          wrappingKey,
        );

        expect(decrypted.key).toEqual(key.key);
      });
    });

    describe("clear", () => {
      it("clears all cached keys", () => {
        manager.deriveKey(testMessageKey, testContext);
        manager.deriveKey(testMessageKey, {
          ...testContext,
          messageId: "msg-2",
        });

        expect(manager.getCacheStats().totalKeys).toBe(2);

        manager.clear();

        expect(manager.getCacheStats().totalKeys).toBe(0);
      });
    });

    describe("destroy", () => {
      it("clears state and marks as destroyed", () => {
        manager.deriveKey(testMessageKey, testContext);
        manager.destroy();

        expect(manager.getCacheStats().totalKeys).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Cache Limit Tests
  // ==========================================================================

  describe("Cache Limits", () => {
    it("enforces conversation key limit", async () => {
      const manager = await createAttachmentKeyManager({
        userId: "user-123",
        deviceId: "device-456",
      });

      // Add more than max keys for one conversation
      for (let i = 0; i < 110; i++) {
        const context: KeyDerivationContext = {
          ...testContext,
          messageId: `msg-${i}`,
        };
        manager.deriveKey(testMessageKey, context);
      }

      const stats = manager.getCacheStats();

      // Should be limited to MAX_CACHED_KEYS_PER_CONVERSATION (100)
      expect(stats.totalKeys).toBeLessThanOrEqual(100);

      manager.destroy();
    });
  });
});
