/**
 * Subscription State Machine Tests
 *
 * Tests for state transitions, proration calculation, plan change validation,
 * pause validation, and billing cycle calculations.
 *
 * @jest-environment node
 */

import {
  SubscriptionStateMachine,
  ProrationCalculator,
  PlanChangeValidator,
  PauseValidator,
  BillingCycleCalculator,
  createStateMachine,
  createInitialSubscription,
  getSubscriptionSummary,
} from "../subscription-state-machine";
import {
  SubscriptionEntity,
  SubscriptionState,
  DEFAULT_PAUSE_LIMITS,
  SubscriptionError,
  SubscriptionErrorCode,
} from "../subscription-types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestSubscription(
  overrides: Partial<SubscriptionEntity> = {},
): SubscriptionEntity {
  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    id: "sub_test_123",
    workspaceId: "ws_123",
    organizationId: "org_123",
    plan: "professional",
    interval: "monthly",
    state: "active",
    stateChangedAt: now,
    previousState: null,
    trialStartedAt: null,
    trialEndsAt: null,
    trialDaysRemaining: null,
    trialConvertedAt: null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    billingAnchor: { type: "subscription_start" },
    stripeSubscriptionId: "stripe_sub_123",
    stripeCustomerId: "stripe_cust_123",
    stripePriceId: "stripe_price_123",
    lastPaymentAt: now,
    lastPaymentAmount: 1500,
    lastPaymentStatus: "succeeded",
    graceStartedAt: null,
    graceEndsAt: null,
    pauseState: {
      isPaused: false,
      pausedAt: null,
      pauseReason: null,
      pauseBehavior: null,
      pauseDurationType: null,
      scheduledResumeAt: null,
      maxPauseDurationDays: 90,
      pauseCountInPeriod: 0,
      maxPausesPerPeriod: 3,
    },
    canceledAt: null,
    cancelAtPeriodEnd: false,
    cancellationReason: null,
    cancellationFeedback: null,
    pendingPlanChange: null,
    createdAt: now,
    updatedAt: now,
    createdBy: "user_123",
    stateHistory: [],
    ...overrides,
  };
}

const testActor = {
  type: "user" as const,
  id: "user_123",
  email: "test@example.com",
};

// ============================================================================
// SubscriptionStateMachine Tests
// ============================================================================

