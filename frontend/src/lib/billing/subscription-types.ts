/**
 * Subscription Lifecycle Types
 *
 * Complete type definitions for subscription states, transitions, proration,
 * pause/resume, and cancellation with feedback.
 *
 * @module @/lib/billing/subscription-types
 * @version 1.0.0
 */

import type {
  PlanTier,
  BillingInterval,
  Currency,
} from "@/types/subscription.types";

// ============================================================================
// Subscription State Types
// ============================================================================

/**
 * Subscription lifecycle states.
 *
 * State flow:
 * - trial -> active (after trial ends with payment)
 * - trial -> canceled (trial expired without payment)
 * - active -> past_due (payment failed)
 * - active -> grace (approaching payment failure threshold)
 * - active -> paused (user paused)
 * - active -> canceled (user canceled)
 * - past_due -> active (payment succeeded)
 * - past_due -> canceled (payment failed final retry)
 * - grace -> active (payment succeeded)
 * - grace -> past_due (grace period ended)
 * - paused -> active (resumed)
 * - paused -> canceled (canceled while paused)
 */
export type SubscriptionState =
  | "trial"
  | "active"
  | "grace"
  | "past_due"
  | "paused"
  | "canceled";

/**
 * Subscription state metadata.
 */
export interface SubscriptionStateInfo {
  state: SubscriptionState;
  label: string;
  description: string;
  isAccessGranted: boolean;
  isPaymentRequired: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
  canPause: boolean;
  canCancel: boolean;
  canResume: boolean;
}

/**
 * State information for each subscription state.
 */
export const SUBSCRIPTION_STATE_INFO: Record<
  SubscriptionState,
  SubscriptionStateInfo
> = {
  trial: {
    state: "trial",
    label: "Trial Period",
    description: "Free trial with full access to plan features",
    isAccessGranted: true,
    isPaymentRequired: false,
    canUpgrade: true,
    canDowngrade: true,
    canPause: false,
    canCancel: true,
    canResume: false,
  },
  active: {
    state: "active",
    label: "Active",
    description: "Subscription is active with valid payment",
    isAccessGranted: true,
    isPaymentRequired: false,
    canUpgrade: true,
    canDowngrade: true,
    canPause: true,
    canCancel: true,
    canResume: false,
  },
  grace: {
    state: "grace",
    label: "Grace Period",
    description: "Payment is overdue but access is still granted",
    isAccessGranted: true,
    isPaymentRequired: true,
    canUpgrade: false,
    canDowngrade: false,
    canPause: false,
    canCancel: true,
    canResume: false,
  },
  past_due: {
    state: "past_due",
    label: "Past Due",
    description: "Payment has failed and requires immediate attention",
    isAccessGranted: false,
    isPaymentRequired: true,
    canUpgrade: false,
    canDowngrade: false,
    canPause: false,
    canCancel: true,
    canResume: false,
  },
  paused: {
    state: "paused",
    label: "Paused",
    description: "Subscription is paused and access is suspended",
    isAccessGranted: false,
    isPaymentRequired: false,
    canUpgrade: false,
    canDowngrade: false,
    canPause: false,
    canCancel: true,
    canResume: true,
  },
  canceled: {
    state: "canceled",
    label: "Canceled",
    description: "Subscription has been canceled",
    isAccessGranted: false,
    isPaymentRequired: false,
    canUpgrade: false,
    canDowngrade: false,
    canPause: false,
    canCancel: false,
    canResume: false,
  },
};

// ============================================================================
// State Transition Types
// ============================================================================

/**
 * Valid state transition triggers.
 */
export type StateTransitionTrigger =
  | "trial_started"
  | "trial_ended"
  | "trial_converted"
  | "payment_succeeded"
  | "payment_failed"
  | "payment_recovered"
  | "grace_period_started"
  | "grace_period_ended"
  | "subscription_paused"
  | "subscription_resumed"
  | "subscription_canceled"
  | "subscription_reactivated"
  | "plan_upgraded"
  | "plan_downgraded"
  | "period_renewed"
  | "admin_override";

/**
 * State transition definition.
 */
export interface StateTransition {
  from: SubscriptionState;
  to: SubscriptionState;
  trigger: StateTransitionTrigger;
  isAllowed: boolean;
  requiresPaymentMethod: boolean;
  requiresProration: boolean;
  auditRequired: boolean;
}

/**
 * State transition event.
 */
