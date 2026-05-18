/**
 * @fileoverview Tests for User Store
 */

import { act } from "@testing-library/react";
import {
  useUserStore,
  getInitials,
  getRoleColor,
  getRoleLabel,
  getPresenceColor,
  getPresenceLabel,
  selectCurrentUser,
  selectFilteredUsers,
  selectOnlineUsers,
  selectUsersByRole,
  type UserProfile,
  type UserRole,
  type PresenceStatus,
} from "../user-store";

describe("useUserStore", () => {
  const mockUser: UserProfile = {
    id: "user-1",
    email: "test@example.com",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    role: "member",
    presence: "online",
    createdAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    act(() => {
      useUserStore.getState().reset();
    });
  });

  describe("Initial State", () => {
    it("should have null current user", () => {
      expect(useUserStore.getState().currentUser).toBeNull();
    });

    it("should have empty users map", () => {
      expect(Object.keys(useUserStore.getState().users)).toHaveLength(0);
    });

    it("should have empty presence map", () => {
      expect(Object.keys(useUserStore.getState().presenceMap)).toHaveLength(0);
    });

    it("should have default filters", () => {
      const state = useUserStore.getState();
      expect(state.searchQuery).toBe("");
      expect(state.roleFilter).toBe("all");
      expect(state.presenceFilter).toBe("all");
    });

    it("should have false loading states", () => {
      const state = useUserStore.getState();
      expect(state.isLoadingProfile).toBe(false);
      expect(state.isUpdatingProfile).toBe(false);
      expect(state.isUpdatingStatus).toBe(false);
      expect(state.isUpdatingPresence).toBe(false);
    });
  });

  describe("Profile Actions", () => {
    it("should set current user", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      expect(useUserStore.getState().currentUser).toEqual(mockUser);
    });

    it("should add user to cache when setting current user", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      expect(useUserStore.getState().users[mockUser.id]).toEqual(mockUser);
    });

    it("should update presence map when setting current user", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      expect(useUserStore.getState().presenceMap[mockUser.id]).toBe("online");
    });

    it("should update current user", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      act(() =>
        useUserStore
          .getState()
          .updateCurrentUser({ displayName: "Updated Name" }),
      );
      expect(useUserStore.getState().currentUser?.displayName).toBe(
        "Updated Name",
      );
    });

    it("should set current user to null", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      act(() => useUserStore.getState().setCurrentUser(null));
      expect(useUserStore.getState().currentUser).toBeNull();
    });
  });

  describe("User Cache Actions", () => {
    it("should set single user", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      expect(useUserStore.getState().users[mockUser.id]).toEqual(mockUser);
    });

    it("should set multiple users", () => {
      const users: UserProfile[] = [
        mockUser,
        { ...mockUser, id: "user-2", email: "user2@example.com" },
      ];
      act(() => useUserStore.getState().setUsers(users));
      expect(Object.keys(useUserStore.getState().users)).toHaveLength(2);
    });

    it("should remove user", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      act(() => useUserStore.getState().removeUser(mockUser.id));
      expect(useUserStore.getState().users[mockUser.id]).toBeUndefined();
    });

    it("should get user by id", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      expect(useUserStore.getState().getUser(mockUser.id)).toEqual(mockUser);
    });

    it("should return undefined for non-existent user", () => {
      expect(useUserStore.getState().getUser("non-existent")).toBeUndefined();
    });
  });

  describe("Presence Actions", () => {
    it("should set user presence", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      act(() => useUserStore.getState().setPresence(mockUser.id, "away"));
      expect(useUserStore.getState().presenceMap[mockUser.id]).toBe("away");
    });

    it("should update user object when setting presence", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      act(() => useUserStore.getState().setPresence(mockUser.id, "dnd"));
      expect(useUserStore.getState().users[mockUser.id].presence).toBe("dnd");
    });

    it("should set my presence", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      act(() => useUserStore.getState().setMyPresence("away"));
      expect(useUserStore.getState().currentUser?.presence).toBe("away");
    });
  });

  describe("Custom Status Actions", () => {
    const customStatus = { emoji: "🎉", text: "Celebrating!" };

    it("should set custom status for user", () => {
      act(() => useUserStore.getState().setUser(mockUser));
      act(() =>
        useUserStore.getState().setCustomStatus(mockUser.id, customStatus),
      );
      expect(useUserStore.getState().statusMap[mockUser.id]).toEqual(
        customStatus,
      );
    });

    it("should set my custom status", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      act(() => useUserStore.getState().setMyCustomStatus(customStatus));
      expect(useUserStore.getState().currentUser?.customStatus).toEqual(
        customStatus,
      );
    });

    it("should clear my custom status", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      act(() => useUserStore.getState().setMyCustomStatus(customStatus));
      act(() => useUserStore.getState().clearMyCustomStatus());
      expect(useUserStore.getState().currentUser?.customStatus).toBeUndefined();
    });
  });

  describe("View Actions", () => {
    it("should set viewing user", () => {
      act(() => useUserStore.getState().setViewingUser("user-1"));
      expect(useUserStore.getState().viewingUserId).toBe("user-1");
    });

    it("should clear viewing user", () => {
      act(() => useUserStore.getState().setViewingUser("user-1"));
      act(() => useUserStore.getState().setViewingUser(null));
      expect(useUserStore.getState().viewingUserId).toBeNull();
    });
  });

  describe("Filter Actions", () => {
    it("should set search query", () => {
      act(() => useUserStore.getState().setSearchQuery("test"));
      expect(useUserStore.getState().searchQuery).toBe("test");
    });

    it("should set role filter", () => {
      act(() => useUserStore.getState().setRoleFilter("admin"));
      expect(useUserStore.getState().roleFilter).toBe("admin");
    });

    it("should set presence filter", () => {
      act(() => useUserStore.getState().setPresenceFilter("online"));
      expect(useUserStore.getState().presenceFilter).toBe("online");
    });

    it("should clear all filters", () => {
      act(() => {
        useUserStore.getState().setSearchQuery("test");
        useUserStore.getState().setRoleFilter("admin");
        useUserStore.getState().setPresenceFilter("online");
      });
      act(() => useUserStore.getState().clearFilters());

      const state = useUserStore.getState();
      expect(state.searchQuery).toBe("");
      expect(state.roleFilter).toBe("all");
      expect(state.presenceFilter).toBe("all");
    });
  });

  describe("Loading Actions", () => {
    it("should set loading profile", () => {
      act(() => useUserStore.getState().setLoadingProfile(true));
      expect(useUserStore.getState().isLoadingProfile).toBe(true);
    });

    it("should set updating profile", () => {
      act(() => useUserStore.getState().setUpdatingProfile(true));
      expect(useUserStore.getState().isUpdatingProfile).toBe(true);
    });

    it("should set updating status", () => {
      act(() => useUserStore.getState().setUpdatingStatus(true));
      expect(useUserStore.getState().isUpdatingStatus).toBe(true);
    });

    it("should set updating presence", () => {
      act(() => useUserStore.getState().setUpdatingPresence(true));
      expect(useUserStore.getState().isUpdatingPresence).toBe(true);
    });
  });

  describe("Selectors", () => {
    it("should select current user", () => {
      act(() => useUserStore.getState().setCurrentUser(mockUser));
      expect(selectCurrentUser(useUserStore.getState())).toEqual(mockUser);
    });

    it("should select filtered users by search", () => {
      const users: UserProfile[] = [
        { ...mockUser, id: "1", displayName: "Alice Smith" },
        { ...mockUser, id: "2", displayName: "Bob Jones" },
      ];
      act(() => useUserStore.getState().setUsers(users));
      act(() => useUserStore.getState().setSearchQuery("alice"));

      const filtered = selectFilteredUsers(useUserStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe("Alice Smith");
    });

    it("should select filtered users by role", () => {
      const users: UserProfile[] = [
        { ...mockUser, id: "1", role: "admin" },
        { ...mockUser, id: "2", role: "member" },
      ];
      act(() => useUserStore.getState().setUsers(users));
      act(() => useUserStore.getState().setRoleFilter("admin"));

      const filtered = selectFilteredUsers(useUserStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].role).toBe("admin");
    });

    it("should select filtered users by presence", () => {
      const users: UserProfile[] = [
        { ...mockUser, id: "1", presence: "online" },
        { ...mockUser, id: "2", presence: "offline" },
      ];
      act(() => useUserStore.getState().setUsers(users));
      act(() => useUserStore.getState().setPresenceFilter("online"));

      const filtered = selectFilteredUsers(useUserStore.getState());
      expect(filtered).toHaveLength(1);
      expect(filtered[0].presence).toBe("online");
    });

    it("should select online users", () => {
      const users: UserProfile[] = [
        { ...mockUser, id: "1", presence: "online" },
        { ...mockUser, id: "2", presence: "offline" },
      ];
      act(() => useUserStore.getState().setUsers(users));

      const online = selectOnlineUsers(useUserStore.getState());
      expect(online).toHaveLength(1);
    });

    it("should select users by role", () => {
      const users: UserProfile[] = [
        { ...mockUser, id: "1", role: "admin" },
        { ...mockUser, id: "2", role: "member" },
        { ...mockUser, id: "3", role: "admin" },
      ];
      act(() => useUserStore.getState().setUsers(users));

      const admins = selectUsersByRole("admin")(useUserStore.getState());
      expect(admins).toHaveLength(2);
    });
  });
});

