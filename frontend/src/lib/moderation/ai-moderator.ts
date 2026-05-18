/**
 * AI Moderator Core
 * Multi-model approach with confidence scoring and auto-action decision logic
 * Integrates Perspective API + OpenAI Moderation + TensorFlow.js
 */

import {
  getAIDetector,
  type ToxicityResult,
  type NSFWResult,
  type SpamResult,
} from "./ai-detector";
import { getProfanityFilter, type ProfanityResult } from "./profanity-filter";

export interface ContentAnalysis {
  // Content info
  contentId: string;
  contentType: "text" | "image" | "video" | "file" | "profile" | "channel";
  content: string;
  metadata?: {
    userId?: string;
    channelId?: string;
    messageCount?: number;
    timeWindow?: number;
    hasLinks?: boolean;
    linkCount?: number;
    attachments?: string[];
  };

  // Analysis results
  toxicity: ToxicityResult;
  spam: SpamResult;
  profanity: ProfanityResult;
  nsfw?: NSFWResult;

  // Scores
  overallScore: number;
  confidenceScore: number;

  // Decision
  shouldFlag: boolean;
  shouldHide: boolean;
  shouldWarn: boolean;
  shouldMute: boolean;
  shouldBan: boolean;
  autoAction: AutoAction;
  autoActionReason: string;

  // Priority
  priority: "low" | "medium" | "high" | "critical";

  // Issues
  detectedIssues: DetectedIssue[];

  // Metadata
  modelVersion: string;
  processingTime: number;
  analyzedAt: Date;
}

export interface DetectedIssue {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  evidence: string[];
}

export type AutoAction =
  | "none"
  | "flag"
  | "hide"
  | "warn"
  | "mute"
  | "delete"
  | "ban"
  | "shadowban";

export interface ModerationThresholds {
  // Detection thresholds (0-1)
  toxicity: number;
  nsfw: number;
  spam: number;
  profanity: number;

  // Auto-action thresholds
  flagThreshold: number; // Flag for manual review
  hideThreshold: number; // Auto-hide content
  warnThreshold: number; // Warn user
  muteThreshold: number; // Temporary mute
  banThreshold: number; // Permanent ban

  // User behavior thresholds
  maxViolationsPerDay: number;
  maxViolationsPerWeek: number;
  maxViolationsTotal: number;
}

export interface ModerationPolicy {
  // Feature flags
  enableToxicityDetection: boolean;
  enableNSFWDetection: boolean;
  enableSpamDetection: boolean;
  enableProfanityFilter: boolean;

  // Auto-actions
  autoFlag: boolean;
  autoHide: boolean;
  autoWarn: boolean;
  autoMute: boolean;
  autoBan: boolean;

  // Thresholds
  thresholds: ModerationThresholds;

  // Custom lists
  customBlockedWords: string[];
  customAllowedWords: string[];
  whitelistedUsers: string[];
  blacklistedUsers: string[];

  // Learning
  enableFalsePositiveLearning: boolean;
  minimumConfidenceForAutoAction: number;
}

export const DEFAULT_MODERATION_POLICY: ModerationPolicy = {
  enableToxicityDetection: true,
  enableNSFWDetection: true,
  enableSpamDetection: true,
  enableProfanityFilter: true,

  autoFlag: true,
  autoHide: false,
  autoWarn: false,
  autoMute: false,
  autoBan: false,

  thresholds: {
    toxicity: 0.7,
    nsfw: 0.7,
    spam: 0.6,
    profanity: 0.5,

    flagThreshold: 0.5,
    hideThreshold: 0.8,
    warnThreshold: 0.7,
    muteThreshold: 0.85,
    banThreshold: 0.95,

    maxViolationsPerDay: 3,
    maxViolationsPerWeek: 5,
    maxViolationsTotal: 10,
  },

  customBlockedWords: [],
  customAllowedWords: [],
  whitelistedUsers: [],
  blacklistedUsers: [],

  enableFalsePositiveLearning: true,
  minimumConfidenceForAutoAction: 0.6,
};

export interface UserViolationHistory {
  userId: string;
  totalViolations: number;
  violationsToday: number;
  violationsThisWeek: number;
  lastViolationAt?: Date;
  trustScore: number; // 0-100, higher is better
  isMuted: boolean;
  mutedUntil?: Date;
  isBanned: boolean;
  bannedUntil?: Date;
  warnings: number;
}

