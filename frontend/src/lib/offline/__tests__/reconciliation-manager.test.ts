/**
 * Reconciliation Manager Tests
 *
 * Comprehensive tests for the ReconciliationManager including:
 * - Queue operations
 * - Conflict resolution
 * - Sync operations
 * - Optimistic updates
 * - Storage management
 */

import {
  ReconciliationManager,
  getReconciliationManager,
  resetReconciliationManager,
  type PendingOperation,
  type ConflictInfo,
  type ReconciliationEvent,
} from "../reconciliation-manager";
import type {
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
} from "../offline-types";

// =============================================================================
// Mocks
// =============================================================================

// Mock offline queue
const mockOfflineQueue = {
  initialize: jest.fn(),
  cleanup: jest.fn(),
  addSendMessage: jest.fn().mockResolvedValue({ id: "queue-1" }),
  addEditMessage: jest.fn().mockResolvedValue({ id: "queue-2" }),
  addDeleteMessage: jest.fn().mockResolvedValue({ id: "queue-3" }),
  addReaction: jest.fn().mockResolvedValue({ id: "queue-4" }),
  removeReaction: jest.fn().mockResolvedValue({ id: "queue-5" }),
  add: jest.fn().mockResolvedValue({ id: "queue-6" }),
  getAll: jest.fn().mockResolvedValue([]),
  getPending: jest.fn().mockResolvedValue([]),
  remove: jest.fn().mockResolvedValue(undefined),
  processQueue: jest
    .fn()
    .mockResolvedValue({ processed: 0, failed: 0, remaining: 0 }),
  registerProcessor: jest.fn(),
};

jest.mock("../offline-queue", () => ({
  getOfflineQueue: jest.fn(() => mockOfflineQueue),
  OfflineQueue: jest.fn(() => mockOfflineQueue),
}));

// Mock sync queue
const mockSyncQueue = {
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  registerProcessor: jest.fn(),
  process: jest
    .fn()
    .mockResolvedValue({ processed: 0, failed: 0, remaining: 0 }),
};

jest.mock("../sync-queue", () => ({
  getSyncQueue: jest.fn(() => mockSyncQueue),
  SyncQueue: jest.fn(() => mockSyncQueue),
}));

// Mock conflict resolver
const mockConflictResolver = {
  resolve: jest.fn().mockResolvedValue({
    resolved: true,
    result: {},
    strategy: "last_write_wins",
  }),
  setUserChoiceCallback: jest.fn(),
};

jest.mock("../conflict-resolver", () => ({
  getConflictResolver: jest.fn(() => mockConflictResolver),
  ConflictResolver: jest.fn(() => mockConflictResolver),
}));

// Mock network detector
const mockNetworkDetector = {
  subscribe: jest.fn(() => jest.fn()),
  isOnline: jest.fn().mockReturnValue(true),
  getInfo: jest.fn().mockReturnValue({ state: "online" }),
};

jest.mock("../network-detector", () => ({
  getNetworkDetector: jest.fn(() => mockNetworkDetector),
  NetworkDetector: jest.fn(() => mockNetworkDetector),
}));

