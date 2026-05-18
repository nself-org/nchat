/**
 * Gap Registry
 *
 * Registry of all known plugin gaps with status tracking.
 * Manages the lifecycle of gaps from identification through resolution.
 * Provides querying, filtering, and status management for gap tracking.
 */

import type {
  PluginGap,
  GapResolution,
  GapStatus,
  GapSeverity,
  PluginDomain,
} from "./types";
import {
  GAP_SEVERITY_WEIGHTS,
  compareGapsBySeverity,
  isValidDomain,
  isValidSeverity,
  isValidStatus,
} from "./types";

// ============================================================================
// REGISTRY ERRORS
// ============================================================================

export class GapRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "GapRegistryError";
  }
}

// ============================================================================
// REGISTRY EVENTS
// ============================================================================

export type GapRegistryEventType =
  | "gap:registered"
  | "gap:updated"
  | "gap:resolved"
  | "gap:removed"
  | "resolution:registered"
  | "resolution:revoked";

export interface GapRegistryEvent {
  type: GapRegistryEventType;
  gapId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export type GapRegistryEventListener = (event: GapRegistryEvent) => void;

// ============================================================================
// REGISTRY QUERY FILTERS
// ============================================================================

export interface GapQueryFilter {
  /** Filter by status */
  status?: GapStatus | GapStatus[];
  /** Filter by severity */
  severity?: GapSeverity | GapSeverity[];
  /** Filter by domain */
  domain?: PluginDomain | PluginDomain[];
  /** Filter by tag */
  tags?: string[];
  /** Filter by affected service path */
  affectedService?: string;
  /** Only show gaps with direct backend access */
  directBackendAccess?: boolean;
  /** Sort by field */
  sortBy?: "severity" | "domain" | "status" | "updatedAt";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// REGISTRY STATISTICS
// ============================================================================

export interface GapRegistryStats {
  /** Total gaps tracked */
  totalGaps: number;
  /** Gaps by status */
  byStatus: Record<GapStatus, number>;
  /** Gaps by severity */
  bySeverity: Record<GapSeverity, number>;
  /** Gaps by domain */
  byDomain: Partial<Record<PluginDomain, number>>;
  /** Total resolutions registered */
  totalResolutions: number;
  /** Coverage percentage */
  coveragePercent: number;
  /** Critical uncovered gaps count */
  criticalUncovered: number;
  /** Last updated timestamp */
  lastUpdated: string;
}

// ============================================================================
// GAP REGISTRY
// ============================================================================

export class GapRegistry {
  private gaps: Map<string, PluginGap> = new Map();
  private resolutions: Map<string, GapResolution[]> = new Map();
  private listeners: Map<GapRegistryEventType, Set<GapRegistryEventListener>> =
    new Map();

  // ==========================================================================
  // GAP MANAGEMENT
  // ==========================================================================

  /**
   * Register a new gap.
   */
  registerGap(gap: PluginGap): PluginGap {
    if (this.gaps.has(gap.id)) {
      throw new GapRegistryError(
        `Gap with ID "${gap.id}" is already registered`,
        "DUPLICATE_GAP_ID",
        409,
      );
    }

    if (!isValidDomain(gap.domain)) {
      throw new GapRegistryError(
        `Invalid domain: "${gap.domain}"`,
        "INVALID_DOMAIN",
      );
    }

    if (!isValidSeverity(gap.severity)) {
      throw new GapRegistryError(
        `Invalid severity: "${gap.severity}"`,
        "INVALID_SEVERITY",
      );
    }

    if (!isValidStatus(gap.status)) {
      throw new GapRegistryError(
        `Invalid status: "${gap.status}"`,
        "INVALID_STATUS",
      );
    }

    this.gaps.set(gap.id, { ...gap });
    this.emit({
      type: "gap:registered",
      gapId: gap.id,
      timestamp: new Date().toISOString(),
    });
    return gap;
  }