export interface StateTransitionEvent {
  id: string;
  subscriptionId: string;
  workspaceId: string;
  fromState: SubscriptionState;
  toState: SubscriptionState;
  trigger: StateTransitionTrigger;
  triggeredBy: string;
  triggeredAt: Date;
  metadata: Record<string, unknown>;
  auditLog: StateTransitionAuditEntry[];
}

/**
 * Audit entry for state transitions.
 */
export interface StateTransitionAuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  actorType: "user" | "system" | "admin" | "webhook";
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// Plan Change Types
// ============================================================================

/**
 * Plan change direction.
 */
export type PlanChangeDirection = "upgrade" | "downgrade" | "lateral";

/**
 * Plan change timing.
 */
export type PlanChangeTiming = "immediate" | "period_end" | "scheduled";

/**
 * Plan change request.
 */
export interface PlanChangeRequest {
  subscriptionId: string;
  currentPlan: PlanTier;
  newPlan: PlanTier;
  currentInterval: BillingInterval;
  newInterval?: BillingInterval;
  effectiveTiming: PlanChangeTiming;
  scheduledDate?: Date;
  prorationBehavior: ProrationBehavior;
  reason?: string;
  requestedBy: string;
  requestedAt: Date;
}

/**
 * Plan change validation result.
 */
export interface PlanChangeValidation {
  isValid: boolean;
  direction: PlanChangeDirection;
  errors: PlanChangeError[];
  warnings: PlanChangeWarning[];
  effectiveTiming: PlanChangeTiming;
  prorationPreview?: ProrationPreview;
  usageImpact?: UsageImpact;
}

/**
 * Plan change error.
 */
export interface PlanChangeError {
  code: PlanChangeErrorCode;
  message: string;
  field?: string;
  currentValue?: unknown;
  requiredValue?: unknown;
}

/**
 * Plan change error codes.
 */
export type PlanChangeErrorCode =
  | "SAME_PLAN"
  | "INVALID_PLAN"
  | "USAGE_EXCEEDS_LIMIT"
  | "PAYMENT_REQUIRED"
  | "STATE_NOT_ALLOWED"
  | "CUSTOM_PLAN_CONTACT_SALES"
  | "PENDING_CHANGE_EXISTS"
  | "INTERVAL_NOT_AVAILABLE";

/**
 * Plan change warning.
 */
export interface PlanChangeWarning {
  code: string;
  message: string;
  severity: "info" | "warning";
}

/**
 * Usage impact from plan change.
 */
export interface UsageImpact {
  membersImpact: LimitImpact;
  channelsImpact: LimitImpact;
  storageImpact: LimitImpact;
  featuresLost: string[];
  featuresGained: string[];
}

/**
 * Impact on a specific limit.
 */
export interface LimitImpact {
  currentUsage: number;
  currentLimit: number | null;
  newLimit: number | null;
  isOverLimit: boolean;
  actionRequired?: string;
}

// ============================================================================
// Proration Types
// ============================================================================

/**
 * Proration behavior options.
 */
export type ProrationBehavior =
  | "create_prorations" // Create prorated charges/credits
  | "none" // No proration
  | "always_invoice"; // Always create invoice immediately

/**
 * Proration calculation method.
 */
export type ProrationMethod =
  | "time_based" // Based on time remaining in period
  | "usage_based" // Based on usage in period
  | "flat"; // Flat amount

/**
 * Proration preview.
 */
export interface ProrationPreview {
  method: ProrationMethod;
  currency: Currency;

  // Credits for unused time on current plan
  currentPlanCredit: number;
  currentPlanDaysRemaining: number;
  currentPlanDailyRate: number;

  // Charges for new plan
  newPlanCharge: number;
  newPlanDaysRemaining: number;
  newPlanDailyRate: number;

  // Net amount
  netAmount: number;
  isCredit: boolean;

  // Timing
  effectiveDate: Date;
  nextBillingDate: Date;

  // Line items for invoice
  lineItems: ProrationLineItem[];
}

/**
 * Proration line item.
 */
export interface ProrationLineItem {
  description: string;
  amount: number;
  quantity: number;
  unitAmount: number;
  periodStart: Date;
  periodEnd: Date;
  type: "credit" | "charge";
  planTier: PlanTier;
}

/**
 * Proration calculation input.
 */
export interface ProrationCalculationInput {
  currentPlan: PlanTier;
  newPlan: PlanTier;
  currentInterval: BillingInterval;
  newInterval: BillingInterval;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  changeDate: Date;
  currentPlanPriceCents: number;
  newPlanPriceCents: number;
}

// ============================================================================
// Pause/Resume Types
// ============================================================================

/**
 * Pause behavior options.
 */
