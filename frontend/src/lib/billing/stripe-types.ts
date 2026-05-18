/**
 * Stripe Payment Types
 *
 * Comprehensive type definitions for Stripe payment processing including
 * idempotent checkout, webhook handling, refunds, and invoices.
 *
 * @module @/lib/billing/stripe-types
 * @version 1.0.0
 */

import type {
  PlanTier,
  BillingInterval,
  Currency,
} from "@/types/subscription.types";

// ============================================================================
// Stripe Core Types
// ============================================================================

/**
 * Stripe API version used across the application.
 */
export const STRIPE_API_VERSION = "2025-08-27.basil" as const;

/**
 * Stripe webhook event types we handle.
 */
export type StripeWebhookEventType =
  // Checkout events
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  // Subscription events
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "customer.subscription.pending_update_applied"
  | "customer.subscription.pending_update_expired"
  | "customer.subscription.paused"
  | "customer.subscription.resumed"
  | "customer.subscription.trial_will_end"
  // Invoice events
  | "invoice.created"
  | "invoice.updated"
  | "invoice.finalized"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.payment_action_required"
  | "invoice.upcoming"
  | "invoice.marked_uncollectible"
  | "invoice.voided"
  // Payment intent events
  | "payment_intent.created"
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled"
  | "payment_intent.requires_action"
  // Charge events
  | "charge.succeeded"
  | "charge.failed"
  | "charge.refunded"
  | "charge.dispute.created"
  | "charge.dispute.closed"
  // Customer events
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  // Payment method events
  | "payment_method.attached"
  | "payment_method.detached"
  | "payment_method.updated";

// ============================================================================
// Idempotency Types
// ============================================================================

/**
 * Idempotency key structure.
 */
export interface IdempotencyKey {
  key: string;
  prefix: string;
  timestamp: number;
  hash: string;
}

/**
 * Idempotent operation result.
 */
export interface IdempotentOperationResult<T> {
  success: boolean;
  data?: T;
  error?: StripePaymentError;
  idempotencyKey: string;
  wasReplay: boolean;
  cachedAt?: Date;
}

/**
 * Idempotency cache entry.
 */
export interface IdempotencyCacheEntry<T = unknown> {
  key: string;
  operation: string;
  result: IdempotentOperationResult<T>;
  createdAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Processed webhook event.
 */
export interface ProcessedWebhookEvent {
  id: string;
  eventType: StripeWebhookEventType;
  stripeEventId: string;
  processedAt: Date;
  processingDuration: number;
  status: WebhookProcessingStatus;
  retryCount: number;
  error?: string;
  metadata: Record<string, unknown>;
}

/**
 * Webhook processing status.
 */
export type WebhookProcessingStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "skipped_duplicate"
  | "skipped_old";

/**
 * Webhook handler result.
 */
export interface WebhookHandlerResult {
  success: boolean;
  eventId: string;
  eventType: string;
  status: WebhookProcessingStatus;
  duration: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook replay protection entry.
 */
export interface WebhookReplayEntry {
  eventId: string;
  eventType: string;
  processedAt: Date;
  expiresAt: Date;
  checksum: string;
}

/**
 * Webhook handler configuration.
 */
export interface WebhookHandlerConfig {
  /**
   * TTL for processed event IDs (for replay protection).
   * Default: 24 hours
   */
  replayProtectionTTL: number;

  /**
   * Maximum event age to process (in seconds).
   * Events older than this are rejected.
   * Default: 300 seconds (5 minutes)
   */
  maxEventAge: number;

  /**
   * Maximum retries for failed webhook processing.
   * Default: 3
   */
  maxRetries: number;

  /**
   * Enable signature verification.
   * Default: true
   */
  verifySignature: boolean;

