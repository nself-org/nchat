/**
 * OpenAI Client with Advanced Features
 * - Retry logic with exponential backoff
 * - Request timeout handling
 * - Streaming support
 * - Model fallback (gpt-4-turbo -> gpt-3.5-turbo)
 * - Error categorization
 * - Response caching integration
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  baseURL?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  defaultModel?: OpenAIModel;
  fallbackModel?: OpenAIModel;
  enableStreaming?: boolean;
}

export type OpenAIModel =
  | "gpt-4-turbo"
  | "gpt-4"
  | "gpt-3.5-turbo"
  | "gpt-4o"
  | "gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model?: OpenAIModel;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  user?: string; // User ID for tracking
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finishReason: string;
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finishReason: string | null;
  }[];
}

export enum OpenAIErrorType {
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  INVALID_REQUEST = "invalid_request",
  SERVER_ERROR = "server_error",
  TIMEOUT = "timeout",
  NETWORK = "network",
  UNKNOWN = "unknown",
}

export class OpenAIError extends Error {
  constructor(
    public type: OpenAIErrorType,
    message: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = "OpenAIError";
  }
}

// ============================================================================
// OpenAI Client
// ============================================================================

const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
  baseURL: "https://api.openai.com/v1",
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  defaultModel: "gpt-4o-mini",
  fallbackModel: "gpt-3.5-turbo",
  enableStreaming: true,
};

export class OpenAIClient {
  private config: Required<OpenAIConfig>;
  private retryCount: Map<string, number> = new Map();

  constructor(config: OpenAIConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<OpenAIConfig>;

    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
  }

  // ============================================================================
  // Chat Completions
  // ============================================================================

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.config.defaultModel;
    const requestId = this.generateRequestId();

    addSentryBreadcrumb("ai", "OpenAI chat completion request", {
      model,
      messageCount: request.messages.length,
      streaming: request.stream || false,
    });

    try {
      return await this.executeWithRetry(async () => {
        return await this.makeRequest<ChatCompletionResponse>(
          "/chat/completions",
          {
            model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            frequency_penalty: request.frequencyPenalty,
            presence_penalty: request.presencePenalty,
            stream: false,
            user: request.user,
          },
          requestId,
        );
      }, requestId);
    } catch (error) {
      // Try fallback model if primary fails
      if (model !== this.config.fallbackModel) {
        addSentryBreadcrumb("ai", "Falling back to alternative model", {
          originalModel: model,
          fallbackModel: this.config.fallbackModel,
        });

        try {
          return await this.makeRequest<ChatCompletionResponse>(
            "/chat/completions",
            {
              ...request,
              model: this.config.fallbackModel,
              stream: false,
            },
            requestId,
          );
        } catch (fallbackError) {
          // If fallback also fails, throw original error
          throw error;
        }
      }

      throw error;
    }
  }

  // ============================================================================
  // Streaming Chat Completions
  // ============================================================================

  async *createChatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.config.enableStreaming) {
      throw new Error("Streaming is disabled in configuration");
    }

    const model = request.model || this.config.defaultModel;
    const requestId = this.generateRequestId();

    addSentryBreadcrumb("ai", "OpenAI streaming chat completion", {
      model,
      messageCount: request.messages.length,
    });

    const response = await this.makeStreamRequest(
      "/chat/completions",
      {
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true,
        user: request.user,
      },
      requestId,
    );

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data) as StreamChunk;
              yield parsed;
            } catch (error) {
              logger.error("Error parsing stream chunk:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ============================================================================
  // Embeddings
  // ============================================================================

  async createEmbedding(
    input: string | string[],
    model: string = "text-embedding-3-small",
  ): Promise<number[][]> {
    const requestId = this.generateRequestId();

    const response = await this.executeWithRetry(async () => {
      return await this.makeRequest<{
        data: { embedding: number[] }[];
        usage: { prompt_tokens: number; total_tokens: number };
      }>(
        "/embeddings",
        {
          model,
          input,
        },
        requestId,
      );
    }, requestId);

    return response.data.map((item) => item.embedding);
  }

  // ============================================================================
  // Request Execution with Retry
  // ============================================================================

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    requestId: string,
    attempt: number = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const openAIError = this.categorizeError(error);

      // Don't retry on authentication or invalid request errors
      if (
        openAIError.type === OpenAIErrorType.AUTHENTICATION ||
        openAIError.type === OpenAIErrorType.INVALID_REQUEST
      ) {
        throw openAIError;
      }

      // Retry on rate limit, server error, timeout, or network errors
      if (attempt < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(attempt, openAIError.type);

        addSentryBreadcrumb(
          "ai",
          `Retrying OpenAI request (attempt ${attempt + 1})`,
          {
            errorType: openAIError.type,
            delay,
          },
        );

        await this.sleep(delay);
        return this.executeWithRetry(fn, requestId, attempt + 1);
      }

      throw openAIError;
    }
  }

  // ============================================================================
  // HTTP Request Methods
  // ============================================================================

  private async makeRequest<T>(
    endpoint: string,
    body: any,
    requestId: string,
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new OpenAIError(
          OpenAIErrorType.TIMEOUT,
          `Request timeout after ${this.config.timeout}ms`,
          408,
        );
      }

      throw error;
    }
  }

  private async makeStreamRequest(
    endpoint: string,
    body: any,
    requestId: string,
  ): Promise<Response> {
    const url = `${this.config.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout * 2,
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new OpenAIError(
          OpenAIErrorType.TIMEOUT,
          `Stream request timeout after ${this.config.timeout * 2}ms`,
          408,
        );
      }

      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };

    if (this.config.organization) {
      headers["OpenAI-Organization"] = this.config.organization;
    }

    return headers;
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private categorizeError(error: any): OpenAIError {
    // Handle fetch/network errors
    if (error instanceof TypeError || error.name === "NetworkError") {
      return new OpenAIError(
        OpenAIErrorType.NETWORK,
        "Network error occurred",
        undefined,
        error,
      );
    }

    // Handle timeout errors
    if (
      error instanceof OpenAIError &&
      error.type === OpenAIErrorType.TIMEOUT
    ) {
      return error;
    }

    // Handle HTTP errors
    const status = error.status || error.statusCode;
    const errorMessage =
      error.data?.error?.message || error.message || "Unknown error";

    switch (status) {
      case 401:
        return new OpenAIError(
          OpenAIErrorType.AUTHENTICATION,
          "Invalid API key or authentication failed",
          401,
          error.data,
        );
      case 429:
        return new OpenAIError(
          OpenAIErrorType.RATE_LIMIT,
          "Rate limit exceeded",
          429,
          error.data,
        );
      case 400:
      case 404:
        return new OpenAIError(
          OpenAIErrorType.INVALID_REQUEST,
          errorMessage,
          status,
          error.data,
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new OpenAIError(
          OpenAIErrorType.SERVER_ERROR,
          "OpenAI server error",
          status,
          error.data,
        );
      default:
        return new OpenAIError(
          OpenAIErrorType.UNKNOWN,
          errorMessage,
          status,
          error.data,
        );
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private calculateRetryDelay(
    attempt: number,
    errorType: OpenAIErrorType,
  ): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;

    // Longer delay for rate limit errors
    if (errorType === OpenAIErrorType.RATE_LIMIT) {
      return exponentialDelay * 2 + jitter;
    }

    return exponentialDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // ============================================================================
  // Public Utilities
  // ============================================================================

  getConfig(): Required<OpenAIConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...updates } as Required<OpenAIConfig>;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let clientInstance: OpenAIClient | null = null;

export function getOpenAIClient(config?: OpenAIConfig): OpenAIClient {
  if (!clientInstance || config) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || "";
    clientInstance = new OpenAIClient({ apiKey, ...config });
  }
  return clientInstance;
}

export function resetOpenAIClient(): void {
  clientInstance = null;
}
