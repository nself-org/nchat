/**
 * Audit Log - Audit log handling utilities for the admin dashboard
 *
 * Provides functions to log admin actions, query audit log entries,
 * and export audit logs.
 */

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | "user.create"
  | "user.delete"
  | "user.suspend"
  | "user.unsuspend"
  | "user.role_change"
  | "user.password_reset"
  | "channel.create"
  | "channel.delete"
  | "channel.archive"
  | "channel.unarchive"
  | "settings.update"
  | "message.delete"
  | "message.restore"
  | "integration.add"
  | "integration.remove"
  | "export.create"
  | "import.complete";

export type AuditTargetType =
  | "user"
  | "channel"
  | "message"
  | "settings"
  | "integration";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  actorId?: string;
  actorEmail?: string;
  action?: AuditAction | AuditAction[];
  targetType?: AuditTargetType | AuditTargetType[];
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface AuditLogSortOptions {
  field: "timestamp" | "action" | "actorEmail" | "targetType";
  direction: "asc" | "desc";
}

export interface AuditLogPagination {
  page: number;
  pageSize: number;
}

export interface PaginatedAuditLog {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CreateAuditLogInput {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExportOptions {
  format: "json" | "csv";
  filters?: AuditLogFilters;
  includeDetails?: boolean;
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  entryCount: number;
}

// ============================================================================
// Audit Log Creation
// ============================================================================

/**
 * Generate a unique ID for audit log entries
 */
export function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `audit-${timestamp}-${random}`;
}

/**
 * Create a new audit log entry
 */
export function createAuditLogEntry(input: CreateAuditLogInput): AuditLogEntry {
  return {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    details: input.details ?? {},
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };
}

/**
 * Create audit log for user creation
 */
export function logUserCreate(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string; email: string; role: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.create",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for user deletion
 */
export function logUserDelete(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string; reason?: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.delete",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for user suspension
 */
export function logUserSuspend(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string; reason: string; duration?: number },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.suspend",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for user unsuspension
 */
export function logUserUnsuspend(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.unsuspend",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for role change
 */
export function logRoleChange(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string; oldRole: string; newRole: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.role_change",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for password reset
 */
export function logPasswordReset(
  actorId: string,
  actorEmail: string,
  targetUserId: string,
  details: { username: string; method: "temporary" | "link" },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "user.password_reset",
    targetType: "user",
    targetId: targetUserId,
    details,
  });
}

/**
 * Create audit log for channel operations
 */
export function logChannelAction(
  actorId: string,
  actorEmail: string,
  action:
    | "channel.create"
    | "channel.delete"
    | "channel.archive"
    | "channel.unarchive",
  targetChannelId: string,
  details: { name: string; reason?: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action,
    targetType: "channel",
    targetId: targetChannelId,
    details,
  });
}

/**
 * Create audit log for settings update
 */
export function logSettingsUpdate(
  actorId: string,
  actorEmail: string,
  details: { changes: Record<string, { old: unknown; new: unknown }> },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "settings.update",
    targetType: "settings",
    targetId: "global",
    details,
  });
}

/**
 * Create audit log for message deletion
 */
