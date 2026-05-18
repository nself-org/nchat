/**
 * useUnreadActivity Hook
 *
 * Hook for tracking unread activity counts and new activity notifications
 */

"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useActivityStore } from "@/stores/activity-store";
import type { ActivityCategory } from "@/lib/activity/activity-types";

export interface UseUnreadActivityOptions {
  /**
   * Categories to track (default: all)
   */
  categories?: ActivityCategory[];

  /**
   * Enable polling for unread count updates
   */
  pollInterval?: number;

  /**
   * Callback when unread count changes
   */
  onUnreadChange?: (count: number) => void;
}

export interface UseUnreadActivityReturn {
  // Counts
  totalUnread: number;
  unreadByCategory: Partial<Record<ActivityCategory, number>>;

  // State
  hasNewActivity: boolean;
  lastSeenAt: string | null;

  // Actions
  markAllAsRead: () => void;
  markCategoryAsRead: (category: ActivityCategory) => void;
  clearNewActivityFlag: () => void;

  // Computed
  hasUnread: boolean;
  hasUnreadInCategory: (category: ActivityCategory) => boolean;
}

export function useUnreadActivity(
  options: UseUnreadActivityOptions = {},
): UseUnreadActivityReturn {
  const { categories, pollInterval, onUnreadChange } = options;

  // Store state
  const unreadCounts = useActivityStore((state) => state.unreadCounts);
  const hasNewActivity = useActivityStore((state) => state.hasNewActivity);
  const lastSeenAt = useActivityStore((state) => state.lastSeenAt);

  // Store actions
  const markAllAsRead = useActivityStore((state) => state.markAllAsRead);
  const markCategoryAsRead = useActivityStore(
    (state) => state.markCategoryAsRead,
  );
  const setHasNewActivity = useActivityStore(
    (state) => state.setHasNewActivity,
  );
  const updateUnreadCounts = useActivityStore(
    (state) => state.updateUnreadCounts,
  );

  // Calculate total unread based on tracked categories
  const totalUnread = useMemo(() => {
    if (!categories || categories.length === 0) {
      return unreadCounts.total;
    }

    return categories.reduce((sum, category) => {
      return sum + (unreadCounts.byCategory[category] || 0);
    }, 0);
  }, [unreadCounts, categories]);

  // Filtered unread by category
  const unreadByCategory = useMemo(() => {
    if (!categories || categories.length === 0) {
      return unreadCounts.byCategory;
    }

    return Object.fromEntries(
      categories.map((cat) => [cat, unreadCounts.byCategory[cat] || 0]),
    ) as Partial<Record<ActivityCategory, number>>;
  }, [unreadCounts.byCategory, categories]);

  // Watch for unread count changes
  useEffect(() => {
    onUnreadChange?.(totalUnread);
  }, [totalUnread, onUnreadChange]);

  // Poll for unread count updates
  useEffect(() => {
    if (pollInterval && pollInterval > 0) {
      const interval = setInterval(() => {
        updateUnreadCounts();
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, updateUnreadCounts]);

  // Clear new activity flag
  const clearNewActivityFlag = useCallback(() => {
    setHasNewActivity(false);
  }, [setHasNewActivity]);

  // Check if has unread in specific category
  const hasUnreadInCategory = useCallback(
    (category: ActivityCategory) => {
      return (unreadCounts.byCategory[category] || 0) > 0;
    },
    [unreadCounts.byCategory],
  );

  return {
    // Counts
    totalUnread,
    unreadByCategory,

    // State
    hasNewActivity,
    lastSeenAt,

    // Actions
    markAllAsRead,
    markCategoryAsRead,
    clearNewActivityFlag,

    // Computed
    hasUnread: totalUnread > 0,
    hasUnreadInCategory,
  };
}

/**
 * Simple hook for just getting the unread count
 */
export function useUnreadCount(): number {
  return useActivityStore((state) => state.unreadCounts.total);
}

/**
 * Hook for unread count in a specific category
 */
export function useUnreadCountByCategory(category: ActivityCategory): number {
  return useActivityStore(
    (state) => state.unreadCounts.byCategory[category] || 0,
  );
}

/**
 * Hook for checking if there's new activity
 */
export function useHasNewActivity(): boolean {
  return useActivityStore((state) => state.hasNewActivity);
}

export default useUnreadActivity;
