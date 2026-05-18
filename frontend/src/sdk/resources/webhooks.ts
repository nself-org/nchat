/**
 * Webhooks Resource
 *
 * API methods for managing webhooks.
 */

import { BaseResource } from "./base";
import type { Webhook, PaginatedResult, ListOptions, UUID } from "../types";

/**
 * Create Webhook Options
 */
export interface CreateWebhookOptions {
  name: string;
  url: string;
  events: string[];
  secret?: string;
}

/**
 * Update Webhook Options
 */
export interface UpdateWebhookOptions {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

/**
 * Webhooks Resource Class
 *
 * @example
 * ```typescript
 * // Create a webhook
 * const webhook = await client.webhooks.create({
 *   name: 'Message Events',
 *   url: 'https://example.com/webhook',
 *   events: ['message.created', 'message.updated']
 * })
 *
 * // List webhooks
 * const webhooks = await client.webhooks.list()
 * ```
 */
export class WebhooksResource extends BaseResource {
  /**
   * Create a new webhook
   */
  async create(options: CreateWebhookOptions): Promise<Webhook> {
    return this._post<Webhook>("/api/webhooks", options);
  }

  /**
   * Get a webhook by ID
   */
  async get(webhookId: UUID): Promise<Webhook> {
    return this._get<Webhook>(`/api/webhooks/${webhookId}`);
  }

  /**
   * List all webhooks
   */
  async list(options?: ListOptions): Promise<PaginatedResult<Webhook>> {
    return this._get<PaginatedResult<Webhook>>("/api/webhooks", options);
  }

  /**
   * Update a webhook
   */
  async update(
    webhookId: UUID,
    options: UpdateWebhookOptions,
  ): Promise<Webhook> {
    return this._patch<Webhook>(`/api/webhooks/${webhookId}`, options);
  }

  /**
   * Delete a webhook
   */
  async delete(webhookId: UUID): Promise<void> {
    return this._delete<void>(`/api/webhooks/${webhookId}`);
  }

  /**
   * Test a webhook
   */
  async test(
    webhookId: UUID,
  ): Promise<{ success: boolean; response?: unknown }> {
    return this._post<{ success: boolean; response?: unknown }>(
      `/api/webhooks/${webhookId}/test`,
    );
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: UUID): Promise<{ secret: string }> {
    return this._post<{ secret: string }>(
      `/api/webhooks/${webhookId}/regenerate-secret`,
    );
  }
}
