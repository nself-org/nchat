/**
 * Telegram Integration Client
 *
 * Handles Telegram Bot API interactions including bot setup,
 * message forwarding, and group chat synchronization.
 */

import type {
  IntegrationProvider,
  IntegrationCredentials,
  Integration,
  TelegramChat,
  TelegramUser,
  TelegramMessage,
  TelegramImportOptions,
  TelegramSyncResult,
} from "../types";
import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

export const TELEGRAM_API_BASE = "https://api.telegram.org";

// ============================================================================
// Telegram API Response Types
// ============================================================================

interface TelegramApiResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

// ============================================================================
// Telegram Client Configuration
// ============================================================================

export interface TelegramClientConfig {
  botToken: string;
  webhookUrl?: string;
}

// ============================================================================
// Telegram API Client
// ============================================================================

/**
 * Telegram Bot API client for making authenticated requests
 */
export class TelegramApiClient {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Get API base URL for this bot
   */
  private getApiUrl(): string {
    return `${TELEGRAM_API_BASE}/bot${this.botToken}`;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: TelegramApiResponse<T> = await response.json();

    if (!data.ok) {
      throw new TelegramApiError(
        data.description || "Unknown Telegram API error",
        data.error_code || 0,
        method,
      );
    }

    return data.result as T;
  }

  // ==========================================================================
  // Bot Methods
  // ==========================================================================

  /**
   * Get bot information
   */
  async getMe(): Promise<TelegramUser> {
    return this.request<TelegramUser>("getMe");
  }

  /**
   * Set webhook URL
   */
  async setWebhook(
    url: string,
    options?: { secret_token?: string },
  ): Promise<boolean> {
    return this.request<boolean>("setWebhook", { url, ...options });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<boolean> {
    return this.request<boolean>("deleteWebhook");
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  }> {
    return this.request("getWebhookInfo");
  }

  // ==========================================================================
  // Chat Methods
  // ==========================================================================

  /**
   * Get chat information
   */
  async getChat(chatId: number | string): Promise<TelegramChat> {
    return this.request<TelegramChat>("getChat", { chat_id: chatId });
  }

  /**
   * Get chat administrators
   */
  async getChatAdministrators(
    chatId: number | string,
  ): Promise<Array<{ user: TelegramUser; status: string }>> {
    return this.request("getChatAdministrators", { chat_id: chatId });
  }

  /**
   * Get chat member count
   */
  async getChatMemberCount(chatId: number | string): Promise<number> {
    return this.request<number>("getChatMemberCount", { chat_id: chatId });
  }

  // ==========================================================================
  // Message Methods
  // ==========================================================================

  /**
   * Send a text message
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    options?: {
      parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
      reply_to_message_id?: number;
      disable_notification?: boolean;
    },
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendMessage", {
      chat_id: chatId,
      text,
      ...options,
    });
  }

  /**
   * Forward a message
   */
  async forwardMessage(
    chatId: number | string,
    fromChatId: number | string,
    messageId: number,
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("forwardMessage", {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    });
  }

  /**
   * Send a photo
   */
  async sendPhoto(
    chatId: number | string,
    photo: string,
    options?: {
      caption?: string;
      parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
    },
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendPhoto", {
      chat_id: chatId,
      photo,
      ...options,
    });
  }

  /**
   * Send a document
   */
  async sendDocument(
    chatId: number | string,
    document: string,
    options?: {
      caption?: string;
      parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
    },
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendDocument", {
      chat_id: chatId,
      document,
      ...options,
    });
  }

  /**
   * Get updates (for polling mode)
   */
  async getUpdates(options?: {
    offset?: number;
    limit?: number;
    timeout?: number;
  }): Promise<
    Array<{
      update_id: number;
      message?: TelegramMessage;
      edited_message?: TelegramMessage;
      channel_post?: TelegramMessage;
    }>
  > {
    return this.request("getUpdates", options);
  }

  // ==========================================================================
  // File Methods
  // ==========================================================================

  /**
   * Get file information
   */
  async getFile(fileId: string): Promise<{
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  }> {
    return this.request("getFile", { file_id: fileId });
  }

  /**
   * Get file download URL
   */
  getFileUrl(filePath: string): string {
    return `${TELEGRAM_API_BASE}/file/bot${this.botToken}/${filePath}`;
  }
}

// ============================================================================
// Telegram API Error
// ============================================================================

export class TelegramApiError extends Error {
  public readonly code: number;
  public readonly method: string;

  constructor(message: string, code: number, method: string) {
    super(`Telegram API error: ${message} (code: ${code}, method: ${method})`);
    this.name = "TelegramApiError";
    this.code = code;
    this.method = method;
  }
}

// ============================================================================
// Telegram Integration Provider
// ============================================================================

/**
 * Telegram integration provider implementation
 */
export class TelegramIntegrationProvider implements IntegrationProvider {
  readonly id = "telegram" as const;
  readonly name = "Telegram";
  readonly icon = "telegram";
  readonly description =
    "Import group chats and forward messages via Telegram bot";
  readonly category = "communication" as const;
  readonly scopes: string[] = [];

  private config: TelegramClientConfig;
  private client: TelegramApiClient | null = null;

  constructor(config: TelegramClientConfig) {
    this.config = config;
    this.client = new TelegramApiClient(config.botToken);
  }

