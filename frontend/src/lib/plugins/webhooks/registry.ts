/**
 * Webhook Registry
 *
 * CRUD operations for webhook management, including:
 * - Creating incoming and outgoing webhooks
 * - Updating webhook configuration
 * - Enabling/disabling/deleting webhooks
 * - Event subscription management
 * - Secret rotation
 * - Webhook token generation
 */

import type {
  WebhookRegistration,
  CreateIncomingWebhookInput,
  CreateOutgoingWebhookInput,
  UpdateWebhookInput,
  WebhookRetryOptions,
} from "./types";
import { DEFAULT_RETRY_OPTIONS } from "./types";

// ============================================================================
// ID AND TOKEN GENERATION
// ============================================================================

let registryIdCounter = 0;

/**
 * Generate a unique webhook ID.
 */
export function generateWebhookId(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return `wh_${nodeCrypto.randomUUID()}`;
  } catch {
    registryIdCounter++;
    return `wh_${Date.now()}_${registryIdCounter}`;
  }
}

/**
 * Generate a webhook secret.
 */
export function generateWebhookSecret(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return `whsec_${nodeCrypto.randomBytes(32).toString("hex")}`;
  } catch {
    // Fallback for non-Node environments
    return `whsec_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

/**
 * Generate an incoming webhook token.
 */
export function generateWebhookToken(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return `wht_${nodeCrypto.randomBytes(24).toString("base64url")}`;
  } catch {
    return `wht_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// ============================================================================
// WEBHOOK STORE
// ============================================================================

/**
 * In-memory webhook store.
 * In production, this would be backed by a database.
 */
export class WebhookStore {
  private webhooks: Map<string, WebhookRegistration> = new Map();
  private tokenIndex: Map<string, string> = new Map(); // token -> webhookId

  /**
   * Save a webhook registration.
   */
  save(webhook: WebhookRegistration): void {
    this.webhooks.set(webhook.id, webhook);
    if (webhook.token) {
      this.tokenIndex.set(webhook.token, webhook.id);
    }
  }

  /**
   * Get a webhook by ID.
   */
  get(id: string): WebhookRegistration | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Get a webhook by token (for incoming webhooks).
   */
  getByToken(token: string): WebhookRegistration | undefined {
    const id = this.tokenIndex.get(token);
    if (!id) return undefined;
    return this.webhooks.get(id);
  }

  /**
   * Delete a webhook.
   */
  delete(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) return false;

    if (webhook.token) {
      this.tokenIndex.delete(webhook.token);
    }
    return this.webhooks.delete(id);
  }

  /**
   * List all webhooks, optionally filtered.
   */
  list(filter?: {
    direction?: "incoming" | "outgoing";
    status?: "active" | "paused" | "disabled" | "error";
    channelId?: string;
    createdBy?: string;
  }): WebhookRegistration[] {
    let webhooks = Array.from(this.webhooks.values());

    if (filter?.direction) {
      webhooks = webhooks.filter((w) => w.direction === filter.direction);
    }
    if (filter?.status) {
      webhooks = webhooks.filter((w) => w.status === filter.status);
    }
    if (filter?.channelId) {
      webhooks = webhooks.filter((w) => w.channelId === filter.channelId);
    }
    if (filter?.createdBy) {
      webhooks = webhooks.filter((w) => w.createdBy === filter.createdBy);
    }

    return webhooks;
  }

  /**
   * List webhooks subscribed to a specific event type.
   */
  listByEvent(eventType: string): WebhookRegistration[] {
    return Array.from(this.webhooks.values()).filter(
      (w) =>
        w.direction === "outgoing" &&
        w.status === "active" &&
        w.events?.includes(eventType),
    );
  }

  /**
   * Get the total count of webhooks.
   */
  get size(): number {
    return this.webhooks.size;
  }

  /**
   * Clear all webhooks.
   */
  clear(): void {
    this.webhooks.clear();
    this.tokenIndex.clear();
  }
}

// ============================================================================
// WEBHOOK REGISTRY
// ============================================================================

/**
 * Event listener types for the webhook registry.
 */
export type WebhookRegistryEventType =
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "webhook.enabled"
  | "webhook.disabled"
  | "webhook.secret_rotated";

