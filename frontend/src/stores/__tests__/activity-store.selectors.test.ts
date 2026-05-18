/**
 * Tests for activity-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ActivityStore, ActivityState, ActivityUnreadCounts } from "../activity-store";
import {
  selectActivities,
  selectUnreadTotal,
  selectUnreadByCategory,
  selectActiveCategory,
  selectIsLoading,
  selectHasNewActivity,
  selectPreferences,
  selectIsActivityPanelOpen,
} from "../activity-store";

import type { ActivityCategory, ActivityPreferences } from "@/lib/activity/activity-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnreadCounts(
  overrides?: Partial<ActivityUnreadCounts>,
): ActivityUnreadCounts {
  return {
    total: 0,
    byCategory: {},
    ...overrides,
  };
}

function makeState(overrides?: Partial<ActivityState>): ActivityStore {
  const defaultState: ActivityState = {
    activities: [],
    processedActivities: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    cursor: null,
    totalCount: 0,
    filters: {} as never,
    activeCategory: "all" as ActivityCategory,
    unreadCounts: makeUnreadCounts(),
    lastSeenAt: null,
    hasNewActivity: false,
    preferences: {} as ActivityPreferences,
    isActivityPanelOpen: false,
    selectedActivityId: null,
  };
  return { ...defaultState, ...overrides } as unknown as ActivityStore;
}

// ---------------------------------------------------------------------------
// selectActivities
// ---------------------------------------------------------------------------

describe("selectActivities", () => {
  it("returns empty array by default", () => {
    expect(selectActivities(makeState())).toEqual([]);
  });

  it("returns the processedActivities array", () => {
    const processedActivities = [{ id: "a1" } as never, { id: "a2" } as never];
    expect(selectActivities(makeState({ processedActivities }))).toBe(
      processedActivities,
    );
  });
});

// ---------------------------------------------------------------------------
// selectUnreadTotal
// ---------------------------------------------------------------------------

describe("selectUnreadTotal", () => {
  it("returns 0 by default", () => {
    expect(selectUnreadTotal(makeState())).toBe(0);
  });

  it("returns the total unread count", () => {
    const unreadCounts = makeUnreadCounts({ total: 42 });
    expect(selectUnreadTotal(makeState({ unreadCounts }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectUnreadByCategory (factory)
// ---------------------------------------------------------------------------

describe("selectUnreadByCategory", () => {
  it("returns 0 when category has no unread count", () => {
    expect(
      selectUnreadByCategory("mentions" as ActivityCategory)(makeState()),
    ).toBe(0);
  });

  it("returns the unread count for the given category", () => {
    const unreadCounts = makeUnreadCounts({
      byCategory: { mentions: 5, replies: 3 } as never,
    });
    expect(
      selectUnreadByCategory("mentions" as ActivityCategory)(
        makeState({ unreadCounts }),
      ),
    ).toBe(5);
    expect(
      selectUnreadByCategory("replies" as ActivityCategory)(
        makeState({ unreadCounts }),
      ),
    ).toBe(3);
  });

  it("returns 0 for a category not in byCategory", () => {
    const unreadCounts = makeUnreadCounts({
      byCategory: { mentions: 5 } as never,
    });
    expect(
      selectUnreadByCategory("reactions" as ActivityCategory)(
        makeState({ unreadCounts }),
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectActiveCategory
// ---------------------------------------------------------------------------

describe("selectActiveCategory", () => {
  it("returns the default active category", () => {
    expect(selectActiveCategory(makeState())).toBe("all");
  });

  it("returns the current active category", () => {
    expect(
      selectActiveCategory(
        makeState({ activeCategory: "mentions" as ActivityCategory }),
      ),
    ).toBe("mentions");
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
// selectHasNewActivity
// ---------------------------------------------------------------------------

describe("selectHasNewActivity", () => {
  it("returns false by default", () => {
    expect(selectHasNewActivity(makeState())).toBe(false);
  });

  it("returns true when there is new activity", () => {
    expect(selectHasNewActivity(makeState({ hasNewActivity: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPreferences
// ---------------------------------------------------------------------------

describe("selectPreferences", () => {
  it("returns the preferences object", () => {
    const preferences = {
      groupByDate: true,
      showBotActivity: false,
    } as ActivityPreferences;
    expect(selectPreferences(makeState({ preferences }))).toBe(preferences);
  });
});

// ---------------------------------------------------------------------------
// selectIsActivityPanelOpen
// ---------------------------------------------------------------------------

describe("selectIsActivityPanelOpen", () => {
  it("returns false by default", () => {
    expect(selectIsActivityPanelOpen(makeState())).toBe(false);
  });

  it("returns true when the activity panel is open", () => {
    expect(
      selectIsActivityPanelOpen(makeState({ isActivityPanelOpen: true })),
    ).toBe(true);
  });
});
