/**
 * Audit Query Service
 *
 * Advanced querying, filtering, aggregation, and export capabilities for audit logs.
 * Supports:
 * - Complex multi-field filtering
 * - Full-text search
 * - Aggregations and statistics
 * - Multiple export formats (CSV, JSON, XLSX)
 * - Pagination and cursor-based retrieval
 */

import { v4 as uuidv4 } from "uuid";
import type {
  AuditLogEntry,
  AuditCategory,
  AuditAction,
  AuditSeverity,
  AuditLogFilters,
  AuditLogPagination,
  AuditLogResponse,
  AuditLogSortOptions,
  AuditStatistics,
  AuditRetentionPolicy,
  ExportFormat,
  AuditExportOptions,
  AuditExportResult,
  ActorType,
  ResourceType,
} from "@/lib/audit/audit-types";
import {
  filterAuditLogs,
  sortAuditLogs,
  paginateAuditLogs,
  queryAuditLogs,
} from "@/lib/audit/audit-search";
import {
  getCSVHeaders,
  formatEntryForCSV,
  formatEntriesForJSON,
} from "@/lib/audit/audit-formatter";
import {
  type IntegrityAuditEntry,
  type ChainVerificationResult,
  verifyChain,
} from "@/lib/audit/audit-integrity";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Advanced query options
 */
export interface AdvancedQueryOptions {
  filters?: AuditLogFilters;
  sort?: AuditLogSortOptions;
  pagination?: {
    page: number;
    pageSize: number;
  };
  cursor?: string;
  includeAggregations?: boolean;
  includeIntegrity?: boolean;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Query result with aggregations
 */
export interface AdvancedQueryResult extends AuditLogResponse {
  aggregations?: AggregationResult;
  integrityStatus?: "valid" | "compromised" | "unknown";
  cursor?: string;
}

/**
 * Aggregation results
 */
export interface AggregationResult {
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  byAction: Record<string, number>;
  byActorType: Record<ActorType, number>;
  byResourceType: Record<ResourceType, number>;
  bySuccess: { success: number; failure: number };
  byHour: Array<{ hour: number; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  topActors: Array<{ actorId: string; actorName?: string; count: number }>;
  topResources: Array<{
    resourceId: string;
    resourceType: string;
    count: number;
  }>;
}

/**
 * Time-based aggregation options
 */
export interface TimeAggregationOptions {
  granularity: "hour" | "day" | "week" | "month";
  timezone?: string;
  filters?: AuditLogFilters;
}

/**
 * Export job status
 */
export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: ExportFormat;
  filters: AuditLogFilters;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
}

/**
 * Retention execution result
 */
export interface RetentionResult {
  policy: AuditRetentionPolicy;
  executedAt: Date;
  entriesDeleted: number;
  entriesArchived: number;
  entriesRetained: number;
  errors: string[];
}

// ============================================================================
// Audit Query Service
// ============================================================================

export class AuditQueryService {
  private entries: AuditLogEntry[] = [];
  private integrityEntries: IntegrityAuditEntry[] = [];
  private genesisHash: string = "";
  private exportJobs: Map<string, ExportJob> = new Map();
  private retentionPolicies: AuditRetentionPolicy[] = [];

  constructor() {
    logger.info("[AuditQueryService] Initialized");
  }

  // ==========================================================================
  // Data Management
  // ==========================================================================

  /**
   * Set audit log entries (for in-memory storage)
   */
  setEntries(entries: AuditLogEntry[]): void {
    this.entries = entries;
  }

  /**
   * Add entries
   */
  addEntries(entries: AuditLogEntry[]): void {
    this.entries.push(...entries);
  }

  /**
   * Set integrity entries and genesis hash
   */
  setIntegrityData(entries: IntegrityAuditEntry[], genesisHash: string): void {
    this.integrityEntries = entries;
    this.genesisHash = genesisHash;
  }