export type WebhookRegistryListener = (
  event: WebhookRegistryEventType,
  webhook: WebhookRegistration,
) => void;

/**
 * The main webhook registry.
 * Manages webhook CRUD operations and lifecycle.
 */
export class WebhookRegistry {
  private store: WebhookStore;
  private listeners: WebhookRegistryListener[] = [];
  private baseUrl: string;

  constructor(store?: WebhookStore, baseUrl: string = "https://app.nchat.dev") {
    this.store = store ?? new WebhookStore();
    this.baseUrl = baseUrl;
  }

  // ==========================================================================
  // CREATION
  // ==========================================================================

  /**
   * Create an incoming webhook.
   */
  createIncoming(
    input: CreateIncomingWebhookInput,
    createdBy: string,
  ): WebhookRegistration {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Webhook name is required");
    }
    if (!input.channelId) {
      throw new Error("Channel ID is required for incoming webhooks");
    }

    const id = generateWebhookId();
    const token = generateWebhookToken();
    const secret = generateWebhookSecret();
    const now = new Date().toISOString();

    const webhook: WebhookRegistration = {
      id,
      name: input.name.trim(),
      description: input.description?.trim(),
      direction: "incoming",
      status: "active",
      url: `${this.baseUrl}/api/plugins/webhooks/incoming/${token}`,
      secret,
      channelId: input.channelId,
      token,
      avatarUrl: input.avatarUrl,
      defaultUsername: input.defaultUsername,
      createdBy,
      createdAt: now,
      updatedAt: now,
      deliveryCount: 0,
      failedDeliveryCount: 0,
      retryConfig: { ...DEFAULT_RETRY_OPTIONS },
    };

