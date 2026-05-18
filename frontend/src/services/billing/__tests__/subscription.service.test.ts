/**
 * Subscription Service Tests
 *
 * Comprehensive tests for subscription service operations including
 * CRUD, state transitions, plan changes, pause/resume, and cancellation.
 *
 * @jest-environment node
 */

import {
  SubscriptionService,
  InMemorySubscriptionRepository,
  createSubscriptionService,
  resetSubscriptionService,
} from "../subscription.service";
import {
  SubscriptionEntity,
  SubscriptionState,
  DEFAULT_PAUSE_LIMITS,
  SubscriptionErrorCode,
} from "@/lib/billing/subscription-types";
import type { PlanTier, BillingInterval } from "@/types/subscription.types";

// ============================================================================
// Test Setup
// ============================================================================

const testActor = {
  type: "user" as const,
  id: "user_123",
  email: "test@example.com",
};

const defaultUsage = {
  members: 10,
  channels: 5,
  storageBytes: 1000,
};

let repository: InMemorySubscriptionRepository;
let service: SubscriptionService;

beforeEach(() => {
  resetSubscriptionService();
  repository = new InMemorySubscriptionRepository();
  service = createSubscriptionService(repository);
});

afterEach(() => {
  repository.clear();
});

// ============================================================================
// Subscription Creation Tests
// ============================================================================

describe("SubscriptionService.createSubscription", () => {
  it("should create subscription with trial", async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.state).toBe("trial");
    expect(result.data?.trialDaysRemaining).toBe(14);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("should create subscription without trial", async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
    expect(result.data?.trialEndsAt).toBeNull();
  });

  it("should create subscription with Stripe references", async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.stripeCustomerId).toBe("cus_123");
    expect(result.data?.stripeSubscriptionId).toBe("sub_123");
    expect(result.data?.stripePriceId).toBe("price_123");
  });

  it("should emit creation and trial events", async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );

    expect(result.events.length).toBeGreaterThanOrEqual(1);
    expect(result.events.some((e) => e.type === "subscription.created")).toBe(
      true,
    );

    // Check events in repository
    const events = repository.getEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("should create subscription with yearly interval", async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "yearly",
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.interval).toBe("yearly");
  });
});

// ============================================================================
// Subscription Retrieval Tests
// ============================================================================

describe("SubscriptionService.getSubscription", () => {
  it("should retrieve existing subscription", async () => {
    const createResult = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
      },
      testActor,
    );

    const subscription = await service.getSubscription(createResult.data!.id);

    expect(subscription).toBeDefined();
    expect(subscription?.id).toBe(createResult.data!.id);
  });

  it("should return null for non-existent subscription", async () => {
    const subscription = await service.getSubscription("non_existent_id");

    expect(subscription).toBeNull();
  });
});

describe("SubscriptionService.getSubscriptionByWorkspace", () => {
  it("should retrieve subscription by workspace ID", async () => {
    await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
      },
      testActor,
    );

    const subscription = await service.getSubscriptionByWorkspace("ws_123");

    expect(subscription).toBeDefined();
    expect(subscription?.workspaceId).toBe("ws_123");
  });

  it("should return null for workspace without subscription", async () => {
    const subscription = await service.getSubscriptionByWorkspace("ws_unknown");

    expect(subscription).toBeNull();
  });
});

describe("SubscriptionService.getSubscriptionSummary", () => {
  it("should return summary for existing subscription", async () => {
    const createResult = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );

    const summary = await service.getSubscriptionSummary(createResult.data!.id);

    expect(summary).toBeDefined();
    expect(summary?.plan).toBe("professional");
    expect(summary?.hasAccess).toBe(true);
  });

  it("should return null for non-existent subscription", async () => {
    const summary = await service.getSubscriptionSummary("non_existent_id");

    expect(summary).toBeNull();
  });
});

