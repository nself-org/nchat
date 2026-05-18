/**
 * Tests for entity-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { EntityStore, EntityState } from "../entity-store";
import {
  selectActiveEntity,
  selectEntityCount,
  selectDMCount,
  selectGroupCount,
  selectSupergroupCount,
  selectCommunityCount,
  selectChannelCount,
  selectRecentEntities,
  selectPinnedEntities,
  selectMutedEntities,
  selectUnreadEntities,
  selectIsEntityMuted,
  selectIsEntityPinned,
  selectEntityUnreadCount,
} from "../entity-store";

import type { ChatEntity } from "@/types/entities";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntity(overrides?: Partial<ChatEntity>): ChatEntity {
  return {
    id: "e1",
    type: "dm",
    name: "Alice",
    slug: "alice",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  } as ChatEntity;
}

function makeState(overrides?: Partial<EntityState>): EntityStore {
  const defaultState: EntityState = {
    entities: new Map(),
    entitiesBySlug: new Map(),
    dmIds: new Set(),
    groupIds: new Set(),
    supergroupIds: new Set(),
    communityIds: new Set(),
    channelIds: new Set(),
    activeEntityId: null,
    previousEntityId: null,
    mutedEntityIds: new Set(),
    pinnedEntityIds: new Set(),
    archivedEntityIds: new Set(),
    hiddenEntityIds: new Set(),
    unreadCounts: {},
    totalUnreadCount: 0,
    recentEntityIds: [],
    isLoading: false,
    loadingEntityId: null,
    error: null,
    hasMore: false,
    cursor: null,
  };
  return { ...defaultState, ...overrides } as unknown as EntityStore;
}

// ---------------------------------------------------------------------------
// selectActiveEntity
// ---------------------------------------------------------------------------

describe("selectActiveEntity", () => {
  it("returns undefined when activeEntityId is null", () => {
    expect(selectActiveEntity(makeState())).toBeUndefined();
  });

  it("returns the active entity", () => {
    const e = makeEntity({ id: "e1" });
    const entities = new Map([["e1", e]]);
    const state = makeState({ activeEntityId: "e1", entities });
    expect(selectActiveEntity(state)).toBe(e);
  });

  it("returns undefined when activeEntityId set but not in map", () => {
    const state = makeState({ activeEntityId: "missing" });
    expect(selectActiveEntity(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectEntityCount
// ---------------------------------------------------------------------------

describe("selectEntityCount", () => {
  it("returns 0 when entities map is empty", () => {
    expect(selectEntityCount(makeState())).toBe(0);
  });

  it("returns the number of entities", () => {
    const entities = new Map([
      ["e1", makeEntity({ id: "e1" })],
      ["e2", makeEntity({ id: "e2" })],
    ]);
    expect(selectEntityCount(makeState({ entities }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectDMCount
// ---------------------------------------------------------------------------

describe("selectDMCount", () => {
  it("returns 0 when no DMs", () => {
    expect(selectDMCount(makeState())).toBe(0);
  });

  it("returns count of DM ids", () => {
    const dmIds = new Set(["d1", "d2"]);
    expect(selectDMCount(makeState({ dmIds }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectGroupCount
// ---------------------------------------------------------------------------

describe("selectGroupCount", () => {
  it("returns 0 when no groups", () => {
    expect(selectGroupCount(makeState())).toBe(0);
  });

  it("returns count of group ids", () => {
    const groupIds = new Set(["g1", "g2", "g3"]);
    expect(selectGroupCount(makeState({ groupIds }))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectSupergroupCount
// ---------------------------------------------------------------------------

describe("selectSupergroupCount", () => {
  it("returns 0 when no supergroups", () => {
    expect(selectSupergroupCount(makeState())).toBe(0);
  });

  it("returns count of supergroup ids", () => {
    const supergroupIds = new Set(["sg1"]);
    expect(selectSupergroupCount(makeState({ supergroupIds }))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// selectCommunityCount
// ---------------------------------------------------------------------------

describe("selectCommunityCount", () => {
  it("returns 0 when no communities", () => {
    expect(selectCommunityCount(makeState())).toBe(0);
  });

  it("returns count of community ids", () => {
    const communityIds = new Set(["co1", "co2"]);
    expect(selectCommunityCount(makeState({ communityIds }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectChannelCount
// ---------------------------------------------------------------------------

describe("selectChannelCount", () => {
  it("returns 0 when no channels", () => {
    expect(selectChannelCount(makeState())).toBe(0);
  });

  it("returns count of channel ids", () => {
    const channelIds = new Set(["ch1", "ch2", "ch3", "ch4"]);
    expect(selectChannelCount(makeState({ channelIds }))).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// selectRecentEntities
// ---------------------------------------------------------------------------

describe("selectRecentEntities", () => {
  it("returns empty array when no recent entity ids", () => {
    expect(selectRecentEntities(makeState())).toEqual([]);
  });

  it("returns entities in recent order, skipping missing ids", () => {
    const e1 = makeEntity({ id: "e1" });
    const e2 = makeEntity({ id: "e2" });
    const entities = new Map([
      ["e1", e1],
      ["e2", e2],
    ]);
    // e3 not in entities — should be filtered out
    const recentEntityIds = ["e2", "e1", "e3"];
    const result = selectRecentEntities(makeState({ entities, recentEntityIds }));
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(e2);
    expect(result[1]).toBe(e1);
  });
});

// ---------------------------------------------------------------------------
// selectPinnedEntities
// ---------------------------------------------------------------------------

describe("selectPinnedEntities", () => {
  it("returns empty array when no pinned entities", () => {
    expect(selectPinnedEntities(makeState())).toEqual([]);
  });

  it("returns pinned entities from the map", () => {
    const e1 = makeEntity({ id: "e1" });
    const e2 = makeEntity({ id: "e2" });
    const entities = new Map([
      ["e1", e1],
      ["e2", e2],
    ]);
    const pinnedEntityIds = new Set(["e1"]);
    const result = selectPinnedEntities(
      makeState({ entities, pinnedEntityIds }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(e1);
  });

  it("skips pinned ids not in entities map", () => {
    const pinnedEntityIds = new Set(["missing"]);
    const result = selectPinnedEntities(makeState({ pinnedEntityIds }));
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectMutedEntities
// ---------------------------------------------------------------------------

describe("selectMutedEntities", () => {
  it("returns empty array when no muted entities", () => {
    expect(selectMutedEntities(makeState())).toEqual([]);
  });

  it("returns muted entities from the map", () => {
    const e1 = makeEntity({ id: "e1" });
    const e2 = makeEntity({ id: "e2" });
    const entities = new Map([
      ["e1", e1],
      ["e2", e2],
    ]);
    const mutedEntityIds = new Set(["e2"]);
    const result = selectMutedEntities(makeState({ entities, mutedEntityIds }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(e2);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadEntities
// ---------------------------------------------------------------------------

describe("selectUnreadEntities", () => {
  it("returns empty array when no entities have unread messages", () => {
    expect(selectUnreadEntities(makeState())).toEqual([]);
  });

  it("returns only entities with unread count > 0", () => {
    const e1 = makeEntity({ id: "e1" });
    const e2 = makeEntity({ id: "e2" });
    const e3 = makeEntity({ id: "e3" });
    const entities = new Map([
      ["e1", e1],
      ["e2", e2],
      ["e3", e3],
    ]);
    const unreadCounts: Record<string, number> = { e1: 5, e2: 0, e3: 3 };
    const result = selectUnreadEntities(makeState({ entities, unreadCounts }));
    expect(result).toHaveLength(2);
    const ids = result.map((e) => e.id);
    expect(ids).toContain("e1");
    expect(ids).toContain("e3");
  });

  it("returns entity with unread count when count is missing from unreadCounts", () => {
    const e1 = makeEntity({ id: "e1" });
    const entities = new Map([["e1", e1]]);
    // unreadCounts defaults to empty object — count is treated as 0
    const result = selectUnreadEntities(makeState({ entities }));
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectIsEntityMuted
// ---------------------------------------------------------------------------

describe("selectIsEntityMuted", () => {
  it("returns false when entity is not muted", () => {
    const selector = selectIsEntityMuted("e1");
    expect(selector(makeState())).toBe(false);
  });

  it("returns true when entity is muted", () => {
    const mutedEntityIds = new Set(["e1"]);
    const selector = selectIsEntityMuted("e1");
    expect(selector(makeState({ mutedEntityIds }))).toBe(true);
  });

  it("returns false for a different entity", () => {
    const mutedEntityIds = new Set(["e1"]);
    const selector = selectIsEntityMuted("e2");
    expect(selector(makeState({ mutedEntityIds }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsEntityPinned
// ---------------------------------------------------------------------------

describe("selectIsEntityPinned", () => {
  it("returns false when entity is not pinned", () => {
    const selector = selectIsEntityPinned("e1");
    expect(selector(makeState())).toBe(false);
  });

  it("returns true when entity is pinned", () => {
    const pinnedEntityIds = new Set(["e1"]);
    const selector = selectIsEntityPinned("e1");
    expect(selector(makeState({ pinnedEntityIds }))).toBe(true);
  });

  it("returns false for a different entity", () => {
    const pinnedEntityIds = new Set(["e1"]);
    const selector = selectIsEntityPinned("e2");
    expect(selector(makeState({ pinnedEntityIds }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectEntityUnreadCount
// ---------------------------------------------------------------------------

describe("selectEntityUnreadCount", () => {
  it("returns 0 when entity has no unread count entry", () => {
    const selector = selectEntityUnreadCount("e1");
    expect(selector(makeState())).toBe(0);
  });

  it("returns 0 when unread count is explicitly 0", () => {
    const unreadCounts = { e1: 0 };
    const selector = selectEntityUnreadCount("e1");
    expect(selector(makeState({ unreadCounts }))).toBe(0);
  });

  it("returns the unread count for the entity", () => {
    const unreadCounts = { e1: 7 };
    const selector = selectEntityUnreadCount("e1");
    expect(selector(makeState({ unreadCounts }))).toBe(7);
  });

  it("returns 0 for a different entity", () => {
    const unreadCounts = { e1: 7 };
    const selector = selectEntityUnreadCount("e2");
    expect(selector(makeState({ unreadCounts }))).toBe(0);
  });
});
