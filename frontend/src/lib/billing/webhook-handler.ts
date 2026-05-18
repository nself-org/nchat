/**
 * Stripe Webhook Handler
 *
 * Robust webhook processing with replay protection, idempotency,
 * and comprehensive event handling for Stripe webhooks.
 *
 * @module @/lib/billing/webhook-handler
 * @version 1.0.0
 */

import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import {
  STRIPE_API_VERSION,
  type StripeWebhookEventType,
  type ProcessedWebhookEvent,
  type WebhookProcessingStatus,
  type WebhookHandlerResult,
  type WebhookReplayEntry,
  type WebhookHandlerConfig,
  DEFAULT_WEBHOOK_CONFIG,
  StripePaymentError,
  StripeErrorCode,
  type CheckoutSessionCompletedPayload,
  type InvoicePaidPayload,
  type PaymentFailedPayload,
  type SubscriptionUpdatedPayload,
} from "./stripe-types";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";
import { logger } from "@/lib/logger";
import {
  getSubscriptionService,
  type OperationActor,
} from "@/services/billing/subscription.service";

// ============================================================================
// Types
// ============================================================================

/**
 * Webhook event handler function type.
 */
export type WebhookEventHandler<T = unknown> = (
  event: Stripe.Event,
  payload: T,
) => Promise<void>;

/**
 * Webhook handler registration.
 */
interface WebhookHandlerRegistration {
  eventType: StripeWebhookEventType;
  handler: WebhookEventHandler;
  priority: number;
}

/**
 * Webhook processing context.
 */
interface WebhookProcessingContext {
  eventId: string;
  eventType: string;
  startTime: number;
  retryCount: number;
  metadata: Record<string, unknown>;
}

// ============================================================================
// In-Memory Stores (Replace with Redis/DB in production)
// ============================================================================

/**
 * In-memory replay protection store.
 * In production, use Redis with TTL.
 */
const processedEvents = new Map<string, WebhookReplayEntry>();

/**
 * In-memory event log.
 */
const eventLog: ProcessedWebhookEvent[] = [];

// ============================================================================
// Stripe Webhook Handler Class
// ============================================================================

/**
 * Stripe Webhook Handler with replay protection and idempotency.
 */
export class StripeWebhookHandler {
  private stripe: Stripe;
  private config: WebhookHandlerConfig;
  private handlers: Map<StripeWebhookEventType, WebhookHandlerRegistration[]> =
    new Map();
  private isInitialized = false;

