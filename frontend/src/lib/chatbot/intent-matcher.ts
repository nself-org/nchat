/**
 * Intent Matcher
 *
 * Provides intent detection and matching for chatbot conversations.
 * Uses pattern matching, keyword extraction, and fuzzy matching.
 *
 * @module lib/chatbot/intent-matcher
 * @version 1.0.0
 */

import type {
  IntentCategory,
  DetectedIntent,
  IntentPattern,
} from "./chatbot-types";

// ============================================================================
// DEFAULT INTENT PATTERNS
// ============================================================================

/**
 * Default intent patterns for common conversational intents
 */
export const DEFAULT_INTENT_PATTERNS: IntentPattern[] = [
  // Greeting
  {
    id: "greeting",
    intent: "greeting",
    patterns: [
      "^(hi|hello|hey|howdy|hiya|yo)\\b",
      "^good (morning|afternoon|evening)",
      "^what's up",
      "^greetings",
    ],
    keywords: [
      "hi",
      "hello",
      "hey",
      "morning",
      "afternoon",
      "evening",
      "greetings",
    ],
    examples: ["Hi", "Hello there", "Good morning", "Hey!"],
    priority: 10,
    isActive: true,
  },
  // Farewell
  {
    id: "farewell",
    intent: "farewell",
    patterns: [
      "^(bye|goodbye|see you|take care|cya|later)\\b",
      "^that's all",
      "^i'm done",
      "^have a (good|nice|great) (day|one)",
    ],
    keywords: ["bye", "goodbye", "later", "cya", "done", "finished"],
    examples: ["Bye", "Goodbye", "Thanks, bye!", "That's all I needed"],
    priority: 10,
    isActive: true,
  },
  // Thanks
  {
    id: "thanks",
    intent: "thanks",
    patterns: [
      "^(thanks|thank you|thx|ty|appreciate)\\b",
      "thanks a lot",
      "thank you (so much|very much)",
      "much appreciated",
    ],
    keywords: ["thanks", "thank", "appreciate", "grateful", "thx", "ty"],
    examples: ["Thanks!", "Thank you so much", "Appreciate it"],
    priority: 8,
    isActive: true,
  },
  // Help request
  {
    id: "help",
    intent: "help",
    patterns: [
      "\\b(help|assist|support)\\b",
      "\\b(need|want) (help|assistance)",
      "\\bcan you help\\b",
      "\\bdon't (know|understand)",
      "\\bi have a (question|problem|issue)",
      "\\bhow (do|can) i\\b",
    ],
    keywords: [
      "help",
      "assist",
      "support",
      "question",
      "problem",
      "issue",
      "how",
    ],
    examples: ["I need help", "Can you help me?", "I have a question"],
    priority: 5,
    isActive: true,
  },
  // Human request
  {
    id: "human",
    intent: "human",
    patterns: [
      "\\b(human|agent|person|real person|representative|operator)\\b",
      "\\btalk to (someone|a human|an agent|a person)",
      "\\bspeak (to|with) (someone|a human|an agent)",
      "\\bconnect me (to|with)",
      "\\bthis (isn't|is not) helping",
      "\\bi want (to talk to|speak with|a) (human|agent|person)",
      "\\blet me (talk to|speak with)",
      "\\btransfer (me|to)",
    ],
    keywords: [
      "human",
      "agent",
      "person",
      "representative",
      "operator",
      "transfer",
      "speak",
      "talk",
    ],
    examples: [
      "I want to talk to a human",
      "Connect me to an agent",
      "Transfer me please",
    ],
    priority: 15,
    isActive: true,
  },
  // Complaint
  {
    id: "complaint",
    intent: "complaint",
    patterns: [
      "\\b(angry|frustrated|upset|annoyed|disappointed|mad|furious|terrible|horrible|awful)\\b",
      "\\b(worst|bad|poor) (service|experience)\\b",
      "\\bthis (sucks|is terrible|is awful)\\b",
      "\\bi('m| am) (not happy|unhappy|dissatisfied)\\b",
      "\\bwaste of (time|money)\\b",
      "\\bcomplaint\\b",
      "\\bunacceptable\\b",
    ],
    keywords: [
      "angry",
      "frustrated",
      "upset",
      "complaint",
      "terrible",
      "awful",
      "disappointed",
      "unacceptable",
    ],
    examples: [
      "I'm very frustrated",
      "This is unacceptable",
      "I'm not happy with this",
    ],
    priority: 12,
    isActive: true,
  },
  // Feedback
  {
    id: "feedback",
    intent: "feedback",
    patterns: [
      "\\b(feedback|suggestion|recommend|improve)\\b",
      "\\bi (think|suggest|recommend)\\b",
      "\\byou should\\b",
      "\\bit would be (nice|great|better) if\\b",
      "\\bwish (you|there was)\\b",
    ],
    keywords: [
      "feedback",
      "suggestion",
      "recommend",
      "improve",
      "wish",
      "better",
    ],
    examples: [
      "I have some feedback",
      "I suggest you improve this",
      "It would be nice if...",
    ],
    priority: 6,
    isActive: true,
  },
  // Confirm
  {
    id: "confirm",
    intent: "confirm",
    patterns: [
      "^(yes|yeah|yep|yup|sure|ok|okay|correct|right|affirmative)\\b",
      "^(that's|thats) (right|correct)",
      "^absolutely",
      "^definitely",
      "^of course",
    ],
    keywords: ["yes", "yeah", "sure", "ok", "correct", "right", "absolutely"],
    examples: ["Yes", "Yeah, that works", "Sure", "That's correct"],
    priority: 7,
    isActive: true,
  },
  // Cancel/Negative
  {
    id: "cancel",
    intent: "cancel",
    patterns: [
      "^(no|nope|nah|cancel|stop|never mind|nevermind)\\b",
      "^that's not (right|correct|what i)",
      "^wrong",
      "^i don't (want|need)",
      "^forget (it|about it)",
    ],
    keywords: ["no", "nope", "cancel", "stop", "wrong", "forget"],
    examples: ["No", "Cancel that", "Never mind", "That's not what I meant"],
    priority: 7,
    isActive: true,
  },
  // FAQ - This is a catch-all for questions
  {
    id: "faq",
    intent: "faq",
    patterns: [
      "^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does)\\b",
      "\\?$",
      "\\bwhat is\\b",
      "\\bhow (do|can|to)\\b",
      "\\bwhere (can|is|are)\\b",
      "\\btell me (about|how)\\b",
      "\\bexplain\\b",
    ],
    keywords: ["what", "how", "why", "when", "where", "who", "explain", "tell"],
    examples: [
      "What is this?",
      "How do I reset my password?",
      "Where can I find...",
    ],
    priority: 3,
    isActive: true,
  },
];

