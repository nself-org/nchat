/**
 * useActivityFeed Hook
 *
 * Comprehensive hook for managing the activity feed with real-time updates
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import { useActivityStore } from "@/stores/activity-store";
import type {
  Activity,
  AggregatedActivity,
  ActivityCategory,
  ActivityFilters,
  ActivityPreferences,
  DateGroupedActivities,
} from "@/lib/activity/activity-types";
import { groupActivitiesByDateGroup } from "@/lib/activity/activity-manager";
import { isAggregatedActivity } from "@/lib/activity/activity-aggregator";

export interface UseActivityFeedOptions {
  /**
   * Initial filters to apply
   */
  initialFilters?: ActivityFilters;

  /**
   * Initial category to show
   */
  initialCategory?: ActivityCategory;

  /**
   * Enable real-time updates via socket
   */
  realtime?: boolean;

  /**
   * Auto-refresh interval in milliseconds (0 to disable)
   */
  autoRefreshInterval?: number;

  /**
   * Callback when a new activity is received
   */
  onNewActivity?: (activity: Activity) => void;

  /**
   * Callback when activities are marked as read
   */
  onMarkAsRead?: (activityIds: string[]) => void;
}

export interface UseActivityFeedReturn {
  // Activities
  activities: (Activity | AggregatedActivity)[];
  groupedActivities: DateGroupedActivities[];
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;

  // Filters
  filters: ActivityFilters;
  activeCategory: ActivityCategory;
  setFilters: (filters: ActivityFilters) => void;
  setCategory: (category: ActivityCategory) => void;
  clearFilters: () => void;

  // Unread state
  unreadCount: number;
  unreadByCategory: Partial<Record<ActivityCategory, number>>;
  hasNewActivity: boolean;

  // Actions
  markAsRead: (activityId: string) => void;
  markMultipleAsRead: (activityIds: string[]) => void;
  markAllAsRead: () => void;
  markCategoryAsRead: (category: ActivityCategory) => void;

  // Data fetching
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Preferences
  preferences: ActivityPreferences;
  updatePreferences: (updates: Partial<ActivityPreferences>) => void;

  // UI state
  isActivityPanelOpen: boolean;
  toggleActivityPanel: () => void;
  selectedActivityId: string | null;
  selectActivity: (id: string | null) => void;
}