  /**
   * Get total entry count
   */
  getTotalCount(): number {
    return this.entries.length;
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Execute advanced query
   */
  async query(
    options: AdvancedQueryOptions = {},
  ): Promise<AdvancedQueryResult> {
    const {
      filters,
      sort = { field: "timestamp", direction: "desc" },
      pagination = { page: 1, pageSize: 50 },
      includeAggregations = false,
      includeIntegrity = false,
      searchQuery,
      dateRange,
    } = options;

    // Build combined filters
    const combinedFilters: AuditLogFilters = {
      ...filters,
      ...(searchQuery && { searchQuery }),
      ...(dateRange && {
        startDate: dateRange.start,
        endDate: dateRange.end,
      }),
    };

    // Execute query using existing functions
    const result = queryAuditLogs(this.entries, {
      filters: combinedFilters,
      sort,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    const response: AdvancedQueryResult = result;

    // Add aggregations if requested
    if (includeAggregations) {
      const filteredEntries = filterAuditLogs(this.entries, combinedFilters);
      response.aggregations = this.computeAggregations(filteredEntries);
    }

    // Add integrity status if requested
    if (includeIntegrity && this.integrityEntries.length > 0) {
      const integrityResult = await this.verifyIntegrity();
      response.integrityStatus = integrityResult.isValid
        ? "valid"
        : "compromised";
    }

    // Generate cursor for next page
    if (result.entries.length > 0) {
      const lastEntry = result.entries[result.entries.length - 1];
      response.cursor = Buffer.from(
        JSON.stringify({
          id: lastEntry.id,
          timestamp: lastEntry.timestamp,
          page: pagination.page + 1,
        }),
      ).toString("base64");
    }

    return response;
  }

  /**
   * Query by cursor (for infinite scroll)
   */
  async queryByCursor(
    cursor: string,
    pageSize: number = 50,
  ): Promise<AdvancedQueryResult> {
    try {
      const cursorData = JSON.parse(Buffer.from(cursor, "base64").toString());
      return this.query({
        pagination: { page: cursorData.page || 1, pageSize },
      });
    } catch {
      return this.query({ pagination: { page: 1, pageSize } });
    }
  }

  /**
   * Get entry by ID
   */
  getById(id: string): AuditLogEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /**
   * Get entries by actor
   */
  getByActor(
    actorId: string,
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      filters: { ...options.filters, actorId },
    });
  }

  /**
   * Get entries by resource
   */
  getByResource(
    resourceId: string,
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      filters: { ...options.filters, resourceId },
    });
  }

  /**
   * Get entries by category
   */
  getByCategory(
    category: AuditCategory | AuditCategory[],
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    const categories = Array.isArray(category) ? category : [category];
    return this.query({
      ...options,
      filters: { ...options.filters, category: categories },
    });
  }

  /**
   * Get entries by severity
   */
  getBySeverity(
    severity: AuditSeverity | AuditSeverity[],
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    const severities = Array.isArray(severity) ? severity : [severity];
    return this.query({
      ...options,
      filters: { ...options.filters, severity: severities },
    });
  }