describe("SubscriptionService.listSubscriptions", () => {
  beforeEach(async () => {
    // Create multiple subscriptions
    await service.createSubscription(
      {
        workspaceId: "ws_1",
        organizationId: "org_1",
        plan: "starter",
        interval: "monthly",
      },
      testActor,
    );
    await service.createSubscription(
      {
        workspaceId: "ws_2",
        organizationId: "org_1",
        plan: "professional",
        interval: "yearly",
      },
      testActor,
    );
    await service.createSubscription(
      {
        workspaceId: "ws_3",
        organizationId: "org_2",
        plan: "enterprise",
        interval: "monthly",
      },
      testActor,
    );
  });

  it("should list all subscriptions", async () => {
    const subscriptions = await service.listSubscriptions({});

    expect(subscriptions.length).toBe(3);
  });

  it("should filter by plan", async () => {
    const subscriptions = await service.listSubscriptions({
      plans: ["professional"],
    });

    expect(subscriptions.length).toBe(1);
    expect(subscriptions[0].plan).toBe("professional");
  });

  it("should filter by interval", async () => {
    const subscriptions = await service.listSubscriptions({
      intervals: ["yearly"],
    });

    expect(subscriptions.length).toBe(1);
    expect(subscriptions[0].interval).toBe("yearly");
  });

  it("should filter by organization", async () => {
    const subscriptions = await service.listSubscriptions({
      organizationId: "org_1",
    });

    expect(subscriptions.length).toBe(2);
  });

  it("should apply pagination", async () => {
    const subscriptions = await service.listSubscriptions({
      limit: 2,
      offset: 1,
    });

    expect(subscriptions.length).toBe(2);
  });
});

// ============================================================================
// State Transition Tests
// ============================================================================

describe("SubscriptionService.transitionState", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should transition from active to grace", async () => {
    const result = await service.transitionState(
      subscriptionId,
      "grace",
      "grace_period_started",
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("grace");
  });

  it("should transition from active to paused", async () => {
    const result = await service.transitionState(
      subscriptionId,
      "paused",
      "subscription_paused",
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("paused");
  });

  it("should transition from active to canceled", async () => {
    const result = await service.transitionState(
      subscriptionId,
      "canceled",
      "subscription_canceled",
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("canceled");
  });

  it("should reject invalid transition", async () => {
    const result = await service.transitionState(
      subscriptionId,
      "trial",
      "trial_started",
      testActor,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(
      SubscriptionErrorCode.INVALID_STATE_TRANSITION,
    );
  });

  it("should return error for non-existent subscription", async () => {
    const result = await service.transitionState(
      "non_existent",
      "grace",
      "grace_period_started",
      testActor,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(
      SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
    );
  });

  it("should emit transition events", async () => {
    const result = await service.transitionState(
      subscriptionId,
      "paused",
      "subscription_paused",
      testActor,
    );

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.type === "subscription.paused")).toBe(
      true,
    );
  });
});

// ============================================================================
// Plan Change Tests
// ============================================================================

describe("SubscriptionService.validatePlanChange", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "starter",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should validate upgrade", async () => {
    const validation = await service.validatePlanChange(
      subscriptionId,
      "professional",
      "monthly",
      defaultUsage,
    );

    expect(validation.isValid).toBe(true);
    expect(validation.direction).toBe("upgrade");
  });

  it("should include proration preview for upgrade", async () => {
    const validation = await service.validatePlanChange(
      subscriptionId,
      "professional",
      "monthly",
      defaultUsage,
    );

    expect(validation.prorationPreview).toBeDefined();
  });

  it("should reject invalid downgrade due to usage", async () => {
    // First upgrade
    await service.changePlan(
      {
        subscriptionId,
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        effectiveTiming: "immediate",
        prorationBehavior: "create_prorations",
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
      defaultUsage,
    );

    // Try to downgrade with high usage
    const validation = await service.validatePlanChange(
      subscriptionId,
      "starter",
      "monthly",
      { members: 50, channels: 30, storageBytes: 50 * 1024 * 1024 * 1024 },
    );

    expect(validation.isValid).toBe(false);
    expect(
      validation.errors.some((e) => e.code === "USAGE_EXCEEDS_LIMIT"),
    ).toBe(true);
  });
});

