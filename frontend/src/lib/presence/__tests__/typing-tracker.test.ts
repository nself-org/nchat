/**
 * @fileoverview Tests for Typing Tracker
 */

import {
  TypingTracker,
  getTypingTracker,
  destroyTypingTracker,
  getTypingText,
} from "../typing-tracker";
import type { TypingStatus } from "../presence-types";

describe("TypingTracker", () => {
  let tracker: TypingTracker;
  let onTypingStartMock: jest.Mock;
  let onTypingStopMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    onTypingStartMock = jest.fn();
    onTypingStopMock = jest.fn();

    tracker = new TypingTracker({
      typingTimeout: 5000,
      throttleInterval: 2000,
      onTypingStart: onTypingStartMock,
      onTypingStop: onTypingStopMock,
    });
  });

  afterEach(() => {
    tracker.reset();
    destroyTypingTracker();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("createContextKey", () => {
    it("should create channel context key", () => {
      expect(TypingTracker.createContextKey({ channelId: "ch-1" })).toBe(
        "channel:ch-1",
      );
    });

    it("should create thread context key (takes priority)", () => {
      expect(
        TypingTracker.createContextKey({ channelId: "ch-1", threadId: "th-1" }),
      ).toBe("thread:th-1");
    });

    it("should return empty string for empty context", () => {
      expect(TypingTracker.createContextKey({})).toBe("");
    });
  });

  describe("parseContextKey", () => {
    it("should parse channel context key", () => {
      expect(TypingTracker.parseContextKey("channel:ch-1")).toEqual({
        channelId: "ch-1",
      });
    });

    it("should parse thread context key", () => {
      expect(TypingTracker.parseContextKey("thread:th-1")).toEqual({
        threadId: "th-1",
      });
    });

    it("should return empty object for invalid key", () => {
      expect(TypingTracker.parseContextKey("invalid")).toEqual({});
    });
  });

  describe("handleTyping (current user)", () => {
    it("should call onTypingStart immediately on first keypress", () => {
      tracker.handleTyping({ channelId: "ch-1" });

      expect(onTypingStartMock).toHaveBeenCalledWith("channel:ch-1");
    });

    it("should throttle subsequent typing broadcasts", () => {
      tracker.handleTyping({ channelId: "ch-1" });

      // Clear mock to track next call
      onTypingStartMock.mockClear();

      // Type again immediately
      tracker.handleTyping({ channelId: "ch-1" });

      // Should not call again (throttled)
      expect(onTypingStartMock).not.toHaveBeenCalled();

      // Advance past throttle interval
      jest.advanceTimersByTime(2000);

      // Type again
      tracker.handleTyping({ channelId: "ch-1" });

      // Should call now
      expect(onTypingStartMock).toHaveBeenCalledTimes(1);
    });

    it("should track current typing context", () => {
      tracker.handleTyping({ channelId: "ch-1" });

      expect(tracker.getCurrentContext()).toBe("channel:ch-1");
      expect(tracker.isTyping()).toBe(true);
    });

    it("should stop typing in old context when changing channels", () => {
      tracker.handleTyping({ channelId: "ch-1" });

      // Switch to new channel
      tracker.handleTyping({ channelId: "ch-2" });

      expect(onTypingStopMock).toHaveBeenCalledWith("channel:ch-1");
      expect(tracker.getCurrentContext()).toBe("channel:ch-2");
    });

    it("should auto-stop typing after timeout", () => {
      tracker.handleTyping({ channelId: "ch-1" });

      jest.advanceTimersByTime(5000);

      expect(onTypingStopMock).toHaveBeenCalledWith("channel:ch-1");
      expect(tracker.isTyping()).toBe(false);
    });
  });

  describe("stopTyping", () => {
    it("should stop current typing", () => {
      tracker.handleTyping({ channelId: "ch-1" });
      tracker.stopTyping();

      expect(onTypingStopMock).toHaveBeenCalledWith("channel:ch-1");
      expect(tracker.isTyping()).toBe(false);
      expect(tracker.getCurrentContext()).toBeNull();
    });

    it("should do nothing if not typing", () => {
      tracker.stopTyping();

      expect(onTypingStopMock).not.toHaveBeenCalled();
    });
  });

  describe("setUserTyping (other users)", () => {
    const mockUser: TypingStatus = {
      userId: "user-1",
      userName: "Alice",
      startedAt: new Date(),
    };

    it("should add a typing user", () => {
      tracker.setUserTyping("channel:ch-1", mockUser);

      const typingUsers = tracker.getTypingUsers("channel:ch-1");
      expect(typingUsers).toHaveLength(1);
      expect(typingUsers[0].userId).toBe("user-1");
    });

    it("should update typing user timestamp", () => {
      const initialTime = new Date();
      tracker.setUserTyping("channel:ch-1", {
        ...mockUser,
        startedAt: initialTime,
      });

      jest.advanceTimersByTime(1000);

      tracker.setUserTyping("channel:ch-1", mockUser);

      const typingUsers = tracker.getTypingUsers("channel:ch-1");
      expect(typingUsers[0].startedAt.getTime()).toBeGreaterThan(
        initialTime.getTime(),
      );
    });

    it("should auto-clear typing user after timeout", () => {
      tracker.setUserTyping("channel:ch-1", mockUser);

      jest.advanceTimersByTime(5000);

      expect(tracker.getTypingUsers("channel:ch-1")).toHaveLength(0);
    });

    it("should handle multiple typing users", () => {
      tracker.setUserTyping("channel:ch-1", mockUser);
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-2",
        userName: "Bob",
        startedAt: new Date(),
      });

      expect(tracker.getTypingUsers("channel:ch-1")).toHaveLength(2);
    });
  });

  describe("clearUserTyping", () => {
    it("should remove specific user", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-2",
        userName: "Bob",
        startedAt: new Date(),
      });

      tracker.clearUserTyping("channel:ch-1", "user-1");

      const typingUsers = tracker.getTypingUsers("channel:ch-1");
      expect(typingUsers).toHaveLength(1);
      expect(typingUsers[0].userId).toBe("user-2");
    });
  });

  describe("setTypingUsers", () => {
    it("should replace all typing users for a context", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      tracker.setTypingUsers("channel:ch-1", [
        { userId: "user-2", userName: "Bob", startedAt: new Date() },
        { userId: "user-3", userName: "Charlie", startedAt: new Date() },
      ]);

      const typingUsers = tracker.getTypingUsers("channel:ch-1");
      expect(typingUsers).toHaveLength(2);
      expect(typingUsers.map((u) => u.userId)).toEqual(["user-2", "user-3"]);
    });
  });

  describe("clearContextTyping", () => {
    it("should clear all typing users in context", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-2",
        userName: "Bob",
        startedAt: new Date(),
      });

      tracker.clearContextTyping("channel:ch-1");

      expect(tracker.getTypingUsers("channel:ch-1")).toHaveLength(0);
    });
  });

  describe("getChannelTypingUsers", () => {
    it("should get typing users for a channel", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      const typingUsers = tracker.getChannelTypingUsers("ch-1");
      expect(typingUsers).toHaveLength(1);
    });
  });

  describe("getThreadTypingUsers", () => {
    it("should get typing users for a thread", () => {
      tracker.setUserTyping("thread:th-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      const typingUsers = tracker.getThreadTypingUsers("th-1");
      expect(typingUsers).toHaveLength(1);
    });
  });

  describe("hasTypingUsers", () => {
    it("should return true if users are typing", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      expect(tracker.hasTypingUsers("channel:ch-1")).toBe(true);
    });

    it("should return false if no users typing", () => {
      expect(tracker.hasTypingUsers("channel:ch-1")).toBe(false);
    });
  });

  describe("getTypingCount", () => {
    it("should return correct count", () => {
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-2",
        userName: "Bob",
        startedAt: new Date(),
      });

      expect(tracker.getTypingCount("channel:ch-1")).toBe(2);
    });
  });

  describe("reset", () => {
    it("should clear all state", () => {
      tracker.handleTyping({ channelId: "ch-1" });
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      tracker.reset();

      expect(tracker.isTyping()).toBe(false);
      expect(tracker.getTypingUsers("channel:ch-1")).toHaveLength(0);
    });
  });

  describe("cleanupExpired", () => {
    it("should remove expired typing indicators", () => {
      // Add typing user
      tracker.setUserTyping("channel:ch-1", {
        userId: "user-1",
        userName: "Alice",
        startedAt: new Date(),
      });

      // Advance time past the timeout
      jest.advanceTimersByTime(10000);

      tracker.cleanupExpired();

      expect(tracker.getTypingUsers("channel:ch-1")).toHaveLength(0);
    });
  });

  describe("Singleton", () => {
    it("should return same instance", () => {
      const instance1 = getTypingTracker();
      const instance2 = getTypingTracker();

      expect(instance1).toBe(instance2);
    });

    it("should allow destroying and recreating", () => {
      const instance1 = getTypingTracker();
      destroyTypingTracker();

      const instance2 = getTypingTracker();
      expect(instance1).not.toBe(instance2);
    });
  });
});

describe("getTypingText", () => {
  const createUser = (name: string): TypingStatus => ({
    userId: `${name.toLowerCase()}-id`,
    userName: name,
    startedAt: new Date(),
  });

  it("should return empty string for no users", () => {
    expect(getTypingText([])).toBe("");
  });

  it("should format single user", () => {
    expect(getTypingText([createUser("Alice")])).toBe("Alice is typing...");
  });

  it("should format two users", () => {
    expect(getTypingText([createUser("Alice"), createUser("Bob")])).toBe(
      "Alice and Bob are typing...",
    );
  });

  it("should format three users", () => {
    expect(
      getTypingText([
        createUser("Alice"),
        createUser("Bob"),
        createUser("Charlie"),
      ]),
    ).toBe("Alice, Bob, and Charlie are typing...");
  });

  it("should format more than three users", () => {
    expect(
      getTypingText([
        createUser("Alice"),
        createUser("Bob"),
        createUser("Charlie"),
        createUser("Dave"),
        createUser("Eve"),
      ]),
    ).toBe("Alice, Bob, and 3 others are typing...");
  });
});
