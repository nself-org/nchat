/**
 * Bot Moderation Controls
 *
 * Admin controls for bot suspension, restriction, audit logging,
 * and abuse detection. Ensures platform administrators always have
 * override authority over bot behavior.
 */

import { generateId } from "../app-lifecycle";
import type {
  BotModerationAction,
  BotModerationRecord,
  BotAbuseFlags,
  BotAuditEntry,
  BotAuditEventType,
  BotInstallation,
  BotInstallationStatus,
} from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class BotModerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "BotModerationError";
  }
}

// ============================================================================
// MODERATION STORE
// ============================================================================

export class BotModerationStore {
  private records: Map<string, BotModerationRecord> = new Map();
  private abuseFlags: Map<string, BotAbuseFlags> = new Map();
  private auditEntries: BotAuditEntry[] = [];

  // --- Moderation Records ---

  getRecord(id: string): BotModerationRecord | undefined {
    return this.records.get(id);
  }

  getActiveRecords(botId: string, workspaceId?: string): BotModerationRecord[] {
    return Array.from(this.records.values()).filter((r) => {
      if (r.botId !== botId) return false;
      if (!r.active) return false;
      if (workspaceId && r.workspaceId && r.workspaceId !== workspaceId)
        return false;
      // Check expiry
      if (r.expiresAt && new Date(r.expiresAt) < new Date()) {
        r.active = false;
        return false;
      }
      return true;
    });
  }

  listRecords(filter?: {
    botId?: string;
    action?: BotModerationAction;
    active?: boolean;
  }): BotModerationRecord[] {
    let records = Array.from(this.records.values());
    if (filter?.botId) {
      records = records.filter((r) => r.botId === filter.botId);
    }
    if (filter?.action) {
      records = records.filter((r) => r.action === filter.action);
    }
    if (filter?.active !== undefined) {
      records = records.filter((r) => r.active === filter.active);
    }
    return records;
  }

  saveRecord(record: BotModerationRecord): void {
    this.records.set(record.id, record);
  }

  // --- Abuse Flags ---

  getAbuseFlags(botId: string): BotAbuseFlags {
    return this.abuseFlags.get(botId) ?? this.createDefaultAbuseFlags();
  }

  setAbuseFlags(botId: string, flags: BotAbuseFlags): void {
    this.abuseFlags.set(botId, flags);
  }

  // --- Audit ---

  addAuditEntry(entry: BotAuditEntry): void {
    this.auditEntries.push(entry);
  }

  getAuditEntries(filter?: {
    botId?: string;
    eventType?: BotAuditEventType;
    limit?: number;
  }): BotAuditEntry[] {
    let entries = [...this.auditEntries];
    if (filter?.botId) {
      entries = entries.filter((e) => e.botId === filter.botId);
    }
    if (filter?.eventType) {
      entries = entries.filter((e) => e.eventType === filter.eventType);
    }
    entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    if (filter?.limit) {
      entries = entries.slice(0, filter.limit);
    }
    return entries;
  }

  clear(): void {
    this.records.clear();
    this.abuseFlags.clear();
    this.auditEntries = [];
  }

  private createDefaultAbuseFlags(): BotAbuseFlags {
    return {
      rateLimitViolations: 0,
      scopeEscalationAttempts: 0,
      spamScore: 0,
      unauthorizedChannelAttempts: 0,
      isFlagged: false,
    };
  }
}

// ============================================================================
// BOT MODERATION MANAGER
// ============================================================================

/**
 * Abuse detection thresholds.
 */
export interface AbuseThresholds {
  /** Max rate limit violations before flagging */
  rateLimitViolationThreshold: number;
  /** Max scope escalation attempts before flagging */
  scopeEscalationThreshold: number;
  /** Spam score threshold for flagging */
  spamScoreThreshold: number;
  /** Max unauthorized channel attempts before flagging */
  unauthorizedChannelThreshold: number;
}

const DEFAULT_ABUSE_THRESHOLDS: AbuseThresholds = {
  rateLimitViolationThreshold: 10,
  scopeEscalationThreshold: 3,
  spamScoreThreshold: 80,
  unauthorizedChannelThreshold: 5,
};

export class BotModerationManager {
  private thresholds: AbuseThresholds;

  constructor(
    private store: BotModerationStore,
    thresholds?: Partial<AbuseThresholds>,
  ) {
    this.thresholds = { ...DEFAULT_ABUSE_THRESHOLDS, ...thresholds };
  }

  // ==========================================================================
  // MODERATION ACTIONS
  // ==========================================================================

