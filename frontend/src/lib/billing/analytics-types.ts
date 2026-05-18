/**
 * Billing Analytics Types
 *
 * Type definitions for revenue metrics, churn analytics, ARPU/LTV calculations,
 * entitlement drift detection, finance reconciliation, and report generation.
 *
 * @module @/lib/billing/analytics-types
 * @version 1.0.0
 */

import type {
  PlanTier,
  BillingInterval,
  Currency,
} from "@/types/subscription.types";
import type { SubscriptionState } from "./subscription-types";

// ============================================================================
// Time Period Types
// ============================================================================

/**
 * Granularity for analytics time series.
 */
export type AnalyticsGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/**
 * Date range for analytics queries.
 */
export interface AnalyticsDateRange {
  /** Start of date range (inclusive) */
  startDate: Date;
  /** End of date range (inclusive) */
  endDate: Date;
  /** Time granularity for aggregation */
  granularity: AnalyticsGranularity;
  /** Timezone for date boundaries */
  timezone?: string;
}

/**
 * A single time period bucket in a time series.
 */
export interface TimePeriodBucket {
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Label for display (e.g., "Jan 2026") */
  label: string;
}

// ============================================================================
// Revenue Metric Types
// ============================================================================

/**
 * Monthly Recurring Revenue (MRR) snapshot.
 * All amounts are in integer cents to avoid floating-point errors.
 */
export interface MRRSnapshot {
  /** Snapshot date */
  date: Date;
  /** Total MRR in cents */
  totalMRR: number;
  /** MRR by plan tier in cents */
  byPlan: Record<PlanTier, number>;
  /** New MRR from new subscriptions */
  newMRR: number;
  /** Expansion MRR from upgrades */
  expansionMRR: number;
  /** Contraction MRR from downgrades */
  contractionMRR: number;
  /** Churned MRR from cancellations */
  churnedMRR: number;
  /** Reactivation MRR from returning customers */
  reactivationMRR: number;
  /** Net new MRR (new + expansion + reactivation - contraction - churned) */
  netNewMRR: number;
}

/**
 * Revenue breakdown by plan tier.
 */
export interface RevenueByPlan {
  plan: PlanTier;
  /** Total revenue in cents */
  revenue: number;
  /** Number of active subscriptions */
  subscriptionCount: number;
  /** Percentage of total revenue */
  revenueShare: number;
}

/**
 * Revenue growth metrics.
 */
export interface RevenueGrowth {
  /** Current period revenue in cents */
  currentRevenue: number;
  /** Previous period revenue in cents */
  previousRevenue: number;
  /** Absolute change in cents */
  absoluteChange: number;
  /** Percentage change (0-100 scale) */
  percentageChange: number;
  /** Month-over-month growth rate */
  momGrowthRate: number;
  /** Year-over-year growth rate (null if insufficient data) */
  yoyGrowthRate: number | null;
}

/**
 * Complete revenue analytics report.
 */
