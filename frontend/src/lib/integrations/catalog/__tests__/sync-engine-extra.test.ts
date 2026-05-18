/**
 * SyncEngine — extra behavior coverage (summary, processQueue, getItemsForIntegration,
 * getConflict single-conflict lookup, prepareFullResync state reset, isProcessing guard).
 */

import { SyncEngine } from "../sync-engine";
import { ConnectorError } from "../types";

describe("SyncEngine (extra)", () => {
  let e: SyncEngine;

  beforeEach(() => {
    e = new SyncEngine();
  });

  function base(partial: any = {}) {
    return {
      integrationId: "i1",
      direction: "pull" as const,
      entityType: "user",
      entityId: "u1",
      operation: "create" as const,
      payload: { x: 1 },
      priority: 5,
      maxRetries: 3,
      ...partial,
    };
  }

  describe("getSummary", () => {
    it("returns zeros on an empty engine", () => {
      expect(e.getSummary()).toEqual({
        queueSize: 0,
        pending: 0,
        syncing: 0,
        errors: 0,
        conflicts: 0,
        integrations: 0,
      });
    });

    it("counts pending + syncing + errors correctly", () => {
      const a = e.enqueue(base({ entityId: "a" }));
      const b = e.enqueue(base({ entityId: "b" }));
      e.enqueue(base({ entityId: "c" }));
      e.dequeue(); // marks first as syncing
      e.error(b.id, "boom"); // retryCount 1 < maxRetries 3 → stays pending
      // force a permanent error on b
      for (let i = 0; i < 5; i++) e.error(b.id, "boom");
      const s = e.getSummary();
      expect(s.queueSize).toBeGreaterThanOrEqual(2);
      expect(s.syncing).toBeGreaterThanOrEqual(1);
      expect(s.errors).toBeGreaterThanOrEqual(1);
      expect(s.integrations).toBe(1);
      expect(s.conflicts).toBe(0);
    });

    it("counts multiple integrations", () => {
      e.enqueue(base({ integrationId: "i1" }));
      e.enqueue(base({ integrationId: "i2" }));
      expect(e.getSummary().integrations).toBe(2);
    });
  });

  describe("getItemsForIntegration", () => {
    it("returns only items for the given integration", () => {
      e.enqueue(base({ integrationId: "a" }));
      e.enqueue(base({ integrationId: "b" }));
      e.enqueue(base({ integrationId: "a" }));
      expect(e.getItemsForIntegration("a")).toHaveLength(2);
      expect(e.getItemsForIntegration("b")).toHaveLength(1);
      expect(e.getItemsForIntegration("unknown")).toHaveLength(0);
    });
  });

  describe("getConflict", () => {
    it("returns null for unknown id", () => {
      expect(e.getConflict("nope")).toBeNull();
    });

    it("returns the conflict object after detection", () => {
      const c = e.detectConflict("i1", "user", "u1", { a: 1 }, { a: 2 });
      expect(c).not.toBeNull();
      const fetched = e.getConflict(c!.id);
      expect(fetched).toBe(c);
    });
  });

  describe("prepareFullResync", () => {
    it("clears existing queue items for the integration+entity + resets sync state", () => {
      e.enqueue(base({ entityId: "old" }));
      e.setSyncState("i1", "user", { syncedCount: 50 });
      const queued = e.prepareFullResync(
        "i1",
        "user",
        [
          { entityId: "a", data: { a: 1 } },
          { entityId: "b", data: { a: 2 } },
        ],
        "pull",
      );
      expect(queued).toHaveLength(2);
      // old entry should be gone
      expect(
        e.getItemsForIntegration("i1").find((x) => x.entityId === "old"),
      ).toBeUndefined();
      // sync state reset
      const state = e.getSyncState("i1", "user");
      expect(state.syncedCount).toBe(0);
    });

    it("does not touch queue items for OTHER entity types under same integration", () => {
      e.enqueue(base({ entityType: "account" }));
      e.prepareFullResync(
        "i1",
        "user",
        [{ entityId: "a", data: { a: 1 } }],
        "pull",
      );
      expect(
        e.getItemsForIntegration("i1").find((x) => x.entityType === "account"),
      ).toBeDefined();
    });
  });

  describe("processQueue", () => {
    it("drains up to batchSize items and classifies by operation", async () => {
      e.enqueue(base({ entityId: "c", operation: "create" }));
      e.enqueue(base({ entityId: "u", operation: "update" }));
      e.enqueue(base({ entityId: "d", operation: "delete" }));

      const handled: string[] = [];
      const results = await e.processQueue(async (item) => {
        handled.push(item.entityId);
      }, 10);

      expect(handled.length).toBe(3);
      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.created).toBe(1);
      expect(r.updated).toBe(1);
      expect(r.deleted).toBe(1);
      expect(r.errors).toBe(0);
      expect(typeof r.duration).toBe("number");
    });

    it("counts handler errors and marks items for retry", async () => {
      const item = e.enqueue(base());
      const results = await e.processQueue(async () => {
        throw new Error("boom");
      }, 1);
      expect(results[0].errors).toBe(1);
      // item should still be in queue (retry count 1 < default maxRetries 3)
      const found = e
        .getItemsForIntegration("i1")
        .find((x) => x.id === item.id);
      expect(found).toBeDefined();
      expect(found!.retryCount).toBe(1);
    });

    it("groups results by integrationId+entityType+direction", async () => {
      e.enqueue(base({ integrationId: "a", entityType: "user" }));
      e.enqueue(base({ integrationId: "b", entityType: "user" }));
      const results = await e.processQueue(async () => {}, 10);
      expect(results).toHaveLength(2);
      const ids = new Set(results.map((r) => r.integrationId));
      expect(ids).toEqual(new Set(["a", "b"]));
    });

    it("throws ConnectorError when already processing", async () => {
      e.enqueue(base());
      const promise = e.processQueue(async () => {
        // While we're inside the handler, `processing` is true.
        await expect(e.processQueue(async () => {}, 1)).rejects.toBeInstanceOf(
          ConnectorError,
        );
      }, 1);
      await promise;
    });

    it("resets processing flag after completion (allowing further runs)", async () => {
      e.enqueue(base());
      await e.processQueue(async () => {}, 10);
      expect(e.isProcessing()).toBe(false);
      // Should be safe to run again
      e.enqueue(base({ entityId: "x" }));
      const r2 = await e.processQueue(async () => {}, 10);
      expect(r2).toHaveLength(1);
    });
  });

  describe("clearIntegrationQueue", () => {
    it("only removes items for the named integration", () => {
      e.enqueue(base({ integrationId: "a" }));
      e.enqueue(base({ integrationId: "b" }));
      e.clearIntegrationQueue("a");
      expect(e.getItemsForIntegration("a")).toHaveLength(0);
      expect(e.getItemsForIntegration("b")).toHaveLength(1);
    });
  });

  describe("getConflictsForIntegration", () => {
    it("filters by integrationId", () => {
      e.detectConflict("a", "t", "1", { x: 1 }, { x: 2 });
      e.detectConflict("b", "t", "1", { x: 1 }, { x: 2 });
      expect(e.getConflictsForIntegration("a")).toHaveLength(1);
      expect(e.getConflictsForIntegration("b")).toHaveLength(1);
      expect(e.getConflictsForIntegration("c")).toHaveLength(0);
    });
  });

  describe("getResolvedData", () => {
    it("returns null before resolution is set", () => {
      const c = e.detectConflict("i", "t", "1", { a: 1 }, { a: 2 })!;
      expect(e.getResolvedData(c)).toBeNull();
    });

    it("returns source data for source_wins", () => {
      const c = e.detectConflict("i", "t", "1", { a: "src" }, { a: "tgt" })!;
      e.resolveConflict(c.id, "source_wins");
      const fresh = e.getConflict(c.id)!;
      expect(e.getResolvedData(fresh)).toEqual({ a: "src" });
    });

    it("returns target data for target_wins", () => {
      const c = e.detectConflict("i", "t", "1", { a: "src" }, { a: "tgt" })!;
      e.resolveConflict(c.id, "target_wins");
      const fresh = e.getConflict(c.id)!;
      expect(e.getResolvedData(fresh)).toEqual({ a: "tgt" });
    });

    it("latest_wins picks based on updatedAt", () => {
      const c = e.detectConflict(
        "i",
        "t",
        "1",
        { a: "src", updatedAt: "2024-01-02" },
        { a: "tgt", updatedAt: "2024-01-01" },
      )!;
      e.resolveConflict(c.id, "latest_wins");
      const fresh = e.getConflict(c.id)!;
      expect(e.getResolvedData(fresh)?.a).toBe("src");
    });

    it("manual resolution returns null", () => {
      const c = e.detectConflict("i", "t", "1", { a: 1 }, { a: 2 })!;
      e.resolveConflict(c.id, "manual");
      const fresh = e.getConflict(c.id)!;
      expect(e.getResolvedData(fresh)).toBeNull();
    });
  });

  describe("resolveConflict", () => {
    it("returns null for unknown conflict id", () => {
      expect(e.resolveConflict("nope", "source_wins")).toBeNull();
    });

    it("records resolvedAt + resolvedBy", () => {
      const c = e.detectConflict("i", "t", "1", { a: 1 }, { a: 2 })!;
      const resolved = e.resolveConflict(c.id, "source_wins", "alice");
      expect(resolved?.resolvedBy).toBe("alice");
      expect(resolved?.resolvedAt).toBeTruthy();
    });
  });
});
