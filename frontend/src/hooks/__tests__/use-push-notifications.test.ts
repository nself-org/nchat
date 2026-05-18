/**
 * usePushNotifications Hook Tests
 *
 * Comprehensive tests for the push notifications hook including:
 * - Permission handling
 * - Subscribe/unsubscribe operations
 * - Server synchronization
 * - Push message handling
 * - Error handling
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { usePushNotifications } from "../use-push-notifications";
import * as pushSubscription from "@/lib/notifications/push-subscription";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/lib/notifications/push-subscription", () => ({
  isPushSupported: jest.fn(() => true),
  getPermission: jest.fn(() => "default"),
  requestPermission: jest.fn(() => Promise.resolve("granted")),
  subscribe: jest.fn(() =>
    Promise.resolve({
      success: true,
      subscription: {
        endpoint: "https://push.example.com/abc123",
        expirationTime: null,
        keys: { p256dh: "test-key", auth: "test-auth" },
      },
    }),
  ),
  unsubscribe: jest.fn(() => Promise.resolve({ success: true })),
  getSubscriptionState: jest.fn(() =>
    Promise.resolve({
      isSupported: true,
      permission: "default",
      isSubscribed: false,
      subscription: null,
      error: null,
    }),
  ),
  sendSubscriptionToServer: jest.fn(() => Promise.resolve({ success: true })),
  removeSubscriptionFromServer: jest.fn(() =>
    Promise.resolve({ success: true }),
  ),
}));

const mockIsPushSupported =
  pushSubscription.isPushSupported as jest.MockedFunction<
    typeof pushSubscription.isPushSupported
  >;
const mockGetPermission = pushSubscription.getPermission as jest.MockedFunction<
  typeof pushSubscription.getPermission
>;
const mockRequestPermission =
  pushSubscription.requestPermission as jest.MockedFunction<
    typeof pushSubscription.requestPermission
  >;
const mockSubscribe = pushSubscription.subscribe as jest.MockedFunction<
  typeof pushSubscription.subscribe
>;
const mockUnsubscribe = pushSubscription.unsubscribe as jest.MockedFunction<
  typeof pushSubscription.unsubscribe
>;
const mockGetSubscriptionState =
  pushSubscription.getSubscriptionState as jest.MockedFunction<
    typeof pushSubscription.getSubscriptionState
  >;
const mockSendToServer =
  pushSubscription.sendSubscriptionToServer as jest.MockedFunction<
    typeof pushSubscription.sendSubscriptionToServer
  >;
const mockRemoveFromServer =
  pushSubscription.removeSubscriptionFromServer as jest.MockedFunction<
    typeof pushSubscription.removeSubscriptionFromServer
  >;

// Mock service worker - reuse the global mock from jest.setup.js but track event listeners
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Override the serviceWorker addEventListener/removeEventListener for testing
beforeEach(() => {
  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    jest
      .spyOn(navigator.serviceWorker, "addEventListener")
      .mockImplementation(mockAddEventListener);
    jest
      .spyOn(navigator.serviceWorker, "removeEventListener")
      .mockImplementation(mockRemoveEventListener);
  }
});

// ============================================================================
// Tests
// ============================================================================

describe("usePushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPushSupported.mockReturnValue(true);
    mockGetPermission.mockReturnValue("default");
    mockRequestPermission.mockResolvedValue("granted");
    mockSubscribe.mockResolvedValue({
      success: true,
      subscription: {
        endpoint: "https://push.example.com/abc123",
        expirationTime: null,
        keys: { p256dh: "test-key", auth: "test-auth" },
      },
    });
    mockUnsubscribe.mockResolvedValue({ success: true });
    mockGetSubscriptionState.mockResolvedValue({
      isSupported: true,
      permission: "default",
      isSubscribed: false,
      subscription: null,
      error: null,
    });
    mockSendToServer.mockResolvedValue({ success: true });
    mockRemoveFromServer.mockResolvedValue({ success: true });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("initial state", () => {
    it("should return default state", async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      expect(result.current.permission).toBe("default");
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.subscription).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should check subscription state on mount", async () => {
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockGetSubscriptionState).toHaveBeenCalled();
      });
    });

    it("should return unsupported when push not available", async () => {
      mockIsPushSupported.mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Permission Tests
  // ==========================================================================

  describe("requestPermission", () => {
    it("should request permission", async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let permission: NotificationPermission = "default";
      await act(async () => {
        permission = await result.current.requestPermission();
      });

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(permission).toBe("granted");
      expect(result.current.permission).toBe("granted");
    });

    it("should handle permission denied", async () => {
      mockRequestPermission.mockResolvedValue("denied");

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let permission: NotificationPermission = "default";
      await act(async () => {
        permission = await result.current.requestPermission();
      });

      expect(permission).toBe("denied");
    });

    it("should set loading state during request", async () => {
      let resolvePermission: (value: NotificationPermission) => void;
      mockRequestPermission.mockReturnValue(
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
      );

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let promise: Promise<NotificationPermission>;
      act(() => {
        promise = result.current.requestPermission();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePermission!("granted");
        await promise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle request error", async () => {
      mockRequestPermission.mockRejectedValue(new Error("Request failed"));
      const onError = jest.fn();

      const { result } = renderHook(() => usePushNotifications({ onError }));

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Subscribe Tests
  // ==========================================================================

  describe("subscribe", () => {
    it("should subscribe successfully", async () => {
      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success!).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.subscription).toBeDefined();
    });

    it("should fail without application server key", async () => {
      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toContain("key");
    });

    it("should sync subscription with server", async () => {
      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          apiUrl: "/api/push",
          userId: "user-123",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.subscribe();
      });

      expect(mockSendToServer).toHaveBeenCalledWith(
        expect.any(Object),
        "/api/push",
        expect.objectContaining({ userId: "user-123" }),
      );
    });

    it("should handle subscribe failure", async () => {
      mockSubscribe.mockResolvedValue({
        success: false,
        error: "Permission denied",
      });

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.subscribe();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Permission denied");
    });

    it("should handle server sync failure gracefully", async () => {
      mockSendToServer.mockResolvedValue({
        success: false,
        error: "Server error",
      });
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          apiUrl: "/api/push",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.subscribe();
      });

      // Subscribe should still succeed even if server sync fails
      expect(success!).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Unsubscribe Tests
  // ==========================================================================

  describe("unsubscribe", () => {
    it("should unsubscribe successfully", async () => {
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: true,
        subscription: {
          endpoint: "https://push.example.com/abc123",
          expirationTime: null,
          keys: { p256dh: "test-key", auth: "test-auth" },
        },
        error: null,
      });

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.unsubscribe();
      });

      expect(success!).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.subscription).toBeNull();
    });

    it("should remove subscription from server", async () => {
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: true,
        subscription: {
          endpoint: "https://push.example.com/abc123",
          expirationTime: null,
          keys: { p256dh: "test-key", auth: "test-auth" },
        },
        error: null,
      });

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          apiUrl: "/api/push",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true);
      });

      await act(async () => {
        await result.current.unsubscribe();
      });

      expect(mockRemoveFromServer).toHaveBeenCalledWith(
        "https://push.example.com/abc123",
        "/api/push",
      );
    });

    it("should handle unsubscribe failure", async () => {
      mockUnsubscribe.mockResolvedValue({
        success: false,
        error: "Unsubscribe failed",
      });

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.unsubscribe();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Unsubscribe failed");
    });
  });

  // ==========================================================================
  // Refresh Tests
  // ==========================================================================

  describe("refresh", () => {
    it("should unsubscribe and resubscribe", async () => {
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: true,
        subscription: {
          endpoint: "https://push.example.com/abc123",
          expirationTime: null,
          keys: { p256dh: "test-key", auth: "test-auth" },
        },
        error: null,
      });

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSubscribed).toBe(true);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.refresh();
      });

      expect(success!).toBe(true);
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Check State Tests
  // ==========================================================================

  describe("checkState", () => {
    it("should return current state", async () => {
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: true,
        subscription: {
          endpoint: "https://push.example.com/abc123",
          expirationTime: null,
          keys: { p256dh: "test-key", auth: "test-auth" },
        },
        error: null,
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let state: pushSubscription.PushSubscriptionState;
      await act(async () => {
        state = await result.current.checkState();
      });

      expect(state!.isSubscribed).toBe(true);
      expect(state!.subscription).toBeDefined();
    });

    it("should handle check state error", async () => {
      // Let initialization succeed first
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      // Now mock rejection for the explicit checkState() call
      mockGetSubscriptionState.mockRejectedValueOnce(new Error("Check failed"));

      let state: pushSubscription.PushSubscriptionState;
      await act(async () => {
        state = await result.current.checkState();
      });

      expect(state!.error).toBe("Check failed");
    });
  });

  // ==========================================================================
  // Auto Subscribe Tests
  // ==========================================================================

  describe("autoSubscribe", () => {
    it("should auto-subscribe when permission granted", async () => {
      mockGetPermission.mockReturnValue("granted");
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: false,
        subscription: null,
        error: null,
      });

      renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          autoSubscribe: true,
        }),
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });
    });

    it("should not auto-subscribe when already subscribed", async () => {
      mockGetPermission.mockReturnValue("granted");
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "granted",
        isSubscribed: true,
        subscription: {
          endpoint: "https://push.example.com/abc123",
          expirationTime: null,
          keys: { p256dh: "test-key", auth: "test-auth" },
        },
        error: null,
      });

      renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          autoSubscribe: true,
        }),
      );

      // Wait for initialization
      await waitFor(() => {
        expect(mockGetSubscriptionState).toHaveBeenCalled();
      });

      // Should not call subscribe again
      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    it("should not auto-subscribe when permission not granted", async () => {
      mockGetPermission.mockReturnValue("default");
      mockGetSubscriptionState.mockResolvedValue({
        isSupported: true,
        permission: "default",
        isSubscribed: false,
        subscription: null,
        error: null,
      });

      renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          autoSubscribe: true,
        }),
      );

      // Wait for initialization
      await waitFor(() => {
        expect(mockGetSubscriptionState).toHaveBeenCalled();
      });

      // Should not call subscribe
      expect(mockSubscribe).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe("callbacks", () => {
    it("should call onStateChange when state changes", async () => {
      const onStateChange = jest.fn();

      renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          onStateChange,
        }),
      );

      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalled();
      });
    });

    it("should call onError when error occurs", async () => {
      mockSubscribe.mockResolvedValue({
        success: false,
        error: "Subscribe failed",
      });
      const onError = jest.fn();

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
          onError,
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      await act(async () => {
        await result.current.subscribe();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ==========================================================================
  // Service Worker Message Listener Tests
  // ==========================================================================

  describe("push message handling", () => {
    it("should register message listener", () => {
      renderHook(() => usePushNotifications());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });

    it("should cleanup message listener on unmount", () => {
      const { unmount } = renderHook(() => usePushNotifications());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });

    it("should call onPushReceived for push messages", async () => {
      const onPushReceived = jest.fn();

      renderHook(() =>
        usePushNotifications({
          onPushReceived,
        }),
      );

      // Get the message handler
      const messageHandler = mockAddEventListener.mock.calls[0][1];

      // Simulate push message
      messageHandler({
        data: { type: "PUSH_NOTIFICATION", payload: { test: true } },
      });

      expect(onPushReceived).toHaveBeenCalled();
    });

    it("should ignore non-push messages", () => {
      const onPushReceived = jest.fn();

      renderHook(() =>
        usePushNotifications({
          onPushReceived,
        }),
      );

      // Get the message handler
      const messageHandler = mockAddEventListener.mock.calls[0][1];

      // Simulate non-push message
      messageHandler({ data: { type: "OTHER_MESSAGE" } });

      expect(onPushReceived).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("loading state", () => {
    it("should set loading during subscribe", async () => {
      let resolveSubscribe: (value: {
        success: boolean;
        subscription?: any;
      }) => void;
      mockSubscribe.mockReturnValue(
        new Promise((resolve) => {
          resolveSubscribe = resolve;
        }),
      );

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let promise: Promise<boolean>;
      act(() => {
        promise = result.current.subscribe();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSubscribe!({ success: true });
        await promise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should set loading during unsubscribe", async () => {
      let resolveUnsubscribe: (value: { success: boolean }) => void;
      mockUnsubscribe.mockReturnValue(
        new Promise((resolve) => {
          resolveUnsubscribe = resolve;
        }),
      );

      const { result } = renderHook(() =>
        usePushNotifications({
          applicationServerKey: "test-key",
        }),
      );

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });

      let promise: Promise<boolean>;
      act(() => {
        promise = result.current.unsubscribe();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveUnsubscribe!({ success: true });
        await promise!;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
