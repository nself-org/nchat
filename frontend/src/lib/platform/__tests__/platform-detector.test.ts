/**
 * Platform Detector Tests
 */

import {
  Platform,
  detectPlatform,
  isServer,
  isBrowser,
  isWeb,
  isNative,
  isMobile,
  isDesktop,
  isIOS,
  isAndroid,
  isElectron,
  isTauri,
  isCapacitor,
  getPlatformCapabilities,
  hasCapability,
  hasNotificationAPI,
  hasShareAPI,
  hasClipboardAPI,
  hasGeolocationAPI,
  hasMediaDevicesAPI,
  hasServiceWorkerAPI,
  hasIndexedDB,
  hasLocalStorage,
  hasFileSystemAccessAPI,
  hasVibrationAPI,
  hasNetworkInformationAPI,
  getPlatformVersion,
  getPlatformName,
  getPlatformCategory,
  getPlatformClassName,
  PlatformDetector,
} from "../platform-detector";

// ============================================================================
// Mock Setup
// ============================================================================

const originalWindow = global.window;
const originalNavigator = global.navigator;

function mockWindow(
  overrides: Partial<
    Window & { __TAURI__?: unknown; electron?: unknown; Capacitor?: unknown }
  > = {},
) {
  // Build base navigator with only essential properties
  const baseNav: Record<string, any> = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
  };

  // Merge with provided navigator overrides, filtering out undefined values
  const mockNav: Record<string, any> = { ...baseNav };
  if (overrides.navigator) {
    Object.entries(overrides.navigator).forEach(([key, value]) => {
      if (value !== undefined) {
        mockNav[key] = value;
      }
    });
  }

  // Build base window object with essential properties
  const baseWin: Record<string, any> = {
    navigator: mockNav,
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
  };

  // Apply overrides, filtering out undefined values to allow property removal
  Object.entries(overrides).forEach(([key, value]) => {
    if (key !== "navigator" && value !== undefined) {
      baseWin[key] = value;
    }
  });

  const mockWin = baseWin as unknown as Window & typeof globalThis;

  Object.defineProperty(global, "window", {
    value: mockWin,
    writable: true,
    configurable: true,
  });

  return mockWin;
}

