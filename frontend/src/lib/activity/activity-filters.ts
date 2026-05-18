/**
 * Activity Filters
 *
 * Utilities for filtering activities
 */

import type {
  Activity,
  AggregatedActivity,
  ActivityFilters,
  ActivityCategory,
  ActivityType,
} from "./activity-types";

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Filter activities by category
 */
export function filterByCategory(
  activities: Activity[],
  category: ActivityCategory,
): Activity[] {
  if (category === "all") {
    return activities;
  }
  return activities.filter((activity) => activity.category === category);
}

/**
 * Filter activities by types
 */
export function filterByTypes(
  activities: Activity[],
  types: ActivityType[],
): Activity[] {
  if (types.length === 0) {
    return activities;
  }
  return activities.filter((activity) => types.includes(activity.type));
}

/**
 * Filter activities by channel IDs
 */
export function filterByChannels(
  activities: Activity[],
  channelIds: string[],
): Activity[] {
  if (channelIds.length === 0) {
    return activities;
  }
  return activities.filter((activity) => {
    if ("channel" in activity && activity.channel) {
      return channelIds.includes(activity.channel.id);
    }
    return false;
  });
}

/**
 * Filter activities by user IDs (actors)
 */
export function filterByUsers(
  activities: Activity[],
  userIds: string[],
): Activity[] {
  if (userIds.length === 0) {
    return activities;
  }
  return activities.filter((activity) => userIds.includes(activity.actor.id));
}

/**
 * Filter activities by read status
 */
export function filterByReadStatus(
  activities: Activity[],
  isRead: boolean,
): Activity[] {
  return activities.filter((activity) => activity.isRead === isRead);
}

/**
 * Filter activities by priority
 */
export function filterByPriority(
  activities: Activity[],
  priorities: Activity["priority"][],
): Activity[] {
  if (priorities.length === 0) {
    return activities;
  }
  return activities.filter((activity) =>
    priorities.includes(activity.priority),
  );
}

/**
 * Filter activities by date range
 */
