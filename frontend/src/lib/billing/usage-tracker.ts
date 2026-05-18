/**
 * Usage Tracker
 *
 * Real-time usage tracking and aggregation for metered billing.
 * Provides event recording, aggregation, threshold monitoring, and alerts.
 *
 * @module @/lib/billing/usage-tracker
 * @version 1.0.0
 */

import { logger } from "@/lib/logger";
import type { PlanTier } from "@/types/subscription.types";
import { PLAN_LIMITS } from "./plan-config";
import {
  type UsageDimensionType,
  type UsageEvent,
  type CreateUsageEventInput,
  type AggregatedUsage,
  type UsageSnapshot,
  type DimensionSnapshot,
  type BillingPeriodInfo,
  type UsageAlert,
  type UsageAlertLevel,
  type UsageThresholdConfig,
  type RecordUsageResult,
  type CheckUsageResult,
  type UsageBillingEvent,
  type UsageBillingEventType,
  type OverageConfig,
  type OverageStrategy,
  UsageBillingError,
  UsageBillingErrorCode,
  DEFAULT_DIMENSION_CONFIGS,
  DEFAULT_THRESHOLDS,
  DEFAULT_OVERAGE_CONFIG,
  ALERT_LEVEL_THRESHOLDS,
  getAlertLevel,
  calculateBillingPeriod,
  generateIdempotencyKey,
  validateUsageEventInput,
} from "./usage-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Usage tracker configuration.
 */
export interface UsageTrackerConfig {
  /** Enable real-time tracking */
  enabled: boolean;
  /** Batch size for aggregation */
  batchSize: number;
  /** Aggregation interval in milliseconds */
  aggregationIntervalMs: number;
  /** Enable alerts */
  alertsEnabled: boolean;
  /** Enable projections */
  projectionsEnabled: boolean;
  /** Event retention days */
  eventRetentionDays: number;
  /** Cache TTL in seconds */
  cacheTtlSeconds: number;
}

/**
 * Default tracker configuration.
 */
export const DEFAULT_TRACKER_CONFIG: UsageTrackerConfig = {
  enabled: true,
  batchSize: 100,
  aggregationIntervalMs: 60000, // 1 minute
  alertsEnabled: true,
  projectionsEnabled: true,
  eventRetentionDays: 90,
  cacheTtlSeconds: 300, // 5 minutes
};

/**
 * Event listener type.
 */
export type UsageEventListener = (
  event: UsageBillingEvent,
) => void | Promise<void>;

// ============================================================================
// Usage Tracker Class
// ============================================================================

/**
 * Usage Tracker
 *
 * Tracks usage events, aggregates data, monitors thresholds, and emits alerts.
 */
