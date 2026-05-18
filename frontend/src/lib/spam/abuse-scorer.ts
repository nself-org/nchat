/**
 * Abuse Scorer Service
 *
 * Calculates and manages user trust and abuse scores based on:
 * - Account age and verification status
 * - Historical behavior patterns
 * - Moderation actions received
 * - Community engagement metrics
 * - Spam detection history
 * - Rate limit violations
 *
 * Provides:
 * - Trust score calculation (0-100)
 * - Abuse score tracking
 * - Behavioral risk assessment
 * - Automated trust level management
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type TrustLevel =
  | "new"
  | "untrusted"
  | "limited"
  | "standard"
  | "trusted"
  | "verified";

export type BehaviorEvent =
  | "message_sent"
  | "spam_detected"
  | "spam_false_positive"
  | "rate_limited"
  | "report_filed"
  | "report_received"
  | "report_upheld"
  | "report_dismissed"
  | "warning_received"
  | "mute_received"
  | "ban_received"
  | "timeout_received"
  | "appeal_approved"
  | "appeal_rejected"
  | "helpful_flag"
  | "reaction_received"
  | "channel_joined"
  | "positive_interaction"
  | "negative_interaction"
  | "profile_completed"
  | "email_verified"
  | "phone_verified"
  | "two_factor_enabled";

export interface UserProfile {
  userId: string;
  username?: string;
  email?: string;
  createdAt: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  profileComplete: boolean;
  roles: string[];
  workspaceIds: string[];
}

export interface BehaviorRecord {
  id: string;
  userId: string;
  event: BehaviorEvent;
  impact: number; // Positive or negative impact on trust
  details?: Record<string, unknown>;
  timestamp: Date;
  channelId?: string;
  workspaceId?: string;
  expiresAt?: Date; // Some events decay over time
}

export interface UserTrustScore {
  userId: string;
  trustScore: number; // 0-100
  abuseScore: number; // 0-100
  trustLevel: TrustLevel;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: TrustFactors;
  lastUpdated: Date;
  history: ScoreHistoryEntry[];
}

export interface TrustFactors {
  accountAge: number; // 0-20 points
  verification: number; // 0-20 points
  behavior: number; // -40 to +40 points
  community: number; // 0-20 points
  moderation: number; // -40 to 0 points
}

export interface ScoreHistoryEntry {
  timestamp: Date;
  trustScore: number;
  abuseScore: number;
  trustLevel: TrustLevel;
  reason: string;
}

export interface AbuseScorerConfig {
  // Trust level thresholds
  trustLevelThresholds: Record<TrustLevel, number>;

  // Risk level thresholds (based on abuse score)
  riskLevelThresholds: {
    medium: number;
    high: number;
    critical: number;
  };

  // Account age scoring (in days)
  accountAgeThresholds: {
    new: number; // < X days = 0 points
    young: number; // < X days = 5 points
    established: number; // < X days = 10 points
    mature: number; // < X days = 15 points
    veteran: number; // >= X days = 20 points
  };

  // Event impact values
  eventImpacts: Partial<Record<BehaviorEvent, number>>;

  // Decay settings
  positiveDecayDays: number; // Positive events decay after X days
  negativeDecayDays: number; // Negative events decay after X days

  // Score limits
  maxTrustScore: number;
  minTrustScore: number;
  maxAbuseScore: number;

  // History retention
  maxHistoryEntries: number;
  historyRetentionDays: number;
}

export const DEFAULT_SCORER_CONFIG: AbuseScorerConfig = {
  trustLevelThresholds: {
    new: 0,
    untrusted: 10,
    limited: 25,
    standard: 50,
    trusted: 75,
    verified: 90,
  },

  riskLevelThresholds: {
    medium: 30,
    high: 50,
    critical: 75,
  },

  accountAgeThresholds: {
    new: 1,
    young: 7,
    established: 30,
    mature: 90,
    veteran: 365,
  },

  eventImpacts: {
    // Positive events
    message_sent: 0.1,
    spam_false_positive: 5,
    report_filed: 0.5, // Small positive for legitimate reports
    report_dismissed: 2, // Their report was valid
    appeal_approved: 10,
    helpful_flag: 3,
    reaction_received: 0.05,
    channel_joined: 0.2,
    positive_interaction: 1,
    profile_completed: 5,
    email_verified: 10,
    phone_verified: 15,
    two_factor_enabled: 10,

    // Negative events
    spam_detected: -5,
    rate_limited: -2,
    report_received: -1, // Being reported is mildly negative
    report_upheld: -10, // Report against them was valid
    warning_received: -10,
    mute_received: -20,
    ban_received: -50,
    timeout_received: -15,
    appeal_rejected: -5,
    negative_interaction: -2,
  },

  positiveDecayDays: 90,
  negativeDecayDays: 180,

  maxTrustScore: 100,
  minTrustScore: 0,
  maxAbuseScore: 100,

  maxHistoryEntries: 100,
  historyRetentionDays: 365,
};

// ============================================================================
// Abuse Scorer Class
// ============================================================================

export class AbuseScorer {
  private config: AbuseScorerConfig;
  private userScores: Map<string, UserTrustScore> = new Map();
  private behaviorRecords: Map<string, BehaviorRecord[]> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();

  constructor(config: Partial<AbuseScorerConfig> = {}) {
    this.config = {
      ...DEFAULT_SCORER_CONFIG,
      ...config,
      eventImpacts: {
        ...DEFAULT_SCORER_CONFIG.eventImpacts,
        ...config.eventImpacts,
      },
    };
  }

  // ==========================================================================
  // User Profile Management
  // ==========================================================================

  /**
   * Registers or updates a user profile
   */
  registerUser(profile: UserProfile): UserTrustScore {
    this.userProfiles.set(profile.userId, profile);

    // Initialize or update trust score
    const existingScore = this.userScores.get(profile.userId);
    if (existingScore) {
      // Profile exists, recalculate - we know it won't be null since profile is set
      return this.calculateScore(profile.userId)!;
    }

    // Create initial score
    const score = this.initializeScore(profile);
    this.userScores.set(profile.userId, score);

    logger.info(`User registered with trust level: ${score.trustLevel}`, {
      userId: profile.userId,
      trustScore: score.trustScore,
    });

    return score;
  }

  /**
   * Updates user profile
   */
  updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): UserTrustScore | null {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    // Update profile
    Object.assign(profile, updates);
    this.userProfiles.set(userId, profile);

    // Recalculate score
    return this.calculateScore(userId);
  }

  /**
   * Gets user profile
   */
  getProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  // ==========================================================================
  // Behavior Recording
  // ==========================================================================

  /**
   * Records a behavior event for a user
   */
  recordEvent(
    userId: string,
    event: BehaviorEvent,
    options: {
      details?: Record<string, unknown>;
      channelId?: string;
      workspaceId?: string;
      customImpact?: number;
    } = {},
  ): UserTrustScore | null {
    const impact = options.customImpact ?? this.config.eventImpacts[event] ?? 0;

    const record: BehaviorRecord = {
      id: this.generateId(),
      userId,
      event,
      impact,
      details: options.details,
      timestamp: new Date(),
      channelId: options.channelId,
      workspaceId: options.workspaceId,
    };

    // Set expiry based on impact direction
    if (impact > 0) {
      record.expiresAt = new Date(
        Date.now() + this.config.positiveDecayDays * 24 * 60 * 60 * 1000,
      );
    } else if (impact < 0) {
      record.expiresAt = new Date(
        Date.now() + this.config.negativeDecayDays * 24 * 60 * 60 * 1000,
      );
    }

    // Add to records
    const records = this.behaviorRecords.get(userId) || [];
    records.push(record);
    this.behaviorRecords.set(userId, records);

    // Recalculate score
    return this.calculateScore(userId);
  }

  /**
   * Records multiple events at once
   */
  recordEvents(
    userId: string,
    events: Array<{
      event: BehaviorEvent;
      details?: Record<string, unknown>;
    }>,
  ): UserTrustScore | null {
    for (const { event, details } of events) {
      this.recordEvent(userId, event, { details });
    }
    return this.getScore(userId);
  }

  /**
   * Gets behavior records for a user
   */
  getBehaviorRecords(
    userId: string,
    options: {
      event?: BehaviorEvent;
      since?: Date;
      limit?: number;
    } = {},
  ): BehaviorRecord[] {
    let records = this.behaviorRecords.get(userId) || [];

    if (options.event) {
      records = records.filter((r) => r.event === options.event);
    }

    if (options.since) {
      records = records.filter((r) => r.timestamp >= options.since!);
    }

    // Sort by timestamp descending
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  // ==========================================================================
  // Score Calculation
  // ==========================================================================

  /**
   * Calculates trust score for a user
   */
  calculateScore(userId: string): UserTrustScore | null {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    const factors = this.calculateFactors(userId, profile);
    const trustScore = this.calculateTrustScore(factors);
    const abuseScore = this.calculateAbuseScore(userId);
    const trustLevel = this.determineTrustLevel(trustScore);
    const riskLevel = this.determineRiskLevel(abuseScore);

    const existingScore = this.userScores.get(userId);
    const history = existingScore?.history || [];

    // Add history entry if score changed significantly
    if (
      !existingScore ||
      Math.abs(existingScore.trustScore - trustScore) >= 5 ||
      existingScore.trustLevel !== trustLevel
    ) {
      history.push({
        timestamp: new Date(),
        trustScore,
        abuseScore,
        trustLevel,
        reason: existingScore
          ? `Score updated: ${existingScore.trustScore.toFixed(0)} -> ${trustScore.toFixed(0)}`
          : "Initial score",
      });

      // Trim history
      while (history.length > this.config.maxHistoryEntries) {
        history.shift();
      }
    }

    const score: UserTrustScore = {
      userId,
      trustScore,
      abuseScore,
      trustLevel,
      riskLevel,
      factors,
      lastUpdated: new Date(),
      history,
    };

    this.userScores.set(userId, score);
    return score;
  }

  /**
   * Gets current score for a user
   */
  getScore(userId: string): UserTrustScore | null {
    return this.userScores.get(userId) || null;
  }

  /**
   * Gets trust level for a user
   */
  getTrustLevel(userId: string): TrustLevel {
    const score = this.userScores.get(userId);
    return score?.trustLevel || "new";
  }

  /**
   * Gets risk level for a user
   */
  getRiskLevel(userId: string): "low" | "medium" | "high" | "critical" {
    const score = this.userScores.get(userId);
    return score?.riskLevel || "low";
  }

  /**
   * Checks if user is trusted
   */
  isTrusted(userId: string): boolean {
    const level = this.getTrustLevel(userId);
    return level === "trusted" || level === "verified";
  }

  /**
   * Checks if user is high risk
   */
  isHighRisk(userId: string): boolean {
    const level = this.getRiskLevel(userId);
    return level === "high" || level === "critical";
  }

  // ==========================================================================
  // Score Factors Calculation
  // ==========================================================================

  private calculateFactors(userId: string, profile: UserProfile): TrustFactors {
    return {
      accountAge: this.calculateAccountAgeFactor(profile.createdAt),
      verification: this.calculateVerificationFactor(profile),
      behavior: this.calculateBehaviorFactor(userId),
      community: this.calculateCommunityFactor(userId),
      moderation: this.calculateModerationFactor(userId),
    };
  }

  private calculateAccountAgeFactor(createdAt: Date): number {
    const ageInDays =
      (Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const thresholds = this.config.accountAgeThresholds;

    if (ageInDays < thresholds.new) return 0;
    if (ageInDays < thresholds.young) return 5;
    if (ageInDays < thresholds.established) return 10;
    if (ageInDays < thresholds.mature) return 15;
    return 20;
  }

  private calculateVerificationFactor(profile: UserProfile): number {
    let points = 0;

    if (profile.emailVerified) points += 5;
    if (profile.phoneVerified) points += 8;
    if (profile.twoFactorEnabled) points += 5;
    if (profile.profileComplete) points += 2;

    return Math.min(20, points);
  }

  private calculateBehaviorFactor(userId: string): number {
    const records = this.getActiveRecords(userId);
    let total = 0;

    for (const record of records) {
      // Apply decay based on age
      const ageInDays =
        (Date.now() - record.timestamp.getTime()) / (24 * 60 * 60 * 1000);
      const decayFactor = Math.max(0.1, 1 - ageInDays / 180); // Linear decay over 180 days

      total += record.impact * decayFactor;
    }

    // Clamp to -40 to +40
    return Math.max(-40, Math.min(40, total));
  }

  private calculateCommunityFactor(userId: string): number {
    const records = this.getActiveRecords(userId);
    let points = 0;

    // Count positive community interactions
    const positiveEvents: BehaviorEvent[] = [
      "reaction_received",
      "helpful_flag",
      "positive_interaction",
    ];

    for (const record of records) {
      if (positiveEvents.includes(record.event)) {
        points += 0.5;
      }
    }

    // Count channels joined
    const channelJoins = records.filter(
      (r) => r.event === "channel_joined",
    ).length;
    points += Math.min(5, channelJoins * 0.5);

    return Math.min(20, points);
  }

  private calculateModerationFactor(userId: string): number {
    const records = this.getActiveRecords(userId);
    let penalty = 0;

    // Count moderation actions
    const moderationEvents: BehaviorEvent[] = [
      "warning_received",
      "mute_received",
      "ban_received",
      "timeout_received",
      "report_upheld",
    ];

    for (const record of records) {
      if (moderationEvents.includes(record.event)) {
        penalty += Math.abs(record.impact);
      }
    }

    // Return negative value (penalty)
    return Math.max(-40, -penalty);
  }

  private getActiveRecords(userId: string): BehaviorRecord[] {
    const records = this.behaviorRecords.get(userId) || [];
    const now = Date.now();

    return records.filter((r) => {
      if (r.expiresAt && r.expiresAt.getTime() < now) return false;
      return true;
    });
  }

  // ==========================================================================
  // Score and Level Determination
  // ==========================================================================

  private calculateTrustScore(factors: TrustFactors): number {
    const baseScore = 50; // Start at middle

    const total =
      baseScore +
      factors.accountAge +
      factors.verification +
      factors.behavior +
      factors.community +
      factors.moderation;

    return Math.max(
      this.config.minTrustScore,
      Math.min(this.config.maxTrustScore, total),
    );
  }

  private calculateAbuseScore(userId: string): number {
    const records = this.getActiveRecords(userId);
    let score = 0;

    // Count negative events
    for (const record of records) {
      if (record.impact < 0) {
        score += Math.abs(record.impact);
      }
    }

    // Normalize to 0-100
    return Math.min(this.config.maxAbuseScore, score);
  }

  private determineTrustLevel(score: number): TrustLevel {
    const thresholds = this.config.trustLevelThresholds;

    if (score >= thresholds.verified) return "verified";
    if (score >= thresholds.trusted) return "trusted";
    if (score >= thresholds.standard) return "standard";
    if (score >= thresholds.limited) return "limited";
    if (score >= thresholds.untrusted) return "untrusted";
    return "new";
  }

  private determineRiskLevel(
    abuseScore: number,
  ): "low" | "medium" | "high" | "critical" {
    const thresholds = this.config.riskLevelThresholds;

    if (abuseScore >= thresholds.critical) return "critical";
    if (abuseScore >= thresholds.high) return "high";
    if (abuseScore >= thresholds.medium) return "medium";
    return "low";
  }

  private initializeScore(profile: UserProfile): UserTrustScore {
    const factors = this.calculateFactors(profile.userId, profile);
    const trustScore = this.calculateTrustScore(factors);
    const abuseScore = 0;
    const trustLevel = this.determineTrustLevel(trustScore);

    return {
      userId: profile.userId,
      trustScore,
      abuseScore,
      trustLevel,
      riskLevel: "low",
      factors,
      lastUpdated: new Date(),
      history: [
        {
          timestamp: new Date(),
          trustScore,
          abuseScore,
          trustLevel,
          reason: "Initial registration",
        },
      ],
    };
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Gets users by trust level
   */
  getUsersByTrustLevel(level: TrustLevel): string[] {
    const users: string[] = [];
    for (const [userId, score] of this.userScores) {
      if (score.trustLevel === level) {
        users.push(userId);
      }
    }
    return users;
  }

  /**
   * Gets users by risk level
   */
  getUsersByRiskLevel(level: "low" | "medium" | "high" | "critical"): string[] {
    const users: string[] = [];
    for (const [userId, score] of this.userScores) {
      if (score.riskLevel === level) {
        users.push(userId);
      }
    }
    return users;
  }

  /**
   * Gets high-risk users
   */
  getHighRiskUsers(): UserTrustScore[] {
    const results: UserTrustScore[] = [];
    for (const score of this.userScores.values()) {
      if (score.riskLevel === "high" || score.riskLevel === "critical") {
        results.push(score);
      }
    }
    return results.sort((a, b) => b.abuseScore - a.abuseScore);
  }

  /**
   * Gets users needing review (medium+ risk, low trust)
   */
  getUsersNeedingReview(): UserTrustScore[] {
    const results: UserTrustScore[] = [];
    for (const score of this.userScores.values()) {
      if (
        (score.riskLevel !== "low" ||
          score.trustLevel === "new" ||
          score.trustLevel === "untrusted") &&
        score.trustScore < 50
      ) {
        results.push(score);
      }
    }
    return results.sort((a, b) => b.abuseScore - a.abuseScore);
  }

  // ==========================================================================
  // Manual Adjustments
  // ==========================================================================

  /**
   * Manually boosts trust score
   */
  boostTrust(
    userId: string,
    amount: number,
    reason: string,
  ): UserTrustScore | null {
    const score = this.userScores.get(userId);
    if (!score) return null;

    this.recordEvent(userId, "positive_interaction", {
      customImpact: amount,
      details: { reason, manual: true },
    });

    return this.calculateScore(userId);
  }

  /**
   * Manually penalizes trust score
   */
  penalizeTrust(
    userId: string,
    amount: number,
    reason: string,
  ): UserTrustScore | null {
    const score = this.userScores.get(userId);
    if (!score) return null;

    this.recordEvent(userId, "negative_interaction", {
      customImpact: -Math.abs(amount),
      details: { reason, manual: true },
    });

    return this.calculateScore(userId);
  }

  /**
   * Manually sets trust level (override)
   */
  setTrustLevel(
    userId: string,
    level: TrustLevel,
    reason: string,
  ): UserTrustScore | null {
    const score = this.userScores.get(userId);
    if (!score) return null;

    const targetScore = this.config.trustLevelThresholds[level];

    score.trustScore = targetScore;
    score.trustLevel = level;
    score.lastUpdated = new Date();
    score.history.push({
      timestamp: new Date(),
      trustScore: targetScore,
      abuseScore: score.abuseScore,
      trustLevel: level,
      reason: `Manual override: ${reason}`,
    });

    logger.info(`Trust level manually set for ${userId}`, {
      newLevel: level,
      reason,
    });

    return score;
  }

  /**
   * Resets a user's abuse score
   */
  resetAbuseScore(userId: string, reason: string): UserTrustScore | null {
    const score = this.userScores.get(userId);
    if (!score) return null;

    // Clear negative behavior records
    const records = this.behaviorRecords.get(userId) || [];
    const positive = records.filter((r) => r.impact >= 0);
    this.behaviorRecords.set(userId, positive);

    score.abuseScore = 0;
    score.riskLevel = "low";
    score.lastUpdated = new Date();
    score.history.push({
      timestamp: new Date(),
      trustScore: score.trustScore,
      abuseScore: 0,
      trustLevel: score.trustLevel,
      reason: `Abuse score reset: ${reason}`,
    });

    logger.info(`Abuse score reset for ${userId}`, { reason });

    return score;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Gets scorer statistics
   */
  getStats(): {
    totalUsers: number;
    byTrustLevel: Record<TrustLevel, number>;
    byRiskLevel: Record<string, number>;
    averageTrustScore: number;
    averageAbuseScore: number;
    totalBehaviorRecords: number;
  } {
    const byTrustLevel: Record<TrustLevel, number> = {
      new: 0,
      untrusted: 0,
      limited: 0,
      standard: 0,
      trusted: 0,
      verified: 0,
    };

    const byRiskLevel: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalTrust = 0;
    let totalAbuse = 0;
    let totalRecords = 0;

    for (const score of this.userScores.values()) {
      byTrustLevel[score.trustLevel]++;
      byRiskLevel[score.riskLevel]++;
      totalTrust += score.trustScore;
      totalAbuse += score.abuseScore;
    }

    for (const records of this.behaviorRecords.values()) {
      totalRecords += records.length;
    }

    const userCount = this.userScores.size;

    return {
      totalUsers: userCount,
      byTrustLevel,
      byRiskLevel,
      averageTrustScore: userCount > 0 ? totalTrust / userCount : 0,
      averageAbuseScore: userCount > 0 ? totalAbuse / userCount : 0,
      totalBehaviorRecords: totalRecords,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Cleans up expired records
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, records] of this.behaviorRecords) {
      const active = records.filter((r) => {
        if (r.expiresAt && r.expiresAt.getTime() < now) {
          cleaned++;
          return false;
        }
        return true;
      });

      if (active.length !== records.length) {
        this.behaviorRecords.set(userId, active);
        // Recalculate score after cleanup
        this.calculateScore(userId);
      }
    }

    return cleaned;
  }

  /**
   * Clears all data for a user
   */
  clearUser(userId: string): void {
    this.userScores.delete(userId);
    this.behaviorRecords.delete(userId);
    this.userProfiles.delete(userId);
  }

  /**
   * Clears all data
   */
  clearAll(): void {
    this.userScores.clear();
    this.behaviorRecords.clear();
    this.userProfiles.clear();
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let scorerInstance: AbuseScorer | null = null;

export function getAbuseScorer(
  config?: Partial<AbuseScorerConfig>,
): AbuseScorer {
  if (!scorerInstance || config) {
    scorerInstance = new AbuseScorer(config);
  }
  return scorerInstance;
}

export function createAbuseScorer(
  config?: Partial<AbuseScorerConfig>,
): AbuseScorer {
  return new AbuseScorer(config);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets recommended action based on trust/abuse scores
 */
export function getRecommendedAction(score: UserTrustScore): {
  action: "none" | "monitor" | "restrict" | "review" | "action_required";
  reason: string;
} {
  if (score.riskLevel === "critical") {
    return {
      action: "action_required",
      reason: "Critical risk level - immediate review needed",
    };
  }

  if (score.riskLevel === "high") {
    return {
      action: "restrict",
      reason: "High risk level - apply restrictions",
    };
  }

  if (score.trustLevel === "new" || score.trustLevel === "untrusted") {
    return {
      action: "monitor",
      reason: "New or untrusted user - monitoring recommended",
    };
  }

  if (score.riskLevel === "medium") {
    return {
      action: "review",
      reason: "Medium risk level - periodic review recommended",
    };
  }

  return {
    action: "none",
    reason: "User in good standing",
  };
}

/**
 * Formats trust score for display
 */
export function formatTrustScore(score: UserTrustScore): string {
  const levelEmoji: Record<TrustLevel, string> = {
    new: "",
    untrusted: "",
    limited: "",
    standard: "",
    trusted: "",
    verified: "",
  };

  return `${levelEmoji[score.trustLevel]} ${score.trustLevel.charAt(0).toUpperCase() + score.trustLevel.slice(1)} (${score.trustScore.toFixed(0)}/100)`;
}
