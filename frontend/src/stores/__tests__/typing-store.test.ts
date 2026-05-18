/**
 * @fileoverview Tests for Typing Store
 */

import { act } from "@testing-library/react";
import {
  useTypingStore,
  getChannelContextKey,
  getThreadContextKey,
  getDMContextKey,
  parseContextKey,
  getTypingIndicatorText,
  selectChannelTypingUsers,
  selectThreadTypingUsers,
  selectDMTypingUsers,
  selectIsAnyoneTyping,
  selectTypingCount,
  selectCurrentUserTyping,
  type TypingUser,
} from "../typing-store";

describe("useTypingStore", () => {
  const mockTypingUser: TypingUser = {
    userId: "user-1",
    userName: "Alice",
    userAvatar: "https://example.com/avatar.jpg",
    startedAt: Date.now(),
  };

  beforeEach(() => {
    act(() => {
      useTypingStore.getState().reset();
    });
  });

  describe("Initial State", () => {
    it("should have empty typing map", () => {
      expect(useTypingStore.getState().typingByContext.size).toBe(0);
    });

    it("should not be typing", () => {
      expect(useTypingStore.getState().isTyping).toBe(false);
      expect(useTypingStore.getState().typingInContext).toBeNull();
    });

    it("should have default timeout values", () => {
      expect(useTypingStore.getState().typingTimeout).toBe(5000);
      expect(useTypingStore.getState().debounceDelay).toBe(300);
    });
  });

  describe("setUserTyping", () => {
    it("should add typing user to context", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      const users = useTypingStore.getState().getTypingUsers(contextKey);
      expect(users).toHaveLength(1);
      expect(users[0].userId).toBe("user-1");
    });

    it("should create context if not exists", () => {
      const contextKey = "channel:new-channel";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      expect(useTypingStore.getState().typingByContext.has(contextKey)).toBe(
        true,
      );
    });

    it("should update startedAt timestamp", () => {
      const contextKey = "channel:ch-1";
      const oldTimestamp = Date.now() - 10000;
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, {
          ...mockTypingUser,
          startedAt: oldTimestamp,
        }),
      );

      const users = useTypingStore.getState().getTypingUsers(contextKey);
      expect(users[0].startedAt).toBeGreaterThan(oldTimestamp);
    });
  });

  describe("clearUserTyping", () => {
    it("should remove user from context", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );
      act(() =>
        useTypingStore.getState().clearUserTyping(contextKey, "user-1"),
      );

      expect(useTypingStore.getState().getTypingUsers(contextKey)).toHaveLength(
        0,
      );
    });

    it("should clean up empty context map", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );
      act(() =>
        useTypingStore.getState().clearUserTyping(contextKey, "user-1"),
      );

      expect(useTypingStore.getState().typingByContext.has(contextKey)).toBe(
        false,
      );
    });

    it("should handle non-existent context gracefully", () => {
      expect(() => {
        act(() =>
          useTypingStore.getState().clearUserTyping("non-existent", "user-1"),
        );
      }).not.toThrow();
    });
  });

  describe("setTypingUsers", () => {
    it("should set all typing users for context", () => {
      const contextKey = "channel:ch-1";
      const users: TypingUser[] = [
        mockTypingUser,
        { ...mockTypingUser, userId: "user-2", userName: "Bob" },
      ];
      act(() => useTypingStore.getState().setTypingUsers(contextKey, users));

      expect(useTypingStore.getState().getTypingUsers(contextKey)).toHaveLength(
        2,
      );
    });

    it("should delete context if empty array", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );
      act(() => useTypingStore.getState().setTypingUsers(contextKey, []));

      expect(useTypingStore.getState().typingByContext.has(contextKey)).toBe(
        false,
      );
    });
  });

  describe("clearContextTyping", () => {
    it("should clear all typing for context", () => {
      const contextKey = "channel:ch-1";
      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser);
        useTypingStore
          .getState()
          .setUserTyping(contextKey, { ...mockTypingUser, userId: "user-2" });
      });
      act(() => useTypingStore.getState().clearContextTyping(contextKey));

      expect(useTypingStore.getState().typingByContext.has(contextKey)).toBe(
        false,
      );
    });
  });

  describe("getTypingUsers", () => {
    it("should return empty array for non-existent context", () => {
      expect(useTypingStore.getState().getTypingUsers("non-existent")).toEqual(
        [],
      );
    });

    it("should return array of typing users", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      const users = useTypingStore.getState().getTypingUsers(contextKey);
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(1);
    });
  });

  describe("startTyping / stopTyping", () => {
    it("should start typing in context", () => {
      act(() => useTypingStore.getState().startTyping("channel:ch-1"));

      const state = useTypingStore.getState();
      expect(state.isTyping).toBe(true);
      expect(state.typingInContext).toBe("channel:ch-1");
    });

    it("should stop typing", () => {
      act(() => useTypingStore.getState().startTyping("channel:ch-1"));
      act(() => useTypingStore.getState().stopTyping());

      const state = useTypingStore.getState();
      expect(state.isTyping).toBe(false);
      expect(state.typingInContext).toBeNull();
    });
  });

  describe("cleanupExpired", () => {
    it("should remove expired typing indicators", () => {
      const contextKey = "channel:ch-1";

      // Add a user via the proper action
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      // Verify user was added
      expect(useTypingStore.getState().getTypingUsers(contextKey)).toHaveLength(
        1,
      );

      // Fast-forward time and cleanup
      jest.useFakeTimers();
      jest.advanceTimersByTime(6000); // Past the 5 second timeout

      act(() => useTypingStore.getState().cleanupExpired());

      // After cleanup with expired time, should be empty
      expect(useTypingStore.getState().getTypingUsers(contextKey)).toHaveLength(
        0,
      );

      jest.useRealTimers();
    });
  });

  describe("Configuration", () => {
    it("should set typing timeout", () => {
      act(() => useTypingStore.getState().setTypingTimeout(10000));
      expect(useTypingStore.getState().typingTimeout).toBe(10000);
    });

    it("should set debounce delay", () => {
      act(() => useTypingStore.getState().setDebounceDelay(500));
      expect(useTypingStore.getState().debounceDelay).toBe(500);
    });
  });

  describe("Selectors", () => {
    it("should select channel typing users", () => {
      const contextKey = getChannelContextKey("ch-1");
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      const users = selectChannelTypingUsers("ch-1")(useTypingStore.getState());
      expect(users).toHaveLength(1);
    });

    it("should select thread typing users", () => {
      const contextKey = getThreadContextKey("thread-1");
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      const users = selectThreadTypingUsers("thread-1")(
        useTypingStore.getState(),
      );
      expect(users).toHaveLength(1);
    });

    it("should select DM typing users", () => {
      const contextKey = getDMContextKey("dm-1");
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      const users = selectDMTypingUsers("dm-1")(useTypingStore.getState());
      expect(users).toHaveLength(1);
    });

    it("should select if anyone is typing", () => {
      const contextKey = "channel:ch-1";
      act(() =>
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser),
      );

      expect(selectIsAnyoneTyping(contextKey)(useTypingStore.getState())).toBe(
        true,
      );
      expect(
        selectIsAnyoneTyping("other-context")(useTypingStore.getState()),
      ).toBe(false);
    });

    it("should select typing count", () => {
      const contextKey = "channel:ch-1";
      act(() => {
        useTypingStore.getState().setUserTyping(contextKey, mockTypingUser);
        useTypingStore
          .getState()
          .setUserTyping(contextKey, { ...mockTypingUser, userId: "user-2" });
      });

      expect(selectTypingCount(contextKey)(useTypingStore.getState())).toBe(2);
    });

    it("should select current user typing state", () => {
      act(() => useTypingStore.getState().startTyping("channel:ch-1"));

      const typing = selectCurrentUserTyping(useTypingStore.getState());
      expect(typing.isTyping).toBe(true);
      expect(typing.context).toBe("channel:ch-1");
    });
  });
});