export type PauseBehavior =
  | "immediate" // Pause immediately
  | "period_end"; // Pause at end of current period

/**
 * Pause duration type.
 */
export type PauseDurationType =
  | "indefinite" // Until manually resumed
  | "fixed" // Fixed duration
  | "until_date"; // Until specific date

/**
 * Subscription pause request.
 */
export interface PauseRequest {
  subscriptionId: string;
  behavior: PauseBehavior;
  durationType: PauseDurationType;
  durationDays?: number;
  resumeDate?: Date;
  reason?: string;
  requestedBy: string;
  requestedAt: Date;
}

/**
 * Subscription pause state.
 */
export interface PauseState {
  isPaused: boolean;
  pausedAt: Date | null;
  pauseReason: string | null;
  pauseBehavior: PauseBehavior | null;
  pauseDurationType: PauseDurationType | null;
  scheduledResumeAt: Date | null;
  maxPauseDurationDays: number;
  pauseCountInPeriod: number;
  maxPausesPerPeriod: number;
}

/**
 * Resume request.
 */
export interface ResumeRequest {
  subscriptionId: string;
  resumeImmediately: boolean;
  requestedBy: string;
  requestedAt: Date;
}

/**
 * Pause limits configuration.
 */
export interface PauseLimits {
  maxPauseDurationDays: number;
  maxPausesPerYear: number;
  minDaysBetweenPauses: number;
  allowPauseInTrial: boolean;
  allowPauseInGrace: boolean;
}

/**
 * Default pause limits.
 */
export const DEFAULT_PAUSE_LIMITS: PauseLimits = {
  maxPauseDurationDays: 90,
  maxPausesPerYear: 3,
  minDaysBetweenPauses: 30,
  allowPauseInTrial: false,
  allowPauseInGrace: false,
};

// ============================================================================
// Cancellation Types
// ============================================================================

/**
 * Cancellation behavior.
 */
export type CancellationBehavior =
  | "immediate" // Cancel immediately
  | "period_end"; // Cancel at end of current period

/**
 * Cancellation reason category.
 */
export type CancellationReasonCategory =
  | "too_expensive"
  | "not_using"
  | "missing_features"
  | "found_alternative"
  | "temporary_pause"
  | "company_closed"
  | "technical_issues"
  | "support_issues"
  | "other";

/**
 * Cancellation reason details.
 */
export interface CancellationReasonInfo {
  category: CancellationReasonCategory;
  label: string;
  description: string;
  requiresFeedback: boolean;
  offerAlternative: boolean;
  alternativeOffer?: CancellationAlternative;
}

/**
 * Cancellation reason registry.
 */
export const CANCELLATION_REASONS: Record<
  CancellationReasonCategory,
  CancellationReasonInfo
> = {
  too_expensive: {
    category: "too_expensive",
    label: "Too expensive",
    description: "The subscription cost is too high for our budget",
    requiresFeedback: false,
    offerAlternative: true,
    alternativeOffer: {
      type: "downgrade",
      message: "Consider our Starter plan at a lower price point",
    },
  },
  not_using: {
    category: "not_using",
    label: "Not using it enough",
    description: "We're not getting enough value from the service",
    requiresFeedback: false,
    offerAlternative: true,
    alternativeOffer: {
      type: "pause",
      message: "Pause your subscription instead and resume when ready",
    },
  },
  missing_features: {
    category: "missing_features",
    label: "Missing features we need",
    description: "The platform lacks features we require",
    requiresFeedback: true,
    offerAlternative: false,
  },
  found_alternative: {
    category: "found_alternative",
    label: "Found an alternative",
    description: "We've switched to a different platform",
    requiresFeedback: true,
    offerAlternative: false,
  },
  temporary_pause: {
    category: "temporary_pause",
    label: "Need a temporary break",
    description: "We want to pause usage temporarily",
    requiresFeedback: false,
    offerAlternative: true,
    alternativeOffer: {
      type: "pause",
      message: "You can pause your subscription for up to 90 days",
    },
  },
  company_closed: {
    category: "company_closed",
    label: "Company closed/downsizing",
    description: "Our company is closing or reducing operations",
    requiresFeedback: false,
    offerAlternative: false,
  },
  technical_issues: {
    category: "technical_issues",
    label: "Technical issues",
    description: "Experiencing technical problems with the platform",
    requiresFeedback: true,
    offerAlternative: true,
    alternativeOffer: {
      type: "support",
      message: "Our support team can help resolve your issues",
    },
  },
  support_issues: {
    category: "support_issues",
    label: "Support issues",
    description: "Not satisfied with customer support",
    requiresFeedback: true,
    offerAlternative: true,
    alternativeOffer: {
      type: "support_escalation",
      message: "We'd like to escalate your concerns to our support manager",
    },
  },
  other: {
    category: "other",
    label: "Other reason",
    description: "Another reason not listed",
    requiresFeedback: true,
    offerAlternative: false,
  },
};