  /**
   * Get OAuth authorization URL - Not applicable for Telegram
   */
  getAuthUrl(): string {
    throw new Error(
      "Telegram does not use OAuth. Please configure bot token directly.",
    );
  }

  /**
   * Start authorization - Not applicable for Telegram
   */
  async authorize(): Promise<void> {
    throw new Error(
      "Telegram does not use OAuth. Please configure bot token directly.",
    );
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.client && this.config.webhookUrl) {
      try {
        await this.client.deleteWebhook();
      } catch (error) {
        logger.warn("Failed to delete Telegram webhook:", { context: error });
      }
    }
    this.client = null;
  }

  /**
   * Handle OAuth callback - Not applicable for Telegram
   */
  async handleCallback(): Promise<IntegrationCredentials> {
    throw new Error("Telegram does not use OAuth callback.");
  }

  /**
   * Refresh token - Not applicable for Telegram
   */
  async refreshToken(
    credentials: IntegrationCredentials,
  ): Promise<IntegrationCredentials> {
    // Telegram bot tokens don't expire
    return credentials;
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<Integration> {
    const status: Integration = {
      id: this.id,
      name: this.name,
      icon: this.icon,
      description: this.description,
      category: this.category,
      status: "disconnected",
      scopes: this.scopes,
      config: {},
    };

    if (this.client) {
      try {
        const bot = await this.client.getMe();
        status.status = "connected";
        status.config = {
          botUsername: bot.username,
          botId: bot.id,
          botName: bot.first_name,
        };

        // Check webhook status if configured
        if (this.config.webhookUrl) {
          const webhookInfo = await this.client.getWebhookInfo();
          status.config.webhookUrl = webhookInfo.url;
          status.config.webhookActive = !!webhookInfo.url;
        }
      } catch {
        status.status = "error";
        status.error = "Failed to verify bot token";
      }
    }

    return status;
  }

  /**
   * Validate credentials
   */
  async validateCredentials(
    credentials: IntegrationCredentials,
  ): Promise<boolean> {
    const testClient = new TelegramApiClient(credentials.accessToken);
    try {
      await testClient.getMe();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Telegram-Specific Methods
  // ==========================================================================

  /**
   * Get API client
   */
  getClient(credentials?: IntegrationCredentials): TelegramApiClient {
    if (credentials) {
      this.client = new TelegramApiClient(credentials.accessToken);
    }
    if (!this.client) {
      throw new Error(
        "Telegram client not initialized. Please configure bot token.",
      );
    }
    return this.client;
  }

  /**
   * Setup webhook
   */
  async setupWebhook(
    webhookUrl: string,
    secretToken?: string,
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error("Telegram client not initialized");
    }

    return this.client.setWebhook(webhookUrl, { secret_token: secretToken });
  }

  /**
   * Get chat information
   */
  async getChat(chatId: number | string): Promise<TelegramChat> {
    if (!this.client) {
      throw new Error("Telegram client not initialized");
    }

    return this.client.getChat(chatId);
  }

  /**
   * Import Telegram history (limited by Bot API)
   */
  async importHistory(
    credentials: IntegrationCredentials,
    options?: TelegramImportOptions,
  ): Promise<TelegramSyncResult> {
    const client = this.getClient(credentials);
    const result: TelegramSyncResult = {
      success: false,
      chatsSynced: 0,
      messagesSynced: 0,
      errors: [],
    };

    try {
      // Note: Telegram Bot API has limited history access
      // Bots can only see messages sent after they were added to the chat
      // For full history import, you'd need MTProto API (user account)

      if (!options?.chatIds?.length) {
        result.errors.push(
          "No chat IDs provided. Telegram bots cannot list chats automatically.",
        );
        return result;
      }

      for (const chatId of options.chatIds) {
        try {
          const chat = await client.getChat(chatId);
          result.chatsSynced++;

          // Note: Can't fetch historical messages via Bot API
          // This would require polling or webhook setup
          result.errors.push(
            `Chat ${chat.title || chatId}: Bot API cannot fetch historical messages. ` +
              `Messages will be synced in real-time via webhook or polling.`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(
            `Failed to access chat ${chatId}: ${errorMessage}`,
          );
        }
      }

      result.success = result.chatsSynced > 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Import failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Forward message to Telegram chat
   */
  async forwardMessage(
    credentials: IntegrationCredentials,
    chatId: number | string,
    message: string,
    options?: {
      parse_mode?: "Markdown" | "HTML";
      disable_notification?: boolean;
    },
  ): Promise<TelegramMessage> {
    const client = this.getClient(credentials);
    return client.sendMessage(chatId, message, options);
  }

  /**
   * Send photo to Telegram chat
   */
  async sendPhoto(
    credentials: IntegrationCredentials,
    chatId: number | string,
    photoUrl: string,
    caption?: string,
  ): Promise<TelegramMessage> {
    const client = this.getClient(credentials);
    return client.sendPhoto(chatId, photoUrl, { caption });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Telegram integration provider
 */
export function createTelegramProvider(
  config: TelegramClientConfig,
): TelegramIntegrationProvider {
  return new TelegramIntegrationProvider(config);
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verify Telegram webhook request
 */
export function verifyTelegramWebhook(
  secretToken: string,
  receivedToken: string,
): boolean {
  return secretToken === receivedToken;
}
