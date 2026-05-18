/**
 * AI Orchestration Plugin Service
 * Client-side service for interacting with AI Orchestration plugin API
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  model: string;
}

export interface ModerationRequest {
  text: string;
  userId: string;
}

export interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    hateThreatening: boolean;
    selfHarm: boolean;
    sexual: boolean;
    sexualMinors: boolean;
    violence: boolean;
    violenceGraphic: boolean;
  };
  categoryScores: {
    hate: number;
    hateThreatening: number;
    selfHarm: number;
    sexual: number;
    sexualMinors: number;
    violence: number;
    violenceGraphic: number;
  };
}

export interface SummarizeRequest {
  text: string;
  userId: string;
  maxLength?: number;
}

export interface SummarizeResponse {
  summary: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
}

class AIService {
  private baseUrl = "/api/plugins/ai";

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`AI chat failed: ${response.statusText}`);
    }

    return response.json();
  }

  async moderate(request: ModerationRequest): Promise<ModerationResult> {
    const response = await fetch(`${this.baseUrl}/moderate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Content moderation failed: ${response.statusText}`);
    }

    return response.json();
  }

  async summarize(request: SummarizeRequest): Promise<SummarizeResponse> {
    const response = await fetch(`${this.baseUrl}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Summarization failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const aiService = new AIService();
