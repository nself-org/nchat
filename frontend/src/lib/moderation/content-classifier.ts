/**
 * Content Classifier
 * Classifies content into categories and detects inappropriate content
 */

export interface ContentCategory {
  name: string;
  score: number;
  subcategories?: string[];
}

export interface ClassificationResult {
  // Primary category
  primaryCategory: string;
  confidence: number;

  // All categories with scores
  categories: ContentCategory[];

  // Content flags
  isInappropriate: boolean;
  isNSFW: boolean;
  isSafe: boolean;

  // Language detection
  detectedLanguage: string;
  languageConfidence: number;

  // Content type
  contentType:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "code"
    | "unknown";

  // Sentiment
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;

  // Topics
  detectedTopics: string[];
}

export interface ClassifierConfig {
  // Feature flags
  enableCategoryDetection: boolean;
  enableLanguageDetection: boolean;
  enableSentimentAnalysis: boolean;
  enableTopicExtraction: boolean;
  enableNSFWDetection: boolean;

  // Thresholds
  categoryThreshold: number;
  nsfwThreshold: number;
  languageThreshold: number;

  // Supported languages
  supportedLanguages: string[];

  // Custom categories
  customCategories?: Array<{
    name: string;
    keywords: string[];
    patterns: RegExp[];
  }>;
}

export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  enableCategoryDetection: true,
  enableLanguageDetection: true,
  enableSentimentAnalysis: true,
  enableTopicExtraction: true,
  enableNSFWDetection: true,

  categoryThreshold: 0.5,
  nsfwThreshold: 0.7,
  languageThreshold: 0.6,

  supportedLanguages: [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ru",
    "ja",
    "ko",
    "zh",
  ],
};

export class ContentClassifier {
  private config: ClassifierConfig;

  // Category definitions
  private categories = {
    // General categories
    general: {
      keywords: ["hello", "hi", "thanks", "please", "help", "question"],
      weight: 0.5,
    },
    technical: {
      keywords: [
        "code",
        "bug",
        "error",
        "function",
        "api",
        "database",
        "server",
        "deployment",
      ],
      weight: 0.7,
    },
    business: {
      keywords: [
        "meeting",
        "project",
        "deadline",
        "client",
        "revenue",
        "strategy",
        "budget",
      ],
      weight: 0.7,
    },
    social: {
      keywords: [
        "party",
        "event",
        "lunch",
        "coffee",
        "weekend",
        "vacation",
        "birthday",
      ],
      weight: 0.6,
    },
    support: {
      keywords: [
        "issue",
        "problem",
        "help",
        "urgent",
        "broken",
        "not working",
        "fix",
      ],
      weight: 0.8,
    },
    announcement: {
      keywords: [
        "announce",
        "news",
        "update",
        "release",
        "launch",
        "new feature",
      ],
      weight: 0.7,
    },

    // Content type categories
    question: {
      keywords: [
        "how",
        "what",
        "why",
        "when",
        "where",
        "who",
        "can",
        "should",
        "would",
      ],
      weight: 0.6,
    },
    feedback: {
      keywords: ["feedback", "suggestion", "improvement", "idea", "recommend"],
      weight: 0.6,
    },
    complaint: {
      keywords: [
        "complaint",
        "disappointed",
        "frustrated",
        "unacceptable",
        "terrible",
      ],
      weight: 0.7,
    },
    praise: {
      keywords: [
        "great",
        "awesome",
        "excellent",
        "fantastic",
        "amazing",
        "love",
        "perfect",
      ],
      weight: 0.6,
    },

    // Warning categories
    inappropriate: {
      keywords: ["nsfw", "explicit", "adult", "18+", "mature"],
      weight: 0.9,
    },
    harassment: {
      keywords: ["harass", "bully", "threaten", "stalk", "intimidate"],
      weight: 0.9,
    },
    spam: {
      keywords: ["spam", "advertisement", "promotion", "buy now", "click here"],
      weight: 0.8,
    },
  };

