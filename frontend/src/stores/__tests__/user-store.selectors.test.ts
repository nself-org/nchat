/**
 * Tests for user-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  UserStore,
  UserState,
  UserProfile,
  UserRole,
} from "../user-store";
import {
  selectCurrentUser,
  selectUserById,
  selectPresence,
  selectCustomStatus,
  selectAllUsers,
  selectFilteredUsers,
  selectOnlineUsers,
  selectOfflineUsers,
  selectUsersByRole,
} from "../user-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: "u1",
    email: "user@example.com",
    username: "alice",
    displayName: "Alice",
    role: "member",
    presence: "online",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): UserStore {
  const defaultState: UserState = {
    currentUser: null,
    users: {},
    presenceMap: {},
    statusMap: {},
    viewingUserId: null,
    searchQuery: "",
    roleFilter: "all",
    presenceFilter: "all",
    isLoadingProfile: false,
    isUpdatingProfile: false,
    isUpdatingStatus: false,
    isUpdatingPresence: false,
  };
  const stubs = {
    setCurrentUser: () => undefined,
    updateCurrentUser: () => undefined,
    setUser: () => undefined,
    setUsers: () => undefined,
    removeUser: () => undefined,
    getUser: () => undefined,
    setPresence: () => undefined,
    setMyPresence: () => undefined,
    setCustomStatus: () => undefined,
    setMyCustomStatus: () => undefined,
    clearMyCustomStatus: () => undefined,
    setViewingUser: () => undefined,
    setSearchQuery: () => undefined,
    setRoleFilter: () => undefined,
    setPresenceFilter: () => undefined,
    clearFilters: () => undefined,
    setLoadingProfile: () => undefined,
    setUpdatingProfile: () => undefined,
    setUpdatingStatus: () => undefined,
    setUpdatingPresence: () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...stubs, ...overrides } as unknown as UserStore;
}

// ---------------------------------------------------------------------------
// selectCurrentUser
// ---------------------------------------------------------------------------

describe("selectCurrentUser", () => {
  it("returns null by default", () => {
    expect(selectCurrentUser(makeState())).toBeNull();
  });

  it("returns the current user when set", () => {
    const currentUser = makeUser();
    expect(selectCurrentUser(makeState({ currentUser }))).toBe(currentUser);
  });
});

// ---------------------------------------------------------------------------
// selectUserById (curried)
// ---------------------------------------------------------------------------

describe("selectUserById", () => {
  it("returns undefined when user not found", () => {
    expect(selectUserById("missing")(makeState())).toBeUndefined();
  });

  it("returns the user when found", () => {
    const user = makeUser({ id: "u1" });
    const users = { u1: user };
    expect(selectUserById("u1")(makeState({ users }))).toBe(user);
  });
});

// ---------------------------------------------------------------------------
// selectPresence (curried)
// ---------------------------------------------------------------------------

describe("selectPresence", () => {
  it("returns offline when user not in presence map", () => {
    expect(selectPresence("u1")(makeState())).toBe("offline");
  });

  it("returns the presence status from the map", () => {
    const presenceMap = { u1: "away" as const };
    expect(selectPresence("u1")(makeState({ presenceMap }))).toBe("away");
  });
});

// ---------------------------------------------------------------------------
// selectCustomStatus (curried)
// ---------------------------------------------------------------------------

describe("selectCustomStatus", () => {
  it("returns undefined when user has no custom status", () => {
    expect(selectCustomStatus("u1")(makeState())).toBeUndefined();
  });

  it("returns the custom status from the map", () => {
    const status = { emoji: "🚀", text: "Launching" };
    const statusMap = { u1: status };
    expect(selectCustomStatus("u1")(makeState({ statusMap }))).toBe(status);
  });
});

// ---------------------------------------------------------------------------
// selectAllUsers
// ---------------------------------------------------------------------------

describe("selectAllUsers", () => {
  it("returns empty array when no users", () => {
    expect(selectAllUsers(makeState())).toEqual([]);
  });

  it("returns all users as an array", () => {
    const u1 = makeUser({ id: "u1" });
    const u2 = makeUser({ id: "u2", username: "bob", displayName: "Bob" });
    const users = { u1, u2 };
    const result = selectAllUsers(makeState({ users }));
    expect(result).toHaveLength(2);
    expect(result).toContain(u1);
    expect(result).toContain(u2);
  });
});

// ---------------------------------------------------------------------------
// selectFilteredUsers
// ---------------------------------------------------------------------------

describe("selectFilteredUsers", () => {
  it("returns all users when no filters applied", () => {
    const u1 = makeUser({ id: "u1" });
    const u2 = makeUser({ id: "u2", username: "bob", displayName: "Bob" });
    const users = { u1, u2 };
    expect(selectFilteredUsers(makeState({ users }))).toHaveLength(2);
  });

  it("filters by searchQuery matching displayName", () => {
    const alice = makeUser({ id: "u1", displayName: "Alice", username: "alice", email: "alice@test.com" });
    const bob = makeUser({ id: "u2", displayName: "Bob", username: "bob", email: "bob@test.com" });
    const users = { u1: alice, u2: bob };
    const result = selectFilteredUsers(makeState({ users, searchQuery: "alice" }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(alice);
  });

  it("filters by roleFilter", () => {
    const admin = makeUser({ id: "u1", role: "admin" });
    const member = makeUser({ id: "u2", role: "member" });
    const users = { u1: admin, u2: member };
    const result = selectFilteredUsers(makeState({ users, roleFilter: "admin" }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(admin);
  });

  it("filters by presenceFilter", () => {
    const online = makeUser({ id: "u1", presence: "online" });
    const offline = makeUser({ id: "u2", presence: "offline" });
    const users = { u1: online, u2: offline };
    const result = selectFilteredUsers(makeState({ users, presenceFilter: "online" }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(online);
  });
});

// ---------------------------------------------------------------------------
// selectOnlineUsers
// ---------------------------------------------------------------------------

describe("selectOnlineUsers", () => {
  it("returns empty array when no users", () => {
    expect(selectOnlineUsers(makeState())).toEqual([]);
  });

  it("returns only online users", () => {
    const online = makeUser({ id: "u1", presence: "online" });
    const offline = makeUser({ id: "u2", presence: "offline" });
    const users = { u1: online, u2: offline };
    const result = selectOnlineUsers(makeState({ users }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(online);
  });
});

// ---------------------------------------------------------------------------
// selectOfflineUsers
// ---------------------------------------------------------------------------

describe("selectOfflineUsers", () => {
  it("returns empty array when no users", () => {
    expect(selectOfflineUsers(makeState())).toEqual([]);
  });

  it("returns only offline users", () => {
    const online = makeUser({ id: "u1", presence: "online" });
    const offline = makeUser({ id: "u2", presence: "offline" });
    const users = { u1: online, u2: offline };
    const result = selectOfflineUsers(makeState({ users }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(offline);
  });
});

// ---------------------------------------------------------------------------
// selectUsersByRole (curried)
// ---------------------------------------------------------------------------

describe("selectUsersByRole", () => {
  it("returns empty array when no users match", () => {
    const u = makeUser({ id: "u1", role: "member" });
    const users = { u1: u };
    const result = selectUsersByRole("admin" as UserRole)(makeState({ users }));
    expect(result).toHaveLength(0);
  });

  it("returns users with the given role", () => {
    const admin = makeUser({ id: "u1", role: "admin" });
    const member = makeUser({ id: "u2", role: "member" });
    const users = { u1: admin, u2: member };
    const result = selectUsersByRole("admin" as UserRole)(makeState({ users }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(admin);
  });
});
