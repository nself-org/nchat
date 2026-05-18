/**
 * App Event Subscription & Delivery System
 *
 * Manages event subscriptions for installed apps, delivers events
 * to webhook endpoints with HMAC signatures, retry logic, and dedup.
 */

import type {
  AppEventType,
  AppEventPayload,
  EventDeliveryRecord,
  EventDeliveryStatus,
  AppScope,
  AppInstallation,
  RegisteredApp,
} from "./app-contract";
import {
  EVENT_REQUIRED_SCOPES,
  hasAllScopes,
  expandScopes,
} from "./app-contract";
import { generateId } from "./app-lifecycle";

// ============================================================================
// EVENT DELIVERY CONFIGURATION
// ============================================================================

export interface EventDeliveryConfig {
  /** Maximum retry attempts (default: 5) */
  maxRetries: number;
  /** Initial retry delay in ms (default: 1000) */
  initialRetryDelayMs: number;
  /** Max retry delay in ms (default: 300000 = 5 minutes) */
  maxRetryDelayMs: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** Delivery timeout in ms (default: 30000 = 30 seconds) */
  deliveryTimeoutMs: number;
}

const DEFAULT_DELIVERY_CONFIG: EventDeliveryConfig = {
  maxRetries: 5,
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 300000,
  backoffMultiplier: 2,
  deliveryTimeoutMs: 30000,
};

// ============================================================================
// SIGNATURE GENERATION
// ============================================================================

/**
 * Compute HMAC-SHA256 signature for event delivery.
 * Uses Node.js crypto for server-side.
 */
export function computeEventSignature(payload: string, secret: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    const hmac = nodeCrypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  } catch {
    // Fallback for non-Node environments: return a placeholder
    // In production, this should always use Node.js crypto
    return `sha256=fallback_${Buffer.from(payload).toString("base64").substring(0, 32)}`;
  }
}

/**
 * Verify an event signature.
 */
export function verifyEventSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected = computeEventSignature(payload, secret);

  // Constant-time comparison
  if (signature.length !== expected.length) {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto");
    return nodeCrypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    // Fallback to byte-by-byte comparison
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return result === 0;
  }
}

// ============================================================================
// EVENT SUBSCRIPTION STORE
// ============================================================================

export interface EventSubscription {
  /** Subscription ID */
  id: string;
  /** App registration ID */
  appId: string;
  /** Installation ID */
  installationId: string;
  /** Event types subscribed to */
  events: AppEventType[];
  /** Webhook URL for delivery */
  webhookUrl: string;
  /** Whether this subscription is active */
  active: boolean;
  /** When created */
  createdAt: string;
}

export class EventSubscriptionStore {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private deliveries: Map<string, EventDeliveryRecord> = new Map();
  private processedDeliveryIds: Set<string> = new Set();

  // --- Subscriptions ---

  getSubscription(id: string): EventSubscription | undefined {
    return this.subscriptions.get(id);
  }

  getSubscriptionsByApp(appId: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.appId === appId,
    );
  }

  getSubscriptionsForEvent(eventType: AppEventType): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.active && s.events.includes(eventType),
    );
  }

  saveSubscription(sub: EventSubscription): void {
    this.subscriptions.set(sub.id, sub);
  }

  deleteSubscription(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  // --- Deliveries ---

  getDelivery(deliveryId: string): EventDeliveryRecord | undefined {
    return this.deliveries.get(deliveryId);
  }

  listDeliveries(filter?: {
    appId?: string;
    status?: EventDeliveryStatus;
  }): EventDeliveryRecord[] {
    let deliveries = Array.from(this.deliveries.values());
    if (filter?.appId) {
      deliveries = deliveries.filter((d) => d.appId === filter.appId);
    }
    if (filter?.status) {
      deliveries = deliveries.filter((d) => d.status === filter.status);
    }
    return deliveries;
  }

  saveDelivery(delivery: EventDeliveryRecord): void {
    this.deliveries.set(delivery.deliveryId, delivery);
  }

  // --- Dedup ---

  isDeliveryProcessed(deliveryId: string): boolean {
    return this.processedDeliveryIds.has(deliveryId);
  }

  markDeliveryProcessed(deliveryId: string): void {
    this.processedDeliveryIds.add(deliveryId);
  }

  clear(): void {
    this.subscriptions.clear();
    this.deliveries.clear();
    this.processedDeliveryIds.clear();
  }
}

// ============================================================================
// EVENT MANAGER
// ============================================================================

/**
 * Custom fetch function type for dependency injection in tests.
 */
export type FetchFunction = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; statusText: string }>;

export class AppEventManager {
  private config: EventDeliveryConfig;
  private fetchFn: FetchFunction;

