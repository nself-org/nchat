/**
 * AI-powered message summarization service
 * Supports OpenAI, Anthropic (Claude), and local fallback
 * Gracefully degrades when API keys are not provided
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

// Types
export interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  userId: string;
  userName?: string;
}

export interface SummaryOptions {
  maxLength?: number;
  style?: "brief" | "detailed" | "bullets";
  includeKeyPoints?: boolean;
  language?: string;
}

export interface ChannelDigest {
  summary: string;
  keyPoints: string[];
  messageCount: number;
  participantCount: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topics?: string[];
}

export interface ThreadSummary {
  summary: string;
  participantCount: number;
  messageCount: number;
  resolved?: boolean;
  keyDecisions?: string[];
}

export type AIProvider = "openai" | "anthropic" | "local";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

// Default AI configurations
const DEFAULT_OPENAI_MODEL = "gpt-4-turbo-preview"; // GPT-4 Turbo as primary
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"; // Claude 3.5 Haiku as fallback

/**
 * Message Summarizer class
 */
export class MessageSummarizer {
  private config: AIConfig;
  private isAvailable: boolean;
  private totalCost: number = 0;
  private requestCount: number = 0;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config?: Partial<AIConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      model: config?.model,
      endpoint: config?.endpoint,
    };

    this.isAvailable = this.checkAvailability();
  }

  /**
   * Detect which AI provider to use based on available API keys
   */
  private detectProvider(): AIProvider {
    if (typeof window !== "undefined") {
      // Client-side: use environment variables
      if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) return "openai";
      if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) return "anthropic";
    } else {
      // Server-side: use environment variables
      if (process.env.OPENAI_API_KEY) return "openai";
      if (process.env.ANTHROPIC_API_KEY) return "anthropic";
    }
    return "local";
  }

  /**
   * Check if AI summarization is available
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
      // Client-side
      if (this.config.provider === "openai") {
        return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      }
      if (this.config.provider === "anthropic") {
        return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      }
    } else {
      // Server-side
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
   * Get cost tracking stats
   */
  public getCostStats(): { totalCost: number; requestCount: number } {
    return {
      totalCost: this.totalCost,
      requestCount: this.requestCount,
    };
  }

  /**
   * Check rate limits
   */
  public checkRateLimit(key: string = "default"): boolean {
    const now = Date.now();
    const requests = this.rateLimitTracker.get(key) || [];

    // Clean old requests (older than 1 hour)
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < 60 * 60 * 1000,
    );

    // Allow 100 requests per hour
    if (recentRequests.length >= 100) {
      return false;
    }

    // Update tracker
    recentRequests.push(now);
    this.rateLimitTracker.set(key, recentRequests);

    return true;
  }

  /**
   * Calculate summary quality score
   */
  public calculateQualityScore(summary: string, messages: Message[]): number {
    let score = 0;

    // Length appropriateness (0-30 points)
    const wordCount = summary.split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 100) {
      score += 30;
    } else if (wordCount > 0) {
      score += 15;
    }

    // Coverage (0-30 points)
    const messageWords = new Set(
      messages.flatMap((m) => m.content.toLowerCase().split(/\s+/)),
    );
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/));
    const coverage = Array.from(summaryWords).filter((w) =>
      messageWords.has(w),
    ).length;
    score += Math.min((coverage / summaryWords.size) * 30, 30);

    // Coherence (0-20 points)
    const hasPunctuation = /[.!?]/.test(summary);
    const hasCapitalization = /^[A-Z]/.test(summary);
    if (hasPunctuation) score += 10;
    if (hasCapitalization) score += 10;

    // Conciseness (0-20 points)
    const efficiency = messages.length / wordCount;
    score += Math.min(efficiency * 5, 20);

    return Math.min(score, 100);
  }

  /**
   * Summarize a list of messages
   */
  async summarizeMessages(
    messages: Message[],
    options: SummaryOptions = {},
  ): Promise<string> {
    if (!this.isAvailable) {
      return this.localSummarize(messages, options);
    }

    try {
      addSentryBreadcrumb("ai", "Summarizing messages", {
        provider: this.config.provider,
        messageCount: messages.length,
      });

      const prompt = this.buildSummaryPrompt(messages, options);

      switch (this.config.provider) {
        case "openai":
          return await this.summarizeWithOpenAI(prompt, options);
        case "anthropic":
          return await this.summarizeWithAnthropic(prompt, options);
        default:
          return this.localSummarize(messages, options);
      }
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "ai-summarization", provider: this.config.provider },
        extra: { messageCount: messages.length },
      });
      // Fallback to local summarization
      return this.localSummarize(messages, options);
    }
  }

  /**
   * Generate channel digest
   */
  async generateChannelDigest(
    messages: Message[],
    options: SummaryOptions = {},
  ): Promise<ChannelDigest> {
    if (messages.length === 0) {
      return {
        summary: "No messages in this time period.",
        keyPoints: [],
        messageCount: 0,
        participantCount: 0,
        timeRange: {
          start: new Date(),
          end: new Date(),
        },
      };
    }

    const summary = await this.summarizeMessages(messages, {
      ...options,
      style: "detailed",
      includeKeyPoints: true,
    });

    const participants = new Set(messages.map((m) => m.userId));
    const timeRange = {
      start: new Date(messages[0].createdAt),
      end: new Date(messages[messages.length - 1].createdAt),
    };

    const keyPoints = await this.extractKeyPoints(messages);
    const topics = await this.extractTopics(messages);

    return {
      summary,
      keyPoints,
      messageCount: messages.length,
      participantCount: participants.size,
      timeRange,
      topics,
    };
  }

  /**
   * Summarize a thread
   */
  async summarizeThread(
    messages: Message[],
    options: SummaryOptions = {},
  ): Promise<ThreadSummary> {
    if (messages.length === 0) {
      return {
        summary: "No messages in this thread.",
        participantCount: 0,
        messageCount: 0,
      };
    }

    const summary = await this.summarizeMessages(messages, {
      ...options,
      style: "brief",
    });

    const participants = new Set(messages.map((m) => m.userId));
    const keyDecisions = await this.extractKeyDecisions(messages);

    return {
      summary,
      participantCount: participants.size,
      messageCount: messages.length,
      keyDecisions,
    };
  }

  /**
   * Generate catch-up summary for missed messages
   */
  async generateCatchUpSummary(
    messages: Message[],
    options: SummaryOptions = {},
  ): Promise<string> {
    if (messages.length === 0) {
      return "You are all caught up! No new messages.";
    }

    const catchUpPrompt = `You missed ${messages.length} messages. Here's what happened:`;
    const summary = await this.summarizeMessages(messages, {
      ...options,
      style: "bullets",
      includeKeyPoints: true,
    });

    return `${catchUpPrompt}\n\n${summary}`;
  }

  /**
   * Build prompt for summarization
   */
  private buildSummaryPrompt(
    messages: Message[],
    options: SummaryOptions,
  ): string {
    const { style = "brief", includeKeyPoints = false } = options;

    const formattedMessages = messages
      .map((m) => {
        const userName = m.userName || "User";
        const timestamp = new Date(m.createdAt).toLocaleString();
        return `[${timestamp}] ${userName}: ${m.content}`;
      })
      .join("\n");

    let prompt = `Summarize the following conversation messages:\n\n${formattedMessages}\n\n`;

    switch (style) {
      case "brief":
        prompt += "Provide a brief 1-2 sentence summary.";
        break;
      case "detailed":
        prompt +=
          "Provide a detailed summary covering main topics and discussions.";
        break;
      case "bullets":
        prompt += "Provide a bulleted list of key points discussed.";
        break;
    }

    if (includeKeyPoints) {
      prompt += "\n\nAlso include key takeaways and important decisions made.";
    }

    return prompt;
  }

  /**
   * Summarize using OpenAI
   */
  private async summarizeWithOpenAI(
    prompt: string,
    options: SummaryOptions,
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
              "You are a helpful assistant that summarizes chat conversations concisely and accurately.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: options.maxLength || 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Unable to generate summary.";
  }

  /**
   * Summarize using Anthropic (Claude)
   */
  private async summarizeWithAnthropic(
    prompt: string,
    options: SummaryOptions,
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
        max_tokens: options.maxLength || 500,
        messages: [{ role: "user", content: prompt }],
        system:
          "You are a helpful assistant that summarizes chat conversations concisely and accurately.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "Unable to generate summary.";
  }

  /**
   * Local fallback summarization (no AI)
   */
  private localSummarize(messages: Message[], options: SummaryOptions): string {
    if (messages.length === 0) {
      return "No messages to summarize.";
    }

    const participants = new Set(messages.map((m) => m.userName || "User"));
    const timeRange = {
      start: new Date(messages[0].createdAt),
      end: new Date(messages[messages.length - 1].createdAt),
    };

    const duration = Math.floor(
      (timeRange.end.getTime() - timeRange.start.getTime()) / 1000 / 60,
    ); // minutes

    let summary = `${messages.length} messages from ${participants.size} participant${participants.size > 1 ? "s" : ""}`;

    if (duration > 0) {
      summary += ` over ${duration} minute${duration > 1 ? "s" : ""}`;
    }

    if (options.style === "bullets") {
      const recentMessages = messages.slice(-5);
      const bullets = recentMessages.map(
        (m) =>
          `• ${m.userName || "User"}: ${m.content.slice(0, 100)}${m.content.length > 100 ? "..." : ""}`,
      );
      return `${summary}:\n\n${bullets.join("\n")}`;
    }

    return summary + ".";
  }

  /**
   * Extract key points from messages
   */
  private async extractKeyPoints(messages: Message[]): Promise<string[]> {
    if (!this.isAvailable || messages.length === 0) {
      return [];
    }

    try {
      const prompt = this.buildSummaryPrompt(messages, {
        style: "bullets",
        includeKeyPoints: true,
      });

      const response =
        this.config.provider === "openai"
          ? await this.summarizeWithOpenAI(prompt, { maxLength: 300 })
          : await this.summarizeWithAnthropic(prompt, { maxLength: 300 });

      // Parse bullet points from response
      return response
        .split("\n")
        .filter((line) => line.trim().match(/^[-•*]/))
        .map((line) => line.replace(/^[-•*]\s*/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract topics from messages
   */
  private async extractTopics(messages: Message[]): Promise<string[]> {
    if (!this.isAvailable || messages.length === 0) {
      return [];
    }

    try {
      const content = messages.map((m) => m.content).join(" ");
      const prompt = `Extract 3-5 main topics discussed in this conversation:\n\n${content}\n\nProvide only the topic names, one per line.`;

      const response =
        this.config.provider === "openai"
          ? await this.summarizeWithOpenAI(prompt, { maxLength: 150 })
          : await this.summarizeWithAnthropic(prompt, { maxLength: 150 });

      return response
        .split("\n")
        .map((line) => line.replace(/^[-•*\d.]\s*/, "").trim())
        .filter((line) => line.length > 0 && line.length < 50)
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract key decisions from messages
   */
  private async extractKeyDecisions(messages: Message[]): Promise<string[]> {
    if (!this.isAvailable || messages.length === 0) {
      return [];
    }

    try {
      const content = messages.map((m) => m.content).join("\n");
      const prompt = `Identify any key decisions or action items from this conversation:\n\n${content}\n\nList only the decisions/actions, one per line.`;

      const response =
        this.config.provider === "openai"
          ? await this.summarizeWithOpenAI(prompt, { maxLength: 200 })
          : await this.summarizeWithAnthropic(prompt, { maxLength: 200 });

      return response
        .split("\n")
        .map((line) => line.replace(/^[-•*\d.]\s*/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
let summarizer: MessageSummarizer | null = null;

/**
 * Get or create the global message summarizer instance
 */
export function getMessageSummarizer(
  config?: Partial<AIConfig>,
): MessageSummarizer {
  if (!summarizer || config) {
    summarizer = new MessageSummarizer(config);
  }
  return summarizer;
}

/**
 * Quick helper to check if AI summarization is available
 */
export function isAISummarizationAvailable(): boolean {
  const summarizer = getMessageSummarizer();
  return summarizer.available();
}
