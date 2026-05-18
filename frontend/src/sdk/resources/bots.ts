/**
 * Bots Resource
 *
 * API methods for managing bots.
 */

import { BaseResource } from "./base";
import type {
  Bot,
  Message,
  PaginatedResult,
  ListOptions,
  UUID,
} from "../types";

/**
 * Create Bot Options
 */
export interface CreateBotOptions {
  name: string;
  username: string;
  description?: string;
  avatarUrl?: string;
  permissions?: string[];
}

/**
 * Update Bot Options
 */
export interface UpdateBotOptions {
  name?: string;
  description?: string;
  avatarUrl?: string;
  isActive?: boolean;
  permissions?: string[];
}

/**
 * Bots Resource Class
 *
 * @example
 * ```typescript
 * // Create a bot
 * const bot = await client.bots.create({
 *   name: 'My Bot',
 *   username: 'mybot',
 *   description: 'A helpful bot'
 * })
 *
 * // Send a message as bot
 * await client.bots.sendMessage(bot.id, {
 *   channelId: 'channel-123',
 *   content: 'Hello from bot!'
 * })
 * ```
 */
export class BotsResource extends BaseResource {
  /**
   * Create a new bot
   */
  async create(options: CreateBotOptions): Promise<Bot> {
    return this._post<Bot>("/api/bots", options);
  }

  /**
   * Get a bot by ID
   */
  async get(botId: UUID): Promise<Bot> {
    return this._get<Bot>(`/api/bots/${botId}`);
  }

  /**
   * List all bots
   */
  async list(options?: ListOptions): Promise<PaginatedResult<Bot>> {
    return this._get<PaginatedResult<Bot>>("/api/bots", options);
  }

  /**
   * Update a bot
   */
  async update(botId: UUID, options: UpdateBotOptions): Promise<Bot> {
    return this._patch<Bot>(`/api/bots/${botId}`, options);
  }

  /**
   * Delete a bot
   */
  async delete(botId: UUID): Promise<void> {
    return this._delete<void>(`/api/bots/${botId}`);
  }

  /**
   * Regenerate bot API key
   */
  async regenerateApiKey(botId: UUID): Promise<{ apiKey: string }> {
    return this._post<{ apiKey: string }>(
      `/api/bots/${botId}/regenerate-api-key`,
    );
  }

  /**
   * Send a message as bot
   */
  async sendMessage(
    botId: UUID,
    options: {
      channelId: UUID;
      content: string;
      attachments?: string[];
    },
  ): Promise<Message> {
    return this._post<Message>(`/api/bots/${botId}/send-message`, options);
  }

  /**
   * Add reaction as bot
   */
  async addReaction(
    botId: UUID,
    messageId: UUID,
    emoji: string,
  ): Promise<void> {
    return this._post<void>(`/api/bots/${botId}/add-reaction`, {
      messageId,
      emoji,
    });
  }
}
