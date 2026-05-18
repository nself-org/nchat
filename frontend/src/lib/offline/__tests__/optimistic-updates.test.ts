/**
 * Optimistic Updates Tests
 *
 * Tests for OptimisticUpdatesManager and MessageOptimisticUpdates
 */

import {
  OptimisticUpdatesManager,
  MessageOptimisticUpdates,
  getMessageOptimisticUpdates,
  resetMessageOptimisticUpdates,
  type OptimisticUpdate,
  type PendingMessageData,
} from "../optimistic-updates";

// =============================================================================
// Tests
// =============================================================================

describe("OptimisticUpdatesManager", () => {
  let manager: OptimisticUpdatesManager<{ content: string }>;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new OptimisticUpdatesManager();
  });

  afterEach(() => {
    manager.clear();
    jest.useRealTimers();
  });

  // ===========================================================================
  // Add Tests
  // ===========================================================================

  describe("add", () => {
    it("should add an optimistic update", () => {
      const update = manager.add("id-1", "message", { content: "Hello" });

      expect(update).toMatchObject({
        id: "id-1",
        type: "message",
        optimisticValue: { content: "Hello" },
        state: "pending",
      });
    });

    it("should store original value", () => {
      const update = manager.add(
        "id-1",
        "edit",
        { content: "New" },
        { content: "Original" },
      );

      expect(update.originalValue).toEqual({ content: "Original" });
    });

    it("should throw when max pending reached", () => {
      const smallManager = new OptimisticUpdatesManager({ maxPending: 2 });

      smallManager.add("id-1", "message", { content: "Hello" });
      smallManager.add("id-2", "message", { content: "World" });

      expect(() => {
        smallManager.add("id-3", "message", { content: "Fail" });
      }).toThrow("Maximum pending updates reached");
    });

    it("should set timeout for auto-rollback", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      expect(manager.has("id-1")).toBe(true);

      jest.advanceTimersByTime(31000); // Default timeout is 30s

      // After rollback, item may be removed after short delay
      // Check that it's either rolledback or removed
      const update = manager.get("id-1");
      expect(update === undefined || update.state === "rolledback").toBe(true);
    });
  });

  // ===========================================================================
  // State Transition Tests
  // ===========================================================================

  describe("markSyncing", () => {
    it("should mark update as syncing", () => {
      manager.add("id-1", "message", { content: "Hello" });

      manager.markSyncing("id-1");

      expect(manager.get("id-1")?.state).toBe("syncing");
    });

    it("should handle non-existent update", () => {
      // Should not throw
      manager.markSyncing("non-existent");
    });
  });

  describe("confirm", () => {
    it("should mark update as confirmed", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.confirm("id-1");

      expect(manager.get("id-1")?.state).toBe("confirmed");
    });

    it("should use provided confirmed value", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.confirm("id-1", { content: "Confirmed" });

      expect(manager.get("id-1")?.confirmedValue).toEqual({
        content: "Confirmed",
      });
    });

    it("should call confirm callback", async () => {
      const onConfirm = jest.fn();
      manager.add("id-1", "message", { content: "Hello" }, undefined, {
        onConfirm,
      });

      await manager.confirm("id-1");

      expect(onConfirm).toHaveBeenCalled();
    });

    it("should clear timeout on confirm", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.confirm("id-1");

      jest.advanceTimersByTime(31000);

      // After confirm, item may be removed after short delay
      // Check that it's either confirmed or removed (not rolled back)
      const update = manager.get("id-1");
      expect(update === undefined || update.state === "confirmed").toBe(true);
    });
  });

  describe("rollback", () => {
    it("should mark update as rolledback", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.rollback("id-1");

      expect(manager.get("id-1")?.state).toBe("rolledback");
    });

    it("should store error message", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.rollback("id-1", "Failed to send");

      expect(manager.get("id-1")?.error).toBe("Failed to send");
    });

    it("should call rollback callback with original value", async () => {
      const onRollback = jest.fn();
      manager.add(
        "id-1",
        "edit",
        { content: "New" },
        { content: "Original" },
        { onRollback },
      );

      await manager.rollback("id-1");

      expect(onRollback).toHaveBeenCalledWith(
        { content: "Original" },
        { content: "New" },
      );
    });
  });

  describe("fail", () => {
    it("should mark update as failed", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.fail("id-1", new Error("Network error"));

      expect(manager.get("id-1")?.state).toBe("failed");
    });

    it("should store error message", async () => {
      manager.add("id-1", "message", { content: "Hello" });

      await manager.fail("id-1", new Error("Network error"));

      expect(manager.get("id-1")?.error).toBe("Network error");
    });

    it("should call fail callback", async () => {
      const onFail = jest.fn();
      manager.add("id-1", "message", { content: "Hello" }, undefined, {
        onFail,
      });

      const error = new Error("Network error");
      await manager.fail("id-1", error);

      expect(onFail).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Query Tests
  // ===========================================================================

  describe("get", () => {
    it("should get update by id", () => {
      manager.add("id-1", "message", { content: "Hello" });

      const update = manager.get("id-1");

      expect(update).toBeDefined();
      expect(update?.id).toBe("id-1");
    });

    it("should return undefined for non-existent", () => {
      const update = manager.get("non-existent");

      expect(update).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should get all updates", () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "message", { content: "World" });

      const all = manager.getAll();

      expect(all.length).toBe(2);
    });
  });

  describe("getPending", () => {
    it("should get only pending and syncing updates", async () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "message", { content: "World" });
      manager.add("id-3", "message", { content: "Confirmed" });
      await manager.confirm("id-3");

      const pending = manager.getPending();

      expect(pending.length).toBe(2);
    });
  });

  describe("getByType", () => {
    it("should get updates by type", () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "edit", { content: "World" });
      manager.add("id-3", "message", { content: "Again" });

      const messages = manager.getByType("message");

      expect(messages.length).toBe(2);
    });
  });

  describe("getFailed", () => {
    it("should get failed updates", async () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "message", { content: "World" });
      await manager.fail("id-1", new Error("Failed"));

      const failed = manager.getFailed();

      expect(failed.length).toBe(1);
      expect(failed[0].id).toBe("id-1");
    });
  });

  describe("has", () => {
    it("should return true for existing update", () => {
      manager.add("id-1", "message", { content: "Hello" });

      expect(manager.has("id-1")).toBe(true);
    });

    it("should return false for non-existent", () => {
      expect(manager.has("non-existent")).toBe(false);
    });
  });

  describe("count", () => {
    it("should return update count", () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "message", { content: "World" });

      expect(manager.count()).toBe(2);
    });
  });

  // ===========================================================================
  // Remove Tests
  // ===========================================================================

  describe("remove", () => {
    it("should remove an update", () => {
      manager.add("id-1", "message", { content: "Hello" });

      manager.remove("id-1");

      expect(manager.has("id-1")).toBe(false);
    });

    it("should clear associated timeout", () => {
      manager.add("id-1", "message", { content: "Hello" });

      manager.remove("id-1");

      jest.advanceTimersByTime(31000);

      // Should be removed, not rolled back
      expect(manager.has("id-1")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all updates", () => {
      manager.add("id-1", "message", { content: "Hello" });
      manager.add("id-2", "message", { content: "World" });

      manager.clear();

      expect(manager.count()).toBe(0);
    });
  });

  // ===========================================================================
  // Subscription Tests
  // ===========================================================================

  describe("subscribe", () => {
    it("should notify on updates", () => {
      const listener = jest.fn();
      manager.subscribe(listener);

      manager.add("id-1", "message", { content: "Hello" });

      // Called twice: once on subscribe, once on add
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should provide current state on subscribe", () => {
      manager.add("id-1", "message", { content: "Hello" });

      const listener = jest.fn();
      manager.subscribe(listener);

      expect(listener).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "id-1" })]),
      );
    });

    it("should allow unsubscribing", () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      manager.add("id-2", "message", { content: "World" });

      // Only called once on subscribe, not on add
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// MessageOptimisticUpdates Tests
// =============================================================================

describe("MessageOptimisticUpdates", () => {
  let manager: MessageOptimisticUpdates;

  beforeEach(() => {
    resetMessageOptimisticUpdates();
    manager = new MessageOptimisticUpdates();
  });

  afterEach(() => {
    manager.clear();
  });

  describe("addMessage", () => {
    it("should add a pending message", () => {
      const update = manager.addMessage(
        "temp-1",
        "channel-1",
        "Hello",
        "user-1",
        "John Doe",
      );

      expect(update).toMatchObject({
        id: "temp-1",
        type: "message",
        optimisticValue: {
          tempId: "temp-1",
          channelId: "channel-1",
          content: "Hello",
          senderId: "user-1",
          senderName: "John Doe",
        },
      });
    });
  });

  describe("addEdit", () => {
    it("should add a pending edit with original", () => {
      const update = manager.addEdit(
        "msg-1",
        "channel-1",
        "New content",
        "Original content",
        "user-1",
        "John Doe",
      );

      expect(update.optimisticValue.content).toBe("New content");
      expect(update.originalValue?.content).toBe("Original content");
    });
  });

  describe("getForChannel", () => {
    it("should get updates for specific channel", () => {
      manager.addMessage("temp-1", "channel-1", "Hello 1", "user-1", "John");
      manager.addMessage("temp-2", "channel-2", "Hello 2", "user-1", "John");
      manager.addMessage("temp-3", "channel-1", "Hello 3", "user-1", "John");

      const channel1Updates = manager.getForChannel("channel-1");

      expect(channel1Updates.length).toBe(2);
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getMessageOptimisticUpdates();
      const instance2 = getMessageOptimisticUpdates();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getMessageOptimisticUpdates();
      resetMessageOptimisticUpdates();
      const instance2 = getMessageOptimisticUpdates();

      expect(instance1).not.toBe(instance2);
    });
  });
});