/**
 * Cancellation alternative offer.
 */
export interface CancellationAlternative {
  type: "downgrade" | "pause" | "discount" | "support" | "support_escalation";
  message: string;
  discountPercent?: number;
  discountDurationMonths?: number;
}

/**
 * Cancellation request.
 */
export interface CancellationRequest {
  subscriptionId: string;
  behavior: CancellationBehavior;
  reasonCategory: CancellationReasonCategory;
  reasonDetails?: string;
  feedback?: string;
  competitorName?: string;
  wouldRecommend: boolean | null;
  requestedBy: string;
  requestedAt: Date;
}

/**
 * Cancellation confirmation.
 */
export interface CancellationConfirmation {
  subscriptionId: string;
  cancellationDate: Date;
  effectiveDate: Date;
  behavior: CancellationBehavior;
  accessUntil: Date;
  refundAmount: number | null;
  dataRetentionDays: number;
  canReactivateBefore: Date;
}

/**
 * Cancellation feedback entry.
 */
export interface CancellationFeedback {
  id: string;
  subscriptionId: string;
  workspaceId: string;
  reasonCategory: CancellationReasonCategory;
  reasonDetails: string | null;
  feedback: string | null;
  competitorName: string | null;
  wouldRecommend: boolean | null;
  planAtCancellation: PlanTier;
  monthsAsCustomer: number;
  totalRevenue: number;
  canceledAt: Date;
  analyzedAt: Date | null;
}

// ============================================================================
// Billing Cycle Types
// ============================================================================

/**
 * Billing cycle information.
 */
export interface BillingCycle {
  id: string;
  subscriptionId: string;
  cycleNumber: number;
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  plan: PlanTier;
  interval: BillingInterval;
  amountDue: number;
  currency: Currency;
  status: BillingCycleStatus;
  invoiceId: string | null;
  paidAt: Date | null;
}

/**
 * Billing cycle status.
 */
export type BillingCycleStatus =
  | "upcoming"
  | "current"
  | "invoiced"
  | "paid"
  | "past_due"
  | "void";

/**
 * Billing anchor configuration.
 */
export interface BillingAnchor {
  type: BillingAnchorType;
  dayOfMonth?: number;
  weekday?: number;
  customDate?: Date;
}

/**
 * Billing anchor type.
 */
export type BillingAnchorType =
  | "subscription_start" // Anchor to subscription start date
  | "day_of_month" // Anchor to specific day of month
  | "first_of_month" // Anchor to 1st of month
  | "last_of_month" // Anchor to last day of month
  | "custom"; // Custom anchor date

/**
 * Renewal information.
 */
export interface RenewalInfo {
  subscriptionId: string;
  nextRenewalDate: Date;
  nextAmount: number;
  currency: Currency;
  willAutoRenew: boolean;
  renewalPlan: PlanTier;
  renewalInterval: BillingInterval;
  daysUntilRenewal: number;
  paymentMethodValid: boolean;
  pendingPlanChange?: PendingPlanChange;
}

/**
 * Pending plan change.
 */
export interface PendingPlanChange {
  id: string;
  subscriptionId: string;
  currentPlan: PlanTier;
  newPlan: PlanTier;
  currentInterval: BillingInterval;
  newInterval: BillingInterval;
  effectiveDate: Date;
  createdAt: Date;
  createdBy: string;
}

// ============================================================================
// Subscription Entity Types
// ============================================================================

/**
 * Complete subscription entity.
 */
export interface SubscriptionEntity {
  id: string;
  workspaceId: string;
  organizationId: string;

  // Plan info
  plan: PlanTier;
  interval: BillingInterval;

  // State
  state: SubscriptionState;
  stateChangedAt: Date;
  previousState: SubscriptionState | null;

  // Trial
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
  trialConvertedAt: Date | null;

  // Billing period
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingAnchor: BillingAnchor;

  // Payment
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  stripePriceId: string | null;
  lastPaymentAt: Date | null;
  lastPaymentAmount: number | null;
  lastPaymentStatus: "succeeded" | "failed" | "pending" | null;

  // Grace period
  graceStartedAt: Date | null;
  graceEndsAt: Date | null;

