/**
 * Subscription & Billing Types for nself-chat
 *
 * Type definitions for subscription plans, billing, invoices, and payment processing.
 * Supports Stripe integration and multi-tier subscription models.
 */

// ============================================================================
// Plan Types
// ============================================================================

/**
 * Subscription plan definition.
 */
export interface Plan {
  /** Unique plan identifier */
  id: string;
  /** Plan name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Plan description */
  description: string | null;
  /** Plan tier for comparison */
  tier: PlanTier;

  // Pricing
  /** Monthly price in cents */
  priceMonthly: number;
  /** Yearly price in cents (discount) */
  priceYearly: number | null;
  /** Currency code (ISO 4217) */
  currency: Currency;

  // Limits
  /** Maximum team members */
  maxMembers: number | null;
  /** Maximum channels */
  maxChannels: number | null;
  /** Maximum storage in bytes */
  maxStorageBytes: number | null;
  /** Maximum file upload size in bytes */
  maxFileSizeBytes: number | null;

  // Features
  /** Enabled features for this plan */
  features: PlanFeatures;

  // Status
  /** Plan is available for new subscriptions */
  isActive: boolean;
  /** Plan is publicly visible */
  isPublic: boolean;
  /** Sort order for display */
  sortOrder: number;

  /** Plan creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Plan tier levels.
 */
export type PlanTier =
  | "free"
  | "starter"
  | "professional"
  | "enterprise"
  | "custom";

/**
 * Supported currencies.
 */
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

/**
 * Plan feature flags.
 */
export interface PlanFeatures {
  /** Public channels */
  publicChannels: boolean;
  /** Private channels */
  privateChannels: boolean;
  /** Direct messages */
  directMessages: boolean;
  /** Group DMs */
  groupDMs: boolean;
  /** Message threads */
  threads: boolean;
  /** File uploads */
  fileUploads: boolean;
  /** Voice messages */
  voiceMessages: boolean;
  /** Video calls */
  videoCalls: boolean;
  /** Screen sharing */
  screenSharing: boolean;
  /** Custom emoji */
  customEmoji: boolean;
  /** Webhooks */
  webhooks: boolean;
  /** Integrations */
  integrations: boolean;
  /** API access */
  apiAccess: boolean;
  /** SSO/SAML */
  sso: boolean;
  /** Audit logs */
  auditLogs: boolean;
  /** Admin dashboard */
  adminDashboard: boolean;
  /** Priority support */
  prioritySupport: boolean;
  /** Custom branding */
  customBranding: boolean;
  /** Data export */
  dataExport: boolean;
  /** Message history retention (days, -1 = unlimited) */
  messageRetentionDays: number;
  /** Search history (days, -1 = unlimited) */
  searchHistoryDays: number;
}

/**
 * Default free plan features.
 */
export const FREE_PLAN_FEATURES: PlanFeatures = {
  publicChannels: true,
  privateChannels: true,
  directMessages: true,
  groupDMs: true,
  threads: true,
  fileUploads: true,
  voiceMessages: false,
  videoCalls: false,
  screenSharing: false,
  customEmoji: false,
  webhooks: false,
  integrations: false,
  apiAccess: false,
  sso: false,
  auditLogs: false,
  adminDashboard: false,
  prioritySupport: false,
  customBranding: false,
  dataExport: false,
  messageRetentionDays: 90,
  searchHistoryDays: 90,
} as const;

/**
 * Plan display information.
 */
export interface PlanDisplay {
  /** Plan */
  plan: Plan;
  /** Formatted monthly price */
  formattedPriceMonthly: string;
  /** Formatted yearly price */
  formattedPriceYearly: string | null;
  /** Monthly price when billed yearly */
  effectiveMonthlyPrice: number | null;
  /** Savings percentage for yearly */
  yearlySavingsPercent: number | null;
  /** Highlighted features */
  highlightedFeatures: string[];
  /** Is recommended plan */
  isRecommended: boolean;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Subscription status.
 */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

/**
 * Human-readable subscription status labels.
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Trial Period",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  paused: "Paused",
} as const;

/**
 * Subscription billing interval.
 */
export type BillingInterval = "monthly" | "yearly";

/**
 * Workspace subscription.
 */
export interface Subscription {
  /** Unique subscription identifier */
  id: string;
  /** Workspace ID */
  workspaceId: string;
  /** Plan ID */
  planId: string;
  /** Associated plan details */
  plan: Plan;
  /** Current status */
  status: SubscriptionStatus;
  /** Billing interval */
  billingInterval: BillingInterval;

