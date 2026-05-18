/**
 * Meeting Notes Generator
 * Auto-generate notes from call transcripts
 * Part of v0.7.0 AI Message Summarization system
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";
import type { Message } from "./message-summarizer";

export interface MeetingNotesResult {
  title: string;
  summary: string;
  participants: MeetingParticipant[];
  agenda: AgendaItem[];
  decisions: Decision[];
  actionItems: ActionItem[];
  topics: DiscussionTopic[];
  transcript: TranscriptEntry[];
  metadata: MeetingMetadata;
  formattedNotes: string; // Markdown formatted
}

export interface MeetingParticipant {
  userId: string;
  userName: string;
  role?: string;
  joinTime: Date;
  leaveTime?: Date;
  duration: number; // milliseconds
  contributionCount: number;
  speakingTime: number; // estimated milliseconds
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration?: number; // milliseconds
  status: "pending" | "in-progress" | "completed" | "deferred";
  notes?: string;
}

export interface Decision {
  id: string;
  description: string;
  decidedBy: string[];
  timestamp: Date;
  context: string;
  impact: "low" | "medium" | "high";
  relatedMessageIds: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  dependencies?: string[]; // other action item IDs
  relatedMessageId: string;
}

export interface DiscussionTopic {
  topic: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // milliseconds
  participants: string[];
  keyPoints: string[];
  relatedMessageIds: string[];
}

export interface TranscriptEntry {
  timestamp: Date;
  speaker: string;
  content: string;
  type: "speech" | "action" | "system";
  duration?: number;
}

export interface MeetingMetadata {
  meetingId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  participantCount: number;
  messageCount: number;
  recordingAvailable: boolean;
  transcriptQuality: number; // 0-100
}

export interface MeetingNotesOptions {
  includeTranscript?: boolean;
  transcriptFormat?: "full" | "condensed" | "summary";
  identifySpeakers?: boolean;
  extractAgenda?: boolean;
  minDecisionConfidence?: number; // 0-100
  minActionItemConfidence?: number; // 0-100
  language?: string;
  templateStyle?: "simple" | "detailed" | "executive" | "technical";
}

export type AIProvider = "openai" | "anthropic" | "local";

export interface MeetingNotesConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  maxTranscriptLength?: number;
}

// Default configurations
const DEFAULT_OPENAI_MODEL = "gpt-4-turbo-preview";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TRANSCRIPT_LENGTH = 10000;

/**
 * Meeting Notes Generator
 */
export class MeetingNotesGenerator {
  private config: MeetingNotesConfig;
  private isAvailable: boolean;

