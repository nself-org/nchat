/**
 * Conflict Resolver Tests
 *
 * Comprehensive tests for ConflictResolver and TombstoneStore
 */

import {
  ConflictResolver,
  TombstoneStore,
  getConflictResolver,
  getTombstoneStore,
  resetConflictResolver,
  resetTombstoneStore,
  type Conflict,
  type Tombstone,
} from "../conflict-resolver";
import type { CachedMessage } from "../offline-types";

// =============================================================================
// Test Helpers
// =============================================================================

const createMessageConflict = (
  overrides: Partial<Conflict<Partial<CachedMessage>>> = {},
): Conflict<Partial<CachedMessage>> => ({
  id: "msg-1",
  type: "concurrent_edit",
  itemType: "message",
  local: {
    id: "msg-1",
    content: "Local content",
    senderId: "user-1",
    reactions: [],
    attachments: [],
  },
  remote: {
    id: "msg-1",
    content: "Remote content",
    senderId: "user-1",
    reactions: [],
    attachments: [],
  },
  localTimestamp: new Date("2024-01-01T12:00:00Z"),
  remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
  ...overrides,
});

// =============================================================================
// ConflictResolver Tests
// =============================================================================

describe("ConflictResolver", () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resetConflictResolver();
    resolver = new ConflictResolver();
  });

  // ===========================================================================
  // Resolution Strategy Tests
  // ===========================================================================

  describe("resolve with local_wins strategy", () => {
    it("should return local value", async () => {
      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "local_wins");

      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe("local_wins");
      expect(result.result).toEqual(conflict.local);
    });

    it("should not need user input", async () => {
      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "local_wins");

      expect(result.needsUserInput).toBe(false);
    });
  });

  describe("resolve with remote_wins strategy", () => {
    it("should return remote value", async () => {
      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "remote_wins");

      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe("remote_wins");
      expect(result.result).toEqual(conflict.remote);
    });
  });

  describe("resolve with last_write_wins strategy", () => {
    it("should return remote when newer", async () => {
      const conflict = createMessageConflict({
        localTimestamp: new Date("2024-01-01T12:00:00Z"),
        remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
      });

      const result = await resolver.resolve(conflict, "last_write_wins");

      expect(result.resolved).toBe(true);
      expect(result.result).toEqual(conflict.remote);
    });

    it("should return local when newer", async () => {
      const conflict = createMessageConflict({
        localTimestamp: new Date("2024-01-01T12:02:00Z"),
        remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
      });

      const result = await resolver.resolve(conflict, "last_write_wins");

      expect(result.resolved).toBe(true);
      expect(result.result).toEqual(conflict.local);
    });
  });

  describe("resolve with merge strategy", () => {
    it("should merge messages with same content", async () => {
      const conflict = createMessageConflict({
        local: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [
            { emoji: "👍", count: 1, userIds: ["user-1"], hasReacted: true },
          ],
          attachments: [],
        },
        remote: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [
            { emoji: "❤️", count: 1, userIds: ["user-2"], hasReacted: false },
          ],
          attachments: [],
        },
      });

      const result = await resolver.resolve(conflict, "merge");

      expect(result.resolved).toBe(true);
      expect(result.strategy).toBe("merge");
      expect(result.result?.reactions).toHaveLength(2);
    });

    it("should merge reaction user IDs", async () => {
      const conflict = createMessageConflict({
        local: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [
            { emoji: "👍", count: 1, userIds: ["user-1"], hasReacted: true },
          ],
          attachments: [],
        },
        remote: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [
            { emoji: "👍", count: 1, userIds: ["user-2"], hasReacted: false },
          ],
          attachments: [],
        },
      });

      const result = await resolver.resolve(conflict, "merge");

      expect(result.resolved).toBe(true);
      const thumbsUp = result.result?.reactions?.find((r) => r.emoji === "👍");
      expect(thumbsUp?.userIds).toContain("user-1");
      expect(thumbsUp?.userIds).toContain("user-2");
    });

    it("should require user input for different content", async () => {
      const conflict = createMessageConflict({
        local: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Local content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [],
          attachments: [],
        },
        remote: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Different content",
          senderId: "user-1",
          senderName: "User 1",
          createdAt: new Date(),
          reactions: [],
          attachments: [],
        },
      });

      const result = await resolver.resolve(conflict, "merge");

      expect(result.resolved).toBe(false);
      expect(result.needsUserInput).toBe(true);
    });

    it("should fail merge when local is null", async () => {
      const conflict = createMessageConflict({
        local: null,
      });

      const result = await resolver.resolve(conflict, "merge");

      expect(result.resolved).toBe(false);
      expect(result.needsUserInput).toBe(true);
    });
  });

  describe("resolve with user_prompt strategy", () => {
    it("should fail without callback", async () => {
      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "user_prompt");

      expect(result.resolved).toBe(false);
      expect(result.needsUserInput).toBe(true);
      expect(result.error).toBe("No user choice callback set");
    });

    it("should use callback result", async () => {
      const userChoice = { id: "msg-1", content: "User merged content" };
      resolver.setUserChoiceCallback(async () => userChoice);

      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "user_prompt");

      expect(result.resolved).toBe(true);
      expect(result.result).toEqual(userChoice);
    });

    it("should handle callback error", async () => {
      resolver.setUserChoiceCallback(async () => {
        throw new Error("User cancelled");
      });

      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "user_prompt");

      expect(result.resolved).toBe(false);
      expect(result.error).toBe("User cancelled");
    });
  });

  describe("resolve with unknown strategy", () => {
    it("should return error", async () => {
      const conflict = createMessageConflict();

      const result = await resolver.resolve(conflict, "unknown" as any);

      expect(result.resolved).toBe(false);
      expect(result.error).toContain("Unknown strategy");
    });
  });

  // ===========================================================================
  // Auto-resolve Tests
  // ===========================================================================

  describe("autoResolve", () => {
    it("should try merge first for concurrent edits", async () => {
      const conflict = createMessageConflict({
        type: "concurrent_edit",
        local: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same",
          senderId: "user-1",
          senderName: "User",
          createdAt: new Date(),
          reactions: [],
          attachments: [],
        },
        remote: {
          id: "msg-1",
          channelId: "ch-1",
          content: "Same",
          senderId: "user-1",
          senderName: "User",
          createdAt: new Date(),
          reactions: [],
          attachments: [],
        },
      });

      const result = await resolver.autoResolve(conflict);

      expect(result.resolved).toBe(true);
    });

    it("should use remote for delete_edit conflicts", async () => {
      const conflict = createMessageConflict({
        type: "delete_edit",
      });

      const result = await resolver.autoResolve(conflict);

      expect(result.resolved).toBe(true);
      expect(result.result).toEqual(conflict.remote);
    });

    it("should use last_write_wins for duplicates", async () => {
      const conflict = createMessageConflict({
        type: "duplicate",
        remoteTimestamp: new Date("2024-01-01T12:01:00Z"),
        localTimestamp: new Date("2024-01-01T12:00:00Z"),
      });

      const result = await resolver.autoResolve(conflict);

      expect(result.resolved).toBe(true);
    });

    it("should use last_write_wins for version mismatch", async () => {
      const conflict = createMessageConflict({
        type: "version_mismatch",
      });

      const result = await resolver.autoResolve(conflict);

      expect(result.resolved).toBe(true);
    });
  });

  // ===========================================================================
  // Conflict Detection Tests
  // ===========================================================================

  describe("detectConflict", () => {
    it("should detect conflict when timestamps differ", () => {
      const local = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:00:00Z"),
      };
      const remote = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:01:00Z"),
      };

      const conflict = resolver.detectConflict(local, remote);

      expect(conflict).not.toBeNull();
      expect(conflict?.id).toBe("msg-1");
    });

    it("should not detect conflict when timestamps match", () => {
      const timestamp = new Date("2024-01-01T12:00:00Z");
      const local = { id: "msg-1", updatedAt: timestamp };
      const remote = { id: "msg-1", updatedAt: timestamp };

      const conflict = resolver.detectConflict(local, remote);

      expect(conflict).toBeNull();
    });

    it("should not detect conflict when one is null", () => {
      const local = { id: "msg-1", updatedAt: new Date() };

      const conflict = resolver.detectConflict(local, null);

      expect(conflict).toBeNull();
    });

    it("should detect concurrent_edit for close timestamps", () => {
      const local = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:00:00.000Z"),
      };
      const remote = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:00:00.500Z"),
      };

      const conflict = resolver.detectConflict(local, remote);

      expect(conflict?.type).toBe("concurrent_edit");
    });

    it("should detect version_mismatch for distant timestamps", () => {
      const local = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:00:00Z"),
      };
      const remote = {
        id: "msg-1",
        updatedAt: new Date("2024-01-01T12:05:00Z"),
      };

      const conflict = resolver.detectConflict(local, remote);

      expect(conflict?.type).toBe("version_mismatch");
    });
  });

  // ===========================================================================
  // Batch Resolution Tests
  // ===========================================================================

  describe("resolveMany", () => {
    it("should resolve multiple conflicts", async () => {
      const conflicts = [
        createMessageConflict({ id: "msg-1" }),
        createMessageConflict({ id: "msg-2" }),
        createMessageConflict({ id: "msg-3" }),
      ];

      const results = await resolver.resolveMany(conflicts, "last_write_wins");

      expect(results.length).toBe(3);
      expect(results.every((r) => r.resolved)).toBe(true);
    });
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getConflictResolver();
      const instance2 = getConflictResolver();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getConflictResolver();
      resetConflictResolver();
      const instance2 = getConflictResolver();

      expect(instance1).not.toBe(instance2);
    });
  });
});

