/**
 * Native Bridge Tests
 */

import { Platform } from "../platform-detector";
import {
  getNativeBridge,
  resetNativeBridge,
  createPlugin,
  createFallbackPlugin,
  registerPlugin,
  getPluginAPI,
  isPluginAvailable,
  onBridgeEvent,
  NativeBridgeImpl,
  NativeBridgePlugin,
  BridgeEvent,
  NativeBridge,
} from "../native-bridge";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock platform-detector
jest.mock("../platform-detector", () => ({
  Platform: {
    WEB: "web",
    IOS: "ios",
    ANDROID: "android",
    ELECTRON: "electron",
    TAURI: "tauri",
  },
  detectPlatform: jest.fn(() => "web"),
  isNative: jest.fn(() => false),
  isBrowser: jest.fn(() => true),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createTestPlugin<T>(
  id: string,
  api: T,
  options: Partial<NativeBridgePlugin<T>> = {},
): NativeBridgePlugin<T> {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: "1.0.0",
    supportedPlatforms: [
      Platform.WEB,
      Platform.IOS,
      Platform.ANDROID,
      Platform.ELECTRON,
      Platform.TAURI,
    ],
    initialize: jest.fn().mockResolvedValue(undefined),
    isAvailable: jest.fn().mockReturnValue(true),
    api,
    ...options,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Native Bridge", () => {
  beforeEach(() => {
    resetNativeBridge();
    jest.clearAllMocks();
  });

  describe("getNativeBridge", () => {
    it("returns a bridge instance", () => {
      const bridge = getNativeBridge();
      expect(bridge).toBeDefined();
      expect(bridge).toBeInstanceOf(NativeBridgeImpl);
    });

    it("returns the same instance on subsequent calls", () => {
      const bridge1 = getNativeBridge();
      const bridge2 = getNativeBridge();
      expect(bridge1).toBe(bridge2);
    });

    it("accepts configuration", () => {
      const bridge = getNativeBridge({ debug: true });
      expect(bridge.getConfig().debug).toBe(true);
    });

    it("updates configuration on subsequent calls", () => {
      const bridge = getNativeBridge({ debug: false });
      expect(bridge.getConfig().debug).toBe(false);

      getNativeBridge({ debug: true });
      expect(bridge.getConfig().debug).toBe(true);
    });
  });

  describe("resetNativeBridge", () => {
    it("resets the bridge instance", () => {
      const bridge1 = getNativeBridge();
      const plugin = createTestPlugin("test", { foo: "bar" });
      bridge1.registerPlugin(plugin);

      resetNativeBridge();

      const bridge2 = getNativeBridge();
      expect(bridge2.hasPlugin("test")).toBe(false);
    });

    it("does nothing if bridge not created", () => {
      expect(() => resetNativeBridge()).not.toThrow();
    });
  });

  describe("NativeBridgeImpl", () => {
    let bridge: NativeBridgeImpl;

    beforeEach(() => {
      bridge = getNativeBridge();
    });

    describe("initialize", () => {
      it("initializes the bridge", async () => {
        await bridge.initialize();
        expect(bridge.isInitialized()).toBe(true);
      });

      it("emits bridge:ready event", async () => {
        const listener = jest.fn();
        bridge.on("bridge:ready", listener);

        await bridge.initialize();

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ type: "bridge:ready" }),
        );
      });

      it("handles multiple initialize calls gracefully", async () => {
        await bridge.initialize();
        await bridge.initialize();
        expect(bridge.isInitialized()).toBe(true);
      });
    });

    describe("registerPlugin", () => {
      it("registers a plugin", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        const result = bridge.registerPlugin(plugin);

        expect(result).toBe(true);
        expect(bridge.hasPlugin("test")).toBe(true);
      });

      it("returns false for duplicate plugin without override", () => {
        const plugin1 = createTestPlugin("test", { foo: "bar" });
        const plugin2 = createTestPlugin("test", { foo: "baz" });

        bridge.registerPlugin(plugin1);
        const result = bridge.registerPlugin(plugin2);

        expect(result).toBe(false);
      });

      it("allows override with option", () => {
        const plugin1 = createTestPlugin("test", { foo: "bar" });
        const plugin2 = createTestPlugin("test", { foo: "baz" });

        bridge.registerPlugin(plugin1);
        const result = bridge.registerPlugin(plugin2, { override: true });

        expect(result).toBe(true);
        expect(bridge.getPluginAPI<{ foo: string }>("test")?.foo).toBe("baz");
      });

      it("emits plugin:registered event", () => {
        const listener = jest.fn();
        bridge.on("plugin:registered", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "plugin:registered",
            pluginId: "test",
          }),
        );
      });

      it("auto-initializes with option", async () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin, { autoInitialize: true });

        // Wait for async initialization
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(plugin.initialize).toHaveBeenCalled();
      });

      it("handles unsupported platform with fallbacks disabled", () => {
        bridge.configure({ enableFallbacks: false });
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            supportedPlatforms: [Platform.ELECTRON],
          },
        );

        const result = bridge.registerPlugin(plugin);
        expect(result).toBe(false);
      });

      it("allows unsupported platform with fallbacks enabled", () => {
        bridge.configure({ enableFallbacks: true });
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            supportedPlatforms: [Platform.ELECTRON],
          },
        );

        const result = bridge.registerPlugin(plugin);
        expect(result).toBe(true);
      });
    });

    describe("unregisterPlugin", () => {
      it("unregisters a plugin", async () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        const result = await bridge.unregisterPlugin("test");

        expect(result).toBe(true);
        expect(bridge.hasPlugin("test")).toBe(false);
      });

      it("returns false for non-existent plugin", async () => {
        const result = await bridge.unregisterPlugin("nonexistent");
        expect(result).toBe(false);
      });

      it("calls cleanup function", async () => {
        const cleanup = jest.fn().mockResolvedValue(undefined);
        const plugin = createTestPlugin("test", { foo: "bar" }, { cleanup });
        bridge.registerPlugin(plugin);

        await bridge.unregisterPlugin("test");

        expect(cleanup).toHaveBeenCalled();
      });

      it("emits plugin:removed event", async () => {
        const listener = jest.fn();
        bridge.on("plugin:removed", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);
        await bridge.unregisterPlugin("test");

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "plugin:removed",
            pluginId: "test",
          }),
        );
      });

      it("handles cleanup errors gracefully", async () => {
        const cleanup = jest.fn().mockRejectedValue(new Error("Cleanup error"));
        const plugin = createTestPlugin("test", { foo: "bar" }, { cleanup });
        bridge.registerPlugin(plugin);

        const result = await bridge.unregisterPlugin("test");

        expect(result).toBe(true);
        expect(bridge.hasPlugin("test")).toBe(false);
      });
    });

    describe("initializePlugin", () => {
      it("initializes a plugin", async () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        const result = await bridge.initializePlugin("test");

        expect(result).toBe(true);
        expect(plugin.initialize).toHaveBeenCalled();
        expect(bridge.isPluginInitialized("test")).toBe(true);
      });

      it("returns false for non-existent plugin", async () => {
        const result = await bridge.initializePlugin("nonexistent");
        expect(result).toBe(false);
      });

      it("returns true for already initialized plugin", async () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        await bridge.initializePlugin("test");
        const result = await bridge.initializePlugin("test");

        expect(result).toBe(true);
        expect(plugin.initialize).toHaveBeenCalledTimes(1);
      });

      it("emits plugin:initialized event", async () => {
        const listener = jest.fn();
        bridge.on("plugin:initialized", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);
        await bridge.initializePlugin("test");

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "plugin:initialized",
            pluginId: "test",
          }),
        );
      });

      it("handles initialization errors", async () => {
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            initialize: jest.fn().mockRejectedValue(new Error("Init error")),
          },
        );
        bridge.registerPlugin(plugin);

        const result = await bridge.initializePlugin("test");

        expect(result).toBe(false);
        expect(bridge.isPluginInitialized("test")).toBe(false);
      });

      it("emits plugin:error event on failure", async () => {
        const listener = jest.fn();
        bridge.on("plugin:error", listener);

        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            initialize: jest.fn().mockRejectedValue(new Error("Init error")),
          },
        );
        bridge.registerPlugin(plugin);
        await bridge.initializePlugin("test");

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "plugin:error",
            pluginId: "test",
            error: expect.any(Error),
          }),
        );
      });

      it("times out slow initialization", async () => {
        bridge.configure({ initTimeout: 50 });
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            initialize: jest
              .fn()
              .mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 200)),
              ),
          },
        );
        bridge.registerPlugin(plugin);

        const result = await bridge.initializePlugin("test");

        expect(result).toBe(false);
        expect(bridge.getPluginState("test")?.error?.message).toContain(
          "timeout",
        );
      });
    });

    describe("initializeAllPlugins", () => {
      it("initializes all plugins", async () => {
        const plugin1 = createTestPlugin("test1", { foo: "bar" });
        const plugin2 = createTestPlugin("test2", { baz: "qux" });

        bridge.registerPlugin(plugin1);
        bridge.registerPlugin(plugin2);

        const results = await bridge.initializeAllPlugins();

        expect(results.get("test1")).toBe(true);
        expect(results.get("test2")).toBe(true);
      });

      it("returns map with success/failure for each plugin", async () => {
        const plugin1 = createTestPlugin("test1", { foo: "bar" });
        const plugin2 = createTestPlugin(
          "test2",
          { baz: "qux" },
          {
            initialize: jest.fn().mockRejectedValue(new Error("Failed")),
          },
        );

        bridge.registerPlugin(plugin1);
        bridge.registerPlugin(plugin2);

        const results = await bridge.initializeAllPlugins();

        expect(results.get("test1")).toBe(true);
        expect(results.get("test2")).toBe(false);
      });
    });

    describe("getPlugin", () => {
      it("returns the plugin", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        const result = bridge.getPlugin("test");
        expect(result).toBe(plugin);
      });

      it("returns undefined for non-existent plugin", () => {
        const result = bridge.getPlugin("nonexistent");
        expect(result).toBeUndefined();
      });
    });

    describe("getPluginAPI", () => {
      it("returns the plugin API", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        const api = bridge.getPluginAPI<{ foo: string }>("test");
        expect(api?.foo).toBe("bar");
      });

      it("returns undefined for non-existent plugin", () => {
        const api = bridge.getPluginAPI("nonexistent");
        expect(api).toBeUndefined();
      });

      it("returns undefined for unavailable plugin", () => {
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            isAvailable: jest.fn().mockReturnValue(false),
          },
        );
        bridge.registerPlugin(plugin);

        const api = bridge.getPluginAPI("test");
        expect(api).toBeUndefined();
      });
    });

    describe("hasPlugin", () => {
      it("returns true for registered plugin", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(bridge.hasPlugin("test")).toBe(true);
      });

      it("returns false for non-existent plugin", () => {
        expect(bridge.hasPlugin("nonexistent")).toBe(false);
      });
    });

    describe("isPluginAvailable", () => {
      it("returns true for available plugin", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(bridge.isPluginAvailable("test")).toBe(true);
      });

      it("returns false for unavailable plugin", () => {
        const plugin = createTestPlugin(
          "test",
          { foo: "bar" },
          {
            isAvailable: jest.fn().mockReturnValue(false),
          },
        );
        bridge.registerPlugin(plugin);

        expect(bridge.isPluginAvailable("test")).toBe(false);
      });

      it("returns false for non-existent plugin", () => {
        expect(bridge.isPluginAvailable("nonexistent")).toBe(false);
      });
    });

    describe("isPluginInitialized", () => {
      it("returns true for initialized plugin", async () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);
        await bridge.initializePlugin("test");

        expect(bridge.isPluginInitialized("test")).toBe(true);
      });

      it("returns false for uninitialized plugin", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(bridge.isPluginInitialized("test")).toBe(false);
      });

      it("returns false for non-existent plugin", () => {
        expect(bridge.isPluginInitialized("nonexistent")).toBe(false);
      });
    });

    describe("getPluginState", () => {
      it("returns plugin state", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        const state = bridge.getPluginState("test");
        expect(state).toEqual({
          initialized: false,
          available: true,
        });
      });

      it("returns undefined for non-existent plugin", () => {
        const state = bridge.getPluginState("nonexistent");
        expect(state).toBeUndefined();
      });
    });

    describe("getPluginIds", () => {
      it("returns all plugin IDs", () => {
        bridge.registerPlugin(createTestPlugin("test1", { a: 1 }));
        bridge.registerPlugin(createTestPlugin("test2", { b: 2 }));

        const ids = bridge.getPluginIds();
        expect(ids).toEqual(["test1", "test2"]);
      });

      it("returns empty array when no plugins", () => {
        const ids = bridge.getPluginIds();
        expect(ids).toEqual([]);
      });
    });

    describe("getAllPlugins", () => {
      it("returns all plugins", () => {
        const plugin1 = createTestPlugin("test1", { a: 1 });
        const plugin2 = createTestPlugin("test2", { b: 2 });

        bridge.registerPlugin(plugin1);
        bridge.registerPlugin(plugin2);

        const plugins = bridge.getAllPlugins();
        expect(plugins).toHaveLength(2);
        expect(plugins).toContain(plugin1);
        expect(plugins).toContain(plugin2);
      });
    });

    describe("getPlatform", () => {
      it("returns current platform", () => {
        const platform = bridge.getPlatform();
        expect(platform).toBe(Platform.WEB);
      });
    });

    describe("isNativePlatform", () => {
      it("returns false for web", () => {
        expect(bridge.isNativePlatform()).toBe(false);
      });
    });

    describe("event handling", () => {
      it("subscribes to events", () => {
        const listener = jest.fn();
        bridge.on("plugin:registered", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(listener).toHaveBeenCalled();
      });

      it("unsubscribes from events", () => {
        const listener = jest.fn();
        bridge.on("plugin:registered", listener);
        bridge.off("plugin:registered", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(listener).not.toHaveBeenCalled();
      });

      it("returns unsubscribe function from on()", () => {
        const listener = jest.fn();
        const unsubscribe = bridge.on("plugin:registered", listener);

        unsubscribe();

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(listener).not.toHaveBeenCalled();
      });

      it("handles multiple listeners", () => {
        const listener1 = jest.fn();
        const listener2 = jest.fn();

        bridge.on("plugin:registered", listener1);
        bridge.on("plugin:registered", listener2);

        const plugin = createTestPlugin("test", { foo: "bar" });
        bridge.registerPlugin(plugin);

        expect(listener1).toHaveBeenCalled();
        expect(listener2).toHaveBeenCalled();
      });

      it("handles listener errors gracefully", () => {
        const errorListener = jest.fn().mockImplementation(() => {
          throw new Error("Listener error");
        });
        const normalListener = jest.fn();

        bridge.on("plugin:registered", errorListener);
        bridge.on("plugin:registered", normalListener);

        const plugin = createTestPlugin("test", { foo: "bar" });

        // Should not throw
        expect(() => bridge.registerPlugin(plugin)).not.toThrow();
        expect(normalListener).toHaveBeenCalled();
      });
    });

    describe("reset", () => {
      it("clears all plugins", () => {
        bridge.registerPlugin(createTestPlugin("test", { foo: "bar" }));
        bridge.reset();

        expect(bridge.hasPlugin("test")).toBe(false);
      });

      it("clears all event listeners", () => {
        const listener = jest.fn();
        bridge.on("plugin:registered", listener);
        bridge.reset();

        bridge.registerPlugin(createTestPlugin("test", { foo: "bar" }));
        expect(listener).not.toHaveBeenCalled();
      });

      it("resets initialized state", async () => {
        await bridge.initialize();
        bridge.reset();

        expect(bridge.isInitialized()).toBe(false);
      });
    });

    describe("configure", () => {
      it("updates configuration", () => {
        bridge.configure({ debug: true });
        expect(bridge.getConfig().debug).toBe(true);
      });

      it("merges with existing configuration", () => {
        bridge.configure({ debug: true });
        bridge.configure({ enableFallbacks: false });

        const config = bridge.getConfig();
        expect(config.debug).toBe(true);
        expect(config.enableFallbacks).toBe(false);
      });
    });

    describe("getConfig", () => {
      it("returns a copy of configuration", () => {
        const config = bridge.getConfig();
        config.debug = true;

        expect(bridge.getConfig().debug).toBe(false);
      });
    });
  });

  describe("createPlugin", () => {
    it("creates a plugin with default isAvailable", () => {
      const plugin = createPlugin({
        id: "test",
        name: "Test Plugin",
        version: "1.0.0",
        supportedPlatforms: [Platform.WEB],
        initialize: async () => {},
        api: { foo: "bar" },
      });

      expect(plugin.isAvailable()).toBe(true);
    });

    it("uses provided isAvailable function", () => {
      const plugin = createPlugin({
        id: "test",
        name: "Test Plugin",
        version: "1.0.0",
        supportedPlatforms: [Platform.WEB],
        initialize: async () => {},
        api: { foo: "bar" },
        isAvailable: () => false,
      });

      expect(plugin.isAvailable()).toBe(false);
    });
  });

  describe("createFallbackPlugin", () => {
    it("creates a plugin that supports all platforms", () => {
      const plugin = createFallbackPlugin("test", "Test Plugin", {
        foo: "bar",
      });

      expect(plugin.supportedPlatforms).toContain(Platform.WEB);
      expect(plugin.supportedPlatforms).toContain(Platform.IOS);
      expect(plugin.supportedPlatforms).toContain(Platform.ANDROID);
      expect(plugin.supportedPlatforms).toContain(Platform.ELECTRON);
      expect(plugin.supportedPlatforms).toContain(Platform.TAURI);
    });

    it("uses default version", () => {
      const plugin = createFallbackPlugin("test", "Test Plugin", {
        foo: "bar",
      });
      expect(plugin.version).toBe("1.0.0");
    });

    it("uses custom version", () => {
      const plugin = createFallbackPlugin(
        "test",
        "Test Plugin",
        { foo: "bar" },
        {
          version: "2.0.0",
        },
      );
      expect(plugin.version).toBe("2.0.0");
    });

    it("uses default initialize", async () => {
      const plugin = createFallbackPlugin("test", "Test Plugin", {
        foo: "bar",
      });
      await expect(plugin.initialize()).resolves.toBeUndefined();
    });

    it("uses custom initialize", async () => {
      const initialize = jest.fn().mockResolvedValue(undefined);
      const plugin = createFallbackPlugin(
        "test",
        "Test Plugin",
        { foo: "bar" },
        {
          initialize,
        },
      );

      await plugin.initialize();
      expect(initialize).toHaveBeenCalled();
    });

    it("uses custom cleanup", async () => {
      const cleanup = jest.fn().mockResolvedValue(undefined);
      const plugin = createFallbackPlugin(
        "test",
        "Test Plugin",
        { foo: "bar" },
        {
          cleanup,
        },
      );

      await plugin.cleanup?.();
      expect(cleanup).toHaveBeenCalled();
    });

    it("uses default isAvailable based on isBrowser", () => {
      const plugin = createFallbackPlugin("test", "Test Plugin", {
        foo: "bar",
      });
      expect(plugin.isAvailable()).toBe(true);
    });

    it("uses custom isAvailable", () => {
      const plugin = createFallbackPlugin(
        "test",
        "Test Plugin",
        { foo: "bar" },
        {
          isAvailable: () => false,
        },
      );
      expect(plugin.isAvailable()).toBe(false);
    });
  });

  describe("Convenience functions", () => {
    describe("registerPlugin", () => {
      it("registers plugin via convenience function", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        const result = registerPlugin(plugin);

        expect(result).toBe(true);
        expect(getNativeBridge().hasPlugin("test")).toBe(true);
      });
    });

    describe("getPluginAPI", () => {
      it("gets plugin API via convenience function", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        registerPlugin(plugin);

        const api = getPluginAPI<{ foo: string }>("test");
        expect(api?.foo).toBe("bar");
      });
    });

    describe("isPluginAvailable", () => {
      it("checks availability via convenience function", () => {
        const plugin = createTestPlugin("test", { foo: "bar" });
        registerPlugin(plugin);

        expect(isPluginAvailable("test")).toBe(true);
      });
    });

    describe("onBridgeEvent", () => {
      it("subscribes to events via convenience function", () => {
        const listener = jest.fn();
        onBridgeEvent("plugin:registered", listener);

        const plugin = createTestPlugin("test", { foo: "bar" });
        registerPlugin(plugin);

        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe("NativeBridge namespace", () => {
    it("exports getInstance", () => {
      expect(NativeBridge.getInstance).toBe(getNativeBridge);
    });

    it("exports reset", () => {
      expect(NativeBridge.reset).toBe(resetNativeBridge);
    });

    it("exports createPlugin", () => {
      expect(NativeBridge.createPlugin).toBe(createPlugin);
    });

    it("exports createFallbackPlugin", () => {
      expect(NativeBridge.createFallbackPlugin).toBe(createFallbackPlugin);
    });

    it("exports registerPlugin", () => {
      expect(NativeBridge.registerPlugin).toBe(registerPlugin);
    });

    it("exports getPluginAPI", () => {
      expect(NativeBridge.getPluginAPI).toBe(getPluginAPI);
    });

    it("exports isPluginAvailable", () => {
      expect(NativeBridge.isPluginAvailable).toBe(isPluginAvailable);
    });

    it("exports onBridgeEvent", () => {
      expect(NativeBridge.onBridgeEvent).toBe(onBridgeEvent);
    });
  });
});