export function useActivityFeed(
  options: UseActivityFeedOptions = {},
): UseActivityFeedReturn {
  const {
    initialFilters,
    initialCategory,
    realtime = true,
    autoRefreshInterval = 0,
    onNewActivity,
    onMarkAsRead,
  } = options;

  const previousActivitiesCountRef = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Store state
  const activities = useActivityStore((state) => state.processedActivities);
  const rawActivities = useActivityStore((state) => state.activities);
  const totalCount = useActivityStore((state) => state.totalCount);
  const isLoading = useActivityStore((state) => state.isLoading);
  const isLoadingMore = useActivityStore((state) => state.isLoadingMore);
  const error = useActivityStore((state) => state.error);
  const hasMore = useActivityStore((state) => state.hasMore);
  const filters = useActivityStore((state) => state.filters);
  const activeCategory = useActivityStore((state) => state.activeCategory);
  const unreadCounts = useActivityStore((state) => state.unreadCounts);
  const hasNewActivity = useActivityStore((state) => state.hasNewActivity);
  const preferences = useActivityStore((state) => state.preferences);
  const isActivityPanelOpen = useActivityStore(
    (state) => state.isActivityPanelOpen,
  );
  const selectedActivityId = useActivityStore(
    (state) => state.selectedActivityId,
  );

  // Store actions
  const setFilters = useActivityStore((state) => state.setFilters);
  const setActiveCategory = useActivityStore(
    (state) => state.setActiveCategory,
  );
  const clearFilters = useActivityStore((state) => state.clearFilters);
  const markAsRead = useActivityStore((state) => state.markAsRead);
  const markMultipleAsRead = useActivityStore(
    (state) => state.markMultipleAsRead,
  );
  const markAllAsRead = useActivityStore((state) => state.markAllAsRead);
  const markCategoryAsRead = useActivityStore(
    (state) => state.markCategoryAsRead,
  );
  const storeRefresh = useActivityStore((state) => state.refresh);
  const storeLoadMore = useActivityStore((state) => state.loadMore);
  const updatePreferences = useActivityStore(
    (state) => state.updatePreferences,
  );
  const toggleActivityPanel = useActivityStore(
    (state) => state.toggleActivityPanel,
  );
  const selectActivity = useActivityStore((state) => state.selectActivity);
  const addActivity = useActivityStore((state) => state.addActivity);
  const setHasNewActivity = useActivityStore(
    (state) => state.setHasNewActivity,
  );

  // Group activities by date
  const groupedActivities = groupActivitiesByDateGroup(activities);

  // Initialize filters and category
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, []); // Only run once on mount

  // Watch for new activities
  useEffect(() => {
    const currentCount = rawActivities.length;
    if (
      currentCount > previousActivitiesCountRef.current &&
      previousActivitiesCountRef.current > 0
    ) {
      const latestActivity = rawActivities[0];
      if (latestActivity && !latestActivity.isRead) {
        onNewActivity?.(latestActivity);
      }
    }
    previousActivitiesCountRef.current = currentCount;
  }, [rawActivities, onNewActivity]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        storeRefresh();
      }, autoRefreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefreshInterval, storeRefresh]);

  // Wrapped mark as read with callback
  const handleMarkAsRead = useCallback(
    (activityId: string) => {
      markAsRead(activityId);
      onMarkAsRead?.([activityId]);
    },
    [markAsRead, onMarkAsRead],
  );

  const handleMarkMultipleAsRead = useCallback(
    (activityIds: string[]) => {
      markMultipleAsRead(activityIds);
      onMarkAsRead?.(activityIds);
    },
    [markMultipleAsRead, onMarkAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    const unreadIds = rawActivities.filter((a) => !a.isRead).map((a) => a.id);
    markAllAsRead();
    onMarkAsRead?.(unreadIds);
  }, [markAllAsRead, rawActivities, onMarkAsRead]);

  const handleMarkCategoryAsRead = useCallback(
    (category: ActivityCategory) => {
      const unreadIds = rawActivities
        .filter((a) => !a.isRead && a.category === category)
        .map((a) => a.id);
      markCategoryAsRead(category);
      onMarkAsRead?.(unreadIds);
    },
    [markCategoryAsRead, rawActivities, onMarkAsRead],
  );

  // Refresh handler
  const refresh = useCallback(async () => {
    await storeRefresh();
  }, [storeRefresh]);

  // Load more handler
  const loadMore = useCallback(async () => {
    await storeLoadMore();
  }, [storeLoadMore]);

  // Set category handler
  const setCategory = useCallback(
    (category: ActivityCategory) => {
      setActiveCategory(category);
    },
    [setActiveCategory],
  );

  return {
    // Activities
    activities,
    groupedActivities,
    totalCount,

    // Loading states
    isLoading,
    isLoadingMore,
    isRefreshing: isLoading,
    error,
    hasMore,

    // Filters
    filters,
    activeCategory,
    setFilters,
    setCategory,
    clearFilters,

    // Unread state
    unreadCount: unreadCounts.total,
    unreadByCategory: unreadCounts.byCategory,
    hasNewActivity,

    // Actions
    markAsRead: handleMarkAsRead,
    markMultipleAsRead: handleMarkMultipleAsRead,
    markAllAsRead: handleMarkAllAsRead,
    markCategoryAsRead: handleMarkCategoryAsRead,

    // Data fetching
    refresh,
    loadMore,

    // Preferences
    preferences,
    updatePreferences,

    // UI state
    isActivityPanelOpen,
    toggleActivityPanel,
    selectedActivityId,
    selectActivity,
  };
}

export default useActivityFeed;
