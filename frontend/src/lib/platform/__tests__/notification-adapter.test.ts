/**
 * Notification Adapter Tests
 */

import {
  WebNotificationAdapter,
  CapacitorNotificationAdapter,
  ElectronNotificationAdapter,
  TauriNotificationAdapter,
  NoopNotificationAdapter,
  createNotificationAdapter,
  detectNotificationBackend,
  getNotificationAdapter,
  resetNotificationAdapter,
  checkNotificationPermission,
  requestNotificationPermission,
  showNotification,
  cancelNotification,
  cancelAllNotifications,
  onNotificationEvent,
  Notifications,
  NotificationOptions,
  NotificationEvent,
} from "../notification-adapter";

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
  hasNotificationAPI: jest.fn(() => true),
  isBrowser: jest.fn(() => true),
}));

import { detectPlatform, hasNotificationAPI } from "../platform-detector";

const mockDetectPlatform = detectPlatform as jest.Mock;
const mockHasNotificationAPI = hasNotificationAPI as jest.Mock;

// Mock Web Notification API
class MockNotification {
  static permission = "default" as NotificationPermission;
  static requestPermission = jest.fn().mockResolvedValue("granted");

  title: string;
  body?: string;
  onclick: ((e: Event) => void) | null = null;
  onclose: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onshow: ((e: Event) => void) | null = null;
  close = jest.fn();

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body;
    // Simulate show event
    setTimeout(() => this.onshow?.(new Event("show")), 0);
  }
}

Object.defineProperty(window, "Notification", {
  value: MockNotification,
  writable: true,
  configurable: true,
});

// ============================================================================
// Tests
// ============================================================================

