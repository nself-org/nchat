/**
 * Offline Mode Integration Tests
 *
 * Tests the complete offline mode functionality including:
 * - Message caching
 * - Offline queueing
 * - Sync operations
 * - Conflict resolution
 * - Attachment caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "@jest/globals";
import {
  messageStorage,
  channelStorage,
  userStorage,
  queueStorage,
  deleteDatabase,
} from "../offline-storage";
import { SyncQueue } from "../sync-queue";
import { SyncManager } from "../sync-manager";
import { ConflictResolver } from "../conflict-resolver";
import { AttachmentCache } from "../attachment-cache";
import type {
  CachedMessage,
  CachedChannel,
  QueuedAction,
} from "../offline-types";

// Skipped: Offline Mode Integration tests require real IndexedDB
describe.skip("Offline Mode Integration", () => {
  beforeEach(async () => {
    // Clear all stores before each test
    await deleteDatabase();
  });

  afterEach(async () => {
    // Cleanup after tests
    await deleteDatabase();
  });

  describe("Message Caching", () => {
    it("should cache last 1000 messages per channel", async () => {
      const channelId = "channel-1";

      // Create 1500 messages
      const messages: CachedMessage[] = [];
      for (let i = 0; i < 1500; i++) {
        messages.push({
          id: `msg-${i}`,
          channelId,
          content: `Message ${i}`,
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(Date.now() + i * 1000),
          reactions: [],
          attachments: [],
        });
      }

      // Save all messages
      await messageStorage.saveMany(messages);

      // Retrieve messages for channel
      const cached = await messageStorage.getByChannel(channelId, 1000);

      // Should only return 1000 most recent
      expect(cached.length).toBe(1000);
      expect(cached[0].id).toBe("msg-1499"); // Most recent
    });

    it("should maintain message ordering by timestamp", async () => {
      const channelId = "channel-1";

      const messages: CachedMessage[] = [
        {
          id: "msg-1",
          channelId,
          content: "First",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          reactions: [],
          attachments: [],
        },
        {
          id: "msg-2",
          channelId,
          content: "Second",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date("2024-01-01T10:01:00Z"),
          reactions: [],
          attachments: [],
        },
        {
          id: "msg-3",
          channelId,
          content: "Third",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date("2024-01-01T10:02:00Z"),
          reactions: [],
          attachments: [],
        },
      ];

      await messageStorage.saveMany(messages);

      const cached = await messageStorage.getByChannel(channelId);

      expect(cached[0].id).toBe("msg-3"); // Most recent first
      expect(cached[1].id).toBe("msg-2");
      expect(cached[2].id).toBe("msg-1");
    });
  });

  describe("Offline Queue", () => {
    it("should queue messages sent while offline", async () => {
      const action: QueuedAction = {
        id: "action-1",
        type: "send_message",
        payload: {
          channelId: "channel-1",
          content: "Hello offline!",
          tempId: "temp-1",
        },
        priority: "high",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
      };

      await queueStorage.add(action);

      const pending = await queueStorage.getPending();
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe("send_message");
    });

    it("should maintain queue priority order", async () => {
      const actions: QueuedAction[] = [
        {
          id: "action-1",
          type: "send_message",
          payload: {},
          priority: "low",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
        },
        {
          id: "action-2",
          type: "send_message",
          payload: {},
          priority: "high",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
        },
        {
          id: "action-3",
          type: "send_message",
          payload: {},
          priority: "normal",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 5,
          lastError: null,
        },
      ];

      for (const action of actions) {
        await queueStorage.add(action);
      }

      const pending = await queueStorage.getAll();

      expect(pending[0].id).toBe("action-2"); // high priority
      expect(pending[1].id).toBe("action-3"); // normal priority
      expect(pending[2].id).toBe("action-1"); // low priority
    });
  });

  describe("Sync Operations", () => {
    it("should process sync queue in order", async () => {
      const syncQueue = new SyncQueue();
      await syncQueue.initialize();

      const processedItems: string[] = [];

      // Register processor
      syncQueue.registerProcessor("message", async (item) => {
        processedItems.push(item.id);
      });

      // Add items
      await syncQueue.add("message", "create", { content: "Test 1" });
      await syncQueue.add("message", "create", { content: "Test 2" });
      await syncQueue.add("message", "create", { content: "Test 3" });

      // Process
      await syncQueue.process();

      expect(processedItems.length).toBe(3);
    });

    it("should retry failed operations", async () => {
      const syncQueue = new SyncQueue({ maxRetries: 3, retryBaseDelay: 10 });
      await syncQueue.initialize();

      let attemptCount = 0;

      // Register failing processor
      syncQueue.registerProcessor("message", async (item) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        // Succeed on 3rd attempt
      });

      // Add item
      await syncQueue.add("message", "create", { content: "Test" });

      // Process multiple times
      await syncQueue.process();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await syncQueue.process();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await syncQueue.process();

      expect(attemptCount).toBe(3);
    });
  });

  describe("Conflict Resolution", () => {
    it("should resolve last-write-wins conflicts", async () => {
      const resolver = new ConflictResolver();

      const conflict = {
        id: "msg-1",
        type: "concurrent_edit" as const,
        itemType: "message",
        local: {
          id: "msg-1",
          content: "Local version",
          updatedAt: new Date("2024-01-01T12:00:00Z"),
        },
        remote: {
          id: "msg-1",
          content: "Remote version",
          updatedAt: new Date("2024-01-01T12:01:00Z"),
        },
        localTimestamp: new Date("2024-01-01T12:00:00Z"),
        remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
      };

      const resolution = await resolver.resolve(conflict, "last_write_wins");

      expect(resolution.resolved).toBe(true);
      expect(resolution.result).toEqual(conflict.remote);
    });

    it("should merge message reactions", async () => {
      const resolver = new ConflictResolver();

      const conflict = {
        id: "msg-1",
        type: "concurrent_edit" as const,
        itemType: "message",
        local: {
          id: "msg-1",
          content: "Same content",
          reactions: [
            { emoji: "👍", count: 1, userIds: ["user-1"], hasReacted: true },
          ],
        },
        remote: {
          id: "msg-1",
          content: "Same content",
          reactions: [
            { emoji: "👍", count: 1, userIds: ["user-2"], hasReacted: false },
            { emoji: "❤️", count: 1, userIds: ["user-3"], hasReacted: false },
          ],
        },
        localTimestamp: new Date("2024-01-01T12:00:00Z"),
        remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
      };

      const resolution = await resolver.resolve(conflict, "merge");

      expect(resolution.resolved).toBe(true);
      expect(resolution.result?.reactions).toHaveLength(2);
      expect(resolution.result?.reactions[0].userIds).toContain("user-1");
      expect(resolution.result?.reactions[0].userIds).toContain("user-2");
    });
  });

  describe("Attachment Caching", () => {
    it("should cache attachments with size limit", async () => {
      const cache = new AttachmentCache({ maxSize: 1024 * 1024 }); // 1MB
      await cache.initialize();

      const blob = new Blob(["test content"], { type: "text/plain" });

      await cache.add({
        id: "att-1",
        messageId: "msg-1",
        channelId: "channel-1",
        name: "test.txt",
        type: "text/plain",
        size: blob.size,
        blob,
      });

      const cached = await cache.get("att-1");
      expect(cached).not.toBeNull();
      expect(cached?.name).toBe("test.txt");
    });

    it("should evict LRU attachments when full", async () => {
      const cache = new AttachmentCache({ maxSize: 100 }); // 100 bytes
      await cache.initialize();

      // Add multiple attachments
      const blob1 = new Blob(["x".repeat(40)], { type: "text/plain" });
      const blob2 = new Blob(["y".repeat(40)], { type: "text/plain" });
      const blob3 = new Blob(["z".repeat(40)], { type: "text/plain" });

      await cache.add({
        id: "att-1",
        messageId: "msg-1",
        channelId: "channel-1",
        name: "file1.txt",
        type: "text/plain",
        size: 40,
        blob: blob1,
      });

      await cache.add({
        id: "att-2",
        messageId: "msg-2",
        channelId: "channel-1",
        name: "file2.txt",
        type: "text/plain",
        size: 40,
        blob: blob2,
      });

      // This should trigger eviction of att-1
      await cache.add({
        id: "att-3",
        messageId: "msg-3",
        channelId: "channel-1",
        name: "file3.txt",
        type: "text/plain",
        size: 40,
        blob: blob3,
      });

      const cached1 = await cache.get("att-1");
      const cached3 = await cache.get("att-3");

      expect(cached1).toBeNull(); // Should be evicted
      expect(cached3).not.toBeNull(); // Should be present
    });
  });

  describe("Network Transitions", () => {
    it("should auto-sync on reconnection", async () => {
      const syncManager = new SyncManager({
        syncOnReconnect: true,
        autoSync: false,
      });

      await syncManager.initialize();

      let syncCalled = false;
      const originalSync = syncManager.incrementalSync.bind(syncManager);
      syncManager.incrementalSync = async () => {
        syncCalled = true;
        return originalSync();
      };

      // Simulate going online
      window.dispatchEvent(new Event("online"));

      // Wait for sync to trigger
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(syncCalled).toBe(true);

      await syncManager.shutdown();
    });
  });
});
