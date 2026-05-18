/**
 * Thread Summarization Service
 * Automatic TL;DR generation for long threads
 * Part of v0.7.0 AI Message Summarization system
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import type { Message } from "./message-summarizer";

// Re-export Message type for consumers
export type { Message };

export interface ThreadSummaryResult {
  tldr: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  participants: ParticipantSummary[];
  metadata: ThreadMetadata;
  qualityScore: number;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  extractedFrom: string; // message ID
}

export interface ParticipantSummary {
  userId: string;
  userName: string;
  messageCount: number;
  keyContributions: string[];
  firstMessage: Date;
  lastMessage: Date;
}

export interface ThreadMetadata {
  threadId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  messageCount: number;
  participantCount: number;
  resolved: boolean;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
}

export interface ThreadSummaryOptions {
  minMessages?: number; // Minimum messages to generate summary
  maxTldrLength?: number; // Max characters for TL;DR
  includeActionItems?: boolean;
  includeParticipants?: boolean;
  contextWindow?: number; // Number of surrounding messages to consider
  language?: string;
}

export type AIProvider = "openai" | "anthropic" | "local";

export interface ThreadSummarizerConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  costTracking?: boolean;
}

// Default configurations
const DEFAULT_OPENAI_MODEL = "gpt-4-turbo-preview";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MIN_MESSAGES = 5;
const DEFAULT_MAX_TLDR_LENGTH = 200;

/**
 * Thread Summarizer class
 */
export class ThreadSummarizer {
  private config: ThreadSummarizerConfig;
  private isAvailable: boolean;
  private totalCost: number = 0;
  private requestCount: number = 0;

  constructor(config?: Partial<ThreadSummarizerConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      model: config?.model,
      endpoint: config?.endpoint,
      costTracking: config?.costTracking ?? true,
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
   * Get cost tracking stats
   */
  public getCostStats(): { totalCost: number; requestCount: number } {
    return {
      totalCost: this.totalCost,
      requestCount: this.requestCount,
    };
  }

  /**
   * Summarize a thread with comprehensive analysis
   */
  async summarizeThread(
    messages: Message[],
    options: ThreadSummaryOptions = {},
  ): Promise<ThreadSummaryResult> {
    const minMessages = options.minMessages || DEFAULT_MIN_MESSAGES;

    if (messages.length < minMessages) {
      return this.createMinimalSummary(messages);
    }

    try {
      addSentryBreadcrumb("ai", "Thread summarization started", {
        provider: this.config.provider,
        messageCount: messages.length,
      });

      // Extract metadata first
      const metadata = this.extractMetadata(messages);

      // Generate components in parallel for efficiency
      const [tldr, keyPoints, actionItems, participants] = await Promise.all([
        this.generateTldr(messages, options),
        this.extractKeyPoints(messages),
        options.includeActionItems !== false
          ? this.extractActionItems(messages)
          : Promise.resolve([]),
        options.includeParticipants !== false
          ? this.generateParticipantSummaries(messages)
          : Promise.resolve([]),
      ]);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore({
        tldr,
        keyPoints,
        actionItems,
        participants,
        metadata,
        qualityScore: 0,
      });

      this.requestCount++;

      return {
        tldr,
        keyPoints,
        actionItems,
        participants,
        metadata,
        qualityScore,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: {
          feature: "thread-summarization",
          provider: this.config.provider,
        },
        extra: { messageCount: messages.length },
      });

      // Fallback to local summarization
      return this.localSummarize(messages);
    }
  }

  /**
   * Generate TL;DR summary
   */
  private async generateTldr(
    messages: Message[],
    options: ThreadSummaryOptions,
  ): Promise<string> {
    if (!this.isAvailable) {
      return this.generateLocalTldr(messages);
    }

    const maxLength = options.maxTldrLength || DEFAULT_MAX_TLDR_LENGTH;
    const prompt = this.buildTldrPrompt(messages, maxLength);

    switch (this.config.provider) {
      case "openai":
        return await this.generateWithOpenAI(prompt, maxLength);
      case "anthropic":
        return await this.generateWithAnthropic(prompt, maxLength);
      default:
        return this.generateLocalTldr(messages);
    }
  }

