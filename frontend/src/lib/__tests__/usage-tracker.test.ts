/**
 * Tests for usage-tracker.ts and billing-plans.ts helpers
 *
 * Coverage targets:
 *   - UsageTracker static methods (isFeatureAllowed, getLimit, checkLimit,
 *     calculateWarnings, hasExceededLimits, getUsageLimits, formatUsage,
 *     getUsagePercentage, suggestUpgrade)
 *   - Exported helpers: requirePlanFeature, requirePlanTier, incrementUsage
 *   - billing-plans: getPlanByTier, getAllPlans, comparePlans,
 *     calculateAnnualSavings, formatPrice
 */

import {
  UsageTracker,
  requirePlanFeature,
  requirePlanTier,
  incrementUsage,
} from "../usage-tracker";
import {
  PLANS,
  DEFAULT_PLAN,
  TRIAL_DAYS,
  getPlanByTier,
  getAllPlans,
  comparePlans,
  calculateAnnualSavings,
  formatPrice,
} from "../../config/billing-plans";
import type { UsageMetrics } from "../../types/billing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUsage(overrides: Partial<UsageMetrics> = {}): UsageMetrics {
  return {
    userId: "user-1",
    period: "2026-05",
    users: 0,
    channels: 0,
    messages: 0,
    storageGB: 0,
    integrations: 0,
    bots: 0,
    aiMinutes: 0,
    aiQueries: 0,
    callMinutes: 0,
    recordingGB: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// billing-plans: constants and pure helpers
// ---------------------------------------------------------------------------

describe("billing-plans constants", () => {
  it("DEFAULT_PLAN is free", () => {
    expect(DEFAULT_PLAN).toBe("free");
  });

  it("TRIAL_DAYS is 14", () => {
    expect(TRIAL_DAYS).toBe(14);
  });

  it("PLANS has all five tiers", () => {
    expect(Object.keys(PLANS)).toEqual([
      "free",
      "starter",
      "pro",
      "business",
      "enterprise",
    ]);
  });

  it("each plan has an id matching its tier key", () => {
    for (const [tier, plan] of Object.entries(PLANS)) {
      expect(plan.id).toBe(tier);
    }
  });

  it("free plan has zero price", () => {
    expect(PLANS.free.price.monthly).toBe(0);
    expect(PLANS.free.price.yearly).toBe(0);
  });

  it("enterprise plan has unlimited users (null)", () => {
    expect(PLANS.enterprise.features.maxUsers).toBeNull();
  });
});

describe("getPlanByTier", () => {
  it("returns the correct plan for each tier", () => {
    expect(getPlanByTier("free").id).toBe("free");
    expect(getPlanByTier("starter").id).toBe("starter");
    expect(getPlanByTier("pro").id).toBe("pro");
    expect(getPlanByTier("business").id).toBe("business");
    expect(getPlanByTier("enterprise").id).toBe("enterprise");
  });
});

describe("getAllPlans", () => {
  it("returns an array with all five plans", () => {
    const plans = getAllPlans();
    expect(plans).toHaveLength(5);
    expect(plans.map((p) => p.id)).toEqual([
      "free",
      "starter",
      "pro",
      "business",
      "enterprise",
    ]);
  });
});

describe("comparePlans", () => {
  it("returns 'same' when comparing identical tiers", () => {
    expect(comparePlans("free", "free")).toBe("same");
    expect(comparePlans("pro", "pro")).toBe("same");
    expect(comparePlans("enterprise", "enterprise")).toBe("same");
  });

  it("returns 'upgrade' when moving to a higher tier", () => {
    expect(comparePlans("free", "starter")).toBe("upgrade");
    expect(comparePlans("free", "enterprise")).toBe("upgrade");
    expect(comparePlans("starter", "pro")).toBe("upgrade");
    expect(comparePlans("pro", "business")).toBe("upgrade");
    expect(comparePlans("business", "enterprise")).toBe("upgrade");
  });

  it("returns 'downgrade' when moving to a lower tier", () => {
    expect(comparePlans("starter", "free")).toBe("downgrade");
    expect(comparePlans("enterprise", "free")).toBe("downgrade");
    expect(comparePlans("pro", "starter")).toBe("downgrade");
  });
});

describe("calculateAnnualSavings", () => {
  it("returns 0 for free plan", () => {
    expect(calculateAnnualSavings(PLANS.free)).toBe(0);
  });

  it("returns 0 for enterprise plan (custom pricing)", () => {
    expect(calculateAnnualSavings(PLANS.enterprise)).toBe(0);
  });

  it("returns positive savings for paid plans", () => {
    // starter: monthly=8, yearly=80 → 8*12 - 80 = 16
    expect(calculateAnnualSavings(PLANS.starter)).toBe(16);
    // pro: monthly=25, yearly=250 → 25*12 - 250 = 50
    expect(calculateAnnualSavings(PLANS.pro)).toBe(50);
    // business: monthly=75, yearly=750 → 75*12 - 750 = 150
    expect(calculateAnnualSavings(PLANS.business)).toBe(150);
  });
});

describe("formatPrice", () => {
  it("returns 'Free' for $0", () => {
    expect(formatPrice(0)).toBe("Free");
  });

  it("formats positive USD amounts", () => {
    expect(formatPrice(8)).toBe("$8");
    expect(formatPrice(25)).toBe("$25");
    expect(formatPrice(75)).toBe("$75");
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.isFeatureAllowed
// ---------------------------------------------------------------------------

describe("UsageTracker.isFeatureAllowed", () => {
  it("returns false for boolean feature not enabled on free tier", () => {
    expect(UsageTracker.isFeatureAllowed("free", "customBranding")).toBe(false);
    expect(UsageTracker.isFeatureAllowed("free", "advancedAnalytics")).toBe(
      false,
    );
    expect(UsageTracker.isFeatureAllowed("free", "screenSharing")).toBe(false);
  });

  it("returns true for boolean feature enabled on free tier", () => {
    expect(UsageTracker.isFeatureAllowed("free", "dataExport")).toBe(true);
    expect(UsageTracker.isFeatureAllowed("free", "videoConferencing")).toBe(
      true,
    );
    expect(UsageTracker.isFeatureAllowed("free", "voiceMessages")).toBe(true);
  });

  it("returns true for features unlocked on pro tier", () => {
    expect(UsageTracker.isFeatureAllowed("pro", "customBranding")).toBe(true);
    expect(UsageTracker.isFeatureAllowed("pro", "advancedAnalytics")).toBe(
      true,
    );
    expect(UsageTracker.isFeatureAllowed("pro", "ssoIntegration")).toBe(true);
    expect(UsageTracker.isFeatureAllowed("pro", "whiteLabel")).toBe(true);
  });

  it("returns false for numeric/null features (not === true)", () => {
    // maxUsers is a number, not strictly true
    expect(UsageTracker.isFeatureAllowed("free", "maxUsers")).toBe(false);
    expect(UsageTracker.isFeatureAllowed("enterprise", "maxUsers")).toBe(false);
  });

  it("enterprise unlocks all boolean features", () => {
    expect(UsageTracker.isFeatureAllowed("enterprise", "tokenGating")).toBe(
      true,
    );
    expect(UsageTracker.isFeatureAllowed("enterprise", "cryptoPayments")).toBe(
      true,
    );
    expect(UsageTracker.isFeatureAllowed("enterprise", "nftIntegration")).toBe(
      true,
    );
    expect(UsageTracker.isFeatureAllowed("enterprise", "sla")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.getLimit
// ---------------------------------------------------------------------------

describe("UsageTracker.getLimit", () => {
  it("returns the numeric limit for numeric features", () => {
    expect(UsageTracker.getLimit("free", "maxUsers")).toBe(10);
    expect(UsageTracker.getLimit("free", "maxChannels")).toBe(5);
    expect(UsageTracker.getLimit("pro", "maxUsers")).toBe(200);
    expect(UsageTracker.getLimit("pro", "maxChannels")).toBe(100);
  });

  it("returns null for unlimited features (null in plan)", () => {
    expect(UsageTracker.getLimit("enterprise", "maxUsers")).toBeNull();
    expect(UsageTracker.getLimit("enterprise", "maxChannels")).toBeNull();
    expect(UsageTracker.getLimit("enterprise", "maxIntegrations")).toBeNull();
  });

  it("returns null for boolean features", () => {
    expect(UsageTracker.getLimit("free", "customBranding")).toBeNull();
    expect(UsageTracker.getLimit("pro", "advancedAnalytics")).toBeNull();
  });

  it("returns correct limits for starter tier", () => {
    expect(UsageTracker.getLimit("starter", "maxUsers")).toBe(50);
    expect(UsageTracker.getLimit("starter", "maxMessagesPerMonth")).toBe(
      100000,
    );
    expect(UsageTracker.getLimit("starter", "maxStorageGB")).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.checkLimit
// ---------------------------------------------------------------------------

describe("UsageTracker.checkLimit", () => {
  it("returns unlimited when limit is null (enterprise)", () => {
    const result = UsageTracker.checkLimit("enterprise", "maxUsers", 5000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.percentage).toBe(0);
  });

  it("allows usage below limit", () => {
    const result = UsageTracker.checkLimit("free", "maxUsers", 5);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.percentage).toBeCloseTo(50);
  });

  it("blocks usage at limit", () => {
    const result = UsageTracker.checkLimit("free", "maxUsers", 10);
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(10);
    expect(result.percentage).toBeCloseTo(100);
  });

  it("blocks usage above limit", () => {
    const result = UsageTracker.checkLimit("free", "maxChannels", 99);
    expect(result.allowed).toBe(false);
    expect(result.percentage).toBeGreaterThan(100);
  });

  it("calculates percentage correctly", () => {
    const result = UsageTracker.checkLimit("free", "maxUsers", 7);
    expect(result.percentage).toBeCloseTo(70);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.calculateWarnings
// ---------------------------------------------------------------------------

describe("UsageTracker.calculateWarnings", () => {
  it("returns empty array when usage is low", () => {
    const usage = makeUsage({ users: 1, channels: 1, messages: 100 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    expect(warnings).toHaveLength(0);
  });

  it("returns info warning at 75%+ usage", () => {
    // free maxUsers=10; 8 = 80%
    const usage = makeUsage({ users: 8 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    const userWarning = warnings.find((w) => w.feature === "Users");
    expect(userWarning).toBeDefined();
    expect(userWarning?.severity).toBe("info");
  });

  it("returns warning severity at 90%+ usage", () => {
    // free maxUsers=10; 9 = 90%
    const usage = makeUsage({ users: 9 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    const userWarning = warnings.find((w) => w.feature === "Users");
    expect(userWarning).toBeDefined();
    expect(userWarning?.severity).toBe("warning");
  });

  it("returns critical severity when at or over 100%", () => {
    // free maxUsers=10; 10 = 100%
    const usage = makeUsage({ users: 10 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    const userWarning = warnings.find((w) => w.feature === "Users");
    expect(userWarning).toBeDefined();
    expect(userWarning?.severity).toBe("critical");
  });

  it("sorts warnings by percentage descending", () => {
    // users=9 (90%) and channels=4 (80% of 5)
    const usage = makeUsage({ users: 9, channels: 4 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    expect(warnings[0].percentage).toBeGreaterThanOrEqual(
      warnings[1].percentage,
    );
  });

  it("skips unlimited features (enterprise)", () => {
    // enterprise has null limits — should produce no warnings
    const usage = makeUsage({
      users: 99999,
      channels: 99999,
      messages: 99999999,
    });
    const warnings = UsageTracker.calculateWarnings("enterprise", usage);
    expect(warnings).toHaveLength(0);
  });

  it("includes AI warnings when relevant", () => {
    // free aiSearchQueries=100; 96 = 96%
    const usage = makeUsage({ aiQueries: 96 });
    const warnings = UsageTracker.calculateWarnings("free", usage);
    const aiWarning = warnings.find((w) => w.feature === "AI Queries");
    expect(aiWarning).toBeDefined();
    expect(aiWarning?.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.hasExceededLimits
// ---------------------------------------------------------------------------

describe("UsageTracker.hasExceededLimits", () => {
  it("returns false when all usage is below limits", () => {
    const usage = makeUsage({
      users: 5,
      channels: 3,
      messages: 100,
      storageGB: 1,
    });
    expect(UsageTracker.hasExceededLimits("free", usage)).toBe(false);
  });

  it("returns true when users equal limit", () => {
    const usage = makeUsage({ users: 10 }); // free maxUsers=10
    expect(UsageTracker.hasExceededLimits("free", usage)).toBe(true);
  });

  it("returns true when any single metric exceeds limit", () => {
    const usage = makeUsage({ channels: 6 }); // free maxChannels=5
    expect(UsageTracker.hasExceededLimits("free", usage)).toBe(true);
  });

  it("returns false for enterprise (all limits null)", () => {
    const usage = makeUsage({
      users: 999999,
      channels: 99999,
      messages: 9999999,
    });
    expect(UsageTracker.hasExceededLimits("enterprise", usage)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.getUsageLimits
// ---------------------------------------------------------------------------

describe("UsageTracker.getUsageLimits", () => {
  it("returns a UsageLimits object with all required fields", () => {
    const usage = makeUsage({ users: 3 });
    const result = UsageTracker.getUsageLimits("free", usage);
    expect(result.plan).toBe("free");
    expect(result.current).toEqual(usage);
    expect(result.limits).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(typeof result.exceeded).toBe("boolean");
  });

  it("reports exceeded correctly when over limit", () => {
    const usage = makeUsage({ users: 11 }); // free max is 10
    const result = UsageTracker.getUsageLimits("free", usage);
    expect(result.exceeded).toBe(true);
  });

  it("reports not exceeded when within limits", () => {
    const usage = makeUsage({ users: 1 });
    const result = UsageTracker.getUsageLimits("pro", usage);
    expect(result.exceeded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.formatUsage
// ---------------------------------------------------------------------------

describe("UsageTracker.formatUsage", () => {
  it("formats usage with limit", () => {
    expect(UsageTracker.formatUsage(5, 10)).toBe("5 / 10");
  });

  it("formats usage with unit", () => {
    expect(UsageTracker.formatUsage(3, 10, " GB")).toBe("3 GB / 10 GB");
  });

  it("formats unlimited usage", () => {
    expect(UsageTracker.formatUsage(9999, null)).toBe("9,999 / Unlimited");
  });

  it("uses toLocaleString for large numbers", () => {
    const result = UsageTracker.formatUsage(1000000, 2000000);
    expect(result).toContain("1,000,000");
    expect(result).toContain("2,000,000");
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.getUsagePercentage
// ---------------------------------------------------------------------------

describe("UsageTracker.getUsagePercentage", () => {
  it("returns 0 for unlimited (null limit)", () => {
    expect(UsageTracker.getUsagePercentage(9999, null)).toBe(0);
  });

  it("calculates percentage correctly", () => {
    expect(UsageTracker.getUsagePercentage(5, 10)).toBe(50);
    expect(UsageTracker.getUsagePercentage(10, 10)).toBe(100);
  });

  it("caps at 100 when over limit", () => {
    expect(UsageTracker.getUsagePercentage(200, 10)).toBe(100);
  });

  it("returns 0 when current is 0", () => {
    expect(UsageTracker.getUsagePercentage(0, 100)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// UsageTracker.suggestUpgrade
// ---------------------------------------------------------------------------

describe("UsageTracker.suggestUpgrade", () => {
  it("returns null when limits are not exceeded", () => {
    const usage = makeUsage({ users: 1 });
    expect(UsageTracker.suggestUpgrade("free", usage)).toBeNull();
  });

  it("suggests next tier when current is exceeded", () => {
    // free maxUsers=10; starter maxUsers=50
    const usage = makeUsage({ users: 11 });
    const suggestion = UsageTracker.suggestUpgrade("free", usage);
    expect(suggestion).toBe("starter");
  });

  it("suggests a higher tier when next tier is also exceeded", () => {
    // free maxUsers=10; starter maxUsers=50; pro maxUsers=200
    const usage = makeUsage({ users: 60 });
    const suggestion = UsageTracker.suggestUpgrade("free", usage);
    expect(suggestion).toBe("pro");
  });

  it("returns 'enterprise' when all tiers are exceeded", () => {
    // enterprise has null limits so it never exceeds
    const usage = makeUsage({ users: 9000 });
    // business maxUsers=1000; enterprise is null (unlimited) so it won't exceed
    const suggestion = UsageTracker.suggestUpgrade("free", usage);
    // Could be enterprise or null depending on whether business is also exceeded
    // users=9000 exceeds business(1000) → enterprise
    expect(suggestion).toBe("enterprise");
  });

  it("returns null when already on enterprise with no exceeded limits", () => {
    const usage = makeUsage({ users: 1 });
    expect(UsageTracker.suggestUpgrade("enterprise", usage)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// requirePlanFeature
// ---------------------------------------------------------------------------

describe("requirePlanFeature", () => {
  it("returns a function that checks feature access", () => {
    const checkCustomBranding = requirePlanFeature("customBranding");
    expect(typeof checkCustomBranding).toBe("function");
    expect(checkCustomBranding("free")).toBe(false);
    expect(checkCustomBranding("starter")).toBe(true);
    expect(checkCustomBranding("pro")).toBe(true);
  });

  it("returns false for features with numeric values (not === true)", () => {
    const checkMaxUsers = requirePlanFeature("maxUsers");
    expect(checkMaxUsers("free")).toBe(false);
    expect(checkMaxUsers("pro")).toBe(false);
  });

  it("works correctly for a feature enabled on all paid tiers", () => {
    const checkVideoConferencing = requirePlanFeature("videoConferencing");
    // free also has videoConferencing=true
    expect(checkVideoConferencing("free")).toBe(true);
    expect(checkVideoConferencing("pro")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// requirePlanTier
// ---------------------------------------------------------------------------

describe("requirePlanTier", () => {
  it("allows same tier", () => {
    const requirePro = requirePlanTier("pro");
    expect(requirePro("pro")).toBe(true);
  });

  it("allows higher tier", () => {
    const requireStarter = requirePlanTier("starter");
    expect(requireStarter("pro")).toBe(true);
    expect(requireStarter("business")).toBe(true);
    expect(requireStarter("enterprise")).toBe(true);
  });

  it("denies lower tier", () => {
    const requirePro = requirePlanTier("pro");
    expect(requirePro("free")).toBe(false);
    expect(requirePro("starter")).toBe(false);
  });

  it("free tier always allows free minimum", () => {
    const requireFree = requirePlanTier("free");
    expect(requireFree("free")).toBe(true);
    expect(requireFree("enterprise")).toBe(true);
  });

  it("enterprise minimum only allows enterprise", () => {
    const requireEnterprise = requirePlanTier("enterprise");
    expect(requireEnterprise("enterprise")).toBe(true);
    expect(requireEnterprise("business")).toBe(false);
    expect(requireEnterprise("pro")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// incrementUsage
// ---------------------------------------------------------------------------

describe("incrementUsage", () => {
  it("increments the specified metric by 1 by default", () => {
    const usage = makeUsage({ users: 3 });
    const updated = incrementUsage(usage, "users");
    expect(updated.users).toBe(4);
  });

  it("increments by the specified amount", () => {
    const usage = makeUsage({ messages: 100 });
    const updated = incrementUsage(usage, "messages", 50);
    expect(updated.messages).toBe(150);
  });

  it("does not mutate the original usage object", () => {
    const usage = makeUsage({ channels: 5 });
    const updated = incrementUsage(usage, "channels", 3);
    expect(usage.channels).toBe(5); // original unchanged
    expect(updated.channels).toBe(8);
  });

  it("preserves all other metrics", () => {
    const usage = makeUsage({ users: 2, channels: 3, messages: 100 });
    const updated = incrementUsage(usage, "users", 1);
    expect(updated.channels).toBe(3);
    expect(updated.messages).toBe(100);
    expect(updated.userId).toBe("user-1");
    expect(updated.period).toBe("2026-05");
  });

  it("works for storageGB, bots, integrations, aiMinutes, aiQueries", () => {
    const usage = makeUsage({
      storageGB: 1.5,
      bots: 0,
      integrations: 2,
      aiMinutes: 10,
      aiQueries: 50,
    });
    expect(incrementUsage(usage, "storageGB", 0.5).storageGB).toBeCloseTo(2.0);
    expect(incrementUsage(usage, "bots", 2).bots).toBe(2);
    expect(incrementUsage(usage, "integrations", 1).integrations).toBe(3);
    expect(incrementUsage(usage, "aiMinutes", 5).aiMinutes).toBe(15);
    expect(incrementUsage(usage, "aiQueries", 10).aiQueries).toBe(60);
  });
});