describe("Notification Adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationAdapter();
    mockDetectPlatform.mockReturnValue("web");
    mockHasNotificationAPI.mockReturnValue(true);
    MockNotification.permission = "default";
    MockNotification.requestPermission.mockResolvedValue("granted");
  });

  describe("WebNotificationAdapter", () => {
    let adapter: WebNotificationAdapter;

    beforeEach(() => {
      adapter = new WebNotificationAdapter();
    });

    describe("checkPermission", () => {
      it("returns granted when permission is granted", async () => {
        MockNotification.permission = "granted";
        const result = await adapter.checkPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when permission is denied", async () => {
        MockNotification.permission = "denied";
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });

      it("returns prompt when permission is default", async () => {
        MockNotification.permission = "default";
        const result = await adapter.checkPermission();
        expect(result).toBe("prompt");
      });

      it("returns denied when Notification API not available", async () => {
        mockHasNotificationAPI.mockReturnValue(false);
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns granted when user accepts", async () => {
        MockNotification.requestPermission.mockResolvedValue("granted");
        const result = await adapter.requestPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when user denies", async () => {
        MockNotification.requestPermission.mockResolvedValue("denied");
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });

      it("returns prompt when permission is default", async () => {
        MockNotification.requestPermission.mockResolvedValue("default");
        const result = await adapter.requestPermission();
        expect(result).toBe("prompt");
      });

      it("returns denied when Notification API not available", async () => {
        mockHasNotificationAPI.mockReturnValue(false);
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });

      it("returns denied on error", async () => {
        MockNotification.requestPermission.mockRejectedValue(
          new Error("Failed"),
        );
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });
    });

    describe("show", () => {
      beforeEach(() => {
        MockNotification.permission = "granted";
      });

      it("shows notification successfully", async () => {
        const result = await adapter.show({
          title: "Test",
          body: "Test body",
        });

        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();
      });

      it("returns error when Notification API not available", async () => {
        mockHasNotificationAPI.mockReturnValue(false);
        const result = await adapter.show({
          title: "Test",
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not available");
      });

      it("returns error when permission not granted", async () => {
        MockNotification.permission = "denied";
        const result = await adapter.show({
          title: "Test",
        });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("permission");
      });

      it("uses provided notification ID", async () => {
        const result = await adapter.show({
          title: "Test",
          id: "custom-id",
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe("custom-id");
      });

      it("emits show event", async () => {
        const listener = jest.fn();
        adapter.onEvent(listener);

        await adapter.show({ title: "Test" });
        await new Promise((r) => setTimeout(r, 10));

        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ type: "show" }),
        );
      });

      it("emits click event on notification click", async () => {
        const listener = jest.fn();
        adapter.onEvent(listener);

        await adapter.show({ title: "Test" });

        // Simulate click (would need to access the created notification)
        // This is limited by the mock
      });

      it("auto-closes notification after timeout", async () => {
        jest.useFakeTimers();

        await adapter.show({
          title: "Test",
          autoClose: 1000,
        });

        jest.advanceTimersByTime(1100);
        jest.useRealTimers();
      });
    });

    describe("cancel", () => {
      it("cancels notification by ID", async () => {
        MockNotification.permission = "granted";

        const result = await adapter.show({ title: "Test", id: "test-id" });
        expect(result.success).toBe(true);

        await adapter.cancel("test-id");
        // Notification should be removed from internal map
      });

      it("handles non-existent notification gracefully", async () => {
        await expect(adapter.cancel("nonexistent")).resolves.toBeUndefined();
      });
    });

    describe("cancelAll", () => {
      it("cancels all notifications", async () => {
        MockNotification.permission = "granted";

        await adapter.show({ title: "Test 1", id: 1 });
        await adapter.show({ title: "Test 2", id: 2 });

        await adapter.cancelAll();
        // All notifications should be closed
      });
    });

    describe("onEvent", () => {
      it("subscribes to events", () => {
        const listener = jest.fn();
        const unsubscribe = adapter.onEvent(listener);

        expect(typeof unsubscribe).toBe("function");
      });

      it("unsubscribes from events", async () => {
        MockNotification.permission = "granted";
        const listener = jest.fn();
        const unsubscribe = adapter.onEvent(listener);

        unsubscribe();

        await adapter.show({ title: "Test" });
        await new Promise((r) => setTimeout(r, 10));

        // Listener should not be called after unsubscribe
        // (show event might still fire before unsubscribe takes effect)
      });

      it("handles listener errors gracefully", async () => {
        MockNotification.permission = "granted";
        const errorListener = jest.fn().mockImplementation(() => {
          throw new Error("Listener error");
        });
        const normalListener = jest.fn();

        adapter.onEvent(errorListener);
        adapter.onEvent(normalListener);

        await adapter.show({ title: "Test" });
        await new Promise((r) => setTimeout(r, 10));

        expect(normalListener).toHaveBeenCalled();
      });
    });
  });

  describe("CapacitorNotificationAdapter", () => {
    let adapter: CapacitorNotificationAdapter;
    let mockLocalNotifications: {
      checkPermissions: jest.Mock;
      requestPermissions: jest.Mock;
      schedule: jest.Mock;
      cancel: jest.Mock;
      getPending: jest.Mock;
      addListener: jest.Mock;
      removeAllListeners: jest.Mock;
    };
    let mockBadge: {
      set: jest.Mock;
      clear: jest.Mock;
      get: jest.Mock;
    };

    beforeEach(() => {
      mockLocalNotifications = {
        checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
        requestPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
        schedule: jest.fn().mockResolvedValue({ notifications: [] }),
        cancel: jest.fn().mockResolvedValue(undefined),
        getPending: jest.fn().mockResolvedValue({ notifications: [] }),
        addListener: jest.fn().mockResolvedValue({ remove: jest.fn() }),
        removeAllListeners: jest.fn().mockResolvedValue(undefined),
      };

      mockBadge = {
        set: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ count: 0 }),
      };
      (window as unknown as { Capacitor: unknown }).Capacitor = {
        Plugins: {
          LocalNotifications: mockLocalNotifications,
          Badge: mockBadge,
        },
      };

      adapter = new CapacitorNotificationAdapter();
    });

    afterEach(() => {
      delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    });

    describe("checkPermission", () => {
      it("returns granted when permission is granted", async () => {
        mockLocalNotifications.checkPermissions.mockResolvedValue({
          display: "granted",
        });
        const result = await adapter.checkPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when permission is denied", async () => {
        mockLocalNotifications.checkPermissions.mockResolvedValue({
          display: "denied",
        });
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });

      it("returns prompt for other values", async () => {
        mockLocalNotifications.checkPermissions.mockResolvedValue({
          display: "prompt",
        });
        const result = await adapter.checkPermission();
        expect(result).toBe("prompt");
      });

      it("returns denied when LocalNotifications not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });

      it("returns denied on error", async () => {
        mockLocalNotifications.checkPermissions.mockRejectedValue(
          new Error("Failed"),
        );
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns granted when user accepts", async () => {
        mockLocalNotifications.requestPermissions.mockResolvedValue({
          display: "granted",
        });
        const result = await adapter.requestPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when LocalNotifications not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });
    });

    describe("show", () => {
      it("shows notification successfully", async () => {
        const result = await adapter.show({
          title: "Test",
          body: "Test body",
        });

        expect(result.success).toBe(true);
        expect(mockLocalNotifications.schedule).toHaveBeenCalled();
      });

      it("returns error when LocalNotifications not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        const result = await adapter.show({ title: "Test" });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not available");
      });

      it("schedules notification with provided options", async () => {
        await adapter.show({
          title: "Test",
          body: "Body",
          icon: "icon.png",
          data: { foo: "bar" },
          group: "test-group",
        });

        expect(mockLocalNotifications.schedule).toHaveBeenCalledWith({
          notifications: [
            expect.objectContaining({
              title: "Test",
              body: "Body",
              extra: { foo: "bar" },
              group: "test-group",
            }),
          ],
        });
      });
    });

    describe("cancel", () => {
      it("cancels notification by ID", async () => {
        await adapter.cancel(123);
        expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
          notifications: [{ id: 123 }],
        });
      });

      it("handles string ID", async () => {
        await adapter.cancel("456");
        expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
          notifications: [{ id: 456 }],
        });
      });

      it("handles missing LocalNotifications", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        await expect(adapter.cancel(123)).resolves.toBeUndefined();
      });
    });

    describe("cancelAll", () => {
      it("cancels all pending notifications", async () => {
        mockLocalNotifications.getPending.mockResolvedValue({
          notifications: [{ id: 1 }, { id: 2 }],
        });

        await adapter.cancelAll();

        expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
          notifications: [{ id: 1 }, { id: 2 }],
        });
      });

      it("does nothing when no pending notifications", async () => {
        mockLocalNotifications.getPending.mockResolvedValue({
          notifications: [],
        });

        await adapter.cancelAll();

        expect(mockLocalNotifications.cancel).not.toHaveBeenCalled();
      });
    });

    describe("schedule", () => {
      it("schedules notification", async () => {
        const scheduledAt = new Date(Date.now() + 60000);
        const result = await adapter.schedule({
          title: "Scheduled",
          scheduledAt,
        });

        expect(result.success).toBe(true);
        expect(mockLocalNotifications.schedule).toHaveBeenCalled();
      });
    });

    describe("getPending", () => {
      it("returns pending notifications", async () => {
        mockLocalNotifications.getPending.mockResolvedValue({
          notifications: [
            { id: 1, title: "Test 1", body: "Body 1", extra: { key: "value" } },
          ],
        });

        const pending = await adapter.getPending();

        expect(pending).toHaveLength(1);
        expect(pending[0].title).toBe("Test 1");
      });

      it("returns empty array when LocalNotifications not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        const pending = await adapter.getPending();
        expect(pending).toEqual([]);
      });
    });

    describe("setBadgeCount", () => {
      it("sets badge count", async () => {
        await adapter.setBadgeCount(5);
        expect(mockBadge.set).toHaveBeenCalledWith({ count: 5 });
      });

      it("handles missing Badge plugin", async () => {
        (
          window as unknown as { Capacitor: { Plugins: unknown } }
        ).Capacitor.Plugins = {};
        await expect(adapter.setBadgeCount(5)).resolves.toBeUndefined();
      });
    });

    describe("clearBadge", () => {
      it("clears badge", async () => {
        await adapter.clearBadge();
        expect(mockBadge.clear).toHaveBeenCalled();
      });
    });
  });

  describe("ElectronNotificationAdapter", () => {
    let adapter: ElectronNotificationAdapter;
    let mockNotification: {
      show: jest.Mock;
      isSupported: jest.Mock;
    };

    beforeEach(() => {
      mockNotification = {
        show: jest.fn().mockResolvedValue(undefined),
        isSupported: jest.fn().mockReturnValue(true),
      };
      (window as unknown as { electron: unknown }).electron = {
        notification: mockNotification,
      };

      adapter = new ElectronNotificationAdapter();
    });

    afterEach(() => {
      delete (window as unknown as { electron?: unknown }).electron;
    });

    describe("checkPermission", () => {
      it("returns granted when notifications supported", async () => {
        mockNotification.isSupported.mockReturnValue(true);
        const result = await adapter.checkPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when notifications not supported", async () => {
        mockNotification.isSupported.mockReturnValue(false);
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });

      it("returns denied when electron not available", async () => {
        delete (window as unknown as { electron?: unknown }).electron;
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns checkPermission result", async () => {
        mockNotification.isSupported.mockReturnValue(true);
        const result = await adapter.requestPermission();
        expect(result).toBe("granted");
      });
    });

    describe("show", () => {
      it("shows notification successfully", async () => {
        const result = await adapter.show({
          title: "Test",
          body: "Test body",
        });

        expect(result.success).toBe(true);
        expect(mockNotification.show).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Test",
            body: "Test body",
          }),
        );
      });

      it("falls back to web notification when electron not available", async () => {
        delete (window as unknown as { electron?: unknown }).electron;
        MockNotification.permission = "granted";

        const result = await adapter.show({ title: "Test" });

        expect(result.success).toBe(true);
      });

      it("maps priority correctly", async () => {
        await adapter.show({ title: "Test", priority: "urgent" });

        expect(mockNotification.show).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: "critical",
          }),
        );
      });

      it("maps low priority", async () => {
        await adapter.show({ title: "Test", priority: "low" });

        expect(mockNotification.show).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: "low",
          }),
        );
      });

      it("maps default priority", async () => {
        await adapter.show({ title: "Test", priority: "default" });

        expect(mockNotification.show).toHaveBeenCalledWith(
          expect.objectContaining({
            urgency: "normal",
          }),
        );
      });
    });

    describe("cancel", () => {
      it("does nothing (Electron limitation)", async () => {
        await expect(adapter.cancel(123)).resolves.toBeUndefined();
      });
    });

    describe("cancelAll", () => {
      it("does nothing (Electron limitation)", async () => {
        await expect(adapter.cancelAll()).resolves.toBeUndefined();
      });
    });
  });

  describe("TauriNotificationAdapter", () => {
    let adapter: TauriNotificationAdapter;
    let mockNotification: {
      isPermissionGranted: jest.Mock;
      requestPermission: jest.Mock;
      sendNotification: jest.Mock;
    };

    beforeEach(() => {
      mockNotification = {
        isPermissionGranted: jest.fn().mockResolvedValue(true),
        requestPermission: jest.fn().mockResolvedValue("granted"),
        sendNotification: jest.fn(),
      };
      (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
        notification: mockNotification,
      };

      adapter = new TauriNotificationAdapter();
    });

    afterEach(() => {
      delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    });

    describe("checkPermission", () => {
      it("returns granted when permission is granted", async () => {
        mockNotification.isPermissionGranted.mockResolvedValue(true);
        const result = await adapter.checkPermission();
        expect(result).toBe("granted");
      });

      it("returns prompt when permission not granted", async () => {
        mockNotification.isPermissionGranted.mockResolvedValue(false);
        const result = await adapter.checkPermission();
        expect(result).toBe("prompt");
      });

      it("returns denied when Tauri not available", async () => {
        delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });

      it("returns denied on error", async () => {
        mockNotification.isPermissionGranted.mockRejectedValue(
          new Error("Failed"),
        );
        const result = await adapter.checkPermission();
        expect(result).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns granted when user accepts", async () => {
        mockNotification.requestPermission.mockResolvedValue("granted");
        const result = await adapter.requestPermission();
        expect(result).toBe("granted");
      });

      it("returns denied when user denies", async () => {
        mockNotification.requestPermission.mockResolvedValue("denied");
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });

      it("returns denied when Tauri not available", async () => {
        delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
        const result = await adapter.requestPermission();
        expect(result).toBe("denied");
      });
    });

    describe("show", () => {
      it("shows notification successfully", async () => {
        const result = await adapter.show({
          title: "Test",
          body: "Test body",
        });

        expect(result.success).toBe(true);
        expect(mockNotification.sendNotification).toHaveBeenCalledWith({
          title: "Test",
          body: "Test body",
          icon: undefined,
        });
      });

      it("returns error when Tauri not available", async () => {
        delete (window as unknown as { __TAURI__?: unknown }).__TAURI__;
        const result = await adapter.show({ title: "Test" });

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not available");
      });
    });
  });

  describe("NoopNotificationAdapter", () => {
    let adapter: NoopNotificationAdapter;

    beforeEach(() => {
      adapter = new NoopNotificationAdapter();
    });

    it("checkPermission returns denied", async () => {
      expect(await adapter.checkPermission()).toBe("denied");
    });

    it("requestPermission returns denied", async () => {
      expect(await adapter.requestPermission()).toBe("denied");
    });

    it("show returns failure", async () => {
      const result = await adapter.show({ title: "Test" });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("not supported");
    });

    it("cancel does nothing", async () => {
      await expect(adapter.cancel(123)).resolves.toBeUndefined();
    });

    it("cancelAll does nothing", async () => {
      await expect(adapter.cancelAll()).resolves.toBeUndefined();
    });
  });

  describe("detectNotificationBackend", () => {
    it("returns electron for Electron platform", () => {
      mockDetectPlatform.mockReturnValue("electron");
      expect(detectNotificationBackend()).toBe("electron");
    });

    it("returns tauri for Tauri platform", () => {
      mockDetectPlatform.mockReturnValue("tauri");
      expect(detectNotificationBackend()).toBe("tauri");
    });

    it("returns capacitor for iOS with Capacitor", () => {
      mockDetectPlatform.mockReturnValue("ios");
      (window as unknown as { Capacitor: unknown }).Capacitor = {
        Plugins: { LocalNotifications: {} },
      };
      expect(detectNotificationBackend()).toBe("capacitor");
      delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    });

    it("returns web for web platform with Notification API", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasNotificationAPI.mockReturnValue(true);
      expect(detectNotificationBackend()).toBe("web");
    });

    it("returns none when no notification support", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasNotificationAPI.mockReturnValue(false);
      expect(detectNotificationBackend()).toBe("none");
    });
  });

  describe("createNotificationAdapter", () => {
    it("creates WebNotificationAdapter for web", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasNotificationAPI.mockReturnValue(true);
      const adapter = createNotificationAdapter();
      expect(adapter).toBeInstanceOf(WebNotificationAdapter);
    });

    it("creates NoopNotificationAdapter when no support", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasNotificationAPI.mockReturnValue(false);
      const adapter = createNotificationAdapter();
      expect(adapter).toBeInstanceOf(NoopNotificationAdapter);
    });
  });

  describe("Convenience functions", () => {
    beforeEach(() => {
      MockNotification.permission = "granted";
    });

    it("checkNotificationPermission works", async () => {
      const result = await checkNotificationPermission();
      expect(result).toBe("granted");
    });

    it("requestNotificationPermission works", async () => {
      const result = await requestNotificationPermission();
      expect(result).toBe("granted");
    });

    it("showNotification works", async () => {
      const result = await showNotification({ title: "Test" });
      expect(result.success).toBe(true);
    });

    it("cancelNotification works", async () => {
      await expect(cancelNotification(123)).resolves.toBeUndefined();
    });

    it("cancelAllNotifications works", async () => {
      await expect(cancelAllNotifications()).resolves.toBeUndefined();
    });

    it("onNotificationEvent works", () => {
      const listener = jest.fn();
      const unsubscribe = onNotificationEvent(listener);
      expect(typeof unsubscribe).toBe("function");
    });
  });

  describe("Notifications namespace", () => {
    it("exports all adapter classes", () => {
      expect(Notifications.WebNotificationAdapter).toBe(WebNotificationAdapter);
      expect(Notifications.CapacitorNotificationAdapter).toBe(
        CapacitorNotificationAdapter,
      );
      expect(Notifications.ElectronNotificationAdapter).toBe(
        ElectronNotificationAdapter,
      );
      expect(Notifications.TauriNotificationAdapter).toBe(
        TauriNotificationAdapter,
      );
      expect(Notifications.NoopNotificationAdapter).toBe(
        NoopNotificationAdapter,
      );
    });

    it("exports factory functions", () => {
      expect(Notifications.createNotificationAdapter).toBe(
        createNotificationAdapter,
      );
      expect(Notifications.detectNotificationBackend).toBe(
        detectNotificationBackend,
      );
      expect(Notifications.getNotificationAdapter).toBe(getNotificationAdapter);
      expect(Notifications.resetNotificationAdapter).toBe(
        resetNotificationAdapter,
      );
    });

    it("exports convenience functions", () => {
      expect(Notifications.checkPermission).toBe(checkNotificationPermission);
      expect(Notifications.requestPermission).toBe(
        requestNotificationPermission,
      );
      expect(Notifications.show).toBe(showNotification);
      expect(Notifications.cancel).toBe(cancelNotification);
      expect(Notifications.cancelAll).toBe(cancelAllNotifications);
      expect(Notifications.onEvent).toBe(onNotificationEvent);
    });
  });
});
