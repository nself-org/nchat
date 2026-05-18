/**
 * Tests for dm-store selectors
 *
 * Selectors are pure functions (state: DMStore) => value.
 * Tested by constructing minimal plain-object state — no Zustand context.
 */

import {
  selectActiveDM,
  selectDMList,
  selectDirectDMs,
  selectGroupDMs,
  selectStarredDMs,
  selectMutedDMs,
  selectArchivedDMs,
  selectActiveDMs,
  selectUnreadDMs,
  selectRecentDMs,
  selectMessages,
  selectTypingUsers,
  selectIsDMMuted,
  selectIsDMStarred,
  selectPinnedMessages,
  selectSharedFiles,
  selectMediaItems,
  selectFilteredDMs,
} from "../dm-store";
import type { DMStore } from "../dm-store";
import type { DirectMessage } from "@/lib/dm/dm-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDM(overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    id: "dm1",
    type: "direct",
    status: "active",
    name: null,
    participants: [],
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as DirectMessage;
}

function makeState(overrides: Partial<DMStore> = {}): DMStore {
  return {
    dms: new Map<string, DirectMessage>(),
    dmsBySlug: new Map<string, string>(),
    activeDMId: null,
    previousDMId: null,
    messagesByDM: {},
    loadingMessages: new Set<string>(),
    hasMoreMessages: {},
    messageCursors: {},
    mutedDMs: new Set<string>(),
    starredDMs: new Set<string>(),
    archivedDMs: new Set<string>(),
    recentDMs: [],
    notificationPreferences: new Map(),
    typingIndicators: {},
    readReceipts: {},
    pinnedMessages: {},
    sharedFiles: {},
    mediaItems: {},
    unreadCounts: {},
    totalUnreadCount: 0,
    filterType: "all",
    sortType: "recent",
    searchQuery: "",
    isLoading: false,
    isLoadingDM: null,
    error: null,
    hasMoreDMs: false,
    dmListCursor: null,
    isNewDMModalOpen: false,
    isGroupDMCreateOpen: false,
    selectedUserIds: [],
    // Actions — not called in selector tests
    setDMs: jest.fn(),
    addDM: jest.fn(),
    updateDM: jest.fn(),
    removeDM: jest.fn(),
    getDMById: jest.fn(),
    getDMBySlug: jest.fn(),
    setActiveDM: jest.fn(),
    goToPreviousDM: jest.fn(),
    setMessages: jest.fn(),
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    removeMessage: jest.fn(),
    setMoreMessages: jest.fn(),
    setLoadingMessages: jest.fn(),
    setMutedDMs: jest.fn(),
    toggleMuteDM: jest.fn(),
    setStarredDMs: jest.fn(),
    toggleStarDM: jest.fn(),
    setArchivedDMs: jest.fn(),
    archiveDM: jest.fn(),
    unarchiveDM: jest.fn(),
    addToRecentDMs: jest.fn(),
    setTypingUsers: jest.fn(),
    addTypingUser: jest.fn(),
    removeTypingUser: jest.fn(),
    setReadReceipts: jest.fn(),
    updateReadReceipt: jest.fn(),
    setPinnedMessages: jest.fn(),
    addPinnedMessage: jest.fn(),
    removePinnedMessage: jest.fn(),
    setSharedFiles: jest.fn(),
    addSharedFile: jest.fn(),
    setMediaItems: jest.fn(),
    addMediaItem: jest.fn(),
    setUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    setFilterType: jest.fn(),
    setSortType: jest.fn(),
    setSearchQuery: jest.fn(),
    setIsLoading: jest.fn(),
    setIsLoadingDM: jest.fn(),
    setError: jest.fn(),
    setHasMoreDMs: jest.fn(),
    setDMListCursor: jest.fn(),
    setIsNewDMModalOpen: jest.fn(),
    setIsGroupDMCreateOpen: jest.fn(),
    setSelectedUserIds: jest.fn(),
    toggleSelectedUser: jest.fn(),
    setNotificationPreference: jest.fn(),
    ...overrides,
  } as unknown as DMStore;
}

// ---------------------------------------------------------------------------
// selectActiveDM
// ---------------------------------------------------------------------------

