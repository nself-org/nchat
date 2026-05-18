/**
 * Usage-Metered Billing Types
 *
 * Type definitions for metered pricing dimensions, usage tracking,
 * alerts, thresholds, and billing period calculations.
 *
 * @module @/lib/billing/usage-types
 * @version 1.0.0
 */

import type { PlanTier, Currency } from "@/types/subscription.types";

// ============================================================================
// Metered Dimension Types
// ============================================================================

/**
 * Types of metered usage dimensions.
 */
export type UsageDimensionType =
  | "storage" // Storage in bytes
  | "seats" // Active seats/users
  | "api_calls" // API requests
  | "bandwidth" // Data transfer in bytes
  | "messages" // Messages sent
  | "file_uploads" // Files uploaded
  | "video_minutes" // Video call minutes
  | "compute_units"; // Generic compute units

/**
 * Aggregation method for usage metrics.
 */
export type UsageAggregationMethod =
  | "sum" // Sum all values (API calls, messages)
  | "max" // Maximum value in period (peak users)
  | "average" // Average over period
  | "last" // Last recorded value (storage)
  | "count"; // Count of events

/**
 * Billing model for a usage dimension.
 */
export type UsageBillingModel =
  | "flat" // Fixed price per unit
  | "tiered" // Different rates at different levels
  | "graduated" // Each tier applies only to units within that tier
  | "volume" // All units priced based on total volume
  | "package"; // Price for bundles of units

/**
 * Reset behavior for usage counters.
 */
export type UsageResetBehavior =
  | "billing_period" // Reset at end of each billing period
  | "calendar_month" // Reset on first of each month
  | "never" // Never reset (cumulative)
  | "custom"; // Custom reset schedule

// ============================================================================
// Metered Dimension Configuration
// ============================================================================

/**
 * Configuration for a metered usage dimension.
 */
export interface UsageDimensionConfig {
  /** Unique dimension key */
  key: UsageDimensionType;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Unit label (e.g., 'GB', 'seats', 'calls') */
  unit: string;
  /** Unit divisor for display (e.g., 1GB = 1024^3 bytes) */
  unitDivisor: number;
  /** Aggregation method */
  aggregationMethod: UsageAggregationMethod;
  /** Billing model */
  billingModel: UsageBillingModel;
  /** Reset behavior */
  resetBehavior: UsageResetBehavior;
  /** Whether dimension is enabled */
  enabled: boolean;
  /** Stripe meter ID (if using Stripe meters) */
  stripeMeterName?: string;
  /** Stripe meter event name */
  stripeMeterEventName?: string;
  /** Minimum billable amount */
  minimumBillableAmount?: number;
  /** Free tier allowance (before billing) */
  freeTierAllowance?: number;
}

/**
 * Pricing tier for tiered/graduated billing.
 */
export interface UsagePricingTier {
  /** Start of tier (inclusive) */
  upTo: number | null; // null means unlimited
  /** Price per unit in cents */
  pricePerUnit: number;
  /** Flat fee for this tier (for tiered billing) */
  flatFee?: number;
}

/**
 * Complete pricing configuration for a dimension.
 */
export interface UsageDimensionPricing {
  /** Dimension key */
  dimensionKey: UsageDimensionType;
  /** Currency */
  currency: Currency;
  /** Base price per unit in cents */
  basePricePerUnit: number;
  /** Pricing tiers (if tiered/graduated/volume) */
  tiers?: UsagePricingTier[];
  /** Package size (if package billing) */
  packageSize?: number;
  /** Package price in cents */
  packagePrice?: number;
  /** Plan-specific pricing overrides */
  planOverrides?: Partial<Record<PlanTier, number>>;
}

// ============================================================================
// Usage Record Types
// ============================================================================

/**
 * Single usage event record.
 */
