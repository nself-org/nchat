/**
 * Group Key Distribution Tests
 *
 * Tests the GroupKeyDistributor and GroupKeyCollector classes
 * that handle sender key distribution and collection.
 */

import {
  GroupKeyDistributor,
  GroupKeyCollector,
  createGroupKeyDistributor,
  createGroupKeyCollector,
  type PairwiseEncryptor,
  type PreKeyBundleFetcher,
  type DistributionMessageSender,
  type EncryptedDistributionMessage,
  type SenderKeyDistributionMessage,
} from "../group-key-distribution";
import type { GroupMember } from "../group-session";

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock pairwise encryptor
 */
function createMockPairwiseEncryptor(
  options: {
    hasSession?: boolean;
    encryptFails?: boolean;
    decryptFails?: boolean;
    createSessionFails?: boolean;
  } = {},
): PairwiseEncryptor {
  const sessions = new Map<string, boolean>();

  return {
    hasSession: async (userId: string, deviceId: string) => {
      if (options.hasSession !== undefined) return options.hasSession;
      return sessions.get(`${userId}:${deviceId}`) ?? false;
    },
    createSession: async (userId: string, deviceId: string) => {
      if (options.createSessionFails) {
        throw new Error("Failed to create session");
      }
      sessions.set(`${userId}:${deviceId}`, true);
    },
    encrypt: async (
      userId: string,
      deviceId: string,
      plaintext: Uint8Array,
    ) => {
      if (options.encryptFails) {
        throw new Error("Encryption failed");
      }
      // Simple XOR "encryption" for testing
      const key = new TextEncoder().encode(`${userId}:${deviceId}`);
      const result = new Uint8Array(plaintext.length);
      for (let i = 0; i < plaintext.length; i++) {
        result[i] = plaintext[i] ^ key[i % key.length];
      }
      return result;
    },
    decrypt: async (
      userId: string,
      deviceId: string,
      ciphertext: Uint8Array,
    ) => {
      if (options.decryptFails) {
        throw new Error("Decryption failed");
      }
      // Simple XOR "decryption" for testing
      const key = new TextEncoder().encode(`${userId}:${deviceId}`);
      const result = new Uint8Array(ciphertext.length);
      for (let i = 0; i < ciphertext.length; i++) {
        result[i] = ciphertext[i] ^ key[i % key.length];
      }
      return result;
    },
  };
}

/**
 * Creates a mock distribution message
 */
function createMockDistributionMessage(
  groupId: string,
  userId: string,
  deviceId: string,
): SenderKeyDistributionMessage {
  return {
    keyId: `key-${Date.now()}`,
    chainKey: crypto.getRandomValues(new Uint8Array(32)),
    chainIteration: 0,
    signingPublicKey: crypto.getRandomValues(new Uint8Array(32)),
    groupId,
    senderUserId: userId,
    senderDeviceId: deviceId,
    timestamp: Date.now(),
    version: 1,
  };
}

/**
 * Creates mock group members
 */