describe("selectActiveDM", () => {
  it("returns undefined when activeDMId is null", () => {
    expect(selectActiveDM(makeState())).toBeUndefined();
  });

  it("returns the DM that matches activeDMId", () => {
    const dm = makeDM({ id: "dm1" });
    const dms = new Map([["dm1", dm]]);
    const state = makeState({ dms, activeDMId: "dm1" });
    expect(selectActiveDM(state)).toBe(dm);
  });

  it("returns undefined when activeDMId is set but dm not in map", () => {
    const state = makeState({ activeDMId: "missing" });
    expect(selectActiveDM(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectDMList
// ---------------------------------------------------------------------------

describe("selectDMList", () => {
  it("returns empty array when no DMs", () => {
    expect(selectDMList(makeState())).toEqual([]);
  });

  it("returns all DMs as an array", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    expect(selectDMList(makeState({ dms }))).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectDirectDMs
// ---------------------------------------------------------------------------

describe("selectDirectDMs", () => {
  it("returns only DMs of type 'direct'", () => {
    const dm1 = makeDM({ id: "dm1", type: "direct" });
    const dm2 = makeDM({ id: "dm2", type: "group" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectDirectDMs(makeState({ dms }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("returns empty array when no direct DMs", () => {
    const dm = makeDM({ id: "dm1", type: "group" });
    expect(
      selectDirectDMs(makeState({ dms: new Map([["dm1", dm]]) })),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectGroupDMs
// ---------------------------------------------------------------------------

describe("selectGroupDMs", () => {
  it("returns only DMs of type 'group'", () => {
    const dm1 = makeDM({ id: "dm1", type: "direct" });
    const dm2 = makeDM({ id: "dm2", type: "group" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectGroupDMs(makeState({ dms }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm2");
  });
});

// ---------------------------------------------------------------------------
// selectStarredDMs
// ---------------------------------------------------------------------------

describe("selectStarredDMs", () => {
  it("returns only starred DMs", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const starredDMs = new Set(["dm1"]);
    const result = selectStarredDMs(makeState({ dms, starredDMs }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("returns empty array when nothing starred", () => {
    const dm = makeDM({ id: "dm1" });
    expect(
      selectStarredDMs(makeState({ dms: new Map([["dm1", dm]]) })),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectMutedDMs
// ---------------------------------------------------------------------------

describe("selectMutedDMs", () => {
  it("returns only muted DMs", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const mutedDMs = new Set(["dm2"]);
    const result = selectMutedDMs(makeState({ dms, mutedDMs }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm2");
  });
});

// ---------------------------------------------------------------------------
// selectArchivedDMs
// ---------------------------------------------------------------------------

describe("selectArchivedDMs", () => {
  it("returns only archived DMs", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const archivedDMs = new Set(["dm1"]);
    const result = selectArchivedDMs(makeState({ dms, archivedDMs }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });
});

// ---------------------------------------------------------------------------
// selectActiveDMs
// ---------------------------------------------------------------------------

describe("selectActiveDMs", () => {
  it("returns only DMs with status='active'", () => {
    const dm1 = makeDM({ id: "dm1", status: "active" });
    const dm2 = makeDM({
      id: "dm2",
      status: "archived" as DirectMessage["status"],
    });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectActiveDMs(makeState({ dms }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });
});

// ---------------------------------------------------------------------------
// selectUnreadDMs
// ---------------------------------------------------------------------------

describe("selectUnreadDMs", () => {
  it("returns only DMs with unread messages", () => {
    const dm1 = makeDM({ id: "dm1", unreadCount: 3 });
    const dm2 = makeDM({ id: "dm2", unreadCount: 0 });
    const dm3 = makeDM({ id: "dm3" }); // unreadCount defaults to 0
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
      ["dm3", dm3],
    ]);
    const result = selectUnreadDMs(makeState({ dms }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });
});

// ---------------------------------------------------------------------------
// selectRecentDMs
// ---------------------------------------------------------------------------

describe("selectRecentDMs", () => {
  it("returns recent DMs in order", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const recentDMs = ["dm2", "dm1"];
    const result = selectRecentDMs(makeState({ dms, recentDMs }));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("dm2");
    expect(result[1].id).toBe("dm1");
  });

  it("omits ids not in the dms map", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dms = new Map([["dm1", dm1]]);
    const recentDMs = ["dm1", "missing"];
    const result = selectRecentDMs(makeState({ dms, recentDMs }));
    expect(result).toHaveLength(1);
  });

  it("returns empty array when recentDMs is empty", () => {
    expect(selectRecentDMs(makeState())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectMessages
// ---------------------------------------------------------------------------

describe("selectMessages", () => {
  it("returns empty array for unknown dmId", () => {
    expect(selectMessages("unknown")(makeState())).toEqual([]);
  });

  it("returns messages for known dmId", () => {
    const msgs = [{ id: "m1" } as never];
    const state = makeState({ messagesByDM: { dm1: msgs } });
    expect(selectMessages("dm1")(state)).toBe(msgs);
  });
});

// ---------------------------------------------------------------------------
// selectTypingUsers
// ---------------------------------------------------------------------------

describe("selectTypingUsers", () => {
  it("returns empty array for unknown dmId", () => {
    expect(selectTypingUsers("dm1")(makeState())).toEqual([]);
  });

  it("returns typing indicators for known dmId", () => {
    const indicators = [{ userId: "u1" } as never];
    const state = makeState({ typingIndicators: { dm1: indicators } });
    expect(selectTypingUsers("dm1")(state)).toBe(indicators);
  });
});

// ---------------------------------------------------------------------------
// selectIsDMMuted
// ---------------------------------------------------------------------------

describe("selectIsDMMuted", () => {
  it("returns false for non-muted DM", () => {
    expect(selectIsDMMuted("dm1")(makeState())).toBe(false);
  });

  it("returns true for muted DM", () => {
    const state = makeState({ mutedDMs: new Set(["dm1"]) });
    expect(selectIsDMMuted("dm1")(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsDMStarred
// ---------------------------------------------------------------------------

describe("selectIsDMStarred", () => {
  it("returns false for non-starred DM", () => {
    expect(selectIsDMStarred("dm1")(makeState())).toBe(false);
  });

  it("returns true for starred DM", () => {
    const state = makeState({ starredDMs: new Set(["dm1"]) });
    expect(selectIsDMStarred("dm1")(state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPinnedMessages
// ---------------------------------------------------------------------------

describe("selectPinnedMessages", () => {
  it("returns empty array when no pinned messages for dmId", () => {
    expect(selectPinnedMessages("dm1")(makeState())).toEqual([]);
  });

  it("returns pinned messages for dmId", () => {
    const pinned = [{ id: "p1" } as never];
    const state = makeState({ pinnedMessages: { dm1: pinned } });
    expect(selectPinnedMessages("dm1")(state)).toBe(pinned);
  });
});

// ---------------------------------------------------------------------------
// selectSharedFiles
// ---------------------------------------------------------------------------

describe("selectSharedFiles", () => {
  it("returns empty array when no shared files for dmId", () => {
    expect(selectSharedFiles("dm1")(makeState())).toEqual([]);
  });

  it("returns shared files for dmId", () => {
    const files = [{ id: "f1" } as never];
    const state = makeState({ sharedFiles: { dm1: files } });
    expect(selectSharedFiles("dm1")(state)).toBe(files);
  });
});

// ---------------------------------------------------------------------------
// selectMediaItems
// ---------------------------------------------------------------------------

describe("selectMediaItems", () => {
  it("returns empty array when no media items for dmId", () => {
    expect(selectMediaItems("dm1")(makeState())).toEqual([]);
  });

  it("returns media items for dmId", () => {
    const media = [{ id: "mi1" } as never];
    const state = makeState({ mediaItems: { dm1: media } });
    expect(selectMediaItems("dm1")(state)).toBe(media);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredDMs
// ---------------------------------------------------------------------------

describe("selectFilteredDMs", () => {
  it("returns active DMs by default (filterType='all')", () => {
    const dm1 = makeDM({ id: "dm1", status: "active" });
    const dm2 = makeDM({
      id: "dm2",
      status: "archived" as DirectMessage["status"],
    });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("filters by 'unread'", () => {
    const dm1 = makeDM({ id: "dm1", unreadCount: 5 });
    const dm2 = makeDM({ id: "dm2", unreadCount: 0 });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms, filterType: "unread" }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("filters by 'starred'", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(
      makeState({ dms, filterType: "starred", starredDMs: new Set(["dm2"]) }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm2");
  });

  it("filters by 'archived'", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(
      makeState({ dms, filterType: "archived", archivedDMs: new Set(["dm1"]) }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("filters by 'muted'", () => {
    const dm1 = makeDM({ id: "dm1" });
    const dm2 = makeDM({ id: "dm2" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(
      makeState({ dms, filterType: "muted", mutedDMs: new Set(["dm2"]) }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm2");
  });

  it("applies search query by name", () => {
    const dm1 = makeDM({ id: "dm1", name: "Alice", status: "active" });
    const dm2 = makeDM({ id: "dm2", name: "Bob", status: "active" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms, searchQuery: "ali" }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("applies search query by participant username", () => {
    const dm1 = makeDM({
      id: "dm1",
      status: "active",
      participants: [
        { user: { username: "charlie", displayName: null } } as never,
      ],
    });
    const dm2 = makeDM({ id: "dm2", status: "active", participants: [] });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms, searchQuery: "char" }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dm1");
  });

  it("sorts by 'alphabetical'", () => {
    const dm1 = makeDM({ id: "dm1", name: "Zebra", status: "active" });
    const dm2 = makeDM({ id: "dm2", name: "Apple", status: "active" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(
      makeState({ dms, sortType: "alphabetical" }),
    );
    expect(result[0].name).toBe("Apple");
    expect(result[1].name).toBe("Zebra");
  });

  it("sorts by 'unread' (descending)", () => {
    const dm1 = makeDM({ id: "dm1", unreadCount: 2, status: "active" });
    const dm2 = makeDM({ id: "dm2", unreadCount: 10, status: "active" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms, sortType: "unread" }));
    expect(result[0].id).toBe("dm2");
    expect(result[1].id).toBe("dm1");
  });

  it("sorts by 'recent' (most recent first)", () => {
    const older = new Date(Date.now() - 10_000).toISOString();
    const newer = new Date(Date.now() - 1_000).toISOString();
    const dm1 = makeDM({ id: "dm1", lastMessageAt: older, status: "active" });
    const dm2 = makeDM({ id: "dm2", lastMessageAt: newer, status: "active" });
    const dms = new Map([
      ["dm1", dm1],
      ["dm2", dm2],
    ]);
    const result = selectFilteredDMs(makeState({ dms, sortType: "recent" }));
    expect(result[0].id).toBe("dm2");
  });

  it("returns empty array when no DMs match", () => {
    const dm = makeDM({ id: "dm1", status: "active" });
    const result = selectFilteredDMs(
      makeState({ dms: new Map([["dm1", dm]]), searchQuery: "zzz-no-match" }),
    );
    expect(result).toHaveLength(0);
  });
});
