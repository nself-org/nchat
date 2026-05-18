/**
 * Subscription Manager - Handles subscription plan management
 *
 * Manages plan tiers (free, pro, enterprise), usage tracking,
 * billing cycle management, and feature access control.
 */

// ============================================================================
// Types
// ============================================================================

export type PlanTier = "free" | "pro" | "enterprise";

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: BillingInterval;
  features: PlanFeature[];
  stripePriceId: string;
  isPopular?: boolean;
  trialDays?: number;
}

export type BillingInterval = "month" | "year";

export interface UsageMetric {
  id: string;
  name: string;
  current: number;
  limit: number;
  unit: string;
  resetDate?: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "paused";

export interface BillingCycle {
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  totalDays: number;
  percentComplete: number;
}

export interface UpgradePreview {
  currentPlan: Plan;
  newPlan: Plan;
  proratedAmount: number;
  immediateCharge: number;
  nextBillingAmount: number;
  nextBillingDate: Date;
}

export interface UsageRecord {
  metricId: string;
  quantity: number;
  timestamp: Date;
  action: "increment" | "decrement" | "set";
}

export interface FeatureAccess {
  featureId: string;
  hasAccess: boolean;
  limit?: number;
  currentUsage?: number;
  upgradeRequired?: PlanTier;
}

// ============================================================================
// Default Plans
// ============================================================================

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan_free",
    tier: "free",
    name: "Free",
    description: "Get started with basic features",
    price: 0,
    currency: "usd",
    interval: "month",
    stripePriceId: "price_free",
    features: [
      {
        id: "channels",
        name: "Public Channels",
        description: "Create public channels",
        included: true,
        limit: 5,
      },
      {
        id: "members",
        name: "Team Members",
        description: "Invite team members",
        included: true,
        limit: 10,
      },
      {
        id: "storage",
        name: "File Storage",
        description: "Store files and media",
        included: true,
        limit: 100,
      },
      {
        id: "messages",
        name: "Message History",
        description: "Access message history",
        included: true,
        limit: 10000,
      },
      {
        id: "integrations",
        name: "Integrations",
        description: "Connect third-party apps",
        included: false,
      },
      {
        id: "analytics",
        name: "Analytics",
        description: "View usage analytics",
        included: false,
      },
      {
        id: "sso",
        name: "SSO",
        description: "Single sign-on",
        included: false,
      },
      {
        id: "support",
        name: "Priority Support",
        description: "24/7 priority support",
        included: false,
      },
    ],
  },
  {
    id: "plan_pro",
    tier: "pro",
    name: "Pro",
    description: "Perfect for growing teams",
    price: 2999,
    currency: "usd",
    interval: "month",
    stripePriceId: "price_pro_monthly",
    isPopular: true,
    trialDays: 14,
    features: [
      {
        id: "channels",
        name: "Unlimited Channels",
        description: "Create unlimited channels",
        included: true,
      },
      {
        id: "members",
        name: "Team Members",
        description: "Invite team members",
        included: true,
        limit: 100,
      },
      {
        id: "storage",
        name: "File Storage",
        description: "Store files and media",
        included: true,
        limit: 10000,
      },
      {
        id: "messages",
        name: "Unlimited History",
        description: "Access full message history",
        included: true,
      },
      {
        id: "integrations",
        name: "Integrations",
        description: "Connect third-party apps",
        included: true,
        limit: 10,
      },
      {
        id: "analytics",
        name: "Basic Analytics",
        description: "View usage analytics",
        included: true,
      },
      {
        id: "sso",
        name: "SSO",
        description: "Single sign-on",
        included: false,
      },
      {
        id: "support",
        name: "Priority Support",
        description: "24/7 priority support",
        included: false,
      },
    ],
  },
  {
    id: "plan_enterprise",
    tier: "enterprise",
    name: "Enterprise",
    description: "Advanced features for large organizations",
    price: 9999,
    currency: "usd",
    interval: "month",
    stripePriceId: "price_enterprise_monthly",
    isPopular: false,
    trialDays: 30,
    features: [
      {
        id: "channels",
        name: "Unlimited Channels",
        description: "Create unlimited channels",
        included: true,
      },
      {
        id: "members",
        name: "Unlimited Members",
        description: "Invite unlimited members",
        included: true,
      },
      {
        id: "storage",
        name: "Unlimited Storage",
        description: "Store unlimited files",
        included: true,
      },
      {
        id: "messages",
        name: "Unlimited History",
        description: "Access full message history",
        included: true,
      },
      {
        id: "integrations",
        name: "Unlimited Integrations",
        description: "Connect unlimited apps",
        included: true,
      },
      {
        id: "analytics",
        name: "Advanced Analytics",
        description: "Advanced usage analytics",
        included: true,
      },
      { id: "sso", name: "SSO", description: "Single sign-on", included: true },
      {
        id: "support",
        name: "Priority Support",
        description: "24/7 priority support",
        included: true,
      },
    ],
  },
];

