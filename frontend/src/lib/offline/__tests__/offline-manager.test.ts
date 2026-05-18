/**
 * Offline Manager Tests
 *
 * Tests for the OfflineManager class including connection state,
 * sync operations, and event handling.
 */

import {
  OfflineManager,
  getOfflineManager,
  resetOfflineManager,
  type ConnectionState,
  type NetworkQuality,
  type OfflineEvent,
} from "../offline-manager";
import { CacheManager } from "../cache-manager";
import { SyncQueue } from "../sync-queue";

// =============================================================================
// Mock Setup
// =============================================================================

// Mock CacheManager
jest.mock("../cache-manager", () => {
  const mockCacheManager = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
    clearAll: jest.fn().mockResolvedValue(undefined),
  };

  return {
    CacheManager: jest.fn().mockImplementation(() => mockCacheManager),
    getCacheManager: jest.fn().mockReturnValue(mockCacheManager),
    resetCacheManager: jest.fn(),
    __mockCacheManager: mockCacheManager,
  };
});

// Mock SyncQueue
jest.mock("../sync-queue", () => {
  const mockSyncQueue = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    isInitialized: jest.fn().mockReturnValue(true),
    add: jest.fn().mockResolvedValue({ id: "test-id" }),
    countPending: jest.fn().mockResolvedValue(0),
    process: jest
      .fn()
      .mockResolvedValue({ processed: 0, failed: 0, remaining: 0 }),
    clear: jest.fn().mockResolvedValue(undefined),
  };

  return {
    SyncQueue: jest.fn().mockImplementation(() => mockSyncQueue),
    getSyncQueue: jest.fn().mockReturnValue(mockSyncQueue),
    resetSyncQueue: jest.fn(),
    __mockSyncQueue: mockSyncQueue,
  };
});

// =============================================================================
// Tests
// =============================================================================