  constructor(
    private subscriptionStore: EventSubscriptionStore,
    config?: Partial<EventDeliveryConfig>,
    fetchFn?: FetchFunction,
  ) {
    this.config = { ...DEFAULT_DELIVERY_CONFIG, ...config };
    // Default fetch: use global fetch
    this.fetchFn =
      fetchFn ??
      (async (url, init) => {
        const response = await fetch(url, init);
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      });
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Subscribe an app installation to events.
   */
  subscribe(
    app: RegisteredApp,
    installation: AppInstallation,
    events: AppEventType[],
    webhookUrl: string,
  ): EventSubscription {
    // Validate that the app has scopes for the requested events
    const grantedExpanded = expandScopes(installation.grantedScopes);
    for (const event of events) {
      const requiredScopes = EVENT_REQUIRED_SCOPES[event];
      if (
        requiredScopes.length > 0 &&
        !hasAllScopes(grantedExpanded, requiredScopes)
      ) {
        throw new Error(
          `Insufficient scopes for event "${event}". Required: ${requiredScopes.join(", ")}`,
        );
      }
    }

    // Check for existing subscription for this installation
    const existing = this.subscriptionStore
      .getSubscriptionsByApp(app.id)
      .find((s) => s.installationId === installation.id);

    if (existing) {
      // Update existing subscription
      existing.events = events;
      existing.webhookUrl = webhookUrl;
      existing.active = true;
      this.subscriptionStore.saveSubscription(existing);
      return existing;
    }

    const subscription: EventSubscription = {
      id: generateId("sub"),
      appId: app.id,
      installationId: installation.id,
      events,
      webhookUrl,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.subscriptionStore.saveSubscription(subscription);
    return subscription;
  }

  /**
   * Unsubscribe an app from events.
   */
  unsubscribe(subscriptionId: string): boolean {
    const sub = this.subscriptionStore.getSubscription(subscriptionId);
    if (!sub) {
      return false;
    }
    sub.active = false;
    this.subscriptionStore.saveSubscription(sub);
    return true;
  }

  /**
   * Remove a subscription entirely.
   */
  removeSubscription(subscriptionId: string): boolean {
    return this.subscriptionStore.deleteSubscription(subscriptionId);
  }

  /**
   * Get subscriptions for an app.
   */
  getSubscriptions(appId: string): EventSubscription[] {
    return this.subscriptionStore.getSubscriptionsByApp(appId);
  }

  // ==========================================================================
  // EVENT DISPATCH
  // ==========================================================================

  /**
   * Dispatch an event to all subscribed apps.
   * Returns delivery records for each subscription that received the event.
   */
  async dispatchEvent(
    eventType: AppEventType,
    data: Record<string, unknown>,
    appSecrets: Map<string, string>,
  ): Promise<EventDeliveryRecord[]> {
    const subscriptions =
      this.subscriptionStore.getSubscriptionsForEvent(eventType);
    const deliveries: EventDeliveryRecord[] = [];

    for (const sub of subscriptions) {
      const deliveryId = generateId("del");

      // Dedup check
      if (this.subscriptionStore.isDeliveryProcessed(deliveryId)) {
        continue;
      }

      const payload: AppEventPayload = {
        deliveryId,
        event: eventType,
        timestamp: new Date().toISOString(),
        appId: sub.appId,
        installationId: sub.installationId,
        data,
      };

      const secret = appSecrets.get(sub.appId);
      if (!secret) {
        continue; // Skip apps without a secret
      }

      const delivery = await this.deliverEvent(payload, sub.webhookUrl, secret);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  /**
   * Deliver a single event to a webhook URL with retry logic.
   */
  async deliverEvent(
    payload: AppEventPayload,
    webhookUrl: string,
    secret: string,
  ): Promise<EventDeliveryRecord> {
    const record: EventDeliveryRecord = {
      deliveryId: payload.deliveryId,
      appId: payload.appId,
      event: payload.event,
      status: "pending",
      attempts: 0,
      maxAttempts: this.config.maxRetries + 1,
      createdAt: new Date().toISOString(),
    };

    this.subscriptionStore.saveDelivery(record);

    // Attempt delivery
    const payloadString = JSON.stringify(payload);
    const signature = computeEventSignature(payloadString, secret);

    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      record.attempts = attempt + 1;

      try {
        const response = await this.fetchFn(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Timestamp": String(Date.now()),
            "X-Delivery-Id": payload.deliveryId,
            "X-Event-Type": payload.event,
            "User-Agent": "nchat-webhook/1.0",
          },
          body: payloadString,
        });

        lastStatusCode = response.status;

        if (response.ok) {
          record.status = "delivered";
          record.lastStatusCode = response.status;
          record.completedAt = new Date().toISOString();
          this.subscriptionStore.saveDelivery(record);
          this.subscriptionStore.markDeliveryProcessed(payload.deliveryId);
          return record;
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      // If not the last attempt, wait before retry
      if (attempt < this.config.maxRetries) {
        record.status = "retrying";
        const delay = Math.min(
          this.config.initialRetryDelayMs *
            Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxRetryDelayMs,
        );
        record.nextRetryAt = new Date(Date.now() + delay).toISOString();
        this.subscriptionStore.saveDelivery(record);

        await this.sleep(delay);
      }
    }

    // All attempts failed
    record.status = "failed";
    record.lastError = lastError;
    record.lastStatusCode = lastStatusCode;
    record.completedAt = new Date().toISOString();
    this.subscriptionStore.saveDelivery(record);

    return record;
  }

  // ==========================================================================
  // DELIVERY QUERIES
  // ==========================================================================

  /**
   * Get delivery status for a specific delivery.
   */
  getDeliveryStatus(deliveryId: string): EventDeliveryRecord | undefined {
    return this.subscriptionStore.getDelivery(deliveryId);
  }

  /**
   * List delivery records, optionally filtered.
   */
  listDeliveries(filter?: {
    appId?: string;
    status?: EventDeliveryStatus;
  }): EventDeliveryRecord[] {
    return this.subscriptionStore.listDeliveries(filter);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
