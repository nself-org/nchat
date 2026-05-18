/**
 * Toxicity Detector with Perspective API Integration
 * Google Perspective API for toxicity, insult, profanity, threat detection
 */

import { logger } from "@/lib/logger";

export interface PerspectiveAPIResult {
  attributeScores: {
    [key: string]: {
      spanScores: Array<{
        begin: number;
        end: number;
        score: {
          value: number;
          type: string;
        };
      }>;
      summaryScore: {
        value: number;
        type: string;
      };
    };
  };
  languages: string[];
  detectedLanguages: string[];
}

export interface ToxicityScore {
  toxicity: number;
  severeToxicity: number;
  insult: number;
  profanity: number;
  threat: number;
  identityAttack: number;
  sexuallyExplicit: number;
}

export interface ToxicityAnalysis {
  // Overall
  isToxic: boolean;
  overallScore: number;

  // Individual scores
  scores: ToxicityScore;

  // Categories triggered
  triggeredCategories: string[];

  // Confidence
  confidence: number;

  // Details
  mostToxicSpans: Array<{
    text: string;
    category: string;
    score: number;
    begin: number;
    end: number;
  }>;

  // Metadata
  language: string;
  modelVersion: string;
}

export interface ToxicityDetectorConfig {
  // API Configuration
  perspectiveApiKey?: string;
  enablePerspectiveAPI: boolean;

  // Fallback to local model if API fails
  enableFallback: boolean;

  // Thresholds
  toxicityThreshold: number;
  severeToxicityThreshold: number;
  insultThreshold: number;
  profanityThreshold: number;
  threatThreshold: number;
  identityAttackThreshold: number;

  // Which attributes to check
  checkAttributes: Array<
    | "TOXICITY"
    | "SEVERE_TOXICITY"
    | "INSULT"
    | "PROFANITY"
    | "THREAT"
    | "IDENTITY_ATTACK"
    | "SEXUALLY_EXPLICIT"
  >;

  // Language support
  languages: string[];
}

export const DEFAULT_TOXICITY_CONFIG: ToxicityDetectorConfig = {
  enablePerspectiveAPI: false, // Disabled by default (requires API key)
  enableFallback: true,

  toxicityThreshold: 0.7,
  severeToxicityThreshold: 0.8,
  insultThreshold: 0.7,
  profanityThreshold: 0.5,
  threatThreshold: 0.8,
  identityAttackThreshold: 0.75,

  checkAttributes: [
    "TOXICITY",
    "SEVERE_TOXICITY",
    "INSULT",
    "PROFANITY",
    "THREAT",
    "IDENTITY_ATTACK",
    "SEXUALLY_EXPLICIT",
  ],

  languages: ["en"],
};

