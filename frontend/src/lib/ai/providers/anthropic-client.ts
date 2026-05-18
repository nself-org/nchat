/**
 * Anthropic (Claude) Client with Advanced Features
 * - Claude 3.5 Sonnet and Haiku support
 * - Streaming support
 * - Error handling with retry logic
 * - Model selection and fallback
 * - Response caching integration
 */

import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  defaultModel?: ClaudeModel;
  fallbackModel?: ClaudeModel;
  enableStreaming?: boolean;
}

export type ClaudeModel =
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-haiku-20241022"
  | "claude-3-opus-20240229"
  | "claude-3-sonnet-20240229"
  | "claude-3-haiku-20240307";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MessageRequest {
  model?: ClaudeModel;
  messages: AnthropicMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stream?: boolean;
  metadata?: {
    userId?: string;
  };
}

export interface MessageResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: {
    type: "text";
    text: string;
  }[];
  model: string;
  stopReason: "end_turn" | "max_tokens" | "stop_sequence";
  stopSequence: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop"
    | "ping"
    | "error";
  message?: Partial<MessageResponse>;
  delta?: {
    type: "text_delta";
    text: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

export enum AnthropicErrorType {
  AUTHENTICATION = "authentication",
  RATE_LIMIT = "rate_limit",
  INVALID_REQUEST = "invalid_request",
  SERVER_ERROR = "server_error",
  TIMEOUT = "timeout",
  NETWORK = "network",
  OVERLOADED = "overloaded",
  UNKNOWN = "unknown",
}

export class AnthropicError extends Error {
  constructor(
    public type: AnthropicErrorType,
    message: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = "AnthropicError";
  }
}

// ============================================================================
// Anthropic Client
// ============================================================================

const DEFAULT_CONFIG: Partial<AnthropicConfig> = {
  baseURL: "https://api.anthropic.com/v1",
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  defaultModel: "claude-3-5-haiku-20241022",
  fallbackModel: "claude-3-haiku-20240307",
  enableStreaming: true,
};

const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicClient {
  private config: Required<AnthropicConfig>;

  constructor(config: AnthropicConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<AnthropicConfig>;

    if (!this.config.apiKey) {
      throw new Error("Anthropic API key is required");
    }
  }

  // ============================================================================
  // Messages API
  // ============================================================================

  async createMessage(request: MessageRequest): Promise<MessageResponse> {
    const model = request.model || this.config.defaultModel;
    const requestId = this.generateRequestId();

    addSentryBreadcrumb("ai", "Anthropic message request", {
      model,
      messageCount: request.messages.length,
      streaming: request.stream || false,
    });

    try {
      return await this.executeWithRetry(async () => {
        return await this.makeRequest<MessageResponse>(
          "/messages",
          {
            model,
            messages: request.messages,
            system: request.system,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 1.0,
            top_p: request.topP,
            top_k: request.topK,
            stream: false,
            metadata: request.metadata,
          },
          requestId,
        );
      }, requestId);
    } catch (error) {
      // Try fallback model if primary fails
      if (model !== this.config.fallbackModel) {
        addSentryBreadcrumb("ai", "Falling back to alternative Claude model", {
          originalModel: model,
          fallbackModel: this.config.fallbackModel,
        });

        try {
          return await this.makeRequest<MessageResponse>(
            "/messages",
            {
              ...request,
              model: this.config.fallbackModel,
              max_tokens: request.maxTokens || 4096,
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
  // Streaming Messages
  // ============================================================================

  async *createMessageStream(
    request: MessageRequest,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    if (!this.config.enableStreaming) {
      throw new Error("Streaming is disabled in configuration");
    }

    const model = request.model || this.config.defaultModel;
    const requestId = this.generateRequestId();

    addSentryBreadcrumb("ai", "Anthropic streaming message", {
      model,
      messageCount: request.messages.length,
    });

    const response = await this.makeStreamRequest(
      "/messages",
      {
        model,
        messages: request.messages,
        system: request.system,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 1.0,
        stream: true,
        metadata: request.metadata,
      },
      requestId,
    );

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("Response body is not readable");
    }

    try {
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data) as StreamEvent;
              yield event;

              // Stop on error or message stop
              if (event.type === "error" || event.type === "message_stop") {
                return;
              }
            } catch (error) {
              logger.error("Error parsing stream event:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
      const anthropicError = this.categorizeError(error);

      // Don't retry on authentication or invalid request errors
      if (
        anthropicError.type === AnthropicErrorType.AUTHENTICATION ||
        anthropicError.type === AnthropicErrorType.INVALID_REQUEST
      ) {
        throw anthropicError;
      }

      // Retry on rate limit, server error, timeout, network, or overloaded errors
      if (attempt < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(attempt, anthropicError.type);

        addSentryBreadcrumb(
          "ai",
          `Retrying Anthropic request (attempt ${attempt + 1})`,
          {
            errorType: anthropicError.type,
            delay,
          },
        );

        await this.sleep(delay);
        return this.executeWithRetry(fn, requestId, attempt + 1);
      }

      throw anthropicError;
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
        throw new AnthropicError(
          AnthropicErrorType.TIMEOUT,
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
        throw new AnthropicError(
          AnthropicErrorType.TIMEOUT,
          `Stream request timeout after ${this.config.timeout * 2}ms`,
          408,
        );
      }

      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    };
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private categorizeError(error: any): AnthropicError {
    // Handle fetch/network errors
    if (error instanceof TypeError || error.name === "NetworkError") {
      return new AnthropicError(
        AnthropicErrorType.NETWORK,
        "Network error occurred",
        undefined,
        error,
      );
    }

    // Handle timeout errors
    if (
      error instanceof AnthropicError &&
      error.type === AnthropicErrorType.TIMEOUT
    ) {
      return error;
    }

    // Handle HTTP errors
    const status = error.status || error.statusCode;
    const errorData = error.data?.error || {};
    const errorType = errorData.type || "";
    const errorMessage = errorData.message || error.message || "Unknown error";

    switch (status) {
      case 401:
        return new AnthropicError(
          AnthropicErrorType.AUTHENTICATION,
          "Invalid API key or authentication failed",
          401,
          error.data,
        );
      case 429:
        return new AnthropicError(
          AnthropicErrorType.RATE_LIMIT,
          "Rate limit exceeded",
          429,
          error.data,
        );
      case 400:
      case 404:
        return new AnthropicError(
          AnthropicErrorType.INVALID_REQUEST,
          errorMessage,
          status,
          error.data,
        );
      case 529:
        return new AnthropicError(
          AnthropicErrorType.OVERLOADED,
          "Anthropic API is temporarily overloaded",
          529,
          error.data,
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new AnthropicError(
          AnthropicErrorType.SERVER_ERROR,
          "Anthropic server error",
          status,
          error.data,
        );
      default:
        return new AnthropicError(
          AnthropicErrorType.UNKNOWN,
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
    errorType: AnthropicErrorType,
  ): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;

    // Longer delay for rate limit and overloaded errors
    if (
      errorType === AnthropicErrorType.RATE_LIMIT ||
      errorType === AnthropicErrorType.OVERLOADED
    ) {
      return exponentialDelay * 3 + jitter;
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

  getConfig(): Required<AnthropicConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AnthropicConfig>): void {
    this.config = { ...this.config, ...updates } as Required<AnthropicConfig>;
  }

  /**
   * Helper to convert messages to Anthropic format
   */
  static convertMessages(
    messages: { role: string; content: string }[],
  ): AnthropicMessage[] {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));
  }

  /**
   * Helper to extract system message
   */
  static extractSystemMessage(
    messages: { role: string; content: string }[],
  ): string | undefined {
    const systemMessage = messages.find((m) => m.role === "system");
    return systemMessage?.content;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let clientInstance: AnthropicClient | null = null;

export function getAnthropicClient(config?: AnthropicConfig): AnthropicClient {
  if (!clientInstance || config) {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    clientInstance = new AnthropicClient({ apiKey, ...config });
  }
  return clientInstance;
}

export function resetAnthropicClient(): void {
  clientInstance = null;
}
