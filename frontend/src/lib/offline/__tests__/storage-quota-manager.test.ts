/**
 * Storage Quota Manager Tests
 *
 * Tests for StorageQuotaManager including quota monitoring and eviction
 */

import {
  StorageQuotaManager,
  getStorageQuotaManager,
  resetStorageQuotaManager,
  type StorageStats,
  type StorageEvent,
} from "../storage-quota-manager";

// =============================================================================
// Mocks
// =============================================================================

// Mock IndexedDB wrapper
const mockDB = {
  count: jest.fn().mockResolvedValue(0),
  getAll: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../indexed-db", () => ({
  getIndexedDB: jest.fn(() => mockDB),
  IndexedDBWrapper: jest.fn(() => mockDB),
}));

// Mock navigator.storage
const mockStorageEstimate = {
  usage: 1000000, // 1MB
  quota: 10000000, // 10MB
};

const mockNavigatorStorage = {
  estimate: jest.fn().mockResolvedValue(mockStorageEstimate),
  persist: jest.fn().mockResolvedValue(true),
  persisted: jest.fn().mockResolvedValue(false),
};

Object.defineProperty(global, "navigator", {
  value: {
    storage: mockNavigatorStorage,
  },
  writable: true,
});

// =============================================================================
// Tests
// =============================================================================

