/**
 * Billing Management Library
 *
 * Stripe integration for subscription billing and payment processing.
 * Includes plan enforcement, crypto payments, token gating, and treasury controls.
 *
 * @module @/lib/billing
 * @version 1.0.0
 */

// Stripe Billing Service
export {
  StripeBillingService,
  getStripeBillingService,
  type PlanTransitionValidation,
  type PlanTransitionResult,
} from "./stripe-service";

// Stripe Payment Types
export {
  STRIPE_API_VERSION,
  StripePaymentError,
  StripeErrorCode,
  type StripeWebhookEventType,
  type IdempotencyKey,
  type IdempotentOperationResult,
  type IdempotencyCacheEntry,
  type ProcessedWebhookEvent,
  type WebhookProcessingStatus,
  type WebhookHandlerResult,
  type WebhookReplayEntry,
  type WebhookHandlerConfig,
  DEFAULT_WEBHOOK_CONFIG,
  type CheckoutMode,
  type CheckoutSessionStatus,
  type CreateCheckoutSessionInput,
  type CheckoutSessionResult,
  type CheckoutCompletionEvent,
  type PaymentIntentStatus,
  type CreatePaymentIntentInput,
  type PaymentIntentResult,
  type ConfirmPaymentIntentInput,
  type CapturePaymentIntentInput,
  type RefundReason,
  type RefundStatus,
  type CreateRefundInput,
  type RefundResult,
  type BulkRefundRequest,
  type BulkRefundResult,
  type StripeInvoiceStatus,
  type InvoiceCollectionMethod,
  type CreateInvoiceInput,
  type AddInvoiceItemInput,
  type StripeInvoiceLineItem,
  type InvoiceResult,
  type FinalizeInvoiceInput,
  type PayInvoiceInput,
  type VoidInvoiceInput,
  type ReconciliationStatus,
  type ReconciliationEntry,
  type ReconciliationReport,
  type ReconciliationRequest,
  type CreateCustomerInput,
  type UpdateCustomerInput,
  type CustomerResult,
  type StripePaymentMethodType,
  type CardBrand,
  type PaymentMethodDetails,
  type AttachPaymentMethodInput,
  type DetachPaymentMethodInput,
  type StripeOperation,
  type StripeOperationResult,
  type StripeOperationMetrics,
  type PaymentAnalyticsEvent,
  type CheckoutSessionCompletedPayload,
  type InvoicePaidPayload,
  type PaymentFailedPayload,
  type SubscriptionUpdatedPayload,
} from "./stripe-types";

// Webhook Handler
export {
  StripeWebhookHandler,
  getWebhookHandler,
  createWebhookHandler,
  resetWebhookHandler,
  clearProcessedEvents,
  extractPlanFromPrice,
  extractIntervalFromPrice,
  verifyWebhookSignature,
  type WebhookEventHandler,
} from "./webhook-handler";

// Plan Configuration
export {
  PLAN_LIMITS,
  PLAN_FEATURES,
  PLAN_PRICING,
  STRIPE_PRICE_IDS,
  PLANS,
  getPlanConfig,
  getAvailablePlans,
  hasFeature,
  isWithinLimit,
  getRemainingQuota,
  getUsagePercentage,
  comparePlans,
  needsUpgradeForFeature,
  calculateYearlySavings,
  formatPrice,
  getUpgradeSuggestion,
  type PlanLimits,
  type PlanPricing,
  type PlanConfig,
} from "./plan-config";

// Plan Enforcement Service
export {
  PlanEnforcementService,
  getPlanEnforcementService,
  type FeatureAccessCheck,
  type LimitCheck,
  type PlanEnforcementResult,
} from "./plan-enforcement.service";

// Crypto Payment Service
export {
  CryptoPaymentService,
  getCryptoPaymentService,
  type CryptoProvider,
  type CryptoCurrency,
  type CryptoNetwork,
  type CryptoPaymentStatus,
  type CryptoPaymentConfig,
  type CryptoPayment,
  type CreateCryptoPaymentParams,
  type CryptoPaymentResult,
  type ExchangeRate,
} from "./crypto-payment.service";

// Token Gate Service
export {
  TokenGateService,
  getTokenGateService,
  type TokenGateType,
  type TokenGateConfig,
  type TokenGateVerification,
  type AccessCheckResult,
} from "./token-gate.service";

