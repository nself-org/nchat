/**
 * Tests for audit-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { AuditStore, AuditState } from "../audit-store";
import {
  selectAuditEntries,
  selectFilteredEntries,
  selectSelectedEntry,
  selectSelectedEntryIds,
  selectFilters,
  selectSort,
  selectPagination,
  selectSettings,
  selectStatistics,
  selectIsLoading,
  selectError,
  selectEntriesByCategory,
  selectEntriesBySeverity,
  selectSecurityEntries,
  selectAdminEntries,
  selectRecentEntries,
  selectFailedEntries,
  selectCriticalEntries,
} from "../audit-store";

import type {
  AuditLogEntry,
  AuditLogPagination,
  AuditSettings,
  AuditStatistics,
} from "@/lib/audit/audit-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: "entry1",
    timestamp: new Date("2024-01-01T00:00:00Z"),
    category: "user",
    action: "login",
    severity: "info",
    actor: { id: "u1", type: "user" },
    description: "User logged in",
    success: true,
    ...overrides,
  } as AuditLogEntry;
}

function makePagination(
  overrides?: Partial<AuditLogPagination>,
): AuditLogPagination {
  return {
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    ...overrides,
  };
}

function makeState(overrides?: Partial<AuditState>): AuditStore {
  const defaultState: AuditState = {
    entries: [],
    filteredEntries: [],
    selectedEntry: null,
    selectedEntryIds: [],
    filters: {},
    sort: { field: "timestamp", direction: "desc" } as never,
    searchQuery: "",
    pagination: makePagination(),
    settings: {} as never,
    statistics: null,
    isLoading: false,
    isLoadingMore: false,
    isExporting: false,
    isSavingSettings: false,
    error: null,
    isRealTimeEnabled: false,
    lastRefresh: null,
  };
  return { ...defaultState, ...overrides } as unknown as AuditStore;
}

// ---------------------------------------------------------------------------
// selectAuditEntries
// ---------------------------------------------------------------------------

describe("selectAuditEntries", () => {
  it("returns empty array by default", () => {
    expect(selectAuditEntries(makeState())).toEqual([]);
  });

  it("returns the entries array", () => {
    const entries = [makeEntry({ id: "e1" }), makeEntry({ id: "e2" })];
    expect(selectAuditEntries(makeState({ entries }))).toBe(entries);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredEntries
// ---------------------------------------------------------------------------

describe("selectFilteredEntries", () => {
  it("returns empty array by default", () => {
    expect(selectFilteredEntries(makeState())).toEqual([]);
  });

  it("returns the filteredEntries array", () => {
    const filteredEntries = [makeEntry({ id: "fe1" })];
    expect(selectFilteredEntries(makeState({ filteredEntries }))).toBe(
      filteredEntries,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSelectedEntry
// ---------------------------------------------------------------------------

describe("selectSelectedEntry", () => {
  it("returns null by default", () => {
    expect(selectSelectedEntry(makeState())).toBeNull();
  });

  it("returns the selected entry", () => {
    const selectedEntry = makeEntry({ id: "sel1" });
    expect(selectSelectedEntry(makeState({ selectedEntry }))).toBe(
      selectedEntry,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSelectedEntryIds
// ---------------------------------------------------------------------------

describe("selectSelectedEntryIds", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedEntryIds(makeState())).toEqual([]);
  });

  it("returns the selected entry ids", () => {
    const selectedEntryIds = ["e1", "e2", "e3"];
    expect(selectSelectedEntryIds(makeState({ selectedEntryIds }))).toBe(
      selectedEntryIds,
    );
  });
});

// ---------------------------------------------------------------------------
// selectFilters
// ---------------------------------------------------------------------------

describe("selectFilters", () => {
  it("returns empty object by default", () => {
    expect(selectFilters(makeState())).toEqual({});
  });

  it("returns the filters object", () => {
    const filters = {
      category: ["security" as never],
      severity: ["error" as never],
    };
    expect(selectFilters(makeState({ filters: filters as never }))).toBe(
      filters,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSort
// ---------------------------------------------------------------------------

describe("selectSort", () => {
  it("returns the sort state", () => {
    const sort = selectSort(makeState());
    expect(sort).toEqual({ field: "timestamp", direction: "desc" });
  });

  it("returns custom sort", () => {
    const sort = { field: "severity", direction: "asc" } as never;
    expect(selectSort(makeState({ sort }))).toBe(sort);
  });
});

// ---------------------------------------------------------------------------
// selectPagination
// ---------------------------------------------------------------------------

describe("selectPagination", () => {
  it("returns default pagination", () => {
    const pagination = selectPagination(makeState());
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(50);
    expect(pagination.totalCount).toBe(0);
    expect(pagination.totalPages).toBe(0);
  });

  it("returns custom pagination", () => {
    const pagination = makePagination({
      page: 3,
      totalCount: 200,
      totalPages: 4,
    });
    expect(selectPagination(makeState({ pagination }))).toBe(pagination);
  });
});

// ---------------------------------------------------------------------------
// selectSettings
// ---------------------------------------------------------------------------

describe("selectSettings", () => {
  it("returns settings object", () => {
    const settings = { enabled: true } as AuditSettings;
    expect(selectSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectStatistics
// ---------------------------------------------------------------------------

describe("selectStatistics", () => {
  it("returns null by default", () => {
    expect(selectStatistics(makeState())).toBeNull();
  });

  it("returns the statistics object", () => {
    const statistics = { totalEntries: 100 } as AuditStatistics;
    expect(selectStatistics(makeState({ statistics }))).toBe(statistics);
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

  it("returns the error string", () => {
    expect(selectError(makeState({ error: "Failed to load entries" }))).toBe(
      "Failed to load entries",
    );
  });
});

// ---------------------------------------------------------------------------
// selectEntriesByCategory (factory)
// ---------------------------------------------------------------------------

describe("selectEntriesByCategory", () => {
  it("returns empty array when no entries", () => {
    expect(selectEntriesByCategory("security")(makeState())).toEqual([]);
  });

  it("returns only entries matching the category", () => {
    const secEntry = makeEntry({ id: "s1", category: "security" });
    const adminEntry = makeEntry({ id: "a1", category: "admin" });
    const userEntry = makeEntry({ id: "u1", category: "user" });
    const entries = [secEntry, adminEntry, userEntry];
    const result = selectEntriesByCategory("security")(makeState({ entries }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(secEntry);
  });

  it("returns multiple entries matching the category", () => {
    const sec1 = makeEntry({ id: "s1", category: "security" });
    const sec2 = makeEntry({ id: "s2", category: "security" });
    const other = makeEntry({ id: "o1", category: "user" });
    const entries = [sec1, sec2, other];
    const result = selectEntriesByCategory("security")(makeState({ entries }));
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectEntriesBySeverity (factory)
// ---------------------------------------------------------------------------

describe("selectEntriesBySeverity", () => {
  it("returns empty array when no entries", () => {
    expect(selectEntriesBySeverity("critical")(makeState())).toEqual([]);
  });

  it("returns only entries matching the severity", () => {
    const critEntry = makeEntry({ id: "c1", severity: "critical" });
    const infoEntry = makeEntry({ id: "i1", severity: "info" });
    const entries = [critEntry, infoEntry];
    const result = selectEntriesBySeverity("critical")(makeState({ entries }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(critEntry);
  });
});

// ---------------------------------------------------------------------------
// selectSecurityEntries
// ---------------------------------------------------------------------------

describe("selectSecurityEntries", () => {
  it("returns empty array when no entries", () => {
    expect(selectSecurityEntries(makeState())).toEqual([]);
  });

  it("returns entries with category=security", () => {
    const sec = makeEntry({ id: "s1", category: "security" });
    const other = makeEntry({ id: "o1", category: "admin" });
    const result = selectSecurityEntries(makeState({ entries: [sec, other] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(sec);
  });
});

// ---------------------------------------------------------------------------
// selectAdminEntries
// ---------------------------------------------------------------------------

describe("selectAdminEntries", () => {
  it("returns empty array when no entries", () => {
    expect(selectAdminEntries(makeState())).toEqual([]);
  });

  it("returns entries with category=admin", () => {
    const admin = makeEntry({ id: "a1", category: "admin" });
    const other = makeEntry({ id: "o1", category: "user" });
    const result = selectAdminEntries(makeState({ entries: [admin, other] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(admin);
  });
});

// ---------------------------------------------------------------------------
// selectRecentEntries (factory with limit)
// ---------------------------------------------------------------------------

describe("selectRecentEntries", () => {
  it("returns empty array when no entries", () => {
    expect(selectRecentEntries(5)(makeState())).toEqual([]);
  });

  it("returns the first N entries (slice from front)", () => {
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2" }),
      makeEntry({ id: "e3" }),
      makeEntry({ id: "e4" }),
      makeEntry({ id: "e5" }),
    ];
    const result = selectRecentEntries(3)(makeState({ entries }));
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(entries[0]);
    expect(result[1]).toBe(entries[1]);
    expect(result[2]).toBe(entries[2]);
  });

  it("returns all entries when limit exceeds total", () => {
    const entries = [makeEntry({ id: "e1" }), makeEntry({ id: "e2" })];
    const result = selectRecentEntries(10)(makeState({ entries }));
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectFailedEntries
// ---------------------------------------------------------------------------

describe("selectFailedEntries", () => {
  it("returns empty array when no entries", () => {
    expect(selectFailedEntries(makeState())).toEqual([]);
  });

  it("returns entries where success is false", () => {
    const failed = makeEntry({ id: "f1", success: false });
    const succeeded = makeEntry({ id: "s1", success: true });
    const result = selectFailedEntries(
      makeState({ entries: [failed, succeeded] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(failed);
  });
});

// ---------------------------------------------------------------------------
// selectCriticalEntries
// ---------------------------------------------------------------------------

describe("selectCriticalEntries", () => {
  it("returns empty array when no entries", () => {
    expect(selectCriticalEntries(makeState())).toEqual([]);
  });

  it("returns entries with severity=critical", () => {
    const crit = makeEntry({ id: "c1", severity: "critical" });
    const info = makeEntry({ id: "i1", severity: "info" });
    const result = selectCriticalEntries(makeState({ entries: [crit, info] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(crit);
  });

  it("returns entries with severity=error", () => {
    const err = makeEntry({ id: "e1", severity: "error" });
    const warn = makeEntry({ id: "w1", severity: "warning" });
    const result = selectCriticalEntries(makeState({ entries: [err, warn] }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(err);
  });

  it("returns both critical and error severity entries", () => {
    const crit = makeEntry({ id: "c1", severity: "critical" });
    const err = makeEntry({ id: "e1", severity: "error" });
    const info = makeEntry({ id: "i1", severity: "info" });
    const result = selectCriticalEntries(
      makeState({ entries: [crit, err, info] }),
    );
    expect(result).toHaveLength(2);
  });
});
