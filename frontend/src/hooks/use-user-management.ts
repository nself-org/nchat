/**
 * useUserManagement Hook - User management functionality
 *
 * Provides functionality to list, search, filter users and perform
 * user actions like suspend, delete, and bulk operations.
 */

import { useCallback, useMemo, useState } from "react";
import {
  listUsers,
  filterBySearch,
  filterByRole,
  filterByStatus,
  suspendUser,
  unsuspendUser,
  deleteUser,
  resetPassword,
  bulkSuspend,
  bulkUnsuspend,
  bulkDelete,
  canManageUser,
  type ManagedUser,
  type UserFilters,
  type UserSortOptions,
  type PaginationOptions,
  type PaginatedResult,
  type SuspendUserInput,
  type DeleteUserInput,
  type SuspendResult,
  type DeleteResult,
  type ResetPasswordResult,
  type BulkActionResult,
  type UserRole,
  type UserStatus,
} from "@/lib/admin/user-manager";

// ============================================================================
// Types
// ============================================================================

export interface UseUserManagementOptions {
  initialUsers?: ManagedUser[];
  initialFilters?: UserFilters;
  initialSort?: UserSortOptions;
  initialPageSize?: number;
}

export interface UseUserManagementReturn {
  // Data
  users: PaginatedResult<ManagedUser>;
  selectedUsers: Set<string>;
  currentUser: ManagedUser | null;

  // Filters
  filters: UserFilters;
  sort: UserSortOptions;
  pagination: PaginationOptions;

  // Loading states
  isLoading: boolean;
  isActionLoading: boolean;

  // Actions
  setFilters: (filters: UserFilters) => void;
  setSearch: (search: string) => void;
  setRoleFilter: (role: UserRole | UserRole[] | undefined) => void;
  setStatusFilter: (status: UserStatus | UserStatus[] | undefined) => void;
  clearFilters: () => void;
  setSort: (sort: UserSortOptions) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // User actions
  suspend: (input: SuspendUserInput) => SuspendResult;
  unsuspend: (userId: string) => SuspendResult;
  remove: (input: DeleteUserInput) => DeleteResult;
  resetUserPassword: (userId: string) => ResetPasswordResult;

  // Bulk actions
  bulkSuspendUsers: (
    userIds: string[],
    reason: string,
    duration?: number,
  ) => BulkActionResult;
  bulkUnsuspendUsers: (userIds: string[]) => BulkActionResult;
  bulkDeleteUsers: (
    userIds: string[],
    options?: { deleteContent?: boolean },
  ) => BulkActionResult;

