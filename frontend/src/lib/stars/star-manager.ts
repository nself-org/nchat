/**
 * Star Manager
 *
 * Core logic for managing starred messages.
 */

import type {
  StarredMessage,
  StarMessageInput,
  UpdateStarInput,
  StarFilters,
  StarSortBy,
  StarSortOrder,
  StarListOptions,
  StarStats,
  StarColor,
  StarPriority,
} from "./star-types";
import { STAR_COLORS, PRIORITY_ORDER } from "./star-types";

// ============================================================================
// Star Manager Class
// ============================================================================

/**
 * Manager class for starred messages operations.
 */
export class StarManager {
  /**
   * Validate star message input.
   */
  validateStarInput(input: StarMessageInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.messageId) {
      errors.push("Message ID is required");
    }

    if (!input.channelId) {
      errors.push("Channel ID is required");
    }

    if (input.color && !STAR_COLORS[input.color]) {
      errors.push("Invalid star color");
    }

    if (input.note && input.note.length > 500) {
      errors.push("Note cannot exceed 500 characters");
    }

    if (input.category && input.category.length > 50) {
      errors.push("Category cannot exceed 50 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate update star input.
   */
  validateUpdateInput(input: UpdateStarInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.starId) {
      errors.push("Star ID is required");
    }

    if (input.color && !STAR_COLORS[input.color]) {
      errors.push("Invalid star color");
    }

    if (input.note !== undefined && input.note.length > 500) {
      errors.push("Note cannot exceed 500 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get priority for a color.
   */
  getPriorityForColor(color: StarColor): StarPriority {
    return STAR_COLORS[color].priority;
  }

  /**
   * Get suggested color for a priority.
   */
  getColorForPriority(priority: StarPriority): StarColor {
    const colorEntry = Object.entries(STAR_COLORS).find(
      ([, config]) => config.priority === priority,
    );
    return (colorEntry?.[0] as StarColor) ?? "yellow";
  }
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filter starred messages.
 */
export function filterStarredMessages(
  starred: StarredMessage[],
  filters: StarFilters,
): StarredMessage[] {
  return starred.filter((item) => {
    // Filter by channel
    if (filters.channelId && item.channelId !== filters.channelId) {
      return false;
    }

    // Filter by color
    if (filters.color && item.color !== filters.color) {
      return false;
    }

    // Filter by colors (multiple)
    if (filters.colors && filters.colors.length > 0) {
      if (!filters.colors.includes(item.color)) {
        return false;
      }
    }

    // Filter by priority
    if (filters.priority && item.priority !== filters.priority) {
      return false;
    }

    // Filter by priorities (multiple)
    if (filters.priorities && filters.priorities.length > 0) {
      if (!filters.priorities.includes(item.priority)) {
        return false;
      }
    }

    // Filter quick access only
    if (filters.quickAccessOnly && !item.quickAccess) {
      return false;
    }

    // Filter by category
    if (filters.category && item.category !== filters.category) {
      return false;
    }

    // Filter by date range
    if (filters.starredAfter && item.starredAt < filters.starredAfter) {
      return false;
    }
    if (filters.starredBefore && item.starredAt > filters.starredBefore) {
      return false;
    }

    // Filter by message type
    if (filters.messageType && item.message.type !== filters.messageType) {
      return false;
    }

    // Filter by attachments
    if (filters.hasAttachments !== undefined) {
      const hasAttachments = (item.message.attachments?.length ?? 0) > 0;
      if (filters.hasAttachments !== hasAttachments) {
        return false;
      }
    }

    // Filter by notes
    if (filters.hasNote !== undefined) {
      const hasNote = !!item.note;
      if (filters.hasNote !== hasNote) {
        return false;
      }
    }

    // Filter by author
    if (filters.authorUserId && item.message.userId !== filters.authorUserId) {
      return false;
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const contentMatch = item.message.content.toLowerCase().includes(query);
      const noteMatch = item.note?.toLowerCase().includes(query) ?? false;
      const authorMatch = item.message.user.displayName
        .toLowerCase()
        .includes(query);
      const categoryMatch =
        item.category?.toLowerCase().includes(query) ?? false;

      if (!contentMatch && !noteMatch && !authorMatch && !categoryMatch) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sort starred messages.
 */
export function sortStarredMessages(
  starred: StarredMessage[],
  sortBy: StarSortBy = "starredAt",
  sortOrder: StarSortOrder = "desc",
): StarredMessage[] {
  const sorted = [...starred];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "starredAt":
        comparison = a.starredAt.getTime() - b.starredAt.getTime();
        break;
      case "messageDate":
        comparison =
          new Date(a.message.createdAt).getTime() -
          new Date(b.message.createdAt).getTime();
        break;
      case "priority":
        comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      case "channel":
        comparison = a.channelId.localeCompare(b.channelId);
        break;
      case "color":
        comparison = a.color.localeCompare(b.color);
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get filtered and sorted starred messages.
 */
export function getStarredMessages(
  starred: StarredMessage[],
  options: StarListOptions,
): StarredMessage[] {
  let result = [...starred];

  // Apply filters
  if (options.filters) {
    result = filterStarredMessages(result, options.filters);
  }

  // Sort
  result = sortStarredMessages(
    result,
    options.sortBy ?? "starredAt",
    options.sortOrder ?? "desc",
  );

  // Pagination
  if (options.offset !== undefined) {
    result = result.slice(options.offset);
  }
  if (options.limit !== undefined) {
    result = result.slice(0, options.limit);
  }

  return result;
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Calculate star statistics.
 */
export function calculateStarStats(starred: StarredMessage[]): StarStats {
  const byChannel: Record<string, number> = {};
  const byColor: Record<StarColor, number> = {
    yellow: 0,
    red: 0,
    green: 0,
    blue: 0,
    purple: 0,
    orange: 0,
  };
  const byPriority: Record<StarPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  const byCategory: Record<string, number> = {};

  let quickAccessCount = 0;

  starred.forEach((item) => {
    // Count by channel
    byChannel[item.channelId] = (byChannel[item.channelId] ?? 0) + 1;

    // Count by color
    byColor[item.color] = (byColor[item.color] ?? 0) + 1;

    // Count by priority
    byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;

    // Count quick access
    if (item.quickAccess) {
      quickAccessCount++;
    }

    // Count by category
    if (item.category) {
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    }
  });

  // Calculate recent activity (last 7 days)
  const now = new Date();
  const recentActivity: { date: Date; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = starred.filter(
      (s) => s.starredAt >= date && s.starredAt < nextDate,
    ).length;

    recentActivity.push({ date, count });
  }

  return {
    totalStarred: starred.length,
    byColor,
    byPriority,
    byChannel,
    quickAccessCount,
    byCategory,
    recentActivity,
  };
}

// ============================================================================
// Quick Access
// ============================================================================

/**
 * Get quick access starred messages (for sidebar widget).
 */
export function getQuickAccessStars(
  starred: StarredMessage[],
  limit = 5,
): StarredMessage[] {
  return starred
    .filter((s) => s.quickAccess)
    .sort((a, b) => {
      // Sort by priority first, then by starred date
      const priorityDiff =
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.starredAt.getTime() - a.starredAt.getTime();
    })
    .slice(0, limit);
}

/**
 * Get high priority starred messages.
 */
export function getHighPriorityStars(
  starred: StarredMessage[],
): StarredMessage[] {
  return starred
    .filter((s) => s.priority === "urgent" || s.priority === "high")
    .sort((a, b) => {
      const priorityDiff =
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.starredAt.getTime() - a.starredAt.getTime();
    });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a message is starred.
 */
export function isMessageStarred(
  messageId: string,
  starred: StarredMessage[],
): boolean {
  return starred.some((s) => s.messageId === messageId);
}

/**
 * Get star for a message.
 */
export function getStarForMessage(
  messageId: string,
  starred: StarredMessage[],
): StarredMessage | undefined {
  return starred.find((s) => s.messageId === messageId);
}

/**
 * Get all unique categories from starred messages.
 */
export function getAllCategories(starred: StarredMessage[]): string[] {
  const categories = new Set<string>();
  starred.forEach((s) => {
    if (s.category) {
      categories.add(s.category);
    }
  });
  return Array.from(categories).sort();
}

/**
 * Format star count.
 */
export function formatStarCount(count: number): string {
  if (count === 0) return "No starred messages";
  if (count === 1) return "1 starred message";
  return `${count.toLocaleString()} starred messages`;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const starManager = new StarManager();