// =============================================================================
// TombstoneStore Tests
// =============================================================================

describe("TombstoneStore", () => {
  let store: TombstoneStore;

  beforeEach(() => {
    resetTombstoneStore();
    store = new TombstoneStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe("add", () => {
    it("should add a tombstone", () => {
      const tombstone: Tombstone = {
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      };

      store.add(tombstone);

      expect(store.isDeleted("msg-1")).toBe(true);
    });
  });

  describe("isDeleted", () => {
    it("should return true for deleted items", () => {
      store.add({
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });

      expect(store.isDeleted("msg-1")).toBe(true);
    });

    it("should return false for non-deleted items", () => {
      expect(store.isDeleted("msg-1")).toBe(false);
    });
  });

  describe("get", () => {
    it("should get tombstone by id", () => {
      const tombstone: Tombstone = {
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
        reason: "User deleted",
      };

      store.add(tombstone);

      const retrieved = store.get("msg-1");

      expect(retrieved).toEqual(tombstone);
    });

    it("should return null for non-existent", () => {
      expect(store.get("non-existent")).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should remove old tombstones", () => {
      // Add old tombstone
      store.add({
        id: "old-msg",
        itemType: "message",
        deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        deletedBy: "user-1",
      });

      // Add recent tombstone
      store.add({
        id: "recent-msg",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });

      const removed = store.cleanup();

      expect(removed).toBe(1);
      expect(store.isDeleted("old-msg")).toBe(false);
      expect(store.isDeleted("recent-msg")).toBe(true);
    });

    it("should respect custom retention period", () => {
      store.add({
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        deletedBy: "user-1",
      });

      const removed = store.cleanup(1 * 24 * 60 * 60 * 1000); // 1 day retention

      expect(removed).toBe(1);
    });
  });

  describe("getAll", () => {
    it("should return all tombstones", () => {
      store.add({
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });
      store.add({
        id: "msg-2",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });

      const all = store.getAll();

      expect(all.length).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear all tombstones", () => {
      store.add({
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });

      store.clear();

      expect(store.count()).toBe(0);
    });
  });

  describe("count", () => {
    it("should return tombstone count", () => {
      store.add({
        id: "msg-1",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });
      store.add({
        id: "msg-2",
        itemType: "message",
        deletedAt: new Date(),
        deletedBy: "user-1",
      });

      expect(store.count()).toBe(2);
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getTombstoneStore();
      const instance2 = getTombstoneStore();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getTombstoneStore();
      resetTombstoneStore();
      const instance2 = getTombstoneStore();

      expect(instance1).not.toBe(instance2);
    });
  });
});