// ============================================================================
// SENTIMENT WORDS
// ============================================================================

const POSITIVE_WORDS = new Set([
  "good",
  "great",
  "excellent",
  "amazing",
  "wonderful",
  "fantastic",
  "perfect",
  "love",
  "like",
  "happy",
  "pleased",
  "satisfied",
  "helpful",
  "awesome",
  "best",
  "nice",
  "beautiful",
  "brilliant",
  "superb",
  "outstanding",
  "incredible",
]);

const NEGATIVE_WORDS = new Set([
  "bad",
  "terrible",
  "awful",
  "horrible",
  "poor",
  "worst",
  "hate",
  "angry",
  "frustrated",
  "disappointed",
  "upset",
  "annoyed",
  "unhappy",
  "dissatisfied",
  "useless",
  "stupid",
  "broken",
  "fail",
  "failed",
  "sucks",
  "ridiculous",
]);

const INTENSIFIERS = new Set([
  "very",
  "really",
  "extremely",
  "absolutely",
  "totally",
  "completely",
  "so",
  "too",
  "incredibly",
  "highly",
]);

const NEGATORS = new Set([
  "not",
  "don't",
  "doesn't",
  "didn't",
  "won't",
  "wouldn't",
  "can't",
  "couldn't",
  "never",
  "no",
  "none",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
]);

// ============================================================================
// INTENT MATCHER CLASS
// ============================================================================

export class IntentMatcher {
  private patterns: IntentPattern[];
  private compiledPatterns: Map<string, RegExp[]>;

  constructor(customPatterns?: IntentPattern[]) {
    this.patterns = [...DEFAULT_INTENT_PATTERNS, ...(customPatterns || [])];
    this.compiledPatterns = new Map();
    this.compilePatterns();
  }

  /**
   * Compile regex patterns for efficiency
   */
  private compilePatterns(): void {
    for (const pattern of this.patterns) {
      if (!pattern.isActive) continue;

      const compiled: RegExp[] = [];
      for (const p of pattern.patterns) {
        try {
          compiled.push(new RegExp(p, "i"));
        } catch {
          // Skip invalid patterns
        }
      }
      this.compiledPatterns.set(pattern.id, compiled);
    }
  }