  constructor(config?: Partial<MeetingNotesConfig>) {
    this.config = {
      provider: config?.provider || this.detectProvider(),
      apiKey: config?.apiKey,
      model: config?.model,
      endpoint: config?.endpoint,
      maxTranscriptLength:
        config?.maxTranscriptLength || DEFAULT_MAX_TRANSCRIPT_LENGTH,
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
   * Generate meeting notes from messages/transcript
   */
  async generateNotes(
    messages: Message[],
    options: MeetingNotesOptions = {},
  ): Promise<MeetingNotesResult> {
    if (messages.length === 0) {
      return this.createEmptyNotes();
    }

    try {
      addSentryBreadcrumb("ai", "Meeting notes generation started", {
        provider: this.config.provider,
        messageCount: messages.length,
      });

      // Extract metadata first
      const metadata = this.extractMetadata(messages);

      // Generate components in parallel
      const [
        title,
        summary,
        participants,
        agenda,
        decisions,
        actionItems,
        topics,
        transcript,
      ] = await Promise.all([
        this.generateTitle(messages),
        this.generateSummary(messages),
        this.extractParticipants(messages),
        options.extractAgenda !== false
          ? this.extractAgenda(messages)
          : Promise.resolve([]),
        this.extractDecisions(messages, options.minDecisionConfidence),
        this.extractActionItems(messages, options.minActionItemConfidence),
        this.extractTopics(messages),
        options.includeTranscript !== false
          ? this.prepareTranscript(messages, options.transcriptFormat)
          : Promise.resolve([]),
      ]);

      // Format notes
      const formattedNotes = this.formatNotes(
        {
          title,
          summary,
          participants,
          agenda,
          decisions,
          actionItems,
          topics,
          transcript,
          metadata,
          formattedNotes: "",
        },
        options.templateStyle || "detailed",
      );

      return {
        title,
        summary,
        participants,
        agenda,
        decisions,
        actionItems,
        topics,
        transcript,
        metadata,
        formattedNotes,
      };
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "meeting-notes", provider: this.config.provider },
        extra: { messageCount: messages.length },
      });

      // Fallback to local generation
      return this.generateLocalNotes(messages, options);
    }
  }

  /**
   * Generate meeting title
   */
  private async generateTitle(messages: Message[]): Promise<string> {
    if (!this.isAvailable) {
      return this.generateLocalTitle(messages);
    }

    try {
      const prompt = `Generate a concise, professional meeting title based on this conversation (max 80 characters):\n\n${messages
        .slice(0, 10)
        .map((m) => `${m.userName}: ${m.content}`)
        .join("\n")}\n\nTitle:`;

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 50)
          : await this.generateWithAnthropic(prompt, 50);

      return (
        response.trim().replace(/^["']|["']$/g, "") ||
        this.generateLocalTitle(messages)
      );
    } catch (error) {
      return this.generateLocalTitle(messages);
    }
  }

  /**
   * Generate meeting summary
   */
  private async generateSummary(messages: Message[]): Promise<string> {
    if (!this.isAvailable) {
      return this.generateLocalSummary(messages);
    }

    try {
      const content = this.prepareContentForAI(messages);
      const prompt = `Provide a 2-3 paragraph executive summary of this meeting:\n\n${content}\n\nSummary:`;

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 500)
          : await this.generateWithAnthropic(prompt, 500);

      return response.trim() || this.generateLocalSummary(messages);
    } catch (error) {
      return this.generateLocalSummary(messages);
    }
  }

  /**
   * Extract participants
   */
  private async extractParticipants(
    messages: Message[],
  ): Promise<MeetingParticipant[]> {
    const participantMap = new Map<string, Message[]>();

    messages.forEach((msg) => {
      const userId = msg.userId;
      if (!participantMap.has(userId)) {
        participantMap.set(userId, []);
      }
      participantMap.get(userId)!.push(msg);
    });

    const participants: MeetingParticipant[] = [];

    for (const [userId, userMessages] of participantMap.entries()) {
      const sorted = userMessages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const joinTime = new Date(sorted[0].createdAt);
      const leaveTime = new Date(sorted[sorted.length - 1].createdAt);
      const duration = leaveTime.getTime() - joinTime.getTime();

      // Estimate speaking time based on message length
      const speakingTime = userMessages.reduce(
        (total, msg) => total + msg.content.length * 50, // ~50ms per character spoken
        0,
      );

      participants.push({
        userId,
        userName: userMessages[0].userName || "Unknown",
        joinTime,
        leaveTime,
        duration,
        contributionCount: userMessages.length,
        speakingTime,
      });
    }

    return participants.sort(
      (a, b) => b.contributionCount - a.contributionCount,
    );
  }

  /**
   * Extract agenda items
   */
  private async extractAgenda(messages: Message[]): Promise<AgendaItem[]> {
    if (!this.isAvailable) {
      return this.extractLocalAgenda(messages);
    }

    try {
      const content = this.prepareContentForAI(messages);
      const prompt = `Extract the meeting agenda items from this conversation. List each agenda item with its status (pending/completed/deferred):\n\n${content}\n\nAgenda (format: TITLE | STATUS | NOTES):`;

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 600)
          : await this.generateWithAnthropic(prompt, 600);

      return this.parseAgenda(response);
    } catch (error) {
      return this.extractLocalAgenda(messages);
    }
  }

  /**
   * Extract decisions
   */
  private async extractDecisions(
    messages: Message[],
    minConfidence: number = 50,
  ): Promise<Decision[]> {
    if (!this.isAvailable) {
      return this.extractLocalDecisions(messages);
    }

    try {
      const content = this.prepareContentForAI(messages);
      const prompt = `Identify all decisions made in this meeting. For each decision, specify:
- Description
- Who decided
- Impact level (low/medium/high)
- Context

Conversation:
${content}

Decisions (format: DESCRIPTION | DECIDERS | IMPACT | CONTEXT):`;

      const response =
        this.config.provider === "openai"
          ? await this.generateWithOpenAI(prompt, 800)
          : await this.generateWithAnthropic(prompt, 800);

      return this.parseDecisions(response, messages);
    } catch (error) {
      return this.extractLocalDecisions(messages);
    }
  }

  /**
   * Extract action items
   */
  private async extractActionItems(
    messages: Message[],
    minConfidence: number = 50,
  ): Promise<ActionItem[]> {
    if (!this.isAvailable) {
      return this.extractLocalActionItems(messages);
    }

    try {
      const content = this.prepareContentForAI(messages);
      const prompt = `Identify all action items from this meeting. For each action item:
- Description
- Assignee (if mentioned)
- Priority (low/medium/high)
- Due date (if mentioned)

Conversation:
${content}

Action Items (format: DESCRIPTION | ASSIGNEE | PRIORITY | DUE_DATE):`;

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
   * Extract discussion topics
   */
  private async extractTopics(messages: Message[]): Promise<DiscussionTopic[]> {
    const topics: DiscussionTopic[] = [];

    // Group messages by time windows (e.g., 5-minute windows)
    const windowSize = 5 * 60 * 1000; // 5 minutes
    const windows = this.groupMessagesByTimeWindow(messages, windowSize);

    for (const window of windows) {
      if (window.messages.length === 0) continue;

      const topic = await this.extractTopicFromWindow(window.messages);
      if (topic) {
        topics.push({
          topic,
          startTime: new Date(window.messages[0].createdAt),
          endTime: new Date(
            window.messages[window.messages.length - 1].createdAt,
          ),
          duration:
            new Date(
              window.messages[window.messages.length - 1].createdAt,
            ).getTime() - new Date(window.messages[0].createdAt).getTime(),
          participants: Array.from(
            new Set(window.messages.map((m) => m.userName || "Unknown")),
          ),
          keyPoints: window.messages
            .slice(0, 3)
            .map((m) => m.content.slice(0, 100)),
          relatedMessageIds: window.messages.map((m) => m.id),
        });
      }
    }

    return topics;
  }

  /**
   * Prepare transcript
   */
  private async prepareTranscript(
    messages: Message[],
    format: "full" | "condensed" | "summary" = "full",
  ): Promise<TranscriptEntry[]> {
    const transcript: TranscriptEntry[] = messages.map((msg) => ({
      timestamp: new Date(msg.createdAt),
      speaker: msg.userName || "Unknown",
      content: msg.content,
      type: "speech" as const,
      duration: msg.content.length * 50, // Estimate
    }));

    if (format === "condensed") {
      // Remove short/filler messages
      return transcript.filter((entry) => entry.content.length > 20);
    } else if (format === "summary") {
      // Keep only significant messages
      return transcript.filter((entry) => entry.content.length > 50);
    }

    return transcript;
  }

  /**
   * Extract metadata
   */
  private extractMetadata(messages: Message[]): MeetingMetadata {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const startTime = new Date(sorted[0].createdAt);
    const endTime = new Date(sorted[sorted.length - 1].createdAt);
    const duration = endTime.getTime() - startTime.getTime();

    const participants = new Set(messages.map((m) => m.userId));

    return {
      meetingId: `meeting-${startTime.getTime()}`,
      startTime,
      endTime,
      duration,
      participantCount: participants.size,
      messageCount: messages.length,
      recordingAvailable: false,
      transcriptQuality: 85, // Assume good quality
    };
  }

  /**
   * Format notes as markdown
   */
  private formatNotes(
    notes: MeetingNotesResult,
    style: "simple" | "detailed" | "executive" | "technical",
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(`# ${notes.title}`);
    lines.push("");

    // Metadata
    lines.push(`**Date:** ${notes.metadata.startTime.toLocaleString()}`);
    lines.push(
      `**Duration:** ${Math.round(notes.metadata.duration / 60000)} minutes`,
    );
    lines.push(
      `**Participants:** ${notes.participants.map((p) => p.userName).join(", ")}`,
    );
    lines.push("");

    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push(notes.summary);
    lines.push("");

    if (style !== "simple") {
      // Decisions
      if (notes.decisions.length > 0) {
        lines.push("## Decisions");
        lines.push("");
        notes.decisions.forEach((decision, i) => {
          lines.push(`${i + 1}. **${decision.description}**`);
          lines.push(`   - Decided by: ${decision.decidedBy.join(", ")}`);
          lines.push(`   - Impact: ${decision.impact}`);
          if (style === "detailed") {
            lines.push(`   - Context: ${decision.context}`);
          }
          lines.push("");
        });
      }

      // Action Items
      if (notes.actionItems.length > 0) {
        lines.push("## Action Items");
        lines.push("");
        notes.actionItems.forEach((item, i) => {
          lines.push(`${i + 1}. [ ] ${item.description}`);
          if (item.assignee) {
            lines.push(`   - Assignee: ${item.assignee}`);
          }
          lines.push(`   - Priority: ${item.priority}`);
          if (item.dueDate) {
            lines.push(`   - Due: ${item.dueDate.toLocaleDateString()}`);
          }
          lines.push("");
        });
      }
    }

    if (style === "detailed" || style === "technical") {
      // Agenda
      if (notes.agenda.length > 0) {
        lines.push("## Agenda");
        lines.push("");
        notes.agenda.forEach((item) => {
          const statusIcon =
            item.status === "completed"
              ? "✓"
              : item.status === "deferred"
                ? "⊗"
                : "○";
          lines.push(`${statusIcon} ${item.title}`);
          if (item.notes) {
            lines.push(`   ${item.notes}`);
          }
          lines.push("");
        });
      }

      // Discussion Topics
      if (notes.topics.length > 0) {
        lines.push("## Discussion Topics");
        lines.push("");
        notes.topics.forEach((topic) => {
          lines.push(`### ${topic.topic}`);
          lines.push(`Duration: ${Math.round(topic.duration / 60000)} minutes`);
          lines.push("");
          if (topic.keyPoints.length > 0) {
            topic.keyPoints.forEach((point) => {
              lines.push(`- ${point}`);
            });
            lines.push("");
          }
        });
      }
    }

    if (style === "detailed" && notes.transcript.length > 0) {
      lines.push("## Transcript");
      lines.push("");
      notes.transcript.slice(0, 50).forEach((entry) => {
        const time = entry.timestamp.toLocaleTimeString();
        lines.push(`**[${time}] ${entry.speaker}:** ${entry.content}`);
        lines.push("");
      });
    }

    lines.push("---");
    lines.push(`*Generated by nchat AI on ${new Date().toLocaleString()}*`);

    return lines.join("\n");
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
              "You are a professional meeting assistant that generates comprehensive, well-structured meeting notes.",
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
          "You are a professional meeting assistant that generates comprehensive, well-structured meeting notes.",
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || "";
  }

  /**
   * Helper methods for parsing AI responses
   */
  private parseAgenda(response: string): AgendaItem[] {
    const lines = response.split("\n").filter((line) => line.trim().length > 0);

    return lines.slice(0, 10).map((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      const title = parts[0]?.replace(/^[-•*\d.]\s*/, "") || line;
      const statusStr = parts[1]?.toLowerCase() || "pending";
      const status = ["completed", "deferred", "in-progress"].includes(
        statusStr,
      )
        ? (statusStr as AgendaItem["status"])
        : "pending";
      const notes = parts[2] || undefined;

      return {
        id: `agenda-${index}`,
        title,
        order: index,
        status,
        notes,
      };
    });
  }

  private parseDecisions(response: string, messages: Message[]): Decision[] {
    const lines = response.split("\n").filter((line) => line.trim().length > 0);

    return lines.slice(0, 10).map((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      const description = parts[0]?.replace(/^[-•*\d.]\s*/, "") || line;
      const deciders = parts[1]?.split(",").map((d) => d.trim()) || [];
      const impactStr = parts[2]?.toLowerCase() || "medium";
      const impact = ["low", "high"].includes(impactStr)
        ? (impactStr as Decision["impact"])
        : "medium";
      const context = parts[3] || "";

      return {
        id: `decision-${index}`,
        description,
        decidedBy: deciders,
        timestamp: new Date(),
        context,
        impact,
        relatedMessageIds: [],
      };
    });
  }

  private parseActionItems(
    response: string,
    messages: Message[],
  ): ActionItem[] {
    const lines = response.split("\n").filter((line) => line.trim().length > 0);

    return lines.slice(0, 15).map((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      const description = parts[0]?.replace(/^[-•*\d.]\s*/, "") || line;
      const assignee = parts[1] || undefined;
      const priorityStr = parts[2]?.toLowerCase() || "medium";
      const priority = ["low", "high"].includes(priorityStr)
        ? (priorityStr as ActionItem["priority"])
        : "medium";

      return {
        id: `action-${index}`,
        description,
        assignee,
        priority,
        status: "pending",
        relatedMessageId: messages[0]?.id || "",
      };
    });
  }

  /**
   * Local fallback methods
   */
  private generateLocalTitle(messages: Message[]): string {
    const date = new Date(messages[0].createdAt).toLocaleDateString();
    return `Meeting Notes - ${date}`;
  }

  private generateLocalSummary(messages: Message[]): string {
    const participants = new Set(messages.map((m) => m.userName || "User"));
    return `Meeting with ${participants.size} participants discussing ${messages.length} topics over ${Math.round((new Date(messages[messages.length - 1].createdAt).getTime() - new Date(messages[0].createdAt).getTime()) / 60000)} minutes.`;
  }

  private extractLocalAgenda(messages: Message[]): AgendaItem[] {
    return [];
  }

  private extractLocalDecisions(messages: Message[]): Decision[] {
    const decisionKeywords = ["decided", "agreed", "approved", "will do"];

    return messages
      .filter((m) =>
        decisionKeywords.some((kw) => m.content.toLowerCase().includes(kw)),
      )
      .slice(0, 5)
      .map((m, index) => ({
        id: `decision-${index}`,
        description: m.content.slice(0, 200),
        decidedBy: [m.userName || "Unknown"],
        timestamp: new Date(m.createdAt),
        context: "",
        impact: "medium" as const,
        relatedMessageIds: [m.id],
      }));
  }

  private extractLocalActionItems(messages: Message[]): ActionItem[] {
    const actionKeywords = [
      "todo",
      "task",
      "action",
      "need to",
      "should",
      "will",
    ];

    return messages
      .filter((m) =>
        actionKeywords.some((kw) => m.content.toLowerCase().includes(kw)),
      )
      .slice(0, 10)
      .map((m, index) => ({
        id: `action-${index}`,
        description: m.content.slice(0, 200),
        priority: "medium" as const,
        status: "pending" as const,
        relatedMessageId: m.id,
      }));
  }

  private groupMessagesByTimeWindow(
    messages: Message[],
    windowSize: number,
  ): { messages: Message[] }[] {
    const windows: { messages: Message[] }[] = [];
    let currentWindow: Message[] = [];
    let windowStart: number | null = null;

    messages.forEach((msg) => {
      const timestamp = new Date(msg.createdAt).getTime();

      if (windowStart === null) {
        windowStart = timestamp;
        currentWindow = [msg];
      } else if (timestamp - windowStart <= windowSize) {
        currentWindow.push(msg);
      } else {
        windows.push({ messages: currentWindow });
        windowStart = timestamp;
        currentWindow = [msg];
      }
    });

    if (currentWindow.length > 0) {
      windows.push({ messages: currentWindow });
    }

    return windows;
  }

  private async extractTopicFromWindow(
    messages: Message[],
  ): Promise<string | null> {
    if (messages.length === 0) return null;

    // Simple heuristic: most common meaningful words
    const words = messages
      .map((m) => m.content.toLowerCase())
      .join(" ")
      .split(/\s+/)
      .filter((w) => w.length > 4);

    const wordCounts = new Map<string, number>();
    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const topWord = Array.from(wordCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return topWord ? topWord[0] : "General Discussion";
  }

  private prepareContentForAI(messages: Message[]): string {
    const content = messages
      .slice(0, 100) // Limit to prevent token overflow
      .map((m) => `${m.userName || "User"}: ${m.content}`)
      .join("\n");

    return content.length > this.config.maxTranscriptLength!
      ? content.slice(0, this.config.maxTranscriptLength!)
      : content;
  }

  private createEmptyNotes(): MeetingNotesResult {
    const now = new Date();

    return {
      title: "Empty Meeting",
      summary: "No meeting data available.",
      participants: [],
      agenda: [],
      decisions: [],
      actionItems: [],
      topics: [],
      transcript: [],
      metadata: {
        meetingId: "empty",
        startTime: now,
        endTime: now,
        duration: 0,
        participantCount: 0,
        messageCount: 0,
        recordingAvailable: false,
        transcriptQuality: 0,
      },
      formattedNotes: "# Empty Meeting\n\nNo data available.",
    };
  }

  private generateLocalNotes(
    messages: Message[],
    options: MeetingNotesOptions,
  ): MeetingNotesResult {
    const metadata = this.extractMetadata(messages);

    const result: MeetingNotesResult = {
      title: this.generateLocalTitle(messages),
      summary: this.generateLocalSummary(messages),
      participants: [],
      agenda: [],
      decisions: this.extractLocalDecisions(messages),
      actionItems: this.extractLocalActionItems(messages),
      topics: [],
      transcript: [],
      metadata,
      formattedNotes: "",
    };

    result.formattedNotes = this.formatNotes(
      result,
      options.templateStyle || "simple",
    );

    return result;
  }
}

// Singleton instance
let meetingNotesGenerator: MeetingNotesGenerator | null = null;

/**
 * Get or create the global meeting notes generator instance
 */
export function getMeetingNotesGenerator(
  config?: Partial<MeetingNotesConfig>,
): MeetingNotesGenerator {
  if (!meetingNotesGenerator || config) {
    meetingNotesGenerator = new MeetingNotesGenerator(config);
  }
  return meetingNotesGenerator;
}

/**
 * Quick helper to check if meeting notes generation is available
 */
export function isMeetingNotesAvailable(): boolean {
  const generator = getMeetingNotesGenerator();
  return generator.available();
}
