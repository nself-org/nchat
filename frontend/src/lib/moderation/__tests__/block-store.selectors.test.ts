/**
 * Tests for block-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { BlockStore, BlockSettings } from "../block-store";
import {
  selectBlockedUsers,
  selectBlockedUserIds,
  selectBlockSettings,
  selectIsLoading,
  selectError,
  selectBlockModal,
  selectBlockedCount,
  selectIsBlocking,
  selectIsUnblocking,
  selectShouldHideContent,
  selectShouldPreventDM,
  selectShouldHideFromList,
} from "../block-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSettings: BlockSettings = {
  hideBlockedMessages: true,
  preventDMs: true,
  hideFromMemberList: false,
};

function makeState(overrides?: Partial<Record<string, unknown>>): BlockStore {
  const defaultState = {
    blockedUsers: [],
    blockedUserIds: new Set<string>(),
    isLoading: false,
    error: null,
    settings: { ...defaultSettings },
    blockModalOpen: false,
    blockModalTarget: null,
    isBlocking: false,
    isUnblocking: false,
  };
  return { ...defaultState, ...overrides } as unknown as BlockStore;
}

function makeBlockedUser(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "bu1",
    userId: "u1",
    blockedUserId: "u2",
    blockedUser: {
      id: "u2",
      username: "alice",
      displayName: "Alice",
    },
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  } as never;
}

// ---------------------------------------------------------------------------
// selectBlockedUsers
// ---------------------------------------------------------------------------

describe("selectBlockedUsers", () => {
  it("returns empty array by default", () => {
    expect(selectBlockedUsers(makeState())).toEqual([]);
  });

  it("returns the blocked users array", () => {
    const blockedUsers = [makeBlockedUser()];
    expect(selectBlockedUsers(makeState({ blockedUsers }))).toBe(blockedUsers);
  });
});

// ---------------------------------------------------------------------------
// selectBlockedUserIds
// ---------------------------------------------------------------------------

describe("selectBlockedUserIds", () => {
  it("returns empty Set by default", () => {
    const result = selectBlockedUserIds(makeState());
    expect(result.size).toBe(0);
  });

  it("returns the blockedUserIds Set when populated", () => {
    const blockedUserIds = new Set(["u2", "u3"]);
    const result = selectBlockedUserIds(makeState({ blockedUserIds }));
    expect(result).toBe(blockedUserIds);
    expect(result.has("u2")).toBe(true);
    expect(result.has("u3")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectBlockSettings
// ---------------------------------------------------------------------------

describe("selectBlockSettings", () => {
  it("returns the default settings", () => {
    const result = selectBlockSettings(makeState());
    expect(result.hideBlockedMessages).toBe(true);
    expect(result.preventDMs).toBe(true);
    expect(result.hideFromMemberList).toBe(false);
  });

  it("returns updated settings when overridden", () => {
    const settings: BlockSettings = {
      hideBlockedMessages: false,
      preventDMs: false,
      hideFromMemberList: true,
    };
    expect(selectBlockSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(selectError(makeState({ error: "Failed to load blocked users" }))).toBe(
      "Failed to load blocked users",
    );
  });
});

// ---------------------------------------------------------------------------
// selectBlockModal
// ---------------------------------------------------------------------------

describe("selectBlockModal", () => {
  it("returns closed modal by default", () => {
    const result = selectBlockModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with target", () => {
    const target = { userId: "u2", username: "alice", displayName: "Alice" };
    const result = selectBlockModal(
      makeState({ blockModalOpen: true, blockModalTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectBlockedCount
// ---------------------------------------------------------------------------

describe("selectBlockedCount", () => {
  it("returns 0 by default", () => {
    expect(selectBlockedCount(makeState())).toBe(0);
  });

  it("returns the number of blocked users", () => {
    const blockedUsers = [makeBlockedUser(), makeBlockedUser({ id: "bu2", blockedUserId: "u3" })];
    expect(selectBlockedCount(makeState({ blockedUsers }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectIsBlocking
// ---------------------------------------------------------------------------

describe("selectIsBlocking", () => {
  it("returns false by default", () => {
    expect(selectIsBlocking(makeState())).toBe(false);
  });

  it("returns true when blocking", () => {
    expect(selectIsBlocking(makeState({ isBlocking: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsUnblocking
// ---------------------------------------------------------------------------

describe("selectIsUnblocking", () => {
  it("returns false by default", () => {
    expect(selectIsUnblocking(makeState())).toBe(false);
  });

  it("returns true when unblocking", () => {
    expect(selectIsUnblocking(makeState({ isUnblocking: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectShouldHideContent
// ---------------------------------------------------------------------------

describe("selectShouldHideContent", () => {
  it("returns false when user is not blocked", () => {
    const check = selectShouldHideContent(makeState());
    expect(check("u2")).toBe(false);
  });

  it("returns true when user is blocked and hideBlockedMessages is on", () => {
    const blockedUserIds = new Set(["u2"]);
    const check = selectShouldHideContent(makeState({ blockedUserIds }));
    expect(check("u2")).toBe(true);
    expect(check("u3")).toBe(false);
  });

  it("returns false when hideBlockedMessages is off even if user is blocked", () => {
    const blockedUserIds = new Set(["u2"]);
    const settings: BlockSettings = { ...defaultSettings, hideBlockedMessages: false };
    const check = selectShouldHideContent(makeState({ blockedUserIds, settings }));
    expect(check("u2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectShouldPreventDM
// ---------------------------------------------------------------------------

describe("selectShouldPreventDM", () => {
  it("returns false when user is not blocked", () => {
    const check = selectShouldPreventDM(makeState());
    expect(check("u2")).toBe(false);
  });

  it("returns true when user is blocked and preventDMs is on", () => {
    const blockedUserIds = new Set(["u2"]);
    const check = selectShouldPreventDM(makeState({ blockedUserIds }));
    expect(check("u2")).toBe(true);
  });

  it("returns false when preventDMs is off even if user is blocked", () => {
    const blockedUserIds = new Set(["u2"]);
    const settings: BlockSettings = { ...defaultSettings, preventDMs: false };
    const check = selectShouldPreventDM(makeState({ blockedUserIds, settings }));
    expect(check("u2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectShouldHideFromList
// ---------------------------------------------------------------------------

describe("selectShouldHideFromList", () => {
  it("returns false by default (hideFromMemberList off)", () => {
    const blockedUserIds = new Set(["u2"]);
    const check = selectShouldHideFromList(makeState({ blockedUserIds }));
    expect(check("u2")).toBe(false);
  });

  it("returns true when hideFromMemberList is on and user is blocked", () => {
    const blockedUserIds = new Set(["u2"]);
    const settings: BlockSettings = { ...defaultSettings, hideFromMemberList: true };
    const check = selectShouldHideFromList(makeState({ blockedUserIds, settings }));
    expect(check("u2")).toBe(true);
    expect(check("u3")).toBe(false);
  });
});
