/**
 * Sentiment Analysis Service
 * Message mood detection and emotion classification
 * Part of v0.7.0 AI Message Summarization system
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import type { Message } from "./message-summarizer";

// Re-export Message type for consumers
export type { Message };

export interface SentimentAnalysisResult {
  sentiment: Sentiment;
  emotion: Emotion;
  confidence: number;
  score: number; // -1 (very negative) to 1 (very positive)
  breakdown: SentimentBreakdown;
  context: SentimentContext;
}

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

export type Emotion =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "neutral";

export interface SentimentBreakdown {
  positive: number; // 0-100%
  negative: number; // 0-100%
  neutral: number; // 0-100%
}

export interface SentimentContext {
  keywords: string[];
  indicators: {
    positive: string[];
    negative: string[];
  };
  emotionalIntensity: "low" | "medium" | "high";
  toxicity: number; // 0-100
}

export interface SentimentTrend {
  period: string;
  sentiments: SentimentDataPoint[];
  average: SentimentBreakdown;
  trend: "improving" | "declining" | "stable";
  volatility: number; // 0-100
}

export interface SentimentDataPoint {
  timestamp: Date;
  sentiment: Sentiment;
  score: number;
  messageId: string;
}

export interface TeamMoraleReport {
  overall: Sentiment;
  score: number; // 0-100
  trend: "up" | "down" | "stable";
  indicators: {
    engagement: number; // 0-100
    satisfaction: number; // 0-100
    stress: number; // 0-100
  };
  recommendations: string[];
  period: {
    start: Date;
    end: Date;
  };
}

export interface SentimentOptions {
  includeEmotions?: boolean;
  detectToxicity?: boolean;
  includeTrends?: boolean;
  contextWindow?: number;
  language?: string;
}

export type AIProvider = "openai" | "anthropic" | "local";

export interface SentimentAnalyzerConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  useLocalFallback?: boolean;
}

// Default configurations
const DEFAULT_OPENAI_MODEL = "gpt-4-turbo-preview";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

// Emotion lexicon for local analysis
const EMOTION_LEXICON = {
  joy: [
    "happy",
    "joy",
    "delighted",
    "excited",
    "wonderful",
    "amazing",
    "great",
    "excellent",
    "awesome",
    "fantastic",
  ],
  sadness: [
    "sad",
    "disappointed",
    "unhappy",
    "unfortunate",
    "regret",
    "sorry",
    "depressed",
    "down",
  ],
  anger: [
    "angry",
    "frustrated",
    "annoyed",
    "irritated",
    "furious",
    "mad",
    "upset",
    "outraged",
  ],
  fear: [
    "afraid",
    "scared",
    "worried",
    "anxious",
    "nervous",
    "concerned",
    "frightened",
    "terrified",
  ],
  surprise: [
    "surprised",
    "shocked",
    "amazed",
    "astonished",
    "unexpected",
    "wow",
    "incredible",
  ],
  disgust: ["disgusting", "awful", "terrible", "horrible", "gross", "nasty"],
  trust: [
    "trust",
    "believe",
    "reliable",
    "confident",
    "sure",
    "certain",
    "agree",
  ],
  anticipation: [
    "excited",
    "looking forward",
    "anticipate",
    "expect",
    "hope",
    "eager",
  ],
};

const POSITIVE_WORDS = [
  "good",
  "great",
  "excellent",
  "amazing",
  "awesome",
  "wonderful",
  "fantastic",
  "perfect",
  "love",
  "like",
  "best",
  "thanks",
  "thank you",
  "appreciate",
  "helpful",
  "nice",
  "brilliant",
  "outstanding",
];

const NEGATIVE_WORDS = [
  "bad",
  "wrong",
  "error",
  "issue",
  "problem",
  "failed",
  "failure",
  "bug",
  "broken",
  "terrible",
  "awful",
  "horrible",
  "worst",
  "hate",
  "dislike",
  "disappointed",
  "frustrating",
  "annoying",
];

const TOXIC_PATTERNS = [
  "stupid",
  "idiot",
  "dumb",
  "useless",
  "pathetic",
  "trash",
  "garbage",
];

/**
 * Sentiment Analyzer class
 */
