/**
 * Outgoing Webhooks System
 *
 * Manages outgoing webhooks that send events from nself-chat to external services.
 * Supports event filtering, rate limiting, and delivery tracking.
 */

import {
  getWebhookQueueManager,
  type OutgoingWebhookPayload,
} from "./webhook-queue";
import { v4 as uuidv4 } from "uuid";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface OutgoingWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastDeliveredAt?: string;
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
    lastStatus?: "success" | "failed";
  };
}

export interface WebhookEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  triggeredBy?: {
    userId: string;
    username: string;
  };
}

export interface CreateWebhookParams {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  enabled?: boolean;
}

export interface UpdateWebhookParams {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  enabled?: boolean;
}

// ============================================================================
// Supported Events
// ============================================================================

export const WEBHOOK_EVENTS = {
  // Message events
  MESSAGE_CREATED: "message.created",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_DELETED: "message.deleted",
  MESSAGE_REACTION_ADDED: "message.reaction.added",
  MESSAGE_REACTION_REMOVED: "message.reaction.removed",

  // Channel events
  CHANNEL_CREATED: "channel.created",
  CHANNEL_UPDATED: "channel.updated",
  CHANNEL_DELETED: "channel.deleted",
  CHANNEL_ARCHIVED: "channel.archived",

  // User events
  USER_JOINED: "user.joined",
  USER_LEFT: "user.left",
  USER_UPDATED: "user.updated",
  USER_STATUS_CHANGED: "user.status.changed",

  // Thread events
  THREAD_CREATED: "thread.created",
  THREAD_UPDATED: "thread.updated",
  THREAD_RESOLVED: "thread.resolved",

  // File events
  FILE_UPLOADED: "file.uploaded",
  FILE_DELETED: "file.deleted",

  // Call events
  CALL_STARTED: "call.started",
  CALL_ENDED: "call.ended",
  CALL_PARTICIPANT_JOINED: "call.participant.joined",
  CALL_PARTICIPANT_LEFT: "call.participant.left",

  // Integration events
  INTEGRATION_CONNECTED: "integration.connected",
  INTEGRATION_DISCONNECTED: "integration.disconnected",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

// ============================================================================
// Outgoing Webhook Manager
// ============================================================================

/**
 * OutgoingWebhookManager handles all outgoing webhook subscriptions and delivery
 */
export class OutgoingWebhookManager {
  private webhooks: Map<string, OutgoingWebhook> = new Map();
  private storageKey = "nchat_outgoing_webhooks";

  constructor() {
    this.loadFromStorage();
  }

  // ==========================================================================
  // Webhook CRUD Operations
  // ==========================================================================

  /**
   * Create a new outgoing webhook
   */
  createWebhook(params: CreateWebhookParams): OutgoingWebhook {
    const webhook: OutgoingWebhook = {
      id: uuidv4(),
      name: params.name,
      url: params.url,
      secret: params.secret,
      events: params.events,
      enabled: params.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryStats: {
        total: 0,
        successful: 0,
        failed: 0,
      },
    };

    this.webhooks.set(webhook.id, webhook);
    this.saveToStorage();

    return webhook;
  }

  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): OutgoingWebhook | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks(): OutgoingWebhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get webhooks subscribed to a specific event
   */
  getWebhooksByEvent(event: string): OutgoingWebhook[] {
    return this.getAllWebhooks().filter(
      (webhook) => webhook.enabled && webhook.events.includes(event),
    );
  }

  /**
   * Update a webhook
   */
  updateWebhook(
    id: string,
    params: UpdateWebhookParams,
  ): OutgoingWebhook | null {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return null;
    }

    const updated: OutgoingWebhook = {
      ...webhook,
      ...params,
      updatedAt: new Date().toISOString(),
    };

    this.webhooks.set(id, updated);
    this.saveToStorage();

    return updated;
  }

  /**
   * Delete a webhook
   */
  deleteWebhook(id: string): boolean {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Enable a webhook
   */
  enableWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return false;
    }

    webhook.enabled = true;
    webhook.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return true;
  }

  /**
   * Disable a webhook
   */
  disableWebhook(id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      return false;
    }

    webhook.enabled = false;
    webhook.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return true;
  }

  // ==========================================================================
  // Event Delivery
  // ==========================================================================

  /**
   * Trigger a webhook event
   */
  async triggerEvent(event: WebhookEvent): Promise<{
    delivered: number;
    failed: number;
    webhookIds: string[];
  }> {
    const webhooks = this.getWebhooksByEvent(event.event);

    if (webhooks.length === 0) {
      return { delivered: 0, failed: 0, webhookIds: [] };
    }

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        return this.deliverWebhook(webhook, event);
      }),
    );

    const delivered = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      delivered,
      failed,
      webhookIds: webhooks.map((w) => w.id),
    };
  }

  /**
   * Deliver webhook to a specific endpoint
   */
  private async deliverWebhook(
    webhook: OutgoingWebhook,
    event: WebhookEvent,
  ): Promise<void> {
    const payload: OutgoingWebhookPayload = {
      id: `${webhook.id}-${Date.now()}`,
      url: webhook.url,
      event: event.event,
      data: {
        ...event.data,
        timestamp: event.timestamp,
        triggeredBy: event.triggeredBy,
      },
      secret: webhook.secret,
      maxRetries: 3,
    };

    try {
      const queueManager = getWebhookQueueManager();
      await queueManager.sendWebhook(payload, (result) => {
        this.updateDeliveryStats(webhook.id, result.success);
      });
    } catch (error) {
      logger.error(`Failed to queue webhook ${webhook.id}:`, error);
      this.updateDeliveryStats(webhook.id, false);
      throw error;
    }
  }

  /**
   * Update delivery statistics for a webhook
   */
  private updateDeliveryStats(webhookId: string, success: boolean): void {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return;
    }

    webhook.deliveryStats.total++;
    if (success) {
      webhook.deliveryStats.successful++;
      webhook.lastDeliveredAt = new Date().toISOString();
      webhook.deliveryStats.lastStatus = "success";
    } else {
      webhook.deliveryStats.failed++;
      webhook.deliveryStats.lastStatus = "failed";
    }

    this.saveToStorage();
  }

  // ==========================================================================
  // Testing
  // ==========================================================================

  /**
   * Test a webhook delivery
   */
  async testWebhook(webhookId: string): Promise<{
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
    duration: number;
  }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const testEvent: WebhookEvent = {
      event: "webhook.test",
      data: {
        message: "This is a test webhook from nself-chat",
        webhookId: webhook.id,
        webhookName: webhook.name,
      },
      timestamp: new Date().toISOString(),
    };

    const startTime = Date.now();

    try {
      const payload: OutgoingWebhookPayload = {
        id: `test-${webhook.id}-${Date.now()}`,
        url: webhook.url,
        event: testEvent.event,
        data: testEvent.data,
        secret: webhook.secret,
        maxRetries: 1,
      };

      const queueManager = getWebhookQueueManager();
      const jobId = await queueManager.sendWebhook(payload);

      // Wait for delivery (with timeout)
      const result = await this.waitForDelivery(jobId, 30000);

      return {
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Wait for webhook delivery to complete
   */
  private async waitForDelivery(
    jobId: string,
    timeout: number,
  ): Promise<{
    success: boolean;
    statusCode?: number;
    response?: string;
    error?: string;
  }> {
    const queueManager = getWebhookQueueManager();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await queueManager.getWebhookStatus(jobId);

      if (!status) {
        throw new Error("Webhook job not found");
      }

      if (status.state === "completed") {
        return status.result || { success: false, error: "No result" };
      }

      if (status.state === "failed") {
        return {
          success: false,
          error: status.failedReason || "Webhook delivery failed",
        };
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error("Webhook delivery timeout");
  }

  // ==========================================================================
  // Storage
  // ==========================================================================

  /**
   * Load webhooks from localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const webhooks: OutgoingWebhook[] = JSON.parse(stored);
        webhooks.forEach((webhook) => {
          this.webhooks.set(webhook.id, webhook);
        });
      }
    } catch (error) {
      logger.error("Error loading webhooks from storage:", error);
    }
  }

  /**
   * Save webhooks to localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      const webhooks = Array.from(this.webhooks.values());
      localStorage.setItem(this.storageKey, JSON.stringify(webhooks));
    } catch (error) {
      logger.error("Error saving webhooks to storage:", error);
    }
  }

  /**
   * Clear all webhooks
   */
  clear(): void {
    this.webhooks.clear();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.storageKey);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: OutgoingWebhookManager | null = null;

/**
 * Get the singleton outgoing webhook manager instance
 */
export function getOutgoingWebhookManager(): OutgoingWebhookManager {
  if (!managerInstance) {
    managerInstance = new OutgoingWebhookManager();
  }
  return managerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetOutgoingWebhookManager(): void {
  if (managerInstance) {
    managerInstance.clear();
  }
  managerInstance = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Trigger a webhook event (convenience function)
 */
export async function triggerWebhookEvent(
  event: string,
  data: Record<string, unknown>,
  triggeredBy?: { userId: string; username: string },
): Promise<void> {
  const manager = getOutgoingWebhookManager();
  await manager.triggerEvent({
    event,
    data,
    timestamp: new Date().toISOString(),
    triggeredBy,
  });
}
