/**
 * useAnalyticsDashboard Hook - For consuming analytics dashboard data
 *
 * Manages fetching and state for analytics dashboards.
 * Uses the analytics store for state management.
 */

import { useEffect, useCallback } from "react";
import {
  useAnalyticsStore,
  type AnalyticsViewType,
} from "@/stores/analytics-store";
import type {
  DateRange,
  TimeGranularity,
  AnalyticsSectionType,
  ExportFormat,
} from "@/lib/analytics/analytics-types";

// ============================================================================
// Main Hook
// ============================================================================

export function useAnalyticsDashboard() {
  const store = useAnalyticsStore();

  // Auto-fetch dashboard data on mount
  useEffect(() => {
    if (!store.dashboardData && !store.isLoading) {
      store.fetchDashboardData();
    }
  }, [store]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const hasData = store.dashboardData !== null;
  const hasError = store.error !== null;
  const isReady = hasData && !store.isLoading;

  // ============================================================================
  // Methods
  // ============================================================================

  const refresh = useCallback(async () => {
    await store.refreshData();
  }, [store]);

  const setView = useCallback(
    (view: AnalyticsViewType) => {
      store.setCurrentView(view);

      // Auto-fetch section data if not loaded
      const sectionMap: Record<AnalyticsViewType, AnalyticsSectionType | null> =
        {
          overview: null,
          messages: "messages",
          users: "users",
          channels: "channels",
          reactions: "reactions",
          files: "files",
          search: "search",
          bots: "bots",
          reports: null,
        };

      const section = sectionMap[view];
      if (section) {
        store.fetchSectionData(section);
      }
    },
    [store],
  );

  const exportData = useCallback(
    async (format: ExportFormat, sections: AnalyticsSectionType[]) => {
      await store.exportData(format, sections);
    },
    [store],
  );

  return {
    // State
    currentView: store.currentView,
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    hasData,
    hasError,
    isReady,

    // Data
    dashboardData: store.dashboardData,
    summary: store.summary,
    messageVolume: store.messageVolume,
    userActivity: store.userActivity,
    channelActivity: store.channelActivity,
    reactions: store.reactions,
    fileUploads: store.fileUploads,
    searchQueries: store.searchQueries,
    peakHours: store.peakHours,
    topMessages: store.topMessages,
    inactiveUsers: store.inactiveUsers,
    userGrowth: store.userGrowth,
    activeUsers: store.activeUsers,

    // Filters
    dateRange: store.dateRange,
    dateRangePreset: store.dateRangePreset,
    granularity: store.granularity,
    selectedChannelIds: store.selectedChannelIds,
    selectedUserIds: store.selectedUserIds,
    includeBots: store.includeBots,

    // Comparison
    comparisonEnabled: store.comparisonEnabled,
    comparisonData: store.comparisonData,

    // Reports
    scheduledReports: store.scheduledReports,
    reportHistory: store.reportHistory,

    // Export
    isExporting: store.isExporting,
    exportProgress: store.exportProgress,

    // Methods
    refresh,
    setView,
    setDateRange: store.setDateRange,
    setDateRangePreset: store.setDateRangePreset,
    setGranularity: store.setGranularity,
    setSelectedChannels: store.setSelectedChannels,
    setSelectedUsers: store.setSelectedUsers,
    toggleIncludeBots: store.toggleIncludeBots,
    resetFilters: store.resetFilters,
    toggleComparison: store.toggleComparison,
    fetchComparisonData: store.fetchComparisonData,
    exportData,
    clearError: store.clearError,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for specific analytics sections
 */
export function useAnalyticsSection(section: AnalyticsSectionType) {
  const store = useAnalyticsStore();

  useEffect(() => {
    if (store.currentView !== "overview") {
      store.fetchSectionData(section);
    }
  }, [section, store]);

  return {
    isLoading: store.isLoading,
    error: store.error,
    refresh: () => store.fetchSectionData(section),
  };
}

/**
 * Hook for message analytics
 */
export function useMessageAnalytics() {
  const { messageVolume, topMessages, summary, isLoading, error } =
    useAnalyticsDashboard();

  return {
    volume: messageVolume,
    topMessages,
    stats: summary?.messages,
    isLoading,
    error,
  };
}

/**
 * Hook for user analytics
 */
export function useUserAnalytics() {
  const {
    userActivity,
    inactiveUsers,
    userGrowth,
    activeUsers,
    summary,
    isLoading,
    error,
  } = useAnalyticsDashboard();

  return {
    activity: userActivity,
    inactiveUsers,
    growth: userGrowth,
    activeUsers,
    stats: summary?.users,
    isLoading,
    error,
  };
}

/**
 * Hook for channel analytics
 */
export function useChannelAnalytics() {
  const { channelActivity, summary, isLoading, error } =
    useAnalyticsDashboard();

  return {
    activity: channelActivity,
    stats: summary?.channels,
    isLoading,
    error,
  };
}

/**
 * Hook for reaction analytics
 */
export function useReactionAnalytics() {
  const { reactions, summary, isLoading, error } = useAnalyticsDashboard();

  return {
    reactions,
    stats: summary?.reactions,
    isLoading,
    error,
  };
}

/**
 * Hook for file analytics
 */
export function useFileAnalytics() {
  const { fileUploads, summary, isLoading, error } = useAnalyticsDashboard();

  return {
    uploads: fileUploads,
    stats: summary?.files,
    isLoading,
    error,
  };
}

/**
 * Hook for search analytics
 */
export function useSearchAnalytics() {
  const { searchQueries, summary, isLoading, error } = useAnalyticsDashboard();

  return {
    queries: searchQueries,
    stats: summary?.search,
    isLoading,
    error,
  };
}

/**
 * Hook for peak hours analytics
 */
export function usePeakHoursAnalytics() {
  const { peakHours, isLoading, error } = useAnalyticsDashboard();

  return {
    hours: peakHours,
    isLoading,
    error,
  };
}

/**
 * Hook for date range management
 */
export function useDateRangeFilter() {
  const {
    dateRange,
    dateRangePreset,
    setDateRange,
    setDateRangePreset,
    granularity,
    setGranularity,
  } = useAnalyticsDashboard();

  const setRange = useCallback(
    (start: Date, end: Date) => {
      setDateRange({ start, end, preset: "custom" });
    },
    [setDateRange],
  );

  const setPreset = useCallback(
    (preset: typeof dateRangePreset) => {
      setDateRangePreset(preset);
    },
    [setDateRangePreset],
  );

  return {
    dateRange,
    dateRangePreset,
    granularity,
    setRange,
    setPreset,
    setGranularity,
  };
}

/**
 * Hook for comparison mode
 */
export function useAnalyticsComparison() {
  const {
    comparisonEnabled,
    comparisonData,
    dashboardData,
    toggleComparison,
    fetchComparisonData,
    isLoading,
  } = useAnalyticsDashboard();

  useEffect(() => {
    if (comparisonEnabled && !comparisonData && !isLoading) {
      fetchComparisonData();
    }
  }, [comparisonEnabled, comparisonData, isLoading, fetchComparisonData]);

  const calculateChange = useCallback(
    (
      current: number | undefined,
      previous: number | undefined,
    ): { value: number; percentage: number } | null => {
      if (current === undefined || previous === undefined) return null;

      const change = current - previous;
      const percentage = previous > 0 ? (change / previous) * 100 : 0;

      return { value: change, percentage };
    },
    [],
  );

  return {
    enabled: comparisonEnabled,
    currentData: dashboardData,
    comparisonData,
    toggleComparison,
    calculateChange,
    isLoading,
  };
}

/**
 * Hook for real-time updates
 */
export function useRealtimeAnalytics(intervalMs: number = 30000) {
  const { refresh, isLoading } = useAnalyticsDashboard();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refresh();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refresh, isLoading, intervalMs]);
}
