/**
 * Moderation Service
 * Orchestrates AI detection, profanity filtering, and spam detection
 */

import {
  getAIDetector,
  type ToxicityResult,
  type NSFWResult,
  type SpamResult,
} from "./ai-detector";
import { getProfanityFilter, type ProfanityResult } from "./profanity-filter";

export interface ModerationResult {
  // Overall assessment
  shouldFlag: boolean;
  shouldHide: boolean;
  shouldWarn: boolean;
  shouldMute: boolean;
  priority: "low" | "medium" | "high" | "critical";

  // Scores
  toxicScore: number;
  nsfwScore: number;
  spamScore: number;
  profanityScore: number;
  overallScore: number;

  // Detailed results
  toxicityResult?: ToxicityResult;
  nsfwResult?: NSFWResult;
  spamResult?: SpamResult;
  profanityResult?: ProfanityResult;

  // Detected issues
  detectedIssues: string[];
  autoAction: "none" | "flag" | "hide" | "warn" | "mute" | "delete";
  autoActionReason?: string;

  // Confidence
  confidence: number;
}

export interface ModerationConfig {
  // Thresholds (0-1)
  toxicThreshold: number;
  nsfwThreshold: number;
  spamThreshold: number;
  profanityThreshold: number;

  // Auto actions
  autoFlag: boolean;
  autoHide: boolean;
  autoWarn: boolean;
  autoMute: boolean;

  // Custom word lists
  customBlockedWords?: string[];
  customAllowedWords?: string[];

  // Features
  enableToxicityDetection: boolean;
  enableNSFWDetection: boolean;
  enableSpamDetection: boolean;
  enableProfanityFilter: boolean;
}

export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  toxicThreshold: 0.7,
  nsfwThreshold: 0.7,
  spamThreshold: 0.6,
  profanityThreshold: 0.5,
  autoFlag: true,
  autoHide: false,
  autoWarn: false,
  autoMute: false,
  enableToxicityDetection: true,
  enableNSFWDetection: true,
  enableSpamDetection: true,
  enableProfanityFilter: true,
};

export class ModerationService {
  private config: ModerationConfig;
  private aiDetector = getAIDetector();
  private profanityFilter = getProfanityFilter();

  constructor(config: Partial<ModerationConfig> = {}) {
    this.config = { ...DEFAULT_MODERATION_CONFIG, ...config };

    // Update profanity filter with custom words
    if (config.customBlockedWords) {
      this.profanityFilter.addBlockedWords(config.customBlockedWords);
    }
    if (config.customAllowedWords) {
      this.profanityFilter.addAllowedWords(config.customAllowedWords);
    }
  }

  /**
   * Initialize AI models
   */
  async initialize(): Promise<void> {
    await this.aiDetector.initialize();
  }

