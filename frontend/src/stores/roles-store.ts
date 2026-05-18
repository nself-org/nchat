/**
 * Roles Store - Zustand store for role and permission management
 *
 * Manages role state, permission calculations, and role operations
 * for the admin interface.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  Role,
  Permission,
  CreateRoleInput,
  UpdateRoleInput,
  UserRole,
  RoleHistoryEntry,
  EffectivePermissions,
  BulkAssignmentState,
  PermissionCategory,
} from "@/lib/admin/roles/role-types";
import {
  DEFAULT_ROLES,
  ROLE_COLOR_PRESETS,
  ROLE_ICON_OPTIONS,
} from "@/lib/admin/roles/role-defaults";
import {
  sortRolesByPosition,
  getHighestRole,
  canManageRole,
  rebalancePositions,
} from "@/lib/admin/roles/role-hierarchy";
import {
  computeEffectivePermissions,
  hasPermission,
  detectPermissionConflicts,
  PermissionConflict,
} from "@/lib/admin/roles/role-inheritance";
import {
  createRole,
  updateRole,
  deleteRole,
  duplicateRole,
  assignRoleToUser,
  removeRoleFromUser,
  createHistoryEntry,
  validateRole,
} from "@/lib/admin/roles/role-manager";
import { PERMISSION_GROUPS } from "@/lib/admin/roles/permission-types";
import type { PermissionGroup } from "@/lib/admin/roles/role-types";

// ============================================================================
// Types
// ============================================================================

interface RolesState {
  // Role data
  roles: Role[];
  rolesById: Record<string, Role>;
  isLoading: boolean;
  error: string | null;

  // Selected/editing state
  selectedRoleId: string | null;
  editingRole: Partial<Role> | null;
  isDirty: boolean;
  validationErrors: string[];

  // User roles
  userRoles: Record<string, Role[]>; // userId -> roles
  roleMembers: Record<string, string[]>; // roleId -> userIds

  // Role history
  history: RoleHistoryEntry[];
  historyLoading: boolean;

  // Bulk operations
  bulkAssignment: BulkAssignmentState;

  // Permission matrix state
  matrixExpandedCategories: PermissionCategory[];

  // UI state
  searchQuery: string;
  filterBuiltIn: boolean | null; // null = all, true = built-in only, false = custom only
  sortBy: "position" | "name" | "memberCount";
  sortOrder: "asc" | "desc";
}

interface RolesActions {
  // Data loading
  setRoles: (roles: Role[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Role selection
  selectRole: (roleId: string | null) => void;
  startEditingRole: (role: Role) => void;
  cancelEditing: () => void;

  // Role CRUD
  createNewRole: (
    input: CreateRoleInput,
    creatorPermissions: EffectivePermissions,
  ) => { role: Role | null; errors: string[] };
  updateSelectedRole: (
    input: UpdateRoleInput,
    editorPermissions: EffectivePermissions,
  ) => { success: boolean; errors: string[] };
  deleteSelectedRole: (deleterPermissions: EffectivePermissions) => {
    success: boolean;
    errors: string[];
  };
  duplicateSelectedRole: (
    newName: string,
    creatorPermissions: EffectivePermissions,
  ) => { role: Role | null; errors: string[] };

  // Editing
  setEditingField: <K extends keyof Role>(field: K, value: Role[K]) => void;
  togglePermission: (permission: Permission) => void;
  setEditingPermissions: (permissions: Permission[]) => void;
  validateEditing: () => string[];

  // User role management
  setUserRoles: (userId: string, roles: Role[]) => void;
  assignRole: (
    userId: string,
    roleId: string,
    assignerPermissions: EffectivePermissions,
  ) => { success: boolean; errors: string[] };
  removeRole: (
    userId: string,
    roleId: string,
    removerPermissions: EffectivePermissions,
  ) => { success: boolean; errors: string[] };

  // Role members
  setRoleMembers: (roleId: string, userIds: string[]) => void;
  addRoleMember: (roleId: string, userId: string) => void;
  removeRoleMember: (roleId: string, userId: string) => void;

  // Bulk operations
  startBulkAssignment: (
    userIds: string[],
    roleIds: string[],
    action: "add" | "remove" | "set",
  ) => void;
  cancelBulkAssignment: () => void;
  setBulkProgress: (progress: number) => void;
  completeBulkAssignment: () => void;
  addBulkError: (userId: string, error: string) => void;

  // History
  setHistory: (history: RoleHistoryEntry[]) => void;
  addHistoryEntry: (entry: RoleHistoryEntry) => void;
  setHistoryLoading: (loading: boolean) => void;

  // UI state
  setSearchQuery: (query: string) => void;
  setFilterBuiltIn: (filter: boolean | null) => void;
  setSortBy: (sortBy: "position" | "name" | "memberCount") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  toggleMatrixCategory: (category: PermissionCategory) => void;

  // Utility
  getRole: (roleId: string) => Role | undefined;
  getRolesByUser: (userId: string) => Role[];
  getMembersByRole: (roleId: string) => string[];
  getFilteredRoles: () => Role[];
  getSortedRoles: () => Role[];
  reset: () => void;
}

export type RolesStore = RolesState & RolesActions;

// ============================================================================
// Initial State
// ============================================================================

const initialBulkAssignment: BulkAssignmentState = {
  userIds: [],
  roleIds: [],
  action: "add",
  isProcessing: false,
  progress: 0,
  errors: [],
};

const initialState: RolesState = {
  roles: [],
  rolesById: {},
  isLoading: false,
  error: null,
  selectedRoleId: null,
  editingRole: null,
  isDirty: false,
  validationErrors: [],
  userRoles: {},
  roleMembers: {},
  history: [],
  historyLoading: false,
  bulkAssignment: initialBulkAssignment,
  matrixExpandedCategories: ["general", "messages"],
  searchQuery: "",
  filterBuiltIn: null,
  sortBy: "position",
  sortOrder: "desc",
};

// ============================================================================
// Store
// ============================================================================

export const useRolesStore = create<RolesStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Data loading
      setRoles: (roles) =>
        set(
          (state) => {
            state.roles = sortRolesByPosition(roles);
            state.rolesById = roles.reduce(
              (acc, role) => {
                acc[role.id] = role;
                return acc;
              },
              {} as Record<string, Role>,
            );
          },
          false,
          "roles/setRoles",
        ),

      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          "roles/setLoading",
        ),

      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "roles/setError",
        ),

      // Role selection
      selectRole: (roleId) =>
        set(
          (state) => {
            state.selectedRoleId = roleId;
            state.editingRole = null;
            state.isDirty = false;
            state.validationErrors = [];
          },
          false,
          "roles/selectRole",
        ),

      startEditingRole: (role) =>
        set(
          (state) => {
            state.editingRole = { ...role };
            state.isDirty = false;
            state.validationErrors = [];
          },
          false,
          "roles/startEditingRole",
        ),

      cancelEditing: () =>
        set(
          (state) => {
            state.editingRole = null;
            state.isDirty = false;
            state.validationErrors = [];
          },
          false,
          "roles/cancelEditing",
        ),

      // Role CRUD
      createNewRole: (input, creatorPermissions) => {
        const result = createRole(input, get().roles, creatorPermissions);

        if (result.errors.length === 0 && result.role.id) {
          set(
            (state) => {
              state.roles = sortRolesByPosition([...state.roles, result.role]);
              state.rolesById[result.role.id] = result.role;
            },
            false,
            "roles/createNewRole",
          );
          return { role: result.role, errors: [] };
        }

        return { role: null, errors: result.errors };
      },

      updateSelectedRole: (input, editorPermissions) => {
        const { selectedRoleId, roles } = get();
        if (!selectedRoleId) {
          return { success: false, errors: ["No role selected"] };
        }

        const result = updateRole(
          selectedRoleId,
          input,
          roles,
          editorPermissions,
        );

        if (result.errors.length === 0) {
          set(
            (state) => {
              const index = state.roles.findIndex(
                (r) => r.id === selectedRoleId,
              );
              if (index !== -1) {
                state.roles[index] = result.role;
              }
              state.rolesById[selectedRoleId] = result.role;
              state.editingRole = null;
              state.isDirty = false;
            },
            false,
            "roles/updateSelectedRole",
          );
          return { success: true, errors: [] };
        }

        return { success: false, errors: result.errors };
      },

      deleteSelectedRole: (deleterPermissions) => {
        const { selectedRoleId, roles } = get();
        if (!selectedRoleId) {
          return { success: false, errors: ["No role selected"] };
        }

        const result = deleteRole(selectedRoleId, roles, deleterPermissions);

        if (result.success) {
          set(
            (state) => {
              state.roles = state.roles.filter((r) => r.id !== selectedRoleId);
              delete state.rolesById[selectedRoleId];
              state.selectedRoleId = null;
              state.editingRole = null;
            },
            false,
            "roles/deleteSelectedRole",
          );
        }

        return result;
      },

      duplicateSelectedRole: (newName, creatorPermissions) => {
        const { selectedRoleId, roles } = get();
        if (!selectedRoleId) {
          return { role: null, errors: ["No role selected"] };
        }

        const result = duplicateRole(
          selectedRoleId,
          newName,
          roles,
          creatorPermissions,
        );

        if (result.errors.length === 0 && result.role.id) {
          set(
            (state) => {
              state.roles = sortRolesByPosition([...state.roles, result.role]);
              state.rolesById[result.role.id] = result.role;
            },
            false,
            "roles/duplicateSelectedRole",
          );
          return { role: result.role, errors: [] };
        }

        return { role: null, errors: result.errors };
      },

      // Editing
      setEditingField: (field, value) =>
        set(
          (state) => {
            if (state.editingRole) {
              (state.editingRole as Record<string, unknown>)[field] = value;
              state.isDirty = true;
            }
          },
          false,
          `roles/setEditingField/${String(field)}`,
        ),

      togglePermission: (permission) =>
        set(
          (state) => {
            if (state.editingRole && state.editingRole.permissions) {
              const index = state.editingRole.permissions.indexOf(permission);
              if (index === -1) {
                state.editingRole.permissions.push(permission);
              } else {
                state.editingRole.permissions.splice(index, 1);
              }
              state.isDirty = true;
            }
          },
          false,
          "roles/togglePermission",
        ),

      setEditingPermissions: (permissions) =>
        set(
          (state) => {
            if (state.editingRole) {
              state.editingRole.permissions = permissions;
              state.isDirty = true;
            }
          },
          false,
          "roles/setEditingPermissions",
        ),

      validateEditing: () => {
        const { editingRole } = get();
        if (!editingRole) return [];

        const errors = validateRole(editingRole);
        set(
          (state) => {
            state.validationErrors = errors;
          },
          false,
          "roles/validateEditing",
        );
        return errors;
      },

      // User role management
      setUserRoles: (userId, roles) =>
        set(
          (state) => {
            state.userRoles[userId] = sortRolesByPosition(roles);
          },
          false,
          "roles/setUserRoles",
        ),

      assignRole: (userId, roleId, assignerPermissions) => {
        const { roles, userRoles } = get();
        const currentRoles = userRoles[userId] || [];
        const result = assignRoleToUser(
          userId,
          roleId,
          roles,
          currentRoles,
          assignerPermissions,
        );

        if (result.success) {
          const role = get().rolesById[roleId];
          if (role) {
            set(
              (state) => {
                state.userRoles[userId] = sortRolesByPosition([
                  ...(state.userRoles[userId] || []),
                  role,
                ]);
                if (!state.roleMembers[roleId]) {
                  state.roleMembers[roleId] = [];
                }
                if (!state.roleMembers[roleId].includes(userId)) {
                  state.roleMembers[roleId].push(userId);
                }
              },
              false,
              "roles/assignRole",
            );
          }
        }

        return result;
      },

      removeRole: (userId, roleId, removerPermissions) => {
        const { roles, userRoles } = get();
        const currentRoles = userRoles[userId] || [];
        const result = removeRoleFromUser(
          userId,
          roleId,
          roles,
          currentRoles,
          removerPermissions,
        );

        if (result.success) {
          set(
            (state) => {
              state.userRoles[userId] = (state.userRoles[userId] || []).filter(
                (r) => r.id !== roleId,
              );
              if (state.roleMembers[roleId]) {
                state.roleMembers[roleId] = state.roleMembers[roleId].filter(
                  (id) => id !== userId,
                );
              }
            },
            false,
            "roles/removeRole",
          );
        }

        return result;
      },

      // Role members
      setRoleMembers: (roleId, userIds) =>
        set(
          (state) => {
            state.roleMembers[roleId] = userIds;
          },
          false,
          "roles/setRoleMembers",
        ),

      addRoleMember: (roleId, userId) =>
        set(
          (state) => {
            if (!state.roleMembers[roleId]) {
              state.roleMembers[roleId] = [];
            }
            if (!state.roleMembers[roleId].includes(userId)) {
              state.roleMembers[roleId].push(userId);
            }
          },
          false,
          "roles/addRoleMember",
        ),

      removeRoleMember: (roleId, userId) =>
        set(
          (state) => {
            if (state.roleMembers[roleId]) {
              state.roleMembers[roleId] = state.roleMembers[roleId].filter(
                (id) => id !== userId,
              );
            }
          },
          false,
          "roles/removeRoleMember",
        ),

      // Bulk operations
      startBulkAssignment: (userIds, roleIds, action) =>
        set(
          (state) => {
            state.bulkAssignment = {
              userIds,
              roleIds,
              action,
              isProcessing: true,
              progress: 0,
              errors: [],
            };
          },
          false,
          "roles/startBulkAssignment",
        ),

      cancelBulkAssignment: () =>
        set(
          (state) => {
            state.bulkAssignment = initialBulkAssignment;
          },
          false,
          "roles/cancelBulkAssignment",
        ),

      setBulkProgress: (progress) =>
        set(
          (state) => {
            state.bulkAssignment.progress = progress;
          },
          false,
          "roles/setBulkProgress",
        ),

      completeBulkAssignment: () =>
        set(
          (state) => {
            state.bulkAssignment.isProcessing = false;
            state.bulkAssignment.progress = 100;
          },
          false,
          "roles/completeBulkAssignment",
        ),

      addBulkError: (userId, error) =>
        set(
          (state) => {
            state.bulkAssignment.errors.push({ userId, error });
          },
          false,
          "roles/addBulkError",
        ),

      // History
      setHistory: (history) =>
        set(
          (state) => {
            state.history = history;
          },
          false,
          "roles/setHistory",
        ),

      addHistoryEntry: (entry) =>
        set(
          (state) => {
            state.history.unshift(entry);
          },
          false,
          "roles/addHistoryEntry",
        ),

      setHistoryLoading: (loading) =>
        set(
          (state) => {
            state.historyLoading = loading;
          },
          false,
          "roles/setHistoryLoading",
        ),

      // UI state
      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
          },
          false,
          "roles/setSearchQuery",
        ),

      setFilterBuiltIn: (filter) =>
        set(
          (state) => {
            state.filterBuiltIn = filter;
          },
          false,
          "roles/setFilterBuiltIn",
        ),

      setSortBy: (sortBy) =>
        set(
          (state) => {
            state.sortBy = sortBy;
          },
          false,
          "roles/setSortBy",
        ),

      setSortOrder: (order) =>
        set(
          (state) => {
            state.sortOrder = order;
          },
          false,
          "roles/setSortOrder",
        ),

      toggleMatrixCategory: (category) =>
        set(
          (state) => {
            const index = state.matrixExpandedCategories.indexOf(category);
            if (index === -1) {
              state.matrixExpandedCategories.push(category);
            } else {
              state.matrixExpandedCategories.splice(index, 1);
            }
          },
          false,
          "roles/toggleMatrixCategory",
        ),

      // Utility
      getRole: (roleId) => get().rolesById[roleId],

      getRolesByUser: (userId) => get().userRoles[userId] || [],

      getMembersByRole: (roleId) => get().roleMembers[roleId] || [],

      getFilteredRoles: () => {
        const { roles, searchQuery, filterBuiltIn } = get();
        let filtered = roles;

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (role) =>
              role.name.toLowerCase().includes(query) ||
              role.description?.toLowerCase().includes(query),
          );
        }

        // Built-in filter
        if (filterBuiltIn !== null) {
          filtered = filtered.filter(
            (role) => role.isBuiltIn === filterBuiltIn,
          );
        }

        return filtered;
      },

      getSortedRoles: () => {
        const { sortBy, sortOrder } = get();
        const filtered = get().getFilteredRoles();

        return [...filtered].sort((a, b) => {
          let comparison = 0;

          switch (sortBy) {
            case "position":
              comparison = a.position - b.position;
              break;
            case "name":
              comparison = a.name.localeCompare(b.name);
              break;
            case "memberCount":
              comparison = (a.memberCount || 0) - (b.memberCount || 0);
              break;
          }

          return sortOrder === "desc" ? -comparison : comparison;
        });
      },

      reset: () => set(() => initialState, false, "roles/reset"),
    })),
    { name: "roles-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRoles = (state: RolesStore) => state.roles;
export const selectRolesById = (state: RolesStore) => state.rolesById;
export const selectSelectedRole = (state: RolesStore) =>
  state.selectedRoleId ? state.rolesById[state.selectedRoleId] : null;
export const selectEditingRole = (state: RolesStore) => state.editingRole;
export const selectIsLoading = (state: RolesStore) => state.isLoading;
export const selectError = (state: RolesStore) => state.error;
export const selectIsDirty = (state: RolesStore) => state.isDirty;
export const selectValidationErrors = (state: RolesStore) =>
  state.validationErrors;
export const selectBulkAssignment = (state: RolesStore) => state.bulkAssignment;
export const selectHistory = (state: RolesStore) => state.history;

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to get effective permissions for a user
 */
export function useEffectivePermissions(
  userId: string,
): EffectivePermissions | null {
  const userRoles = useRolesStore((state) => state.userRoles[userId]);

  if (!userRoles || userRoles.length === 0) {
    return null;
  }

  return computeEffectivePermissions(userId, userRoles);
}

/**
 * Hook to check if current user can manage a role
 */
export function useCanManageRole(
  roleId: string,
  currentUserPermissions: EffectivePermissions | null,
): boolean {
  const role = useRolesStore((state) => state.rolesById[roleId]);

  if (!role || !currentUserPermissions) {
    return false;
  }

  return canManageRole(currentUserPermissions.highestRole, role);
}

/**
 * Hook to get permission groups
 */
export function usePermissionGroups(): PermissionGroup[] {
  return PERMISSION_GROUPS;
}

/**
 * Hook to get color presets
 */
export function useColorPresets() {
  return ROLE_COLOR_PRESETS;
}

/**
 * Hook to get icon options
 */
export function useIconOptions() {
  return ROLE_ICON_OPTIONS;
}
