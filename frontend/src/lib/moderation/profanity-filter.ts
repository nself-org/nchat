/**
 * Profanity Filter
 * Detects and filters profane words with custom word lists
 */

export interface ProfanityResult {
  hasProfanity: boolean;
  detectedWords: string[];
  filteredText: string;
  score: number; // 0-1 based on severity and count
}

// Default profanity word list (expandable)
const DEFAULT_PROFANITY_WORDS = [
  // Common profanity (censored for production)
  "damn",
  "hell",
  "crap",
  "shit",
  "fuck",
  "bitch",
  "ass",
  "bastard",
  "piss",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "fag",
  "nigger",
  // Variations and bypass attempts
  "sh1t",
  "fck",
  "fuk",
  "b1tch",
  "a55",
  "fvck",
  "shyt",
];

// Severity levels for words
const SEVERITY_LEVELS: Record<string, number> = {
  // High severity (1.0)
  nigger: 1.0,
  fag: 1.0,
  cunt: 1.0,

  // Medium severity (0.7)
  fuck: 0.7,
  shit: 0.7,
  bitch: 0.7,
  whore: 0.7,
  slut: 0.7,

  // Low severity (0.3)
  damn: 0.3,
  hell: 0.3,
  crap: 0.3,
  ass: 0.3,
};

export class ProfanityFilter {
  private blockedWords: Set<string>;
  private allowedWords: Set<string>;
  private patterns: RegExp[];

  constructor(
    customBlockedWords: string[] = [],
    customAllowedWords: string[] = [],
  ) {
    // Combine default and custom words
    this.blockedWords = new Set([
      ...DEFAULT_PROFANITY_WORDS,
      ...customBlockedWords,
    ]);

    this.allowedWords = new Set(customAllowedWords);

    // Build regex patterns for detection
    this.patterns = this.buildPatterns();
  }

