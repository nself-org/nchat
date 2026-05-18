/**
 * Gates Tests
 *
 * Tests for the custom gate functions and registry.
 */

import {
  GateRegistry,
  createGateRegistry,
  getGateRegistry,
  resetGateRegistry,
  BUILT_IN_GATES,
  timeBasedGate,
  roleBasedGate,
  tierComparisonGate,
  featureFlagGate,
  betaAccessGate,
  compositeGate,
  rateLimitGate,
  geographicGate,
  workspaceSizeGate,
  trialGate,
  channelTypeGate,
} from "../gates";
import type {
  EntitlementContext,
  CustomEntitlementDefinition,
  GateResult,
} from "../entitlement-types";

describe("GateRegistry", () => {
  let registry: GateRegistry;

  beforeEach(() => {
    resetGateRegistry();
    registry = createGateRegistry(false); // Without built-in gates
  });

  it("should register a gate", () => {
    registry.register({
      name: "test_gate",
      fn: async () => ({ allowed: true }),
      description: "Test gate",
    });

    expect(registry.has("test_gate")).toBe(true);
  });

  it("should throw when registering duplicate gate", () => {
    registry.register({
      name: "test_gate",
      fn: async () => ({ allowed: true }),
      description: "Test gate",
    });

    expect(() =>
      registry.register({
        name: "test_gate",
        fn: async () => ({ allowed: false }),
        description: "Duplicate gate",
      }),
    ).toThrow();
  });

  it("should unregister a gate", () => {
    registry.register({
      name: "test_gate",
      fn: async () => ({ allowed: true }),
      description: "Test gate",
    });

    const result = registry.unregister("test_gate");
    expect(result).toBe(true);
    expect(registry.has("test_gate")).toBe(false);
  });

  it("should return false when unregistering non-existent gate", () => {
    const result = registry.unregister("non_existent");
    expect(result).toBe(false);
  });

  it("should get a gate", () => {
    registry.register({
      name: "test_gate",
      fn: async () => ({ allowed: true }),
      description: "Test gate",
    });

    const gate = registry.get("test_gate");
    expect(gate).toBeDefined();
    expect(gate?.name).toBe("test_gate");
  });

  it("should return undefined for non-existent gate", () => {
    const gate = registry.get("non_existent");
    expect(gate).toBeUndefined();
  });

  it("should get all gates", () => {
    registry.register({
      name: "gate_1",
      fn: async () => ({ allowed: true }),
      description: "Gate 1",
    });
    registry.register({
      name: "gate_2",
      fn: async () => ({ allowed: false }),
      description: "Gate 2",
    });

    const gates = registry.getAll();
    expect(gates.length).toBe(2);
  });

  it("should execute a gate", async () => {
    registry.register({
      name: "test_gate",
      fn: async (context, definition) => ({
        allowed: context.planTier === "enterprise",
        reason: "Plan check",
      }),
      description: "Test gate",
    });

    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "enterprise",
    };

    const definition: CustomEntitlementDefinition = {
      key: "custom.test",
      name: "Test",
      description: "Test",
      category: "admin",
      valueType: "custom",
      inheritable: false,
      grantable: false,
      gateFn: "test_gate",
    };

    const result = await registry.execute(
      "test_gate",
      context,
      definition,
      undefined,
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("Plan check");
  });

  it("should throw when executing non-existent gate", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const definition: CustomEntitlementDefinition = {
      key: "custom.test",
      name: "Test",
      description: "Test",
      category: "admin",
      valueType: "custom",
      inheritable: false,
      grantable: false,
      gateFn: "non_existent",
    };

    await expect(
      registry.execute("non_existent", context, definition, undefined),
    ).rejects.toThrow();
  });

  it("should validate required parameters", async () => {
    registry.register({
      name: "param_gate",
      fn: async () => ({ allowed: true }),
      description: "Gate with params",
      requiredParams: ["requiredParam"],
    });

    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const definition: CustomEntitlementDefinition = {
      key: "custom.test",
      name: "Test",
      description: "Test",
      category: "admin",
      valueType: "custom",
      inheritable: false,
      grantable: false,
      gateFn: "param_gate",
      // Missing required gateParams
    };

    await expect(
      registry.execute("param_gate", context, definition, undefined),
    ).rejects.toThrow("Missing required gate parameter");
  });
});

