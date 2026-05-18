/**
 * useActivity Hook
 *
 * Hook for accessing activity-related functionality
 */

"use client";

import { useCallback } from "react";
import { useActivityStore } from "@/stores/activity-store";
import type {
  Activity,
  AggregatedActivity,
  ActivityCategory,
  ActivityFilters,
} from "@/lib/activity/activity-types";
import {
  isAggregatedActivity,
  flattenAggregatedActivities,
} from "@/lib/activity/activity-aggregator";
import { getActivityActionUrl } from "@/lib/activity/activity-formatter";

export interface UseActivityReturn {
  // State
  activities: (Activity | AggregatedActivity)[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Filters
  filters: ActivityFilters;
  activeCategory: ActivityCategory;
  setFilters: (filters: ActivityFilters) => void;
  setActiveCategory: (category: ActivityCategory) => void;
  clearFilters: () => void;

  // Actions
  markAsRead: (activityId: string) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Utilities
  getActivityById: (id: string) => Activity | undefined;
  navigateToActivity: (activity: Activity | AggregatedActivity) => void;
}

export function useActivity(): UseActivityReturn {
  // Store state
  const activities = useActivityStore((state) => state.processedActivities);
  const isLoading = useActivityStore((state) => state.isLoading);
  const error = useActivityStore((state) => state.error);
  const hasMore = useActivityStore((state) => state.hasMore);
  const filters = useActivityStore((state) => state.filters);
  const activeCategory = useActivityStore((state) => state.activeCategory);

  // Store actions
  const storeSetFilters = useActivityStore((state) => state.setFilters);
  const storeSetActiveCategory = useActivityStore(
    (state) => state.setActiveCategory,
  );
  const storeClearFilters = useActivityStore((state) => state.clearFilters);
  const storeMarkAsRead = useActivityStore((state) => state.markAsRead);
  const storeMarkAllAsRead = useActivityStore((state) => state.markAllAsRead);
  const storeRefresh = useActivityStore((state) => state.refresh);
  const storeLoadMore = useActivityStore((state) => state.loadMore);
  const storeGetActivityById = useActivityStore(
    (state) => state.getActivityById,
  );

  // Filter handlers
  const setFilters = useCallback(
    (newFilters: ActivityFilters) => {
      storeSetFilters(newFilters);
    },
    [storeSetFilters],
  );

  const setActiveCategory = useCallback(
    (category: ActivityCategory) => {
      storeSetActiveCategory(category);
    },
    [storeSetActiveCategory],
  );

  const clearFilters = useCallback(() => {
    storeClearFilters();
  }, [storeClearFilters]);

  // Read state handlers
  const markAsRead = useCallback(
    (activityId: string) => {
      storeMarkAsRead(activityId);
    },
    [storeMarkAsRead],
  );

  const markAllAsRead = useCallback(() => {
    storeMarkAllAsRead();
  }, [storeMarkAllAsRead]);

  // Data fetching
  const refresh = useCallback(async () => {
    await storeRefresh();
  }, [storeRefresh]);

  const loadMore = useCallback(async () => {
    await storeLoadMore();
  }, [storeLoadMore]);

  // Utilities
  const getActivityById = useCallback(
    (id: string) => {
      return storeGetActivityById(id);
    },
    [storeGetActivityById],
  );

  const navigateToActivity = useCallback(
    (activity: Activity | AggregatedActivity) => {
      const targetActivity = isAggregatedActivity(activity)
        ? activity.activities[0]
        : activity;

      const url = getActivityActionUrl(targetActivity);
      if (url) {
        // Mark as read before navigating
        if (!targetActivity.isRead) {
          markAsRead(targetActivity.id);
        }
        // Navigate
        window.location.href = url;
      }
    },
    [markAsRead],
  );

  return {
    // State
    activities,
    isLoading,
    error,
    hasMore,

    // Filters
    filters,
    activeCategory,
    setFilters,
    setActiveCategory,
    clearFilters,

    // Actions
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,

    // Utilities
    getActivityById,
    navigateToActivity,
  };
}

export default useActivity;
