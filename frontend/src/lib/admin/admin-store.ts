/**
 * Admin Store - Manages admin dashboard state for the nself-chat application
 *
 * Handles dashboard stats, user management, moderation queue, and activity logs
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ReportType = "spam" | "harassment" | "inappropriate" | "other";
export type ModerationAction = "warn" | "mute" | "ban" | "delete" | "dismiss";
export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  bannedUsers: number;
  totalChannels: number;
  totalMessages: number;
  pendingReports: number;
  messagesLast24h: number;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
  isActive: boolean;
  isBanned: boolean;
  bannedAt?: string;
  bannedUntil?: string;
  banReason?: string;
  createdAt: string;
  lastSeenAt?: string;
  messagesCount: number;
  channelsCount: number;
}

export interface AdminChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  isPrivate: boolean;
  isArchived: boolean;
  createdAt: string;
  creator?: {
    id: string;
    username: string;
    displayName: string;
  };
  membersCount: number;
  messagesCount: number;
}

export interface ModerationReport {
  id: string;
  type: ReportType;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  reporter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  reportedUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  reportedMessage?: {
    id: string;
    content: string;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
    channel: {
      id: string;
      name: string;
    };
  };
  moderator?: {
    id: string;
    username: string;
    displayName: string;
  };
  resolution?: string;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
}

// ============================================================================
// State Interface
// ============================================================================

export interface AdminState {
  // Dashboard stats
  stats: AdminStats;
  isLoadingStats: boolean;

  // Users
  users: AdminUser[];
  selectedUser: AdminUser | null;
  usersTotal: number;
  usersPage: number;
  usersPerPage: number;
  usersSearch: string;
  usersRoleFilter: string | null;
  usersBannedFilter: boolean | null;
  isLoadingUsers: boolean;

  // Channels
  channels: AdminChannel[];
  selectedChannel: AdminChannel | null;
  channelsTotal: number;
  channelsPage: number;
  channelsPerPage: number;
  channelsSearch: string;
  channelsTypeFilter: string | null;
  channelsIncludeArchived: boolean;
  isLoadingChannels: boolean;

  // Moderation
  reports: ModerationReport[];
  selectedReport: ModerationReport | null;
  reportsTotal: number;
  reportsPage: number;
  reportsPerPage: number;
  reportsStatusFilter: ReportStatus;
  reportsTypeFilter: ReportType | null;
  isLoadingReports: boolean;

  // Activity
  activityLogs: ActivityLogEntry[];
  isLoadingActivity: boolean;

  // Roles
  roles: Role[];
  isLoadingRoles: boolean;

  // Modal states
  banUserModalOpen: boolean;
  banUserTarget: AdminUser | null;
  roleEditorOpen: boolean;
  roleEditorTarget: AdminUser | null;
  deleteChannelModalOpen: boolean;
  deleteChannelTarget: AdminChannel | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface AdminActions {
  // Stats actions
  setStats: (stats: AdminStats) => void;
  setLoadingStats: (loading: boolean) => void;

  // User actions
  setUsers: (users: AdminUser[], total: number) => void;
  setSelectedUser: (user: AdminUser | null) => void;
  updateUser: (userId: string, updates: Partial<AdminUser>) => void;
  removeUser: (userId: string) => void;
  setUsersPage: (page: number) => void;
  setUsersSearch: (search: string) => void;
  setUsersRoleFilter: (roleId: string | null) => void;
  setUsersBannedFilter: (banned: boolean | null) => void;
  setLoadingUsers: (loading: boolean) => void;

  // Channel actions
  setChannels: (channels: AdminChannel[], total: number) => void;
  setSelectedChannel: (channel: AdminChannel | null) => void;
  updateChannel: (channelId: string, updates: Partial<AdminChannel>) => void;
  removeChannel: (channelId: string) => void;
  setChannelsPage: (page: number) => void;
  setChannelsSearch: (search: string) => void;
  setChannelsTypeFilter: (type: string | null) => void;
  setChannelsIncludeArchived: (include: boolean) => void;
  setLoadingChannels: (loading: boolean) => void;

  // Moderation actions
  setReports: (reports: ModerationReport[], total: number) => void;
  setSelectedReport: (report: ModerationReport | null) => void;
  updateReport: (reportId: string, updates: Partial<ModerationReport>) => void;
  removeReport: (reportId: string) => void;
  setReportsPage: (page: number) => void;
  setReportsStatusFilter: (status: ReportStatus) => void;
  setReportsTypeFilter: (type: ReportType | null) => void;
  setLoadingReports: (loading: boolean) => void;

  // Activity actions
  setActivityLogs: (logs: ActivityLogEntry[]) => void;
  addActivityLog: (log: ActivityLogEntry) => void;
  setLoadingActivity: (loading: boolean) => void;

  // Roles actions
  setRoles: (roles: Role[]) => void;
  setLoadingRoles: (loading: boolean) => void;

  // Modal actions
  openBanUserModal: (user: AdminUser) => void;
  closeBanUserModal: () => void;
  openRoleEditor: (user: AdminUser) => void;
  closeRoleEditor: () => void;
  openDeleteChannelModal: (channel: AdminChannel) => void;
  closeDeleteChannelModal: () => void;

  // Utility actions
  reset: () => void;
}

export type AdminStore = AdminState & AdminActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AdminState = {
  // Dashboard stats
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    onlineUsers: 0,
    bannedUsers: 0,
    totalChannels: 0,
    totalMessages: 0,
    pendingReports: 0,
    messagesLast24h: 0,
  },
  isLoadingStats: false,

  // Users
  users: [],
  selectedUser: null,
  usersTotal: 0,
  usersPage: 1,
  usersPerPage: 20,
  usersSearch: "",
  usersRoleFilter: null,
  usersBannedFilter: null,
  isLoadingUsers: false,

  // Channels
  channels: [],
  selectedChannel: null,
  channelsTotal: 0,
  channelsPage: 1,
  channelsPerPage: 20,
  channelsSearch: "",
  channelsTypeFilter: null,
  channelsIncludeArchived: false,
  isLoadingChannels: false,

  // Moderation
  reports: [],
  selectedReport: null,
  reportsTotal: 0,
  reportsPage: 1,
  reportsPerPage: 20,
  reportsStatusFilter: "pending",
  reportsTypeFilter: null,
  isLoadingReports: false,

  // Activity
  activityLogs: [],
  isLoadingActivity: false,

  // Roles
  roles: [],
  isLoadingRoles: false,

  // Modal states
  banUserModalOpen: false,
  banUserTarget: null,
  roleEditorOpen: false,
  roleEditorTarget: null,
  deleteChannelModalOpen: false,
  deleteChannelTarget: null,
};

// ============================================================================
// Store
// ============================================================================

export const useAdminStore = create<AdminStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Stats actions
      setStats: (stats) =>
        set(
          (state) => {
            state.stats = stats;
          },
          false,
          "admin/setStats",
        ),

      setLoadingStats: (loading) =>
        set(
          (state) => {
            state.isLoadingStats = loading;
          },
          false,
          "admin/setLoadingStats",
        ),

      // User actions
      setUsers: (users, total) =>
        set(
          (state) => {
            state.users = users;
            state.usersTotal = total;
          },
          false,
          "admin/setUsers",
        ),

      setSelectedUser: (user) =>
        set(
          (state) => {
            state.selectedUser = user;
          },
          false,
          "admin/setSelectedUser",
        ),

      updateUser: (userId, updates) =>
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
          "admin/updateUser",
        ),

      removeUser: (userId) =>
        set(
          (state) => {
            state.users = state.users.filter((u) => u.id !== userId);
            if (state.selectedUser?.id === userId) {
              state.selectedUser = null;
            }
          },
          false,
          "admin/removeUser",
        ),

      setUsersPage: (page) =>
        set(
          (state) => {
            state.usersPage = page;
          },
          false,
          "admin/setUsersPage",
        ),

      setUsersSearch: (search) =>
        set(
          (state) => {
            state.usersSearch = search;
            state.usersPage = 1; // Reset to first page on search
          },
          false,
          "admin/setUsersSearch",
        ),

      setUsersRoleFilter: (roleId) =>
        set(
          (state) => {
            state.usersRoleFilter = roleId;
            state.usersPage = 1;
          },
          false,
          "admin/setUsersRoleFilter",
        ),

      setUsersBannedFilter: (banned) =>
        set(
          (state) => {
            state.usersBannedFilter = banned;
            state.usersPage = 1;
          },
          false,
          "admin/setUsersBannedFilter",
        ),

      setLoadingUsers: (loading) =>
        set(
          (state) => {
            state.isLoadingUsers = loading;
          },
          false,
          "admin/setLoadingUsers",
        ),

      // Channel actions
      setChannels: (channels, total) =>
        set(
          (state) => {
            state.channels = channels;
            state.channelsTotal = total;
          },
          false,
          "admin/setChannels",
        ),

      setSelectedChannel: (channel) =>
        set(
          (state) => {
            state.selectedChannel = channel;
          },
          false,
          "admin/setSelectedChannel",
        ),

      updateChannel: (channelId, updates) =>
        set(
          (state) => {
            const index = state.channels.findIndex((c) => c.id === channelId);
            if (index !== -1) {
              state.channels[index] = { ...state.channels[index], ...updates };
            }
            if (state.selectedChannel?.id === channelId) {
              state.selectedChannel = { ...state.selectedChannel, ...updates };
            }
          },
          false,
          "admin/updateChannel",
        ),

      removeChannel: (channelId) =>
        set(
          (state) => {
            state.channels = state.channels.filter((c) => c.id !== channelId);
            if (state.selectedChannel?.id === channelId) {
              state.selectedChannel = null;
            }
          },
          false,
          "admin/removeChannel",
        ),

      setChannelsPage: (page) =>
        set(
          (state) => {
            state.channelsPage = page;
          },
          false,
          "admin/setChannelsPage",
        ),

      setChannelsSearch: (search) =>
        set(
          (state) => {
            state.channelsSearch = search;
            state.channelsPage = 1;
          },
          false,
          "admin/setChannelsSearch",
        ),

      setChannelsTypeFilter: (type) =>
        set(
          (state) => {
            state.channelsTypeFilter = type;
            state.channelsPage = 1;
          },
          false,
          "admin/setChannelsTypeFilter",
        ),

      setChannelsIncludeArchived: (include) =>
        set(
          (state) => {
            state.channelsIncludeArchived = include;
            state.channelsPage = 1;
          },
          false,
          "admin/setChannelsIncludeArchived",
        ),

      setLoadingChannels: (loading) =>
        set(
          (state) => {
            state.isLoadingChannels = loading;
          },
          false,
          "admin/setLoadingChannels",
        ),

      // Moderation actions
      setReports: (reports, total) =>
        set(
          (state) => {
            state.reports = reports;
            state.reportsTotal = total;
          },
          false,
          "admin/setReports",
        ),

      setSelectedReport: (report) =>
        set(
          (state) => {
            state.selectedReport = report;
          },
          false,
          "admin/setSelectedReport",
        ),

      updateReport: (reportId, updates) =>
        set(
          (state) => {
            const index = state.reports.findIndex((r) => r.id === reportId);
            if (index !== -1) {
              state.reports[index] = { ...state.reports[index], ...updates };
            }
            if (state.selectedReport?.id === reportId) {
              state.selectedReport = { ...state.selectedReport, ...updates };
            }
          },
          false,
          "admin/updateReport",
        ),

      removeReport: (reportId) =>
        set(
          (state) => {
            state.reports = state.reports.filter((r) => r.id !== reportId);
            if (state.selectedReport?.id === reportId) {
              state.selectedReport = null;
            }
          },
          false,
          "admin/removeReport",
        ),

      setReportsPage: (page) =>
        set(
          (state) => {
            state.reportsPage = page;
          },
          false,
          "admin/setReportsPage",
        ),

      setReportsStatusFilter: (status) =>
        set(
          (state) => {
            state.reportsStatusFilter = status;
            state.reportsPage = 1;
          },
          false,
          "admin/setReportsStatusFilter",
        ),

      setReportsTypeFilter: (type) =>
        set(
          (state) => {
            state.reportsTypeFilter = type;
            state.reportsPage = 1;
          },
          false,
          "admin/setReportsTypeFilter",
        ),

      setLoadingReports: (loading) =>
        set(
          (state) => {
            state.isLoadingReports = loading;
          },
          false,
          "admin/setLoadingReports",
        ),

      // Activity actions
      setActivityLogs: (logs) =>
        set(
          (state) => {
            state.activityLogs = logs;
          },
          false,
          "admin/setActivityLogs",
        ),

      addActivityLog: (log) =>
        set(
          (state) => {
            state.activityLogs = [log, ...state.activityLogs].slice(0, 100); // Keep last 100
          },
          false,
          "admin/addActivityLog",
        ),

      setLoadingActivity: (loading) =>
        set(
          (state) => {
            state.isLoadingActivity = loading;
          },
          false,
          "admin/setLoadingActivity",
        ),

      // Roles actions
      setRoles: (roles) =>
        set(
          (state) => {
            state.roles = roles;
          },
          false,
          "admin/setRoles",
        ),

      setLoadingRoles: (loading) =>
        set(
          (state) => {
            state.isLoadingRoles = loading;
          },
          false,
          "admin/setLoadingRoles",
        ),

      // Modal actions
      openBanUserModal: (user) =>
        set(
          (state) => {
            state.banUserModalOpen = true;
            state.banUserTarget = user;
          },
          false,
          "admin/openBanUserModal",
        ),

      closeBanUserModal: () =>
        set(
          (state) => {
            state.banUserModalOpen = false;
            state.banUserTarget = null;
          },
          false,
          "admin/closeBanUserModal",
        ),

      openRoleEditor: (user) =>
        set(
          (state) => {
            state.roleEditorOpen = true;
            state.roleEditorTarget = user;
          },
          false,
          "admin/openRoleEditor",
        ),

      closeRoleEditor: () =>
        set(
          (state) => {
            state.roleEditorOpen = false;
            state.roleEditorTarget = null;
          },
          false,
          "admin/closeRoleEditor",
        ),

      openDeleteChannelModal: (channel) =>
        set(
          (state) => {
            state.deleteChannelModalOpen = true;
            state.deleteChannelTarget = channel;
          },
          false,
          "admin/openDeleteChannelModal",
        ),

      closeDeleteChannelModal: () =>
        set(
          (state) => {
            state.deleteChannelModalOpen = false;
            state.deleteChannelTarget = null;
          },
          false,
          "admin/closeDeleteChannelModal",
        ),

      // Utility actions
      reset: () => set(() => initialState, false, "admin/reset"),
    })),
    { name: "admin-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectStats = (state: AdminStore) => state.stats;
export const selectUsers = (state: AdminStore) => state.users;
export const selectChannels = (state: AdminStore) => state.channels;
export const selectReports = (state: AdminStore) => state.reports;
export const selectActivityLogs = (state: AdminStore) => state.activityLogs;
export const selectRoles = (state: AdminStore) => state.roles;

export const selectUsersPagination = (state: AdminStore) => ({
  page: state.usersPage,
  perPage: state.usersPerPage,
  total: state.usersTotal,
  totalPages: Math.ceil(state.usersTotal / state.usersPerPage),
});

export const selectChannelsPagination = (state: AdminStore) => ({
  page: state.channelsPage,
  perPage: state.channelsPerPage,
  total: state.channelsTotal,
  totalPages: Math.ceil(state.channelsTotal / state.channelsPerPage),
});

export const selectReportsPagination = (state: AdminStore) => ({
  page: state.reportsPage,
  perPage: state.reportsPerPage,
  total: state.reportsTotal,
  totalPages: Math.ceil(state.reportsTotal / state.reportsPerPage),
});

export const selectPendingReportsCount = (state: AdminStore) =>
  state.stats.pendingReports;

export const selectBanUserModal = (state: AdminStore) => ({
  isOpen: state.banUserModalOpen,
  target: state.banUserTarget,
});

export const selectRoleEditorModal = (state: AdminStore) => ({
  isOpen: state.roleEditorOpen,
  target: state.roleEditorTarget,
});

export const selectDeleteChannelModal = (state: AdminStore) => ({
  isOpen: state.deleteChannelModalOpen,
  target: state.deleteChannelTarget,
});
