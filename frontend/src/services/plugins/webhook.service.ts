/**
 * Webhook Service
 *
 * Service layer that orchestrates webhook operations by combining
 * the registry, delivery engine, and incoming processor.
 */

import {
  WebhookRegistry,
  WebhookStore,
  WebhookDeliveryEngine,
  IncomingWebhookProcessor,
  ReplayProtector,
} from "@/lib/plugins/webhooks";

import type {
  WebhookRegistration,
  CreateIncomingWebhookInput,
  CreateOutgoingWebhookInput,
  UpdateWebhookInput,
  WebhookEventPayload,
  WebhookDeliveryRecord,
  IncomingWebhookRequest,
  IncomingWebhookResult,
  WebhookFetchFunction,
  MessageCreatorFn,
} from "@/lib/plugins/webhooks";

import { generateNonce } from "@/lib/plugins/webhooks";

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface WebhookServiceConfig {
  /** Base URL for incoming webhook endpoints */
  baseUrl: string;
  /** Custom fetch function (for testing) */
  fetchFn?: WebhookFetchFunction;
  /** Message creator function for incoming webhooks */
  messageCreator?: MessageCreatorFn;
}

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

/**
 * Main webhook service that coordinates all webhook operations.
 */
export class WebhookService {
  private registry: WebhookRegistry;
  private deliveryEngine: WebhookDeliveryEngine;
  private incomingProcessor: IncomingWebhookProcessor;
  private replayProtector: ReplayProtector;

  constructor(config: WebhookServiceConfig) {
    const store = new WebhookStore();

    this.registry = new WebhookRegistry(store, config.baseUrl);

    // Default fetch using global fetch
    const fetchFn: WebhookFetchFunction =
      config.fetchFn ??
      (async (url, init) => {
        const response = await fetch(url, init);
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          text: () => response.text(),
        };
      });

    this.deliveryEngine = new WebhookDeliveryEngine(fetchFn);
    this.replayProtector = new ReplayProtector();

    // Default message creator (no-op in base service)
    const messageCreator: MessageCreatorFn =
      config.messageCreator ??
      (async (params) => {
        return { messageId: `msg_${Date.now()}` };
      });

    this.incomingProcessor = new IncomingWebhookProcessor(messageCreator);
  }

  // ==========================================================================
  // WEBHOOK MANAGEMENT
  // ==========================================================================

  createIncoming(
    input: CreateIncomingWebhookInput,
    createdBy: string,
  ): WebhookRegistration {
    const webhook = this.registry.createIncoming(input, createdBy);
    this.incomingProcessor.registerWebhook(webhook);
    return webhook;
  }

  createOutgoing(
    input: CreateOutgoingWebhookInput,
    createdBy: string,
  ): WebhookRegistration {
    return this.registry.createOutgoing(input, createdBy);
  }

  getWebhook(id: string): WebhookRegistration | undefined {
    return this.registry.getById(id);
  }

  listWebhooks(filter?: {
    direction?: "incoming" | "outgoing";
    status?: "active" | "paused" | "disabled" | "error";
    channelId?: string;
    createdBy?: string;
  }): WebhookRegistration[] {
    return this.registry.list(filter);
  }

  updateWebhook(id: string, input: UpdateWebhookInput): WebhookRegistration {
    const webhook = this.registry.update(id, input);
    // Re-register with incoming processor if it's an incoming webhook
    if (webhook.direction === "incoming") {
      this.incomingProcessor.registerWebhook(webhook);
    }
    return webhook;
  }

  deleteWebhook(id: string): boolean {
    const webhook = this.registry.getById(id);
    if (webhook?.token) {
      this.incomingProcessor.unregisterWebhook(webhook.token);
    }
    return this.registry.delete(id);
  }

  enableWebhook(id: string): WebhookRegistration {
    return this.registry.enable(id);
  }

  disableWebhook(id: string): WebhookRegistration {
    return this.registry.disable(id);
  }

  rotateSecret(id: string): string {
    return this.registry.rotateSecret(id);
  }

  // ==========================================================================
  // OUTGOING DELIVERY
  // ==========================================================================

  /**
   * Dispatch an event to all subscribed outgoing webhooks.
   */
  async dispatchEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<WebhookDeliveryRecord[]> {
    const webhooks = this.registry.getWebhooksForEvent(eventType);
    const results: WebhookDeliveryRecord[] = [];

    for (const webhook of webhooks) {
      const payload: WebhookEventPayload = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        event: eventType,
        webhookId: webhook.id,
        timestamp: new Date().toISOString(),
        version: "1.0",
        idempotencyKey: generateNonce(),
        data,
      };

      const result = await this.deliveryEngine.deliver(webhook, payload);
      this.registry.recordDelivery(webhook.id, result.status === "delivered");
      results.push(result);
    }

    return results;
  }

  /**
   * Deliver to a specific webhook.
   */
  async deliverToWebhook(
    webhookId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<WebhookDeliveryRecord | null> {
    const webhook = this.registry.getById(webhookId);
    if (!webhook || webhook.direction !== "outgoing") {
      return null;
    }

    const payload: WebhookEventPayload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      event: eventType,
      webhookId: webhook.id,
      timestamp: new Date().toISOString(),
      version: "1.0",
      idempotencyKey: generateNonce(),
      data,
    };

    const result = await this.deliveryEngine.deliver(webhook, payload);
    this.registry.recordDelivery(webhook.id, result.status === "delivered");
    return result;
  }

  // ==========================================================================
  // INCOMING PROCESSING
  // ==========================================================================

  /**
   * Process an incoming webhook request.
   */
  async processIncoming(
    request: IncomingWebhookRequest,
  ): Promise<IncomingWebhookResult> {
    return this.incomingProcessor.process(request);
  }

  // ==========================================================================
  // DELIVERY QUERIES
  // ==========================================================================

  getDelivery(deliveryId: string): WebhookDeliveryRecord | undefined {
    return this.deliveryEngine.getDelivery(deliveryId);
  }

  listDeliveries(webhookId?: string): WebhookDeliveryRecord[] {
    return this.deliveryEngine.listDeliveries(webhookId);
  }

  // ==========================================================================
  // ACCESSORS
  // ==========================================================================

  getRegistry(): WebhookRegistry {
    return this.registry;
  }

  getDeliveryEngine(): WebhookDeliveryEngine {
    return this.deliveryEngine;
  }

  getIncomingProcessor(): IncomingWebhookProcessor {
    return this.incomingProcessor;
  }

  getReplayProtector(): ReplayProtector {
    return this.replayProtector;
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.registry.clear();
    this.deliveryEngine.clear();
    this.incomingProcessor.clear();
    this.replayProtector.reset();
  }
}
