/**
 * Billing Services
 *
 * Service layer for subscription management, usage billing, and payment processing.
 *
 * @module @/services/billing
 * @version 1.0.0
 */

// Subscription Service
export {
  SubscriptionService,
  InMemorySubscriptionRepository,
  createSubscriptionService,
  getSubscriptionService,
  resetSubscriptionService,
  type SubscriptionRepository,
  type OperationActor,
  type CurrentUsage,
  type CreateSubscriptionOptions,
} from "./subscription.service";

// Stripe Payment Service
export {
  StripePaymentService,
  getStripePaymentService,
  createStripePaymentService,
  resetStripePaymentService,
  type StripePaymentServiceConfig,
} from "./stripe-payment.service";

// Payment Security Service
export {
  PaymentSecurityService,
  getPaymentSecurityService,
  createPaymentSecurityService,
  resetPaymentSecurityService,
  type PaymentSecurityAssessment,
  type PaymentSecurityServiceConfig,
} from "./payment-security.service";

// Payout Service
export {
  PayoutService,
  getPayoutService,
  createPayoutService,
  resetPayoutService,
  type CreatePayoutResult,
  type ApprovalResult,
  type ExecutePayoutResult,
  type PayoutQueryFilters,
  type PayoutServiceConfig,
} from "./payout.service";

// Billing Analytics Service
export {
  BillingAnalyticsService,
  getBillingAnalyticsService,
  createBillingAnalyticsService,
  resetBillingAnalyticsService,
  toCsv,
  type BillingAnalyticsServiceConfig,
  DEFAULT_ANALYTICS_CONFIG,
} from "./billing-analytics.service";

// Abuse Prevention Service
export {
  AbusePreventionService,
  getAbusePreventionService,
  createAbusePreventionService,
  resetAbusePreventionService,
  type AbusePreventionServiceConfig,
  DEFAULT_SERVICE_CONFIG as DEFAULT_ABUSE_SERVICE_CONFIG,
} from "./abuse-prevention.service";
