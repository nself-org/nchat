/**
 * ML-Powered Spam Detector
 * Pattern-based spam detection with user behavior analysis
 */

export interface SpamAnalysis {
  isSpam: boolean;
  spamScore: number;
  confidence: number;

  // Detected spam types
  spamTypes: Array<
    | "link_spam"
    | "promotional"
    | "repetitive"
    | "excessive_caps"
    | "excessive_punctuation"
    | "shortened_urls"
    | "suspicious_patterns"
    | "flooding"
    | "duplicate_content"
  >;

  // Detailed reasons
  reasons: string[];

  // Pattern matches
  patterns: {
    linkCount: number;
    shortenedUrls: number;
    capsRatio: number;
    punctuationRatio: number;
    repetitiveChars: number;
    spamPhrases: string[];
  };

  // User behavior signals
  userBehavior?: {
    messageRate: number;
    duplicateMessages: number;
    accountAge: number; // days
    trustScore: number;
  };
}

export interface SpamDetectorConfig {
  // Thresholds
  linkSpamThreshold: number;
  promotionalThreshold: number;
  capsRatioThreshold: number;
  punctuationRatioThreshold: number;
  messageRateThreshold: number; // messages per minute

  // Limits
  maxLinksPerMessage: number;
  maxConsecutiveMessages: number;
  maxDuplicateMessages: number;

  // Patterns
  enableLinkDetection: boolean;
  enablePromotionalDetection: boolean;
  enableFloodDetection: boolean;
  enableDuplicateDetection: boolean;

  // Whitelist
  whitelistedDomains: string[];
  trustedUsers: string[];
}

export const DEFAULT_SPAM_CONFIG: SpamDetectorConfig = {
  linkSpamThreshold: 0.6,
  promotionalThreshold: 0.7,
  capsRatioThreshold: 0.7,
  punctuationRatioThreshold: 0.3,
  messageRateThreshold: 10, // 10 messages per minute

  maxLinksPerMessage: 3,
  maxConsecutiveMessages: 5,
  maxDuplicateMessages: 3,

  enableLinkDetection: true,
  enablePromotionalDetection: true,
  enableFloodDetection: true,
  enableDuplicateDetection: true,

  whitelistedDomains: [
    "github.com",
    "gitlab.com",
    "stackoverflow.com",
    "docs.google.com",
    "drive.google.com",
    "dropbox.com",
  ],
  trustedUsers: [],
};

interface UserMessageHistory {
  userId: string;
  recentMessages: Array<{
    content: string;
    timestamp: number;
  }>;
  messageCount: number;
  firstMessageAt: number;
  lastMessageAt: number;
}

export class SpamDetectorML {
  private config: SpamDetectorConfig;
  private userHistory = new Map<string, UserMessageHistory>();
  private historyTTL = 60 * 60 * 1000; // 1 hour

  // Spam phrase patterns
  private spamPhrases = [
    // Sales/Marketing
    "click here",
    "buy now",
    "limited time",
    "special offer",
    "act now",
    "limited offer",
    "exclusive deal",
    "order now",
    "call now",
    "visit now",

    // Money/Financial
    "make money",
    "earn money",
    "free money",
    "get paid",
    "work from home",
    "easy money",
    "quick cash",
    "fast cash",
    "income opportunity",

    // Prizes/Giveaways
    "you won",
    "you've won",
    "congratulations you",
    "claim your",
    "free gift",
    "claim now",
    "winner",

    // Urgency
    "expires soon",
    "hurry",
    "don't miss",
    "last chance",
    "today only",
    "limited time only",

    // Crypto/Investment
    "crypto",
    "bitcoin",
    "investment opportunity",
    "guaranteed returns",
    "passive income",
  ];

  // Promotional keywords
  private promotionalKeywords = [
    "discount",
    "coupon",
    "promo code",
    "sale",
    "deal",
    "offer",
    "subscribe",
    "sign up",
    "register",
    "download",
  ];

  constructor(config: Partial<SpamDetectorConfig> = {}) {
    this.config = { ...DEFAULT_SPAM_CONFIG, ...config };
  }

