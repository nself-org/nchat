/**
 * Tests for analytics-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { AnalyticsStore, AnalyticsState } from "../analytics-store";
import {
  selectFilters,
  selectIsDataLoaded,
  selectHasError,
  selectMessageStats,
  selectUserStats,
  selectChannelStats,
} from "../analytics-store";

import type { AnalyticsSummary } from "@/lib/analytics/analytics-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDateRange() {
  return {
    start: new Date("2024-01-01"),
    end: new Date("2024-01-31"),
  };
}

function makeState(overrides?: Partial<AnalyticsState>): AnalyticsStore {
  const defaultState: AnalyticsState = {
    currentView: "overview",
    isLoading: false,
    error: null,
    lastUpdated: null,
    dateRange: makeDateRange(),
    dateRangePreset: "last30days" as never,
    granularity: "day" as never,
    selectedChannelIds: [],
    selectedUserIds: [],
    includeBots: false,
    dashboardData: null,
    summary: null,
    messageVolume: [],
    userActivity: [],
    channelActivity: [],
    reactions: [],
    fileUploads: [],
    searchQueries: [],
    peakHours: [],
    topMessages: [],
    inactiveUsers: [],
    userGrowth: [],
    activeUsers: null,
    comparisonEnabled: false,
    comparisonDateRange: null,
    comparisonData: null,
    scheduledReports: [],
    reportHistory: [],
    isExporting: false,
    exportProgress: 0,
    sidebarCollapsed: false,
  } as unknown as AnalyticsState;
  return { ...defaultState, ...overrides } as unknown as AnalyticsStore;
}

// ---------------------------------------------------------------------------
// selectFilters
// ---------------------------------------------------------------------------

describe("selectFilters", () => {
  it("returns a filters object built from state", () => {
    const state = makeState({
      dateRange: makeDateRange(),
      granularity: "week" as never,
      selectedChannelIds: [],
      selectedUserIds: [],
      includeBots: false,
    });
    const filters = selectFilters(state);
    expect(filters).toBeDefined();
    expect(filters.includeBots).toBe(false);
    expect(filters.channelIds).toBeUndefined();
    expect(filters.userIds).toBeUndefined();
  });

  it("includes channelIds when selectedChannelIds is non-empty", () => {
    const state = makeState({ selectedChannelIds: ["c1", "c2"] });
    const filters = selectFilters(state);
    expect(filters.channelIds).toEqual(["c1", "c2"]);
  });

  it("excludes channelIds when selectedChannelIds is empty", () => {
    const state = makeState({ selectedChannelIds: [] });
    const filters = selectFilters(state);
    expect(filters.channelIds).toBeUndefined();
  });

  it("includes userIds when selectedUserIds is non-empty", () => {
    const state = makeState({ selectedUserIds: ["u1"] });
    const filters = selectFilters(state);
    expect(filters.userIds).toEqual(["u1"]);
  });

  it("excludes userIds when selectedUserIds is empty", () => {
    const state = makeState({ selectedUserIds: [] });
    const filters = selectFilters(state);
    expect(filters.userIds).toBeUndefined();
  });

  it("reflects includeBots true", () => {
    const state = makeState({ includeBots: true });
    expect(selectFilters(state).includeBots).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsDataLoaded
// ---------------------------------------------------------------------------

describe("selectIsDataLoaded", () => {
  it("returns false when dashboardData is null", () => {
    expect(selectIsDataLoaded(makeState({ dashboardData: null }))).toBe(false);
  });

  it("returns true when dashboardData is set", () => {
    expect(selectIsDataLoaded(makeState({ dashboardData: {} as never }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHasError
// ---------------------------------------------------------------------------

describe("selectHasError", () => {
  it("returns false when error is null", () => {
    expect(selectHasError(makeState({ error: null }))).toBe(false);
  });

  it("returns true when error is set", () => {
    expect(
      selectHasError(makeState({ error: "Failed to fetch analytics" })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMessageStats
// ---------------------------------------------------------------------------

describe("selectMessageStats", () => {
  it("returns null when summary is null", () => {
    expect(selectMessageStats(makeState({ summary: null }))).toBeNull();
  });

  it("returns null when summary.messages is undefined", () => {
    expect(
      selectMessageStats(makeState({ summary: {} as AnalyticsSummary })),
    ).toBeNull();
  });

  it("returns the messages stats from summary", () => {
    const messages = { total: 500, today: 20 } as never;
    const summary = { messages } as AnalyticsSummary;
    expect(selectMessageStats(makeState({ summary }))).toBe(messages);
  });
});

// ---------------------------------------------------------------------------
// selectUserStats
// ---------------------------------------------------------------------------

describe("selectUserStats", () => {
  it("returns null when summary is null", () => {
    expect(selectUserStats(makeState({ summary: null }))).toBeNull();
  });

  it("returns null when summary.users is undefined", () => {
    expect(
      selectUserStats(makeState({ summary: {} as AnalyticsSummary })),
    ).toBeNull();
  });

  it("returns the user stats from summary", () => {
    const users = { total: 100, active: 80 } as never;
    const summary = { users } as AnalyticsSummary;
    expect(selectUserStats(makeState({ summary }))).toBe(users);
  });
});

// ---------------------------------------------------------------------------
// selectChannelStats
// ---------------------------------------------------------------------------

describe("selectChannelStats", () => {
  it("returns null when summary is null", () => {
    expect(selectChannelStats(makeState({ summary: null }))).toBeNull();
  });

  it("returns null when summary.channels is undefined", () => {
    expect(
      selectChannelStats(makeState({ summary: {} as AnalyticsSummary })),
    ).toBeNull();
  });

  it("returns the channel stats from summary", () => {
    const channels = { total: 25, active: 18 } as never;
    const summary = { channels } as AnalyticsSummary;
    expect(selectChannelStats(makeState({ summary }))).toBe(channels);
  });
});
