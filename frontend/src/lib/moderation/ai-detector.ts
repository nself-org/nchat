/**
 * AI-Powered Content Detection
 * Uses TensorFlow.js for toxic content and NSFW detection
 */

import * as tf from "@tensorflow/tfjs";

import { logger } from "@/lib/logger";

// Toxic content model interface
interface ToxicPrediction {
  label: string;
  probability: number;
}

export interface ToxicityResult {
  isToxic: boolean;
  toxicScore: number;
  categories: {
    identity_attack?: number;
    insult?: number;
    obscene?: number;
    severe_toxicity?: number;
    threat?: number;
    toxicity?: number;
  };
  detectedLabels: string[];
}

export interface NSFWResult {
  isNSFW: boolean;
  nsfwScore: number;
  categories: {
    porn?: number;
    sexy?: number;
    hentai?: number;
    neutral?: number;
    drawing?: number;
  };
  detectedLabels: string[];
}

export interface SpamResult {
  isSpam: boolean;
  spamScore: number;
  reasons: string[];
}

class AIDetector {
  private toxicityModel: any = null;
  private nsfwModel: any = null;
  private isInitialized = false;
  private isInitializing = false;

  /**
   * Initialize AI models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;

    this.isInitializing = true;

    try {
      // Set TensorFlow backend
      await tf.ready();
      // REMOVED: console.log('TensorFlow.js ready, backend:', tf.getBackend())

      // Load toxicity model
      // Using TensorFlow.js Toxicity model
      await this.loadToxicityModel();

      this.isInitialized = true;
      // REMOVED: console.log('AI moderation models initialized')
    } catch (error) {
      logger.error("Failed to initialize AI models:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Load toxicity detection model
   */
  private async loadToxicityModel(): Promise<void> {
    try {
      // Load TensorFlow.js toxicity model
      // Using a threshold of 0.5 for better detection
      const toxicity = await import("@tensorflow-models/toxicity");
      const threshold = 0.5;
      // Load with all default toxicity labels
      const toxicityLabels = [
        "identity_attack",
        "insult",
        "obscene",
        "severe_toxicity",
        "threat",
        "toxicity",
      ];
      this.toxicityModel = await toxicity.load(threshold, toxicityLabels);
      // REMOVED: console.log('Toxicity model loaded')
    } catch (error) {
      logger.error("Failed to load toxicity model:", error);
      // Continue without toxicity model - will use fallback
      this.toxicityModel = null;
    }
  }

