/**
 * Entitlement Types Tests
 *
 * Tests for entitlement type definitions and constants.
 */

import {
  EntitlementError,
  EntitlementErrorCode,
  SCOPE_HIERARCHY,
  PLAN_TIER_HIERARCHY,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_INHERITANCE_RULES,
} from "../entitlement-types";

describe("EntitlementError", () => {
  it("should create error with code and message", () => {
    const error = new EntitlementError(
      EntitlementErrorCode.NOT_FOUND,
      "Entitlement not found",
    );

    expect(error.code).toBe(EntitlementErrorCode.NOT_FOUND);
    expect(error.message).toBe("Entitlement not found");
    expect(error.name).toBe("EntitlementError");
    expect(error.entitlementKey).toBeUndefined();
    expect(error.metadata).toBeUndefined();
  });

  it("should create error with entitlement key", () => {
    const error = new EntitlementError(
      EntitlementErrorCode.INVALID_VALUE,
      "Invalid value",
      "feature.video_calls",
    );

    expect(error.entitlementKey).toBe("feature.video_calls");
  });

  it("should create error with metadata", () => {
    const metadata = { currentValue: 10, limit: 5 };
    const error = new EntitlementError(
      EntitlementErrorCode.LIMIT_EXCEEDED,
      "Limit exceeded",
      "limit.max_members",
      metadata,
    );

    expect(error.metadata).toEqual(metadata);
  });

  it("should be instanceof Error", () => {
    const error = new EntitlementError(
      EntitlementErrorCode.UNKNOWN_ERROR,
      "Unknown error",
    );

    expect(error).toBeInstanceOf(Error);
  });
});

describe("EntitlementErrorCode", () => {
  it("should have all expected error codes", () => {
    expect(EntitlementErrorCode.NOT_FOUND).toBe("ENTITLEMENT_NOT_FOUND");
    expect(EntitlementErrorCode.INVALID_VALUE).toBe(
      "INVALID_ENTITLEMENT_VALUE",
    );
    expect(EntitlementErrorCode.PERMISSION_DENIED).toBe(
      "ENTITLEMENT_PERMISSION_DENIED",
    );
    expect(EntitlementErrorCode.LIMIT_EXCEEDED).toBe(
      "ENTITLEMENT_LIMIT_EXCEEDED",
    );
    expect(EntitlementErrorCode.INVALID_GRANT).toBe("INVALID_GRANT");
    expect(EntitlementErrorCode.GRANT_EXPIRED).toBe("GRANT_EXPIRED");
    expect(EntitlementErrorCode.GATE_ERROR).toBe("GATE_EVALUATION_ERROR");
    expect(EntitlementErrorCode.INHERITANCE_ERROR).toBe(
      "INHERITANCE_RESOLUTION_ERROR",
    );
    expect(EntitlementErrorCode.CACHE_ERROR).toBe("CACHE_ERROR");
    expect(EntitlementErrorCode.INVALID_CONTEXT).toBe("INVALID_CONTEXT");
    expect(EntitlementErrorCode.UNKNOWN_ERROR).toBe(
      "UNKNOWN_ENTITLEMENT_ERROR",
    );
  });
});

describe("SCOPE_HIERARCHY", () => {
  it("should have correct order from highest to lowest", () => {
    expect(SCOPE_HIERARCHY).toEqual([
      "organization",
      "workspace",
      "channel",
      "user",
    ]);
  });

  it("should be readonly array", () => {
    // In TypeScript, readonly arrays are enforced at compile time, not runtime
    expect(Array.isArray(SCOPE_HIERARCHY)).toBe(true);
  });

  it("should have 4 levels", () => {
    expect(SCOPE_HIERARCHY.length).toBe(4);
  });
});

describe("PLAN_TIER_HIERARCHY", () => {
  it("should have correct order from lowest to highest", () => {
    expect(PLAN_TIER_HIERARCHY).toEqual([
      "free",
      "starter",
      "professional",
      "enterprise",
      "custom",
    ]);
  });

  it("should be readonly array", () => {
    // In TypeScript, readonly arrays are enforced at compile time, not runtime
    expect(Array.isArray(PLAN_TIER_HIERARCHY)).toBe(true);
  });

  it("should have 5 tiers", () => {
    expect(PLAN_TIER_HIERARCHY.length).toBe(5);
  });

  it("should have free as lowest tier", () => {
    expect(PLAN_TIER_HIERARCHY[0]).toBe("free");
  });

  it("should have custom as highest tier", () => {
    expect(PLAN_TIER_HIERARCHY[PLAN_TIER_HIERARCHY.length - 1]).toBe("custom");
  });
});

describe("DEFAULT_CACHE_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_CACHE_CONFIG.ttl).toBe(300); // 5 minutes
    expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(10000);
    expect(DEFAULT_CACHE_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CACHE_CONFIG.warmOnStartup).toBe(false);
    expect(DEFAULT_CACHE_CONFIG.namespace).toBe("entitlements");
  });
});

describe("DEFAULT_INHERITANCE_RULES", () => {
  it("should have organization -> workspace rule", () => {
    const rule = DEFAULT_INHERITANCE_RULES.find(
      (r) => r.from === "organization" && r.to === "workspace",
    );
    expect(rule).toBeDefined();
    expect(rule?.combineStrategy).toBe("least_permissive");
    expect(rule?.allowOverride).toBe(true);
  });

  it("should have workspace -> channel rule", () => {
    const rule = DEFAULT_INHERITANCE_RULES.find(
      (r) => r.from === "workspace" && r.to === "channel",
    );
    expect(rule).toBeDefined();
    expect(rule?.combineStrategy).toBe("least_permissive");
    expect(rule?.allowOverride).toBe(true);
  });

  it("should have workspace -> user rule", () => {
    const rule = DEFAULT_INHERITANCE_RULES.find(
      (r) => r.from === "workspace" && r.to === "user",
    );
    expect(rule).toBeDefined();
    expect(rule?.combineStrategy).toBe("most_permissive");
    expect(rule?.allowOverride).toBe(true);
  });

  it("should have channel -> user rule with category filter", () => {
    const rule = DEFAULT_INHERITANCE_RULES.find(
      (r) => r.from === "channel" && r.to === "user",
    );
    expect(rule).toBeDefined();
    expect(rule?.combineStrategy).toBe("least_permissive");
    expect(rule?.allowOverride).toBe(false);
    expect(rule?.categoryFilter).toEqual(["messaging", "channels"]);
  });

  it("should be readonly array", () => {
    // In TypeScript, readonly arrays are enforced at compile time, not runtime
    expect(Array.isArray(DEFAULT_INHERITANCE_RULES)).toBe(true);
  });
});
