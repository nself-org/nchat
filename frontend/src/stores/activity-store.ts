/**
 * Activity Store - Manages all activity feed state for nself-chat
 *
 * Handles activities, filters, preferences, and real-time updates
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Activity,
  AggregatedActivity,
  ActivityFilters,
  ActivityCategory,
  ActivityPreferences,
  ActivityType,
} from "@/lib/activity/activity-types";
import {
  processActivityFeed,
  groupActivitiesByDateGroup,
} from "@/lib/activity/activity-manager";
import {
  aggregateActivities,
  isAggregatedActivity,
  flattenAggregatedActivities,
} from "@/lib/activity/activity-aggregator";
import {
  applyFilters,
  getCountsByCategory,
} from "@/lib/activity/activity-filters";

// ============================================================================
// Types
// ============================================================================

export interface ActivityUnreadCounts {
  total: number;
  byCategory: Partial<Record<ActivityCategory, number>>;
}

export interface ActivityState {
  // Activities
  activities: Activity[];
  processedActivities: (Activity | AggregatedActivity)[];

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: string | null;
  totalCount: number;

  // Filters
  filters: ActivityFilters;
  activeCategory: ActivityCategory;

  // Unread tracking
  unreadCounts: ActivityUnreadCounts;
  lastSeenAt: string | null;
  hasNewActivity: boolean;

  // Preferences
  preferences: ActivityPreferences;

  // UI State
  isActivityPanelOpen: boolean;
  selectedActivityId: string | null;
}

export interface ActivityActions {
  // Activity CRUD
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  addActivities: (activities: Activity[]) => void;
  removeActivity: (activityId: string) => void;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;

  // Read state management
  markAsRead: (activityId: string) => void;
  markMultipleAsRead: (activityIds: string[]) => void;
  markAllAsRead: () => void;
  markCategoryAsRead: (category: ActivityCategory) => void;

  // Filter management
  setFilters: (filters: ActivityFilters) => void;
  setActiveCategory: (category: ActivityCategory) => void;
  clearFilters: () => void;

  // Pagination
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Unread counts
  updateUnreadCounts: () => void;
  setUnreadCounts: (counts: ActivityUnreadCounts) => void;

  // Preferences
  updatePreferences: (updates: Partial<ActivityPreferences>) => void;

  // UI State
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  selectActivity: (activityId: string | null) => void;
  setHasNewActivity: (hasNew: boolean) => void;

  // Loading/Error state
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Utility
  getFilteredActivities: () => Activity[];
  getProcessedActivities: () => (Activity | AggregatedActivity)[];
  getActivityById: (activityId: string) => Activity | undefined;
  reset: () => void;
}

export type ActivityStore = ActivityState & ActivityActions;

// ============================================================================
// Initial State
// ============================================================================

const defaultPreferences: ActivityPreferences = {
  enabled: true,
  aggregateEnabled: true,
  aggregateWindow: 60,
  showPreview: true,
  typePreferences: {},
  channelOverrides: {},
  groupByDate: true,
  showAvatars: true,
  compactMode: false,
  autoMarkRead: false,
  autoMarkReadDelay: 3000,
};

const initialState: ActivityState = {
  activities: [],
  processedActivities: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  cursor: null,
  totalCount: 0,
  filters: {},
  activeCategory: "all",
  unreadCounts: {
    total: 0,
    byCategory: {},
  },
  lastSeenAt: null,
  hasNewActivity: false,
  preferences: defaultPreferences,
  isActivityPanelOpen: false,
  selectedActivityId: null,
};

// ============================================================================
// Store
// ============================================================================

export const useActivityStore = create<ActivityStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Activity CRUD
        setActivities: (activities) =>
          set(
            (state) => {
              state.activities = activities;
              state.totalCount = activities.length;
              // Reprocess activities
              const processed = processActivityWithOptions(activities, state);
              state.processedActivities = processed;
              // Update unread counts
              updateUnreadCountsInternal(state);
            },
            false,
            "activity/setActivities",
          ),

        addActivity: (activity) =>
          set(
            (state) => {
              // Add to beginning (newest first)
              state.activities.unshift(activity);
              state.totalCount++;
              state.hasNewActivity = true;
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
              // Update unread counts
              if (!activity.isRead) {
                state.unreadCounts.total++;
                const category = activity.category;
                state.unreadCounts.byCategory[category] =
                  (state.unreadCounts.byCategory[category] || 0) + 1;
              }
            },
            false,
            "activity/addActivity",
          ),

        addActivities: (activities) =>
          set(
            (state) => {
              state.activities = [...activities, ...state.activities];
              state.totalCount += activities.length;
              state.hasNewActivity = true;
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
              // Update unread counts
              updateUnreadCountsInternal(state);
            },
            false,
            "activity/addActivities",
          ),

        removeActivity: (activityId) =>
          set(
            (state) => {
              const index = state.activities.findIndex(
                (a) => a.id === activityId,
              );
              if (index !== -1) {
                const activity = state.activities[index];
                // Update unread counts if activity was unread
                if (!activity.isRead) {
                  state.unreadCounts.total = Math.max(
                    0,
                    state.unreadCounts.total - 1,
                  );
                  const category = activity.category;
                  state.unreadCounts.byCategory[category] = Math.max(
                    0,
                    (state.unreadCounts.byCategory[category] || 0) - 1,
                  );
                }
                state.activities.splice(index, 1);
                state.totalCount--;
                // Reprocess activities
                const processed = processActivityWithOptions(
                  state.activities,
                  state,
                );
                state.processedActivities = processed;
              }
            },
            false,
            "activity/removeActivity",
          ),

        updateActivity: (activityId, updates) =>
          set(
            (state) => {
              const index = state.activities.findIndex(
                (a) => a.id === activityId,
              );
              if (index !== -1) {
                Object.assign(state.activities[index], updates);
                // Reprocess activities
                const processed = processActivityWithOptions(
                  state.activities,
                  state,
                );
                state.processedActivities = processed;
              }
            },
            false,
            "activity/updateActivity",
          ),

        // Read state management
        markAsRead: (activityId) =>
          set(
            (state) => {
              const activity = state.activities.find(
                (a) => a.id === activityId,
              );
              if (activity && !activity.isRead) {
                activity.isRead = true;
                activity.readAt = new Date().toISOString();
                // Update unread counts
                state.unreadCounts.total = Math.max(
                  0,
                  state.unreadCounts.total - 1,
                );
                const category = activity.category;
                state.unreadCounts.byCategory[category] = Math.max(
                  0,
                  (state.unreadCounts.byCategory[category] || 0) - 1,
                );
                // Reprocess activities
                const processed = processActivityWithOptions(
                  state.activities,
                  state,
                );
                state.processedActivities = processed;
              }
            },
            false,
            "activity/markAsRead",
          ),

        markMultipleAsRead: (activityIds) =>
          set(
            (state) => {
              const idsSet = new Set(activityIds);
              const now = new Date().toISOString();

              state.activities.forEach((activity) => {
                if (idsSet.has(activity.id) && !activity.isRead) {
                  activity.isRead = true;
                  activity.readAt = now;
                  // Update unread counts
                  state.unreadCounts.total = Math.max(
                    0,
                    state.unreadCounts.total - 1,
                  );
                  const category = activity.category;
                  state.unreadCounts.byCategory[category] = Math.max(
                    0,
                    (state.unreadCounts.byCategory[category] || 0) - 1,
                  );
                }
              });

              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/markMultipleAsRead",
          ),

        markAllAsRead: () =>
          set(
            (state) => {
              const now = new Date().toISOString();
              state.activities.forEach((activity) => {
                if (!activity.isRead) {
                  activity.isRead = true;
                  activity.readAt = now;
                }
              });
              // Reset unread counts
              state.unreadCounts = {
                total: 0,
                byCategory: {},
              };
              state.hasNewActivity = false;
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/markAllAsRead",
          ),

        markCategoryAsRead: (category) =>
          set(
            (state) => {
              const now = new Date().toISOString();
              state.activities.forEach((activity) => {
                if (activity.category === category && !activity.isRead) {
                  activity.isRead = true;
                  activity.readAt = now;
                  state.unreadCounts.total = Math.max(
                    0,
                    state.unreadCounts.total - 1,
                  );
                }
              });
              state.unreadCounts.byCategory[category] = 0;
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/markCategoryAsRead",
          ),

        // Filter management
        setFilters: (filters) =>
          set(
            (state) => {
              state.filters = filters;
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/setFilters",
          ),

        setActiveCategory: (category) =>
          set(
            (state) => {
              state.activeCategory = category;
              state.filters = {
                ...state.filters,
                category: category === "all" ? undefined : category,
              };
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/setActiveCategory",
          ),

        clearFilters: () =>
          set(
            (state) => {
              state.filters = {};
              state.activeCategory = "all";
              // Reprocess activities
              const processed = processActivityWithOptions(
                state.activities,
                state,
              );
              state.processedActivities = processed;
            },
            false,
            "activity/clearFilters",
          ),

        // Pagination
        loadMore: async () => {
          const state = get();
          if (state.isLoadingMore || !state.hasMore) return;

          set({ isLoadingMore: true });

          try {
            // In real app, this would fetch from API
            // const response = await fetchActivities({ cursor: state.cursor, limit: 20 });
            // set((state) => {
            //   state.activities.push(...response.activities);
            //   state.cursor = response.cursor;
            //   state.hasMore = response.hasMore;
            // });

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            set({
              isLoadingMore: false,
              // Update cursor and hasMore based on response
            });
          } catch (error) {
            set({
              isLoadingMore: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to load more activities",
            });
          }
        },

        refresh: async () => {
          set({ isLoading: true, error: null });

          try {
            // In real app, this would fetch from API
            // const response = await fetchActivities({ limit: 50 });
            // set((state) => {
            //   state.activities = response.activities;
            //   state.cursor = response.cursor;
            //   state.hasMore = response.hasMore;
            //   state.totalCount = response.total;
            // });

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            set({ isLoading: false });
          } catch (error) {
            set({
              isLoading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to refresh activities",
            });
          }
        },

        // Unread counts
        updateUnreadCounts: () =>
          set(
            (state) => {
              updateUnreadCountsInternal(state);
            },
            false,
            "activity/updateUnreadCounts",
          ),

        setUnreadCounts: (counts) =>
          set(
            (state) => {
              state.unreadCounts = counts;
            },
            false,
            "activity/setUnreadCounts",
          ),

        // Preferences
        updatePreferences: (updates) =>
          set(
            (state) => {
              state.preferences = { ...state.preferences, ...updates };
              // Reprocess activities if aggregation settings changed
              if (
                "aggregateEnabled" in updates ||
                "aggregateWindow" in updates ||
                "groupByDate" in updates
              ) {
                const processed = processActivityWithOptions(
                  state.activities,
                  state,
                );
                state.processedActivities = processed;
              }
            },
            false,
            "activity/updatePreferences",
          ),

        // UI State
        setActivityPanelOpen: (open) =>
          set(
            (state) => {
              state.isActivityPanelOpen = open;
              if (open) {
                state.hasNewActivity = false;
                state.lastSeenAt = new Date().toISOString();
              }
            },
            false,
            "activity/setActivityPanelOpen",
          ),

        toggleActivityPanel: () =>
          set(
            (state) => {
              state.isActivityPanelOpen = !state.isActivityPanelOpen;
              if (state.isActivityPanelOpen) {
                state.hasNewActivity = false;
                state.lastSeenAt = new Date().toISOString();
              }
            },
            false,
            "activity/toggleActivityPanel",
          ),

        selectActivity: (activityId) =>
          set(
            (state) => {
              state.selectedActivityId = activityId;
            },
            false,
            "activity/selectActivity",
          ),

        setHasNewActivity: (hasNew) =>
          set(
            (state) => {
              state.hasNewActivity = hasNew;
            },
            false,
            "activity/setHasNewActivity",
          ),

        // Loading/Error state
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "activity/setLoading",
          ),

        setLoadingMore: (loading) =>
          set(
            (state) => {
              state.isLoadingMore = loading;
            },
            false,
            "activity/setLoadingMore",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "activity/setError",
          ),

        // Utility
        getFilteredActivities: () => {
          const state = get();
          return applyFilters(state.activities, state.filters);
        },

        getProcessedActivities: () => {
          return get().processedActivities;
        },

        getActivityById: (activityId) => {
          return get().activities.find((a) => a.id === activityId);
        },

        reset: () =>
          set(
            () => ({
              ...initialState,
              preferences: get().preferences, // Keep preferences
            }),
            false,
            "activity/reset",
          ),
      })),
      {
        name: "nchat-activity",
        partialize: (state) => ({
          preferences: state.preferences,
          lastSeenAt: state.lastSeenAt,
        }),
      },
    ),
    { name: "activity-store" },
  ),
);

// ============================================================================
// Helper Functions
// ============================================================================

function processActivityWithOptions(
  activities: Activity[],
  state: ActivityState,
): (Activity | AggregatedActivity)[] {
  // Apply filters
  const filtered = applyFilters(activities, state.filters);

  // Aggregate if enabled
  if (state.preferences.aggregateEnabled) {
    return aggregateActivities(filtered, {
      windowMinutes: state.preferences.aggregateWindow,
    });
  }

  return filtered;
}

function updateUnreadCountsInternal(state: ActivityState): void {
  const counts = getCountsByCategory(state.activities);
  state.unreadCounts = {
    total: counts.all.unread,
    byCategory: Object.fromEntries(
      Object.entries(counts).map(([cat, data]) => [cat, data.unread]),
    ) as Partial<Record<ActivityCategory, number>>,
  };
}

// ============================================================================
// Selectors
// ============================================================================

export const selectActivities = (state: ActivityStore) =>
  state.processedActivities;

export const selectUnreadTotal = (state: ActivityStore) =>
  state.unreadCounts.total;

export const selectUnreadByCategory =
  (category: ActivityCategory) => (state: ActivityStore) =>
    state.unreadCounts.byCategory[category] || 0;

export const selectActiveCategory = (state: ActivityStore) =>
  state.activeCategory;

export const selectIsLoading = (state: ActivityStore) => state.isLoading;

export const selectHasNewActivity = (state: ActivityStore) =>
  state.hasNewActivity;

export const selectPreferences = (state: ActivityStore) => state.preferences;

export const selectIsActivityPanelOpen = (state: ActivityStore) =>
  state.isActivityPanelOpen;
