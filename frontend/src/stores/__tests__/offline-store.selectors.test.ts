/**
 * Tests for offline-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { OfflineStore, OfflineStoreState } from "../offline-store";
import {
  selectIsOfflineMode,
  selectQueuedActions,
  selectPendingMessages,
  selectQueueProcessing,
  selectQueueCount,
  selectPendingCount,
  selectSyncState,
  selectSyncStatus,
  selectIsSyncing,
  selectSyncProgress,
  selectLastSyncAt,
  selectCacheStats,
  selectCacheEnabled,
  selectCachedChannelIds,
  selectOfflineSettings,
  selectHasPendingChanges,
  selectPendingMessagesByChannel,
  selectQueuedActionsByChannel,
} from "../offline-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSyncState(
  overrides?: Partial<{
    status: string;
    progress: number;
    lastSyncAt: Date | null;
  }>,
) {
  return {
    status: "idle" as never,
    progress: 0,
    lastSyncAt: null,
    ...overrides,
  };
}

function makeState(overrides?: Partial<OfflineStoreState>): OfflineStore {
  const defaultState: OfflineStoreState = {
    isOfflineMode: false,
    offlineModeEnabledAt: null,
    queuedActions: [],
    pendingMessages: [],
    queueProcessing: false,
    queueError: null,
    sync: makeSyncState() as never,
    lastSyncError: null,
    cacheStats: null,
    cacheEnabled: true,
    cachedChannelIds: [],
    settings: {
      autoSyncEnabled: true,
      backgroundSyncEnabled: true,
      cacheMessagesPerChannel: 50,
      maxCacheAge: 7,
      showOfflineIndicator: true,
    },
  };
  return { ...defaultState, ...overrides } as unknown as OfflineStore;
}

// ---------------------------------------------------------------------------
// selectIsOfflineMode
// ---------------------------------------------------------------------------

describe("selectIsOfflineMode", () => {
  it("returns false by default", () => {
    expect(selectIsOfflineMode(makeState())).toBe(false);
  });

  it("returns true when in offline mode", () => {
    expect(selectIsOfflineMode(makeState({ isOfflineMode: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectQueuedActions
// ---------------------------------------------------------------------------

describe("selectQueuedActions", () => {
  it("returns empty array by default", () => {
    expect(selectQueuedActions(makeState())).toEqual([]);
  });

  it("returns the queuedActions array", () => {
    const queuedActions = [{ id: "a1", status: "pending" } as never];
    expect(selectQueuedActions(makeState({ queuedActions }))).toBe(
      queuedActions,
    );
  });
});

// ---------------------------------------------------------------------------
// selectPendingMessages
// ---------------------------------------------------------------------------

describe("selectPendingMessages", () => {
  it("returns empty array by default", () => {
    expect(selectPendingMessages(makeState())).toEqual([]);
  });

  it("returns the pendingMessages array", () => {
    const pendingMessages = [{ id: "m1", channelId: "c1" } as never];
    expect(selectPendingMessages(makeState({ pendingMessages }))).toBe(
      pendingMessages,
    );
  });
});

// ---------------------------------------------------------------------------
// selectQueueProcessing
// ---------------------------------------------------------------------------

describe("selectQueueProcessing", () => {
  it("returns false by default", () => {
    expect(selectQueueProcessing(makeState())).toBe(false);
  });

  it("returns true when queue is processing", () => {
    expect(selectQueueProcessing(makeState({ queueProcessing: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectQueueCount
// ---------------------------------------------------------------------------

describe("selectQueueCount", () => {
  it("returns 0 by default", () => {
    expect(selectQueueCount(makeState())).toBe(0);
  });

  it("returns the count of queued actions", () => {
    const queuedActions = [
      { id: "a1", status: "pending" } as never,
      { id: "a2", status: "failed" } as never,
    ];
    expect(selectQueueCount(makeState({ queuedActions }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectPendingCount
// ---------------------------------------------------------------------------

describe("selectPendingCount", () => {
  it("returns 0 by default", () => {
    expect(selectPendingCount(makeState())).toBe(0);
  });

  it("returns count of pending-status actions only", () => {
    const queuedActions = [
      { id: "a1", status: "pending" } as never,
      { id: "a2", status: "pending" } as never,
      { id: "a3", status: "failed" } as never,
    ];
    expect(selectPendingCount(makeState({ queuedActions }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectSyncState
// ---------------------------------------------------------------------------

describe("selectSyncState", () => {
  it("returns the sync object", () => {
    const sync = makeSyncState({ status: "syncing" as never, progress: 50 });
    const state = makeState({ sync: sync as never });
    expect(selectSyncState(state)).toBe(sync);
  });
});

// ---------------------------------------------------------------------------
// selectSyncStatus
// ---------------------------------------------------------------------------

describe("selectSyncStatus", () => {
  it("returns idle by default", () => {
    expect(selectSyncStatus(makeState())).toBe("idle");
  });

  it("returns the current sync status", () => {
    const sync = makeSyncState({ status: "syncing" as never });
    expect(selectSyncStatus(makeState({ sync: sync as never }))).toBe(
      "syncing",
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsSyncing
// ---------------------------------------------------------------------------

describe("selectIsSyncing", () => {
  it("returns false by default (idle)", () => {
    expect(selectIsSyncing(makeState())).toBe(false);
  });

  it("returns true when sync status is syncing", () => {
    const sync = makeSyncState({ status: "syncing" as never });
    expect(selectIsSyncing(makeState({ sync: sync as never }))).toBe(true);
  });

  it("returns false for non-syncing statuses", () => {
    const sync = makeSyncState({ status: "error" as never });
    expect(selectIsSyncing(makeState({ sync: sync as never }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSyncProgress
// ---------------------------------------------------------------------------

describe("selectSyncProgress", () => {
  it("returns 0 by default", () => {
    expect(selectSyncProgress(makeState())).toBe(0);
  });

  it("returns the current sync progress", () => {
    const sync = makeSyncState({ progress: 75 });
    expect(selectSyncProgress(makeState({ sync: sync as never }))).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// selectLastSyncAt
// ---------------------------------------------------------------------------

describe("selectLastSyncAt", () => {
  it("returns null by default", () => {
    expect(selectLastSyncAt(makeState())).toBeNull();
  });

  it("returns the last sync timestamp", () => {
    const lastSyncAt = new Date("2024-01-15T12:00:00Z");
    const sync = makeSyncState({ lastSyncAt });
    expect(selectLastSyncAt(makeState({ sync: sync as never }))).toBe(
      lastSyncAt,
    );
  });
});

// ---------------------------------------------------------------------------
// selectCacheStats
// ---------------------------------------------------------------------------

describe("selectCacheStats", () => {
  it("returns the cacheStats value", () => {
    const cacheStats = { size: 1024, entries: 50 } as never;
    expect(selectCacheStats(makeState({ cacheStats }))).toBe(cacheStats);
  });
});

// ---------------------------------------------------------------------------
// selectCacheEnabled
// ---------------------------------------------------------------------------

describe("selectCacheEnabled", () => {
  it("returns true by default", () => {
    expect(selectCacheEnabled(makeState())).toBe(true);
  });

  it("returns false when cache is disabled", () => {
    expect(selectCacheEnabled(makeState({ cacheEnabled: false }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectCachedChannelIds
// ---------------------------------------------------------------------------

describe("selectCachedChannelIds", () => {
  it("returns empty array by default", () => {
    expect(selectCachedChannelIds(makeState())).toEqual([]);
  });

  it("returns the cached channel ids array", () => {
    const cachedChannelIds = ["c1", "c2", "c3"];
    expect(selectCachedChannelIds(makeState({ cachedChannelIds }))).toBe(
      cachedChannelIds,
    );
  });
});

// ---------------------------------------------------------------------------
// selectOfflineSettings
// ---------------------------------------------------------------------------

describe("selectOfflineSettings", () => {
  it("returns the settings object", () => {
    const settings = { maxQueueSize: 100 } as never;
    expect(selectOfflineSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectHasPendingChanges
// ---------------------------------------------------------------------------

describe("selectHasPendingChanges", () => {
  it("returns false when both queues are empty", () => {
    expect(selectHasPendingChanges(makeState())).toBe(false);
  });

  it("returns true when there are queued actions", () => {
    const queuedActions = [{ id: "a1" } as never];
    expect(selectHasPendingChanges(makeState({ queuedActions }))).toBe(true);
  });

  it("returns true when there are pending messages", () => {
    const pendingMessages = [{ id: "m1", channelId: "c1" } as never];
    expect(selectHasPendingChanges(makeState({ pendingMessages }))).toBe(true);
  });

  it("returns true when both queues have items", () => {
    const queuedActions = [{ id: "a1" } as never];
    const pendingMessages = [{ id: "m1", channelId: "c1" } as never];
    expect(
      selectHasPendingChanges(makeState({ queuedActions, pendingMessages })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPendingMessagesByChannel (factory)
// ---------------------------------------------------------------------------

describe("selectPendingMessagesByChannel", () => {
  it("returns empty array when pendingMessages is empty", () => {
    expect(selectPendingMessagesByChannel("c1")(makeState())).toEqual([]);
  });

  it("returns only messages for the specified channel", () => {
    const pendingMessages = [
      { id: "m1", channelId: "c1" } as never,
      { id: "m2", channelId: "c2" } as never,
      { id: "m3", channelId: "c1" } as never,
    ];
    const result = selectPendingMessagesByChannel("c1")(
      makeState({ pendingMessages }),
    );
    expect(result).toHaveLength(2);
    expect(
      result.every((m: { channelId: string }) => m.channelId === "c1"),
    ).toBe(true);
  });

  it("returns empty array when no messages match the channel", () => {
    const pendingMessages = [{ id: "m1", channelId: "c2" } as never];
    expect(
      selectPendingMessagesByChannel("c1")(makeState({ pendingMessages })),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectQueuedActionsByChannel (factory)
// ---------------------------------------------------------------------------

describe("selectQueuedActionsByChannel", () => {
  it("returns empty array when queuedActions is empty", () => {
    expect(selectQueuedActionsByChannel("c1")(makeState())).toEqual([]);
  });

  it("returns only actions for the specified channel", () => {
    const queuedActions = [
      { id: "a1", channelId: "c1", status: "pending" } as never,
      { id: "a2", channelId: "c2", status: "pending" } as never,
      { id: "a3", channelId: "c1", status: "failed" } as never,
    ];
    const result = selectQueuedActionsByChannel("c1")(
      makeState({ queuedActions }),
    );
    expect(result).toHaveLength(2);
    expect(
      result.every((a: { channelId: string }) => a.channelId === "c1"),
    ).toBe(true);
  });
});
