/**
 * User Discovery Unit Tests
 *
 * Tests for user discovery functionality including search, online users,
 * recent contacts, and suggested connections.
 */

import {
  UserDiscoveryService,
  getUserDiscoveryService,
  createUserDiscoveryService,
  type UserInfo,
  type UserStatus,
  type UserConnectionContext,
} from "../user-discovery";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestUser = (overrides?: Partial<UserInfo>): UserInfo => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  avatar: null,
  role: "member",
  status: "online",
  statusMessage: null,
  bio: null,
  department: null,
  title: null,
  timezone: null,
  lastSeenAt: new Date(),
  createdAt: new Date(),
  isActive: true,
  ...overrides,
});

// ============================================================================
// UserDiscoveryService Tests
// ============================================================================

describe("UserDiscoveryService", () => {
  let service: UserDiscoveryService;

  beforeEach(() => {
    service = new UserDiscoveryService();
  });

  describe("constructor", () => {
    it("should create service instance", () => {
      expect(service).toBeDefined();
    });
  });

  describe("setUsers", () => {
    it("should set users", () => {
      const users = [
        createTestUser({ id: "user-1" }),
        createTestUser({ id: "user-2" }),
      ];
      service.setUsers(users);

      expect(service.getUserCount()).toBe(2);
    });

    it("should replace existing users", () => {
      service.setUsers([createTestUser({ id: "user-1" })]);
      service.setUsers([createTestUser({ id: "user-2" })]);

      expect(service.getUserCount()).toBe(1);
      expect(service.getUser("user-1")).toBeUndefined();
    });
  });

  describe("addUser", () => {
    it("should add a user", () => {
      const user = createTestUser({ id: "user-1" });
      service.addUser(user);

      expect(service.getUser("user-1")).toBeDefined();
    });

    it("should update existing user", () => {
      const user1 = createTestUser({ id: "user-1", displayName: "Original" });
      const user2 = createTestUser({ id: "user-1", displayName: "Updated" });

      service.addUser(user1);
      service.addUser(user2);

      expect(service.getUser("user-1")?.displayName).toBe("Updated");
    });
  });

  describe("removeUser", () => {
    it("should remove a user", () => {
      service.addUser(createTestUser({ id: "user-1" }));
      service.removeUser("user-1");

      expect(service.getUser("user-1")).toBeUndefined();
    });
  });

  describe("updateStatus", () => {
    it("should update user status", () => {
      service.addUser(createTestUser({ id: "user-1", status: "online" }));
      service.updateStatus("user-1", "away");

      expect(service.getStatus("user-1")).toBe("away");
    });

    it("should update lastSeenAt for non-offline status", () => {
      const user = createTestUser({
        id: "user-1",
        lastSeenAt: new Date("2020-01-01"),
      });
      service.addUser(user);

      const before = service.getUser("user-1")?.lastSeenAt;
      service.updateStatus("user-1", "online");
      const after = service.getUser("user-1")?.lastSeenAt;

      expect(after?.getTime()).toBeGreaterThan(before?.getTime() ?? 0);
    });
  });

  describe("searchUsers", () => {
    beforeEach(() => {
      service.setUsers([
        createTestUser({
          id: "user-1",
          username: "johndoe",
          displayName: "John Doe",
          email: "john@example.com",
        }),
        createTestUser({
          id: "user-2",
          username: "janedoe",
          displayName: "Jane Doe",
          email: "jane@example.com",
        }),
        createTestUser({
          id: "user-3",
          username: "bobsmith",
          displayName: "Bob Smith",
          email: "bob@example.com",
        }),
      ]);
    });

    it("should search by username", () => {
      const result = service.searchUsers("john");

      expect(result.users.some((u) => u.username === "johndoe")).toBe(true);
    });

    it("should search by display name", () => {
      const result = service.searchUsers("Doe");

      expect(result.users).toHaveLength(2);
    });

    it("should search by email", () => {
      const result = service.searchUsers("bob@example");

      expect(result.users.some((u) => u.username === "bobsmith")).toBe(true);
    });

    it("should be case insensitive", () => {
      const result = service.searchUsers("JOHN");

      expect(result.users.some((u) => u.username === "johndoe")).toBe(true);
    });

    it("should rank exact matches higher", () => {
      const result = service.searchUsers("johndoe");

      expect(result.users[0].username).toBe("johndoe");
    });

    it("should return empty for no matches", () => {
      const result = service.searchUsers("nonexistent");

      expect(result.users).toHaveLength(0);
    });

    it("should return all users for empty query", () => {
      const result = service.searchUsers("");

      expect(result.users.length).toBe(3);
    });

    it("should exclude inactive users", () => {
      service.addUser(
        createTestUser({
          id: "inactive",
          username: "inactive",
          isActive: false,
        }),
      );

      const result = service.searchUsers("inactive");

      expect(result.users).toHaveLength(0);
    });

    it("should filter by status", () => {
      service.updateStatus("user-1", "online");
      service.updateStatus("user-2", "offline");
      service.updateStatus("user-3", "online");

      const result = service.searchUsers("", { statuses: ["online"] });

      expect(result.users.every((u) => u.status === "online")).toBe(true);
    });

    it("should filter by role", () => {
      service.addUser(
        createTestUser({ id: "admin", username: "admin", role: "admin" }),
      );

      const result = service.searchUsers("", { roles: ["admin"] });

      expect(result.users.every((u) => u.role === "admin")).toBe(true);
    });
  });

  describe("discover", () => {
    beforeEach(() => {
      service.setUsers([
        createTestUser({
          id: "user-1",
          displayName: "Alice",
          department: "Engineering",
        }),
        createTestUser({
          id: "user-2",
          displayName: "Bob",
          department: "Design",
        }),
        createTestUser({
          id: "user-3",
          displayName: "Charlie",
          department: "Engineering",
        }),
      ]);
    });

    it("should discover all active users", () => {
      const result = service.discover();

      expect(result.users.length).toBe(3);
    });

    it("should filter by department", () => {
      const result = service.discover({ departments: ["Engineering"] });

      expect(result.users.every((u) => u.department === "Engineering")).toBe(
        true,
      );
    });

    it("should sort by name", () => {
      const result = service.discover({ sortBy: "name" });

      expect(result.users[0].displayName).toBe("Alice");
      expect(result.users[1].displayName).toBe("Bob");
      expect(result.users[2].displayName).toBe("Charlie");
    });

    it("should sort by status", () => {
      service.updateStatus("user-1", "offline");
      service.updateStatus("user-2", "online");
      service.updateStatus("user-3", "away");

      const result = service.discover({ sortBy: "status" });

      expect(result.users[0].id).toBe("user-2"); // online
    });

    it("should handle pagination", () => {
      const page1 = service.discover({ limit: 2, offset: 0 });
      const page2 = service.discover({ limit: 2, offset: 2 });

      expect(page1.users).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page2.users).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it("should mark contacts correctly", () => {
      service.setContacts("current-user", ["user-1"]);

      const result = service.discover({ currentUserId: "current-user" });

      const user1 = result.users.find((u) => u.id === "user-1");
      const user2 = result.users.find((u) => u.id === "user-2");

      expect(user1?.isContact).toBe(true);
      expect(user2?.isContact).toBe(false);
    });
  });

  describe("getOnlineUsers", () => {
    it("should return only online users", () => {
      service.setUsers([
        createTestUser({ id: "user-1", status: "online" }),
        createTestUser({ id: "user-2", status: "offline" }),
        createTestUser({ id: "user-3", status: "online" }),
      ]);

      const online = service.getOnlineUsers();

      expect(online.every((u) => u.status === "online")).toBe(true);
    });
  });

  describe("getAwayUsers", () => {
    it("should return away and busy users", () => {
      service.setUsers([
        createTestUser({ id: "user-1", status: "away" }),
        createTestUser({ id: "user-2", status: "busy" }),
        createTestUser({ id: "user-3", status: "online" }),
      ]);

      const away = service.getAwayUsers();

      expect(
        away.every((u) => u.status === "away" || u.status === "busy"),
      ).toBe(true);
    });
  });

  describe("getRecentContacts", () => {
    it("should return recent contacts in order", () => {
      service.setUsers([
        createTestUser({ id: "user-1", displayName: "User 1" }),
        createTestUser({ id: "user-2", displayName: "User 2" }),
        createTestUser({ id: "user-3", displayName: "User 3" }),
      ]);

      service.addRecentInteraction("current", "user-1");
      service.addRecentInteraction("current", "user-2");
      service.addRecentInteraction("current", "user-3");

      const contacts = service.getRecentContacts("current");

      expect(contacts[0].id).toBe("user-3"); // Most recent
    });

    it("should respect limit", () => {
      service.setUsers([
        createTestUser({ id: "user-1" }),
        createTestUser({ id: "user-2" }),
        createTestUser({ id: "user-3" }),
      ]);

      service.addRecentInteraction("current", "user-1");
      service.addRecentInteraction("current", "user-2");
      service.addRecentInteraction("current", "user-3");

      const contacts = service.getRecentContacts("current", 2);

      expect(contacts.length).toBeLessThanOrEqual(2);
    });

    it("should increment interaction count", () => {
      service.setUsers([createTestUser({ id: "user-1" })]);

      service.addRecentInteraction("current", "user-1");
      service.addRecentInteraction("current", "user-1");
      service.addRecentInteraction("current", "user-1");

      const contacts = service.getRecentContacts("current");

      expect(contacts[0].matchScore).toBe(3); // interaction count as score
    });
  });

  describe("getSuggestedConnections", () => {
    beforeEach(() => {
      service.setUsers([
        createTestUser({ id: "user-1", displayName: "User 1" }),
        createTestUser({ id: "user-2", displayName: "User 2" }),
        createTestUser({ id: "user-3", displayName: "User 3" }),
      ]);
    });

    it("should suggest users based on mutual channels", () => {
      service.setChannelMembers("channel-1", ["current", "user-1"]);
      service.setChannelMembers("channel-2", ["current", "user-1"]);

      const context: UserConnectionContext = {
        userId: "current",
        contacts: [],
        channelMemberships: ["channel-1", "channel-2"],
        recentInteractions: [],
      };

      const suggestions = service.getSuggestedConnections(context);

      expect(suggestions.some((u) => u.id === "user-1")).toBe(true);
    });

    it("should exclude existing contacts", () => {
      const context: UserConnectionContext = {
        userId: "current",
        contacts: ["user-1"],
        channelMemberships: [],
        recentInteractions: [],
      };

      const suggestions = service.getSuggestedConnections(context);

      expect(suggestions.every((u) => u.id !== "user-1")).toBe(true);
    });

    it("should exclude self", () => {
      service.addUser(createTestUser({ id: "current" }));

      const context: UserConnectionContext = {
        userId: "current",
        contacts: [],
        channelMemberships: [],
        recentInteractions: [],
      };

      const suggestions = service.getSuggestedConnections(context);

      expect(suggestions.every((u) => u.id !== "current")).toBe(true);
    });

    it("should mark as suggested", () => {
      service.setChannelMembers("channel-1", ["current", "user-1"]);

      const context: UserConnectionContext = {
        userId: "current",
        contacts: [],
        channelMemberships: ["channel-1"],
        recentInteractions: [],
      };

      const suggestions = service.getSuggestedConnections(context);

      expect(suggestions.every((u) => u.isSuggested)).toBe(true);
    });

    it("should respect limit", () => {
      const context: UserConnectionContext = {
        userId: "current",
        contacts: [],
        channelMemberships: [],
        recentInteractions: [],
      };

      const suggestions = service.getSuggestedConnections(context, 1);

      expect(suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getChannelMembers", () => {
    it("should return channel members", () => {
      service.setUsers([
        createTestUser({ id: "user-1" }),
        createTestUser({ id: "user-2" }),
        createTestUser({ id: "user-3" }),
      ]);
      service.setChannelMembers("channel-1", ["user-1", "user-2"]);

      const members = service.getChannelMembers("channel-1");

      expect(members).toHaveLength(2);
    });

    it("should sort by status", () => {
      service.setUsers([
        createTestUser({ id: "user-1", status: "offline" }),
        createTestUser({ id: "user-2", status: "online" }),
      ]);
      service.setChannelMembers("channel-1", ["user-1", "user-2"]);

      const members = service.getChannelMembers("channel-1");

      expect(members[0].id).toBe("user-2"); // online first
    });

    it("should filter by status", () => {
      service.setUsers([
        createTestUser({ id: "user-1", status: "offline" }),
        createTestUser({ id: "user-2", status: "online" }),
      ]);
      service.setChannelMembers("channel-1", ["user-1", "user-2"]);

      const members = service.getChannelMembers("channel-1", {
        statuses: ["online"],
      });

      expect(members.every((m) => m.status === "online")).toBe(true);
    });

    it("should return empty for unknown channel", () => {
      const members = service.getChannelMembers("unknown");

      expect(members).toHaveLength(0);
    });
  });

  describe("getUsersByDepartment", () => {
    it("should return users in department", () => {
      service.setUsers([
        createTestUser({ id: "user-1", department: "Engineering" }),
        createTestUser({ id: "user-2", department: "Design" }),
        createTestUser({ id: "user-3", department: "Engineering" }),
      ]);

      const result = service.getUsersByDepartment("Engineering");

      expect(result.users.every((u) => u.department === "Engineering")).toBe(
        true,
      );
    });
  });

  describe("getUsersByRole", () => {
    it("should return users with role", () => {
      service.setUsers([
        createTestUser({ id: "user-1", role: "admin" }),
        createTestUser({ id: "user-2", role: "member" }),
        createTestUser({ id: "user-3", role: "admin" }),
      ]);

      const result = service.getUsersByRole("admin");

      expect(result.users.every((u) => u.role === "admin")).toBe(true);
    });
  });

  describe("getDepartments", () => {
    it("should return unique departments", () => {
      service.setUsers([
        createTestUser({ id: "user-1", department: "Engineering" }),
        createTestUser({ id: "user-2", department: "Design" }),
        createTestUser({ id: "user-3", department: "Engineering" }),
      ]);

      const departments = service.getDepartments();

      expect(departments).toContain("Engineering");
      expect(departments).toContain("Design");
      expect(departments).toHaveLength(2);
    });

    it("should sort alphabetically", () => {
      service.setUsers([
        createTestUser({ id: "user-1", department: "Zebra" }),
        createTestUser({ id: "user-2", department: "Alpha" }),
      ]);

      const departments = service.getDepartments();

      expect(departments[0]).toBe("Alpha");
    });

    it("should exclude inactive users", () => {
      service.setUsers([
        createTestUser({ id: "user-1", department: "Active", isActive: true }),
        createTestUser({
          id: "user-2",
          department: "Inactive",
          isActive: false,
        }),
      ]);

      const departments = service.getDepartments();

      expect(departments).not.toContain("Inactive");
    });
  });

  describe("getUser", () => {
    it("should return user by ID", () => {
      service.addUser(createTestUser({ id: "user-1", displayName: "Test" }));

      const user = service.getUser("user-1");

      expect(user?.displayName).toBe("Test");
    });

    it("should return undefined for non-existing user", () => {
      const user = service.getUser("non-existent");

      expect(user).toBeUndefined();
    });
  });

  describe("getStatus", () => {
    it("should return cached status", () => {
      service.addUser(createTestUser({ id: "user-1", status: "online" }));
      service.updateStatus("user-1", "away");

      expect(service.getStatus("user-1")).toBe("away");
    });

    it("should return user status if not cached", () => {
      service.addUser(createTestUser({ id: "user-1", status: "busy" }));

      expect(service.getStatus("user-1")).toBe("busy");
    });

    it("should return offline for unknown user", () => {
      expect(service.getStatus("unknown")).toBe("offline");
    });
  });

  describe("isContact", () => {
    it("should return true for contact", () => {
      service.setContacts("user-1", ["user-2"]);

      expect(service.isContact("user-1", "user-2")).toBe(true);
    });

    it("should return false for non-contact", () => {
      service.setContacts("user-1", ["user-2"]);

      expect(service.isContact("user-1", "user-3")).toBe(false);
    });

    it("should return false for unknown user", () => {
      expect(service.isContact("unknown", "user-1")).toBe(false);
    });
  });

  describe("getUserCount", () => {
    it("should return total user count", () => {
      service.setUsers([
        createTestUser({ id: "user-1" }),
        createTestUser({ id: "user-2" }),
      ]);

      expect(service.getUserCount()).toBe(2);
    });

    it("should return count by status", () => {
      service.setUsers([
        createTestUser({ id: "user-1", status: "online" }),
        createTestUser({ id: "user-2", status: "online" }),
        createTestUser({ id: "user-3", status: "offline" }),
      ]);

      expect(service.getUserCount("online")).toBe(2);
      expect(service.getUserCount("offline")).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all data", () => {
      service.setUsers([createTestUser({ id: "user-1" })]);
      service.setContacts("user-1", ["user-2"]);
      service.updateStatus("user-1", "away");

      service.clear();

      expect(service.getUserCount()).toBe(0);
      expect(service.isContact("user-1", "user-2")).toBe(false);
    });
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("getUserDiscoveryService", () => {
    it("should return singleton instance", () => {
      const service1 = getUserDiscoveryService();
      const service2 = getUserDiscoveryService();
      expect(service1).toBe(service2);
    });
  });

  describe("createUserDiscoveryService", () => {
    it("should create new instance each time", () => {
      const service1 = createUserDiscoveryService();
      const service2 = createUserDiscoveryService();
      expect(service1).not.toBe(service2);
    });
  });
});