  /**
   * Register multiple gaps at once.
   */
  registerGaps(gaps: PluginGap[]): PluginGap[] {
    return gaps.map((gap) => this.registerGap(gap));
  }

  /**
   * Get a gap by ID.
   */
  getGap(gapId: string): PluginGap | undefined {
    const gap = this.gaps.get(gapId);
    return gap ? { ...gap } : undefined;
  }

  /**
   * Update a gap's properties.
   */
  updateGap(gapId: string, updates: Partial<Omit<PluginGap, "id">>): PluginGap {
    const gap = this.gaps.get(gapId);
    if (!gap) {
      throw new GapRegistryError(
        `Gap not found: ${gapId}`,
        "GAP_NOT_FOUND",
        404,
      );
    }

    if (updates.domain && !isValidDomain(updates.domain)) {
      throw new GapRegistryError(
        `Invalid domain: "${updates.domain}"`,
        "INVALID_DOMAIN",
      );
    }

    if (updates.severity && !isValidSeverity(updates.severity)) {
      throw new GapRegistryError(
        `Invalid severity: "${updates.severity}"`,
        "INVALID_SEVERITY",
      );
    }

    if (updates.status && !isValidStatus(updates.status)) {
      throw new GapRegistryError(
        `Invalid status: "${updates.status}"`,
        "INVALID_STATUS",
      );
    }

    Object.assign(gap, updates, { updatedAt: new Date().toISOString() });
    this.gaps.set(gapId, gap);

    this.emit({
      type: "gap:updated",
      gapId,
      timestamp: new Date().toISOString(),
      data: { updates: Object.keys(updates) },
    });

    return { ...gap };
  }

  /**
   * Remove a gap from the registry.
   */
  removeGap(gapId: string): boolean {
    const existed = this.gaps.delete(gapId);
    if (existed) {
      this.resolutions.delete(gapId);
      this.emit({
        type: "gap:removed",
        gapId,
        timestamp: new Date().toISOString(),
      });
    }
    return existed;
  }

  /**
   * Check if a gap exists.
   */
  hasGap(gapId: string): boolean {
    return this.gaps.has(gapId);
  }

  // ==========================================================================
  // GAP RESOLUTION
  // ==========================================================================

  /**
   * Register a resolution for a gap.
   */
  registerResolution(resolution: GapResolution): GapResolution {
    const gap = this.gaps.get(resolution.gapId);
    if (!gap) {
      throw new GapRegistryError(
        `Gap not found: ${resolution.gapId}`,
        "GAP_NOT_FOUND",
        404,
      );
    }

    const gapResolutions = this.resolutions.get(resolution.gapId) || [];
    gapResolutions.push({ ...resolution });
    this.resolutions.set(resolution.gapId, gapResolutions);

    // Determine new gap status based on resolution coverage
    const allCoveredCaps = new Set<string>();
    for (const res of gapResolutions) {
      for (const cap of res.coveredCapabilities) {
        allCoveredCaps.add(cap);
      }
    }

    const allCovered = gap.requiredCapabilities.every((cap) =>
      allCoveredCaps.has(cap),
    );
    const someCovered = gap.requiredCapabilities.some((cap) =>
      allCoveredCaps.has(cap),
    );

    if (allCovered) {
      gap.status = "covered";
      gap.resolvedByPlugin = resolution.pluginId;
      gap.resolvedAt = new Date().toISOString();
    } else if (someCovered) {
      gap.status = "partial";
    }
    gap.updatedAt = new Date().toISOString();
    this.gaps.set(gap.id, gap);

    this.emit({
      type: "resolution:registered",
      gapId: resolution.gapId,
      timestamp: new Date().toISOString(),
      data: { pluginId: resolution.pluginId, newStatus: gap.status },
    });

    if (allCovered) {
      this.emit({
        type: "gap:resolved",
        gapId: gap.id,
        timestamp: new Date().toISOString(),
        data: { resolvedByPlugin: resolution.pluginId },
      });
    }

    return resolution;
  }

