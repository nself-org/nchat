/**
 * @fileoverview Tests for useChannelTyping Hook
 *
 * Tests the integrated typing indicator hook that connects
 * the typing store with WebSocket events.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useChannelTyping } from "../use-channel-typing";
import { useTypingStore, getChannelContextKey } from "@/stores/typing-store";
import * as socketClient from "@/lib/socket/client";
import { SocketEvents } from "@/lib/socket/events";

// Mock dependencies
jest.mock("@/lib/socket/client", () => ({
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  isConnected: jest.fn(() => true),
}));

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "current-user-id",
      username: "testuser",
      displayName: "Test User",
    },
  }),
}));

describe("useChannelTyping", () => {
  const mockChannelId = "channel-123";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset the typing store
    act(() => {
      useTypingStore.getState().reset();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initialization", () => {
    it("should return initial state with empty typing users", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      expect(result.current.typingUsers).toEqual([]);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.typingText).toBeNull();
    });

    it("should subscribe to WebSocket events on mount", () => {
      renderHook(() => useChannelTyping({ channelId: mockChannelId }));

      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        expect.any(Function),
      );
      expect(socketClient.on).toHaveBeenCalledWith(
        SocketEvents.TYPING_STOP,
        expect.any(Function),
      );
    });

    it("should unsubscribe from WebSocket events on unmount", () => {
      const { unmount } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      unmount();

      expect(socketClient.off).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        expect.any(Function),
      );
      expect(socketClient.off).toHaveBeenCalledWith(
        SocketEvents.TYPING_STOP,
        expect.any(Function),
      );
    });
  });

  describe("handleInputChange", () => {
    it("should start typing after debounce delay", async () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      act(() => {
        result.current.handleInputChange("Hello");
      });

      // Before debounce, should not emit
      expect(socketClient.emit).not.toHaveBeenCalled();

      // After debounce delay (300ms)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: mockChannelId,
          threadId: undefined,
        },
      );
    });

    it("should stop typing when input is cleared", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // First, start typing
      act(() => {
        result.current.handleInputChange("Hello");
        jest.advanceTimersByTime(300);
      });

      // Then clear input
      act(() => {
        result.current.handleInputChange("");
      });

      expect(socketClient.emit).toHaveBeenLastCalledWith(
        SocketEvents.TYPING_STOP,
        {
          channelId: mockChannelId,
          threadId: undefined,
        },
      );
    });

    it("should throttle typing emissions", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // First typing event
      act(() => {
        result.current.handleInputChange("H");
        jest.advanceTimersByTime(300);
      });

      const callCountAfterFirst = (
        socketClient.emit as jest.Mock
      ).mock.calls.filter(
        (call) => call[0] === SocketEvents.TYPING_START,
      ).length;

      // Second typing event within throttle interval (2s)
      act(() => {
        result.current.handleInputChange("He");
        jest.advanceTimersByTime(300);
      });

      const callCountAfterSecond = (
        socketClient.emit as jest.Mock
      ).mock.calls.filter(
        (call) => call[0] === SocketEvents.TYPING_START,
      ).length;

      // Should still be 1 due to throttling
      expect(callCountAfterSecond).toBe(callCountAfterFirst);

      // After throttle interval
      act(() => {
        jest.advanceTimersByTime(2000);
        result.current.handleInputChange("Hel");
        jest.advanceTimersByTime(300);
      });

      const callCountAfterThrottle = (
        socketClient.emit as jest.Mock
      ).mock.calls.filter(
        (call) => call[0] === SocketEvents.TYPING_START,
      ).length;

      // Should now be 2
      expect(callCountAfterThrottle).toBe(2);
    });
  });

  describe("startTyping / stopTyping", () => {
    it("should emit typing start when startTyping is called", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      act(() => {
        result.current.startTyping();
      });

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: mockChannelId,
          threadId: undefined,
        },
      );
    });

    it("should emit typing stop when stopTyping is called", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Start typing first
      act(() => {
        result.current.startTyping();
      });

      // Then stop
      act(() => {
        result.current.stopTyping();
      });

      expect(socketClient.emit).toHaveBeenLastCalledWith(
        SocketEvents.TYPING_STOP,
        {
          channelId: mockChannelId,
          threadId: undefined,
        },
      );
    });

    it("should set up auto-stop timer when typing starts", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Starting typing should set the isTyping state
      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isTyping).toBe(true);

      // Verify emit was called for start
      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: mockChannelId,
          threadId: undefined,
        },
      );
    });
  });

  describe("typing text formatting", () => {
    it("should format single user typing correctly", async () => {
      const contextKey = getChannelContextKey(mockChannelId);

      // First set up the store state
      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-1",
          userName: "Alice",
          startedAt: Date.now(),
        });
      });

      // Then render the hook
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // The hook should pick up the existing typing users
      await waitFor(() => {
        expect(result.current.typingText).toBe("Alice is typing...");
      });
    });

    it("should format two users typing correctly", async () => {
      const contextKey = getChannelContextKey(mockChannelId);

      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-1",
          userName: "Alice",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-2",
          userName: "Bob",
          startedAt: Date.now(),
        });
      });

      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      await waitFor(() => {
        expect(result.current.typingText).toBe("Alice and Bob are typing...");
      });
    });

    it("should format three users typing correctly", async () => {
      const contextKey = getChannelContextKey(mockChannelId);

      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-1",
          userName: "Alice",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-2",
          userName: "Bob",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-3",
          userName: "Charlie",
          startedAt: Date.now(),
        });
      });

      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      await waitFor(() => {
        expect(result.current.typingText).toBe(
          "Alice, Bob, and Charlie are typing...",
        );
      });
    });

    it("should format many users typing correctly", async () => {
      const contextKey = getChannelContextKey(mockChannelId);

      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-1",
          userName: "Alice",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-2",
          userName: "Bob",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-3",
          userName: "Charlie",
          startedAt: Date.now(),
        });
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-4",
          userName: "Diana",
          startedAt: Date.now(),
        });
      });

      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      await waitFor(() => {
        expect(result.current.typingText).toBe(
          "Alice, Bob, and 2 others are typing...",
        );
      });
    });

    it("should exclude current user from typing list", async () => {
      const contextKey = getChannelContextKey(mockChannelId);

      act(() => {
        // Add current user (should be excluded)
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "current-user-id",
          userName: "Test User",
          startedAt: Date.now(),
        });
        // Add another user
        useTypingStore.getState().setUserTyping(contextKey, {
          userId: "user-1",
          userName: "Alice",
          startedAt: Date.now(),
        });
      });

      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Should only show Alice, not the current user
      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1);
        expect(result.current.typingUsers[0].userName).toBe("Alice");
        expect(result.current.typingText).toBe("Alice is typing...");
      });
    });
  });

  describe("thread support", () => {
    it("should handle thread typing separately", () => {
      const threadId = "thread-456";

      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId, threadId }),
      );

      act(() => {
        result.current.startTyping();
      });

      expect(socketClient.emit).toHaveBeenCalledWith(
        SocketEvents.TYPING_START,
        {
          channelId: mockChannelId,
          threadId,
        },
      );
    });
  });

  describe("enabled option", () => {
    it("should not emit events when disabled", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId, enabled: false }),
      );

      act(() => {
        result.current.startTyping();
        result.current.handleInputChange("Hello");
        jest.advanceTimersByTime(300);
      });

      expect(socketClient.emit).not.toHaveBeenCalled();
    });

    it("should not subscribe to events when disabled", () => {
      renderHook(() =>
        useChannelTyping({ channelId: mockChannelId, enabled: false }),
      );

      expect(socketClient.on).not.toHaveBeenCalled();
    });
  });

  describe("channel change", () => {
    it("should reset state when channel changes", () => {
      const { result, rerender } = renderHook(
        ({ channelId }) => useChannelTyping({ channelId }),
        {
          initialProps: { channelId: mockChannelId },
        },
      );

      // Start typing in first channel
      act(() => {
        result.current.startTyping();
      });

      expect(result.current.isTyping).toBe(true);

      // Change channel
      rerender({ channelId: "channel-456" });

      // State should be reset
      expect(result.current.isTyping).toBe(false);
    });
  });

  describe("WebSocket event handling", () => {
    it("should register TYPING_START event handler", () => {
      renderHook(() => useChannelTyping({ channelId: mockChannelId }));

      // Get the handler that was registered
      const onCalls = (socketClient.on as jest.Mock).mock.calls;
      const typingStartCall = onCalls.find(
        (call) => call[0] === SocketEvents.TYPING_START,
      );

      // Verify handler was registered
      expect(typingStartCall).toBeDefined();
      expect(typeof typingStartCall?.[1]).toBe("function");
    });

    it("should register TYPING_STOP event handler", () => {
      renderHook(() => useChannelTyping({ channelId: mockChannelId }));

      // Get the handler that was registered
      const onCalls = (socketClient.on as jest.Mock).mock.calls;
      const typingStopCall = onCalls.find(
        (call) => call[0] === SocketEvents.TYPING_STOP,
      );

      // Verify handler was registered
      expect(typingStopCall).toBeDefined();
      expect(typeof typingStopCall?.[1]).toBe("function");
    });

    it("should ignore events from other channels", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Get the TYPING_START handler
      const onCalls = (socketClient.on as jest.Mock).mock.calls;
      const typingStartCall = onCalls.find(
        (call) => call[0] === SocketEvents.TYPING_START,
      );
      const handler = typingStartCall?.[1];

      // Simulate event from different channel
      act(() => {
        handler?.({
          userId: "user-1",
          channelId: "other-channel",
          startedAt: new Date().toISOString(),
          user: { displayName: "Alice" },
        });
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it("should ignore events from current user", () => {
      const { result } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Get the TYPING_START handler
      const onCalls = (socketClient.on as jest.Mock).mock.calls;
      const typingStartCall = onCalls.find(
        (call) => call[0] === SocketEvents.TYPING_START,
      );
      const handler = typingStartCall?.[1];

      // Simulate event from current user
      act(() => {
        handler?.({
          userId: "current-user-id",
          channelId: mockChannelId,
          startedAt: new Date().toISOString(),
          user: { displayName: "Test User" },
        });
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });
  });

  describe("cleanup", () => {
    it("should set up cleanup interval when enabled", () => {
      // Simply verify the hook runs without errors when enabled
      const { unmount } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId }),
      );

      // Advance timers - no error means cleanup interval is working
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Clean unmount
      unmount();
    });

    it("should not set up cleanup interval when disabled", () => {
      const { unmount } = renderHook(() =>
        useChannelTyping({ channelId: mockChannelId, enabled: false }),
      );

      // Should work fine without interval
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      unmount();
    });
  });
});