export function filterByDateRange(
  activities: Activity[],
  dateFrom?: string,
  dateTo?: string,
): Activity[] {
  return activities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);

    if (dateFrom) {
      const from = new Date(dateFrom);
      if (activityDate < from) {
        return false;
      }
    }

    if (dateTo) {
      const to = new Date(dateTo);
      if (activityDate > to) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter activities by search query
 * Searches in message content, channel name, actor name, etc.
 */
export function filterBySearchQuery(
  activities: Activity[],
  query: string,
): Activity[] {
  if (!query.trim()) {
    return activities;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return activities.filter((activity) => {
    // Search in actor name
    if (activity.actor.displayName?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    if (activity.actor.username?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search in channel name
    if ("channel" in activity && activity.channel) {
      if (activity.channel.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    // Search in message content
    if ("message" in activity && activity.message) {
      if (activity.message.content.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    // Search in file name
    if (activity.type === "file_shared") {
      if (activity.file.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    // Search in task title
    if (
      activity.type === "task_completed" ||
      activity.type === "task_assigned"
    ) {
      if (activity.task.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    // Search in system activity
    if (activity.type === "system") {
      if (activity.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      if (activity.body.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Apply all filters to activities
 */
export function applyFilters(
  activities: Activity[],
  filters: ActivityFilters,
): Activity[] {
  let filtered = activities;

  if (filters.category) {
    filtered = filterByCategory(filtered, filters.category);
  }

  if (filters.types && filters.types.length > 0) {
    filtered = filterByTypes(filtered, filters.types);
  }

  if (filters.channelIds && filters.channelIds.length > 0) {
    filtered = filterByChannels(filtered, filters.channelIds);
  }

  if (filters.userIds && filters.userIds.length > 0) {
    filtered = filterByUsers(filtered, filters.userIds);
  }

  if (typeof filters.isRead === "boolean") {
    filtered = filterByReadStatus(filtered, filters.isRead);
  }

  if (filters.priority && filters.priority.length > 0) {
    filtered = filterByPriority(filtered, filters.priority);
  }

  if (filters.dateFrom || filters.dateTo) {
    filtered = filterByDateRange(filtered, filters.dateFrom, filters.dateTo);
  }

  if (filters.searchQuery) {
    filtered = filterBySearchQuery(filtered, filters.searchQuery);
  }

  return filtered;
}

// =============================================================================
// Category Helpers
// =============================================================================

/**
 * Map activity types to categories
 */
export const ACTIVITY_TYPE_TO_CATEGORY: Record<ActivityType, ActivityCategory> =
  {
    message: "all",
    reaction: "reactions",
    mention: "mentions",
    reply: "threads",
    thread_reply: "threads",
    channel_created: "channels",
    channel_archived: "channels",
    channel_unarchived: "channels",
    member_joined: "members",
    member_left: "members",
    member_invited: "members",
    file_shared: "files",
    call_started: "calls",
    call_ended: "calls",
    reminder_due: "all",
    task_completed: "tasks",
    task_assigned: "tasks",
    integration_event: "integrations",
    system: "all",
  };

/**
 * Get activity types for a category
 */
export function getTypesForCategory(
  category: ActivityCategory,
): ActivityType[] {
  if (category === "all") {
    return Object.keys(ACTIVITY_TYPE_TO_CATEGORY) as ActivityType[];
  }

  return (
    Object.entries(ACTIVITY_TYPE_TO_CATEGORY) as [
      ActivityType,
      ActivityCategory,
    ][]
  )
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type);
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: ActivityCategory): string {
  const labels: Record<ActivityCategory, string> = {
    all: "All Activity",
    mentions: "Mentions",
    threads: "Threads",
    reactions: "Reactions",
    files: "Files",
    channels: "Channels",
    members: "Members",
    calls: "Calls",
    tasks: "Tasks",
    integrations: "Integrations",
  };

  return labels[category] || category;
}

/**
 * Get all available categories
 */
export function getAllCategories(): ActivityCategory[] {
  return [
    "all",
    "mentions",
    "threads",
    "reactions",
    "files",
    "channels",
    "members",
    "calls",
    "tasks",
    "integrations",
  ];
}

/**
 * Get categories with activities
 */
export function getCategoriesWithActivities(
  activities: Activity[],
): ActivityCategory[] {
  const categories = new Set<ActivityCategory>();
  categories.add("all"); // Always include 'all'

  activities.forEach((activity) => {
    categories.add(activity.category);
  });

  return Array.from(categories);
}

// =============================================================================
// Count Helpers
// =============================================================================

/**
 * Get unread count for a category
 */
export function getUnreadCountByCategory(
  activities: Activity[],
  category: ActivityCategory,
): number {
  const filtered =
    category === "all"
      ? activities
      : activities.filter((a) => a.category === category);

  return filtered.filter((a) => !a.isRead).length;
}

/**
 * Get counts by category
 */
export function getCountsByCategory(
  activities: Activity[],
): Record<ActivityCategory, { total: number; unread: number }> {
  const counts: Record<ActivityCategory, { total: number; unread: number }> = {
    all: { total: activities.length, unread: 0 },
    mentions: { total: 0, unread: 0 },
    threads: { total: 0, unread: 0 },
    reactions: { total: 0, unread: 0 },
    files: { total: 0, unread: 0 },
    channels: { total: 0, unread: 0 },
    members: { total: 0, unread: 0 },
    calls: { total: 0, unread: 0 },
    tasks: { total: 0, unread: 0 },
    integrations: { total: 0, unread: 0 },
  };

  activities.forEach((activity) => {
    const category = activity.category;
    counts[category].total++;
    if (!activity.isRead) {
      counts[category].unread++;
      counts.all.unread++;
    }
  });

  return counts;
}

// =============================================================================
// Quick Filters
// =============================================================================

/**
 * Common filter presets
 */
export const QUICK_FILTERS = {
  unread: { isRead: false },
  mentions: { category: "mentions" as ActivityCategory },
  threads: { category: "threads" as ActivityCategory },
  reactions: { category: "reactions" as ActivityCategory },
  files: { category: "files" as ActivityCategory },
  today: {
    dateFrom: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  },
  thisWeek: {
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  highPriority: {
    priority: ["high", "urgent"] as Activity["priority"][],
  },
} as const;

/**
 * Get a quick filter by name
 */
export function getQuickFilter(
  name: keyof typeof QUICK_FILTERS,
): ActivityFilters {
  return QUICK_FILTERS[name] as ActivityFilters;
}

/**
 * Combine multiple filters
 */
export function combineFilters(...filters: ActivityFilters[]): ActivityFilters {
  return filters.reduce((combined, filter) => {
    return {
      ...combined,
      ...filter,
      types: [...(combined.types || []), ...(filter.types || [])],
      channelIds: [
        ...(combined.channelIds || []),
        ...(filter.channelIds || []),
      ],
      userIds: [...(combined.userIds || []), ...(filter.userIds || [])],
      priority: [...(combined.priority || []), ...(filter.priority || [])],
    };
  }, {} as ActivityFilters);
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: ActivityFilters): boolean {
  return (
    (filters.category !== undefined && filters.category !== "all") ||
    (filters.types !== undefined && filters.types.length > 0) ||
    (filters.channelIds !== undefined && filters.channelIds.length > 0) ||
    (filters.userIds !== undefined && filters.userIds.length > 0) ||
    filters.isRead !== undefined ||
    (filters.priority !== undefined && filters.priority.length > 0) ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined ||
    (filters.searchQuery !== undefined && filters.searchQuery.trim() !== "")
  );
}

/**
 * Clear all filters (return to defaults)
 */
export function clearFilters(): ActivityFilters {
  return {};
}