describe("SubscriptionStateMachine", () => {
  describe("constructor", () => {
    it("should create state machine with subscription", () => {
      const subscription = createTestSubscription();
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.getState()).toBe("active");
    });
  });

  describe("getState", () => {
    it("should return current state", () => {
      const subscription = createTestSubscription({ state: "trial" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.getState()).toBe("trial");
    });
  });

  describe("getStateInfo", () => {
    it("should return state info for current state", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);
      const info = machine.getStateInfo();

      expect(info.state).toBe("active");
      expect(info.isAccessGranted).toBe(true);
    });
  });

  describe("canTransition", () => {
    it("should allow valid transitions", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("grace", "grace_period_started")).toBe(true);
      expect(machine.canTransition("paused", "subscription_paused")).toBe(true);
      expect(machine.canTransition("canceled", "subscription_canceled")).toBe(
        true,
      );
    });

    it("should reject invalid transitions", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("trial", "trial_started")).toBe(false);
      expect(machine.canTransition("active", "subscription_resumed")).toBe(
        false,
      );
    });

    it("should allow trial to active transition", () => {
      const subscription = createTestSubscription({ state: "trial" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("active", "trial_converted")).toBe(true);
      expect(machine.canTransition("active", "payment_succeeded")).toBe(true);
    });

    it("should allow trial to canceled transition", () => {
      const subscription = createTestSubscription({ state: "trial" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("canceled", "subscription_canceled")).toBe(
        true,
      );
      expect(machine.canTransition("canceled", "trial_ended")).toBe(true);
    });

    it("should allow grace to active on payment recovery", () => {
      const subscription = createTestSubscription({ state: "grace" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("active", "payment_succeeded")).toBe(true);
      expect(machine.canTransition("active", "payment_recovered")).toBe(true);
    });

    it("should allow paused to active on resume", () => {
      const subscription = createTestSubscription({ state: "paused" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("active", "subscription_resumed")).toBe(
        true,
      );
    });

    it("should allow canceled to active on reactivation", () => {
      const subscription = createTestSubscription({ state: "canceled" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(machine.canTransition("active", "subscription_reactivated")).toBe(
        true,
      );
    });
  });

  describe("getValidTransitions", () => {
    it("should return all valid transitions for active state", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);
      const transitions = machine.getValidTransitions();

      expect(transitions).toContainEqual(
        expect.objectContaining({ toState: "grace" }),
      );
      expect(transitions).toContainEqual(
        expect.objectContaining({ toState: "paused" }),
      );
      expect(transitions).toContainEqual(
        expect.objectContaining({ toState: "canceled" }),
      );
    });

    it("should return limited transitions for canceled state", () => {
      const subscription = createTestSubscription({ state: "canceled" });
      const machine = new SubscriptionStateMachine(subscription);
      const transitions = machine.getValidTransitions();

      expect(transitions.length).toBe(1);
      expect(transitions[0].toState).toBe("active");
    });
  });

  describe("transition", () => {
    it("should execute valid transition", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      const event = machine.transition(
        "grace",
        "grace_period_started",
        testActor,
      );

      expect(event.fromState).toBe("active");
      expect(event.toState).toBe("grace");
      expect(event.trigger).toBe("grace_period_started");
      expect(machine.getState()).toBe("grace");
    });

    it("should throw on invalid transition", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      expect(() => {
        machine.transition("trial", "trial_started", testActor);
      }).toThrow(SubscriptionError);
    });

    it("should update subscription state", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("paused", "subscription_paused", testActor);

      const updated = machine.getSubscription();
      expect(updated.state).toBe("paused");
      expect(updated.previousState).toBe("active");
    });

    it("should record audit log", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("paused", "subscription_paused", testActor);

      const auditLog = machine.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].action).toBe("active -> paused");
      expect(auditLog[0].actor).toBe("user_123");
    });

    it("should create pending events", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("paused", "subscription_paused", testActor);

      const events = machine.getPendingEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("subscription.paused");
    });

    it("should handle grace period entry correctly", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("grace", "grace_period_started", testActor);

      const updated = machine.getSubscription();
      expect(updated.graceStartedAt).toBeInstanceOf(Date);
      expect(updated.graceEndsAt).toBeInstanceOf(Date);
    });

    it("should handle pause state entry correctly", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("paused", "subscription_paused", testActor, {
        pauseReason: "vacation",
      });

      const updated = machine.getSubscription();
      expect(updated.pauseState.isPaused).toBe(true);
      expect(updated.pauseState.pausedAt).toBeInstanceOf(Date);
      expect(updated.pauseState.pauseCountInPeriod).toBe(1);
    });

    it("should handle cancellation correctly", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("canceled", "subscription_canceled", testActor, {
        reasonCategory: "too_expensive",
        feedback: "Too costly for our budget",
      });

      const updated = machine.getSubscription();
      expect(updated.canceledAt).toBeInstanceOf(Date);
      expect(updated.cancellationReason).toBe("too_expensive");
      expect(updated.cancellationFeedback).toBe("Too costly for our budget");
    });
  });

  describe("clearPendingEvents", () => {
    it("should clear all pending events", () => {
      const subscription = createTestSubscription({ state: "active" });
      const machine = new SubscriptionStateMachine(subscription);

      machine.transition("paused", "subscription_paused", testActor);
      expect(machine.getPendingEvents().length).toBeGreaterThan(0);

      machine.clearPendingEvents();
      expect(machine.getPendingEvents().length).toBe(0);
    });
  });
});

// ============================================================================
// ProrationCalculator Tests
// ============================================================================