describe("Helper Functions", () => {
  describe("getInitials", () => {
    it("should return first letter for single name", () => {
      expect(getInitials("Alice")).toBe("A");
    });

    it("should return first and last initials", () => {
      expect(getInitials("Alice Smith")).toBe("AS");
    });

    it("should handle middle names", () => {
      expect(getInitials("Alice Marie Smith")).toBe("AS");
    });

    it("should return ? for empty string", () => {
      expect(getInitials("")).toBe("?");
    });

    it("should handle extra whitespace", () => {
      expect(getInitials("  Alice   Smith  ")).toBe("AS");
    });
  });

  describe("getRoleColor", () => {
    it("should return amber for owner", () => {
      expect(getRoleColor("owner")).toBe("#F59E0B");
    });

    it("should return red for admin", () => {
      expect(getRoleColor("admin")).toBe("#EF4444");
    });

    it("should return purple for moderator", () => {
      expect(getRoleColor("moderator")).toBe("#8B5CF6");
    });

    it("should return blue for member", () => {
      expect(getRoleColor("member")).toBe("#3B82F6");
    });

    it("should return gray for guest", () => {
      expect(getRoleColor("guest")).toBe("#6B7280");
    });
  });

  describe("getRoleLabel", () => {
    it("should return correct labels for all roles", () => {
      const roles: UserRole[] = [
        "owner",
        "admin",
        "moderator",
        "member",
        "guest",
      ];
      const labels = ["Owner", "Admin", "Moderator", "Member", "Guest"];

      roles.forEach((role, i) => {
        expect(getRoleLabel(role)).toBe(labels[i]);
      });
    });
  });

  describe("getPresenceColor", () => {
    it("should return green for online", () => {
      expect(getPresenceColor("online")).toBe("#22C55E");
    });

    it("should return amber for away", () => {
      expect(getPresenceColor("away")).toBe("#F59E0B");
    });

    it("should return red for dnd", () => {
      expect(getPresenceColor("dnd")).toBe("#EF4444");
    });

    it("should return gray for offline", () => {
      expect(getPresenceColor("offline")).toBe("#6B7280");
    });
  });

  describe("getPresenceLabel", () => {
    it("should return correct labels for all statuses", () => {
      const statuses: PresenceStatus[] = ["online", "away", "dnd", "offline"];
      const labels = ["Online", "Away", "Do Not Disturb", "Offline"];

      statuses.forEach((status, i) => {
        expect(getPresenceLabel(status)).toBe(labels[i]);
      });
    });
  });
});
