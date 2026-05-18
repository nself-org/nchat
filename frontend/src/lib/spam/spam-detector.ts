/**
 * Spam Detector Service
 *
 * Provides heuristic and rule-based spam detection including:
 * - Repetitive message detection
 * - Link flooding detection
 * - Rapid-fire posting detection
 * - Keyword/regex pattern matching
 * - Domain blocklisting
 * - Caps lock spam detection
 * - Unicode abuse detection
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type SpamCategory =
  | "repetitive_content"
  | "link_flooding"
  | "rapid_fire"
  | "keyword_match"
  | "regex_match"
  | "blocked_domain"
  | "caps_spam"
  | "unicode_abuse"
  | "mention_spam"
  | "emoji_spam"
  | "zalgo_text"
  | "homoglyph";

export type SpamSeverity = "low" | "medium" | "high" | "critical";

export interface SpamRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: "keyword" | "regex" | "domain" | "custom";
  pattern: string;
  flags?: string; // Regex flags
  severity: SpamSeverity;
  category: SpamCategory;
  action: SpamAction;
  exemptRoles?: string[];
  exemptUsers?: string[];
  channelIds?: string[]; // null = all channels
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SpamAction =
  | "flag"
  | "delete"
  | "mute"
  | "timeout"
  | "ban"
  | "warn";

export interface SpamDetectionResult {
  isSpam: boolean;
  score: number; // 0-1
  categories: SpamCategory[];
  matchedRules: SpamRuleMatch[];
  heuristics: HeuristicMatch[];
  suggestedAction: SpamAction;
  severity: SpamSeverity;
  metadata: SpamMetadata;
}

export interface SpamRuleMatch {
  ruleId: string;
  ruleName: string;
  pattern: string;
  matchedText: string;
  severity: SpamSeverity;
  action: SpamAction;
}

export interface HeuristicMatch {
  category: SpamCategory;
  score: number;
  description: string;
  evidence: string[];
}

export interface SpamMetadata {
  messageLength: number;
  wordCount: number;
  linkCount: number;
  mentionCount: number;
  emojiCount: number;
  capsPercentage: number;
  unicodeAnomalyScore: number;
  repetitionScore: number;
  analysisTime: number;
}

export interface SpamDetectorConfig {
  // Heuristic thresholds
  repetitionThreshold: number; // 0-1, similarity threshold for repetition
  linkFloodThreshold: number; // Max links per message
  capsThreshold: number; // 0-1, max percentage of caps
  mentionThreshold: number; // Max mentions per message
  emojiThreshold: number; // Max emojis per message
  rapidFireThreshold: number; // Messages per minute
  rapidFireWindow: number; // Window in milliseconds
  minMessageLength: number; // Minimum length to analyze

  // Scoring weights
  weightRepetitive: number;
  weightLinkFlood: number;
  weightRapidFire: number;
  weightKeyword: number;
  weightCaps: number;
  weightUnicode: number;
  weightMention: number;

  // Sensitivity
  sensitivity: "low" | "medium" | "high";
  spamThreshold: number; // 0-1, score above which content is spam

  // Blocklists
  blockedDomains: string[];
  blockedKeywords: string[];

  // Allowlists
  trustedDomains: string[];
  trustedUsers: string[];
}

export const DEFAULT_SPAM_CONFIG: SpamDetectorConfig = {
  repetitionThreshold: 0.85,
  linkFloodThreshold: 5,
  capsThreshold: 0.7,
  mentionThreshold: 10,
  emojiThreshold: 20,
  rapidFireThreshold: 10,
  rapidFireWindow: 60000, // 1 minute
  minMessageLength: 3,

  weightRepetitive: 0.3,
  weightLinkFlood: 0.25,
  weightRapidFire: 0.2,
  weightKeyword: 0.35,
  weightCaps: 0.1,
  weightUnicode: 0.15,
  weightMention: 0.2,

  sensitivity: "medium",
  spamThreshold: 0.6,

  blockedDomains: [],
  blockedKeywords: [],

  trustedDomains: [],
  trustedUsers: [],
};

// Sensitivity presets
const SENSITIVITY_PRESETS: Record<
  "low" | "medium" | "high",
  Partial<SpamDetectorConfig>
> = {
  low: {
    spamThreshold: 0.75,
    repetitionThreshold: 0.95,
    linkFloodThreshold: 10,
    capsThreshold: 0.85,
  },
  medium: {
    spamThreshold: 0.6,
    repetitionThreshold: 0.85,
    linkFloodThreshold: 5,
    capsThreshold: 0.7,
  },
  high: {
    spamThreshold: 0.45,
    repetitionThreshold: 0.7,
    linkFloodThreshold: 3,
    capsThreshold: 0.5,
  },
};

// ============================================================================
// Message History Tracker
// ============================================================================

interface MessageEntry {
  userId: string;
  channelId: string;
  content: string;
  timestamp: number;
  hash: string;
}

class MessageHistoryTracker {
  private messageHistory: Map<string, MessageEntry[]> = new Map();
  private maxHistoryPerUser = 50;
  private historyRetentionMs = 3600000; // 1 hour

  addMessage(userId: string, channelId: string, content: string): void {
    const key = `${userId}:${channelId}`;
    const history = this.messageHistory.get(key) || [];

    history.push({
      userId,
      channelId,
      content,
      timestamp: Date.now(),
      hash: this.hashContent(content),
    });

    // Trim old messages
    const cutoff = Date.now() - this.historyRetentionMs;
    const filtered = history
      .filter((m) => m.timestamp > cutoff)
      .slice(-this.maxHistoryPerUser);

    this.messageHistory.set(key, filtered);
  }

  getRecentMessages(
    userId: string,
    channelId: string,
    windowMs: number,
  ): MessageEntry[] {
    const key = `${userId}:${channelId}`;
    const history = this.messageHistory.get(key) || [];
    const cutoff = Date.now() - windowMs;
    return history.filter((m) => m.timestamp > cutoff);
  }

  getMessageRate(userId: string, channelId: string, windowMs: number): number {
    const messages = this.getRecentMessages(userId, channelId, windowMs);
    return messages.length / (windowMs / 60000); // Messages per minute
  }

  getRepetitionCount(
    userId: string,
    channelId: string,
    contentHash: string,
    windowMs: number,
  ): number {
    const messages = this.getRecentMessages(userId, channelId, windowMs);
    return messages.filter((m) => m.hash === contentHash).length;
  }

  clearUserHistory(userId: string, channelId?: string): void {
    if (channelId) {
      this.messageHistory.delete(`${userId}:${channelId}`);
    } else {
      for (const key of this.messageHistory.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.messageHistory.delete(key);
        }
      }
    }
  }

  private hashContent(content: string): string {
    // Simple hash for content similarity
    const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

// ============================================================================
// Spam Detector Class
// ============================================================================

export class SpamDetector {
  private config: SpamDetectorConfig;
  private rules: Map<string, SpamRule> = new Map();
  private messageTracker: MessageHistoryTracker;
  private compiledRegexCache: Map<string, RegExp> = new Map();

  // Common spam patterns
  private static readonly URL_REGEX =
    /https?:\/\/(?:[-\w.])+(?::\d+)?(?:\/[^\s]*)?/gi;
  private static readonly MENTION_REGEX = /@[\w-]+/g;
  private static readonly EMOJI_REGEX =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  private static readonly ZALGO_REGEX =
    /[\u0300-\u036f\u0489\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;
  private static readonly HOMOGLYPH_REGEX =
    /[\u0430-\u044f\u0410-\u042f\u0391-\u03c9\u0400-\u04ff]/g; // Cyrillic/Greek mixed with Latin

  constructor(config: Partial<SpamDetectorConfig> = {}) {
    const sensitivity = config.sensitivity || "medium";
    this.config = {
      ...DEFAULT_SPAM_CONFIG,
      ...SENSITIVITY_PRESETS[sensitivity],
      ...config,
    };
    this.messageTracker = new MessageHistoryTracker();
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  updateConfig(config: Partial<SpamDetectorConfig>): void {
    if (config.sensitivity && config.sensitivity !== this.config.sensitivity) {
      this.config = {
        ...this.config,
        ...SENSITIVITY_PRESETS[config.sensitivity],
        ...config,
      };
    } else {
      this.config = { ...this.config, ...config };
    }
  }

  getConfig(): SpamDetectorConfig {
    return { ...this.config };
  }

  setSensitivity(sensitivity: "low" | "medium" | "high"): void {
    this.config = {
      ...this.config,
      ...SENSITIVITY_PRESETS[sensitivity],
      sensitivity,
    };
  }

  // ==========================================================================
  // Rule Management
  // ==========================================================================

  addRule(rule: SpamRule): void {
    this.rules.set(rule.id, rule);
    // Pre-compile regex if applicable
    if (rule.type === "regex") {
      try {
        const regex = new RegExp(rule.pattern, rule.flags || "gi");
        this.compiledRegexCache.set(rule.id, regex);
      } catch (e) {
        logger.error(`Invalid regex pattern for rule ${rule.id}:`, e);
      }
    }
  }

  removeRule(ruleId: string): boolean {
    this.compiledRegexCache.delete(ruleId);
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): SpamRule | undefined {
    return this.rules.get(ruleId);
  }

  getRules(workspaceId?: string): SpamRule[] {
    let rules = Array.from(this.rules.values()).filter((r) => r.enabled);
    if (workspaceId) {
      rules = rules.filter(
        (r) => !r.workspaceId || r.workspaceId === workspaceId,
      );
    }
    return rules;
  }

  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Blocklist Management
  // ==========================================================================

  addBlockedDomain(domain: string): void {
    const normalized = domain.toLowerCase().replace(/^www\./, "");
    if (!this.config.blockedDomains.includes(normalized)) {
      this.config.blockedDomains.push(normalized);
    }
  }

  removeBlockedDomain(domain: string): boolean {
    const normalized = domain.toLowerCase().replace(/^www\./, "");
    const index = this.config.blockedDomains.indexOf(normalized);
    if (index > -1) {
      this.config.blockedDomains.splice(index, 1);
      return true;
    }
    return false;
  }

  addBlockedKeyword(keyword: string): void {
    const normalized = keyword.toLowerCase();
    if (!this.config.blockedKeywords.includes(normalized)) {
      this.config.blockedKeywords.push(normalized);
    }
  }

  removeBlockedKeyword(keyword: string): boolean {
    const normalized = keyword.toLowerCase();
    const index = this.config.blockedKeywords.indexOf(normalized);
    if (index > -1) {
      this.config.blockedKeywords.splice(index, 1);
      return true;
    }
    return false;
  }

  addTrustedUser(userId: string): void {
    if (!this.config.trustedUsers.includes(userId)) {
      this.config.trustedUsers.push(userId);
    }
  }

  removeTrustedUser(userId: string): boolean {
    const index = this.config.trustedUsers.indexOf(userId);
    if (index > -1) {
      this.config.trustedUsers.splice(index, 1);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Main Detection Methods
  // ==========================================================================

  /**
   * Analyzes message content for spam
   */
  analyze(
    content: string,
    context: {
      userId: string;
      channelId: string;
      userRole?: string;
      workspaceId?: string;
    },
  ): SpamDetectionResult {
    const startTime = Date.now();

    // Skip analysis for trusted users
    if (this.config.trustedUsers.includes(context.userId)) {
      return this.createCleanResult(content, startTime);
    }

    // Skip very short messages
    if (content.length < this.config.minMessageLength) {
      return this.createCleanResult(content, startTime);
    }

    const categories: SpamCategory[] = [];
    const matchedRules: SpamRuleMatch[] = [];
    const heuristics: HeuristicMatch[] = [];
    let totalScore = 0;

    // Collect metadata
    const metadata = this.collectMetadata(content);

    // Run heuristic checks
    const heuristicResults = this.runHeuristics(content, metadata, context);
    for (const result of heuristicResults) {
      if (result.score > 0) {
        heuristics.push(result);
        categories.push(result.category);
        totalScore += result.score;
      }
    }

    // Run rule-based checks
    const ruleResults = this.runRuleChecks(content, context);
    for (const result of ruleResults) {
      matchedRules.push(result);
      categories.push(
        this.ruleTypeToCategory(
          this.rules.get(result.ruleId)?.type || "custom",
        ),
      );
      totalScore +=
        this.severityToScore(result.severity) * this.config.weightKeyword;
    }

    // Check blocked domains
    const domainMatches = this.checkBlockedDomains(content);
    for (const match of domainMatches) {
      matchedRules.push(match);
      categories.push("blocked_domain");
      totalScore += 0.8; // High weight for blocked domains
    }

    // Check blocked keywords
    const keywordMatches = this.checkBlockedKeywords(content);
    for (const match of keywordMatches) {
      matchedRules.push(match);
      categories.push("keyword_match");
      totalScore += 0.6;
    }

    // Normalize score
    const normalizedScore = Math.min(1, totalScore);

    // Determine if spam
    const isSpam = normalizedScore >= this.config.spamThreshold;

    // Calculate severity and suggested action
    const severity = this.calculateSeverity(normalizedScore, matchedRules);
    const suggestedAction = this.determineSuggestedAction(
      severity,
      matchedRules,
    );

    // Track message for history
    this.messageTracker.addMessage(context.userId, context.channelId, content);

    const result: SpamDetectionResult = {
      isSpam,
      score: normalizedScore,
      categories: [...new Set(categories)],
      matchedRules,
      heuristics,
      suggestedAction,
      severity,
      metadata: {
        ...metadata,
        analysisTime: Date.now() - startTime,
      },
    };

    if (isSpam) {
      logger.info("Spam detected", {
        userId: context.userId,
        score: normalizedScore,
        categories: result.categories,
      });
    }

    return result;
  }

  /**
   * Quick check without full analysis
   */
  quickCheck(content: string): boolean {
    // Check blocked keywords
    const lowerContent = content.toLowerCase();
    for (const keyword of this.config.blockedKeywords) {
      if (lowerContent.includes(keyword)) return true;
    }

    // Check excessive caps
    const caps = this.calculateCapsPercentage(content);
    if (caps > this.config.capsThreshold && content.length > 10) return true;

    // Check link flooding
    const links = content.match(SpamDetector.URL_REGEX) || [];
    if (links.length > this.config.linkFloodThreshold) return true;

    // Check blocked domains
    for (const link of links) {
      const domain = this.extractDomain(link);
      if (domain && this.config.blockedDomains.includes(domain)) return true;
    }

    return false;
  }

  /**
   * Checks for rapid-fire posting
   */
  checkRapidFire(userId: string, channelId: string): HeuristicMatch | null {
    const rate = this.messageTracker.getMessageRate(
      userId,
      channelId,
      this.config.rapidFireWindow,
    );

    if (rate > this.config.rapidFireThreshold) {
      return {
        category: "rapid_fire",
        score: Math.min(1, (rate - this.config.rapidFireThreshold) / 10),
        description: `User is posting ${rate.toFixed(1)} messages per minute`,
        evidence: [`Rate: ${rate.toFixed(1)} msg/min`],
      };
    }
    return null;
  }

  /**
   * Checks for repetitive content
   */
  checkRepetition(
    content: string,
    userId: string,
    channelId: string,
  ): HeuristicMatch | null {
    const hash = this.hashContent(content);
    const repetitions = this.messageTracker.getRepetitionCount(
      userId,
      channelId,
      hash,
      this.config.rapidFireWindow * 5, // 5 minute window
    );

    if (repetitions > 2) {
      return {
        category: "repetitive_content",
        score: Math.min(1, (repetitions - 2) / 5),
        description: `Message repeated ${repetitions} times recently`,
        evidence: [`Repetitions: ${repetitions}`],
      };
    }
    return null;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private createCleanResult(
    content: string,
    startTime: number,
  ): SpamDetectionResult {
    return {
      isSpam: false,
      score: 0,
      categories: [],
      matchedRules: [],
      heuristics: [],
      suggestedAction: "flag",
      severity: "low",
      metadata: {
        ...this.collectMetadata(content),
        analysisTime: Date.now() - startTime,
      },
    };
  }

  private collectMetadata(content: string): Omit<SpamMetadata, "analysisTime"> {
    const links = content.match(SpamDetector.URL_REGEX) || [];
    const mentions = content.match(SpamDetector.MENTION_REGEX) || [];
    const emojis = content.match(SpamDetector.EMOJI_REGEX) || [];

    return {
      messageLength: content.length,
      wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
      linkCount: links.length,
      mentionCount: mentions.length,
      emojiCount: emojis.length,
      capsPercentage: this.calculateCapsPercentage(content),
      unicodeAnomalyScore: this.calculateUnicodeAnomalyScore(content),
      repetitionScore: this.calculateInternalRepetition(content),
    };
  }

  private runHeuristics(
    content: string,
    metadata: Omit<SpamMetadata, "analysisTime">,
    context: { userId: string; channelId: string },
  ): HeuristicMatch[] {
    const results: HeuristicMatch[] = [];

    // Link flooding check
    if (metadata.linkCount > this.config.linkFloodThreshold) {
      results.push({
        category: "link_flooding",
        score:
          Math.min(
            1,
            (metadata.linkCount - this.config.linkFloodThreshold) / 5,
          ) * this.config.weightLinkFlood,
        description: `Message contains ${metadata.linkCount} links`,
        evidence: [`Link count: ${metadata.linkCount}`],
      });
    }

    // Caps spam check
    if (
      metadata.capsPercentage > this.config.capsThreshold &&
      content.length > 10
    ) {
      results.push({
        category: "caps_spam",
        score:
          (metadata.capsPercentage - this.config.capsThreshold) *
          this.config.weightCaps,
        description: `${(metadata.capsPercentage * 100).toFixed(0)}% caps`,
        evidence: [`Caps: ${(metadata.capsPercentage * 100).toFixed(0)}%`],
      });
    }

    // Mention spam check
    if (metadata.mentionCount > this.config.mentionThreshold) {
      results.push({
        category: "mention_spam",
        score:
          Math.min(
            1,
            (metadata.mentionCount - this.config.mentionThreshold) / 10,
          ) * this.config.weightMention,
        description: `Message contains ${metadata.mentionCount} mentions`,
        evidence: [`Mentions: ${metadata.mentionCount}`],
      });
    }

    // Emoji spam check
    if (metadata.emojiCount > this.config.emojiThreshold) {
      results.push({
        category: "emoji_spam",
        score: Math.min(
          1,
          (metadata.emojiCount - this.config.emojiThreshold) / 20,
        ),
        description: `Message contains ${metadata.emojiCount} emojis`,
        evidence: [`Emojis: ${metadata.emojiCount}`],
      });
    }

    // Unicode anomaly check
    if (metadata.unicodeAnomalyScore > 0.3) {
      const category: SpamCategory =
        metadata.unicodeAnomalyScore > 0.6 ? "zalgo_text" : "unicode_abuse";
      results.push({
        category,
        score: metadata.unicodeAnomalyScore * this.config.weightUnicode,
        description: `Unicode anomaly detected`,
        evidence: [`Score: ${metadata.unicodeAnomalyScore.toFixed(2)}`],
      });
    }

    // Repetition check (internal to message)
    if (metadata.repetitionScore > this.config.repetitionThreshold) {
      results.push({
        category: "repetitive_content",
        score:
          (metadata.repetitionScore - this.config.repetitionThreshold) *
          this.config.weightRepetitive,
        description: `High internal repetition`,
        evidence: [`Score: ${metadata.repetitionScore.toFixed(2)}`],
      });
    }

    // Rapid fire check
    const rapidFireMatch = this.checkRapidFire(
      context.userId,
      context.channelId,
    );
    if (rapidFireMatch) {
      rapidFireMatch.score *= this.config.weightRapidFire;
      results.push(rapidFireMatch);
    }

    // Cross-message repetition check
    const repetitionMatch = this.checkRepetition(
      content,
      context.userId,
      context.channelId,
    );
    if (repetitionMatch) {
      repetitionMatch.score *= this.config.weightRepetitive;
      results.push(repetitionMatch);
    }

    return results;
  }

  private runRuleChecks(
    content: string,
    context: { workspaceId?: string; userRole?: string },
  ): SpamRuleMatch[] {
    const results: SpamRuleMatch[] = [];
    const rules = this.getRules(context.workspaceId);

    for (const rule of rules) {
      // Check exemptions
      if (context.userRole && rule.exemptRoles?.includes(context.userRole)) {
        continue;
      }

      let match: RegExpMatchArray | null = null;
      let matchedText = "";

      switch (rule.type) {
        case "keyword":
          if (content.toLowerCase().includes(rule.pattern.toLowerCase())) {
            matchedText = rule.pattern;
            match = [rule.pattern] as unknown as RegExpMatchArray;
          }
          break;

        case "regex":
          const regex =
            this.compiledRegexCache.get(rule.id) ||
            new RegExp(rule.pattern, rule.flags || "gi");
          match = content.match(regex);
          if (match) {
            matchedText = match[0];
          }
          break;

        case "domain":
          const links = content.match(SpamDetector.URL_REGEX) || [];
          for (const link of links) {
            const domain = this.extractDomain(link);
            if (
              domain &&
              domain.toLowerCase().includes(rule.pattern.toLowerCase())
            ) {
              matchedText = link;
              match = [link] as unknown as RegExpMatchArray;
              break;
            }
          }
          break;
      }

      if (match) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          pattern: rule.pattern,
          matchedText,
          severity: rule.severity,
          action: rule.action,
        });
      }
    }

    return results;
  }

  private checkBlockedDomains(content: string): SpamRuleMatch[] {
    const results: SpamRuleMatch[] = [];
    const links = content.match(SpamDetector.URL_REGEX) || [];

    for (const link of links) {
      const domain = this.extractDomain(link);
      if (domain && this.config.blockedDomains.includes(domain.toLowerCase())) {
        results.push({
          ruleId: `blocked-domain-${domain}`,
          ruleName: "Blocked Domain",
          pattern: domain,
          matchedText: link,
          severity: "high",
          action: "delete",
        });
      }
    }

    return results;
  }

  private checkBlockedKeywords(content: string): SpamRuleMatch[] {
    const results: SpamRuleMatch[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of this.config.blockedKeywords) {
      if (lowerContent.includes(keyword)) {
        results.push({
          ruleId: `blocked-keyword-${keyword}`,
          ruleName: "Blocked Keyword",
          pattern: keyword,
          matchedText: keyword,
          severity: "medium",
          action: "flag",
        });
      }
    }

    return results;
  }

  private calculateCapsPercentage(content: string): number {
    const letters = content.replace(/[^a-zA-Z]/g, "");
    if (letters.length === 0) return 0;
    const caps = letters.replace(/[^A-Z]/g, "");
    return caps.length / letters.length;
  }

  private calculateUnicodeAnomalyScore(content: string): number {
    let score = 0;

    // Check for Zalgo text
    const zalgoMatches = content.match(SpamDetector.ZALGO_REGEX) || [];
    score += Math.min(0.5, zalgoMatches.length * 0.1);

    // Check for homoglyphs (mixed scripts)
    const homoglyphMatches = content.match(SpamDetector.HOMOGLYPH_REGEX) || [];
    const latinMatches = content.match(/[a-zA-Z]/g) || [];
    if (homoglyphMatches.length > 0 && latinMatches.length > 0) {
      score += 0.3;
    }

    // Check for invisible characters
    const invisibleChars =
      content.match(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g) || [];
    score += Math.min(0.3, invisibleChars.length * 0.05);

    return Math.min(1, score);
  }

  private calculateInternalRepetition(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    if (words.length < 5) return 0;

    // Count word frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 2) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Calculate repetition score
    let repetitionScore = 0;
    for (const count of wordCounts.values()) {
      if (count > 2) {
        repetitionScore += (count - 2) / words.length;
      }
    }

    // Check for repeated phrases (n-grams)
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }

    const bigramCounts = new Map<string, number>();
    for (const bigram of bigrams) {
      bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
    }

    for (const count of bigramCounts.values()) {
      if (count > 2) {
        repetitionScore += (count - 2) / bigrams.length;
      }
    }

    return Math.min(1, repetitionScore);
  }

  private extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      // Try simple extraction for malformed URLs
      const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
      return match ? match[1].replace(/^www\./, "") : null;
    }
  }

  private hashContent(content: string): string {
    const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private ruleTypeToCategory(type: string): SpamCategory {
    switch (type) {
      case "keyword":
        return "keyword_match";
      case "regex":
        return "regex_match";
      case "domain":
        return "blocked_domain";
      default:
        return "keyword_match";
    }
  }

  private severityToScore(severity: SpamSeverity): number {
    switch (severity) {
      case "critical":
        return 1.0;
      case "high":
        return 0.8;
      case "medium":
        return 0.5;
      case "low":
        return 0.3;
    }
  }

  private calculateSeverity(
    score: number,
    matchedRules: SpamRuleMatch[],
  ): SpamSeverity {
    // Check if any rules have explicit high/critical severity
    for (const rule of matchedRules) {
      if (rule.severity === "critical") return "critical";
    }
    for (const rule of matchedRules) {
      if (rule.severity === "high") return "high";
    }

    // Otherwise base on score
    if (score >= 0.9) return "critical";
    if (score >= 0.75) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  private determineSuggestedAction(
    severity: SpamSeverity,
    matchedRules: SpamRuleMatch[],
  ): SpamAction {
    // If rules specify an action, use the most severe
    const actionOrder: SpamAction[] = [
      "ban",
      "timeout",
      "mute",
      "delete",
      "warn",
      "flag",
    ];
    for (const action of actionOrder) {
      if (matchedRules.some((r) => r.action === action)) {
        return action;
      }
    }

    // Otherwise base on severity
    switch (severity) {
      case "critical":
        return "timeout";
      case "high":
        return "delete";
      case "medium":
        return "warn";
      case "low":
        return "flag";
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  clearHistory(userId?: string): void {
    if (userId) {
      this.messageTracker.clearUserHistory(userId);
    } else {
      this.messageTracker = new MessageHistoryTracker();
    }
  }

  clearRules(): void {
    this.rules.clear();
    this.compiledRegexCache.clear();
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let detectorInstance: SpamDetector | null = null;

export function getSpamDetector(
  config?: Partial<SpamDetectorConfig>,
): SpamDetector {
  if (!detectorInstance || config) {
    detectorInstance = new SpamDetector(config);
  }
  return detectorInstance;
}

export function createSpamDetector(
  config?: Partial<SpamDetectorConfig>,
): SpamDetector {
  return new SpamDetector(config);
}
