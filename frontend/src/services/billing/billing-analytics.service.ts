/**
 * Billing Analytics Service
 *
 * Service layer that orchestrates revenue, churn, customer analytics,
 * entitlement drift detection, and finance reconciliation.
 * Provides report generation in JSON and CSV formats.
 *
 * @module @/services/billing/billing-analytics.service
 * @version 1.0.0
 */

import type { Currency } from "@/types/subscription.types";
import type {
  AnalyticsDateRange,
  AnalyticsSubscription,
  AnalyticsPayment,
  AnalyticsUsageRecord,
  LedgerEntry,
  LedgerSource,
  RevenueAnalyticsReport,
  ChurnAnalyticsReport,
  CustomerAnalyticsReport,
  EntitlementDriftReport,
  ReconciliationSummary,
  ComprehensiveReport,
  BillingReportRequest,
  BillingReport,
  BillingReportMetadata,
  BillingReportType,
  DriftSeverity,
} from "@/lib/billing/analytics-types";
import {
  BillingAnalyticsError,
  BillingAnalyticsErrorCode,
} from "@/lib/billing/analytics-types";
import { generateRevenueReport } from "@/lib/billing/revenue-analytics";
import { generateChurnReport } from "@/lib/billing/churn-analytics";
import { generateCustomerReport } from "@/lib/billing/customer-analytics";
import { generateDriftReport } from "@/lib/billing/entitlement-drift";
import { reconcile } from "@/lib/billing/finance-reconciliation";

// ============================================================================
// CSV Export Helpers
// ============================================================================

/**
 * Escape a value for CSV output.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to CSV string.
 */
export function toCsv(
  rows: Record<string, unknown>[],
  headers?: string[],
): string {
  if (rows.length === 0) return "";

  const keys = headers || Object.keys(rows[0]);
  const headerLine = keys.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    keys.map((key) => escapeCsvValue(row[key])).join(","),
  );

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Convert revenue report to CSV rows.
 */
function revenueReportToCsvRows(
  report: RevenueAnalyticsReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  // MRR time series
  for (const snapshot of report.mrrTimeSeries) {
    rows.push({
      date: snapshot.date.toISOString(),
      total_mrr_cents: snapshot.totalMRR,
      new_mrr_cents: snapshot.newMRR,
      expansion_mrr_cents: snapshot.expansionMRR,
      contraction_mrr_cents: snapshot.contractionMRR,
      churned_mrr_cents: snapshot.churnedMRR,
      reactivation_mrr_cents: snapshot.reactivationMRR,
      net_new_mrr_cents: snapshot.netNewMRR,
      free_mrr: snapshot.byPlan.free,
      starter_mrr: snapshot.byPlan.starter,
      professional_mrr: snapshot.byPlan.professional,
      enterprise_mrr: snapshot.byPlan.enterprise,
      custom_mrr: snapshot.byPlan.custom,
    });
  }

  return rows;
}

/**
 * Convert churn report to CSV rows.
 */
function churnReportToCsvRows(
  report: ChurnAnalyticsReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const metrics of report.churnTimeSeries) {
    rows.push({
      period_start: metrics.period.periodStart.toISOString(),
      period_end: metrics.period.periodEnd.toISOString(),
      start_count: metrics.startCount,
      canceled_count: metrics.canceledCount,
      customer_churn_rate: metrics.customerChurnRate,
      revenue_churn_rate: metrics.revenueChurnRate,
      net_revenue_churn_rate: metrics.netRevenueChurnRate,
      churned_mrr_cents: metrics.churnedMRR,
    });
  }

  return rows;
}

/**
 * Convert customer report to CSV rows.
 */
function customerReportToCsvRows(
  report: CustomerAnalyticsReport,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const arpu of report.arpuTimeSeries) {
    rows.push({
      period_start: arpu.period.periodStart.toISOString(),
      period_end: arpu.period.periodEnd.toISOString(),
      overall_arpu_cents: arpu.overallARPU,
      free_arpu: arpu.byPlan.free,
      starter_arpu: arpu.byPlan.starter,
      professional_arpu: arpu.byPlan.professional,
      enterprise_arpu: arpu.byPlan.enterprise,
      custom_arpu: arpu.byPlan.custom,
      monthly_arpu: arpu.byInterval.monthly,
      yearly_arpu: arpu.byInterval.yearly,
      trend_pct: arpu.trend,
    });
  }

  return rows;
}

/**
 * Convert drift report to CSV rows.
 */