  // Language patterns
  private languagePatterns = {
    en: /^[a-zA-Z\s.,!?'-]+$/,
    es: /[áéíóúñ¿¡]/i,
    fr: /[àâäéèêëïîôùûüÿœç]/i,
    de: /[äöüß]/i,
    it: /[àèéìòù]/i,
    pt: /[ãõáéíóúâêôç]/i,
    ru: /[а-яА-ЯёЁ]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
    ko: /[\uAC00-\uD7AF]/,
    zh: /[\u4E00-\u9FFF]/,
  };

  // Sentiment words
  private positiveWords = [
    "good",
    "great",
    "excellent",
    "awesome",
    "amazing",
    "wonderful",
    "fantastic",
    "love",
    "like",
    "enjoy",
    "happy",
    "perfect",
    "best",
    "brilliant",
    "outstanding",
    "thank",
    "thanks",
    "appreciate",
    "helpful",
    "nice",
    "cool",
  ];

  private negativeWords = [
    "bad",
    "terrible",
    "awful",
    "horrible",
    "poor",
    "worst",
    "hate",
    "dislike",
    "angry",
    "frustrated",
    "disappointed",
    "sad",
    "upset",
    "annoyed",
    "broken",
    "useless",
    "worthless",
    "fail",
    "error",
    "problem",
    "issue",
    "bug",
  ];

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CLASSIFIER_CONFIG, ...config };