  /**
   * Analyze text for spam
   */
  async analyze(
    text: string,
    metadata?: {
      userId?: string;
      hasAttachments?: boolean;
      attachmentCount?: number;
      accountAge?: number;
      trustScore?: number;
    },
  ): Promise<SpamAnalysis> {
    const spamTypes: SpamAnalysis["spamTypes"] = [];
    const reasons: string[] = [];
    let spamScore = 0;

    // Extract patterns
    const patterns = this.extractPatterns(text);

    // 1. Link spam detection
    if (this.config.enableLinkDetection) {
      const linkSpamResult = this.detectLinkSpam(text, patterns);
      if (linkSpamResult.isSpam) {
        spamTypes.push("link_spam");
        reasons.push(...linkSpamResult.reasons);
        spamScore += linkSpamResult.score;
      }
    }

    // 2. Promotional content detection
    if (this.config.enablePromotionalDetection) {
      const promotionalResult = this.detectPromotional(text, patterns);
      if (promotionalResult.isSpam) {
        spamTypes.push("promotional");
        reasons.push(...promotionalResult.reasons);
        spamScore += promotionalResult.score;
      }
    }

    // 3. Repetitive content detection
    const repetitiveResult = this.detectRepetitive(text, patterns);
    if (repetitiveResult.isSpam) {
      spamTypes.push("repetitive");
      reasons.push(...repetitiveResult.reasons);
      spamScore += repetitiveResult.score;
    }

    // 4. Excessive caps detection
    const capsResult = this.detectExcessiveCaps(text, patterns);
    if (capsResult.isSpam) {
      spamTypes.push("excessive_caps");
      reasons.push(...capsResult.reasons);
      spamScore += capsResult.score;
    }

    // 5. Excessive punctuation detection
    const punctuationResult = this.detectExcessivePunctuation(text, patterns);
    if (punctuationResult.isSpam) {
      spamTypes.push("excessive_punctuation");
      reasons.push(...punctuationResult.reasons);
      spamScore += punctuationResult.score;
    }

    // 6. Shortened URLs detection
    if (patterns.shortenedUrls > 0) {
      spamTypes.push("shortened_urls");
      reasons.push(`Shortened URLs detected: ${patterns.shortenedUrls}`);
      spamScore += 0.3;
    }

    // 7. User behavior analysis
    let userBehavior: SpamAnalysis["userBehavior"] | undefined;
    if (metadata?.userId) {
      userBehavior = this.analyzeUserBehavior(
        metadata.userId,
        text,
        metadata.accountAge,
        metadata.trustScore,
      );

      if (
        this.config.enableFloodDetection &&
        userBehavior.messageRate > this.config.messageRateThreshold
      ) {
        spamTypes.push("flooding");
        reasons.push(
          `High message rate: ${userBehavior.messageRate.toFixed(1)} msgs/min`,
        );
        spamScore += 0.4;
      }

      if (
        this.config.enableDuplicateDetection &&
        userBehavior.duplicateMessages >= this.config.maxDuplicateMessages
      ) {
        spamTypes.push("duplicate_content");
        reasons.push(`Duplicate messages: ${userBehavior.duplicateMessages}`);
        spamScore += 0.3;
      }

      // Account age penalty
      if (userBehavior.accountAge < 1) {
        spamScore += 0.1;
        reasons.push("New account (< 1 day)");
      }

      // Trust score adjustment
      if (userBehavior.trustScore < 50) {
        spamScore += 0.1;
        reasons.push("Low trust score");
      }
    }

    // Normalize spam score (0-1)
    spamScore = Math.min(spamScore, 1);

    // Calculate confidence
    const confidence = this.calculateConfidence(
      spamTypes.length,
      patterns,
      userBehavior,
    );

    const isSpam = spamScore >= this.config.linkSpamThreshold;

    return {
      isSpam,
      spamScore,
      confidence,
      spamTypes,
      reasons,
      patterns,
      userBehavior,
    };
  }

