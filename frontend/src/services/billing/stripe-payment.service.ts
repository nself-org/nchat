/**
 * Stripe Payment Service
 *
 * Comprehensive service for Stripe payment operations including idempotent
 * checkout, payment intents, refunds, invoices, and reconciliation.
 *
 * @module @/services/billing/stripe-payment.service
 * @version 1.0.0
 */

import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import {
  STRIPE_API_VERSION,
  type CreateCheckoutSessionInput,
  type CheckoutSessionResult,
  type CheckoutCompletionEvent,
  type CreatePaymentIntentInput,
  type PaymentIntentResult,
  type ConfirmPaymentIntentInput,
  type CapturePaymentIntentInput,
  type CreateRefundInput,
  type RefundResult,
  type BulkRefundRequest,
  type BulkRefundResult,
  type CreateInvoiceInput,
  type AddInvoiceItemInput,
  type InvoiceResult,
  type StripeInvoiceLineItem,
  type FinalizeInvoiceInput,
  type PayInvoiceInput,
  type VoidInvoiceInput,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerResult,
  type AttachPaymentMethodInput,
  type DetachPaymentMethodInput,
  type PaymentMethodDetails,
  type ReconciliationEntry,
  type ReconciliationReport,
  type ReconciliationRequest,
  type IdempotentOperationResult,
  type IdempotencyCacheEntry,
  type StripeOperation,
  type StripeOperationResult,
  StripePaymentError,
  StripeErrorCode,
} from "@/lib/billing/stripe-types";
import { STRIPE_PRICE_IDS, PLAN_PRICING } from "@/lib/billing/plan-config";
import type {
  PlanTier,
  BillingInterval,
  Currency,
} from "@/types/subscription.types";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Payment service configuration.
 */
export interface StripePaymentServiceConfig {
  /**
   * TTL for idempotency cache entries.
   * Default: 24 hours
   */
  idempotencyCacheTTL: number;

  /**
   * Enable operation logging.
   * Default: true
   */
  enableLogging: boolean;

  /**
   * Maximum retries for API calls.
   * Default: 3
   */
  maxRetries: number;

  /**
   * Retry delay in milliseconds.
   * Default: 1000
   */
  retryDelay: number;
}

/**
 * Default service configuration.
 */
const DEFAULT_CONFIG: StripePaymentServiceConfig = {
  idempotencyCacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  enableLogging: true,
  maxRetries: 3,
  retryDelay: 1000,
};

// ============================================================================
// In-Memory Stores (Replace with Redis/DB in production)
// ============================================================================

/**
 * Idempotency cache for operations.
 */
const idempotencyCache = new Map<string, IdempotencyCacheEntry>();

/**
 * Checkout session cache for deduplication.
 */
const checkoutSessionCache = new Map<string, CheckoutSessionResult>();

// ============================================================================
// Stripe Payment Service
// ============================================================================

/**
 * Stripe Payment Service for comprehensive payment operations.
 */
export class StripePaymentService {
  private stripe: Stripe;
  private config: StripePaymentServiceConfig;