  /**
   * Issue a warning to a bot.
   */
  warn(
    botId: string,
    reason: string,
    performedBy: string,
    workspaceId?: string,
  ): BotModerationRecord {
    return this.createRecord(botId, "warn", reason, performedBy, workspaceId);
  }

  /**
   * Restrict a bot to specific channels.
   */
  restrict(
    botId: string,
    reason: string,
    performedBy: string,
    workspaceId?: string,
    metadata?: Record<string, unknown>,
  ): BotModerationRecord {
    return this.createRecord(
      botId,
      "restrict",
      reason,
      performedBy,
      workspaceId,
      undefined,
      metadata,
    );
  }

  /**
   * Reduce a bot's rate limits.
   */
  reduceRateLimits(
    botId: string,
    reason: string,
    performedBy: string,
    factor: number,
    workspaceId?: string,
  ): BotModerationRecord {
    return this.createRecord(
      botId,
      "rate_reduce",
      reason,
      performedBy,
      workspaceId,
      undefined,
      {
        reductionFactor: factor,
      },
    );
  }

  /**
   * Suspend a bot (with optional duration).
   */
  suspend(
    botId: string,
    reason: string,
    performedBy: string,
    durationMs?: number,
    workspaceId?: string,
  ): BotModerationRecord {
    const expiresAt = durationMs
      ? new Date(Date.now() + durationMs).toISOString()
      : undefined;

    return this.createRecord(
      botId,
      "suspend",
      reason,
      performedBy,
      workspaceId,
      expiresAt,
    );
  }

  /**
   * Force uninstall a bot from a workspace.
   */
  forceUninstall(
    botId: string,
    reason: string,
    performedBy: string,
    workspaceId: string,
  ): BotModerationRecord {
    return this.createRecord(
      botId,
      "force_uninstall",
      reason,
      performedBy,
      workspaceId,
    );
  }

  /**
   * Ban a bot permanently.
   */
  ban(botId: string, reason: string, performedBy: string): BotModerationRecord {
    return this.createRecord(botId, "ban", reason, performedBy);
  }

  /**
   * Lift a moderation action (deactivate a record).
   */
  liftAction(recordId: string, liftedBy: string): BotModerationRecord {
    const record = this.store.getRecord(recordId);
    if (!record) {
      throw new BotModerationError(
        "Moderation record not found",
        "RECORD_NOT_FOUND",
        404,
      );
    }

    if (!record.active) {
      throw new BotModerationError(
        "Moderation action is already inactive",
        "ALREADY_INACTIVE",
      );
    }

    record.active = false;
    this.store.saveRecord(record);

    this.audit(
      record.botId,
      "bot.moderation_action",
      liftedBy,
      `Moderation action "${record.action}" lifted`,
      {
        recordId,
        originalAction: record.action,
      },
    );

    return record;
  }

  // ==========================================================================
  // BOT STATUS CHECK
  // ==========================================================================

  /**
   * Check if a bot is currently suspended or banned.
   */
  isSuspended(botId: string, workspaceId?: string): boolean {
    const records = this.store.getActiveRecords(botId, workspaceId);
    return records.some((r) => r.action === "suspend" || r.action === "ban");
  }

  /**
   * Check if a bot is restricted.
   */
  isRestricted(botId: string, workspaceId?: string): boolean {
    const records = this.store.getActiveRecords(botId, workspaceId);
    return records.some((r) => r.action === "restrict");
  }

  /**
   * Check if a bot is banned.
   */
  isBanned(botId: string): boolean {
    const records = this.store.getActiveRecords(botId);
    return records.some((r) => r.action === "ban");
  }

  /**
   * Get all active restrictions for a bot.
   */
  getActiveRestrictions(
    botId: string,
    workspaceId?: string,
  ): BotModerationRecord[] {
    return this.store.getActiveRecords(botId, workspaceId);
  }

  /**
   * Check if a bot can perform actions (not suspended or banned).
   */
  canAct(
    botId: string,
    workspaceId?: string,
  ): { allowed: boolean; reason?: string } {
    if (this.isBanned(botId)) {
      return { allowed: false, reason: "Bot is permanently banned" };
    }
    if (this.isSuspended(botId, workspaceId)) {
      return { allowed: false, reason: "Bot is currently suspended" };
    }
    return { allowed: true };
  }

  // ==========================================================================
  // ABUSE DETECTION
  // ==========================================================================