  /**
   * Webhook endpoint secret.
   */
  endpointSecret: string;
}

/**
 * Default webhook handler configuration.
 */
export const DEFAULT_WEBHOOK_CONFIG: Omit<
  WebhookHandlerConfig,
  "endpointSecret"
> = {
  replayProtectionTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxEventAge: 300, // 5 minutes
  maxRetries: 3,
  verifySignature: true,
};

// ============================================================================
// Checkout Types
// ============================================================================

/**
 * Checkout session mode.
 */
export type CheckoutMode = "payment" | "subscription" | "setup";

/**
 * Checkout session status.
 */
export type CheckoutSessionStatus = "open" | "complete" | "expired";

/**
 * Create checkout session input.
 */
export interface CreateCheckoutSessionInput {
  workspaceId: string;
  customerId?: string;
  customerEmail?: string;
  plan: PlanTier;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  mode?: CheckoutMode;
  trialDays?: number;
  promotionCode?: string;
  metadata?: Record<string, string>;
  clientReferenceId?: string;
  allowPromotionCodes?: boolean;
}

/**
 * Checkout session result.
 */
export interface CheckoutSessionResult {
  sessionId: string;
  url: string | null;
  status: CheckoutSessionStatus;
  paymentStatus: string;
  customerId: string | null;
  subscriptionId: string | null;
  amountTotal: number | null;
  currency: string | null;
  expiresAt: Date;
  metadata: Record<string, string>;
}

/**
 * Checkout completion event.
 */
export interface CheckoutCompletionEvent {
  sessionId: string;
  workspaceId: string;
  customerId: string;
  subscriptionId: string | null;
  plan: PlanTier;
  interval: BillingInterval;
  amountPaid: number;
  currency: Currency;
  paymentIntentId: string | null;
  completedAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Payment Intent Types
// ============================================================================

/**
 * Payment intent status.
 */
export type PaymentIntentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "canceled"
  | "succeeded";

/**
 * Create payment intent input.
 */
export interface CreatePaymentIntentInput {
  amount: number;
  currency: Currency;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: "automatic" | "manual";
  confirmationMethod?: "automatic" | "manual";
  setupFutureUsage?: "on_session" | "off_session";
  receiptEmail?: string;
}

/**
 * Payment intent result.
 */
export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: string;
  customerId: string | null;
  paymentMethodId: string | null;
  createdAt: Date;
  metadata: Record<string, string>;
}

/**
 * Confirm payment intent input.
 */
export interface ConfirmPaymentIntentInput {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
}

/**
 * Capture payment intent input.
 */
export interface CapturePaymentIntentInput {
  paymentIntentId: string;
  amountToCapture?: number;
}

// ============================================================================
// Refund Types
// ============================================================================

/**
 * Refund reason.
 */
export type RefundReason =
  | "duplicate"
  | "fraudulent"
  | "requested_by_customer"
  | "expired_uncaptured_charge";

/**
 * Refund status.
 */
export type RefundStatus =
  | "pending"
  | "succeeded"
  | "failed"
  | "canceled"
  | "requires_action";

/**
 * Create refund input.
 */
export interface CreateRefundInput {
  paymentIntentId?: string;
  chargeId?: string;
  amount?: number;
  reason?: RefundReason;
  metadata?: Record<string, string>;
  reverseTransfer?: boolean;
  refundApplicationFee?: boolean;
  instructionsEmail?: string;
}

/**
 * Refund result.
 */
export interface RefundResult {
  id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason | null;
  paymentIntentId: string | null;
  chargeId: string;
  createdAt: Date;
  metadata: Record<string, string>;
  failureReason: string | null;
}

/**
 * Bulk refund request.
 */
export interface BulkRefundRequest {
  refunds: CreateRefundInput[];
  stopOnError?: boolean;
}

/**
 * Bulk refund result.
 */
export interface BulkRefundResult {
  succeeded: RefundResult[];
  failed: Array<{
    input: CreateRefundInput;
    error: string;
  }>;
  totalSucceeded: number;
  totalFailed: number;
}

// ============================================================================
// Invoice Types
// ============================================================================

/**
 * Invoice status.
 */
export type StripeInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void";

/**
 * Invoice collection method.
 */
export type InvoiceCollectionMethod = "charge_automatically" | "send_invoice";

/**
 * Create invoice input.
 */
export interface CreateInvoiceInput {
  customerId: string;
  subscriptionId?: string;
  autoAdvance?: boolean;
  collectionMethod?: InvoiceCollectionMethod;
  daysUntilDue?: number;
  description?: string;
  metadata?: Record<string, string>;
  statementDescriptor?: string;
  footer?: string;
}

/**
 * Add invoice item input.
 */
export interface AddInvoiceItemInput {
  customerId: string;
  invoiceId?: string;
  amount?: number;
  currency?: Currency;
  priceId?: string;
  quantity?: number;
  description?: string;
  metadata?: Record<string, string>;
  period?: {
    start: number;
    end: number;
  };
  taxRates?: string[];
  discountable?: boolean;
}

/**
 * Invoice line item.
 */
export interface StripeInvoiceLineItem {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  quantity: number | null;
  unitAmount: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  priceId: string | null;
  proration: boolean;
  type: "invoiceitem" | "subscription";
}

/**
 * Invoice result.
 */
export interface InvoiceResult {
  id: string;
  number: string | null;
  customerId: string;
  subscriptionId: string | null;
  status: StripeInvoiceStatus;
  collectionMethod: InvoiceCollectionMethod;
  currency: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  subtotal: number;
  total: number;
  tax: number | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  lineItems: StripeInvoiceLineItem[];
  metadata: Record<string, string>;
}

/**
 * Finalize invoice input.
 */
export interface FinalizeInvoiceInput {
  invoiceId: string;
  autoAdvance?: boolean;
}

/**
 * Pay invoice input.
 */
export interface PayInvoiceInput {
  invoiceId: string;
  paymentMethodId?: string;
  source?: string;
}

/**
 * Void invoice input.
 */
export interface VoidInvoiceInput {
  invoiceId: string;
}

// ============================================================================
// Reconciliation Types
// ============================================================================

/**
 * Payment reconciliation status.
 */
export type ReconciliationStatus =
  | "matched"
  | "unmatched"
  | "partial"
  | "disputed"
  | "refunded";

/**
 * Payment reconciliation entry.
 */
export interface ReconciliationEntry {
  id: string;
  stripePaymentIntentId: string;
  stripeChargeId: string | null;
  subscriptionId: string | null;
  invoiceId: string | null;
  customerId: string;
  workspaceId: string | null;
  amount: number;
  currency: string;
  status: ReconciliationStatus;
  stripeCreatedAt: Date;
  reconciledAt: Date | null;
  discrepancy: number | null;
  discrepancyReason: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Reconciliation report.
 */
export interface ReconciliationReport {
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  partialCount: number;
  totalStripeAmount: number;
  totalRecordedAmount: number;
  netDiscrepancy: number;
  entries: ReconciliationEntry[];
  generatedAt: Date;
}

/**
 * Reconciliation request.
 */
export interface ReconciliationRequest {
  startDate: Date;
  endDate: Date;
  includeRefunds?: boolean;
  includeDisputes?: boolean;
  workspaceId?: string;
}

// ============================================================================
// Customer Types
// ============================================================================

/**
 * Create customer input.
 */
export interface CreateCustomerInput {
  email: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  invoiceSettings?: {
    defaultPaymentMethod?: string;
    footer?: string;
  };
}

/**
 * Update customer input.
 */
export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
  defaultPaymentMethodId?: string;
}

/**
 * Customer result.
 */
export interface CustomerResult {
  id: string;
  email: string | null;
  name: string | null;
  description: string | null;
  defaultPaymentMethodId: string | null;
  balance: number;
  currency: string | null;
  createdAt: Date;
  metadata: Record<string, string>;
}

// ============================================================================
// Payment Method Types
// ============================================================================

/**
 * Payment method type.
 */
export type StripePaymentMethodType =
  | "card"
  | "us_bank_account"
  | "sepa_debit"
  | "ideal"
  | "bancontact"
  | "sofort"
  | "eps"
  | "giropay"
  | "p24"
  | "acss_debit"
  | "bacs_debit"
  | "fpx"
  | "grabpay"
  | "alipay"
  | "wechat_pay"
  | "klarna"
  | "affirm"
  | "afterpay_clearpay";

/**
 * Card brand.
 */
export type CardBrand =
  | "amex"
  | "diners"
  | "discover"
  | "jcb"
  | "mastercard"
  | "unionpay"
  | "visa"
  | "unknown";

/**
 * Payment method details.
 */
export interface PaymentMethodDetails {
  id: string;
  type: StripePaymentMethodType;
  customerId: string | null;
  billingEmail: string | null;
  card?: {
    brand: CardBrand;
    last4: string;
    expMonth: number;
    expYear: number;
    funding: string | null;
    country: string | null;
  };
  usBankAccount?: {
    bankName: string | null;
    last4: string;
    accountType: string | null;
    routingNumber: string | null;
  };
  createdAt: Date;
}

/**
 * Attach payment method input.
 */
export interface AttachPaymentMethodInput {
  paymentMethodId: string;
  customerId: string;
}

/**
 * Detach payment method input.
 */
export interface DetachPaymentMethodInput {
  paymentMethodId: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Stripe error codes.
 */
export enum StripeErrorCode {
  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  API_CONNECTION_ERROR = "API_CONNECTION_ERROR",

