/**
 * Audit Search - Search and filter functionality for audit logs
 *
 * This module provides search, filter, and query building functionality
 * for audit log entries.
 */

import type {
  AuditAction,
  AuditCategory,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogResponse,
  AuditLogSortOptions,
  AuditSeverity,
} from "./audit-types";

// ============================================================================
// Search and Filter Functions
// ============================================================================

/**
 * Filter audit log entries based on provided filters
 */
export function filterAuditLogs(
  entries: AuditLogEntry[],
  filters: AuditLogFilters,
): AuditLogEntry[] {
  return entries.filter((entry) => {
    // Category filter
    if (filters.category && filters.category.length > 0) {
      if (!filters.category.includes(entry.category)) {
        return false;
      }
    }

    // Action filter
    if (filters.action && filters.action.length > 0) {
      if (!filters.action.includes(entry.action)) {
        return false;
      }
    }

    // Severity filter
    if (filters.severity && filters.severity.length > 0) {
      if (!filters.severity.includes(entry.severity)) {
        return false;
      }
    }

    // Actor ID filter
    if (filters.actorId) {
      if (entry.actor.id !== filters.actorId) {
        return false;
      }
    }

    // Actor type filter
    if (filters.actorType) {
      if (entry.actor.type !== filters.actorType) {
        return false;
      }
    }

    // Resource type filter
    if (filters.resourceType) {
      if (!entry.resource || entry.resource.type !== filters.resourceType) {
        return false;
      }
    }

    // Resource ID filter
    if (filters.resourceId) {
      if (!entry.resource || entry.resource.id !== filters.resourceId) {
        return false;
      }
    }

    // Date range filter
    if (filters.startDate) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate < filters.startDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate > filters.endDate) {
        return false;
      }
    }

    // Success filter
    if (filters.success !== undefined) {
      if (entry.success !== filters.success) {
        return false;
      }
    }

    // IP address filter
    if (filters.ipAddress) {
      if (!entry.ipAddress || !entry.ipAddress.includes(filters.ipAddress)) {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchFields = [
        entry.description,
        entry.actor.id,
        entry.actor.email,
        entry.actor.username,
        entry.actor.displayName,
        entry.resource?.name,
        entry.resource?.id,
        entry.action,
        entry.category,
        entry.errorMessage,
      ]
        .filter(Boolean)
        .map((s) => s?.toLowerCase());

      if (!searchFields.some((field) => field?.includes(query))) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort audit log entries
 */
export function sortAuditLogs(
  entries: AuditLogEntry[],
  sort: AuditLogSortOptions,
): AuditLogEntry[] {
  const sorted = [...entries];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "timestamp":
        comparison =
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;
      case "action":
        comparison = a.action.localeCompare(b.action);
        break;
      case "severity":
        const severityOrder: Record<AuditSeverity, number> = {
          info: 0,
          warning: 1,
          error: 2,
          critical: 3,
        };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case "actor":
        const aActor = a.actor.displayName ?? a.actor.username ?? a.actor.id;
        const bActor = b.actor.displayName ?? b.actor.username ?? b.actor.id;
        comparison = aActor.localeCompare(bActor);
        break;
    }

    return sort.direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Paginate audit log entries
 */
export function paginateAuditLogs(
  entries: AuditLogEntry[],
  page: number,
  pageSize: number,
): AuditLogResponse {
  const totalCount = entries.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    entries: entries.slice(startIndex, endIndex),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

/**
 * Search, filter, sort, and paginate audit logs
 */
export function queryAuditLogs(
  entries: AuditLogEntry[],
  options: {
    filters?: AuditLogFilters;
    sort?: AuditLogSortOptions;
    page?: number;
    pageSize?: number;
  },
): AuditLogResponse {
  const { filters, sort, page = 1, pageSize = 20 } = options;

  let result = entries;

  // Apply filters
  if (filters) {
    result = filterAuditLogs(result, filters);
  }

  // Apply sorting
  if (sort) {
    result = sortAuditLogs(result, sort);
  } else {
    // Default sort by timestamp desc
    result = sortAuditLogs(result, { field: "timestamp", direction: "desc" });
  }

  // Apply pagination
  return paginateAuditLogs(result, page, pageSize);
}

// ============================================================================
// Search Query Builder
// ============================================================================

export interface SearchQueryParams {
  query?: string;
  categories?: AuditCategory[];
  actions?: AuditAction[];
  severities?: AuditSeverity[];
  actorId?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

/**
 * Build a search query string from parameters
 */
export function buildSearchQueryString(params: SearchQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("q", params.query);
  }

  if (params.categories && params.categories.length > 0) {
    searchParams.set("categories", params.categories.join(","));
  }

  if (params.actions && params.actions.length > 0) {
    searchParams.set("actions", params.actions.join(","));
  }

  if (params.severities && params.severities.length > 0) {
    searchParams.set("severities", params.severities.join(","));
  }

  if (params.actorId) {
    searchParams.set("actor", params.actorId);
  }

  if (params.resourceId) {
    searchParams.set("resource", params.resourceId);
  }

  if (params.startDate) {
    searchParams.set("from", params.startDate);
  }

  if (params.endDate) {
    searchParams.set("to", params.endDate);
  }

  if (params.success !== undefined) {
    searchParams.set("success", String(params.success));
  }

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    searchParams.set("limit", String(params.pageSize));
  }

  if (params.sortField) {
    searchParams.set("sort", params.sortField);
  }

  if (params.sortDirection) {
    searchParams.set("order", params.sortDirection);
  }

  return searchParams.toString();
}

/**
 * Parse a search query string into parameters
 */
export function parseSearchQueryString(queryString: string): SearchQueryParams {
  const params = new URLSearchParams(queryString);
  const result: SearchQueryParams = {};

  const query = params.get("q");
  if (query) {
    result.query = query;
  }

  const categories = params.get("categories");
  if (categories) {
    result.categories = categories.split(",") as AuditCategory[];
  }

  const actions = params.get("actions");
  if (actions) {
    result.actions = actions.split(",") as AuditAction[];
  }

  const severities = params.get("severities");
  if (severities) {
    result.severities = severities.split(",") as AuditSeverity[];
  }

  const actor = params.get("actor");
  if (actor) {
    result.actorId = actor;
  }

  const resource = params.get("resource");
  if (resource) {
    result.resourceId = resource;
  }

  const from = params.get("from");
  if (from) {
    result.startDate = from;
  }

  const to = params.get("to");
  if (to) {
    result.endDate = to;
  }

  const success = params.get("success");
  if (success !== null) {
    result.success = success === "true";
  }

  const page = params.get("page");
  if (page) {
    result.page = parseInt(page, 10);
  }

  const limit = params.get("limit");
  if (limit) {
    result.pageSize = parseInt(limit, 10);
  }

  const sort = params.get("sort");
  if (sort) {
    result.sortField = sort;
  }

  const order = params.get("order");
  if (order === "asc" || order === "desc") {
    result.sortDirection = order;
  }

  return result;
}

/**
 * Convert search params to filter object
 */
export function searchParamsToFilters(
  params: SearchQueryParams,
): AuditLogFilters {
  const filters: AuditLogFilters = {};

  if (params.query) {
    filters.searchQuery = params.query;
  }

  if (params.categories) {
    filters.category = params.categories;
  }

  if (params.actions) {
    filters.action = params.actions;
  }

  if (params.severities) {
    filters.severity = params.severities;
  }

  if (params.actorId) {
    filters.actorId = params.actorId;
  }

  if (params.resourceId) {
    filters.resourceId = params.resourceId;
  }

  if (params.startDate) {
    filters.startDate = new Date(params.startDate);
  }

  if (params.endDate) {
    filters.endDate = new Date(params.endDate);
  }

  if (params.success !== undefined) {
    filters.success = params.success;
  }

  return filters;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get unique values for a field from entries
 */
export function getUniqueFieldValues<T extends keyof AuditLogEntry>(
  entries: AuditLogEntry[],
  field: T,
): AuditLogEntry[T][] {
  const values = new Set<AuditLogEntry[T]>();
  entries.forEach((entry) => {
    if (entry[field] !== undefined) {
      values.add(entry[field]);
    }
  });
  return Array.from(values);
}

/**
 * Get entries by actor ID
 */
export function getEntriesByActor(
  entries: AuditLogEntry[],
  actorId: string,
): AuditLogEntry[] {
  return entries.filter((entry) => entry.actor.id === actorId);
}

/**
 * Get entries by resource ID
 */
export function getEntriesByResource(
  entries: AuditLogEntry[],
  resourceId: string,
): AuditLogEntry[] {
  return entries.filter((entry) => entry.resource?.id === resourceId);
}

/**
 * Get entries within a time range
 */
export function getEntriesInTimeRange(
  entries: AuditLogEntry[],
  start: Date,
  end: Date,
): AuditLogEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= start && entryDate <= end;
  });
}

/**
 * Get failed entries
 */
export function getFailedEntries(entries: AuditLogEntry[]): AuditLogEntry[] {
  return entries.filter((entry) => !entry.success);
}

/**
 * Get entries by severity
 */
export function getEntriesBySeverity(
  entries: AuditLogEntry[],
  severity: AuditSeverity,
): AuditLogEntry[] {
  return entries.filter((entry) => entry.severity === severity);
}

/**
 * Get critical and error entries
 */
export function getHighSeverityEntries(
  entries: AuditLogEntry[],
): AuditLogEntry[] {
  return entries.filter(
    (entry) => entry.severity === "critical" || entry.severity === "error",
  );
}
