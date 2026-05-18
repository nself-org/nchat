/**
 * User Manager Unit Tests
 *
 * Tests for user management utilities including filtering, sorting,
 * pagination, suspension, deletion, and password reset.
 */

import {
  filterBySearch,
  filterByRole,
  filterByStatus,
  filterByDateRange,
  filterByActivity,
  applyFilters,
  sortUsers,
  paginateUsers,
  listUsers,
  suspendUser,
  unsuspendUser,
  isSuspensionExpired,
  deleteUser,
  resetPassword,
  generateResetLink,
  bulkSuspend,
  bulkUnsuspend,
  bulkDelete,
  canChangeRole,
  canManageUser,
  generateTemporaryPassword,
  generateResetToken,
  formatUserStatus,
  getStatusColor,
  getUserInitials,
  type ManagedUser,
  type UserFilters,
  type UserSortOptions,
  type PaginationOptions,
  type UserRole,
} from "../user-manager";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestUser = (overrides?: Partial<ManagedUser>): ManagedUser => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  username: "testuser",
  email: "test@example.com",
  displayName: "Test User",
  role: "member",
  status: "active",
  createdAt: new Date().toISOString(),
  messageCount: 0,
  channelCount: 0,
  ...overrides,
});

// ============================================================================
// Filter Tests
// ============================================================================

describe("Filter Functions", () => {
  describe("filterBySearch", () => {
    const users = [
      createTestUser({
        username: "alice",
        displayName: "Alice Smith",
        email: "alice@example.com",
      }),
      createTestUser({
        username: "bob",
        displayName: "Bob Jones",
        email: "bob@test.com",
      }),
      createTestUser({
        username: "charlie",
        displayName: "Charlie Brown",
        email: "charlie@example.com",
      }),
    ];

    it("should return all users when search is empty", () => {
      expect(filterBySearch(users, "").length).toBe(3);
      expect(filterBySearch(users, "  ").length).toBe(3);
    });

    it("should filter by username", () => {
      const result = filterBySearch(users, "alice");
      expect(result.length).toBe(1);
      expect(result[0].username).toBe("alice");
    });

    it("should filter by display name", () => {
      const result = filterBySearch(users, "Jones");
      expect(result.length).toBe(1);
      expect(result[0].displayName).toBe("Bob Jones");
    });

    it("should filter by email", () => {
      const result = filterBySearch(users, "test.com");
      expect(result.length).toBe(1);
      expect(result[0].email).toBe("bob@test.com");
    });

    it("should be case insensitive", () => {
      expect(filterBySearch(users, "ALICE").length).toBe(1);
      expect(filterBySearch(users, "SMITH").length).toBe(1);
    });

    it("should return empty array for no matches", () => {
      const result = filterBySearch(users, "xyz");
      expect(result.length).toBe(0);
    });
  });

  describe("filterByRole", () => {
    const users = [
      createTestUser({ role: "admin" }),
      createTestUser({ role: "member" }),
      createTestUser({ role: "member" }),
      createTestUser({ role: "guest" }),
    ];

    it("should filter by single role", () => {
      const result = filterByRole(users, "member");
      expect(result.length).toBe(2);
      expect(result.every((u) => u.role === "member")).toBe(true);
    });

    it("should filter by multiple roles", () => {
      const result = filterByRole(users, ["admin", "guest"]);
      expect(result.length).toBe(2);
    });

    it("should return all users for empty roles array", () => {
      const result = filterByRole(users, []);
      expect(result.length).toBe(4);
    });
  });

  describe("filterByStatus", () => {
    const users = [
      createTestUser({ status: "active" }),
      createTestUser({ status: "suspended" }),
      createTestUser({ status: "deleted" }),
    ];

    it("should filter by single status", () => {
      const result = filterByStatus(users, "active");
      expect(result.length).toBe(1);
      expect(result[0].status).toBe("active");
    });

    it("should filter by multiple statuses", () => {
      const result = filterByStatus(users, ["active", "suspended"]);
      expect(result.length).toBe(2);
    });
  });

  describe("filterByDateRange", () => {
    const users = [
      createTestUser({ createdAt: "2025-01-01T00:00:00Z" }),
      createTestUser({ createdAt: "2025-01-15T00:00:00Z" }),
      createTestUser({ createdAt: "2025-02-01T00:00:00Z" }),
    ];

    it("should filter by after date", () => {
      const result = filterByDateRange(users, new Date("2025-01-10"));
      expect(result.length).toBe(2);
    });

    it("should filter by before date", () => {
      const result = filterByDateRange(
        users,
        undefined,
        new Date("2025-01-20"),
      );
      expect(result.length).toBe(2);
    });

    it("should filter by both dates", () => {
      const result = filterByDateRange(
        users,
        new Date("2025-01-10"),
        new Date("2025-01-20"),
      );
      expect(result.length).toBe(1);
    });

    it("should return all users when no dates provided", () => {
      const result = filterByDateRange(users);
      expect(result.length).toBe(3);
    });
  });

  describe("filterByActivity", () => {
    const users = [
      createTestUser({ messageCount: 10, channelCount: 2 }),
      createTestUser({ messageCount: 0, channelCount: 0 }),
      createTestUser({ messageCount: 0, channelCount: 1 }),
    ];

    it("should filter users with activity", () => {
      const result = filterByActivity(users, true);
      expect(result.length).toBe(2);
    });

    it("should filter users without activity", () => {
      const result = filterByActivity(users, false);
      expect(result.length).toBe(1);
    });
  });

  describe("applyFilters", () => {
    const users = [
      createTestUser({
        username: "alice",
        role: "admin",
        status: "active",
        messageCount: 10,
      }),
      createTestUser({
        username: "bob",
        role: "member",
        status: "active",
        messageCount: 0,
      }),
      createTestUser({
        username: "charlie",
        role: "member",
        status: "suspended",
      }),
    ];

    it("should apply multiple filters", () => {
      const filters: UserFilters = {
        role: "member",
        status: "active",
      };
      const result = applyFilters(users, filters);
      expect(result.length).toBe(1);
      expect(result[0].username).toBe("bob");
    });

    it("should apply all filters together", () => {
      const filters: UserFilters = {
        search: "alice",
        role: ["admin", "member"],
        status: "active",
      };
      const result = applyFilters(users, filters);
      expect(result.length).toBe(1);
      expect(result[0].username).toBe("alice");
    });
  });
});

