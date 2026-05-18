/**
 * Messages Resource
 *
 * API methods for managing messages.
 */

import { BaseResource } from "./base";
import type { Message, PaginatedResult, ListOptions, UUID } from "../types";

/**
 * Create Message Options
 */
export interface CreateMessageOptions {
  channelId: UUID;
  content: string;
  parentId?: UUID;
  mentions?: UUID[];
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update Message Options
 */
export interface UpdateMessageOptions {
  content: string;
}

/**
 * Messages Resource Class
 *
 * @example
 * ```typescript
 * // Send a message
 * const message = await client.messages.send({
 *   channelId: 'channel-123',
 *   content: 'Hello, world!'
 * })
 *
 * // Get messages in a channel
 * const messages = await client.messages.list('channel-123', {
 *   limit: 50
 * })
 *
 * // React to a message
 * await client.messages.react('message-123', '👍')
 * ```
 */
export class MessagesResource extends BaseResource {
  /**
   * Send a message to a channel
   */
  async send(options: CreateMessageOptions): Promise<Message> {
    return this._post<Message>("/api/messages", options);
  }

  /**
   * Get a single message by ID
   */
  async get(messageId: UUID): Promise<Message> {
    return this._get<Message>(`/api/messages/${messageId}`);
  }

  /**
   * List messages in a channel
   */
  async list(
    channelId: UUID,
    options?: ListOptions,
  ): Promise<PaginatedResult<Message>> {
    return this._get<PaginatedResult<Message>>(
      `/api/channels/${channelId}/messages`,
      options,
    );
  }

  /**
   * Update a message
   */
  async update(
    messageId: UUID,
    options: UpdateMessageOptions,
  ): Promise<Message> {
    return this._patch<Message>(`/api/messages/${messageId}`, options);
  }

  /**
   * Delete a message
   */
  async delete(messageId: UUID): Promise<void> {
    return this._delete<void>(`/api/messages/${messageId}`);
  }

  /**
   * Add a reaction to a message
   */
  async react(messageId: UUID, emoji: string): Promise<void> {
    return this._post<void>(`/api/messages/${messageId}/reactions`, { emoji });
  }

  /**
   * Remove a reaction from a message
   */
  async unreact(messageId: UUID, emoji: string): Promise<void> {
    return this._delete<void>(
      `/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    );
  }

  /**
   * Pin a message
   */
  async pin(messageId: UUID): Promise<void> {
    return this._post<void>(`/api/messages/${messageId}/pin`);
  }

  /**
   * Unpin a message
   */
  async unpin(messageId: UUID): Promise<void> {
    return this._delete<void>(`/api/messages/${messageId}/pin`);
  }

  /**
   * Get thread replies
   */
  async getThread(
    messageId: UUID,
    options?: ListOptions,
  ): Promise<PaginatedResult<Message>> {
    return this._get<PaginatedResult<Message>>(
      `/api/messages/${messageId}/thread`,
      options,
    );
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: UUID): Promise<void> {
    return this._post<void>(`/api/messages/${messageId}/read`);
  }
}