export class AIModerator {
  private policy: ModerationPolicy;
  private aiDetector = getAIDetector();
  private profanityFilter = getProfanityFilter();
  private modelVersion = "v0.7.0-ai";
  private violationHistory = new Map<string, UserViolationHistory>();

  constructor(policy: Partial<ModerationPolicy> = {}) {
    this.policy = { ...DEFAULT_MODERATION_POLICY, ...policy };

    // Configure profanity filter
    if (policy.customBlockedWords && policy.customBlockedWords.length > 0) {
      this.profanityFilter.addBlockedWords(policy.customBlockedWords);
    }
    if (policy.customAllowedWords && policy.customAllowedWords.length > 0) {
      this.profanityFilter.addAllowedWords(policy.customAllowedWords);
    }
  }

  /**
   * Initialize AI models
   */
  async initialize(): Promise<void> {
    await this.aiDetector.initialize();
  }

  /**
   * Analyze content with multi-model approach
   */
  async analyzeContent(
    contentId: string,
    contentType: ContentAnalysis["contentType"],
    content: string,
    metadata?: ContentAnalysis["metadata"],
  ): Promise<ContentAnalysis> {
    const startTime = Date.now();

    // Check if user is whitelisted
    if (
      metadata?.userId &&
      this.policy.whitelistedUsers.includes(metadata.userId)
    ) {
      return this.createCleanAnalysis(
        contentId,
        contentType,
        content,
        metadata,
        startTime,
      );
    }

    // Check if user is blacklisted
    if (
      metadata?.userId &&
      this.policy.blacklistedUsers.includes(metadata.userId)
    ) {
      return this.createBlacklistedAnalysis(
        contentId,
        contentType,
        content,
        metadata,
        startTime,
      );
    }

    // Run parallel detection
    const [toxicity, spam, profanity, nsfw] = await Promise.all([
      this.policy.enableToxicityDetection
        ? this.aiDetector.detectToxicity(content)
        : this.createEmptyToxicityResult(),
      this.policy.enableSpamDetection
        ? this.aiDetector.detectSpam(content, metadata)
        : this.createEmptySpamResult(),
      this.policy.enableProfanityFilter
        ? Promise.resolve(this.profanityFilter.check(content))
        : this.createEmptyProfanityResult(),
      this.policy.enableNSFWDetection &&
      contentType === "image" &&
      metadata?.attachments?.[0]
        ? this.aiDetector.detectNSFW(metadata.attachments[0])
        : this.createEmptyNSFWResult(),
    ]);

    // Calculate scores
    const scores = this.calculateScores(toxicity, spam, profanity, nsfw);
    const confidence = this.calculateConfidence(
      toxicity,
      spam,
      profanity,
      nsfw,
    );

    // Detect issues
    const detectedIssues = this.detectIssues(toxicity, spam, profanity, nsfw);

    // Determine priority
    const priority = this.determinePriority(scores.overall);

    // Get user violation history
    const userHistory = metadata?.userId
      ? this.getUserHistory(metadata.userId)
      : undefined;

    // Determine auto-action
    const {
      autoAction,
      autoActionReason,
      shouldFlag,
      shouldHide,
      shouldWarn,
      shouldMute,
      shouldBan,
    } = this.determineAutoAction(
      scores,
      confidence,
      detectedIssues,
      userHistory,
    );

    const processingTime = Date.now() - startTime;

    return {
      contentId,
      contentType,
      content,
      metadata,
      toxicity,
      spam,
      profanity,
      nsfw,
      overallScore: scores.overall,
      confidenceScore: confidence,
      shouldFlag,
      shouldHide,
      shouldWarn,
      shouldMute,
      shouldBan,
      autoAction,
      autoActionReason,
      priority,
      detectedIssues,
      modelVersion: this.modelVersion,
      processingTime,
      analyzedAt: new Date(),
    };
  }

