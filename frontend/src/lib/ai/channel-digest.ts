/**
 * Channel Digest Service
 * Daily/weekly channel summaries with configurable schedules
 * Part of v0.7.0 AI Message Summarization system
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import type { Message } from "./message-summarizer";

// Re-export Message type for consumers
export type { Message };

export interface ChannelDigestResult {
  digest: string;
  topMessages: TopMessage[];
  highlights: Highlight[];
  trendingTopics: TrendingTopic[];
  statistics: DigestStatistics;
  timeRange: TimeRange;
  schedule: DigestSchedule;
}

export interface TopMessage {
  messageId: string;
  content: string;
  author: string;
  timestamp: Date;
  reactions: number;
  replies: number;
  score: number; // Relevance score
  reason: string; // Why it's a top message
}

export interface Highlight {
  id: string;
  type:
    | "announcement"
    | "decision"
    | "milestone"
    | "achievement"
    | "discussion";
  summary: string;
  relatedMessages: string[]; // Message IDs
  timestamp: Date;
  participants: string[];
}

export interface TrendingTopic {
  topic: string;
  mentions: number;
  trend: "rising" | "stable" | "declining";
  relatedKeywords: string[];
  firstMentioned: Date;
  lastMentioned: Date;
  messageIds: string[];
}

export interface DigestStatistics {
  totalMessages: number;
  activeUsers: number;
  newMembers: number;
  peakActivityHour: number;
  averageResponseTime: number; // minutes
  mostActiveUser: {
    userId: string;
    userName: string;
    messageCount: number;
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface TimeRange {
  start: Date;
  end: Date;
  duration: number; // milliseconds
  label: string; // e.g., "Jan 29-30, 2025"
}

export interface DigestSchedule {
  type: "daily" | "weekly" | "custom";
  frequency: number; // hours
  nextRun: Date;
  enabled: boolean;
}

export interface ChannelDigestOptions {
  period: "daily" | "weekly" | "custom";
  customRange?: { start: Date; end: Date };
  maxTopMessages?: number;
  maxHighlights?: number;
  maxTopics?: number;
  includeStatistics?: boolean;
  includeTrending?: boolean;
  minMessageThreshold?: number;
  language?: string;
}

export type AIProvider = "openai" | "anthropic" | "local";

export interface ChannelDigestConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  rateLimit?: {
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
  };
}

// Default configurations
const DEFAULT_OPENAI_MODEL = "gpt-4-turbo-preview";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_TOP_MESSAGES = 5;
const DEFAULT_HIGHLIGHTS = 3;
const DEFAULT_TOPICS = 5;

/**
 * Channel Digest Generator
 */
export class ChannelDigestGenerator {
  private config: ChannelDigestConfig;
  private isAvailable: boolean;
  private requestCounter: Map<string, number[]> = new Map(); // For rate limiting

