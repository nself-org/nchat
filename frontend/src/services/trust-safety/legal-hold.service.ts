/**
 * Legal Hold Service
 *
 * Manages legal holds to prevent deletion of evidence during litigation or investigations.
 * Implements comprehensive hold management with audit trails and notifications.
 */

import { logger } from "@/lib/logger";
import type {
  LegalHold,
  LegalHoldStatus,
  LegalHoldScope,
  LegalHoldCriteria,
  EvidenceId,
  EvidenceRecord,
  EvidenceType,
  AuditEntry,
  AuditCategory,
} from "@/lib/trust-safety/evidence-types";
import {
  EvidenceCollectorService,
  getEvidenceCollector,
} from "./evidence-collector.service";

// ============================================================================
// Configuration
// ============================================================================

export interface LegalHoldConfig {
  /** Maximum duration for a legal hold in days (0 = unlimited) */
  maxHoldDurationDays: number;
  /** Whether to require approval for holds */
  requireApproval: boolean;
  /** Roles that can approve legal holds */
  approvalRoles: string[];
  /** Roles that can create legal holds */
  creatorRoles: string[];
  /** Whether to notify affected users */
  notifyAffectedUsers: boolean;
  /** Whether to send periodic hold reports */
  enablePeriodicReports: boolean;
  /** Report interval in days */
  reportIntervalDays: number;
}

export const DEFAULT_LEGAL_HOLD_CONFIG: LegalHoldConfig = {
  maxHoldDurationDays: 0, // Unlimited
  requireApproval: true,
  approvalRoles: ["legal", "admin", "owner"],
  creatorRoles: ["legal", "admin", "moderator"],
  notifyAffectedUsers: false,
  enablePeriodicReports: true,
  reportIntervalDays: 30,
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return prefix
    ? `${prefix}_${timestamp}_${randomPart}`
    : `${timestamp}_${randomPart}`;
}

async function computeHash(content: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to fallback
    }
  }
  // Fallback: deterministic hash for testing environments
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const h1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const h2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  const h3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, "0");
  const h4 = ((hash1 + hash2) >>> 0).toString(16).padStart(8, "0");
  return `${h1}${h2}${h3}${h4}`.padEnd(64, "0");
}

// ============================================================================
// Legal Hold Service
// ============================================================================

export class LegalHoldService {
  private config: LegalHoldConfig;
  private holds: Map<string, LegalHold> = new Map();
  private auditLog: AuditEntry[] = [];
  private evidenceCollector: EvidenceCollectorService;

  constructor(
    config: Partial<LegalHoldConfig> = {},
    evidenceCollector?: EvidenceCollectorService,
  ) {
    this.config = { ...DEFAULT_LEGAL_HOLD_CONFIG, ...config };
    this.evidenceCollector = evidenceCollector || getEvidenceCollector();
  }

  // ==========================================================================
  // Legal Hold Management
  // ==========================================================================

