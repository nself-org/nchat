/**
 * Install Prompt Manager Tests
 *
 * Tests for the InstallPromptManager class including install detection,
 * prompt handling, and iOS-specific functionality.
 */

import {
  InstallPromptManager,
  getInstallPromptManager,
  resetInstallPromptManager,
  type BeforeInstallPromptEvent,
  type InstallEvent,
} from "../install-prompt";

// =============================================================================
// Mock Setup
// =============================================================================

describe("InstallPromptManager", () => {
  let manager: InstallPromptManager;
  let mockLocalStorage: Record<string, string>;
  let eventListeners: Record<string, Array<(e: Event) => void>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton
    resetInstallPromptManager();

    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(global, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock window
    eventListeners = {};
    Object.defineProperty(global, "window", {
      value: {
        addEventListener: jest.fn(
          (event: string, listener: (e: Event) => void) => {
            eventListeners[event] = eventListeners[event] || [];
            eventListeners[event].push(listener);
          },
        ),
        removeEventListener: jest.fn(
          (event: string, listener: (e: Event) => void) => {
            if (eventListeners[event]) {
              eventListeners[event] = eventListeners[event].filter(
                (l) => l !== listener,
              );
            }
          },
        ),
        matchMedia: jest.fn().mockReturnValue({
          matches: false,
        }),
        navigator: {
          standalone: false,
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.0.0 Safari/537.36",
      },
      writable: true,
      configurable: true,
    });

    // Create manager
    manager = new InstallPromptManager({ debug: false });
  });

  afterEach(() => {
    manager.destroy();
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("initialization", () => {
    it("should initialize successfully", () => {
      manager.initialize();

      expect(manager.isInitialized()).toBe(true);
    });

    it("should only initialize once", () => {
      manager.initialize();
      manager.initialize();

      expect(window.addEventListener).toHaveBeenCalledTimes(2); // beforeinstallprompt + appinstalled
    });

    it("should set up event listeners", () => {
      manager.initialize();

      expect(window.addEventListener).toHaveBeenCalledWith(
        "beforeinstallprompt",
        expect.any(Function),
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        "appinstalled",
        expect.any(Function),
      );
    });

    it("should detect installed state", () => {
      (window.matchMedia as jest.Mock).mockReturnValue({ matches: true });

      manager.initialize();

      expect(manager.getInstallState()).toBe("installed");
    });
  });

  describe("destroy", () => {
    it("should clean up resources", () => {
      manager.initialize();

      manager.destroy();

      expect(manager.isInitialized()).toBe(false);
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "beforeinstallprompt",
        expect.any(Function),
      );
    });
  });

  // ==========================================================================
  // Install State Tests
  // ==========================================================================

  describe("install state", () => {
    beforeEach(() => {
      manager.initialize();
    });

    describe("getInstallState", () => {
      it("should return unknown initially", () => {
        expect(manager.getInstallState()).toBe("unknown");
      });

      it("should return installable after beforeinstallprompt", () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn(),
          userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        } as unknown as BeforeInstallPromptEvent;

        // Trigger beforeinstallprompt
        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        expect(manager.getInstallState()).toBe("installable");
      });
    });

    describe("canInstall", () => {
      it("should return false initially", () => {
        expect(manager.canInstall()).toBe(false);
      });

      it("should return true when installable", () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn(),
          userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        expect(manager.canInstall()).toBe(true);
      });
    });

    describe("isInstalled", () => {
      it("should return false when not installed", () => {
        expect(manager.isInstalled()).toBe(false);
      });

      it("should return true in standalone mode", () => {
        (window.matchMedia as jest.Mock).mockReturnValue({ matches: true });

        expect(manager.isInstalled()).toBe(true);
      });
    });

    describe("isSupported", () => {
      it("should return true when supported", () => {
        expect(manager.isSupported()).toBe(true);
      });
    });

    describe("getPlatforms", () => {
      it("should return empty array initially", () => {
        expect(manager.getPlatforms()).toEqual([]);
      });

      it("should return platforms after prompt available", () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web", "android"],
          prompt: jest.fn(),
          userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        expect(manager.getPlatforms()).toEqual(["web", "android"]);
      });
    });
  });

  // ==========================================================================
  // Install Actions Tests
  // ==========================================================================

  describe("install actions", () => {
    beforeEach(() => {
      manager.initialize();
    });

    describe("promptInstall", () => {
      it("should return error when no prompt available", async () => {
        const result = await manager.promptInstall();

        expect(result.outcome).toBe("error");
        expect(result.error).toBeDefined();
      });

      it("should trigger install prompt when available", async () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn().mockResolvedValue(undefined),
          userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        const result = await manager.promptInstall();

        expect(mockPromptEvent.prompt).toHaveBeenCalled();
        expect(result.outcome).toBe("accepted");
        expect(result.platform).toBe("web");
      });

      it("should handle dismissed prompt", async () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn().mockResolvedValue(undefined),
          userChoice: Promise.resolve({
            outcome: "dismissed",
            platform: "web",
          }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        const result = await manager.promptInstall();

        expect(result.outcome).toBe("dismissed");
      });

      it("should save dismissed state", async () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn().mockResolvedValue(undefined),
          userChoice: Promise.resolve({
            outcome: "dismissed",
            platform: "web",
          }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        await manager.promptInstall();

        expect(localStorage.setItem).toHaveBeenCalled();
      });

      it("should handle prompt errors", async () => {
        const mockPromptEvent = {
          preventDefault: jest.fn(),
          platforms: ["web"],
          prompt: jest.fn().mockRejectedValue(new Error("Prompt failed")),
          userChoice: Promise.resolve({
            outcome: "dismissed",
            platform: "web",
          }),
        } as unknown as BeforeInstallPromptEvent;

        eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

        const result = await manager.promptInstall();

        expect(result.outcome).toBe("error");
        expect(result.error).toBeDefined();
      });
    });

    describe("isDismissed", () => {
      it("should return false when not dismissed", () => {
        expect(manager.isDismissed()).toBe(false);
      });

      it("should return true when recently dismissed", () => {
        mockLocalStorage["nchat-install-prompt-dismissed"] =
          Date.now().toString();

        expect(manager.isDismissed()).toBe(true);
      });

      it("should return false when dismissed long ago", () => {
        const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
        mockLocalStorage["nchat-install-prompt-dismissed"] = oldTime.toString();

        expect(manager.isDismissed()).toBe(false);
      });
    });

    describe("clearDismissed", () => {
      it("should clear dismissed state", () => {
        mockLocalStorage["nchat-install-prompt-dismissed"] =
          Date.now().toString();

        manager.clearDismissed();

        expect(localStorage.removeItem).toHaveBeenCalledWith(
          "nchat-install-prompt-dismissed",
        );
      });
    });
  });

  // ==========================================================================
  // iOS-specific Tests
  // ==========================================================================

  describe("iOS detection", () => {
    describe("isIOS", () => {
      it("should return false for non-iOS", () => {
        expect(manager.isIOS()).toBe(false);
      });

      it("should return true for iPhone", () => {
        Object.defineProperty(navigator, "userAgent", {
          value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          configurable: true,
        });

        expect(manager.isIOS()).toBe(true);
      });

      it("should return true for iPad", () => {
        Object.defineProperty(navigator, "userAgent", {
          value: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
          configurable: true,
        });

        expect(manager.isIOS()).toBe(true);
      });
    });

    describe("isSafari", () => {
      it("should return false for Chrome", () => {
        expect(manager.isSafari()).toBe(false);
      });

      it("should return true for Safari", () => {
        Object.defineProperty(navigator, "userAgent", {
          value:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15",
          configurable: true,
        });

        expect(manager.isSafari()).toBe(true);
      });
    });

    describe("getIOSInstructions", () => {
      it("should return installation instructions", () => {
        const instructions = manager.getIOSInstructions();

        expect(instructions).toBeInstanceOf(Array);
        expect(instructions.length).toBeGreaterThan(0);
        expect(instructions[0]).toContain("Share");
      });
    });
  });

  // ==========================================================================
  // Event System Tests
  // ==========================================================================

  describe("event system", () => {
    beforeEach(() => {
      manager.initialize();
    });

    it("should emit install_available event", () => {
      const events: InstallEvent[] = [];
      manager.subscribe((event) => events.push(event));

      const mockPromptEvent = {
        preventDefault: jest.fn(),
        platforms: ["web"],
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      } as unknown as BeforeInstallPromptEvent;

      eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);

      expect(events.some((e) => e.type === "install_available")).toBe(true);
    });

    it("should emit app_installed event", () => {
      const events: InstallEvent[] = [];
      manager.subscribe((event) => events.push(event));

      eventListeners["appinstalled"]?.[0]?.({} as Event);

      expect(events.some((e) => e.type === "app_installed")).toBe(true);
    });

    it("should allow unsubscribing", () => {
      const events: InstallEvent[] = [];
      const unsubscribe = manager.subscribe((event) => events.push(event));

      const mockPromptEvent = {
        preventDefault: jest.fn(),
        platforms: ["web"],
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
      } as unknown as BeforeInstallPromptEvent;

      eventListeners["beforeinstallprompt"]?.[0]?.(mockPromptEvent as Event);
      const countBefore = events.length;

      unsubscribe();

      eventListeners["appinstalled"]?.[0]?.({} as Event);

      expect(events.length).toBe(countBefore);
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("configuration", () => {
    it("should use default configuration", () => {
      const config = manager.getConfig();

      expect(config.showDelay).toBe(3000);
      expect(config.dismissDuration).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should allow updating configuration", () => {
      manager.setConfig({ showDelay: 5000 });

      const config = manager.getConfig();

      expect(config.showDelay).toBe(5000);
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return the same instance", () => {
      const instance1 = getInstallPromptManager();
      const instance2 = getInstallPromptManager();

      expect(instance1).toBe(instance2);
    });

    it("should reset the singleton", () => {
      const instance1 = getInstallPromptManager();

      resetInstallPromptManager();

      const instance2 = getInstallPromptManager();

      expect(instance1).not.toBe(instance2);
    });
  });
});
