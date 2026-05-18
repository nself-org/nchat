/**
 * useAdminStats Hook - Admin statistics management
 *
 * Provides functionality to fetch dashboard stats, handle real-time updates,
 * and manage date range selection.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAdminDashboardStore } from "@/stores/admin-dashboard-store";
import {
  aggregateDashboardStats,
  calculatePercentageChange,
  calculateTrend,
  type DashboardStats,
  type UserStatsInput,
  type MessageStatsInput,
  type ChannelStatsInput,
  type StorageStatsInput,
  type DateRange,
} from "@/lib/admin/stats-aggregator";

// ============================================================================
// Types
// ============================================================================

export interface UseAdminStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface StatsComparison {
  field: string;
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down" | "stable";
}

export interface UseAdminStatsReturn {
  stats: DashboardStats | null;
  previousStats: DashboardStats | null;
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setDateRange: (range: DateRange) => void;
  clearError: () => void;

  // Computed
  userGrowth: number | null;
  messageGrowth: number | null;
  channelGrowth: number | null;
  storageGrowth: number | null;
  comparisons: StatsComparison[];
}

// ============================================================================
// Mock Data Fetcher (Replace with actual API calls)
// ============================================================================

async function fetchDashboardData(dateRange: DateRange): Promise<{
  users: UserStatsInput[];
  messages: MessageStatsInput[];
  channels: ChannelStatsInput[];
  storage: StorageStatsInput;
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // This would be replaced with actual API calls
  return {
    users: [],
    messages: [],
    channels: [],
    storage: { used: 0, limit: 5 * 1024 * 1024 * 1024 },
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAdminStats(
  options: UseAdminStatsOptions = {},
): UseAdminStatsReturn {
  const { autoRefresh = false, refreshInterval = 60000 } = options;

  const {
    stats,
    previousStats,
    statsDateRange: dateRange,
    isLoadingStats: isLoading,
    statsError: error,
    statsLastUpdated: lastUpdated,
    setStats,
    setPreviousStats,
    setStatsDateRange,
    setLoadingStats,
    setStatsError,
    refreshStats: storeRefreshStats,
  } = useAdminDashboardStore();

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoadingStats(true);

    try {
      const data = await fetchDashboardData(dateRange);

      if (!isMountedRef.current) return;

      const aggregatedStats = aggregateDashboardStats(
        data.users,
        data.messages,
        data.channels,
        data.storage,
      );

      setStats(aggregatedStats);
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch stats";
      setStatsError(errorMessage);
    }
  }, [dateRange, setStats, setLoadingStats, setStatsError]);

  // Refresh stats (preserves previous for comparison)
  const refreshStats = useCallback(async () => {
    if (stats) {
      setPreviousStats(stats);
    }
    storeRefreshStats();
    await fetchStats();
  }, [stats, setPreviousStats, storeRefreshStats, fetchStats]);

  // Set date range
  const setDateRange = useCallback(
    (range: DateRange) => {
      setStatsDateRange(range);
    },
    [setStatsDateRange],
  );

  // Clear error
  const clearError = useCallback(() => {
    setStatsError(null);
  }, [setStatsError]);

  // Calculate growth percentages
  const userGrowth = calculateGrowthValue(
    stats?.users.total,
    previousStats?.users.total,
  );
  const messageGrowth = calculateGrowthValue(
    stats?.messages.total,
    previousStats?.messages.total,
  );
  const channelGrowth = calculateGrowthValue(
    stats?.channels.total,
    previousStats?.channels.total,
  );
  const storageGrowth = calculateGrowthValue(
    stats?.storage.used,
    previousStats?.storage.used,
  );

  // Generate comparisons
  const comparisons: StatsComparison[] = generateComparisons(
    stats,
    previousStats,
  );

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshStats();
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshStats]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!stats && !isLoading && !error) {
      fetchStats();
    }
  }, [stats, isLoading, error, fetchStats]);

  return {
    stats,
    previousStats,
    dateRange,
    isLoading,
    error,
    lastUpdated,
    fetchStats,
    refreshStats,
    setDateRange,
    clearError,
    userGrowth,
    messageGrowth,
    channelGrowth,
    storageGrowth,
    comparisons,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateGrowthValue(
  current?: number,
  previous?: number,
): number | null {
  if (current === undefined || previous === undefined) {
    return null;
  }
  return calculatePercentageChange(current, previous);
}

function generateComparisons(
  stats: DashboardStats | null,
  previousStats: DashboardStats | null,
): StatsComparison[] {
  if (!stats || !previousStats) {
    return [];
  }

  const comparisons: StatsComparison[] = [];

  // User comparisons
  comparisons.push(
    createComparison(
      "Total Users",
      stats.users.total,
      previousStats.users.total,
    ),
    createComparison(
      "Active Users",
      stats.users.active,
      previousStats.users.active,
    ),
    createComparison("New Users", stats.users.new, previousStats.users.new),
  );

  // Message comparisons
  comparisons.push(
    createComparison(
      "Total Messages",
      stats.messages.total,
      previousStats.messages.total,
    ),
    createComparison(
      "Messages Today",
      stats.messages.today,
      previousStats.messages.today,
    ),
    createComparison(
      "Avg Messages/Day",
      stats.messages.avgPerDay,
      previousStats.messages.avgPerDay,
    ),
  );

  // Channel comparisons
  comparisons.push(
    createComparison(
      "Total Channels",
      stats.channels.total,
      previousStats.channels.total,
    ),
    createComparison(
      "Public Channels",
      stats.channels.public,
      previousStats.channels.public,
    ),
    createComparison(
      "Private Channels",
      stats.channels.private,
      previousStats.channels.private,
    ),
  );

  // Storage comparisons
  comparisons.push(
    createComparison(
      "Storage Used",
      stats.storage.used,
      previousStats.storage.used,
    ),
    createComparison(
      "Storage %",
      stats.storage.percentage,
      previousStats.storage.percentage,
    ),
  );

  return comparisons;
}

function createComparison(
  field: string,
  current: number,
  previous: number,
): StatsComparison {
  return {
    field,
    current,
    previous,
    change: calculatePercentageChange(current, previous),
    trend: calculateTrend(current, previous),
  };
}

// ============================================================================
// Additional Utility Hooks
// ============================================================================

/**
 * Hook to get user stats only
 */
export function useUserStats() {
  const { stats, isLoading, error } = useAdminStats();

  return {
    users: stats?.users ?? null,
    isLoading,
    error,
  };
}

/**
 * Hook to get message stats only
 */
export function useMessageStats() {
  const { stats, isLoading, error } = useAdminStats();

  return {
    messages: stats?.messages ?? null,
    isLoading,
    error,
  };
}

/**
 * Hook to get channel stats only
 */
export function useChannelStats() {
  const { stats, isLoading, error } = useAdminStats();

  return {
    channels: stats?.channels ?? null,
    isLoading,
    error,
  };
}

/**
 * Hook to get storage stats only
 */
export function useStorageStats() {
  const { stats, isLoading, error } = useAdminStats();

  return {
    storage: stats?.storage ?? null,
    isLoading,
    error,
  };
}

export default useAdminStats;