  constructor(config?: Partial<ChannelDigestConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      model: config?.model,
      endpoint: config?.endpoint,
      rateLimit: config?.rateLimit || {
        maxRequestsPerHour: 100,
        maxRequestsPerDay: 1000,
      },
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
   * Generate channel digest
   */
  async generateDigest(
    channelId: string,
    messages: Message[],
    options: ChannelDigestOptions = { period: "daily" },
  ): Promise<ChannelDigestResult> {
    if (messages.length === 0) {
      return this.createEmptyDigest(channelId, options);
    }

    try {
      // Check rate limits
      if (!this.checkRateLimit(channelId)) {
        throw new Error("Rate limit exceeded for channel digest generation");
      }

      addSentryBreadcrumb("ai", "Channel digest generation started", {
        provider: this.config.provider,
        channelId,
        messageCount: messages.length,
        period: options.period,
      });

      // Extract time range
      const timeRange = this.extractTimeRange(messages, options);

      // Generate components in parallel
      const [digest, topMessages, highlights, trendingTopics, statistics] =
        await Promise.all([
          this.generateDigestSummary(messages, options),
          this.extractTopMessages(messages, options.maxTopMessages),
          this.extractHighlights(messages, options.maxHighlights),
          options.includeTrending !== false
            ? this.extractTrendingTopics(messages, options.maxTopics)
            : Promise.resolve([]),
          options.includeStatistics !== false
            ? this.calculateStatistics(messages)
            : Promise.resolve(this.createEmptyStatistics()),
        ]);

      // Calculate next digest schedule
      const schedule = this.calculateNextSchedule(options.period);

      this.recordRequest(channelId);

      return {
        digest,
        topMessages,
        highlights,
        trendingTopics,
        statistics,
        timeRange,
        schedule,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "channel-digest", provider: this.config.provider },
        extra: { channelId, messageCount: messages.length },
      });

      // Fallback to local digest
      return this.generateLocalDigest(channelId, messages, options);
    }
  }

  /**
   * Generate digest summary using AI
   */
  private async generateDigestSummary(
    messages: Message[],
    options: ChannelDigestOptions,
  ): Promise<string> {
    if (!this.isAvailable) {
      return this.generateLocalDigestSummary(messages, options);
    }

    const prompt = this.buildDigestPrompt(messages, options);

    try {
      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 800)
          : await this.generateWithAnthropic(prompt, 800);

      return response;
    } catch (error) {
      return this.generateLocalDigestSummary(messages, options);
    }
  }

  /**
   * Extract top messages
   */
  private async extractTopMessages(
    messages: Message[],
    maxMessages: number = DEFAULT_TOP_MESSAGES,
  ): Promise<TopMessage[]> {
    // Score messages based on various factors
    const scoredMessages = messages.map((msg) => {
      let score = 0;

      // Length score (prefer substantial messages)
      const wordCount = msg.content.split(/\s+/).length;
      if (wordCount >= 20 && wordCount <= 200) score += 20;
      else if (wordCount >= 10) score += 10;

      // Question/answer detection
      if (msg.content.includes("?")) score += 15;
      if (/\b(yes|no|sure|okay|agreed)\b/i.test(msg.content)) score += 10;

      // Decision indicators
      const decisionWords = [
        "decided",
        "agreed",
        "will do",
        "let's",
        "approved",
      ];
      if (decisionWords.some((w) => msg.content.toLowerCase().includes(w))) {
        score += 25;
      }

      // Announcement indicators
      if (/^(FYI|PSA|Announcement|Important|Note):/i.test(msg.content)) {
        score += 30;
      }

      return { message: msg, score };
    });

    // Sort by score and get top N
    const topScored = scoredMessages
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMessages);

    return topScored.map(({ message, score }) => {
      let reason = "High engagement";
      if (score >= 50) reason = "Important announcement or decision";
      else if (score >= 30) reason = "Significant contribution";
      else if (score >= 20) reason = "Key discussion point";

      return {
        messageId: message.id,
        content: message.content,
        author: message.userName || "Unknown",
        timestamp: new Date(message.createdAt),
        reactions: 0, // Would be populated from real data
        replies: 0, // Would be populated from real data
        score,
        reason,
      };
    });
  }

  /**
   * Extract highlights
   */
  private async extractHighlights(
    messages: Message[],
    maxHighlights: number = DEFAULT_HIGHLIGHTS,
  ): Promise<Highlight[]> {
    if (!this.isAvailable || messages.length === 0) {
      return this.extractLocalHighlights(messages, maxHighlights);
    }

    try {
      const prompt = this.buildHighlightsPrompt(messages);

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 600)
          : await this.generateWithAnthropic(prompt, 600);

      return this.parseHighlights(response, messages).slice(0, maxHighlights);
    } catch (error) {
      return this.extractLocalHighlights(messages, maxHighlights);
    }
  }

  /**
   * Extract trending topics
   */
  private async extractTrendingTopics(
    messages: Message[],
    maxTopics: number = DEFAULT_TOPICS,
  ): Promise<TrendingTopic[]> {
    if (!this.isAvailable || messages.length === 0) {
      return this.extractLocalTopics(messages, maxTopics);
    }

    try {
      const prompt = this.buildTopicsPrompt(messages);

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 400)
          : await this.generateWithAnthropic(prompt, 400);

      return this.parseTopics(response, messages).slice(0, maxTopics);
    } catch (error) {
      return this.extractLocalTopics(messages, maxTopics);
    }
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(messages: Message[]): DigestStatistics {
    const userMessages = new Map<string, Message[]>();
    const users = new Set<string>();

    messages.forEach((msg) => {
      users.add(msg.userId);
      if (!userMessages.has(msg.userId)) {
        userMessages.set(msg.userId, []);
      }
      userMessages.get(msg.userId)!.push(msg);
    });

    // Find most active user
    let mostActiveUser = {
      userId: "",
      userName: "Unknown",
      messageCount: 0,
    };

    userMessages.forEach((msgs, userId) => {
      if (msgs.length > mostActiveUser.messageCount) {
        mostActiveUser = {
          userId,
          userName: msgs[0].userName || "Unknown",
          messageCount: msgs.length,
        };
      }
    });

    // Calculate peak activity hour
    const hourCounts = new Array(24).fill(0);
    messages.forEach((msg) => {
      const hour = new Date(msg.createdAt).getHours();
      hourCounts[hour]++;
    });
    const peakActivityHour = hourCounts.indexOf(Math.max(...hourCounts));

    // Calculate average response time (simplified)
    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < sortedMessages.length; i++) {
      const timeDiff =
        new Date(sortedMessages[i].createdAt).getTime() -
        new Date(sortedMessages[i - 1].createdAt).getTime();
      if (timeDiff < 3600000) {
        // Within 1 hour
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }

    const averageResponseTime =
      responseCount > 0 ? totalResponseTime / responseCount / 60000 : 0;

    // Basic sentiment (would be enhanced by sentiment-analyzer.ts)
    const positiveWords = [
      "great",
      "good",
      "awesome",
      "excellent",
      "thanks",
      "perfect",
    ];
    const negativeWords = [
      "bad",
      "issue",
      "problem",
      "error",
      "failed",
      "wrong",
    ];

    let positive = 0;
    let negative = 0;

    messages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      if (positiveWords.some((w) => content.includes(w))) positive++;
      if (negativeWords.some((w) => content.includes(w))) negative++;
    });

    const neutral = messages.length - positive - negative;

    return {
      totalMessages: messages.length,
      activeUsers: users.size,
      newMembers: 0, // Would be populated from real data
      peakActivityHour,
      averageResponseTime,
      mostActiveUser,
      sentiment: {
        positive: (positive / messages.length) * 100,
        neutral: (neutral / messages.length) * 100,
        negative: (negative / messages.length) * 100,
      },
    };
  }

  /**
   * Build digest prompt
   */
  private buildDigestPrompt(
    messages: Message[],
    options: ChannelDigestOptions,
  ): string {
    const periodLabel =
      options.period === "daily"
        ? "day"
        : options.period === "weekly"
          ? "week"
          : "period";

    const content = messages
      .map((m) => `${m.userName || "User"}: ${m.content}`)
      .join("\n");

    return `Create a comprehensive digest summary of this channel's activity over the ${periodLabel}. Include:
- Main themes and discussions
- Important decisions or announcements
- Notable achievements or milestones
- Overall tone and engagement level

Channel Activity (${messages.length} messages):
${content}

Digest Summary:`;
  }

  /**
   * Build highlights prompt
   */
  private buildHighlightsPrompt(messages: Message[]): string {
    const content = messages
      .map((m, i) => `[${i}] ${m.userName || "User"}: ${m.content}`)
      .join("\n");

    return `Identify 3-5 key highlights from this channel conversation. For each highlight, specify:
- Type (announcement/decision/milestone/achievement/discussion)
- Brief summary
- Related message indices

Messages:
${content}

Highlights (format: TYPE | SUMMARY | MESSAGE_INDICES):`;
  }

  /**
   * Build topics prompt
   */
  private buildTopicsPrompt(messages: Message[]): string {
    const content = messages.map((m) => m.content).join(" ");

    return `Identify 3-5 trending topics from this conversation. For each topic:
- Topic name
- Related keywords
- Trend (rising/stable/declining)

Content:
${content}

Topics (format: TOPIC | KEYWORDS | TREND):`;
  }

  /**
   * Generate with OpenAI
   */
  private async generateWithOpenAI(
    prompt: string,
    maxTokens: number,
  ): Promise<string> {
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
              "You are a helpful assistant that creates comprehensive channel digests and activity summaries.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * Generate with Anthropic
   */
  private async generateWithAnthropic(
    prompt: string,
    maxTokens: number,
  ): Promise<string> {
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
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
        system:
          "You are a helpful assistant that creates comprehensive channel digests and activity summaries.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }

  /**
   * Parse highlights from AI response
   */
  private parseHighlights(response: string, messages: Message[]): Highlight[] {
    const lines = response.split("\n").filter((line) => line.trim().length > 0);

    return lines.slice(0, 5).map((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      const typeStr =
        parts[0]?.toLowerCase().replace(/^[-•*\d.]\s*/, "") || "discussion";
      const type = [
        "announcement",
        "decision",
        "milestone",
        "achievement",
      ].includes(typeStr)
        ? (typeStr as Highlight["type"])
        : "discussion";
      const summary = parts[1] || line;
      const indices = parts[2]?.match(/\d+/g)?.map(Number) || [];

      const relatedMessages = indices
        .map((i) => messages[i]?.id)
        .filter(Boolean) as string[];

      return {
        id: `highlight-${index}-${Date.now()}`,
        type,
        summary,
        relatedMessages,
        timestamp: new Date(),
        participants: [],
      };
    });
  }

  /**
   * Parse topics from AI response
   */
  private parseTopics(response: string, messages: Message[]): TrendingTopic[] {
    const lines = response.split("\n").filter((line) => line.trim().length > 0);

    return lines.slice(0, 5).map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const topic = parts[0]?.replace(/^[-•*\d.]\s*/, "") || line;
      const keywords = parts[1]?.split(",").map((k) => k.trim()) || [];
      const trendStr = parts[2]?.toLowerCase() || "stable";
      const trend = ["rising", "declining"].includes(trendStr)
        ? (trendStr as TrendingTopic["trend"])
        : "stable";

      // Find messages mentioning this topic
      const topicLower = topic.toLowerCase();
      const relatedMessages = messages.filter((m) =>
        m.content.toLowerCase().includes(topicLower),
      );

      return {
        topic,
        mentions: relatedMessages.length,
        trend,
        relatedKeywords: keywords,
        firstMentioned: relatedMessages[0]
          ? new Date(relatedMessages[0].createdAt)
          : new Date(),
        lastMentioned: relatedMessages[relatedMessages.length - 1]
          ? new Date(relatedMessages[relatedMessages.length - 1].createdAt)
          : new Date(),
        messageIds: relatedMessages.map((m) => m.id),
      };
    });
  }

  /**
   * Extract time range
   */
  private extractTimeRange(
    messages: Message[],
    options: ChannelDigestOptions,
  ): TimeRange {
    if (options.customRange) {
      const duration =
        options.customRange.end.getTime() - options.customRange.start.getTime();
      return {
        start: options.customRange.start,
        end: options.customRange.end,
        duration,
        label: this.formatDateRange(
          options.customRange.start,
          options.customRange.end,
        ),
      };
    }

    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const start = new Date(sorted[0].createdAt);
    const end = new Date(sorted[sorted.length - 1].createdAt);
    const duration = end.getTime() - start.getTime();

    return {
      start,
      end,
      duration,
      label: this.formatDateRange(start, end),
    };
  }

  /**
   * Format date range
   */
  private formatDateRange(start: Date, end: Date): string {
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
      return start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  /**
   * Calculate next schedule
   */
  private calculateNextSchedule(
    period: "daily" | "weekly" | "custom",
  ): DigestSchedule {
    const now = new Date();
    const nextRun = new Date(now);

    if (period === "daily") {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(9, 0, 0, 0); // 9 AM next day
    } else if (period === "weekly") {
      nextRun.setDate(nextRun.getDate() + 7);
      nextRun.setHours(9, 0, 0, 0);
    }

    return {
      type: period,
      frequency: period === "daily" ? 24 : period === "weekly" ? 168 : 0,
      nextRun,
      enabled: true,
    };
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(channelId: string): boolean {
    const now = Date.now();
    const requests = this.requestCounter.get(channelId) || [];

    // Clean old requests (older than 24 hours)
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < 24 * 60 * 60 * 1000,
    );

    // Check hourly limit
    const lastHourRequests = recentRequests.filter(
      (timestamp) => now - timestamp < 60 * 60 * 1000,
    );

    if (lastHourRequests.length >= this.config.rateLimit!.maxRequestsPerHour) {
      return false;
    }

    // Check daily limit
    if (recentRequests.length >= this.config.rateLimit!.maxRequestsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Record request for rate limiting
   */
  private recordRequest(channelId: string): void {
    const requests = this.requestCounter.get(channelId) || [];
    requests.push(Date.now());
    this.requestCounter.set(channelId, requests);
  }

  /**
   * Local fallback methods
   */
  private generateLocalDigestSummary(
    messages: Message[],
    options: ChannelDigestOptions,
  ): string {
    const users = new Set(messages.map((m) => m.userName || "User"));
    const period = options.period;

    return `Channel ${period} digest: ${messages.length} messages from ${users.size} participants. Main discussion topics included general conversation and updates.`;
  }

  private extractLocalHighlights(
    messages: Message[],
    maxHighlights: number,
  ): Highlight[] {
    return messages.slice(0, maxHighlights).map((msg, index) => ({
      id: `highlight-${index}`,
      type: "discussion" as const,
      summary: msg.content.slice(0, 150),
      relatedMessages: [msg.id],
      timestamp: new Date(msg.createdAt),
      participants: [msg.userId],
    }));
  }

  private extractLocalTopics(
    messages: Message[],
    maxTopics: number,
  ): TrendingTopic[] {
    // Simple word frequency analysis
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      "the",
      "is",
      "at",
      "which",
      "on",
      "a",
      "an",
      "and",
      "or",
      "but",
    ]);

    messages.forEach((msg) => {
      const words = msg.content
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);

      words.forEach((word) => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTopics);

    return topWords.map(([word, count]) => ({
      topic: word,
      mentions: count,
      trend: "stable" as const,
      relatedKeywords: [],
      firstMentioned: new Date(messages[0].createdAt),
      lastMentioned: new Date(messages[messages.length - 1].createdAt),
      messageIds: [],
    }));
  }

  private createEmptyStatistics(): DigestStatistics {
    return {
      totalMessages: 0,
      activeUsers: 0,
      newMembers: 0,
      peakActivityHour: 12,
      averageResponseTime: 0,
      mostActiveUser: {
        userId: "",
        userName: "Unknown",
        messageCount: 0,
      },
      sentiment: {
        positive: 0,
        neutral: 100,
        negative: 0,
      },
    };
  }

  private createEmptyDigest(
    channelId: string,
    options: ChannelDigestOptions,
  ): ChannelDigestResult {
    const now = new Date();

    return {
      digest: "No activity in this period.",
      topMessages: [],
      highlights: [],
      trendingTopics: [],
      statistics: this.createEmptyStatistics(),
      timeRange: {
        start: now,
        end: now,
        duration: 0,
        label: this.formatDateRange(now, now),
      },
      schedule: this.calculateNextSchedule(options.period),
    };
  }

  private generateLocalDigest(
    channelId: string,
    messages: Message[],
    options: ChannelDigestOptions,
  ): ChannelDigestResult {
    return {
      digest: this.generateLocalDigestSummary(messages, options),
      topMessages: [],
      highlights: this.extractLocalHighlights(messages, DEFAULT_HIGHLIGHTS),
      trendingTopics: this.extractLocalTopics(messages, DEFAULT_TOPICS),
      statistics: this.calculateStatistics(messages),
      timeRange: this.extractTimeRange(messages, options),
      schedule: this.calculateNextSchedule(options.period),
    };
  }
}

// Singleton instance
let channelDigestGenerator: ChannelDigestGenerator | null = null;

/**
 * Get or create the global channel digest generator instance
 */
export function getChannelDigestGenerator(
  config?: Partial<ChannelDigestConfig>,
): ChannelDigestGenerator {
  if (!channelDigestGenerator || config) {
    channelDigestGenerator = new ChannelDigestGenerator(config);
  }
  return channelDigestGenerator;
}

/**
 * Quick helper to check if channel digest is available
 */
export function isChannelDigestAvailable(): boolean {
  const generator = getChannelDigestGenerator();
  return generator.available();
}