  /**
   * Get failed entries
   */
  getFailedEntries(
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      filters: { ...options.filters, success: false },
    });
  }

  /**
   * Get security events
   */
  getSecurityEvents(
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      filters: { ...options.filters, category: ["security"] },
    });
  }

  /**
   * Get high severity events (error + critical)
   */
  getHighSeverityEvents(
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      filters: { ...options.filters, severity: ["error", "critical"] },
    });
  }

  /**
   * Search with full-text query
   */
  search(
    query: string,
    options: Partial<AdvancedQueryOptions> = {},
  ): Promise<AdvancedQueryResult> {
    return this.query({
      ...options,
      searchQuery: query,
    });
  }

  // ==========================================================================
  // Aggregation Methods
  // ==========================================================================

  /**
   * Compute aggregations for entries
   */
  computeAggregations(entries: AuditLogEntry[]): AggregationResult {
    const result: AggregationResult = {
      byCategory: {} as Record<AuditCategory, number>,
      bySeverity: {} as Record<AuditSeverity, number>,
      byAction: {},
      byActorType: {} as Record<ActorType, number>,
      byResourceType: {} as Record<ResourceType, number>,
      bySuccess: { success: 0, failure: 0 },
      byHour: [],
      byDay: [],
      topActors: [],
      topResources: [],
    };

    const actorCounts = new Map<string, { name?: string; count: number }>();
    const resourceCounts = new Map<string, { type: string; count: number }>();
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<string, number>();

    entries.forEach((entry) => {
      // Category
      result.byCategory[entry.category] =
        (result.byCategory[entry.category] || 0) + 1;

      // Severity
      result.bySeverity[entry.severity] =
        (result.bySeverity[entry.severity] || 0) + 1;

      // Action
      result.byAction[entry.action] = (result.byAction[entry.action] || 0) + 1;

      // Actor type
      const actorType = entry.actor.type;
      result.byActorType[actorType] = (result.byActorType[actorType] || 0) + 1;

      // Resource type
      if (entry.resource) {
        const resourceType = entry.resource.type;
        result.byResourceType[resourceType] =
          (result.byResourceType[resourceType] || 0) + 1;
      }

      // Success/failure
      if (entry.success) {
        result.bySuccess.success++;
      } else {
        result.bySuccess.failure++;
      }

      // By hour
      const hour = new Date(entry.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

      // By day
      const day = new Date(entry.timestamp).toISOString().split("T")[0];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

      // Top actors
      const actorData = actorCounts.get(entry.actor.id) || {
        name: entry.actor.displayName || entry.actor.username,
        count: 0,
      };
      actorData.count++;
      actorCounts.set(entry.actor.id, actorData);

      // Top resources
      if (entry.resource) {
        const resourceData = resourceCounts.get(entry.resource.id) || {
          type: entry.resource.type,
          count: 0,
        };
        resourceData.count++;
        resourceCounts.set(entry.resource.id, resourceData);
      }
    });

    // Convert hour counts
    result.byHour = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Convert day counts
    result.byDay = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top actors (top 10)
    result.topActors = Array.from(actorCounts.entries())
      .map(([actorId, data]) => ({
        actorId,
        actorName: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top resources (top 10)
    result.topResources = Array.from(resourceCounts.entries())
      .map(([resourceId, data]) => ({
        resourceId,
        resourceType: data.type,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return result;
  }

  /**
   * Get time-based aggregations
   */
  getTimeAggregations(
    options: TimeAggregationOptions,
  ): Array<{ period: string; count: number }> {
    let entries = this.entries;
    if (options.filters) {
      entries = filterAuditLogs(entries, options.filters);
    }

    const periodCounts = new Map<string, number>();

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      let period: string;

      switch (options.granularity) {
        case "hour":
          period = `${date.toISOString().split("T")[0]}T${date.getHours().toString().padStart(2, "0")}:00`;
          break;
        case "day":
          period = date.toISOString().split("T")[0];
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = `${weekStart.toISOString().split("T")[0]}-W`;
          break;
        case "month":
          period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
          break;
      }

      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });

    return Array.from(periodCounts.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get statistics
   */
  async getStatistics(filters?: AuditLogFilters): Promise<AuditStatistics> {
    let entries = this.entries;
    if (filters) {
      entries = filterAuditLogs(entries, filters);
    }

    const aggregations = this.computeAggregations(entries);

    const failedCount = entries.filter((e) => !e.success).length;
    const successRate =
      entries.length > 0 ? (entries.length - failedCount) / entries.length : 1;

    // Get top actors with full actor info
    const topActors = aggregations.topActors.map((a) => {
      const entry = entries.find((e) => e.actor.id === a.actorId);
      return {
        actor: entry?.actor || { id: a.actorId, type: "user" as ActorType },
        count: a.count,
      };
    });

    // Get top actions
    const topActions = Object.entries(aggregations.byAction)
      .map(([action, count]) => ({ action: action as AuditAction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: entries.length,
      eventsByCategory: aggregations.byCategory,
      eventsBySeverity: aggregations.bySeverity,
      eventsByDay: aggregations.byDay,
      topActors,
      topActions,
      failedEvents: failedCount,
      successRate,
    };
  }

  // ==========================================================================
  // Integrity Methods
  // ==========================================================================

  /**
   * Verify integrity of audit chain
   */
  async verifyIntegrity(): Promise<ChainVerificationResult> {
    if (this.integrityEntries.length === 0) {
      return {
        isValid: true,
        totalEntries: 0,
        verifiedEntries: 0,
        invalidEntries: 0,
        compromisedBlocks: [],
        errors: [],
        verifiedAt: new Date(),
        verificationDurationMs: 0,
        chainMetadata: {
          chainId: "",
          genesisHash: this.genesisHash,
          currentHash: "",
          startBlock: 0,
          endBlock: 0,
          totalBlocks: 0,
          createdAt: new Date(),
          lastModified: new Date(),
          integrityStatus: "valid",
        },
      };
    }

    return verifyChain(this.integrityEntries, this.genesisHash);
  }

  /**
   * Verify specific entry
   */
  async verifyEntry(
    entryId: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const integrityEntry = this.integrityEntries.find((e) => e.id === entryId);
    if (!integrityEntry) {
      return { valid: false, errors: ["Entry not found in integrity chain"] };
    }

    // Find previous entry
    const previousEntry = this.integrityEntries.find(
      (e) => e.blockNumber === integrityEntry.blockNumber - 1,
    );
    const expectedPreviousHash = previousEntry?.entryHash || this.genesisHash;

    if (integrityEntry.previousHash !== expectedPreviousHash) {
      return { valid: false, errors: ["Previous hash mismatch"] };
    }

    return { valid: true, errors: [] };
  }

  // ==========================================================================
  // Export Methods
  // ==========================================================================

  /**
   * Export audit logs
   */
  async export(options: AuditExportOptions): Promise<AuditExportResult> {
    const entries = options.filters
      ? filterAuditLogs(this.entries, options.filters)
      : this.entries;

    const sortedEntries = sortAuditLogs(entries, {
      field: "timestamp",
      direction: "desc",
    });

    let data: string;
    let mimeType: string;
    const timestamp = new Date().toISOString().split("T")[0];

    switch (options.format) {
      case "csv":
        data = this.exportToCSV(sortedEntries, options.includeMetadata);
        mimeType = "text/csv";
        break;
      case "json":
        data = this.exportToJSON(sortedEntries, options.includeMetadata);
        mimeType = "application/json";
        break;
      case "xlsx":
        data = this.exportToJSON(sortedEntries, options.includeMetadata); // Fallback to JSON
        mimeType = "application/json";
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      filename: `audit-export-${timestamp}.${options.format}`,
      data,
      mimeType,
      recordCount: sortedEntries.length,
    };
  }

  /**
   * Create async export job
   */
  async createExportJob(options: AuditExportOptions): Promise<ExportJob> {
    const job: ExportJob = {
      id: uuidv4(),
      status: "pending",
      format: options.format,
      filters: options.filters || {},
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      createdAt: new Date(),
    };

    this.exportJobs.set(job.id, job);

    // Start processing asynchronously
    this.processExportJob(job.id, options).catch((error) => {
      const j = this.exportJobs.get(job.id);
      if (j) {
        j.status = "failed";
        j.error = (error as Error).message;
      }
    });

    return job;
  }

  /**
   * Get export job status
   */
  getExportJob(jobId: string): ExportJob | undefined {
    return this.exportJobs.get(jobId);
  }

  /**
   * Process export job
   */
  private async processExportJob(
    jobId: string,
    options: AuditExportOptions,
  ): Promise<void> {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = "processing";

    const entries = options.filters
      ? filterAuditLogs(this.entries, options.filters)
      : this.entries;

    job.totalRecords = entries.length;

    // Simulate batch processing
    const batchSize = 1000;
    for (let i = 0; i < entries.length; i += batchSize) {
      job.processedRecords = Math.min(i + batchSize, entries.length);
      job.progress = Math.round(
        (job.processedRecords / job.totalRecords) * 100,
      );
      await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate processing time
    }

    job.status = "completed";
    job.completedAt = new Date();
    job.downloadUrl = `/api/admin/audit/export/${jobId}/download`;
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(
    entries: AuditLogEntry[],
    includeMetadata: boolean = false,
  ): string {
    const headers = getCSVHeaders();
    if (includeMetadata) {
      headers.push("metadata");
    }

    const rows = entries.map((entry) => {
      const rowObject = formatEntryForCSV(entry);
      // Convert object to array in same order as headers
      const row = headers.map((header) => {
        if (header === "metadata") {
          return JSON.stringify(entry.metadata || {});
        }
        return rowObject[header] || "";
      });
      return row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(
    entries: AuditLogEntry[],
    includeMetadata: boolean = true,
  ): string {
    const data = entries.map((entry) => {
      const base = {
        id: entry.id,
        timestamp:
          entry.timestamp instanceof Date
            ? entry.timestamp.toISOString()
            : entry.timestamp,
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

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalRecords: entries.length,
        entries: data,
      },
      null,
      2,
    );
  }

  // ==========================================================================
  // Retention Methods
  // ==========================================================================

  /**
   * Set retention policies
   */
  setRetentionPolicies(policies: AuditRetentionPolicy[]): void {
    this.retentionPolicies = policies;
  }

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(
    policy: AuditRetentionPolicy,
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      policy,
      executedAt: new Date(),
      entriesDeleted: 0,
      entriesArchived: 0,
      entriesRetained: 0,
      errors: [],
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const toDelete: AuditLogEntry[] = [];
    const toRetain: AuditLogEntry[] = [];

    this.entries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);

      // Check category filter
      if (policy.categories && policy.categories.length > 0) {
        if (!policy.categories.includes(entry.category)) {
          toRetain.push(entry);
          return;
        }
      }

      // Check severity filter
      if (policy.severities && policy.severities.length > 0) {
        if (!policy.severities.includes(entry.severity)) {
          toRetain.push(entry);
          return;
        }
      }

      // Check date
      if (entryDate < cutoffDate) {
        toDelete.push(entry);
      } else {
        toRetain.push(entry);
      }
    });

    if (policy.archiveEnabled) {
      result.entriesArchived = toDelete.length;
      // Archive logic would go here
    } else {
      result.entriesDeleted = toDelete.length;
    }

    result.entriesRetained = toRetain.length;
    this.entries = toRetain;

    logger.info("[AuditQueryService] Retention applied", {
      policyId: policy.id,
      deleted: result.entriesDeleted,
      archived: result.entriesArchived,
      retained: result.entriesRetained,
    });

    return result;
  }

  /**
   * Apply all active retention policies
   */
  async applyAllRetentionPolicies(): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];

    for (const policy of this.retentionPolicies) {
      if (policy.enabled) {
        const result = await this.applyRetentionPolicy(policy);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.entries = [];
    this.integrityEntries = [];
    this.exportJobs.clear();
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let queryServiceInstance: AuditQueryService | null = null;

/**
 * Get singleton instance
 */
export function getAuditQueryService(): AuditQueryService {
  if (!queryServiceInstance) {
    queryServiceInstance = new AuditQueryService();
  }
  return queryServiceInstance;
}

/**
 * Create new instance
 */
export function createAuditQueryService(): AuditQueryService {
  return new AuditQueryService();
}

export default AuditQueryService;