  /**
   * Moderate text content
   */
  async moderateText(
    text: string,
    metadata?: {
      userId?: string;
      messageCount?: number;
      timeWindow?: number;
      hasLinks?: boolean;
      linkCount?: number;
    },
  ): Promise<ModerationResult> {
    const detectedIssues: string[] = [];
    let toxicScore = 0;
    let spamScore = 0;
    let profanityScore = 0;

    let toxicityResult: ToxicityResult | undefined;
    let spamResult: SpamResult | undefined;
    let profanityResult: ProfanityResult | undefined;

    // Run toxicity detection
    if (this.config.enableToxicityDetection) {
      toxicityResult = await this.aiDetector.detectToxicity(text);
      toxicScore = toxicityResult.toxicScore;

      if (toxicityResult.isToxic) {
        detectedIssues.push("Toxic content detected");
        detectedIssues.push(
          ...toxicityResult.detectedLabels.map((label) => `Toxicity: ${label}`),
        );
      }
    }

    // Run spam detection
    if (this.config.enableSpamDetection) {
      spamResult = await this.aiDetector.detectSpam(text, metadata);
      spamScore = spamResult.spamScore;

      if (spamResult.isSpam) {
        detectedIssues.push("Spam detected");
        detectedIssues.push(...spamResult.reasons);
      }
    }

    // Run profanity filter
    if (this.config.enableProfanityFilter) {
      profanityResult = this.profanityFilter.check(text);
      profanityScore = profanityResult.score;

      if (profanityResult.hasProfanity) {
        detectedIssues.push("Profanity detected");
        detectedIssues.push(
          `Profane words: ${profanityResult.detectedWords.join(", ")}`,
        );
      }
    }

    // Calculate overall score (weighted average)
    const weights = {
      toxic: 0.4,
      spam: 0.3,
      profanity: 0.3,
    };

    const overallScore =
      toxicScore * weights.toxic +
      spamScore * weights.spam +
      profanityScore * weights.profanity;

    // Determine actions based on scores and thresholds
    const shouldFlag =
      toxicScore >= this.config.toxicThreshold ||
      spamScore >= this.config.spamThreshold ||
      profanityScore >= this.config.profanityThreshold;

    const shouldHide = overallScore >= 0.8 || toxicScore >= 0.9;
    const shouldWarn = overallScore >= 0.7;
    const shouldMute = overallScore >= 0.9 || toxicScore >= 0.95;

    // Determine priority
    let priority: "low" | "medium" | "high" | "critical" = "low";
    if (overallScore >= 0.9) priority = "critical";
    else if (overallScore >= 0.7) priority = "high";
    else if (overallScore >= 0.5) priority = "medium";

    // Determine auto action
    let autoAction: ModerationResult["autoAction"] = "none";
    let autoActionReason: string | undefined;

    if (shouldMute && this.config.autoMute) {
      autoAction = "mute";
      autoActionReason = `Severe violations detected (score: ${overallScore.toFixed(2)})`;
    } else if (shouldHide && this.config.autoHide) {
      autoAction = "hide";
      autoActionReason = `High-risk content (score: ${overallScore.toFixed(2)})`;
    } else if (shouldWarn && this.config.autoWarn) {
      autoAction = "warn";
      autoActionReason = `Policy violations detected`;
    } else if (shouldFlag && this.config.autoFlag) {
      autoAction = "flag";
      autoActionReason = `Content flagged for review`;
    }

    // Calculate confidence (based on how many models agreed)
    const activeDetectors = [
      this.config.enableToxicityDetection,
      this.config.enableSpamDetection,
      this.config.enableProfanityFilter,
    ].filter(Boolean).length;

    const detectionsTriggered = [
      toxicityResult?.isToxic,
      spamResult?.isSpam,
      profanityResult?.hasProfanity,
    ].filter(Boolean).length;

    const confidence =
      activeDetectors > 0 ? detectionsTriggered / activeDetectors : 0;

    return {
      shouldFlag,
      shouldHide,
      shouldWarn,
      shouldMute,
      priority,
      toxicScore,
      nsfwScore: 0, // Not used for text
      spamScore,
      profanityScore,
      overallScore,
      toxicityResult,
      spamResult,
      profanityResult,
      detectedIssues,
      autoAction,
      autoActionReason,
      confidence,
    };
  }

  /**
   * Moderate image content
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    const detectedIssues: string[] = [];
    let nsfwScore = 0;

    let nsfwResult: NSFWResult | undefined;

    // Run NSFW detection
    if (this.config.enableNSFWDetection) {
      nsfwResult = await this.aiDetector.detectNSFW(imageUrl);
      nsfwScore = nsfwResult.nsfwScore;

      if (nsfwResult.isNSFW) {
        detectedIssues.push("NSFW content detected");
        detectedIssues.push(
          ...nsfwResult.detectedLabels.map((label) => `NSFW: ${label}`),
        );
      }
    }

    const overallScore = nsfwScore;
    const shouldFlag = nsfwScore >= this.config.nsfwThreshold;
    const shouldHide = nsfwScore >= 0.8;
    const shouldWarn = nsfwScore >= 0.7;
    const shouldMute = nsfwScore >= 0.9;

    // Determine priority
    let priority: "low" | "medium" | "high" | "critical" = "low";
    if (overallScore >= 0.9) priority = "critical";
    else if (overallScore >= 0.7) priority = "high";
    else if (overallScore >= 0.5) priority = "medium";

    // Determine auto action
    let autoAction: ModerationResult["autoAction"] = "none";
    let autoActionReason: string | undefined;

    if (shouldHide && this.config.autoHide) {
      autoAction = "hide";
      autoActionReason = `NSFW content detected (score: ${nsfwScore.toFixed(2)})`;
    } else if (shouldFlag && this.config.autoFlag) {
      autoAction = "flag";
      autoActionReason = `Image flagged for review`;
    }

    return {
      shouldFlag,
      shouldHide,
      shouldWarn,
      shouldMute,
      priority,
      toxicScore: 0,
      nsfwScore,
      spamScore: 0,
      profanityScore: 0,
      overallScore,
      nsfwResult,
      detectedIssues,
      autoAction,
      autoActionReason,
      confidence: nsfwScore, // Use NSFW score as confidence
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...config };

    // Update profanity filter if word lists changed
    if (config.customBlockedWords) {
      this.profanityFilter.addBlockedWords(config.customBlockedWords);
    }
    if (config.customAllowedWords) {
      this.profanityFilter.addAllowedWords(config.customAllowedWords);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.aiDetector.dispose();
  }
}

// Singleton instance
let moderationService: ModerationService | null = null;

export function getModerationService(
  config?: Partial<ModerationConfig>,
): ModerationService {
  if (!moderationService || config) {
    moderationService = new ModerationService(config);
  }
  return moderationService;
}
