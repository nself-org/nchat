/**
 * Conflict Resolution Service Tests
 *
 * Tests for conflict detection and resolution strategies.
 *
 * @module services/realtime/__tests__/conflict-resolution.service.test
 * @version 1.0.0
 */

import {
  ConflictResolutionService,
  type ConflictEntity,
  type ConflictDetectionResult,
} from "../conflict-resolution.service";
import type { UserSettings } from "@/graphql/settings";

describe("ConflictResolutionService", () => {
  let service: ConflictResolutionService;

  beforeEach(() => {
    service = new ConflictResolutionService({ debug: false });
    service.initialize();
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", () => {
      expect(service.initialized).toBe(true);
    });

    it("should not initialize twice", () => {
      const spy = jest.spyOn(console, "log");
      service.initialize();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Conflict Detection", () => {
    it("should detect no conflict for identical data", () => {
      const entity: ConflictEntity = {
        id: "test-1",
        type: "message:edit",
        localData: { content: "Hello" },
        remoteData: { content: "Hello" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const result = service.detectConflict(entity);
      expect(result.hasConflict).toBe(false);
    });

    it("should detect conflict for different data", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-2",
        type: "message:edit",
        localData: { content: "Hello local" },
        remoteData: { content: "Hello remote" },
        localTimestamp: now - 5000, // 5 seconds apart to ensure detection
        remoteTimestamp: now,
      };

      const result = service.detectConflict(entity);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe("message:edit");
    });

    it("should detect conflict for different versions", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-3",
        type: "user:settings",
        localData: { theme: "dark" },
        remoteData: { theme: "light" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
        localVersion: 1,
        remoteVersion: 2,
      };

      const result = service.detectConflict(entity);
      expect(result.hasConflict).toBe(true);
    });

    it("should not detect conflict for same version", () => {
      const entity: ConflictEntity = {
        id: "test-4",
        type: "user:settings",
        localData: { theme: "dark" },
        remoteData: { theme: "dark" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
        localVersion: 1,
        remoteVersion: 1,
      };

      const result = service.detectConflict(entity);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe("Conflict Severity", () => {
    it("should mark message delete as critical", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-5",
        type: "message:delete",
        localData: { deleted: true },
        remoteData: { deleted: false },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      const result = service.detectConflict(entity);
      expect(result.severity).toBe("critical");
    });

    it("should mark channel settings as critical", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-6",
        type: "channel:settings",
        localData: { name: "Channel A" },
        remoteData: { name: "Channel B" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      const result = service.detectConflict(entity);
      expect(result.severity).toBe("critical");
    });

    it("should mark message edit as medium", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-7",
        type: "message:edit",
        localData: { content: "Edit A" },
        remoteData: { content: "Edit B" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      const result = service.detectConflict(entity);
      expect(result.severity).toBe("medium");
    });

    it("should mark file upload as low", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-8",
        type: "file:upload",
        localData: { file: "local.txt" },
        remoteData: { file: "remote.txt" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      const result = service.detectConflict(entity);
      expect(result.severity).toBe("low");
    });
  });

  describe("Resolution Strategies", () => {
    it("should resolve with last-write-wins", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-9",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: now - 1000,
        remoteTimestamp: now,
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "last-write-wins");

      expect(resolution.strategy).toBe("last-write-wins");
      expect(resolution.resolvedData).toEqual({ content: "Remote" });
    });

    it("should resolve with server-wins", () => {
      const entity: ConflictEntity = {
        id: "test-10",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "server-wins");

      expect(resolution.strategy).toBe("server-wins");
      expect(resolution.resolvedData).toEqual({ content: "Remote" });
    });

    it("should resolve with client-wins", () => {
      const entity: ConflictEntity = {
        id: "test-11",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "client-wins");

      expect(resolution.strategy).toBe("client-wins");
      expect(resolution.resolvedData).toEqual({ content: "Local" });
    });

    it("should merge simple objects", () => {
      const entity: ConflictEntity = {
        id: "test-12",
        type: "user:settings",
        localData: { theme: "dark", fontSize: 14 },
        remoteData: { theme: "light", language: "en" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "merge");

      expect(resolution.strategy).toBe("merge");
      expect(resolution.resolvedData).toEqual({
        theme: "light", // Remote wins on conflict
        fontSize: 14,
        language: "en",
      });
      expect(resolution.conflictedFields).toContain("theme");
    });

    it("should merge nested objects", () => {
      const entity: ConflictEntity = {
        id: "test-13",
        type: "user:settings",
        localData: {
          notifications: { sound: true, volume: 0.5 },
          theme: { mode: "dark" },
        },
        remoteData: {
          notifications: { sound: false, desktop: true },
          theme: { mode: "light" },
        },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "merge");

      const resolved = resolution.resolvedData as Record<string, unknown>;
      expect(resolved.notifications).toEqual({
        sound: false, // Remote wins
        volume: 0.5, // Local only
        desktop: true, // Remote only
      });
    });

    it("should require user action for manual strategy", () => {
      const entity: ConflictEntity = {
        id: "test-14",
        type: "message:delete",
        localData: { deleted: true },
        remoteData: { deleted: false },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.resolveConflict(detection, "manual");

      expect(resolution.strategy).toBe("manual");
      expect(resolution.requiresUserAction).toBe(true);
    });

    it("should accept user choice for manual resolution", () => {
      const entity: ConflictEntity = {
        id: "test-15",
        type: "message:delete",
        localData: { deleted: true },
        remoteData: { deleted: false },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const userChoice = { deleted: true, custom: "value" };
      const resolution = service.resolveConflict(
        detection,
        "manual",
        userChoice,
      );

      expect(resolution.strategy).toBe("manual");
      expect(resolution.resolvedData).toEqual(userChoice);
      expect(resolution.requiresUserAction).toBe(false);
    });
  });

  describe("Auto-Resolution", () => {
    it("should auto-resolve low severity conflicts", () => {
      const entity: ConflictEntity = {
        id: "test-16",
        type: "file:upload",
        localData: { file: "local.txt" },
        remoteData: { file: "remote.txt" },
        localTimestamp: Date.now() - 1000,
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      const resolution = service.autoResolve(detection);

      expect(resolution).not.toBeNull();
      expect(resolution?.resolvedData).toEqual({ file: "remote.txt" });
    });

    it("should not auto-resolve critical conflicts", () => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-17",
        type: "message:delete",
        localData: { deleted: true },
        remoteData: { deleted: false },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      const detection = service.detectConflict(entity);
      const resolution = service.autoResolve(detection);

      expect(resolution).toBeNull();
    });

    it("should not auto-resolve manual strategy", () => {
      const service = new ConflictResolutionService({
        autoResolveLowSeverity: true,
      });
      service.initialize();

      const entity: ConflictEntity = {
        id: "test-18",
        type: "file:upload",
        localData: { file: "local.txt" },
        remoteData: { file: "remote.txt" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      // Force manual strategy
      const detection = service.detectConflict(entity);
      detection.suggestedStrategy = "manual";

      const resolution = service.autoResolve(detection);
      expect(resolution).toBeNull();

      service.destroy();
    });
  });

  describe("Conflict History", () => {
    it("should add entry to history on resolution", () => {
      const entity: ConflictEntity = {
        id: "test-19",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      service.resolveConflict(detection);

      const history = service.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe("test-19");
    });

    it("should filter history by type", () => {
      // Create multiple conflicts
      const entities: ConflictEntity[] = [
        {
          id: "test-20a",
          type: "message:edit",
          localData: { content: "A" },
          remoteData: { content: "B" },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        },
        {
          id: "test-20b",
          type: "user:settings",
          localData: { theme: "dark" },
          remoteData: { theme: "light" },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        },
      ];

      entities.forEach((entity) => {
        const detection = service.detectConflict(entity);
        service.resolveConflict(detection);
      });

      const messageHistory = service.getHistory({ type: "message:edit" });
      const settingsHistory = service.getHistory({ type: "user:settings" });

      expect(messageHistory.length).toBe(1);
      expect(settingsHistory.length).toBe(1);
      expect(messageHistory[0].type).toBe("message:edit");
      expect(settingsHistory[0].type).toBe("user:settings");
    });

    it("should limit history entries", () => {
      // Create many conflicts
      for (let i = 0; i < 10; i++) {
        const entity: ConflictEntity = {
          id: `test-21-${i}`,
          type: "message:edit",
          localData: { content: `Local ${i}` },
          remoteData: { content: `Remote ${i}` },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        };

        const detection = service.detectConflict(entity);
        service.resolveConflict(detection);
      }

      const history = service.getHistory({ limit: 5 });
      expect(history.length).toBe(5);
    });

    it("should clear history", () => {
      const entity: ConflictEntity = {
        id: "test-22",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: Date.now(),
        remoteTimestamp: Date.now(),
      };

      const detection = service.detectConflict(entity);
      service.resolveConflict(detection);

      expect(service.getHistory().length).toBe(1);

      service.clearHistory();
      expect(service.getHistory().length).toBe(0);
    });
  });

  describe("Event System", () => {
    it("should emit conflict:detected event", (done) => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-23",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      service.subscribe((event, data) => {
        if (event === "conflict:detected") {
          expect(data?.detection).toBeDefined();
          expect(data?.detection?.hasConflict).toBe(true);
          done();
        }
      });

      service.detectConflict(entity);
    });

    it("should emit conflict:resolved event", (done) => {
      const now = Date.now();
      const entity: ConflictEntity = {
        id: "test-24",
        type: "message:edit",
        localData: { content: "Local" },
        remoteData: { content: "Remote" },
        localTimestamp: now - 5000,
        remoteTimestamp: now,
      };

      service.subscribe((event, data) => {
        if (event === "conflict:resolved") {
          expect(data?.resolution).toBeDefined();
          expect(data?.resolution?.strategy).toBe("server-wins");
          done();
        }
      });

      const detection = service.detectConflict(entity);
      service.resolveConflict(detection, "server-wins");
    });
  });

  describe("Statistics", () => {
    it("should provide accurate statistics", () => {
      // Create multiple conflicts of different types
      const entities: ConflictEntity[] = [
        {
          id: "test-25a",
          type: "message:edit",
          localData: { content: "A" },
          remoteData: { content: "B" },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        },
        {
          id: "test-25b",
          type: "message:edit",
          localData: { content: "C" },
          remoteData: { content: "D" },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        },
        {
          id: "test-25c",
          type: "user:settings",
          localData: { theme: "dark" },
          remoteData: { theme: "light" },
          localTimestamp: Date.now(),
          remoteTimestamp: Date.now(),
        },
      ];

      entities.forEach((entity, i) => {
        const detection = service.detectConflict(entity);
        const strategy =
          i === 0 ? "server-wins" : i === 1 ? "client-wins" : "merge";
        service.resolveConflict(detection, strategy);
      });

      const stats = service.getStats();
      expect(stats.totalConflicts).toBe(3);
      expect(stats.resolvedConflicts).toBe(3);
      expect(stats.byType["message:edit"]).toBe(2);
      expect(stats.byType["user:settings"]).toBe(1);
      expect(stats.byStrategy["server-wins"]).toBe(1);
      expect(stats.byStrategy["client-wins"]).toBe(1);
      expect(stats.byStrategy["merge"]).toBe(1);
    });
  });
});
