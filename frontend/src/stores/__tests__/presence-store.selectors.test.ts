/**
 * Tests for presence-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { PresenceStore, PresenceState } from "../presence-store";
import type {
  PresenceSettings,
  UserPresence,
  TypingStatus,
} from "@/lib/presence/presence-types";
import { DEFAULT_PRESENCE_SETTINGS } from "@/lib/presence/presence-types";
import {
  selectMyPresence,
  selectMyStatus,
  selectMyCustomStatus,
  selectUserPresence,
  selectUserStatus,
  selectIsUserOnline,
  selectOnlineUsers,
  selectOnlineCount,
  selectTypingUsers,
  selectChannelTypingUsers,
  selectThreadTypingUsers,
  selectIsAnyoneTyping,
  selectSettings,
  selectIsConnected,
} from "../presence-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTypingStatus(overrides?: Partial<TypingStatus>): TypingStatus {
  return {
    userId: "u1",
    userName: "Alice",
    startedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeUserPresence(overrides?: Partial<UserPresence>): UserPresence {
  return {
    userId: "u2",
    status: "online",
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): PresenceStore {
  const defaultState: PresenceState = {
    myStatus: "online",
    myCustomStatus: null,
    myPreviousStatus: "online",
    isIdle: false,
    presenceMap: {},
    typingMap: {},
    isTyping: false,
    typingInContext: null,
    onlineUserIds: [],
    onlineCount: 0,
    settings: DEFAULT_PRESENCE_SETTINGS,
    isConnected: false,
    lastSyncAt: null,
    isInitializing: false,
    isSyncing: false,
  };
  const stubs = {
    // actions
    setMyStatus: () => undefined,
    setMyCustomStatus: () => undefined,
    clearMyCustomStatus: () => undefined,
    setIdle: () => undefined,
    restorePreviousStatus: () => undefined,
    setUserPresence: () => undefined,
    setUsersPresence: () => undefined,
    removeUserPresence: () => undefined,
    clearAllPresence: () => undefined,
    setUserTyping: () => undefined,
    clearUserTyping: () => undefined,
    setContextTyping: () => undefined,
    clearContextTyping: () => undefined,
    setMyTyping: () => undefined,
    setOnlineUserIds: () => undefined,
    addOnlineUser: () => undefined,
    removeOnlineUser: () => undefined,
    setOnlineCount: () => undefined,
    updateSettings: () => undefined,
    setConnected: () => undefined,
    setSyncing: () => undefined,
    setLastSyncAt: () => undefined,
    setInitializing: () => undefined,
    initialize: () => undefined,
    reset: () => undefined,
    cleanupExpired: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as PresenceStore;
}

// ---------------------------------------------------------------------------
// selectMyPresence
// ---------------------------------------------------------------------------

describe("selectMyPresence", () => {
  it("returns default presence shape", () => {
    const result = selectMyPresence(makeState());
    expect(result.status).toBe("online");
    expect(result.customStatus).toBeNull();
    expect(result.isIdle).toBe(false);
  });

  it("reflects updated status and idle state", () => {
    const result = selectMyPresence(
      makeState({ myStatus: "away", myCustomStatus: null, isIdle: true }),
    );
    expect(result.status).toBe("away");
    expect(result.isIdle).toBe(true);
  });

  it("reflects custom status when set", () => {
    const customStatus = { emoji: "🎯", text: "Focusing" };
    const result = selectMyPresence(makeState({ myCustomStatus: customStatus }));
    expect(result.customStatus).toBe(customStatus);
  });
});

// ---------------------------------------------------------------------------
// selectMyStatus
// ---------------------------------------------------------------------------

describe("selectMyStatus", () => {
  it("returns online by default", () => {
    expect(selectMyStatus(makeState())).toBe("online");
  });

  it("returns the current status", () => {
    expect(selectMyStatus(makeState({ myStatus: "dnd" }))).toBe("dnd");
  });
});

// ---------------------------------------------------------------------------
// selectMyCustomStatus
// ---------------------------------------------------------------------------

describe("selectMyCustomStatus", () => {
  it("returns null by default", () => {
    expect(selectMyCustomStatus(makeState())).toBeNull();
  });

  it("returns the custom status when set", () => {
    const customStatus = { emoji: "🏠", text: "Working remotely" };
    expect(selectMyCustomStatus(makeState({ myCustomStatus: customStatus }))).toBe(
      customStatus,
    );
  });
});

// ---------------------------------------------------------------------------
// selectUserPresence
// ---------------------------------------------------------------------------

describe("selectUserPresence", () => {
  it("returns undefined when user is not in presence map", () => {
    expect(selectUserPresence("u99")(makeState())).toBeUndefined();
  });

  it("returns the user presence when present", () => {
    const presence = makeUserPresence({ userId: "u2", status: "away" });
    const presenceMap = { u2: presence };
    expect(selectUserPresence("u2")(makeState({ presenceMap }))).toBe(presence);
  });
});

// ---------------------------------------------------------------------------
// selectUserStatus
// ---------------------------------------------------------------------------

describe("selectUserStatus", () => {
  it("returns offline when user is not in presence map", () => {
    expect(selectUserStatus("u99")(makeState())).toBe("offline");
  });

  it("returns the user status from the presence map", () => {
    const presenceMap = {
      u2: makeUserPresence({ userId: "u2", status: "away" }),
    };
    expect(selectUserStatus("u2")(makeState({ presenceMap }))).toBe("away");
  });

  it("returns dnd status correctly", () => {
    const presenceMap = {
      u3: makeUserPresence({ userId: "u3", status: "dnd" }),
    };
    expect(selectUserStatus("u3")(makeState({ presenceMap }))).toBe("dnd");
  });
});

// ---------------------------------------------------------------------------
// selectIsUserOnline
// ---------------------------------------------------------------------------

describe("selectIsUserOnline", () => {
  it("returns false when user is not in presence map", () => {
    expect(selectIsUserOnline("u99")(makeState())).toBe(false);
  });

  it("returns true for online status", () => {
    const presenceMap = { u2: makeUserPresence({ userId: "u2", status: "online" }) };
    expect(selectIsUserOnline("u2")(makeState({ presenceMap }))).toBe(true);
  });

  it("returns true for dnd status", () => {
    const presenceMap = { u2: makeUserPresence({ userId: "u2", status: "dnd" }) };
    expect(selectIsUserOnline("u2")(makeState({ presenceMap }))).toBe(true);
  });

  it("returns false for away status", () => {
    const presenceMap = { u2: makeUserPresence({ userId: "u2", status: "away" }) };
    expect(selectIsUserOnline("u2")(makeState({ presenceMap }))).toBe(false);
  });

  it("returns false for offline status", () => {
    const presenceMap = { u2: makeUserPresence({ userId: "u2", status: "offline" }) };
    expect(selectIsUserOnline("u2")(makeState({ presenceMap }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectOnlineUsers
// ---------------------------------------------------------------------------

describe("selectOnlineUsers", () => {
  it("returns empty array when presence map is empty", () => {
    expect(selectOnlineUsers(makeState())).toEqual([]);
  });

  it("returns users with online, away, and dnd statuses", () => {
    const presenceMap = {
      u1: makeUserPresence({ userId: "u1", status: "online" }),
      u2: makeUserPresence({ userId: "u2", status: "away" }),
      u3: makeUserPresence({ userId: "u3", status: "dnd" }),
      u4: makeUserPresence({ userId: "u4", status: "offline" }),
      u5: makeUserPresence({ userId: "u5", status: "invisible" }),
    };
    const result = selectOnlineUsers(makeState({ presenceMap }));
    expect(result).toHaveLength(3);
    const statuses = result.map((p) => p.status);
    expect(statuses).toContain("online");
    expect(statuses).toContain("away");
    expect(statuses).toContain("dnd");
  });
});

// ---------------------------------------------------------------------------
// selectOnlineCount
// ---------------------------------------------------------------------------

describe("selectOnlineCount", () => {
  it("returns 0 by default", () => {
    expect(selectOnlineCount(makeState())).toBe(0);
  });

  it("returns the online count", () => {
    expect(selectOnlineCount(makeState({ onlineCount: 42 }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectTypingUsers
// ---------------------------------------------------------------------------

describe("selectTypingUsers", () => {
  it("returns empty array when context key is absent", () => {
    expect(selectTypingUsers("channel:c1")(makeState())).toEqual([]);
  });

  it("returns typing users for the given context key", () => {
    const t1 = makeTypingStatus({ userId: "u1" });
    const typingMap = { "channel:c1": { u1: t1 } };
    const result = selectTypingUsers("channel:c1")(makeState({ typingMap }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectChannelTypingUsers
// ---------------------------------------------------------------------------

describe("selectChannelTypingUsers", () => {
  it("returns empty array when no one is typing in the channel", () => {
    expect(selectChannelTypingUsers("c1")(makeState())).toEqual([]);
  });

  it("returns typing users for the channel using channel: prefix", () => {
    const t1 = makeTypingStatus({ userId: "u1" });
    const typingMap = { "channel:c1": { u1: t1 } };
    const result = selectChannelTypingUsers("c1")(makeState({ typingMap }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectThreadTypingUsers
// ---------------------------------------------------------------------------

describe("selectThreadTypingUsers", () => {
  it("returns empty array when no one is typing in the thread", () => {
    expect(selectThreadTypingUsers("t1")(makeState())).toEqual([]);
  });

  it("returns typing users for the thread using thread: prefix", () => {
    const t1 = makeTypingStatus({ userId: "u1" });
    const typingMap = { "thread:t1": { u1: t1 } };
    const result = selectThreadTypingUsers("t1")(makeState({ typingMap }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectIsAnyoneTyping
// ---------------------------------------------------------------------------

describe("selectIsAnyoneTyping", () => {
  it("returns false when context key is absent", () => {
    expect(selectIsAnyoneTyping("channel:c1")(makeState())).toBe(false);
  });

  it("returns false when context exists but has no users", () => {
    const typingMap = { "channel:c1": {} };
    expect(selectIsAnyoneTyping("channel:c1")(makeState({ typingMap }))).toBe(false);
  });

  it("returns true when at least one user is typing", () => {
    const typingMap = {
      "channel:c1": { u1: makeTypingStatus({ userId: "u1" }) },
    };
    expect(selectIsAnyoneTyping("channel:c1")(makeState({ typingMap }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSettings
// ---------------------------------------------------------------------------

describe("selectSettings", () => {
  it("returns default presence settings", () => {
    const result = selectSettings(makeState());
    expect(result).toBe(DEFAULT_PRESENCE_SETTINGS);
  });

  it("returns updated settings when overridden", () => {
    const settings: PresenceSettings = {
      ...DEFAULT_PRESENCE_SETTINGS,
      autoAway: { enabled: false, timeout: 10, setStatus: "away" },
    };
    expect(selectSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectIsConnected
// ---------------------------------------------------------------------------

describe("selectIsConnected", () => {
  it("returns false by default", () => {
    expect(selectIsConnected(makeState())).toBe(false);
  });

  it("returns true when connected", () => {
    expect(selectIsConnected(makeState({ isConnected: true }))).toBe(true);
  });
});