  // Payment errors
  CARD_DECLINED = "CARD_DECLINED",
  CARD_EXPIRED = "CARD_EXPIRED",
  INCORRECT_CVC = "INCORRECT_CVC",
  INCORRECT_NUMBER = "INCORRECT_NUMBER",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_METHOD_NOT_AVAILABLE = "PAYMENT_METHOD_NOT_AVAILABLE",

  // Subscription errors
  SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",
  SUBSCRIPTION_INACTIVE = "SUBSCRIPTION_INACTIVE",
  SUBSCRIPTION_ALREADY_CANCELED = "SUBSCRIPTION_ALREADY_CANCELED",
  SUBSCRIPTION_PAST_DUE = "SUBSCRIPTION_PAST_DUE",

  // Customer errors
  CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
  CUSTOMER_TAX_ID_INVALID = "CUSTOMER_TAX_ID_INVALID",

  // Invoice errors
  INVOICE_NOT_FOUND = "INVOICE_NOT_FOUND",
  INVOICE_ALREADY_PAID = "INVOICE_ALREADY_PAID",
  INVOICE_NOT_OPEN = "INVOICE_NOT_OPEN",
  INVOICE_FINALIZATION_FAILED = "INVOICE_FINALIZATION_FAILED",

  // Refund errors
  REFUND_FAILED = "REFUND_FAILED",
  CHARGE_ALREADY_REFUNDED = "CHARGE_ALREADY_REFUNDED",
  CHARGE_NOT_FOUND = "CHARGE_NOT_FOUND",
  REFUND_AMOUNT_EXCEEDS_CHARGE = "REFUND_AMOUNT_EXCEEDS_CHARGE",

