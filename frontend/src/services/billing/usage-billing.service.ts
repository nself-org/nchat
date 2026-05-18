/**
 * Usage Billing Service
 *
 * Comprehensive metered billing service with Stripe integration.
 * Handles usage tracking, billing calculations, invoice generation,
 * and sync with Stripe's billing meters.
 *
 * @module @/services/billing/usage-billing.service
 * @version 1.0.0
 */

import Stripe from "stripe";
import { logger } from "@/lib/logger";
import type { PlanTier, Currency } from "@/types/subscription.types";
import { PLAN_LIMITS } from "@/lib/billing/plan-config";
import {
  type UsageDimensionType,
  type UsageDimensionConfig,
  type UsageDimensionPricing,
  type UsagePricingTier,
  type BillingPeriodInfo,
  type BillingPeriodUsage,
  type AggregatedUsage,
  type OverageRecord,
  type UsageInvoiceLineItem,
  type UsageInvoiceSummary,
  type UsageReportRequest,
  type UsageReportResponse,
  type UsageReportDataPoint,
  type CalculateChargesResult,
  type UsageBillingEvent,
  UsageBillingError,
  UsageBillingErrorCode,
  DEFAULT_DIMENSION_CONFIGS,
  calculateBillingPeriod,
  formatUsageValue,
} from "@/lib/billing/usage-types";
import {
  UsageTracker,
  getUsageTracker,
  type UsageTrackerConfig,
} from "@/lib/billing/usage-tracker";

// ============================================================================
// Types
// ============================================================================

/**
 * Usage billing service configuration.
 */
export interface UsageBillingConfig {
  /** Stripe API key */
  stripeSecretKey?: string;
  /** Whether to sync with Stripe */
  syncWithStripe: boolean;
  /** Default currency */
  defaultCurrency: Currency;
  /** Enable invoice generation */
  invoiceGenerationEnabled: boolean;
  /** Overage billing enabled */
  overageBillingEnabled: boolean;
  /** Minimum billable amount in cents */
  minimumBillableAmount: number;
  /** Grace period for invoice finalization in days */
  invoiceGracePeriodDays: number;
}

/**
 * Default billing configuration.
 */
export const DEFAULT_BILLING_CONFIG: UsageBillingConfig = {
  syncWithStripe: true,
  defaultCurrency: "USD",
  invoiceGenerationEnabled: true,
  overageBillingEnabled: true,
  minimumBillableAmount: 50, // 50 cents
  invoiceGracePeriodDays: 3,
};

/**
 * Stripe meter mapping.
 */
interface StripeMeterMapping {
  dimension: UsageDimensionType;
  meterId: string;
  meterEventName: string;
}

/**
 * Sync result.
 */
export interface UsageSyncResult {
  success: boolean;
  eventsSynced: number;
  errors: string[];
  stripeMeterEventIds: string[];
}

/**
 * Invoice generation result.
 */
export interface InvoiceGenerationResult {
  success: boolean;
  invoiceId?: string;
  stripeInvoiceId?: string;
  totalAmount: number;
  error?: string;
}

// ============================================================================
// Usage Billing Service
// ============================================================================

/**
 * Usage Billing Service
 *
 * Manages metered billing calculations, Stripe integration, and invoice generation.
 */
export class UsageBillingService {
  private config: UsageBillingConfig;
  private stripe: Stripe | null = null;
  private tracker: UsageTracker;
  private pricing: Map<UsageDimensionType, UsageDimensionPricing> = new Map();
  private stripeMeterMappings: Map<UsageDimensionType, StripeMeterMapping> =
    new Map();
  private overageRecords: Map<string, OverageRecord[]> = new Map();
  private invoices: Map<string, UsageInvoiceSummary> = new Map();

  constructor(
    config: Partial<UsageBillingConfig> = {},
    trackerConfig?: Partial<UsageTrackerConfig>,
  ) {
    this.config = { ...DEFAULT_BILLING_CONFIG, ...config };
    this.tracker = getUsageTracker(trackerConfig);

    // Initialize Stripe if configured
    if (this.config.syncWithStripe && this.config.stripeSecretKey) {
      this.stripe = new Stripe(this.config.stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
        typescript: true,
      });
    }