  /**
   * Extract key points from thread
   */
  private async extractKeyPoints(messages: Message[]): Promise<string[]> {
    if (!this.isAvailable || messages.length === 0) {
      return this.extractLocalKeyPoints(messages);
    }

    try {
      const prompt = this.buildKeyPointsPrompt(messages);

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 500)
          : await this.generateWithAnthropic(prompt, 500);

      return this.parseKeyPoints(response);
    } catch (error) {
      return this.extractLocalKeyPoints(messages);
    }
  }

  /**
   * Extract action items from thread
   */
  private async extractActionItems(messages: Message[]): Promise<ActionItem[]> {
    if (!this.isAvailable || messages.length === 0) {
      return this.extractLocalActionItems(messages);
    }

    try {
      const prompt = this.buildActionItemsPrompt(messages);

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 800)
          : await this.generateWithAnthropic(prompt, 800);

      return this.parseActionItems(response, messages);
    } catch (error) {
      return this.extractLocalActionItems(messages);
    }
  }

  /**
   * Generate participant summaries
   */
  private async generateParticipantSummaries(
    messages: Message[],
  ): Promise<ParticipantSummary[]> {
    const participantMap = new Map<string, Message[]>();

    // Group messages by participant
    messages.forEach((msg) => {
      const userId = msg.userId;
      if (!participantMap.has(userId)) {
        participantMap.set(userId, []);
      }
      participantMap.get(userId)!.push(msg);
    });

    // Generate summaries for each participant
    const summaries: ParticipantSummary[] = [];

    for (const [userId, userMessages] of participantMap.entries()) {
      const sorted = userMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const keyContributions =
        await this.extractParticipantContributions(userMessages);

      summaries.push({
        userId,
        userName: userMessages[0].userName || "Unknown User",
        messageCount: userMessages.length,
        keyContributions,
        firstMessage: new Date(sorted[0].createdAt),
        lastMessage: new Date(sorted[sorted.length - 1].createdAt),
      });
    }

    // Sort by message count (most active first)
    return summaries.sort((a, b) => b.messageCount - a.messageCount);
  }

  /**
   * Extract metadata from thread
   */
  private extractMetadata(messages: Message[]): ThreadMetadata {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const startTime = new Date(sorted[0].createdAt);
    const endTime = new Date(sorted[sorted.length - 1].createdAt);
    const duration = endTime.getTime() - startTime.getTime();

    const participants = new Set(messages.map((m) => m.userId));

    // Simple heuristic for resolved status
    const lastFewMessages = messages.slice(-3);
    const resolvedKeywords = ["resolved", "fixed", "done", "closed", "solved"];
    const resolved = lastFewMessages.some((m) =>
      resolvedKeywords.some((kw) => m.content.toLowerCase().includes(kw)),
    );

    // Basic sentiment analysis (will be enhanced by sentiment-analyzer.ts)
    const sentiment = this.detectBasicSentiment(messages);

    return {
      threadId: messages[0].id, // Use first message ID as thread ID
      startTime,
      endTime,
      duration,
      messageCount: messages.length,
      participantCount: participants.size,
      resolved,
      sentiment,
    };
  }

  /**
   * Build TL;DR prompt
   */
  private buildTldrPrompt(messages: Message[], maxLength: number): string {
    const formattedMessages = messages
      .map((m) => {
        const userName = m.userName || "User";
        const timestamp = new Date(m.createdAt).toLocaleString();
        return `[${timestamp}] ${userName}: ${m.content}`;
      })
      .join("\n");

    return `Generate a concise TL;DR summary (max ${maxLength} characters) of this thread conversation:\n\n${formattedMessages}\n\nTL;DR:`;
  }

  /**
   * Build key points extraction prompt
   */
  private buildKeyPointsPrompt(messages: Message[]): string {
    const content = messages.map((m) => m.content).join("\n");

    return `Extract 3-5 key points from this thread conversation. List only the most important takeaways:\n\n${content}\n\nKey Points:`;
  }

  /**
   * Build action items extraction prompt
   */
  private buildActionItemsPrompt(messages: Message[]): string {
    const formattedMessages = messages
      .map((m) => `${m.userName || "User"}: ${m.content}`)
      .join("\n");

    return `Identify action items, tasks, or to-dos from this conversation. For each action item, specify:
- Description of the task
- Assignee (if mentioned)
- Priority (low/medium/high)
- Any mentioned deadline

Conversation:
${formattedMessages}

Action Items (format: DESCRIPTION | ASSIGNEE | PRIORITY):`;
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
              "You are a helpful assistant that analyzes thread conversations and extracts structured information.",
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

    // Track costs if enabled
    if (this.config.costTracking && data.usage) {
      this.trackCost(data.usage, model);
    }

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
          "You are a helpful assistant that analyzes thread conversations and extracts structured information.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Track costs if enabled
    if (this.config.costTracking && data.usage) {
      this.trackCost(data.usage, model);
    }

    return data.content[0]?.text || "";
  }

  /**
   * Parse key points from AI response
   */
  private parseKeyPoints(response: string): string[] {
    return response
      .split("\n")
      .map((line) => line.replace(/^[-•*\d.]\s*/, "").trim())
      .filter((line) => line.length > 0 && line.length < 200)
      .slice(0, 5);
  }

  /**
   * Parse action items from AI response
   */
  private parseActionItems(
    response: string,
    messages: Message[],
  ): ActionItem[] {
    const lines = response
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 10);

    return lines.map((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      const description = parts[0]?.replace(/^[-•*\d.]\s*/, "") || line;
      const assignee = parts[1] || undefined;
      const priorityStr = parts[2]?.toLowerCase() || "medium";
      const priority =
        priorityStr === "high" || priorityStr === "low"
          ? priorityStr
          : "medium";

      return {
        id: `action-${index}-${Date.now()}`,
        description,
        assignee,
        priority: priority as "low" | "medium" | "high",
        status: "pending" as const,
        extractedFrom: messages[0]?.id || "",
      };
    });
  }

  /**
   * Extract participant contributions
   */
  private async extractParticipantContributions(
    messages: Message[],
  ): Promise<string[]> {
    if (!this.isAvailable || messages.length === 0) {
      return messages.slice(0, 2).map((m) => m.content.slice(0, 100));
    }

    try {
      const content = messages.map((m) => m.content).join("\n");
      const prompt = `Summarize the key contributions from these messages in 2-3 bullet points:\n\n${content}`;

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 200)
          : await this.generateWithAnthropic(prompt, 200);

      return this.parseKeyPoints(response).slice(0, 3);
    } catch (error) {
      return messages.slice(0, 2).map((m) => m.content.slice(0, 100));
    }
  }

  /**
   * Local TL;DR generation (fallback)
   */
  private generateLocalTldr(messages: Message[]): string {
    const participants = new Set(messages.map((m) => m.userName || "User"));
    const participantList =
      participants.size <= 3
        ? Array.from(participants).join(", ")
        : `${participants.size} participants`;

    return `Thread with ${messages.length} messages from ${participantList}. Discussion covered: ${messages[0]?.content.slice(0, 100)}...`;
  }

  /**
   * Extract local key points (fallback)
   */
  private extractLocalKeyPoints(messages: Message[]): string[] {
    // Simple heuristic: use first and last messages as key points
    const points: string[] = [];

    if (messages.length > 0) {
      points.push(messages[0].content.slice(0, 150));
    }

    if (messages.length > 1) {
      points.push(messages[messages.length - 1].content.slice(0, 150));
    }

    return points;
  }

  /**
   * Extract local action items (fallback)
   */
  private extractLocalActionItems(messages: Message[]): ActionItem[] {
    const actionWords = [
      "todo",
      "to-do",
      "task",
      "action",
      "need to",
      "should",
      "must",
      "will",
    ];

    return messages
      .filter((m) =>
        actionWords.some((word) => m.content.toLowerCase().includes(word)),
      )
      .slice(0, 5)
      .map((m, index) => ({
        id: `local-action-${index}-${Date.now()}`,
        description: m.content.slice(0, 200),
        status: "pending" as const,
        priority: "medium" as const,
        extractedFrom: m.id,
      }));
  }

  /**
   * Detect basic sentiment
   */
  private detectBasicSentiment(
    messages: Message[],
  ): "positive" | "neutral" | "negative" | "mixed" {
    const positiveWords = ["great", "good", "awesome", "excellent", "thanks"];
    const negativeWords = [
      "bad",
      "issue",
      "problem",
      "error",
      "failed",
      "wrong",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach((m) => {
      const content = m.content.toLowerCase();
      if (positiveWords.some((w) => content.includes(w))) positiveCount++;
      if (negativeWords.some((w) => content.includes(w))) negativeCount++;
    });

    if (positiveCount > negativeCount * 2) return "positive";
    if (negativeCount > positiveCount * 2) return "negative";
    if (positiveCount > 0 && negativeCount > 0) return "mixed";
    return "neutral";
  }

  /**
   * Calculate quality score for summary
   */
  private calculateQualityScore(result: ThreadSummaryResult): number {
    let score = 0;

    // TL;DR quality (0-30 points)
    if (result.tldr.length >= 50 && result.tldr.length <= 300) {
      score += 30;
    } else if (result.tldr.length > 0) {
      score += 15;
    }

    // Key points (0-25 points)
    score += Math.min(result.keyPoints.length * 5, 25);

    // Action items (0-20 points)
    score += Math.min(result.actionItems.length * 4, 20);

    // Participants (0-15 points)
    score += Math.min(result.participants.length * 3, 15);

    // Metadata completeness (0-10 points)
    if (result.metadata.participantCount > 1) score += 5;
    if (result.metadata.messageCount >= 5) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Create minimal summary for short threads
   */
  private createMinimalSummary(messages: Message[]): ThreadSummaryResult {
    const metadata = this.extractMetadata(messages);

    return {
      tldr: this.generateLocalTldr(messages),
      keyPoints: this.extractLocalKeyPoints(messages),
      actionItems: [],
      participants: [],
      metadata,
      qualityScore: 50,
    };
  }

  /**
   * Local summarization (complete fallback)
   */
  private localSummarize(messages: Message[]): ThreadSummaryResult {
    const metadata = this.extractMetadata(messages);

    return {
      tldr: this.generateLocalTldr(messages),
      keyPoints: this.extractLocalKeyPoints(messages),
      actionItems: this.extractLocalActionItems(messages),
      participants: [],
      metadata,
      qualityScore: 60,
    };
  }

  /**
   * Track API costs
   */
  private trackCost(usage: any, model: string): void {
    // Approximate costs (as of 2024)
    const costs: Record<string, { input: number; output: number }> = {
      "gpt-4-turbo-preview": { input: 0.01, output: 0.03 }, // per 1K tokens
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "claude-3-5-haiku-20241022": { input: 0.00025, output: 0.00125 },
      "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    };

    const modelCost = costs[model] || { input: 0, output: 0 };
    const inputCost = (usage.prompt_tokens / 1000) * modelCost.input;
    const outputCost = (usage.completion_tokens / 1000) * modelCost.output;

    this.totalCost += inputCost + outputCost;
  }
}

// Singleton instance
let threadSummarizer: ThreadSummarizer | null = null;

/**
 * Get or create the global thread summarizer instance
 */
export function getThreadSummarizer(
  config?: Partial<ThreadSummarizerConfig>,
): ThreadSummarizer {
  if (!threadSummarizer || config) {
    threadSummarizer = new ThreadSummarizer(config);
  }
  return threadSummarizer;
}

/**
 * Quick helper to check if thread summarization is available
 */
export function isThreadSummarizationAvailable(): boolean {
  const summarizer = getThreadSummarizer();
  return summarizer.available();
}
