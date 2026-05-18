/**
 * Tests for thread-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ThreadStore, Thread, ThreadMessage } from "../thread-store";
import {
  selectActiveThread,
  selectThreadList,
  selectFollowedThreads,
  selectUnreadThreads,
  selectThreadsByChannel,
  selectThreadMessagesForThread,
  selectIsThreadFollowed,
  selectIsThreadMuted,
  selectHasMoreThreadMessages,
  selectTotalUnreadThreadCount,
} from "../thread-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThread(overrides?: Partial<Thread>): Thread {
  return {
    id: "t1",
    parentMessageId: "m1",
    channelId: "c1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    replyCount: 0,
    lastReplyAt: null,
    participants: [],
    isFollowing: false,
    isMuted: false,
    unreadCount: 0,
    lastReadMessageId: null,
    ...overrides,
  };
}

function makeThreadMessage(overrides?: Partial<ThreadMessage>): ThreadMessage {
  return {
    id: "msg1",
    threadId: "t1",
    userId: "u1",
    content: "hello",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    editedAt: null,
    isDeleted: false,
    attachments: [],
    reactions: [],
    mentions: [],
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): ThreadStore {
  const defaultState = {
    activeThreadId: null,
    activeThread: null,
    threads: new Map<string, Thread>(),
    threadIds: [] as string[],
    threadMessages: new Map<string, Map<string, ThreadMessage>>(),
    followedThreadIds: new Set<string>(),
    mutedThreadIds: new Set<string>(),
    unreadThreadIds: new Set<string>(),
    totalUnreadCount: 0,
    isLoadingThreads: false,
    isLoadingThread: null,
    isLoadingMessages: null,
    isSendingReply: false,
    hasMoreThreads: false,
    threadsCursor: null,
    hasMoreMessages: new Map<string, boolean>(),
    messagesCursor: new Map<string, string | null>(),
    threadPanelOpen: false,
    threadListOpen: false,
    error: null,
  };
  return { ...defaultState, ...overrides } as unknown as ThreadStore;
}

// ---------------------------------------------------------------------------
// selectActiveThread
// ---------------------------------------------------------------------------

describe("selectActiveThread", () => {
  it("returns null by default", () => {
    expect(selectActiveThread(makeState())).toBeNull();
  });

  it("returns the active thread when set", () => {
    const activeThread = makeThread({ id: "t1" });
    expect(selectActiveThread(makeState({ activeThread }))).toBe(activeThread);
  });
});

// ---------------------------------------------------------------------------
// selectThreadList
// ---------------------------------------------------------------------------

describe("selectThreadList", () => {
  it("returns empty array when threadIds is empty", () => {
    expect(selectThreadList(makeState())).toEqual([]);
  });

  it("returns threads in threadIds order", () => {
    const t1 = makeThread({ id: "t1" });
    const t2 = makeThread({ id: "t2" });
    const threads = new Map([["t1", t1], ["t2", t2]]);
    const result = selectThreadList(makeState({ threads, threadIds: ["t2", "t1"] }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(t2);
    expect(result[1]).toBe(t1);
  });

  it("skips ids that are not in the threads map", () => {
    const t1 = makeThread({ id: "t1" });
    const threads = new Map([["t1", t1]]);
    const result = selectThreadList(makeState({ threads, threadIds: ["t1", "missing"] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectFollowedThreads
// ---------------------------------------------------------------------------

describe("selectFollowedThreads", () => {
  it("returns empty array when followedThreadIds is empty", () => {
    expect(selectFollowedThreads(makeState())).toEqual([]);
  });

  it("returns threads for followed ids", () => {
    const t1 = makeThread({ id: "t1" });
    const t2 = makeThread({ id: "t2" });
    const threads = new Map([["t1", t1], ["t2", t2]]);
    const followedThreadIds = new Set(["t1"]);
    const result = selectFollowedThreads(makeState({ threads, followedThreadIds }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadThreads
// ---------------------------------------------------------------------------

describe("selectUnreadThreads", () => {
  it("returns empty array when unreadThreadIds is empty", () => {
    expect(selectUnreadThreads(makeState())).toEqual([]);
  });

  it("returns threads with unreadCount > 0", () => {
    const t1 = makeThread({ id: "t1", unreadCount: 3 });
    const t2 = makeThread({ id: "t2", unreadCount: 0 });
    const threads = new Map([["t1", t1], ["t2", t2]]);
    const unreadThreadIds = new Set(["t1", "t2"]);
    const result = selectUnreadThreads(makeState({ threads, unreadThreadIds }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(t1);
  });
});

// ---------------------------------------------------------------------------
// selectThreadsByChannel (factory)
// ---------------------------------------------------------------------------

describe("selectThreadsByChannel", () => {
  it("returns empty array when threads map is empty", () => {
    expect(selectThreadsByChannel("c1")(makeState())).toEqual([]);
  });

  it("returns only threads for the specified channel", () => {
    const t1 = makeThread({ id: "t1", channelId: "c1" });
    const t2 = makeThread({ id: "t2", channelId: "c2" });
    const t3 = makeThread({ id: "t3", channelId: "c1" });
    const threads = new Map([["t1", t1], ["t2", t2], ["t3", t3]]);
    const result = selectThreadsByChannel("c1")(makeState({ threads }));
    expect(result).toHaveLength(2);
    expect(result.every((t: Thread) => t.channelId === "c1")).toBe(true);
  });

  it("returns empty array when no threads match the channel", () => {
    const t1 = makeThread({ id: "t1", channelId: "c2" });
    const threads = new Map([["t1", t1]]);
    expect(selectThreadsByChannel("c1")(makeState({ threads }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectThreadMessagesForThread (factory)
// ---------------------------------------------------------------------------

describe("selectThreadMessagesForThread", () => {
  it("returns empty array when threadMessages map is empty", () => {
    expect(selectThreadMessagesForThread("t1")(makeState())).toEqual([]);
  });

  it("returns empty array when thread has no messages", () => {
    const threadMessages = new Map([["t1", new Map<string, ThreadMessage>()]]);
    expect(selectThreadMessagesForThread("t1")(makeState({ threadMessages }))).toEqual([]);
  });

  it("returns messages sorted by createdAt ascending", () => {
    const msg1 = makeThreadMessage({ id: "msg1", createdAt: "2024-01-01T02:00:00Z" });
    const msg2 = makeThreadMessage({ id: "msg2", createdAt: "2024-01-01T01:00:00Z" });
    const msgMap = new Map([["msg1", msg1], ["msg2", msg2]]);
    const threadMessages = new Map([["t1", msgMap]]);
    const result = selectThreadMessagesForThread("t1")(makeState({ threadMessages }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(msg2); // earlier createdAt first
    expect(result[1]).toBe(msg1);
  });
});

// ---------------------------------------------------------------------------
// selectIsThreadFollowed (factory)
// ---------------------------------------------------------------------------

describe("selectIsThreadFollowed", () => {
  it("returns false when followedThreadIds is empty", () => {
    expect(selectIsThreadFollowed("t1")(makeState())).toBe(false);
  });

  it("returns true when thread is in followedThreadIds", () => {
    const followedThreadIds = new Set(["t1"]);
    expect(selectIsThreadFollowed("t1")(makeState({ followedThreadIds }))).toBe(true);
  });

  it("returns false when thread is not in followedThreadIds", () => {
    const followedThreadIds = new Set(["t2"]);
    expect(selectIsThreadFollowed("t1")(makeState({ followedThreadIds }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsThreadMuted (factory)
// ---------------------------------------------------------------------------

describe("selectIsThreadMuted", () => {
  it("returns false when mutedThreadIds is empty", () => {
    expect(selectIsThreadMuted("t1")(makeState())).toBe(false);
  });

  it("returns true when thread is muted", () => {
    const mutedThreadIds = new Set(["t1"]);
    expect(selectIsThreadMuted("t1")(makeState({ mutedThreadIds }))).toBe(true);
  });

  it("returns false when thread is not muted", () => {
    const mutedThreadIds = new Set(["t2"]);
    expect(selectIsThreadMuted("t1")(makeState({ mutedThreadIds }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectHasMoreThreadMessages (factory)
// ---------------------------------------------------------------------------

describe("selectHasMoreThreadMessages", () => {
  it("returns true by default when thread is not in the map", () => {
    expect(selectHasMoreThreadMessages("t1")(makeState())).toBe(true);
  });

  it("returns false when explicitly set to false", () => {
    const hasMoreMessages = new Map([["t1", false]]);
    expect(selectHasMoreThreadMessages("t1")(makeState({ hasMoreMessages }))).toBe(false);
  });

  it("returns true when explicitly set to true", () => {
    const hasMoreMessages = new Map([["t1", true]]);
    expect(selectHasMoreThreadMessages("t1")(makeState({ hasMoreMessages }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectTotalUnreadThreadCount
// ---------------------------------------------------------------------------

describe("selectTotalUnreadThreadCount", () => {
  it("returns 0 by default", () => {
    expect(selectTotalUnreadThreadCount(makeState())).toBe(0);
  });

  it("returns the totalUnreadCount value", () => {
    expect(selectTotalUnreadThreadCount(makeState({ totalUnreadCount: 7 }))).toBe(7);
  });
});
