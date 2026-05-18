/**
 * Entitlement Service Tests
 *
 * Comprehensive tests for the entitlement service.
 */

import {
  EntitlementService,
  createEntitlementService,
  getEntitlementService,
  resetEntitlementService,
  ENTITLEMENT_DEFINITIONS,
} from "../entitlement.service";
import {
  createEntitlementGraph,
  resetEntitlementGraph,
} from "@/lib/entitlements/entitlement-graph";
import {
  createGateRegistry,
  resetGateRegistry,
} from "@/lib/entitlements/gates";
import type {
  EntitlementContext,
  EntitlementGrant,
  CreateEntitlementGrantInput,
  EntitlementEvent,
} from "@/lib/entitlements/entitlement-types";

describe("EntitlementService", () => {
  let service: EntitlementService;

  beforeEach(() => {
    resetEntitlementGraph();
    resetGateRegistry();
    resetEntitlementService();

    service = createEntitlementService({
      graph: createEntitlementGraph(),
      gateRegistry: createGateRegistry(),
      cacheConfig: { enabled: false }, // Disable cache for testing
    });
  });

  describe("Definition Management", () => {
    it("should get a definition by key", () => {
      const def = service.getDefinition("feature.video_calls");

      expect(def).toBeDefined();
      expect(def?.key).toBe("feature.video_calls");
      expect(def?.valueType).toBe("boolean");
    });

    it("should return undefined for unknown definition", () => {
      const def = service.getDefinition("unknown.feature");
      expect(def).toBeUndefined();
    });

    it("should get all definitions", () => {
      const definitions = service.getAllDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.some((d) => d.key === "feature.video_calls")).toBe(
        true,
      );
      expect(definitions.some((d) => d.key === "limit.max_members")).toBe(true);
    });

    it("should get definitions by category", () => {
      const callDefs = service.getDefinitionsByCategory("calls");

      expect(callDefs.every((d) => d.category === "calls")).toBe(true);
      expect(callDefs.some((d) => d.key === "feature.video_calls")).toBe(true);
    });

    it("should have all expected feature definitions", () => {
      const featureKeys = [
        "feature.public_channels",
        "feature.private_channels",
        "feature.direct_messages",
        "feature.group_dms",
        "feature.threads",
        "feature.file_uploads",
        "feature.voice_messages",
        "feature.video_calls",
        "feature.screen_sharing",
        "feature.custom_emoji",
        "feature.webhooks",
        "feature.integrations",
        "feature.api_access",
        "feature.sso",
        "feature.audit_logs",
        "feature.admin_dashboard",
        "feature.priority_support",
        "feature.custom_branding",
        "feature.data_export",
      ];

      for (const key of featureKeys) {
        expect(service.getDefinition(key)).toBeDefined();
      }
    });

    it("should have all expected limit definitions", () => {
      const limitKeys = [
        "limit.max_members",
        "limit.max_channels",
        "limit.max_storage_bytes",
        "limit.max_file_size_bytes",
        "limit.max_api_calls_per_month",
        "limit.max_call_participants",
        "limit.max_stream_duration_minutes",
        "limit.message_retention_days",
        "limit.search_history_days",
      ];

      for (const key of limitKeys) {
        expect(service.getDefinition(key)).toBeDefined();
      }
    });
  });

  describe("Plan-Based Entitlements", () => {
    it("should get entitlement value from plan", () => {
      const videoCallsFree = service.getPlanEntitlementValue(
        "feature.video_calls",
        "free",
      );
      expect(videoCallsFree).toBe(false);

      const videoCallsStarter = service.getPlanEntitlementValue(
        "feature.video_calls",
        "starter",
      );
      expect(videoCallsStarter).toBe(true);
    });

    it("should get limit values from plan", () => {
      const maxMembersFree = service.getPlanEntitlementValue(
        "limit.max_members",
        "free",
      );
      expect(maxMembersFree).toBe(10);

      const maxMembersEnterprise = service.getPlanEntitlementValue(
        "limit.max_members",
        "enterprise",
      );
      expect(maxMembersEnterprise).toBeNull(); // Unlimited
    });

    it("should get all entitlements for a plan", () => {
      const entitlements = service.getPlanEntitlements("professional");

      expect(entitlements.get("feature.video_calls")).toBe(true);
      expect(entitlements.get("feature.screen_sharing")).toBe(true);
      expect(entitlements.get("feature.api_access")).toBe(true);
      expect(entitlements.get("limit.max_members")).toBe(100);
    });
  });

  describe("Grant Management", () => {
    it("should create a grant", async () => {
      const input: CreateEntitlementGrantInput = {
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
        reason: "Manual override",
      };

      const grant = await service.createGrant(input);

      expect(grant.id).toBeDefined();
      expect(grant.entitlementKey).toBe("feature.video_calls");
      expect(grant.value).toBe(true);
      expect(grant.active).toBe(true);
    });

    it("should reject grant for unknown entitlement", async () => {
      const input: CreateEntitlementGrantInput = {
        entitlementKey: "unknown.feature",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      };

      await expect(service.createGrant(input)).rejects.toThrow(
        "Unknown entitlement",
      );
    });

    it("should reject grant for non-grantable entitlement", async () => {
      // Register a non-grantable definition for testing
      const key = "test.non_grantable";
      ENTITLEMENT_DEFINITIONS[key] = {
        key,
        name: "Non-grantable",
        description: "Test",
        category: "admin",
        valueType: "boolean",
        inheritable: false,
        grantable: false,
        defaultValue: false,
      };

      const input: CreateEntitlementGrantInput = {
        entitlementKey: key,
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      };

      await expect(service.createGrant(input)).rejects.toThrow("not grantable");

      // Clean up
      delete ENTITLEMENT_DEFINITIONS[key];
    });

    it("should validate boolean value type", async () => {
      const input: CreateEntitlementGrantInput = {
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: "invalid", // Should be boolean
      };

      await expect(service.createGrant(input)).rejects.toThrow(
        "Expected boolean",
      );
    });

    it("should validate numeric value type", async () => {
      const input: CreateEntitlementGrantInput = {
        entitlementKey: "limit.max_members",
        scope: "workspace",
        entityId: "ws-1",
        value: "invalid", // Should be number
      };

      await expect(service.createGrant(input)).rejects.toThrow(
        "Expected numeric",
      );
    });

    it("should allow null for numeric (unlimited)", async () => {
      const input: CreateEntitlementGrantInput = {
        entitlementKey: "limit.max_members",
        scope: "workspace",
        entityId: "ws-1",
        value: null,
      };

      const grant = await service.createGrant(input);
      expect(grant.value).toBeNull();
    });

    it("should update a grant", async () => {
      // Create grant first
      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      // Update it
      const updated = await service.updateGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
        { value: false, reason: "Disabled" },
      );

      expect(updated?.value).toBe(false);
      expect(updated?.reason).toBe("Disabled");
    });

    it("should return null when updating non-existent grant", async () => {
      const result = await service.updateGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
        { value: false },
      );

      expect(result).toBeNull();
    });

    it("should delete a grant", async () => {
      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      const deleted = await service.deleteGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
      );

      expect(deleted).toBe(true);

      const grant = await service.getGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
      );
      expect(grant).toBeUndefined();
    });

    it("should get all grants for an entity", async () => {
      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      await service.createGrant({
        entitlementKey: "feature.screen_sharing",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      const grants = await service.getGrants("workspace", "ws-1");
      expect(grants.length).toBe(2);
    });
  });

  describe("Evaluation", () => {
    it("should evaluate boolean entitlement from plan", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      const result = await service.evaluate("feature.video_calls", context);

      expect(result.granted).toBe(true);
      expect(result.value).toBe(true);
      expect(result.source).toBe("plan");
    });

    it("should deny entitlement for insufficient plan", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "free",
      };

      const result = await service.evaluate("feature.video_calls", context);

      expect(result.granted).toBe(false);
      expect(result.value).toBe(false);
      expect(result.denialReason).toBeDefined();
      expect(result.upgradeRequired).toBeDefined();
    });

    it("should evaluate grant override", async () => {
      // Create a grant that overrides plan
      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
        source: "grant",
      });

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free", // Plan doesn't have video calls
      };

      const result = await service.evaluate("feature.video_calls", context);

      expect(result.granted).toBe(true);
      expect(result.source).toBe("grant");
    });

    it("should evaluate numeric entitlement", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      const result = await service.evaluate("limit.max_members", context);

      expect(result.granted).toBe(true);
      expect(result.value).toBe(100);
      expect(result.valueType).toBe("numeric");
    });

    it("should handle unlimited (null) values", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "enterprise",
      };

      const result = await service.evaluate("limit.max_members", context);

      expect(result.granted).toBe(true);
      expect(result.value).toBeNull();
    });

    it("should return unknown entitlement as not granted", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      const result = await service.evaluate("unknown.feature", context);

      expect(result.granted).toBe(false);
      expect(result.denialReason).toContain("Unknown entitlement");
    });

    it("should batch evaluate entitlements", async () => {
      const response = await service.evaluateBatch({
        context: {
          userId: "user-1",
          planTier: "professional",
        },
        entitlementKeys: [
          "feature.video_calls",
          "feature.screen_sharing",
          "limit.max_members",
        ],
      });

      expect(Object.keys(response.results).length).toBe(3);
      expect(response.results["feature.video_calls"].granted).toBe(true);
      expect(response.results["feature.screen_sharing"].granted).toBe(true);
      expect(response.results["limit.max_members"].value).toBe(100);
    });

    it("should handle errors in batch evaluation", async () => {
      const response = await service.evaluateBatch({
        context: {
          userId: "user-1",
          planTier: "professional",
        },
        entitlementKeys: ["feature.video_calls", "unknown.feature"],
      });

      expect(response.results["feature.video_calls"].granted).toBe(true);
      expect(response.results["unknown.feature"].granted).toBe(false);
    });
  });

  describe("Convenience Methods", () => {
    it("should check hasEntitlement", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      const hasVideoCall = await service.hasEntitlement(
        "feature.video_calls",
        context,
      );
      expect(hasVideoCall).toBe(true);

      const hasSso = await service.hasEntitlement("feature.sso", context);
      expect(hasSso).toBe(false); // SSO requires enterprise
    });

    it("should check hasAllEntitlements", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      const hasAll = await service.hasAllEntitlements(
        ["feature.video_calls", "feature.screen_sharing"],
        context,
      );
      expect(hasAll).toBe(true);

      const hasAllWithSso = await service.hasAllEntitlements(
        ["feature.video_calls", "feature.sso"],
        context,
      );
      expect(hasAllWithSso).toBe(false);
    });

    it("should check hasAnyEntitlement", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "free",
      };

      const hasAny = await service.hasAnyEntitlement(
        ["feature.video_calls", "feature.direct_messages"],
        context,
      );
      expect(hasAny).toBe(true); // direct_messages is true for free

      const hasAnyPremium = await service.hasAnyEntitlement(
        ["feature.video_calls", "feature.sso"],
        context,
      );
      expect(hasAnyPremium).toBe(false);
    });
  });

  describe("Limit Checking", () => {
    it("should check if within limit", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "free", // max 10 members
      };

      const check1 = await service.checkLimit(
        "limit.max_members",
        context,
        5,
        1,
      );
      expect(check1.withinLimit).toBe(true);
      expect(check1.remaining).toBe(4);
      expect(check1.warning).toBe("none");

      const check2 = await service.checkLimit(
        "limit.max_members",
        context,
        8,
        1,
      );
      expect(check2.withinLimit).toBe(true);
      expect(check2.warning).toBe("critical"); // 9/10 = 90%

      const check3 = await service.checkLimit(
        "limit.max_members",
        context,
        10,
        1,
      );
      expect(check3.withinLimit).toBe(false);
      expect(check3.warning).toBe("exceeded");
    });

    it("should handle unlimited limits", async () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "enterprise", // unlimited members
      };

      const check = await service.checkLimit(
        "limit.max_members",
        context,
        1000,
        1,
      );
      expect(check.withinLimit).toBe(true);
      expect(check.limit).toBeNull();
      expect(check.remaining).toBeNull();
    });
  });

  describe("Event Handling", () => {
    it("should emit events", async () => {
      const events: EntitlementEvent[] = [];

      service.on("entitlement.granted", (event) => {
        events.push(event);
      });

      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("entitlement.granted");
      expect(events[0].entitlementKey).toBe("feature.video_calls");
    });

    it("should emit revoke event on delete", async () => {
      const events: EntitlementEvent[] = [];

      service.on("entitlement.revoked", (event) => {
        events.push(event);
      });

      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      await service.deleteGrant("workspace", "ws-1", "feature.video_calls");

      expect(events.length).toBe(1);
      expect(events[0].type).toBe("entitlement.revoked");
    });

    it("should remove event listener", async () => {
      const events: EntitlementEvent[] = [];
      const listener = (event: EntitlementEvent) => events.push(event);

      service.on("entitlement.granted", listener);
      service.off("entitlement.granted", listener);

      await service.createGrant({
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        value: true,
      });

      expect(events.length).toBe(0);
    });
  });

  describe("Cache", () => {
    it("should cache evaluation results when enabled", async () => {
      const cachedService = createEntitlementService({
        graph: createEntitlementGraph(),
        gateRegistry: createGateRegistry(),
        cacheConfig: {
          enabled: true,
          ttl: 300,
          maxSize: 100,
          namespace: "test",
          warmOnStartup: false,
        },
      });

      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "professional",
      };

      // First call - cache miss
      await cachedService.evaluate("feature.video_calls", context);

      // Get cache stats
      const stats = cachedService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it("should clear cache", async () => {
      const cachedService = createEntitlementService({
        cacheConfig: {
          enabled: true,
          ttl: 300,
          maxSize: 100,
          namespace: "test",
          warmOnStartup: false,
        },
      });

      await cachedService.evaluate("feature.video_calls", {
        userId: "user-1",
        planTier: "professional",
      });

      cachedService.clearCache();

      const stats = cachedService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("Singleton", () => {
    beforeEach(() => {
      resetEntitlementService();
    });

    it("should return same instance", () => {
      const instance1 = getEntitlementService();
      const instance2 = getEntitlementService();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getEntitlementService();
      resetEntitlementService();
      const instance2 = getEntitlementService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
