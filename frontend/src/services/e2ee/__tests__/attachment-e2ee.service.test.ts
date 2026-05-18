/**
 * Attachment E2EE Service Tests
 *
 * Comprehensive tests for the high-level attachment E2EE service.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  AttachmentE2EEService,
  createAttachmentE2EEService,
  getAttachmentE2EEService,
  resetAttachmentE2EEService,
  type AttachmentE2EEServiceConfig,
  type PreparedAttachment,
  type AttachmentReference,
  type UploadProgress,
  type DownloadProgress,
} from "../attachment-e2ee.service";
import {
  generateAttachmentKey,
  validateAttachmentKey,
} from "@/lib/e2ee/attachment-encryption";
import { type KeyDerivationContext } from "@/lib/e2ee/attachment-key-manager";
import { generateRandomBytes } from "@/lib/e2ee/crypto";

describe("Attachment E2EE Service", () => {
  let service: AttachmentE2EEService;

  const testConfig: AttachmentE2EEServiceConfig = {
    userId: "user-123",
    deviceId: "device-456",
  };

  const testContext: Omit<KeyDerivationContext, "attachmentIndex"> = {
    conversationId: "conv-abc",
    messageId: "msg-xyz",
    senderUserId: "user-123",
    recipientUserId: "user-456",
    timestamp: Date.now(),
  };

  const testMessageKey = generateRandomBytes(32);

  beforeEach(async () => {
    resetAttachmentE2EEService();
    service = await createAttachmentE2EEService(testConfig);
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
    resetAttachmentE2EEService();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    it("initializes successfully", async () => {
      const newService = new AttachmentE2EEService(testConfig);
      expect(newService.isInitialized()).toBe(false);

      await newService.initialize();
      expect(newService.isInitialized()).toBe(true);

      newService.destroy();
    });

    it("warns on double initialization", async () => {
      const newService = await createAttachmentE2EEService(testConfig);

      // Second init should not throw
      await newService.initialize();

      newService.destroy();
    });

    it("returns correct status", () => {
      const status = service.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.userId).toBe(testConfig.userId);
      expect(status.deviceId).toBe(testConfig.deviceId);
      expect(status.cachedKeys).toBe(0);
      expect(status.pendingUploads).toBe(0);
      expect(status.pendingDownloads).toBe(0);
    });
  });

  // ==========================================================================
  // Attachment Preparation Tests
  // ==========================================================================

  describe("prepareAttachment", () => {
    it("prepares attachment from Uint8Array", async () => {
      const fileData = generateRandomBytes(1000);

      const prepared = await service.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );

      expect(prepared.localId).toBeDefined();
      expect(prepared.encryptedData).toBeInstanceOf(Uint8Array);
      expect(prepared.encryptedData.length).toBeGreaterThan(fileData.length);
      expect(prepared.originalSize).toBe(1000);
      expect(prepared.encryptedMetadata).toBeDefined();
      expect(prepared.encryptedKey).toBeDefined();
      expect(prepared.plaintextHash).toBeDefined();
      expect(prepared.ciphertextHash).toBeDefined();
    });

    it("encrypts data differently each time", async () => {
      const fileData = generateRandomBytes(500);

      const prepared1 = await service.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );
      const prepared2 = await service.prepareAttachment(
        fileData,
        testMessageKey,
        {
          ...testContext,
          messageId: "msg-other",
        },
      );

      expect(prepared1.encryptedData).not.toEqual(prepared2.encryptedData);
    });

    it("tracks pending uploads", async () => {
      const fileData = generateRandomBytes(500);

      expect(service.getStatus().pendingUploads).toBe(0);

      const prepared = await service.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );

      expect(service.getStatus().pendingUploads).toBe(1);

      // Create reference removes from pending
      service.createAttachmentReference(prepared, "server-id-123");

      expect(service.getStatus().pendingUploads).toBe(0);
    });

    it("handles multiple attachments with different indices", async () => {
      const file1 = generateRandomBytes(500);
      const file2 = generateRandomBytes(600);
      const file3 = generateRandomBytes(700);

      const prepared1 = await service.prepareAttachment(
        file1,
        testMessageKey,
        testContext,
        0,
      );
      const prepared2 = await service.prepareAttachment(
        file2,
        testMessageKey,
        testContext,
        1,
      );
      const prepared3 = await service.prepareAttachment(
        file3,
        testMessageKey,
        testContext,
        2,
      );

      // Each should have different keys due to different indices
      expect(prepared1.encryptedKey.keyId).not.toEqual(
        prepared2.encryptedKey.keyId,
      );
      expect(prepared2.encryptedKey.keyId).not.toEqual(
        prepared3.encryptedKey.keyId,
      );
    });

    it("reports upload progress", async () => {
      const progressUpdates: UploadProgress[] = [];
      const serviceWithProgress = await createAttachmentE2EEService({
        ...testConfig,
        userId: "user-progress-test",
        onUploadProgress: (progress) => progressUpdates.push({ ...progress }),
      });

      const fileData = generateRandomBytes(1000);
      await serviceWithProgress.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some((p) => p.phase === "encrypting")).toBe(true);

      serviceWithProgress.destroy();
    });

    it("throws when not initialized", async () => {
      const uninitService = new AttachmentE2EEService(testConfig);
      const fileData = generateRandomBytes(100);

      await expect(
        uninitService.prepareAttachment(fileData, testMessageKey, testContext),
      ).rejects.toThrow("not initialized");
    });
  });

  // ==========================================================================
  // Attachment Reference Tests
  // ==========================================================================

  describe("createAttachmentReference", () => {
    it("creates valid reference", async () => {
      const fileData = generateRandomBytes(500);
      const prepared = await service.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );

      const reference = service.createAttachmentReference(
        prepared,
        "server-attachment-id",
      );

      expect(reference.attachmentId).toBe("server-attachment-id");
      expect(reference.encryptedKey).toEqual(prepared.encryptedKey);
      expect(reference.encryptedMetadata).toEqual(prepared.encryptedMetadata);
      expect(reference.encryptedSize).toBe(prepared.encryptedSize);
      expect(reference.uploadedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  // ==========================================================================
  // Attachment Decryption Tests
  // ==========================================================================

  describe("decryptAttachment", () => {
    it("decrypts prepared attachment", async () => {
      const originalData = generateRandomBytes(1000);

      // Prepare (encrypt)
      const prepared = await service.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = service.createAttachmentReference(
        prepared,
        "server-id",
      );

      // Decrypt
      const decrypted = await service.decryptAttachment(
        prepared.encryptedData,
        reference,
        testMessageKey,
      );

      expect(decrypted.data).toEqual(originalData);
      expect(decrypted.verified).toBe(true);
      expect(decrypted.metadata.size).toBe(originalData.length);
    });

    it("verifies decryption integrity", async () => {
      const originalData = generateRandomBytes(500);

      const prepared = await service.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = service.createAttachmentReference(
        prepared,
        "server-id",
      );

      const decrypted = await service.decryptAttachment(
        prepared.encryptedData,
        reference,
        testMessageKey,
      );

      expect(decrypted.verified).toBe(true);
      expect(decrypted.decryptedAt).toBeLessThanOrEqual(Date.now());
    });

    it("fails with wrong message key", async () => {
      const originalData = generateRandomBytes(500);
      const wrongKey = generateRandomBytes(32);

      const prepared = await service.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = service.createAttachmentReference(
        prepared,
        "server-id",
      );

      await expect(
        service.decryptAttachment(prepared.encryptedData, reference, wrongKey),
      ).rejects.toThrow();
    });

    it("fails with corrupted data", async () => {
      const originalData = generateRandomBytes(500);

      const prepared = await service.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = service.createAttachmentReference(
        prepared,
        "server-id",
      );

      // Corrupt the data
      const corruptedData = new Uint8Array(prepared.encryptedData);
      corruptedData[50] ^= 0xff;

      await expect(
        service.decryptAttachment(corruptedData, reference, testMessageKey),
      ).rejects.toThrow();
    });

    it("reports download progress", async () => {
      const progressUpdates: DownloadProgress[] = [];
      const serviceWithProgress = await createAttachmentE2EEService({
        ...testConfig,
        userId: "user-download-progress",
        onDownloadProgress: (progress) => progressUpdates.push({ ...progress }),
      });

      const originalData = generateRandomBytes(1000);
      const prepared = await serviceWithProgress.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = serviceWithProgress.createAttachmentReference(
        prepared,
        "server-id",
      );

      await serviceWithProgress.decryptAttachment(
        prepared.encryptedData,
        reference,
        testMessageKey,
      );

      expect(
        progressUpdates.some(
          (p) => p.phase === "decrypting" || p.phase === "complete",
        ),
      ).toBe(true);

      serviceWithProgress.destroy();
    });
  });

  // ==========================================================================
  // Round-Trip Tests
  // ==========================================================================

  describe("Round-trip encryption/decryption", () => {
    it("handles small files", async () => {
      const sizes = [1, 10, 100, 500, 1000];

      for (const size of sizes) {
        const originalData = generateRandomBytes(size);

        const prepared = await service.prepareAttachment(
          originalData,
          testMessageKey,
          {
            ...testContext,
            messageId: `msg-size-${size}`,
          },
        );
        const reference = service.createAttachmentReference(
          prepared,
          `server-${size}`,
        );

        const decrypted = await service.decryptAttachment(
          prepared.encryptedData,
          reference,
          testMessageKey,
        );

        expect(decrypted.data).toEqual(originalData);
      }
    });

    it("preserves metadata", async () => {
      const originalData = generateRandomBytes(500);

      const prepared = await service.prepareAttachment(
        originalData,
        testMessageKey,
        testContext,
      );
      const reference = service.createAttachmentReference(
        prepared,
        "server-id",
      );

      const decrypted = await service.decryptAttachment(
        prepared.encryptedData,
        reference,
        testMessageKey,
      );

      expect(decrypted.metadata.size).toBe(originalData.length);
      expect(decrypted.metadata.mimeType).toBeDefined();
    });
  });

  // ==========================================================================
  // Key Management Tests
  // ==========================================================================

  describe("Key Management", () => {
    describe("getOrDeriveKey", () => {
      it("derives key for context", () => {
        const fullContext: KeyDerivationContext = {
          ...testContext,
          attachmentIndex: 0,
        };

        const key = service.getOrDeriveKey(testMessageKey, fullContext);

        expect(validateAttachmentKey(key)).toBe(true);
      });

      it("returns cached key on second call", () => {
        const fullContext: KeyDerivationContext = {
          ...testContext,
          attachmentIndex: 0,
        };

        const key1 = service.getOrDeriveKey(testMessageKey, fullContext);
        const key2 = service.getOrDeriveKey(testMessageKey, fullContext);

        expect(key1).toBe(key2); // Same object from cache
      });
    });

    describe("clearKeysForConversation", () => {
      it("clears keys for conversation", async () => {
        // Create attachments in different conversations
        await service.prepareAttachment(
          generateRandomBytes(100),
          testMessageKey,
          testContext,
        );
        await service.prepareAttachment(
          generateRandomBytes(100),
          testMessageKey,
          {
            ...testContext,
            conversationId: "other-conv",
          },
        );

        const statusBefore = service.getStatus();
        expect(statusBefore.cachedKeys).toBe(2);

        service.clearKeysForConversation("conv-abc");

        const statusAfter = service.getStatus();
        expect(statusAfter.cachedKeys).toBe(1);
      });
    });
  });

  // ==========================================================================
  // Key Distribution Tests
  // ==========================================================================

  describe("Key Distribution", () => {
    it("distributes key to another device", async () => {
      const attachmentKey = generateAttachmentKey();
      const deviceWrappingKey = generateRandomBytes(32);
      const fullContext: KeyDerivationContext = {
        ...testContext,
        attachmentIndex: 0,
      };

      const encrypted = await service.distributeKeyToDevice(
        attachmentKey,
        fullContext,
        deviceWrappingKey,
      );

      expect(encrypted.keyId).toBe(attachmentKey.keyId);
      expect(encrypted.encryptedKey).toBeDefined();
    });

    it("receives distributed key", async () => {
      const attachmentKey = generateAttachmentKey();
      const deviceWrappingKey = generateRandomBytes(32);
      const fullContext: KeyDerivationContext = {
        ...testContext,
        attachmentIndex: 0,
      };

      const encrypted = await service.distributeKeyToDevice(
        attachmentKey,
        fullContext,
        deviceWrappingKey,
      );

      const received = await service.receiveDistributedKey(
        encrypted,
        fullContext,
        deviceWrappingKey,
      );

      expect(received.key).toEqual(attachmentKey.key);
      expect(received.keyId).toEqual(attachmentKey.keyId);
    });

    it("caches received key", async () => {
      const attachmentKey = generateAttachmentKey();
      const deviceWrappingKey = generateRandomBytes(32);
      const fullContext: KeyDerivationContext = {
        ...testContext,
        attachmentIndex: 5,
      };

      const encrypted = await service.distributeKeyToDevice(
        attachmentKey,
        fullContext,
        deviceWrappingKey,
      );

      const statusBefore = service.getStatus();
      const initialCachedKeys = statusBefore.cachedKeys;

      await service.receiveDistributedKey(
        encrypted,
        fullContext,
        deviceWrappingKey,
      );

      const statusAfter = service.getStatus();
      expect(statusAfter.cachedKeys).toBe(initialCachedKeys + 1);
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe("Cleanup", () => {
    it("clears pending operations", async () => {
      await service.prepareAttachment(
        generateRandomBytes(100),
        testMessageKey,
        testContext,
      );
      expect(service.getStatus().pendingUploads).toBe(1);

      service.clearPending();
      expect(service.getStatus().pendingUploads).toBe(0);
    });

    it("destroys service", () => {
      service.destroy();
      expect(service.isInitialized()).toBe(false);
    });

    it("performs maintenance", async () => {
      await service.prepareAttachment(
        generateRandomBytes(100),
        testMessageKey,
        testContext,
      );

      // Should not throw
      await service.performMaintenance();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton Management", () => {
    beforeEach(() => {
      resetAttachmentE2EEService();
    });

    it("creates singleton on first call", async () => {
      const singleton = await getAttachmentE2EEService({
        userId: "singleton-user",
        deviceId: "singleton-device",
      });

      expect(singleton.isInitialized()).toBe(true);

      resetAttachmentE2EEService();
    });

    it("returns same instance on subsequent calls", async () => {
      const first = await getAttachmentE2EEService({
        userId: "singleton-user-2",
        deviceId: "singleton-device-2",
      });

      const second = await getAttachmentE2EEService();

      expect(first).toBe(second);

      resetAttachmentE2EEService();
    });

    it("throws without config on first call", async () => {
      await expect(getAttachmentE2EEService()).rejects.toThrow(
        "not configured",
      );
    });

    it("resets singleton", async () => {
      await getAttachmentE2EEService({
        userId: "reset-user",
        deviceId: "reset-device",
      });

      resetAttachmentE2EEService();

      await expect(getAttachmentE2EEService()).rejects.toThrow(
        "not configured",
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("handles encryption error gracefully", async () => {
      const errorUpdates: UploadProgress[] = [];
      const serviceWithProgress = await createAttachmentE2EEService({
        ...testConfig,
        userId: "error-test-user",
        onUploadProgress: (progress) => errorUpdates.push({ ...progress }),
      });

      // This should succeed
      const fileData = generateRandomBytes(100);
      await serviceWithProgress.prepareAttachment(
        fileData,
        testMessageKey,
        testContext,
      );

      serviceWithProgress.destroy();
    });
  });
});