  /**
   * Calculate weighted scores
   */
  private calculateScores(
    toxicity: ToxicityResult,
    spam: SpamResult,
    profanity: ProfanityResult,
    nsfw?: NSFWResult,
  ): {
    overall: number;
    toxicity: number;
    spam: number;
    profanity: number;
    nsfw: number;
  } {
    const scores = {
      toxicity: toxicity.toxicScore,
      spam: spam.spamScore,
      profanity: profanity.score,
      nsfw: nsfw?.nsfwScore || 0,
    };

    // Weighted average (toxicity is most important)
    const weights = {
      toxicity: 0.4,
      spam: 0.25,
      profanity: 0.2,
      nsfw: 0.15,
    };

    const overall =
      scores.toxicity * weights.toxicity +
      scores.spam * weights.spam +
      scores.profanity * weights.profanity +
      scores.nsfw * weights.nsfw;

    return { overall, ...scores };
  }

  /**
   * Calculate confidence score based on model agreement
   */
  private calculateConfidence(
    toxicity: ToxicityResult,
    spam: SpamResult,
    profanity: ProfanityResult,
    nsfw?: NSFWResult,
  ): number {
    const detections = [
      toxicity.isToxic,
      spam.isSpam,
      profanity.hasProfanity,
      nsfw?.isNSFW || false,
    ];

    const activeDetections = detections.filter(Boolean).length;
    const totalDetectors = detections.length;

    // High confidence if multiple models agree
    const agreementScore = activeDetections / totalDetectors;

    // Also consider individual model confidence
    const avgModelConfidence =
      (toxicity.toxicScore +
        spam.spamScore +
        profanity.score +
        (nsfw?.nsfwScore || 0)) /
      4;

    // Combine agreement and model confidence
    return agreementScore * 0.6 + avgModelConfidence * 0.4;
  }

  /**
   * Detect specific issues with severity and evidence
   */
  private detectIssues(
    toxicity: ToxicityResult,
    spam: SpamResult,
    profanity: ProfanityResult,
    nsfw?: NSFWResult,
  ): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    // Toxicity issues
    if (toxicity.isToxic) {
      for (const label of toxicity.detectedLabels) {
        const score =
          toxicity.categories[label as keyof typeof toxicity.categories] || 0;
        issues.push({
          category: "toxicity",
          severity: this.scoreToSeverity(score),
          confidence: score,
          description: `Toxic content detected: ${label}`,
          evidence: [label],
        });
      }
    }

    // Spam issues
    if (spam.isSpam) {
      issues.push({
        category: "spam",
        severity: this.scoreToSeverity(spam.spamScore),
        confidence: spam.spamScore,
        description: "Spam content detected",
        evidence: spam.reasons,
      });
    }

    // Profanity issues
    if (profanity.hasProfanity) {
      issues.push({
        category: "profanity",
        severity: this.scoreToSeverity(profanity.score),
        confidence: profanity.score,
        description: "Profanity detected",
        evidence: profanity.detectedWords,
      });
    }

    // NSFW issues
    if (nsfw?.isNSFW) {
      for (const label of nsfw.detectedLabels) {
        const score =
          nsfw.categories[label as keyof typeof nsfw.categories] || 0;
        issues.push({
          category: "nsfw",
          severity: this.scoreToSeverity(score),
          confidence: score,
          description: `NSFW content detected: ${label}`,
          evidence: [label],
        });
      }
    }

