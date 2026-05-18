/**
 * Activity Manager
 *
 * Central manager for activity feed operations
 */

import type {
  Activity,
  AggregatedActivity,
  ActivityFilters,
  ActivitySort,
  ActivityPagination,
  ActivityFeedOptions,
  ActivityCategory,
  DateGroupedActivities,
  ActivityDateGroup,
} from "./activity-types";
import { applyFilters } from "./activity-filters";
import {
  aggregateActivities,
  isAggregatedActivity,
  flattenAggregatedActivities,
} from "./activity-aggregator";
import {
  formatDateSeparator,
  isToday,
  isYesterday,
  isThisWeek,
} from "@/lib/date";

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sort activities by field and order
 */
export function sortActivities(
  activities: Activity[],
  sort: ActivitySort = { field: "createdAt", order: "desc" },
): Activity[] {
  return [...activities].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "priority":
        const priorityOrder = { low: 1, normal: 2, high: 3, urgent: 4 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      default:
        comparison = 0;
    }

    return sort.order === "desc" ? -comparison : comparison;
  });
}

/**
 * Sort aggregated activities
 */
export function sortAggregatedActivities(
  activities: (Activity | AggregatedActivity)[],
  sort: ActivitySort = { field: "createdAt", order: "desc" },
): (Activity | AggregatedActivity)[] {
  return [...activities].sort((a, b) => {
    let comparison = 0;

    const dateA = isAggregatedActivity(a) ? a.latestAt : a.createdAt;
    const dateB = isAggregatedActivity(b) ? b.latestAt : b.createdAt;

    switch (sort.field) {
      case "createdAt":
        comparison = new Date(dateA).getTime() - new Date(dateB).getTime();
        break;
      case "priority":
        const priorityOrder = { low: 1, normal: 2, high: 3, urgent: 4 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      default:
        comparison = 0;
    }

    return sort.order === "desc" ? -comparison : comparison;
  });
}

// =============================================================================
// Pagination
// =============================================================================

/**
 * Paginate activities
 */
export function paginateActivities<T>(
  items: T[],
  pagination: ActivityPagination,
): { items: T[]; hasMore: boolean; total: number } {
  const { limit, offset } = pagination;
  const total = items.length;
  const paginated = items.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    items: paginated,
    hasMore,
    total,
  };
}

// =============================================================================
// Date Grouping
// =============================================================================

/**
 * Get date group for a date
 */
export function getDateGroup(dateStr: string): ActivityDateGroup {
  const date = new Date(dateStr);

  if (isToday(date)) {
    return "today";
  }

  if (isYesterday(date)) {
    return "yesterday";
  }

  if (isThisWeek(date)) {
    return "this_week";
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  if (date > weekAgo) {
    return "last_week";
  }

  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date > monthAgo) {
    return "this_month";
  }

  return "older";
}

/**
 * Get label for date group
 */
export function getDateGroupLabel(group: ActivityDateGroup): string {
  const labels: Record<ActivityDateGroup, string> = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    last_week: "Last Week",
    this_month: "This Month",
    older: "Older",
  };

  return labels[group];
}

/**
 * Group activities by date
 */
