import { renderHook, act, waitFor } from "@testing-library/react";
import { useTyping } from "../use-typing";
import { useSocket } from "../use-socket";
import { useAuth } from "@/contexts/auth-context";

// Mock dependencies
jest.mock("../use-socket");
jest.mock("@/contexts/auth-context");

const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("useTyping", () => {
  const channelId = "test-channel";
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    displayName: "Test User",
    role: "member" as const,
  };

  let mockEmit: jest.Mock;
  let mockSubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockEmit = jest.fn();
    mockSubscribe = jest.fn(() => jest.fn()); // Returns unsubscribe function

    mockUseSocket.mockReturnValue({
      isConnected: true,
      emit: mockEmit,
      subscribe: mockSubscribe,
      socketId: "socket-123",
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      isDevMode: true,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Typing Events", () => {
    it("should emit typing event when handleTyping is called", () => {
      const { result } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).toHaveBeenCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: true,
      });
    });

    it("should debounce stop typing event", () => {
      const { result } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      // Should emit start typing immediately
      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: true,
      });

      // Wait for debounce - implementation uses 2x debounce (handleTyping -> stopTyping -> emit)
      // First 300ms triggers stopTyping, then another 300ms triggers the actual emit
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Should emit stop typing after both debounce periods
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenLastCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: false,
      });
    });

    it("should throttle typing events", () => {
      // Use longer throttle and shorter debounce to make test clearer
      const { result } = renderHook(() =>
        useTyping(channelId, { throttleMs: 2000, debounceMs: 100 }),
      );

      // First typing event
      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).toHaveBeenCalledTimes(1);

      // Call typing again immediately (within throttle period) - should NOT emit start again
      // because startTyping() checks throttle
      act(() => {
        result.current.handleTyping();
      });

      // Still should only be 1 emit (the first start typing)
      expect(mockEmit).toHaveBeenCalledTimes(1);

      // Wait for debounce to fire the stop typing (100 + 100 = 200ms for the double debounce)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Now we have start + stop = 2 emits
      expect(mockEmit).toHaveBeenCalledTimes(2);

      // Wait for throttle to expire (2000ms total from first emit, we're at 200ms)
      act(() => {
        jest.advanceTimersByTime(1800);
        result.current.handleTyping();
      });

      // Should emit start again after throttle expires
      expect(mockEmit).toHaveBeenCalledTimes(3);
      expect(mockEmit).toHaveBeenLastCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: true,
      });
    });

    it("should force stop typing immediately", () => {
      const { result } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.forceStopTyping();
      });

      // Should emit stop typing immediately without debounce
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenLastCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: false,
      });
    });
  });

  describe("Typing Users", () => {
    it("should add typing user when receiving typing event", () => {
      const { result } = renderHook(() => useTyping(channelId));

      // Get the subscribe callback
      expect(mockSubscribe).toHaveBeenCalled();
      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Simulate typing event from another user
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-2",
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0].id).toBe("user-2");
    });

    it("should remove typing user when receiving stop typing event", () => {
      const { result } = renderHook(() => useTyping(channelId));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Add typing user
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-2",
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);

      // Remove typing user
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-2",
          isTyping: false,
        });
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it("should auto-remove typing user after timeout", () => {
      const { result } = renderHook(() =>
        useTyping(channelId, { timeoutMs: 5000 }),
      );

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Add typing user
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-2",
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it("should ignore own typing events", () => {
      const { result } = renderHook(() => useTyping(channelId));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Simulate typing event from self
      act(() => {
        subscribeCallback({
          channelId,
          userId: mockUser.id,
          isTyping: true,
        });
      });

      // Should not add self to typing users
      expect(result.current.typingUsers).toHaveLength(0);
    });

    it("should ignore typing events from other channels", () => {
      const { result } = renderHook(() => useTyping(channelId));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Simulate typing event from different channel
      act(() => {
        subscribeCallback({
          channelId: "other-channel",
          userId: "user-2",
          isTyping: true,
        });
      });

      // Should not add user from other channel
      expect(result.current.typingUsers).toHaveLength(0);
    });
  });

  describe("Cleanup", () => {
    it("should stop typing on unmount", () => {
      const { result, unmount } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).toHaveBeenCalledTimes(1);

      unmount();

      // Should emit stop typing on unmount
      expect(mockEmit).toHaveBeenCalledTimes(2);
      expect(mockEmit).toHaveBeenLastCalledWith("message:typing", {
        channelId,
        userId: mockUser.id,
        isTyping: false,
      });
    });

    it("should clear all timers on unmount", () => {
      const { result, unmount } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      const timersBefore = jest.getTimerCount();
      unmount();
      const timersAfter = jest.getTimerCount();

      expect(timersAfter).toBeLessThan(timersBefore);
    });
  });

  describe("Edge Cases", () => {
    it("should not emit when not connected", () => {
      mockUseSocket.mockReturnValue({
        isConnected: false,
        emit: mockEmit,
        subscribe: mockSubscribe,
        socketId: undefined,
      });

      const { result } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it("should not emit when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
        isDevMode: true,
      });

      const { result } = renderHook(() => useTyping(channelId));

      act(() => {
        result.current.handleTyping();
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it("should handle multiple typing users", () => {
      const { result } = renderHook(() => useTyping(channelId));

      const subscribeCallback = mockSubscribe.mock.calls[0][1];

      // Add multiple typing users
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-2",
          isTyping: true,
        });
        subscribeCallback({
          channelId,
          userId: "user-3",
          isTyping: true,
        });
        subscribeCallback({
          channelId,
          userId: "user-4",
          isTyping: true,
        });
      });

      expect(result.current.typingUsers).toHaveLength(3);

      // Remove one user
      act(() => {
        subscribeCallback({
          channelId,
          userId: "user-3",
          isTyping: false,
        });
      });

      expect(result.current.typingUsers).toHaveLength(2);
      expect(
        result.current.typingUsers.find((u) => u.id === "user-3"),
      ).toBeUndefined();
    });
  });
});
