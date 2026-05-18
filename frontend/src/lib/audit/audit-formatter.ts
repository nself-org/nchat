/**
 * Audit Formatter - Format audit log entries for display and export
 *
 * This module provides formatting utilities for audit log entries,
 * including human-readable descriptions, timestamps, and export formats.
 */

import type {
  AuditAction,
  AuditCategory,
  AuditLogEntry,
  AuditSeverity,
  categoryColors,
  categoryDisplayNames,
  severityColors,
  severityDisplayNames,
} from "./audit-types";
import {
  eventDescriptionTemplates,
  getActionDisplayName,
} from "./audit-events";

// ============================================================================
// Date/Time Formatting
// ============================================================================

/**
 * Format a date for display
 */
export function formatTimestamp(
  date: Date | string,
  format: "short" | "long" | "relative" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (format) {
    case "short":
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    case "long":
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short",
      });
    case "relative":
      return formatRelativeTime(d);
    default:
      return d.toISOString();
  }
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }
}

/**
 * Format a date range
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} - ${endStr}`;
}

// ============================================================================
// Description Formatting
// ============================================================================

/**
 * Format an audit entry description with placeholders replaced
 */
export function formatDescription(entry: AuditLogEntry): string {
  const template = eventDescriptionTemplates[entry.action];
  if (!template) {
    return entry.description;
  }

  let description = template;

  // Replace actor placeholder
  const actorName =
    entry.actor.displayName ??
    entry.actor.username ??
    entry.actor.email ??
    entry.actor.id;
  description = description.replace("{actor}", actorName);

  // Replace target placeholder
  if (entry.target) {
    const targetName = entry.target.name ?? entry.target.id;
    description = description.replace("{target}", targetName);
  }

  // Replace resource placeholder
  if (entry.resource) {
    const resourceName = entry.resource.name ?? entry.resource.id;
    description = description.replace("{channel}", resourceName);
    description = description.replace("{resource}", resourceName);
  }

  // Replace metadata placeholders
  if (entry.metadata) {
    for (const [key, value] of Object.entries(entry.metadata)) {
      description = description.replace(`{${key}}`, String(value));
    }
  }

  return description;
}

/**
 * Generate a summary of an audit entry
 */
export function formatEntrySummary(entry: AuditLogEntry): string {
  const actorName =
    entry.actor.displayName ?? entry.actor.username ?? entry.actor.id;
  const action = getActionDisplayName(entry.action);
  const time = formatTimestamp(entry.timestamp, "relative");

  let summary = `${actorName} ${action.toLowerCase()}`;

  if (entry.resource) {
    summary += ` ${entry.resource.type}`;
    if (entry.resource.name) {
      summary += ` "${entry.resource.name}"`;
    }
  }

  summary += ` ${time}`;

  return summary;
}

// ============================================================================
// Export Formatting
// ============================================================================

/**
 * Format an audit entry for CSV export
 */
export function formatEntryForCSV(
  entry: AuditLogEntry,
): Record<string, string> {
  return {
    id: entry.id,
    timestamp: entry.timestamp.toISOString(),
    category: entry.category,
    action: entry.action,
    severity: entry.severity,
    actor_id: entry.actor.id,
    actor_type: entry.actor.type,
    actor_email: entry.actor.email ?? "",
    actor_username: entry.actor.username ?? "",
    resource_type: entry.resource?.type ?? "",
    resource_id: entry.resource?.id ?? "",
    resource_name: entry.resource?.name ?? "",
    description: entry.description,
    success: entry.success ? "true" : "false",
    error_message: entry.errorMessage ?? "",
    ip_address: entry.ipAddress ?? "",
    request_id: entry.requestId ?? "",
  };
}

/**
 * Format audit entries for JSON export
 */
export function formatEntriesForJSON(
  entries: AuditLogEntry[],
  includeMetadata = true,
): string {
  const formattedEntries = entries.map((entry) => {
    const base = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      category: entry.category,
      action: entry.action,
      severity: entry.severity,
      actor: entry.actor,
      description: entry.description,
      success: entry.success,
    };

    if (includeMetadata) {
      return {
        ...base,
        resource: entry.resource,
        target: entry.target,
        metadata: entry.metadata,
        errorMessage: entry.errorMessage,
        ipAddress: entry.ipAddress,
        geoLocation: entry.geoLocation,
        requestId: entry.requestId,
        correlationId: entry.correlationId,
      };
    }

    return base;
  });

  return JSON.stringify(formattedEntries, null, 2);
}

/**
 * Generate CSV headers
 */
export function getCSVHeaders(): string[] {
  return [
    "id",
    "timestamp",
    "category",
    "action",
    "severity",
    "actor_id",
    "actor_type",
    "actor_email",
    "actor_username",
    "resource_type",
    "resource_id",
    "resource_name",
    "description",
    "success",
    "error_message",
    "ip_address",
    "request_id",
  ];
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Get a badge color class for a severity level
 */
export function getSeverityBadgeClass(severity: AuditSeverity): string {
  switch (severity) {
    case "info":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "critical":
      return "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

/**
 * Get a badge color class for a category
 */
export function getCategoryBadgeClass(category: AuditCategory): string {
  switch (category) {
    case "user":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "message":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "channel":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "file":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "admin":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "security":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "integration":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

/**
 * Get an icon name for a category
 */
export function getCategoryIcon(category: AuditCategory): string {
  switch (category) {
    case "user":
      return "User";
    case "message":
      return "MessageSquare";
    case "channel":
      return "Hash";
    case "file":
      return "File";
    case "admin":
      return "Shield";
    case "security":
      return "Lock";
    case "integration":
      return "Puzzle";
    default:
      return "Activity";
  }
}

/**
 * Get an icon name for a severity level
 */
export function getSeverityIcon(severity: AuditSeverity): string {
  switch (severity) {
    case "info":
      return "Info";
    case "warning":
      return "AlertTriangle";
    case "error":
      return "XCircle";
    case "critical":
      return "AlertOctagon";
    default:
      return "Circle";
  }
}

// ============================================================================
// Text Formatting
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format IP address for display (optionally masked)
 */
export function formatIPAddress(ip: string, mask = false): string {
  if (!mask) {
    return ip;
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format a count with optional abbreviation
 */
export function formatCount(count: number, abbreviate = false): string {
  if (!abbreviate || count < 1000) {
    return count.toLocaleString();
  }

  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  }

  return `${(count / 1000000).toFixed(1)}M`;
}
