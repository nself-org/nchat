/**
 * Saved Manager
 *
 * Core logic for managing saved/starred messages.
 */

import type {
  SavedMessage,
  SaveMessageInput,
  UpdateSavedMessageInput,
  SavedFilters,
  SavedSortBy,
  SavedSortOrder,
  SavedListOptions,
  SavedStats,
} from "./saved-types";

// ============================================================================
// Saved Manager Class
// ============================================================================

/**
 * Manager class for saved messages operations.
 */
export class SavedManager {
  /**
   * Validate save message input.
   */
  validateSaveInput(input: SaveMessageInput): {
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

    if (input.note && input.note.length > 1000) {
      errors.push("Note cannot exceed 1000 characters");
    }

    if (input.tags && input.tags.length > 20) {
      errors.push("Cannot have more than 20 tags");
    }

    if (input.tags) {
      const invalidTags = input.tags.filter((tag) => tag.length > 50);
      if (invalidTags.length > 0) {
        errors.push("Tags cannot exceed 50 characters");
      }
    }

    if (input.reminderAt && input.reminderAt < new Date()) {
      errors.push("Reminder date must be in the future");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate update saved message input.
   */
  validateUpdateInput(input: UpdateSavedMessageInput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!input.savedId) {
      errors.push("Saved item ID is required");
    }

    if (input.note !== undefined && input.note.length > 1000) {
      errors.push("Note cannot exceed 1000 characters");
    }

    if (input.tags && input.tags.length > 20) {
      errors.push("Cannot have more than 20 tags");
    }

    if (input.reminderAt && input.reminderAt < new Date()) {
      errors.push("Reminder date must be in the future");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filter saved messages.
 */
export function filterSavedMessages(
  saved: SavedMessage[],
  filters: SavedFilters,
): SavedMessage[] {
  return saved.filter((item) => {
    // Filter by collection
    if (filters.collectionId !== undefined) {
      if (filters.collectionId === null) {
        // Uncategorized items
        if (item.collectionIds.length > 0) {
          return false;
        }
      } else {
        if (!item.collectionIds.includes(filters.collectionId)) {
          return false;
        }
      }
    }

    // Filter by channel
    if (filters.channelId && item.channelId !== filters.channelId) {
      return false;
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      const hasTags = filters.tags.some((tag) => item.tags.includes(tag));
      if (!hasTags) {
        return false;
      }
    }

    // Filter starred only
    if (filters.starredOnly && !item.isStarred) {
      return false;
    }

    // Filter with reminders
    if (filters.hasReminder && !item.reminderAt) {
      return false;
    }

    // Filter pending reminders
    if (filters.pendingReminders) {
      if (!item.reminderAt || item.reminderTriggered) {
        return false;
      }
    }

    // Filter by date range
    if (filters.savedAfter && item.savedAt < filters.savedAfter) {
      return false;
    }
    if (filters.savedBefore && item.savedAt > filters.savedBefore) {
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
      const tagMatch = item.tags.some((tag) =>
        tag.toLowerCase().includes(query),
      );

      if (!contentMatch && !noteMatch && !authorMatch && !tagMatch) {
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
 * Sort saved messages.
 */
export function sortSavedMessages(
  saved: SavedMessage[],
  sortBy: SavedSortBy = "savedAt",
  sortOrder: SavedSortOrder = "desc",
): SavedMessage[] {
  const sorted = [...saved];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "savedAt":
        comparison = a.savedAt.getTime() - b.savedAt.getTime();
        break;
      case "messageDate":
        comparison =
          new Date(a.message.createdAt).getTime() -
          new Date(b.message.createdAt).getTime();
        break;
      case "channel":
        comparison = a.channelId.localeCompare(b.channelId);
        break;
      case "reminder":
        // Items with reminders first, then by reminder date
        if (a.reminderAt && b.reminderAt) {
          comparison = a.reminderAt.getTime() - b.reminderAt.getTime();
        } else if (a.reminderAt) {
          comparison = -1;
        } else if (b.reminderAt) {
          comparison = 1;
        }
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get filtered and sorted saved messages.
 */
export function getSavedMessages(
  saved: SavedMessage[],
  options: SavedListOptions,
): SavedMessage[] {
  let result = [...saved];

  // Apply filters
  if (options.filters) {
    result = filterSavedMessages(result, options.filters);
  }

  // Sort
  result = sortSavedMessages(
    result,
    options.sortBy ?? "savedAt",
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
 * Calculate saved messages statistics.
 */
export function calculateSavedStats(saved: SavedMessage[]): SavedStats {
  const byChannel: Record<string, number> = {};
  const byCollection: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  let totalStarred = 0;
  let totalWithReminders = 0;
  let pendingReminders = 0;
  const now = new Date();

  saved.forEach((item) => {
    // Count by channel
    byChannel[item.channelId] = (byChannel[item.channelId] ?? 0) + 1;

    // Count by collection
    item.collectionIds.forEach((collId) => {
      byCollection[collId] = (byCollection[collId] ?? 0) + 1;
    });

    // Count starred
    if (item.isStarred) {
      totalStarred++;
    }

    // Count reminders
    if (item.reminderAt) {
      totalWithReminders++;
      if (!item.reminderTriggered && item.reminderAt > now) {
        pendingReminders++;
      }
    }

    // Count tags
    item.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    });
  });

  // Get top tags
  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSaved: saved.length,
    totalStarred,
    totalWithReminders,
    pendingReminders,
    totalCollections: Object.keys(byCollection).length,
    totalTags: Object.keys(tagCounts).length,
    byChannel,
    byCollection,
    topTags,
  };
}

// ============================================================================
// Tag Management
// ============================================================================

/**
 * Get all unique tags from saved messages.
 */
export function getAllTags(saved: SavedMessage[]): string[] {
  const tags = new Set<string>();
  saved.forEach((item) => {
    item.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Normalize a tag (lowercase, trim, remove special chars).
 */
export function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Suggest tags based on message content.
 */
export function suggestTags(content: string, existingTags: string[]): string[] {
  const suggestions: string[] = [];

  // Check for common patterns
  const patterns: Record<string, RegExp> = {
    link: /https?:\/\/[^\s]+/i,
    code: /```[\s\S]*```/,
    question: /\?(\s|$)/,
    task: /\b(todo|task|action item)\b/i,
    meeting: /\b(meeting|call|sync)\b/i,
    important: /\b(important|urgent|asap)\b/i,
    idea: /\b(idea|suggestion|proposal)\b/i,
  };

  Object.entries(patterns).forEach(([tag, pattern]) => {
    if (pattern.test(content) && !existingTags.includes(tag)) {
      suggestions.push(tag);
    }
  });

  return suggestions.slice(0, 5);
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const savedManager = new SavedManager();