  // Stripe references
  /** Stripe subscription ID */
  stripeSubscriptionId: string | null;
  /** Stripe customer ID */
  stripeCustomerId: string | null;
  /** Stripe price ID */
  stripePriceId: string | null;

  // Trial
  /** Trial end timestamp */
  trialEndsAt: Date | null;
  /** Trial days remaining */
  trialDaysRemaining: number | null;

  // Billing period
  /** Current period start */
  currentPeriodStart: Date | null;
  /** Current period end */
  currentPeriodEnd: Date | null;

  // Cancellation
  /** Cancellation timestamp */
  canceledAt: Date | null;
  /** Cancel at period end (vs immediate) */
  cancelAtPeriodEnd: boolean;

  // Pause
  /** Pause start timestamp */
  pausedAt: Date | null;
  /** Resume timestamp */
  resumesAt: Date | null;

  /** Subscription creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Subscription with computed properties.
 */
export interface SubscriptionWithComputed extends Subscription {
  /** Is in trial period */
  isTrialing: boolean;
  /** Is active (including trial) */
  isActive: boolean;
  /** Is canceled */
  isCanceled: boolean;
  /** Days until renewal */
  daysUntilRenewal: number | null;
  /** Next billing amount */
  nextBillingAmount: number;
  /** Next billing date */
  nextBillingDate: Date | null;
}

// ============================================================================
// Invoice Types
// ============================================================================

/**
 * Invoice status.
 */
export type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible";

/**
 * Billing invoice.
 */
export interface Invoice {
  /** Unique invoice identifier */
  id: string;
  /** Invoice number */
  number: string;
  /** Workspace ID */
  workspaceId: string;
  /** Subscription ID */
  subscriptionId: string | null;
  /** Stripe invoice ID */
  stripeInvoiceId: string | null;

  // Amounts
  /** Subtotal in cents */
  subtotal: number;
  /** Tax amount in cents */
  tax: number;
  /** Total amount in cents */
  total: number;
  /** Amount paid in cents */
  amountPaid: number;
  /** Amount due in cents */
  amountDue: number;
  /** Currency code */
  currency: Currency;

  /** Invoice status */
  status: InvoiceStatus;

  // Dates
  /** Billing period start */
  periodStart: Date | null;
  /** Billing period end */
  periodEnd: Date | null;
  /** Due date */
  dueDate: Date | null;
  /** Payment date */
  paidAt: Date | null;

  // URLs
  /** Hosted invoice URL */
  hostedInvoiceUrl: string | null;
  /** Invoice PDF URL */
  invoicePdfUrl: string | null;

  // Line items
  /** Invoice line items */
  lineItems: InvoiceLineItem[];

  /** Invoice creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Invoice line item.
 */
export interface InvoiceLineItem {
  /** Line item ID */
  id: string;
  /** Description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit amount in cents */
  unitAmount: number;
  /** Total amount in cents */
  amount: number;
  /** Period start (for prorated items) */
  periodStart: Date | null;
  /** Period end (for prorated items) */
  periodEnd: Date | null;
}

// ============================================================================
// Payment Method Types
// ============================================================================

/**
 * Payment method type.
 */
export type PaymentMethodType =
  | "card"
  | "bank_account"
  | "ideal"
  | "sepa_debit";

/**
 * Payment method.
 */
export interface PaymentMethod {
  /** Unique identifier */
  id: string;
  /** Stripe payment method ID */
  stripePaymentMethodId: string;
  /** Payment method type */
  type: PaymentMethodType;
  /** Is default payment method */
  isDefault: boolean;