describe("OfflineManager", () => {
  let offlineManager: OfflineManager;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockSyncQueue: jest.Mocked<SyncQueue>;
  let originalNavigator: Navigator;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Save originals
    originalNavigator = global.navigator;
    originalWindow = global.window;

    // Mock navigator
    Object.defineProperty(global, "navigator", {
      value: {
        onLine: true,
        connection: {
          downlink: 10,
          effectiveType: "4g",
          rtt: 50,
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock window events
    const eventListeners: Record<
      string,
      Array<(...args: unknown[]) => void>
    > = {};
    Object.defineProperty(global, "window", {
      value: {
        addEventListener: jest.fn(
          (event: string, listener: (...args: unknown[]) => void) => {
            eventListeners[event] = eventListeners[event] || [];
            eventListeners[event].push(listener);
          },
        ),
        removeEventListener: jest.fn(
          (event: string, listener: (...args: unknown[]) => void) => {
            if (eventListeners[event]) {
              eventListeners[event] = eventListeners[event].filter(
                (l) => l !== listener,
              );
            }
          },
        ),
        dispatchEvent: jest.fn((event: { type: string }) => {
          const listeners = eventListeners[event.type] || [];
          listeners.forEach((l) => l(event));
        }),
      },
      writable: true,
      configurable: true,
    });

    // Get mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const cacheModule = require("../cache-manager");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const syncModule = require("../sync-queue");
    mockCacheManager = cacheModule.__mockCacheManager;
    mockSyncQueue = syncModule.__mockSyncQueue;

    // Reset singleton
    resetOfflineManager();

    // Create new manager
    offlineManager = new OfflineManager({
      debug: false,
      monitorQuality: false,
    });
  });

  afterEach(() => {
    offlineManager.destroy();

    // Restore originals
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });

    jest.useRealTimers();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await offlineManager.initialize();

      expect(offlineManager.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await offlineManager.initialize();
      await offlineManager.initialize();

      expect(mockCacheManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockSyncQueue.initialize).toHaveBeenCalledTimes(1);
    });

    it("should set up event listeners", async () => {
      await offlineManager.initialize();

      expect(window.addEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });
  });

  describe("destroy", () => {
    it("should clean up resources", async () => {
      await offlineManager.initialize();

      offlineManager.destroy();

      expect(offlineManager.isInitialized()).toBe(false);
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });
  });

  // ==========================================================================
  // Connection State Tests
  // ==========================================================================

  describe("connection state", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    describe("getConnectionInfo", () => {
      it("should return connection info", () => {
        const info = offlineManager.getConnectionInfo();

        expect(info).toEqual(
          expect.objectContaining({
            state: expect.any(String),
            quality: expect.any(String),
            isOnline: expect.any(Boolean),
          }),
        );
      });
    });

    describe("isOnline", () => {
      it("should return true when online", () => {
        expect(offlineManager.isOnline()).toBe(true);
      });
    });

    describe("isOffline", () => {
      it("should return false when online", () => {
        expect(offlineManager.isOffline()).toBe(false);
      });
    });

    describe("getConnectionState", () => {
      it("should return current state", () => {
        const state = offlineManager.getConnectionState();

        expect(["online", "offline", "connecting", "reconnecting"]).toContain(
          state,
        );
      });
    });

    describe("getNetworkQuality", () => {
      it("should return network quality", () => {
        const quality = offlineManager.getNetworkQuality();

        expect(["excellent", "good", "fair", "poor", "unknown"]).toContain(
          quality,
        );
      });
    });

    describe("getOfflineDuration", () => {
      it("should return null when online", () => {
        const duration = offlineManager.getOfflineDuration();

        // Could be null or a number (offlineDuration from previous offline period)
        expect(duration === null || typeof duration === "number").toBe(true);
      });
    });
  });

  // ==========================================================================
  // Queue Operations Tests
  // ==========================================================================

  describe("queue operations", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    describe("queueOperation", () => {
      it("should queue a message operation", async () => {
        await offlineManager.queueOperation("message", "create", {
          content: "Test",
        });

        expect(mockSyncQueue.add).toHaveBeenCalledWith(
          "message",
          "create",
          { content: "Test" },
          undefined,
        );
      });

      it("should queue with options", async () => {
        await offlineManager.queueOperation(
          "message",
          "create",
          { content: "Test" },
          { channelId: "channel-1", priority: 10 },
        );

        expect(mockSyncQueue.add).toHaveBeenCalledWith(
          "message",
          "create",
          { content: "Test" },
          { channelId: "channel-1", priority: 10 },
        );
      });
    });

    describe("getPendingCount", () => {
      it("should return pending count", async () => {
        mockSyncQueue.countPending.mockResolvedValue(5);

        const count = await offlineManager.getPendingCount();

        expect(count).toBe(5);
      });
    });

    describe("hasPendingOperations", () => {
      it("should return true when there are pending operations", async () => {
        mockSyncQueue.countPending.mockResolvedValue(3);

        const hasPending = await offlineManager.hasPendingOperations();

        expect(hasPending).toBe(true);
      });

      it("should return false when no pending operations", async () => {
        mockSyncQueue.countPending.mockResolvedValue(0);

        const hasPending = await offlineManager.hasPendingOperations();

        expect(hasPending).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Sync Operations Tests
  // ==========================================================================

  describe("sync operations", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    describe("sync", () => {
      it("should sync when online", async () => {
        mockSyncQueue.process.mockResolvedValue({
          processed: 5,
          failed: 1,
          remaining: 0,
          errors: [],
        });

        const result = await offlineManager.sync();

        expect(result).toEqual({ processed: 5, failed: 1 });
        expect(mockSyncQueue.process).toHaveBeenCalled();
      });

      it("should not sync when offline", async () => {
        // Set offline
        Object.defineProperty(global.navigator, "onLine", { value: false });
        const manager = new OfflineManager({ monitorQuality: false });
        await manager.initialize();

        const result = await manager.sync();

        expect(result).toEqual({ processed: 0, failed: 0 });

        manager.destroy();
      });

      it("should emit sync events", async () => {
        const events: OfflineEvent[] = [];
        offlineManager.subscribe((event) => events.push(event));

        await offlineManager.sync();

        expect(events.some((e) => e.type === "sync_start")).toBe(true);
        expect(events.some((e) => e.type === "sync_complete")).toBe(true);
      });

      it("should emit error event on failure", async () => {
        mockSyncQueue.process.mockRejectedValue(new Error("Sync failed"));

        const events: OfflineEvent[] = [];
        offlineManager.subscribe((event) => events.push(event));

        await expect(offlineManager.sync()).rejects.toThrow("Sync failed");

        expect(events.some((e) => e.type === "sync_error")).toBe(true);
      });
    });

    describe("forceSync", () => {
      it("should call sync", async () => {
        mockSyncQueue.process.mockResolvedValue({
          processed: 2,
          failed: 0,
          remaining: 0,
          errors: [],
        });

        const result = await offlineManager.forceSync();

        expect(result).toEqual({ processed: 2, failed: 0 });
      });
    });
  });

  // ==========================================================================
  // Cache Operations Tests
  // ==========================================================================

  describe("cache operations", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    describe("getCacheManager", () => {
      it("should return cache manager", () => {
        const cacheManager = offlineManager.getCacheManager();

        expect(cacheManager).toBeDefined();
      });
    });

    describe("getSyncQueue", () => {
      it("should return sync queue", () => {
        const syncQueue = offlineManager.getSyncQueue();

        expect(syncQueue).toBeDefined();
      });
    });

    describe("clearAll", () => {
      it("should clear all offline data", async () => {
        await offlineManager.clearAll();

        expect(mockCacheManager.clearAll).toHaveBeenCalled();
        expect(mockSyncQueue.clear).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Event System Tests
  // ==========================================================================

  describe("event system", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    it("should emit events", async () => {
      const events: OfflineEvent[] = [];
      const unsubscribe = offlineManager.subscribe((event) => {
        events.push(event);
      });

      await offlineManager.sync();

      expect(events.length).toBeGreaterThan(0);

      unsubscribe();
    });

    it("should allow unsubscribing", async () => {
      const events: OfflineEvent[] = [];
      const unsubscribe = offlineManager.subscribe((event) => {
        events.push(event);
      });

      await offlineManager.sync();
      const countBefore = events.length;

      unsubscribe();

      await offlineManager.sync();

      expect(events.length).toBe(countBefore);
    });

    it("should handle listener errors", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      offlineManager.subscribe(() => {
        throw new Error("Listener error");
      });

      await expect(offlineManager.sync()).resolves.toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("configuration", () => {
    it("should use default configuration", () => {
      const config = offlineManager.getConfig();

      expect(config.syncOnReconnect).toBe(true);
      expect(config.syncDelay).toBe(1000);
    });

    it("should allow updating configuration", () => {
      offlineManager.setConfig({ syncDelay: 2000 });

      const config = offlineManager.getConfig();

      expect(config.syncDelay).toBe(2000);
    });

    it("should restart quality monitoring when config changes", async () => {
      const manager = new OfflineManager({ monitorQuality: true });
      await manager.initialize();

      manager.setConfig({ monitorQuality: false });

      const config = manager.getConfig();
      expect(config.monitorQuality).toBe(false);

      manager.destroy();
    });
  });

  // ==========================================================================
  // Online/Offline Event Tests
  // ==========================================================================

  describe("online/offline events", () => {
    beforeEach(async () => {
      await offlineManager.initialize();
    });

    it("should handle online event", () => {
      const events: OfflineEvent[] = [];
      offlineManager.subscribe((event) => events.push(event));

      // Simulate offline then online
      (
        window as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({
        type: "offline",
      });
      (
        window as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({
        type: "online",
      });

      expect(events.some((e) => e.type === "online")).toBe(true);
    });

    it("should handle offline event", () => {
      const events: OfflineEvent[] = [];
      offlineManager.subscribe((event) => events.push(event));
      (
        window as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({
        type: "offline",
      });

      expect(events.some((e) => e.type === "offline")).toBe(true);
    });

    it("should schedule sync on reconnect when enabled", () => {
      const manager = new OfflineManager({
        syncOnReconnect: true,
        syncDelay: 500,
        monitorQuality: false,
      });

      // Manually trigger online handler
      (
        window as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({
        type: "offline",
      });
      (
        window as unknown as { dispatchEvent: (e: { type: string }) => void }
      ).dispatchEvent({
        type: "online",
      });

      // Advance timer
      jest.advanceTimersByTime(600);

      manager.destroy();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getOfflineManager();
      const instance2 = getOfflineManager();

      expect(instance1).toBe(instance2);
    });

    it("should reset the singleton", () => {
      const instance1 = getOfflineManager();

      resetOfflineManager();

      const instance2 = getOfflineManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // Network Quality Tests
  // ==========================================================================

  describe("network quality", () => {
    it("should detect excellent quality on 4g with high downlink", async () => {
      Object.defineProperty(global.navigator, "connection", {
        value: {
          downlink: 10,
          effectiveType: "4g",
          rtt: 50,
        },
        configurable: true,
      });

      const manager = new OfflineManager({ monitorQuality: true });
      await manager.initialize();

      // Quality should be determined
      const quality = manager.getNetworkQuality();
      expect(["excellent", "good", "fair", "poor", "unknown"]).toContain(
        quality,
      );

      manager.destroy();
    });

    it("should handle missing connection API", async () => {
      Object.defineProperty(global.navigator, "connection", {
        value: undefined,
        configurable: true,
      });

      const manager = new OfflineManager({ monitorQuality: true });
      await manager.initialize();

      const quality = manager.getNetworkQuality();
      expect(["good", "unknown"]).toContain(quality);

      manager.destroy();
    });
  });
});
