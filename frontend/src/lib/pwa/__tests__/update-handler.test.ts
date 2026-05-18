/**
 * Update Handler Tests
 *
 * Tests for the UpdateHandler class including update detection,
 * application, and periodic checks.
 */

import {
  UpdateHandler,
  getUpdateHandler,
  resetUpdateHandler,
  type UpdateEvent,
} from "../update-handler";

// =============================================================================
// Mock Setup
// =============================================================================

describe("UpdateHandler", () => {
  let handler: UpdateHandler;
  let mockRegistration: ServiceWorkerRegistration;
  let mockServiceWorker: ServiceWorker;
  let eventListeners: Record<string, Array<() => void>>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    resetUpdateHandler();

    // Create mock service worker
    mockServiceWorker = {
      postMessage: jest.fn(),
      state: "installed",
      addEventListener: jest.fn((event: string, listener: () => void) => {
        eventListeners[event] = eventListeners[event] || [];
        eventListeners[event].push(listener);
      }),
    } as unknown as ServiceWorker;

    // Create mock registration
    eventListeners = {};
    mockRegistration = {
      waiting: null,
      installing: null,
      active: mockServiceWorker,
      update: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn((event: string, listener: () => void) => {
        eventListeners[event] = eventListeners[event] || [];
        eventListeners[event].push(listener);
      }),
      removeEventListener: jest.fn(),
    } as unknown as ServiceWorkerRegistration;

    // Mock navigator.serviceWorker
    Object.defineProperty(global, "navigator", {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockRegistration),
          controller: mockServiceWorker,
          addEventListener: jest.fn((event: string, listener: () => void) => {
            eventListeners[event] = eventListeners[event] || [];
            eventListeners[event].push(listener);
          }),
          removeEventListener: jest.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock window
    Object.defineProperty(global, "window", {
      value: {
        location: {
          reload: jest.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    // Create handler
    handler = new UpdateHandler({ debug: false, checkInterval: 0 });
  });

  afterEach(() => {
    handler.destroy();
    jest.useRealTimers();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await handler.initialize();

      expect(handler.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await handler.initialize();
      await handler.initialize();

      // ready should only be called once
      expect(navigator.serviceWorker.ready).toBeDefined();
    });

    it("should detect waiting worker", async () => {
      mockRegistration.waiting = mockServiceWorker;

      await handler.initialize();

      const info = handler.getUpdateInfo();
      expect(info.state).toBe("ready");
    });

    it("should handle missing service worker support", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true,
      });

      const newHandler = new UpdateHandler();
      await newHandler.initialize();

      expect(newHandler.getState()).toBe("error");

      newHandler.destroy();
    });
  });

  describe("destroy", () => {
    it("should clean up resources", async () => {
      await handler.initialize();

      handler.destroy();

      expect(handler.isInitialized()).toBe(false);
    });
  });

  // ==========================================================================
  // Update State Tests
  // ==========================================================================

  describe("update state", () => {
    beforeEach(async () => {
      await handler.initialize();
    });

    describe("getUpdateInfo", () => {
      it("should return update info", () => {
        const info = handler.getUpdateInfo();

        expect(info).toEqual(
          expect.objectContaining({
            state: expect.any(String),
            isUpdateAvailable: expect.any(Boolean),
          }),
        );
      });
    });

    describe("isUpdateAvailable", () => {
      it("should return false when no update", () => {
        expect(handler.isUpdateAvailable()).toBe(false);
      });

      it("should return true when update ready", async () => {
        mockRegistration.waiting = mockServiceWorker;

        await handler.checkForUpdate();

        expect(handler.isUpdateAvailable()).toBe(true);
      });
    });

    describe("getState", () => {
      it("should return current state", () => {
        const state = handler.getState();

        expect([
          "none",
          "checking",
          "available",
          "downloading",
          "ready",
          "error",
        ]).toContain(state);
      });
    });
  });

  // ==========================================================================
  // Update Actions Tests
  // ==========================================================================

  describe("update actions", () => {
    beforeEach(async () => {
      await handler.initialize();
    });

    describe("checkForUpdate", () => {
      it("should check for updates", async () => {
        await handler.checkForUpdate();

        expect(mockRegistration.update).toHaveBeenCalled();
      });

      it("should emit checking event", async () => {
        const events: UpdateEvent[] = [];
        handler.subscribe((event) => events.push(event));

        await handler.checkForUpdate();

        expect(events.some((e) => e.type === "checking")).toBe(true);
      });

      it("should emit no_update event when no update", async () => {
        const events: UpdateEvent[] = [];
        handler.subscribe((event) => events.push(event));

        await handler.checkForUpdate();

        expect(events.some((e) => e.type === "no_update")).toBe(true);
      });

      it("should emit update_ready when update available", async () => {
        const events: UpdateEvent[] = [];
        handler.subscribe((event) => events.push(event));

        mockRegistration.waiting = mockServiceWorker;

        await handler.checkForUpdate();

        expect(events.some((e) => e.type === "update_ready")).toBe(true);
      });

      it("should handle check errors", async () => {
        mockRegistration.update = jest
          .fn()
          .mockRejectedValue(new Error("Check failed"));

        const events: UpdateEvent[] = [];
        handler.subscribe((event) => events.push(event));

        const result = await handler.checkForUpdate();

        expect(result).toBe(false);
        expect(events.some((e) => e.type === "update_error")).toBe(true);
      });

      it("should return false when no registration", async () => {
        const newHandler = new UpdateHandler();
        // Don't initialize, so no registration

        const result = await newHandler.checkForUpdate();

        expect(result).toBe(false);

        newHandler.destroy();
      });
    });

    describe("applyUpdate", () => {
      it("should post SKIP_WAITING message", async () => {
        mockRegistration.waiting = mockServiceWorker;
        await handler.checkForUpdate();

        await handler.applyUpdate();

        expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
          type: "SKIP_WAITING",
        });
      });

      it("should throw when no update available", async () => {
        await expect(handler.applyUpdate()).rejects.toThrow(
          "No update available",
        );
      });
    });

    describe("skipUpdate", () => {
      it("should clear waiting worker", async () => {
        mockRegistration.waiting = mockServiceWorker;
        await handler.checkForUpdate();

        handler.skipUpdate();

        expect(handler.isUpdateAvailable()).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Periodic Checks Tests
  // ==========================================================================

  describe("periodic checks", () => {
    it("should start periodic checks", async () => {
      const checkHandler = new UpdateHandler({ checkInterval: 1000 });
      await checkHandler.initialize();

      checkHandler.startPeriodicChecks();

      jest.advanceTimersByTime(1000);

      expect(mockRegistration.update).toHaveBeenCalled();

      checkHandler.destroy();
    });

    it("should stop periodic checks", async () => {
      const checkHandler = new UpdateHandler({ checkInterval: 1000 });
      await checkHandler.initialize();

      checkHandler.startPeriodicChecks();
      checkHandler.stopPeriodicChecks();

      jest.advanceTimersByTime(2000);

      // Should only have been called during initialization, not from timer
      expect(mockRegistration.update).toHaveBeenCalledTimes(0);

      checkHandler.destroy();
    });

    it("should not start multiple timers", async () => {
      const checkHandler = new UpdateHandler({ checkInterval: 1000 });
      await checkHandler.initialize();

      checkHandler.startPeriodicChecks();
      checkHandler.startPeriodicChecks();
      checkHandler.startPeriodicChecks();

      jest.advanceTimersByTime(1000);

      // Should only be called once
      expect(mockRegistration.update).toHaveBeenCalledTimes(1);

      checkHandler.destroy();
    });
  });

  // ==========================================================================
  // Event System Tests
  // ==========================================================================

  describe("event system", () => {
    beforeEach(async () => {
      await handler.initialize();
    });

    it("should emit events", async () => {
      const events: UpdateEvent[] = [];
      handler.subscribe((event) => events.push(event));

      await handler.checkForUpdate();

      expect(events.length).toBeGreaterThan(0);
    });

    it("should allow unsubscribing", async () => {
      const events: UpdateEvent[] = [];
      const unsubscribe = handler.subscribe((event) => events.push(event));

      await handler.checkForUpdate();
      const countBefore = events.length;

      unsubscribe();

      await handler.checkForUpdate();

      expect(events.length).toBe(countBefore);
    });

    it("should handle listener errors", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      handler.subscribe(() => {
        throw new Error("Listener error");
      });

      await expect(handler.checkForUpdate()).resolves.toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("configuration", () => {
    it("should use default configuration", () => {
      const config = handler.getConfig();

      expect(config.autoReload).toBe(true);
    });

    it("should allow updating configuration", () => {
      handler.setConfig({ autoReload: false });

      const config = handler.getConfig();

      expect(config.autoReload).toBe(false);
    });

    it("should restart periodic checks when interval changes", async () => {
      const checkHandler = new UpdateHandler({ checkInterval: 1000 });
      await checkHandler.initialize();

      checkHandler.startPeriodicChecks();
      checkHandler.setConfig({ checkInterval: 2000 });

      expect(checkHandler.getConfig().checkInterval).toBe(2000);

      checkHandler.destroy();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getUpdateHandler();
      const instance2 = getUpdateHandler();

      expect(instance1).toBe(instance2);
    });

    it("should reset the singleton", () => {
      const instance1 = getUpdateHandler();

      resetUpdateHandler();

      const instance2 = getUpdateHandler();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // Update Found Handler Tests
  // ==========================================================================

  describe("update found handling", () => {
    it("should handle updatefound event", async () => {
      await handler.initialize();

      const events: UpdateEvent[] = [];
      handler.subscribe((event) => events.push(event));

      // Simulate update found
      mockRegistration.installing = mockServiceWorker;
      eventListeners["updatefound"]?.[0]?.();

      expect(events.some((e) => e.type === "update_found")).toBe(true);
    });

    it("should handle state change to installed", async () => {
      await handler.initialize();

      const events: UpdateEvent[] = [];
      handler.subscribe((event) => events.push(event));

      // Simulate update found and installed
      mockRegistration.installing = mockServiceWorker;
      eventListeners["updatefound"]?.[0]?.();

      // Simulate state change
      mockServiceWorker.state = "installed";
      eventListeners["statechange"]?.[0]?.();

      expect(events.some((e) => e.type === "update_ready")).toBe(true);
    });
  });
});