describe("SubscriptionService.changePlan", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "starter",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should upgrade plan immediately", async () => {
    const result = await service.changePlan(
      {
        subscriptionId,
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        effectiveTiming: "immediate",
        prorationBehavior: "create_prorations",
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
      defaultUsage,
    );

    expect(result.success).toBe(true);
    expect(result.data?.plan).toBe("professional");
  });

  it("should emit upgrade event", async () => {
    const result = await service.changePlan(
      {
        subscriptionId,
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        effectiveTiming: "immediate",
        prorationBehavior: "create_prorations",
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
      defaultUsage,
    );

    expect(result.events.some((e) => e.type === "subscription.upgraded")).toBe(
      true,
    );
  });

  it("should reject same plan change", async () => {
    const result = await service.changePlan(
      {
        subscriptionId,
        currentPlan: "starter",
        newPlan: "starter",
        currentInterval: "monthly",
        effectiveTiming: "immediate",
        prorationBehavior: "create_prorations",
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
      defaultUsage,
    );

    expect(result.success).toBe(false);
  });

  it("should return error for non-existent subscription", async () => {
    const result = await service.changePlan(
      {
        subscriptionId: "non_existent",
        currentPlan: "starter",
        newPlan: "professional",
        currentInterval: "monthly",
        effectiveTiming: "immediate",
        prorationBehavior: "create_prorations",
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
      defaultUsage,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(
      SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
    );
  });
});

describe("SubscriptionService.calculateProration", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "starter",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should calculate proration preview", async () => {
    const proration = await service.calculateProration(
      subscriptionId,
      "professional",
      "monthly",
    );

    expect(proration).toBeDefined();
    expect(proration?.method).toBe("time_based");
    expect(proration?.lineItems.length).toBe(2);
  });

  it("should return null for non-existent subscription", async () => {
    const proration = await service.calculateProration(
      "non_existent",
      "professional",
      "monthly",
    );

    expect(proration).toBeNull();
  });
});

// ============================================================================
// Pause/Resume Tests
// ============================================================================

describe("SubscriptionService.canPause", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should allow pause for active subscription", async () => {
    const result = await service.canPause(subscriptionId);

    expect(result.canPause).toBe(true);
  });

  it("should reject pause for non-existent subscription", async () => {
    const result = await service.canPause("non_existent");

    expect(result.canPause).toBe(false);
    expect(result.reason).toContain("not found");
  });
});