  /**
   * Build regex patterns for word detection
   */
  private buildPatterns(): RegExp[] {
    const patterns: RegExp[] = [];

    for (const word of Array.from(this.blockedWords)) {
      // Skip if in allowed list
      if (this.allowedWords.has(word)) continue;

      // Create pattern that matches word with common obfuscations
      const pattern = this.createObfuscationPattern(word);
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Create regex pattern that matches common obfuscation techniques
   */
  private createObfuscationPattern(word: string): RegExp {
    let pattern = "";

    for (const char of word.toLowerCase()) {
      switch (char) {
        case "a":
          pattern += "[a@4]";
          break;
        case "e":
          pattern += "[e3]";
          break;
        case "i":
          pattern += "[i1!|]";
          break;
        case "o":
          pattern += "[o0]";
          break;
        case "s":
          pattern += "[s$5]";
          break;
        case "t":
          pattern += "[t7]";
          break;
        default:
          pattern += this.escapeRegex(char);
      }
    }

    // Use simpler pattern to avoid regex errors
    return new RegExp(`\\b${pattern}\\b`, "gi");
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Check text for profanity
   */
  check(text: string): ProfanityResult {
    if (!text || text.trim().length === 0) {
      return {
        hasProfanity: false,
        detectedWords: [],
        filteredText: text,
        score: 0,
      };
    }

    const detectedWords: string[] = [];
    const detectedPositions: Array<{
      word: string;
      start: number;
      end: number;
    }> = [];

    // Check each pattern
    for (const pattern of this.patterns) {
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        if (match[0] && match.index !== undefined) {
          const word = match[0].toLowerCase();

          // Skip if already detected or in allowed list
          if (detectedWords.includes(word) || this.allowedWords.has(word)) {
            continue;
          }

          detectedWords.push(word);
          detectedPositions.push({
            word: match[0],
            start: match.index,
            end: match.index + match[0].length,
          });
        }
      }
    }

    // Calculate score based on detected words and their severity
    let score = 0;
    if (detectedWords.length > 0) {
      const severityScores = detectedWords.map((word) => {
        // Find base word in severity map
        const baseWord = this.findBaseWord(word);
        return SEVERITY_LEVELS[baseWord] || 0.5;
      });

      // Average severity + count penalty
      const avgSeverity =
        severityScores.reduce((a, b) => a + b, 0) / severityScores.length;
      const countPenalty = Math.min(detectedWords.length * 0.1, 0.5);
      score = Math.min(avgSeverity + countPenalty, 1.0);
    }

    // Filter text by replacing profanity
    const filteredText = this.filterText(text, detectedPositions);

    return {
      hasProfanity: detectedWords.length > 0,
      detectedWords,
      filteredText,
      score,
    };
  }

  /**
   * Find base word from obfuscated version
   */
  private findBaseWord(word: string): string {
    const normalized = word
      .toLowerCase()
      .replace(/[@4]/g, "a")
      .replace(/[3]/g, "e")
      .replace(/[1!|]/g, "i")
      .replace(/[0]/g, "o")
      .replace(/[$5]/g, "s")
      .replace(/[7+]/g, "t");

    // Check if normalized version is in blocked words
    if (this.blockedWords.has(normalized)) {
      return normalized;
    }

    // Try to find closest match
    for (const blockedWord of Array.from(this.blockedWords)) {
      if (this.isSimilar(normalized, blockedWord)) {
        return blockedWord;
      }
    }

    return normalized;
  }

  /**
   * Check if two words are similar (for fuzzy matching)
   */
  private isSimilar(word1: string, word2: string): boolean {
    // Simple similarity check - can be improved with Levenshtein distance
    if (Math.abs(word1.length - word2.length) > 2) return false;

    const chars1 = word1.split("");
    const chars2 = word2.split("");
    let matches = 0;

    for (let i = 0; i < Math.min(chars1.length, chars2.length); i++) {
      if (chars1[i] === chars2[i]) matches++;
    }

    return matches / Math.max(word1.length, word2.length) > 0.7;
  }

  /**
   * Filter text by replacing profanity with asterisks
   */
  private filterText(
    text: string,
    detectedPositions: Array<{ word: string; start: number; end: number }>,
  ): string {
    if (detectedPositions.length === 0) return text;

    // Sort positions in reverse order to maintain indices
    const sorted = [...detectedPositions].sort((a, b) => b.start - a.start);

    let filtered = text;

    for (const { word, start, end } of sorted) {
      // Replace with asterisks, keeping first letter
      const replacement = word[0] + "*".repeat(Math.max(word.length - 1, 1));
      filtered =
        filtered.substring(0, start) + replacement + filtered.substring(end);
    }

    return filtered;
  }

  /**
   * Add custom blocked words
   */
  addBlockedWords(words: string[]): void {
    words.forEach((word) => this.blockedWords.add(word.toLowerCase()));
    this.patterns = this.buildPatterns();
  }

  /**
   * Add custom allowed words (whitelist)
   */
  addAllowedWords(words: string[]): void {
    words.forEach((word) => this.allowedWords.add(word.toLowerCase()));
    this.patterns = this.buildPatterns();
  }

  /**
   * Remove blocked words
   */
  removeBlockedWords(words: string[]): void {
    words.forEach((word) => this.blockedWords.delete(word.toLowerCase()));
    this.patterns = this.buildPatterns();
  }

  /**
   * Get current word lists
   */
  getWordLists(): {
    blocked: string[];
    allowed: string[];
  } {
    return {
      blocked: Array.from(this.blockedWords),
      allowed: Array.from(this.allowedWords),
    };
  }
}

// Singleton instance
let profanityFilter: ProfanityFilter | null = null;

export function getProfanityFilter(
  customBlockedWords?: string[],
  customAllowedWords?: string[],
): ProfanityFilter {
  if (!profanityFilter || customBlockedWords || customAllowedWords) {
    profanityFilter = new ProfanityFilter(
      customBlockedWords,
      customAllowedWords,
    );
  }
  return profanityFilter;
}
