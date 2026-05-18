/**
 * Audit Logger - Permission and role change audit logging
 *
 * Provides comprehensive logging for permission checks, role changes,
 * and access denials for security auditing and compliance.
 */

import { type Permission, type Role } from "@/types/rbac";
import { type PermissionResult } from "./permission-builder";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Audit event types
 */
export type AuditEventType =
  | "permission_check"
  | "permission_granted"
  | "permission_denied"
  | "role_assigned"
  | "role_removed"
  | "role_created"
  | "role_updated"
  | "role_deleted"
  | "user_banned"
  | "user_unbanned"
  | "user_muted"
  | "user_unmuted"
  | "channel_permission_override"
  | "channel_permission_revoked"
  | "login"
  | "logout"
  | "access_denied";

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string;
  actorId?: string;
  permission?: Permission;
  role?: Role;
  channelId?: string;
  resourceType?: string;
  resourceId?: string;
  result?: PermissionResult;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log query options
 */
export interface AuditLogQuery {
  userId?: string;
  actorId?: string;
  eventTypes?: AuditEventType[];
  startDate?: Date;
  endDate?: Date;
  permission?: Permission;
  role?: Role;
  channelId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit log query result
 */
export interface AuditLogQueryResult {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  enabled: boolean;
  logPermissionChecks: boolean;
  logGranted: boolean;
  logDenied: boolean;
  logRoleChanges: boolean;
  maxEntries: number;
  onLog?: (entry: AuditLogEntry) => void;
  persistFn?: (entry: AuditLogEntry) => Promise<void>;
}

/**
 * Audit statistics
 */
export interface AuditStats {
  totalEntries: number;
  permissionChecks: number;
  permissionGranted: number;
  permissionDenied: number;
  roleChanges: number;
  accessDenials: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

// ============================================================================
// Audit Logger Implementation
// ============================================================================

/**
 * Audit logger for RBAC events
 */
export class AuditLogger {
  private entries: AuditLogEntry[] = [];
  private config: AuditLoggerConfig;

  constructor(config?: Partial<AuditLoggerConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      logPermissionChecks: config?.logPermissionChecks ?? false,
      logGranted: config?.logGranted ?? true,
      logDenied: config?.logDenied ?? true,
      logRoleChanges: config?.logRoleChanges ?? true,
      maxEntries: config?.maxEntries ?? 10000,
      onLog: config?.onLog,
      persistFn: config?.persistFn,
    };
  }

  // -------------------------------------------------------------------------
  // Permission Logging
  // -------------------------------------------------------------------------