  /**
   * Get resolutions for a gap.
   */
  getResolutions(gapId: string): GapResolution[] {
    return [...(this.resolutions.get(gapId) || [])];
  }

  /**
   * Revoke a resolution (e.g., when a plugin is uninstalled).
   */
  revokeResolution(gapId: string, pluginId: string): boolean {
    const gapResolutions = this.resolutions.get(gapId);
    if (!gapResolutions) {
      return false;
    }

    const index = gapResolutions.findIndex((r) => r.pluginId === pluginId);
    if (index < 0) {
      return false;
    }

    gapResolutions.splice(index, 1);
    this.resolutions.set(gapId, gapResolutions);

    // Recalculate gap status
    const gap = this.gaps.get(gapId);
    if (gap) {
      const allCoveredCaps = new Set<string>();
      for (const res of gapResolutions) {
        for (const cap of res.coveredCapabilities) {
          allCoveredCaps.add(cap);
        }
      }

      const allCovered = gap.requiredCapabilities.every((cap) =>
        allCoveredCaps.has(cap),
      );
      const someCovered = gap.requiredCapabilities.some((cap) =>
        allCoveredCaps.has(cap),
      );

      if (allCovered) {
        gap.status = "covered";
      } else if (someCovered) {
        gap.status = "partial";
      } else {
        gap.status = "uncovered";
        gap.resolvedByPlugin = undefined;
        gap.resolvedAt = undefined;
      }
      gap.updatedAt = new Date().toISOString();
      this.gaps.set(gapId, gap);

      this.emit({
        type: "resolution:revoked",
        gapId,
        timestamp: new Date().toISOString(),
        data: { pluginId, newStatus: gap.status },
      });
    }

    return true;
  }

  // ==========================================================================
  // QUERYING
  // ==========================================================================

  /**
   * Query gaps with filters.
   */
  queryGaps(filter?: GapQueryFilter): PluginGap[] {
    let results = Array.from(this.gaps.values()).map((g) => ({ ...g }));

    if (filter) {
      // Status filter
      if (filter.status) {
        const statuses = Array.isArray(filter.status)
          ? filter.status
          : [filter.status];
        results = results.filter((g) => statuses.includes(g.status));
      }

      // Severity filter
      if (filter.severity) {
        const severities = Array.isArray(filter.severity)
          ? filter.severity
          : [filter.severity];
        results = results.filter((g) => severities.includes(g.severity));
      }

      // Domain filter
      if (filter.domain) {
        const domains = Array.isArray(filter.domain)
          ? filter.domain
          : [filter.domain];
        results = results.filter((g) => domains.includes(g.domain));
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter((g) =>
          filter.tags!.some((tag) => g.tags.includes(tag)),
        );
      }

      // Affected service filter
      if (filter.affectedService) {
        results = results.filter((g) =>
          g.affectedServices.includes(filter.affectedService!),
        );
      }

      // Sorting
      if (filter.sortBy) {
        const direction = filter.sortOrder === "asc" ? 1 : -1;
        results.sort((a, b) => {
          let cmp: number;
          switch (filter.sortBy) {
            case "severity":
              cmp =
                GAP_SEVERITY_WEIGHTS[a.severity] -
                GAP_SEVERITY_WEIGHTS[b.severity];
              break;
            case "domain":
              cmp = a.domain.localeCompare(b.domain);
              break;
            case "status":
              cmp = a.status.localeCompare(b.status);
              break;
            case "updatedAt":
              cmp =
                new Date(a.updatedAt).getTime() -
                new Date(b.updatedAt).getTime();
              break;
            default:
              cmp = 0;
          }
          return cmp * direction;
        });
      } else {
        // Default sort: by severity descending
        results.sort(compareGapsBySeverity);
      }

      // Pagination
      if (filter.offset) {
        results = results.slice(filter.offset);
      }
      if (filter.limit) {
        results = results.slice(0, filter.limit);
      }
    }

    return results;
  }

