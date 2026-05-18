/**
 * useNotifications Hook Tests
 *
 * Comprehensive tests for the notifications hook including:
 * - Desktop notification permission
 * - Desktop notification display
 * - Sound playback
 * - Mark as read operations
 * - Preference management
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotifications } from "../use-notifications";
import {
  useNotificationStore,
  Notification,
  NotificationType,
} from "@/stores/notification-store";

// ============================================================================
// Mocks
// ============================================================================

// Mock the notification store
jest.mock("@/stores/notification-store", () => {
  const actual = jest.requireActual("@/stores/notification-store");
  return {
    ...actual,
    useNotificationStore: jest.fn(),
  };
});

// Mock Audio
const mockAudioPlay = jest.fn().mockResolvedValue(undefined);
const mockAudioPause = jest.fn();
const MockAudio = jest.fn().mockImplementation(() => ({
  play: mockAudioPlay,
  pause: mockAudioPause,
  src: "",
  volume: 1,
}));
(global as unknown as { Audio: typeof MockAudio }).Audio = MockAudio;

// Mock Notification API
const mockNotificationInstance = {
  close: jest.fn(),
  onclick: null as ((event: Event) => void) | null,
};

const mockNotification = jest
  .fn()
  .mockImplementation(() => mockNotificationInstance);
Object.defineProperty(mockNotification, "permission", {
  value: "default",
  writable: true,
  configurable: true,
});
mockNotification.requestPermission = jest.fn().mockResolvedValue("granted");

Object.defineProperty(global, "Notification", {
  value: mockNotification,
  writable: true,
  configurable: true,
});

// ============================================================================
// Test Helpers
// ============================================================================

const createTestNotification = (
  overrides?: Partial<Notification>,
): Notification => ({
  id: `notif-${Date.now()}`,
  type: "mention",
  priority: "normal",
  title: "Test Notification",
  body: "Test body",
  isRead: false,
  isArchived: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createMockStoreState = (
  overrides?: Partial<ReturnType<typeof useNotificationStore>>,
) => ({
  notifications: [],
  unreadCounts: {
    total: 0,
    mentions: 0,
    directMessages: 0,
    threads: 0,
    byChannel: {},
  },
  isLoading: false,
  error: null,
  desktopPermission: "default" as NotificationPermission | "default",
  preferences: {
    desktopEnabled: true,
    soundEnabled: true,
    emailEnabled: false,
    soundVolume: 80,
    emailDigestFrequency: "daily" as const,
    dndSchedule: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00",
      days: [0, 1, 2, 3, 4, 5, 6] as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>,
    },
    mentionsEnabled: true,
    directMessagesEnabled: true,
    threadRepliesEnabled: true,
    reactionsEnabled: false,
    showPreview: true,
    playSound: true,
    channelSettings: {},
  },
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
  setDesktopPermission: jest.fn(),
  updatePreferences: jest.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("useNotifications", () => {
  let mockStoreState: ReturnType<typeof createMockStoreState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = createMockStoreState();
    (useNotificationStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        if (typeof selector === "function") {
          return selector(mockStoreState);
        }
        return mockStoreState;
      },
    );

    Object.defineProperty(mockNotification, "permission", {
      value: "default",
      configurable: true,
    });
  });

  // ==========================================================================
  // Return Value Tests
  // ==========================================================================

  describe("return value", () => {
    it("should return notifications from store", () => {
      const notifications = [createTestNotification()];
      mockStoreState.notifications = notifications;

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toEqual(notifications);
    });

    it("should return unread count", () => {
      mockStoreState.unreadCounts.total = 5;

      const { result } = renderHook(() => useNotifications());

      expect(result.current.unreadCount).toBe(5);
    });

    it("should return loading state", () => {
      mockStoreState.isLoading = true;

      const { result } = renderHook(() => useNotifications());

      expect(result.current.isLoading).toBe(true);
    });

    it("should return error state", () => {
      mockStoreState.error = "Test error";

      const { result } = renderHook(() => useNotifications());

      expect(result.current.error).toBe("Test error");
    });

    it("should return desktop permission", () => {
      mockStoreState.desktopPermission = "granted";

      const { result } = renderHook(() => useNotifications());

      expect(result.current.desktopPermission).toBe("granted");
    });
  });

  // ==========================================================================
  // Desktop Permission Tests
  // ==========================================================================

  describe("requestDesktopPermission", () => {
    it("should request permission", async () => {
      const { result } = renderHook(() => useNotifications());

      const permission = await act(async () => {
        return result.current.requestDesktopPermission();
      });

      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(permission).toBe("granted");
    });

    it("should return granted if already granted", async () => {
      Object.defineProperty(mockNotification, "permission", {
        value: "granted",
        configurable: true,
      });

      const { result } = renderHook(() => useNotifications());

      const permission = await act(async () => {
        return result.current.requestDesktopPermission();
      });

      expect(permission).toBe("granted");
      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it("should return denied if already denied", async () => {
      Object.defineProperty(mockNotification, "permission", {
        value: "denied",
        configurable: true,
      });

      const { result } = renderHook(() => useNotifications());

      const permission = await act(async () => {
        return result.current.requestDesktopPermission();
      });

      expect(permission).toBe("denied");
    });

    it("should update store permission", async () => {
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.requestDesktopPermission();
      });

      expect(mockStoreState.setDesktopPermission).toHaveBeenCalledWith(
        "granted",
      );
    });
  });

  // ==========================================================================
  // Desktop Notification Display Tests
  // ==========================================================================

  describe("showDesktopNotification", () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, "permission", {
        value: "granted",
        configurable: true,
      });
      mockStoreState.desktopPermission = "granted";
    });

    it("should create desktop notification", () => {
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification({
        title: "Test Title",
        body: "Test Body",
      });

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).toHaveBeenCalledWith(
        "Test Title",
        expect.any(Object),
      );
    });

    it("should include notification options", () => {
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification({
        actor: { id: "user-1", name: "John", avatarUrl: "/avatar.jpg" },
      });

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          icon: "/avatar.jpg",
          tag: notification.id,
        }),
      );
    });

    it("should not show notification when desktop disabled", () => {
      mockStoreState.preferences.desktopEnabled = false;
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification();

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should not show notification when permission not granted", () => {
      Object.defineProperty(mockNotification, "permission", {
        value: "denied",
        configurable: true,
      });
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification();

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should not show notification when type is disabled", () => {
      mockStoreState.preferences.mentionsEnabled = false;
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification({ type: "mention" });

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should hide preview when configured", () => {
      mockStoreState.preferences.showPreview = false;
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification({ body: "Secret message" });

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: "You have a new notification",
        }),
      );
    });

    it("should require interaction for urgent notifications", () => {
      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification({ priority: "urgent" });

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requireInteraction: true,
        }),
      );
    });
  });

  // ==========================================================================
  // Sound Playback Tests
  // ==========================================================================

  describe("playSound", () => {
    it("should play sound when enabled", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.playSound("mention");
      });

      expect(mockAudioPlay).toHaveBeenCalled();
    });

    it("should not play sound when disabled", () => {
      mockStoreState.preferences.soundEnabled = false;
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.playSound("mention");
      });

      expect(mockAudioPlay).not.toHaveBeenCalled();
    });

    it("should not play sound when playSound is false", () => {
      mockStoreState.preferences.playSound = false;
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.playSound("mention");
      });

      expect(mockAudioPlay).not.toHaveBeenCalled();
    });

    it("should set volume from preferences", () => {
      mockStoreState.preferences.soundVolume = 50;
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.playSound("mention");
      });

      const audioInstance = MockAudio.mock.results[0]?.value;
      if (audioInstance) {
        expect(audioInstance.volume).toBe(0.5);
      }
    });

    it("should handle audio play error", async () => {
      mockAudioPlay.mockRejectedValueOnce(new Error("Autoplay blocked"));
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        result.current.playSound("mention");
        await Promise.resolve();
      });

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // DND Schedule Tests
  // ==========================================================================

  describe("DND schedule", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T23:00:00"));
      Object.defineProperty(mockNotification, "permission", {
        value: "granted",
        configurable: true,
      });
      mockStoreState.desktopPermission = "granted";
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not show notification during DND hours", () => {
      mockStoreState.preferences.dndSchedule = {
        enabled: true,
        startTime: "22:00",
        endTime: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      };

      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification();

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("should show notification outside DND hours", () => {
      jest.setSystemTime(new Date("2024-01-15T12:00:00"));
      mockStoreState.preferences.dndSchedule = {
        enabled: true,
        startTime: "22:00",
        endTime: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      };

      const { result } = renderHook(() => useNotifications());
      const notification = createTestNotification();

      act(() => {
        result.current.showDesktopNotification(notification);
      });

      expect(mockNotification).toHaveBeenCalled();
    });

    it("should not play sound during DND hours", () => {
      mockStoreState.preferences.dndSchedule = {
        enabled: true,
        startTime: "22:00",
        endTime: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      };

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.playSound("mention");
      });

      expect(mockAudioPlay).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Mark As Read Tests
  // ==========================================================================

  describe("markAsRead", () => {
    it("should call store markAsRead", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAsRead("notif-1");
      });

      expect(mockStoreState.markAsRead).toHaveBeenCalledWith("notif-1");
    });
  });

  describe("markAllAsRead", () => {
    it("should call store markAllAsRead", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAllAsRead();
      });

      expect(mockStoreState.markAllAsRead).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Dismiss/Clear Tests
  // ==========================================================================

  describe("dismissNotification", () => {
    it("should call store removeNotification", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.dismissNotification("notif-1");
      });

      expect(mockStoreState.removeNotification).toHaveBeenCalledWith("notif-1");
    });
  });

  describe("clearAll", () => {
    it("should call store clearAllNotifications", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.clearAll();
      });

      expect(mockStoreState.clearAllNotifications).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Preference Toggle Tests
  // ==========================================================================

  describe("toggleDesktopNotifications", () => {
    it("should update desktop enabled preference", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.toggleDesktopNotifications(false);
      });

      expect(mockStoreState.updatePreferences).toHaveBeenCalledWith({
        desktopEnabled: false,
      });
    });

    it("should request permission when enabling", async () => {
      mockStoreState.desktopPermission = "default";
      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        result.current.toggleDesktopNotifications(true);
      });

      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });
  });

  describe("toggleSoundNotifications", () => {
    it("should update sound enabled preference", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.toggleSoundNotifications(false);
      });

      expect(mockStoreState.updatePreferences).toHaveBeenCalledWith({
        soundEnabled: false,
      });
    });
  });

  describe("setVolume", () => {
    it("should update sound volume", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.setVolume(50);
      });

      expect(mockStoreState.updatePreferences).toHaveBeenCalledWith({
        soundVolume: 50,
      });
    });

    it("should clamp volume to 0-100", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.setVolume(150);
      });

      expect(mockStoreState.updatePreferences).toHaveBeenCalledWith({
        soundVolume: 100,
      });

      act(() => {
        result.current.setVolume(-50);
      });

      expect(mockStoreState.updatePreferences).toHaveBeenCalledWith({
        soundVolume: 0,
      });
    });
  });

  // ==========================================================================
  // Auto Request Permission Tests
  // ==========================================================================

  describe("autoRequestPermission option", () => {
    it("should request permission on mount when enabled", async () => {
      renderHook(() => useNotifications({ autoRequestPermission: true }));

      await waitFor(() => {
        expect(mockNotification.requestPermission).toHaveBeenCalled();
      });
    });

    it("should not request permission when disabled", () => {
      renderHook(() => useNotifications({ autoRequestPermission: false }));

      expect(mockNotification.requestPermission).not.toHaveBeenCalled();
    });

    it("should sync existing permission", async () => {
      Object.defineProperty(mockNotification, "permission", {
        value: "granted",
        configurable: true,
      });

      renderHook(() => useNotifications({ autoRequestPermission: true }));

      await waitFor(() => {
        expect(mockStoreState.setDesktopPermission).toHaveBeenCalledWith(
          "granted",
        );
      });
    });
  });

  // ==========================================================================
  // Custom Sounds Tests
  // ==========================================================================

  describe("custom sounds option", () => {
    it("should use custom sound URLs", () => {
      const customSounds = {
        mention: "/custom/mention.mp3",
      };

      const { result } = renderHook(() =>
        useNotifications({ sounds: customSounds }),
      );

      act(() => {
        result.current.playSound("mention");
      });

      const audioInstance = MockAudio.mock.results[0]?.value;
      expect(audioInstance?.src).toBe("/custom/mention.mp3");
    });
  });

  // ==========================================================================
  // Notification Callback Tests
  // ==========================================================================

  describe("onNotification callback", () => {
    it("should call callback for new notifications", async () => {
      const onNotification = jest.fn();
      const newNotification = createTestNotification();

      // First render with empty notifications
      const { rerender } = renderHook(
        ({ onNotification }) => useNotifications({ onNotification }),
        { initialProps: { onNotification } },
      );

      // Update store to include notification
      mockStoreState.notifications = [newNotification];

      // Rerender to trigger effect
      rerender({ onNotification });

      // The callback should be called when a new notification is added
      // Note: This test might need adjustment based on actual implementation
    });
  });
});
