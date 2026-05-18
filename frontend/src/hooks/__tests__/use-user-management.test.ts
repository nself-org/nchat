/**
 * useUserManagement Hook Unit Tests
 *
 * Tests for the user management hook including listing, filtering,
 * sorting, pagination, and user actions.
 */

import { renderHook, act } from "@testing-library/react";
import { useUserManagement } from "../use-user-management";
import type {
  ManagedUser,
  UserRole,
  UserStatus,
} from "@/lib/admin/user-manager";

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

const createTestUsers = (): ManagedUser[] => [
  createTestUser({
    id: "user-1",
    username: "alice",
    role: "admin",
    status: "active",
  }),
  createTestUser({
    id: "user-2",
    username: "bob",
    role: "member",
    status: "active",
  }),
  createTestUser({
    id: "user-3",
    username: "charlie",
    role: "member",
    status: "suspended",
  }),
  createTestUser({
    id: "user-4",
    username: "diana",
    role: "guest",
    status: "active",
  }),
  createTestUser({
    id: "user-5",
    username: "eve",
    role: "moderator",
    status: "active",
  }),
];

// ============================================================================
// Tests
// ============================================================================

describe("useUserManagement Hook", () => {
  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe("Initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useUserManagement());

      expect(result.current.users.items).toEqual([]);
      expect(result.current.users.total).toBe(0);
      expect(result.current.selectedUsers.size).toBe(0);
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("should initialize with provided users", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      expect(result.current.users.total).toBe(5);
    });

    it("should initialize with provided filters", () => {
      const { result } = renderHook(() =>
        useUserManagement({
          initialFilters: { role: "admin" },
          initialUsers: createTestUsers(),
        }),
      );

      expect(result.current.filters.role).toBe("admin");
      expect(result.current.users.total).toBe(1);
    });

    it("should initialize with provided sort", () => {
      const { result } = renderHook(() =>
        useUserManagement({
          initialSort: { field: "username", direction: "asc" },
        }),
      );

      expect(result.current.sort.field).toBe("username");
      expect(result.current.sort.direction).toBe("asc");
    });

    it("should initialize with provided page size", () => {
      const { result } = renderHook(() =>
        useUserManagement({ initialPageSize: 10 }),
      );

      expect(result.current.pagination.pageSize).toBe(10);
    });
  });

  // ==========================================================================
  // Filter Tests
  // ==========================================================================

  describe("Filtering", () => {
    it("should filter by search", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setSearch("alice");
      });

      expect(result.current.users.total).toBe(1);
      expect(result.current.users.items[0].username).toBe("alice");
    });

    it("should filter by role", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setRoleFilter("member");
      });

      expect(result.current.users.total).toBe(2);
    });

    it("should filter by multiple roles", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setRoleFilter(["admin", "moderator"]);
      });

      expect(result.current.users.total).toBe(2);
    });

    it("should filter by status", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setStatusFilter("suspended");
      });

      expect(result.current.users.total).toBe(1);
      expect(result.current.users.items[0].username).toBe("charlie");
    });

    it("should clear filters", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setSearch("alice");
        result.current.setRoleFilter("admin");
      });

      expect(result.current.users.total).toBe(1);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.users.total).toBe(5);
    });

    it("should reset page when filtering", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users, initialPageSize: 2 }),
      );

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);

      act(() => {
        result.current.setSearch("alice");
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  // ==========================================================================
  // Sort Tests
  // ==========================================================================

  describe("Sorting", () => {
    it("should sort by username ascending", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setSort({ field: "username", direction: "asc" });
      });

      expect(result.current.users.items[0].username).toBe("alice");
    });

    it("should sort by username descending", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setSort({ field: "username", direction: "desc" });
      });

      expect(result.current.users.items[0].username).toBe("eve");
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe("Pagination", () => {
    it("should paginate results", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users, initialPageSize: 2 }),
      );

      expect(result.current.users.items.length).toBe(2);
      expect(result.current.users.totalPages).toBe(3);
    });

    it("should change page", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users, initialPageSize: 2 }),
      );

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it("should change page size", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users, initialPageSize: 2 }),
      );

      act(() => {
        result.current.setPageSize(10);
      });

      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.page).toBe(1);
    });
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  describe("Selection", () => {
    it("should select a user", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.selectUser("user-1");
      });

      expect(result.current.selectedUsers.has("user-1")).toBe(true);
      expect(result.current.isSelected("user-1")).toBe(true);
    });

    it("should deselect a user", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.selectUser("user-1");
        result.current.deselectUser("user-1");
      });

      expect(result.current.selectedUsers.has("user-1")).toBe(false);
    });

    it("should toggle selection", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.toggleSelection("user-1");
      });

      expect(result.current.isSelected("user-1")).toBe(true);

      act(() => {
        result.current.toggleSelection("user-1");
      });

      expect(result.current.isSelected("user-1")).toBe(false);
    });

    it("should select all", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedUsers.size).toBe(5);
    });

    it("should deselect all", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.selectAll();
        result.current.deselectAll();
      });

      expect(result.current.selectedUsers.size).toBe(0);
    });
  });

  // ==========================================================================
  // User Actions Tests
  // ==========================================================================

  describe("User Actions", () => {
    describe("suspend", () => {
      it("should suspend a user", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const suspendResult = result.current.suspend({
            userId: "user-2",
            reason: "Test reason",
          });
          expect(suspendResult.success).toBe(true);
        });

        const user = result.current.users.items.find((u) => u.id === "user-2");
        expect(user?.status).toBe("suspended");
      });

      it("should fail to suspend non-existent user", () => {
        const { result } = renderHook(() => useUserManagement());

        act(() => {
          const suspendResult = result.current.suspend({
            userId: "non-existent",
            reason: "Test reason",
          });
          expect(suspendResult.success).toBe(false);
          expect(suspendResult.error).toContain("not found");
        });
      });
    });

    describe("unsuspend", () => {
      it("should unsuspend a user", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const unsuspendResult = result.current.unsuspend("user-3");
          expect(unsuspendResult.success).toBe(true);
        });

        const user = result.current.users.items.find((u) => u.id === "user-3");
        expect(user?.status).toBe("active");
      });
    });

    describe("remove", () => {
      it("should delete a user", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const deleteResult = result.current.remove({ userId: "user-2" });
          expect(deleteResult.success).toBe(true);
        });

        const user = result.current.users.items.find((u) => u.id === "user-2");
        expect(user?.status).toBe("deleted");
      });

      it("should remove deleted user from selection", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          result.current.selectUser("user-2");
        });

        expect(result.current.isSelected("user-2")).toBe(true);

        act(() => {
          result.current.remove({ userId: "user-2" });
        });

        expect(result.current.isSelected("user-2")).toBe(false);
      });
    });

    describe("resetUserPassword", () => {
      it("should reset user password", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const resetResult = result.current.resetUserPassword("user-2");
          expect(resetResult.success).toBe(true);
          expect(resetResult.temporaryPassword).toBeDefined();
        });
      });

      it("should fail for non-existent user", () => {
        const { result } = renderHook(() => useUserManagement());

        act(() => {
          const resetResult = result.current.resetUserPassword("non-existent");
          expect(resetResult.success).toBe(false);
        });
      });
    });
  });

  // ==========================================================================
  // Bulk Actions Tests
  // ==========================================================================

  describe("Bulk Actions", () => {
    describe("bulkSuspendUsers", () => {
      it("should suspend multiple users", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const bulkResult = result.current.bulkSuspendUsers(
            ["user-2", "user-4"],
            "Bulk suspend reason",
          );
          expect(bulkResult.succeeded).toBe(2);
        });
      });
    });

    describe("bulkUnsuspendUsers", () => {
      it("should unsuspend multiple users", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        // First suspend some users
        act(() => {
          result.current.bulkSuspendUsers(["user-2", "user-4"], "Reason");
        });

        act(() => {
          const bulkResult = result.current.bulkUnsuspendUsers([
            "user-2",
            "user-4",
          ]);
          expect(bulkResult.succeeded).toBe(2);
        });
      });
    });

    describe("bulkDeleteUsers", () => {
      it("should delete multiple users", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          const bulkResult = result.current.bulkDeleteUsers([
            "user-2",
            "user-4",
          ]);
          expect(bulkResult.succeeded).toBe(2);
        });
      });

      it("should remove deleted users from selection", () => {
        const users = createTestUsers();
        const { result } = renderHook(() =>
          useUserManagement({ initialUsers: users }),
        );

        act(() => {
          result.current.selectUser("user-2");
          result.current.selectUser("user-4");
        });

        act(() => {
          result.current.bulkDeleteUsers(["user-2", "user-4"]);
        });

        expect(result.current.isSelected("user-2")).toBe(false);
        expect(result.current.isSelected("user-4")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Permissions Tests
  // ==========================================================================

  describe("Permissions", () => {
    it("should check if current user can manage target user", () => {
      const users = createTestUsers();
      const admin = createTestUser({ id: "admin-1", role: "admin" });
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.setCurrentUser(admin);
      });

      const member = users.find((u) => u.role === "member")!;
      expect(result.current.canManage(member)).toBe(true);

      const owner = createTestUser({ role: "owner" });
      expect(result.current.canManage(owner)).toBe(false);
    });

    it("should return false when no current user", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      const member = users.find((u) => u.role === "member")!;
      expect(result.current.canManage(member)).toBe(false);
    });
  });

  // ==========================================================================
  // User Data Management Tests
  // ==========================================================================

  describe("User Data Management", () => {
    it("should set users", () => {
      const { result } = renderHook(() => useUserManagement());
      const users = createTestUsers();

      act(() => {
        result.current.setUsers(users);
      });

      expect(result.current.users.total).toBe(5);
    });

    it("should add a user", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.addUser(
          createTestUser({ id: "user-6", username: "frank" }),
        );
      });

      expect(result.current.users.total).toBe(6);
    });

    it("should update a user", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.updateUser("user-1", { displayName: "Alice Updated" });
      });

      const user = result.current.users.items.find((u) => u.id === "user-1");
      expect(user?.displayName).toBe("Alice Updated");
    });

    it("should remove a user from list", () => {
      const users = createTestUsers();
      const { result } = renderHook(() =>
        useUserManagement({ initialUsers: users }),
      );

      act(() => {
        result.current.selectUser("user-1");
        result.current.removeUserFromList("user-1");
      });

      expect(result.current.users.total).toBe(4);
      expect(result.current.isSelected("user-1")).toBe(false);
    });

    it("should set current user", () => {
      const { result } = renderHook(() => useUserManagement());
      const admin = createTestUser({ id: "admin-1", role: "admin" });

      act(() => {
        result.current.setCurrentUser(admin);
      });

      expect(result.current.currentUser).toEqual(admin);
    });
  });
});