  /**
   * Get all gaps.
   */
  getAllGaps(): PluginGap[] {
    return Array.from(this.gaps.values()).map((g) => ({ ...g }));
  }

  /**
   * Get gaps by domain.
   */
  getGapsByDomain(domain: PluginDomain): PluginGap[] {
    return this.queryGaps({ domain });
  }

  /**
   * Get gaps by severity.
   */
  getGapsBySeverity(severity: GapSeverity): PluginGap[] {
    return this.queryGaps({ severity });
  }

  /**
   * Get gaps by status.
   */
  getGapsByStatus(status: GapStatus): PluginGap[] {
    return this.queryGaps({ status });
  }

  /**
   * Get uncovered gaps (not covered, not deprecated).
   */
  getUncoveredGaps(): PluginGap[] {
    return this.queryGaps({ status: ["uncovered", "partial", "workaround"] });
  }

  /**
   * Get critical uncovered gaps.
   */
  getCriticalGaps(): PluginGap[] {
    return this.queryGaps({
      severity: "critical",
      status: ["uncovered", "partial"],
    });
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get comprehensive statistics.
   */
  getStats(): GapRegistryStats {
    const allGaps = Array.from(this.gaps.values());

    const byStatus: Record<GapStatus, number> = {
      uncovered: 0,
      partial: 0,
      workaround: 0,
      covered: 0,
      deprecated: 0,
    };

    const bySeverity: Record<GapSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byDomain: Partial<Record<PluginDomain, number>> = {};

    for (const gap of allGaps) {
      byStatus[gap.status]++;
      bySeverity[gap.severity]++;
      byDomain[gap.domain] = (byDomain[gap.domain] || 0) + 1;
    }

    const totalGaps = allGaps.length;
    const coveredCount = byStatus.covered + byStatus.deprecated;
    const coveragePercent =
      totalGaps > 0 ? Math.round((coveredCount / totalGaps) * 100) : 100;

    let totalResolutions = 0;
    for (const resolutions of this.resolutions.values()) {
      totalResolutions += resolutions.length;
    }

    const criticalUncovered = allGaps.filter(
      (g) =>
        g.severity === "critical" &&
        (g.status === "uncovered" || g.status === "partial"),
    ).length;

    return {
      totalGaps,
      byStatus,
      bySeverity,
      byDomain,
      totalResolutions,
      coveragePercent,
      criticalUncovered,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Mark a gap as having a workaround.
   */
  markWorkaround(gapId: string, description: string): PluginGap {
    return this.updateGap(gapId, {
      status: "workaround",
      workaroundDescription: description,
    });
  }

  /**
   * Mark a gap as deprecated (no longer relevant).
   */
  deprecateGap(gapId: string): PluginGap {
    return this.updateGap(gapId, { status: "deprecated" });
  }

  /**
   * Import gaps from an analysis result.
   */
  importFromAnalysis(gaps: PluginGap[]): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    for (const gap of gaps) {
      if (this.gaps.has(gap.id)) {
        skipped++;
        continue;
      }
      try {
        this.registerGap(gap);
        imported++;
      } catch {
        skipped++;
      }
    }

    return { imported, skipped };
  }

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  /**
   * Add an event listener.
   */
  on(
    eventType: GapRegistryEventType,
    listener: GapRegistryEventListener,
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Remove an event listener.
   */
  off(
    eventType: GapRegistryEventType,
    listener: GapRegistryEventListener,
  ): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: GapRegistryEvent): void {
    const eventListeners = this.listeners.get(event.type);
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(event);
        } catch {
          // Don't let listener errors break the registry
        }
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all data.
   */
  clear(): void {
    this.gaps.clear();
    this.resolutions.clear();
  }

  /**
   * Get the total gap count.
   */
  size(): number {
    return this.gaps.size;
  }
}