  /**
   * Extract patterns from text
   */
  private extractPatterns(text: string): SpamAnalysis["patterns"] {
    // Link detection
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const links = text.match(urlRegex) || [];
    const linkCount = links.length;

    // Shortened URL detection
    const shortenedUrlRegex =
      /(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|short\.link|tiny\.cc|is\.gd|buff\.ly)/gi;
    const shortenedUrls = (text.match(shortenedUrlRegex) || []).length;

    // Caps ratio
    const upperChars = (text.match(/[A-Z]/g) || []).length;
    const totalChars = text.replace(/\s/g, "").length;
    const capsRatio = totalChars > 0 ? upperChars / totalChars : 0;

    // Punctuation ratio
    const punctuation = (text.match(/[!?.,;:]/g) || []).length;
    const punctuationRatio = text.length > 0 ? punctuation / text.length : 0;

    // Repetitive characters
    const repetitiveRegex = /(.)\1{4,}/g;
    const repetitiveMatches = text.match(repetitiveRegex) || [];
    const repetitiveChars = repetitiveMatches.length;

    // Spam phrases
    const lowerText = text.toLowerCase();
    const spamPhrases = this.spamPhrases.filter((phrase) =>
      lowerText.includes(phrase),
    );

    return {
      linkCount,
      shortenedUrls,
      capsRatio,
      punctuationRatio,
      repetitiveChars,
      spamPhrases,
    };
  }

  /**
   * Detect link spam
   */
  private detectLinkSpam(
    text: string,
    patterns: SpamAnalysis["patterns"],
  ): { isSpam: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Too many links
    if (patterns.linkCount > this.config.maxLinksPerMessage) {
      reasons.push(`Excessive links: ${patterns.linkCount}`);
      score += 0.4;
    }

    // Check if links are whitelisted
    const urlRegex = /(https?:\/\/([^\s/]+)[^\s]*)/gi;
    const matches = [...text.matchAll(urlRegex)];
    const nonWhitelistedLinks = matches.filter((match) => {
      const domain = match[2];
      return !this.config.whitelistedDomains.some((wd) => domain.includes(wd));
    });

    if (
      nonWhitelistedLinks.length > 0 &&
      nonWhitelistedLinks.length === patterns.linkCount
    ) {
      score += 0.2;
      reasons.push("Non-whitelisted domains");
    }

    // Link-to-text ratio
    const textWithoutLinks = text.replace(urlRegex, "").trim();
    if (textWithoutLinks.length < 20 && patterns.linkCount > 0) {
      score += 0.3;
      reasons.push("High link-to-text ratio");
    }

    return {
      isSpam: score >= this.config.linkSpamThreshold,
      score,
      reasons,
    };
  }

  /**
   * Detect promotional content
   */
  private detectPromotional(
    text: string,
    patterns: SpamAnalysis["patterns"],
  ): { isSpam: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const lowerText = text.toLowerCase();

    // Spam phrases
    if (patterns.spamPhrases.length > 0) {
      score += Math.min(patterns.spamPhrases.length * 0.2, 0.6);
      reasons.push(
        `Spam phrases: ${patterns.spamPhrases.slice(0, 3).join(", ")}`,
      );
    }

    // Promotional keywords
    const promotionalMatches = this.promotionalKeywords.filter((kw) =>
      lowerText.includes(kw),
    );
    if (promotionalMatches.length >= 2) {
      score += 0.3;
      reasons.push(
        `Promotional keywords: ${promotionalMatches.slice(0, 3).join(", ")}`,
      );
    }

    // Call-to-action patterns
    const ctaPatterns = [
      /click (here|now|below)/i,
      /(buy|order|subscribe|register|sign up) (now|today|here)/i,
      /visit (our|my|the) (website|store|shop)/i,
    ];

    for (const pattern of ctaPatterns) {
      if (pattern.test(text)) {
        score += 0.2;
        reasons.push("Call-to-action detected");
        break;
      }
    }

    return {
      isSpam: score >= this.config.promotionalThreshold,
      score,
      reasons,
    };
  }

  /**
   * Detect repetitive content
   */
  private detectRepetitive(
    text: string,
    patterns: SpamAnalysis["patterns"],
  ): { isSpam: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (patterns.repetitiveChars > 0) {
      score += Math.min(patterns.repetitiveChars * 0.15, 0.4);
      reasons.push(`Repetitive characters: ${patterns.repetitiveChars}`);
    }

    // Repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      if (word.length > 3) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    const repeatedWords = Array.from(wordCounts.entries()).filter(
      ([_, count]) => count >= 3,
    );
    if (repeatedWords.length > 0) {
      score += 0.2;
      reasons.push(
        `Repeated words: ${repeatedWords
          .map(([w]) => w)
          .slice(0, 3)
          .join(", ")}`,
      );
    }

