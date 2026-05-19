/**
 * Tests for user-directory-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { UserDirectoryStore } from "../user-directory-store";
import {
  selectViewMode,
  selectSearchQuery,
  selectIsSearching,
  selectRoleFilter,
  selectPresenceFilter,
  selectSelectedUserId,
  selectViewingProfileId,
  selectContacts,
  selectBlockedUsers,
  selectIsLoadingDirectory,
  selectIsLoadingProfile,
  selectDirectoryError,
  selectActiveFilterCount,
  selectSortConfig,
} from "../user-directory-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(
  overrides?: Partial<Record<string, unknown>>,
): UserDirectoryStore {
  const defaultState = {
    viewMode: "grid",
    sortField: "displayName",
    sortDirection: "asc",
    searchQuery: "",
    isSearching: false,
    searchHistory: [],
    roleFilter: "all",
    presenceFilter: "all",
    departmentFilter: "all",
    teamFilter: "all",
    locationFilter: "all",
    selectedUserId: null,
    viewingProfileId: null,
    contacts: [],
    blockedUsers: [],
    isLoadingDirectory: false,
    isLoadingProfile: false,
    isUpdatingContact: false,
    isUpdatingBlock: false,
    directoryError: null,
    profileError: null,
  };
  return { ...defaultState, ...overrides } as unknown as UserDirectoryStore;
}

// ---------------------------------------------------------------------------
// selectViewMode
// ---------------------------------------------------------------------------

describe("selectViewMode", () => {
  it("returns grid by default", () => {
    expect(selectViewMode(makeState())).toBe("grid");
  });

  it("returns list when set", () => {
    expect(selectViewMode(makeState({ viewMode: "list" }))).toBe("list");
  });

  it("returns org-chart when set", () => {
    expect(selectViewMode(makeState({ viewMode: "org-chart" }))).toBe(
      "org-chart",
    );
  });
});

// ---------------------------------------------------------------------------
// selectSearchQuery
// ---------------------------------------------------------------------------

describe("selectSearchQuery", () => {
  it("returns empty string by default", () => {
    expect(selectSearchQuery(makeState())).toBe("");
  });

  it("returns the current search query", () => {
    expect(selectSearchQuery(makeState({ searchQuery: "alice" }))).toBe(
      "alice",
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsSearching
// ---------------------------------------------------------------------------

describe("selectIsSearching", () => {
  it("returns false by default", () => {
    expect(selectIsSearching(makeState())).toBe(false);
  });

  it("returns true when searching", () => {
    expect(selectIsSearching(makeState({ isSearching: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectRoleFilter
// ---------------------------------------------------------------------------

describe("selectRoleFilter", () => {
  it("returns all by default", () => {
    expect(selectRoleFilter(makeState())).toBe("all");
  });

  it("returns the current role filter", () => {
    expect(selectRoleFilter(makeState({ roleFilter: "admin" as never }))).toBe(
      "admin",
    );
  });
});

// ---------------------------------------------------------------------------
// selectPresenceFilter
// ---------------------------------------------------------------------------

describe("selectPresenceFilter", () => {
  it("returns all by default", () => {
    expect(selectPresenceFilter(makeState())).toBe("all");
  });

  it("returns the current presence filter", () => {
    expect(
      selectPresenceFilter(makeState({ presenceFilter: "online" as never })),
    ).toBe("online");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUserId
// ---------------------------------------------------------------------------

describe("selectSelectedUserId", () => {
  it("returns null by default", () => {
    expect(selectSelectedUserId(makeState())).toBeNull();
  });

  it("returns the selected user id when set", () => {
    expect(selectSelectedUserId(makeState({ selectedUserId: "u1" }))).toBe(
      "u1",
    );
  });
});

// ---------------------------------------------------------------------------
// selectViewingProfileId
// ---------------------------------------------------------------------------

describe("selectViewingProfileId", () => {
  it("returns null by default", () => {
    expect(selectViewingProfileId(makeState())).toBeNull();
  });

  it("returns the viewing profile id when set", () => {
    expect(selectViewingProfileId(makeState({ viewingProfileId: "u2" }))).toBe(
      "u2",
    );
  });
});

// ---------------------------------------------------------------------------
// selectContacts
// ---------------------------------------------------------------------------

describe("selectContacts", () => {
  it("returns empty array by default", () => {
    expect(selectContacts(makeState())).toEqual([]);
  });

  it("returns the contacts array", () => {
    const contacts = [{ userId: "u1", addedAt: "2024-01-01" } as never];
    expect(selectContacts(makeState({ contacts }))).toBe(contacts);
  });
});

// ---------------------------------------------------------------------------
// selectBlockedUsers
// ---------------------------------------------------------------------------

describe("selectBlockedUsers", () => {
  it("returns empty array by default", () => {
    expect(selectBlockedUsers(makeState())).toEqual([]);
  });

  it("returns the blockedUsers array", () => {
    const blockedUsers = [{ userId: "u2", blockedAt: "2024-01-01" } as never];
    expect(selectBlockedUsers(makeState({ blockedUsers }))).toBe(blockedUsers);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingDirectory
// ---------------------------------------------------------------------------

describe("selectIsLoadingDirectory", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingDirectory(makeState())).toBe(false);
  });

  it("returns true when loading directory", () => {
    expect(
      selectIsLoadingDirectory(makeState({ isLoadingDirectory: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingProfile
// ---------------------------------------------------------------------------

describe("selectIsLoadingProfile", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingProfile(makeState())).toBe(false);
  });

  it("returns true when loading profile", () => {
    expect(selectIsLoadingProfile(makeState({ isLoadingProfile: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectDirectoryError
// ---------------------------------------------------------------------------

describe("selectDirectoryError", () => {
  it("returns null by default", () => {
    expect(selectDirectoryError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(
      selectDirectoryError(
        makeState({ directoryError: "Failed to load users" }),
      ),
    ).toBe("Failed to load users");
  });
});

// ---------------------------------------------------------------------------
// selectActiveFilterCount
// ---------------------------------------------------------------------------

describe("selectActiveFilterCount", () => {
  it("returns 0 when no filters are active", () => {
    expect(selectActiveFilterCount(makeState())).toBe(0);
  });

  it("counts searchQuery as one filter", () => {
    expect(selectActiveFilterCount(makeState({ searchQuery: "alice" }))).toBe(
      1,
    );
  });

  it("counts roleFilter when not all", () => {
    expect(
      selectActiveFilterCount(makeState({ roleFilter: "admin" as never })),
    ).toBe(1);
  });

  it("counts presenceFilter when not all", () => {
    expect(
      selectActiveFilterCount(makeState({ presenceFilter: "online" as never })),
    ).toBe(1);
  });

  it("counts departmentFilter when not all", () => {
    expect(
      selectActiveFilterCount(makeState({ departmentFilter: "engineering" })),
    ).toBe(1);
  });

  it("counts multiple active filters correctly", () => {
    const count = selectActiveFilterCount(
      makeState({
        searchQuery: "alice",
        roleFilter: "admin" as never,
        presenceFilter: "online" as never,
      }),
    );
    expect(count).toBe(3);
  });

  it("does not count filters set to all", () => {
    expect(
      selectActiveFilterCount(
        makeState({
          roleFilter: "all",
          presenceFilter: "all",
          departmentFilter: "all",
          teamFilter: "all",
          locationFilter: "all",
        }),
      ),
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectSortConfig
// ---------------------------------------------------------------------------

describe("selectSortConfig", () => {
  it("returns the default sort config", () => {
    const result = selectSortConfig(makeState());
    expect(result.field).toBe("displayName");
    expect(result.direction).toBe("asc");
  });

  it("returns updated sort config", () => {
    const result = selectSortConfig(
      makeState({ sortField: "lastSeen", sortDirection: "desc" }),
    );
    expect(result.field).toBe("lastSeen");
    expect(result.direction).toBe("desc");
  });
});