function createMockMembers(count: number): GroupMember[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i + 1}`,
    deviceId: `device-${i + 1}`,
    joinedAt: Date.now(),
    role: i === 0 ? ("admin" as const) : ("member" as const),
  }));
}

// ============================================================================
// GroupKeyDistributor Tests
// ============================================================================

describe("GroupKeyDistributor", () => {
  describe("constructor", () => {
    it("should create distributor with required parameters", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      expect(distributor).toBeDefined();
    });

    it("should create distributor with optional parameters", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const bundleFetcher: PreKeyBundleFetcher = {
        fetchBundle: async () => ({ publicKey: new Uint8Array(32) }),
      };
      const messageSender: DistributionMessageSender = {
        send: async () => true,
      };

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
        {
          bundleFetcher,
          messageSender,
        },
      );

      expect(distributor).toBeDefined();
    });
  });

  describe("distribute", () => {
    it("should distribute sender key to all members", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(5);

      const result = await distributor.distribute(groupId, message, members);

      // Should exclude self (user-1, device-1)
      expect(result.totalTargets).toBe(4);
      expect(result.successCount).toBe(4);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(4);
    });

    it("should return empty result when only self in group", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
      ];

      const result = await distributor.distribute(groupId, message, members);

      expect(result.totalTargets).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should handle distribution failures with retries", async () => {
      let callCount = 0;
      const encryptor: PairwiseEncryptor = {
        hasSession: async () => true,
        createSession: async () => {},
        encrypt: async () => {
          callCount++;
          if (callCount <= 4) throw new Error("Temporary failure");
          return new Uint8Array([1, 2, 3]);
        },
        decrypt: async () => new Uint8Array([1, 2, 3]),
      };

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          joinedAt: Date.now(),
          role: "member",
        },
      ];

      const result = await distributor.distribute(groupId, message, members);

      // After 4 retries, should fail
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBeDefined();
    }, 15000);

    it("should track request ID", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      const result = await distributor.distribute(groupId, message, members);

      expect(result.requestId).toBeDefined();
      expect(result.requestId).toHaveLength(32); // 16 bytes hex = 32 chars
    });

    it("should track duration", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      const result = await distributor.distribute(groupId, message, members);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeGreaterThanOrEqual(
        result.completedAt - result.durationMs,
      );
    });

    it("should set isRekey flag correctly", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      const result = await distributor.distribute(
        groupId,
        message,
        members,
        true,
      );

      expect(result.successCount).toBe(2); // Excludes self
    });

    it("should create session when none exists and bundle fetcher provided", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: false });
      const bundleFetcher: PreKeyBundleFetcher = {
        fetchBundle: async () => ({ publicKey: new Uint8Array(32) }),
      };

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
        {
          bundleFetcher,
        },
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          joinedAt: Date.now(),
          role: "member",
        },
      ];

      const result = await distributor.distribute(groupId, message, members);

      expect(result.successCount).toBe(1);
    });

    it("should fail when no session and no bundle fetcher", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: false });

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          joinedAt: Date.now(),
          role: "member",
        },
      ];

      const result = await distributor.distribute(groupId, message, members);

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.results[0].error).toContain("No pairwise session");
    }, 15000);

    it("should send message when sender is provided", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const sentMessages: EncryptedDistributionMessage[] = [];
      const messageSender: DistributionMessageSender = {
        send: async (msg) => {
          sentMessages.push(msg);
          return true;
        },
      };

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
        {
          messageSender,
        },
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      const result = await distributor.distribute(groupId, message, members);

      expect(result.successCount).toBe(2);
      expect(sentMessages).toHaveLength(2);
      expect(sentMessages[0].type).toBe("sender_key_distribution");
      expect(sentMessages[0].groupId).toBe(groupId);
    });

    it("should handle message sender failure", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const messageSender: DistributionMessageSender = {
        send: async () => false,
      };

      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
        {
          messageSender,
        },
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          joinedAt: Date.now(),
          role: "member",
        },
      ];

      const result = await distributor.distribute(groupId, message, members);

      expect(result.failedCount).toBe(1);
      expect(result.results[0].error).toContain(
        "Message sender returned false",
      );
    }, 15000);
  });

  describe("processReceivedDistribution", () => {
    it("should process valid distribution message", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-2",
        "device-2",
      );

      const groupId = "group-1";
      const originalMessage = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );

      // Create encrypted message using the same XOR mock
      const serialized = JSON.stringify({
        keyId: originalMessage.keyId,
        chainKey: bytesToBase64(originalMessage.chainKey),
        chainIteration: originalMessage.chainIteration,
        signingPublicKey: bytesToBase64(originalMessage.signingPublicKey),
        groupId: originalMessage.groupId,
        senderUserId: originalMessage.senderUserId,
        senderDeviceId: originalMessage.senderDeviceId,
        timestamp: originalMessage.timestamp,
        version: originalMessage.version,
      });
      const plaintext = new TextEncoder().encode(serialized);
      const encrypted = await encryptor.encrypt(
        "user-1",
        "device-1",
        plaintext,
      );

      const receivedMessage: EncryptedDistributionMessage = {
        type: "sender_key_distribution",
        groupId,
        senderUserId: "user-1",
        senderDeviceId: "device-1",
        targetUserId: "user-2",
        targetDeviceId: "device-2",
        encryptedData: bytesToBase64(encrypted),
        epoch: 0,
        timestamp: Date.now(),
      };

      const result =
        await distributor.processReceivedDistribution(receivedMessage);

      expect(result.groupId).toBe(groupId);
      expect(result.senderUserId).toBe("user-1");
      expect(result.keyId).toBe(originalMessage.keyId);
    });

    it("should reject mismatched group ID", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-2",
        "device-2",
      );

      const originalMessage = createMockDistributionMessage(
        "group-1",
        "user-1",
        "device-1",
      );

      const serialized = JSON.stringify({
        keyId: originalMessage.keyId,
        chainKey: bytesToBase64(originalMessage.chainKey),
        chainIteration: originalMessage.chainIteration,
        signingPublicKey: bytesToBase64(originalMessage.signingPublicKey),
        groupId: "group-1", // Original group
        senderUserId: originalMessage.senderUserId,
        senderDeviceId: originalMessage.senderDeviceId,
        timestamp: originalMessage.timestamp,
        version: originalMessage.version,
      });
      const plaintext = new TextEncoder().encode(serialized);
      const encrypted = await encryptor.encrypt(
        "user-1",
        "device-1",
        plaintext,
      );

      const receivedMessage: EncryptedDistributionMessage = {
        type: "sender_key_distribution",
        groupId: "group-2", // Different group in envelope
        senderUserId: "user-1",
        senderDeviceId: "device-1",
        targetUserId: "user-2",
        targetDeviceId: "device-2",
        encryptedData: bytesToBase64(encrypted),
        epoch: 0,
        timestamp: Date.now(),
      };

      await expect(
        distributor.processReceivedDistribution(receivedMessage),
      ).rejects.toThrow("Group ID mismatch");
    });

    it("should reject mismatched sender", async () => {
      // Create an encryptor that uses a fixed key for all encrypt/decrypt operations
      // so we can test the validation logic after successful decryption
      const fixedKeyEncryptor: PairwiseEncryptor = {
        hasSession: async () => true,
        createSession: async () => {},
        encrypt: async (
          _userId: string,
          _deviceId: string,
          plaintext: Uint8Array,
        ) => {
          const key = new TextEncoder().encode("fixed-key");
          const result = new Uint8Array(plaintext.length);
          for (let i = 0; i < plaintext.length; i++) {
            result[i] = plaintext[i] ^ key[i % key.length];
          }
          return result;
        },
        decrypt: async (
          _userId: string,
          _deviceId: string,
          ciphertext: Uint8Array,
        ) => {
          const key = new TextEncoder().encode("fixed-key");
          const result = new Uint8Array(ciphertext.length);
          for (let i = 0; i < ciphertext.length; i++) {
            result[i] = ciphertext[i] ^ key[i % key.length];
          }
          return result;
        },
      };
      const distributor = new GroupKeyDistributor(
        fixedKeyEncryptor,
        "user-2",
        "device-2",
      );

      const groupId = "group-1";
      const originalMessage = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );

      const serialized = JSON.stringify({
        keyId: originalMessage.keyId,
        chainKey: bytesToBase64(originalMessage.chainKey),
        chainIteration: originalMessage.chainIteration,
        signingPublicKey: bytesToBase64(originalMessage.signingPublicKey),
        groupId,
        senderUserId: "user-1", // Original sender
        senderDeviceId: "device-1",
        timestamp: originalMessage.timestamp,
        version: originalMessage.version,
      });
      const plaintext = new TextEncoder().encode(serialized);
      const encrypted = await fixedKeyEncryptor.encrypt(
        "user-1",
        "device-1",
        plaintext,
      );

      const receivedMessage: EncryptedDistributionMessage = {
        type: "sender_key_distribution",
        groupId,
        senderUserId: "user-3", // Different sender in envelope
        senderDeviceId: "device-3",
        targetUserId: "user-2",
        targetDeviceId: "device-2",
        encryptedData: bytesToBase64(encrypted),
        epoch: 0,
        timestamp: Date.now(),
      };

      await expect(
        distributor.processReceivedDistribution(receivedMessage),
      ).rejects.toThrow("Sender mismatch");
    });
  });

  describe("getDistributionStatus", () => {
    it("should return status after distribution", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(5);

      await distributor.distribute(groupId, message, members);

      const status = distributor.getDistributionStatus(groupId);

      expect(status).toBeDefined();
      expect(status?.groupId).toBe(groupId);
      expect(status?.totalMembers).toBe(4);
      expect(status?.distributedCount).toBe(4);
      expect(status?.isComplete).toBe(true);
    });

    it("should return undefined for unknown group", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const status = distributor.getDistributionStatus("nonexistent");

      expect(status).toBeUndefined();
    });
  });

  describe("getPendingRequests", () => {
    it("should return empty array when no pending requests", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const pending = distributor.getPendingRequests();

      expect(pending).toHaveLength(0);
    });
  });

  describe("cancelRequest", () => {
    it("should return false for non-existent request", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const cancelled = distributor.cancelRequest("nonexistent");

      expect(cancelled).toBe(false);
    });
  });

  describe("clearStatus", () => {
    it("should clear status for a group", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const groupId = "group-1";
      const message = createMockDistributionMessage(
        groupId,
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      await distributor.distribute(groupId, message, members);

      expect(distributor.getDistributionStatus(groupId)).toBeDefined();

      distributor.clearStatus(groupId);

      expect(distributor.getDistributionStatus(groupId)).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("should clear all state", async () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = new GroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      const message = createMockDistributionMessage(
        "group-1",
        "user-1",
        "device-1",
      );
      const members = createMockMembers(3);

      await distributor.distribute("group-1", message, members);
      await distributor.distribute("group-2", message, members);

      distributor.clear();

      expect(distributor.getDistributionStatus("group-1")).toBeUndefined();
      expect(distributor.getDistributionStatus("group-2")).toBeUndefined();
      expect(distributor.getPendingRequests()).toHaveLength(0);
    });
  });
});

// ============================================================================
// GroupKeyCollector Tests
// ============================================================================

describe("GroupKeyCollector", () => {
  describe("constructor", () => {
    it("should create collector", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      expect(collector).toBeDefined();
    });
  });

  describe("initializeGroup", () => {
    it("should initialize tracking for group members", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(5);

      collector.initializeGroup("group-1", members);

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(4); // Excludes self
      expect(progress.collected).toBe(0);
    });

    it("should exclude local user from tracking", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
        {
          userId: "user-2",
          deviceId: "device-2",
          joinedAt: Date.now(),
          role: "member",
        },
      ];

      collector.initializeGroup("group-1", members);

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(1);
    });
  });

  describe("markCollected", () => {
    it("should mark member key as collected", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.markCollected("group-1", "user-2", "device-2");

      const progress = collector.getProgress("group-1");
      expect(progress.collected).toBe(1);
    });

    it("should handle marking untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      // Should not throw
      collector.markCollected("nonexistent", "user-2", "device-2");
    });
  });

  describe("addMember", () => {
    it("should add new member to tracking", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.addMember("group-1", "user-4", "device-4");

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(3); // Original 2 + new 1
    });

    it("should create group tracking if not exists", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      collector.addMember("group-1", "user-2", "device-2");

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(1);
    });

    it("should skip adding self", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      collector.addMember("group-1", "user-1", "device-1");

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(0);
    });
  });

  describe("removeMember", () => {
    it("should remove member from tracking", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.removeMember("group-1", "user-2", "device-2");

      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(1); // 2 - 1
    });

    it("should handle removing from untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      // Should not throw
      collector.removeMember("nonexistent", "user-2", "device-2");
    });
  });

  describe("getMissingKeys", () => {
    it("should return all uncollected members", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);

      const missing = collector.getMissingKeys("group-1");

      expect(missing).toHaveLength(2);
    });

    it("should return remaining after some collected", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.markCollected("group-1", "user-2", "device-2");

      const missing = collector.getMissingKeys("group-1");

      expect(missing).toHaveLength(1);
      expect(missing[0].userId).toBe("user-3");
    });

    it("should return empty for untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      const missing = collector.getMissingKeys("nonexistent");

      expect(missing).toHaveLength(0);
    });
  });

  describe("isComplete", () => {
    it("should return false when keys are missing", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);

      expect(collector.isComplete("group-1")).toBe(false);
    });

    it("should return true when all keys collected", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.markCollected("group-1", "user-2", "device-2");
      collector.markCollected("group-1", "user-3", "device-3");

      expect(collector.isComplete("group-1")).toBe(true);
    });

    it("should return true for untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      expect(collector.isComplete("nonexistent")).toBe(true);
    });

    it("should return true for empty group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
      ];

      collector.initializeGroup("group-1", members);

      expect(collector.isComplete("group-1")).toBe(true);
    });
  });

  describe("getProgress", () => {
    it("should return correct progress", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(5);

      collector.initializeGroup("group-1", members);
      collector.markCollected("group-1", "user-2", "device-2");
      collector.markCollected("group-1", "user-3", "device-3");

      const progress = collector.getProgress("group-1");

      expect(progress.total).toBe(4);
      expect(progress.collected).toBe(2);
      expect(progress.percentage).toBe(50);
    });

    it("should return 100% for empty group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members: GroupMember[] = [
        {
          userId: "user-1",
          deviceId: "device-1",
          joinedAt: Date.now(),
          role: "admin",
        },
      ];

      collector.initializeGroup("group-1", members);

      const progress = collector.getProgress("group-1");

      expect(progress.percentage).toBe(100);
    });

    it("should return 100% for untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      const progress = collector.getProgress("nonexistent");

      expect(progress.collected).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(100);
    });
  });

  describe("resetForRekey", () => {
    it("should reset all collection status", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.markCollected("group-1", "user-2", "device-2");
      collector.markCollected("group-1", "user-3", "device-3");

      expect(collector.isComplete("group-1")).toBe(true);

      collector.resetForRekey("group-1");

      expect(collector.isComplete("group-1")).toBe(false);
      expect(collector.getProgress("group-1").collected).toBe(0);
    });

    it("should handle resetting untracked group", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");

      // Should not throw
      collector.resetForRekey("nonexistent");
    });
  });

  describe("removeGroup", () => {
    it("should remove group tracking", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.removeGroup("group-1");

      // Should return defaults for removed group
      const progress = collector.getProgress("group-1");
      expect(progress.total).toBe(0);
    });
  });

  describe("clear", () => {
    it("should clear all state", () => {
      const collector = new GroupKeyCollector("user-1", "device-1");
      const members = createMockMembers(3);

      collector.initializeGroup("group-1", members);
      collector.initializeGroup("group-2", members);

      collector.clear();

      expect(collector.getProgress("group-1").total).toBe(0);
      expect(collector.getProgress("group-2").total).toBe(0);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("createGroupKeyDistributor", () => {
    it("should create distributor instance", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const distributor = createGroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
      );

      expect(distributor).toBeInstanceOf(GroupKeyDistributor);
    });

    it("should create distributor with options", () => {
      const encryptor = createMockPairwiseEncryptor({ hasSession: true });
      const bundleFetcher: PreKeyBundleFetcher = {
        fetchBundle: async () => ({}),
      };

      const distributor = createGroupKeyDistributor(
        encryptor,
        "user-1",
        "device-1",
        {
          bundleFetcher,
        },
      );

      expect(distributor).toBeInstanceOf(GroupKeyDistributor);
    });
  });

  describe("createGroupKeyCollector", () => {
    it("should create collector instance", () => {
      const collector = createGroupKeyCollector("user-1", "device-1");

      expect(collector).toBeInstanceOf(GroupKeyCollector);
    });
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Bytes to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
