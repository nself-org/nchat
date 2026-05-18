/**
 * User Management Store
 * Zustand store for admin user management functionality
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  AdminUser,
  UserInvite,
  InviteLink,
  UserBan,
  UserSession,
  UserDevice,
  UserActivityEntry,
  ImpersonationSession,
  UserStats,
  UserGrowthData,
  UserFilterOptions,
  UserSortOptions,
  InviteStatus,
  UserRole,
} from "@/lib/admin/users/user-types";

// ============================================================================
// State Interface
// ============================================================================

export interface UserManagementState {
  // Users list
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;
  usersPerPage: number;
  usersFilters: UserFilterOptions;
  usersSort: UserSortOptions;
  isLoadingUsers: boolean;

  // Selected user
  selectedUser: AdminUser | null;
  selectedUserActivity: UserActivityEntry[];
  selectedUserSessions: UserSession[];
  selectedUserDevices: UserDevice[];
  selectedUserBanHistory: UserBan[];
  isLoadingUserDetails: boolean;

  // Invites
  invites: UserInvite[];
  invitesTotal: number;
  invitesPage: number;
  invitesPerPage: number;
  invitesStatusFilter: InviteStatus | "all";
  isLoadingInvites: boolean;

  // Invite links
  inviteLinks: InviteLink[];
  isLoadingInviteLinks: boolean;

  // Banned users
  bannedUsers: AdminUser[];
  bannedUsersTotal: number;
  bannedUsersPage: number;
  isLoadingBannedUsers: boolean;

  // Statistics
  stats: UserStats | null;
  growthData: UserGrowthData[];
  isLoadingStats: boolean;

  // Impersonation
  activeImpersonation: ImpersonationSession | null;
  impersonationHistory: ImpersonationSession[];
  isLoadingImpersonation: boolean;

  // Roles
  roles: {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isDefault: boolean;
  }[];
  isLoadingRoles: boolean;

  // UI state
  selectedUserIds: string[];
  isSelectionMode: boolean;

  // Modals
  userModalOpen: boolean;
  userModalMode: "view" | "edit" | "create";
  banModalOpen: boolean;
  banModalUser: AdminUser | null;
  inviteModalOpen: boolean;
  inviteModalMode: "single" | "bulk" | "link";
  deleteConfirmOpen: boolean;
  deleteConfirmUser: AdminUser | null;
  roleChangeModalOpen: boolean;
  roleChangeUser: AdminUser | null;
  impersonateModalOpen: boolean;
  impersonateUser: AdminUser | null;
  resetPasswordModalOpen: boolean;
  resetPasswordUser: AdminUser | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface UserManagementActions {
  // Users list actions
  setUsers: (users: AdminUser[], total: number) => void;
  setUsersPage: (page: number) => void;
  setUsersPerPage: (perPage: number) => void;
  setUsersFilters: (filters: UserFilterOptions) => void;
  setUsersSort: (sort: UserSortOptions) => void;
  clearUsersFilters: () => void;
  setLoadingUsers: (loading: boolean) => void;
  updateUserInList: (userId: string, updates: Partial<AdminUser>) => void;
  removeUserFromList: (userId: string) => void;

  // Selected user actions
  setSelectedUser: (user: AdminUser | null) => void;
  setSelectedUserActivity: (activity: UserActivityEntry[]) => void;
  setSelectedUserSessions: (sessions: UserSession[]) => void;
  setSelectedUserDevices: (devices: UserDevice[]) => void;
  setSelectedUserBanHistory: (bans: UserBan[]) => void;
  setLoadingUserDetails: (loading: boolean) => void;
  clearSelectedUser: () => void;

  // Invite actions
  setInvites: (invites: UserInvite[], total: number) => void;
  setInvitesPage: (page: number) => void;
  setInvitesStatusFilter: (status: InviteStatus | "all") => void;
  setLoadingInvites: (loading: boolean) => void;
  addInvite: (invite: UserInvite) => void;
  updateInvite: (inviteId: string, updates: Partial<UserInvite>) => void;
  removeInvite: (inviteId: string) => void;

  // Invite link actions
  setInviteLinks: (links: InviteLink[]) => void;
  setLoadingInviteLinks: (loading: boolean) => void;
  addInviteLink: (link: InviteLink) => void;
  updateInviteLink: (linkId: string, updates: Partial<InviteLink>) => void;
  removeInviteLink: (linkId: string) => void;

  // Banned users actions
  setBannedUsers: (users: AdminUser[], total: number) => void;
  setBannedUsersPage: (page: number) => void;
  setLoadingBannedUsers: (loading: boolean) => void;

  // Statistics actions
  setStats: (stats: UserStats) => void;
  setGrowthData: (data: UserGrowthData[]) => void;
  setLoadingStats: (loading: boolean) => void;

  // Impersonation actions
  setActiveImpersonation: (session: ImpersonationSession | null) => void;
  setImpersonationHistory: (sessions: ImpersonationSession[]) => void;
  setLoadingImpersonation: (loading: boolean) => void;

  // Roles actions
  setRoles: (roles: UserManagementState["roles"]) => void;
  setLoadingRoles: (loading: boolean) => void;

  // Selection actions
  toggleUserSelection: (userId: string) => void;
  selectAllUsers: () => void;
  clearUserSelection: () => void;
  setSelectionMode: (enabled: boolean) => void;

  // Modal actions
  openUserModal: (mode: "view" | "edit" | "create", user?: AdminUser) => void;
  closeUserModal: () => void;
  openBanModal: (user: AdminUser) => void;
  closeBanModal: () => void;
  openInviteModal: (mode: "single" | "bulk" | "link") => void;
  closeInviteModal: () => void;
  openDeleteConfirm: (user: AdminUser) => void;
  closeDeleteConfirm: () => void;
  openRoleChangeModal: (user: AdminUser) => void;
  closeRoleChangeModal: () => void;
  openImpersonateModal: (user: AdminUser) => void;
  closeImpersonateModal: () => void;
  openResetPasswordModal: (user: AdminUser) => void;
  closeResetPasswordModal: () => void;

  // Utility
  reset: () => void;
}

export type UserManagementStore = UserManagementState & UserManagementActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: UserManagementState = {
  // Users list
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersPerPage: 20,
  usersFilters: {},
  usersSort: { field: "createdAt", direction: "desc" },
  isLoadingUsers: false,

  // Selected user
  selectedUser: null,
  selectedUserActivity: [],
  selectedUserSessions: [],
  selectedUserDevices: [],
  selectedUserBanHistory: [],
  isLoadingUserDetails: false,

  // Invites
  invites: [],
  invitesTotal: 0,
  invitesPage: 1,
  invitesPerPage: 20,
  invitesStatusFilter: "all",
  isLoadingInvites: false,

  // Invite links
  inviteLinks: [],
  isLoadingInviteLinks: false,

  // Banned users
  bannedUsers: [],
  bannedUsersTotal: 0,
  bannedUsersPage: 1,
  isLoadingBannedUsers: false,

  // Statistics
  stats: null,
  growthData: [],
  isLoadingStats: false,

  // Impersonation
  activeImpersonation: null,
  impersonationHistory: [],
  isLoadingImpersonation: false,

  // Roles
  roles: [],
  isLoadingRoles: false,

  // UI state
  selectedUserIds: [],
  isSelectionMode: false,

  // Modals
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

// ============================================================================
// Store
// ============================================================================

export const useUserManagementStore = create<UserManagementStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // ========================================
      // Users list actions
      // ========================================
      setUsers: (users, total) =>
        set(
          (state) => {
            state.users = users;
            state.usersTotal = total;
          },
          false,
          "userManagement/setUsers",
        ),

      setUsersPage: (page) =>
        set(
          (state) => {
            state.usersPage = page;
          },
          false,
          "userManagement/setUsersPage",
        ),

      setUsersPerPage: (perPage) =>
        set(
          (state) => {
            state.usersPerPage = perPage;
            state.usersPage = 1;
          },
          false,
          "userManagement/setUsersPerPage",
        ),

      setUsersFilters: (filters) =>
        set(
          (state) => {
            state.usersFilters = filters;
            state.usersPage = 1;
          },
          false,
          "userManagement/setUsersFilters",
        ),

      setUsersSort: (sort) =>
        set(
          (state) => {
            state.usersSort = sort;
          },
          false,
          "userManagement/setUsersSort",
        ),

      clearUsersFilters: () =>
        set(
          (state) => {
            state.usersFilters = {};
            state.usersPage = 1;
          },
          false,
          "userManagement/clearUsersFilters",
        ),

      setLoadingUsers: (loading) =>
        set(
          (state) => {
            state.isLoadingUsers = loading;
          },
          false,
          "userManagement/setLoadingUsers",
        ),

      updateUserInList: (userId, updates) =>
        set(
          (state) => {
            const index = state.users.findIndex((u) => u.id === userId);
            if (index !== -1) {
              state.users[index] = { ...state.users[index], ...updates };
            }
            if (state.selectedUser?.id === userId) {
              state.selectedUser = { ...state.selectedUser, ...updates };
            }
          },
          false,
          "userManagement/updateUserInList",
        ),

      removeUserFromList: (userId) =>
        set(
          (state) => {
            state.users = state.users.filter((u) => u.id !== userId);
            state.usersTotal -= 1;
            if (state.selectedUser?.id === userId) {
              state.selectedUser = null;
            }
            state.selectedUserIds = state.selectedUserIds.filter(
              (id) => id !== userId,
            );
          },
          false,
          "userManagement/removeUserFromList",
        ),

      // ========================================
      // Selected user actions
      // ========================================
      setSelectedUser: (user) =>
        set(
          (state) => {
            state.selectedUser = user;
          },
          false,
          "userManagement/setSelectedUser",
        ),

      setSelectedUserActivity: (activity) =>
        set(
          (state) => {
            state.selectedUserActivity = activity;
          },
          false,
          "userManagement/setSelectedUserActivity",
        ),

      setSelectedUserSessions: (sessions) =>
        set(
          (state) => {
            state.selectedUserSessions = sessions;
          },
          false,
          "userManagement/setSelectedUserSessions",
        ),

      setSelectedUserDevices: (devices) =>
        set(
          (state) => {
            state.selectedUserDevices = devices;
          },
          false,
          "userManagement/setSelectedUserDevices",
        ),

      setSelectedUserBanHistory: (bans) =>
        set(
          (state) => {
            state.selectedUserBanHistory = bans;
          },
          false,
          "userManagement/setSelectedUserBanHistory",
        ),

      setLoadingUserDetails: (loading) =>
        set(
          (state) => {
            state.isLoadingUserDetails = loading;
          },
          false,
          "userManagement/setLoadingUserDetails",
        ),

      clearSelectedUser: () =>
        set(
          (state) => {
            state.selectedUser = null;
            state.selectedUserActivity = [];
            state.selectedUserSessions = [];
            state.selectedUserDevices = [];
            state.selectedUserBanHistory = [];
          },
          false,
          "userManagement/clearSelectedUser",
        ),

      // ========================================
      // Invite actions
      // ========================================
      setInvites: (invites, total) =>
        set(
          (state) => {
            state.invites = invites;
            state.invitesTotal = total;
          },
          false,
          "userManagement/setInvites",
        ),

      setInvitesPage: (page) =>
        set(
          (state) => {
            state.invitesPage = page;
          },
          false,
          "userManagement/setInvitesPage",
        ),

      setInvitesStatusFilter: (status) =>
        set(
          (state) => {
            state.invitesStatusFilter = status;
            state.invitesPage = 1;
          },
          false,
          "userManagement/setInvitesStatusFilter",
        ),

      setLoadingInvites: (loading) =>
        set(
          (state) => {
            state.isLoadingInvites = loading;
          },
          false,
          "userManagement/setLoadingInvites",
        ),

      addInvite: (invite) =>
        set(
          (state) => {
            state.invites = [invite, ...state.invites];
            state.invitesTotal += 1;
          },
          false,
          "userManagement/addInvite",
        ),

      updateInvite: (inviteId, updates) =>
        set(
          (state) => {
            const index = state.invites.findIndex((i) => i.id === inviteId);
            if (index !== -1) {
              state.invites[index] = { ...state.invites[index], ...updates };
            }
          },
          false,
          "userManagement/updateInvite",
        ),

      removeInvite: (inviteId) =>
        set(
          (state) => {
            state.invites = state.invites.filter((i) => i.id !== inviteId);
            state.invitesTotal -= 1;
          },
          false,
          "userManagement/removeInvite",
        ),

      // ========================================
      // Invite link actions
      // ========================================
      setInviteLinks: (links) =>
        set(
          (state) => {
            state.inviteLinks = links;
          },
          false,
          "userManagement/setInviteLinks",
        ),

      setLoadingInviteLinks: (loading) =>
        set(
          (state) => {
            state.isLoadingInviteLinks = loading;
          },
          false,
          "userManagement/setLoadingInviteLinks",
        ),

      addInviteLink: (link) =>
        set(
          (state) => {
            state.inviteLinks = [link, ...state.inviteLinks];
          },
          false,
          "userManagement/addInviteLink",
        ),

      updateInviteLink: (linkId, updates) =>
        set(
          (state) => {
            const index = state.inviteLinks.findIndex((l) => l.id === linkId);
            if (index !== -1) {
              state.inviteLinks[index] = {
                ...state.inviteLinks[index],
                ...updates,
              };
            }
          },
          false,
          "userManagement/updateInviteLink",
        ),

      removeInviteLink: (linkId) =>
        set(
          (state) => {
            state.inviteLinks = state.inviteLinks.filter(
              (l) => l.id !== linkId,
            );
          },
          false,
          "userManagement/removeInviteLink",
        ),

      // ========================================
      // Banned users actions
      // ========================================
      setBannedUsers: (users, total) =>
        set(
          (state) => {
            state.bannedUsers = users;
            state.bannedUsersTotal = total;
          },
          false,
          "userManagement/setBannedUsers",
        ),

      setBannedUsersPage: (page) =>
        set(
          (state) => {
            state.bannedUsersPage = page;
          },
          false,
          "userManagement/setBannedUsersPage",
        ),

      setLoadingBannedUsers: (loading) =>
        set(
          (state) => {
            state.isLoadingBannedUsers = loading;
          },
          false,
          "userManagement/setLoadingBannedUsers",
        ),

      // ========================================
      // Statistics actions
      // ========================================
      setStats: (stats) =>
        set(
          (state) => {
            state.stats = stats;
          },
          false,
          "userManagement/setStats",
        ),

      setGrowthData: (data) =>
        set(
          (state) => {
            state.growthData = data;
          },
          false,
          "userManagement/setGrowthData",
        ),

      setLoadingStats: (loading) =>
        set(
          (state) => {
            state.isLoadingStats = loading;
          },
          false,
          "userManagement/setLoadingStats",
        ),

      // ========================================
      // Impersonation actions
      // ========================================
      setActiveImpersonation: (session) =>
        set(
          (state) => {
            state.activeImpersonation = session;
          },
          false,
          "userManagement/setActiveImpersonation",
        ),

      setImpersonationHistory: (sessions) =>
        set(
          (state) => {
            state.impersonationHistory = sessions;
          },
          false,
          "userManagement/setImpersonationHistory",
        ),

      setLoadingImpersonation: (loading) =>
        set(
          (state) => {
            state.isLoadingImpersonation = loading;
          },
          false,
          "userManagement/setLoadingImpersonation",
        ),

      // ========================================
      // Roles actions
      // ========================================
      setRoles: (roles) =>
        set(
          (state) => {
            state.roles = roles;
          },
          false,
          "userManagement/setRoles",
        ),

      setLoadingRoles: (loading) =>
        set(
          (state) => {
            state.isLoadingRoles = loading;
          },
          false,
          "userManagement/setLoadingRoles",
        ),

      // ========================================
      // Selection actions
      // ========================================
      toggleUserSelection: (userId) =>
        set(
          (state) => {
            const index = state.selectedUserIds.indexOf(userId);
            if (index === -1) {
              state.selectedUserIds.push(userId);
            } else {
              state.selectedUserIds.splice(index, 1);
            }
          },
          false,
          "userManagement/toggleUserSelection",
        ),

      selectAllUsers: () =>
        set(
          (state) => {
            state.selectedUserIds = state.users.map((u) => u.id);
          },
          false,
          "userManagement/selectAllUsers",
        ),

      clearUserSelection: () =>
        set(
          (state) => {
            state.selectedUserIds = [];
          },
          false,
          "userManagement/clearUserSelection",
        ),

      setSelectionMode: (enabled) =>
        set(
          (state) => {
            state.isSelectionMode = enabled;
            if (!enabled) {
              state.selectedUserIds = [];
            }
          },
          false,
          "userManagement/setSelectionMode",
        ),

      // ========================================
      // Modal actions
      // ========================================
      openUserModal: (mode, user) =>
        set(
          (state) => {
            state.userModalOpen = true;
            state.userModalMode = mode;
            if (user) {
              state.selectedUser = user;
            }
          },
          false,
          "userManagement/openUserModal",
        ),

      closeUserModal: () =>
        set(
          (state) => {
            state.userModalOpen = false;
          },
          false,
          "userManagement/closeUserModal",
        ),

      openBanModal: (user) =>
        set(
          (state) => {
            state.banModalOpen = true;
            state.banModalUser = user;
          },
          false,
          "userManagement/openBanModal",
        ),

      closeBanModal: () =>
        set(
          (state) => {
            state.banModalOpen = false;
            state.banModalUser = null;
          },
          false,
          "userManagement/closeBanModal",
        ),

      openInviteModal: (mode) =>
        set(
          (state) => {
            state.inviteModalOpen = true;
            state.inviteModalMode = mode;
          },
          false,
          "userManagement/openInviteModal",
        ),

      closeInviteModal: () =>
        set(
          (state) => {
            state.inviteModalOpen = false;
          },
          false,
          "userManagement/closeInviteModal",
        ),

      openDeleteConfirm: (user) =>
        set(
          (state) => {
            state.deleteConfirmOpen = true;
            state.deleteConfirmUser = user;
          },
          false,
          "userManagement/openDeleteConfirm",
        ),

      closeDeleteConfirm: () =>
        set(
          (state) => {
            state.deleteConfirmOpen = false;
            state.deleteConfirmUser = null;
          },
          false,
          "userManagement/closeDeleteConfirm",
        ),

      openRoleChangeModal: (user) =>
        set(
          (state) => {
            state.roleChangeModalOpen = true;
            state.roleChangeUser = user;
          },
          false,
          "userManagement/openRoleChangeModal",
        ),

      closeRoleChangeModal: () =>
        set(
          (state) => {
            state.roleChangeModalOpen = false;
            state.roleChangeUser = null;
          },
          false,
          "userManagement/closeRoleChangeModal",
        ),

      openImpersonateModal: (user) =>
        set(
          (state) => {
            state.impersonateModalOpen = true;
            state.impersonateUser = user;
          },
          false,
          "userManagement/openImpersonateModal",
        ),

      closeImpersonateModal: () =>
        set(
          (state) => {
            state.impersonateModalOpen = false;
            state.impersonateUser = null;
          },
          false,
          "userManagement/closeImpersonateModal",
        ),

      openResetPasswordModal: (user) =>
        set(
          (state) => {
            state.resetPasswordModalOpen = true;
            state.resetPasswordUser = user;
          },
          false,
          "userManagement/openResetPasswordModal",
        ),

      closeResetPasswordModal: () =>
        set(
          (state) => {
            state.resetPasswordModalOpen = false;
            state.resetPasswordUser = null;
          },
          false,
          "userManagement/closeResetPasswordModal",
        ),

      // ========================================
      // Utility
      // ========================================
      reset: () => set(() => initialState, false, "userManagement/reset"),
    })),
    { name: "user-management-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectUsers = (state: UserManagementStore) => state.users;
export const selectUsersTotal = (state: UserManagementStore) =>
  state.usersTotal;
export const selectUsersPagination = (state: UserManagementStore) => ({
  page: state.usersPage,
  perPage: state.usersPerPage,
  total: state.usersTotal,
  totalPages: Math.ceil(state.usersTotal / state.usersPerPage),
});
export const selectUsersFilters = (state: UserManagementStore) =>
  state.usersFilters;
export const selectUsersSort = (state: UserManagementStore) => state.usersSort;
export const selectIsLoadingUsers = (state: UserManagementStore) =>
  state.isLoadingUsers;

export const selectSelectedUser = (state: UserManagementStore) =>
  state.selectedUser;
export const selectSelectedUserActivity = (state: UserManagementStore) =>
  state.selectedUserActivity;
export const selectSelectedUserSessions = (state: UserManagementStore) =>
  state.selectedUserSessions;
export const selectSelectedUserDevices = (state: UserManagementStore) =>
  state.selectedUserDevices;

export const selectInvites = (state: UserManagementStore) => state.invites;
export const selectInvitesTotal = (state: UserManagementStore) =>
  state.invitesTotal;
export const selectInviteLinks = (state: UserManagementStore) =>
  state.inviteLinks;

export const selectBannedUsers = (state: UserManagementStore) =>
  state.bannedUsers;
export const selectBannedUsersTotal = (state: UserManagementStore) =>
  state.bannedUsersTotal;

export const selectStats = (state: UserManagementStore) => state.stats;
export const selectGrowthData = (state: UserManagementStore) =>
  state.growthData;

export const selectActiveImpersonation = (state: UserManagementStore) =>
  state.activeImpersonation;
export const selectRoles = (state: UserManagementStore) => state.roles;

export const selectSelectedUserIds = (state: UserManagementStore) =>
  state.selectedUserIds;
export const selectIsSelectionMode = (state: UserManagementStore) =>
  state.isSelectionMode;
export const selectSelectedCount = (state: UserManagementStore) =>
  state.selectedUserIds.length;