export function logMessageDelete(
  actorId: string,
  actorEmail: string,
  targetMessageId: string,
  details: { channelId: string; authorId: string; reason?: string },
): AuditLogEntry {
  return createAuditLogEntry({
    actorId,
    actorEmail,
    action: "message.delete",
    targetType: "message",
    targetId: targetMessageId,
    details,
  });
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Filter audit log entries by action
 */
export function filterByAction(
  entries: AuditLogEntry[],
  action: AuditAction | AuditAction[],
): AuditLogEntry[] {
  const actions = Array.isArray(action) ? action : [action];
  if (actions.length === 0) return entries;
  return entries.filter((entry) => actions.includes(entry.action));
}

/**
 * Filter audit log entries by target type
 */
export function filterByTargetType(
  entries: AuditLogEntry[],
  targetType: AuditTargetType | AuditTargetType[],
): AuditLogEntry[] {
  const types = Array.isArray(targetType) ? targetType : [targetType];
  if (types.length === 0) return entries;
  return entries.filter((entry) => types.includes(entry.targetType));
}

/**
 * Filter audit log entries by actor
 */
export function filterByActor(
  entries: AuditLogEntry[],
  actorId?: string,
  actorEmail?: string,
): AuditLogEntry[] {
  return entries.filter((entry) => {
    if (actorId && entry.actorId !== actorId) return false;
    if (
      actorEmail &&
      !entry.actorEmail.toLowerCase().includes(actorEmail.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Filter audit log entries by target
 */
export function filterByTarget(
  entries: AuditLogEntry[],
  targetId: string,
): AuditLogEntry[] {
  return entries.filter((entry) => entry.targetId === targetId);
}

/**
 * Filter audit log entries by date range
 */
export function filterByDateRange(
  entries: AuditLogEntry[],
  startDate?: Date,
  endDate?: Date,
): AuditLogEntry[] {
  return entries.filter((entry) => {
    const timestamp = new Date(entry.timestamp);
    if (startDate && timestamp < startDate) return false;
    if (endDate && timestamp > endDate) return false;
    return true;
  });
}

/**
 * Filter audit log entries by search query
 */
export function filterBySearch(
  entries: AuditLogEntry[],
  search: string,
): AuditLogEntry[] {
  if (!search || search.trim() === "") return entries;

  const searchLower = search.toLowerCase().trim();
  return entries.filter((entry) => {
    // Search in action
    if (entry.action.toLowerCase().includes(searchLower)) return true;
    // Search in actor email
    if (entry.actorEmail.toLowerCase().includes(searchLower)) return true;
    // Search in target ID
    if (entry.targetId.toLowerCase().includes(searchLower)) return true;
    // Search in details (shallow)
    for (const value of Object.values(entry.details)) {
      if (
        typeof value === "string" &&
        value.toLowerCase().includes(searchLower)
      ) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Apply all filters to audit log entries
 */
export function applyFilters(
  entries: AuditLogEntry[],
  filters: AuditLogFilters,
): AuditLogEntry[] {
  let result = [...entries];

  if (filters.actorId || filters.actorEmail) {
    result = filterByActor(result, filters.actorId, filters.actorEmail);
  }

  if (filters.action) {
    result = filterByAction(result, filters.action);
  }

  if (filters.targetType) {
    result = filterByTargetType(result, filters.targetType);
  }

  if (filters.targetId) {
    result = filterByTarget(result, filters.targetId);
  }

  if (filters.startDate || filters.endDate) {
    result = filterByDateRange(result, filters.startDate, filters.endDate);
  }

  if (filters.search) {
    result = filterBySearch(result, filters.search);
  }

  return result;
}

/**
 * Sort audit log entries
 */
export function sortAuditLog(
  entries: AuditLogEntry[],
  options: AuditLogSortOptions,
): AuditLogEntry[] {
  const { field, direction } = options;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case "timestamp":
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
        break;
      case "action":
        aValue = a.action;
        bValue = b.action;
        break;
      case "actorEmail":
        aValue = a.actorEmail.toLowerCase();
        bValue = b.actorEmail.toLowerCase();
        break;
      case "targetType":
        aValue = a.targetType;
        bValue = b.targetType;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return -1 * multiplier;
    if (aValue > bValue) return 1 * multiplier;
    return 0;
  });
}

/**
 * Paginate audit log entries
 */
export function paginateAuditLog(
  entries: AuditLogEntry[],
  options: AuditLogPagination,
): PaginatedAuditLog {
  const { page, pageSize } = options;
  const total = entries.length;
  const totalPages = Math.ceil(total / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = entries.slice(startIndex, endIndex);

  return {
    entries: items,
    total,
    page: validPage,
    pageSize,
    totalPages,
    hasNext: validPage < totalPages,
    hasPrev: validPage > 1,
  };
}

/**
 * Query audit log with filters, sorting, and pagination
 */
export function queryAuditLog(
  entries: AuditLogEntry[],
  filters?: AuditLogFilters,
  sort?: AuditLogSortOptions,
  pagination?: AuditLogPagination,
): PaginatedAuditLog {
  let result = [...entries];

  // Apply filters
  if (filters) {
    result = applyFilters(result, filters);
  }

  // Apply sorting
  if (sort) {
    result = sortAuditLog(result, sort);
  } else {
    // Default sort by timestamp desc
    result = sortAuditLog(result, { field: "timestamp", direction: "desc" });
  }

  // Apply pagination
  const paginationOptions = pagination || { page: 1, pageSize: 50 };
  return paginateAuditLog(result, paginationOptions);
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export audit log to JSON format
 */
export function exportToJson(
  entries: AuditLogEntry[],
  includeDetails: boolean = true,
): string {
  const exportData = entries.map((entry) => {
    if (includeDetails) {
      return entry;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { details, ...rest } = entry;
    return rest;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export audit log to CSV format
 */
export function exportToCsv(
  entries: AuditLogEntry[],
  includeDetails: boolean = true,
): string {
  const headers = [
    "id",
    "timestamp",
    "actorId",
    "actorEmail",
    "action",
    "targetType",
    "targetId",
  ];
  if (includeDetails) {
    headers.push("details");
  }

  const rows = entries.map((entry) => {
    const row = [
      entry.id,
      entry.timestamp,
      entry.actorId,
      entry.actorEmail,
      entry.action,
      entry.targetType,
      entry.targetId,
    ];
    if (includeDetails) {
      row.push(JSON.stringify(entry.details).replace(/"/g, '""'));
    }
    return row.map((cell) => `"${cell}"`).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Export audit log with options
 */
export function exportAuditLog(
  entries: AuditLogEntry[],
  options: ExportOptions,
): ExportResult {
  let filteredEntries = [...entries];

  if (options.filters) {
    filteredEntries = applyFilters(filteredEntries, options.filters);
  }

  // Sort by timestamp desc for export
  filteredEntries = sortAuditLog(filteredEntries, {
    field: "timestamp",
    direction: "desc",
  });

  const includeDetails = options.includeDetails ?? true;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (options.format === "json") {
    return {
      data: exportToJson(filteredEntries, includeDetails),
      filename: `audit-log-${timestamp}.json`,
      mimeType: "application/json",
      entryCount: filteredEntries.length,
    };
  }

  return {
    data: exportToCsv(filteredEntries, includeDetails),
    filename: `audit-log-${timestamp}.csv`,
    mimeType: "text/csv",
    entryCount: filteredEntries.length,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable action label
 */
export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    "user.create": "Created user",
    "user.delete": "Deleted user",
    "user.suspend": "Suspended user",
    "user.unsuspend": "Unsuspended user",
    "user.role_change": "Changed user role",
    "user.password_reset": "Reset user password",
    "channel.create": "Created channel",
    "channel.delete": "Deleted channel",
    "channel.archive": "Archived channel",
    "channel.unarchive": "Unarchived channel",
    "settings.update": "Updated settings",
    "message.delete": "Deleted message",
    "message.restore": "Restored message",
    "integration.add": "Added integration",
    "integration.remove": "Removed integration",
    "export.create": "Created export",
    "import.complete": "Completed import",
  };
  return labels[action] || action;
}

/**
 * Get action category
 */
export function getActionCategory(action: AuditAction): string {
  if (action.startsWith("user.")) return "User";
  if (action.startsWith("channel.")) return "Channel";
  if (action.startsWith("message.")) return "Message";
  if (action.startsWith("settings.")) return "Settings";
  if (action.startsWith("integration.")) return "Integration";
  if (action.startsWith("export.") || action.startsWith("import."))
    return "Data";
  return "Other";
}

/**
 * Get action color for display
 */
export function getActionColor(action: AuditAction): string {
  // Check positive actions first (unsuspend contains 'suspend' so check this first)
  if (
    action.includes("unsuspend") ||
    action.includes("create") ||
    action.includes("restore")
  ) {
    return "#22C55E"; // green
  }
  // Then check negative actions
  if (action.includes("delete") || action.includes("suspend")) {
    return "#EF4444"; // red
  }
  if (action.includes("update") || action.includes("change")) {
    return "#F59E0B"; // amber
  }
  return "#6B7280"; // gray
}

/**
 * Format timestamp for display
 */
export function formatAuditTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Get summary of audit log entries by action
 */
export function getAuditSummary(
  entries: AuditLogEntry[],
): Record<AuditAction, number> {
  const summary: Partial<Record<AuditAction, number>> = {};

  for (const entry of entries) {
    summary[entry.action] = (summary[entry.action] ?? 0) + 1;
  }

  return summary as Record<AuditAction, number>;
}

/**
 * Get most active actors from audit log
 */
export function getMostActiveActors(
  entries: AuditLogEntry[],
  limit: number = 10,
): Array<{ actorId: string; actorEmail: string; actionCount: number }> {
  const actorMap = new Map<
    string,
    { actorId: string; actorEmail: string; actionCount: number }
  >();

  for (const entry of entries) {
    const existing = actorMap.get(entry.actorId);
    if (existing) {
      existing.actionCount++;
    } else {
      actorMap.set(entry.actorId, {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        actionCount: 1,
      });
    }
  }

  return Array.from(actorMap.values())
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, limit);
}