    return issues;
  }

  /**
   * Convert score to severity level
   */
  private scoreToSeverity(score: number): DetectedIssue["severity"] {
    if (score >= 0.9) return "critical";
    if (score >= 0.7) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  /**
   * Determine priority level
   */
  private determinePriority(overallScore: number): ContentAnalysis["priority"] {
    if (overallScore >= 0.9) return "critical";
    if (overallScore >= 0.7) return "high";
    if (overallScore >= 0.5) return "medium";
    return "low";
  }

  /**
   * Determine auto-action based on scores and policy
   */
  private determineAutoAction(
    scores: {
      overall: number;
      toxicity: number;
      spam: number;
      profanity: number;
      nsfw: number;
    },
    confidence: number,
    issues: DetectedIssue[],
    userHistory?: UserViolationHistory,
  ): {
    autoAction: AutoAction;
    autoActionReason: string;
    shouldFlag: boolean;
    shouldHide: boolean;
    shouldWarn: boolean;
    shouldMute: boolean;
    shouldBan: boolean;
  } {
    const { thresholds } = this.policy;
    const { overall, toxicity, spam, profanity, nsfw } = scores;

    // Check confidence requirement
    if (confidence < this.policy.minimumConfidenceForAutoAction) {
      return {
        autoAction: "none",
        autoActionReason: "Confidence too low for auto-action",
        shouldFlag: false,
        shouldHide: false,
        shouldWarn: false,
        shouldMute: false,
        shouldBan: false,
      };
    }

    // Determine flags
    const shouldFlag =
      overall >= thresholds.flagThreshold ||
      toxicity >= thresholds.toxicity ||
      spam >= thresholds.spam ||
      profanity >= thresholds.profanity ||
      nsfw >= thresholds.nsfw;

    const shouldHide = overall >= thresholds.hideThreshold;
    const shouldWarn = overall >= thresholds.warnThreshold;
    const shouldMute = overall >= thresholds.muteThreshold;

    // Check user history for ban decision
    const shouldBan =
      overall >= thresholds.banThreshold ||
      (userHistory &&
        userHistory.totalViolations >= thresholds.maxViolationsTotal) ||
      (userHistory &&
        userHistory.violationsThisWeek >= thresholds.maxViolationsPerWeek) ||
      false;

    // Determine action (in order of severity)
    let autoAction: AutoAction = "none";
    let autoActionReason = "";

    if (shouldBan && this.policy.autoBan) {
      autoAction = "ban";
      autoActionReason = this.buildActionReason(
        "ban",
        overall,
        issues,
        userHistory,
      );
    } else if (shouldMute && this.policy.autoMute) {
      autoAction = "mute";
      autoActionReason = this.buildActionReason(
        "mute",
        overall,
        issues,
        userHistory,
      );
    } else if (shouldHide && this.policy.autoHide) {
      autoAction = "hide";
      autoActionReason = this.buildActionReason(
        "hide",
        overall,
        issues,
        userHistory,
      );
    } else if (shouldWarn && this.policy.autoWarn) {
      autoAction = "warn";
      autoActionReason = this.buildActionReason(
        "warn",
        overall,
        issues,
        userHistory,
      );
    } else if (shouldFlag && this.policy.autoFlag) {
      autoAction = "flag";
      autoActionReason = this.buildActionReason(
        "flag",
        overall,
        issues,
        userHistory,
      );
    }

    return {
      autoAction,
      autoActionReason,
      shouldFlag,
      shouldHide,
      shouldWarn,
      shouldMute,
      shouldBan,
    };
  }

  /**
   * Build human-readable action reason
   */
  private buildActionReason(
    action: string,
    score: number,
    issues: DetectedIssue[],
    userHistory?: UserViolationHistory,
  ): string {
    const reasons: string[] = [];

    // Add score
    reasons.push(`Overall risk score: ${(score * 100).toFixed(1)}%`);

    // Add detected issues
    const criticalIssues = issues.filter((i) => i.severity === "critical");
    const highIssues = issues.filter((i) => i.severity === "high");

    if (criticalIssues.length > 0) {
      reasons.push(
        `Critical issues: ${criticalIssues.map((i) => i.category).join(", ")}`,
      );
    }
    if (highIssues.length > 0) {
      reasons.push(
        `High-severity issues: ${highIssues.map((i) => i.category).join(", ")}`,
      );
    }

    // Add user history context
    if (userHistory) {
      if (userHistory.totalViolations > 0) {
        reasons.push(`Previous violations: ${userHistory.totalViolations}`);
      }
      if (userHistory.trustScore < 50) {
        reasons.push(`Low trust score: ${userHistory.trustScore}`);
      }
    }

    return reasons.join(". ");
  }

  /**
   * Get or create user violation history
   */
  private getUserHistory(userId: string): UserViolationHistory {
    if (!this.violationHistory.has(userId)) {
      this.violationHistory.set(userId, {
        userId,
        totalViolations: 0,
        violationsToday: 0,
        violationsThisWeek: 0,
        trustScore: 100,
        isMuted: false,
        isBanned: false,
        warnings: 0,
      });
    }
    return this.violationHistory.get(userId)!;
  }

  /**
   * Record violation for user
   */
  async recordViolation(
    userId: string,
    severity: DetectedIssue["severity"],
  ): Promise<void> {
    const history = this.getUserHistory(userId);

    history.totalViolations++;
    history.violationsToday++;
    history.violationsThisWeek++;
    history.lastViolationAt = new Date();

    // Decrease trust score based on severity
    const trustPenalty = {
      low: 5,
      medium: 10,
      high: 20,
      critical: 30,
    };
    history.trustScore = Math.max(
      0,
      history.trustScore - trustPenalty[severity],
    );

    this.violationHistory.set(userId, history);
  }

  /**
   * Record false positive (for learning)
   */
  async recordFalsePositive(
    contentId: string,
    contentType: string,
    actualScore: number,
    predictedScore: number,
  ): Promise<void> {
    if (!this.policy.enableFalsePositiveLearning) return;

    // In production, this would update ML models
    // For now, just log
    // REMOVED: console.log('False positive recorded:', {
    //   contentId,
    //   contentType,
    //   actualScore,
    //   predictedScore,
    //   difference: Math.abs(actualScore - predictedScore),
    // })
  }

  /**
   * Update moderation policy
   */
  updatePolicy(updates: Partial<ModerationPolicy>): void {
    this.policy = { ...this.policy, ...updates };

    // Update profanity filter if needed
    if (updates.customBlockedWords) {
      this.profanityFilter.addBlockedWords(updates.customBlockedWords);
    }
    if (updates.customAllowedWords) {
      this.profanityFilter.addAllowedWords(updates.customAllowedWords);
    }
  }

  /**
   * Get current policy
   */
  getPolicy(): ModerationPolicy {
    return { ...this.policy };
  }

  /**
   * Create clean analysis for whitelisted users
   */
  private createCleanAnalysis(
    contentId: string,
    contentType: ContentAnalysis["contentType"],
    content: string,
    metadata: ContentAnalysis["metadata"],
    startTime: number,
  ): ContentAnalysis {
    return {
      contentId,
      contentType,
      content,
      metadata,
      toxicity: this.createEmptyToxicityResult(),
      spam: this.createEmptySpamResult(),
      profanity: this.createEmptyProfanityResult(),
      overallScore: 0,
      confidenceScore: 1,
      shouldFlag: false,
      shouldHide: false,
      shouldWarn: false,
      shouldMute: false,
      shouldBan: false,
      autoAction: "none",
      autoActionReason: "User is whitelisted",
      priority: "low",
      detectedIssues: [],
      modelVersion: this.modelVersion,
      processingTime: Date.now() - startTime,
      analyzedAt: new Date(),
    };
  }

  /**
   * Create blacklisted analysis
   */
  private createBlacklistedAnalysis(
    contentId: string,
    contentType: ContentAnalysis["contentType"],
    content: string,
    metadata: ContentAnalysis["metadata"],
    startTime: number,
  ): ContentAnalysis {
    return {
      contentId,
      contentType,
      content,
      metadata,
      toxicity: this.createEmptyToxicityResult(),
      spam: this.createEmptySpamResult(),
      profanity: this.createEmptyProfanityResult(),
      overallScore: 1,
      confidenceScore: 1,
      shouldFlag: true,
      shouldHide: true,
      shouldWarn: true,
      shouldMute: true,
      shouldBan: true,
      autoAction: "ban",
      autoActionReason: "User is blacklisted",
      priority: "critical",
      detectedIssues: [
        {
          category: "blacklisted",
          severity: "critical",
          confidence: 1,
          description: "User is on blacklist",
          evidence: ["User blacklisted"],
        },
      ],
      modelVersion: this.modelVersion,
      processingTime: Date.now() - startTime,
      analyzedAt: new Date(),
    };
  }

  /**
   * Empty result helpers
   */
  private createEmptyToxicityResult(): ToxicityResult {
    return {
      isToxic: false,
      toxicScore: 0,
      categories: {},
      detectedLabels: [],
    };
  }

  private createEmptySpamResult(): SpamResult {
    return {
      isSpam: false,
      spamScore: 0,
      reasons: [],
    };
  }

  private createEmptyProfanityResult(): ProfanityResult {
    return {
      hasProfanity: false,
      score: 0,
      detectedWords: [],
      filteredText: "",
    };
  }

  private createEmptyNSFWResult(): NSFWResult {
    return {
      isNSFW: false,
      nsfwScore: 0,
      categories: {},
      detectedLabels: [],
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.aiDetector.dispose();
    this.violationHistory.clear();
  }
}

// Singleton instance
let aiModerator: AIModerator | null = null;

export function getAIModerator(
  policy?: Partial<ModerationPolicy>,
): AIModerator {
  if (!aiModerator || policy) {
    aiModerator = new AIModerator(policy);
  }
  return aiModerator;
}