// ============================================================================
// Subscription Manager Class
// ============================================================================

export class SubscriptionManager {
  private plans: Plan[];
  private subscriptions: Map<string, UserSubscription> = new Map();
  private usage: Map<string, Map<string, UsageMetric>> = new Map();

  constructor(plans: Plan[] = DEFAULT_PLANS) {
    // Deep copy plans to avoid mutating the original array
    this.plans = plans.map((plan) => ({
      ...plan,
      features: [...plan.features],
    }));
  }

  // ==========================================================================
  // Plan Methods
  // ==========================================================================

  /**
   * Get all available plans
   */
  getPlans(): Plan[] {
    return [...this.plans];
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): Plan | null {
    return this.plans.find((p) => p.id === planId) ?? null;
  }

  /**
   * Get a plan by tier
   */
  getPlanByTier(tier: PlanTier): Plan | null {
    return this.plans.find((p) => p.tier === tier) ?? null;
  }

  /**
   * Get the free plan
   */
  getFreePlan(): Plan {
    const plan = this.getPlanByTier("free");
    if (!plan) {
      throw new Error("Free plan not configured");
    }
    return plan;
  }

  /**
   * Check if a tier is higher than another
   */
  isTierHigher(tier: PlanTier, compareTo: PlanTier): boolean {
    const tierOrder: Record<PlanTier, number> = {
      free: 0,
      pro: 1,
      enterprise: 2,
    };
    return tierOrder[tier] > tierOrder[compareTo];
  }

