/**
 * Bot API Client
 * Handles bot authentication, message sending, event listening, and rate limiting
 */

import type {
  BotId,
  BotClientConfig,
  BotCredentials,
  BotToken,
  BotInfo,
  BotStatus,
  BotEvent,
  BotEventType,
  EventListener,
  RateLimitConfig,
  RateLimitState,
  SendMessageOptions,
  SendMessageResult,
  RichMessage,
  ChannelId,
  MessageId,
  Result,
  ApiError,
} from "./types";
import { logger } from "@/lib/logger";

// ============================================================================
// RATE LIMITER
// ============================================================================

/**
 * Rate limiter for API requests
 */
export class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requests.length < this.config.maxRequests;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Get current rate limit state
   */
  getState(): RateLimitState {
    this.cleanupOldRequests();
    const remaining = Math.max(
      0,
      this.config.maxRequests - this.requests.length,
    );
    const oldestRequest = this.requests[0];
    const resetAt = oldestRequest
      ? new Date(oldestRequest + this.config.windowMs)
      : new Date(Date.now() + this.config.windowMs);

    return {
      remaining,
      resetAt,
      isLimited: remaining === 0,
    };
  }

  /**
   * Get time until rate limit resets
   */
  getRetryAfter(): number {
    if (!this.getState().isLimited) {
      return 0;
    }
    const oldestRequest = this.requests[0];
    if (!oldestRequest) {
      return 0;
    }
    return Math.max(0, oldestRequest + this.config.windowMs - Date.now());
  }

  /**
   * Wait until rate limit allows a request
   */
  async waitForAvailability(): Promise<void> {
    const retryAfter = this.getRetryAfter();
    if (retryAfter > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * Clean up requests outside the window
   */
  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter((time) => time > cutoff);
  }
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

/**
 * Simple event emitter for bot events
 */
export class BotEventEmitter {
  private listeners: Map<BotEventType | "*", Set<EventListener>> = new Map();

  /**
   * Add an event listener
   */
  on<T = unknown>(
    event: BotEventType | "*",
    listener: EventListener<T>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /**
   * Remove an event listener
   */
  off<T = unknown>(
    event: BotEventType | "*",
    listener: EventListener<T>,
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener);
    }
  }

  /**
   * Emit an event
   */
  emit<T = unknown>(event: BotEventType, data?: T): void {
    const botEvent: BotEvent<T> = {
      type: event,
      timestamp: new Date(),
      data,
    };

    // Call specific event listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(botEvent);
        } catch (error) {
          logger.error(
            `[BotEventEmitter] Error in event listener for '${event}':`,
            error,
          );
        }
      });
    }

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(botEvent);
        } catch (error) {
          logger.error(`[BotEventEmitter] Error in wildcard listener:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(event?: BotEventType | "*"): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: BotEventType | "*"): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// ============================================================================
// BOT CLIENT
// ============================================================================

const DEFAULT_RATE_LIMITS: Required<BotClientConfig["rateLimits"]> = {
  messages: { maxRequests: 50, windowMs: 60000 },
  reactions: { maxRequests: 100, windowMs: 60000 },
  api: { maxRequests: 200, windowMs: 60000 },
};

/**
 * Bot API client for interacting with the chat platform
 */
export class BotClient {
  private config: Required<BotClientConfig>;
  private token: BotToken | null = null;
  private status: BotStatus = "offline";
  private events: BotEventEmitter;
  private rateLimiters: {
    messages: RateLimiter;
    reactions: RateLimiter;
    api: RateLimiter;
  };
  private connected = false;

  constructor(config: BotClientConfig) {
    this.config = {
      botId: config.botId,
      secret: config.secret,
      baseUrl: config.baseUrl ?? "https://api.nchat.local",
      timeout: config.timeout ?? 30000,
      retryCount: config.retryCount ?? 3,
      rateLimits: {
        ...DEFAULT_RATE_LIMITS,
        ...config.rateLimits,
      },
    };

    this.events = new BotEventEmitter();
    this.rateLimiters = {
      messages: new RateLimiter(this.config.rateLimits.messages!),
      reactions: new RateLimiter(this.config.rateLimits.reactions!),
      api: new RateLimiter(this.config.rateLimits.api!),
    };
  }

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  /**
   * Authenticate the bot and obtain a token
   */
  async authenticate(): Promise<Result<BotToken>> {
    try {
      const credentials: BotCredentials = {
        botId: this.config.botId,
        secret: this.config.secret,
      };

      const response = await this.makeRequest<{
        token: string;
        expiresIn: number;
        refreshToken?: string;
      }>(
        "/auth/bot",
        {
          method: "POST",
          body: JSON.stringify(credentials),
        },
        false, // Don't require auth for this request
      );

      if (!response.success) {
        this.setStatus("error");
        this.events.emit("error", response.error);
        return response;
      }

      this.token = {
        token: response.data.token,
        expiresAt: new Date(Date.now() + response.data.expiresIn * 1000),
        refreshToken: response.data.refreshToken,
      };

      this.setStatus("online");
      this.connected = true;
      this.events.emit("connected");

      return { success: true, data: this.token };
    } catch (error) {
      const apiError: ApiError = {
        code: "AUTH_ERROR",
        message:
          error instanceof Error ? error.message : "Authentication failed",
      };
      this.setStatus("error");
      this.events.emit("error", apiError);
      return { success: false, error: apiError };
    }
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<Result<BotToken>> {
    if (!this.token?.refreshToken) {
      return {
        success: false,
        error: {
          code: "NO_REFRESH_TOKEN",
          message: "No refresh token available",
        },
      };
    }

    try {
      const response = await this.makeRequest<{
        token: string;
        expiresIn: number;
        refreshToken?: string;
      }>(
        "/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.token.refreshToken }),
        },
        false,
      );

      if (!response.success) {
        return response;
      }

      this.token = {
        token: response.data.token,
        expiresAt: new Date(Date.now() + response.data.expiresIn * 1000),
        refreshToken: response.data.refreshToken ?? this.token.refreshToken,
      };

      return { success: true, data: this.token };
    } catch (error) {
      const apiError: ApiError = {
        code: "REFRESH_ERROR",
        message:
          error instanceof Error ? error.message : "Token refresh failed",
      };
      return { success: false, error: apiError };
    }
  }

  /**
   * Check if the token is expired or about to expire
   */
  isTokenExpired(bufferMs = 60000): boolean {
    if (!this.token) {
      return true;
    }
    return Date.now() + bufferMs >= this.token.expiresAt.getTime();
  }

  /**
   * Disconnect the bot
   */
  async disconnect(): Promise<void> {
    this.token = null;
    this.connected = false;
    this.setStatus("offline");
    this.events.emit("disconnected");
    this.resetRateLimiters();
  }

  // ==========================================================================
  // MESSAGING
  // ==========================================================================

  /**
   * Send a message to a channel
   */
  async sendMessage(
    options: SendMessageOptions,
  ): Promise<Result<SendMessageResult>> {
    // Check rate limit
    if (!this.rateLimiters.messages.canMakeRequest()) {
      const state = this.rateLimiters.messages.getState();
      this.setStatus("rate_limited");
      this.events.emit("rate_limited", {
        type: "messages",
        retryAfter: state.resetAt,
      });
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Message rate limit exceeded",
          details: { retryAfter: state.resetAt.toISOString() },
        },
      };
    }

    const messageBody: Record<string, unknown> = {
      channel_id: options.channelId,
      message:
        typeof options.message === "string"
          ? { text: options.message }
          : options.message,
    };

    if (options.threadTs) {
      messageBody.thread_ts = options.threadTs;
    }

    if (options.replyBroadcast !== undefined) {
      messageBody.reply_broadcast = options.replyBroadcast;
    }

    const response = await this.makeRequest<SendMessageResult>("/messages", {
      method: "POST",
      body: JSON.stringify(messageBody),
    });

    if (response.success) {
      this.rateLimiters.messages.recordRequest();
      this.events.emit("message", { type: "sent", ...response.data });
    }

    return response;
  }

  /**
   * Edit a message
   */
  async editMessage(
    channelId: ChannelId,
    messageId: MessageId,
    message: RichMessage | string,
  ): Promise<Result<void>> {
    const response = await this.makeRequest<void>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        channel_id: channelId,
        message: typeof message === "string" ? { text: message } : message,
      }),
    });

    return response;
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    channelId: ChannelId,
    messageId: MessageId,
  ): Promise<Result<void>> {
    const response = await this.makeRequest<void>(`/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ channel_id: channelId }),
    });

    return response;
  }

  // ==========================================================================
  // REACTIONS
  // ==========================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    channelId: ChannelId,
    messageId: MessageId,
    emoji: string,
  ): Promise<Result<void>> {
    if (!this.rateLimiters.reactions.canMakeRequest()) {
      const state = this.rateLimiters.reactions.getState();
      this.setStatus("rate_limited");
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Reaction rate limit exceeded",
          details: { retryAfter: state.resetAt.toISOString() },
        },
      };
    }

    const response = await this.makeRequest<void>("/reactions", {
      method: "POST",
      body: JSON.stringify({
        channel_id: channelId,
        message_id: messageId,
        emoji,
      }),
    });

    if (response.success) {
      this.rateLimiters.reactions.recordRequest();
    }

    return response;
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    channelId: ChannelId,
    messageId: MessageId,
    emoji: string,
  ): Promise<Result<void>> {
    const response = await this.makeRequest<void>("/reactions", {
      method: "DELETE",
      body: JSON.stringify({
        channel_id: channelId,
        message_id: messageId,
        emoji,
      }),
    });

    return response;
  }

  // ==========================================================================
  // BOT INFO
  // ==========================================================================

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<Result<BotInfo>> {
    return this.makeRequest<BotInfo>(`/bots/${this.config.botId}`);
  }

  /**
   * Get current bot status
   */
  getStatus(): BotStatus {
    return this.status;
  }

  /**
   * Check if bot is connected
   */
  isConnected(): boolean {
    return this.connected && this.status === "online";
  }

  /**
   * Get bot ID
   */
  getBotId(): BotId {
    return this.config.botId;
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  /**
   * Subscribe to bot events
   */
  on<T = unknown>(
    event: BotEventType | "*",
    listener: EventListener<T>,
  ): () => void {
    return this.events.on(event, listener);
  }

  /**
   * Unsubscribe from bot events
   */
  off<T = unknown>(
    event: BotEventType | "*",
    listener: EventListener<T>,
  ): void {
    this.events.off(event, listener);
  }

  /**
   * Get the event emitter
   */
  getEventEmitter(): BotEventEmitter {
    return this.events;
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  /**
   * Get rate limit state for a specific limiter
   */
  getRateLimitState(type: "messages" | "reactions" | "api"): RateLimitState {
    return this.rateLimiters[type].getState();
  }

  /**
   * Check if any rate limit is active
   */
  isRateLimited(): boolean {
    return (
      this.rateLimiters.messages.getState().isLimited ||
      this.rateLimiters.reactions.getState().isLimited ||
      this.rateLimiters.api.getState().isLimited
    );
  }

  /**
   * Reset all rate limiters
   */
  resetRateLimiters(): void {
    this.rateLimiters.messages.reset();
    this.rateLimiters.reactions.reset();
    this.rateLimiters.api.reset();
    if (this.status === "rate_limited") {
      this.setStatus("online");
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Make an API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<Result<T>> {
    // Check API rate limit
    if (!this.rateLimiters.api.canMakeRequest()) {
      const state = this.rateLimiters.api.getState();
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "API rate limit exceeded",
          details: { retryAfter: state.resetAt.toISOString() },
        },
      };
    }

    // Check authentication
    if (requireAuth && !this.token) {
      return {
        success: false,
        error: {
          code: "NOT_AUTHENTICATED",
          message: "Bot is not authenticated",
        },
      };
    }

    // Refresh token if needed
    if (requireAuth && this.isTokenExpired()) {
      const refreshResult = await this.refreshToken();
      if (!refreshResult.success) {
        // Try re-authenticating
        const authResult = await this.authenticate();
        if (!authResult.success) {
          return authResult as Result<T>;
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (requireAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token.token}`;
    }

    let retries = 0;
    while (retries <= this.config.retryCount) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout,
        );

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        this.rateLimiters.api.recordRequest();

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const apiError: ApiError = {
            code: `HTTP_${response.status}`,
            message: errorBody.message || response.statusText,
            details: errorBody,
          };

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return { success: false, error: apiError };
          }

          // Retry server errors (5xx)
          retries++;
          if (retries <= this.config.retryCount) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000),
            );
            continue;
          }

          return { success: false, error: apiError };
        }

        // Handle empty responses
        const text = await response.text();
        if (!text) {
          return { success: true, data: undefined as T };
        }

        const data = JSON.parse(text) as T;
        return { success: true, data };
      } catch (error) {
        retries++;
        if (retries <= this.config.retryCount) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retries) * 1000),
          );
          continue;
        }

        const apiError: ApiError = {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Request failed",
        };
        return { success: false, error: apiError };
      }
    }

    return {
      success: false,
      error: {
        code: "MAX_RETRIES",
        message: "Maximum retry attempts exceeded",
      },
    };
  }

  /**
   * Set bot status and emit event if changed
   */
  private setStatus(status: BotStatus): void {
    if (this.status !== status) {
      this.status = status;
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new bot client
 */
export function createBotClient(config: BotClientConfig): BotClient {
  return new BotClient(config);
}

/**
 * Create bot client and authenticate
 */
export async function createAuthenticatedBotClient(
  config: BotClientConfig,
): Promise<Result<BotClient>> {
  const client = new BotClient(config);
  const authResult = await client.authenticate();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  return { success: true, data: client };
}