describe("Context Key Helpers", () => {
  describe("getChannelContextKey", () => {
    it("should create channel context key", () => {
      expect(getChannelContextKey("ch-1")).toBe("channel:ch-1");
    });
  });

  describe("getThreadContextKey", () => {
    it("should create thread context key", () => {
      expect(getThreadContextKey("thread-1")).toBe("thread:thread-1");
    });
  });

  describe("getDMContextKey", () => {
    it("should create DM context key", () => {
      expect(getDMContextKey("dm-1")).toBe("dm:dm-1");
    });
  });

  describe("parseContextKey", () => {
    it("should parse channel context key", () => {
      const result = parseContextKey("channel:ch-1");
      expect(result).toEqual({ type: "channel", id: "ch-1" });
    });

    it("should parse thread context key", () => {
      const result = parseContextKey("thread:thread-1");
      expect(result).toEqual({ type: "thread", id: "thread-1" });
    });

    it("should parse DM context key", () => {
      const result = parseContextKey("dm:dm-1");
      expect(result).toEqual({ type: "dm", id: "dm-1" });
    });

    it("should return null for invalid key", () => {
      expect(parseContextKey("invalid")).toBeNull();
      expect(parseContextKey("unknown:id")).toBeNull();
      expect(parseContextKey("")).toBeNull();
    });
  });
});

describe("getTypingIndicatorText", () => {
  const createUsers = (count: number): TypingUser[] => {
    const names = ["Alice", "Bob", "Charlie", "David", "Eve"];
    return Array.from({ length: count }, (_, i) => ({
      userId: `user-${i}`,
      userName: names[i] || `User${i}`,
      startedAt: Date.now(),
    }));
  };

  it("should return empty string for no users", () => {
    expect(getTypingIndicatorText([])).toBe("");
  });

  it("should return singular text for one user", () => {
    expect(getTypingIndicatorText(createUsers(1))).toBe("Alice is typing...");
  });

  it("should return text for two users", () => {
    expect(getTypingIndicatorText(createUsers(2))).toBe(
      "Alice and Bob are typing...",
    );
  });

  it("should return text for three users", () => {
    expect(getTypingIndicatorText(createUsers(3))).toBe(
      "Alice, Bob, and Charlie are typing...",
    );
  });

  it("should return text for many users", () => {
    expect(getTypingIndicatorText(createUsers(5))).toBe(
      "Alice, Bob, and 3 others are typing...",
    );
  });
});