describe("Built-in Gates", () => {
  it("should have all built-in gates registered", () => {
    expect(BUILT_IN_GATES.length).toBeGreaterThan(0);

    const expectedGates = [
      "time_based",
      "role_based",
      "tier_comparison",
      "feature_flag",
      "beta_access",
      "composite",
      "rate_limit",
      "geographic",
      "workspace_size",
      "trial",
      "channel_type",
    ];

    for (const gateName of expectedGates) {
      expect(BUILT_IN_GATES.find((g) => g.name === gateName)).toBeDefined();
    }
  });

  it("should include built-in gates in default registry", () => {
    const registry = getGateRegistry();

    expect(registry.has("time_based")).toBe(true);
    expect(registry.has("role_based")).toBe(true);
    expect(registry.has("tier_comparison")).toBe(true);
  });
});

describe("timeBasedGate", () => {
  const baseContext: EntitlementContext = {
    userId: "user-1",
    planTier: "professional",
  };

  const createDefinition = (allowedHours: {
    start: number;
    end: number;
  }): CustomEntitlementDefinition => ({
    key: "custom.time",
    name: "Time-based",
    description: "Time restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "time_based",
    gateParams: { allowedHours },
  });

  it("should allow when no time restrictions", async () => {
    const definition: CustomEntitlementDefinition = {
      key: "custom.time",
      name: "Time-based",
      description: "Time restriction",
      category: "admin",
      valueType: "custom",
      inheritable: false,
      grantable: false,
      gateFn: "time_based",
    };

    const result = await timeBasedGate(baseContext, definition, undefined);
    expect(result.allowed).toBe(true);
  });

  // Note: Time-based tests are tricky because they depend on current time
  // In a real scenario, we'd mock Date.now()
});