  /**
   * Record a rate limit violation.
   */
  recordRateLimitViolation(botId: string): BotAbuseFlags {
    const flags = this.store.getAbuseFlags(botId);
    flags.rateLimitViolations++;
    flags.lastViolationAt = new Date().toISOString();

    if (
      flags.rateLimitViolations >= this.thresholds.rateLimitViolationThreshold
    ) {
      flags.isFlagged = true;
      this.audit(
        botId,
        "bot.abuse_detected",
        "system",
        `Rate limit violations exceeded threshold (${flags.rateLimitViolations})`,
      );
    }

    this.store.setAbuseFlags(botId, flags);
    return flags;
  }

  /**
   * Record a scope escalation attempt.
   */
  recordScopeEscalation(botId: string): BotAbuseFlags {
    const flags = this.store.getAbuseFlags(botId);
    flags.scopeEscalationAttempts++;
    flags.lastViolationAt = new Date().toISOString();

    if (
      flags.scopeEscalationAttempts >= this.thresholds.scopeEscalationThreshold
    ) {
      flags.isFlagged = true;
      this.audit(
        botId,
        "bot.abuse_detected",
        "system",
        `Scope escalation attempts exceeded threshold (${flags.scopeEscalationAttempts})`,
      );
    }

    this.store.setAbuseFlags(botId, flags);
    return flags;
  }

  /**
   * Update spam score for a bot.
   */
  updateSpamScore(botId: string, score: number): BotAbuseFlags {
    const flags = this.store.getAbuseFlags(botId);
    flags.spamScore = Math.max(0, Math.min(100, score));

    if (flags.spamScore >= this.thresholds.spamScoreThreshold) {
      flags.isFlagged = true;
      this.audit(
        botId,
        "bot.abuse_detected",
        "system",
        `Spam score exceeded threshold (${flags.spamScore})`,
      );
    }

    this.store.setAbuseFlags(botId, flags);
    return flags;
  }

  /**
   * Record an unauthorized channel access attempt.
   */
  recordUnauthorizedChannelAttempt(botId: string): BotAbuseFlags {
    const flags = this.store.getAbuseFlags(botId);
    flags.unauthorizedChannelAttempts++;
    flags.lastViolationAt = new Date().toISOString();

    if (
      flags.unauthorizedChannelAttempts >=
      this.thresholds.unauthorizedChannelThreshold
    ) {
      flags.isFlagged = true;
      this.audit(
        botId,
        "bot.abuse_detected",
        "system",
        `Unauthorized channel attempts exceeded threshold (${flags.unauthorizedChannelAttempts})`,
      );
    }

    this.store.setAbuseFlags(botId, flags);
    return flags;
  }

  /**
   * Get abuse flags for a bot.
   */
  getAbuseFlags(botId: string): BotAbuseFlags {
    return this.store.getAbuseFlags(botId);
  }

  /**
   * Reset abuse flags for a bot.
   */
  resetAbuseFlags(botId: string, resetBy: string): void {
    this.store.setAbuseFlags(botId, {
      rateLimitViolations: 0,
      scopeEscalationAttempts: 0,
      spamScore: 0,
      unauthorizedChannelAttempts: 0,
      isFlagged: false,
    });
    this.audit(botId, "bot.moderation_action", resetBy, "Abuse flags reset");
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  listRecords(filter?: {
    botId?: string;
    action?: BotModerationAction;
    active?: boolean;
  }): BotModerationRecord[] {
    return this.store.listRecords(filter);
  }

  getAuditEntries(filter?: {
    botId?: string;
    eventType?: BotAuditEventType;
    limit?: number;
  }): BotAuditEntry[] {
    return this.store.getAuditEntries(filter);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createRecord(
    botId: string,
    action: BotModerationAction,
    reason: string,
    performedBy: string,
    workspaceId?: string,
    expiresAt?: string,
    metadata?: Record<string, unknown>,
  ): BotModerationRecord {
    const record: BotModerationRecord = {
      id: generateId("mod"),
      botId,
      workspaceId,
      action,
      reason,
      performedBy,
      performedAt: new Date().toISOString(),
      expiresAt,
      active: true,
      metadata,
    };

    this.store.saveRecord(record);

    this.audit(
      botId,
      "bot.moderation_action",
      performedBy,
      `Moderation action "${action}" applied: ${reason}`,
      {
        recordId: record.id,
        action,
        reason,
        workspaceId,
      },
    );

    return record;
  }

  private audit(
    botId: string,
    eventType: BotAuditEventType,
    actorId: string,
    description: string,
    data?: Record<string, unknown>,
  ): void {
    this.store.addAuditEntry({
      id: generateId("audit"),
      eventType,
      botId,
      actorId,
      timestamp: new Date().toISOString(),
      description,
      data,
    });
  }
}