  // Webhook errors
  WEBHOOK_SIGNATURE_INVALID = "WEBHOOK_SIGNATURE_INVALID",
  WEBHOOK_EVENT_EXPIRED = "WEBHOOK_EVENT_EXPIRED",
  WEBHOOK_DUPLICATE_EVENT = "WEBHOOK_DUPLICATE_EVENT",

  // Idempotency errors
  IDEMPOTENCY_KEY_IN_USE = "IDEMPOTENCY_KEY_IN_USE",
  IDEMPOTENCY_KEY_EXPIRED = "IDEMPOTENCY_KEY_EXPIRED",

  // Configuration errors
  // sast-ignore: HARDCODED_CREDENTIAL -- these are error code enum values describing missing credentials, not actual secrets
  MISSING_API_KEY = "MISSING_API_KEY",
  // sast-ignore: HARDCODED_CREDENTIAL -- enum value name only; no actual secret stored here
  MISSING_WEBHOOK_SECRET = "MISSING_WEBHOOK_SECRET",
  PRICE_NOT_CONFIGURED = "PRICE_NOT_CONFIGURED",
}

/**
 * Stripe payment error.
 */
export class StripePaymentError extends Error {
  constructor(
    public readonly code: StripeErrorCode,
    message: string,
    public readonly stripeError?: unknown,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "StripePaymentError";
  }

