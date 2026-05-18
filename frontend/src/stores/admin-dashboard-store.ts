/**
 * Admin Dashboard Store - Zustand store for admin dashboard state
 *
 * Manages dashboard statistics, admin settings, and audit log cache
 * for the admin dashboard interface.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { DashboardStats } from "@/lib/admin/stats-aggregator";
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogSortOptions,
} from "@/lib/admin/audit-log";
import type { GlobalSettings } from "@/lib/admin/settings-manager";

// ============================================================================
// Types
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AdminDashboardState {
  // Dashboard Stats
  stats: DashboardStats | null;
  previousStats: DashboardStats | null;
  statsDateRange: DateRange;
  isLoadingStats: boolean;
  statsError: string | null;
  statsLastUpdated: Date | null;

  // Admin Settings
  settings: GlobalSettings | null;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  settingsError: string | null;
  hasUnsavedChanges: boolean;

  // Audit Log Cache
  auditEntries: AuditLogEntry[];
  auditFilters: AuditLogFilters;
  auditSort: AuditLogSortOptions;
  auditPage: number;
  auditPageSize: number;
  auditTotal: number;
  isLoadingAudit: boolean;
  auditError: string | null;
  selectedAuditEntry: AuditLogEntry | null;

  // UI State
  activeTab: "overview" | "users" | "channels" | "settings" | "audit";
  sidebarCollapsed: boolean;
  refreshInterval: number | null;
}

export interface AdminDashboardActions {
  // Stats Actions
  setStats: (stats: DashboardStats) => void;
  setPreviousStats: (stats: DashboardStats | null) => void;
  setStatsDateRange: (range: DateRange) => void;
  setLoadingStats: (loading: boolean) => void;
  setStatsError: (error: string | null) => void;
  refreshStats: () => void;

  // Settings Actions
  setSettings: (settings: GlobalSettings) => void;
  updateSettings: (updates: Partial<GlobalSettings>) => void;
  setLoadingSettings: (loading: boolean) => void;
  setSavingSettings: (saving: boolean) => void;
  setSettingsError: (error: string | null) => void;
  markSettingsChanged: () => void;
  markSettingsSaved: () => void;
  resetSettings: () => void;

  // Audit Log Actions
  setAuditEntries: (entries: AuditLogEntry[], total: number) => void;
  addAuditEntry: (entry: AuditLogEntry) => void;
  setAuditFilters: (filters: AuditLogFilters) => void;
  clearAuditFilters: () => void;
  setAuditSort: (sort: AuditLogSortOptions) => void;
  setAuditPage: (page: number) => void;
  setAuditPageSize: (pageSize: number) => void;
  setLoadingAudit: (loading: boolean) => void;
  setAuditError: (error: string | null) => void;
  selectAuditEntry: (entry: AuditLogEntry | null) => void;

  // UI Actions
  setActiveTab: (tab: AdminDashboardState["activeTab"]) => void;
  toggleSidebar: () => void;
  setRefreshInterval: (interval: number | null) => void;

  // Utility Actions
  reset: () => void;
}

export type AdminDashboardStore = AdminDashboardState & AdminDashboardActions;

// ============================================================================
// Initial State
// ============================================================================

const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
};

const initialState: AdminDashboardState = {
  // Dashboard Stats
  stats: null,
  previousStats: null,
  statsDateRange: getDefaultDateRange(),
  isLoadingStats: false,
  statsError: null,
  statsLastUpdated: null,

  // Admin Settings
  settings: null,
  isLoadingSettings: false,
  isSavingSettings: false,
  settingsError: null,
  hasUnsavedChanges: false,

  // Audit Log Cache
  auditEntries: [],
  auditFilters: {},
  auditSort: { field: "timestamp", direction: "desc" },
  auditPage: 1,
  auditPageSize: 50,
  auditTotal: 0,
  isLoadingAudit: false,
  auditError: null,
  selectedAuditEntry: null,

  // UI State
  activeTab: "overview",
  sidebarCollapsed: false,
  refreshInterval: null,
};

// ============================================================================
// Store
// ============================================================================

export const useAdminDashboardStore = create<AdminDashboardStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // ======================================================================
      // Stats Actions
      // ======================================================================

      setStats: (stats) =>
        set(
          (state) => {
            state.stats = stats;
            state.statsLastUpdated = new Date();
          },
          false,
          "adminDashboard/setStats",
        ),

      setPreviousStats: (stats) =>
        set(
          (state) => {
            state.previousStats = stats;
          },
          false,
          "adminDashboard/setPreviousStats",
        ),

      setStatsDateRange: (range) =>
        set(
          (state) => {
            state.statsDateRange = range;
          },
          false,
          "adminDashboard/setStatsDateRange",
        ),

      setLoadingStats: (loading) =>
        set(
          (state) => {
            state.isLoadingStats = loading;
            if (loading) {
              state.statsError = null;
            }
          },
          false,
          "adminDashboard/setLoadingStats",
        ),

      setStatsError: (error) =>
        set(
          (state) => {
            state.statsError = error;
            state.isLoadingStats = false;
          },
          false,
          "adminDashboard/setStatsError",
        ),

      refreshStats: () =>
        set(
          (state) => {
            // Keep previous stats for comparison
            if (state.stats) {
              state.previousStats = state.stats;
            }
            state.isLoadingStats = true;
            state.statsError = null;
          },
          false,
          "adminDashboard/refreshStats",
        ),

      // ======================================================================
      // Settings Actions
      // ======================================================================

      setSettings: (settings) =>
        set(
          (state) => {
            state.settings = settings;
            state.hasUnsavedChanges = false;
          },
          false,
          "adminDashboard/setSettings",
        ),

      updateSettings: (updates) =>
        set(
          (state) => {
            if (state.settings) {
              state.settings = { ...state.settings, ...updates };
              state.hasUnsavedChanges = true;
            }
          },
          false,
          "adminDashboard/updateSettings",
        ),

      setLoadingSettings: (loading) =>
        set(
          (state) => {
            state.isLoadingSettings = loading;
            if (loading) {
              state.settingsError = null;
            }
          },
          false,
          "adminDashboard/setLoadingSettings",
        ),

      setSavingSettings: (saving) =>
        set(
          (state) => {
            state.isSavingSettings = saving;
          },
          false,
          "adminDashboard/setSavingSettings",
        ),

      setSettingsError: (error) =>
        set(
          (state) => {
            state.settingsError = error;
            state.isLoadingSettings = false;
            state.isSavingSettings = false;
          },
          false,
          "adminDashboard/setSettingsError",
        ),

      markSettingsChanged: () =>
        set(
          (state) => {
            state.hasUnsavedChanges = true;
          },
          false,
          "adminDashboard/markSettingsChanged",
        ),

      markSettingsSaved: () =>
        set(
          (state) => {
            state.hasUnsavedChanges = false;
            state.isSavingSettings = false;
          },
          false,
          "adminDashboard/markSettingsSaved",
        ),

      resetSettings: () =>
        set(
          (state) => {
            state.settings = null;
            state.hasUnsavedChanges = false;
            state.settingsError = null;
          },
          false,
          "adminDashboard/resetSettings",
        ),

      // ======================================================================
      // Audit Log Actions
      // ======================================================================

      setAuditEntries: (entries, total) =>
        set(
          (state) => {
            state.auditEntries = entries;
            state.auditTotal = total;
          },
          false,
          "adminDashboard/setAuditEntries",
        ),

      addAuditEntry: (entry) =>
        set(
          (state) => {
            state.auditEntries = [entry, ...state.auditEntries].slice(0, 1000); // Keep max 1000
            state.auditTotal += 1;
          },
          false,
          "adminDashboard/addAuditEntry",
        ),

      setAuditFilters: (filters) =>
        set(
          (state) => {
            state.auditFilters = { ...state.auditFilters, ...filters };
            state.auditPage = 1; // Reset to first page
          },
          false,
          "adminDashboard/setAuditFilters",
        ),

      clearAuditFilters: () =>
        set(
          (state) => {
            state.auditFilters = {};
            state.auditPage = 1;
          },
          false,
          "adminDashboard/clearAuditFilters",
        ),

      setAuditSort: (sort) =>
        set(
          (state) => {
            state.auditSort = sort;
            state.auditPage = 1;
          },
          false,
          "adminDashboard/setAuditSort",
        ),

      setAuditPage: (page) =>
        set(
          (state) => {
            state.auditPage = page;
          },
          false,
          "adminDashboard/setAuditPage",
        ),

      setAuditPageSize: (pageSize) =>
        set(
          (state) => {
            state.auditPageSize = pageSize;
            state.auditPage = 1;
          },
          false,
          "adminDashboard/setAuditPageSize",
        ),

      setLoadingAudit: (loading) =>
        set(
          (state) => {
            state.isLoadingAudit = loading;
            if (loading) {
              state.auditError = null;
            }
          },
          false,
          "adminDashboard/setLoadingAudit",
        ),

      setAuditError: (error) =>
        set(
          (state) => {
            state.auditError = error;
            state.isLoadingAudit = false;
          },
          false,
          "adminDashboard/setAuditError",
        ),

      selectAuditEntry: (entry) =>
        set(
          (state) => {
            state.selectedAuditEntry = entry;
          },
          false,
          "adminDashboard/selectAuditEntry",
        ),

      // ======================================================================
      // UI Actions
      // ======================================================================

      setActiveTab: (tab) =>
        set(
          (state) => {
            state.activeTab = tab;
          },
          false,
          "adminDashboard/setActiveTab",
        ),

      toggleSidebar: () =>
        set(
          (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          },
          false,
          "adminDashboard/toggleSidebar",
        ),

      setRefreshInterval: (interval) =>
        set(
          (state) => {
            state.refreshInterval = interval;
          },
          false,
          "adminDashboard/setRefreshInterval",
        ),

      // ======================================================================
      // Utility Actions
      // ======================================================================

      reset: () => set(() => initialState, false, "adminDashboard/reset"),
    })),
    { name: "admin-dashboard-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectStats = (state: AdminDashboardStore) => state.stats;
export const selectPreviousStats = (state: AdminDashboardStore) =>
  state.previousStats;
export const selectStatsDateRange = (state: AdminDashboardStore) =>
  state.statsDateRange;
export const selectIsLoadingStats = (state: AdminDashboardStore) =>
  state.isLoadingStats;
export const selectStatsError = (state: AdminDashboardStore) =>
  state.statsError;
export const selectStatsLastUpdated = (state: AdminDashboardStore) =>
  state.statsLastUpdated;

export const selectSettings = (state: AdminDashboardStore) => state.settings;
export const selectIsLoadingSettings = (state: AdminDashboardStore) =>
  state.isLoadingSettings;
export const selectIsSavingSettings = (state: AdminDashboardStore) =>
  state.isSavingSettings;
export const selectSettingsError = (state: AdminDashboardStore) =>
  state.settingsError;
export const selectHasUnsavedChanges = (state: AdminDashboardStore) =>
  state.hasUnsavedChanges;

export const selectAuditEntries = (state: AdminDashboardStore) =>
  state.auditEntries;
export const selectAuditFilters = (state: AdminDashboardStore) =>
  state.auditFilters;
export const selectAuditSort = (state: AdminDashboardStore) => state.auditSort;
export const selectAuditPagination = (state: AdminDashboardStore) => ({
  page: state.auditPage,
  pageSize: state.auditPageSize,
  total: state.auditTotal,
  totalPages: Math.ceil(state.auditTotal / state.auditPageSize),
});
export const selectIsLoadingAudit = (state: AdminDashboardStore) =>
  state.isLoadingAudit;
export const selectAuditError = (state: AdminDashboardStore) =>
  state.auditError;
export const selectSelectedAuditEntry = (state: AdminDashboardStore) =>
  state.selectedAuditEntry;

export const selectActiveTab = (state: AdminDashboardStore) => state.activeTab;
export const selectSidebarCollapsed = (state: AdminDashboardStore) =>
  state.sidebarCollapsed;
export const selectRefreshInterval = (state: AdminDashboardStore) =>
  state.refreshInterval;

// Computed selectors
export const selectStatsGrowth = (state: AdminDashboardStore) => {
  const { stats, previousStats } = state;
  if (!stats || !previousStats) return null;

  return {
    usersGrowth: calculateGrowth(stats.users.total, previousStats.users.total),
    messagesGrowth: calculateGrowth(
      stats.messages.total,
      previousStats.messages.total,
    ),
    channelsGrowth: calculateGrowth(
      stats.channels.total,
      previousStats.channels.total,
    ),
    storageGrowth: calculateGrowth(
      stats.storage.used,
      previousStats.storage.used,
    ),
  };
};

export const selectAuditSummary = (state: AdminDashboardStore) => {
  const entries = state.auditEntries;
  const summary = {
    total: state.auditTotal,
    todayCount: 0,
    userActions: 0,
    channelActions: 0,
    settingsActions: 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const entry of entries) {
    const entryDate = new Date(entry.timestamp);
    if (entryDate >= today) {
      summary.todayCount++;
    }

    if (entry.targetType === "user") summary.userActions++;
    if (entry.targetType === "channel") summary.channelActions++;
    if (entry.targetType === "settings") summary.settingsActions++;
  }

  return summary;
};

// ============================================================================
// Helper Functions
// ============================================================================

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}