describe("ProrationCalculator", () => {
  describe("calculate", () => {
    it("should calculate proration for upgrade", () => {
      const periodStart = new Date("2026-02-01");
      const periodEnd = new Date("2026-03-01");
      const changeDate = new Date("2026-02-15");

      const result = ProrationCalculator.calculate({
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        newInterval: "monthly",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeDate,
        currentPlanPriceCents: 500, // $5
        newPlanPriceCents: 1500, // $15
      });

      expect(result.method).toBe("time_based");
      expect(result.currency).toBe("USD");
      expect(result.currentPlanCredit).toBeGreaterThan(0);
      expect(result.newPlanCharge).toBeGreaterThan(result.currentPlanCredit);
      expect(result.isCredit).toBe(false);
    });

    it("should calculate proration for downgrade", () => {
      const periodStart = new Date("2026-02-01");
      const periodEnd = new Date("2026-03-01");
      const changeDate = new Date("2026-02-15");

      const result = ProrationCalculator.calculate({
        currentPlan: "professional",
        newPlan: "starter",
        currentInterval: "monthly",
        newInterval: "monthly",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeDate,
        currentPlanPriceCents: 1500, // $15
        newPlanPriceCents: 500, // $5
      });

      expect(result.isCredit).toBe(true);
      expect(result.currentPlanCredit).toBeGreaterThan(result.newPlanCharge);
    });

    it("should include line items", () => {
      const periodStart = new Date("2026-02-01");
      const periodEnd = new Date("2026-03-01");
      const changeDate = new Date("2026-02-15");

      const result = ProrationCalculator.calculate({
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        newInterval: "monthly",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeDate,
        currentPlanPriceCents: 500,
        newPlanPriceCents: 1500,
      });

      expect(result.lineItems.length).toBe(2);
      expect(result.lineItems[0].type).toBe("credit");
      expect(result.lineItems[1].type).toBe("charge");
    });

    it("should calculate correct days remaining", () => {
      const periodStart = new Date("2026-02-01");
      const periodEnd = new Date("2026-03-01");
      const changeDate = new Date("2026-02-15");

      const result = ProrationCalculator.calculate({
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        newInterval: "monthly",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        changeDate,
        currentPlanPriceCents: 500,
        newPlanPriceCents: 1500,
      });

      expect(result.currentPlanDaysRemaining).toBe(14);
      expect(result.newPlanDaysRemaining).toBe(14);
    });
  });

  describe("getProrationBehavior", () => {
    it("should return create_prorations for immediate upgrade", () => {
      expect(ProrationCalculator.getProrationBehavior("upgrade", true)).toBe(
        "create_prorations",
      );
    });

    it("should return none for downgrade", () => {
      expect(ProrationCalculator.getProrationBehavior("downgrade", true)).toBe(
        "none",
      );
    });

    it("should return none for non-immediate changes", () => {
      expect(ProrationCalculator.getProrationBehavior("upgrade", false)).toBe(
        "none",
      );
    });

    it("should return none for lateral changes", () => {
      expect(ProrationCalculator.getProrationBehavior("lateral", true)).toBe(
        "none",
      );
    });
  });
});

// ============================================================================
// PlanChangeValidator Tests
// ============================================================================