// Usage Metered Billing Types
export {
  // Dimension types
  type UsageDimensionType,
  type UsageAggregationMethod,
  type UsageBillingModel,
  type UsageResetBehavior,
  type UsageDimensionConfig,
  type UsagePricingTier,
  type UsageDimensionPricing,

  // Usage record types
  type UsageEvent,
  type CreateUsageEventInput,
  type AggregatedUsage,
  type UsageSnapshot,
  type DimensionSnapshot,

  // Billing period types
  type BillingPeriodInfo,
  type BillingPeriodUsage,

  // Alert types
  type UsageAlertLevel,
  type UsageThresholdConfig,
  type UsageAlert,
  type AlertHistoryEntry,

  // Overage types
  type OverageStrategy,
  type OverageConfig,
  type OverageRecord,

  // Invoice types
  type UsageInvoiceLineItem,
  type UsageInvoiceSummary,

  // Reporting types
  type UsageReportRequest,
  type UsageReportResponse,
  type UsageReportDataPoint,

  // Event types
  type UsageBillingEventType,
  type UsageBillingEvent,

  // Result types
  type RecordUsageResult,
  type CheckUsageResult,
  type CalculateChargesResult,

  // Error
  UsageBillingError,
  UsageBillingErrorCode,

  // Constants
  DEFAULT_DIMENSION_CONFIGS,
  DEFAULT_THRESHOLDS,
  DEFAULT_OVERAGE_CONFIG,
  ALERT_LEVEL_THRESHOLDS,

  // Utilities
  getAlertLevel,
  formatUsageValue,
  calculateBillingPeriod,
  generateIdempotencyKey,
  validateUsageEventInput,
} from "./usage-types";

// Usage Tracker
export {
  UsageTracker,
  getUsageTracker,
  createUsageTracker,
  resetUsageTracker,
  type UsageTrackerConfig,
  DEFAULT_TRACKER_CONFIG,
  type UsageEventListener,
} from "./usage-tracker";

// Subscription Lifecycle Types
export {
  // State types
  type SubscriptionState,
  type SubscriptionStateInfo,
  SUBSCRIPTION_STATE_INFO,

  // Transition types
  type StateTransitionTrigger,
  type StateTransition,
  type StateTransitionEvent,
  type StateTransitionAuditEntry,

  // Plan change types
  type PlanChangeDirection,
  type PlanChangeTiming,
  type PlanChangeRequest,
  type PlanChangeValidation,
  type PlanChangeError,
  type PlanChangeErrorCode,
  type PlanChangeWarning,
  type UsageImpact,
  type LimitImpact,

  // Proration types
  type ProrationBehavior,
  type ProrationMethod,
  type ProrationPreview,
  type ProrationLineItem,
  type ProrationCalculationInput,

  // Pause/Resume types
  type PauseBehavior,
  type PauseDurationType,
  type PauseRequest,
  type PauseState,
  type ResumeRequest,
  type PauseLimits,
  DEFAULT_PAUSE_LIMITS,

  // Cancellation types
  type CancellationBehavior,
  type CancellationReasonCategory,
  type CancellationReasonInfo,
  CANCELLATION_REASONS,
  type CancellationAlternative,
  type CancellationRequest,
  type CancellationConfirmation,
  type CancellationFeedback,

  // Billing cycle types
  type BillingCycle,
  type BillingCycleStatus,
  type BillingAnchor,
  type BillingAnchorType,
  type RenewalInfo,
  type PendingPlanChange,

  // Subscription entity types
  type SubscriptionEntity,
  type SubscriptionSummary,

  // Error types
  SubscriptionError,
  SubscriptionErrorCode,

  // Event types
  type SubscriptionLifecycleEventType,
  type SubscriptionLifecycleEvent,

  // Utility types
  type SubscriptionOperationResult,
  type SubscriptionUpdateInput,
  type SubscriptionFilterOptions,
} from "./subscription-types";

// Subscription State Machine
export {
  SubscriptionStateMachine,
  ProrationCalculator,
  PlanChangeValidator,
  PauseValidator,
  BillingCycleCalculator,
  createStateMachine,
  createInitialSubscription,
  getSubscriptionSummary,
} from "./subscription-state-machine";