describe("SubscriptionService.pauseSubscription", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should pause subscription immediately", async () => {
    const result = await service.pauseSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        durationType: "fixed",
        durationDays: 30,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("paused");
  });

  it("should emit pause event", async () => {
    const result = await service.pauseSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        durationType: "fixed",
        durationDays: 30,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.events.some((e) => e.type === "subscription.paused")).toBe(
      true,
    );
  });

  it("should reject pause for trial subscription", async () => {
    const trialResult = await service.createSubscription(
      {
        workspaceId: "ws_trial",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );

    const result = await service.pauseSubscription(
      {
        subscriptionId: trialResult.data!.id,
        behavior: "immediate",
        durationType: "fixed",
        durationDays: 30,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(SubscriptionErrorCode.PAUSE_NOT_ALLOWED);
  });
});

describe("SubscriptionService.resumeSubscription", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;

    // Pause first
    await service.pauseSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        durationType: "fixed",
        durationDays: 30,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );
  });

  it("should resume paused subscription", async () => {
    const result = await service.resumeSubscription(
      {
        subscriptionId,
        resumeImmediately: true,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
  });

  it("should emit resume event", async () => {
    const result = await service.resumeSubscription(
      {
        subscriptionId,
        resumeImmediately: true,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.events.some((e) => e.type === "subscription.resumed")).toBe(
      true,
    );
  });

  it("should reject resume for non-paused subscription", async () => {
    // Resume first
    await service.resumeSubscription(
      {
        subscriptionId,
        resumeImmediately: true,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    // Try to resume again
    const result = await service.resumeSubscription(
      {
        subscriptionId,
        resumeImmediately: true,
        requestedBy: testActor.id,
        requestedAt: new Date(),
      },
      testActor,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(SubscriptionErrorCode.NOT_PAUSED);
  });
});

// ============================================================================
// Cancellation Tests
// ============================================================================

describe("SubscriptionService.cancelSubscription", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should cancel subscription immediately", async () => {
    const result = await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "too_expensive",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: false,
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.behavior).toBe("immediate");

    const subscription = await service.getSubscription(subscriptionId);
    expect(subscription?.state).toBe("canceled");
  });

  it("should schedule cancellation at period end", async () => {
    const result = await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "period_end",
        reasonCategory: "not_using",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: true,
      },
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.behavior).toBe("period_end");

    const subscription = await service.getSubscription(subscriptionId);
    expect(subscription?.cancelAtPeriodEnd).toBe(true);
    expect(subscription?.state).toBe("active"); // Still active until period end
  });

  it("should save cancellation feedback", async () => {
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "missing_features",
        reasonDetails: "Need better analytics",
        feedback: "Would return if analytics improved",
        competitorName: "Slack",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    const feedback = repository.getFeedback();
    expect(feedback.length).toBe(1);
    expect(feedback[0].reasonCategory).toBe("missing_features");
    expect(feedback[0].competitorName).toBe("Slack");
  });

  it("should include data retention info", async () => {
    const result = await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "company_closed",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    expect(result.data?.dataRetentionDays).toBe(30);
    expect(result.data?.canReactivateBefore).toBeInstanceOf(Date);
  });

  it("should reject cancellation of already canceled subscription", async () => {
    // Cancel first
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "other",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    // Try to cancel again
    const result = await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "other",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(SubscriptionErrorCode.ALREADY_CANCELED);
  });
});

describe("SubscriptionService.undoCancellation", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;

    // Schedule cancellation
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "period_end",
        reasonCategory: "not_using",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );
  });

  it("should undo scheduled cancellation", async () => {
    const result = await service.undoCancellation(subscriptionId, testActor);

    expect(result.success).toBe(true);
    expect(result.data?.cancelAtPeriodEnd).toBe(false);
  });

  it("should reject if not scheduled for cancellation", async () => {
    // Undo first
    await service.undoCancellation(subscriptionId, testActor);

    // Try to undo again
    const result = await service.undoCancellation(subscriptionId, testActor);

    expect(result.success).toBe(false);
  });
});

describe("SubscriptionService.reactivateSubscription", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;

    // Cancel immediately
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "immediate",
        reasonCategory: "temporary_pause",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );
  });

  it("should reactivate canceled subscription", async () => {
    const result = await service.reactivateSubscription(
      subscriptionId,
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
  });

  it("should reject reactivation of non-canceled subscription", async () => {
    // Reactivate first
    await service.reactivateSubscription(subscriptionId, testActor);

    // Try to reactivate again
    const result = await service.reactivateSubscription(
      subscriptionId,
      testActor,
    );

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Renewal Tests
// ============================================================================

describe("SubscriptionService.getRenewalInfo", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
        stripeSubscriptionId: "sub_123",
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should return renewal info", async () => {
    const info = await service.getRenewalInfo(subscriptionId);

    expect(info).toBeDefined();
    expect(info?.willAutoRenew).toBe(true);
    expect(info?.nextRenewalDate).toBeInstanceOf(Date);
    expect(info?.daysUntilRenewal).toBeGreaterThanOrEqual(0);
  });

  it("should indicate no auto-renew for canceling subscription", async () => {
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "period_end",
        reasonCategory: "not_using",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    const info = await service.getRenewalInfo(subscriptionId);

    expect(info?.willAutoRenew).toBe(false);
  });

  it("should return null for non-existent subscription", async () => {
    const info = await service.getRenewalInfo("non_existent");

    expect(info).toBeNull();
  });
});