    return {
      isSpam: score >= 0.5,
      score,
      reasons,
    };
  }

  /**
   * Detect excessive caps
   */
  private detectExcessiveCaps(
    text: string,
    patterns: SpamAnalysis["patterns"],
  ): { isSpam: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (
      patterns.capsRatio >= this.config.capsRatioThreshold &&
      text.length > 10
    ) {
      score = patterns.capsRatio;
      reasons.push(
        `Excessive capitalization: ${(patterns.capsRatio * 100).toFixed(0)}%`,
      );
    }

    return {
      isSpam: score >= this.config.capsRatioThreshold,
      score,
      reasons,
    };
  }

  /**
   * Detect excessive punctuation
   */
  private detectExcessivePunctuation(
    text: string,
    patterns: SpamAnalysis["patterns"],
  ): { isSpam: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (patterns.punctuationRatio >= this.config.punctuationRatioThreshold) {
      score = patterns.punctuationRatio;
      reasons.push(
        `Excessive punctuation: ${(patterns.punctuationRatio * 100).toFixed(0)}%`,
      );
    }

    // Check for emoji spam
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
    const emojiMatches = text.match(emojiRegex) || [];
    if (emojiMatches.length > 10) {
      score += 0.2;
      reasons.push(`Excessive emojis: ${emojiMatches.length}`);
    }

    return {
      isSpam: score >= this.config.punctuationRatioThreshold,
      score,
      reasons,
    };
  }

  /**
   * Analyze user behavior
   */
  private analyzeUserBehavior(
    userId: string,
    currentMessage: string,
    accountAge?: number,
    trustScore?: number,
  ): NonNullable<SpamAnalysis["userBehavior"]> {
    const now = Date.now();

    // Get or create user history
    let history = this.userHistory.get(userId);
    if (!history) {
      history = {
        userId,
        recentMessages: [],
        messageCount: 0,
        firstMessageAt: now,
        lastMessageAt: now,
      };
    }

    // Add current message
    history.recentMessages.push({
      content: currentMessage,
      timestamp: now,
    });
    history.messageCount++;
    history.lastMessageAt = now;

    // Clean old messages (keep last hour)
    history.recentMessages = history.recentMessages.filter(
      (m) => now - m.timestamp < this.historyTTL,
    );

    // Calculate message rate (messages per minute)
    const timeWindow = now - history.firstMessageAt;
    const messageRate =
      timeWindow > 0 ? (history.messageCount / timeWindow) * 60 * 1000 : 0;

    // Count duplicate messages
    const duplicateMessages =
      history.recentMessages.filter((m) => m.content === currentMessage)
        .length - 1; // Exclude current message

    // Update history
    this.userHistory.set(userId, history);

    return {
      messageRate,
      duplicateMessages,
      accountAge: accountAge || 0,
      trustScore: trustScore || 100,
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    spamTypeCount: number,
    patterns: SpamAnalysis["patterns"],
    userBehavior?: SpamAnalysis["userBehavior"],
  ): number {
    let confidence = 0;

    // More spam types = higher confidence
    confidence += Math.min(spamTypeCount / 5, 0.4);

    // Strong patterns = higher confidence
    if (patterns.spamPhrases.length > 0) confidence += 0.2;
    if (patterns.linkCount > this.config.maxLinksPerMessage) confidence += 0.2;

    // User behavior signals
    if (userBehavior) {
      if (userBehavior.messageRate > this.config.messageRateThreshold)
        confidence += 0.1;
      if (userBehavior.duplicateMessages >= this.config.maxDuplicateMessages)
        confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SpamDetectorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): SpamDetectorConfig {
    return { ...this.config };
  }

  /**
   * Clear user history
   */
  clearUserHistory(userId?: string): void {
    if (userId) {
      this.userHistory.delete(userId);
    } else {
      this.userHistory.clear();
    }
  }

  /**
   * Cleanup old history entries
   */
  cleanupHistory(): void {
    const now = Date.now();
    for (const [userId, history] of this.userHistory.entries()) {
      if (now - history.lastMessageAt > this.historyTTL) {
        this.userHistory.delete(userId);
      }
    }
  }
}

// Singleton instance
let spamDetectorML: SpamDetectorML | null = null;

export function getSpamDetectorML(
  config?: Partial<SpamDetectorConfig>,
): SpamDetectorML {
  if (!spamDetectorML || config) {
    spamDetectorML = new SpamDetectorML(config);
  }
  return spamDetectorML;
}
