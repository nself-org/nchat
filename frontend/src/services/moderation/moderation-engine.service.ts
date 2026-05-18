/**
 * Moderation Engine Service
 *
 * Central orchestrator for all moderation functionality including:
 * - Report triage and management
 * - Mute/kick/ban/timeout/slowmode
 * - Auto-moderation rules
 * - Appeals processing
 * - Moderation logging and audit trail
 * - Bulk moderation operations
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type ModerationActionType =
  | "warn"
  | "mute"
  | "unmute"
  | "kick"
  | "ban"
  | "unban"
  | "timeout"
  | "remove_timeout"
  | "slowmode"
  | "remove_slowmode"
  | "delete_message"
  | "hide_message"
  | "restore_message"
  | "flag"
  | "purge";

export type TimeoutDuration =
  | "5m"
  | "10m"
  | "30m"
  | "1h"
  | "4h"
  | "8h"
  | "24h"
  | "3d"
  | "7d"
  | "14d"
  | "30d";

export type ReportCategory =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "scam"
  | "underage"
  | "self_harm"
  | "other";

export type ReportStatus =
  | "pending"
  | "under_review"
  | "resolved"
  | "dismissed"
  | "escalated";
export type ReportPriority = "low" | "medium" | "high" | "critical";
export type AppealStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "partially_approved"
  | "withdrawn";

// ============================================================================
// Report Types
// ============================================================================

export interface ReportEvidence {
  id: string;
  type: "screenshot" | "link" | "text" | "file" | "message_id";
  content: string;
  description?: string;
  addedAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: "user" | "message" | "channel";
  targetId: string;
  targetName?: string;
  category: ReportCategory;
  description: string;
  evidence: ReportEvidence[];
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: string;
  assignedToName?: string;
  notes: ReportNote[];
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  channelId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReportNote {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

// ============================================================================
// Moderation Action Types
// ============================================================================

export interface ModerationAction {
  id: string;
  actionType: ModerationActionType;
  targetUserId: string;
  targetUserName?: string;
  moderatorId: string;
  moderatorName?: string;
  reason: string;
  channelId?: string;
  workspaceId?: string;
  duration?: number; // in milliseconds
  expiresAt?: Date;
  isAutomated: boolean;
  automationRuleId?: string;
  relatedReportId?: string;
  affectedMessageIds?: string[];
  metadata?: Record<string, unknown>;
  reversible: boolean;
  reversedBy?: string;
  reversedAt?: Date;
  createdAt: Date;
}

export interface UserPenalty {
  id: string;
  userId: string;
  penaltyType: "mute" | "ban" | "timeout" | "warning";
  channelId?: string; // null = workspace-wide
  workspaceId: string;
  reason: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date; // null = permanent
  isActive: boolean;
  liftedBy?: string;
  liftedAt?: Date;
  liftReason?: string;
}

// ============================================================================
// Timeout Types
// ============================================================================

export interface TimeoutConfig {
  userId: string;
  duration: TimeoutDuration;
  reason: string;
  moderatorId: string;
  channelId?: string; // null = workspace-wide
  workspaceId: string;
}

export interface TimeoutInfo {
  id: string;
  userId: string;
  channelId?: string;
  workspaceId: string;
  reason: string;
  moderatorId: string;
  startedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  remainingMs: number;
}

// ============================================================================
// Slowmode Types
// ============================================================================

export interface SlowmodeConfig {
  channelId: string;
  intervalMs: number; // Time between messages
  enabled: boolean;
  bypassRoles: string[];
  bypassUsers: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Appeal Types
// ============================================================================

export interface Appeal {
  id: string;
  userId: string;
  userName?: string;
  actionId: string;
  penaltyId?: string;
  reason: string;
  evidence: ReportEvidence[];
  status: AppealStatus;
  priority: ReportPriority;
  assignedTo?: string;
  assignedToName?: string;
  reviewNotes: AppealNote[];
  resolution?: string;
  outcome?: AppealOutcome;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AppealNote {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface AppealOutcome {
  decision: "overturn" | "uphold" | "modify";
  explanation: string;
  newPenalty?: Partial<UserPenalty>;
  compensationOffered?: string;
}

// ============================================================================
// Auto-Mod Types
// ============================================================================

export interface AutoModRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutoModTrigger;
  conditions: AutoModCondition[];
  actions: AutoModActionConfig[];
  priority: number;
  cooldownMs: number;
  maxTriggersPerHour: number;
  exemptRoles: string[];
  exemptUsers: string[];
  channelIds?: string[]; // null = all channels
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AutoModTrigger =
  | "message_content"
  | "spam_detection"
  | "mention_spam"
  | "link_detection"
  | "file_upload"
  | "join_event"
  | "raid_detection";

export interface AutoModCondition {
  type:
    | "keyword"
    | "regex"
    | "mention_count"
    | "link_count"
    | "caps_percentage"
    | "message_rate";
  value: string | number;
  operator: "equals" | "contains" | "matches" | "greater_than" | "less_than";
}

export interface AutoModActionConfig {
  action: ModerationActionType;
  duration?: number;
  reason?: string;
  notifyUser: boolean;
  notifyModerators: boolean;
  logToChannel?: string;
}

// ============================================================================
// Moderation Log Types
// ============================================================================

export interface ModerationLogEntry {
  id: string;
  action: ModerationAction;
  actor: {
    id: string;
    name?: string;
    role: string;
  };
  target: {
    id: string;
    name?: string;
    type: "user" | "message" | "channel";
  };
  reason: string;
  evidence?: string[];
  outcome: "success" | "failure" | "partial";
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Engine Configuration
// ============================================================================

export interface ModerationEngineConfig {
  // Thresholds
  autoModerationEnabled: boolean;
  spamThreshold: number;
  toxicityThreshold: number;
  nsfwThreshold: number;

  // Timeouts
  defaultTimeoutDuration: TimeoutDuration;
  maxTimeoutDuration: TimeoutDuration;

  // Rate Limiting
  defaultSlowmodeInterval: number;
  maxSlowmodeInterval: number;

  // Escalation
  warningsBeforeMute: number;
  mutesBeforeBan: number;
  autoEscalationEnabled: boolean;

  // Appeals
  appealsEnabled: boolean;
  appealWindowDays: number;
  maxAppealsPerAction: number;

  // Logging
  retainLogsForDays: number;
  anonymizeAfterDays: number;
}

export const DEFAULT_ENGINE_CONFIG: ModerationEngineConfig = {
  autoModerationEnabled: true,
  spamThreshold: 0.7,
  toxicityThreshold: 0.8,
  nsfwThreshold: 0.9,

  defaultTimeoutDuration: "10m",
  maxTimeoutDuration: "30d",

  defaultSlowmodeInterval: 5000,
  maxSlowmodeInterval: 21600000, // 6 hours

  warningsBeforeMute: 3,
  mutesBeforeBan: 2,
  autoEscalationEnabled: true,

  appealsEnabled: true,
  appealWindowDays: 30,
  maxAppealsPerAction: 3,

  retainLogsForDays: 365,
  anonymizeAfterDays: 730,
};

// ============================================================================
// Duration Conversion
// ============================================================================

export const TIMEOUT_DURATIONS: Record<TimeoutDuration, number> = {
  "5m": 5 * 60 * 1000,
  "10m": 10 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function parseDuration(duration: TimeoutDuration): number {
  return TIMEOUT_DURATIONS[duration] || TIMEOUT_DURATIONS["10m"];
}

export function formatDurationMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateReportPriority(
  category: ReportCategory,
  hasEvidence: boolean,
): ReportPriority {
  const urgentCategories: ReportCategory[] = [
    "violence",
    "self_harm",
    "underage",
  ];
  const highCategories: ReportCategory[] = [
    "harassment",
    "hate_speech",
    "scam",
  ];

  if (urgentCategories.includes(category)) return "critical";
  if (highCategories.includes(category)) return hasEvidence ? "high" : "medium";
  return hasEvidence ? "medium" : "low";
}

// ============================================================================
// Moderation Engine Class
// ============================================================================

export class ModerationEngine {
  private config: ModerationEngineConfig;
  private reports: Map<string, Report> = new Map();
  private actions: Map<string, ModerationAction> = new Map();
  private penalties: Map<string, UserPenalty> = new Map();
  private appeals: Map<string, Appeal> = new Map();
  private autoModRules: Map<string, AutoModRule> = new Map();
  private slowmodeConfigs: Map<string, SlowmodeConfig> = new Map();
  private timeouts: Map<string, TimeoutInfo> = new Map();
  private moderationLogs: ModerationLogEntry[] = [];
  private userWarningCounts: Map<string, number> = new Map();
  private userMuteCounts: Map<string, number> = new Map();

  constructor(config: Partial<ModerationEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  updateConfig(config: Partial<ModerationEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ModerationEngineConfig {
    return { ...this.config };
  }

  // ==========================================================================
  // Report Management
  // ==========================================================================

  /**
   * Creates a new report
   */
  createReport(params: {
    reporterId: string;
    reporterName?: string;
    targetType: "user" | "message" | "channel";
    targetId: string;
    targetName?: string;
    category: ReportCategory;
    description: string;
    evidence?: Omit<ReportEvidence, "id" | "addedAt">[];
    channelId?: string;
    workspaceId?: string;
  }): { success: boolean; report?: Report; error?: string } {
    if (!params.description?.trim()) {
      return { success: false, error: "Description is required" };
    }

    const now = new Date();
    const evidence: ReportEvidence[] = (params.evidence || []).map((e) => ({
      ...e,
      id: generateId(),
      addedAt: now,
    }));

    const priority = calculateReportPriority(
      params.category,
      evidence.length > 0,
    );

    const report: Report = {
      id: generateId(),
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      category: params.category,
      description: params.description.trim(),
      evidence,
      status: "pending",
      priority,
      notes: [],
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      createdAt: now,
      updatedAt: now,
    };

    this.reports.set(report.id, report);

    this.logAction({
      actionType: "flag",
      targetUserId: params.targetId,
      moderatorId: params.reporterId,
      reason: `Report filed: ${params.category}`,
      isAutomated: false,
      relatedReportId: report.id,
    });

    logger.info(`Report created: ${report.id}`, {
      category: params.category,
      priority,
    });

    return { success: true, report };
  }

  /**
   * Gets report by ID
   */
  getReport(reportId: string): Report | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Gets all reports with optional filters
   */
  getReports(filters?: {
    status?: ReportStatus | ReportStatus[];
    priority?: ReportPriority | ReportPriority[];
    category?: ReportCategory;
    targetId?: string;
    assignedTo?: string;
  }): Report[] {
    let reports = Array.from(this.reports.values());

    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      reports = reports.filter((r) => statuses.includes(r.status));
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      reports = reports.filter((r) => priorities.includes(r.priority));
    }

    if (filters?.category) {
      reports = reports.filter((r) => r.category === filters.category);
    }

    if (filters?.targetId) {
      reports = reports.filter((r) => r.targetId === filters.targetId);
    }

    if (filters?.assignedTo) {
      reports = reports.filter((r) => r.assignedTo === filters.assignedTo);
    }

    // Sort by priority (critical first) then by date
    const priorityOrder: Record<ReportPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return reports.sort((a, b) => {
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Gets pending reports (queue)
   */
  getReportQueue(): Report[] {
    return this.getReports({
      status: ["pending", "under_review", "escalated"],
    });
  }

  /**
   * Updates a report
   */
  updateReport(
    reportId: string,
    updates: {
      status?: ReportStatus;
      priority?: ReportPriority;
      assignedTo?: string;
      assignedToName?: string;
      resolution?: string;
    },
    moderatorId: string,
  ): { success: boolean; report?: Report; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    if (updates.status) report.status = updates.status;
    if (updates.priority) report.priority = updates.priority;
    if (updates.assignedTo !== undefined) {
      report.assignedTo = updates.assignedTo;
      report.assignedToName = updates.assignedToName;
    }
    if (updates.resolution) {
      report.resolution = updates.resolution;
      report.resolvedBy = moderatorId;
      report.resolvedAt = new Date();
    }

    report.updatedAt = new Date();

    return { success: true, report };
  }

  /**
   * Adds a note to a report
   */
  addReportNote(
    reportId: string,
    authorId: string,
    content: string,
    isInternal: boolean = false,
    authorName?: string,
  ): { success: boolean; note?: ReportNote; error?: string } {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    const note: ReportNote = {
      id: generateId(),
      authorId,
      authorName,
      content: content.trim(),
      isInternal,
      createdAt: new Date(),
    };

    report.notes.push(note);
    report.updatedAt = new Date();

    return { success: true, note };
  }

  // ==========================================================================
  // Moderation Actions
  // ==========================================================================

  /**
   * Issues a warning to a user
   */
  warnUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason: string;
    moderatorName?: string;
    channelId?: string;
    workspaceId?: string;
  }): { success: boolean; action?: ModerationAction; escalated?: boolean } {
    const action = this.createAction({
      actionType: "warn",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      reason: params.reason,
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      isAutomated: false,
    });

    // Track warning count for escalation
    const warningKey = `${params.workspaceId || "global"}:${params.targetUserId}`;
    const currentWarnings = (this.userWarningCounts.get(warningKey) || 0) + 1;
    this.userWarningCounts.set(warningKey, currentWarnings);

    let escalated = false;
    if (
      this.config.autoEscalationEnabled &&
      currentWarnings >= this.config.warningsBeforeMute
    ) {
      this.muteUser({
        targetUserId: params.targetUserId,
        moderatorId: "system",
        moderatorName: "Auto-Moderation",
        reason: `Auto-muted after ${currentWarnings} warnings`,
        workspaceId: params.workspaceId || "global",
        duration: 30 * 60 * 1000, // 30 minutes
      });
      escalated = true;
    }

    return { success: true, action, escalated };
  }

  /**
   * Mutes a user
   */
  muteUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason: string;
    workspaceId: string;
    moderatorName?: string;
    channelId?: string;
    duration?: number; // in milliseconds, undefined = permanent
  }): {
    success: boolean;
    action?: ModerationAction;
    penalty?: UserPenalty;
    escalated?: boolean;
  } {
    const now = new Date();
    const expiresAt = params.duration
      ? new Date(now.getTime() + params.duration)
      : undefined;

    const penalty: UserPenalty = {
      id: generateId(),
      userId: params.targetUserId,
      penaltyType: "mute",
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      reason: params.reason,
      issuedBy: params.moderatorId,
      issuedAt: now,
      expiresAt,
      isActive: true,
    };

    this.penalties.set(penalty.id, penalty);

    const action = this.createAction({
      actionType: "mute",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      reason: params.reason,
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      duration: params.duration,
      expiresAt,
      isAutomated: params.moderatorId === "system",
    });

    // Track mute count for escalation
    const muteKey = `${params.workspaceId}:${params.targetUserId}`;
    const currentMutes = (this.userMuteCounts.get(muteKey) || 0) + 1;
    this.userMuteCounts.set(muteKey, currentMutes);

    let escalated = false;
    if (
      this.config.autoEscalationEnabled &&
      currentMutes >= this.config.mutesBeforeBan
    ) {
      this.banUser({
        targetUserId: params.targetUserId,
        moderatorId: "system",
        moderatorName: "Auto-Moderation",
        reason: `Auto-banned after ${currentMutes} mutes`,
        workspaceId: params.workspaceId,
        duration: 24 * 60 * 60 * 1000, // 24 hours
      });
      escalated = true;
    }

    return { success: true, action, penalty, escalated };
  }

  /**
   * Unmutes a user
   */
  unmuteUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason?: string;
    workspaceId: string;
    channelId?: string;
  }): { success: boolean; action?: ModerationAction; error?: string } {
    // Find active mute
    const activeMute = Array.from(this.penalties.values()).find(
      (p) =>
        p.userId === params.targetUserId &&
        p.penaltyType === "mute" &&
        p.isActive &&
        p.workspaceId === params.workspaceId &&
        (params.channelId === undefined || p.channelId === params.channelId),
    );

    if (!activeMute) {
      return { success: false, error: "No active mute found for user" };
    }

    activeMute.isActive = false;
    activeMute.liftedBy = params.moderatorId;
    activeMute.liftedAt = new Date();
    activeMute.liftReason = params.reason;

    const action = this.createAction({
      actionType: "unmute",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      reason: params.reason || "Mute removed",
      workspaceId: params.workspaceId,
      channelId: params.channelId,
      isAutomated: false,
    });

    return { success: true, action };
  }

  /**
   * Kicks a user from a channel
   */
  kickUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason: string;
    channelId: string;
    moderatorName?: string;
  }): { success: boolean; action?: ModerationAction } {
    const action = this.createAction({
      actionType: "kick",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      reason: params.reason,
      channelId: params.channelId,
      isAutomated: false,
    });

    return { success: true, action };
  }

  /**
   * Bans a user
   */
  banUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason: string;
    workspaceId: string;
    moderatorName?: string;
    channelId?: string;
    duration?: number; // in milliseconds, undefined = permanent
  }): { success: boolean; action?: ModerationAction; penalty?: UserPenalty } {
    const now = new Date();
    const expiresAt = params.duration
      ? new Date(now.getTime() + params.duration)
      : undefined;

    const penalty: UserPenalty = {
      id: generateId(),
      userId: params.targetUserId,
      penaltyType: "ban",
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      reason: params.reason,
      issuedBy: params.moderatorId,
      issuedAt: now,
      expiresAt,
      isActive: true,
    };

    this.penalties.set(penalty.id, penalty);

    const action = this.createAction({
      actionType: "ban",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      reason: params.reason,
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      duration: params.duration,
      expiresAt,
      isAutomated: params.moderatorId === "system",
    });

    return { success: true, action, penalty };
  }

  /**
   * Unbans a user
   */
  unbanUser(params: {
    targetUserId: string;
    moderatorId: string;
    reason?: string;
    workspaceId: string;
    channelId?: string;
  }): { success: boolean; action?: ModerationAction; error?: string } {
    const activeBan = Array.from(this.penalties.values()).find(
      (p) =>
        p.userId === params.targetUserId &&
        p.penaltyType === "ban" &&
        p.isActive &&
        p.workspaceId === params.workspaceId &&
        (params.channelId === undefined || p.channelId === params.channelId),
    );

    if (!activeBan) {
      return { success: false, error: "No active ban found for user" };
    }

    activeBan.isActive = false;
    activeBan.liftedBy = params.moderatorId;
    activeBan.liftedAt = new Date();
    activeBan.liftReason = params.reason;

    const action = this.createAction({
      actionType: "unban",
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      reason: params.reason || "Ban removed",
      workspaceId: params.workspaceId,
      channelId: params.channelId,
      isAutomated: false,
    });

    return { success: true, action };
  }

  /**
   * Times out a user (temporary restriction)
   */
  timeoutUser(config: TimeoutConfig): {
    success: boolean;
    timeout?: TimeoutInfo;
    action?: ModerationAction;
  } {
    const durationMs = parseDuration(config.duration);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs);

    const timeout: TimeoutInfo = {
      id: generateId(),
      userId: config.userId,
      channelId: config.channelId,
      workspaceId: config.workspaceId,
      reason: config.reason,
      moderatorId: config.moderatorId,
      startedAt: now,
      expiresAt,
      isActive: true,
      remainingMs: durationMs,
    };

    this.timeouts.set(timeout.id, timeout);

    const penalty: UserPenalty = {
      id: generateId(),
      userId: config.userId,
      penaltyType: "timeout",
      channelId: config.channelId,
      workspaceId: config.workspaceId,
      reason: config.reason,
      issuedBy: config.moderatorId,
      issuedAt: now,
      expiresAt,
      isActive: true,
    };

    this.penalties.set(penalty.id, penalty);

    const action = this.createAction({
      actionType: "timeout",
      targetUserId: config.userId,
      moderatorId: config.moderatorId,
      reason: config.reason,
      channelId: config.channelId,
      workspaceId: config.workspaceId,
      duration: durationMs,
      expiresAt,
      isAutomated: false,
    });

    return { success: true, timeout, action };
  }

  /**
   * Removes a timeout from a user
   */
  removeTimeout(params: {
    userId: string;
    moderatorId: string;
    reason?: string;
    workspaceId: string;
    channelId?: string;
  }): { success: boolean; action?: ModerationAction; error?: string } {
    const activeTimeout = Array.from(this.timeouts.values()).find(
      (t) =>
        t.userId === params.userId &&
        t.isActive &&
        t.workspaceId === params.workspaceId &&
        (params.channelId === undefined || t.channelId === params.channelId),
    );

    if (!activeTimeout) {
      return { success: false, error: "No active timeout found for user" };
    }

    activeTimeout.isActive = false;

    // Also update the penalty record
    const activePenalty = Array.from(this.penalties.values()).find(
      (p) =>
        p.userId === params.userId &&
        p.penaltyType === "timeout" &&
        p.isActive &&
        p.workspaceId === params.workspaceId,
    );

    if (activePenalty) {
      activePenalty.isActive = false;
      activePenalty.liftedBy = params.moderatorId;
      activePenalty.liftedAt = new Date();
      activePenalty.liftReason = params.reason;
    }

    const action = this.createAction({
      actionType: "remove_timeout",
      targetUserId: params.userId,
      moderatorId: params.moderatorId,
      reason: params.reason || "Timeout removed",
      workspaceId: params.workspaceId,
      channelId: params.channelId,
      isAutomated: false,
    });

    return { success: true, action };
  }

  /**
   * Gets active timeout for a user
   */
  getActiveTimeout(
    userId: string,
    workspaceId: string,
    channelId?: string,
  ): TimeoutInfo | undefined {
    const now = Date.now();
    return Array.from(this.timeouts.values()).find(
      (t) =>
        t.userId === userId &&
        t.isActive &&
        t.workspaceId === workspaceId &&
        t.expiresAt.getTime() > now &&
        (channelId === undefined ||
          t.channelId === channelId ||
          t.channelId === undefined),
    );
  }

  /**
   * Checks if user is timed out
   */
  isUserTimedOut(
    userId: string,
    workspaceId: string,
    channelId?: string,
  ): boolean {
    return this.getActiveTimeout(userId, workspaceId, channelId) !== undefined;
  }

  // ==========================================================================
  // Slow Mode
  // ==========================================================================

  /**
   * Sets slow mode for a channel
   */
  setSlowmode(params: {
    channelId: string;
    intervalMs: number;
    moderatorId: string;
    bypassRoles?: string[];
    bypassUsers?: string[];
  }): { success: boolean; config?: SlowmodeConfig; error?: string } {
    if (params.intervalMs < 0) {
      return { success: false, error: "Interval must be positive" };
    }

    if (params.intervalMs > this.config.maxSlowmodeInterval) {
      return {
        success: false,
        error: `Maximum slowmode interval is ${formatDurationMs(this.config.maxSlowmodeInterval)}`,
      };
    }

    const now = new Date();
    const config: SlowmodeConfig = {
      channelId: params.channelId,
      intervalMs: params.intervalMs,
      enabled: params.intervalMs > 0,
      bypassRoles: params.bypassRoles || ["owner", "admin", "moderator"],
      bypassUsers: params.bypassUsers || [],
      createdBy: params.moderatorId,
      createdAt: now,
      updatedAt: now,
    };

    this.slowmodeConfigs.set(params.channelId, config);

    this.createAction({
      actionType: params.intervalMs > 0 ? "slowmode" : "remove_slowmode",
      targetUserId: params.channelId,
      moderatorId: params.moderatorId,
      reason:
        params.intervalMs > 0
          ? `Slowmode set to ${formatDurationMs(params.intervalMs)}`
          : "Slowmode disabled",
      channelId: params.channelId,
      isAutomated: false,
    });

    return { success: true, config };
  }

  /**
   * Removes slow mode from a channel
   */
  removeSlowmode(channelId: string, moderatorId: string): { success: boolean } {
    const config = this.slowmodeConfigs.get(channelId);
    if (config) {
      config.enabled = false;
      config.intervalMs = 0;
      config.updatedAt = new Date();
    }

    this.createAction({
      actionType: "remove_slowmode",
      targetUserId: channelId,
      moderatorId,
      reason: "Slowmode disabled",
      channelId,
      isAutomated: false,
    });

    return { success: true };
  }

  /**
   * Gets slow mode config for a channel
   */
  getSlowmodeConfig(channelId: string): SlowmodeConfig | undefined {
    return this.slowmodeConfigs.get(channelId);
  }

  /**
   * Checks if slow mode is enabled for a channel
   */
  isSlowmodeEnabled(channelId: string): boolean {
    const config = this.slowmodeConfigs.get(channelId);
    return config?.enabled === true && config.intervalMs > 0;
  }

  // ==========================================================================
  // Bulk Actions
  // ==========================================================================

  /**
   * Bulk delete messages
   */
  bulkDeleteMessages(params: {
    messageIds: string[];
    moderatorId: string;
    reason: string;
    channelId: string;
  }): { success: boolean; deletedCount: number; action?: ModerationAction } {
    const action = this.createAction({
      actionType: "purge",
      targetUserId: params.channelId,
      moderatorId: params.moderatorId,
      reason: params.reason,
      channelId: params.channelId,
      affectedMessageIds: params.messageIds,
      isAutomated: false,
      metadata: { messageCount: params.messageIds.length },
    });

    return {
      success: true,
      deletedCount: params.messageIds.length,
      action,
    };
  }

  /**
   * Bulk ban users
   */
  bulkBanUsers(params: {
    userIds: string[];
    moderatorId: string;
    reason: string;
    workspaceId: string;
    duration?: number;
  }): { success: boolean; bannedCount: number; errors: string[] } {
    const errors: string[] = [];
    let bannedCount = 0;

    for (const userId of params.userIds) {
      const result = this.banUser({
        targetUserId: userId,
        moderatorId: params.moderatorId,
        reason: params.reason,
        workspaceId: params.workspaceId,
        duration: params.duration,
      });

      if (result.success) {
        bannedCount++;
      } else {
        errors.push(`Failed to ban user ${userId}`);
      }
    }

    return { success: errors.length === 0, bannedCount, errors };
  }

  /**
   * Bulk mute users
   */
  bulkMuteUsers(params: {
    userIds: string[];
    moderatorId: string;
    reason: string;
    workspaceId: string;
    duration?: number;
  }): { success: boolean; mutedCount: number; errors: string[] } {
    const errors: string[] = [];
    let mutedCount = 0;

    for (const userId of params.userIds) {
      const result = this.muteUser({
        targetUserId: userId,
        moderatorId: params.moderatorId,
        reason: params.reason,
        workspaceId: params.workspaceId,
        duration: params.duration,
      });

      if (result.success) {
        mutedCount++;
      } else {
        errors.push(`Failed to mute user ${userId}`);
      }
    }

    return { success: errors.length === 0, mutedCount, errors };
  }

  /**
   * Purge channel history
   */
  purgeChannelHistory(params: {
    channelId: string;
    moderatorId: string;
    reason: string;
    messageCount?: number;
    beforeDate?: Date;
    fromUserId?: string;
  }): { success: boolean; action?: ModerationAction } {
    const action = this.createAction({
      actionType: "purge",
      targetUserId: params.channelId,
      moderatorId: params.moderatorId,
      reason: params.reason,
      channelId: params.channelId,
      isAutomated: false,
      metadata: {
        messageCount: params.messageCount,
        beforeDate: params.beforeDate?.toISOString(),
        fromUserId: params.fromUserId,
      },
    });

    return { success: true, action };
  }

  // ==========================================================================
  // Appeals
  // ==========================================================================

  /**
   * Submits an appeal
   */
  submitAppeal(params: {
    userId: string;
    userName?: string;
    actionId: string;
    penaltyId?: string;
    reason: string;
    evidence?: Omit<ReportEvidence, "id" | "addedAt">[];
  }): { success: boolean; appeal?: Appeal; error?: string } {
    if (!this.config.appealsEnabled) {
      return { success: false, error: "Appeals are disabled" };
    }

    if (!params.reason || !params.reason.trim()) {
      return { success: false, error: "Appeal reason is required" };
    }

    const action = this.actions.get(params.actionId);
    if (!action) {
      return { success: false, error: "Moderation action not found" };
    }

    // Check if action is within appeal window
    const appealWindowMs = this.config.appealWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() - action.createdAt.getTime() > appealWindowMs) {
      return { success: false, error: "Appeal window has expired" };
    }

    // Check for existing pending appeals
    const existingAppeals = Array.from(this.appeals.values()).filter(
      (a) =>
        a.actionId === params.actionId &&
        a.userId === params.userId &&
        a.status === "pending",
    );

    if (existingAppeals.length > 0) {
      return {
        success: false,
        error: "An appeal is already pending for this action",
      };
    }

    // Check max appeals
    const totalAppeals = Array.from(this.appeals.values()).filter(
      (a) => a.actionId === params.actionId && a.userId === params.userId,
    ).length;

    if (totalAppeals >= this.config.maxAppealsPerAction) {
      return {
        success: false,
        error: "Maximum appeals reached for this action",
      };
    }

    const now = new Date();
    const evidence: ReportEvidence[] = (params.evidence || []).map((e) => ({
      ...e,
      id: generateId(),
      addedAt: now,
    }));

    const appeal: Appeal = {
      id: generateId(),
      userId: params.userId,
      userName: params.userName,
      actionId: params.actionId,
      penaltyId: params.penaltyId,
      reason: params.reason.trim(),
      evidence,
      status: "pending",
      priority: "medium",
      reviewNotes: [],
      createdAt: now,
      updatedAt: now,
    };

    this.appeals.set(appeal.id, appeal);

    logger.info(`Appeal submitted: ${appeal.id}`, {
      actionId: params.actionId,
    });

    return { success: true, appeal };
  }

  /**
   * Gets appeal by ID
   */
  getAppeal(appealId: string): Appeal | undefined {
    return this.appeals.get(appealId);
  }

  /**
   * Gets appeals with optional filters
   */
  getAppeals(filters?: {
    status?: AppealStatus | AppealStatus[];
    userId?: string;
    assignedTo?: string;
  }): Appeal[] {
    let appeals = Array.from(this.appeals.values());

    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      appeals = appeals.filter((a) => statuses.includes(a.status));
    }

    if (filters?.userId) {
      appeals = appeals.filter((a) => a.userId === filters.userId);
    }

    if (filters?.assignedTo) {
      appeals = appeals.filter((a) => a.assignedTo === filters.assignedTo);
    }

    return appeals.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * Gets pending appeals queue
   */
  getAppealQueue(): Appeal[] {
    return this.getAppeals({ status: ["pending", "under_review"] });
  }

  /**
   * Assigns an appeal to a moderator
   */
  assignAppeal(
    appealId: string,
    moderatorId: string,
    moderatorName?: string,
  ): { success: boolean; appeal?: Appeal; error?: string } {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    appeal.assignedTo = moderatorId;
    appeal.assignedToName = moderatorName;
    appeal.status = "under_review";
    appeal.updatedAt = new Date();

    return { success: true, appeal };
  }

  /**
   * Resolves an appeal
   */
  resolveAppeal(
    appealId: string,
    resolvedBy: string,
    decision: "approve" | "reject" | "partially_approve",
    resolution: string,
    outcome?: AppealOutcome,
  ): { success: boolean; appeal?: Appeal; error?: string } {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    if (appeal.status !== "under_review") {
      return {
        success: false,
        error: "Appeal must be under review to be resolved",
      };
    }

    const statusMap: Record<typeof decision, AppealStatus> = {
      approve: "approved",
      reject: "rejected",
      partially_approve: "partially_approved",
    };

    const now = new Date();
    appeal.status = statusMap[decision];
    appeal.resolution = resolution;
    appeal.outcome = outcome;
    appeal.resolvedAt = now;
    appeal.resolvedBy = resolvedBy;
    appeal.reviewedAt = now;
    appeal.reviewedBy = resolvedBy;
    appeal.updatedAt = now;

    // If approved, handle reinstatement
    if (decision === "approve" && appeal.penaltyId) {
      const penalty = this.penalties.get(appeal.penaltyId);
      if (penalty && penalty.isActive) {
        penalty.isActive = false;
        penalty.liftedBy = resolvedBy;
        penalty.liftedAt = now;
        penalty.liftReason = `Appeal approved: ${resolution}`;
      }
    }

    logger.info(`Appeal resolved: ${appealId}`, { decision, resolvedBy });

    return { success: true, appeal };
  }

  /**
   * Withdraws an appeal
   */
  withdrawAppeal(
    appealId: string,
    userId: string,
  ): { success: boolean; error?: string } {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found" };
    }

    if (appeal.userId !== userId) {
      return {
        success: false,
        error: "Only the appeal submitter can withdraw it",
      };
    }

    if (!["pending", "under_review"].includes(appeal.status)) {
      return {
        success: false,
        error: "Appeal cannot be withdrawn in current status",
      };
    }

    appeal.status = "withdrawn";
    appeal.updatedAt = new Date();

    return { success: true };
  }

  // ==========================================================================
  // Auto-Moderation Rules
  // ==========================================================================

  /**
   * Adds an auto-mod rule
   */
  addAutoModRule(rule: AutoModRule): void {
    this.autoModRules.set(rule.id, rule);
  }

  /**
   * Removes an auto-mod rule
   */
  removeAutoModRule(ruleId: string): boolean {
    return this.autoModRules.delete(ruleId);
  }

  /**
   * Gets all auto-mod rules
   */
  getAutoModRules(workspaceId?: string): AutoModRule[] {
    let rules = Array.from(this.autoModRules.values());
    if (workspaceId) {
      rules = rules.filter((r) => r.workspaceId === workspaceId);
    }
    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enables/disables an auto-mod rule
   */
  setAutoModRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.autoModRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Moderation Logs
  // ==========================================================================

  /**
   * Gets moderation log entries
   */
  getModerationLogs(filters?: {
    actionType?: ModerationActionType;
    moderatorId?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ModerationLogEntry[] {
    let logs = [...this.moderationLogs];

    if (filters?.actionType) {
      logs = logs.filter((l) => l.action.actionType === filters.actionType);
    }

    if (filters?.moderatorId) {
      logs = logs.filter((l) => l.actor.id === filters.moderatorId);
    }

    if (filters?.targetId) {
      logs = logs.filter((l) => l.target.id === filters.targetId);
    }

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Gets action history for a user
   */
  getUserActionHistory(userId: string): ModerationAction[] {
    return Array.from(this.actions.values())
      .filter((a) => a.targetUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Gets active penalties for a user
   */
  getUserActivePenalties(userId: string, workspaceId?: string): UserPenalty[] {
    return Array.from(this.penalties.values()).filter(
      (p) =>
        p.userId === userId &&
        p.isActive &&
        (p.expiresAt === undefined || p.expiresAt.getTime() > Date.now()) &&
        (workspaceId === undefined || p.workspaceId === workspaceId),
    );
  }

  /**
   * Checks if user is muted
   */
  isUserMuted(
    userId: string,
    workspaceId: string,
    channelId?: string,
  ): boolean {
    const activePenalties = this.getUserActivePenalties(userId, workspaceId);
    return activePenalties.some(
      (p) =>
        p.penaltyType === "mute" &&
        (channelId === undefined ||
          p.channelId === channelId ||
          p.channelId === undefined),
    );
  }

  /**
   * Checks if user is banned
   */
  isUserBanned(
    userId: string,
    workspaceId: string,
    channelId?: string,
  ): boolean {
    const activePenalties = this.getUserActivePenalties(userId, workspaceId);
    return activePenalties.some(
      (p) =>
        p.penaltyType === "ban" &&
        (channelId === undefined ||
          p.channelId === channelId ||
          p.channelId === undefined),
    );
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Gets moderation statistics
   */
  getStats(): {
    reports: {
      total: number;
      pending: number;
      byCategory: Record<string, number>;
    };
    actions: { total: number; byType: Record<string, number> };
    appeals: { total: number; pending: number; approvalRate: number };
    penalties: { active: number; total: number };
  } {
    const reports = Array.from(this.reports.values());
    const actions = Array.from(this.actions.values());
    const appeals = Array.from(this.appeals.values());
    const penalties = Array.from(this.penalties.values());

    const reportsByCategory: Record<string, number> = {};
    reports.forEach((r) => {
      reportsByCategory[r.category] = (reportsByCategory[r.category] || 0) + 1;
    });

    const actionsByType: Record<string, number> = {};
    actions.forEach((a) => {
      actionsByType[a.actionType] = (actionsByType[a.actionType] || 0) + 1;
    });

    const approvedAppeals = appeals.filter(
      (a) => a.status === "approved" || a.status === "partially_approved",
    ).length;
    const resolvedAppeals = appeals.filter(
      (a) =>
        a.status !== "pending" &&
        a.status !== "under_review" &&
        a.status !== "withdrawn",
    ).length;

    return {
      reports: {
        total: reports.length,
        pending: reports.filter((r) =>
          ["pending", "under_review", "escalated"].includes(r.status),
        ).length,
        byCategory: reportsByCategory,
      },
      actions: {
        total: actions.length,
        byType: actionsByType,
      },
      appeals: {
        total: appeals.length,
        pending: appeals.filter((a) =>
          ["pending", "under_review"].includes(a.status),
        ).length,
        approvalRate:
          resolvedAppeals > 0 ? approvedAppeals / resolvedAppeals : 0,
      },
      penalties: {
        active: penalties.filter((p) => p.isActive).length,
        total: penalties.length,
      },
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private createAction(params: {
    actionType: ModerationActionType;
    targetUserId: string;
    moderatorId: string;
    reason: string;
    moderatorName?: string;
    channelId?: string;
    workspaceId?: string;
    duration?: number;
    expiresAt?: Date;
    isAutomated: boolean;
    automationRuleId?: string;
    relatedReportId?: string;
    affectedMessageIds?: string[];
    metadata?: Record<string, unknown>;
  }): ModerationAction {
    const action: ModerationAction = {
      id: generateId(),
      actionType: params.actionType,
      targetUserId: params.targetUserId,
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      reason: params.reason,
      channelId: params.channelId,
      workspaceId: params.workspaceId,
      duration: params.duration,
      expiresAt: params.expiresAt,
      isAutomated: params.isAutomated,
      automationRuleId: params.automationRuleId,
      relatedReportId: params.relatedReportId,
      affectedMessageIds: params.affectedMessageIds,
      metadata: params.metadata,
      reversible: !["delete_message", "purge", "kick"].includes(
        params.actionType,
      ),
      createdAt: new Date(),
    };

    this.actions.set(action.id, action);
    this.logAction(params);

    return action;
  }

  private logAction(params: {
    actionType: ModerationActionType;
    targetUserId: string;
    moderatorId: string;
    reason: string;
    moderatorName?: string;
    channelId?: string;
    workspaceId?: string;
    isAutomated: boolean;
    relatedReportId?: string;
    affectedMessageIds?: string[];
    metadata?: Record<string, unknown>;
  }): void {
    const logEntry: ModerationLogEntry = {
      id: generateId(),
      action: {
        id: generateId(),
        actionType: params.actionType,
        targetUserId: params.targetUserId,
        moderatorId: params.moderatorId,
        moderatorName: params.moderatorName,
        reason: params.reason,
        channelId: params.channelId,
        workspaceId: params.workspaceId,
        isAutomated: params.isAutomated,
        relatedReportId: params.relatedReportId,
        affectedMessageIds: params.affectedMessageIds,
        metadata: params.metadata,
        reversible: true,
        createdAt: new Date(),
      },
      actor: {
        id: params.moderatorId,
        name: params.moderatorName,
        role: params.isAutomated ? "system" : "moderator",
      },
      target: {
        id: params.targetUserId,
        type: "user",
      },
      reason: params.reason,
      outcome: "success",
      timestamp: new Date(),
      metadata: params.metadata,
    };

    this.moderationLogs.push(logEntry);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Expires old penalties and timeouts
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean up timeouts
    for (const [id, timeout] of this.timeouts) {
      if (timeout.isActive && timeout.expiresAt.getTime() < now) {
        timeout.isActive = false;
        cleanedCount++;
      }
    }

    // Clean up penalties
    for (const [id, penalty] of this.penalties) {
      if (
        penalty.isActive &&
        penalty.expiresAt &&
        penalty.expiresAt.getTime() < now
      ) {
        penalty.isActive = false;
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Clears all data
   */
  clearAll(): void {
    this.reports.clear();
    this.actions.clear();
    this.penalties.clear();
    this.appeals.clear();
    this.autoModRules.clear();
    this.slowmodeConfigs.clear();
    this.timeouts.clear();
    this.moderationLogs = [];
    this.userWarningCounts.clear();
    this.userMuteCounts.clear();
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let engineInstance: ModerationEngine | null = null;

export function getModerationEngine(
  config?: Partial<ModerationEngineConfig>,
): ModerationEngine {
  if (!engineInstance || config) {
    engineInstance = new ModerationEngine(config);
  }
  return engineInstance;
}

export function createModerationEngine(
  config?: Partial<ModerationEngineConfig>,
): ModerationEngine {
  return new ModerationEngine(config);
}