describe("roleBasedGate", () => {
  const createDefinition = (
    allowedRoles?: string[],
    deniedRoles?: string[],
  ): CustomEntitlementDefinition => ({
    key: "custom.role",
    name: "Role-based",
    description: "Role restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "role_based",
    gateParams: { allowedRoles, deniedRoles },
  });

  it("should deny when user role is not specified", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "professional",
    };

    const result = await roleBasedGate(
      context,
      createDefinition(["admin"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("User role not specified");
  });

  it("should allow when user role is in allowed roles", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      userRole: "admin",
      planTier: "professional",
    };

    const result = await roleBasedGate(
      context,
      createDefinition(["admin", "moderator"]),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when user role is not in allowed roles", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      userRole: "member",
      planTier: "professional",
    };

    const result = await roleBasedGate(
      context,
      createDefinition(["admin"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should deny when user role is in denied roles", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      userRole: "guest",
      planTier: "professional",
    };

    const result = await roleBasedGate(
      context,
      createDefinition(undefined, ["guest"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("tierComparisonGate", () => {
  const createDefinition = (
    minimumTier?: string,
    exactTier?: string,
    excludeTiers?: string[],
  ): CustomEntitlementDefinition => ({
    key: "custom.tier",
    name: "Tier-based",
    description: "Tier restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "tier_comparison",
    gateParams: { minimumTier, exactTier, excludeTiers },
  });

  it("should allow when plan meets minimum tier", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "professional",
    };

    const result = await tierComparisonGate(
      context,
      createDefinition("starter"),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when plan is below minimum tier", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await tierComparisonGate(
      context,
      createDefinition("professional"),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should match exact tier", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "professional",
    };

    const result = await tierComparisonGate(
      context,
      createDefinition(undefined, "professional"),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when not matching exact tier", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "enterprise",
    };

    const result = await tierComparisonGate(
      context,
      createDefinition(undefined, "professional"),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should deny excluded tiers", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await tierComparisonGate(
      context,
      createDefinition(undefined, undefined, ["free", "starter"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("betaAccessGate", () => {
  const createDefinition = (
    betaGroup?: string,
    rolloutPercentage?: number,
  ): CustomEntitlementDefinition => ({
    key: "custom.beta",
    name: "Beta Access",
    description: "Beta restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "beta_access",
    gateParams: { betaGroup, rolloutPercentage },
  });

  it("should allow when user has beta access", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { betaAccess: true },
    };

    const result = await betaAccessGate(context, createDefinition(), undefined);
    expect(result.allowed).toBe(true);
  });

  it("should deny when user does not have beta access", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { betaAccess: false },
    };

    const result = await betaAccessGate(context, createDefinition(), undefined);
    expect(result.allowed).toBe(false);
  });

  it("should check beta group membership", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { betaGroups: ["feature-x", "feature-y"] },
    };

    const result = await betaAccessGate(
      context,
      createDefinition("feature-x"),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when not in beta group", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { betaGroups: ["feature-y"] },
    };

    const result = await betaAccessGate(
      context,
      createDefinition("feature-x"),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should handle percentage-based rollout", async () => {
    // With 100% rollout, should always be allowed
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await betaAccessGate(
      context,
      createDefinition(undefined, 100),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny with 0% rollout", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await betaAccessGate(
      context,
      createDefinition(undefined, 0),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("geographicGate", () => {
  const createDefinition = (
    allowedCountries?: string[],
    blockedCountries?: string[],
  ): CustomEntitlementDefinition => ({
    key: "custom.geo",
    name: "Geographic",
    description: "Geographic restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "geographic",
    gateParams: { allowedCountries, blockedCountries },
  });

  it("should allow when no location data", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await geographicGate(
      context,
      createDefinition(["US", "CA"]),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should allow when in allowed countries", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { country: "US" },
    };

    const result = await geographicGate(
      context,
      createDefinition(["US", "CA"]),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when not in allowed countries", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { country: "DE" },
    };

    const result = await geographicGate(
      context,
      createDefinition(["US", "CA"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should deny when in blocked countries", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { country: "RU" },
    };

    const result = await geographicGate(
      context,
      createDefinition(undefined, ["RU", "CN"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("workspaceSizeGate", () => {
  const createDefinition = (
    minMembers?: number,
    maxMembers?: number,
  ): CustomEntitlementDefinition => ({
    key: "custom.size",
    name: "Workspace Size",
    description: "Size restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "workspace_size",
    gateParams: { minMembers, maxMembers },
  });

  it("should allow when no member count data", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await workspaceSizeGate(
      context,
      createDefinition(5, 100),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should allow when within size range", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { workspaceMemberCount: 50 },
    };

    const result = await workspaceSizeGate(
      context,
      createDefinition(10, 100),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when below minimum", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { workspaceMemberCount: 3 },
    };

    const result = await workspaceSizeGate(
      context,
      createDefinition(10),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should deny when above maximum", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { workspaceMemberCount: 150 },
    };

    const result = await workspaceSizeGate(
      context,
      createDefinition(undefined, 100),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("trialGate", () => {
  const createDefinition = (
    trialDays?: number,
    allowedFeatures?: string[],
  ): CustomEntitlementDefinition => ({
    key: "custom.trial",
    name: "Trial",
    description: "Trial restriction",
    category: "admin",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "trial",
    gateParams: { trialDays, allowedFeatures },
  });

  it("should allow when not in trial", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { isInTrial: false },
    };

    const result = await trialGate(context, createDefinition(), undefined);
    expect(result.allowed).toBe(true);
  });

  it("should allow during valid trial period", async () => {
    const now = new Date();
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: {
        isInTrial: true,
        trialStartDate: now.toISOString(),
      },
    };

    const result = await trialGate(context, createDefinition(30), undefined);
    expect(result.allowed).toBe(true);
  });

  it("should deny after trial expiration", async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 31);

    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: {
        isInTrial: true,
        trialStartDate: expiredDate.toISOString(),
      },
    };

    const result = await trialGate(context, createDefinition(30), undefined);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Trial period has expired");
  });
});

describe("channelTypeGate", () => {
  const createDefinition = (
    allowedTypes?: string[],
    deniedTypes?: string[],
  ): CustomEntitlementDefinition => ({
    key: "custom.channel",
    name: "Channel Type",
    description: "Channel type restriction",
    category: "channels",
    valueType: "custom",
    inheritable: false,
    grantable: false,
    gateFn: "channel_type",
    gateParams: { allowedTypes, deniedTypes },
  });

  it("should allow when no channel type", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
    };

    const result = await channelTypeGate(
      context,
      createDefinition(["public"]),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should allow when channel type is allowed", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { channelType: "public" },
    };

    const result = await channelTypeGate(
      context,
      createDefinition(["public", "private"]),
      undefined,
    );
    expect(result.allowed).toBe(true);
  });

  it("should deny when channel type is not allowed", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { channelType: "dm" },
    };

    const result = await channelTypeGate(
      context,
      createDefinition(["public"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });

  it("should deny when channel type is denied", async () => {
    const context: EntitlementContext = {
      userId: "user-1",
      planTier: "free",
      metadata: { channelType: "voice" },
    };

    const result = await channelTypeGate(
      context,
      createDefinition(undefined, ["voice"]),
      undefined,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("Singleton", () => {
  beforeEach(() => {
    resetGateRegistry();
  });

  it("should return same instance", () => {
    const registry1 = getGateRegistry();
    const registry2 = getGateRegistry();

    expect(registry1).toBe(registry2);
  });

  it("should reset singleton", () => {
    const registry1 = getGateRegistry();
    registry1.register({
      name: "custom_gate",
      fn: async () => ({ allowed: true }),
      description: "Custom",
    });

    resetGateRegistry();

    const registry2 = getGateRegistry();
    expect(registry2.has("custom_gate")).toBe(false);
  });
});