  /**
   * Log a permission check
   */
  logPermissionCheck(params: {
    userId: string;
    permission: Permission;
    result: PermissionResult;
    actorId?: string;
    channelId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    // Check if we should log based on result
    if (!this.config.logPermissionChecks) {
      if (params.result.allowed && !this.config.logGranted) return null;
      if (!params.result.allowed && !this.config.logDenied) return null;
    }

    const eventType: AuditEventType = params.result.allowed
      ? "permission_granted"
      : "permission_denied";

    const entry = this.createEntry({
      eventType,
      userId: params.userId,
      actorId: params.actorId,
      permission: params.permission,
      channelId: params.channelId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      result: params.result,
      metadata: params.metadata,
    });

    return this.addEntry(entry);
  }

  /**
   * Log an access denied event
   */
  logAccessDenied(params: {
    userId: string;
    permission?: Permission;
    resource?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logDenied) return null;

    const entry = this.createEntry({
      eventType: "access_denied",
      userId: params.userId,
      permission: params.permission,
      result: { allowed: false, reason: params.reason },
      metadata: {
        ...params.metadata,
        resource: params.resource,
      },
    });

    return this.addEntry(entry);
  }

  // -------------------------------------------------------------------------
  // Role Change Logging
  // -------------------------------------------------------------------------

  /**
   * Log a role assignment
   */
  logRoleAssigned(params: {
    userId: string;
    role: Role;
    actorId: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logRoleChanges) return null;

    const entry = this.createEntry({
      eventType: "role_assigned",
      userId: params.userId,
      actorId: params.actorId,
      role: params.role,
      metadata: {
        ...params.metadata,
        reason: params.reason,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log a role removal
   */
  logRoleRemoved(params: {
    userId: string;
    role: Role;
    actorId: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logRoleChanges) return null;

    const entry = this.createEntry({
      eventType: "role_removed",
      userId: params.userId,
      actorId: params.actorId,
      role: params.role,
      metadata: {
        ...params.metadata,
        reason: params.reason,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log role creation
   */
  logRoleCreated(params: {
    role: Role;
    roleName: string;
    actorId: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logRoleChanges) return null;

    const entry = this.createEntry({
      eventType: "role_created",
      userId: params.actorId, // The actor is the user for this event
      actorId: params.actorId,
      role: params.role,
      metadata: {
        ...params.metadata,
        roleName: params.roleName,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log role update
   */
  logRoleUpdated(params: {
    role: Role;
    roleName: string;
    actorId: string;
    changes: Record<string, { from: unknown; to: unknown }>;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logRoleChanges) return null;

    const entry = this.createEntry({
      eventType: "role_updated",
      userId: params.actorId,
      actorId: params.actorId,
      role: params.role,
      metadata: {
        ...params.metadata,
        roleName: params.roleName,
        changes: params.changes,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log role deletion
   */
  logRoleDeleted(params: {
    role: Role;
    roleName: string;
    actorId: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled || !this.config.logRoleChanges) return null;

    const entry = this.createEntry({
      eventType: "role_deleted",
      userId: params.actorId,
      actorId: params.actorId,
      role: params.role,
      metadata: {
        ...params.metadata,
        roleName: params.roleName,
      },
    });

    return this.addEntry(entry);
  }

  // -------------------------------------------------------------------------
  // User Action Logging
  // -------------------------------------------------------------------------

  /**
   * Log a user ban
   */
  logUserBanned(params: {
    userId: string;
    actorId: string;
    channelId?: string;
    reason?: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "user_banned",
      userId: params.userId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: {
        ...params.metadata,
        reason: params.reason,
        duration: params.duration,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log a user unban
   */
  logUserUnbanned(params: {
    userId: string;
    actorId: string;
    channelId?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "user_unbanned",
      userId: params.userId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: params.metadata,
    });

    return this.addEntry(entry);
  }

  /**
   * Log a user mute
   */
  logUserMuted(params: {
    userId: string;
    actorId: string;
    channelId?: string;
    duration?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "user_muted",
      userId: params.userId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: {
        ...params.metadata,
        reason: params.reason,
        duration: params.duration,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log a user unmute
   */
  logUserUnmuted(params: {
    userId: string;
    actorId: string;
    channelId?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "user_unmuted",
      userId: params.userId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: params.metadata,
    });

    return this.addEntry(entry);
  }

  // -------------------------------------------------------------------------
  // Channel Permission Logging
  // -------------------------------------------------------------------------

  /**
   * Log a channel permission override
   */
  logChannelPermissionOverride(params: {
    channelId: string;
    targetType: "user" | "role";
    targetId: string;
    actorId: string;
    allow: Permission[];
    deny: Permission[];
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "channel_permission_override",
      userId: params.targetType === "user" ? params.targetId : params.actorId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: {
        ...params.metadata,
        targetType: params.targetType,
        targetId: params.targetId,
        allow: params.allow,
        deny: params.deny,
      },
    });

    return this.addEntry(entry);
  }

  /**
   * Log a channel permission revocation
   */
  logChannelPermissionRevoked(params: {
    channelId: string;
    targetType: "user" | "role";
    targetId: string;
    actorId: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "channel_permission_revoked",
      userId: params.targetType === "user" ? params.targetId : params.actorId,
      actorId: params.actorId,
      channelId: params.channelId,
      metadata: {
        ...params.metadata,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    });

    return this.addEntry(entry);
  }

  // -------------------------------------------------------------------------
  // Authentication Logging
  // -------------------------------------------------------------------------

  /**
   * Log a login event
   */
  logLogin(params: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "login",
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });

    return this.addEntry(entry);
  }

  /**
   * Log a logout event
   */
  logLogout(params: {
    userId: string;
    metadata?: Record<string, unknown>;
  }): AuditLogEntry | null {
    if (!this.config.enabled) return null;

    const entry = this.createEntry({
      eventType: "logout",
      userId: params.userId,
      metadata: params.metadata,
    });

    return this.addEntry(entry);
  }

  // -------------------------------------------------------------------------
  // Query Methods
  // -------------------------------------------------------------------------

  /**
   * Query audit log entries
   */
  query(options: AuditLogQuery): AuditLogQueryResult {
    let filtered = [...this.entries];

    // Apply filters
    if (options.userId) {
      filtered = filtered.filter((e) => e.userId === options.userId);
    }

    if (options.actorId) {
      filtered = filtered.filter((e) => e.actorId === options.actorId);
    }

    if (options.eventTypes && options.eventTypes.length > 0) {
      filtered = filtered.filter((e) =>
        options.eventTypes!.includes(e.eventType),
      );
    }

    if (options.startDate) {
      filtered = filtered.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((e) => e.timestamp <= options.endDate!);
    }

    if (options.permission) {
      filtered = filtered.filter((e) => e.permission === options.permission);
    }

    if (options.role) {
      filtered = filtered.filter((e) => e.role === options.role);
    }

    if (options.channelId) {
      filtered = filtered.filter((e) => e.channelId === options.channelId);
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const total = filtered.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;

    const entries = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { entries, total, hasMore };
  }

  /**
   * Get entries by user ID
   */
  getByUser(userId: string, limit?: number): AuditLogEntry[] {
    const result = this.query({ userId, limit });
    return result.entries;
  }

  /**
   * Get entries by actor ID
   */
  getByActor(actorId: string, limit?: number): AuditLogEntry[] {
    const result = this.query({ actorId, limit });
    return result.entries;
  }

  /**
   * Get entries by event type
   */
  getByEventType(eventType: AuditEventType, limit?: number): AuditLogEntry[] {
    const result = this.query({ eventTypes: [eventType], limit });
    return result.entries;
  }

  /**
   * Get recent entries
   */
  getRecent(limit: number = 100): AuditLogEntry[] {
    const result = this.query({ limit });
    return result.entries;
  }

  /**
   * Get entry by ID
   */
  getById(id: string): AuditLogEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    const stats: AuditStats = {
      totalEntries: this.entries.length,
      permissionChecks: 0,
      permissionGranted: 0,
      permissionDenied: 0,
      roleChanges: 0,
      accessDenials: 0,
    };

    this.entries.forEach((entry) => {
      switch (entry.eventType) {
        case "permission_check":
          stats.permissionChecks++;
          break;
        case "permission_granted":
          stats.permissionGranted++;
          break;
        case "permission_denied":
          stats.permissionDenied++;
          break;
        case "access_denied":
          stats.accessDenials++;
          break;
        case "role_assigned":
        case "role_removed":
        case "role_created":
        case "role_updated":
        case "role_deleted":
          stats.roleChanges++;
          break;
      }
    });

    if (this.entries.length > 0) {
      // Entries are not guaranteed to be sorted
      const sorted = [...this.entries].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      stats.oldestEntry = sorted[0].timestamp;
      stats.newestEntry = sorted[sorted.length - 1].timestamp;
    }

    return stats;
  }

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  /**
   * Update configuration
   */
  configure(config: Partial<AuditLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuditLoggerConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // -------------------------------------------------------------------------
  // Maintenance
  // -------------------------------------------------------------------------

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get total entry count
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Export entries for external storage
   */
  export(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * Import entries from external storage
   */
  import(entries: AuditLogEntry[]): void {
    entries.forEach((entry) => {
      // Ensure date objects
      if (typeof entry.timestamp === "string") {
        entry.timestamp = new Date(entry.timestamp);
      }
      this.entries.push(entry);
    });

    // Trim if over max
    while (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * Purge entries older than a date
   */
  purgeOlderThan(date: Date): number {
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp >= date);
    return before - this.entries.length;
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  /**
   * Create a new audit entry
   */
  private createEntry(
    params: Partial<AuditLogEntry> & {
      eventType: AuditEventType;
      userId: string;
    },
  ): AuditLogEntry {
    return {
      id: generateId(),
      timestamp: new Date(),
      eventType: params.eventType,
      userId: params.userId,
      actorId: params.actorId,
      permission: params.permission,
      role: params.role,
      channelId: params.channelId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      result: params.result,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    };
  }

  /**
   * Add an entry to the log
   */
  private addEntry(entry: AuditLogEntry): AuditLogEntry {
    this.entries.push(entry);

    // Trim if over max
    while (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    // Call onLog callback
    if (this.config.onLog) {
      this.config.onLog(entry);
    }

    // Persist if configured
    if (this.config.persistFn) {
      this.config.persistFn(entry).catch((err) => {
        logger.error("Failed to persist audit log entry:", err);
      });
    }

    return entry;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new audit logger
 */
export function createAuditLogger(
  config?: Partial<AuditLoggerConfig>,
): AuditLogger {
  return new AuditLogger(config);
}

/**
 * Create a minimal audit logger (only logs denials and role changes)
 */
export function createMinimalAuditLogger(): AuditLogger {
  return new AuditLogger({
    enabled: true,
    logPermissionChecks: false,
    logGranted: false,
    logDenied: true,
    logRoleChanges: true,
    maxEntries: 5000,
  });
}

/**
 * Create a comprehensive audit logger (logs everything)
 */
export function createComprehensiveAuditLogger(): AuditLogger {
  return new AuditLogger({
    enabled: true,
    logPermissionChecks: true,
    logGranted: true,
    logDenied: true,
    logRoleChanges: true,
    maxEntries: 50000,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format an audit entry for display
 */
export function formatAuditEntry(entry: AuditLogEntry): string {
  const parts = [
    `[${entry.timestamp.toISOString()}]`,
    entry.eventType.toUpperCase(),
    `user:${entry.userId}`,
  ];

  if (entry.actorId && entry.actorId !== entry.userId) {
    parts.push(`by:${entry.actorId}`);
  }

  if (entry.permission) {
    parts.push(`perm:${entry.permission}`);
  }

  if (entry.role) {
    parts.push(`role:${entry.role}`);
  }

  if (entry.channelId) {
    parts.push(`ch:${entry.channelId}`);
  }

  if (entry.result) {
    parts.push(entry.result.allowed ? "GRANTED" : "DENIED");
    if (entry.result.reason) {
      parts.push(`(${entry.result.reason})`);
    }
  }

  return parts.join(" ");
}

/**
 * Group audit entries by date
 */
export function groupByDate(
  entries: AuditLogEntry[],
): Map<string, AuditLogEntry[]> {
  const groups = new Map<string, AuditLogEntry[]>();

  entries.forEach((entry) => {
    const date = entry.timestamp.toISOString().split("T")[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(entry);
  });

  return groups;
}

/**
 * Group audit entries by user
 */
export function groupByUser(
  entries: AuditLogEntry[],
): Map<string, AuditLogEntry[]> {
  const groups = new Map<string, AuditLogEntry[]>();

  entries.forEach((entry) => {
    if (!groups.has(entry.userId)) {
      groups.set(entry.userId, []);
    }
    groups.get(entry.userId)!.push(entry);
  });

  return groups;
}

/**
 * Group audit entries by event type
 */
export function groupByEventType(
  entries: AuditLogEntry[],
): Map<AuditEventType, AuditLogEntry[]> {
  const groups = new Map<AuditEventType, AuditLogEntry[]>();

  entries.forEach((entry) => {
    if (!groups.has(entry.eventType)) {
      groups.set(entry.eventType, []);
    }
    groups.get(entry.eventType)!.push(entry);
  });

  return groups;
}
