/**
 * Tests for app-directory-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { AppDirectoryStore } from "../app-directory-store";
import {
  selectAllApps,
  selectInstalledApps,
  selectSearchResults,
  selectHasActiveFilters,
  selectActiveCategory,
  selectAppById,
  selectIsInstalled,
} from "../app-directory-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS = {
  categories: [],
  types: [],
  pricing: [],
  minRating: 0,
  verified: false,
  featured: false,
};

function makeState(
  overrides?: Partial<Record<string, unknown>>,
): AppDirectoryStore {
  const defaultState = {
    apps: new Map(),
    categories: [],
    featuredApps: [],
    popularApps: [],
    recentApps: [],
    installedApps: new Map(),
    searchQuery: "",
    searchResults: [],
    searchFilters: { ...DEFAULT_FILTERS },
    selectedAppId: null,
    activeCategory: null,
    isLoading: false,
    isInstalling: null,
    error: null,
    hasMore: false,
    currentPage: 1,
  };
  return { ...defaultState, ...overrides } as unknown as AppDirectoryStore;
}

// ---------------------------------------------------------------------------
// selectAllApps
// ---------------------------------------------------------------------------

describe("selectAllApps", () => {
  it("returns empty array when apps map is empty", () => {
    expect(selectAllApps(makeState())).toEqual([]);
  });

  it("returns all apps from the map", () => {
    const app1 = { id: "a1", name: "Chat Bot" } as never;
    const app2 = { id: "a2", name: "Scheduler" } as never;
    const apps = new Map([
      ["a1", app1],
      ["a2", app2],
    ]);
    const result = selectAllApps(makeState({ apps }));
    expect(result).toHaveLength(2);
    expect(result).toContain(app1);
    expect(result).toContain(app2);
  });
});

// ---------------------------------------------------------------------------
// selectInstalledApps
// ---------------------------------------------------------------------------

describe("selectInstalledApps", () => {
  it("returns empty array when installedApps map is empty", () => {
    expect(selectInstalledApps(makeState())).toEqual([]);
  });

  it("returns all installed apps from the map", () => {
    const inst1 = { appId: "a1", installedAt: "2024-01-01" } as never;
    const installedApps = new Map([["a1", inst1]]);
    const result = selectInstalledApps(makeState({ installedApps }));
    expect(result).toHaveLength(1);
    expect(result).toContain(inst1);
  });
});

// ---------------------------------------------------------------------------
// selectSearchResults
// ---------------------------------------------------------------------------

describe("selectSearchResults", () => {
  it("returns empty array by default", () => {
    expect(selectSearchResults(makeState())).toEqual([]);
  });

  it("returns the searchResults array", () => {
    const searchResults = [{ app: { id: "a1" } } as never];
    expect(selectSearchResults(makeState({ searchResults }))).toBe(
      searchResults,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHasActiveFilters
// ---------------------------------------------------------------------------

describe("selectHasActiveFilters", () => {
  it("returns false when all filters are at default", () => {
    expect(selectHasActiveFilters(makeState())).toBe(false);
  });

  it("returns true when categories filter is set", () => {
    const searchFilters = { ...DEFAULT_FILTERS, categories: ["productivity"] };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });

  it("returns true when types filter is set", () => {
    const searchFilters = { ...DEFAULT_FILTERS, types: ["bot"] };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });

  it("returns true when pricing filter is set", () => {
    const searchFilters = { ...DEFAULT_FILTERS, pricing: ["free"] };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });

  it("returns true when minRating is above 0", () => {
    const searchFilters = { ...DEFAULT_FILTERS, minRating: 3 };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });

  it("returns true when verified filter is set", () => {
    const searchFilters = { ...DEFAULT_FILTERS, verified: true };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });

  it("returns true when featured filter is set", () => {
    const searchFilters = { ...DEFAULT_FILTERS, featured: true };
    expect(selectHasActiveFilters(makeState({ searchFilters }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveCategory
// ---------------------------------------------------------------------------

describe("selectActiveCategory", () => {
  it("returns null when activeCategory is null", () => {
    expect(selectActiveCategory(makeState())).toBeNull();
  });

  it("returns null when activeCategory does not match any category", () => {
    expect(
      selectActiveCategory(makeState({ activeCategory: "nonexistent" })),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectAppById (factory)
// ---------------------------------------------------------------------------

describe("selectAppById", () => {
  it("returns undefined when apps map is empty and no registry match", () => {
    // selectAppById falls back to getAppById registry; for unknown ids it returns undefined
    const result = selectAppById("nonexistent-app-id-xyz")(makeState());
    expect(result).toBeUndefined();
  });

  it("returns app from the map when found", () => {
    const app = { id: "a1", slug: "chat-bot", name: "Chat Bot" } as never;
    const apps = new Map([["a1", app]]);
    expect(selectAppById("a1")(makeState({ apps }))).toBe(app);
  });
});

// ---------------------------------------------------------------------------
// selectIsInstalled (factory)
// ---------------------------------------------------------------------------

describe("selectIsInstalled", () => {
  it("returns false when installedApps map is empty", () => {
    expect(selectIsInstalled("a1")(makeState())).toBe(false);
  });

  it("returns true when app is installed", () => {
    const installedApps = new Map([["a1", { appId: "a1" } as never]]);
    expect(selectIsInstalled("a1")(makeState({ installedApps }))).toBe(true);
  });

  it("returns false when a different app is installed", () => {
    const installedApps = new Map([["a2", { appId: "a2" } as never]]);
    expect(selectIsInstalled("a1")(makeState({ installedApps }))).toBe(false);
  });
});