// ============================================================================
// Sort Tests
// ============================================================================

describe("Sort Functions", () => {
  describe("sortUsers", () => {
    const users = [
      createTestUser({
        username: "charlie",
        createdAt: "2025-01-15T00:00:00Z",
        messageCount: 5,
      }),
      createTestUser({
        username: "alice",
        createdAt: "2025-01-01T00:00:00Z",
        messageCount: 10,
      }),
      createTestUser({
        username: "bob",
        createdAt: "2025-01-10T00:00:00Z",
        messageCount: 3,
      }),
    ];

    it("should sort by username ascending", () => {
      const result = sortUsers(users, { field: "username", direction: "asc" });
      expect(result[0].username).toBe("alice");
      expect(result[2].username).toBe("charlie");
    });

    it("should sort by username descending", () => {
      const result = sortUsers(users, { field: "username", direction: "desc" });
      expect(result[0].username).toBe("charlie");
      expect(result[2].username).toBe("alice");
    });

    it("should sort by createdAt", () => {
      const result = sortUsers(users, { field: "createdAt", direction: "asc" });
      expect(result[0].username).toBe("alice");
      expect(result[2].username).toBe("charlie");
    });

    it("should sort by messageCount", () => {
      const result = sortUsers(users, {
        field: "messageCount",
        direction: "desc",
      });
      expect(result[0].messageCount).toBe(10);
      expect(result[2].messageCount).toBe(3);
    });

    it("should handle lastSeenAt with undefined values", () => {
      const usersWithLastSeen = [
        createTestUser({ lastSeenAt: "2025-01-15T00:00:00Z" }),
        createTestUser({ lastSeenAt: undefined }),
        createTestUser({ lastSeenAt: "2025-01-10T00:00:00Z" }),
      ];
      const result = sortUsers(usersWithLastSeen, {
        field: "lastSeenAt",
        direction: "asc",
      });
      expect(result[0].lastSeenAt).toBeUndefined();
    });
  });
});

// ============================================================================
// Pagination Tests
// ============================================================================

