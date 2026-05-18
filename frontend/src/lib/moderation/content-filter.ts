/**
 * Content Filter - Handles content filtering for moderation
 *
 * Provides profanity filtering, spam detection, link filtering, and regex pattern matching
 */

// ============================================================================
// Types
// ============================================================================

export type FilterRuleType = "word" | "regex" | "link" | "spam";
export type FilterAction = "block" | "flag" | "warn" | "allow";

export interface FilterRule {
  id: string;
  type: FilterRuleType;
  pattern: string;
  action: FilterAction;
  enabled: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FilterMatch {
  ruleId: string;
  type: FilterRuleType;
  pattern: string;
  match: string;
  position: number;
  length: number;
  action: FilterAction;
}

export interface FilterResult {
  passed: boolean;
  matches: FilterMatch[];
  action: FilterAction;
  reason?: string;
  filteredContent?: string;
}

export interface SpamConfig {
  maxCapsPercent: number;
  maxRepeatedChars: number;
  maxRepeatedWords: number;
  maxLinks: number;
  maxEmojis: number;
  minMessageInterval: number;
  maxDuplicateMessages: number;
}

export interface LinkFilterConfig {
  allowedDomains: string[];
  blockedDomains: string[];
  blockAllLinks: boolean;
  allowWhitelistedOnly: boolean;
}

export interface ContentFilterConfig {
  profanityEnabled: boolean;
  spamEnabled: boolean;
  linkEnabled: boolean;
  regexEnabled: boolean;
  rules: FilterRule[];
  spamConfig: SpamConfig;
  linkConfig: LinkFilterConfig;
  defaultAction: FilterAction;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_SPAM_CONFIG: SpamConfig = {
  maxCapsPercent: 70,
  maxRepeatedChars: 5,
  maxRepeatedWords: 3,
  maxLinks: 5,
  maxEmojis: 20,
  minMessageInterval: 500,
  maxDuplicateMessages: 3,
};

export const DEFAULT_LINK_CONFIG: LinkFilterConfig = {
  allowedDomains: [],
  blockedDomains: [],
  blockAllLinks: false,
  allowWhitelistedOnly: false,
};

export const DEFAULT_FILTER_CONFIG: ContentFilterConfig = {
  profanityEnabled: true,
  spamEnabled: true,
  linkEnabled: true,
  regexEnabled: true,
  rules: [],
  spamConfig: DEFAULT_SPAM_CONFIG,
  linkConfig: DEFAULT_LINK_CONFIG,
  defaultAction: "block",
};

// ============================================================================
// Built-in Profanity List (Common words - can be extended)
// ============================================================================

const BUILT_IN_PROFANITY: string[] = [
  "badword1",
  "badword2",
  "profanity",
  "offensive",
  "slur",
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escapes special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates a regex pattern for whole word matching
 */
export function createWordBoundaryPattern(word: string): string {
  return `\\b${escapeRegex(word)}\\b`;
}

/**
 * Counts the percentage of uppercase characters in text
 */
export function getCapsPercentage(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 0;
  const caps = letters.replace(/[^A-Z]/g, "");
  return (caps.length / letters.length) * 100;
}

/**
 * Finds repeated consecutive characters in text
 */
export function findRepeatedChars(
  text: string,
): { char: string; count: number }[] {
  const results: { char: string; count: number }[] = [];
  let currentChar = "";
  let count = 0;

  for (const char of text) {
    if (char === currentChar) {
      count++;
    } else {
      if (count > 1) {
        results.push({ char: currentChar, count });
      }
      currentChar = char;
      count = 1;
    }
  }

  if (count > 1) {
    results.push({ char: currentChar, count });
  }

  return results;
}

/**
 * Finds repeated consecutive words in text
 */
export function findRepeatedWords(
  text: string,
): { word: string; count: number }[] {
  const words = text.toLowerCase().split(/\s+/);
  const results: { word: string; count: number }[] = [];
  let currentWord = "";
  let count = 0;

  for (const word of words) {
    if (word === currentWord) {
      count++;
    } else {
      if (count > 1) {
        results.push({ word: currentWord, count });
      }
      currentWord = word;
      count = 1;
    }
  }

  if (count > 1) {
    results.push({ word: currentWord, count });
  }

  return results;
}

/**
 * Counts emojis in text (basic Unicode emoji detection)
 */
export function countEmojis(text: string): number {
  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
}

/**
 * Extracts all URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>[\]{}|\\^`"']+/gi;
  return text.match(urlRegex) || [];
}

/**
 * Extracts domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Normalizes text for comparison (removes special chars, normalizes whitespace)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// Content Filter Class
// ============================================================================

export class ContentFilter {
  private config: ContentFilterConfig;
  private compiledRegexRules: Map<string, RegExp>;
  private messageHistory: Map<string, { content: string; timestamp: number }[]>;

  constructor(config: Partial<ContentFilterConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
    this.compiledRegexRules = new Map();
    this.messageHistory = new Map();
    this.compileRules();
  }

  /**
   * Pre-compiles regex rules for performance
   */
  private compileRules(): void {
    this.compiledRegexRules.clear();

    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      try {
        let pattern: string;
        const flags = rule.caseSensitive ? "g" : "gi";

        if (rule.type === "regex") {
          pattern = rule.pattern;
        } else if (rule.type === "word") {
          pattern = rule.wholeWord
            ? createWordBoundaryPattern(rule.pattern)
            : escapeRegex(rule.pattern);
        } else {
          continue;
        }

        this.compiledRegexRules.set(rule.id, new RegExp(pattern, flags));
      } catch {
        // Invalid regex, skip this rule
      }
    }
  }