  // Card details (if type === 'card')
  /** Card brand (visa, mastercard, etc.) */
  cardBrand: string | null;
  /** Last 4 digits */
  cardLast4: string | null;
  /** Expiration month */
  cardExpMonth: number | null;
  /** Expiration year */
  cardExpYear: number | null;

  // Bank account details (if type === 'bank_account')
  /** Bank name */
  bankName: string | null;
  /** Account last 4 digits */
  bankLast4: string | null;

  /** Creation timestamp */
  createdAt: Date;
}

// ============================================================================
// Usage Types
// ============================================================================

/**
 * Subscription usage metrics.
 */
export interface SubscriptionUsage {
  /** Subscription ID */
  subscriptionId: string;
  /** Plan ID */
  planId: string;

  // Member usage
  /** Current member count */
  currentMembers: number;
  /** Maximum allowed members */
  maxMembers: number | null;
  /** Members usage percentage */
  membersUsagePercent: number | null;

  // Channel usage
  /** Current channel count */
  currentChannels: number;
  /** Maximum allowed channels */
  maxChannels: number | null;
  /** Channels usage percentage */
  channelsUsagePercent: number | null;

  // Storage usage
  /** Current storage used (bytes) */
  currentStorageBytes: number;
  /** Maximum storage allowed (bytes) */
  maxStorageBytes: number | null;
  /** Storage usage percentage */
  storageUsagePercent: number | null;

  // Message usage
  /** Messages sent this period */
  messagesThisPeriod: number;
  /** Total messages stored */
  totalMessages: number;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Usage limit warning.
 */
export interface UsageLimitWarning {
  /** Resource type */
  resource: "members" | "channels" | "storage" | "messages";
  /** Current usage */
  current: number;
  /** Limit */
  limit: number;
  /** Usage percentage */
  percentage: number;
  /** Warning level */
  level: "info" | "warning" | "critical";
  /** Warning message */
  message: string;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a subscription.
 */
export interface CreateSubscriptionInput {
  /** Workspace ID */
  workspaceId: string;
  /** Plan ID */
  planId: string;
  /** Billing interval */
  billingInterval: BillingInterval;
  /** Payment method ID */
  paymentMethodId: string;
  /** Promotion code (optional) */
  promotionCode?: string;
}

/**
 * Input for updating a subscription.
 */
export interface UpdateSubscriptionInput {
  /** New plan ID */
  planId?: string;
  /** New billing interval */
  billingInterval?: BillingInterval;
  /** New payment method ID */
  paymentMethodId?: string;
}

/**
 * Input for canceling a subscription.
 */
export interface CancelSubscriptionInput {
  /** Cancel immediately or at period end */
  immediately: boolean;
  /** Cancellation reason */
  reason?: string;
  /** Additional feedback */
  feedback?: string;
}

/**
 * Input for adding a payment method.
 */
export interface AddPaymentMethodInput {
  /** Stripe payment method ID */
  stripePaymentMethodId: string;
  /** Set as default */
  setAsDefault?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Subscription event types.
 */
export type SubscriptionEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.renewed"
  | "subscription.trial_ending"
  | "subscription.past_due"
  | "invoice.created"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "payment_method.added"
  | "payment_method.removed"
  | "usage.limit_warning";

/**
 * Subscription event.
 */
export interface SubscriptionEvent {
  /** Event type */
  type: SubscriptionEventType;
  /** Workspace ID */
  workspaceId: string;
  /** Subscription ID */
  subscriptionId?: string;
  /** Invoice ID */
  invoiceId?: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Event timestamp */
  timestamp: Date;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format price in cents to display string.
 */
export function formatPrice(cents: number, currency: Currency = "USD"): string {
  const amount = cents / 100;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  return formatter.format(amount);
}

/**
 * Calculate yearly savings percentage.
 */
export function calculateYearlySavings(
  monthlyPrice: number,
  yearlyPrice: number,
): number {
  const yearlyFromMonthly = monthlyPrice * 12;
  const savings = ((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100;
  return Math.round(savings);
}

/**
 * Check if subscription is active (including trial).
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Get days until date.
 */
export function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
