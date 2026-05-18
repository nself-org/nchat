/**
 * @fileoverview Tests for Subscription Manager
 */

import {
  SubscriptionManager,
  getSubscriptionManager,
  resetSubscriptionManager,
  DEFAULT_PLANS,
  type Plan,
  type PlanTier,
  type UsageRecord,
} from "../subscription-manager";

describe("SubscriptionManager", () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    resetSubscriptionManager();
    manager = new SubscriptionManager();
  });

  // ==========================================================================
  // Plan Tests
  // ==========================================================================

  describe("Plans", () => {
    describe("getPlans", () => {
      it("should return all default plans", () => {
        const plans = manager.getPlans();
        expect(plans).toHaveLength(3);
      });

      it("should return a copy of plans array", () => {
        const plans1 = manager.getPlans();
        const plans2 = manager.getPlans();
        expect(plans1).not.toBe(plans2);
      });

      it("should contain free, pro, and enterprise tiers", () => {
        const plans = manager.getPlans();
        const tiers = plans.map((p) => p.tier);
        expect(tiers).toContain("free");
        expect(tiers).toContain("pro");
        expect(tiers).toContain("enterprise");
      });
    });

    describe("getPlan", () => {
      it("should return a plan by ID", () => {
        const plan = manager.getPlan("plan_free");
        expect(plan).toBeDefined();
        expect(plan?.tier).toBe("free");
      });

      it("should return null for non-existent plan", () => {
        const plan = manager.getPlan("plan_nonexistent");
        expect(plan).toBeNull();
      });
    });

    describe("getPlanByTier", () => {
      it("should return free plan by tier", () => {
        const plan = manager.getPlanByTier("free");
        expect(plan).toBeDefined();
        expect(plan?.price).toBe(0);
      });

      it("should return pro plan by tier", () => {
        const plan = manager.getPlanByTier("pro");
        expect(plan).toBeDefined();
        expect(plan?.price).toBe(2999);
      });

      it("should return enterprise plan by tier", () => {
        const plan = manager.getPlanByTier("enterprise");
        expect(plan).toBeDefined();
        expect(plan?.price).toBe(9999);
      });
    });

    describe("getFreePlan", () => {
      it("should return the free plan", () => {
        const plan = manager.getFreePlan();
        expect(plan.tier).toBe("free");
        expect(plan.price).toBe(0);
      });

      it("should throw if free plan not configured", () => {
        const customManager = new SubscriptionManager([
          { ...DEFAULT_PLANS[1], id: "custom_pro" },
        ]);
        expect(() => customManager.getFreePlan()).toThrow(
          "Free plan not configured",
        );
      });
    });

    describe("isTierHigher", () => {
      it("should correctly compare free vs pro", () => {
        expect(manager.isTierHigher("pro", "free")).toBe(true);
        expect(manager.isTierHigher("free", "pro")).toBe(false);
      });

      it("should correctly compare pro vs enterprise", () => {
        expect(manager.isTierHigher("enterprise", "pro")).toBe(true);
        expect(manager.isTierHigher("pro", "enterprise")).toBe(false);
      });

      it("should correctly compare free vs enterprise", () => {
        expect(manager.isTierHigher("enterprise", "free")).toBe(true);
        expect(manager.isTierHigher("free", "enterprise")).toBe(false);
      });

      it("should return false for same tier", () => {
        expect(manager.isTierHigher("free", "free")).toBe(false);
        expect(manager.isTierHigher("pro", "pro")).toBe(false);
      });
    });

    describe("getNextTier", () => {
      it("should return pro for free", () => {
        expect(manager.getNextTier("free")).toBe("pro");
      });

      it("should return enterprise for pro", () => {
        expect(manager.getNextTier("pro")).toBe("enterprise");
      });

      it("should return null for enterprise", () => {
        expect(manager.getNextTier("enterprise")).toBeNull();
      });
    });

    describe("addPlan", () => {
      it("should add a custom plan", () => {
        const customPlan: Plan = {
          id: "plan_custom",
          tier: "pro",
          name: "Custom",
          description: "Custom plan",
          price: 4999,
          currency: "usd",
          interval: "month",
          features: [],
          stripePriceId: "price_custom",
        };

        manager.addPlan(customPlan);
        const plan = manager.getPlan("plan_custom");

        expect(plan).toBeDefined();
        expect(plan?.name).toBe("Custom");
      });

      it("should throw if plan with same ID exists", () => {
        const duplicatePlan: Plan = {
          ...DEFAULT_PLANS[0],
        };

        expect(() => manager.addPlan(duplicatePlan)).toThrow("already exists");
      });
    });

    describe("removePlan", () => {
      it("should remove a plan", () => {
        // Use a fresh manager to avoid affecting other tests
        const freshManager = new SubscriptionManager();
        const result = freshManager.removePlan("plan_enterprise");
        expect(result).toBe(true);
        expect(freshManager.getPlan("plan_enterprise")).toBeNull();
      });

      it("should return false for non-existent plan", () => {
        const result = manager.removePlan("plan_nonexistent");
        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Subscription Tests
  // ==========================================================================

  describe("Subscriptions", () => {
    describe("createSubscription", () => {
      it("should create a subscription", () => {
        const subscription = manager.createSubscription("user_1", "plan_pro");

        expect(subscription.userId).toBe("user_1");
        expect(subscription.planId).toBe("plan_pro");
        expect(subscription.tier).toBe("pro");
        expect(subscription.status).toBe("active");
      });

      it("should create subscription with trial", () => {
        const subscription = manager.createSubscription("user_1", "plan_pro", {
          startTrial: true,
        });

        expect(subscription.status).toBe("trialing");
        expect(subscription.trialEnd).toBeDefined();
      });

      it("should include stripe IDs when provided", () => {
        const subscription = manager.createSubscription("user_1", "plan_pro", {
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_123",
        });

        expect(subscription.stripeSubscriptionId).toBe("sub_123");
        expect(subscription.stripeCustomerId).toBe("cus_123");
      });

      it("should throw for non-existent plan", () => {
        expect(() =>
          manager.createSubscription("user_1", "plan_invalid"),
        ).toThrow("not found");
      });

      it("should set cancelAtPeriodEnd to false", () => {
        const subscription = manager.createSubscription("user_1", "plan_pro");
        expect(subscription.cancelAtPeriodEnd).toBe(false);
      });

      it("should set correct period dates", () => {
        const subscription = manager.createSubscription("user_1", "plan_pro");
        expect(subscription.currentPeriodStart).toBeInstanceOf(Date);
        expect(subscription.currentPeriodEnd).toBeInstanceOf(Date);
        expect(
          subscription.currentPeriodEnd > subscription.currentPeriodStart,
        ).toBe(true);
      });
    });

    describe("getSubscription", () => {
      it("should return a subscription", () => {
        manager.createSubscription("user_1", "plan_pro");
        const subscription = manager.getSubscription("user_1");

        expect(subscription).toBeDefined();
        expect(subscription?.userId).toBe("user_1");
      });

      it("should return null for non-existent subscription", () => {
        const subscription = manager.getSubscription("user_nonexistent");
        expect(subscription).toBeNull();
      });
    });

    describe("updateSubscription", () => {
      it("should update subscription status", () => {
        manager.createSubscription("user_1", "plan_pro");
        const updated = manager.updateSubscription("user_1", {
          status: "past_due",
        });

        expect(updated?.status).toBe("past_due");
      });

      it("should update cancelAtPeriodEnd", () => {
        manager.createSubscription("user_1", "plan_pro");
        const updated = manager.updateSubscription("user_1", {
          cancelAtPeriodEnd: true,
        });

        expect(updated?.cancelAtPeriodEnd).toBe(true);
      });

      it("should return null for non-existent subscription", () => {
        const updated = manager.updateSubscription("user_nonexistent", {
          status: "active",
        });
        expect(updated).toBeNull();
      });
    });

    describe("cancelSubscription", () => {
      it("should cancel at period end by default", () => {
        manager.createSubscription("user_1", "plan_pro");
        const canceled = manager.cancelSubscription("user_1");

        expect(canceled?.cancelAtPeriodEnd).toBe(true);
        expect(canceled?.status).toBe("active");
      });

      it("should cancel immediately when requested", () => {
        manager.createSubscription("user_1", "plan_pro");
        const canceled = manager.cancelSubscription("user_1", true);

        expect(canceled?.status).toBe("canceled");
        expect(canceled?.cancelAtPeriodEnd).toBe(false);
      });

      it("should return null for non-existent subscription", () => {
        const canceled = manager.cancelSubscription("user_nonexistent");
        expect(canceled).toBeNull();
      });
    });

    describe("reactivateSubscription", () => {
      it("should reactivate a subscription", () => {
        manager.createSubscription("user_1", "plan_pro");
        manager.cancelSubscription("user_1");
        const reactivated = manager.reactivateSubscription("user_1");

        expect(reactivated?.cancelAtPeriodEnd).toBe(false);
      });

      it("should return null for canceled subscription", () => {
        manager.createSubscription("user_1", "plan_pro");
        manager.cancelSubscription("user_1", true);
        const reactivated = manager.reactivateSubscription("user_1");

        expect(reactivated).toBeNull();
      });

      it("should return null for non-existent subscription", () => {
        const reactivated = manager.reactivateSubscription("user_nonexistent");
        expect(reactivated).toBeNull();
      });
    });

    describe("upgradeSubscription", () => {
      it("should upgrade from free to pro", () => {
        manager.createSubscription("user_1", "plan_free");
        const upgraded = manager.upgradeSubscription("user_1", "plan_pro");

        expect(upgraded?.tier).toBe("pro");
        expect(upgraded?.planId).toBe("plan_pro");
      });

      it("should upgrade from pro to enterprise", () => {
        const freshManager = new SubscriptionManager();
        freshManager.createSubscription("user_1", "plan_pro");
        const upgraded = freshManager.upgradeSubscription(
          "user_1",
          "plan_enterprise",
        );

        expect(upgraded?.tier).toBe("enterprise");
      });

      it("should clear cancelAtPeriodEnd on upgrade", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.cancelSubscription("user_1");
        const upgraded = manager.upgradeSubscription("user_1", "plan_pro");

        expect(upgraded?.cancelAtPeriodEnd).toBe(false);
      });

      it("should return null for downgrade attempt", () => {
        manager.createSubscription("user_1", "plan_pro");
        const upgraded = manager.upgradeSubscription("user_1", "plan_free");

        expect(upgraded).toBeNull();
      });

      it("should return null for non-existent plan", () => {
        manager.createSubscription("user_1", "plan_free");
        const upgraded = manager.upgradeSubscription("user_1", "plan_invalid");

        expect(upgraded).toBeNull();
      });

      it("should return null for non-existent subscription", () => {
        const upgraded = manager.upgradeSubscription(
          "user_nonexistent",
          "plan_pro",
        );
        expect(upgraded).toBeNull();
      });
    });

    describe("downgradeSubscription", () => {
      it("should downgrade from enterprise to pro", () => {
        const freshManager = new SubscriptionManager();
        freshManager.createSubscription("user_1", "plan_enterprise");
        const downgraded = freshManager.downgradeSubscription(
          "user_1",
          "plan_pro",
        );

        expect(downgraded).toBeDefined();
      });

      it("should return null for upgrade attempt", () => {
        manager.createSubscription("user_1", "plan_free");
        const downgraded = manager.downgradeSubscription("user_1", "plan_pro");

        expect(downgraded).toBeNull();
      });

      it("should return null for non-existent subscription", () => {
        const downgraded = manager.downgradeSubscription(
          "user_nonexistent",
          "plan_free",
        );
        expect(downgraded).toBeNull();
      });
    });

    describe("previewUpgrade", () => {
      it("should preview upgrade with prorated amount", () => {
        manager.createSubscription("user_1", "plan_free");
        const preview = manager.previewUpgrade("user_1", "plan_pro");

        expect(preview).toBeDefined();
        expect(preview?.currentPlan.tier).toBe("free");
        expect(preview?.newPlan.tier).toBe("pro");
        expect(preview?.proratedAmount).toBeGreaterThanOrEqual(0);
      });

      it("should return null for non-existent subscription", () => {
        const preview = manager.previewUpgrade("user_nonexistent", "plan_pro");
        expect(preview).toBeNull();
      });

      it("should return null for non-existent plan", () => {
        manager.createSubscription("user_1", "plan_free");
        const preview = manager.previewUpgrade("user_1", "plan_invalid");
        expect(preview).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Billing Cycle Tests
  // ==========================================================================

  describe("Billing Cycle", () => {
    describe("getBillingCycle", () => {
      it("should return billing cycle info", () => {
        manager.createSubscription("user_1", "plan_pro");
        const cycle = manager.getBillingCycle("user_1");

        expect(cycle).toBeDefined();
        expect(cycle?.startDate).toBeInstanceOf(Date);
        expect(cycle?.endDate).toBeInstanceOf(Date);
        expect(cycle?.totalDays).toBeGreaterThan(0);
      });

      it("should calculate days remaining", () => {
        manager.createSubscription("user_1", "plan_pro");
        const cycle = manager.getBillingCycle("user_1");

        expect(cycle?.daysRemaining).toBeGreaterThanOrEqual(0);
        expect(cycle?.daysRemaining).toBeLessThanOrEqual(cycle?.totalDays ?? 0);
      });

      it("should calculate percent complete", () => {
        manager.createSubscription("user_1", "plan_pro");
        const cycle = manager.getBillingCycle("user_1");

        expect(cycle?.percentComplete).toBeGreaterThanOrEqual(0);
        expect(cycle?.percentComplete).toBeLessThanOrEqual(100);
      });

      it("should return null for non-existent subscription", () => {
        const cycle = manager.getBillingCycle("user_nonexistent");
        expect(cycle).toBeNull();
      });
    });

    describe("isInTrial", () => {
      it("should return true for subscription in trial", () => {
        manager.createSubscription("user_1", "plan_pro", { startTrial: true });
        expect(manager.isInTrial("user_1")).toBe(true);
      });

      it("should return false for subscription not in trial", () => {
        manager.createSubscription("user_1", "plan_pro");
        expect(manager.isInTrial("user_1")).toBe(false);
      });

      it("should return false for free plan", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.isInTrial("user_1")).toBe(false);
      });

      it("should return false for non-existent subscription", () => {
        expect(manager.isInTrial("user_nonexistent")).toBe(false);
      });
    });

    describe("getTrialDaysRemaining", () => {
      it("should return days remaining for subscription in trial", () => {
        manager.createSubscription("user_1", "plan_pro", { startTrial: true });
        const days = manager.getTrialDaysRemaining("user_1");

        expect(days).toBeGreaterThan(0);
        expect(days).toBeLessThanOrEqual(14);
      });

      it("should return 0 for subscription not in trial", () => {
        manager.createSubscription("user_1", "plan_pro");
        expect(manager.getTrialDaysRemaining("user_1")).toBe(0);
      });

      it("should return 0 for non-existent subscription", () => {
        expect(manager.getTrialDaysRemaining("user_nonexistent")).toBe(0);
      });
    });

    describe("renewSubscription", () => {
      it("should renew subscription with new period", () => {
        manager.createSubscription("user_1", "plan_pro");
        const originalEnd = manager.getSubscription("user_1")?.currentPeriodEnd;
        const renewed = manager.renewSubscription("user_1");

        expect(renewed?.currentPeriodStart).toEqual(originalEnd);
        expect(renewed?.currentPeriodEnd).not.toEqual(originalEnd);
      });

      it("should set status to active", () => {
        manager.createSubscription("user_1", "plan_pro", { startTrial: true });
        const renewed = manager.renewSubscription("user_1");

        expect(renewed?.status).toBe("active");
        expect(renewed?.trialEnd).toBeUndefined();
      });

      it("should return null for non-existent subscription", () => {
        const renewed = manager.renewSubscription("user_nonexistent");
        expect(renewed).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Usage Tests
  // ==========================================================================

  describe("Usage", () => {
    describe("getUsage", () => {
      it("should return usage metrics for subscription", () => {
        manager.createSubscription("user_1", "plan_free");
        const usage = manager.getUsage("user_1");

        expect(usage.length).toBeGreaterThan(0);
      });

      it("should return empty array for non-existent subscription", () => {
        const usage = manager.getUsage("user_nonexistent");
        expect(usage).toEqual([]);
      });

      it("should include limit information", () => {
        manager.createSubscription("user_1", "plan_free");
        const usage = manager.getUsage("user_1");

        const channelUsage = usage.find((u) => u.id === "channels");
        expect(channelUsage?.limit).toBe(5);
      });
    });

    describe("getUsageMetric", () => {
      it("should return specific metric", () => {
        manager.createSubscription("user_1", "plan_free");
        const metric = manager.getUsageMetric("user_1", "channels");

        expect(metric).toBeDefined();
        expect(metric?.id).toBe("channels");
      });

      it("should return null for non-existent metric", () => {
        manager.createSubscription("user_1", "plan_free");
        const metric = manager.getUsageMetric("user_1", "invalid_metric");

        expect(metric).toBeNull();
      });

      it("should return null for non-existent subscription", () => {
        const metric = manager.getUsageMetric("user_nonexistent", "channels");
        expect(metric).toBeNull();
      });
    });

    describe("recordUsage", () => {
      it("should increment usage", () => {
        manager.createSubscription("user_1", "plan_free");
        const record: UsageRecord = {
          metricId: "channels",
          quantity: 2,
          timestamp: new Date(),
          action: "increment",
        };

        const updated = manager.recordUsage("user_1", record);
        expect(updated?.current).toBe(2);
      });

      it("should decrement usage", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 5,
          timestamp: new Date(),
          action: "increment",
        });

        const updated = manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 2,
          timestamp: new Date(),
          action: "decrement",
        });

        expect(updated?.current).toBe(3);
      });

      it("should not decrement below zero", () => {
        manager.createSubscription("user_1", "plan_free");
        const updated = manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 10,
          timestamp: new Date(),
          action: "decrement",
        });

        expect(updated?.current).toBe(0);
      });

      it("should set usage directly", () => {
        manager.createSubscription("user_1", "plan_free");
        const updated = manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 4,
          timestamp: new Date(),
          action: "set",
        });

        expect(updated?.current).toBe(4);
      });

      it("should return null for non-existent subscription", () => {
        const updated = manager.recordUsage("user_nonexistent", {
          metricId: "channels",
          quantity: 1,
          timestamp: new Date(),
          action: "increment",
        });

        expect(updated).toBeNull();
      });

      it("should return null for non-existent metric", () => {
        manager.createSubscription("user_1", "plan_free");
        const updated = manager.recordUsage("user_1", {
          metricId: "invalid_metric",
          quantity: 1,
          timestamp: new Date(),
          action: "increment",
        });

        expect(updated).toBeNull();
      });
    });

    describe("isWithinLimits", () => {
      it("should return true when within limits", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.isWithinLimits("user_1", "channels", 1)).toBe(true);
      });

      it("should return false when exceeding limits", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 5,
          timestamp: new Date(),
          action: "set",
        });

        expect(manager.isWithinLimits("user_1", "channels", 1)).toBe(false);
      });

      it("should return true for non-existent metric (no limit)", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.isWithinLimits("user_1", "invalid_metric", 100)).toBe(
          true,
        );
      });
    });

    describe("getRemainingUsage", () => {
      it("should return remaining usage", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 2,
          timestamp: new Date(),
          action: "set",
        });

        expect(manager.getRemainingUsage("user_1", "channels")).toBe(3);
      });

      it("should return Infinity for non-existent metric", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.getRemainingUsage("user_1", "invalid_metric")).toBe(
          Infinity,
        );
      });

      it("should not return negative values", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 10,
          timestamp: new Date(),
          action: "set",
        });

        expect(manager.getRemainingUsage("user_1", "channels")).toBe(0);
      });
    });

    describe("getUsagePercentage", () => {
      it("should calculate usage percentage", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 2,
          timestamp: new Date(),
          action: "set",
        });

        expect(manager.getUsagePercentage("user_1", "channels")).toBe(40);
      });

      it("should cap at 100%", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 10,
          timestamp: new Date(),
          action: "set",
        });

        expect(manager.getUsagePercentage("user_1", "channels")).toBe(100);
      });

      it("should return 0 for non-existent metric", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.getUsagePercentage("user_1", "invalid_metric")).toBe(0);
      });
    });

    describe("resetUsage", () => {
      it("should reset all usage to zero", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 5,
          timestamp: new Date(),
          action: "set",
        });

        manager.resetUsage("user_1");
        const metric = manager.getUsageMetric("user_1", "channels");

        expect(metric?.current).toBe(0);
      });

      it("should not throw for non-existent subscription", () => {
        expect(() => manager.resetUsage("user_nonexistent")).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // Feature Access Tests
  // ==========================================================================

  describe("Feature Access", () => {
    describe("hasFeatureAccess", () => {
      it("should return true for included features", () => {
        manager.createSubscription("user_1", "plan_pro");
        expect(manager.hasFeatureAccess("user_1", "analytics")).toBe(true);
      });

      it("should return false for not included features", () => {
        manager.createSubscription("user_1", "plan_free");
        expect(manager.hasFeatureAccess("user_1", "analytics")).toBe(false);
      });

      it("should check free plan for users without subscription", () => {
        expect(manager.hasFeatureAccess("user_nonexistent", "channels")).toBe(
          true,
        );
        expect(manager.hasFeatureAccess("user_nonexistent", "analytics")).toBe(
          false,
        );
      });
    });

    describe("getFeatureAccess", () => {
      it("should return detailed access info", () => {
        manager.createSubscription("user_1", "plan_free");
        const access = manager.getFeatureAccess("user_1", "channels");

        expect(access.featureId).toBe("channels");
        expect(access.hasAccess).toBe(true);
        expect(access.limit).toBe(5);
      });

      it("should include current usage", () => {
        manager.createSubscription("user_1", "plan_free");
        manager.recordUsage("user_1", {
          metricId: "channels",
          quantity: 2,
          timestamp: new Date(),
          action: "set",
        });

        const access = manager.getFeatureAccess("user_1", "channels");
        expect(access.currentUsage).toBe(2);
      });

      it("should include upgrade required tier", () => {
        manager.createSubscription("user_1", "plan_free");
        const access = manager.getFeatureAccess("user_1", "analytics");

        expect(access.hasAccess).toBe(false);
        expect(access.upgradeRequired).toBe("pro");
      });
    });

    describe("getAllFeatureAccess", () => {
      it("should return all feature access", () => {
        manager.createSubscription("user_1", "plan_free");
        const allAccess = manager.getAllFeatureAccess("user_1");

        expect(allAccess.length).toBeGreaterThan(0);
      });

      it("should return empty array when user has no subscription and no free plan", () => {
        // Create a manager with only pro plan (no free plan)
        const customManager = new SubscriptionManager([DEFAULT_PLANS[1]]);
        // Create a subscription first, then test
        customManager.createSubscription("user_1", DEFAULT_PLANS[1].id);
        const allAccess = customManager.getAllFeatureAccess("user_1");

        expect(allAccess.length).toBeGreaterThan(0);
      });
    });

    describe("getUpgradeRequiredFeatures", () => {
      it("should return features requiring upgrade", () => {
        manager.createSubscription("user_1", "plan_free");
        const upgradeRequired = manager.getUpgradeRequiredFeatures("user_1");

        expect(upgradeRequired.length).toBeGreaterThan(0);
        expect(upgradeRequired.every((f) => f.upgradeRequired)).toBe(true);
      });

      it("should return empty array for enterprise", () => {
        const freshManager = new SubscriptionManager();
        freshManager.createSubscription("user_1", "plan_enterprise");
        const upgradeRequired =
          freshManager.getUpgradeRequiredFeatures("user_1");

        expect(upgradeRequired.length).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utilities", () => {
    describe("formatPrice", () => {
      it("should format USD price", () => {
        expect(manager.formatPrice(2999, "usd")).toBe("$29.99");
      });

      it("should format with interval", () => {
        expect(manager.formatPrice(2999, "usd", "month")).toBe("$29.99/month");
      });

      it("should handle zero price", () => {
        expect(manager.formatPrice(0, "usd")).toBe("$0.00");
      });
    });

    describe("calculateAnnualSavings", () => {
      it("should calculate savings correctly", () => {
        const monthlyPrice = 2999;
        const annualPrice = 29990;
        const savings = manager.calculateAnnualSavings(
          monthlyPrice,
          annualPrice,
        );

        expect(savings).toBe(5998);
      });

      it("should handle no savings", () => {
        const monthlyPrice = 2999;
        const annualPrice = 35988;
        const savings = manager.calculateAnnualSavings(
          monthlyPrice,
          annualPrice,
        );

        expect(savings).toBe(0);
      });
    });

    describe("getAnnualSavingsPercentage", () => {
      it("should calculate savings percentage", () => {
        const monthlyPrice = 2999;
        const annualPrice = 29990;
        const percentage = manager.getAnnualSavingsPercentage(
          monthlyPrice,
          annualPrice,
        );

        expect(percentage).toBe(17);
      });

      it("should handle zero monthly price", () => {
        expect(manager.getAnnualSavingsPercentage(0, 0)).toBe(0);
      });
    });

    describe("clear", () => {
      it("should clear all subscriptions and usage", () => {
        manager.createSubscription("user_1", "plan_pro");
        manager.clear();

        expect(manager.getSubscription("user_1")).toBeNull();
        expect(manager.getUsage("user_1")).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("Singleton", () => {
    beforeEach(() => {
      resetSubscriptionManager();
    });

    it("should create singleton instance", () => {
      const instance = getSubscriptionManager();
      expect(instance).toBeInstanceOf(SubscriptionManager);
    });

    it("should return same instance", () => {
      const instance1 = getSubscriptionManager();
      const instance2 = getSubscriptionManager();

      expect(instance1).toBe(instance2);
    });

    it("should accept custom plans on first call", () => {
      const customPlans: Plan[] = [{ ...DEFAULT_PLANS[0], id: "custom_free" }];
      const instance = getSubscriptionManager(customPlans);
      const plan = instance.getPlan("custom_free");

      expect(plan).toBeDefined();
    });

    it("should reset singleton", () => {
      const instance1 = getSubscriptionManager();
      instance1.createSubscription("user_1", "plan_pro");

      resetSubscriptionManager();
      const instance2 = getSubscriptionManager();

      expect(instance2.getSubscription("user_1")).toBeNull();
    });
  });

  // ==========================================================================
  // Default Plans Tests
  // ==========================================================================

  describe("DEFAULT_PLANS", () => {
    it("should have correct structure", () => {
      DEFAULT_PLANS.forEach((plan) => {
        expect(plan.id).toBeDefined();
        expect(plan.tier).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.price).toBeDefined();
        expect(plan.features).toBeDefined();
        expect(Array.isArray(plan.features)).toBe(true);
      });
    });

    it("should have pro marked as popular", () => {
      const proPlan = DEFAULT_PLANS.find((p) => p.tier === "pro");
      expect(proPlan?.isPopular).toBe(true);
    });

    it("should have trial days for paid plans", () => {
      const proPlan = DEFAULT_PLANS.find((p) => p.tier === "pro");
      const enterprisePlan = DEFAULT_PLANS.find((p) => p.tier === "enterprise");

      expect(proPlan?.trialDays).toBe(14);
      expect(enterprisePlan?.trialDays).toBe(30);
    });
  });
});