  /**
   * Updates the filter configuration
   */
  updateConfig(config: Partial<ContentFilterConfig>): void {
    this.config = { ...this.config, ...config };
    this.compileRules();
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ContentFilterConfig {
    return { ...this.config };
  }

  /**
   * Adds a new filter rule
   */
  addRule(rule: FilterRule): void {
    const existingIndex = this.config.rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
    this.compileRules();
  }

  /**
   * Removes a filter rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      this.compiledRegexRules.delete(ruleId);
      return true;
    }
    return false;
  }

  /**
   * Enables or disables a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.config.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.compileRules();
      return true;
    }
    return false;
  }

  /**
   * Checks content for profanity
   */
  checkProfanity(content: string): FilterMatch[] {
    if (!this.config.profanityEnabled) return [];

    const matches: FilterMatch[] = [];
    const lowerContent = content.toLowerCase();

    // Check built-in profanity
    for (const word of BUILT_IN_PROFANITY) {
      const regex = new RegExp(createWordBoundaryPattern(word), "gi");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          ruleId: `builtin-profanity-${word}`,
          type: "word",
          pattern: word,
          match: match[0],
          position: match.index,
          length: match[0].length,
          action: this.config.defaultAction,
        });
      }
    }

    // Check custom word rules
    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.type !== "word") continue;

      const regex = this.compiledRegexRules.get(rule.id);
      if (!regex) continue;

      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          ruleId: rule.id,
          type: "word",
          pattern: rule.pattern,
          match: match[0],
          position: match.index,
          length: match[0].length,
          action: rule.action,
        });
      }
    }

    return matches;
  }

  /**
   * Checks content for spam patterns
   */
  checkSpam(content: string, userId?: string): FilterMatch[] {
    if (!this.config.spamEnabled) return [];

    const matches: FilterMatch[] = [];
    const spamConfig = this.config.spamConfig;

    // Check excessive caps
    const capsPercent = getCapsPercentage(content);
    if (capsPercent > spamConfig.maxCapsPercent) {
      matches.push({
        ruleId: "spam-caps",
        type: "spam",
        pattern: `Caps > ${spamConfig.maxCapsPercent}%`,
        match: `${Math.round(capsPercent)}% caps`,
        position: 0,
        length: content.length,
        action: "flag",
      });
    }

    // Check repeated characters
    const repeatedChars = findRepeatedChars(content);
    for (const { char, count } of repeatedChars) {
      if (count > spamConfig.maxRepeatedChars) {
        matches.push({
          ruleId: "spam-repeated-chars",
          type: "spam",
          pattern: `Repeated char > ${spamConfig.maxRepeatedChars}`,
          match: char.repeat(count),
          position: content.indexOf(char.repeat(count)),
          length: count,
          action: "flag",
        });
      }
    }

    // Check repeated words
    const repeatedWords = findRepeatedWords(content);
    for (const { word, count } of repeatedWords) {
      if (count > spamConfig.maxRepeatedWords) {
        matches.push({
          ruleId: "spam-repeated-words",
          type: "spam",
          pattern: `Repeated word > ${spamConfig.maxRepeatedWords}`,
          match: `"${word}" x${count}`,
          position: 0,
          length: 0,
          action: "flag",
        });
      }
    }

    // Check excessive emojis
    const emojiCount = countEmojis(content);
    if (emojiCount > spamConfig.maxEmojis) {
      matches.push({
        ruleId: "spam-emojis",
        type: "spam",
        pattern: `Emojis > ${spamConfig.maxEmojis}`,
        match: `${emojiCount} emojis`,
        position: 0,
        length: 0,
        action: "flag",
      });
    }

    // Check duplicate messages if user ID provided
    if (userId) {
      const history = this.messageHistory.get(userId) || [];
      const normalizedContent = normalizeText(content);
      const duplicates = history.filter(
        (h) => normalizeText(h.content) === normalizedContent,
      );

      if (duplicates.length >= spamConfig.maxDuplicateMessages) {
        matches.push({
          ruleId: "spam-duplicate",
          type: "spam",
          pattern: `Duplicate messages > ${spamConfig.maxDuplicateMessages}`,
          match: "Duplicate message",
          position: 0,
          length: 0,
          action: "block",
        });
      }

      // Record this message
      this.recordMessage(userId, content);
    }

    return matches;
  }

  /**
   * Records a message in history for spam detection
   */
  recordMessage(userId: string, content: string): void {
    const history = this.messageHistory.get(userId) || [];
    const now = Date.now();

    // Remove old messages (older than 1 hour)
    const filtered = history.filter((h) => now - h.timestamp < 3600000);
    filtered.push({ content, timestamp: now });

    // Keep only last 20 messages per user
    if (filtered.length > 20) {
      filtered.shift();
    }

    this.messageHistory.set(userId, filtered);
  }

  /**
   * Clears message history for a user
   */
  clearUserHistory(userId: string): void {
    this.messageHistory.delete(userId);
  }

  /**
   * Clears all message history
   */
  clearAllHistory(): void {
    this.messageHistory.clear();
  }

  /**
   * Checks content for link policy violations
   */
  checkLinks(content: string): FilterMatch[] {
    if (!this.config.linkEnabled) return [];

    const matches: FilterMatch[] = [];
    const linkConfig = this.config.linkConfig;
    const urls = extractUrls(content);

    // Check if all links should be blocked
    if (linkConfig.blockAllLinks && urls.length > 0) {
      for (const url of urls) {
        matches.push({
          ruleId: "link-blocked-all",
          type: "link",
          pattern: "All links blocked",
          match: url,
          position: content.indexOf(url),
          length: url.length,
          action: "block",
        });
      }
      return matches;
    }

    // Check link count
    if (urls.length > this.config.spamConfig.maxLinks) {
      matches.push({
        ruleId: "link-excessive",
        type: "link",
        pattern: `Links > ${this.config.spamConfig.maxLinks}`,
        match: `${urls.length} links`,
        position: 0,
        length: 0,
        action: "flag",
      });
    }

    // Check individual domains
    for (const url of urls) {
      const domain = extractDomain(url);
      if (!domain) continue;

      // Check if whitelist-only mode
      if (linkConfig.allowWhitelistedOnly) {
        const isAllowed = linkConfig.allowedDomains.some(
          (allowed) =>
            domain === allowed.toLowerCase() ||
            domain.endsWith(`.${allowed.toLowerCase()}`),
        );
        if (!isAllowed) {
          matches.push({
            ruleId: "link-not-whitelisted",
            type: "link",
            pattern: "Domain not whitelisted",
            match: url,
            position: content.indexOf(url),
            length: url.length,
            action: "block",
          });
        }
      }

      // Check blocked domains
      const isBlocked = linkConfig.blockedDomains.some(
        (blocked) =>
          domain === blocked.toLowerCase() ||
          domain.endsWith(`.${blocked.toLowerCase()}`),
      );
      if (isBlocked) {
        matches.push({
          ruleId: "link-blocked-domain",
          type: "link",
          pattern: "Blocked domain",
          match: url,
          position: content.indexOf(url),
          length: url.length,
          action: "block",
        });
      }
    }

    return matches;
  }

  /**
   * Checks content against regex rules
   */
  checkRegex(content: string): FilterMatch[] {
    if (!this.config.regexEnabled) return [];

    const matches: FilterMatch[] = [];

    for (const rule of this.config.rules) {
      if (!rule.enabled || rule.type !== "regex") continue;

      const regex = this.compiledRegexRules.get(rule.id);
      if (!regex) continue;

      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          ruleId: rule.id,
          type: "regex",
          pattern: rule.pattern,
          match: match[0],
          position: match.index,
          length: match[0].length,
          action: rule.action,
        });
      }
    }

    return matches;
  }

  /**
   * Main filter function - checks content against all enabled filters
   */
  filter(content: string, userId?: string): FilterResult {
    const allMatches: FilterMatch[] = [];

    // Run all checks
    allMatches.push(...this.checkProfanity(content));
    allMatches.push(...this.checkSpam(content, userId));
    allMatches.push(...this.checkLinks(content));
    allMatches.push(...this.checkRegex(content));

    // Determine final action based on matches
    let finalAction: FilterAction = "allow";
    const reasons: string[] = [];

    for (const match of allMatches) {
      if (match.action === "block") {
        finalAction = "block";
        reasons.push(`Blocked: ${match.pattern} (${match.match})`);
      } else if (match.action === "flag" && finalAction !== "block") {
        finalAction = "flag";
        reasons.push(`Flagged: ${match.pattern}`);
      } else if (match.action === "warn" && finalAction === "allow") {
        finalAction = "warn";
        reasons.push(`Warning: ${match.pattern}`);
      }
    }

    return {
      passed: finalAction === "allow",
      matches: allMatches,
      action: finalAction,
      reason: reasons.length > 0 ? reasons.join("; ") : undefined,
    };
  }

  /**
   * Filters and optionally censors content
   */
  filterAndCensor(
    content: string,
    censorChar = "*",
    userId?: string,
  ): FilterResult {
    const result = this.filter(content, userId);

    if (result.matches.length === 0) {
      return { ...result, filteredContent: content };
    }

    let censored = content;

    // Sort matches by position in reverse to censor from end to start
    const sortedMatches = [...result.matches]
      .filter((m) => m.action === "block" && m.length > 0)
      .sort((a, b) => b.position - a.position);

    for (const match of sortedMatches) {
      const replacement = censorChar.repeat(match.length);
      censored =
        censored.slice(0, match.position) +
        replacement +
        censored.slice(match.position + match.length);
    }

    return { ...result, filteredContent: censored };
  }

  /**
   * Checks if content passes all filters (quick check)
   */
  isClean(content: string, userId?: string): boolean {
    return this.filter(content, userId).passed;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a content filter with default configuration
 */
export function createContentFilter(
  config?: Partial<ContentFilterConfig>,
): ContentFilter {
  return new ContentFilter(config);
}

/**
 * Creates a strict content filter (blocks most suspicious content)
 */
export function createStrictFilter(): ContentFilter {
  return new ContentFilter({
    profanityEnabled: true,
    spamEnabled: true,
    linkEnabled: true,
    regexEnabled: true,
    defaultAction: "block",
    spamConfig: {
      ...DEFAULT_SPAM_CONFIG,
      maxCapsPercent: 50,
      maxRepeatedChars: 3,
      maxRepeatedWords: 2,
      maxLinks: 2,
      maxEmojis: 10,
    },
    linkConfig: {
      ...DEFAULT_LINK_CONFIG,
      allowWhitelistedOnly: true,
    },
  });
}

/**
 * Creates a lenient content filter (only blocks severe violations)
 */
export function createLenientFilter(): ContentFilter {
  return new ContentFilter({
    profanityEnabled: true,
    spamEnabled: true,
    linkEnabled: false,
    regexEnabled: false,
    defaultAction: "flag",
    spamConfig: {
      ...DEFAULT_SPAM_CONFIG,
      maxCapsPercent: 90,
      maxRepeatedChars: 10,
      maxRepeatedWords: 5,
      maxLinks: 10,
      maxEmojis: 50,
    },
  });
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const defaultContentFilter = createContentFilter();
