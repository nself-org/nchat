/**
 * useAdminStats Hook Unit Tests
 *
 * Tests for the admin statistics hook including fetching,
 * refreshing, date range selection, and computed values.
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useAdminStats,
  useUserStats,
  useMessageStats,
  useChannelStats,
  useStorageStats,
} from "../use-admin-stats";
import { useAdminDashboardStore } from "@/stores/admin-dashboard-store";
import type { DashboardStats } from "@/lib/admin/stats-aggregator";

// ============================================================================
// Test Data
// ============================================================================

const createTestStats = (
  overrides?: Partial<DashboardStats>,
): DashboardStats => ({
  users: {
    total: 100,
    active: 80,
    new: 10,
    growth: 10,
  },
  messages: {
    total: 1000,
    today: 50,
    avgPerDay: 100,
    peakHour: 14,
  },
  channels: {
    total: 20,
    public: 15,
    private: 5,
    mostActive: ["general", "random"],
  },
  storage: {
    used: 1000000000,
    limit: 5000000000,
    percentage: 20,
  },
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("useAdminStats Hook", () => {
  beforeEach(() => {
    act(() => {
      useAdminDashboardStore.getState().reset();
    });
  });

  // ==========================================================================
  // Basic Functionality Tests
  // ==========================================================================

  describe("Basic Functionality", () => {
    it("should return initial state", () => {
      const { result } = renderHook(() => useAdminStats());

      expect(result.current.stats).toBeNull();
      expect(result.current.previousStats).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should have date range", () => {
      const { result } = renderHook(() => useAdminStats());

      expect(result.current.dateRange).toBeDefined();
      expect(result.current.dateRange.start).toBeInstanceOf(Date);
      expect(result.current.dateRange.end).toBeInstanceOf(Date);
    });

    it("should provide action functions", () => {
      const { result } = renderHook(() => useAdminStats());

      expect(typeof result.current.fetchStats).toBe("function");
      expect(typeof result.current.refreshStats).toBe("function");
      expect(typeof result.current.setDateRange).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  // ==========================================================================
  // Stats State Tests
  // ==========================================================================

  describe("Stats State", () => {
    it("should return stats from store", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.stats).toEqual(stats);
    });

    it("should return loading state", () => {
      act(() => {
        useAdminDashboardStore.getState().setLoadingStats(true);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.isLoading).toBe(true);
    });

    it("should return error state", () => {
      act(() => {
        useAdminDashboardStore.getState().setStatsError("Test error");
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.error).toBe("Test error");
    });

    it("should return last updated timestamp", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // Date Range Tests
  // ==========================================================================

  describe("Date Range", () => {
    it("should update date range", () => {
      const { result } = renderHook(() => useAdminStats());

      const newRange = {
        start: new Date("2025-01-01"),
        end: new Date("2025-01-31"),
      };

      act(() => {
        result.current.setDateRange(newRange);
      });

      expect(result.current.dateRange).toEqual(newRange);
    });
  });

  // ==========================================================================
  // Growth Calculations Tests
  // ==========================================================================

  describe("Growth Calculations", () => {
    it("should calculate user growth", () => {
      const current = createTestStats({
        users: { total: 110, active: 80, new: 10, growth: 10 },
      });
      const previous = createTestStats({
        users: { total: 100, active: 80, new: 10, growth: 10 },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.userGrowth).toBe(10);
    });

    it("should calculate message growth", () => {
      const current = createTestStats({
        messages: { total: 1100, today: 50, avgPerDay: 100, peakHour: 14 },
      });
      const previous = createTestStats({
        messages: { total: 1000, today: 50, avgPerDay: 100, peakHour: 14 },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.messageGrowth).toBe(10);
    });

    it("should calculate channel growth", () => {
      const current = createTestStats({
        channels: { total: 22, public: 15, private: 7, mostActive: [] },
      });
      const previous = createTestStats({
        channels: { total: 20, public: 15, private: 5, mostActive: [] },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.channelGrowth).toBe(10);
    });

    it("should calculate storage growth", () => {
      const current = createTestStats({
        storage: { used: 2000000000, limit: 5000000000, percentage: 40 },
      });
      const previous = createTestStats({
        storage: { used: 1000000000, limit: 5000000000, percentage: 20 },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.storageGrowth).toBe(100);
    });

    it("should return null growth without previous stats", () => {
      const current = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.userGrowth).toBeNull();
      expect(result.current.messageGrowth).toBeNull();
      expect(result.current.channelGrowth).toBeNull();
      expect(result.current.storageGrowth).toBeNull();
    });
  });

  // ==========================================================================
  // Comparisons Tests
  // ==========================================================================

  describe("Comparisons", () => {
    it("should generate comparisons when both stats exist", () => {
      const current = createTestStats();
      const previous = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.comparisons.length).toBeGreaterThan(0);
    });

    it("should return empty comparisons without previous stats", () => {
      const current = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.comparisons.length).toBe(0);
    });

    it("should include user comparisons", () => {
      const current = createTestStats();
      const previous = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      const userComparisons = result.current.comparisons.filter((c) =>
        c.field.toLowerCase().includes("user"),
      );
      expect(userComparisons.length).toBeGreaterThan(0);
    });

    it("should have correct comparison structure", () => {
      const current = createTestStats();
      const previous = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      const comparison = result.current.comparisons[0];
      expect(comparison).toHaveProperty("field");
      expect(comparison).toHaveProperty("current");
      expect(comparison).toHaveProperty("previous");
      expect(comparison).toHaveProperty("change");
      expect(comparison).toHaveProperty("trend");
    });

    it("should calculate correct trend", () => {
      const current = createTestStats({
        users: { total: 110, active: 80, new: 10, growth: 10 },
      });
      const previous = createTestStats({
        users: { total: 100, active: 80, new: 10, growth: 10 },
      });

      act(() => {
        useAdminDashboardStore.getState().setStats(current);
        useAdminDashboardStore.getState().setPreviousStats(previous);
      });

      const { result } = renderHook(() => useAdminStats());

      const totalUsersComparison = result.current.comparisons.find(
        (c) => c.field === "Total Users",
      );
      expect(totalUsersComparison?.trend).toBe("up");
    });
  });

  // ==========================================================================
  // Clear Error Tests
  // ==========================================================================

  describe("Clear Error", () => {
    it("should clear error", () => {
      act(() => {
        useAdminDashboardStore.getState().setStatsError("Test error");
      });

      const { result } = renderHook(() => useAdminStats());

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ==========================================================================
  // Refresh Tests
  // ==========================================================================

  describe("Refresh", () => {
    it("should preserve previous stats on refresh", async () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useAdminStats());

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(result.current.previousStats).toEqual(stats);
    });
  });
});

// ============================================================================
// Utility Hook Tests
// ============================================================================

describe("Utility Hooks", () => {
  beforeEach(() => {
    act(() => {
      useAdminDashboardStore.getState().reset();
    });
  });

  describe("useUserStats", () => {
    it("should return user stats", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useUserStats());

      expect(result.current.users).toEqual(stats.users);
    });

    it("should return null when no stats", () => {
      const { result } = renderHook(() => useUserStats());

      expect(result.current.users).toBeNull();
    });

    it("should return loading state", () => {
      act(() => {
        useAdminDashboardStore.getState().setLoadingStats(true);
      });

      const { result } = renderHook(() => useUserStats());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useMessageStats", () => {
    it("should return message stats", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useMessageStats());

      expect(result.current.messages).toEqual(stats.messages);
    });

    it("should return null when no stats", () => {
      const { result } = renderHook(() => useMessageStats());

      expect(result.current.messages).toBeNull();
    });
  });

  describe("useChannelStats", () => {
    it("should return channel stats", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useChannelStats());

      expect(result.current.channels).toEqual(stats.channels);
    });

    it("should return null when no stats", () => {
      const { result } = renderHook(() => useChannelStats());

      expect(result.current.channels).toBeNull();
    });
  });

  describe("useStorageStats", () => {
    it("should return storage stats", () => {
      const stats = createTestStats();

      act(() => {
        useAdminDashboardStore.getState().setStats(stats);
      });

      const { result } = renderHook(() => useStorageStats());

      expect(result.current.storage).toEqual(stats.storage);
    });

    it("should return null when no stats", () => {
      const { result } = renderHook(() => useStorageStats());

      expect(result.current.storage).toBeNull();
    });
  });
});