function unmockWindow() {
  Object.defineProperty(global, "window", {
    value: originalWindow,
    writable: true,
    configurable: true,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("Platform Detector", () => {
  afterEach(() => {
    unmockWindow();
  });

  describe("isServer", () => {
    it("returns true when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isServer()).toBe(true);
    });

    it("returns false when window is defined", () => {
      mockWindow();
      expect(isServer()).toBe(false);
    });
  });

  describe("isBrowser", () => {
    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isBrowser()).toBe(false);
    });

    it("returns true when window is defined", () => {
      mockWindow();
      expect(isBrowser()).toBe(true);
    });
  });

  describe("isTauri", () => {
    it("returns true when __TAURI__ is present", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      expect(isTauri()).toBe(true);
    });

    it("returns false when __TAURI__ is not present", () => {
      mockWindow();
      expect(isTauri()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isTauri()).toBe(false);
    });
  });

  describe("isElectron", () => {
    it("returns true when electron is present on window", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      expect(isElectron()).toBe(true);
    });

    it("returns true when electron is in user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 Electron/20.0.0",
          platform: "MacIntel",
          maxTouchPoints: 0,
        } as Navigator,
      });
      expect(isElectron()).toBe(true);
    });

    it("returns false when not in electron", () => {
      mockWindow();
      expect(isElectron()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isElectron()).toBe(false);
    });
  });

  describe("isCapacitor", () => {
    it("returns true when Capacitor.isNativePlatform returns true", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      expect(isCapacitor()).toBe(true);
    });

    it("returns false when Capacitor.isNativePlatform returns false", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => false,
          getPlatform: () => "web",
        },
      });
      expect(isCapacitor()).toBe(false);
    });

    it("returns false when Capacitor is not present", () => {
      mockWindow();
      expect(isCapacitor()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isCapacitor()).toBe(false);
    });
  });

  describe("isIOS", () => {
    it("returns true for iPhone user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isIOS()).toBe(true);
    });

    it("returns true for iPad user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPad; CPU OS 14_5 like Mac OS X)",
          platform: "iPad",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isIOS()).toBe(true);
    });

    it("returns true for iPod user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPod; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPod",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isIOS()).toBe(true);
    });

    it("returns true for iPad with desktop user agent (macOS touch)", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          platform: "MacIntel",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isIOS()).toBe(true);
    });

    it("returns true for Capacitor iOS", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      expect(isIOS()).toBe(true);
    });

    it("returns false for Android user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isIOS()).toBe(false);
    });

    it("returns false for desktop", () => {
      mockWindow();
      expect(isIOS()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isIOS()).toBe(false);
    });
  });

  describe("isAndroid", () => {
    it("returns true for Android user agent", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isAndroid()).toBe(true);
    });

    it("returns true for Capacitor Android", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "android",
        },
      });
      expect(isAndroid()).toBe(true);
    });

    it("returns false for iOS", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isAndroid()).toBe(false);
    });

    it("returns false for desktop", () => {
      mockWindow();
      expect(isAndroid()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isAndroid()).toBe(false);
    });
  });

  describe("isMobile", () => {
    it("returns true for iOS", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isMobile()).toBe(true);
    });

    it("returns true for Android", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isMobile()).toBe(true);
    });

    it("returns false for desktop", () => {
      mockWindow();
      expect(isMobile()).toBe(false);
    });
  });

  describe("isDesktop", () => {
    it("returns true for Electron", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      expect(isDesktop()).toBe(true);
    });

    it("returns true for Tauri", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      expect(isDesktop()).toBe(true);
    });

    it("returns true for desktop browser", () => {
      mockWindow();
      expect(isDesktop()).toBe(true);
    });

    it("returns false for mobile", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(isDesktop()).toBe(false);
    });
  });

  describe("isNative", () => {
    it("returns true for Electron", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      expect(isNative()).toBe(true);
    });

    it("returns true for Tauri", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      expect(isNative()).toBe(true);
    });

    it("returns true for Capacitor", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      expect(isNative()).toBe(true);
    });

    it("returns false for web browser", () => {
      mockWindow();
      expect(isNative()).toBe(false);
    });
  });

  describe("isWeb", () => {
    it("returns true for standard web browser", () => {
      mockWindow();
      expect(isWeb()).toBe(true);
    });

    it("returns false for Electron", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      expect(isWeb()).toBe(false);
    });

    it("returns false for Tauri", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      expect(isWeb()).toBe(false);
    });

    it("returns false for Capacitor", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      expect(isWeb()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(isWeb()).toBe(false);
    });
  });

  describe("detectPlatform", () => {
    it("returns WEB on server", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(detectPlatform()).toBe(Platform.WEB);
    });

    it("returns TAURI when __TAURI__ is present", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      expect(detectPlatform()).toBe(Platform.TAURI);
    });

    it("returns ELECTRON when electron is present", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      expect(detectPlatform()).toBe(Platform.ELECTRON);
    });

    it("returns IOS for native iOS (Capacitor)", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      expect(detectPlatform()).toBe(Platform.IOS);
    });

    it("returns ANDROID for native Android (Capacitor)", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "android",
        },
      });
      expect(detectPlatform()).toBe(Platform.ANDROID);
    });

    it("returns IOS for mobile iOS web", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(detectPlatform()).toBe(Platform.IOS);
    });

    it("returns ANDROID for mobile Android web", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(detectPlatform()).toBe(Platform.ANDROID);
    });

    it("returns WEB for desktop browser", () => {
      mockWindow();
      expect(detectPlatform()).toBe(Platform.WEB);
    });
  });

  describe("API detection functions", () => {
    describe("hasNotificationAPI", () => {
      it("returns true when Notification is available", () => {
        mockWindow({ Notification: jest.fn() });
        expect(hasNotificationAPI()).toBe(true);
      });

      it("returns false when Notification is not available", () => {
        mockWindow({ Notification: undefined } as unknown as Partial<Window>);
        expect(hasNotificationAPI()).toBe(false);
      });

      it("returns false when window is undefined", () => {
        Object.defineProperty(global, "window", {
          value: undefined,
          writable: true,
          configurable: true,
        });
        expect(hasNotificationAPI()).toBe(false);
      });
    });

    describe("hasShareAPI", () => {
      it("returns true when navigator.share is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            share: jest.fn(),
          } as unknown as Navigator,
        });
        expect(hasShareAPI()).toBe(true);
      });

      it("returns false when navigator.share is not available", () => {
        mockWindow();
        expect(hasShareAPI()).toBe(false);
      });
    });

    describe("hasClipboardAPI", () => {
      it("returns true when navigator.clipboard is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            clipboard: { writeText: jest.fn(), readText: jest.fn() },
          } as unknown as Navigator,
        });
        expect(hasClipboardAPI()).toBe(true);
      });

      it("returns false when navigator.clipboard is not available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            clipboard: undefined,
          } as unknown as Navigator,
        });
        expect(hasClipboardAPI()).toBe(false);
      });
    });

    describe("hasGeolocationAPI", () => {
      it("returns true when navigator.geolocation is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            geolocation: { getCurrentPosition: jest.fn() },
          } as unknown as Navigator,
        });
        expect(hasGeolocationAPI()).toBe(true);
      });

      it("returns false when navigator.geolocation is not available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            geolocation: undefined,
          } as unknown as Navigator,
        });
        expect(hasGeolocationAPI()).toBe(false);
      });
    });

    describe("hasMediaDevicesAPI", () => {
      it("returns true when navigator.mediaDevices is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            mediaDevices: { getUserMedia: jest.fn() },
          } as unknown as Navigator,
        });
        expect(hasMediaDevicesAPI()).toBe(true);
      });

      it("returns false when navigator.mediaDevices is not available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            mediaDevices: undefined,
          } as unknown as Navigator,
        });
        expect(hasMediaDevicesAPI()).toBe(false);
      });
    });

    describe("hasServiceWorkerAPI", () => {
      it("returns true when serviceWorker is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            serviceWorker: {},
          } as unknown as Navigator,
        });
        expect(hasServiceWorkerAPI()).toBe(true);
      });

      it("returns false when serviceWorker is not available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            serviceWorker: undefined,
          } as unknown as Navigator,
        });
        expect(hasServiceWorkerAPI()).toBe(false);
      });
    });

    describe("hasIndexedDB", () => {
      it("returns true when indexedDB is available", () => {
        mockWindow({ indexedDB: {} });
        expect(hasIndexedDB()).toBe(true);
      });

      it("returns false when indexedDB is not available", () => {
        mockWindow({ indexedDB: undefined } as unknown as Partial<Window>);
        expect(hasIndexedDB()).toBe(false);
      });
    });

    describe("hasLocalStorage", () => {
      it("returns true when localStorage is functional", () => {
        mockWindow({
          localStorage: {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
          },
        } as unknown as Partial<Window>);
        expect(hasLocalStorage()).toBe(true);
      });

      it("returns false when localStorage throws", () => {
        mockWindow({
          localStorage: {
            getItem: jest.fn(),
            setItem: jest.fn().mockImplementation(() => {
              throw new Error("Storage full");
            }),
            removeItem: jest.fn(),
          },
        } as unknown as Partial<Window>);
        expect(hasLocalStorage()).toBe(false);
      });

      it("returns false when window is undefined", () => {
        Object.defineProperty(global, "window", {
          value: undefined,
          writable: true,
          configurable: true,
        });
        expect(hasLocalStorage()).toBe(false);
      });
    });

    describe("hasFileSystemAccessAPI", () => {
      it("returns true when showOpenFilePicker is available", () => {
        mockWindow({ showOpenFilePicker: jest.fn() });
        expect(hasFileSystemAccessAPI()).toBe(true);
      });

      it("returns false when showOpenFilePicker is not available", () => {
        mockWindow();
        expect(hasFileSystemAccessAPI()).toBe(false);
      });
    });

    describe("hasVibrationAPI", () => {
      it("returns true when navigator.vibrate is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            vibrate: jest.fn(),
          } as unknown as Navigator,
        });
        expect(hasVibrationAPI()).toBe(true);
      });

      it("returns false when navigator.vibrate is not available", () => {
        mockWindow();
        expect(hasVibrationAPI()).toBe(false);
      });
    });

    describe("hasNetworkInformationAPI", () => {
      it("returns true when navigator.connection is available", () => {
        mockWindow({
          navigator: {
            userAgent: "Mozilla/5.0",
            platform: "MacIntel",
            maxTouchPoints: 0,
            connection: {},
          } as unknown as Navigator,
        });
        expect(hasNetworkInformationAPI()).toBe(true);
      });

      it("returns false when navigator.connection is not available", () => {
        mockWindow();
        expect(hasNetworkInformationAPI()).toBe(false);
      });
    });
  });

  describe("getPlatformCapabilities", () => {
    it("returns correct capabilities for web", () => {
      mockWindow();
      const caps = getPlatformCapabilities();

      expect(caps).toBeDefined();
      expect(typeof caps.pushNotifications).toBe("boolean");
      expect(typeof caps.biometricAuth).toBe("boolean");
      expect(typeof caps.fileSystem).toBe("boolean");
      expect(typeof caps.camera).toBe("boolean");
    });

    it("returns enhanced capabilities for Electron", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      const caps = getPlatformCapabilities();

      expect(caps.fileSystem).toBe(true);
      expect(caps.deepLinks).toBe(true);
      expect(caps.systemTray).toBe(true);
      expect(caps.nativeWindow).toBe(true);
    });

    it("returns enhanced capabilities for Tauri", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      const caps = getPlatformCapabilities();

      expect(caps.fileSystem).toBe(true);
      expect(caps.deepLinks).toBe(true);
      expect(caps.systemTray).toBe(true);
      expect(caps.nativeWindow).toBe(true);
    });

    it("returns enhanced capabilities for iOS", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const caps = getPlatformCapabilities();

      expect(caps.biometricAuth).toBe(true);
      expect(caps.deepLinks).toBe(true);
      expect(caps.haptics).toBe(true);
    });

    it("returns enhanced capabilities for Android", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const caps = getPlatformCapabilities();

      expect(caps.biometricAuth).toBe(true);
      expect(caps.deepLinks).toBe(true);
      expect(caps.haptics).toBe(true);
    });

    it("returns file system capability for Capacitor iOS", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "ios",
        },
      });
      const caps = getPlatformCapabilities();

      expect(caps.fileSystem).toBe(true);
    });

    it("returns file system capability for Capacitor Android", () => {
      mockWindow({
        Capacitor: {
          isNativePlatform: () => true,
          getPlatform: () => "android",
        },
      });
      const caps = getPlatformCapabilities();

      expect(caps.fileSystem).toBe(true);
    });
  });

  describe("hasCapability", () => {
    it("returns correct value for pushNotifications", () => {
      mockWindow({ Notification: jest.fn() });
      expect(hasCapability("pushNotifications")).toBe(true);
    });

    it("returns correct value for clipboard", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0",
          platform: "MacIntel",
          maxTouchPoints: 0,
          clipboard: { writeText: jest.fn(), readText: jest.fn() },
        } as unknown as Navigator,
      });
      expect(hasCapability("clipboard")).toBe(true);
    });

    it("returns false when capability is not available", () => {
      mockWindow({ Notification: undefined } as unknown as Partial<Window>);
      expect(hasCapability("systemTray")).toBe(false);
    });
  });

  describe("getPlatformVersion", () => {
    it("returns correct version info for web", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
          platform: "MacIntel",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.platform).toBe(Platform.WEB);
      expect(version.browserVersion).toContain("Chrome");
      expect(version.deviceModel).toBe("Mac");
    });

    it("returns correct version info for iOS", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.platform).toBe(Platform.IOS);
      expect(version.osVersion).toBe("14.5");
      expect(version.deviceModel).toBe("iPhone");
    });

    it("returns correct version info for Android", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RQ3A.210905.001)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.platform).toBe(Platform.ANDROID);
      expect(version.osVersion).toBe("11");
      expect(version.deviceModel).toBe("Pixel 5");
    });

    it("returns correct version info for Electron", () => {
      mockWindow({
        electron: { version: "20.0.0", platform: "darwin" },
      });
      const version = getPlatformVersion();

      expect(version.platform).toBe(Platform.ELECTRON);
      expect(version.appVersion).toBe("20.0.0");
      expect(version.osVersion).toBe("darwin");
    });

    it("returns correct version info for Tauri", () => {
      mockWindow({
        __TAURI__: { version: "1.2.0" },
      });
      const version = getPlatformVersion();

      expect(version.platform).toBe(Platform.TAURI);
      expect(version.appVersion).toBe("1.2.0");
    });

    it("parses Firefox browser version", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0",
          platform: "Win32",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.browserVersion).toContain("Firefox");
      expect(version.deviceModel).toBe("Windows PC");
    });

    it("parses Safari browser version", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15",
          platform: "MacIntel",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.browserVersion).toContain("Safari");
    });

    it("parses Edge browser version", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62",
          platform: "Win32",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.browserVersion).toContain("Edge");
    });

    it("parses Opera browser version", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 OPR/82.0.4227.43",
          platform: "Win32",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.browserVersion).toContain("Opera");
    });

    it("detects Linux PC", () => {
      mockWindow({
        navigator: {
          userAgent:
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
          platform: "Linux x86_64",
          maxTouchPoints: 0,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.deviceModel).toBe("Linux PC");
    });

    it("detects iPad device", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPad; CPU OS 14_5 like Mac OS X)",
          platform: "iPad",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.deviceModel).toBe("iPad");
    });

    it("detects iPod device", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPod; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPod",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.deviceModel).toBe("iPod");
    });

    it("parses iOS version with three parts", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5_1 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const version = getPlatformVersion();

      expect(version.osVersion).toBe("14.5.1");
    });
  });

  describe("getPlatformName", () => {
    it("returns correct name for WEB", () => {
      expect(getPlatformName(Platform.WEB)).toBe("Web Browser");
    });

    it("returns correct name for IOS", () => {
      expect(getPlatformName(Platform.IOS)).toBe("iOS");
    });

    it("returns correct name for ANDROID", () => {
      expect(getPlatformName(Platform.ANDROID)).toBe("Android");
    });

    it("returns correct name for ELECTRON", () => {
      expect(getPlatformName(Platform.ELECTRON)).toBe("Desktop (Electron)");
    });

    it("returns correct name for TAURI", () => {
      expect(getPlatformName(Platform.TAURI)).toBe("Desktop (Tauri)");
    });

    it("uses current platform when no argument provided", () => {
      mockWindow();
      expect(getPlatformName()).toBe("Web Browser");
    });

    it("returns Unknown for undefined platform", () => {
      expect(getPlatformName("invalid" as Platform)).toBe("Unknown");
    });
  });

  describe("getPlatformCategory", () => {
    it("returns mobile for IOS", () => {
      expect(getPlatformCategory(Platform.IOS)).toBe("mobile");
    });

    it("returns mobile for ANDROID", () => {
      expect(getPlatformCategory(Platform.ANDROID)).toBe("mobile");
    });

    it("returns desktop for ELECTRON", () => {
      expect(getPlatformCategory(Platform.ELECTRON)).toBe("desktop");
    });

    it("returns desktop for TAURI", () => {
      expect(getPlatformCategory(Platform.TAURI)).toBe("desktop");
    });

    it("returns web for WEB on desktop", () => {
      mockWindow();
      expect(getPlatformCategory(Platform.WEB)).toBe("desktop");
    });

    it("returns mobile for web on mobile device", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      expect(getPlatformCategory()).toBe("mobile");
    });

    it("uses current platform when no argument provided", () => {
      mockWindow();
      expect(getPlatformCategory()).toBe("desktop");
    });
  });

  describe("getPlatformClassName", () => {
    it("returns correct class for web", () => {
      mockWindow();
      const className = getPlatformClassName();
      expect(className).toContain("platform-web");
      expect(className).toContain("platform-desktop");
    });

    it("returns correct class for iOS", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_5 like Mac OS X)",
          platform: "iPhone",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const className = getPlatformClassName();
      expect(className).toContain("platform-ios");
      expect(className).toContain("platform-mobile");
    });

    it("uses custom prefix", () => {
      mockWindow();
      const className = getPlatformClassName("nchat");
      expect(className).toContain("nchat-web");
      expect(className).toContain("nchat-desktop");
    });

    it("returns correct class for Electron", () => {
      mockWindow({ electron: { version: "1.0.0" } });
      const className = getPlatformClassName();
      expect(className).toContain("platform-electron");
      expect(className).toContain("platform-desktop");
    });

    it("returns correct class for Tauri", () => {
      mockWindow({ __TAURI__: { version: "1.0.0" } });
      const className = getPlatformClassName();
      expect(className).toContain("platform-tauri");
      expect(className).toContain("platform-desktop");
    });

    it("returns correct class for Android", () => {
      mockWindow({
        navigator: {
          userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
          platform: "Linux",
          maxTouchPoints: 5,
        } as Navigator,
      });
      const className = getPlatformClassName();
      expect(className).toContain("platform-android");
      expect(className).toContain("platform-mobile");
    });
  });

  describe("PlatformDetector namespace", () => {
    it("exports all detection functions", () => {
      expect(PlatformDetector.detectPlatform).toBe(detectPlatform);
      expect(PlatformDetector.isServer).toBe(isServer);
      expect(PlatformDetector.isBrowser).toBe(isBrowser);
      expect(PlatformDetector.isWeb).toBe(isWeb);
      expect(PlatformDetector.isNative).toBe(isNative);
      expect(PlatformDetector.isMobile).toBe(isMobile);
      expect(PlatformDetector.isDesktop).toBe(isDesktop);
      expect(PlatformDetector.isIOS).toBe(isIOS);
      expect(PlatformDetector.isAndroid).toBe(isAndroid);
      expect(PlatformDetector.isElectron).toBe(isElectron);
      expect(PlatformDetector.isTauri).toBe(isTauri);
      expect(PlatformDetector.isCapacitor).toBe(isCapacitor);
    });

    it("exports all capability functions", () => {
      expect(PlatformDetector.getPlatformCapabilities).toBe(
        getPlatformCapabilities,
      );
      expect(PlatformDetector.hasCapability).toBe(hasCapability);
      expect(PlatformDetector.hasNotificationAPI).toBe(hasNotificationAPI);
      expect(PlatformDetector.hasShareAPI).toBe(hasShareAPI);
      expect(PlatformDetector.hasClipboardAPI).toBe(hasClipboardAPI);
      expect(PlatformDetector.hasGeolocationAPI).toBe(hasGeolocationAPI);
      expect(PlatformDetector.hasMediaDevicesAPI).toBe(hasMediaDevicesAPI);
      expect(PlatformDetector.hasServiceWorkerAPI).toBe(hasServiceWorkerAPI);
      expect(PlatformDetector.hasIndexedDB).toBe(hasIndexedDB);
      expect(PlatformDetector.hasLocalStorage).toBe(hasLocalStorage);
      expect(PlatformDetector.hasFileSystemAccessAPI).toBe(
        hasFileSystemAccessAPI,
      );
      expect(PlatformDetector.hasVibrationAPI).toBe(hasVibrationAPI);
      expect(PlatformDetector.hasNetworkInformationAPI).toBe(
        hasNetworkInformationAPI,
      );
    });

    it("exports version and utility functions", () => {
      expect(PlatformDetector.getPlatformVersion).toBe(getPlatformVersion);
      expect(PlatformDetector.getPlatformName).toBe(getPlatformName);
      expect(PlatformDetector.getPlatformCategory).toBe(getPlatformCategory);
      expect(PlatformDetector.getPlatformClassName).toBe(getPlatformClassName);
    });
  });
});