describe("Pagination Functions", () => {
  describe("paginateUsers", () => {
    const users = Array.from({ length: 25 }, (_, i) =>
      createTestUser({ id: `user-${i}`, username: `user${i}` }),
    );

    it("should return correct page size", () => {
      const result = paginateUsers(users, { page: 1, pageSize: 10 });
      expect(result.items.length).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("should calculate total pages correctly", () => {
      const result = paginateUsers(users, { page: 1, pageSize: 10 });
      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
    });

    it("should return correct hasNext and hasPrev", () => {
      const page1 = paginateUsers(users, { page: 1, pageSize: 10 });
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrev).toBe(false);

      const page2 = paginateUsers(users, { page: 2, pageSize: 10 });
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrev).toBe(true);

      const page3 = paginateUsers(users, { page: 3, pageSize: 10 });
      expect(page3.hasNext).toBe(false);
      expect(page3.hasPrev).toBe(true);
    });

    it("should handle page out of range", () => {
      const result = paginateUsers(users, { page: 100, pageSize: 10 });
      expect(result.page).toBe(3); // Should clamp to max page
    });

    it("should handle page less than 1", () => {
      const result = paginateUsers(users, { page: 0, pageSize: 10 });
      expect(result.page).toBe(1);
    });

    it("should handle empty users array", () => {
      const result = paginateUsers([], { page: 1, pageSize: 10 });
      expect(result.items.length).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.page).toBe(1);
    });
  });

  describe("listUsers", () => {
    const users = [
      createTestUser({ username: "alice", role: "admin" }),
      createTestUser({ username: "bob", role: "member" }),
      createTestUser({ username: "charlie", role: "member" }),
    ];

    it("should combine filters, sort, and pagination", () => {
      const result = listUsers(
        users,
        { role: "member" },
        { field: "username", direction: "asc" },
        { page: 1, pageSize: 10 },
      );
      expect(result.items.length).toBe(2);
      expect(result.items[0].username).toBe("bob");
    });

    it("should use default pagination when not provided", () => {
      const result = listUsers(users);
      expect(result.pageSize).toBe(20);
    });

    it("should use default sort when not provided", () => {
      const result = listUsers(users);
      // Default sort is createdAt desc
      expect(result.items.length).toBe(3);
    });
  });
});

// ============================================================================
// User Management Tests
// ============================================================================

