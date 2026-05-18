/**
 * Tests for channel-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  ChannelStore,
  ChannelState,
  Channel,
  ChannelCategory,
} from "../channel-store";
import {
  selectActiveChannel,
  selectChannelList,
  selectPublicChannels,
  selectPrivateChannels,
  selectDirectMessages,
  selectStarredChannels,
  selectMutedChannels,
  selectRecentChannels,
  selectVisibleChannels,
  selectChannelsByCategory,
  selectIsChannelMuted,
  selectIsChannelStarred,
  selectIsChannelPinned,
} from "../channel-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChannel(overrides?: Partial<Channel>): Channel {
  return {
    id: "ch1",
    name: "general",
    slug: "general",
    description: null,
    type: "public",
    categoryId: null,
    createdBy: "u1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    topic: null,
    icon: null,
    color: null,
    isArchived: false,
    isDefault: true,
    memberCount: 5,
    lastMessageAt: null,
    lastMessagePreview: null,
    ...overrides,
  };
}

function makeCategory(overrides?: Partial<ChannelCategory>): ChannelCategory {
  return {
    id: "cat1",
    name: "General",
    position: 0,
    isCollapsed: false,
    channelIds: [],
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): ChannelStore {
  const defaultState: ChannelState = {
    channels: new Map(),
    channelsBySlug: new Map(),
    categories: [],
    collapsedCategories: new Set(),
    activeChannelId: null,
    previousChannelId: null,
    mutedChannels: new Set(),
    starredChannels: new Set(),
    pinnedChannels: new Set(),
    recentChannels: [],
    hiddenChannels: new Set(),
    isLoading: false,
    isLoadingChannel: null,
    error: null,
    hasMoreChannels: false,
    channelListCursor: null,
  };
  const stubs = {
    setChannels: () => undefined,
    addChannel: () => undefined,
    updateChannel: () => undefined,
    removeChannel: () => undefined,
    getChannelById: () => undefined,
    getChannelBySlug: () => undefined,
    setActiveChannel: () => undefined,
    goToPreviousChannel: () => undefined,
    setCategories: () => undefined,
    addCategory: () => undefined,
    updateCategory: () => undefined,
    removeCategory: () => undefined,
    toggleCategoryCollapse: () => undefined,
    setCategoryCollapsed: () => undefined,
    moveChannelToCategory: () => undefined,
    reorderCategories: () => undefined,
    toggleMuteChannel: () => undefined,
    setChannelMuted: () => undefined,
    toggleStarChannel: () => undefined,
    setChannelStarred: () => undefined,
    togglePinChannel: () => undefined,
    setChannelPinned: () => undefined,
    hideChannel: () => undefined,
    unhideChannel: () => undefined,
    setHiddenChannels: () => undefined,
    addToRecentChannels: () => undefined,
    clearRecentChannels: () => undefined,
    updateChannelMembers: () => undefined,
    addChannelMember: () => undefined,
    removeChannelMember: () => undefined,
    updateChannelMember: () => undefined,
    setLoading: () => undefined,
    setLoadingChannel: () => undefined,
    setError: () => undefined,
    setHasMoreChannels: () => undefined,
    setChannelListCursor: () => undefined,
    markChannelAsRead: () => undefined,
    archiveChannel: () => undefined,
    unarchiveChannel: () => undefined,
    resetChannelStore: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as ChannelStore;
}

// ---------------------------------------------------------------------------
// selectActiveChannel
// ---------------------------------------------------------------------------

describe("selectActiveChannel", () => {
  it("returns undefined when activeChannelId is null", () => {
    expect(selectActiveChannel(makeState())).toBeUndefined();
  });

  it("returns undefined when activeChannelId not in channels map", () => {
    expect(
      selectActiveChannel(makeState({ activeChannelId: "missing" })),
    ).toBeUndefined();
  });

  it("returns the active channel when present", () => {
    const ch = makeChannel({ id: "ch1" });
    const channels = new Map([["ch1", ch]]);
    const result = selectActiveChannel(makeState({ channels, activeChannelId: "ch1" }));
    expect(result).toBe(ch);
  });
});

// ---------------------------------------------------------------------------
// selectChannelList
// ---------------------------------------------------------------------------

describe("selectChannelList", () => {
  it("returns empty array when no channels", () => {
    expect(selectChannelList(makeState())).toEqual([]);
  });

  it("returns all channels as an array", () => {
    const ch1 = makeChannel({ id: "ch1" });
    const ch2 = makeChannel({ id: "ch2", name: "random" });
    const channels = new Map([["ch1", ch1], ["ch2", ch2]]);
    const result = selectChannelList(makeState({ channels }));
    expect(result).toHaveLength(2);
    expect(result).toContain(ch1);
    expect(result).toContain(ch2);
  });
});

// ---------------------------------------------------------------------------
// selectPublicChannels
// ---------------------------------------------------------------------------

describe("selectPublicChannels", () => {
  it("returns empty array when no channels", () => {
    expect(selectPublicChannels(makeState())).toEqual([]);
  });

  it("returns only non-archived public channels", () => {
    const pub = makeChannel({ id: "ch1", type: "public", isArchived: false });
    const archivedPub = makeChannel({ id: "ch2", type: "public", isArchived: true });
    const priv = makeChannel({ id: "ch3", type: "private", isArchived: false });
    const channels = new Map([["ch1", pub], ["ch2", archivedPub], ["ch3", priv]]);
    const result = selectPublicChannels(makeState({ channels }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(pub);
  });
});

// ---------------------------------------------------------------------------
// selectPrivateChannels
// ---------------------------------------------------------------------------

describe("selectPrivateChannels", () => {
  it("returns empty array when no channels", () => {
    expect(selectPrivateChannels(makeState())).toEqual([]);
  });

  it("returns only non-archived private channels", () => {
    const priv = makeChannel({ id: "ch1", type: "private", isArchived: false });
    const archivedPriv = makeChannel({ id: "ch2", type: "private", isArchived: true });
    const pub = makeChannel({ id: "ch3", type: "public", isArchived: false });
    const channels = new Map([["ch1", priv], ["ch2", archivedPriv], ["ch3", pub]]);
    const result = selectPrivateChannels(makeState({ channels }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(priv);
  });
});

// ---------------------------------------------------------------------------
// selectDirectMessages
// ---------------------------------------------------------------------------

describe("selectDirectMessages", () => {
  it("returns empty array when no channels", () => {
    expect(selectDirectMessages(makeState())).toEqual([]);
  });

  it("returns direct and group channels that are not archived", () => {
    const dm = makeChannel({ id: "ch1", type: "direct", isArchived: false });
    const group = makeChannel({ id: "ch2", type: "group", isArchived: false });
    const archivedDm = makeChannel({ id: "ch3", type: "direct", isArchived: true });
    const pub = makeChannel({ id: "ch4", type: "public", isArchived: false });
    const channels = new Map([["ch1", dm], ["ch2", group], ["ch3", archivedDm], ["ch4", pub]]);
    const result = selectDirectMessages(makeState({ channels }));
    expect(result).toHaveLength(2);
    expect(result).toContain(dm);
    expect(result).toContain(group);
  });
});

// ---------------------------------------------------------------------------
// selectStarredChannels
// ---------------------------------------------------------------------------

describe("selectStarredChannels", () => {
  it("returns empty array when no starred channels", () => {
    const ch1 = makeChannel({ id: "ch1" });
    const channels = new Map([["ch1", ch1]]);
    expect(selectStarredChannels(makeState({ channels }))).toEqual([]);
  });

  it("returns only starred channels", () => {
    const ch1 = makeChannel({ id: "ch1" });
    const ch2 = makeChannel({ id: "ch2" });
    const channels = new Map([["ch1", ch1], ["ch2", ch2]]);
    const starredChannels = new Set(["ch1"]);
    const result = selectStarredChannels(makeState({ channels, starredChannels }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(ch1);
  });
});

// ---------------------------------------------------------------------------
// selectMutedChannels
// ---------------------------------------------------------------------------

describe("selectMutedChannels", () => {
  it("returns empty array when no muted channels", () => {
    expect(selectMutedChannels(makeState())).toEqual([]);
  });

  it("returns only muted channels", () => {
    const ch1 = makeChannel({ id: "ch1" });
    const ch2 = makeChannel({ id: "ch2" });
    const channels = new Map([["ch1", ch1], ["ch2", ch2]]);
    const mutedChannels = new Set(["ch2"]);
    const result = selectMutedChannels(makeState({ channels, mutedChannels }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(ch2);
  });
});

// ---------------------------------------------------------------------------
// selectRecentChannels
// ---------------------------------------------------------------------------

describe("selectRecentChannels", () => {
  it("returns empty array when no recent channels", () => {
    expect(selectRecentChannels(makeState())).toEqual([]);
  });

  it("returns channels in recent order, filtering missing ids", () => {
    const ch1 = makeChannel({ id: "ch1" });
    const ch2 = makeChannel({ id: "ch2" });
    const channels = new Map([["ch1", ch1], ["ch2", ch2]]);
    // "missing" id should be filtered out
    const recentChannels = ["ch2", "ch1", "missing"];
    const result = selectRecentChannels(makeState({ channels, recentChannels }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(ch2);
    expect(result[1]).toBe(ch1);
  });
});

// ---------------------------------------------------------------------------
// selectVisibleChannels
// ---------------------------------------------------------------------------

describe("selectVisibleChannels", () => {
  it("returns empty array when no channels", () => {
    expect(selectVisibleChannels(makeState())).toEqual([]);
  });

  it("excludes hidden and archived channels", () => {
    const visible = makeChannel({ id: "ch1", isArchived: false });
    const hidden = makeChannel({ id: "ch2", isArchived: false });
    const archived = makeChannel({ id: "ch3", isArchived: true });
    const channels = new Map([["ch1", visible], ["ch2", hidden], ["ch3", archived]]);
    const hiddenChannels = new Set(["ch2"]);
    const result = selectVisibleChannels(makeState({ channels, hiddenChannels }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(visible);
  });
});

// ---------------------------------------------------------------------------
// selectChannelsByCategory
// ---------------------------------------------------------------------------

describe("selectChannelsByCategory", () => {
  it("returns empty categorized and uncategorized when no channels", () => {
    const result = selectChannelsByCategory(makeState());
    expect(result.categorized).toEqual({});
    expect(result.uncategorized).toEqual([]);
  });

  it("places channels without categoryId into uncategorized (non-DM types)", () => {
    const ch = makeChannel({ id: "ch1", type: "public", categoryId: null });
    const channels = new Map([["ch1", ch]]);
    const result = selectChannelsByCategory(makeState({ channels }));
    expect(result.uncategorized).toHaveLength(1);
    expect(result.uncategorized[0]).toBe(ch);
  });

  it("places DM/group channels without categoryId into neither list", () => {
    const dm = makeChannel({ id: "ch1", type: "direct", categoryId: null });
    const channels = new Map([["ch1", dm]]);
    const result = selectChannelsByCategory(makeState({ channels }));
    expect(result.uncategorized).toHaveLength(0);
  });

  it("places channels with matching categoryId into categorized", () => {
    const cat = makeCategory({ id: "cat1" });
    const ch = makeChannel({ id: "ch1", type: "public", categoryId: "cat1" });
    const channels = new Map([["ch1", ch]]);
    const result = selectChannelsByCategory(
      makeState({ channels, categories: [cat] }),
    );
    expect(result.categorized["cat1"]).toHaveLength(1);
    expect(result.categorized["cat1"][0]).toBe(ch);
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelMuted (curried)
// ---------------------------------------------------------------------------

describe("selectIsChannelMuted", () => {
  it("returns false when channel is not muted", () => {
    expect(selectIsChannelMuted("ch1")(makeState())).toBe(false);
  });

  it("returns true when channel is muted", () => {
    const mutedChannels = new Set(["ch1"]);
    expect(selectIsChannelMuted("ch1")(makeState({ mutedChannels }))).toBe(true);
  });

  it("returns false for a different channel id", () => {
    const mutedChannels = new Set(["ch2"]);
    expect(selectIsChannelMuted("ch1")(makeState({ mutedChannels }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelStarred (curried)
// ---------------------------------------------------------------------------

describe("selectIsChannelStarred", () => {
  it("returns false when channel is not starred", () => {
    expect(selectIsChannelStarred("ch1")(makeState())).toBe(false);
  });

  it("returns true when channel is starred", () => {
    const starredChannels = new Set(["ch1"]);
    expect(selectIsChannelStarred("ch1")(makeState({ starredChannels }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelPinned (curried)
// ---------------------------------------------------------------------------

describe("selectIsChannelPinned", () => {
  it("returns false when channel is not pinned", () => {
    expect(selectIsChannelPinned("ch1")(makeState())).toBe(false);
  });

  it("returns true when channel is pinned", () => {
    const pinnedChannels = new Set(["ch1"]);
    expect(selectIsChannelPinned("ch1")(makeState({ pinnedChannels }))).toBe(true);
  });
});