// Mock queue storage
jest.mock("../offline-storage", () => ({
  queueStorage: {
    getPending: jest.fn().mockResolvedValue([]),
    countPending: jest.fn().mockResolvedValue(0),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe("ReconciliationManager", () => {
  let manager: ReconciliationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    resetReconciliationManager();
    manager = new ReconciliationManager();
  });

  afterEach(() => {
    manager.cleanup();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();
      expect(manager.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await manager.initialize();
      await manager.initialize();
      expect(mockSyncQueue.initialize).toHaveBeenCalledTimes(1);
    });

    it("should register sync processors on init", async () => {
      await manager.initialize();
      expect(mockSyncQueue.registerProcessor).toHaveBeenCalled();
    });

    it("should subscribe to network changes", async () => {
      await manager.initialize();
      expect(mockNetworkDetector.subscribe).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should cleanup resources", async () => {
      await manager.initialize();
      manager.cleanup();
      expect(manager.isInitialized()).toBe(false);
    });

    it("should unsubscribe from network events", async () => {
      const unsubscribe = jest.fn();
      mockNetworkDetector.subscribe.mockReturnValue(unsubscribe);

      await manager.initialize();
      manager.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Queue Operations Tests
  // ===========================================================================

  describe("queueMessage", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should queue a message", async () => {
      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };

      const operation = await manager.queueMessage(message);

      expect(operation).toMatchObject({
        type: "message",
        data: message,
        channelId: "channel-1",
        status: "pending",
      });
    });

    it("should add message to offline queue", async () => {
      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };

      await manager.queueMessage(message);

      expect(mockOfflineQueue.addSendMessage).toHaveBeenCalledWith(message);
    });

    it("should emit operation_queued event", async () => {
      const events: ReconciliationEvent[] = [];
      manager.subscribe((e) => events.push(e));

      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };

      await manager.queueMessage(message);

      expect(events).toContainEqual(
        expect.objectContaining({ type: "operation_queued" }),
      );
    });

    it("should track pending operation", async () => {
      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };

      await manager.queueMessage(message);

      expect(manager.getPendingCount()).toBe(1);
    });
  });

  describe("queueEdit", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should queue an edit", async () => {
      const edit: QueuedEditMessage = {
        channelId: "channel-1",
        messageId: "msg-1",
        content: "Updated content",
      };

      const operation = await manager.queueEdit(edit);

      expect(operation).toMatchObject({
        type: "edit",
        data: edit,
        status: "pending",
      });
    });

    it("should add edit to offline queue", async () => {
      const edit: QueuedEditMessage = {
        channelId: "channel-1",
        messageId: "msg-1",
        content: "Updated content",
      };

      await manager.queueEdit(edit);

      expect(mockOfflineQueue.addEditMessage).toHaveBeenCalledWith(edit);
    });
  });

  describe("queueDelete", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should queue a deletion", async () => {
      const deletion: QueuedDeleteMessage = {
        channelId: "channel-1",
        messageId: "msg-1",
      };

      const operation = await manager.queueDelete(deletion);

      expect(operation).toMatchObject({
        type: "delete",
        data: deletion,
        status: "pending",
      });
    });
  });

  describe("queueReaction", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should queue adding a reaction", async () => {
      const reaction: QueuedReaction = {
        channelId: "channel-1",
        messageId: "msg-1",
        emoji: "👍",
      };

      const operation = await manager.queueReaction(reaction, true);

      expect(operation).toMatchObject({
        type: "reaction",
        data: reaction,
        status: "pending",
      });
    });

    it("should queue removing a reaction", async () => {
      const reaction: QueuedReaction = {
        channelId: "channel-1",
        messageId: "msg-1",
        emoji: "👍",
      };

      await manager.queueReaction(reaction, false);

      expect(mockOfflineQueue.removeReaction).toHaveBeenCalledWith(reaction);
    });
  });

  describe("queueReadReceipt", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should queue a read receipt", async () => {
      const operation = await manager.queueReadReceipt("channel-1", "msg-1");

      expect(operation).toMatchObject({
        type: "read_receipt",
        channelId: "channel-1",
        status: "pending",
      });
    });
  });

  // ===========================================================================
  // Pending Operations Tests
  // ===========================================================================

  describe("pending operations", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should get pending count", async () => {
      await manager.queueMessage({
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      });

      expect(manager.getPendingCount()).toBe(1);
    });

    it("should get pending for channel", async () => {
      await manager.queueMessage({
        channelId: "channel-1",
        content: "Hello 1",
        tempId: "temp-1",
      });
      await manager.queueMessage({
        channelId: "channel-2",
        content: "Hello 2",
        tempId: "temp-2",
      });

      const channel1Pending = manager.getPendingForChannel("channel-1");
      expect(channel1Pending.length).toBe(1);
    });

    it("should get all pending operations", async () => {
      await manager.queueMessage({
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      });

      const allPending = manager.getAllPending();
      expect(allPending.length).toBe(1);
    });
  });

  // ===========================================================================
  // Sync Operations Tests
  // ===========================================================================

  describe("processPendingOperations", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should process pending operations when online", async () => {
      mockNetworkDetector.isOnline.mockReturnValue(true);
      mockOfflineQueue.getPending.mockResolvedValue([
        { id: "1", type: "send_message", status: "pending" },
      ]);
      mockOfflineQueue.processQueue.mockResolvedValue({
        processed: 1,
        failed: 0,
        remaining: 0,
      });

      const result = await manager.processPendingOperations();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(1);
    });

    it("should throw when offline", async () => {
      mockNetworkDetector.isOnline.mockReturnValue(false);

      await expect(manager.processPendingOperations()).rejects.toThrow(
        "Cannot sync while offline",
      );
    });

    it("should emit sync events", async () => {
      const events: ReconciliationEvent[] = [];
      manager.subscribe((e) => events.push(e));

      mockNetworkDetector.isOnline.mockReturnValue(true);
      mockOfflineQueue.getPending.mockResolvedValue([
        { id: "item-1", type: "send_message", status: "pending" },
      ]);
      mockOfflineQueue.processQueue.mockResolvedValue({
        processed: 1,
        failed: 0,
        remaining: 0,
      });

      await manager.processPendingOperations();

      // Should have sync_started and sync_completed events
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("sync_started");
      expect(eventTypes).toContain("sync_completed");
    });
  });

  // ===========================================================================
  // Conflict Resolution Tests
  // ===========================================================================

  describe("conflict resolution", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should get unresolved conflicts", () => {
      const conflicts = manager.getUnresolvedConflicts();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it("should throw when resolving non-existent conflict", async () => {
      await expect(
        manager.resolveConflict("non-existent", "last_write_wins"),
      ).rejects.toThrow("Conflict not found");
    });
  });

  // ===========================================================================
  // Rollback Tests
  // ===========================================================================

  describe("rollbackOperation", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should rollback a pending operation", async () => {
      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };
      const operation = await manager.queueMessage(message);

      mockOfflineQueue.getAll.mockResolvedValue([
        { id: "queue-1", payload: { tempId: "temp-1" } },
      ]);

      await manager.rollbackOperation(operation.id);

      expect(manager.getPendingCount()).toBe(0);
    });

    it("should emit rollback event", async () => {
      const events: ReconciliationEvent[] = [];
      manager.subscribe((e) => events.push(e));

      const message: QueuedSendMessage = {
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      };
      const operation = await manager.queueMessage(message);

      // Add rollback data by accessing private property
      const pendingOps = (manager as any).pendingOperations as Map<string, any>;
      const op = pendingOps.get(operation.id);
      if (op) {
        op.rollbackData = { content: "original" };
      }

      await manager.rollbackOperation(operation.id);

      expect(events).toContainEqual(
        expect.objectContaining({ type: "operation_rollback" }),
      );
    });
  });

  // ===========================================================================
  // Event System Tests
  // ===========================================================================

  describe("event system", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should allow subscribing to events", () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should emit events to subscribers", async () => {
      const events: ReconciliationEvent[] = [];
      manager.subscribe((e) => events.push(e));

      await manager.queueMessage({
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      });

      expect(events.length).toBeGreaterThan(0);
    });

    it("should allow unsubscribing", async () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      await manager.queueMessage({
        channelId: "channel-1",
        content: "Hello",
        tempId: "temp-1",
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle listener errors gracefully", async () => {
      manager.subscribe(() => {
        throw new Error("Listener error");
      });

      // Should not throw
      await expect(
        manager.queueMessage({
          channelId: "channel-1",
          content: "Hello",
          tempId: "temp-1",
        }),
      ).resolves.toBeDefined();
    });
  });

  // ===========================================================================
  // Storage Quota Tests
  // ===========================================================================

  describe("storage quota", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should check storage quota", async () => {
      const result = await manager.checkStorageQuota();

      expect(result).toHaveProperty("used");
      expect(result).toHaveProperty("quota");
      expect(result).toHaveProperty("percentage");
    });
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getReconciliationManager();
      const instance2 = getReconciliationManager();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getReconciliationManager();
      resetReconciliationManager();
      const instance2 = getReconciliationManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