describe("User Management Functions", () => {
  describe("suspendUser", () => {
    it("should suspend an active user", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const result = suspendUser(user, {
        userId: "user-1",
        reason: "Test reason",
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(result.suspendedAt).toBeDefined();
    });

    it("should create timed suspension", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const duration = 7 * 24 * 60 * 60 * 1000; // 7 days
      const result = suspendUser(user, {
        userId: "user-1",
        reason: "Test",
        duration,
      });

      expect(result.success).toBe(true);
      expect(result.suspendedUntil).toBeDefined();
    });

    it("should not suspend deleted user", () => {
      const user = createTestUser({ id: "user-1", status: "deleted" });
      const result = suspendUser(user, { userId: "user-1", reason: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("deleted");
    });

    it("should not suspend owner", () => {
      const user = createTestUser({
        id: "user-1",
        role: "owner",
        status: "active",
      });
      const result = suspendUser(user, { userId: "user-1", reason: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("owner");
    });
  });

  describe("unsuspendUser", () => {
    it("should unsuspend a suspended user", () => {
      const user = createTestUser({ id: "user-1", status: "suspended" });
      const result = unsuspendUser(user);

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
    });

    it("should fail for non-suspended user", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const result = unsuspendUser(user);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not suspended");
    });
  });

  describe("isSuspensionExpired", () => {
    it("should return false for non-suspended user", () => {
      const user = createTestUser({ status: "active" });
      expect(isSuspensionExpired(user)).toBe(false);
    });

    it("should return false for permanent suspension", () => {
      const user = createTestUser({
        status: "suspended",
        suspendedUntil: undefined,
      });
      expect(isSuspensionExpired(user)).toBe(false);
    });

    it("should return true for expired suspension", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const user = createTestUser({
        status: "suspended",
        suspendedUntil: pastDate,
      });
      expect(isSuspensionExpired(user)).toBe(true);
    });

    it("should return false for active suspension", () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
      const user = createTestUser({
        status: "suspended",
        suspendedUntil: futureDate,
      });
      expect(isSuspensionExpired(user)).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("should delete an active user", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const result = deleteUser(user, { userId: "user-1" });

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(result.deletedAt).toBeDefined();
    });

    it("should not delete owner", () => {
      const user = createTestUser({ id: "user-1", role: "owner" });
      const result = deleteUser(user, { userId: "user-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("owner");
    });

    it("should not delete already deleted user", () => {
      const user = createTestUser({ id: "user-1", status: "deleted" });
      const result = deleteUser(user, { userId: "user-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already deleted");
    });

    it("should handle deleteContent option", () => {
      const user = createTestUser({ id: "user-1" });
      const result = deleteUser(user, {
        userId: "user-1",
        deleteContent: true,
      });

      expect(result.success).toBe(true);
      expect(result.contentDeleted).toBe(true);
    });

    it("should handle anonymizeData option", () => {
      const user = createTestUser({ id: "user-1" });
      const result = deleteUser(user, {
        userId: "user-1",
        anonymizeData: true,
      });

      expect(result.success).toBe(true);
      expect(result.dataAnonymized).toBe(true);
    });
  });

  describe("resetPassword", () => {
    it("should reset password for active user", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const result = resetPassword(user);

      expect(result.success).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword?.length).toBe(12);
      expect(result.expiresAt).toBeDefined();
    });

    it("should not reset password for deleted user", () => {
      const user = createTestUser({ id: "user-1", status: "deleted" });
      const result = resetPassword(user);

      expect(result.success).toBe(false);
      expect(result.error).toContain("deleted");
    });
  });

  describe("generateResetLink", () => {
    it("should generate reset link for active user", () => {
      const user = createTestUser({ id: "user-1", status: "active" });
      const result = generateResetLink(user, "https://example.com");

      expect(result.success).toBe(true);
      expect(result.resetLink).toContain("https://example.com/reset-password");
      expect(result.resetLink).toContain("token=");
      expect(result.resetLink).toContain("userId=user-1");
      expect(result.expiresAt).toBeDefined();
    });

    it("should not generate link for deleted user", () => {
      const user = createTestUser({ id: "user-1", status: "deleted" });
      const result = generateResetLink(user, "https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toContain("deleted");
    });
  });
});

// ============================================================================
// Bulk Operations Tests
// ============================================================================

describe("Bulk Operations", () => {
  describe("bulkSuspend", () => {
    const users = [
      createTestUser({ id: "user-1", status: "active", role: "member" }),
      createTestUser({ id: "user-2", status: "active", role: "member" }),
      createTestUser({ id: "user-3", status: "active", role: "owner" }),
    ];

    it("should suspend multiple users", () => {
      const result = bulkSuspend(users, ["user-1", "user-2"], "Test reason");

      expect(result.success).toBe(true);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should report failures", () => {
      const result = bulkSuspend(
        users,
        ["user-1", "user-3", "user-999"],
        "Test",
      );

      expect(result.success).toBe(false);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors.length).toBe(2);
    });
  });

  describe("bulkUnsuspend", () => {
    const users = [
      createTestUser({ id: "user-1", status: "suspended" }),
      createTestUser({ id: "user-2", status: "active" }),
    ];

    it("should unsuspend multiple users", () => {
      const result = bulkUnsuspend(users, ["user-1"]);

      expect(result.success).toBe(true);
      expect(result.succeeded).toBe(1);
    });

    it("should report failures for non-suspended users", () => {
      const result = bulkUnsuspend(users, ["user-1", "user-2"]);

      expect(result.success).toBe(false);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe("bulkDelete", () => {
    const users = [
      createTestUser({ id: "user-1", role: "member" }),
      createTestUser({ id: "user-2", role: "member" }),
      createTestUser({ id: "user-3", role: "owner" }),
    ];

    it("should delete multiple users", () => {
      const result = bulkDelete(users, ["user-1", "user-2"]);

      expect(result.success).toBe(true);
      expect(result.succeeded).toBe(2);
    });

    it("should not delete owner", () => {
      const result = bulkDelete(users, ["user-1", "user-3"]);

      expect(result.success).toBe(false);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("Validation Functions", () => {
  describe("canChangeRole", () => {
    const owner = createTestUser({ id: "owner", role: "owner" });
    const admin = createTestUser({ id: "admin", role: "admin" });
    const member = createTestUser({ id: "member", role: "member" });

    it("should not allow changing own role", () => {
      const result = canChangeRole(owner, owner, "admin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("own role");
    });

    it("should not allow changing owner role", () => {
      const anotherOwner = createTestUser({ id: "another", role: "owner" });
      const result = canChangeRole(anotherOwner, owner, "admin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("owner role");
    });

    it("should only allow owner to promote to admin", () => {
      const result = canChangeRole(admin, member, "admin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("owner can promote");
    });

    it("should allow owner to promote to admin", () => {
      const result = canChangeRole(owner, member, "admin");
      expect(result.valid).toBe(true);
    });

    it("should only allow owner to transfer ownership", () => {
      const result = canChangeRole(admin, member, "owner");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("transfer ownership");
    });

    it("should allow admin to assign moderator", () => {
      const result = canChangeRole(admin, member, "moderator");
      expect(result.valid).toBe(true);
    });
  });

  describe("canManageUser", () => {
    const owner = createTestUser({ id: "owner", role: "owner" });
    const admin = createTestUser({ id: "admin", role: "admin" });
    const moderator = createTestUser({ id: "mod", role: "moderator" });
    const member = createTestUser({ id: "member", role: "member" });
    const guest = createTestUser({ id: "guest", role: "guest" });

    it("owner can manage everyone except themselves", () => {
      expect(canManageUser(owner, admin)).toBe(true);
      expect(canManageUser(owner, member)).toBe(true);
      expect(canManageUser(owner, owner)).toBe(false);
    });

    it("admin can manage non-owners and non-admins", () => {
      expect(canManageUser(admin, moderator)).toBe(true);
      expect(canManageUser(admin, member)).toBe(true);
      expect(canManageUser(admin, owner)).toBe(false);
      const otherAdmin = createTestUser({ role: "admin" });
      expect(canManageUser(admin, otherAdmin)).toBe(false);
    });

    it("moderator can manage members and guests", () => {
      expect(canManageUser(moderator, member)).toBe(true);
      expect(canManageUser(moderator, guest)).toBe(true);
      expect(canManageUser(moderator, admin)).toBe(false);
    });

    it("member cannot manage anyone", () => {
      expect(canManageUser(member, guest)).toBe(false);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Helper Functions", () => {
  describe("generateTemporaryPassword", () => {
    it("should generate password of default length", () => {
      const password = generateTemporaryPassword();
      expect(password.length).toBe(12);
    });

    it("should generate password of custom length", () => {
      const password = generateTemporaryPassword(20);
      expect(password.length).toBe(20);
    });

    it("should generate different passwords", () => {
      const password1 = generateTemporaryPassword();
      const password2 = generateTemporaryPassword();
      expect(password1).not.toBe(password2);
    });
  });

  describe("generateResetToken", () => {
    it("should generate token of 64 characters", () => {
      const token = generateResetToken();
      expect(token.length).toBe(64);
    });

    it("should generate different tokens", () => {
      const token1 = generateResetToken();
      const token2 = generateResetToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("formatUserStatus", () => {
    it("should format active status", () => {
      expect(formatUserStatus("active")).toBe("Active");
    });

    it("should format suspended status", () => {
      expect(formatUserStatus("suspended")).toBe("Suspended");
    });

    it("should format deleted status", () => {
      expect(formatUserStatus("deleted")).toBe("Deleted");
    });

    it("should format pending status", () => {
      expect(formatUserStatus("pending")).toBe("Pending Verification");
    });

    it("should handle unknown status", () => {
      expect(formatUserStatus("unknown" as any)).toBe("Unknown");
    });
  });

  describe("getStatusColor", () => {
    it("should return green for active", () => {
      expect(getStatusColor("active")).toBe("#22C55E");
    });

    it("should return amber for suspended", () => {
      expect(getStatusColor("suspended")).toBe("#F59E0B");
    });

    it("should return red for deleted", () => {
      expect(getStatusColor("deleted")).toBe("#EF4444");
    });

    it("should return gray for pending", () => {
      expect(getStatusColor("pending")).toBe("#6B7280");
    });
  });

  describe("getUserInitials", () => {
    it("should return initials for two-word name", () => {
      expect(getUserInitials("John Doe")).toBe("JD");
    });

    it("should return single initial for one-word name", () => {
      expect(getUserInitials("John")).toBe("J");
    });

    it("should return initials for multi-word name", () => {
      expect(getUserInitials("John Michael Doe")).toBe("JD");
    });

    it("should handle empty string", () => {
      expect(getUserInitials("")).toBe("?");
    });

    it("should be uppercase", () => {
      expect(getUserInitials("john doe")).toBe("JD");
    });

    it("should handle extra whitespace", () => {
      expect(getUserInitials("  John   Doe  ")).toBe("JD");
    });
  });
});