export class ToxicityDetector {
  private config: ToxicityDetectorConfig;
  private modelVersion = "v0.7.0-toxicity";
  private apiEndpoint =
    "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
  private requestCache = new Map<
    string,
    { result: ToxicityAnalysis; timestamp: number }
  >();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<ToxicityDetectorConfig> = {}) {
    this.config = { ...DEFAULT_TOXICITY_CONFIG, ...config };
  }

  /**
   * Analyze text for toxicity using Perspective API
   */
  async analyze(
    text: string,
    language: string = "en",
  ): Promise<ToxicityAnalysis> {
    // Check cache first
    const cacheKey = `${text}:${language}`;
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    let result: ToxicityAnalysis;

    // Try Perspective API first
    if (this.config.enablePerspectiveAPI && this.config.perspectiveApiKey) {
      try {
        result = await this.analyzeWithPerspectiveAPI(text, language);
        this.cacheResult(cacheKey, result);
        return result;
      } catch (error) {
        logger.error("Perspective API failed:", error);
        if (!this.config.enableFallback) {
          throw error;
        }
        // Fall through to fallback
      }
    }

    // Use fallback detection
    result = await this.analyzeWithFallback(text, language);
    this.cacheResult(cacheKey, result);
    return result;
  }

  /**
   * Analyze with Google Perspective API
   */
  private async analyzeWithPerspectiveAPI(
    text: string,
    language: string,
  ): Promise<ToxicityAnalysis> {
    if (!this.config.perspectiveApiKey) {
      throw new Error("Perspective API key not configured");
    }

    const requestBody = {
      comment: { text },
      languages: [language],
      requestedAttributes: this.config.checkAttributes.reduce(
        (acc, attr) => {
          acc[attr] = {};
          return acc;
        },
        {} as Record<string, any>,
      ),
      spanAnnotations: true,
    };

    const response = await fetch(
      `${this.apiEndpoint}?key=${this.config.perspectiveApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perspective API error: ${response.status} - ${error}`);
    }

    const data: PerspectiveAPIResult = await response.json();

    return this.parsePerspectiveAPIResult(data, text, language);
  }

  /**
   * Parse Perspective API result
   */
  private parsePerspectiveAPIResult(
    data: PerspectiveAPIResult,
    text: string,
    language: string,
  ): ToxicityAnalysis {
    const scores: ToxicityScore = {
      toxicity: data.attributeScores.TOXICITY?.summaryScore?.value || 0,
      severeToxicity:
        data.attributeScores.SEVERE_TOXICITY?.summaryScore?.value || 0,
      insult: data.attributeScores.INSULT?.summaryScore?.value || 0,
      profanity: data.attributeScores.PROFANITY?.summaryScore?.value || 0,
      threat: data.attributeScores.THREAT?.summaryScore?.value || 0,
      identityAttack:
        data.attributeScores.IDENTITY_ATTACK?.summaryScore?.value || 0,
      sexuallyExplicit:
        data.attributeScores.SEXUALLY_EXPLICIT?.summaryScore?.value || 0,
    };

    const triggeredCategories: string[] = [];
    if (scores.toxicity >= this.config.toxicityThreshold) {
      triggeredCategories.push("toxicity");
    }
    if (scores.severeToxicity >= this.config.severeToxicityThreshold) {
      triggeredCategories.push("severe_toxicity");
    }
    if (scores.insult >= this.config.insultThreshold) {
      triggeredCategories.push("insult");
    }
    if (scores.profanity >= this.config.profanityThreshold) {
      triggeredCategories.push("profanity");
    }
    if (scores.threat >= this.config.threatThreshold) {
      triggeredCategories.push("threat");
    }
    if (scores.identityAttack >= this.config.identityAttackThreshold) {
      triggeredCategories.push("identity_attack");
    }

    // Extract most toxic spans
    const mostToxicSpans: ToxicityAnalysis["mostToxicSpans"] = [];
    for (const [category, result] of Object.entries(data.attributeScores)) {
      if (result.spanScores) {
        for (const span of result.spanScores) {
          if (span.score.value >= 0.6) {
            mostToxicSpans.push({
              text: text.substring(span.begin, span.end),
              category: category.toLowerCase(),
              score: span.score.value,
              begin: span.begin,
              end: span.end,
            });
          }
        }
      }
    }

    // Sort by score
    mostToxicSpans.sort((a, b) => b.score - a.score);

    // Calculate overall score (weighted average)
    const overallScore = Math.max(
      scores.toxicity * 0.3,
      scores.severeToxicity * 0.4,
      scores.insult * 0.15,
      scores.threat * 0.25,
      scores.identityAttack * 0.2,
    );

    const isToxic =
      triggeredCategories.length > 0 ||
      overallScore >= this.config.toxicityThreshold;

    // Calculate confidence (based on Perspective API scores)
    const confidence =
      Math.min(...Object.values(scores).filter((s) => s > 0)) || 1;

    return {
      isToxic,
      overallScore,
      scores,
      triggeredCategories,
      confidence,
      mostToxicSpans: mostToxicSpans.slice(0, 5), // Top 5
      language: data.detectedLanguages?.[0] || language,
      modelVersion: this.modelVersion,
    };
  }

  /**
   * Fallback detection using rule-based approach
   */
  private async analyzeWithFallback(
    text: string,
    language: string,
  ): Promise<ToxicityAnalysis> {
    const lowerText = text.toLowerCase();

    // Rule-based detection patterns
    const patterns = {
      toxicity: [/\b(hate|stupid|dumb|idiot|moron|loser|pathetic)\b/gi],
      severeToxicity: [/\b(kill|die|hurt|attack|destroy|murder)\b/gi],
      insult: [/\b(ugly|fat|stupid|dumb|idiot|moron|loser|freak|creep)\b/gi],
      profanity: [/\b(damn|hell|crap|suck|wtf|stfu)\b/gi],
      threat: [
        /\b(kill|murder|hurt|attack|destroy|beat up|shoot|stab)\b/gi,
        /i will (kill|hurt|attack|destroy|beat|shoot|stab)/gi,
        /going to (kill|hurt|attack|destroy|beat|shoot|stab)/gi,
      ],
      identityAttack: [/\b(racist|sexist|bigot|nazi|terrorist)\b/gi],
      sexuallyExplicit: [/\b(porn|nude|naked|sex|xxx)\b/gi],
    };

    const scores: ToxicityScore = {
      toxicity: this.calculatePatternScore(text, patterns.toxicity),
      severeToxicity: this.calculatePatternScore(text, patterns.severeToxicity),
      insult: this.calculatePatternScore(text, patterns.insult),
      profanity: this.calculatePatternScore(text, patterns.profanity),
      threat: this.calculatePatternScore(text, patterns.threat),
      identityAttack: this.calculatePatternScore(text, patterns.identityAttack),
      sexuallyExplicit: this.calculatePatternScore(
        text,
        patterns.sexuallyExplicit,
      ),
    };

    const triggeredCategories: string[] = [];
    if (scores.toxicity >= this.config.toxicityThreshold) {
      triggeredCategories.push("toxicity");
    }
    if (scores.severeToxicity >= this.config.severeToxicityThreshold) {
      triggeredCategories.push("severe_toxicity");
    }
    if (scores.insult >= this.config.insultThreshold) {
      triggeredCategories.push("insult");
    }
    if (scores.profanity >= this.config.profanityThreshold) {
      triggeredCategories.push("profanity");
    }
    if (scores.threat >= this.config.threatThreshold) {
      triggeredCategories.push("threat");
    }
    if (scores.identityAttack >= this.config.identityAttackThreshold) {
      triggeredCategories.push("identity_attack");
    }

    const overallScore = Math.max(...Object.values(scores));
    const isToxic = triggeredCategories.length > 0;

    return {
      isToxic,
      overallScore,
      scores,
      triggeredCategories,
      confidence: 0.6, // Lower confidence for fallback
      mostToxicSpans: [],
      language,
      modelVersion: `${this.modelVersion}-fallback`,
    };
  }

  /**
   * Calculate pattern score
   */
  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let matches = 0;
    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found) {
        matches += found.length;
      }
    }

    // Normalize to 0-1 scale (cap at 5 matches = 1.0)
    return Math.min(matches / 5, 1);
  }

  /**
   * Cache result
   */
  private cacheResult(key: string, result: ToxicityAnalysis): void {
    this.requestCache.set(key, {
      result,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries
    if (this.requestCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.requestCache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.requestCache.delete(k);
        }
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ToxicityDetectorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): ToxicityDetectorConfig {
    return { ...this.config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }
}

// Singleton instance
let toxicityDetector: ToxicityDetector | null = null;

export function getToxicityDetector(
  config?: Partial<ToxicityDetectorConfig>,
): ToxicityDetector {
  if (!toxicityDetector || config) {
    toxicityDetector = new ToxicityDetector(config);
  }
  return toxicityDetector;
}
