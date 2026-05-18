/**
 * Tests for mention-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { MentionStore } from "../mention-store";
import {
  selectMentions,
  selectUnreadMentions,
  selectUnreadCount,
  selectMentionById,
  selectMentionsByChannel,
  selectIsPanelOpen,
  selectPanelFilter,
  selectSelectedMentionId,
  selectIsLoading,
  selectError,
} from "../mention-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMention(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "m1",
    user_id: "u1",
    channel_id: "c1",
    message_id: "msg1",
    mention_type: "user",
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as never;
}

function makeState(overrides?: Partial<Record<string, unknown>>): MentionStore {
  const unreadList: never[] = [];
  const defaultState = {
    mentions: new Map<string, never>(),
    unreadMentionIds: new Set<string>(),
    isLoading: false,
    error: null,
    panel: { isOpen: false, filter: "all" as const },
    selectedMentionId: null,
    // stub actions
    setMentions: () => undefined,
    addMention: () => undefined,
    removeMention: () => undefined,
    updateMention: () => undefined,
    markAsRead: () => undefined,
    markMultipleAsRead: () => undefined,
    markAllAsRead: () => undefined,
    setLoading: () => undefined,
    setError: () => undefined,
    openPanel: () => undefined,
    closePanel: () => undefined,
    togglePanel: () => undefined,
    setFilter: () => undefined,
    selectMention: () => undefined,
    getMention: () => undefined,
    getMentionsByChannel: () => [],
    getUnreadMentions: () => unreadList,
    getAllMentions: () => [],
    getUnreadCount: () => 0,
    reset: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as MentionStore;
}

// ---------------------------------------------------------------------------
// selectMentions
// ---------------------------------------------------------------------------

describe("selectMentions", () => {
  it("returns empty array when mentions map is empty", () => {
    expect(selectMentions(makeState())).toEqual([]);
  });

  it("returns array of mention values from the map", () => {
    const m1 = makeMention({ id: "m1" });
    const m2 = makeMention({ id: "m2" });
    const mentions = new Map([["m1", m1], ["m2", m2]]);
    const result = selectMentions(makeState({ mentions }));
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadMentions
// ---------------------------------------------------------------------------

describe("selectUnreadMentions", () => {
  it("returns the result of getUnreadMentions() — empty by default", () => {
    expect(selectUnreadMentions(makeState())).toEqual([]);
  });

  it("returns unread mentions from the store getter", () => {
    const unread = [makeMention({ is_read: false })];
    const state = makeState({ getUnreadMentions: () => unread });
    expect(selectUnreadMentions(state)).toBe(unread);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadCount
// ---------------------------------------------------------------------------

describe("selectUnreadCount", () => {
  it("returns 0 by default", () => {
    expect(selectUnreadCount(makeState())).toBe(0);
  });

  it("returns the count from getUnreadCount()", () => {
    const state = makeState({ getUnreadCount: () => 5 });
    expect(selectUnreadCount(state)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// selectMentionById
// ---------------------------------------------------------------------------

describe("selectMentionById", () => {
  it("returns undefined when the mention does not exist", () => {
    expect(selectMentionById("missing")(makeState())).toBeUndefined();
  });

  it("returns the mention when it exists in the map", () => {
    const m = makeMention({ id: "m1" });
    const mentions = new Map([["m1", m]]);
    expect(selectMentionById("m1")(makeState({ mentions }))).toBe(m);
  });
});

// ---------------------------------------------------------------------------
// selectMentionsByChannel
// ---------------------------------------------------------------------------

describe("selectMentionsByChannel", () => {
  it("returns empty array when no mentions for the channel", () => {
    expect(selectMentionsByChannel("c1")(makeState())).toEqual([]);
  });

  it("returns mentions for the channel from getMentionsByChannel()", () => {
    const mentions = [makeMention({ channel_id: "c1" })];
    const state = makeState({ getMentionsByChannel: () => mentions });
    expect(selectMentionsByChannel("c1")(state)).toBe(mentions);
  });
});

// ---------------------------------------------------------------------------
// selectIsPanelOpen
// ---------------------------------------------------------------------------

describe("selectIsPanelOpen", () => {
  it("returns false by default", () => {
    expect(selectIsPanelOpen(makeState())).toBe(false);
  });

  it("returns true when the panel is open", () => {
    const panel = { isOpen: true, filter: "all" as const };
    expect(selectIsPanelOpen(makeState({ panel }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPanelFilter
// ---------------------------------------------------------------------------

describe("selectPanelFilter", () => {
  it("returns all by default", () => {
    expect(selectPanelFilter(makeState())).toBe("all");
  });

  it("returns unread when the filter is set to unread", () => {
    const panel = { isOpen: false, filter: "unread" as const };
    expect(selectPanelFilter(makeState({ panel }))).toBe("unread");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedMentionId
// ---------------------------------------------------------------------------

describe("selectSelectedMentionId", () => {
  it("returns null by default", () => {
    expect(selectSelectedMentionId(makeState())).toBeNull();
  });

  it("returns the selected mention id when set", () => {
    expect(
      selectSelectedMentionId(makeState({ selectedMentionId: "m42" })),
    ).toBe("m42");
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
    expect(selectError(makeState({ error: "Failed to load mentions" }))).toBe(
      "Failed to load mentions",
    );
  });
});
