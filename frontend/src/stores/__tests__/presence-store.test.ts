/**
 * @fileoverview Tests for Presence Store
 */

import { act } from "@testing-library/react";
import {
  usePresenceStore,
  selectMyPresence,
  selectMyStatus,
  selectUserPresence,
  selectOnlineUsers,
  selectTypingUsers,
  selectIsAnyoneTyping,
  getChannelContextKey,
  getThreadContextKey,
  getDMContextKey,
} from "../presence-store";

// Mock the presence types import
jest.mock("@/lib/presence/presence-types", () => ({
  DEFAULT_PRESENCE_SETTINGS: {
    autoAway: {
      enabled: true,
      timeout: 300000,
      setStatus: "away",
    },
    idleDetection: {
      enabled: true,
      timeout: 60000,
    },
    privacy: {
      showStatus: true,
      showActivity: true,
    },
    dndSchedule: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00",
    },
  },
}));

describe("usePresenceStore", () => {
  beforeEach(() => {
    act(() => {
      usePresenceStore.getState().reset();
    });
  });

  describe("Initial State", () => {
    it("should have online as default status", () => {
      expect(usePresenceStore.getState().myStatus).toBe("online");
    });

    it("should have null custom status", () => {
      expect(usePresenceStore.getState().myCustomStatus).toBeNull();
    });

    it("should not be idle", () => {
      expect(usePresenceStore.getState().isIdle).toBe(false);
    });

    it("should have empty presence map", () => {
      expect(Object.keys(usePresenceStore.getState().presenceMap)).toHaveLength(
        0,
      );
    });

    it("should have empty typing map", () => {
      expect(Object.keys(usePresenceStore.getState().typingMap)).toHaveLength(
        0,
      );
    });

    it("should not be connected", () => {
      expect(usePresenceStore.getState().isConnected).toBe(false);
    });
  });

  describe("My Presence Actions", () => {
    it("should set my status", () => {
      act(() => usePresenceStore.getState().setMyStatus("away"));
      expect(usePresenceStore.getState().myStatus).toBe("away");
    });

    it("should save previous status when changing", () => {
      act(() => usePresenceStore.getState().setMyStatus("away"));
      expect(usePresenceStore.getState().myPreviousStatus).toBe("online");
    });

    it("should clear idle when setting status", () => {
      act(() => {
        usePresenceStore.getState().setIdle(true);
        usePresenceStore.getState().setMyStatus("online");
      });
      expect(usePresenceStore.getState().isIdle).toBe(false);
    });

    it("should set custom status", () => {
      const customStatus = { emoji: "🎉", text: "Celebrating!" };
      act(() => usePresenceStore.getState().setMyCustomStatus(customStatus));
      expect(usePresenceStore.getState().myCustomStatus).toEqual(customStatus);
    });

    it("should clear custom status", () => {
      act(() =>
        usePresenceStore.getState().setMyCustomStatus({ text: "Test" }),
      );
      act(() => usePresenceStore.getState().clearMyCustomStatus());
      expect(usePresenceStore.getState().myCustomStatus).toBeNull();
    });

    it("should set idle state", () => {
      act(() => usePresenceStore.getState().setIdle(true));
      expect(usePresenceStore.getState().isIdle).toBe(true);
    });

    it("should restore previous status", () => {
      act(() => usePresenceStore.getState().setMyStatus("dnd"));
      act(() => usePresenceStore.getState().setMyStatus("away"));
      act(() => usePresenceStore.getState().restorePreviousStatus());
      expect(usePresenceStore.getState().myStatus).toBe("dnd");
    });
  });

  describe("User Presence Actions", () => {
    it("should set user presence", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserPresence("user-1", { status: "online" }),
      );
      expect(usePresenceStore.getState().presenceMap["user-1"].status).toBe(
        "online",
      );
    });

    it("should set multiple users presence", () => {
      act(() =>
        usePresenceStore.getState().setUsersPresence([
          { userId: "user-1", status: "online" },
          { userId: "user-2", status: "away" },
        ]),
      );
      expect(usePresenceStore.getState().presenceMap["user-1"].status).toBe(
        "online",
      );
      expect(usePresenceStore.getState().presenceMap["user-2"].status).toBe(
        "away",
      );
    });

    it("should remove user presence", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserPresence("user-1", { status: "online" }),
      );
      act(() => usePresenceStore.getState().removeUserPresence("user-1"));
      expect(usePresenceStore.getState().presenceMap["user-1"]).toBeUndefined();
    });

    it("should clear all presence", () => {
      act(() =>
        usePresenceStore.getState().setUsersPresence([
          { userId: "user-1", status: "online" },
          { userId: "user-2", status: "away" },
        ]),
      );
      act(() => usePresenceStore.getState().clearAllPresence());
      expect(Object.keys(usePresenceStore.getState().presenceMap)).toHaveLength(
        0,
      );
    });
  });

  describe("Typing Actions", () => {
    const mockTypingUser = {
      userId: "user-1",
      userName: "Alice",
      startedAt: new Date(),
    };

    it("should set user typing", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserTyping("channel:ch-1", mockTypingUser),
      );
      expect(
        usePresenceStore.getState().typingMap["channel:ch-1"]["user-1"],
      ).toBeDefined();
    });

    it("should clear user typing", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserTyping("channel:ch-1", mockTypingUser),
      );
      act(() =>
        usePresenceStore.getState().clearUserTyping("channel:ch-1", "user-1"),
      );
      expect(
        usePresenceStore.getState().typingMap["channel:ch-1"],
      ).toBeUndefined();
    });

    it("should set context typing", () => {
      const users = [
        mockTypingUser,
        { ...mockTypingUser, userId: "user-2", userName: "Bob" },
      ];
      act(() =>
        usePresenceStore.getState().setContextTyping("channel:ch-1", users),
      );
      expect(
        Object.keys(usePresenceStore.getState().typingMap["channel:ch-1"]),
      ).toHaveLength(2);
    });

    it("should clear context typing", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserTyping("channel:ch-1", mockTypingUser),
      );
      act(() => usePresenceStore.getState().clearContextTyping("channel:ch-1"));
      expect(
        usePresenceStore.getState().typingMap["channel:ch-1"],
      ).toBeUndefined();
    });

    it("should set my typing", () => {
      act(() => usePresenceStore.getState().setMyTyping("channel:ch-1"));
      expect(usePresenceStore.getState().isTyping).toBe(true);
      expect(usePresenceStore.getState().typingInContext).toBe("channel:ch-1");
    });

    it("should clear my typing", () => {
      act(() => usePresenceStore.getState().setMyTyping("channel:ch-1"));
      act(() => usePresenceStore.getState().setMyTyping(null));
      expect(usePresenceStore.getState().isTyping).toBe(false);
      expect(usePresenceStore.getState().typingInContext).toBeNull();
    });
  });

  describe("Online Users Actions", () => {
    it("should set online user ids", () => {
      act(() =>
        usePresenceStore.getState().setOnlineUserIds(["user-1", "user-2"]),
      );
      expect(usePresenceStore.getState().onlineUserIds).toHaveLength(2);
      expect(usePresenceStore.getState().onlineCount).toBe(2);
    });

    it("should add online user", () => {
      act(() => usePresenceStore.getState().setOnlineUserIds(["user-1"]));
      act(() => usePresenceStore.getState().addOnlineUser("user-2"));
      expect(usePresenceStore.getState().onlineUserIds).toContain("user-2");
    });

    it("should not duplicate online user", () => {
      act(() => usePresenceStore.getState().setOnlineUserIds(["user-1"]));
      act(() => usePresenceStore.getState().addOnlineUser("user-1"));
      expect(usePresenceStore.getState().onlineUserIds).toHaveLength(1);
    });

    it("should remove online user", () => {
      act(() =>
        usePresenceStore.getState().setOnlineUserIds(["user-1", "user-2"]),
      );
      act(() => usePresenceStore.getState().removeOnlineUser("user-1"));
      expect(usePresenceStore.getState().onlineUserIds).not.toContain("user-1");
      expect(usePresenceStore.getState().onlineCount).toBe(1);
    });

    it("should set online count", () => {
      act(() => usePresenceStore.getState().setOnlineCount(5));
      expect(usePresenceStore.getState().onlineCount).toBe(5);
    });
  });

  describe("Settings Actions", () => {
    it("should update settings", () => {
      act(() =>
        usePresenceStore.getState().updateSettings({
          autoAway: { enabled: false },
        }),
      );
      expect(usePresenceStore.getState().settings.autoAway.enabled).toBe(false);
    });

    it("should merge nested settings", () => {
      const initialTimeout =
        usePresenceStore.getState().settings.autoAway.timeout;
      act(() =>
        usePresenceStore.getState().updateSettings({
          autoAway: { enabled: false },
        }),
      );
      expect(usePresenceStore.getState().settings.autoAway.timeout).toBe(
        initialTimeout,
      );
    });
  });

  describe("Connection Actions", () => {
    it("should set connected", () => {
      act(() => usePresenceStore.getState().setConnected(true));
      expect(usePresenceStore.getState().isConnected).toBe(true);
    });

    it("should set syncing", () => {
      act(() => usePresenceStore.getState().setSyncing(true));
      expect(usePresenceStore.getState().isSyncing).toBe(true);
    });

    it("should set last sync time", () => {
      const date = new Date();
      act(() => usePresenceStore.getState().setLastSyncAt(date));
      expect(usePresenceStore.getState().lastSyncAt).toEqual(date);
    });
  });

  describe("Initialization", () => {
    it("should initialize with options", () => {
      act(() =>
        usePresenceStore.getState().initialize({
          status: "dnd",
          customStatus: { text: "Busy" },
        }),
      );
      expect(usePresenceStore.getState().myStatus).toBe("dnd");
      expect(usePresenceStore.getState().myCustomStatus?.text).toBe("Busy");
      expect(usePresenceStore.getState().isInitializing).toBe(false);
    });

    it("should set initializing state", () => {
      act(() => usePresenceStore.getState().setInitializing(true));
      expect(usePresenceStore.getState().isInitializing).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup expired typing indicators", () => {
      // Add typing via proper action
      act(() =>
        usePresenceStore.getState().setUserTyping("channel:ch-1", {
          userId: "user-1",
          userName: "Alice",
          startedAt: new Date(),
        }),
      );

      // Verify added
      expect(
        usePresenceStore.getState().typingMap["channel:ch-1"],
      ).toBeDefined();

      // Fast-forward time
      jest.useFakeTimers();
      jest.advanceTimersByTime(6000); // Past the 5 second timeout

      act(() => usePresenceStore.getState().cleanupExpired());
      expect(
        usePresenceStore.getState().typingMap["channel:ch-1"],
      ).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe("Selectors", () => {
    it("should select my presence", () => {
      act(() => {
        usePresenceStore.getState().setMyStatus("away");
        usePresenceStore.getState().setMyCustomStatus({ text: "BRB" });
      });

      const presence = selectMyPresence(usePresenceStore.getState());
      expect(presence.status).toBe("away");
      expect(presence.customStatus?.text).toBe("BRB");
    });

    it("should select my status", () => {
      act(() => usePresenceStore.getState().setMyStatus("dnd"));
      expect(selectMyStatus(usePresenceStore.getState())).toBe("dnd");
    });

    it("should select user presence", () => {
      act(() =>
        usePresenceStore
          .getState()
          .setUserPresence("user-1", { status: "online" }),
      );
      const presence = selectUserPresence("user-1")(
        usePresenceStore.getState(),
      );
      expect(presence?.status).toBe("online");
    });

    it("should select online users", () => {
      act(() =>
        usePresenceStore.getState().setUsersPresence([
          { userId: "user-1", status: "online" },
          { userId: "user-2", status: "away" },
          { userId: "user-3", status: "offline" },
        ]),
      );
      const online = selectOnlineUsers(usePresenceStore.getState());
      expect(online).toHaveLength(2); // online and away
    });

    it("should select typing users", () => {
      act(() =>
        usePresenceStore.getState().setUserTyping("channel:ch-1", {
          userId: "user-1",
          userName: "Alice",
          startedAt: new Date(),
        }),
      );
      const typing = selectTypingUsers("channel:ch-1")(
        usePresenceStore.getState(),
      );
      expect(typing).toHaveLength(1);
    });

    it("should select if anyone typing", () => {
      act(() =>
        usePresenceStore.getState().setUserTyping("channel:ch-1", {
          userId: "user-1",
          userName: "Alice",
          startedAt: new Date(),
        }),
      );
      expect(
        selectIsAnyoneTyping("channel:ch-1")(usePresenceStore.getState()),
      ).toBe(true);
      expect(
        selectIsAnyoneTyping("channel:ch-2")(usePresenceStore.getState()),
      ).toBe(false);
    });
  });
});

describe("Context Key Helpers", () => {
  it("should create channel context key", () => {
    expect(getChannelContextKey("ch-1")).toBe("channel:ch-1");
  });

  it("should create thread context key", () => {
    expect(getThreadContextKey("thread-1")).toBe("thread:thread-1");
  });

  it("should create DM context key", () => {
    expect(getDMContextKey("dm-1")).toBe("dm:dm-1");
  });
});