function driftReportToCsvRows(
  report: EntitlementDriftReport,
): Record<string, unknown>[] {
  return report.driftEntries.map((entry) => ({
    workspace_id: entry.workspaceId,
    organization_id: entry.organizationId,
    plan: entry.plan,
    resource: entry.resource,
    current_usage: entry.currentUsage,
    plan_limit: entry.planLimit,
    direction: entry.direction,
    drift_amount: entry.driftAmount,
    drift_percentage: entry.driftPercentage,
    severity: entry.severity,
    detected_at: entry.detectedAt.toISOString(),
    recommended_action: entry.recommendedAction,
  }));
}

/**
 * Convert reconciliation report to CSV rows.
 */
function reconciliationToCsvRows(
  summary: ReconciliationSummary,
): Record<string, unknown>[] {
  return summary.matches.map((match) => ({
    match_id: match.id,
    status: match.status,
    external_id: match.externalEntry?.externalId ?? "",
    internal_id: match.internalEntry?.id ?? "",
    external_amount_cents: match.externalEntry?.amount ?? "",
    internal_amount_cents: match.internalEntry?.amount ?? "",
    discrepancy_cents: match.discrepancyAmount,
    discrepancy_reason: match.discrepancyReason ?? "",
    within_tolerance: match.withinTolerance,
    resolved: match.resolved,
  }));
}

// ============================================================================
// Service Class
// ============================================================================

/**
 * Billing Analytics Service configuration.
 */
export interface BillingAnalyticsServiceConfig {
  /** Default currency */
  currency: Currency;
  /** Default churn rate for LTV calculations */
  defaultChurnRate: number;
  /** Risk threshold for at-risk detection */
  riskThreshold: number;
  /** Reconciliation tolerance in cents */
  reconciliationTolerance: number;
  /** Minimum drift severity for alerts */
  minDriftAlertSeverity: DriftSeverity;
}

/**
 * Default service configuration.
 */
export const DEFAULT_ANALYTICS_CONFIG: BillingAnalyticsServiceConfig = {
  currency: "USD",
  defaultChurnRate: 5,
  riskThreshold: 20,
  reconciliationTolerance: 50,
  minDriftAlertSeverity: "minor",
};

/**
 * Billing Analytics Service.
 *
 * Orchestrates all billing analytics operations and report generation.
 */
export class BillingAnalyticsService {
  private config: BillingAnalyticsServiceConfig;

  constructor(config: Partial<BillingAnalyticsServiceConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  }

  /**
   * Generate revenue analytics report.
   */
  generateRevenueReport(
    subscriptions: AnalyticsSubscription[],
    payments: AnalyticsPayment[],
    dateRange: AnalyticsDateRange,
  ): RevenueAnalyticsReport {
    this.validateDateRange(dateRange);
    return generateRevenueReport(
      subscriptions,
      payments,
      dateRange,
      this.config.currency,
    );
  }

  /**
   * Generate churn analytics report.
   */
  generateChurnReport(
    subscriptions: AnalyticsSubscription[],
    dateRange: AnalyticsDateRange,
  ): ChurnAnalyticsReport {
    this.validateDateRange(dateRange);
    return generateChurnReport(
      subscriptions,
      dateRange,
      this.config.riskThreshold,
    );
  }

  /**
   * Generate customer analytics report.
   */
  generateCustomerReport(
    subscriptions: AnalyticsSubscription[],
    payments: AnalyticsPayment[],
    dateRange: AnalyticsDateRange,
  ): CustomerAnalyticsReport {
    this.validateDateRange(dateRange);
    return generateCustomerReport(
      subscriptions,
      payments,
      dateRange,
      this.config.defaultChurnRate,
    );
  }

  /**
   * Generate entitlement drift report.
   */
  generateDriftReport(
    usageRecords: AnalyticsUsageRecord[],
  ): EntitlementDriftReport {
    return generateDriftReport(
      usageRecords,
      undefined,
      this.config.minDriftAlertSeverity,
    );
  }

  /**
   * Run finance reconciliation.
   */
  reconcile(
    externalEntries: LedgerEntry[],
    internalEntries: LedgerEntry[],
    dateRange: AnalyticsDateRange,
    source: LedgerSource,
  ): ReconciliationSummary {
    this.validateDateRange(dateRange);
    return reconcile(externalEntries, internalEntries, dateRange, source, {
      toleranceCents: this.config.reconciliationTolerance,
    });
  }