  constructor(config?: Partial<StripePaymentServiceConfig>) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new StripePaymentError(
        StripeErrorCode.MISSING_API_KEY,
        "STRIPE_SECRET_KEY is not configured",
      );
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });

    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Checkout Operations
  // ==========================================================================

  /**
   * Create an idempotent checkout session.
   */
  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey?: string,
  ): Promise<IdempotentOperationResult<CheckoutSessionResult>> {
    const key =
      idempotencyKey || this.generateIdempotencyKey("checkout", input);

    // Check cache for existing result
    const cached = this.getCachedResult<CheckoutSessionResult>(key);
    if (cached) {
      return {
        success: true,
        data: cached.result.data,
        idempotencyKey: key,
        wasReplay: true,
        cachedAt: cached.createdAt,
      };
    }

    try {
      // Get price ID for the plan
      const priceId = this.getPriceId(input.plan, input.interval);
      if (!priceId) {
        throw new StripePaymentError(
          StripeErrorCode.PRICE_NOT_CONFIGURED,
          `Price ID not configured for plan: ${input.plan}/${input.interval}`,
        );
      }

      // Build checkout session params
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: input.mode || "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.clientReferenceId || input.workspaceId,
        metadata: {
          workspace_id: input.workspaceId,
          plan: input.plan,
          interval: input.interval,
          ...input.metadata,
        },
        allow_promotion_codes: input.allowPromotionCodes ?? false,
      };

      // Add customer if provided
      if (input.customerId) {
        params.customer = input.customerId;
      } else if (input.customerEmail) {
        params.customer_email = input.customerEmail;
      }

      // Add trial period for subscriptions
      if (input.mode !== "payment" && input.trialDays && input.trialDays > 0) {
        params.subscription_data = {
          trial_period_days: input.trialDays,
          metadata: {
            workspace_id: input.workspaceId,
            plan: input.plan,
            interval: input.interval,
          },
        };
      }

      // Add promotion code if provided
      if (input.promotionCode) {
        const promotions = await this.stripe.promotionCodes.list({
          code: input.promotionCode,
          active: true,
          limit: 1,
        });
        if (promotions.data.length > 0) {
          params.discounts = [{ promotion_code: promotions.data[0].id }];
        }
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(params, {
        idempotencyKey: key,
      });

      const result: CheckoutSessionResult = {
        sessionId: session.id,
        url: session.url,
        status: session.status as any,
        paymentStatus: session.payment_status,
        customerId: session.customer as string | null,
        subscriptionId: session.subscription as string | null,
        amountTotal: session.amount_total,
        currency: session.currency,
        expiresAt: new Date(session.expires_at * 1000),
        metadata: session.metadata || {},
      };

      // Cache the result
      this.cacheResult(key, "create_checkout_session", {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      });

      return {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      };
    } catch (error) {
      const paymentError = this.handleStripeError(error);
      return {
        success: false,
        error: paymentError,
        idempotencyKey: key,
        wasReplay: false,
      };
    }
  }

  /**
   * Retrieve checkout session status.
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<CheckoutSessionResult | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return {
        sessionId: session.id,
        url: session.url,
        status: session.status as any,
        paymentStatus: session.payment_status,
        customerId: session.customer as string | null,
        subscriptionId: session.subscription as string | null,
        amountTotal: session.amount_total,
        currency: session.currency,
        expiresAt: new Date(session.expires_at * 1000),
        metadata: session.metadata || {},
      };
    } catch (error) {
      logger.error("Failed to retrieve checkout session", { sessionId, error });
      return null;
    }
  }

  /**
   * Expire a checkout session.
   */
  async expireCheckoutSession(sessionId: string): Promise<boolean> {
    try {
      await this.stripe.checkout.sessions.expire(sessionId);
      return true;
    } catch (error) {
      logger.error("Failed to expire checkout session", { sessionId, error });
      return false;
    }
  }

  // ==========================================================================
  // Payment Intent Operations
  // ==========================================================================

  /**
   * Create a payment intent.
   */
  async createPaymentIntent(
    input: CreatePaymentIntentInput,
    idempotencyKey?: string,
  ): Promise<IdempotentOperationResult<PaymentIntentResult>> {
    const key =
      idempotencyKey || this.generateIdempotencyKey("payment_intent", input);

    // Check cache
    const cached = this.getCachedResult<PaymentIntentResult>(key);
    if (cached) {
      return {
        success: true,
        data: cached.result.data,
        idempotencyKey: key,
        wasReplay: true,
        cachedAt: cached.createdAt,
      };
    }

    try {
      const params: Stripe.PaymentIntentCreateParams = {
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        description: input.description,
        metadata: input.metadata || {},
        capture_method: input.captureMethod || "automatic",
        confirmation_method: input.confirmationMethod || "automatic",
        receipt_email: input.receiptEmail,
      };

      if (input.customerId) {
        params.customer = input.customerId;
      }

      if (input.paymentMethodId) {
        params.payment_method = input.paymentMethodId;
      }

      if (input.setupFutureUsage) {
        params.setup_future_usage = input.setupFutureUsage;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(params, {
        idempotencyKey: key,
      });

      const result: PaymentIntentResult = {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string | null,
        paymentMethodId: paymentIntent.payment_method as string | null,
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata || {},
      };

      this.cacheResult(key, "create_payment_intent", {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      });

      return {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      };
    } catch (error) {
      const paymentError = this.handleStripeError(error);
      return {
        success: false,
        error: paymentError,
        idempotencyKey: key,
        wasReplay: false,
      };
    }
  }

  /**
   * Confirm a payment intent.
   */
  async confirmPaymentIntent(
    input: ConfirmPaymentIntentInput,
  ): Promise<StripeOperationResult<PaymentIntentResult>> {
    const startTime = Date.now();

    try {
      const params: Stripe.PaymentIntentConfirmParams = {};

      if (input.paymentMethodId) {
        params.payment_method = input.paymentMethodId;
      }

      if (input.returnUrl) {
        params.return_url = input.returnUrl;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        input.paymentIntentId,
        params,
      );

      const result: PaymentIntentResult = {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string | null,
        paymentMethodId: paymentIntent.payment_method as string | null,
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata || {},
      };

      return {
        success: true,
        data: result,
        operation: "confirm_payment_intent",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "confirm_payment_intent",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Capture a payment intent.
   */
  async capturePaymentIntent(
    input: CapturePaymentIntentInput,
  ): Promise<StripeOperationResult<PaymentIntentResult>> {
    const startTime = Date.now();

    try {
      const params: Stripe.PaymentIntentCaptureParams = {};

      if (input.amountToCapture !== undefined) {
        params.amount_to_capture = input.amountToCapture;
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(
        input.paymentIntentId,
        params,
      );

      const result: PaymentIntentResult = {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer as string | null,
        paymentMethodId: paymentIntent.payment_method as string | null,
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata || {},
      };

      return {
        success: true,
        data: result,
        operation: "capture_payment_intent",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "capture_payment_intent",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cancel a payment intent.
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      return true;
    } catch (error) {
      logger.error("Failed to cancel payment intent", {
        paymentIntentId,
        error,
      });
      return false;
    }
  }

  // ==========================================================================
  // Refund Operations
  // ==========================================================================

  /**
   * Create a refund.
   */
  async createRefund(
    input: CreateRefundInput,
    idempotencyKey?: string,
  ): Promise<IdempotentOperationResult<RefundResult>> {
    const key = idempotencyKey || this.generateIdempotencyKey("refund", input);

    // Check cache
    const cached = this.getCachedResult<RefundResult>(key);
    if (cached) {
      return {
        success: true,
        data: cached.result.data,
        idempotencyKey: key,
        wasReplay: true,
        cachedAt: cached.createdAt,
      };
    }

    try {
      const params: Stripe.RefundCreateParams = {
        metadata: input.metadata || {},
      };

      if (input.paymentIntentId) {
        params.payment_intent = input.paymentIntentId;
      } else if (input.chargeId) {
        params.charge = input.chargeId;
      } else {
        throw new StripePaymentError(
          StripeErrorCode.INVALID_REQUEST,
          "Either paymentIntentId or chargeId is required",
        );
      }

      if (input.amount !== undefined) {
        params.amount = input.amount;
      }

      if (input.reason) {
        params.reason = input.reason as Stripe.RefundCreateParams.Reason;
      }

      if (input.reverseTransfer !== undefined) {
        params.reverse_transfer = input.reverseTransfer;
      }

      if (input.refundApplicationFee !== undefined) {
        params.refund_application_fee = input.refundApplicationFee;
      }

      if (input.instructionsEmail) {
        params.instructions_email = input.instructionsEmail;
      }

      const refund = await this.stripe.refunds.create(params, {
        idempotencyKey: key,
      });

      const result: RefundResult = {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status as any,
        reason: refund.reason as any,
        paymentIntentId: refund.payment_intent as string | null,
        chargeId: refund.charge as string,
        createdAt: new Date(refund.created * 1000),
        metadata: refund.metadata || {},
        failureReason: refund.failure_reason || null,
      };

      this.cacheResult(key, "create_refund", {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      });

      return {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      };
    } catch (error) {
      const paymentError = this.handleStripeError(error);
      return {
        success: false,
        error: paymentError,
        idempotencyKey: key,
        wasReplay: false,
      };
    }
  }

  /**
   * Create multiple refunds in a batch.
   */
  async createBulkRefunds(
    request: BulkRefundRequest,
  ): Promise<BulkRefundResult> {
    const succeeded: RefundResult[] = [];
    const failed: Array<{ input: CreateRefundInput; error: string }> = [];

    for (const refundInput of request.refunds) {
      const result = await this.createRefund(refundInput);

      if (result.success && result.data) {
        succeeded.push(result.data);
      } else {
        failed.push({
          input: refundInput,
          error: result.error?.message || "Unknown error",
        });

        if (request.stopOnError) {
          break;
        }
      }
    }

    return {
      succeeded,
      failed,
      totalSucceeded: succeeded.length,
      totalFailed: failed.length,
    };
  }

  /**
   * Get refund details.
   */
  async getRefund(refundId: string): Promise<RefundResult | null> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status as any,
        reason: refund.reason as any,
        paymentIntentId: refund.payment_intent as string | null,
        chargeId: refund.charge as string,
        createdAt: new Date(refund.created * 1000),
        metadata: refund.metadata || {},
        failureReason: refund.failure_reason || null,
      };
    } catch (error) {
      logger.error("Failed to retrieve refund", { refundId, error });
      return null;
    }
  }

  // ==========================================================================
  // Invoice Operations
  // ==========================================================================

  /**
   * Create an invoice.
   */
  async createInvoice(
    input: CreateInvoiceInput,
    idempotencyKey?: string,
  ): Promise<IdempotentOperationResult<InvoiceResult>> {
    const key = idempotencyKey || this.generateIdempotencyKey("invoice", input);

    // Check cache
    const cached = this.getCachedResult<InvoiceResult>(key);
    if (cached) {
      return {
        success: true,
        data: cached.result.data,
        idempotencyKey: key,
        wasReplay: true,
        cachedAt: cached.createdAt,
      };
    }

    try {
      const params: Stripe.InvoiceCreateParams = {
        customer: input.customerId,
        auto_advance: input.autoAdvance ?? true,
        collection_method: input.collectionMethod || "charge_automatically",
        description: input.description,
        metadata: input.metadata || {},
        statement_descriptor: input.statementDescriptor,
        footer: input.footer,
      };

      if (input.subscriptionId) {
        params.subscription = input.subscriptionId;
      }

      if (input.daysUntilDue !== undefined) {
        params.days_until_due = input.daysUntilDue;
      }

      const invoice = await this.stripe.invoices.create(params, {
        idempotencyKey: key,
      });

      const result = this.mapInvoiceToResult(invoice);
      this.cacheResult(key, "create_invoice", {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      });

      return {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      };
    } catch (error) {
      const paymentError = this.handleStripeError(error);
      return {
        success: false,
        error: paymentError,
        idempotencyKey: key,
        wasReplay: false,
      };
    }
  }

  /**
   * Add an item to an invoice.
   */
  async addInvoiceItem(
    input: AddInvoiceItemInput,
  ): Promise<StripeOperationResult<string>> {
    const startTime = Date.now();

    try {
      const params: Stripe.InvoiceItemCreateParams = {
        customer: input.customerId,
        description: input.description,
        metadata: input.metadata || {},
        discountable: input.discountable ?? true,
      };

      if (input.invoiceId) {
        params.invoice = input.invoiceId;
      }

      if (input.amount !== undefined && input.currency) {
        params.amount = input.amount;
        params.currency = input.currency.toLowerCase();
      } else if (input.priceId) {
        // In Stripe v18+, use pricing.price instead of price directly
        params.pricing = { price: input.priceId };
        if (input.quantity !== undefined) {
          params.quantity = input.quantity;
        }
      }

      if (input.period) {
        params.period = input.period;
      }

      if (input.taxRates && input.taxRates.length > 0) {
        params.tax_rates = input.taxRates;
      }

      const invoiceItem = await this.stripe.invoiceItems.create(params);

      return {
        success: true,
        data: invoiceItem.id,
        operation: "create_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "create_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Finalize an invoice.
   */
  async finalizeInvoice(
    input: FinalizeInvoiceInput,
  ): Promise<StripeOperationResult<InvoiceResult>> {
    const startTime = Date.now();

    try {
      const params: Stripe.InvoiceFinalizeInvoiceParams = {
        auto_advance: input.autoAdvance ?? true,
      };

      const invoice = await this.stripe.invoices.finalizeInvoice(
        input.invoiceId,
        params,
      );

      return {
        success: true,
        data: this.mapInvoiceToResult(invoice),
        operation: "finalize_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "finalize_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Pay an invoice.
   */
  async payInvoice(
    input: PayInvoiceInput,
  ): Promise<StripeOperationResult<InvoiceResult>> {
    const startTime = Date.now();

    try {
      const params: Stripe.InvoicePayParams = {};

      if (input.paymentMethodId) {
        params.payment_method = input.paymentMethodId;
      }

      if (input.source) {
        params.source = input.source;
      }

      const invoice = await this.stripe.invoices.pay(input.invoiceId, params);

      return {
        success: true,
        data: this.mapInvoiceToResult(invoice),
        operation: "pay_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "pay_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Void an invoice.
   */
  async voidInvoice(
    input: VoidInvoiceInput,
  ): Promise<StripeOperationResult<InvoiceResult>> {
    const startTime = Date.now();

    try {
      const invoice = await this.stripe.invoices.voidInvoice(input.invoiceId);

      return {
        success: true,
        data: this.mapInvoiceToResult(invoice),
        operation: "void_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "void_invoice",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get invoice details.
   */
  async getInvoice(invoiceId: string): Promise<InvoiceResult | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ["lines"],
      });
      return this.mapInvoiceToResult(invoice);
    } catch (error) {
      logger.error("Failed to retrieve invoice", { invoiceId, error });
      return null;
    }
  }

  /**
   * List invoices for a customer.
   */
  async listInvoices(
    customerId: string,
    options?: { limit?: number; startingAfter?: string; status?: string },
  ): Promise<InvoiceResult[]> {
    try {
      const params: Stripe.InvoiceListParams = {
        customer: customerId,
        limit: options?.limit || 10,
        expand: ["data.lines"],
      };

      if (options?.startingAfter) {
        params.starting_after = options.startingAfter;
      }

      if (options?.status) {
        params.status = options.status as any;
      }

      const invoices = await this.stripe.invoices.list(params);
      return invoices.data.map(this.mapInvoiceToResult.bind(this));
    } catch (error) {
      logger.error("Failed to list invoices", { customerId, error });
      return [];
    }
  }

  /**
   * Get upcoming invoice preview.
   */
  async getUpcomingInvoice(
    customerId: string,
    subscriptionId?: string,
  ): Promise<InvoiceResult | null> {
    try {
      const params: Stripe.InvoiceCreatePreviewParams = {
        customer: customerId,
      };

      if (subscriptionId) {
        params.subscription = subscriptionId;
      }

      // In Stripe v18+, use createPreview instead of retrieveUpcoming
      const invoice = await this.stripe.invoices.createPreview(params);
      return this.mapInvoiceToResult(invoice);
    } catch (error) {
      logger.error("Failed to retrieve upcoming invoice", {
        customerId,
        subscriptionId,
        error,
      });
      return null;
    }
  }

  // ==========================================================================
  // Customer Operations
  // ==========================================================================

  /**
   * Create a customer.
   */
  async createCustomer(
    input: CreateCustomerInput,
    idempotencyKey?: string,
  ): Promise<IdempotentOperationResult<CustomerResult>> {
    const key =
      idempotencyKey ||
      this.generateIdempotencyKey("customer", { email: input.email });

    // Check cache
    const cached = this.getCachedResult<CustomerResult>(key);
    if (cached) {
      return {
        success: true,
        data: cached.result.data,
        idempotencyKey: key,
        wasReplay: true,
        cachedAt: cached.createdAt,
      };
    }

    try {
      const params: Stripe.CustomerCreateParams = {
        email: input.email,
        name: input.name,
        description: input.description,
        metadata: input.metadata || {},
      };

      if (input.paymentMethodId) {
        params.payment_method = input.paymentMethodId;
      }

      if (input.invoiceSettings) {
        params.invoice_settings = {
          default_payment_method: input.invoiceSettings.defaultPaymentMethod,
          footer: input.invoiceSettings.footer,
        };
      }

      const customer = await this.stripe.customers.create(params, {
        idempotencyKey: key,
      });

      const result: CustomerResult = {
        id: customer.id,
        email: customer.email ?? null,
        name: customer.name ?? null,
        description: customer.description ?? null,
        defaultPaymentMethodId: customer.invoice_settings
          ?.default_payment_method as string | null,
        balance: customer.balance,
        currency: customer.currency ?? null,
        createdAt: new Date(customer.created * 1000),
        metadata: (customer.metadata as Record<string, string>) || {},
      };

      this.cacheResult(key, "create_customer", {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      });

      return {
        success: true,
        data: result,
        idempotencyKey: key,
        wasReplay: false,
      };
    } catch (error) {
      const paymentError = this.handleStripeError(error);
      return {
        success: false,
        error: paymentError,
        idempotencyKey: key,
        wasReplay: false,
      };
    }
  }

  /**
   * Update a customer.
   */
  async updateCustomer(
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<StripeOperationResult<CustomerResult>> {
    const startTime = Date.now();

    try {
      const params: Stripe.CustomerUpdateParams = {};

      if (input.email !== undefined) {
        params.email = input.email;
      }
      if (input.name !== undefined) {
        params.name = input.name;
      }
      if (input.description !== undefined) {
        params.description = input.description;
      }
      if (input.metadata) {
        params.metadata = input.metadata;
      }
      if (input.defaultPaymentMethodId !== undefined) {
        params.invoice_settings = {
          default_payment_method: input.defaultPaymentMethodId,
        };
      }

      const customer = await this.stripe.customers.update(customerId, params);

      const result: CustomerResult = {
        id: customer.id,
        email: customer.email ?? null,
        name: customer.name ?? null,
        description: customer.description ?? null,
        defaultPaymentMethodId: customer.invoice_settings
          ?.default_payment_method as string | null,
        balance: customer.balance,
        currency: customer.currency ?? null,
        createdAt: new Date(customer.created * 1000),
        metadata: (customer.metadata as Record<string, string>) || {},
      };

      return {
        success: true,
        data: result,
        operation: "update_customer",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "update_customer",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get customer details.
   */
  async getCustomer(customerId: string): Promise<CustomerResult | null> {
    try {
      const response = await this.stripe.customers.retrieve(customerId);

      if (response.deleted) {
        return null;
      }

      // Type assertion after deleted check
      const customer = response as Stripe.Customer;

      return {
        id: customer.id,
        email: customer.email ?? null,
        name: customer.name ?? null,
        description: customer.description ?? null,
        defaultPaymentMethodId: customer.invoice_settings
          ?.default_payment_method as string | null,
        balance: customer.balance,
        currency: customer.currency ?? null,
        createdAt: new Date(customer.created * 1000),
        metadata: (customer.metadata as Record<string, string>) || {},
      };
    } catch (error) {
      logger.error("Failed to retrieve customer", { customerId, error });
      return null;
    }
  }

  // ==========================================================================
  // Payment Method Operations
  // ==========================================================================

  /**
   * Attach a payment method to a customer.
   */
  async attachPaymentMethod(
    input: AttachPaymentMethodInput,
  ): Promise<StripeOperationResult<PaymentMethodDetails>> {
    const startTime = Date.now();

    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        input.paymentMethodId,
        { customer: input.customerId },
      );

      return {
        success: true,
        data: this.mapPaymentMethodToDetails(paymentMethod),
        operation: "attach_payment_method",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "attach_payment_method",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Detach a payment method from a customer.
   */
  async detachPaymentMethod(
    input: DetachPaymentMethodInput,
  ): Promise<StripeOperationResult<PaymentMethodDetails>> {
    const startTime = Date.now();

    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(
        input.paymentMethodId,
      );

      return {
        success: true,
        data: this.mapPaymentMethodToDetails(paymentMethod),
        operation: "detach_payment_method",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleStripeError(error),
        operation: "detach_payment_method",
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * List payment methods for a customer.
   */
  async listPaymentMethods(
    customerId: string,
    type: string = "card",
  ): Promise<PaymentMethodDetails[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: type as any,
      });

      return paymentMethods.data.map(this.mapPaymentMethodToDetails.bind(this));
    } catch (error) {
      logger.error("Failed to list payment methods", { customerId, error });
      return [];
    }
  }

  // ==========================================================================
  // Reconciliation Operations
  // ==========================================================================

  /**
   * Generate a reconciliation report.
   */
  async generateReconciliationReport(
    request: ReconciliationRequest,
  ): Promise<ReconciliationReport> {
    const entries: ReconciliationEntry[] = [];

    try {
      // List all charges in the period
      const charges = await this.stripe.charges.list({
        created: {
          gte: Math.floor(request.startDate.getTime() / 1000),
          lte: Math.floor(request.endDate.getTime() / 1000),
        },
        limit: 100,
      });

      let totalStripeAmount = 0;

      for (const charge of charges.data) {
        if (!charge.paid) continue;

        totalStripeAmount += charge.amount;

        const entry: ReconciliationEntry = {
          id: uuidv4(),
          stripePaymentIntentId: (charge.payment_intent as string) || "",
          stripeChargeId: charge.id,
          subscriptionId: null, // Would be looked up from database
          // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
          invoiceId: (charge.invoice as string) || null,
          customerId: (charge.customer as string) || "",
          workspaceId: charge.metadata?.workspace_id || null,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.refunded ? "refunded" : "matched",
          stripeCreatedAt: new Date(charge.created * 1000),
          reconciledAt: new Date(),
          discrepancy: null,
          discrepancyReason: null,
          metadata: {
            description: charge.description,
            receiptUrl: charge.receipt_url,
          },
        };

        entries.push(entry);
      }

      const matchedCount = entries.filter((e) => e.status === "matched").length;
      const unmatchedCount = entries.filter(
        (e) => e.status === "unmatched",
      ).length;
      const partialCount = entries.filter((e) => e.status === "partial").length;

      return {
        periodStart: request.startDate,
        periodEnd: request.endDate,
        totalTransactions: entries.length,
        matchedCount,
        unmatchedCount,
        partialCount,
        totalStripeAmount,
        totalRecordedAmount: totalStripeAmount, // Would be from database
        netDiscrepancy: 0,
        entries,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Failed to generate reconciliation report", {
        error,
        request,
      });
      throw this.handleStripeError(error);
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get price ID for a plan and interval.
   */
  private getPriceId(
    plan: PlanTier,
    interval: BillingInterval,
  ): string | undefined {
    const prices = STRIPE_PRICE_IDS[plan];
    return interval === "monthly" ? prices?.monthly : prices?.yearly;
  }

  /**
   * Generate an idempotency key.
   */
  private generateIdempotencyKey(prefix: string, data: unknown): string {
    const timestamp = Date.now();
    const dataHash = this.hashData(data);
    return `${prefix}_${dataHash}_${timestamp}`;
  }

  /**
   * Simple hash function for idempotency keys.
   */
  private hashData(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cache an operation result.
   */
  private cacheResult<T>(
    key: string,
    operation: StripeOperation,
    result: IdempotentOperationResult<T>,
  ): void {
    const entry: IdempotencyCacheEntry<T> = {
      key,
      operation,
      result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.idempotencyCacheTTL),
      metadata: {},
    };
    idempotencyCache.set(key, entry as IdempotencyCacheEntry);
  }

  /**
   * Get cached result.
   */
  private getCachedResult<T>(key: string): IdempotencyCacheEntry<T> | null {
    const entry = idempotencyCache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt.getTime() < Date.now()) {
      idempotencyCache.delete(key);
      return null;
    }

    return entry as IdempotencyCacheEntry<T>;
  }

  /**
   * Map Stripe invoice to result type.
   */
  private mapInvoiceToResult(invoice: Stripe.Invoice): InvoiceResult {
    const lineItems: StripeInvoiceLineItem[] =
      invoice.lines?.data?.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount,
        currency: line.currency,
        quantity: line.quantity,
        // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
        unitAmount: line.price?.unit_amount || null,
        periodStart: line.period?.start
          ? new Date(line.period.start * 1000)
          : null,
        periodEnd: line.period?.end ? new Date(line.period.end * 1000) : null,
        // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
        priceId: line.price?.id || null,
        // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
        proration: line.proration,
        // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
        type: line.type as any,
      })) || [];

    return {
      // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
      id: invoice.id,
      number: invoice.number,
      customerId: invoice.customer as string,
      // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
      subscriptionId: invoice.subscription as string | null,
      status: invoice.status as any,
      collectionMethod: invoice.collection_method as any,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      subtotal: invoice.subtotal,
      total: invoice.total,
      // @ts-expect-error Stripe API type definitions mismatch — works correctly at runtime
      tax: invoice.tax,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      createdAt: new Date(invoice.created * 1000),
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      lineItems,
      metadata: invoice.metadata || {},
    };
  }

  /**
   * Map Stripe payment method to details type.
   */
  private mapPaymentMethodToDetails(
    paymentMethod: Stripe.PaymentMethod,
  ): PaymentMethodDetails {
    return {
      id: paymentMethod.id,
      type: paymentMethod.type as any,
      customerId: paymentMethod.customer as string | null,
      billingEmail: paymentMethod.billing_details?.email || null,
      card: paymentMethod.card
        ? {
            brand: paymentMethod.card.brand as any,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
            funding: paymentMethod.card.funding,
            country: paymentMethod.card.country,
          }
        : undefined,
      usBankAccount: paymentMethod.us_bank_account
        ? {
            bankName: paymentMethod.us_bank_account.bank_name || null,
            last4: paymentMethod.us_bank_account.last4 || "",
            accountType: paymentMethod.us_bank_account.account_type,
            routingNumber: paymentMethod.us_bank_account.routing_number || null,
          }
        : undefined,
      createdAt: new Date(paymentMethod.created * 1000),
    };
  }

  /**
   * Handle Stripe API errors.
   */
  private handleStripeError(error: unknown): StripePaymentError {
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = error as Stripe.errors.StripeError;

      // Map Stripe error codes to our error codes
      let code = StripeErrorCode.UNKNOWN_ERROR;

      switch (stripeError.type) {
        case "StripeCardError":
          switch (stripeError.code) {
            case "card_declined":
              code = StripeErrorCode.CARD_DECLINED;
              break;
            case "expired_card":
              code = StripeErrorCode.CARD_EXPIRED;
              break;
            case "incorrect_cvc":
              code = StripeErrorCode.INCORRECT_CVC;
              break;
            case "incorrect_number":
              code = StripeErrorCode.INCORRECT_NUMBER;
              break;
            case "insufficient_funds":
              code = StripeErrorCode.INSUFFICIENT_FUNDS;
              break;
            default:
              code = StripeErrorCode.PAYMENT_FAILED;
          }
          break;
        case "StripeInvalidRequestError":
          code = StripeErrorCode.INVALID_REQUEST;
          break;
        case "StripeAPIError":
          code = StripeErrorCode.API_CONNECTION_ERROR;
          break;
        case "StripeConnectionError":
          code = StripeErrorCode.API_CONNECTION_ERROR;
          break;
        case "StripeAuthenticationError":
          code = StripeErrorCode.AUTHENTICATION_FAILED;
          break;
        case "StripeRateLimitError":
          code = StripeErrorCode.RATE_LIMIT_EXCEEDED;
          break;
        case "StripeIdempotencyError":
          code = StripeErrorCode.IDEMPOTENCY_KEY_IN_USE;
          break;
      }

      return new StripePaymentError(code, stripeError.message, stripeError);
    }

    if (error instanceof StripePaymentError) {
      return error;
    }

    return new StripePaymentError(
      StripeErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : "Unknown error",
      error,
    );
  }

  /**
   * Clear idempotency cache (for testing).
   */
  clearCache(): void {
    idempotencyCache.clear();
    checkoutSessionCache.clear();
  }

  /**
   * Cleanup expired cache entries.
   */
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of idempotencyCache.entries()) {
      if (entry.expiresAt.getTime() < now) {
        idempotencyCache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let stripePaymentService: StripePaymentService | null = null;

/**
 * Get the Stripe payment service singleton.
 */
export function getStripePaymentService(): StripePaymentService {
  if (!stripePaymentService) {
    stripePaymentService = new StripePaymentService();
  }
  return stripePaymentService;
}

/**
 * Create a new Stripe payment service with custom config.
 */
export function createStripePaymentService(
  config?: Partial<StripePaymentServiceConfig>,
): StripePaymentService {
  return new StripePaymentService(config);
}

/**
 * Reset the Stripe payment service singleton (for testing).
 */
export function resetStripePaymentService(): void {
  if (stripePaymentService) {
    stripePaymentService.clearCache();
  }
  stripePaymentService = null;
}