// Paywall Types
export {
  // Core types
  type PaywallType,
  type PaywallAction,
  type PaywallCheckResult,
  type PaywallContext,
  type PaywallEnforcementOptions,
  type PaywallUpgradeInfo,
  type PaywallUsageInfo,

  // Config types
  type PaywallConfig,
  type PaywallConfigBase,
  type FeaturePaywallConfig,
  type LimitPaywallConfig,
  type TierPaywallConfig,
  type RolePaywallConfig,
  type ChannelPaywallConfig,
  type TimePaywallConfig,
  type CustomPaywallConfig,

  // UI types
  type PaywallUIConfig,
  type PaywallDisplayMode,
  type PaywallPromptConfig,
  type PaywallRoutePattern,
  type PaywallRouteMap,

  // Event types
  type PaywallEventType,
  type PaywallEvent,
  type PaywallAnalytics,

  // Response types
  type PaywallErrorResponse,
  type PaywallCheckResponse,

  // Error types
  PaywallError,
  PaywallErrorCode,
  PaywallDenialCode,

  // Constants
  DEFAULT_BYPASS_ROLES,
  USAGE_WARNING_THRESHOLDS,
  DEFAULT_UI_CONFIGS,
  PLAN_TIER_NAMES,
  FEATURE_DISPLAY_NAMES,
  LIMIT_DISPLAY_NAMES,
  LIMIT_UNITS,
} from "./paywall-types";

// Paywall Utilities
export {
  // Access checks
  isFeatureAvailable,
  isWithinLimit as isWithinPaywallLimit,
  getRemainingQuota as getPaywallRemainingQuota,
  getUsagePercentage as getPaywallUsagePercentage,
  shouldShowUpgradePrompt,
  getMinimumTierForFeature,
  getNewFeaturesInTier,
  getLimitImprovements,

  // Formatting
  formatLimitValue,
  formatBytes,
  formatUsageInfo,
  formatDenialReason,
  formatUpgradeMessage,

  // Prompt builders
  buildUpgradePrompt,
  buildUsageWarningPrompt,

  // UI config
  getPaywallUIConfig,
  mergeUIConfigs,
  getPaywallBadgeText,
  getPaywallIcon,

  // Context
  createPaywallContext,
  validatePaywallContext,

  // Upgrade path
  getRecommendedUpgrade,
  getUpgradeOptions,

  // Analytics
  trackPaywallImpression,
  trackUpgradeClick,

  // Cache
  getCachedPaywallResult,
  setCachedPaywallResult,
  createPaywallCacheKey,
  clearPaywallCache,
  clearUserPaywallCache,

  // Bypass detection
  detectBypassAttempt,
  validateContextIntegrity,
} from "./paywall-utils";

// Payout & Treasury Types
export {
  // Status & method types
  type PayoutStatus,
  type PayoutMethod,
  type PayoutCurrency,

  // Policy types
  type PayoutPolicy,
  type PayoutPolicyRule,
  type PayoutPolicyRuleType,
  type PolicyEvaluationResult,
  type PolicyViolation,
  type PolicyViolationSeverity,

  // Approval types
  type ApprovalThreshold,
  type ApprovalDecision,
  type ApprovalRecord,
  type ApprovalStatus,

  // Payout request types
  type PayoutRequest,
  type PayoutStatusChange,
  type PayoutCategory,
  type CreatePayoutInput,

  // Treasury types
  type TreasuryAccount,
  type TreasuryAccountStatus,
  type TreasuryTransaction,
  type TreasuryTransactionType,
  type TreasuryReconciliationResult,
  type TreasurySnapshot,

  // Audit types
  type TreasuryAuditEventType,
  type TreasuryAuditEntry,
  type TreasuryAuditFilters,

  // Time window types
  type TimeWindowRestriction,
  type DayOfWeek,

  // State transitions
  VALID_PAYOUT_TRANSITIONS,
  TERMINAL_PAYOUT_STATES,

  // Error types
  PayoutErrorCode,
  PayoutError,

  // Constants
  DEFAULT_PAYOUT_POLICY,
  DEFAULT_BUSINESS_HOURS,
} from "./payout-types";

// Payout Policy Engine
export {
  PayoutPolicyEngine,
  ApprovalManager,
  TreasuryAuditLogger,
  createDefaultPolicy,
  isValidPayoutTransition,
  getValidPayoutTransitions,
  getPayoutPolicyEngine,
  resetPayoutPolicyEngine,
  getApprovalManager,
  resetApprovalManager,
  type PolicyEvaluationContext,
} from "./payout-policy";

// Treasury Manager
export {
  TreasuryManager,
  getTreasuryManager,
  createTreasuryManager,
  resetTreasuryManager,
} from "./treasury-manager";