  // Pause state
  pauseState: PauseState;

  // Cancellation
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  cancellationReason: CancellationReasonCategory | null;
  cancellationFeedback: string | null;

  // Pending changes
  pendingPlanChange: PendingPlanChange | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  stateHistory: StateTransitionEvent[];
}

/**
 * Subscription summary for display.
 */
export interface SubscriptionSummary {
  id: string;
  plan: PlanTier;
  planName: string;
  interval: BillingInterval;
  state: SubscriptionState;
  stateInfo: SubscriptionStateInfo;

  // Access
  hasAccess: boolean;
  accessExpiresAt: Date | null;

  // Trial
  isInTrial: boolean;
  trialDaysRemaining: number | null;

  // Billing
  nextBillingDate: Date | null;
  nextBillingAmount: number | null;
  currency: Currency;

  // Warnings
  isPastDue: boolean;
  isGracePeriod: boolean;
  isPaused: boolean;
  isCanceling: boolean;

  // Actions available
  canUpgrade: boolean;
  canDowngrade: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Subscription error codes.
 */
export enum SubscriptionErrorCode {
  // State errors
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  STATE_ALREADY_SET = "STATE_ALREADY_SET",
  SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",

  // Plan change errors
  INVALID_PLAN_CHANGE = "INVALID_PLAN_CHANGE",
  USAGE_EXCEEDS_LIMIT = "USAGE_EXCEEDS_LIMIT",
  PENDING_CHANGE_EXISTS = "PENDING_CHANGE_EXISTS",

  // Payment errors
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_METHOD_REQUIRED = "PAYMENT_METHOD_REQUIRED",

  // Pause errors
  PAUSE_NOT_ALLOWED = "PAUSE_NOT_ALLOWED",
  ALREADY_PAUSED = "ALREADY_PAUSED",
  MAX_PAUSES_EXCEEDED = "MAX_PAUSES_EXCEEDED",
  PAUSE_TOO_SOON = "PAUSE_TOO_SOON",
  NOT_PAUSED = "NOT_PAUSED",

  // Cancellation errors
  ALREADY_CANCELED = "ALREADY_CANCELED",
  CANCELLATION_NOT_ALLOWED = "CANCELLATION_NOT_ALLOWED",

  // General errors
  INVALID_REQUEST = "INVALID_REQUEST",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Subscription error.
 */
export class SubscriptionError extends Error {
  constructor(
    public readonly code: SubscriptionErrorCode,
    message: string,
    public readonly subscriptionId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SubscriptionError";
  }
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Subscription event types.
 */
export type SubscriptionLifecycleEventType =
  | "subscription.created"
  | "subscription.trial_started"
  | "subscription.trial_ending"
  | "subscription.trial_ended"
  | "subscription.trial_converted"
  | "subscription.activated"
  | "subscription.renewed"
  | "subscription.plan_changed"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "subscription.interval_changed"
  | "subscription.grace_started"
  | "subscription.grace_ending"
  | "subscription.grace_ended"
  | "subscription.past_due"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.pause_ending"
  | "subscription.cancellation_scheduled"
  | "subscription.canceled"
  | "subscription.reactivated"
  | "subscription.payment_succeeded"
  | "subscription.payment_failed"
  | "subscription.proration_created";

/**
 * Subscription lifecycle event.
 */
export interface SubscriptionLifecycleEvent {
  id: string;
  type: SubscriptionLifecycleEventType;
  subscriptionId: string;
  workspaceId: string;
  organizationId: string;
  timestamp: Date;
  actor: {
    type: "user" | "system" | "admin" | "webhook";
    id: string;
    email?: string;
  };
  data: Record<string, unknown>;
  previousState?: SubscriptionState;
  newState?: SubscriptionState;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Subscription operation result.
 */
export interface SubscriptionOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: SubscriptionError;
  events: SubscriptionLifecycleEvent[];
  auditEntries: StateTransitionAuditEntry[];
}

/**
 * Subscription update input.
 */
export interface SubscriptionUpdateInput {
  plan?: PlanTier;
  interval?: BillingInterval;
  state?: SubscriptionState;
  stateChangedAt?: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
  pauseState?: Partial<PauseState>;
  metadata?: Record<string, unknown>;
}

/**
 * Subscription filter options.
 */
export interface SubscriptionFilterOptions {
  states?: SubscriptionState[];
  plans?: PlanTier[];
  intervals?: BillingInterval[];
  workspaceId?: string;
  organizationId?: string;
  trialEndingBefore?: Date;
  renewingBefore?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}
