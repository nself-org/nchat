/**
 * Entitlement Graph Tests
 *
 * Tests for the entitlement inheritance graph.
 */

import {
  EntitlementGraph,
  createEntitlementGraph,
  getEntitlementGraph,
  resetEntitlementGraph,
} from "../entitlement-graph";
import type {
  BooleanEntitlementDefinition,
  NumericEntitlementDefinition,
  TierEntitlementDefinition,
  EntitlementGrant,
  EntitlementContext,
  InheritanceRule,
} from "../entitlement-types";

describe("EntitlementGraph", () => {
  let graph: EntitlementGraph;

  beforeEach(() => {
    resetEntitlementGraph();
    graph = createEntitlementGraph();
  });

  describe("Node Management", () => {
    it("should add a node", () => {
      graph.addNode("workspace", "ws-1");

      expect(graph.hasNode("workspace", "ws-1")).toBe(true);
      expect(graph.size).toBe(1);
    });

    it("should add node with plan tier", () => {
      graph.addNode("organization", "org-1", { planTier: "professional" });

      const node = graph.getNode("organization", "org-1");
      expect(node?.planTier).toBe("professional");
    });

    it("should add node with parent", () => {
      graph.addNode("organization", "org-1");
      graph.addNode("workspace", "ws-1", { parentId: "org-1" });

      const node = graph.getNode("workspace", "ws-1");
      expect(node?.parentId).toBe("org-1");
    });

    it("should not duplicate nodes", () => {
      graph.addNode("workspace", "ws-1");
      graph.addNode("workspace", "ws-1", { planTier: "enterprise" });

      expect(graph.size).toBe(1);
      const node = graph.getNode("workspace", "ws-1");
      expect(node?.planTier).toBe("enterprise");
    });

    it("should get a node", () => {
      graph.addNode("channel", "ch-1");

      const node = graph.getNode("channel", "ch-1");
      expect(node).toBeDefined();
      expect(node?.scope).toBe("channel");
      expect(node?.entityId).toBe("ch-1");
    });

    it("should return undefined for non-existent node", () => {
      const node = graph.getNode("workspace", "non-existent");
      expect(node).toBeUndefined();
    });

    it("should remove a node", () => {
      graph.addNode("workspace", "ws-1");
      expect(graph.hasNode("workspace", "ws-1")).toBe(true);

      const result = graph.removeNode("workspace", "ws-1");
      expect(result).toBe(true);
      expect(graph.hasNode("workspace", "ws-1")).toBe(false);
    });

    it("should return false when removing non-existent node", () => {
      const result = graph.removeNode("workspace", "non-existent");
      expect(result).toBe(false);
    });

    it("should link parent and child nodes", () => {
      graph.addNode("organization", "org-1");
      graph.addNode("workspace", "ws-1", { parentId: "org-1" });

      const parent = graph.getNode("organization", "org-1");
      expect(parent?.children.has("workspace:ws-1")).toBe(true);
    });
  });

  describe("Grant Management", () => {
    const createGrant = (
      key: string,
      value: unknown,
      overrides?: Partial<EntitlementGrant>,
    ): EntitlementGrant => ({
      id: "grant-1",
      entitlementKey: key,
      scope: "workspace",
      entityId: "ws-1",
      source: "grant",
      value,
      priority: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      ...overrides,
    });

    it("should add a grant", () => {
      const grant = createGrant("feature.video_calls", true);
      graph.addGrant("workspace", "ws-1", grant);

      const retrieved = graph.getGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
      );
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe(true);
    });

    it("should create node if it does not exist when adding grant", () => {
      const grant = createGrant("feature.video_calls", true);
      graph.addGrant("workspace", "ws-1", grant);

      expect(graph.hasNode("workspace", "ws-1")).toBe(true);
    });

    it("should get all grants for a node", () => {
      graph.addGrant(
        "workspace",
        "ws-1",
        createGrant("feature.video_calls", true),
      );
      graph.addGrant(
        "workspace",
        "ws-1",
        createGrant("feature.screen_sharing", false),
      );

      const grants = graph.getGrants("workspace", "ws-1");
      expect(grants.length).toBe(2);
    });

    it("should return empty array for node without grants", () => {
      graph.addNode("workspace", "ws-1");
      const grants = graph.getGrants("workspace", "ws-1");
      expect(grants).toEqual([]);
    });

    it("should remove a grant", () => {
      graph.addGrant(
        "workspace",
        "ws-1",
        createGrant("feature.video_calls", true),
      );

      const result = graph.removeGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
      );
      expect(result).toBe(true);
      expect(
        graph.getGrant("workspace", "ws-1", "feature.video_calls"),
      ).toBeUndefined();
    });

    it("should return false when removing non-existent grant", () => {
      const result = graph.removeGrant(
        "workspace",
        "ws-1",
        "feature.video_calls",
      );
      expect(result).toBe(false);
    });
  });

  describe("Scope Hierarchy", () => {
    it("should get parent scope", () => {
      expect(graph.getParentScope("workspace")).toBe("organization");
      expect(graph.getParentScope("channel")).toBe("workspace");
      expect(graph.getParentScope("user")).toBe("channel");
      expect(graph.getParentScope("organization")).toBeUndefined();
    });

    it("should get child scope", () => {
      expect(graph.getChildScope("organization")).toBe("workspace");
      expect(graph.getChildScope("workspace")).toBe("channel");
      expect(graph.getChildScope("channel")).toBe("user");
      expect(graph.getChildScope("user")).toBeUndefined();
    });
  });

  describe("Inheritance Chain", () => {
    it("should build inheritance chain", () => {
      const context: EntitlementContext = {
        userId: "user-1",
        organizationId: "org-1",
        workspaceId: "ws-1",
        channelId: "ch-1",
        planTier: "professional",
      };

      const chain = graph.buildInheritanceChain(context);

      expect(chain.scope).toBe("channel");
      expect(chain.entityId).toBe("ch-1");
      expect(chain.chain.length).toBe(4);
      expect(chain.chain[0].scope).toBe("organization");
      expect(chain.chain[1].scope).toBe("workspace");
      expect(chain.chain[2].scope).toBe("channel");
      expect(chain.chain[3].scope).toBe("user");
    });

    it("should build minimal chain for user-only context", () => {
      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "free",
      };

      const chain = graph.buildInheritanceChain(context);

      expect(chain.scope).toBe("user");
      expect(chain.entityId).toBe("user-1");
      expect(chain.chain.length).toBe(1);
    });

    it("should include plan tier from nodes", () => {
      graph.addNode("organization", "org-1", { planTier: "enterprise" });

      const context: EntitlementContext = {
        userId: "user-1",
        organizationId: "org-1",
        planTier: "professional",
      };

      const chain = graph.buildInheritanceChain(context);

      expect(chain.chain[0].planTier).toBe("enterprise");
    });
  });

  describe("Resolution", () => {
    const booleanDef: BooleanEntitlementDefinition = {
      key: "feature.video_calls",
      name: "Video Calls",
      description: "Video call access",
      category: "calls",
      valueType: "boolean",
      inheritable: true,
      grantable: true,
      defaultValue: false,
    };

    const numericDef: NumericEntitlementDefinition = {
      key: "limit.max_members",
      name: "Max Members",
      description: "Maximum members",
      category: "admin",
      valueType: "numeric",
      inheritable: true,
      grantable: true,
      defaultValue: 10,
      maxValue: null,
      unit: "members",
    };

    const tierDef: TierEntitlementDefinition = {
      key: "tier.access",
      name: "Tier Access",
      description: "Plan tier check",
      category: "admin",
      valueType: "tier",
      inheritable: true,
      grantable: false,
      minimumTier: "professional",
      tierOrder: ["free", "starter", "professional", "enterprise", "custom"],
    };

    it("should resolve boolean entitlement from grant", () => {
      const grant: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: true,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      };

      graph.addGrant("workspace", "ws-1", grant);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("feature.video_calls", booleanDef, context);

      expect(result.granted).toBe(true);
      expect(result.value).toBe(true);
      expect(result.source).toBe("grant");
    });

    it("should use default value when no grant exists", () => {
      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("feature.video_calls", booleanDef, context);

      expect(result.granted).toBe(false);
      expect(result.value).toBe(false);
      expect(result.source).toBe("default");
    });

    it("should resolve numeric entitlement", () => {
      const grant: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "limit.max_members",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: 50,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      };

      graph.addGrant("workspace", "ws-1", grant);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("limit.max_members", numericDef, context);

      expect(result.granted).toBe(true);
      expect(result.value).toBe(50);
    });

    it("should handle null (unlimited) numeric values", () => {
      const grant: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "limit.max_members",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: null,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      };

      graph.addGrant("workspace", "ws-1", grant);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("limit.max_members", numericDef, context);

      expect(result.granted).toBe(true);
      expect(result.value).toBeNull();
    });

    it("should resolve tier entitlement based on plan", () => {
      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "professional",
      };

      const result = graph.resolve("tier.access", tierDef, context);

      expect(result.granted).toBe(true);
    });

    it("should deny tier entitlement when plan is too low", () => {
      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "starter",
      };

      const result = graph.resolve("tier.access", tierDef, context);

      expect(result.granted).toBe(false);
    });

    it("should ignore expired grants", () => {
      const grant: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: true,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
        active: true,
      };

      graph.addGrant("workspace", "ws-1", grant);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("feature.video_calls", booleanDef, context);

      expect(result.value).toBe(false); // Default value
    });

    it("should ignore inactive grants", () => {
      const grant: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: true,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: false,
      };

      graph.addGrant("workspace", "ws-1", grant);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("feature.video_calls", booleanDef, context);

      expect(result.value).toBe(false); // Default value
    });

    it("should include resolution chain when requested", () => {
      graph.addNode("workspace", "ws-1");

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const result = graph.resolve("feature.video_calls", booleanDef, context, {
        includeChain: true,
      });

      expect(result.resolutionChain).toBeDefined();
      expect(result.resolutionChain!.length).toBeGreaterThan(0);
    });
  });

  describe("Bulk Operations", () => {
    it("should resolve multiple entitlements", () => {
      const booleanDef: BooleanEntitlementDefinition = {
        key: "feature.video_calls",
        name: "Video Calls",
        description: "Video call access",
        category: "calls",
        valueType: "boolean",
        inheritable: true,
        grantable: true,
        defaultValue: false,
      };

      const context: EntitlementContext = {
        userId: "user-1",
        planTier: "free",
      };

      const results = graph.resolveMany(
        [
          { key: "feature.video_calls", definition: booleanDef },
          { key: "feature.video_calls", definition: booleanDef },
        ],
        context,
      );

      expect(results.size).toBe(1); // Same key
    });

    it("should get all effective entitlements for context", () => {
      const grant1: EntitlementGrant = {
        id: "grant-1",
        entitlementKey: "feature.video_calls",
        scope: "workspace",
        entityId: "ws-1",
        source: "grant",
        value: true,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      };

      const grant2: EntitlementGrant = {
        id: "grant-2",
        entitlementKey: "feature.screen_sharing",
        scope: "workspace",
        entityId: "ws-1",
        source: "plan",
        value: false,
        priority: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      };

      graph.addGrant("workspace", "ws-1", grant1);
      graph.addGrant("workspace", "ws-1", grant2);

      const context: EntitlementContext = {
        userId: "user-1",
        workspaceId: "ws-1",
        planTier: "free",
      };

      const effective = graph.getAllEffective(context);

      expect(effective.size).toBe(2);
      expect(effective.has("feature.video_calls")).toBe(true);
      expect(effective.has("feature.screen_sharing")).toBe(true);
    });
  });

  describe("Utility Methods", () => {
    it("should clear all nodes", () => {
      graph.addNode("workspace", "ws-1");
      graph.addNode("channel", "ch-1");

      graph.clear();

      expect(graph.size).toBe(0);
    });

    it("should get nodes at scope", () => {
      graph.addNode("workspace", "ws-1");
      graph.addNode("workspace", "ws-2");
      graph.addNode("channel", "ch-1");

      const workspaces = graph.getNodesAtScope("workspace");
      expect(workspaces.length).toBe(2);

      const channels = graph.getNodesAtScope("channel");
      expect(channels.length).toBe(1);
    });

    it("should export graph state", () => {
      graph.addNode("workspace", "ws-1", { planTier: "professional" });

      const state = graph.export();

      expect(state.nodes).toBeDefined();
      expect(state.inheritanceRules).toBeDefined();
    });

    it("should import graph state", () => {
      const state = {
        nodes: {
          "workspace:ws-1": {
            scope: "workspace",
            entityId: "ws-1",
            planTier: "professional",
            grants: {},
            children: [],
          },
        },
        inheritanceRules: [],
      };

      graph.import(state);

      expect(graph.hasNode("workspace", "ws-1")).toBe(true);
      const node = graph.getNode("workspace", "ws-1");
      expect(node?.planTier).toBe("professional");
    });
  });

  describe("Singleton", () => {
    it("should return same instance from getEntitlementGraph", () => {
      resetEntitlementGraph();

      const instance1 = getEntitlementGraph();
      const instance2 = getEntitlementGraph();

      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getEntitlementGraph();
      instance1.addNode("workspace", "ws-1");

      resetEntitlementGraph();

      const instance2 = getEntitlementGraph();
      expect(instance2.hasNode("workspace", "ws-1")).toBe(false);
    });
  });
});