  constructor(config?: Partial<WebhookHandlerConfig>) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new StripePaymentError(
        StripeErrorCode.MISSING_API_KEY,
        "STRIPE_SECRET_KEY is not configured",
      );
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new StripePaymentError(
        StripeErrorCode.MISSING_WEBHOOK_SECRET,
        "STRIPE_WEBHOOK_SECRET is not configured",
      );
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });

    this.config = {
      ...DEFAULT_WEBHOOK_CONFIG,
      endpointSecret,
      ...config,
    };

    this.registerDefaultHandlers();
    this.isInitialized = true;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Process a webhook event.
   */
  async processEvent(
    rawBody: string,
    signature: string,
  ): Promise<WebhookHandlerResult> {
    const startTime = Date.now();
    let eventId = "unknown";
    let eventType = "unknown";

    try {
      // 1. Verify signature and construct event
      const event = this.verifyAndConstructEvent(rawBody, signature);
      eventId = event.id;
      eventType = event.type;

      // 2. Check for replay (duplicate event)
      if (this.isReplayedEvent(event.id)) {
        return this.createResult(
          eventId,
          eventType,
          "skipped_duplicate",
          startTime,
          undefined,
          { reason: "duplicate_event" },
        );
      }

      // 3. Check event age
      if (!this.isEventFresh(event)) {
        return this.createResult(
          eventId,
          eventType,
          "skipped_old",
          startTime,
          undefined,
          {
            age: Date.now() / 1000 - event.created,
            maxAge: this.config.maxEventAge,
          },
        );
      }

      // 4. Mark event as being processed (replay protection)
      this.markEventProcessing(event);

      // 5. Get handlers for this event type
      const handlers =
        this.handlers.get(event.type as StripeWebhookEventType) || [];

      if (handlers.length === 0) {
        // No handler registered, but event is valid
        this.markEventProcessed(event, "succeeded");
        return this.createResult(
          eventId,
          eventType,
          "succeeded",
          startTime,
          undefined,
          { handlersExecuted: 0 },
        );
      }

      // 6. Execute handlers in priority order
      const sortedHandlers = [...handlers].sort(
        (a, b) => a.priority - b.priority,
      );
      let handlersExecuted = 0;

      for (const registration of sortedHandlers) {
        try {
          await registration.handler(event, event.data.object);
          handlersExecuted++;
        } catch (handlerError) {
          logger.error(`Webhook handler failed for ${event.type}`, {
            eventId: event.id,
            error: handlerError,
          });
          throw handlerError;
        }
      }

      // 7. Mark event as successfully processed
      this.markEventProcessed(event, "succeeded");

      return this.createResult(
        eventId,
        eventType,
        "succeeded",
        startTime,
        undefined,
        { handlersExecuted },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Mark as failed if we have the event ID
      if (eventId !== "unknown") {
        this.markEventFailed(eventId, eventType, errorMessage);
      }

      return this.createResult(
        eventId,
        eventType,
        "failed",
        startTime,
        errorMessage,
      );
    }
  }

  /**
   * Register a webhook event handler.
   */
  registerHandler<T>(
    eventType: StripeWebhookEventType,
    handler: WebhookEventHandler<T>,
    priority: number = 100,
  ): void {
    const existingHandlers = this.handlers.get(eventType) || [];
    existingHandlers.push({
      eventType,
      handler: handler as WebhookEventHandler,
      priority,
    });
    this.handlers.set(eventType, existingHandlers);
  }

  /**
   * Check if an event has been processed.
   */
  hasProcessedEvent(eventId: string): boolean {
    return processedEvents.has(eventId);
  }

  /**
   * Get processed event entry.
   */
  getProcessedEvent(eventId: string): WebhookReplayEntry | undefined {
    return processedEvents.get(eventId);
  }

  /**
   * Get event processing log.
   */
  getEventLog(limit: number = 100): ProcessedWebhookEvent[] {
    return eventLog.slice(-limit);
  }

  /**
   * Clear expired entries from replay protection store.
   */
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [eventId, entry] of processedEvents.entries()) {
      if (entry.expiresAt.getTime() < now) {
        processedEvents.delete(eventId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Verify webhook signature and construct event.
   */
  private verifyAndConstructEvent(
    rawBody: string,
    signature: string,
  ): Stripe.Event {
    if (!this.config.verifySignature) {
      return JSON.parse(rawBody) as Stripe.Event;
    }

    try {
      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.endpointSecret,
      );
    } catch (err) {
      throw new StripePaymentError(
        StripeErrorCode.WEBHOOK_SIGNATURE_INVALID,
        `Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        err,
      );
    }
  }

  /**
   * Check if event is a replay (already processed).
   */
  private isReplayedEvent(eventId: string): boolean {
    const entry = processedEvents.get(eventId);
    if (!entry) return false;

    // Check if entry has expired
    if (entry.expiresAt.getTime() < Date.now()) {
      processedEvents.delete(eventId);
      return false;
    }

    return true;
  }

  /**
   * Check if event is fresh (not too old).
   */
  private isEventFresh(event: Stripe.Event): boolean {
    const eventAge = Date.now() / 1000 - event.created;
    return eventAge <= this.config.maxEventAge;
  }

  /**
   * Mark event as being processed.
   */
  private markEventProcessing(event: Stripe.Event): void {
    const entry: WebhookReplayEntry = {
      eventId: event.id,
      eventType: event.type,
      processedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.replayProtectionTTL),
      checksum: this.generateChecksum(event),
    };
    processedEvents.set(event.id, entry);
  }

  /**
   * Mark event as successfully processed.
   */
  private markEventProcessed(
    event: Stripe.Event,
    status: WebhookProcessingStatus,
  ): void {
    const existing = processedEvents.get(event.id);
    if (existing) {
      processedEvents.set(event.id, {
        ...existing,
        processedAt: new Date(),
      });
    }

    // Log the event
    const logEntry: ProcessedWebhookEvent = {
      id: uuidv4(),
      eventType: event.type as StripeWebhookEventType,
      stripeEventId: event.id,
      processedAt: new Date(),
      processingDuration: 0, // Will be updated
      status,
      retryCount: 0,
      metadata: {},
    };
    eventLog.push(logEntry);

    // Keep log size manageable
    if (eventLog.length > 1000) {
      eventLog.splice(0, 100);
    }
  }

  /**
   * Mark event as failed.
   */
  private markEventFailed(
    eventId: string,
    eventType: string,
    error: string,
  ): void {
    const logEntry: ProcessedWebhookEvent = {
      id: uuidv4(),
      eventType: eventType as StripeWebhookEventType,
      stripeEventId: eventId,
      processedAt: new Date(),
      processingDuration: 0,
      status: "failed",
      retryCount: 0,
      error,
      metadata: {},
    };
    eventLog.push(logEntry);
  }

  /**
   * Generate checksum for event.
   */
  private generateChecksum(event: Stripe.Event): string {
    const data = JSON.stringify({
      id: event.id,
      type: event.type,
      created: event.created,
    });
    // Simple hash for demo - use crypto in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Create handler result.
   */
  private createResult(
    eventId: string,
    eventType: string,
    status: WebhookProcessingStatus,
    startTime: number,
    error?: string,
    metadata?: Record<string, unknown>,
  ): WebhookHandlerResult {
    return {
      success: status === "succeeded",
      eventId,
      eventType,
      status,
      duration: Date.now() - startTime,
      error,
      metadata,
    };
  }

  // ==========================================================================
  // Default Event Handlers
  // ==========================================================================

  /**
   * Register default handlers for common events.
   */
  private registerDefaultHandlers(): void {
    // Checkout session completed
    this.registerHandler<Stripe.Checkout.Session>(
      "checkout.session.completed",
      this.handleCheckoutCompleted.bind(this),
      1,
    );

    // Subscription events
    this.registerHandler<Stripe.Subscription>(
      "customer.subscription.created",
      this.handleSubscriptionCreated.bind(this),
      1,
    );

    this.registerHandler<Stripe.Subscription>(
      "customer.subscription.updated",
      this.handleSubscriptionUpdated.bind(this),
      1,
    );

    this.registerHandler<Stripe.Subscription>(
      "customer.subscription.deleted",
      this.handleSubscriptionDeleted.bind(this),
      1,
    );

    this.registerHandler<Stripe.Subscription>(
      "customer.subscription.trial_will_end",
      this.handleTrialWillEnd.bind(this),
      1,
    );

    // Invoice events
    this.registerHandler<Stripe.Invoice>(
      "invoice.paid",
      this.handleInvoicePaid.bind(this),
      1,
    );

    this.registerHandler<Stripe.Invoice>(
      "invoice.payment_failed",
      this.handleInvoicePaymentFailed.bind(this),
      1,
    );

    // Payment intent events
    this.registerHandler<Stripe.PaymentIntent>(
      "payment_intent.succeeded",
      this.handlePaymentIntentSucceeded.bind(this),
      1,
    );

    this.registerHandler<Stripe.PaymentIntent>(
      "payment_intent.payment_failed",
      this.handlePaymentIntentFailed.bind(this),
      1,
    );

    // Charge refunded
    this.registerHandler<Stripe.Charge>(
      "charge.refunded",
      this.handleChargeRefunded.bind(this),
      1,
    );
  }

  /**
   * Handle checkout session completed.
   */
  private async handleCheckoutCompleted(
    event: Stripe.Event,
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    logger.info("Processing checkout.session.completed", {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
    });

    // Extract workspace ID from metadata or client_reference_id
    const workspaceId =
      session.client_reference_id ||
      session.metadata?.workspace_id ||
      session.metadata?.workspaceId;

    if (!workspaceId) {
      logger.warn("No workspace ID found in checkout session", {
        sessionId: session.id,
      });
      return;
    }

    // If this is a subscription checkout, update subscription records
    if (session.subscription && session.mode === "subscription") {
      const subscriptionService = getSubscriptionService();
      const actor: OperationActor = {
        type: "webhook",
        id: "stripe-webhook",
      };

      // The subscription service handles linking the Stripe subscription
      // This is informational - the subscription.created event will handle the actual update
      logger.info("Checkout completed for subscription", {
        workspaceId,
        subscriptionId: session.subscription,
        customerId: session.customer,
      });
    }
  }

  /**
   * Handle subscription created.
   */
  private async handleSubscriptionCreated(
    event: Stripe.Event,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    logger.info("Processing customer.subscription.created", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    const workspaceId =
      subscription.metadata?.workspace_id || subscription.metadata?.workspaceId;

    if (!workspaceId) {
      logger.warn("No workspace ID in subscription metadata", {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Extract plan info from price metadata
    const priceItem = subscription.items.data[0];
    const plan = priceItem?.price?.metadata?.plan_tier as PlanTier | undefined;
    const interval =
      priceItem?.price?.recurring?.interval === "year" ? "yearly" : "monthly";

    logger.info("Subscription created with plan", {
      workspaceId,
      plan,
      interval,
      status: subscription.status,
    });
  }

  /**
   * Handle subscription updated.
   */
  private async handleSubscriptionUpdated(
    event: Stripe.Event,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    logger.info("Processing customer.subscription.updated", {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    const workspaceId =
      subscription.metadata?.workspace_id || subscription.metadata?.workspaceId;

    if (!workspaceId) {
      return;
    }

    const subscriptionService = getSubscriptionService();
    const actor: OperationActor = {
      type: "webhook",
      id: "stripe-webhook",
    };

    // Handle status changes
    if (subscription.status === "past_due") {
      const internalSub =
        await subscriptionService.getSubscriptionByWorkspace(workspaceId);
      if (internalSub) {
        await subscriptionService.handlePaymentFailure(
          internalSub.id,
          false,
          actor,
        );
      }
    } else if (subscription.status === "active") {
      const internalSub =
        await subscriptionService.getSubscriptionByWorkspace(workspaceId);
      if (internalSub && internalSub.state !== "active") {
        // Payment recovered
        await subscriptionService.handlePaymentSuccess(
          internalSub.id,
          0, // Amount will be from invoice
          actor,
        );
      }
    }
  }

  /**
   * Handle subscription deleted.
   */
  private async handleSubscriptionDeleted(
    event: Stripe.Event,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    logger.info("Processing customer.subscription.deleted", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    const workspaceId =
      subscription.metadata?.workspace_id || subscription.metadata?.workspaceId;

    if (!workspaceId) {
      return;
    }

    const subscriptionService = getSubscriptionService();
    const actor: OperationActor = {
      type: "webhook",
      id: "stripe-webhook",
    };

    const internalSub =
      await subscriptionService.getSubscriptionByWorkspace(workspaceId);
    if (internalSub && internalSub.state !== "canceled") {
      await subscriptionService.transitionState(
        internalSub.id,
        "canceled",
        "subscription_canceled",
        actor,
        { source: "stripe_webhook" },
      );
    }
  }

  /**
   * Handle trial will end.
   */
  private async handleTrialWillEnd(
    event: Stripe.Event,
    subscription: Stripe.Subscription,
  ): Promise<void> {
    logger.info("Processing customer.subscription.trial_will_end", {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end,
    });

    const workspaceId =
      subscription.metadata?.workspace_id || subscription.metadata?.workspaceId;

    if (!workspaceId) {
      return;
    }

    const subscriptionService = getSubscriptionService();
    const actor: OperationActor = {
      type: "webhook",
      id: "stripe-webhook",
    };

    const internalSub =
      await subscriptionService.getSubscriptionByWorkspace(workspaceId);
    if (internalSub) {
      const daysRemaining = subscription.trial_end
        ? Math.ceil(
            (subscription.trial_end * 1000 - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      await subscriptionService.handleTrialEnding(
        internalSub.id,
        Math.max(0, daysRemaining),
        actor,
      );
    }
  }

  /**
   * Extract subscription ID from invoice (Stripe v18+ compatible).
   * In Stripe v18, subscription is nested in parent.subscription_details.
   */
  private getSubscriptionFromInvoice(invoice: Stripe.Invoice): string | null {
    // Try the new v18 path first
    const subscriptionDetails = (invoice as any).parent?.subscription_details
      ?.subscription;
    if (subscriptionDetails) {
      return typeof subscriptionDetails === "string"
        ? subscriptionDetails
        : subscriptionDetails.id;
    }

    // Fallback to legacy path (for older API versions)
    const legacySubscription = (invoice as any).subscription;
    if (legacySubscription) {
      return typeof legacySubscription === "string"
        ? legacySubscription
        : legacySubscription.id;
    }

    return null;
  }

  /**
   * Handle invoice paid.
   */
  private async handleInvoicePaid(
    event: Stripe.Event,
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = this.getSubscriptionFromInvoice(invoice);

    logger.info("Processing invoice.paid", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId,
      amountPaid: invoice.amount_paid,
    });

    if (!subscriptionId) {
      return;
    }

    // Get subscription to find workspace
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const workspaceId =
        subscription.metadata?.workspace_id ||
        subscription.metadata?.workspaceId;

      if (!workspaceId) {
        return;
      }

      const subscriptionService = getSubscriptionService();
      const actor: OperationActor = {
        type: "webhook",
        id: "stripe-webhook",
      };

      const internalSub =
        await subscriptionService.getSubscriptionByWorkspace(workspaceId);
      if (internalSub) {
        await subscriptionService.handlePaymentSuccess(
          internalSub.id,
          invoice.amount_paid,
          actor,
        );
      }
    } catch (error) {
      logger.error("Failed to process invoice.paid", {
        error,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Handle invoice payment failed.
   */
  private async handleInvoicePaymentFailed(
    event: Stripe.Event,
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId = this.getSubscriptionFromInvoice(invoice);

    logger.info("Processing invoice.payment_failed", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId,
      attemptCount: invoice.attempt_count,
    });

    if (!subscriptionId) {
      return;
    }

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const workspaceId =
        subscription.metadata?.workspace_id ||
        subscription.metadata?.workspaceId;

      if (!workspaceId) {
        return;
      }

      const subscriptionService = getSubscriptionService();
      const actor: OperationActor = {
        type: "webhook",
        id: "stripe-webhook",
      };

      const internalSub =
        await subscriptionService.getSubscriptionByWorkspace(workspaceId);
      if (internalSub) {
        const isFirstFailure = (invoice.attempt_count || 1) === 1;
        await subscriptionService.handlePaymentFailure(
          internalSub.id,
          isFirstFailure,
          actor,
        );
      }
    } catch (error) {
      logger.error("Failed to process invoice.payment_failed", {
        error,
        invoiceId: invoice.id,
      });
    }
  }

  /**
   * Handle payment intent succeeded.
   */
  private async handlePaymentIntentSucceeded(
    event: Stripe.Event,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    logger.info("Processing payment_intent.succeeded", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      customerId: paymentIntent.customer,
    });

    // Payment intent success is typically handled via invoice.paid for subscriptions
    // This handler is for one-time payments or other use cases
  }

  /**
   * Handle payment intent failed.
   */
  private async handlePaymentIntentFailed(
    event: Stripe.Event,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    logger.info("Processing payment_intent.payment_failed", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      customerId: paymentIntent.customer,
      error: paymentIntent.last_payment_error?.message,
    });

    // Log the failure details for debugging
    if (paymentIntent.last_payment_error) {
      logger.warn("Payment failed with error", {
        paymentIntentId: paymentIntent.id,
        errorCode: paymentIntent.last_payment_error.code,
        errorMessage: paymentIntent.last_payment_error.message,
        declineCode: paymentIntent.last_payment_error.decline_code,
      });
    }
  }

  /**
   * Handle charge refunded.
   */
  private async handleChargeRefunded(
    event: Stripe.Event,
    charge: Stripe.Charge,
  ): Promise<void> {
    logger.info("Processing charge.refunded", {
      chargeId: charge.id,
      amount: charge.amount,
      amountRefunded: charge.amount_refunded,
      customerId: charge.customer,
    });

    // Log refund details
    const fullyRefunded = charge.amount === charge.amount_refunded;
    logger.info("Charge refund processed", {
      chargeId: charge.id,
      fullyRefunded,
      refundedAmount: charge.amount_refunded,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let webhookHandler: StripeWebhookHandler | null = null;

/**
 * Get the webhook handler singleton.
 */
export function getWebhookHandler(): StripeWebhookHandler {
  if (!webhookHandler) {
    webhookHandler = new StripeWebhookHandler();
  }
  return webhookHandler;
}

/**
 * Create a new webhook handler with custom config.
 */
export function createWebhookHandler(
  config?: Partial<WebhookHandlerConfig>,
): StripeWebhookHandler {
  return new StripeWebhookHandler(config);
}

/**
 * Reset the webhook handler singleton (for testing).
 */
export function resetWebhookHandler(): void {
  webhookHandler = null;
}

/**
 * Clear processed events (for testing).
 */
export function clearProcessedEvents(): void {
  processedEvents.clear();
  eventLog.length = 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract plan tier from Stripe price metadata.
 */
export function extractPlanFromPrice(price: Stripe.Price): PlanTier | null {
  const tier = price.metadata?.plan_tier || price.metadata?.planTier;
  if (
    tier &&
    ["free", "starter", "professional", "enterprise", "custom"].includes(tier)
  ) {
    return tier as PlanTier;
  }
  return null;
}

/**
 * Extract billing interval from Stripe price.
 */
export function extractIntervalFromPrice(price: Stripe.Price): BillingInterval {
  return price.recurring?.interval === "year" ? "yearly" : "monthly";
}

/**
 * Verify webhook signature without processing.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION,
    });
    stripe.webhooks.constructEvent(rawBody, signature, secret);
    return true;
  } catch {
    return false;
  }
}