export function groupActivitiesByDate(
  activities: (Activity | AggregatedActivity)[],
): DateGroupedActivities[] {
  const groups = new Map<string, DateGroupedActivities>();

  for (const activity of activities) {
    const dateStr = isAggregatedActivity(activity)
      ? activity.latestAt
      : activity.createdAt;

    const date = new Date(dateStr);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const label = formatDateSeparator(date);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        label,
        activities: [],
      });
    }

    groups.get(dateKey)!.activities.push(activity);
  }

  // Sort groups by date (newest first)
  return Array.from(groups.values()).sort((a, b) => {
    const dateA = new Date(
      a.activities[0]
        ? isAggregatedActivity(a.activities[0])
          ? a.activities[0].latestAt
          : a.activities[0].createdAt
        : "",
    );
    const dateB = new Date(
      b.activities[0]
        ? isAggregatedActivity(b.activities[0])
          ? b.activities[0].latestAt
          : b.activities[0].createdAt
        : "",
    );
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Group activities by date group (Today, Yesterday, etc.)
 */
export function groupActivitiesByDateGroup(
  activities: (Activity | AggregatedActivity)[],
): DateGroupedActivities[] {
  const groups = new Map<ActivityDateGroup, DateGroupedActivities>();

  for (const activity of activities) {
    const dateStr = isAggregatedActivity(activity)
      ? activity.latestAt
      : activity.createdAt;

    const group = getDateGroup(dateStr);

    if (!groups.has(group)) {
      groups.set(group, {
        date: group,
        label: getDateGroupLabel(group),
        activities: [],
      });
    }

    groups.get(group)!.activities.push(activity);
  }

  // Sort groups in order
  const groupOrder: ActivityDateGroup[] = [
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "this_month",
    "older",
  ];

  return groupOrder
    .filter((group) => groups.has(group))
    .map((group) => groups.get(group)!);
}

// =============================================================================
// Activity Feed Processing
// =============================================================================

/**
 * Process activities with all options
 */
export function processActivityFeed(
  activities: Activity[],
  options: ActivityFeedOptions = {},
): {
  activities: (Activity | AggregatedActivity)[];
  groupedActivities: DateGroupedActivities[] | null;
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
} {
  const {
    filters = {},
    sort = { field: "createdAt", order: "desc" },
    pagination = { limit: 50, offset: 0 },
    aggregate = true,
    aggregateWindow = 60,
  } = options;

  // Step 1: Apply filters
  let filtered = applyFilters(activities, filters);

  // Step 2: Sort
  filtered = sortActivities(filtered, sort);

  // Step 3: Aggregate (if enabled)
  let processed: (Activity | AggregatedActivity)[] = aggregate
    ? aggregateActivities(filtered, { windowMinutes: aggregateWindow })
    : filtered;

  // Calculate unread count before pagination
  const unreadCount = flattenAggregatedActivities(processed).filter(
    (a) => !a.isRead,
  ).length;
  const totalCount = flattenAggregatedActivities(processed).length;

  // Step 4: Paginate
  const { items, hasMore } = paginateActivities(processed, pagination);
  processed = items;

  // Step 5: Group by date (optional)
  const groupedActivities = groupActivitiesByDateGroup(processed);

  return {
    activities: processed,
    groupedActivities,
    unreadCount,
    totalCount,
    hasMore,
  };
}

// =============================================================================
// Activity Feed Manager Class
// =============================================================================

export class ActivityFeedManager {
  private activities: Activity[] = [];
  private options: ActivityFeedOptions;
  private listeners: Set<
    (activities: (Activity | AggregatedActivity)[]) => void
  > = new Set();

  constructor(options: ActivityFeedOptions = {}) {
    this.options = options;
  }

  /**
   * Set activities
   */
  setActivities(activities: Activity[]): void {
    this.activities = activities;
    this.notifyListeners();
  }

  /**
   * Add a single activity
   */
  addActivity(activity: Activity): void {
    this.activities = [activity, ...this.activities];
    this.notifyListeners();
  }

  /**
   * Add multiple activities
   */
  addActivities(activities: Activity[]): void {
    this.activities = [...activities, ...this.activities];
    this.notifyListeners();
  }

  /**
   * Remove an activity
   */
  removeActivity(activityId: string): void {
    this.activities = this.activities.filter((a) => a.id !== activityId);
    this.notifyListeners();
  }

  /**
   * Mark activity as read
   */
  markAsRead(activityId: string): void {
    this.activities = this.activities.map((a) =>
      a.id === activityId
        ? { ...a, isRead: true, readAt: new Date().toISOString() }
        : a,
    );
    this.notifyListeners();
  }

  /**
   * Mark multiple activities as read
   */
  markMultipleAsRead(activityIds: string[]): void {
    const idsSet = new Set(activityIds);
    this.activities = this.activities.map((a) =>
      idsSet.has(a.id)
        ? { ...a, isRead: true, readAt: new Date().toISOString() }
        : a,
    );
    this.notifyListeners();
  }

  /**
   * Mark all activities as read
   */
  markAllAsRead(): void {
    const now = new Date().toISOString();
    this.activities = this.activities.map((a) =>
      a.isRead ? a : { ...a, isRead: true, readAt: now },
    );
    this.notifyListeners();
  }

  /**
   * Update options
   */
  setOptions(options: Partial<ActivityFeedOptions>): void {
    this.options = { ...this.options, ...options };
    this.notifyListeners();
  }

  /**
   * Update filters
   */
  setFilters(filters: ActivityFilters): void {
    this.options = { ...this.options, filters };
    this.notifyListeners();
  }

  /**
   * Get processed activities
   */
  getProcessedActivities(): ReturnType<typeof processActivityFeed> {
    return processActivityFeed(this.activities, this.options);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.activities.filter((a) => !a.isRead).length;
  }

  /**
   * Get unread count by category
   */
  getUnreadCountByCategory(): Record<ActivityCategory, number> {
    const counts: Record<ActivityCategory, number> = {
      all: 0,
      mentions: 0,
      threads: 0,
      reactions: 0,
      files: 0,
      channels: 0,
      members: 0,
      calls: 0,
      tasks: 0,
      integrations: 0,
    };

    this.activities.forEach((activity) => {
      if (!activity.isRead) {
        counts.all++;
        counts[activity.category]++;
      }
    });

    return counts;
  }

  /**
   * Subscribe to changes
   */
  subscribe(
    listener: (activities: (Activity | AggregatedActivity)[]) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const { activities } = this.getProcessedActivities();
    this.listeners.forEach((listener) => listener(activities));
  }

  /**
   * Clear all activities
   */
  clear(): void {
    this.activities = [];
    this.notifyListeners();
  }

  /**
   * Get raw activities
   */
  getRawActivities(): Activity[] {
    return this.activities;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let activityManager: ActivityFeedManager | null = null;

/**
 * Get the global activity manager instance
 */
export function getActivityManager(
  options?: ActivityFeedOptions,
): ActivityFeedManager {
  if (!activityManager) {
    activityManager = new ActivityFeedManager(options);
  }
  return activityManager;
}

/**
 * Reset the global activity manager
 */
export function resetActivityManager(): void {
  activityManager = null;
}

// =============================================================================
// Export Default
// =============================================================================

export default ActivityFeedManager;