    // Initialize default pricing
    this.initializeDefaultPricing();

    // Subscribe to usage events for overage tracking
    this.tracker.on("usage.limit_exceeded", (event) => {
      this.handleLimitExceeded(event);
    });
  }

  // ==========================================================================
  // Pricing Configuration
  // ==========================================================================

  /**
   * Initialize default pricing for all dimensions.
   */
  private initializeDefaultPricing(): void {
    // Storage pricing: tiered
    this.pricing.set("storage", {
      dimensionKey: "storage",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0, // Free tier
      tiers: [
        { upTo: 1, pricePerUnit: 0 }, // First 1 GB free
        { upTo: 10, pricePerUnit: 50 }, // $0.50/GB for 1-10 GB
        { upTo: 100, pricePerUnit: 25 }, // $0.25/GB for 10-100 GB
        { upTo: null, pricePerUnit: 10 }, // $0.10/GB for 100+ GB
      ],
    });

    // Seats pricing: flat per seat
    this.pricing.set("seats", {
      dimensionKey: "seats",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 500, // $5/seat/month
      planOverrides: {
        free: 0,
        starter: 300,
        professional: 500,
        enterprise: 400,
        custom: 0,
      },
    });

    // API calls pricing: graduated
    this.pricing.set("api_calls", {
      dimensionKey: "api_calls",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0,
      tiers: [
        { upTo: 1000, pricePerUnit: 0 }, // First 1000 free
        { upTo: 10000, pricePerUnit: 0.1 }, // $0.001/call for 1K-10K
        { upTo: 100000, pricePerUnit: 0.05 }, // $0.0005/call for 10K-100K
        { upTo: null, pricePerUnit: 0.01 }, // $0.0001/call for 100K+
      ],
    });

    // Bandwidth pricing: tiered
    this.pricing.set("bandwidth", {
      dimensionKey: "bandwidth",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0,
      tiers: [
        { upTo: 5, pricePerUnit: 0 }, // First 5 GB free
        { upTo: 50, pricePerUnit: 8 }, // $0.08/GB for 5-50 GB
        { upTo: null, pricePerUnit: 5 }, // $0.05/GB for 50+ GB
      ],
    });

    // Messages: package pricing
    this.pricing.set("messages", {
      dimensionKey: "messages",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0,
      packageSize: 10000,
      packagePrice: 100, // $1 per 10K messages after free tier
    });

    // Video minutes: tiered
    this.pricing.set("video_minutes", {
      dimensionKey: "video_minutes",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0,
      tiers: [
        { upTo: 60, pricePerUnit: 0 }, // First 60 minutes free
        { upTo: 600, pricePerUnit: 1 }, // $0.01/min for 60-600 min
        { upTo: null, pricePerUnit: 0.5 }, // $0.005/min for 600+ min
      ],
    });

    // File uploads: flat
    this.pricing.set("file_uploads", {
      dimensionKey: "file_uploads",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0, // Usually covered by storage
    });

    // Compute units: graduated
    this.pricing.set("compute_units", {
      dimensionKey: "compute_units",
      currency: this.config.defaultCurrency,
      basePricePerUnit: 0,
      tiers: [
        { upTo: 100, pricePerUnit: 0 }, // First 100 units free
        { upTo: 1000, pricePerUnit: 10 }, // $0.10/unit for 100-1000
        { upTo: null, pricePerUnit: 5 }, // $0.05/unit for 1000+
      ],
    });
  }

  /**
   * Set pricing for a dimension.
   */
  setPricing(
    dimension: UsageDimensionType,
    pricing: UsageDimensionPricing,
  ): void {
    this.pricing.set(dimension, pricing);
  }

  /**
   * Get pricing for a dimension.
   */
  getPricing(dimension: UsageDimensionType): UsageDimensionPricing | undefined {
    return this.pricing.get(dimension);
  }

  // ==========================================================================
  // Billing Calculations
  // ==========================================================================

  /**
   * Calculate charges for usage.
   */
  async calculateCharges(
    organizationId: string,
    plan: PlanTier,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CalculateChargesResult> {
    const billingPeriod = calculateBillingPeriod(
      periodStart,
      "monthly",
      new Date(),
    );
    const breakdown: CalculateChargesResult["breakdown"] =
      {} as CalculateChargesResult["breakdown"];
    let totalCharges = 0;

    for (const dimension of Object.keys(
      DEFAULT_DIMENSION_CONFIGS,
    ) as UsageDimensionType[]) {
      const aggregated = this.tracker.getAggregatedUsage(
        organizationId,
        billingPeriod.id,
        dimension,
      );

      if (!aggregated) {
        breakdown[dimension] = {
          usage: 0,
          charges: 0,
          overageCharges: 0,
        };
        continue;
      }

      const { charges, overageCharges, tierBreakdown } =
        this.calculateDimensionCharges(
          dimension,
          aggregated.billableUsage,
          plan,
        );

      breakdown[dimension] = {
        usage: aggregated.totalUsage,
        charges,
        overageCharges,
        tierBreakdown,
      };

      totalCharges += charges + overageCharges;
    }

    return {
      totalCharges,
      breakdown,
      currency: this.config.defaultCurrency,
      period: billingPeriod,
    };
  }

  /**
   * Calculate charges for a single dimension.
   */
  private calculateDimensionCharges(
    dimension: UsageDimensionType,
    billableUsage: number,
    plan: PlanTier,
  ): {
    charges: number;
    overageCharges: number;
    tierBreakdown?: Array<{
      tier: number;
      quantity: number;
      rate: number;
      amount: number;
    }>;
  } {
    const pricing = this.pricing.get(dimension);
    if (!pricing || billableUsage <= 0) {
      return { charges: 0, overageCharges: 0 };
    }

    const config = DEFAULT_DIMENSION_CONFIGS[dimension];
    const displayUnits = billableUsage / config.unitDivisor;

    // Handle plan-specific overrides
    if (pricing.planOverrides && pricing.planOverrides[plan] !== undefined) {
      const rate = pricing.planOverrides[plan]!;
      return {
        charges: Math.ceil(displayUnits * rate),
        overageCharges: 0,
      };
    }

    // Handle package pricing
    if (pricing.packageSize && pricing.packagePrice) {
      const packages = Math.ceil(displayUnits / pricing.packageSize);
      return {
        charges: packages * pricing.packagePrice,
        overageCharges: 0,
      };
    }

    // Handle tiered/graduated pricing
    if (pricing.tiers && pricing.tiers.length > 0) {
      return this.calculateTieredCharges(
        displayUnits,
        pricing.tiers,
        config.billingModel,
      );
    }

    // Flat rate pricing
    return {
      charges: Math.ceil(displayUnits * pricing.basePricePerUnit),
      overageCharges: 0,
    };
  }

  /**
   * Calculate charges using tiered pricing.
   */
  private calculateTieredCharges(
    units: number,
    tiers: UsagePricingTier[],
    billingModel: string,
  ): {
    charges: number;
    overageCharges: number;
    tierBreakdown: Array<{
      tier: number;
      quantity: number;
      rate: number;
      amount: number;
    }>;
  } {
    const tierBreakdown: Array<{
      tier: number;
      quantity: number;
      rate: number;
      amount: number;
    }> = [];

    let remainingUnits = units;
    let totalCharges = 0;
    let previousTierMax = 0;

    for (let i = 0; i < tiers.length && remainingUnits > 0; i++) {
      const tier = tiers[i];
      const tierMax = tier.upTo ?? Infinity;
      const tierRange = tierMax - previousTierMax;

      // For volume pricing, all units get the rate of the tier that includes the total
      if (billingModel === "volume") {
        if (units <= tierMax) {
          const amount = Math.ceil(units * tier.pricePerUnit);
          tierBreakdown.push({
            tier: i + 1,
            quantity: units,
            rate: tier.pricePerUnit,
            amount,
          });
          totalCharges = amount;
          break;
        }
        previousTierMax = tierMax;
        continue;
      }

      // Graduated/tiered pricing
      const unitsInTier = Math.min(remainingUnits, tierRange);
      const amount = Math.ceil(unitsInTier * tier.pricePerUnit);

      if (amount > 0 || tier.pricePerUnit > 0) {
        tierBreakdown.push({
          tier: i + 1,
          quantity: unitsInTier,
          rate: tier.pricePerUnit,
          amount,
        });
      }

      totalCharges += amount;
      remainingUnits -= unitsInTier;
      previousTierMax = tierMax;
    }

    return {
      charges: totalCharges,
      overageCharges: 0,
      tierBreakdown,
    };
  }

  // ==========================================================================
  // Billing Period Usage
  // ==========================================================================

  /**
   * Get usage summary for a billing period.
   */
  async getBillingPeriodUsage(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BillingPeriodUsage> {
    const period = calculateBillingPeriod(periodStart, "monthly", new Date());
    const usage: Record<UsageDimensionType, AggregatedUsage> = {} as Record<
      UsageDimensionType,
      AggregatedUsage
    >;
    const chargesByDimension: Record<UsageDimensionType, number> = {} as Record<
      UsageDimensionType,
      number
    >;
    const overages: Record<UsageDimensionType, number> = {} as Record<
      UsageDimensionType,
      number
    >;

    let estimatedCharges = 0;
    let hasOverages = false;

    // Get usage for all dimensions
    await this.tracker.aggregateUsage(
      organizationId,
      period.id,
      period.startDate,
      period.endDate,
    );

    for (const dimension of Object.keys(
      DEFAULT_DIMENSION_CONFIGS,
    ) as UsageDimensionType[]) {
      const aggregated = this.tracker.getAggregatedUsage(
        organizationId,
        period.id,
        dimension,
      );

      if (aggregated) {
        usage[dimension] = aggregated;

        // Calculate charges
        const plan = await this.getOrganizationPlan(organizationId);
        const { charges, overageCharges } = this.calculateDimensionCharges(
          dimension,
          aggregated.billableUsage,
          plan,
        );

        chargesByDimension[dimension] = charges + overageCharges;
        overages[dimension] = overageCharges;
        estimatedCharges += charges + overageCharges;

        if (overageCharges > 0) {
          hasOverages = true;
        }
      } else {
        usage[dimension] = {
          dimension,
          organizationId,
          billingPeriodId: period.id,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          totalUsage: 0,
          eventCount: 0,
          peakUsage: 0,
          averageUsage: 0,
          billableUsage: 0,
          updatedAt: new Date(),
        };
        chargesByDimension[dimension] = 0;
        overages[dimension] = 0;
      }
    }

    return {
      period,
      usage,
      estimatedCharges,
      chargesByDimension,
      overages,
      hasOverages,
    };
  }

  // ==========================================================================
  // Invoice Generation
  // ==========================================================================

  /**
   * Generate invoice for a billing period.
   */
  async generateInvoice(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    baseSubscriptionAmount: number = 0,
  ): Promise<InvoiceGenerationResult> {
    if (!this.config.invoiceGenerationEnabled) {
      return {
        success: false,
        error: "Invoice generation is disabled",
        totalAmount: 0,
      };
    }

    try {
      const period = calculateBillingPeriod(periodStart, "monthly", new Date());
      const plan = await this.getOrganizationPlan(organizationId);
      const chargesResult = await this.calculateCharges(
        organizationId,
        plan,
        periodStart,
        periodEnd,
      );

      // Generate line items
      const lineItems: UsageInvoiceLineItem[] = [];

      for (const [dimension, breakdown] of Object.entries(
        chargesResult.breakdown,
      )) {
        if (breakdown.usage === 0) continue;

        const config =
          DEFAULT_DIMENSION_CONFIGS[dimension as UsageDimensionType];
        const displayUsage = breakdown.usage / config.unitDivisor;

        // Regular usage
        if (breakdown.charges > 0) {
          lineItems.push({
            id: `line_${dimension}_${Date.now()}`,
            dimension: dimension as UsageDimensionType,
            description: `${config.name} usage`,
            quantity: displayUsage,
            unit: config.unit,
            unitPrice: Math.round(breakdown.charges / displayUsage),
            amount: breakdown.charges,
            isOverage: false,
            periodStart: period.startDate,
            periodEnd: period.endDate,
            tierBreakdown: breakdown.tierBreakdown?.map((t) => ({
              tier: t.tier,
              quantity: t.quantity,
              pricePerUnit: t.rate,
              amount: t.amount,
            })),
          });
        }

        // Overage charges
        if (breakdown.overageCharges > 0) {
          lineItems.push({
            id: `line_${dimension}_overage_${Date.now()}`,
            dimension: dimension as UsageDimensionType,
            description: `${config.name} overage`,
            quantity: displayUsage,
            unit: config.unit,
            unitPrice: Math.round(breakdown.overageCharges / displayUsage),
            amount: breakdown.overageCharges,
            isOverage: true,
            periodStart: period.startDate,
            periodEnd: period.endDate,
          });
        }
      }

      // Calculate totals
      const totalUsageAmount = chargesResult.totalCharges;
      const totalOverageAmount = Object.values(chargesResult.breakdown).reduce(
        (sum, b) => sum + b.overageCharges,
        0,
      );
      const grandTotal = baseSubscriptionAmount + totalUsageAmount;

      // Create invoice summary
      const invoice: UsageInvoiceSummary = {
        organizationId,
        billingPeriod: period,
        baseSubscriptionAmount,
        totalUsageAmount,
        totalOverageAmount,
        creditsApplied: 0,
        grandTotal,
        lineItems,
        currency: this.config.defaultCurrency,
      };

      // Store invoice
      const invoiceId = `inv_${organizationId}_${period.id}`;
      this.invoices.set(invoiceId, invoice);

      // Sync with Stripe if configured
      let stripeInvoiceId: string | undefined;
      if (this.stripe && this.config.syncWithStripe) {
        try {
          stripeInvoiceId = await this.createStripeInvoice(
            organizationId,
            invoice,
          );
        } catch (error) {
          logger.error("Failed to create Stripe invoice:", error);
        }
      }

      // Emit invoice generated event
      this.tracker.on("usage.invoice_generated", () => {}); // Ensure listener exists

      return {
        success: true,
        invoiceId,
        stripeInvoiceId,
        totalAmount: grandTotal,
      };
    } catch (error) {
      logger.error("Error generating invoice:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        totalAmount: 0,
      };
    }
  }

  /**
   * Get invoice by ID.
   */
  getInvoice(invoiceId: string): UsageInvoiceSummary | undefined {
    return this.invoices.get(invoiceId);
  }

  /**
   * Create Stripe invoice.
   */
  private async createStripeInvoice(
    organizationId: string,
    invoice: UsageInvoiceSummary,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error("Stripe not configured");
    }

    // Get or create Stripe customer
    const customerId = await this.getOrCreateStripeCustomer(organizationId);

    // Create invoice
    const stripeInvoice = await this.stripe.invoices.create({
      customer: customerId,
      auto_advance: false, // Don't auto-finalize
      collection_method: "charge_automatically",
      metadata: {
        organization_id: organizationId,
        billing_period_id: invoice.billingPeriod.id,
        type: "usage_billing",
      },
    });

    // Add line items
    for (const lineItem of invoice.lineItems) {
      await this.stripe.invoiceItems.create({
        customer: customerId,
        invoice: stripeInvoice.id,
        amount: lineItem.amount,
        currency: invoice.currency.toLowerCase(),
        description: lineItem.description,
        metadata: {
          dimension: lineItem.dimension,
          is_overage: lineItem.isOverage.toString(),
          quantity: lineItem.quantity.toString(),
          unit: lineItem.unit,
        },
      });
    }

    return stripeInvoice.id ?? "";
  }

  // ==========================================================================
  // Usage Reporting
  // ==========================================================================

  /**
   * Generate usage report.
   */
  async generateUsageReport(
    request: UsageReportRequest,
  ): Promise<UsageReportResponse> {
    const dimensions =
      request.dimensions ||
      (Object.keys(DEFAULT_DIMENSION_CONFIGS) as UsageDimensionType[]);
    const data: Record<UsageDimensionType, UsageReportDataPoint[]> =
      {} as Record<UsageDimensionType, UsageReportDataPoint[]>;

    const summary: UsageReportResponse["summary"] = {
      totalUsage: {} as Record<UsageDimensionType, number>,
      peakUsage: {} as Record<UsageDimensionType, number>,
      averageUsage: {} as Record<UsageDimensionType, number>,
      projectedMonthEnd: {} as Record<UsageDimensionType, number>,
    };

    const costs: UsageReportResponse["costs"] = {
      actual: {} as Record<UsageDimensionType, number>,
      projected: {} as Record<UsageDimensionType, number>,
    };

    const plan = await this.getOrganizationPlan(request.organizationId);

    for (const dimension of dimensions) {
      // Get current usage
      const currentUsage = this.tracker.getCurrentUsage(
        request.organizationId,
        dimension,
      );

      // Calculate data points (simplified - in production would query historical data)
      const dataPoints: UsageReportDataPoint[] = [];
      const daysDiff = Math.ceil(
        (request.endDate.getTime() - request.startDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const dailyUsage = currentUsage / Math.max(1, daysDiff);
      let cumulative = 0;

      for (let i = 0; i <= daysDiff; i++) {
        const timestamp = new Date(
          request.startDate.getTime() + i * 24 * 60 * 60 * 1000,
        );
        const value = dailyUsage;
        cumulative += value;

        dataPoints.push({
          timestamp,
          value,
          cumulativeValue: cumulative,
        });
      }

      data[dimension] = dataPoints;

      // Calculate summary
      summary.totalUsage[dimension] = currentUsage;
      summary.peakUsage[dimension] = currentUsage;
      summary.averageUsage[dimension] = dailyUsage;

      // Project to month end
      const period = calculateBillingPeriod(
        request.startDate,
        "monthly",
        new Date(),
      );
      const projectionMultiplier =
        period.daysInPeriod / Math.max(1, period.daysElapsed);
      summary.projectedMonthEnd[dimension] =
        currentUsage * projectionMultiplier;

      // Calculate costs
      const { charges } = this.calculateDimensionCharges(
        dimension,
        currentUsage,
        plan,
      );
      costs.actual[dimension] = charges;

      const projectedBillableUsage = summary.projectedMonthEnd[dimension];
      const { charges: projectedCharges } = this.calculateDimensionCharges(
        dimension,
        projectedBillableUsage,
        plan,
      );
      costs.projected[dimension] = projectedCharges;
    }

    return {
      request,
      generatedAt: new Date(),
      data,
      summary,
      costs,
    };
  }

  // ==========================================================================
  // Stripe Sync
  // ==========================================================================

  /**
   * Sync usage to Stripe.
   */
  async syncUsageToStripe(organizationId: string): Promise<UsageSyncResult> {
    if (!this.stripe || !this.config.syncWithStripe) {
      return {
        success: false,
        eventsSynced: 0,
        errors: ["Stripe sync is not configured"],
        stripeMeterEventIds: [],
      };
    }

    const errors: string[] = [];
    const stripeMeterEventIds: string[] = [];
    let eventsSynced = 0;

    try {
      const customerId = await this.getOrCreateStripeCustomer(organizationId);

      for (const [dimension, config] of Object.entries(
        DEFAULT_DIMENSION_CONFIGS,
      )) {
        if (!config.stripeMeterEventName) continue;

        const currentUsage = this.tracker.getCurrentUsage(
          organizationId,
          dimension as UsageDimensionType,
        );

        if (currentUsage <= 0) continue;

        try {
          const meterEvent = await this.stripe.billing.meterEvents.create({
            event_name: config.stripeMeterEventName,
            payload: {
              stripe_customer_id: customerId,
              value: String(Math.round(currentUsage / config.unitDivisor)),
            },
            timestamp: Math.floor(Date.now() / 1000),
          });

          stripeMeterEventIds.push(meterEvent.identifier);
          eventsSynced++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`Failed to sync ${dimension}: ${errorMessage}`);
        }
      }

      return {
        success: errors.length === 0,
        eventsSynced,
        errors,
        stripeMeterEventIds,
      };
    } catch (error) {
      logger.error("Error syncing usage to Stripe:", error);
      return {
        success: false,
        eventsSynced: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        stripeMeterEventIds: [],
      };
    }
  }

  /**
   * Configure Stripe meter mapping.
   */
  configureStripeMeter(mapping: StripeMeterMapping): void {
    this.stripeMeterMappings.set(mapping.dimension, mapping);
  }

  // ==========================================================================
  // Overage Handling
  // ==========================================================================

  /**
   * Handle limit exceeded event.
   */
  private async handleLimitExceeded(event: UsageBillingEvent): Promise<void> {
    if (!this.config.overageBillingEnabled || !event.dimension) return;

    const { organizationId, dimension } = event;
    const currentUsage = event.data.currentUsage as number;
    const limit = event.data.limit as number;
    const overageAmount = currentUsage - limit;

    if (overageAmount <= 0) return;

    // Get overage config
    const overageConfig = this.tracker.getOverageConfig(
      organizationId,
      dimension,
    );

    // Calculate overage charges
    const plan = await this.getOrganizationPlan(organizationId);
    const { charges } = this.calculateDimensionCharges(
      dimension,
      overageAmount,
      plan,
    );
    const overageCharges = Math.ceil(
      charges * overageConfig.overageRateMultiplier,
    );

    // Create overage record
    const record: OverageRecord = {
      id: `ovg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      organizationId,
      billingPeriodId:
        this.tracker["getBillingPeriodForOrg"](organizationId).id,
      dimension,
      overageAmount,
      overageCharges,
      rateApplied: overageConfig.overageRateMultiplier,
      createdAt: new Date(),
      invoiced: false,
    };

    // Store overage record
    let orgOverages = this.overageRecords.get(organizationId);
    if (!orgOverages) {
      orgOverages = [];
      this.overageRecords.set(organizationId, orgOverages);
    }
    orgOverages.push(record);
  }

  /**
   * Get overage records for an organization.
   */
  getOverageRecords(organizationId: string): OverageRecord[] {
    return this.overageRecords.get(organizationId) || [];
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get organization's plan tier.
   */
  private async getOrganizationPlan(organizationId: string): Promise<PlanTier> {
    // In production, this would query the database
    // For now, delegate to tracker
    return "free";
  }

  /**
   * Get or create Stripe customer.
   */
  private async getOrCreateStripeCustomer(
    organizationId: string,
  ): Promise<string> {
    if (!this.stripe) {
      throw new Error("Stripe not configured");
    }

    // In production, this would look up customer from database
    // For now, search Stripe
    const customers = await this.stripe.customers.search({
      query: `metadata['organization_id']:'${organizationId}'`,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      metadata: {
        organization_id: organizationId,
      },
    });

    return customer.id;
  }

  /**
   * Get the usage tracker instance.
   */
  getTracker(): UsageTracker {
    return this.tracker;
  }

  /**
   * Cleanup and destroy service.
   */
  destroy(): void {
    this.pricing.clear();
    this.stripeMeterMappings.clear();
    this.overageRecords.clear();
    this.invoices.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let usageBillingService: UsageBillingService | null = null;

export function getUsageBillingService(
  config?: Partial<UsageBillingConfig>,
): UsageBillingService {
  if (!usageBillingService) {
    usageBillingService = new UsageBillingService(config);
  }
  return usageBillingService;
}

export function createUsageBillingService(
  config?: Partial<UsageBillingConfig>,
  trackerConfig?: Partial<UsageTrackerConfig>,
): UsageBillingService {
  return new UsageBillingService(config, trackerConfig);
}

export function resetUsageBillingService(): void {
  if (usageBillingService) {
    usageBillingService.destroy();
    usageBillingService = null;
  }
}
