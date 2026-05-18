/**
 * Audit Store - Zustand store for audit log management
 *
 * This store manages audit log state, including entries, filters,
 * pagination, and settings.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  AuditAction,
  AuditCategory,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogSortOptions,
  AuditRetentionPolicy,
  AuditSettings,
  AuditSeverity,
  AuditStatistics,
} from "@/lib/audit/audit-types";
import { defaultAuditSettings } from "@/lib/audit/audit-retention";
import { queryAuditLogs } from "@/lib/audit/audit-search";

// ============================================================================
// Types
// ============================================================================

export interface AuditState {
  // Entries
  entries: AuditLogEntry[];
  filteredEntries: AuditLogEntry[];
  selectedEntry: AuditLogEntry | null;
  selectedEntryIds: string[];

  // Filters
  filters: AuditLogFilters;
  sort: AuditLogSortOptions;
  searchQuery: string;

  // Pagination
  pagination: AuditLogPagination;

  // Settings
  settings: AuditSettings;

  // Statistics
  statistics: AuditStatistics | null;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isExporting: boolean;
  isSavingSettings: boolean;

  // Error state
  error: string | null;

  // Real-time
  isRealTimeEnabled: boolean;
  lastRefresh: Date | null;
}

export interface AuditActions {
  // Entry actions
  setEntries: (entries: AuditLogEntry[]) => void;
  addEntry: (entry: AuditLogEntry) => void;
  addEntries: (entries: AuditLogEntry[]) => void;
  removeEntry: (id: string) => void;
  clearEntries: () => void;
  selectEntry: (entry: AuditLogEntry | null) => void;
  toggleEntrySelection: (id: string) => void;
  selectAllEntries: () => void;
  clearSelection: () => void;

  // Filter actions
  setFilters: (filters: Partial<AuditLogFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (categories: AuditCategory[]) => void;
  setSeverityFilter: (severities: AuditSeverity[]) => void;
  setActionFilter: (actions: AuditAction[]) => void;
  setDateRangeFilter: (start: Date | undefined, end: Date | undefined) => void;

  // Sort actions
  setSort: (sort: AuditLogSortOptions) => void;
  toggleSortDirection: () => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  // Settings actions
  setSettings: (settings: Partial<AuditSettings>) => void;
  addRetentionPolicy: (policy: AuditRetentionPolicy) => void;
  updateRetentionPolicy: (
    id: string,
    updates: Partial<AuditRetentionPolicy>,
  ) => void;
  removeRetentionPolicy: (id: string) => void;

  // Statistics actions
  setStatistics: (statistics: AuditStatistics) => void;
  refreshStatistics: () => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setSavingSettings: (saving: boolean) => void;

  // Error actions
  setError: (error: string | null) => void;

  // Real-time actions
  setRealTimeEnabled: (enabled: boolean) => void;
  setLastRefresh: (date: Date) => void;

  // Utility actions
  applyFiltersAndSort: () => void;
  reset: () => void;
}

export type AuditStore = AuditState & AuditActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AuditState = {
  entries: [],
  filteredEntries: [],
  selectedEntry: null,
  selectedEntryIds: [],
  filters: {},
  sort: { field: "timestamp", direction: "desc" },
  searchQuery: "",
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  },
  settings: defaultAuditSettings,
  statistics: null,
  isLoading: false,
  isLoadingMore: false,
  isExporting: false,
  isSavingSettings: false,
  error: null,
  isRealTimeEnabled: true,
  lastRefresh: null,
};

// ============================================================================
// Store
// ============================================================================

export const useAuditStore = create<AuditStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Entry actions
      setEntries: (entries) =>
        set(
          (state) => {
            state.entries = entries;
            state.lastRefresh = new Date();
          },
          false,
          "audit/setEntries",
        ),

      addEntry: (entry) =>
        set(
          (state) => {
            state.entries.unshift(entry);
          },
          false,
          "audit/addEntry",
        ),

      addEntries: (entries) =>
        set(
          (state) => {
            state.entries.push(...entries);
          },
          false,
          "audit/addEntries",
        ),

      removeEntry: (id) =>
        set(
          (state) => {
            state.entries = state.entries.filter((e) => e.id !== id);
            state.selectedEntryIds = state.selectedEntryIds.filter(
              (i) => i !== id,
            );
            if (state.selectedEntry?.id === id) {
              state.selectedEntry = null;
            }
          },
          false,
          "audit/removeEntry",
        ),

      clearEntries: () =>
        set(
          (state) => {
            state.entries = [];
            state.filteredEntries = [];
            state.selectedEntry = null;
            state.selectedEntryIds = [];
          },
          false,
          "audit/clearEntries",
        ),

      selectEntry: (entry) =>
        set(
          (state) => {
            state.selectedEntry = entry;
          },
          false,
          "audit/selectEntry",
        ),

      toggleEntrySelection: (id) =>
        set(
          (state) => {
            const index = state.selectedEntryIds.indexOf(id);
            if (index === -1) {
              state.selectedEntryIds.push(id);
            } else {
              state.selectedEntryIds.splice(index, 1);
            }
          },
          false,
          "audit/toggleEntrySelection",
        ),

      selectAllEntries: () =>
        set(
          (state) => {
            state.selectedEntryIds = state.filteredEntries.map((e) => e.id);
          },
          false,
          "audit/selectAllEntries",
        ),

      clearSelection: () =>
        set(
          (state) => {
            state.selectedEntryIds = [];
          },
          false,
          "audit/clearSelection",
        ),

      // Filter actions
      setFilters: (filters) =>
        set(
          (state) => {
            state.filters = { ...state.filters, ...filters };
            state.pagination.page = 1;
          },
          false,
          "audit/setFilters",
        ),

      clearFilters: () =>
        set(
          (state) => {
            state.filters = {};
            state.searchQuery = "";
            state.pagination.page = 1;
          },
          false,
          "audit/clearFilters",
        ),

      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
            state.filters.searchQuery = query;
            state.pagination.page = 1;
          },
          false,
          "audit/setSearchQuery",
        ),

      setCategoryFilter: (categories) =>
        set(
          (state) => {
            state.filters.category =
              categories.length > 0 ? categories : undefined;
            state.pagination.page = 1;
          },
          false,
          "audit/setCategoryFilter",
        ),

      setSeverityFilter: (severities) =>
        set(
          (state) => {
            state.filters.severity =
              severities.length > 0 ? severities : undefined;
            state.pagination.page = 1;
          },
          false,
          "audit/setSeverityFilter",
        ),

      setActionFilter: (actions) =>
        set(
          (state) => {
            state.filters.action = actions.length > 0 ? actions : undefined;
            state.pagination.page = 1;
          },
          false,
          "audit/setActionFilter",
        ),

      setDateRangeFilter: (start, end) =>
        set(
          (state) => {
            state.filters.startDate = start;
            state.filters.endDate = end;
            state.pagination.page = 1;
          },
          false,
          "audit/setDateRangeFilter",
        ),

      // Sort actions
      setSort: (sort) =>
        set(
          (state) => {
            state.sort = sort;
          },
          false,
          "audit/setSort",
        ),

      toggleSortDirection: () =>
        set(
          (state) => {
            state.sort.direction =
              state.sort.direction === "asc" ? "desc" : "asc";
          },
          false,
          "audit/toggleSortDirection",
        ),

      // Pagination actions
      setPage: (page) =>
        set(
          (state) => {
            state.pagination.page = page;
          },
          false,
          "audit/setPage",
        ),

      setPageSize: (pageSize) =>
        set(
          (state) => {
            state.pagination.pageSize = pageSize;
            state.pagination.page = 1;
          },
          false,
          "audit/setPageSize",
        ),

      nextPage: () =>
        set(
          (state) => {
            if (state.pagination.page < state.pagination.totalPages) {
              state.pagination.page += 1;
            }
          },
          false,
          "audit/nextPage",
        ),

      previousPage: () =>
        set(
          (state) => {
            if (state.pagination.page > 1) {
              state.pagination.page -= 1;
            }
          },
          false,
          "audit/previousPage",
        ),

      // Settings actions
      setSettings: (settings) =>
        set(
          (state) => {
            state.settings = { ...state.settings, ...settings };
          },
          false,
          "audit/setSettings",
        ),

      addRetentionPolicy: (policy) =>
        set(
          (state) => {
            state.settings.policies.push(policy);
          },
          false,
          "audit/addRetentionPolicy",
        ),

      updateRetentionPolicy: (id, updates) =>
        set(
          (state) => {
            const index = state.settings.policies.findIndex((p) => p.id === id);
            if (index !== -1) {
              state.settings.policies[index] = {
                ...state.settings.policies[index],
                ...updates,
                updatedAt: new Date(),
              };
            }
          },
          false,
          "audit/updateRetentionPolicy",
        ),

      removeRetentionPolicy: (id) =>
        set(
          (state) => {
            state.settings.policies = state.settings.policies.filter(
              (p) => p.id !== id,
            );
          },
          false,
          "audit/removeRetentionPolicy",
        ),

      // Statistics actions
      setStatistics: (statistics) =>
        set(
          (state) => {
            state.statistics = statistics;
          },
          false,
          "audit/setStatistics",
        ),

      refreshStatistics: () =>
        set(
          (state) => {
            const entries = state.entries;
            if (entries.length === 0) {
              state.statistics = null;
              return;
            }

            const eventsByCategory: Record<AuditCategory, number> = {
              user: 0,
              message: 0,
              channel: 0,
              file: 0,
              attachment: 0,
              moderation: 0,
              admin: 0,
              security: 0,
              integration: 0,
            };

            const eventsBySeverity: Record<AuditSeverity, number> = {
              info: 0,
              warning: 0,
              error: 0,
              critical: 0,
            };

            const actionCounts = new Map<AuditAction, number>();
            const actorCounts = new Map<
              string,
              { actor: (typeof entries)[0]["actor"]; count: number }
            >();
            let failedEvents = 0;

            entries.forEach((entry) => {
              eventsByCategory[entry.category]++;
              eventsBySeverity[entry.severity]++;

              if (!entry.success) {
                failedEvents++;
              }

              actionCounts.set(
                entry.action,
                (actionCounts.get(entry.action) ?? 0) + 1,
              );

              const actorKey = entry.actor.id;
              const actorData = actorCounts.get(actorKey);
              if (actorData) {
                actorData.count++;
              } else {
                actorCounts.set(actorKey, { actor: entry.actor, count: 1 });
              }
            });

            // Calculate events by day
            const dayMap = new Map<string, number>();
            entries.forEach((entry) => {
              const date = new Date(entry.timestamp)
                .toISOString()
                .split("T")[0];
              dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
            });

            const eventsByDay = Array.from(dayMap.entries())
              .map(([date, count]) => ({ date, count }))
              .sort((a, b) => a.date.localeCompare(b.date));

            // Top actors
            const topActors = Array.from(actorCounts.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 10);

            // Top actions
            const topActions = Array.from(actionCounts.entries())
              .map(([action, count]) => ({ action, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10);

            state.statistics = {
              totalEvents: entries.length,
              eventsByCategory,
              eventsBySeverity,
              eventsByDay,
              topActors,
              topActions,
              failedEvents,
              successRate:
                ((entries.length - failedEvents) / entries.length) * 100,
            };
          },
          false,
          "audit/refreshStatistics",
        ),

      // Loading actions
      setLoading: (loading) =>
        set(
          (state) => {
            state.isLoading = loading;
          },
          false,
          "audit/setLoading",
        ),

      setLoadingMore: (loading) =>
        set(
          (state) => {
            state.isLoadingMore = loading;
          },
          false,
          "audit/setLoadingMore",
        ),

      setExporting: (exporting) =>
        set(
          (state) => {
            state.isExporting = exporting;
          },
          false,
          "audit/setExporting",
        ),

      setSavingSettings: (saving) =>
        set(
          (state) => {
            state.isSavingSettings = saving;
          },
          false,
          "audit/setSavingSettings",
        ),

      // Error actions
      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "audit/setError",
        ),

      // Real-time actions
      setRealTimeEnabled: (enabled) =>
        set(
          (state) => {
            state.isRealTimeEnabled = enabled;
          },
          false,
          "audit/setRealTimeEnabled",
        ),

      setLastRefresh: (date) =>
        set(
          (state) => {
            state.lastRefresh = date;
          },
          false,
          "audit/setLastRefresh",
        ),

      // Utility actions
      applyFiltersAndSort: () =>
        set(
          (state) => {
            const result = queryAuditLogs(state.entries, {
              filters: state.filters,
              sort: state.sort,
              page: state.pagination.page,
              pageSize: state.pagination.pageSize,
            });
            state.filteredEntries = result.entries;
            state.pagination = result.pagination;
          },
          false,
          "audit/applyFiltersAndSort",
        ),

      reset: () => set(() => initialState, false, "audit/reset"),
    })),
    { name: "audit-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAuditEntries = (state: AuditStore) => state.entries;
export const selectFilteredEntries = (state: AuditStore) =>
  state.filteredEntries;
export const selectSelectedEntry = (state: AuditStore) => state.selectedEntry;
export const selectSelectedEntryIds = (state: AuditStore) =>
  state.selectedEntryIds;
export const selectFilters = (state: AuditStore) => state.filters;
export const selectSort = (state: AuditStore) => state.sort;
export const selectPagination = (state: AuditStore) => state.pagination;
export const selectSettings = (state: AuditStore) => state.settings;
export const selectStatistics = (state: AuditStore) => state.statistics;
export const selectIsLoading = (state: AuditStore) => state.isLoading;
export const selectError = (state: AuditStore) => state.error;

export const selectEntriesByCategory =
  (category: AuditCategory) => (state: AuditStore) =>
    state.entries.filter((e) => e.category === category);

export const selectEntriesBySeverity =
  (severity: AuditSeverity) => (state: AuditStore) =>
    state.entries.filter((e) => e.severity === severity);

export const selectSecurityEntries = (state: AuditStore) =>
  state.entries.filter((e) => e.category === "security");

export const selectAdminEntries = (state: AuditStore) =>
  state.entries.filter((e) => e.category === "admin");

export const selectRecentEntries = (limit: number) => (state: AuditStore) =>
  state.entries.slice(0, limit);

export const selectFailedEntries = (state: AuditStore) =>
  state.entries.filter((e) => !e.success);

export const selectCriticalEntries = (state: AuditStore) =>
  state.entries.filter(
    (e) => e.severity === "critical" || e.severity === "error",
  );