  /**
   * Check if error is retryable.
   */
  isRetryable(): boolean {
    const retryableCodes: StripeErrorCode[] = [
      StripeErrorCode.RATE_LIMIT_EXCEEDED,
      StripeErrorCode.API_CONNECTION_ERROR,
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if error is due to invalid card.
   */
  isCardError(): boolean {
    const cardCodes: StripeErrorCode[] = [
      StripeErrorCode.CARD_DECLINED,
      StripeErrorCode.CARD_EXPIRED,
      StripeErrorCode.INCORRECT_CVC,
      StripeErrorCode.INCORRECT_NUMBER,
      StripeErrorCode.INSUFFICIENT_FUNDS,
    ];
    return cardCodes.includes(this.code);
  }

  /**
   * Convert to JSON for logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}

// ============================================================================
// Event Payload Types
// ============================================================================

/**
 * Checkout session completed payload.
 */
export interface CheckoutSessionCompletedPayload {
  sessionId: string;
  customerId: string;
  subscriptionId: string | null;
  paymentIntentId: string | null;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  clientReferenceId: string | null;
  metadata: Record<string, string>;
}

/**
 * Invoice paid payload.
 */
export interface InvoicePaidPayload {
  invoiceId: string;
  customerId: string;
  subscriptionId: string | null;
  amountPaid: number;
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}

/**
 * Payment failed payload.
 */
export interface PaymentFailedPayload {
  paymentIntentId: string;
  customerId: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  amount: number;
  currency: string;
  errorCode: string | null;
  errorMessage: string | null;
  failureCode: string | null;
}

/**
 * Subscription updated payload.
 */
export interface SubscriptionUpdatedPayload {
  subscriptionId: string;
  customerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  priceId: string;
  quantity: number;
  plan: PlanTier | null;
  interval: BillingInterval | null;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Stripe API operation.
 */
export type StripeOperation =
  | "create_checkout_session"
  | "create_customer"
  | "update_customer"
  | "create_subscription"
  | "update_subscription"
  | "cancel_subscription"
  | "create_payment_intent"
  | "confirm_payment_intent"
  | "capture_payment_intent"
  | "create_refund"
  | "create_invoice"
  | "finalize_invoice"
  | "pay_invoice"
  | "void_invoice"
  | "attach_payment_method"
  | "detach_payment_method";

/**
 * Stripe operation result.
 */
export interface StripeOperationResult<T> {
  success: boolean;
  data?: T;
  error?: StripePaymentError;
  operation: StripeOperation;
  duration: number;
  timestamp: Date;
  idempotencyKey?: string;
}

/**
 * Stripe operation metrics.
 */
export interface StripeOperationMetrics {
  operation: StripeOperation;
  successCount: number;
  failureCount: number;
  totalCount: number;
  averageDuration: number;
  lastExecuted: Date | null;
}

/**
 * Payment event for analytics.
 */
export interface PaymentAnalyticsEvent {
  eventType: string;
  workspaceId: string;
  customerId: string;
  subscriptionId: string | null;
  invoiceId: string | null;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}
