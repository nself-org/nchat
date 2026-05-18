/**
 * Tests for admin-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { AdminStore, AdminStats } from "../admin-store";
import {
  selectStats,
  selectUsers,
  selectChannels,
  selectReports,
  selectActivityLogs,
  selectRoles,
  selectUsersPagination,
  selectChannelsPagination,
  selectReportsPagination,
  selectPendingReportsCount,
  selectBanUserModal,
  selectRoleEditorModal,
  selectDeleteChannelModal,
} from "../admin-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  onlineUsers: 0,
  bannedUsers: 0,
  totalChannels: 0,
  totalMessages: 0,
  pendingReports: 0,
  messagesLast24h: 0,
};

function makeState(overrides?: Partial<Record<string, unknown>>): AdminStore {
  const defaultState = {
    stats: { ...defaultStats },
    isLoadingStats: false,
    users: [],
    selectedUser: null,
    usersTotal: 0,
    usersPage: 1,
    usersPerPage: 20,
    usersSearch: "",
    usersRoleFilter: null,
    usersBannedFilter: null,
    isLoadingUsers: false,
    channels: [],
    selectedChannel: null,
    channelsTotal: 0,
    channelsPage: 1,
    channelsPerPage: 20,
    channelsSearch: "",
    channelsTypeFilter: null,
    channelsIncludeArchived: false,
    isLoadingChannels: false,
    reports: [],
    selectedReport: null,
    reportsTotal: 0,
    reportsPage: 1,
    reportsPerPage: 20,
    reportsStatusFilter: "pending",
    reportsTypeFilter: null,
    isLoadingReports: false,
    activityLogs: [],
    isLoadingActivity: false,
    roles: [],
    isLoadingRoles: false,
    banUserModalOpen: false,
    banUserTarget: null,
    roleEditorOpen: false,
    roleEditorTarget: null,
    deleteChannelModalOpen: false,
    deleteChannelTarget: null,
    // stub actions
    setStats: () => undefined,
    setLoadingStats: () => undefined,
    setUsers: () => undefined,
    setSelectedUser: () => undefined,
    updateUser: () => undefined,
    removeUser: () => undefined,
    setUsersPage: () => undefined,
    setUsersSearch: () => undefined,
    setUsersRoleFilter: () => undefined,
    setUsersBannedFilter: () => undefined,
    setLoadingUsers: () => undefined,
    setChannels: () => undefined,
    setSelectedChannel: () => undefined,
    updateChannel: () => undefined,
    removeChannel: () => undefined,
    setChannelsPage: () => undefined,
    setChannelsSearch: () => undefined,
    setChannelsTypeFilter: () => undefined,
    setChannelsIncludeArchived: () => undefined,
    setLoadingChannels: () => undefined,
    setReports: () => undefined,
    setSelectedReport: () => undefined,
    updateReport: () => undefined,
    removeReport: () => undefined,
    setReportsPage: () => undefined,
    setReportsStatusFilter: () => undefined,
    setReportsTypeFilter: () => undefined,
    setLoadingReports: () => undefined,
    setActivityLogs: () => undefined,
    addActivityLog: () => undefined,
    setLoadingActivity: () => undefined,
    setRoles: () => undefined,
    setLoadingRoles: () => undefined,
    openBanUserModal: () => undefined,
    closeBanUserModal: () => undefined,
    openRoleEditor: () => undefined,
    closeRoleEditor: () => undefined,
    openDeleteChannelModal: () => undefined,
    closeDeleteChannelModal: () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as AdminStore;
}

// ---------------------------------------------------------------------------
// selectStats
// ---------------------------------------------------------------------------

describe("selectStats", () => {
  it("returns default zeroed stats", () => {
    const result = selectStats(makeState());
    expect(result.totalUsers).toBe(0);
    expect(result.pendingReports).toBe(0);
  });

  it("returns the stats object when set", () => {
    const stats: AdminStats = { ...defaultStats, totalUsers: 42, pendingReports: 5 };
    expect(selectStats(makeState({ stats }))).toBe(stats);
  });
});

// ---------------------------------------------------------------------------
// selectUsers
// ---------------------------------------------------------------------------

describe("selectUsers", () => {
  it("returns empty array by default", () => {
    expect(selectUsers(makeState())).toEqual([]);
  });

  it("returns the users array", () => {
    const users = [{ id: "u1", username: "alice" } as never];
    expect(selectUsers(makeState({ users }))).toBe(users);
  });
});

// ---------------------------------------------------------------------------
// selectChannels
// ---------------------------------------------------------------------------

describe("selectChannels", () => {
  it("returns empty array by default", () => {
    expect(selectChannels(makeState())).toEqual([]);
  });

  it("returns the channels array", () => {
    const channels = [{ id: "c1", name: "general" } as never];
    expect(selectChannels(makeState({ channels }))).toBe(channels);
  });
});

// ---------------------------------------------------------------------------
// selectReports
// ---------------------------------------------------------------------------

describe("selectReports", () => {
  it("returns empty array by default", () => {
    expect(selectReports(makeState())).toEqual([]);
  });

  it("returns the reports array", () => {
    const reports = [{ id: "r1", type: "spam" } as never];
    expect(selectReports(makeState({ reports }))).toBe(reports);
  });
});

// ---------------------------------------------------------------------------
// selectActivityLogs
// ---------------------------------------------------------------------------

describe("selectActivityLogs", () => {
  it("returns empty array by default", () => {
    expect(selectActivityLogs(makeState())).toEqual([]);
  });

  it("returns the activity logs array", () => {
    const activityLogs = [{ id: "al1", action: "ban_user" } as never];
    expect(selectActivityLogs(makeState({ activityLogs }))).toBe(activityLogs);
  });
});

// ---------------------------------------------------------------------------
// selectRoles
// ---------------------------------------------------------------------------

describe("selectRoles", () => {
  it("returns empty array by default", () => {
    expect(selectRoles(makeState())).toEqual([]);
  });

  it("returns the roles array", () => {
    const roles = [{ id: "role1", name: "moderator" } as never];
    expect(selectRoles(makeState({ roles }))).toBe(roles);
  });
});

// ---------------------------------------------------------------------------
// selectUsersPagination
// ---------------------------------------------------------------------------

describe("selectUsersPagination", () => {
  it("returns default pagination values", () => {
    const result = selectUsersPagination(makeState());
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("computes totalPages correctly for users", () => {
    const result = selectUsersPagination(
      makeState({ usersTotal: 55, usersPage: 2, usersPerPage: 20 }),
    );
    expect(result.page).toBe(2);
    expect(result.total).toBe(55);
    expect(result.totalPages).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectChannelsPagination
// ---------------------------------------------------------------------------

describe("selectChannelsPagination", () => {
  it("returns default pagination values", () => {
    const result = selectChannelsPagination(makeState());
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("computes totalPages correctly for channels", () => {
    const result = selectChannelsPagination(
      makeState({ channelsTotal: 100, channelsPage: 3, channelsPerPage: 20 }),
    );
    expect(result.page).toBe(3);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// selectReportsPagination
// ---------------------------------------------------------------------------

describe("selectReportsPagination", () => {
  it("returns default pagination values", () => {
    const result = selectReportsPagination(makeState());
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("computes totalPages correctly for reports", () => {
    const result = selectReportsPagination(
      makeState({ reportsTotal: 42, reportsPage: 1, reportsPerPage: 20 }),
    );
    expect(result.total).toBe(42);
    expect(result.totalPages).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// selectPendingReportsCount
// ---------------------------------------------------------------------------

describe("selectPendingReportsCount", () => {
  it("returns 0 by default", () => {
    expect(selectPendingReportsCount(makeState())).toBe(0);
  });

  it("returns the pending reports count from stats", () => {
    const stats = { ...defaultStats, pendingReports: 7 };
    expect(selectPendingReportsCount(makeState({ stats }))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// selectBanUserModal
// ---------------------------------------------------------------------------

describe("selectBanUserModal", () => {
  it("returns closed modal by default", () => {
    const result = selectBanUserModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with target", () => {
    const target = { id: "u1", username: "alice" } as never;
    const result = selectBanUserModal(
      makeState({ banUserModalOpen: true, banUserTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectRoleEditorModal
// ---------------------------------------------------------------------------

describe("selectRoleEditorModal", () => {
  it("returns closed modal by default", () => {
    const result = selectRoleEditorModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with target user", () => {
    const target = { id: "u2", username: "bob" } as never;
    const result = selectRoleEditorModal(
      makeState({ roleEditorOpen: true, roleEditorTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectDeleteChannelModal
// ---------------------------------------------------------------------------

describe("selectDeleteChannelModal", () => {
  it("returns closed modal by default", () => {
    const result = selectDeleteChannelModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with target channel", () => {
    const target = { id: "c1", name: "general" } as never;
    const result = selectDeleteChannelModal(
      makeState({ deleteChannelModalOpen: true, deleteChannelTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});
