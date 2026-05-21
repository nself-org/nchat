/**
 * Tests for user-management-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  UserManagementStore,
  UserManagementState,
} from "../user-management-store";
import {
  selectUsers,
  selectUsersTotal,
  selectUsersPagination,
  selectUsersFilters,
  selectUsersSort,
  selectIsLoadingUsers,
  selectSelectedUser,
  selectSelectedUserActivity,
  selectSelectedUserSessions,
  selectSelectedUserDevices,
  selectInvites,
  selectInvitesTotal,
  selectInviteLinks,
  selectBannedUsers,
  selectBannedUsersTotal,
  selectStats,
  selectGrowthData,
  selectActiveImpersonation,
  selectRoles,
  selectSelectedUserIds,
  selectIsSelectionMode,
  selectSelectedCount,
} from "../user-management-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(
  overrides?: Partial<UserManagementState>,
): UserManagementStore {
  const defaultState: UserManagementState = {
    users: [],
    usersTotal: 0,
    usersPage: 1,
    usersPerPage: 25,
    usersFilters: {},
    usersSort: { field: "displayName", direction: "asc" } as never,
    isLoadingUsers: false,
    selectedUser: null,
    selectedUserActivity: [],
    selectedUserSessions: [],
    selectedUserDevices: [],
    selectedUserBanHistory: [],
    isLoadingUserDetails: false,
    invites: [],
    invitesTotal: 0,
    invitesPage: 1,
    invitesPerPage: 25,
    invitesStatusFilter: "all",
    isLoadingInvites: false,
    inviteLinks: [],
    isLoadingInviteLinks: false,
    bannedUsers: [],
    bannedUsersTotal: 0,
    bannedUsersPage: 1,
    isLoadingBannedUsers: false,
    stats: null,
    growthData: [],
    isLoadingStats: false,
    activeImpersonation: null,
    impersonationHistory: [],
    isLoadingImpersonation: false,
    roles: [],
    isLoadingRoles: false,
    selectedUserIds: [],
    isSelectionMode: false,
    userModalOpen: false,
    userModalMode: "view",
    banModalOpen: false,
    banModalUser: null,
    inviteModalOpen: false,
    inviteModalMode: "single",
    deleteConfirmOpen: false,
    deleteConfirmUser: null,
    roleChangeModalOpen: false,
    roleChangeUser: null,
    impersonateModalOpen: false,
    impersonateUser: null,
    resetPasswordModalOpen: false,
    resetPasswordUser: null,
  };
  return { ...defaultState, ...overrides } as unknown as UserManagementStore;
}

// ---------------------------------------------------------------------------
// selectUsers
// ---------------------------------------------------------------------------

describe("selectUsers", () => {
  it("returns empty array by default", () => {
    expect(selectUsers(makeState())).toEqual([]);
  });

  it("returns the users array", () => {
    const users = [{ id: "u1" }, { id: "u2" }] as never[];
    expect(selectUsers(makeState({ users }))).toBe(users);
  });
});

// ---------------------------------------------------------------------------
// selectUsersTotal
// ---------------------------------------------------------------------------

describe("selectUsersTotal", () => {
  it("returns 0 by default", () => {
    expect(selectUsersTotal(makeState())).toBe(0);
  });

  it("returns the users total count", () => {
    expect(selectUsersTotal(makeState({ usersTotal: 150 }))).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// selectUsersPagination
// ---------------------------------------------------------------------------

describe("selectUsersPagination", () => {
  it("returns default pagination values", () => {
    const result = selectUsersPagination(makeState());
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(25);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("calculates totalPages correctly", () => {
    const result = selectUsersPagination(
      makeState({ usersTotal: 100, usersPerPage: 25 }),
    );
    expect(result.totalPages).toBe(4);
  });

  it("rounds up totalPages for partial pages", () => {
    const result = selectUsersPagination(
      makeState({ usersTotal: 101, usersPerPage: 25 }),
    );
    expect(result.totalPages).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// selectUsersFilters
// ---------------------------------------------------------------------------

describe("selectUsersFilters", () => {
  it("returns default empty filters object", () => {
    expect(selectUsersFilters(makeState())).toEqual({});
  });

  it("returns the filters", () => {
    const usersFilters = { role: "admin" } as never;
    expect(selectUsersFilters(makeState({ usersFilters }))).toBe(usersFilters);
  });
});

// ---------------------------------------------------------------------------
// selectUsersSort
// ---------------------------------------------------------------------------

describe("selectUsersSort", () => {
  it("returns default sort options", () => {
    const result = selectUsersSort(makeState());
    expect(result).toBeDefined();
  });

  it("returns the sort options", () => {
    const usersSort = { field: "email", direction: "desc" } as never;
    expect(selectUsersSort(makeState({ usersSort }))).toBe(usersSort);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingUsers
// ---------------------------------------------------------------------------

describe("selectIsLoadingUsers", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingUsers(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoadingUsers(makeState({ isLoadingUsers: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUser
// ---------------------------------------------------------------------------

describe("selectSelectedUser", () => {
  it("returns null when no user is selected", () => {
    expect(selectSelectedUser(makeState())).toBeNull();
  });

  it("returns the selected user", () => {
    const user = { id: "u1", displayName: "Alice" } as never;
    expect(selectSelectedUser(makeState({ selectedUser: user }))).toBe(user);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUserActivity
// ---------------------------------------------------------------------------

describe("selectSelectedUserActivity", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedUserActivity(makeState())).toEqual([]);
  });

  it("returns activity entries", () => {
    const activity = [{ id: "a1", action: "login" }] as never[];
    expect(
      selectSelectedUserActivity(makeState({ selectedUserActivity: activity })),
    ).toBe(activity);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUserSessions
// ---------------------------------------------------------------------------

describe("selectSelectedUserSessions", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedUserSessions(makeState())).toEqual([]);
  });

  it("returns sessions", () => {
    const sessions = [{ id: "s1", device: "Chrome" }] as never[];
    expect(
      selectSelectedUserSessions(makeState({ selectedUserSessions: sessions })),
    ).toBe(sessions);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUserDevices
// ---------------------------------------------------------------------------

describe("selectSelectedUserDevices", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedUserDevices(makeState())).toEqual([]);
  });

  it("returns devices", () => {
    const devices = [{ id: "d1", name: "iPhone" }] as never[];
    expect(
      selectSelectedUserDevices(makeState({ selectedUserDevices: devices })),
    ).toBe(devices);
  });
});

// ---------------------------------------------------------------------------
// selectInvites
// ---------------------------------------------------------------------------

describe("selectInvites", () => {
  it("returns empty array by default", () => {
    expect(selectInvites(makeState())).toEqual([]);
  });

  it("returns invites", () => {
    const invites = [{ id: "inv1", email: "bob@example.com" }] as never[];
    expect(selectInvites(makeState({ invites }))).toBe(invites);
  });
});

// ---------------------------------------------------------------------------
// selectInvitesTotal
// ---------------------------------------------------------------------------

describe("selectInvitesTotal", () => {
  it("returns 0 by default", () => {
    expect(selectInvitesTotal(makeState())).toBe(0);
  });

  it("returns the total count", () => {
    expect(selectInvitesTotal(makeState({ invitesTotal: 42 }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectInviteLinks
// ---------------------------------------------------------------------------

describe("selectInviteLinks", () => {
  it("returns empty array by default", () => {
    expect(selectInviteLinks(makeState())).toEqual([]);
  });

  it("returns invite links", () => {
    const inviteLinks = [
      { id: "link1", url: "https://example.com/invite/abc" },
    ] as never[];
    expect(selectInviteLinks(makeState({ inviteLinks }))).toBe(inviteLinks);
  });
});

// ---------------------------------------------------------------------------
// selectBannedUsers
// ---------------------------------------------------------------------------

describe("selectBannedUsers", () => {
  it("returns empty array by default", () => {
    expect(selectBannedUsers(makeState())).toEqual([]);
  });

  it("returns banned users", () => {
    const bannedUsers = [{ id: "u3", displayName: "Spammer" }] as never[];
    expect(selectBannedUsers(makeState({ bannedUsers }))).toBe(bannedUsers);
  });
});

// ---------------------------------------------------------------------------
// selectBannedUsersTotal
// ---------------------------------------------------------------------------

describe("selectBannedUsersTotal", () => {
  it("returns 0 by default", () => {
    expect(selectBannedUsersTotal(makeState())).toBe(0);
  });

  it("returns the banned users total", () => {
    expect(selectBannedUsersTotal(makeState({ bannedUsersTotal: 7 }))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// selectStats
// ---------------------------------------------------------------------------

describe("selectStats", () => {
  it("returns null when stats are not loaded", () => {
    expect(selectStats(makeState())).toBeNull();
  });

  it("returns the stats object", () => {
    const stats = { totalUsers: 500 } as never;
    expect(selectStats(makeState({ stats }))).toBe(stats);
  });
});

// ---------------------------------------------------------------------------
// selectGrowthData
// ---------------------------------------------------------------------------

describe("selectGrowthData", () => {
  it("returns empty array by default", () => {
    expect(selectGrowthData(makeState())).toEqual([]);
  });

  it("returns growth data array", () => {
    const growthData = [{ date: "2026-01-01", count: 10 }] as never[];
    expect(selectGrowthData(makeState({ growthData }))).toBe(growthData);
  });
});

// ---------------------------------------------------------------------------
// selectActiveImpersonation
// ---------------------------------------------------------------------------

describe("selectActiveImpersonation", () => {
  it("returns null when no active impersonation", () => {
    expect(selectActiveImpersonation(makeState())).toBeNull();
  });

  it("returns the active impersonation session", () => {
    const session = { id: "imp1", targetUserId: "u5" } as never;
    expect(
      selectActiveImpersonation(makeState({ activeImpersonation: session })),
    ).toBe(session);
  });
});

// ---------------------------------------------------------------------------
// selectRoles
// ---------------------------------------------------------------------------

describe("selectRoles", () => {
  it("returns empty array by default", () => {
    expect(selectRoles(makeState())).toEqual([]);
  });

  it("returns roles array", () => {
    const roles = [
      {
        id: "r1",
        name: "admin",
        permissions: ["read", "write"],
        isDefault: false,
      },
    ];
    expect(selectRoles(makeState({ roles }))).toBe(roles);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedUserIds
// ---------------------------------------------------------------------------

describe("selectSelectedUserIds", () => {
  it("returns empty array by default", () => {
    expect(selectSelectedUserIds(makeState())).toEqual([]);
  });

  it("returns selected user ids", () => {
    const selectedUserIds = ["u1", "u2", "u3"];
    expect(selectSelectedUserIds(makeState({ selectedUserIds }))).toBe(
      selectedUserIds,
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsSelectionMode
// ---------------------------------------------------------------------------

describe("selectIsSelectionMode", () => {
  it("returns false by default", () => {
    expect(selectIsSelectionMode(makeState())).toBe(false);
  });

  it("returns true when in selection mode", () => {
    expect(selectIsSelectionMode(makeState({ isSelectionMode: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSelectedCount
// ---------------------------------------------------------------------------

describe("selectSelectedCount", () => {
  it("returns 0 when no users are selected", () => {
    expect(selectSelectedCount(makeState())).toBe(0);
  });

  it("returns the number of selected users", () => {
    expect(
      selectSelectedCount(makeState({ selectedUserIds: ["u1", "u2", "u3"] })),
    ).toBe(3);
  });
});