export class UsageTracker {
  private config: UsageTrackerConfig;
  private events: Map<string, UsageEvent> = new Map();
  private aggregatedUsage: Map<string, AggregatedUsage> = new Map();
  private currentUsage: Map<string, Map<UsageDimensionType, number>> =
    new Map();
  private alerts: Map<string, UsageAlert[]> = new Map();
  private thresholdConfigs: Map<
    string,
    Map<UsageDimensionType, UsageThresholdConfig>
  > = new Map();
  private overageConfigs: Map<string, Map<UsageDimensionType, OverageConfig>> =
    new Map();
  private planCache: Map<string, { tier: PlanTier; cachedAt: number }> =
    new Map();
  private processedIdempotencyKeys: Set<string> = new Set();
  private eventListeners: Map<UsageBillingEventType, Set<UsageEventListener>> =
    new Map();
  private aggregationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<UsageTrackerConfig> = {}) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
    if (this.config.enabled && this.config.aggregationIntervalMs > 0) {
      this.startAggregationTimer();
    }
  }

  // ==========================================================================
  // Event Recording
  // ==========================================================================

  /**
   * Record a usage event.
   */
  async recordUsage(input: CreateUsageEventInput): Promise<RecordUsageResult> {
    try {
      // Validate input
      validateUsageEventInput(input);

      // Generate idempotency key if not provided
      const idempotencyKey =
        input.idempotencyKey ||
        generateIdempotencyKey(
          input.organizationId,
          input.dimension,
          input.timestamp || new Date(),
          Math.random().toString(36).substring(7),
        );

      // Check for duplicate
      if (this.processedIdempotencyKeys.has(idempotencyKey)) {
        return {
          success: false,
          error: "Duplicate event",
        };
      }

      // Check limits before recording
      const checkResult = await this.checkUsage(
        input.organizationId,
        input.dimension,
        input.quantity,
      );

      if (checkResult.action === "block") {
        return {
          success: false,
          error: checkResult.reason || "Usage limit exceeded",
          limitExceeded: true,
          currentUsage: checkResult.currentUsage,
        };
      }

      // Create event
      const event: UsageEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        userId: input.userId,
        dimension: input.dimension,
        quantity: input.quantity,
        timestamp: input.timestamp || new Date(),
        idempotencyKey,
        metadata: input.metadata,
        processed: false,
      };

      // Store event
      this.events.set(event.id, event);
      this.processedIdempotencyKeys.add(idempotencyKey);

      // Update current usage
      this.updateCurrentUsage(
        input.organizationId,
        input.dimension,
        input.quantity,
      );

      // Get updated usage
      const currentUsage = this.getCurrentUsage(
        input.organizationId,
        input.dimension,
      );

      // Check for alerts
      const alert = await this.checkAndEmitAlerts(
        input.organizationId,
        input.dimension,
      );

      // Emit event
      this.emitEvent({
        type: "usage.recorded",
        organizationId: input.organizationId,
        dimension: input.dimension,
        data: {
          eventId: event.id,
          quantity: input.quantity,
          currentUsage,
        },
        timestamp: new Date(),
        eventId: event.id,
      });

      // Calculate overage if applicable
      let overageAmount: number | undefined;
      if (checkResult.alertLevel === "exceeded") {
        const limit = checkResult.limit || 0;
        overageAmount = Math.max(0, currentUsage - limit);
      }

      return {
        success: true,
        eventId: event.id,
        currentUsage,
        alertTriggered: alert || undefined,
        limitExceeded: checkResult.alertLevel === "exceeded",
        overageAmount,
      };
    } catch (error) {
      logger.error("Error recording usage:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Record multiple usage events in batch.
   */
  async recordUsageBatch(
    inputs: CreateUsageEventInput[],
  ): Promise<RecordUsageResult[]> {
    const results: RecordUsageResult[] = [];
    for (const input of inputs) {
      results.push(await this.recordUsage(input));
    }
    return results;
  }

  /**
   * Set absolute usage value (for dimensions like storage).
   */
  async setUsage(
    organizationId: string,
    dimension: UsageDimensionType,
    value: number,
  ): Promise<RecordUsageResult> {
    const previousUsage = this.getCurrentUsage(organizationId, dimension);
    const config = DEFAULT_DIMENSION_CONFIGS[dimension];

    // For 'last' aggregation, we need to pass the absolute value directly
    // For other aggregation methods, we use the delta approach
    let quantity: number;
    if (config.aggregationMethod === "last") {
      quantity = value;
    } else {
      quantity = value - previousUsage;
    }

    return this.recordUsage({
      organizationId,
      dimension,
      quantity,
      metadata: {
        type: "absolute_set",
        newValue: value,
        previousValue: previousUsage,
      },
    });
  }

  // ==========================================================================
  // Usage Queries
  // ==========================================================================

  /**
   * Check current usage against limits.
   */
  async checkUsage(
    organizationId: string,
    dimension: UsageDimensionType,
    increment: number = 0,
  ): Promise<CheckUsageResult> {
    const currentUsage = this.getCurrentUsage(organizationId, dimension);
    const projectedUsage = currentUsage + increment;
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = this.getDimensionLimit(plan, dimension);

    // Calculate metrics
    const remaining =
      limit !== null ? Math.max(0, limit - projectedUsage) : null;
    const percentage =
      limit !== null ? Math.min(100, (projectedUsage / limit) * 100) : null;
    const alertLevel =
      percentage !== null ? getAlertLevel(percentage) : "normal";

    // Determine action based on overage config
    const overageConfig = this.getOverageConfig(organizationId, dimension);
    let action: "allow" | "warn" | "block" = "allow";
    let reason: string | undefined;

    if (limit !== null && projectedUsage > limit) {
      switch (overageConfig.strategy) {
        case "block":
          action = "block";
          reason = `Usage would exceed limit of ${limit} ${DEFAULT_DIMENSION_CONFIGS[dimension].unit}`;
          break;
        case "soft_block":
          // Check if in grace period
          action = "block";
          reason = "Soft block: grace period check needed";
          break;
        case "warn":
          action = "warn";
          reason = `Usage exceeds limit of ${limit} ${DEFAULT_DIMENSION_CONFIGS[dimension].unit}`;
          break;
        case "charge":
        default:
          action = "allow";
          break;
      }

      // Check hard cap
      if (overageConfig.hardCap && projectedUsage > overageConfig.hardCap) {
        action = "block";
        reason = `Hard cap of ${overageConfig.hardCap} ${DEFAULT_DIMENSION_CONFIGS[dimension].unit} reached`;
      }

      // Check max overage
      if (
        overageConfig.maxOverage !== null &&
        projectedUsage - limit > overageConfig.maxOverage
      ) {
        action = "block";
        reason = `Maximum overage of ${overageConfig.maxOverage} ${DEFAULT_DIMENSION_CONFIGS[dimension].unit} exceeded`;
      }
    } else if (alertLevel === "critical" || alertLevel === "warning") {
      action = "warn";
    }

    return {
      withinLimit: limit === null || projectedUsage <= limit,
      currentUsage: projectedUsage,
      limit,
      remaining,
      percentage,
      alertLevel,
      action,
      reason,
      upgradeRequired:
        alertLevel === "exceeded" ? this.getSuggestedUpgrade(plan) : undefined,
    };
  }

  /**
   * Get current usage for a dimension.
   */
  getCurrentUsage(
    organizationId: string,
    dimension: UsageDimensionType,
  ): number {
    const orgUsage = this.currentUsage.get(organizationId);
    if (!orgUsage) return 0;
    return orgUsage.get(dimension) || 0;
  }

  /**
   * Get all current usage for an organization.
   */
  getAllCurrentUsage(
    organizationId: string,
  ): Record<UsageDimensionType, number> {
    const result = {} as Record<UsageDimensionType, number>;
    for (const dimension of Object.keys(
      DEFAULT_DIMENSION_CONFIGS,
    ) as UsageDimensionType[]) {
      result[dimension] = this.getCurrentUsage(organizationId, dimension);
    }
    return result;
  }

  /**
   * Get usage snapshot for an organization.
   */
  async getUsageSnapshot(organizationId: string): Promise<UsageSnapshot> {
    const plan = await this.getOrganizationPlan(organizationId);
    const billingPeriod = this.getBillingPeriodForOrg(organizationId);
    const dimensions = {} as Record<UsageDimensionType, DimensionSnapshot>;

    for (const dimension of Object.keys(
      DEFAULT_DIMENSION_CONFIGS,
    ) as UsageDimensionType[]) {
      const config = DEFAULT_DIMENSION_CONFIGS[dimension];
      const currentUsage = this.getCurrentUsage(organizationId, dimension);
      const limit = this.getDimensionLimit(plan, dimension);
      const freeTierAllowance = config.freeTierAllowance || 0;
      const billableUsage = Math.max(0, currentUsage - freeTierAllowance);
      const usagePercentage =
        limit !== null ? (currentUsage / limit) * 100 : null;
      const remainingQuota =
        limit !== null ? Math.max(0, limit - currentUsage) : null;

      // Calculate projections
      let projectedUsage: number | null = null;
      let projectedOverage: number | null = null;

      if (
        this.config.projectionsEnabled &&
        billingPeriod.progressPercentage > 0
      ) {
        const dailyRate = currentUsage / Math.max(1, billingPeriod.daysElapsed);
        projectedUsage = dailyRate * billingPeriod.daysInPeriod;
        if (limit !== null) {
          projectedOverage = Math.max(0, projectedUsage - limit);
        }
      }

      dimensions[dimension] = {
        dimension,
        currentUsage,
        limit,
        freeTierAllowance,
        billableUsage,
        usagePercentage,
        remainingQuota,
        alertStatus:
          usagePercentage !== null ? getAlertLevel(usagePercentage) : "normal",
        projectedUsage,
        projectedOverage,
      };
    }

    return {
      organizationId,
      timestamp: new Date(),
      dimensions,
      billingPeriod,
    };
  }

  // ==========================================================================
  // Aggregation
  // ==========================================================================

  /**
   * Aggregate usage for a billing period.
   */
  async aggregateUsage(
    organizationId: string,
    billingPeriodId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Map<UsageDimensionType, AggregatedUsage>> {
    const result = new Map<UsageDimensionType, AggregatedUsage>();

    // Get events for this period
    const periodEvents = Array.from(this.events.values()).filter(
      (e) =>
        e.organizationId === organizationId &&
        e.timestamp >= periodStart &&
        e.timestamp < periodEnd,
    );

    // Group by dimension
    const byDimension = new Map<UsageDimensionType, UsageEvent[]>();
    for (const event of periodEvents) {
      const existing = byDimension.get(event.dimension) || [];
      existing.push(event);
      byDimension.set(event.dimension, existing);
    }

    // Aggregate each dimension
    for (const [dimension, events] of byDimension) {
      const config = DEFAULT_DIMENSION_CONFIGS[dimension];
      const quantities = events.map((e) => e.quantity);

      let totalUsage: number;
      switch (config.aggregationMethod) {
        case "sum":
          totalUsage = quantities.reduce((a, b) => a + b, 0);
          break;
        case "max":
          totalUsage = Math.max(...quantities, 0);
          break;
        case "average":
          totalUsage =
            quantities.length > 0
              ? quantities.reduce((a, b) => a + b, 0) / quantities.length
              : 0;
          break;
        case "last":
          totalUsage =
            quantities.length > 0 ? quantities[quantities.length - 1] : 0;
          break;
        case "count":
          totalUsage = quantities.length;
          break;
        default:
          totalUsage = quantities.reduce((a, b) => a + b, 0);
      }

      const freeTierAllowance = config.freeTierAllowance || 0;
      const billableUsage = Math.max(0, totalUsage - freeTierAllowance);

      const aggregated: AggregatedUsage = {
        dimension,
        organizationId,
        billingPeriodId,
        periodStart,
        periodEnd,
        totalUsage,
        eventCount: events.length,
        peakUsage: quantities.length > 0 ? Math.max(...quantities) : 0,
        averageUsage:
          quantities.length > 0
            ? quantities.reduce((a, b) => a + b, 0) / quantities.length
            : 0,
        billableUsage,
        updatedAt: new Date(),
      };

      result.set(dimension, aggregated);

      // Store aggregation
      const key = `${organizationId}:${billingPeriodId}:${dimension}`;
      this.aggregatedUsage.set(key, aggregated);
    }

    // Emit aggregation event
    this.emitEvent({
      type: "usage.aggregated",
      organizationId,
      data: {
        billingPeriodId,
        dimensions: Array.from(result.keys()),
        eventCount: periodEvents.length,
      },
      timestamp: new Date(),
      eventId: `agg_${Date.now()}`,
    });

    return result;
  }

  /**
   * Get aggregated usage for a period.
   */
  getAggregatedUsage(
    organizationId: string,
    billingPeriodId: string,
    dimension: UsageDimensionType,
  ): AggregatedUsage | null {
    const key = `${organizationId}:${billingPeriodId}:${dimension}`;
    return this.aggregatedUsage.get(key) || null;
  }

  // ==========================================================================
  // Alerts and Thresholds
  // ==========================================================================

  /**
   * Configure thresholds for a dimension.
   */
  setThresholdConfig(
    organizationId: string,
    dimension: UsageDimensionType,
    config: Partial<UsageThresholdConfig>,
  ): void {
    let orgThresholds = this.thresholdConfigs.get(organizationId);
    if (!orgThresholds) {
      orgThresholds = new Map();
      this.thresholdConfigs.set(organizationId, orgThresholds);
    }

    const existing = orgThresholds.get(dimension) || {
      dimension,
      ...DEFAULT_THRESHOLDS,
    };

    orgThresholds.set(dimension, { ...existing, ...config, dimension });
  }

  /**
   * Get threshold config for a dimension.
   */
  getThresholdConfig(
    organizationId: string,
    dimension: UsageDimensionType,
  ): UsageThresholdConfig {
    const orgThresholds = this.thresholdConfigs.get(organizationId);
    return (
      orgThresholds?.get(dimension) || {
        dimension,
        ...DEFAULT_THRESHOLDS,
      }
    );
  }

  /**
   * Configure overage handling for a dimension.
   */
  setOverageConfig(
    organizationId: string,
    dimension: UsageDimensionType,
    config: Partial<OverageConfig>,
  ): void {
    let orgOverages = this.overageConfigs.get(organizationId);
    if (!orgOverages) {
      orgOverages = new Map();
      this.overageConfigs.set(organizationId, orgOverages);
    }

    const existing = orgOverages.get(dimension) || {
      dimension,
      ...DEFAULT_OVERAGE_CONFIG,
    };

    orgOverages.set(dimension, { ...existing, ...config, dimension });
  }

  /**
   * Get overage config for a dimension.
   */
  getOverageConfig(
    organizationId: string,
    dimension: UsageDimensionType,
  ): OverageConfig {
    const orgOverages = this.overageConfigs.get(organizationId);
    return (
      orgOverages?.get(dimension) || {
        dimension,
        ...DEFAULT_OVERAGE_CONFIG,
      }
    );
  }

  /**
   * Get active alerts for an organization.
   */
  getActiveAlerts(organizationId: string): UsageAlert[] {
    return (this.alerts.get(organizationId) || []).filter((a) => a.isActive);
  }

  /**
   * Acknowledge an alert.
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    for (const [, orgAlerts] of this.alerts) {
      const alert = orgAlerts.find((a) => a.id === alertId);
      if (alert) {
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = userId;
        return true;
      }
    }
    return false;
  }

  /**
   * Check and emit alerts if thresholds are crossed.
   */
  private async checkAndEmitAlerts(
    organizationId: string,
    dimension: UsageDimensionType,
  ): Promise<UsageAlert | null> {
    if (!this.config.alertsEnabled) return null;

    const currentUsage = this.getCurrentUsage(organizationId, dimension);
    const plan = await this.getOrganizationPlan(organizationId);
    const limit = this.getDimensionLimit(plan, dimension);

    if (limit === null) return null; // No limit, no alert

    const percentage = (currentUsage / limit) * 100;
    const level = getAlertLevel(percentage);
    const thresholdConfig = this.getThresholdConfig(organizationId, dimension);

    // Get current alerts for this dimension
    let orgAlerts = this.alerts.get(organizationId);
    if (!orgAlerts) {
      orgAlerts = [];
      this.alerts.set(organizationId, orgAlerts);
    }

    const existingAlert = orgAlerts.find(
      (a) => a.dimension === dimension && a.isActive && a.level === level,
    );

    // Don't create duplicate alerts
    if (existingAlert) return null;

    // Check if we should create an alert
    if (level === "normal") return null;

    // Create new alert
    const alert: UsageAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      organizationId,
      dimension,
      level,
      currentUsage,
      limit,
      percentage,
      message: this.getAlertMessage(dimension, level, currentUsage, limit),
      createdAt: new Date(),
      isActive: true,
      notifications: {
        emailSent: false,
        inAppSent: false,
        webhookSent: false,
      },
    };

    orgAlerts.push(alert);

    // Emit appropriate event
    const eventType: UsageBillingEventType =
      level === "exceeded"
        ? "usage.limit_exceeded"
        : level === "critical"
          ? "usage.threshold_critical"
          : "usage.threshold_warning";

    this.emitEvent({
      type: eventType,
      organizationId,
      dimension,
      data: {
        alertId: alert.id,
        level,
        currentUsage,
        limit,
        percentage,
      },
      timestamp: new Date(),
      eventId: alert.id,
    });

    return alert;
  }

  /**
   * Generate alert message.
   */
  private getAlertMessage(
    dimension: UsageDimensionType,
    level: UsageAlertLevel,
    currentUsage: number,
    limit: number,
  ): string {
    const config = DEFAULT_DIMENSION_CONFIGS[dimension];
    const displayUsage = currentUsage / config.unitDivisor;
    const displayLimit = limit / config.unitDivisor;
    const percentage = Math.round((currentUsage / limit) * 100);

    switch (level) {
      case "info":
        return `${config.name} usage at ${percentage}% (${displayUsage.toFixed(1)}/${displayLimit.toFixed(1)} ${config.unit})`;
      case "warning":
        return `Warning: ${config.name} usage approaching limit at ${percentage}% (${displayUsage.toFixed(1)}/${displayLimit.toFixed(1)} ${config.unit})`;
      case "critical":
        return `Critical: ${config.name} usage at ${percentage}% (${displayUsage.toFixed(1)}/${displayLimit.toFixed(1)} ${config.unit}). Consider upgrading.`;
      case "exceeded":
        return `Limit exceeded: ${config.name} usage at ${percentage}% (${displayUsage.toFixed(1)}/${displayLimit.toFixed(1)} ${config.unit}). Upgrade required.`;
      default:
        return `${config.name} usage: ${displayUsage.toFixed(1)}/${displayLimit.toFixed(1)} ${config.unit}`;
    }
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to usage events.
   */
  on(
    eventType: UsageBillingEventType,
    listener: UsageEventListener,
  ): () => void {
    let listeners = this.eventListeners.get(eventType);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(eventType, listeners);
    }
    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
    };
  }

  /**
   * Emit a usage event.
   */
  private emitEvent(event: UsageBillingEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          const result = listener(event);
          if (result instanceof Promise) {
            result.catch((err) => logger.error("Event listener error:", err));
          }
        } catch (err) {
          logger.error("Event listener error:", err);
        }
      }
    }
  }

  // ==========================================================================
  // Period Reset
  // ==========================================================================

  /**
   * Reset usage for a new billing period.
   */
  async resetPeriodUsage(
    organizationId: string,
    newPeriodId: string,
  ): Promise<void> {
    // Get dimensions that reset on billing period
    const dimensionsToReset = Object.entries(DEFAULT_DIMENSION_CONFIGS)
      .filter(([, config]) => config.resetBehavior === "billing_period")
      .map(([key]) => key as UsageDimensionType);

    const orgUsage = this.currentUsage.get(organizationId);
    if (orgUsage) {
      for (const dimension of dimensionsToReset) {
        orgUsage.set(dimension, 0);
      }
    }

    // Deactivate old alerts
    const orgAlerts = this.alerts.get(organizationId);
    if (orgAlerts) {
      for (const alert of orgAlerts) {
        if (dimensionsToReset.includes(alert.dimension)) {
          alert.isActive = false;
        }
      }
    }

    // Emit period reset event
    this.emitEvent({
      type: "usage.period_reset",
      organizationId,
      data: {
        newPeriodId,
        dimensionsReset: dimensionsToReset,
      },
      timestamp: new Date(),
      eventId: `reset_${Date.now()}`,
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Update current usage tracking.
   */
  private updateCurrentUsage(
    organizationId: string,
    dimension: UsageDimensionType,
    quantity: number,
  ): void {
    let orgUsage = this.currentUsage.get(organizationId);
    if (!orgUsage) {
      orgUsage = new Map();
      this.currentUsage.set(organizationId, orgUsage);
    }

    const config = DEFAULT_DIMENSION_CONFIGS[dimension];
    const current = orgUsage.get(dimension) || 0;

    // Apply aggregation method for current tracking
    let newValue: number;
    switch (config.aggregationMethod) {
      case "max":
        newValue = Math.max(current, quantity);
        break;
      case "last":
        newValue = quantity;
        break;
      default:
        newValue = current + quantity;
    }

    orgUsage.set(dimension, Math.max(0, newValue));
  }

  /**
   * Get organization's plan tier.
   */
  private async getOrganizationPlan(organizationId: string): Promise<PlanTier> {
    // Check cache
    const cached = this.planCache.get(organizationId);
    if (
      cached &&
      Date.now() - cached.cachedAt < this.config.cacheTtlSeconds * 1000
    ) {
      return cached.tier;
    }

    // Default to free tier - in production this would query the database
    const tier: PlanTier = "free";

    // Cache result
    this.planCache.set(organizationId, { tier, cachedAt: Date.now() });

    return tier;
  }

  /**
   * Set organization's plan tier (for testing/initialization).
   */
  setOrganizationPlan(organizationId: string, tier: PlanTier): void {
    this.planCache.set(organizationId, { tier, cachedAt: Date.now() });
  }

  /**
   * Get dimension limit for a plan.
   */
  private getDimensionLimit(
    plan: PlanTier,
    dimension: UsageDimensionType,
  ): number | null {
    const planLimits = PLAN_LIMITS[plan];

    switch (dimension) {
      case "storage":
        return planLimits.maxStorageBytes;
      case "seats":
        return planLimits.maxMembers;
      case "api_calls":
        return planLimits.maxApiCallsPerMonth;
      case "video_minutes":
        return planLimits.maxStreamDurationMinutes;
      default:
        return null;
    }
  }

  /**
   * Get suggested upgrade tier.
   */
  private getSuggestedUpgrade(currentPlan: PlanTier): PlanTier {
    const tierOrder: PlanTier[] = [
      "free",
      "starter",
      "professional",
      "enterprise",
    ];
    const currentIndex = tierOrder.indexOf(currentPlan);

    if (currentIndex >= 0 && currentIndex < tierOrder.length - 1) {
      return tierOrder[currentIndex + 1];
    }

    return "enterprise";
  }

  /**
   * Get billing period for organization.
   */
  private getBillingPeriodForOrg(organizationId: string): BillingPeriodInfo {
    // Default to current month - in production would get from subscription
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return calculateBillingPeriod(startOfMonth, "monthly", now);
  }

  /**
   * Start aggregation timer.
   */
  private startAggregationTimer(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    this.aggregationTimer = setInterval(() => {
      this.runPeriodicAggregation();
    }, this.config.aggregationIntervalMs);
  }

  /**
   * Run periodic aggregation for all organizations.
   */
  private async runPeriodicAggregation(): Promise<void> {
    const orgs = new Set<string>();
    for (const event of this.events.values()) {
      if (!event.processed) {
        orgs.add(event.organizationId);
      }
    }

    for (const orgId of orgs) {
      const period = this.getBillingPeriodForOrg(orgId);
      await this.aggregateUsage(
        orgId,
        period.id,
        period.startDate,
        period.endDate,
      );
    }

    // Mark events as processed
    for (const event of this.events.values()) {
      if (!event.processed) {
        event.processed = true;
        event.processedAt = new Date();
      }
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Clean up old events.
   */
  cleanupOldEvents(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.eventRetentionDays);

    let deleted = 0;
    for (const [id, event] of this.events) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
        this.processedIdempotencyKeys.delete(event.idempotencyKey);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Stop the tracker and cleanup.
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    this.events.clear();
    this.aggregatedUsage.clear();
    this.currentUsage.clear();
    this.alerts.clear();
    this.processedIdempotencyKeys.clear();
    this.eventListeners.clear();
    this.planCache.clear();
    this.thresholdConfigs.clear();
    this.overageConfigs.clear();
  }

  /**
   * Get statistics about the tracker.
   */
  getStats(): {
    eventCount: number;
    aggregationCount: number;
    organizationCount: number;
    alertCount: number;
    processedKeyCount: number;
  } {
    return {
      eventCount: this.events.size,
      aggregationCount: this.aggregatedUsage.size,
      organizationCount: this.currentUsage.size,
      alertCount: Array.from(this.alerts.values()).reduce(
        (sum, a) => sum + a.length,
        0,
      ),
      processedKeyCount: this.processedIdempotencyKeys.size,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let usageTracker: UsageTracker | null = null;

export function getUsageTracker(
  config?: Partial<UsageTrackerConfig>,
): UsageTracker {
  if (!usageTracker) {
    usageTracker = new UsageTracker(config);
  }
  return usageTracker;
}

export function createUsageTracker(
  config?: Partial<UsageTrackerConfig>,
): UsageTracker {
  return new UsageTracker(config);
}

export function resetUsageTracker(): void {
  if (usageTracker) {
    usageTracker.destroy();
    usageTracker = null;
  }
}
