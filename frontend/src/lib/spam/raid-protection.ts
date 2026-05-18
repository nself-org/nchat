/**
 * Raid Protection Service
 *
 * Detects and mitigates coordinated attacks including:
 * - Mass join detection
 * - Invite link abuse
 * - Coordinated spam attacks
 * - Account creation waves
 * - Suspicious join patterns
 *
 * Provides:
 * - Real-time raid detection
 * - Automated lockdown procedures
 * - Invite link management
 * - Join velocity tracking
 * - Attacker profiling
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type RaidType =
  | "mass_join"
  | "invite_abuse"
  | "spam_wave"
  | "account_wave"
  | "coordinated_attack"
  | "mention_raid"
  | "dm_spam";

export type RaidSeverity = "low" | "medium" | "high" | "critical";
export type RaidStatus =
  | "detected"
  | "active"
  | "mitigated"
  | "resolved"
  | "escalated";

export type LockdownLevel = "none" | "partial" | "full" | "emergency";

export interface RaidEvent {
  id: string;
  type: RaidType;
  severity: RaidSeverity;
  status: RaidStatus;
  workspaceId: string;
  channelId?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  participantCount: number;
  participants: string[];
  inviteLinkUsed?: string;
  metrics: RaidMetrics;
  mitigations: RaidMitigation[];
  notes: string[];
}

export interface RaidMetrics {
  joinsPerMinute: number;
  accountsCreatedRecently: number;
  similarUsernames: number;
  newAccountPercentage: number;
  singleSourcePercentage: number; // % from same IP/invite
  averageAccountAge: number; // In days
}

export interface RaidMitigation {
  type:
    | "lockdown"
    | "ban_wave"
    | "invite_revoke"
    | "slowmode"
    | "verification_required"
    | "dm_restriction"
    | "manual_review";
  appliedAt: Date;
  appliedBy: string;
  details: string;
  undoneAt?: Date;
}

export interface JoinEvent {
  userId: string;
  username: string;
  workspaceId: string;
  channelId?: string;
  inviteCode?: string;
  sourceIp?: string;
  accountCreatedAt: Date;
  joinedAt: Date;
  userAgent?: string;
}

export interface LockdownState {
  level: LockdownLevel;
  workspaceId: string;
  channelId?: string;
  activatedAt: Date;
  activatedBy: string;
  reason: string;
  autoLiftAt?: Date;
  restrictions: LockdownRestrictions;
}

export interface LockdownRestrictions {
  blockNewJoins: boolean;
  blockNewMessages: boolean;
  requireVerification: boolean;
  slowmodeSeconds: number;
  blockInviteCreation: boolean;
  blockDMs: boolean;
  allowedRoles: string[]; // Roles exempt from restrictions
}

export interface InviteTracker {
  code: string;
  workspaceId: string;
  channelId?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  uses: number;
  usedBy: string[];
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface RaidProtectionConfig {
  // Join velocity thresholds
  joinVelocityThreshold: number; // Joins per minute to trigger alert
  joinVelocityWindow: number; // Window in milliseconds
  joinVelocityCritical: number; // Joins per minute for critical alert

  // Account age thresholds
  newAccountThreshold: number; // Account age in hours to be considered "new"
  newAccountPercentageThreshold: number; // % of new accounts to trigger alert

  // Pattern detection
  similarUsernameThreshold: number; // Number of similar usernames to trigger
  singleSourceThreshold: number; // % from same source to trigger

  // Auto-mitigation
  autoLockdownEnabled: boolean;
  autoLockdownThreshold: RaidSeverity; // Severity to trigger auto-lockdown
  autoLockdownDuration: number; // Duration in milliseconds
  autoBanEnabled: boolean;
  autoBanThreshold: number; // Join velocity to trigger auto-ban

  // Cooldown
  alertCooldown: number; // Minimum time between alerts

  // Exemptions
  exemptRoles: string[];
  trustedInviteCodes: string[];
}

export const DEFAULT_RAID_CONFIG: RaidProtectionConfig = {
  joinVelocityThreshold: 10, // 10 joins/min
  joinVelocityWindow: 60000, // 1 minute
  joinVelocityCritical: 30, // 30 joins/min

  newAccountThreshold: 24, // 24 hours
  newAccountPercentageThreshold: 70, // 70% new accounts

  similarUsernameThreshold: 5,
  singleSourceThreshold: 80, // 80% from same source

  autoLockdownEnabled: true,
  autoLockdownThreshold: "high",
  autoLockdownDuration: 30 * 60 * 1000, // 30 minutes
  autoBanEnabled: false,
  autoBanThreshold: 50, // 50 joins/min

  alertCooldown: 5 * 60 * 1000, // 5 minutes

  exemptRoles: ["admin", "moderator", "trusted"],
  trustedInviteCodes: [],
};

// Lockdown presets
export const LOCKDOWN_PRESETS: Record<LockdownLevel, LockdownRestrictions> = {
  none: {
    blockNewJoins: false,
    blockNewMessages: false,
    requireVerification: false,
    slowmodeSeconds: 0,
    blockInviteCreation: false,
    blockDMs: false,
    allowedRoles: [],
  },
  partial: {
    blockNewJoins: false,
    blockNewMessages: false,
    requireVerification: true,
    slowmodeSeconds: 30,
    blockInviteCreation: true,
    blockDMs: false,
    allowedRoles: ["admin", "moderator", "trusted"],
  },
  full: {
    blockNewJoins: true,
    blockNewMessages: true,
    requireVerification: true,
    slowmodeSeconds: 60,
    blockInviteCreation: true,
    blockDMs: true,
    allowedRoles: ["admin", "moderator"],
  },
  emergency: {
    blockNewJoins: true,
    blockNewMessages: true,
    requireVerification: true,
    slowmodeSeconds: 300,
    blockInviteCreation: true,
    blockDMs: true,
    allowedRoles: ["admin"],
  },
};

// ============================================================================
// Raid Protection Class
// ============================================================================

export class RaidProtection {
  private config: RaidProtectionConfig;
  private joinHistory: Map<string, JoinEvent[]> = new Map(); // workspaceId -> joins
  private raidEvents: Map<string, RaidEvent> = new Map();
  private lockdowns: Map<string, LockdownState> = new Map();
  private invites: Map<string, InviteTracker> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<RaidProtectionConfig> = {}) {
    this.config = { ...DEFAULT_RAID_CONFIG, ...config };
    this.startCleanup();
  }

  // ==========================================================================
  // Join Tracking
  // ==========================================================================

  /**
   * Records a join event and checks for raid patterns
   */
  recordJoin(event: JoinEvent): {
    allowed: boolean;
    raidDetected: boolean;
    raid?: RaidEvent;
    reason?: string;
  } {
    const { workspaceId, channelId } = event;

    // Check if lockdown is active
    const lockdown = this.getLockdown(workspaceId, channelId);
    if (lockdown && lockdown.restrictions.blockNewJoins) {
      return {
        allowed: false,
        raidDetected: false,
        reason: "Server is currently in lockdown mode",
      };
    }

    // Add to history
    const key = channelId ? `${workspaceId}:${channelId}` : workspaceId;
    const history = this.joinHistory.get(key) || [];
    history.push(event);
    this.joinHistory.set(key, history);

    // Clean old entries
    this.cleanJoinHistory(key);

    // Track invite usage
    if (event.inviteCode) {
      this.recordInviteUse(event.inviteCode, event.userId);
    }

    // Analyze for raid patterns
    const analysis = this.analyzeJoinPatterns(workspaceId, channelId);

    if (analysis.isRaid) {
      const raid = this.createOrUpdateRaid(
        workspaceId,
        channelId,
        analysis,
        event,
      );

      // Apply auto-mitigations if configured
      if (this.shouldAutoMitigate(raid)) {
        this.applyAutoMitigation(raid);
      }

      return {
        allowed: !lockdown?.restrictions.blockNewJoins,
        raidDetected: true,
        raid,
      };
    }

    return { allowed: true, raidDetected: false };
  }

  /**
   * Gets join velocity for a workspace/channel
   */
  getJoinVelocity(
    workspaceId: string,
    channelId?: string,
    windowMs?: number,
  ): number {
    const window = windowMs || this.config.joinVelocityWindow;
    const key = channelId ? `${workspaceId}:${channelId}` : workspaceId;
    const history = this.joinHistory.get(key) || [];

    const cutoff = Date.now() - window;
    const recentJoins = history.filter((j) => j.joinedAt.getTime() > cutoff);

    return (recentJoins.length / window) * 60000; // Per minute
  }

  /**
   * Gets recent joins
   */
  getRecentJoins(
    workspaceId: string,
    channelId?: string,
    limit: number = 100,
  ): JoinEvent[] {
    const key = channelId ? `${workspaceId}:${channelId}` : workspaceId;
    const history = this.joinHistory.get(key) || [];
    return history.slice(-limit);
  }

  // ==========================================================================
  // Raid Detection
  // ==========================================================================

  /**
   * Analyzes join patterns for raid detection
   */
  analyzeJoinPatterns(
    workspaceId: string,
    channelId?: string,
  ): {
    isRaid: boolean;
    severity: RaidSeverity;
    type: RaidType;
    metrics: RaidMetrics;
    reasons: string[];
  } {
    const key = channelId ? `${workspaceId}:${channelId}` : workspaceId;
    const history = this.joinHistory.get(key) || [];

    const windowCutoff = Date.now() - this.config.joinVelocityWindow;
    const recentJoins = history.filter(
      (j) => j.joinedAt.getTime() > windowCutoff,
    );

    const metrics = this.calculateMetrics(recentJoins);
    const reasons: string[] = [];
    let severity: RaidSeverity = "low";
    let type: RaidType = "mass_join";

    // Check join velocity
    if (metrics.joinsPerMinute >= this.config.joinVelocityCritical) {
      severity = "critical";
      reasons.push(
        `Critical join velocity: ${metrics.joinsPerMinute.toFixed(1)}/min`,
      );
    } else if (metrics.joinsPerMinute >= this.config.joinVelocityThreshold) {
      severity = "high";
      reasons.push(
        `High join velocity: ${metrics.joinsPerMinute.toFixed(1)}/min`,
      );
    }

    // Check new account percentage
    if (
      metrics.newAccountPercentage >= this.config.newAccountPercentageThreshold
    ) {
      severity = this.upgradeSeverity(severity, "medium");
      type = "account_wave";
      reasons.push(`${metrics.newAccountPercentage.toFixed(0)}% new accounts`);
    }

    // Check single source
    if (metrics.singleSourcePercentage >= this.config.singleSourceThreshold) {
      severity = this.upgradeSeverity(severity, "medium");
      type = "invite_abuse";
      reasons.push(
        `${metrics.singleSourcePercentage.toFixed(0)}% from single source`,
      );
    }

    // Check similar usernames
    if (metrics.similarUsernames >= this.config.similarUsernameThreshold) {
      severity = this.upgradeSeverity(severity, "medium");
      type = "coordinated_attack";
      reasons.push(`${metrics.similarUsernames} similar usernames detected`);
    }

    const isRaid = reasons.length > 0;

    return { isRaid, severity, type, metrics, reasons };
  }

  /**
   * Gets active raids
   */
  getActiveRaids(workspaceId?: string): RaidEvent[] {
    const raids: RaidEvent[] = [];
    for (const raid of this.raidEvents.values()) {
      if (workspaceId && raid.workspaceId !== workspaceId) continue;
      if (raid.status === "detected" || raid.status === "active") {
        raids.push(raid);
      }
    }
    return raids.sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
  }

  /**
   * Gets raid by ID
   */
  getRaid(raidId: string): RaidEvent | undefined {
    return this.raidEvents.get(raidId);
  }

  /**
   * Updates raid status
   */
  updateRaidStatus(
    raidId: string,
    status: RaidStatus,
    note?: string,
  ): RaidEvent | null {
    const raid = this.raidEvents.get(raidId);
    if (!raid) return null;

    raid.status = status;
    if (status === "resolved" || status === "mitigated") {
      raid.resolvedAt = new Date();
    }
    if (note) {
      raid.notes.push(`[${new Date().toISOString()}] ${note}`);
    }

    return raid;
  }

  // ==========================================================================
  // Lockdown Management
  // ==========================================================================

  /**
   * Activates lockdown
   */
  activateLockdown(
    level: LockdownLevel,
    workspaceId: string,
    activatedBy: string,
    options: {
      channelId?: string;
      reason?: string;
      duration?: number;
      customRestrictions?: Partial<LockdownRestrictions>;
    } = {},
  ): LockdownState {
    const key = options.channelId
      ? `${workspaceId}:${options.channelId}`
      : workspaceId;

    const restrictions: LockdownRestrictions = {
      ...LOCKDOWN_PRESETS[level],
      ...options.customRestrictions,
    };

    const lockdown: LockdownState = {
      level,
      workspaceId,
      channelId: options.channelId,
      activatedAt: new Date(),
      activatedBy,
      reason: options.reason || `Lockdown activated: ${level}`,
      restrictions,
    };

    if (options.duration) {
      lockdown.autoLiftAt = new Date(Date.now() + options.duration);
    }

    this.lockdowns.set(key, lockdown);

    logger.info(`Lockdown activated: ${level}`, {
      workspaceId,
      channelId: options.channelId,
      activatedBy,
    });

    return lockdown;
  }

  /**
   * Deactivates lockdown
   */
  deactivateLockdown(
    workspaceId: string,
    channelId?: string,
    deactivatedBy?: string,
  ): boolean {
    const key = channelId ? `${workspaceId}:${channelId}` : workspaceId;
    const existed = this.lockdowns.has(key);

    if (existed) {
      this.lockdowns.delete(key);
      logger.info("Lockdown deactivated", {
        workspaceId,
        channelId,
        deactivatedBy,
      });
    }

    return existed;
  }

  /**
   * Gets lockdown state
   */
  getLockdown(workspaceId: string, channelId?: string): LockdownState | null {
    // Check channel-specific lockdown first
    if (channelId) {
      const channelKey = `${workspaceId}:${channelId}`;
      const channelLockdown = this.lockdowns.get(channelKey);
      if (channelLockdown) return channelLockdown;
    }

    // Check workspace lockdown
    return this.lockdowns.get(workspaceId) || null;
  }

  /**
   * Checks if lockdown is active
   */
  isLockedDown(workspaceId: string, channelId?: string): boolean {
    const lockdown = this.getLockdown(workspaceId, channelId);
    return lockdown !== null && lockdown.level !== "none";
  }

  /**
   * Checks if action is allowed during lockdown
   */
  isActionAllowed(
    action: "join" | "message" | "invite" | "dm",
    workspaceId: string,
    userRole?: string,
    channelId?: string,
  ): { allowed: boolean; reason?: string } {
    const lockdown = this.getLockdown(workspaceId, channelId);

    if (!lockdown || lockdown.level === "none") {
      return { allowed: true };
    }

    // Check if role is exempt
    if (userRole && lockdown.restrictions.allowedRoles.includes(userRole)) {
      return { allowed: true };
    }

    switch (action) {
      case "join":
        if (lockdown.restrictions.blockNewJoins) {
          return {
            allowed: false,
            reason: "New joins are blocked during lockdown",
          };
        }
        break;
      case "message":
        if (lockdown.restrictions.blockNewMessages) {
          return {
            allowed: false,
            reason: "Messages are restricted during lockdown",
          };
        }
        break;
      case "invite":
        if (lockdown.restrictions.blockInviteCreation) {
          return {
            allowed: false,
            reason: "Invite creation is blocked during lockdown",
          };
        }
        break;
      case "dm":
        if (lockdown.restrictions.blockDMs) {
          return {
            allowed: false,
            reason: "DMs are restricted during lockdown",
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Gets active lockdowns
   */
  getActiveLockdowns(): LockdownState[] {
    return Array.from(this.lockdowns.values());
  }

  // ==========================================================================
  // Invite Management
  // ==========================================================================

  /**
   * Registers an invite
   */
  registerInvite(
    invite: Omit<InviteTracker, "uses" | "usedBy" | "revoked">,
  ): void {
    const tracker: InviteTracker = {
      ...invite,
      uses: 0,
      usedBy: [],
      revoked: false,
    };
    this.invites.set(invite.code, tracker);
  }

  /**
   * Records invite use
   */
  recordInviteUse(code: string, userId: string): InviteTracker | null {
    const invite = this.invites.get(code);
    if (!invite) return null;

    invite.uses++;
    invite.usedBy.push(userId);

    return invite;
  }

  /**
   * Revokes an invite
   */
  revokeInvite(code: string, reason: string): boolean {
    const invite = this.invites.get(code);
    if (!invite) return false;

    invite.revoked = true;
    invite.revokedAt = new Date();
    invite.revokedReason = reason;

    logger.info(`Invite revoked: ${code}`, { reason });

    return true;
  }

  /**
   * Revokes all invites for a workspace/channel
   */
  revokeAllInvites(
    workspaceId: string,
    channelId?: string,
    reason: string = "Bulk revocation",
  ): number {
    let revoked = 0;

    for (const invite of this.invites.values()) {
      if (invite.workspaceId !== workspaceId) continue;
      if (channelId && invite.channelId !== channelId) continue;
      if (invite.revoked) continue;

      invite.revoked = true;
      invite.revokedAt = new Date();
      invite.revokedReason = reason;
      revoked++;
    }

    return revoked;
  }

  /**
   * Gets invite tracker
   */
  getInvite(code: string): InviteTracker | undefined {
    return this.invites.get(code);
  }

  /**
   * Gets active invites
   */
  getActiveInvites(workspaceId: string, channelId?: string): InviteTracker[] {
    const invites: InviteTracker[] = [];

    for (const invite of this.invites.values()) {
      if (invite.workspaceId !== workspaceId) continue;
      if (channelId && invite.channelId !== channelId) continue;
      if (invite.revoked) continue;
      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) continue;
      if (invite.maxUses && invite.uses >= invite.maxUses) continue;

      invites.push(invite);
    }

    return invites;
  }

  /**
   * Gets suspicious invites (high usage)
   */
  getSuspiciousInvites(threshold: number = 20): InviteTracker[] {
    return Array.from(this.invites.values())
      .filter((i) => !i.revoked && i.uses >= threshold)
      .sort((a, b) => b.uses - a.uses);
  }

  // ==========================================================================
  // Mitigation Actions
  // ==========================================================================

  /**
   * Applies mitigation to a raid
   */
  applyMitigation(
    raidId: string,
    mitigation: Omit<RaidMitigation, "appliedAt">,
  ): RaidEvent | null {
    const raid = this.raidEvents.get(raidId);
    if (!raid) return null;

    raid.mitigations.push({
      ...mitigation,
      appliedAt: new Date(),
    });

    raid.status = "active";

    logger.info(`Mitigation applied to raid ${raidId}`, {
      type: mitigation.type,
      details: mitigation.details,
    });

    return raid;
  }

  /**
   * Bans raid participants
   */
  banRaidParticipants(
    raidId: string,
    moderatorId: string,
  ): {
    banned: string[];
    failed: string[];
  } {
    const raid = this.raidEvents.get(raidId);
    if (!raid) return { banned: [], failed: [] };

    const banned: string[] = [];
    const failed: string[] = [];

    // In a real implementation, this would call the moderation engine
    // For now, we just track the intent
    for (const userId of raid.participants) {
      // Would call: moderationEngine.banUser(...)
      banned.push(userId);
    }

    this.applyMitigation(raidId, {
      type: "ban_wave",
      appliedBy: moderatorId,
      details: `Banned ${banned.length} participants`,
    });

    return { banned, failed };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<RaidProtectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets configuration
   */
  getConfig(): RaidProtectionConfig {
    return { ...this.config };
  }

  /**
   * Adds trusted invite code
   */
  addTrustedInvite(code: string): void {
    if (!this.config.trustedInviteCodes.includes(code)) {
      this.config.trustedInviteCodes.push(code);
    }
  }

  /**
   * Removes trusted invite code
   */
  removeTrustedInvite(code: string): boolean {
    const index = this.config.trustedInviteCodes.indexOf(code);
    if (index > -1) {
      this.config.trustedInviteCodes.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Gets raid statistics
   */
  getStats(): {
    totalRaids: number;
    activeRaids: number;
    mitigatedRaids: number;
    activeLockdowns: number;
    totalInvites: number;
    revokedInvites: number;
    bySeverity: Record<RaidSeverity, number>;
    byType: Record<RaidType, number>;
  } {
    const bySeverity: Record<RaidSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<RaidType, number> = {
      mass_join: 0,
      invite_abuse: 0,
      spam_wave: 0,
      account_wave: 0,
      coordinated_attack: 0,
      mention_raid: 0,
      dm_spam: 0,
    };

    let activeRaids = 0;
    let mitigatedRaids = 0;

    for (const raid of this.raidEvents.values()) {
      bySeverity[raid.severity]++;
      byType[raid.type]++;

      if (raid.status === "detected" || raid.status === "active") {
        activeRaids++;
      }
      if (raid.status === "mitigated" || raid.status === "resolved") {
        mitigatedRaids++;
      }
    }

    let revokedInvites = 0;
    for (const invite of this.invites.values()) {
      if (invite.revoked) revokedInvites++;
    }

    return {
      totalRaids: this.raidEvents.size,
      activeRaids,
      mitigatedRaids,
      activeLockdowns: this.lockdowns.size,
      totalInvites: this.invites.size,
      revokedInvites,
      bySeverity,
      byType,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private calculateMetrics(joins: JoinEvent[]): RaidMetrics {
    const now = Date.now();
    const windowMs = this.config.joinVelocityWindow;

    // Join velocity
    const joinsPerMinute = (joins.length / windowMs) * 60000;

    // Account age analysis
    const newAccountThresholdMs =
      this.config.newAccountThreshold * 60 * 60 * 1000;
    let newAccounts = 0;
    let totalAge = 0;

    for (const join of joins) {
      const accountAge = now - join.accountCreatedAt.getTime();
      totalAge += accountAge / (24 * 60 * 60 * 1000); // In days

      if (accountAge < newAccountThresholdMs) {
        newAccounts++;
      }
    }

    // Source analysis
    const sourceCounts = new Map<string, number>();
    for (const join of joins) {
      const source = join.inviteCode || join.sourceIp || "unknown";
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    }

    let maxSourceCount = 0;
    for (const count of sourceCounts.values()) {
      maxSourceCount = Math.max(maxSourceCount, count);
    }

    // Username similarity
    const similarUsernames = this.countSimilarUsernames(
      joins.map((j) => j.username),
    );

    return {
      joinsPerMinute,
      accountsCreatedRecently: newAccounts,
      similarUsernames,
      newAccountPercentage:
        joins.length > 0 ? (newAccounts / joins.length) * 100 : 0,
      singleSourcePercentage:
        joins.length > 0 ? (maxSourceCount / joins.length) * 100 : 0,
      averageAccountAge: joins.length > 0 ? totalAge / joins.length : 0,
    };
  }

  private countSimilarUsernames(usernames: string[]): number {
    let similarCount = 0;
    const patterns = new Map<string, number>();

    for (const username of usernames) {
      // Normalize: remove numbers, lowercase
      const normalized = username.toLowerCase().replace(/[0-9]/g, "");
      const count = (patterns.get(normalized) || 0) + 1;
      patterns.set(normalized, count);

      if (count >= 3) {
        similarCount++;
      }
    }

    return similarCount;
  }

  private createOrUpdateRaid(
    workspaceId: string,
    channelId: string | undefined,
    analysis: {
      severity: RaidSeverity;
      type: RaidType;
      metrics: RaidMetrics;
      reasons: string[];
    },
    event: JoinEvent,
  ): RaidEvent {
    // Check for existing active raid
    const existingRaid = this.findActiveRaid(workspaceId, channelId);

    if (existingRaid) {
      // Update existing raid
      if (!existingRaid.participants.includes(event.userId)) {
        existingRaid.participants.push(event.userId);
        existingRaid.participantCount++;
      }
      existingRaid.metrics = analysis.metrics;
      existingRaid.severity = this.upgradeSeverity(
        existingRaid.severity,
        analysis.severity,
      );

      return existingRaid;
    }

    // Check alert cooldown
    const lastAlert = this.lastAlertTime.get(workspaceId) || 0;
    if (Date.now() - lastAlert < this.config.alertCooldown) {
      // Still in cooldown, return mock raid without creating new alert
      return {
        id: "cooldown",
        type: analysis.type,
        severity: analysis.severity,
        status: "detected",
        workspaceId,
        channelId,
        detectedAt: new Date(),
        participantCount: 1,
        participants: [event.userId],
        metrics: analysis.metrics,
        mitigations: [],
        notes: analysis.reasons,
      };
    }

    // Create new raid
    const raid: RaidEvent = {
      id: this.generateId(),
      type: analysis.type,
      severity: analysis.severity,
      status: "detected",
      workspaceId,
      channelId,
      detectedAt: new Date(),
      participantCount: 1,
      participants: [event.userId],
      inviteLinkUsed: event.inviteCode,
      metrics: analysis.metrics,
      mitigations: [],
      notes: analysis.reasons,
    };

    this.raidEvents.set(raid.id, raid);
    this.lastAlertTime.set(workspaceId, Date.now());

    logger.warn(`Raid detected: ${raid.type}`, {
      raidId: raid.id,
      severity: raid.severity,
      workspaceId,
    });

    return raid;
  }

  private findActiveRaid(
    workspaceId: string,
    channelId?: string,
  ): RaidEvent | undefined {
    for (const raid of this.raidEvents.values()) {
      if (raid.workspaceId !== workspaceId) continue;
      if (channelId && raid.channelId !== channelId) continue;
      if (raid.status === "detected" || raid.status === "active") {
        return raid;
      }
    }
    return undefined;
  }

  private shouldAutoMitigate(raid: RaidEvent): boolean {
    if (!this.config.autoLockdownEnabled) return false;

    const severityOrder: RaidSeverity[] = ["low", "medium", "high", "critical"];
    const thresholdIndex = severityOrder.indexOf(
      this.config.autoLockdownThreshold,
    );
    const raidIndex = severityOrder.indexOf(raid.severity);

    return raidIndex >= thresholdIndex;
  }

  private applyAutoMitigation(raid: RaidEvent): void {
    const { workspaceId, channelId, severity } = raid;

    // Determine lockdown level based on severity
    let lockdownLevel: LockdownLevel = "partial";
    if (severity === "critical") {
      lockdownLevel = "emergency";
    } else if (severity === "high") {
      lockdownLevel = "full";
    }

    // Activate lockdown
    this.activateLockdown(lockdownLevel, workspaceId, "system", {
      channelId,
      reason: `Auto-lockdown due to ${raid.type} raid`,
      duration: this.config.autoLockdownDuration,
    });

    // Revoke invites if invite abuse
    if (raid.type === "invite_abuse" && raid.inviteLinkUsed) {
      this.revokeInvite(raid.inviteLinkUsed, "Suspected raid invite");
    }

    // Record mitigation
    this.applyMitigation(raid.id, {
      type: "lockdown",
      appliedBy: "system",
      details: `Auto-applied ${lockdownLevel} lockdown`,
    });
  }

  private upgradeSeverity(
    current: RaidSeverity,
    candidate: RaidSeverity,
  ): RaidSeverity {
    const order: RaidSeverity[] = ["low", "medium", "high", "critical"];
    const currentIndex = order.indexOf(current);
    const candidateIndex = order.indexOf(candidate);
    return candidateIndex > currentIndex ? candidate : current;
  }

  private cleanJoinHistory(key: string): void {
    const history = this.joinHistory.get(key);
    if (!history) return;

    const cutoff = Date.now() - this.config.joinVelocityWindow * 10; // Keep 10x window
    const filtered = history.filter((j) => j.joinedAt.getTime() > cutoff);

    if (filtered.length !== history.length) {
      this.joinHistory.set(key, filtered);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      5 * 60 * 1000, // Every 5 minutes
    );
  }

  private cleanup(): void {
    const now = Date.now();

    // Clean up expired lockdowns
    for (const [key, lockdown] of this.lockdowns) {
      if (lockdown.autoLiftAt && lockdown.autoLiftAt.getTime() < now) {
        this.lockdowns.delete(key);
        logger.info("Lockdown auto-lifted", {
          workspaceId: lockdown.workspaceId,
          channelId: lockdown.channelId,
        });
      }
    }

    // Clean up old join history
    for (const key of this.joinHistory.keys()) {
      this.cleanJoinHistory(key);
    }
  }

  private generateId(): string {
    return `raid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Stops cleanup timer
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.joinHistory.clear();
    this.raidEvents.clear();
    this.lockdowns.clear();
    this.invites.clear();
    this.lastAlertTime.clear();
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let protectionInstance: RaidProtection | null = null;

export function getRaidProtection(
  config?: Partial<RaidProtectionConfig>,
): RaidProtection {
  if (!protectionInstance || config) {
    protectionInstance = new RaidProtection(config);
  }
  return protectionInstance;
}

export function createRaidProtection(
  config?: Partial<RaidProtectionConfig>,
): RaidProtection {
  return new RaidProtection(config);
}