  /**
   * Generate comprehensive report combining all analytics.
   */
  generateComprehensiveReport(
    subscriptions: AnalyticsSubscription[],
    payments: AnalyticsPayment[],
    usageRecords: AnalyticsUsageRecord[],
    externalEntries: LedgerEntry[],
    internalEntries: LedgerEntry[],
    dateRange: AnalyticsDateRange,
    source: LedgerSource = "stripe",
  ): ComprehensiveReport {
    this.validateDateRange(dateRange);

    return {
      revenue: this.generateRevenueReport(subscriptions, payments, dateRange),
      churn: this.generateChurnReport(subscriptions, dateRange),
      customer: this.generateCustomerReport(subscriptions, payments, dateRange),
      entitlementDrift: this.generateDriftReport(usageRecords),
      reconciliation: this.reconcile(
        externalEntries,
        internalEntries,
        dateRange,
        source,
      ),
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a report based on a request.
   */
  generateReport(
    request: BillingReportRequest,
    data: {
      subscriptions: AnalyticsSubscription[];
      payments: AnalyticsPayment[];
      usageRecords?: AnalyticsUsageRecord[];
      externalEntries?: LedgerEntry[];
      internalEntries?: LedgerEntry[];
    },
  ): BillingReport {
    const startTime = Date.now();
    this.validateDateRange(request.dateRange);

    let reportData: BillingReport["data"];
    let csvRows: Record<string, unknown>[] = [];

    switch (request.type) {
      case "revenue":
        reportData = this.generateRevenueReport(
          data.subscriptions,
          data.payments,
          request.dateRange,
        );
        csvRows = revenueReportToCsvRows(reportData as RevenueAnalyticsReport);
        break;

      case "churn":
        reportData = this.generateChurnReport(
          data.subscriptions,
          request.dateRange,
        );
        csvRows = churnReportToCsvRows(reportData as ChurnAnalyticsReport);
        break;

      case "customer":
        reportData = this.generateCustomerReport(
          data.subscriptions,
          data.payments,
          request.dateRange,
        );
        csvRows = customerReportToCsvRows(
          reportData as CustomerAnalyticsReport,
        );
        break;

      case "entitlement_drift":
        if (!data.usageRecords) {
          throw new BillingAnalyticsError(
            BillingAnalyticsErrorCode.INSUFFICIENT_DATA,
            "Usage records are required for entitlement drift report",
          );
        }
        reportData = this.generateDriftReport(data.usageRecords);
        csvRows = driftReportToCsvRows(reportData as EntitlementDriftReport);
        break;

      case "reconciliation":
        if (!data.externalEntries || !data.internalEntries) {
          throw new BillingAnalyticsError(
            BillingAnalyticsErrorCode.INSUFFICIENT_DATA,
            "External and internal entries are required for reconciliation report",
          );
        }
        reportData = this.reconcile(
          data.externalEntries,
          data.internalEntries,
          request.dateRange,
          "stripe",
        );
        csvRows = reconciliationToCsvRows(reportData as ReconciliationSummary);
        break;

      case "comprehensive":
        reportData = this.generateComprehensiveReport(
          data.subscriptions,
          data.payments,
          data.usageRecords || [],
          data.externalEntries || [],
          data.internalEntries || [],
          request.dateRange,
        );
        // For comprehensive CSV, use revenue time series
        csvRows = revenueReportToCsvRows(
          (reportData as ComprehensiveReport).revenue,
        );
        break;

      default:
        throw new BillingAnalyticsError(
          BillingAnalyticsErrorCode.INVALID_REPORT_TYPE,
          `Invalid report type: ${request.type}`,
        );
    }

    const csv = request.format === "csv" ? toCsv(csvRows) : null;
    const generationDuration = Date.now() - startTime;

    const metadata: BillingReportMetadata = {
      id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: request.type,
      format: request.format,
      dateRange: request.dateRange,
      generatedAt: new Date(),
      generationDurationMs: generationDuration,
      rowCount: csvRows.length,
      fileSizeBytes: csv ? new TextEncoder().encode(csv).length : null,
      requestedBy: request.requestedBy,
    };

    return {
      metadata,
      data: reportData,
      csv,
    };
  }

  /**
   * Validate date range.
   */
  private validateDateRange(dateRange: AnalyticsDateRange): void {
    if (dateRange.startDate >= dateRange.endDate) {
      throw new BillingAnalyticsError(
        BillingAnalyticsErrorCode.INVALID_DATE_RANGE,
        "Start date must be before end date",
      );
    }
  }
}

// ============================================================================
// Singleton Management
// ============================================================================

let serviceInstance: BillingAnalyticsService | null = null;

/**
 * Get or create the billing analytics service singleton.
 */
export function getBillingAnalyticsService(
  config?: Partial<BillingAnalyticsServiceConfig>,
): BillingAnalyticsService {
  if (!serviceInstance) {
    serviceInstance = new BillingAnalyticsService(config);
  }
  return serviceInstance;
}

/**
 * Create a new billing analytics service (non-singleton).
 */
export function createBillingAnalyticsService(
  config?: Partial<BillingAnalyticsServiceConfig>,
): BillingAnalyticsService {
  return new BillingAnalyticsService(config);
}

/**
 * Reset the singleton (for testing).
 */
export function resetBillingAnalyticsService(): void {
  serviceInstance = null;
}