  // Selection
  selectUser: (userId: string) => void;
  deselectUser: (userId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (userId: string) => void;
  isSelected: (userId: string) => boolean;

  // Permissions
  canManage: (targetUser: ManagedUser) => boolean;

  // User data management
  setUsers: (users: ManagedUser[]) => void;
  addUser: (user: ManagedUser) => void;
  updateUser: (userId: string, updates: Partial<ManagedUser>) => void;
  removeUserFromList: (userId: string) => void;
  setCurrentUser: (user: ManagedUser | null) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useUserManagement(
  options: UseUserManagementOptions = {},
): UseUserManagementReturn {
  const {
    initialUsers = [],
    initialFilters = {},
    initialSort = { field: "createdAt", direction: "desc" },
    initialPageSize = 20,
  } = options;

  // State
  const [allUsers, setAllUsers] = useState<ManagedUser[]>(initialUsers);
  const [filters, setFiltersState] = useState<UserFilters>(initialFilters);
  const [sort, setSort] = useState<UserSortOptions>(initialSort);
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: initialPageSize,
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<ManagedUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Computed: Filtered and paginated users
  const users = useMemo(() => {
    return listUsers(allUsers, filters, sort, pagination);
  }, [allUsers, filters, sort, pagination]);

  // Filter actions
  const setFilters = useCallback((newFilters: UserFilters) => {
    setFiltersState(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFiltersState((prev) => ({ ...prev, search: search || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setRoleFilter = useCallback(
    (role: UserRole | UserRole[] | undefined) => {
      setFiltersState((prev) => ({ ...prev, role }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const setStatusFilter = useCallback(
    (status: UserStatus | UserStatus[] | undefined) => {
      setFiltersState((prev) => ({ ...prev, status }));
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Pagination actions
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination({ page: 1, pageSize });
  }, []);

  // User actions
  const suspend = useCallback(
    (input: SuspendUserInput): SuspendResult => {
      const user = allUsers.find((u) => u.id === input.userId);
      if (!user) {
        return {
          success: false,
          userId: input.userId,
          suspendedAt: new Date().toISOString(),
          error: "User not found",
        };
      }

      const result = suspendUser(user, input);
      if (result.success) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === input.userId
              ? {
                  ...u,
                  status: "suspended" as UserStatus,
                  suspendedAt: result.suspendedAt,
                  suspendedUntil: result.suspendedUntil,
                  suspendReason: input.reason,
                }
              : u,
          ),
        );
      }
      return result;
    },
    [allUsers],
  );

  const unsuspend = useCallback(
    (userId: string): SuspendResult => {
      const user = allUsers.find((u) => u.id === userId);
      if (!user) {
        return {
          success: false,
          userId,
          suspendedAt: new Date().toISOString(),
          error: "User not found",
        };
      }

      const result = unsuspendUser(user);
      if (result.success) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  status: "active" as UserStatus,
                  suspendedAt: undefined,
                  suspendedUntil: undefined,
                  suspendReason: undefined,
                }
              : u,
          ),
        );
      }
      return result;
    },
    [allUsers],
  );

  const remove = useCallback(
    (input: DeleteUserInput): DeleteResult => {
      const user = allUsers.find((u) => u.id === input.userId);
      if (!user) {
        return {
          success: false,
          userId: input.userId,
          deletedAt: new Date().toISOString(),
          contentDeleted: false,
          dataAnonymized: false,
          error: "User not found",
        };
      }

      const result = deleteUser(user, input);
      if (result.success) {
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === input.userId
              ? { ...u, status: "deleted" as UserStatus }
              : u,
          ),
        );
        setSelectedUsers((prev) => {
          const next = new Set(prev);
          next.delete(input.userId);
          return next;
        });
      }
      return result;
    },
    [allUsers],
  );

  const resetUserPassword = useCallback(
    (userId: string): ResetPasswordResult => {
      const user = allUsers.find((u) => u.id === userId);
      if (!user) {
        return {
          success: false,
          userId,
          error: "User not found",
        };
      }
      return resetPassword(user);
    },
    [allUsers],
  );

  // Bulk actions
  const bulkSuspendUsers = useCallback(
    (
      userIds: string[],
      reason: string,
      duration?: number,
    ): BulkActionResult => {
      const result = bulkSuspend(allUsers, userIds, reason, duration);
      if (result.succeeded > 0) {
        const suspendedIds = new Set(
          userIds.filter((id) => !result.errors.some((e) => e.userId === id)),
        );
        setAllUsers((prev) =>
          prev.map((u) =>
            suspendedIds.has(u.id)
              ? {
                  ...u,
                  status: "suspended" as UserStatus,
                  suspendedAt: new Date().toISOString(),
                  suspendReason: reason,
                }
              : u,
          ),
        );
      }
      return result;
    },
    [allUsers],
  );

  const bulkUnsuspendUsers = useCallback(
    (userIds: string[]): BulkActionResult => {
      const result = bulkUnsuspend(allUsers, userIds);
      if (result.succeeded > 0) {
        const unsuspendedIds = new Set(
          userIds.filter((id) => !result.errors.some((e) => e.userId === id)),
        );
        setAllUsers((prev) =>
          prev.map((u) =>
            unsuspendedIds.has(u.id)
              ? {
                  ...u,
                  status: "active" as UserStatus,
                  suspendedAt: undefined,
                  suspendedUntil: undefined,
                  suspendReason: undefined,
                }
              : u,
          ),
        );
      }
      return result;
    },
    [allUsers],
  );

  const bulkDeleteUsers = useCallback(
    (
      userIds: string[],
      options?: { deleteContent?: boolean },
    ): BulkActionResult => {
      const result = bulkDelete(allUsers, userIds, options);
      if (result.succeeded > 0) {
        const deletedIds = new Set(
          userIds.filter((id) => !result.errors.some((e) => e.userId === id)),
        );
        setAllUsers((prev) =>
          prev.map((u) =>
            deletedIds.has(u.id)
              ? { ...u, status: "deleted" as UserStatus }
              : u,
          ),
        );
        setSelectedUsers((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      return result;
    },
    [allUsers],
  );

  // Selection actions
  const selectUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => new Set(prev).add(userId));
  }, []);

  const deselectUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedUsers(new Set(users.items.map((u) => u.id)));
  }, [users.items]);

  const deselectAll = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  const toggleSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (userId: string) => selectedUsers.has(userId),
    [selectedUsers],
  );

  // Permission check
  const canManage = useCallback(
    (targetUser: ManagedUser): boolean => {
      if (!currentUser) return false;
      return canManageUser(currentUser, targetUser);
    },
    [currentUser],
  );

  // User data management
  const setUsers = useCallback((newUsers: ManagedUser[]) => {
    setAllUsers(newUsers);
  }, []);

  const addUser = useCallback((user: ManagedUser) => {
    setAllUsers((prev) => [...prev, user]);
  }, []);

  const updateUser = useCallback(
    (userId: string, updates: Partial<ManagedUser>) => {
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
      );
    },
    [],
  );

  const removeUserFromList = useCallback((userId: string) => {
    setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  return {
    // Data
    users,
    selectedUsers,
    currentUser,

    // Filters
    filters,
    sort,
    pagination,

    // Loading states
    isLoading,
    isActionLoading,

    // Filter actions
    setFilters,
    setSearch,
    setRoleFilter,
    setStatusFilter,
    clearFilters,
    setSort,
    setPage,
    setPageSize,

    // User actions
    suspend,
    unsuspend,
    remove,
    resetUserPassword,

    // Bulk actions
    bulkSuspendUsers,
    bulkUnsuspendUsers,
    bulkDeleteUsers,

    // Selection
    selectUser,
    deselectUser,
    selectAll,
    deselectAll,
    toggleSelection,
    isSelected,

    // Permissions
    canManage,

    // User data management
    setUsers,
    addUser,
    updateUser,
    removeUserFromList,
    setCurrentUser,
  };
}

export default useUserManagement;