  /**
   * Detect intent from a message
   */
  detectIntent(message: string): DetectedIntent {
    const normalizedMessage = this.normalizeMessage(message);
    const words = normalizedMessage.split(/\s+/);

    const scores: Map<IntentCategory, number> = new Map();
    const matchedKeywords: Map<IntentCategory, string[]> = new Map();

    // Score each intent
    for (const pattern of this.patterns) {
      if (!pattern.isActive) continue;

      let score = 0;
      const keywords: string[] = [];

      // Pattern matching
      const compiled = this.compiledPatterns.get(pattern.id) || [];
      for (const regex of compiled) {
        if (regex.test(normalizedMessage)) {
          score += 5 * pattern.priority;
          break;
        }
      }

      // Keyword matching
      for (const keyword of pattern.keywords) {
        const kw = keyword.toLowerCase();
        for (const word of words) {
          if (word === kw) {
            score += 3;
            keywords.push(keyword);
          } else if (word.includes(kw) || kw.includes(word)) {
            score += 1;
            keywords.push(keyword);
          }
        }
      }

      if (score > 0) {
        scores.set(pattern.intent, (scores.get(pattern.intent) || 0) + score);
        matchedKeywords.set(pattern.intent, [
          ...(matchedKeywords.get(pattern.intent) || []),
          ...keywords,
        ]);
      }
    }

    // Calculate confidence and find top intent
    const sortedIntents = Array.from(scores.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    if (sortedIntents.length === 0) {
      return {
        intent: "unknown",
        confidence: 0,
        requestsHuman: false,
        sentiment: this.analyzeSentiment(normalizedMessage),
      };
    }

    const [topIntent, topScore] = sortedIntents[0];
    const totalScore = sortedIntents.reduce((sum, [, s]) => sum + s, 0);
    const confidence = Math.min(topScore / Math.max(totalScore, 1), 1);

    // Normalize confidence to a reasonable range
    const normalizedConfidence = Math.min(
      0.95,
      confidence * (topScore > 20 ? 1 : topScore / 20),
    );

    // Build alternatives
    const alternatives = sortedIntents.slice(1, 4).map(([intent, score]) => ({
      intent,
      confidence: Math.min(score / Math.max(totalScore, 1), 1) * 0.9,
    }));

    // Detect if user wants human
    const requestsHuman =
      topIntent === "human" || this.detectHumanRequest(normalizedMessage);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedMessage);

    // Extract entities
    const entities = this.extractEntities(normalizedMessage);

    return {
      intent: topIntent,
      confidence: normalizedConfidence,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      entities: Object.keys(entities).length > 0 ? entities : undefined,
      matchedKeywords: matchedKeywords.get(topIntent),
      requestsHuman,
      sentiment,
    };
  }

  /**
   * Check if message requests human agent
   */
  detectHumanRequest(message: string): boolean {
    const humanPatterns = [
      /\b(human|agent|person|representative|operator)\b/i,
      /\btalk to (someone|a human|an agent)/i,
      /\bspeak (to|with) (someone|a human)/i,
      /\btransfer (me|to)/i,
      /\bconnect me/i,
      /\breal person/i,
    ];

    return humanPatterns.some((p) => p.test(message));
  }

  /**
   * Analyze sentiment of message
   * Returns a score from -1 (very negative) to 1 (very positive)
   */
  analyzeSentiment(message: string): number {
    const words = message.toLowerCase().split(/\s+/);
    let score = 0;
    let wordCount = 0;
    let hasNegator = false;
    let hasIntensifier = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check for negator
      if (NEGATORS.has(word)) {
        hasNegator = true;
        continue;
      }

      // Check for intensifier
      if (INTENSIFIERS.has(word)) {
        hasIntensifier = true;
        continue;
      }

      // Check sentiment
      let wordScore = 0;
      if (POSITIVE_WORDS.has(word)) {
        wordScore = 1;
      } else if (NEGATIVE_WORDS.has(word)) {
        wordScore = -1;
      }

      if (wordScore !== 0) {
        // Apply modifiers
        if (hasNegator) {
          wordScore *= -0.8; // Negation reverses but weakens
          hasNegator = false;
        }
        if (hasIntensifier) {
          wordScore *= 1.5;
          hasIntensifier = false;
        }

        score += wordScore;
        wordCount++;
      }
    }