export class SentimentAnalyzer {
  private config: SentimentAnalyzerConfig;
  private isAvailable: boolean;

  constructor(config?: Partial<SentimentAnalyzerConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      model: config?.model,
      endpoint: config?.endpoint,
      useLocalFallback: config?.useLocalFallback ?? true,
    };

    this.isAvailable = this.checkAvailability();
  }

  /**
   * Detect which AI provider to use
   */
  private detectProvider(): AIProvider {
    if (typeof window !== "undefined") {
      if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) return "openai";
      if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) return "anthropic";
    } else {
      if (process.env.OPENAI_API_KEY) return "openai";
      if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    }
    return "local";
  }

  /**
   * Check if AI is available
   */
  private checkAvailability(): boolean {
    if (this.config.provider === "local") return true;
    const apiKey = this.config.apiKey || this.getAPIKey();
    return !!apiKey;
  }

  /**
   * Get API key from environment
   */
  private getAPIKey(): string | undefined {
    if (typeof window !== "undefined") {
      if (this.config.provider === "openai") {
        return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      }
      if (this.config.provider === "anthropic") {
        return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      }
    } else {
      if (this.config.provider === "openai") {
        return process.env.OPENAI_API_KEY;
      }
      if (this.config.provider === "anthropic") {
        return process.env.ANTHROPIC_API_KEY;
      }
    }
    return undefined;
  }

  /**
   * Check if AI features are available
   */
  public available(): boolean {
    return this.isAvailable;
  }

  /**
   * Get current provider
   */
  public getProvider(): AIProvider {
    return this.config.provider;
  }

  /**
   * Analyze sentiment of a single message
   */
  async analyzeMessage(
    message: Message,
    options: SentimentOptions = {},
  ): Promise<SentimentAnalysisResult> {
    try {
      addSentryBreadcrumb("ai", "Sentiment analysis started", {
        provider: this.config.provider,
        messageId: message.id,
      });

      if (this.isAvailable && this.config.provider !== "local") {
        return await this.analyzeWithAI(message, options);
      } else {
        return this.analyzeLocally(message, options);
      }
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "sentiment-analysis", provider: this.config.provider },
        extra: { messageId: message.id },
      });

      if (this.config.useLocalFallback) {
        return this.analyzeLocally(message, options);
      }

      throw error;
    }
  }

  /**
   * Analyze sentiment trends over time
   */
  async analyzeTrends(
    messages: Message[],
    options: SentimentOptions = {},
  ): Promise<SentimentTrend> {
    if (messages.length === 0) {
      return this.createEmptyTrend();
    }

    try {
      // Analyze each message
      const analyses = await Promise.all(
        messages.map((msg) => this.analyzeMessage(msg, options)),
      );

      // Create data points
      const sentiments: SentimentDataPoint[] = messages.map((msg, index) => ({
        timestamp: new Date(msg.createdAt),
        sentiment: analyses[index].sentiment,
        score: analyses[index].score,
        messageId: msg.id,
      }));

      // Calculate average
      const totalBreakdown = analyses.reduce(
        (acc, analysis) => ({
          positive: acc.positive + analysis.breakdown.positive,
          negative: acc.negative + analysis.breakdown.negative,
          neutral: acc.neutral + analysis.breakdown.neutral,
        }),
        { positive: 0, negative: 0, neutral: 0 },
      );

      const average: SentimentBreakdown = {
        positive: totalBreakdown.positive / analyses.length,
        negative: totalBreakdown.negative / analyses.length,
        neutral: totalBreakdown.neutral / analyses.length,
      };

      // Determine trend
      const trend = this.determineTrend(sentiments);

      // Calculate volatility
      const volatility = this.calculateVolatility(sentiments);

      return {
        period: this.formatPeriod(messages),
        sentiments,
        average,
        trend,
        volatility,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "sentiment-trends" },
        extra: { messageCount: messages.length },
      });

      return this.createEmptyTrend();
    }
  }

  /**
   * Generate team morale report
   */
  async generateMoraleReport(
    messages: Message[],
    period: { start: Date; end: Date },
  ): Promise<TeamMoraleReport> {
    if (messages.length === 0) {
      return this.createEmptyMoraleReport(period);
    }

    try {
      const trend = await this.analyzeTrends(messages);

      // Calculate overall sentiment
      const overallScore =
        (trend.average.positive - trend.average.negative + 1) * 50;

      const overall: Sentiment =
        trend.average.positive > 60
          ? "positive"
          : trend.average.negative > 60
            ? "negative"
            : trend.average.positive > 40 && trend.average.negative > 40
              ? "mixed"
              : "neutral";

      // Calculate indicators
      const engagement = this.calculateEngagement(messages);
      const satisfaction = trend.average.positive;
      const stress = trend.average.negative;

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        overall,
        score: overallScore,
        engagement,
        satisfaction,
        stress,
      });

      return {
        overall,
        score: overallScore,
        trend:
          trend.trend === "improving"
            ? "up"
            : trend.trend === "declining"
              ? "down"
              : "stable",
        indicators: {
          engagement,
          satisfaction,
          stress,
        },
        recommendations,
        period,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "morale-report" },
        extra: { messageCount: messages.length },
      });

      return this.createEmptyMoraleReport(period);
    }
  }

  /**
   * Analyze with AI (OpenAI/Anthropic)
   */
  private async analyzeWithAI(
    message: Message,
    options: SentimentOptions,
  ): Promise<SentimentAnalysisResult> {
    const prompt = this.buildSentimentPrompt(message, options);

    const response =
      this.config.provider === "openai"
        ? await this.analyzeWithOpenAI(prompt)
        : await this.analyzeWithAnthropic(prompt);

    return this.parseAIResponse(response, message);
  }

  /**
   * Build sentiment analysis prompt
   */
  private buildSentimentPrompt(
    message: Message,
    options: SentimentOptions,
  ): string {
    let prompt = `Analyze the sentiment and emotion of this message. Provide:
1. Sentiment (positive/negative/neutral/mixed)
2. Emotion (joy/sadness/anger/fear/surprise/disgust/trust/anticipation/neutral)
3. Confidence (0-100)
4. Score (-1 to 1, where -1 is very negative and 1 is very positive)
5. Breakdown (positive%, negative%, neutral%)
6. Emotional intensity (low/medium/high)

Message: "${message.content}"`;

    if (options.detectToxicity) {
      prompt += "\n7. Toxicity level (0-100)";
    }

    prompt += "\n\nRespond in JSON format.";

    return prompt;
  }

  /**
   * Analyze with OpenAI
   */
  private async analyzeWithOpenAI(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || this.getAPIKey();
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const model = this.config.model || DEFAULT_OPENAI_MODEL;
    const endpoint =
      this.config.endpoint || "https://api.openai.com/v1/chat/completions";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert sentiment analysis assistant. Provide accurate, nuanced sentiment and emotion analysis.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "{}";
  }

  /**
   * Analyze with Anthropic
   */
  private async analyzeWithAnthropic(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || this.getAPIKey();
    if (!apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const model = this.config.model || DEFAULT_ANTHROPIC_MODEL;
    const endpoint =
      this.config.endpoint || "https://api.anthropic.com/v1/messages";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
        system:
          "You are an expert sentiment analysis assistant. Provide accurate, nuanced sentiment and emotion analysis. Always respond in valid JSON format.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "{}";
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(
    response: string,
    message: Message,
  ): SentimentAnalysisResult {
    try {
      const parsed = JSON.parse(response);

      return {
        sentiment: parsed.sentiment || "neutral",
        emotion: parsed.emotion || "neutral",
        confidence: parsed.confidence || 50,
        score: parsed.score || 0,
        breakdown: parsed.breakdown || {
          positive: 33,
          negative: 33,
          neutral: 34,
        },
        context: {
          keywords: parsed.keywords || [],
          indicators: parsed.indicators || { positive: [], negative: [] },
          emotionalIntensity: parsed.emotionalIntensity || "medium",
          toxicity: parsed.toxicity || 0,
        },
      };
    } catch (error) {
      // If JSON parsing fails, fall back to local analysis
      return this.analyzeLocally(message, {});
    }
  }

  /**
   * Local sentiment analysis (rule-based)
   */
  private analyzeLocally(
    message: Message,
    options: SentimentOptions,
  ): SentimentAnalysisResult {
    const content = message.content.toLowerCase();

    // Count positive and negative words
    const positiveCount = POSITIVE_WORDS.filter((word) =>
      content.includes(word),
    ).length;
    const negativeCount = NEGATIVE_WORDS.filter((word) =>
      content.includes(word),
    ).length;

    // Calculate sentiment
    const total = positiveCount + negativeCount || 1;
    const positivePercent = (positiveCount / total) * 100;
    const negativePercent = (negativeCount / total) * 100;
    const neutralPercent = 100 - positivePercent - negativePercent;

    const score = (positiveCount - negativeCount) / total;

    let sentiment: Sentiment = "neutral";
    if (positivePercent > 60) sentiment = "positive";
    else if (negativePercent > 60) sentiment = "negative";
    else if (positivePercent > 30 && negativePercent > 30) sentiment = "mixed";

    // Detect emotion
    const emotion = this.detectEmotion(content);

    // Detect toxicity
    const toxicity = options.detectToxicity ? this.detectToxicity(content) : 0;

    // Determine emotional intensity
    const emotionalIntensity = this.determineIntensity(content);

    return {
      sentiment,
      emotion,
      confidence: Math.min(50 + (positiveCount + negativeCount) * 10, 95),
      score,
      breakdown: {
        positive: positivePercent,
        negative: negativePercent,
        neutral: neutralPercent,
      },
      context: {
        keywords: [...POSITIVE_WORDS, ...NEGATIVE_WORDS].filter((word) =>
          content.includes(word),
        ),
        indicators: {
          positive: POSITIVE_WORDS.filter((word) => content.includes(word)),
          negative: NEGATIVE_WORDS.filter((word) => content.includes(word)),
        },
        emotionalIntensity,
        toxicity,
      },
    };
  }

  /**
   * Detect emotion from content
   */
  private detectEmotion(content: string): Emotion {
    const scores = Object.entries(EMOTION_LEXICON).map(([emotion, words]) => ({
      emotion: emotion as Emotion,
      score: words.filter((word) => content.includes(word)).length,
    }));

    const maxScore = Math.max(...scores.map((s) => s.score));
    if (maxScore === 0) return "neutral";

    const topEmotion = scores.find((s) => s.score === maxScore);
    return topEmotion?.emotion || "neutral";
  }

  /**
   * Detect toxicity
   */
  private detectToxicity(content: string): number {
    const toxicMatches = TOXIC_PATTERNS.filter((pattern) =>
      content.includes(pattern),
    ).length;

    // Also check for excessive caps and exclamation marks
    const capsRatio =
      (content.match(/[A-Z]/g)?.length || 0) / (content.length || 1);
    const exclamationCount = content.match(/!/g)?.length || 0;

    let toxicity = toxicMatches * 30;
    if (capsRatio > 0.5) toxicity += 20;
    if (exclamationCount > 3) toxicity += 10;

    return Math.min(toxicity, 100);
  }

  /**
   * Determine emotional intensity
   */
  private determineIntensity(content: string): "low" | "medium" | "high" {
    const capsRatio =
      (content.match(/[A-Z]/g)?.length || 0) / (content.length || 1);
    const exclamationCount = content.match(/!/g)?.length || 0;
    const emotionalWords = [...POSITIVE_WORDS, ...NEGATIVE_WORDS].filter(
      (word) => content.includes(word),
    ).length;

    const intensity =
      capsRatio * 100 + exclamationCount * 10 + emotionalWords * 5;

    if (intensity > 50) return "high";
    if (intensity > 20) return "medium";
    return "low";
  }

  /**
   * Determine trend from sentiment data points
   */
  private determineTrend(
    sentiments: SentimentDataPoint[],
  ): "improving" | "declining" | "stable" {
    if (sentiments.length < 3) return "stable";

    // Compare first third vs last third
    const third = Math.floor(sentiments.length / 3);
    const firstThird = sentiments.slice(0, third);
    const lastThird = sentiments.slice(-third);

    const firstAvg =
      firstThird.reduce((sum, s) => sum + s.score, 0) / firstThird.length;
    const lastAvg =
      lastThird.reduce((sum, s) => sum + s.score, 0) / lastThird.length;

    const diff = lastAvg - firstAvg;

    if (diff > 0.2) return "improving";
    if (diff < -0.2) return "declining";
    return "stable";
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(sentiments: SentimentDataPoint[]): number {
    if (sentiments.length < 2) return 0;

    const scores = sentiments.map((s) => s.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    return Math.min(Math.sqrt(variance) * 100, 100);
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagement(messages: Message[]): number {
    // Simple heuristic based on message frequency
    const timeSpan =
      new Date(messages[messages.length - 1].createdAt).getTime() -
      new Date(messages[0].createdAt).getTime();

    const hoursSpan = timeSpan / (1000 * 60 * 60);
    const messagesPerHour = messages.length / (hoursSpan || 1);

    // Normalize to 0-100 (assuming 10+ messages/hour is high engagement)
    return Math.min((messagesPerHour / 10) * 100, 100);
  }

  /**
   * Generate morale recommendations
   */
  private generateRecommendations(metrics: {
    overall: Sentiment;
    score: number;
    engagement: number;
    satisfaction: number;
    stress: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.stress > 60) {
      recommendations.push(
        "High stress levels detected. Consider team wellness initiatives or workload review.",
      );
    }

    if (metrics.satisfaction < 40) {
      recommendations.push(
        "Low satisfaction detected. Schedule team feedback sessions to address concerns.",
      );
    }

    if (metrics.engagement < 30) {
      recommendations.push(
        "Low engagement observed. Consider team-building activities or recognition programs.",
      );
    }

    if (metrics.overall === "negative" && metrics.score < 30) {
      recommendations.push(
        "Overall negative sentiment. Immediate attention required to address team morale.",
      );
    }

    if (metrics.overall === "positive" && metrics.score > 70) {
      recommendations.push(
        "Excellent team morale! Continue current practices and celebrate successes.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Team morale appears stable. Continue monitoring regularly.",
      );
    }

    return recommendations;
  }

  /**
   * Format period label
   */
  private formatPeriod(messages: Message[]): string {
    if (messages.length === 0) return "No period";

    const start = new Date(messages[0].createdAt);
    const end = new Date(messages[messages.length - 1].createdAt);

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  /**
   * Create empty trend
   */
  private createEmptyTrend(): SentimentTrend {
    return {
      period: "No data",
      sentiments: [],
      average: { positive: 0, negative: 0, neutral: 100 },
      trend: "stable",
      volatility: 0,
    };
  }

  /**
   * Create empty morale report
   */
  private createEmptyMoraleReport(period: {
    start: Date;
    end: Date;
  }): TeamMoraleReport {
    return {
      overall: "neutral",
      score: 50,
      trend: "stable",
      indicators: {
        engagement: 0,
        satisfaction: 0,
        stress: 0,
      },
      recommendations: ["Insufficient data to generate recommendations."],
      period,
    };
  }
}

// Singleton instance
let sentimentAnalyzer: SentimentAnalyzer | null = null;

/**
 * Get or create the global sentiment analyzer instance
 */
export function getSentimentAnalyzer(
  config?: Partial<SentimentAnalyzerConfig>,
): SentimentAnalyzer {
  if (!sentimentAnalyzer || config) {
    sentimentAnalyzer = new SentimentAnalyzer(config);
  }
  return sentimentAnalyzer;
}

/**
 * Quick helper to check if sentiment analysis is available
 */
export function isSentimentAnalysisAvailable(): boolean {
  const analyzer = getSentimentAnalyzer();
  return analyzer.available();
}