    // Add custom categories
    if (config.customCategories) {
      for (const custom of config.customCategories) {
        this.categories[custom.name as keyof typeof this.categories] = {
          keywords: custom.keywords,
          weight: 0.7,
        };
      }
    }
  }

  /**
   * Classify content
   */
  async classify(
    content: string,
    contentType?: string,
  ): Promise<ClassificationResult> {
    const lowerContent = content.toLowerCase();

    // Detect content type if not provided
    const detectedContentType = contentType
      ? (contentType as ClassificationResult["contentType"])
      : this.detectContentType(content);

    // Category detection
    const categories = this.config.enableCategoryDetection
      ? this.detectCategories(lowerContent)
      : [];

    // Primary category
    const primaryCategory =
      categories.length > 0 ? categories[0].name : "general";
    const confidence = categories.length > 0 ? categories[0].score : 0.5;

    // Language detection
    const { detectedLanguage, languageConfidence } = this.config
      .enableLanguageDetection
      ? this.detectLanguage(content)
      : { detectedLanguage: "en", languageConfidence: 1 };

    // Sentiment analysis
    const { sentiment, sentimentScore } = this.config.enableSentimentAnalysis
      ? this.analyzeSentiment(lowerContent)
      : { sentiment: "neutral" as const, sentimentScore: 0 };

    // Topic extraction
    const detectedTopics = this.config.enableTopicExtraction
      ? this.extractTopics(lowerContent)
      : [];

    // NSFW detection (text-based)
    const isNSFW = this.config.enableNSFWDetection
      ? this.detectNSFWText(lowerContent)
      : false;

    // Inappropriate content detection
    const isInappropriate =
      isNSFW ||
      categories.some((c) => ["inappropriate", "harassment"].includes(c.name));

    const isSafe = !isInappropriate && !isNSFW;

    return {
      primaryCategory,
      confidence,
      categories,
      isInappropriate,
      isNSFW,
      isSafe,
      detectedLanguage,
      languageConfidence,
      contentType: detectedContentType,
      sentiment,
      sentimentScore,
      detectedTopics,
    };
  }

  /**
   * Detect categories from content
   */
  private detectCategories(content: string): ContentCategory[] {
    const results: ContentCategory[] = [];

    for (const [name, category] of Object.entries(this.categories)) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // Check keywords
      for (const keyword of category.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
          score += category.weight;
        }
      }

      if (score > 0) {
        // Normalize score
        const normalizedScore = Math.min(score / category.keywords.length, 1);

        if (normalizedScore >= this.config.categoryThreshold) {
          results.push({
            name,
            score: normalizedScore,
            subcategories: matchedKeywords,
          });
        }
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Detect content type
   */
  private detectContentType(
    content: string,
  ): ClassificationResult["contentType"] {
    // Code detection
    const codePatterns = [
      /```/,
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /import\s+.*from/,
      /class\s+\w+/,
      /<\w+>/,
      /\{[\s\S]*\}/,
    ];

    for (const pattern of codePatterns) {
      if (pattern.test(content)) {
        return "code";
      }
    }

    // URL detection (might be document/image link)
    if (/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|svg|webp))/i.test(content)) {
      return "image";
    }

    if (/(https?:\/\/[^\s]+\.(mp4|webm|mov|avi))/i.test(content)) {
      return "video";
    }

    if (/(https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a))/i.test(content)) {
      return "audio";
    }

    if (
      /(https?:\/\/[^\s]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx))/i.test(content)
    ) {
      return "document";
    }

    // Default to text
    return "text";
  }

  /**
   * Detect language
   */
  private detectLanguage(content: string): {
    detectedLanguage: string;
    languageConfidence: number;
  } {
    const scores = new Map<string, number>();

    // Check each language pattern
    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        const score = matches.length / content.length;
        scores.set(lang, score);
      }
    }

    // Get highest scoring language
    let detectedLanguage = "en";
    let languageConfidence = 0;

    for (const [lang, score] of scores.entries()) {
      if (score > languageConfidence) {
        languageConfidence = score;
        detectedLanguage = lang;
      }
    }

    // Default to English if confidence is too low
    if (languageConfidence < this.config.languageThreshold) {
      detectedLanguage = "en";
      languageConfidence = 0.5;
    }

    return { detectedLanguage, languageConfidence };
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(content: string): {
    sentiment: ClassificationResult["sentiment"];
    sentimentScore: number;
  } {
    const words = content.split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (this.positiveWords.includes(word)) {
        positiveCount++;
      }
      if (this.negativeWords.includes(word)) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;

    if (totalSentimentWords === 0) {
      return { sentiment: "neutral", sentimentScore: 0 };
    }

    const sentimentScore =
      (positiveCount - negativeCount) / totalSentimentWords;

    let sentiment: ClassificationResult["sentiment"];
    if (sentimentScore > 0.2) {
      sentiment = "positive";
    } else if (sentimentScore < -0.2) {
      sentiment = "negative";
    } else {
      sentiment = "neutral";
    }

    return { sentiment, sentimentScore };
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];

    // Extract hashtags
    const hashtags = content.match(/#(\w+)/g);
    if (hashtags) {
      topics.push(...hashtags.map((h) => h.substring(1)));
    }

    // Extract common nouns (simplified)
    const words = content.split(/\s+/);
    const capitalizedWords = words.filter(
      (w) => /^[A-Z][a-z]+$/.test(w) && w.length > 3,
    );
    topics.push(...capitalizedWords);

    // Deduplicate and limit
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * Detect NSFW text content
   */
  private detectNSFWText(content: string): boolean {
    const nsfwKeywords = [
      "nsfw",
      "porn",
      "xxx",
      "adult",
      "explicit",
      "nude",
      "naked",
      "sex",
      "18+",
      "mature content",
    ];

    for (const keyword of nsfwKeywords) {
      if (content.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClassifierConfig>): void {
    this.config = { ...this.config, ...updates };

    // Add new custom categories
    if (updates.customCategories) {
      for (const custom of updates.customCategories) {
        this.categories[custom.name as keyof typeof this.categories] = {
          keywords: custom.keywords,
          weight: 0.7,
        };
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): ClassifierConfig {
    return { ...this.config };
  }

  /**
   * Add custom category
   */
  addCategory(name: string, keywords: string[], weight: number = 0.7): void {
    this.categories[name as keyof typeof this.categories] = {
      keywords,
      weight,
    };
  }

  /**
   * Remove category
   */
  removeCategory(name: string): void {
    delete this.categories[name as keyof typeof this.categories];
  }
}

// Singleton instance
let contentClassifier: ContentClassifier | null = null;

export function getContentClassifier(
  config?: Partial<ClassifierConfig>,
): ContentClassifier {
  if (!contentClassifier || config) {
    contentClassifier = new ContentClassifier(config);
  }
  return contentClassifier;
}