describe("StorageQuotaManager", () => {
  let manager: StorageQuotaManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetStorageQuotaManager();
    manager = new StorageQuotaManager();
  });

  afterEach(() => {
    manager.cleanup();
    jest.useRealTimers();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("start/stop", () => {
    it("should start monitoring", () => {
      manager.start();

      jest.advanceTimersByTime(60000); // Default interval

      expect(mockNavigatorStorage.estimate).toHaveBeenCalled();
    });

    it("should stop monitoring", () => {
      manager.start();
      manager.stop();

      jest.advanceTimersByTime(120000);

      // Should only have been called once (on start)
      expect(mockNavigatorStorage.estimate).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Stats Tests
  // ===========================================================================

  describe("getStats", () => {
    it("should return storage statistics", async () => {
      const stats = await manager.getStats();

      expect(stats).toMatchObject({
        used: mockStorageEstimate.usage,
        quota: mockStorageEstimate.quota,
        percentage: 10, // 1MB / 10MB = 10%
        status: "healthy",
      });
    });

    it("should calculate correct percentage", async () => {
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 5000000, // 5MB
        quota: 10000000, // 10MB
      });

      const stats = await manager.getStats();

      expect(stats.percentage).toBe(50);
    });

    it("should detect warning status", async () => {
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 8500000, // 8.5MB (85%)
        quota: 10000000, // 10MB
      });

      const stats = await manager.getStats();

      expect(stats.status).toBe("warning");
    });

    it("should detect critical status", async () => {
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 9600000, // 9.6MB (96%)
        quota: 10000000, // 10MB
      });

      const stats = await manager.getStats();

      expect(stats.status).toBe("critical");
    });

    it("should include breakdown", async () => {
      mockDB.count.mockImplementation((store: string) => {
        switch (store) {
          case "messages":
            return Promise.resolve(100);
          case "channels":
            return Promise.resolve(10);
          case "users":
            return Promise.resolve(50);
          case "syncQueue":
            return Promise.resolve(5);
          default:
            return Promise.resolve(0);
        }
      });

      const stats = await manager.getStats();

      expect(stats.breakdown).toHaveProperty("messages");
      expect(stats.breakdown).toHaveProperty("channels");
      expect(stats.breakdown).toHaveProperty("users");
      expect(stats.breakdown).toHaveProperty("queue");
    });
  });

  describe("getLastStats", () => {
    it("should return null before first check", () => {
      expect(manager.getLastStats()).toBeNull();
    });

    it("should return cached stats", async () => {
      await manager.getStats();

      const cached = manager.getLastStats();

      expect(cached).not.toBeNull();
      expect(cached?.used).toBe(mockStorageEstimate.usage);
    });
  });

  // ===========================================================================
  // Quota Checking Tests
  // ===========================================================================

  describe("checkQuota", () => {
    it("should return current stats", async () => {
      const stats = await manager.checkQuota();

      expect(stats).toHaveProperty("used");
      expect(stats).toHaveProperty("quota");
    });

    it("should trigger auto-eviction when critical", async () => {
      const evictManager = new StorageQuotaManager({ autoEvict: true });

      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 9600000, // 96%
        quota: 10000000,
      });

      // Spy on evictToTarget
      const evictSpy = jest
        .spyOn(evictManager, "evictToTarget")
        .mockResolvedValue({
          success: true,
          bytesFreed: 0,
          itemsRemoved: { messages: 0, attachments: 0, channels: 0 },
          duration: 0,
        });

      await evictManager.checkQuota();

      expect(evictSpy).toHaveBeenCalled();

      evictManager.cleanup();
    });
  });

  describe("wouldExceedQuota", () => {
    it("should return true when exceeds threshold", async () => {
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 9000000, // 90%
        quota: 10000000,
      });

      const wouldExceed = await manager.wouldExceedQuota(600000); // +6%

      expect(wouldExceed).toBe(true);
    });

    it("should return false when within limits", async () => {
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 1000000, // 10%
        quota: 10000000,
      });

      const wouldExceed = await manager.wouldExceedQuota(100000); // +1%

      expect(wouldExceed).toBe(false);
    });
  });

  // ===========================================================================
  // Persistence Tests
  // ===========================================================================

  describe("requestPersistentStorage", () => {
    it("should request persistent storage", async () => {
      const result = await manager.requestPersistentStorage();

      expect(mockNavigatorStorage.persist).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should handle rejection", async () => {
      mockNavigatorStorage.persist.mockResolvedValueOnce(false);

      const result = await manager.requestPersistentStorage();

      expect(result).toBe(false);
    });
  });

  describe("isPersistent", () => {
    it("should check persistence status", async () => {
      mockNavigatorStorage.persisted.mockResolvedValueOnce(true);

      const result = await manager.isPersistent();

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // Eviction Tests
  // ===========================================================================

  describe("evictToTarget", () => {
    it("should evict data to reach target", async () => {
      mockDB.getAll.mockResolvedValue([
        {
          id: "msg-1",
          createdAt: new Date(
            Date.now() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          channelId: "ch-1",
        },
        {
          id: "msg-2",
          createdAt: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          channelId: "ch-1",
        },
      ]);

      const result = await manager.evictToTarget(70);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("bytesFreed");
      expect(result).toHaveProperty("itemsRemoved");
      expect(result).toHaveProperty("duration");
    });

    it("should emit eviction events", async () => {
      const events: StorageEvent[] = [];
      manager.subscribe((e) => events.push(e));

      await manager.evictToTarget(70);

      expect(events).toContainEqual(
        expect.objectContaining({ type: "eviction_started" }),
      );
      expect(events).toContainEqual(
        expect.objectContaining({ type: "eviction_completed" }),
      );
    });
  });

  describe("clearAllData", () => {
    it("should clear all stores", async () => {
      await manager.clearAllData();

      expect(mockDB.clear).toHaveBeenCalledWith("messages");
      expect(mockDB.clear).toHaveBeenCalledWith("channels");
      expect(mockDB.clear).toHaveBeenCalledWith("users");
      expect(mockDB.clear).toHaveBeenCalledWith("syncQueue");
    });

    it("should emit storage_cleared event", async () => {
      const events: StorageEvent[] = [];
      manager.subscribe((e) => events.push(e));

      await manager.clearAllData();

      expect(events).toContainEqual(
        expect.objectContaining({ type: "storage_cleared" }),
      );
    });
  });

  // ===========================================================================
  // Event System Tests
  // ===========================================================================

  describe("subscribe", () => {
    it("should notify on status changes", async () => {
      const events: StorageEvent[] = [];
      manager.subscribe((e) => events.push(e));

      // First check - healthy
      await manager.getStats();

      // Second check - warning (triggers status_changed)
      mockNavigatorStorage.estimate.mockResolvedValueOnce({
        usage: 8500000, // 85%
        quota: 10000000,
      });
      await manager.getStats();

      expect(events).toContainEqual(
        expect.objectContaining({ type: "status_changed" }),
      );
    });

    it("should allow unsubscribing", async () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      await manager.getStats();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Utility Methods Tests
  // ===========================================================================

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(StorageQuotaManager.formatBytes(0)).toBe("0 B");
      expect(StorageQuotaManager.formatBytes(1024)).toBe("1 KB");
      expect(StorageQuotaManager.formatBytes(1048576)).toBe("1 MB");
      expect(StorageQuotaManager.formatBytes(1073741824)).toBe("1 GB");
    });
  });

  describe("getStatusText", () => {
    it("should return status text", () => {
      expect(StorageQuotaManager.getStatusText("healthy")).toBe(
        "Storage is healthy",
      );
      expect(StorageQuotaManager.getStatusText("warning")).toBe(
        "Storage is getting full",
      );
      expect(StorageQuotaManager.getStatusText("critical")).toBe(
        "Storage is almost full",
      );
      expect(StorageQuotaManager.getStatusText("unknown")).toBe(
        "Storage status unknown",
      );
    });
  });

  // ===========================================================================
  // Singleton Tests
  // ===========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getStorageQuotaManager();
      const instance2 = getStorageQuotaManager();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getStorageQuotaManager();
      resetStorageQuotaManager();
      const instance2 = getStorageQuotaManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