  /**
   * Get the next higher tier
   */
  getNextTier(currentTier: PlanTier): PlanTier | null {
    const tierOrder: PlanTier[] = ["free", "pro", "enterprise"];
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }
    return tierOrder[currentIndex + 1];
  }

  /**
   * Add a custom plan
   */
  addPlan(plan: Plan): void {
    if (this.plans.some((p) => p.id === plan.id)) {
      throw new Error(`Plan with ID ${plan.id} already exists`);
    }
    this.plans.push(plan);
  }

  /**
   * Remove a plan
   */
  removePlan(planId: string): boolean {
    const index = this.plans.findIndex((p) => p.id === planId);
    if (index === -1) {
      return false;
    }
    this.plans.splice(index, 1);
    return true;
  }

  // ==========================================================================
  // Subscription Methods
  // ==========================================================================

  /**
   * Create a subscription for a user
   */
  createSubscription(
    userId: string,
    planId: string,
    options: {
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
      startTrial?: boolean;
    } = {},
  ): UserSubscription {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(
      periodEnd.getMonth() + (plan.interval === "month" ? 1 : 12),
    );

    let trialEnd: Date | undefined;
    if (options.startTrial && plan.trialDays) {
      trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
    }

    const subscription: UserSubscription = {
      id: `sub_${this.generateId()}`,
      userId,
      planId,
      tier: plan.tier,
      status: trialEnd ? "trialing" : "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      trialEnd,
      stripeSubscriptionId: options.stripeSubscriptionId,
      stripeCustomerId: options.stripeCustomerId,
    };

    this.subscriptions.set(userId, subscription);
    this.initializeUsage(userId, plan);

    return subscription;
  }

  /**
   * Get a user's subscription
   */
  getSubscription(userId: string): UserSubscription | null {
    return this.subscriptions.get(userId) ?? null;
  }

  /**
   * Update a subscription
   */
  updateSubscription(
    userId: string,
    updates: Partial<
      Pick<
        UserSubscription,
        "status" | "cancelAtPeriodEnd" | "currentPeriodEnd"
      >
    >,
  ): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const updated = {
      ...subscription,
      ...updates,
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  /**
   * Cancel a subscription
   */
  cancelSubscription(
    userId: string,
    immediately: boolean = false,
  ): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    if (immediately) {
      const updated: UserSubscription = {
        ...subscription,
        status: "canceled",
        cancelAtPeriodEnd: false,
      };
      this.subscriptions.set(userId, updated);
      return updated;
    }

    const updated: UserSubscription = {
      ...subscription,
      cancelAtPeriodEnd: true,
    };
    this.subscriptions.set(userId, updated);
    return updated;
  }

  /**
   * Reactivate a canceled subscription
   */
  reactivateSubscription(userId: string): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status === "canceled") {
      return null;
    }

    const updated: UserSubscription = {
      ...subscription,
      cancelAtPeriodEnd: false,
    };
    this.subscriptions.set(userId, updated);
    return updated;
  }

  /**
   * Upgrade a subscription to a new plan
   */
  upgradeSubscription(
    userId: string,
    newPlanId: string,
  ): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) {
      return null;
    }

    const currentPlan = this.getPlan(subscription.planId);
    if (!currentPlan || !this.isTierHigher(newPlan.tier, currentPlan.tier)) {
      return null;
    }

    const updated: UserSubscription = {
      ...subscription,
      planId: newPlanId,
      tier: newPlan.tier,
      cancelAtPeriodEnd: false,
    };

    this.subscriptions.set(userId, updated);
    this.initializeUsage(userId, newPlan);

    return updated;
  }

  /**
   * Downgrade a subscription to a new plan
   */
  downgradeSubscription(
    userId: string,
    newPlanId: string,
  ): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) {
      return null;
    }

    const currentPlan = this.getPlan(subscription.planId);
    if (!currentPlan || this.isTierHigher(newPlan.tier, currentPlan.tier)) {
      return null;
    }

    // Downgrade takes effect at period end
    const updated: UserSubscription = {
      ...subscription,
      // Note: planId changes at period end in real implementation
    };

    this.subscriptions.set(userId, updated);
    return updated;
  }

  /**
   * Preview an upgrade
   */
  previewUpgrade(userId: string, newPlanId: string): UpgradePreview | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const currentPlan = this.getPlan(subscription.planId);
    const newPlan = this.getPlan(newPlanId);

    if (!currentPlan || !newPlan) {
      return null;
    }

    const billingCycle = this.getBillingCycle(userId);
    if (!billingCycle) {
      return null;
    }

    // Calculate prorated amount
    const remainingDays = billingCycle.daysRemaining;
    const dailyRateCurrent = currentPlan.price / billingCycle.totalDays;
    const dailyRateNew = newPlan.price / billingCycle.totalDays;
    const creditRemaining = Math.round(dailyRateCurrent * remainingDays);
    const chargeRemaining = Math.round(dailyRateNew * remainingDays);
    const proratedAmount = chargeRemaining - creditRemaining;

    return {
      currentPlan,
      newPlan,
      proratedAmount: Math.max(0, proratedAmount),
      immediateCharge: Math.max(0, proratedAmount),
      nextBillingAmount: newPlan.price,
      nextBillingDate: subscription.currentPeriodEnd,
    };
  }

  // ==========================================================================
  // Billing Cycle Methods
  // ==========================================================================

  /**
   * Get billing cycle information for a user
   */
  getBillingCycle(userId: string): BillingCycle | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const now = new Date();
    const start = subscription.currentPeriodStart;
    const end = subscription.currentPeriodEnd;

    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    const remainingMs = end.getTime() - now.getTime();

    const totalDays = Math.ceil(totalMs / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(
      0,
      Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    );
    const percentComplete = Math.min(
      100,
      Math.max(0, (elapsedMs / totalMs) * 100),
    );

    return {
      startDate: start,
      endDate: end,
      daysRemaining,
      totalDays,
      percentComplete: Math.round(percentComplete),
    };
  }

  /**
   * Check if subscription is in trial
   */
  isInTrial(userId: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.trialEnd) {
      return false;
    }
    return (
      subscription.status === "trialing" && new Date() < subscription.trialEnd
    );
  }

  /**
   * Get days remaining in trial
   */
  getTrialDaysRemaining(userId: string): number {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.trialEnd) {
      return 0;
    }

    const now = new Date();
    if (now >= subscription.trialEnd) {
      return 0;
    }

    const remainingMs = subscription.trialEnd.getTime() - now.getTime();
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Renew a subscription
   */
  renewSubscription(userId: string): UserSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    const plan = this.getPlan(subscription.planId);
    if (!plan) {
      return null;
    }

    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = new Date(newPeriodStart);
    newPeriodEnd.setMonth(
      newPeriodEnd.getMonth() + (plan.interval === "month" ? 1 : 12),
    );

    const updated: UserSubscription = {
      ...subscription,
      status: "active",
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      trialEnd: undefined,
    };

    this.subscriptions.set(userId, updated);
    this.resetUsage(userId);

    return updated;
  }

  // ==========================================================================
  // Usage Methods
  // ==========================================================================

  /**
   * Initialize usage metrics for a user
   */
  private initializeUsage(userId: string, plan: Plan): void {
    const metrics = new Map<string, UsageMetric>();

    for (const feature of plan.features) {
      if (feature.limit !== undefined) {
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1);

        metrics.set(feature.id, {
          id: feature.id,
          name: feature.name,
          current: 0,
          limit: feature.limit,
          unit: this.getMetricUnit(feature.id),
          resetDate,
        });
      }
    }

    this.usage.set(userId, metrics);
  }

  /**
   * Get usage metrics for a user
   */
  getUsage(userId: string): UsageMetric[] {
    const metrics = this.usage.get(userId);
    if (!metrics) {
      return [];
    }
    return Array.from(metrics.values());
  }

  /**
   * Get a specific usage metric
   */
  getUsageMetric(userId: string, metricId: string): UsageMetric | null {
    const metrics = this.usage.get(userId);
    if (!metrics) {
      return null;
    }
    return metrics.get(metricId) ?? null;
  }

  /**
   * Record usage
   */
  recordUsage(userId: string, record: UsageRecord): UsageMetric | null {
    const metrics = this.usage.get(userId);
    if (!metrics) {
      return null;
    }

    const metric = metrics.get(record.metricId);
    if (!metric) {
      return null;
    }

    let newValue: number;
    switch (record.action) {
      case "increment":
        newValue = metric.current + record.quantity;
        break;
      case "decrement":
        newValue = Math.max(0, metric.current - record.quantity);
        break;
      case "set":
        newValue = record.quantity;
        break;
    }

    const updated: UsageMetric = {
      ...metric,
      current: newValue,
    };

    metrics.set(record.metricId, updated);
    return updated;
  }

  /**
   * Check if usage is within limits
   */
  isWithinLimits(
    userId: string,
    metricId: string,
    additionalUsage: number = 0,
  ): boolean {
    const metric = this.getUsageMetric(userId, metricId);
    if (!metric) {
      return true; // No limit defined
    }
    return metric.current + additionalUsage <= metric.limit;
  }

  /**
   * Get remaining usage for a metric
   */
  getRemainingUsage(userId: string, metricId: string): number {
    const metric = this.getUsageMetric(userId, metricId);
    if (!metric) {
      return Infinity;
    }
    return Math.max(0, metric.limit - metric.current);
  }

  /**
   * Get usage percentage for a metric
   */
  getUsagePercentage(userId: string, metricId: string): number {
    const metric = this.getUsageMetric(userId, metricId);
    if (!metric || metric.limit === 0) {
      return 0;
    }
    return Math.min(100, Math.round((metric.current / metric.limit) * 100));
  }

  /**
   * Reset usage for a user
   */
  resetUsage(userId: string): void {
    const metrics = this.usage.get(userId);
    if (!metrics) {
      return;
    }

    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    for (const [id, metric] of metrics) {
      metrics.set(id, {
        ...metric,
        current: 0,
        resetDate,
      });
    }
  }

  // ==========================================================================
  // Feature Access Methods
  // ==========================================================================

  /**
   * Check if a user has access to a feature
   */
  hasFeatureAccess(userId: string, featureId: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      // Check free plan features
      const freePlan = this.getFreePlan();
      const feature = freePlan.features.find((f) => f.id === featureId);
      return feature?.included ?? false;
    }

    const plan = this.getPlan(subscription.planId);
    if (!plan) {
      return false;
    }

    const feature = plan.features.find((f) => f.id === featureId);
    return feature?.included ?? false;
  }

  /**
   * Get detailed feature access information
   */
  getFeatureAccess(userId: string, featureId: string): FeatureAccess {
    const subscription = this.subscriptions.get(userId);
    const currentTier = subscription?.tier ?? "free";
    const plan = subscription
      ? this.getPlan(subscription.planId)
      : this.getFreePlan();

    if (!plan) {
      return {
        featureId,
        hasAccess: false,
        upgradeRequired: "pro",
      };
    }

    const feature = plan.features.find((f) => f.id === featureId);
    if (!feature) {
      return {
        featureId,
        hasAccess: false,
        upgradeRequired: this.getNextTier(currentTier) ?? undefined,
      };
    }

    const metric = this.getUsageMetric(userId, featureId);

    return {
      featureId,
      hasAccess: feature.included,
      limit: feature.limit,
      currentUsage: metric?.current,
      upgradeRequired: feature.included
        ? undefined
        : (this.getNextTier(currentTier) ?? undefined),
    };
  }

  /**
   * Get all feature access for a user
   */
  getAllFeatureAccess(userId: string): FeatureAccess[] {
    const subscription = this.subscriptions.get(userId);
    const plan = subscription
      ? this.getPlan(subscription.planId)
      : this.getFreePlan();

    if (!plan) {
      return [];
    }

    return plan.features.map((feature) =>
      this.getFeatureAccess(userId, feature.id),
    );
  }

  /**
   * Get features that require upgrade
   */
  getUpgradeRequiredFeatures(userId: string): FeatureAccess[] {
    return this.getAllFeatureAccess(userId).filter(
      (access) => access.upgradeRequired,
    );
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate a random ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metricId: string): string {
    const units: Record<string, string> = {
      channels: "channels",
      members: "members",
      storage: "MB",
      messages: "messages",
      integrations: "integrations",
    };
    return units[metricId] ?? "units";
  }

  /**
   * Format price for display
   */
  formatPrice(
    price: number,
    currency: string,
    interval?: BillingInterval,
  ): string {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    const formattedPrice = formatter.format(price / 100);
    return interval ? `${formattedPrice}/${interval}` : formattedPrice;
  }

  /**
   * Calculate annual savings
   */
  calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number {
    const monthlyTotal = monthlyPrice * 12;
    return monthlyTotal - annualPrice;
  }

  /**
   * Get annual savings percentage
   */
  getAnnualSavingsPercentage(
    monthlyPrice: number,
    annualPrice: number,
  ): number {
    const savings = this.calculateAnnualSavings(monthlyPrice, annualPrice);
    const monthlyTotal = monthlyPrice * 12;
    if (monthlyTotal === 0) return 0;
    return Math.round((savings / monthlyTotal) * 100);
  }

  /**
   * Clear all subscriptions (for testing)
   */
  clear(): void {
    this.subscriptions.clear();
    this.usage.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let subscriptionManagerInstance: SubscriptionManager | null = null;

/**
 * Get the subscription manager singleton
 */
export function getSubscriptionManager(plans?: Plan[]): SubscriptionManager {
  if (!subscriptionManagerInstance) {
    subscriptionManagerInstance = new SubscriptionManager(plans);
  }
  return subscriptionManagerInstance;
}

/**
 * Reset the subscription manager (for testing)
 */
export function resetSubscriptionManager(): void {
  subscriptionManagerInstance = null;
}