describe("SubscriptionService.processRenewal", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should process renewal and update period", async () => {
    const subscription = await service.getSubscription(subscriptionId);
    const originalPeriodEnd = subscription?.currentPeriodEnd;

    const result = await service.processRenewal(subscriptionId, testActor);

    expect(result.success).toBe(true);
    expect(result.data?.currentPeriodStart).toEqual(originalPeriodEnd);
  });

  it("should cancel instead of renew if cancelAtPeriodEnd", async () => {
    await service.cancelSubscription(
      {
        subscriptionId,
        behavior: "period_end",
        reasonCategory: "not_using",
        requestedBy: testActor.id,
        requestedAt: new Date(),
        wouldRecommend: null,
      },
      testActor,
    );

    const result = await service.processRenewal(subscriptionId, testActor);

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("canceled");
  });

  it("should emit renewal event", async () => {
    const result = await service.processRenewal(subscriptionId, testActor);

    expect(result.events.some((e) => e.type === "subscription.renewed")).toBe(
      true,
    );
  });
});

// ============================================================================
// Payment Handling Tests
// ============================================================================

describe("SubscriptionService.handlePaymentSuccess", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should convert trial to active on payment", async () => {
    const result = await service.handlePaymentSuccess(
      subscriptionId,
      1500,
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
  });

  it("should recover from grace period", async () => {
    // First convert from trial
    await service.handlePaymentSuccess(subscriptionId, 1500, testActor);

    // Simulate entering grace period
    await service.transitionState(
      subscriptionId,
      "grace",
      "grace_period_started",
      testActor,
    );

    // Payment succeeds
    const result = await service.handlePaymentSuccess(
      subscriptionId,
      1500,
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
  });
});

describe("SubscriptionService.handlePaymentFailure", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 0,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should enter grace on first failure", async () => {
    const result = await service.handlePaymentFailure(
      subscriptionId,
      true,
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("grace");
  });

  it("should enter past_due after grace", async () => {
    // First failure - enter grace
    await service.handlePaymentFailure(subscriptionId, true, testActor);

    // End grace period
    const result = await service.transitionState(
      subscriptionId,
      "past_due",
      "grace_period_ended",
      testActor,
    );

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("past_due");
  });
});

// ============================================================================
// Trial Handling Tests
// ============================================================================

describe("SubscriptionService.handleTrialEnding", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should emit trial ending event", async () => {
    const result = await service.handleTrialEnding(
      subscriptionId,
      3,
      testActor,
    );

    expect(result.success).toBe(true);
    expect(
      result.events.some((e) => e.type === "subscription.trial_ending"),
    ).toBe(true);
  });
});

describe("SubscriptionService.handleTrialEnded", () => {
  let subscriptionId: string;

  beforeEach(async () => {
    const result = await service.createSubscription(
      {
        workspaceId: "ws_123",
        organizationId: "org_123",
        plan: "professional",
        interval: "monthly",
        trialDays: 14,
      },
      testActor,
    );
    subscriptionId = result.data!.id;
  });

  it("should cancel trial without payment method", async () => {
    const result = await service.handleTrialEnded(subscriptionId, testActor);

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("canceled");
  });

  it("should convert with payment method", async () => {
    // Add Stripe subscription ID (indicates payment method)
    await repository.update(subscriptionId, {
      stripeSubscriptionId: "sub_123",
    });

    const result = await service.handleTrialEnded(subscriptionId, testActor);

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("active");
  });
});