// Billing Analytics Types
export {
  // Time period types
  type AnalyticsGranularity,
  type AnalyticsDateRange,
  type TimePeriodBucket,

  // Revenue types
  type MRRSnapshot,
  type RevenueByPlan,
  type RevenueGrowth,
  type RevenueAnalyticsReport,

  // Churn types
  type ChurnMetrics,
  type RetentionCohort,
  type AtRiskSignal,
  type AtRiskSignalType,
  type AtRiskCustomer,
  type ChurnAnalyticsReport,
  type CancellationReasonBreakdown,

  // Customer types
  type ARPUMetrics,
  type LTVMetrics,
  type CustomerSegment,
  type CustomerAnalyticsReport,

  // Entitlement drift types
  type DriftSeverity,
  type DriftDirection,
  type EntitlementDriftEntry,
  type DriftAlert,
  type EntitlementDriftReport,

  // Finance reconciliation types
  type LedgerSource,
  type LedgerEntry,
  type ReconciliationMatchStatus,
  type ReconciliationMatch,
  type ReconciliationSummary,

  // Report types
  type ReportFormat,
  type BillingReportType,
  type BillingReportRequest,
  type BillingReportMetadata,
  type BillingReport,
  type ComprehensiveReport,

  // Input types
  type AnalyticsSubscription,
  type AnalyticsPayment,
  type AnalyticsUsageRecord,

  // Error types
  BillingAnalyticsError,
  BillingAnalyticsErrorCode,
} from "./analytics-types";

// Revenue Analytics
export {
  generateTimePeriods,
  calculateMRRSnapshot,
  calculateMRRTimeSeries,
  calculateRevenueByPlan,
  calculateRevenueGrowth,
  calculateTotalRevenue,
  generateRevenueReport,
} from "./revenue-analytics";

// Churn Analytics
export {
  calculateChurnMetrics,
  calculateChurnTimeSeries,
  calculateRetentionCohorts,
  detectAtRiskSignals,
  calculateRiskScore,
  assessAtRiskCustomers,
  analyzeCancellationReasons,
  generateChurnReport,
  DEFAULT_SIGNAL_WEIGHTS,
} from "./churn-analytics";

// Customer Analytics
export {
  calculateARPU,
  calculateARPUTimeSeries,
  calculateAverageLifespan,
  calculateLTV,
  segmentByPlan,
  segmentByTenure,
  generateCustomerReport,
} from "./customer-analytics";

// Entitlement Drift Detection
export {
  classifyOverUsageSeverity,
  classifyUnderUsageSeverity,
  getPlanLimitForResource,
  getRecommendedAction,
  detectDrift,
  detectAllDrift,
  estimateRevenueImpact,
  generateDriftAlerts,
  resetAlertCounter,
  generateDriftReport,
  DRIFT_SEVERITY_THRESHOLDS,
  UNDER_USAGE_THRESHOLDS,
} from "./entitlement-drift";

// Finance Reconciliation
export {
  matchByExternalId,
  matchByAmountAndTime,
  calculateReconciliationSummary,
  reconcile,
  DEFAULT_TOLERANCE_CENTS,
  MAX_TIMING_DIFFERENCE_MS,
} from "./finance-reconciliation";

// Abuse Prevention Suite
export {
  // Types
  type RiskLevel,
  type EnforcementAction,
  type AbuseCategory,
  type AppealStatus,
  type AbuseSignal,
  type DeviceFingerprint,
  type SessionRecord,
  type SharingAnalysis,
  type GeographicAnomaly,
  type AntiSharingConfig,
  type SeatAssignment,
  type SeatReassignment,
  type SeatUtilizationScore,
  type SeatAbuseAnalysis,
  type DeprovisioningRecommendation,
  type SeatAbuseConfig,
  type CardMetadata,
  type PaymentEvent,
  type RefundHistory,
  type ChargebackRiskScore,
  type PaymentAbuseAnalysis,
  type PaymentHeuristicsConfig,
  type AbuseReport,
  type AbuseAppeal,
  type AbuseAuditEntry,
  type AbuseEngineConfig,
  type PlanAbuseConfig,
  type BatchScanResult,

  // Default configs
  DEFAULT_ANTI_SHARING_CONFIG,
  DEFAULT_SEAT_ABUSE_CONFIG,
  DEFAULT_PAYMENT_HEURISTICS_CONFIG,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_ENFORCEMENT_POLICY,
  DEFAULT_PLAN_ABUSE_CONFIG,
  DEFAULT_ABUSE_ENGINE_CONFIG,

  // Detectors
  AntiSharingDetector,
  SeatAbuseDetector,
  PaymentHeuristicsDetector,

  // Utilities
  haversineDistance,
  computeFingerprintHash,
  fingerprintSimilarity,

  // Engine
  AbusePreventionEngine,
  getAbusePreventionEngine,
  createAbusePreventionEngine,
  resetAbusePreventionEngine,
} from "./abuse";