export interface RevenueAnalyticsReport {
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** Current MRR snapshot */
  currentMRR: MRRSnapshot;
  /** Annualized recurring revenue in cents */
  currentARR: number;
  /** MRR time series */
  mrrTimeSeries: MRRSnapshot[];
  /** Revenue by plan breakdown */
  revenueByPlan: RevenueByPlan[];
  /** Revenue growth metrics */
  growth: RevenueGrowth;
  /** Total revenue for period in cents */
  totalRevenue: number;
  /** Currency */
  currency: Currency;
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Churn Analytics Types
// ============================================================================

/**
 * Churn rate metrics.
 */
export interface ChurnMetrics {
  /** Number of active subscriptions at start of period */
  startCount: number;
  /** Number of cancellations during period */
  canceledCount: number;
  /** Customer churn rate (percentage, 0-100) */
  customerChurnRate: number;
  /** Revenue churn rate (percentage, 0-100) */
  revenueChurnRate: number;
  /** Net revenue churn rate (after expansion, percentage) */
  netRevenueChurnRate: number;
  /** MRR churned in cents */
  churnedMRR: number;
  /** Period */
  period: TimePeriodBucket;
}

/**
 * Retention cohort data.
 */
export interface RetentionCohort {
  /** Cohort start date (month customers signed up) */
  cohortDate: Date;
  /** Cohort label */
  cohortLabel: string;
  /** Number of customers in cohort */
  cohortSize: number;
  /** Retention percentages by month [month0=100%, month1, month2, ...] */
  retentionByMonth: number[];
  /** Revenue retention percentages by month */
  revenueRetentionByMonth: number[];
}

/**
 * At-risk customer signals.
 */
export interface AtRiskSignal {
  /** Signal type */
  type: AtRiskSignalType;
  /** Signal weight (0-1, higher = more likely to churn) */
  weight: number;
  /** Description */
  description: string;
  /** Detected at */
  detectedAt: Date;
  /** Additional data */
  metadata: Record<string, unknown>;
}

/**
 * Types of at-risk signals.
 */
export type AtRiskSignalType =
  | "payment_failed"
  | "downgrade"
  | "usage_decline"
  | "support_tickets"
  | "no_login"
  | "feature_disengagement"
  | "contract_ending"
  | "competitor_mention";

/**
 * At-risk customer assessment.
 */
export interface AtRiskCustomer {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  organizationId: string;
  /** Current plan */
  plan: PlanTier;
  /** Monthly revenue in cents */
  monthlyRevenue: number;
  /** Risk score (0-100, higher = more at risk) */
  riskScore: number;
  /** Risk signals */
  signals: AtRiskSignal[];
  /** Days since last active */
  daysSinceActive: number;
  /** Customer tenure in months */
  tenureMonths: number;
  /** Assessment date */
  assessedAt: Date;
}

/**
 * Complete churn analytics report.
 */
export interface ChurnAnalyticsReport {
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** Current churn metrics */
  currentChurn: ChurnMetrics;
  /** Churn time series */
  churnTimeSeries: ChurnMetrics[];
  /** Retention cohorts */
  retentionCohorts: RetentionCohort[];
  /** At-risk customers */
  atRiskCustomers: AtRiskCustomer[];
  /** Cancellation reason breakdown */
  cancellationReasons: CancellationReasonBreakdown[];
  /** Generated at */
  generatedAt: Date;
}

/**
 * Cancellation reason breakdown.
 */
export interface CancellationReasonBreakdown {
  /** Reason */
  reason: string;
  /** Count */
  count: number;
  /** Percentage */
  percentage: number;
  /** MRR lost in cents */
  mrrLost: number;
}

// ============================================================================
// Customer / ARPU / LTV Types
// ============================================================================

/**
 * Average Revenue Per User metrics.
 */
export interface ARPUMetrics {
  /** Overall ARPU in cents */
  overallARPU: number;
  /** ARPU by plan tier in cents */
  byPlan: Record<PlanTier, number>;
  /** ARPU by billing interval in cents */
  byInterval: Record<BillingInterval, number>;
  /** ARPU trend (percentage change) */
  trend: number;
  /** Period */
  period: TimePeriodBucket;
}

/**
 * Customer Lifetime Value calculation.
 */
export interface LTVMetrics {
  /** Average LTV in cents */
  averageLTV: number;
  /** LTV by plan tier in cents */
  byPlan: Record<PlanTier, number>;
  /** Average customer lifespan in months */
  averageLifespanMonths: number;
  /** LTV:CAC ratio (if CAC is provided) */
  ltvCacRatio: number | null;
  /** Projected LTV based on current ARPU and churn */
  projectedLTV: number;
}

/**
 * Customer segment analytics.
 */
export interface CustomerSegment {
  /** Segment name */
  name: string;
  /** Segment criteria description */
  criteria: string;
  /** Number of customers */
  count: number;
  /** Percentage of total */
  percentage: number;
  /** Total revenue in cents */
  totalRevenue: number;
  /** Average revenue per customer in cents */
  averageRevenue: number;
  /** Average tenure in months */
  averageTenure: number;
  /** Churn rate */
  churnRate: number;
}

/**
 * Complete customer analytics report.
 */
export interface CustomerAnalyticsReport {
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** ARPU metrics */
  arpu: ARPUMetrics;
  /** LTV metrics */
  ltv: LTVMetrics;
  /** Customer segments */
  segments: CustomerSegment[];
  /** Total active customers */
  totalActiveCustomers: number;
  /** New customers in period */
  newCustomers: number;
  /** ARPU time series */
  arpuTimeSeries: ARPUMetrics[];
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Entitlement Drift Types
// ============================================================================

/**
 * Severity of entitlement drift.
 */
export type DriftSeverity =
  | "none"
  | "minor"
  | "moderate"
  | "severe"
  | "critical";

/**
 * Drift direction.
 */
export type DriftDirection = "over" | "under" | "none";

/**
 * Single entitlement drift entry.
 */
export interface EntitlementDriftEntry {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  organizationId: string;
  /** Current plan */
  plan: PlanTier;
  /** Resource type */
  resource: string;
  /** Current usage (integer) */
  currentUsage: number;
  /** Plan limit (null = unlimited) */
  planLimit: number | null;
  /** Drift direction */
  direction: DriftDirection;
  /** Drift amount (absolute) */
  driftAmount: number;
  /** Drift percentage (0-100 for over-usage; negative for under-usage) */
  driftPercentage: number;
  /** Severity */
  severity: DriftSeverity;
  /** Detected at */
  detectedAt: Date;
  /** Recommended action */
  recommendedAction: string;
}

/**
 * Entitlement drift alert.
 */
export interface DriftAlert {
  /** Alert ID */
  id: string;
  /** Related drift entry */
  drift: EntitlementDriftEntry;
  /** Whether alert has been acknowledged */
  acknowledged: boolean;
  /** Acknowledged by */
  acknowledgedBy: string | null;
  /** Acknowledged at */
  acknowledgedAt: Date | null;
  /** Created at */
  createdAt: Date;
}

/**
 * Complete entitlement drift report.
 */
export interface EntitlementDriftReport {
  /** Date of analysis */
  analysisDate: Date;
  /** Total workspaces analyzed */
  totalWorkspacesAnalyzed: number;
  /** Workspaces with drift */
  workspacesWithDrift: number;
  /** All drift entries */
  driftEntries: EntitlementDriftEntry[];
  /** Active alerts */
  activeAlerts: DriftAlert[];
  /** Summary by severity */
  bySeverity: Record<DriftSeverity, number>;
  /** Summary by resource */
  byResource: Record<string, number>;
  /** Estimated revenue impact in cents (from over-usage not being billed) */
  estimatedRevenueImpact: number;
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Finance Reconciliation Types
// ============================================================================

/**
 * Ledger entry source.
 */
export type LedgerSource = "stripe" | "crypto" | "internal" | "manual";

/**
 * Ledger entry for reconciliation.
 */
export interface LedgerEntry {
  /** Entry ID */
  id: string;
  /** Source system */
  source: LedgerSource;
  /** External ID (Stripe payment intent ID, crypto tx hash, etc.) */
  externalId: string;
  /** Workspace or organization ID */
  entityId: string;
  /** Amount in cents */
  amount: number;
  /** Currency */
  currency: Currency;
  /** Entry type */
  type: "payment" | "refund" | "credit" | "fee" | "adjustment";
  /** Description */
  description: string;
  /** Timestamp */
  timestamp: Date;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Reconciliation match status.
 */
export type ReconciliationMatchStatus =
  | "matched"
  | "amount_mismatch"
  | "missing_internal"
  | "missing_external"
  | "duplicate"
  | "timing_difference";

/**
 * A single reconciliation match result.
 */
export interface ReconciliationMatch {
  /** Match ID */
  id: string;
  /** External ledger entry */
  externalEntry: LedgerEntry | null;
  /** Internal ledger entry */
  internalEntry: LedgerEntry | null;
  /** Match status */
  status: ReconciliationMatchStatus;
  /** Discrepancy amount in cents (0 if matched) */
  discrepancyAmount: number;
  /** Discrepancy reason */
  discrepancyReason: string | null;
  /** Whether within tolerance */
  withinTolerance: boolean;
  /** Resolved */
  resolved: boolean;
  /** Resolution notes */
  resolutionNotes: string | null;
}

/**
 * Finance reconciliation summary.
 */
export interface ReconciliationSummary {
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** Total external entries */
  totalExternalEntries: number;
  /** Total internal entries */
  totalInternalEntries: number;
  /** Matched count */
  matchedCount: number;
  /** Mismatched count */
  mismatchedCount: number;
  /** Missing from internal count */
  missingInternalCount: number;
  /** Missing from external count */
  missingExternalCount: number;
  /** Total external amount in cents */
  totalExternalAmount: number;
  /** Total internal amount in cents */
  totalInternalAmount: number;
  /** Net discrepancy in cents */
  netDiscrepancy: number;
  /** Absolute discrepancy in cents */
  absoluteDiscrepancy: number;
  /** Reconciliation rate (0-100) */
  reconciliationRate: number;
  /** Within tolerance */
  withinTolerance: boolean;
  /** Tolerance amount in cents */
  toleranceAmount: number;
  /** All matches */
  matches: ReconciliationMatch[];
  /** Source */
  source: LedgerSource;
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Report format options.
 */
export type ReportFormat = "json" | "csv";

/**
 * Report type options.
 */
export type BillingReportType =
  | "revenue"
  | "churn"
  | "customer"
  | "entitlement_drift"
  | "reconciliation"
  | "comprehensive";

/**
 * Report request.
 */
export interface BillingReportRequest {
  /** Report type */
  type: BillingReportType;
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** Output format */
  format: ReportFormat;
  /** Filter by plan tiers */
  planFilter?: PlanTier[];
  /** Filter by subscription states */
  stateFilter?: SubscriptionState[];
  /** Include detailed entries */
  includeDetails?: boolean;
  /** Reconciliation tolerance in cents */
  reconciliationTolerance?: number;
  /** Requested by */
  requestedBy: string;
  /** Request timestamp */
  requestedAt: Date;
}

/**
 * Generated report metadata.
 */
export interface BillingReportMetadata {
  /** Report ID */
  id: string;
  /** Report type */
  type: BillingReportType;
  /** Format */
  format: ReportFormat;
  /** Date range */
  dateRange: AnalyticsDateRange;
  /** Generated at */
  generatedAt: Date;
  /** Generation duration in milliseconds */
  generationDurationMs: number;
  /** Row count (for CSV) */
  rowCount: number;
  /** File size in bytes (if applicable) */
  fileSizeBytes: number | null;
  /** Requested by */
  requestedBy: string;
}

/**
 * Generated report.
 */
export interface BillingReport {
  /** Report metadata */
  metadata: BillingReportMetadata;
  /** Report data (JSON) */
  data:
    | RevenueAnalyticsReport
    | ChurnAnalyticsReport
    | CustomerAnalyticsReport
    | EntitlementDriftReport
    | ReconciliationSummary
    | ComprehensiveReport;
  /** CSV content (if format is CSV) */
  csv: string | null;
}

/**
 * Comprehensive report combining all analytics.
 */
export interface ComprehensiveReport {
  /** Revenue analytics */
  revenue: RevenueAnalyticsReport;
  /** Churn analytics */
  churn: ChurnAnalyticsReport;
  /** Customer analytics */
  customer: CustomerAnalyticsReport;
  /** Entitlement drift */
  entitlementDrift: EntitlementDriftReport;
  /** Reconciliation */
  reconciliation: ReconciliationSummary;
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Input Data Types (for feeding analytics)
// ============================================================================

/**
 * Subscription record for analytics input.
 */
export interface AnalyticsSubscription {
  /** Subscription ID */
  id: string;
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  organizationId: string;
  /** Plan tier */
  plan: PlanTier;
  /** Billing interval */
  interval: BillingInterval;
  /** State */
  state: SubscriptionState;
  /** Monthly amount in cents */
  monthlyAmount: number;
  /** Created at */
  createdAt: Date;
  /** Canceled at (null if not canceled) */
  canceledAt: Date | null;
  /** Cancellation reason */
  cancellationReason: string | null;
  /** Last active date */
  lastActiveAt: Date;
  /** Customer acquisition cost in cents (optional) */
  cac: number | null;
}

/**
 * Payment record for analytics input.
 */
export interface AnalyticsPayment {
  /** Payment ID */
  id: string;
  /** Subscription ID */
  subscriptionId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Amount in cents */
  amount: number;
  /** Currency */
  currency: Currency;
  /** Source */
  source: LedgerSource;
  /** External reference ID */
  externalId: string;
  /** Status */
  status: "succeeded" | "failed" | "refunded" | "pending";
  /** Created at */
  createdAt: Date;
}

/**
 * Usage record for analytics input.
 */
export interface AnalyticsUsageRecord {
  /** Workspace ID */
  workspaceId: string;
  /** Organization ID */
  organizationId: string;
  /** Plan tier */
  plan: PlanTier;
  /** Resource type */
  resource: string;
  /** Current usage */
  currentUsage: number;
  /** Plan limit (null = unlimited) */
  planLimit: number | null;
  /** Recorded at */
  recordedAt: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Billing analytics error codes.
 */
export enum BillingAnalyticsErrorCode {
  INVALID_DATE_RANGE = "INVALID_DATE_RANGE",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  INVALID_REPORT_TYPE = "INVALID_REPORT_TYPE",
  GENERATION_FAILED = "GENERATION_FAILED",
  RECONCILIATION_FAILED = "RECONCILIATION_FAILED",
  EXPORT_FAILED = "EXPORT_FAILED",
  INVALID_FORMAT = "INVALID_FORMAT",
  DATA_INTEGRITY_ERROR = "DATA_INTEGRITY_ERROR",
}

/**
 * Billing analytics error.
 */
export class BillingAnalyticsError extends Error {
  constructor(
    public readonly code: BillingAnalyticsErrorCode,
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BillingAnalyticsError";
  }
}