    // Normalize score
    if (wordCount === 0) return 0;
    return Math.max(-1, Math.min(1, score / wordCount));
  }

  /**
   * Extract entities from message
   */
  extractEntities(message: string): Record<string, string | string[]> {
    const entities: Record<string, string | string[]> = {};

    // Email
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/i);
    if (emailMatch) {
      entities.email = emailMatch[0];
    }

    // Phone (various formats)
    const phoneMatch = message.match(/[\d\s()-]{10,}/g);
    if (phoneMatch) {
      entities.phone = phoneMatch
        .map((p) => p.replace(/\D/g, ""))
        .filter((p) => p.length >= 10)[0];
    }

    // Order/Ticket number patterns
    const orderMatch = message.match(
      /\b(order|ticket|reference|case|id)[#:\s]*([a-z0-9-]+)/i,
    );
    if (orderMatch) {
      entities.reference = orderMatch[2];
    }

    // URL
    const urlMatch = message.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      entities.url = urlMatch[0];
    }

    // Date patterns
    const dateMatch = message.match(
      /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/,
    );
    if (dateMatch) {
      entities.date = dateMatch[0];
    }

    // Time patterns
    const timeMatch = message.match(
      /\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)\b/i,
    );
    if (timeMatch) {
      entities.time = timeMatch[0];
    }

    return entities;
  }

  /**
   * Normalize message for processing
   */
  normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^\w\s?!@#$%&*()-]/g, " ") // Keep punctuation for intent
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
    if (pattern.isActive) {
      const compiled: RegExp[] = [];
      for (const p of pattern.patterns) {
        try {
          compiled.push(new RegExp(p, "i"));
        } catch {
          // Skip invalid patterns
        }
      }
      this.compiledPatterns.set(pattern.id, compiled);
    }
  }

  /**
   * Update an existing pattern
   */
  updatePattern(patternId: string, updates: Partial<IntentPattern>): boolean {
    const index = this.patterns.findIndex((p) => p.id === patternId);
    if (index === -1) return false;

    this.patterns[index] = { ...this.patterns[index], ...updates };

    if (updates.patterns || updates.isActive !== undefined) {
      this.compiledPatterns.delete(patternId);
      if (this.patterns[index].isActive) {
        const compiled: RegExp[] = [];
        for (const p of this.patterns[index].patterns) {
          try {
            compiled.push(new RegExp(p, "i"));
          } catch {
            // Skip invalid patterns
          }
        }
        this.compiledPatterns.set(patternId, compiled);
      }
    }

    return true;
  }

  /**
   * Remove a pattern
   */
  removePattern(patternId: string): boolean {
    const index = this.patterns.findIndex((p) => p.id === patternId);
    if (index === -1) return false;

    this.patterns.splice(index, 1);
    this.compiledPatterns.delete(patternId);
    return true;
  }

  /**
   * Get all patterns
   */
  getPatterns(): IntentPattern[] {
    return [...this.patterns];
  }

  /**
   * Check if a message is likely a question
   */
  isQuestion(message: string): boolean {
    const normalized = this.normalizeMessage(message);
    return (
      normalized.endsWith("?") ||
      /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did)\b/i.test(
        normalized,
      )
    );
  }

  /**
   * Get the primary topic from a message
   */
  extractTopic(message: string): string | null {
    const normalized = this.normalizeMessage(message);

    // Common topic patterns
    const topicPatterns = [
      /(?:about|regarding|concerning|related to)\s+(.+?)(?:\.|$)/i,
      /(?:question about|problem with|issue with|help with)\s+(.+?)(?:\.|$)/i,
      /(?:how (?:do|can|to)|what (?:is|are))\s+(.+?)(?:\?|$)/i,
    ];

    for (const pattern of topicPatterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let intentMatcherInstance: IntentMatcher | null = null;

/**
 * Get or create the intent matcher singleton
 */
export function getIntentMatcher(): IntentMatcher {
  if (!intentMatcherInstance) {
    intentMatcherInstance = new IntentMatcher();
  }
  return intentMatcherInstance;
}

/**
 * Create a new intent matcher instance
 */
export function createIntentMatcher(
  customPatterns?: IntentPattern[],
): IntentMatcher {
  return new IntentMatcher(customPatterns);
}

/**
 * Reset the singleton instance
 */
export function resetIntentMatcher(): void {
  intentMatcherInstance = null;
}