  /**
   * Detect toxic content in text
   */
  async detectToxicity(text: string): Promise<ToxicityResult> {
    if (!text || text.trim().length === 0) {
      return {
        isToxic: false,
        toxicScore: 0,
        categories: {},
        detectedLabels: [],
      };
    }

    // Ensure models are initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.toxicityModel) {
        const predictions = await this.toxicityModel.classify([text]);

        const categories: Record<string, number> = {};
        const detectedLabels: string[] = [];
        let maxScore = 0;

        for (const prediction of predictions) {
          if (prediction.results[0].match) {
            const score = prediction.results[0].probabilities[1]; // Probability of toxic
            const label = prediction.label;

            categories[label] = score;
            detectedLabels.push(label);

            if (score > maxScore) {
              maxScore = score;
            }
          }
        }

        return {
          isToxic: maxScore > 0.7,
          toxicScore: maxScore,
          categories,
          detectedLabels,
        };
      } else {
        // Fallback to rule-based detection
        return this.fallbackToxicityDetection(text);
      }
    } catch (error) {
      logger.error("Toxicity detection failed:", error);
      return this.fallbackToxicityDetection(text);
    }
  }

  /**
   * Fallback toxicity detection using rules
   */
  private fallbackToxicityDetection(text: string): ToxicityResult {
    const lowerText = text.toLowerCase();
    const categories: Record<string, number> = {};
    const detectedLabels: string[] = [];

    // Simple pattern matching for common toxic patterns
    const toxicPatterns = [
      {
        label: "insult",
        patterns: ["idiot", "stupid", "dumb", "moron", "loser"],
      },
      { label: "threat", patterns: ["kill", "hurt", "attack", "destroy"] },
      { label: "identity_attack", patterns: ["hate", "racist", "sexist"] },
    ];

    let maxScore = 0;

    for (const { label, patterns } of toxicPatterns) {
      const matches = patterns.filter((pattern) => lowerText.includes(pattern));
      if (matches.length > 0) {
        const score = Math.min(matches.length * 0.3, 0.9);
        categories[label] = score;
        detectedLabels.push(label);
        maxScore = Math.max(maxScore, score);
      }
    }

    return {
      isToxic: maxScore > 0.7,
      toxicScore: maxScore,
      categories,
      detectedLabels,
    };
  }

  /**
   * Detect NSFW content in images
   */
  async detectNSFW(imageUrl: string): Promise<NSFWResult> {
    // Note: NSFW detection requires loading images in browser
    // For server-side, we'd need a different approach
    try {
      // Placeholder for NSFW detection
      // In production, use nsfwjs library with image preprocessing
      return {
        isNSFW: false,
        nsfwScore: 0,
        categories: {},
        detectedLabels: [],
      };
    } catch (error) {
      logger.error("NSFW detection failed:", error);
      return {
        isNSFW: false,
        nsfwScore: 0,
        categories: {},
        detectedLabels: [],
      };
    }
  }

  /**
   * Detect spam in text
   */
  async detectSpam(
    text: string,
    metadata?: {
      messageCount?: number;
      timeWindow?: number;
      hasLinks?: boolean;
      linkCount?: number;
    },
  ): Promise<SpamResult> {
    const reasons: string[] = [];
    let spamScore = 0;

    // Check for excessive capitalization
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.7 && text.length > 10) {
      spamScore += 0.3;
      reasons.push("Excessive capitalization");
    }

    // Check for repetitive characters
    if (/(.)\1{4,}/.test(text)) {
      spamScore += 0.2;
      reasons.push("Repetitive characters");
    }

    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?.,]/g) || []).length / text.length;
    if (punctuationRatio > 0.3) {
      spamScore += 0.2;
      reasons.push("Excessive punctuation");
    }

    // Check for suspicious links
    if (metadata?.hasLinks) {
      const linkCount = metadata.linkCount || 0;
      if (linkCount > 3) {
        spamScore += 0.3;
        reasons.push("Multiple links");
      }

      // Check for shortened URLs
      const shortenedUrlPattern = /(bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly)/i;
      if (shortenedUrlPattern.test(text)) {
        spamScore += 0.2;
        reasons.push("Shortened URLs");
      }
    }

    // Check message frequency
    if (metadata?.messageCount && metadata.timeWindow) {
      const messagesPerMinute =
        metadata.messageCount / (metadata.timeWindow / 60);
      if (messagesPerMinute > 10) {
        spamScore += 0.4;
        reasons.push("High message frequency");
      }
    }

    // Check for common spam phrases
    const spamPhrases = [
      "click here",
      "limited time",
      "act now",
      "free money",
      "make money fast",
      "work from home",
      "congratulations you won",
    ];

    const lowerText = text.toLowerCase();
    const matchedPhrases = spamPhrases.filter((phrase) =>
      lowerText.includes(phrase),
    );
    if (matchedPhrases.length > 0) {
      spamScore += matchedPhrases.length * 0.2;
      reasons.push("Spam phrases detected");
    }

    return {
      isSpam: spamScore > 0.6,
      spamScore: Math.min(spamScore, 1),
      reasons,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.toxicityModel) {
      this.toxicityModel.dispose?.();
      this.toxicityModel = null;
    }
    if (this.nsfwModel) {
      this.nsfwModel.dispose?.();
      this.nsfwModel = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let aiDetector: AIDetector | null = null;

export function getAIDetector(): AIDetector {
  if (!aiDetector) {
    aiDetector = new AIDetector();
  }
  return aiDetector;
}

export { AIDetector };