describe("PlanChangeValidator", () => {
  describe("getChangeDirection", () => {
    it("should identify upgrades", () => {
      expect(
        PlanChangeValidator.getChangeDirection("starter", "professional"),
      ).toBe("upgrade");
      expect(PlanChangeValidator.getChangeDirection("free", "enterprise")).toBe(
        "upgrade",
      );
    });

    it("should identify downgrades", () => {
      expect(
        PlanChangeValidator.getChangeDirection("professional", "starter"),
      ).toBe("downgrade");
      expect(PlanChangeValidator.getChangeDirection("enterprise", "free")).toBe(
        "downgrade",
      );
    });

    it("should identify lateral changes", () => {
      expect(PlanChangeValidator.getChangeDirection("starter", "starter")).toBe(
        "lateral",
      );
    });
  });

  describe("validate", () => {
    it("should reject same plan and interval", () => {
      const subscription = createTestSubscription({
        plan: "professional",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "professional",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "SAME_PLAN")).toBe(true);
    });

    it("should allow valid upgrade", () => {
      const subscription = createTestSubscription({
        plan: "starter",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "professional",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(true);
      expect(result.direction).toBe("upgrade");
    });

    it("should reject downgrade exceeding member limit", () => {
      const subscription = createTestSubscription({
        plan: "professional",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "starter",
        "monthly",
        { members: 50, channels: 5, storageBytes: 1000 }, // Exceeds starter limit of 25
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "USAGE_EXCEEDS_LIMIT")).toBe(
        true,
      );
    });

    it("should reject downgrade exceeding storage limit", () => {
      const subscription = createTestSubscription({
        plan: "professional",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "starter",
        "monthly",
        {
          members: 10,
          channels: 5,
          storageBytes: 50 * 1024 * 1024 * 1024, // 50 GB, exceeds starter limit of 10 GB
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "USAGE_EXCEEDS_LIMIT")).toBe(
        true,
      );
    });

    it("should reject custom plan changes", () => {
      const subscription = createTestSubscription({
        plan: "professional",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "custom",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "CUSTOM_PLAN_CONTACT_SALES"),
      ).toBe(true);
    });

    it("should reject changes with pending change", () => {
      const subscription = createTestSubscription({
        plan: "starter",
        interval: "monthly",
        pendingPlanChange: {
          id: "pending_123",
          subscriptionId: "sub_test_123",
          currentPlan: "starter",
          newPlan: "professional",
          currentInterval: "monthly",
          newInterval: "monthly",
          effectiveDate: new Date(),
          createdAt: new Date(),
          createdBy: "user_123",
        },
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "enterprise",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.code === "PENDING_CHANGE_EXISTS"),
      ).toBe(true);
    });

    it("should reject upgrade in non-upgradeable state", () => {
      const subscription = createTestSubscription({
        plan: "starter",
        interval: "monthly",
        state: "grace",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "professional",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "STATE_NOT_ALLOWED")).toBe(
        true,
      );
    });

    it("should include proration preview for upgrades", () => {
      const subscription = createTestSubscription({
        plan: "starter",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "professional",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.isValid).toBe(true);
      expect(result.prorationPreview).toBeDefined();
    });

    it("should include usage impact", () => {
      const subscription = createTestSubscription({
        plan: "professional",
        interval: "monthly",
      });

      const result = PlanChangeValidator.validate(
        subscription,
        "starter",
        "monthly",
        { members: 10, channels: 5, storageBytes: 1000 },
      );

      expect(result.usageImpact).toBeDefined();
      expect(result.usageImpact?.membersImpact).toBeDefined();
      expect(result.usageImpact?.featuresLost).toBeDefined();
    });
  });
});

// ============================================================================
// PauseValidator Tests
// ============================================================================

describe("PauseValidator", () => {
  describe("canPause", () => {
    it("should allow pause for active subscription", () => {
      const subscription = createTestSubscription({ state: "active" });
      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(true);
    });

    it("should reject pause during trial", () => {
      const subscription = createTestSubscription({ state: "trial" });
      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(false);
      expect(result.reason).toContain("trial");
    });

    it("should reject pause when already paused", () => {
      const subscription = createTestSubscription({ state: "paused" });
      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(false);
    });

    it("should reject pause when max pauses exceeded", () => {
      const subscription = createTestSubscription({
        state: "active",
        pauseState: {
          isPaused: false,
          pausedAt: null,
          pauseReason: null,
          pauseBehavior: null,
          pauseDurationType: null,
          scheduledResumeAt: null,
          maxPauseDurationDays: 90,
          pauseCountInPeriod: 3,
          maxPausesPerPeriod: 3,
        },
      });

      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(false);
      expect(result.reason).toContain("Maximum");
    });

    it("should reject pause during grace period", () => {
      const subscription = createTestSubscription({ state: "grace" });
      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(false);
    });

    it("should reject pause when canceled", () => {
      const subscription = createTestSubscription({ state: "canceled" });
      const result = PauseValidator.canPause(subscription);

      expect(result.canPause).toBe(false);
    });
  });

  describe("calculatePauseEndDate", () => {
    it("should calculate fixed duration end date", () => {
      const result = PauseValidator.calculatePauseEndDate("fixed", 30);

      expect(result).toBeInstanceOf(Date);
      const now = new Date();
      const expectedEnd = new Date(now);
      expectedEnd.setDate(expectedEnd.getDate() + 30);

      // Allow 1 second tolerance
      expect(Math.abs(result!.getTime() - expectedEnd.getTime())).toBeLessThan(
        1000,
      );
    });

    it("should clamp to max duration", () => {
      const result = PauseValidator.calculatePauseEndDate(
        "fixed",
        120,
        undefined,
        90,
      );

      const now = new Date();
      const expectedMax = new Date(now);
      expectedMax.setDate(expectedMax.getDate() + 90);

      expect(Math.abs(result!.getTime() - expectedMax.getTime())).toBeLessThan(
        1000,
      );
    });

    it("should calculate indefinite as max duration", () => {
      const result = PauseValidator.calculatePauseEndDate("indefinite");

      expect(result).toBeInstanceOf(Date);
      const now = new Date();
      const expectedEnd = new Date(now);
      expectedEnd.setDate(expectedEnd.getDate() + 90);

      expect(Math.abs(result!.getTime() - expectedEnd.getTime())).toBeLessThan(
        1000,
      );
    });

    it("should use provided resume date", () => {
      const resumeDate = new Date();
      resumeDate.setDate(resumeDate.getDate() + 45);

      const result = PauseValidator.calculatePauseEndDate(
        "until_date",
        undefined,
        resumeDate,
      );

      expect(result).toEqual(resumeDate);
    });

    it("should clamp resume date to max duration", () => {
      const resumeDate = new Date();
      resumeDate.setDate(resumeDate.getDate() + 120); // Beyond max

      const result = PauseValidator.calculatePauseEndDate(
        "until_date",
        undefined,
        resumeDate,
        90,
      );

      const now = new Date();
      const expectedMax = new Date(now);
      expectedMax.setDate(expectedMax.getDate() + 90);

      expect(Math.abs(result!.getTime() - expectedMax.getTime())).toBeLessThan(
        1000,
      );
    });
  });
});

// ============================================================================
// BillingCycleCalculator Tests
// ============================================================================

describe("BillingCycleCalculator", () => {
  describe("calculateNextBillingDate", () => {
    it("should add one month for monthly interval", () => {
      const periodEnd = new Date("2026-02-28");
      const result = BillingCycleCalculator.calculateNextBillingDate(
        periodEnd,
        "monthly",
      );

      expect(result.getMonth()).toBe(2); // March (0-indexed)
    });

    it("should add one year for yearly interval", () => {
      const periodEnd = new Date("2026-02-28");
      const result = BillingCycleCalculator.calculateNextBillingDate(
        periodEnd,
        "yearly",
      );

      expect(result.getFullYear()).toBe(2027);
    });
  });

  describe("calculatePeriodDates", () => {
    it("should calculate monthly period", () => {
      const startDate = new Date("2026-02-01");
      const result = BillingCycleCalculator.calculatePeriodDates(
        startDate,
        "monthly",
      );

      expect(result.periodStart).toEqual(startDate);
      expect(result.periodEnd.getMonth()).toBe(2); // March
    });

    it("should calculate yearly period", () => {
      const startDate = new Date("2026-02-01");
      const result = BillingCycleCalculator.calculatePeriodDates(
        startDate,
        "yearly",
      );

      expect(result.periodStart).toEqual(startDate);
      expect(result.periodEnd.getFullYear()).toBe(2027);
    });
  });

  describe("calculateDaysUntilRenewal", () => {
    it("should calculate positive days for future date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const result =
        BillingCycleCalculator.calculateDaysUntilRenewal(futureDate);

      expect(result).toBe(15);
    });

    it("should return 0 for past date", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const result = BillingCycleCalculator.calculateDaysUntilRenewal(pastDate);

      expect(result).toBe(0);
    });
  });

  describe("calculateTrialEndDate", () => {
    it("should calculate trial end date", () => {
      const startDate = new Date("2026-02-01T00:00:00Z");
      const result = BillingCycleCalculator.calculateTrialEndDate(
        startDate,
        14,
      );

      // Trial starts Feb 1, 14 days later is Feb 15
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCMonth()).toBe(1); // February (0-indexed)
    });
  });

  describe("calculateTrialDaysRemaining", () => {
    it("should calculate remaining days", () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const result =
        BillingCycleCalculator.calculateTrialDaysRemaining(endDate);

      expect(result).toBe(7);
    });

    it("should return 0 for expired trial", () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      const result =
        BillingCycleCalculator.calculateTrialDaysRemaining(endDate);

      expect(result).toBe(0);
    });
  });

  describe("isInTrial", () => {
    it("should return true for future trial end", () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      expect(BillingCycleCalculator.isInTrial(endDate)).toBe(true);
    });

    it("should return false for past trial end", () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      expect(BillingCycleCalculator.isInTrial(endDate)).toBe(false);
    });

    it("should return false for null trial end", () => {
      expect(BillingCycleCalculator.isInTrial(null)).toBe(false);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createStateMachine", () => {
  it("should create a new state machine", () => {
    const subscription = createTestSubscription();
    const machine = createStateMachine(subscription);

    expect(machine).toBeInstanceOf(SubscriptionStateMachine);
  });
});

describe("createInitialSubscription", () => {
  it("should create subscription with trial", () => {
    const subscription = createInitialSubscription(
      "ws_123",
      "org_123",
      "professional",
      "monthly",
      "user_123",
      14,
    );

    expect(subscription.state).toBe("trial");
    expect(subscription.trialStartedAt).toBeInstanceOf(Date);
    expect(subscription.trialEndsAt).toBeInstanceOf(Date);
    expect(subscription.trialDaysRemaining).toBe(14);
  });

  it("should create subscription without trial", () => {
    const subscription = createInitialSubscription(
      "ws_123",
      "org_123",
      "professional",
      "monthly",
      "user_123",
      0,
    );

    expect(subscription.state).toBe("active");
    expect(subscription.trialStartedAt).toBeNull();
  });

  it("should set billing period dates", () => {
    const subscription = createInitialSubscription(
      "ws_123",
      "org_123",
      "professional",
      "monthly",
      "user_123",
    );

    expect(subscription.currentPeriodStart).toBeInstanceOf(Date);
    expect(subscription.currentPeriodEnd).toBeInstanceOf(Date);
    expect(
      subscription.currentPeriodEnd > subscription.currentPeriodStart,
    ).toBe(true);
  });

  it("should initialize pause state", () => {
    const subscription = createInitialSubscription(
      "ws_123",
      "org_123",
      "professional",
      "monthly",
      "user_123",
    );

    expect(subscription.pauseState.isPaused).toBe(false);
    expect(subscription.pauseState.pauseCountInPeriod).toBe(0);
  });
});

describe("getSubscriptionSummary", () => {
  it("should create summary for active subscription", () => {
    const subscription = createTestSubscription({ state: "active" });
    const summary = getSubscriptionSummary(subscription);

    expect(summary.state).toBe("active");
    expect(summary.hasAccess).toBe(true);
    expect(summary.canUpgrade).toBe(true);
    expect(summary.canPause).toBe(true);
  });

  it("should create summary for trial subscription", () => {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const subscription = createTestSubscription({
      state: "trial",
      trialEndsAt,
    });

    const summary = getSubscriptionSummary(subscription);

    expect(summary.isInTrial).toBe(true);
    expect(summary.trialDaysRemaining).toBe(7);
  });

  it("should indicate canceling state", () => {
    const subscription = createTestSubscription({
      state: "active",
      cancelAtPeriodEnd: true,
    });

    const summary = getSubscriptionSummary(subscription);

    expect(summary.isCanceling).toBe(true);
  });

  it("should include plan name", () => {
    const subscription = createTestSubscription({ plan: "professional" });
    const summary = getSubscriptionSummary(subscription);

    expect(summary.planName).toBe("Professional");
  });
});