  /**
   * Create a new legal hold
   */
  async create(params: {
    name: string;
    description: string;
    scope: LegalHoldScope;
    criteria: LegalHoldCriteria;
    requestedBy: string;
    requestedByRole: string;
    effectiveFrom?: Date;
    expiresAt?: Date;
    caseReference?: string;
    legalMatterId?: string;
    legalContact?: string;
  }): Promise<
    { success: true; hold: LegalHold } | { success: false; error: string }
  > {
    // Validate creator role
    if (!this.config.creatorRoles.includes(params.requestedByRole)) {
      return {
        success: false,
        error: `Role '${params.requestedByRole}' is not authorized to create legal holds`,
      };
    }

    // Validate criteria
    const validationError = this.validateCriteria(
      params.scope,
      params.criteria,
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Validate duration if max is set
    if (this.config.maxHoldDurationDays > 0 && params.expiresAt) {
      const durationDays =
        (params.expiresAt.getTime() -
          (params.effectiveFrom || new Date()).getTime()) /
        (24 * 60 * 60 * 1000);
      if (durationDays > this.config.maxHoldDurationDays) {
        return {
          success: false,
          error: `Hold duration exceeds maximum of ${this.config.maxHoldDurationDays} days`,
        };
      }
    }

    const now = new Date();
    const effectiveFrom = params.effectiveFrom || now;
    const status: LegalHoldStatus = effectiveFrom > now ? "pending" : "active";

    const hold: LegalHold = {
      id: generateId("lh"),
      name: params.name,
      description: params.description,
      status: this.config.requireApproval ? "pending" : status,
      scope: params.scope,
      criteria: params.criteria,
      caseReference: params.caseReference,
      legalMatterId: params.legalMatterId,
      requestedBy: params.requestedBy,
      approvedBy: this.config.requireApproval ? undefined : params.requestedBy,
      legalContact: params.legalContact,
      effectiveFrom,
      expiresAt: params.expiresAt,
      evidenceIds: [],
      evidenceCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.holds.set(hold.id, hold);

    // Log audit entry
    await this.logAudit({
      category: "legal_hold",
      action: "create",
      actorId: params.requestedBy,
      actorRole: params.requestedByRole,
      targetType: "legal_hold",
      targetId: hold.id,
      description: `Legal hold created: ${params.name}`,
      afterState: {
        name: hold.name,
        scope: hold.scope,
        status: hold.status,
      },
    });

    // If not requiring approval and is active, apply to evidence
    if (!this.config.requireApproval && hold.status === "active") {
      await this.applyHoldToEvidence(
        hold,
        params.requestedBy,
        params.requestedByRole,
      );
    }

    logger.info("Legal hold created", {
      holdId: hold.id,
      name: hold.name,
      scope: hold.scope,
      status: hold.status,
    });

    return { success: true, hold };
  }

  /**
   * Approve a pending legal hold
   */
  async approve(
    holdId: string,
    approvedBy: string,
    approverRole: string,
    notes?: string,
  ): Promise<
    { success: true; hold: LegalHold } | { success: false; error: string }
  > {
    // Validate approver role
    if (!this.config.approvalRoles.includes(approverRole)) {
      return {
        success: false,
        error: `Role '${approverRole}' is not authorized to approve legal holds`,
      };
    }

    const hold = this.holds.get(holdId);
    if (!hold) {
      return { success: false, error: `Legal hold not found: ${holdId}` };
    }

    if (hold.status !== "pending") {
      return {
        success: false,
        error: `Legal hold is not pending approval: ${hold.status}`,
      };
    }

    const now = new Date();
    const oldStatus = hold.status;

    hold.status = hold.effectiveFrom > now ? "pending" : "active";
    hold.approvedBy = approvedBy;
    hold.updatedAt = now;

    if (notes) {
      hold.notes = hold.notes || [];
      hold.notes.push(
        `[${now.toISOString()}] Approved by ${approvedBy}: ${notes}`,
      );
    }

    // Log audit entry
    await this.logAudit({
      category: "legal_hold",
      action: "approve",
      actorId: approvedBy,
      actorRole: approverRole,
      targetType: "legal_hold",
      targetId: hold.id,
      description: `Legal hold approved: ${hold.name}`,
      beforeState: { status: oldStatus },
      afterState: { status: hold.status, approvedBy },
    });

    // If now active, apply to evidence
    if (hold.status === "active") {
      await this.applyHoldToEvidence(hold, approvedBy, approverRole);
    }

    logger.info("Legal hold approved", { holdId, approvedBy });

    return { success: true, hold };
  }

  /**
   * Release a legal hold
   */
  async release(
    holdId: string,
    releasedBy: string,
    releaserRole: string,
    reason: string,
  ): Promise<
    { success: true; hold: LegalHold } | { success: false; error: string }
  > {
    // Validate releaser role
    if (!this.config.approvalRoles.includes(releaserRole)) {
      return {
        success: false,
        error: `Role '${releaserRole}' is not authorized to release legal holds`,
      };
    }

    const hold = this.holds.get(holdId);
    if (!hold) {
      return { success: false, error: `Legal hold not found: ${holdId}` };
    }

    if (hold.status === "released") {
      return { success: false, error: "Legal hold is already released" };
    }

    const now = new Date();
    const oldStatus = hold.status;

    // Release hold from all evidence
    await this.releaseHoldFromEvidence(hold, releasedBy, releaserRole);

    hold.status = "released";
    hold.updatedAt = now;
    hold.notes = hold.notes || [];
    hold.notes.push(
      `[${now.toISOString()}] Released by ${releasedBy}: ${reason}`,
    );

    // Log audit entry
    await this.logAudit({
      category: "legal_hold",
      action: "release",
      actorId: releasedBy,
      actorRole: releaserRole,
      targetType: "legal_hold",
      targetId: hold.id,
      description: `Legal hold released: ${hold.name} - ${reason}`,
      beforeState: { status: oldStatus, evidenceCount: hold.evidenceCount },
      afterState: { status: hold.status },
    });

    logger.info("Legal hold released", { holdId, releasedBy, reason });

    return { success: true, hold };
  }

  /**
   * Update legal hold criteria (adds to existing)
   */
  async updateCriteria(
    holdId: string,
    additionalCriteria: Partial<LegalHoldCriteria>,
    updatedBy: string,
    updaterRole: string,
  ): Promise<
    { success: true; hold: LegalHold } | { success: false; error: string }
  > {
    const hold = this.holds.get(holdId);
    if (!hold) {
      return { success: false, error: `Legal hold not found: ${holdId}` };
    }

    if (hold.status === "released" || hold.status === "expired") {
      return {
        success: false,
        error: "Cannot update released or expired legal hold",
      };
    }

    const oldCriteria = { ...hold.criteria };

    // Merge criteria (add to arrays, don't replace)
    if (additionalCriteria.userIds) {
      hold.criteria.userIds = [
        ...new Set([
          ...(hold.criteria.userIds || []),
          ...additionalCriteria.userIds,
        ]),
      ];
    }
    if (additionalCriteria.channelIds) {
      hold.criteria.channelIds = [
        ...new Set([
          ...(hold.criteria.channelIds || []),
          ...additionalCriteria.channelIds,
        ]),
      ];
    }
    if (additionalCriteria.evidenceIds) {
      hold.criteria.evidenceIds = [
        ...new Set([
          ...(hold.criteria.evidenceIds || []),
          ...additionalCriteria.evidenceIds,
        ]),
      ];
    }
    if (additionalCriteria.keywords) {
      hold.criteria.keywords = [
        ...new Set([
          ...(hold.criteria.keywords || []),
          ...additionalCriteria.keywords,
        ]),
      ];
    }
    if (additionalCriteria.evidenceTypes) {
      hold.criteria.evidenceTypes = [
        ...new Set([
          ...(hold.criteria.evidenceTypes || []),
          ...additionalCriteria.evidenceTypes,
        ]),
      ];
    }
    if (
      additionalCriteria.startDate &&
      (!hold.criteria.startDate ||
        additionalCriteria.startDate < hold.criteria.startDate)
    ) {
      hold.criteria.startDate = additionalCriteria.startDate;
    }
    if (
      additionalCriteria.endDate &&
      (!hold.criteria.endDate ||
        additionalCriteria.endDate > hold.criteria.endDate)
    ) {
      hold.criteria.endDate = additionalCriteria.endDate;
    }

    hold.updatedAt = new Date();

    // Log audit entry
    await this.logAudit({
      category: "legal_hold",
      action: "update_criteria",
      actorId: updatedBy,
      actorRole: updaterRole,
      targetType: "legal_hold",
      targetId: hold.id,
      description: `Legal hold criteria updated: ${hold.name}`,
      beforeState: { criteria: oldCriteria },
      afterState: { criteria: hold.criteria },
    });

    // Re-apply to catch new evidence
    if (hold.status === "active") {
      await this.applyHoldToEvidence(hold, updatedBy, updaterRole);
    }

    return { success: true, hold };
  }

  /**
   * Extend legal hold expiration
   */
  async extend(
    holdId: string,
    newExpiresAt: Date,
    extendedBy: string,
    extenderRole: string,
    reason: string,
  ): Promise<
    { success: true; hold: LegalHold } | { success: false; error: string }
  > {
    const hold = this.holds.get(holdId);
    if (!hold) {
      return { success: false, error: `Legal hold not found: ${holdId}` };
    }

    if (hold.status === "released") {
      return { success: false, error: "Cannot extend a released legal hold" };
    }

    if (hold.expiresAt && newExpiresAt <= hold.expiresAt) {
      return {
        success: false,
        error: "New expiration must be after current expiration",
      };
    }

    // Validate max duration if configured
    if (this.config.maxHoldDurationDays > 0) {
      const durationDays =
        (newExpiresAt.getTime() - hold.effectiveFrom.getTime()) /
        (24 * 60 * 60 * 1000);
      if (durationDays > this.config.maxHoldDurationDays) {
        return {
          success: false,
          error: `Extended duration exceeds maximum of ${this.config.maxHoldDurationDays} days`,
        };
      }
    }

    const now = new Date();
    const oldExpiresAt = hold.expiresAt;

    hold.expiresAt = newExpiresAt;
    hold.updatedAt = now;
    hold.notes = hold.notes || [];
    hold.notes.push(
      `[${now.toISOString()}] Extended by ${extendedBy} to ${newExpiresAt.toISOString()}: ${reason}`,
    );

    // If was expired, reactivate
    if (hold.status === "expired") {
      hold.status = "active";
      await this.applyHoldToEvidence(hold, extendedBy, extenderRole);
    }

    // Log audit entry
    await this.logAudit({
      category: "legal_hold",
      action: "extend",
      actorId: extendedBy,
      actorRole: extenderRole,
      targetType: "legal_hold",
      targetId: hold.id,
      description: `Legal hold extended: ${hold.name} - ${reason}`,
      beforeState: { expiresAt: oldExpiresAt?.toISOString() },
      afterState: { expiresAt: newExpiresAt.toISOString() },
    });

    logger.info("Legal hold extended", { holdId, newExpiresAt, reason });

    return { success: true, hold };
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get legal hold by ID
   */
  get(holdId: string): LegalHold | undefined {
    return this.holds.get(holdId);
  }

  /**
   * Get all legal holds with filters
   */
  getAll(filters?: {
    status?: LegalHoldStatus | LegalHoldStatus[];
    scope?: LegalHoldScope;
    requestedBy?: string;
    caseReference?: string;
    includeExpired?: boolean;
  }): LegalHold[] {
    let holds = Array.from(this.holds.values());

    // Check for expired holds and update status
    const now = new Date();
    for (const hold of holds) {
      if (hold.status === "active" && hold.expiresAt && hold.expiresAt < now) {
        hold.status = "expired";
        hold.updatedAt = now;
      }
    }

    // Apply filters
    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      holds = holds.filter((h) => statuses.includes(h.status));
    }

    if (filters?.scope) {
      holds = holds.filter((h) => h.scope === filters.scope);
    }

    if (filters?.requestedBy) {
      holds = holds.filter((h) => h.requestedBy === filters.requestedBy);
    }

    if (filters?.caseReference) {
      holds = holds.filter((h) => h.caseReference === filters.caseReference);
    }

    if (!filters?.includeExpired) {
      holds = holds.filter((h) => h.status !== "expired");
    }

    // Sort by created date (newest first)
    return holds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active holds
   */
  getActive(): LegalHold[] {
    return this.getAll({ status: "active" });
  }

  /**
   * Get pending holds awaiting approval
   */
  getPending(): LegalHold[] {
    return this.getAll({ status: "pending" });
  }

  /**
   * Get holds affecting specific evidence
   */
  getHoldsForEvidence(evidenceId: EvidenceId): LegalHold[] {
    return Array.from(this.holds.values()).filter(
      (h) => h.status === "active" && h.evidenceIds.includes(evidenceId),
    );
  }

  /**
   * Check if evidence is under any active hold
   */
  isEvidenceUnderHold(evidenceId: EvidenceId): boolean {
    return this.getHoldsForEvidence(evidenceId).length > 0;
  }

  /**
   * Get holds by case reference
   */
  getHoldsByCaseReference(caseReference: string): LegalHold[] {
    return this.getAll({ caseReference });
  }

  // ==========================================================================
  // Evidence Application
  // ==========================================================================

  /**
   * Apply hold to matching evidence
   */
  private async applyHoldToEvidence(
    hold: LegalHold,
    actorId: string,
    actorRole: string,
  ): Promise<number> {
    const matchingEvidence = this.findMatchingEvidence(hold);
    let appliedCount = 0;

    for (const evidence of matchingEvidence) {
      if (!hold.evidenceIds.includes(evidence.id)) {
        const result = await this.evidenceCollector.applyLegalHold(
          evidence.id,
          hold.id,
          actorId,
          actorRole,
        );
        if (result.success) {
          hold.evidenceIds.push(evidence.id);
          appliedCount++;
        }
      }
    }

    hold.evidenceCount = hold.evidenceIds.length;

    logger.info("Legal hold applied to evidence", {
      holdId: hold.id,
      appliedCount,
      totalCount: hold.evidenceCount,
    });

    return appliedCount;
  }

  /**
   * Release hold from all evidence
   */
  private async releaseHoldFromEvidence(
    hold: LegalHold,
    actorId: string,
    actorRole: string,
  ): Promise<number> {
    let releasedCount = 0;

    for (const evidenceId of hold.evidenceIds) {
      const result = await this.evidenceCollector.releaseLegalHold(
        evidenceId,
        hold.id,
        actorId,
        actorRole,
      );
      if (result.success) {
        releasedCount++;
      }
    }

    hold.evidenceIds = [];
    hold.evidenceCount = 0;

    logger.info("Legal hold released from evidence", {
      holdId: hold.id,
      releasedCount,
    });

    return releasedCount;
  }

  /**
   * Find evidence matching hold criteria
   */
  private findMatchingEvidence(hold: LegalHold): EvidenceRecord[] {
    const filters: Parameters<EvidenceCollectorService["search"]>[0] = {};

    switch (hold.scope) {
      case "user":
        if (hold.criteria.userIds?.length) {
          // Search for each user
          return hold.criteria.userIds.flatMap((userId) =>
            this.evidenceCollector.search({ userId }),
          );
        }
        break;

      case "channel":
        if (hold.criteria.channelIds?.length) {
          return hold.criteria.channelIds.flatMap((channelId) =>
            this.evidenceCollector.search({ channelId }),
          );
        }
        break;

      case "workspace":
        if (hold.criteria.workspaceId) {
          filters.workspaceId = hold.criteria.workspaceId;
        }
        break;

      case "date_range":
        filters.startDate = hold.criteria.startDate;
        filters.endDate = hold.criteria.endDate;
        break;

      case "specific":
        if (hold.criteria.evidenceIds?.length) {
          const results: EvidenceRecord[] = [];
          for (const id of hold.criteria.evidenceIds) {
            const evidence = this.evidenceCollector
              .search({})
              .find((e) => e.id === id);
            if (evidence) results.push(evidence);
          }
          return results;
        }
        break;
    }

    // Apply type filter if specified
    if (hold.criteria.evidenceTypes?.length) {
      filters.type = hold.criteria.evidenceTypes;
    }

    return this.evidenceCollector.search(filters);
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate hold criteria
   */
  private validateCriteria(
    scope: LegalHoldScope,
    criteria: LegalHoldCriteria,
  ): string | null {
    switch (scope) {
      case "user":
        if (!criteria.userIds || criteria.userIds.length === 0) {
          return "User scope requires at least one user ID";
        }
        break;

      case "channel":
        if (!criteria.channelIds || criteria.channelIds.length === 0) {
          return "Channel scope requires at least one channel ID";
        }
        break;

      case "workspace":
        if (!criteria.workspaceId) {
          return "Workspace scope requires a workspace ID";
        }
        break;

      case "date_range":
        if (!criteria.startDate || !criteria.endDate) {
          return "Date range scope requires start and end dates";
        }
        if (criteria.startDate > criteria.endDate) {
          return "Start date must be before end date";
        }
        break;

      case "specific":
        if (!criteria.evidenceIds || criteria.evidenceIds.length === 0) {
          return "Specific scope requires at least one evidence ID";
        }
        break;

      case "query":
        if (!criteria.query && !criteria.keywords?.length) {
          return "Query scope requires a query string or keywords";
        }
        break;
    }

    return null;
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  /**
   * Log an audit entry
   */
  private async logAudit(params: {
    category: AuditCategory;
    action: string;
    actorId: string;
    actorRole: string;
    targetType?: string;
    targetId?: string;
    description: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    requestId?: string;
  }): Promise<void> {
    const now = new Date();
    const previousEntry = this.auditLog[this.auditLog.length - 1];
    const previousHash = previousEntry?.entryHash;

    const entryContent = JSON.stringify({
      ...params,
      timestamp: now.toISOString(),
      previousHash,
    });

    const entryHash = await computeHash(entryContent);

    const entry: AuditEntry = {
      id: generateId("audit"),
      category: params.category,
      action: params.action,
      actorId: params.actorId,
      actorRole: params.actorRole,
      timestamp: now,
      targetType: params.targetType,
      targetId: params.targetId,
      description: params.description,
      beforeState: params.beforeState,
      afterState: params.afterState,
      entryHash,
      previousHash,
      requestId: params.requestId,
    };

    this.auditLog.push(entry);
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filters?: {
    holdId?: string;
    actorId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filters?.holdId) {
      entries = entries.filter((e) => e.targetId === filters.holdId);
    }

    if (filters?.actorId) {
      entries = entries.filter((e) => e.actorId === filters.actorId);
    }

    if (filters?.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }

    if (filters?.startDate) {
      entries = entries.filter((e) => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      entries = entries.filter((e) => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get legal hold statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<LegalHoldStatus, number>;
    byScope: Record<LegalHoldScope, number>;
    totalEvidenceCount: number;
    pendingApprovals: number;
    expiringWithin30Days: number;
  } {
    const holds = Array.from(this.holds.values());

    const byStatus: Record<LegalHoldStatus, number> = {
      active: 0,
      pending: 0,
      released: 0,
      expired: 0,
    };

    const byScope: Record<LegalHoldScope, number> = {
      user: 0,
      channel: 0,
      workspace: 0,
      date_range: 0,
      specific: 0,
      query: 0,
    };

    let totalEvidenceCount = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    let expiringWithin30Days = 0;

    for (const hold of holds) {
      byStatus[hold.status]++;
      byScope[hold.scope]++;
      totalEvidenceCount += hold.evidenceCount;

      if (
        hold.status === "active" &&
        hold.expiresAt &&
        hold.expiresAt <= thirtyDaysFromNow
      ) {
        expiringWithin30Days++;
      }
    }

    return {
      total: holds.length,
      byStatus,
      byScope,
      totalEvidenceCount,
      pendingApprovals: byStatus.pending,
      expiringWithin30Days,
    };
  }

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  /**
   * Process expired holds
   */
  async processExpiredHolds(): Promise<{
    processed: number;
    expired: string[];
  }> {
    const now = new Date();
    const expired: string[] = [];

    for (const hold of this.holds.values()) {
      if (hold.status === "active" && hold.expiresAt && hold.expiresAt < now) {
        hold.status = "expired";
        hold.updatedAt = now;
        expired.push(hold.id);

        // Release evidence from expired hold
        await this.releaseHoldFromEvidence(hold, "system", "system");

        await this.logAudit({
          category: "legal_hold",
          action: "expire",
          actorId: "system",
          actorRole: "system",
          targetType: "legal_hold",
          targetId: hold.id,
          description: `Legal hold expired: ${hold.name}`,
        });
      }
    }

    if (expired.length > 0) {
      logger.info("Expired legal holds processed", {
        count: expired.length,
        holdIds: expired,
      });
    }

    return { processed: expired.length, expired };
  }

  /**
   * Activate pending holds that are now effective
   */
  async activatePendingHolds(): Promise<{
    activated: number;
    holdIds: string[];
  }> {
    const now = new Date();
    const activated: string[] = [];

    for (const hold of this.holds.values()) {
      if (
        hold.status === "pending" &&
        hold.approvedBy &&
        hold.effectiveFrom <= now
      ) {
        hold.status = "active";
        hold.updatedAt = now;
        activated.push(hold.id);

        await this.applyHoldToEvidence(hold, "system", "system");

        await this.logAudit({
          category: "legal_hold",
          action: "activate",
          actorId: "system",
          actorRole: "system",
          targetType: "legal_hold",
          targetId: hold.id,
          description: `Legal hold activated: ${hold.name}`,
        });
      }
    }

    if (activated.length > 0) {
      logger.info("Pending legal holds activated", {
        count: activated.length,
        holdIds: activated,
      });
    }

    return { activated: activated.length, holdIds: activated };
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Get configuration
   */
  getConfig(): LegalHoldConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LegalHoldConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Count total holds
   */
  count(): number {
    return this.holds.size;
  }

  /**
   * Clear all holds (for testing)
   */
  clear(): void {
    this.holds.clear();
    this.auditLog = [];
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let holdServiceInstance: LegalHoldService | null = null;

export function getLegalHoldService(
  config?: Partial<LegalHoldConfig>,
  evidenceCollector?: EvidenceCollectorService,
): LegalHoldService {
  if (!holdServiceInstance || config) {
    holdServiceInstance = new LegalHoldService(config, evidenceCollector);
  }
  return holdServiceInstance;
}

export function createLegalHoldService(
  config?: Partial<LegalHoldConfig>,
  evidenceCollector?: EvidenceCollectorService,
): LegalHoldService {
  return new LegalHoldService(config, evidenceCollector);
}