export interface UsageEvent {
  /** Unique event ID */
  id: string;
  /** Organization/tenant ID */
  organizationId: string;
  /** Workspace ID (optional) */
  workspaceId?: string;
  /** User ID (optional, for per-user tracking) */
  userId?: string;
  /** Usage dimension */
  dimension: UsageDimensionType;
  /** Quantity (positive for increment, negative for decrement) */
  quantity: number;
  /** Event timestamp */
  timestamp: Date;
  /** Idempotency key (prevents duplicate processing) */
  idempotencyKey: string;
  /** Event metadata */
  metadata?: Record<string, unknown>;
  /** Whether event has been processed for billing */
  processed: boolean;
  /** Processing timestamp */
  processedAt?: Date;
  /** Stripe meter event ID (if synced) */
  stripeMeterEventId?: string;
}

/**
 * Input for creating a usage event.
 */
export interface CreateUsageEventInput {
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  dimension: UsageDimensionType;
  quantity: number;
  timestamp?: Date;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated usage for a period.
 */
export interface AggregatedUsage {
  /** Dimension key */
  dimension: UsageDimensionType;
  /** Organization ID */
  organizationId: string;
  /** Billing period ID */
  billingPeriodId: string;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Total usage (based on aggregation method) */
  totalUsage: number;
  /** Number of events */
  eventCount: number;
  /** Peak usage (max during period) */
  peakUsage: number;
  /** Average usage */
  averageUsage: number;
  /** Billable usage (after free tier) */
  billableUsage: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Current usage snapshot.
 */
export interface UsageSnapshot {
  /** Organization ID */
  organizationId: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Usage by dimension */
  dimensions: Record<UsageDimensionType, DimensionSnapshot>;
  /** Current billing period */
  billingPeriod: BillingPeriodInfo;
}

/**
 * Snapshot for a single dimension.
 */
export interface DimensionSnapshot {
  /** Dimension key */
  dimension: UsageDimensionType;
  /** Current usage value */
  currentUsage: number;
  /** Plan limit (null = unlimited) */
  limit: number | null;
  /** Free tier allowance */
  freeTierAllowance: number;
  /** Billable usage */
  billableUsage: number;
  /** Usage percentage (null if unlimited) */
  usagePercentage: number | null;
  /** Remaining quota (null if unlimited) */
  remainingQuota: number | null;
  /** Alert status */
  alertStatus: UsageAlertLevel;
  /** Projected usage at period end */
  projectedUsage: number | null;
  /** Projected overage */
  projectedOverage: number | null;
}

// ============================================================================
// Billing Period Types
// ============================================================================

/**
 * Billing period information.
 */
export interface BillingPeriodInfo {
  /** Period ID */
  id: string;
  /** Period start */
  startDate: Date;
  /** Period end */
  endDate: Date;
  /** Days in period */
  daysInPeriod: number;
  /** Days elapsed */
  daysElapsed: number;
  /** Days remaining */
  daysRemaining: number;
  /** Period progress percentage */
  progressPercentage: number;
  /** Billing interval */
  interval: "monthly" | "yearly";
  /** Is current period */
  isCurrent: boolean;
}

/**
 * Billing period usage summary.
 */
export interface BillingPeriodUsage {
  /** Period info */
  period: BillingPeriodInfo;
  /** Usage by dimension */
  usage: Record<UsageDimensionType, AggregatedUsage>;
  /** Total estimated charges in cents */
  estimatedCharges: number;
  /** Charges by dimension in cents */
  chargesByDimension: Record<UsageDimensionType, number>;
  /** Overages by dimension */
  overages: Record<UsageDimensionType, number>;
  /** Whether any overages exist */
  hasOverages: boolean;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Alert severity levels.
 */
export type UsageAlertLevel =
  | "normal"
  | "info"
  | "warning"
  | "critical"
  | "exceeded";

/**
 * Threshold configuration for alerts.
 */
export interface UsageThresholdConfig {
  /** Dimension key */
  dimension: UsageDimensionType;
  /** Info threshold (percentage) */
  infoThreshold: number;
  /** Warning threshold (percentage) */
  warningThreshold: number;
  /** Critical threshold (percentage) */
  criticalThreshold: number;
  /** Enable email notifications */
  emailNotifications: boolean;
  /** Enable in-app notifications */
  inAppNotifications: boolean;
  /** Enable webhook notifications */
  webhookNotifications: boolean;
  /** Custom webhook URL */
  webhookUrl?: string;
}

/**
 * Default threshold configuration.
 */
export const DEFAULT_THRESHOLDS: Omit<UsageThresholdConfig, "dimension"> = {
  infoThreshold: 50,
  warningThreshold: 75,
  criticalThreshold: 90,
  emailNotifications: true,
  inAppNotifications: true,
  webhookNotifications: false,
};

/**
 * Usage alert.
 */
export interface UsageAlert {
  /** Alert ID */
  id: string;
  /** Organization ID */
  organizationId: string;
  /** Dimension */
  dimension: UsageDimensionType;
  /** Alert level */
  level: UsageAlertLevel;
  /** Current usage */
  currentUsage: number;
  /** Limit */
  limit: number;
  /** Usage percentage */
  percentage: number;
  /** Alert message */
  message: string;
  /** Created timestamp */
  createdAt: Date;
  /** Acknowledged timestamp */
  acknowledgedAt?: Date;
  /** Acknowledged by user ID */
  acknowledgedBy?: string;
  /** Whether alert is active */
  isActive: boolean;
  /** Notification status */
  notifications: {
    emailSent: boolean;
    inAppSent: boolean;
    webhookSent: boolean;
  };
}

/**
 * Alert history entry.
 */
export interface AlertHistoryEntry {
  /** Alert */
  alert: UsageAlert;
  /** Previous level */
  previousLevel?: UsageAlertLevel;
  /** Transition timestamp */
  transitionAt: Date;
  /** Trigger reason */
  reason:
    | "threshold_crossed"
    | "usage_decreased"
    | "limit_changed"
    | "period_reset";
}

// ============================================================================
// Overage Types
// ============================================================================

/**
 * Overage handling strategy.
 */
export type OverageStrategy =
  | "block" // Block usage when limit reached
  | "charge" // Allow and charge for overage
  | "warn" // Allow with warning only
  | "soft_block"; // Block after grace period

/**
 * Overage configuration per dimension.
 */
export interface OverageConfig {
  /** Dimension key */
  dimension: UsageDimensionType;
  /** Overage strategy */
  strategy: OverageStrategy;
  /** Grace period in hours (for soft_block) */
  gracePeriodHours?: number;
  /** Overage rate multiplier (e.g., 1.5 = 150% of base rate) */
  overageRateMultiplier: number;
  /** Maximum overage allowed (null = unlimited) */
  maxOverage: number | null;
  /** Hard cap (blocks even if strategy is charge) */
  hardCap?: number;
}

/**
 * Overage record.
 */
export interface OverageRecord {
  /** Record ID */
  id: string;
  /** Organization ID */
  organizationId: string;
  /** Billing period ID */
  billingPeriodId: string;
  /** Dimension */
  dimension: UsageDimensionType;
  /** Overage amount */
  overageAmount: number;
  /** Overage charges in cents */
  overageCharges: number;
  /** Rate applied per unit */
  rateApplied: number;
  /** Created timestamp */
  createdAt: Date;
  /** Whether invoiced */
  invoiced: boolean;
  /** Invoice ID */
  invoiceId?: string;
}

// ============================================================================
// Invoice Line Item Types
// ============================================================================

/**
 * Usage invoice line item.
 */
export interface UsageInvoiceLineItem {
  /** Line item ID */
  id: string;
  /** Dimension */
  dimension: UsageDimensionType;
  /** Description */
  description: string;
  /** Usage quantity */
  quantity: number;
  /** Unit */
  unit: string;
  /** Price per unit in cents */
  unitPrice: number;
  /** Total amount in cents */
  amount: number;
  /** Is overage */
  isOverage: boolean;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Tier breakdown (if tiered pricing) */
  tierBreakdown?: Array<{
    tier: number;
    quantity: number;
    pricePerUnit: number;
    amount: number;
  }>;
}

/**
 * Usage invoice summary.
 */
export interface UsageInvoiceSummary {
  /** Organization ID */
  organizationId: string;
  /** Billing period */
  billingPeriod: BillingPeriodInfo;
  /** Base subscription amount in cents */
  baseSubscriptionAmount: number;
  /** Total usage amount in cents */
  totalUsageAmount: number;
  /** Total overage amount in cents */
  totalOverageAmount: number;
  /** Credits applied in cents */
  creditsApplied: number;
  /** Grand total in cents */
  grandTotal: number;
  /** Line items */
  lineItems: UsageInvoiceLineItem[];
  /** Currency */
  currency: Currency;
}

// ============================================================================
// Reporting Types
// ============================================================================

/**
 * Usage report request.
 */
export interface UsageReportRequest {
  /** Organization ID */
  organizationId: string;
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Dimensions to include (all if not specified) */
  dimensions?: UsageDimensionType[];
  /** Group by interval */
  groupBy?: "hour" | "day" | "week" | "month";
  /** Include projections */
  includeProjections?: boolean;
  /** Include comparisons to previous period */
  includePreviousPeriod?: boolean;
}

/**
 * Usage report data point.
 */
export interface UsageReportDataPoint {
  /** Timestamp */
  timestamp: Date;
  /** Value */
  value: number;
  /** Cumulative value */
  cumulativeValue: number;
  /** Period comparison (percentage change) */
  periodComparison?: number;
}

/**
 * Usage report response.
 */
export interface UsageReportResponse {
  /** Request parameters */
  request: UsageReportRequest;
  /** Generated timestamp */
  generatedAt: Date;
  /** Data by dimension */
  data: Record<UsageDimensionType, UsageReportDataPoint[]>;
  /** Summary statistics */
  summary: {
    totalUsage: Record<UsageDimensionType, number>;
    peakUsage: Record<UsageDimensionType, number>;
    averageUsage: Record<UsageDimensionType, number>;
    projectedMonthEnd: Record<UsageDimensionType, number>;
  };
  /** Cost breakdown */
  costs: {
    actual: Record<UsageDimensionType, number>;
    projected: Record<UsageDimensionType, number>;
  };
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Usage billing event types.
 */
export type UsageBillingEventType =
  | "usage.recorded"
  | "usage.aggregated"
  | "usage.threshold_warning"
  | "usage.threshold_critical"
  | "usage.limit_exceeded"
  | "usage.overage_started"
  | "usage.overage_charged"
  | "usage.period_reset"
  | "usage.invoice_generated"
  | "usage.sync_completed"
  | "usage.sync_failed";

/**
 * Usage billing event.
 */
export interface UsageBillingEvent {
  /** Event type */
  type: UsageBillingEventType;
  /** Organization ID */
  organizationId: string;
  /** Dimension (if applicable) */
  dimension?: UsageDimensionType;
  /** Event data */
  data: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Event ID */
  eventId: string;
}

// ============================================================================
// Service Response Types
// ============================================================================

/**
 * Result of recording usage.
 */
export interface RecordUsageResult {
  /** Success */
  success: boolean;
  /** Event ID */
  eventId?: string;
  /** Error message */
  error?: string;
  /** Current usage after recording */
  currentUsage?: number;
  /** Alert triggered */
  alertTriggered?: UsageAlert;
  /** Whether limit was exceeded */
  limitExceeded?: boolean;
  /** Overage amount (if applicable) */
  overageAmount?: number;
}

/**
 * Result of checking usage.
 */
export interface CheckUsageResult {
  /** Within limit */
  withinLimit: boolean;
  /** Current usage */
  currentUsage: number;
  /** Limit */
  limit: number | null;
  /** Remaining quota */
  remaining: number | null;
  /** Usage percentage */
  percentage: number | null;
  /** Alert level */
  alertLevel: UsageAlertLevel;
  /** Action required */
  action: "allow" | "warn" | "block";
  /** Reason for action */
  reason?: string;
  /** Upgrade suggestion */
  upgradeRequired?: PlanTier;
}

/**
 * Result of calculating charges.
 */
export interface CalculateChargesResult {
  /** Total charges in cents */
  totalCharges: number;
  /** Breakdown by dimension */
  breakdown: Record<
    UsageDimensionType,
    {
      usage: number;
      charges: number;
      overageCharges: number;
      tierBreakdown?: Array<{
        tier: number;
        quantity: number;
        rate: number;
        amount: number;
      }>;
    }
  >;
  /** Currency */
  currency: Currency;
  /** Period */
  period: BillingPeriodInfo;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default dimension configurations.
 */
export const DEFAULT_DIMENSION_CONFIGS: Record<
  UsageDimensionType,
  UsageDimensionConfig
> = {
  storage: {
    key: "storage",
    name: "Storage",
    description: "File storage usage",
    unit: "GB",
    unitDivisor: 1024 * 1024 * 1024,
    aggregationMethod: "last",
    billingModel: "tiered",
    resetBehavior: "never",
    enabled: true,
    stripeMeterName: "storage_gb",
    stripeMeterEventName: "storage_usage",
  },
  seats: {
    key: "seats",
    name: "Active Seats",
    description: "Active team member seats",
    unit: "seats",
    unitDivisor: 1,
    aggregationMethod: "max",
    billingModel: "flat",
    resetBehavior: "billing_period",
    enabled: true,
    stripeMeterName: "active_seats",
    stripeMeterEventName: "seat_usage",
  },
  api_calls: {
    key: "api_calls",
    name: "API Calls",
    description: "API request count",
    unit: "calls",
    unitDivisor: 1,
    aggregationMethod: "sum",
    billingModel: "graduated",
    resetBehavior: "billing_period",
    enabled: true,
    stripeMeterName: "api_calls",
    stripeMeterEventName: "api_call",
    freeTierAllowance: 1000,
  },
  bandwidth: {
    key: "bandwidth",
    name: "Bandwidth",
    description: "Data transfer usage",
    unit: "GB",
    unitDivisor: 1024 * 1024 * 1024,
    aggregationMethod: "sum",
    billingModel: "tiered",
    resetBehavior: "billing_period",
    enabled: true,
    stripeMeterName: "bandwidth_gb",
    stripeMeterEventName: "bandwidth_usage",
  },
  messages: {
    key: "messages",
    name: "Messages",
    description: "Messages sent",
    unit: "messages",
    unitDivisor: 1,
    aggregationMethod: "sum",
    billingModel: "package",
    resetBehavior: "billing_period",
    enabled: true,
    freeTierAllowance: 10000,
  },
  file_uploads: {
    key: "file_uploads",
    name: "File Uploads",
    description: "Files uploaded",
    unit: "files",
    unitDivisor: 1,
    aggregationMethod: "sum",
    billingModel: "flat",
    resetBehavior: "billing_period",
    enabled: true,
  },
  video_minutes: {
    key: "video_minutes",
    name: "Video Minutes",
    description: "Video call duration",
    unit: "minutes",
    unitDivisor: 1,
    aggregationMethod: "sum",
    billingModel: "tiered",
    resetBehavior: "billing_period",
    enabled: true,
    stripeMeterName: "video_minutes",
    stripeMeterEventName: "video_usage",
    freeTierAllowance: 60,
  },
  compute_units: {
    key: "compute_units",
    name: "Compute Units",
    description: "AI and processing usage",
    unit: "units",
    unitDivisor: 1,
    aggregationMethod: "sum",
    billingModel: "graduated",
    resetBehavior: "billing_period",
    enabled: true,
  },
};

/**
 * Alert level thresholds (percentages).
 */
export const ALERT_LEVEL_THRESHOLDS = {
  normal: 0,
  info: 50,
  warning: 75,
  critical: 90,
  exceeded: 100,
} as const;

/**
 * Default overage configuration.
 */
export const DEFAULT_OVERAGE_CONFIG: Omit<OverageConfig, "dimension"> = {
  strategy: "charge",
  overageRateMultiplier: 1.5,
  maxOverage: null,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Usage billing error codes.
 */
export enum UsageBillingErrorCode {
  INVALID_DIMENSION = "INVALID_DIMENSION",
  INVALID_QUANTITY = "INVALID_QUANTITY",
  DUPLICATE_EVENT = "DUPLICATE_EVENT",
  LIMIT_EXCEEDED = "LIMIT_EXCEEDED",
  OVERAGE_BLOCKED = "OVERAGE_BLOCKED",
  BILLING_SYNC_FAILED = "BILLING_SYNC_FAILED",
  PERIOD_NOT_FOUND = "PERIOD_NOT_FOUND",
  AGGREGATION_ERROR = "AGGREGATION_ERROR",
  CALCULATION_ERROR = "CALCULATION_ERROR",
  STRIPE_SYNC_ERROR = "STRIPE_SYNC_ERROR",
  INVALID_PERIOD = "INVALID_PERIOD",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Usage billing error.
 */
export class UsageBillingError extends Error {
  constructor(
    public readonly code: UsageBillingErrorCode,
    message: string,
    public readonly dimension?: UsageDimensionType,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UsageBillingError";
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get alert level for usage percentage.
 */
export function getAlertLevel(percentage: number): UsageAlertLevel {
  if (percentage >= ALERT_LEVEL_THRESHOLDS.exceeded) return "exceeded";
  if (percentage >= ALERT_LEVEL_THRESHOLDS.critical) return "critical";
  if (percentage >= ALERT_LEVEL_THRESHOLDS.warning) return "warning";
  if (percentage >= ALERT_LEVEL_THRESHOLDS.info) return "info";
  return "normal";
}

/**
 * Format usage value with appropriate unit.
 */
export function formatUsageValue(
  value: number,
  dimension: UsageDimensionType,
  precision: number = 2,
): string {
  const config = DEFAULT_DIMENSION_CONFIGS[dimension];
  const displayValue = value / config.unitDivisor;

  if (displayValue >= 1000000) {
    return `${(displayValue / 1000000).toFixed(precision)}M ${config.unit}`;
  }
  if (displayValue >= 1000) {
    return `${(displayValue / 1000).toFixed(precision)}K ${config.unit}`;
  }
  return `${displayValue.toFixed(precision)} ${config.unit}`;
}

/**
 * Calculate billing period from date.
 */
export function calculateBillingPeriod(
  startDate: Date,
  interval: "monthly" | "yearly",
  referenceDate: Date = new Date(),
): BillingPeriodInfo {
  const start = new Date(startDate);
  const now = new Date(referenceDate);

  // Calculate period boundaries
  let periodStart: Date;
  let periodEnd: Date;

  if (interval === "monthly") {
    // Find current period start
    periodStart = new Date(now.getFullYear(), now.getMonth(), start.getDate());
    if (periodStart > now) {
      periodStart.setMonth(periodStart.getMonth() - 1);
    }
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    // Yearly
    periodStart = new Date(
      now.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    if (periodStart > now) {
      periodStart.setFullYear(periodStart.getFullYear() - 1);
    }
    periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const daysInPeriod = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysElapsed = Math.ceil(
    (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = daysInPeriod - daysElapsed;

  return {
    id: `${periodStart.toISOString().split("T")[0]}_${interval}`,
    startDate: periodStart,
    endDate: periodEnd,
    daysInPeriod,
    daysElapsed: Math.max(0, daysElapsed),
    daysRemaining: Math.max(0, daysRemaining),
    progressPercentage: Math.min(100, (daysElapsed / daysInPeriod) * 100),
    interval,
    isCurrent: now >= periodStart && now < periodEnd,
  };
}

/**
 * Generate idempotency key.
 */
export function generateIdempotencyKey(
  organizationId: string,
  dimension: UsageDimensionType,
  timestamp: Date,
  suffix?: string,
): string {
  const base = `${organizationId}:${dimension}:${timestamp.getTime()}`;
  return suffix ? `${base}:${suffix}` : base;
}

/**
 * Validate usage event input.
 */
export function validateUsageEventInput(input: CreateUsageEventInput): void {
  if (!input.organizationId) {
    throw new UsageBillingError(
      UsageBillingErrorCode.INVALID_DIMENSION,
      "Organization ID is required",
    );
  }

  if (!input.dimension || !DEFAULT_DIMENSION_CONFIGS[input.dimension]) {
    throw new UsageBillingError(
      UsageBillingErrorCode.INVALID_DIMENSION,
      `Invalid dimension: ${input.dimension}`,
    );
  }

  if (typeof input.quantity !== "number" || !Number.isFinite(input.quantity)) {
    throw new UsageBillingError(
      UsageBillingErrorCode.INVALID_QUANTITY,
      "Quantity must be a finite number",
      input.dimension,
    );
  }
}