    this.store.save(webhook);
    this.emit("webhook.created", webhook);
    return webhook;
  }

  /**
   * Create an outgoing webhook.
   */
  createOutgoing(
    input: CreateOutgoingWebhookInput,
    createdBy: string,
  ): WebhookRegistration {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Webhook name is required");
    }
    if (!input.url) {
      throw new Error("URL is required for outgoing webhooks");
    }
    if (!input.events || input.events.length === 0) {
      throw new Error(
        "At least one event type is required for outgoing webhooks",
      );
    }

    // Validate URL
    try {
      const parsed = new URL(input.url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("URL must use http or https protocol");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("protocol")) {
        throw err;
      }
      throw new Error("Invalid webhook URL");
    }

    const id = generateWebhookId();
    const secret = generateWebhookSecret();
    const now = new Date().toISOString();

    const retryConfig: WebhookRetryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...(input.retryConfig || {}),
    };

    const webhook: WebhookRegistration = {
      id,
      name: input.name.trim(),
      description: input.description?.trim(),
      direction: "outgoing",
      status: "active",
      url: input.url,
      secret,
      events: input.events,
      filters: input.filters,
      headers: input.headers,
      createdBy,
      createdAt: now,
      updatedAt: now,
      deliveryCount: 0,
      failedDeliveryCount: 0,
      retryConfig,
      rateLimit: input.rateLimit,
    };

    this.store.save(webhook);
    this.emit("webhook.created", webhook);
    return webhook;
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Get a webhook by ID.
   */
  getById(id: string): WebhookRegistration | undefined {
    return this.store.get(id);
  }

  /**
   * Get a webhook by its incoming token.
   */
  getByToken(token: string): WebhookRegistration | undefined {
    return this.store.getByToken(token);
  }

  /**
   * List webhooks with optional filtering.
   */
  list(filter?: {
    direction?: "incoming" | "outgoing";
    status?: "active" | "paused" | "disabled" | "error";
    channelId?: string;
    createdBy?: string;
  }): WebhookRegistration[] {
    return this.store.list(filter);
  }

  /**
   * Get all active outgoing webhooks subscribed to an event.
   */
  getWebhooksForEvent(eventType: string): WebhookRegistration[] {
    return this.store.listByEvent(eventType);
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update a webhook.
   */
  update(id: string, input: UpdateWebhookInput): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new Error("Webhook name cannot be empty");
      }
      webhook.name = input.name.trim();
    }

    if (input.description !== undefined) {
      webhook.description = input.description?.trim();
    }

    if (input.url !== undefined && webhook.direction === "outgoing") {
      try {
        const parsed = new URL(input.url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("URL must use http or https protocol");
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("protocol")) {
          throw err;
        }
        throw new Error("Invalid webhook URL");
      }
      webhook.url = input.url;
    }

    if (input.status !== undefined) {
      webhook.status = input.status;
    }

    if (input.events !== undefined && webhook.direction === "outgoing") {
      webhook.events = input.events;
    }

    if (input.filters !== undefined) {
      webhook.filters = input.filters;
    }

    if (input.headers !== undefined && webhook.direction === "outgoing") {
      webhook.headers = input.headers;
    }

    if (input.avatarUrl !== undefined) {
      webhook.avatarUrl = input.avatarUrl;
    }

    if (input.defaultUsername !== undefined) {
      webhook.defaultUsername = input.defaultUsername;
    }

    if (input.retryConfig !== undefined) {
      webhook.retryConfig = {
        ...webhook.retryConfig,
        ...input.retryConfig,
      };
    }

    if (input.rateLimit !== undefined) {
      webhook.rateLimit = input.rateLimit;
    }

    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.updated", webhook);
    return webhook;
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  /**
   * Enable a webhook.
   */
  enable(id: string): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    webhook.status = "active";
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.enabled", webhook);
    return webhook;
  }

  /**
   * Disable a webhook.
   */
  disable(id: string): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    webhook.status = "disabled";
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.disabled", webhook);
    return webhook;
  }

  /**
   * Pause a webhook (temporary disable).
   */
  pause(id: string): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    webhook.status = "paused";
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    return webhook;
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete a webhook.
   */
  delete(id: string): boolean {
    const webhook = this.store.get(id);
    if (!webhook) {
      return false;
    }

    const deleted = this.store.delete(id);
    if (deleted) {
      this.emit("webhook.deleted", webhook);
    }
    return deleted;
  }

  // ==========================================================================
  // SECRET MANAGEMENT
  // ==========================================================================

  /**
   * Rotate the secret for a webhook.
   * Returns the new secret.
   */
  rotateSecret(id: string): string {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    const newSecret = generateWebhookSecret();
    webhook.secret = newSecret;
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.secret_rotated", webhook);
    return newSecret;
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Add event types to an outgoing webhook's subscription.
   */
  addEvents(id: string, events: string[]): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }
    if (webhook.direction !== "outgoing") {
      throw new Error("Can only add events to outgoing webhooks");
    }

    const currentEvents = new Set(webhook.events ?? []);
    for (const event of events) {
      currentEvents.add(event);
    }
    webhook.events = Array.from(currentEvents);
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.updated", webhook);
    return webhook;
  }

  /**
   * Remove event types from an outgoing webhook's subscription.
   */
  removeEvents(id: string, events: string[]): WebhookRegistration {
    const webhook = this.store.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }
    if (webhook.direction !== "outgoing") {
      throw new Error("Can only remove events from outgoing webhooks");
    }

    const removeSet = new Set(events);
    webhook.events = (webhook.events ?? []).filter((e) => !removeSet.has(e));
    webhook.updatedAt = new Date().toISOString();
    this.store.save(webhook);
    this.emit("webhook.updated", webhook);
    return webhook;
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  /**
   * Record a successful delivery for a webhook.
   */
  recordDelivery(id: string, success: boolean): void {
    const webhook = this.store.get(id);
    if (!webhook) return;

    webhook.deliveryCount++;
    if (!success) {
      webhook.failedDeliveryCount++;
    }
    webhook.lastTriggeredAt = new Date().toISOString();
    this.store.save(webhook);
  }

  /**
   * Get the total webhook count.
   */
  get count(): number {
    return this.store.size;
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  /**
   * Register an event listener.
   */
  onEvent(listener: WebhookRegistryListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(
    event: WebhookRegistryEventType,
    webhook: WebhookRegistration,
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event, webhook);
      } catch {
        // Ignore listener errors
      }
    }
  }

  // ==========================================================================
  // ACCESSORS
  // ==========================================================================

  /**
   * Get the underlying store.
   */
  getStore(): WebhookStore {
    return this.store;
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.store.clear();
    this.listeners = [];
  }
}
