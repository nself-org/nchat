/**
 * Policy Inheritance Tests
 *
 * Tests for retention policy inheritance and resolution logic.
 *
 * @module lib/retention/__tests__/policy-inheritance.test
 * @version 1.0.0
 */

import {
  resolveRetentionPolicy,
  filterApplicablePolicies,
  sortPoliciesByPrecedence,
  findApplicableLegalHolds,
  getEffectiveRule,
  isDeletionAllowed,
  isItemOnLegalHold,
  getParentScope,
  getChildScopes,
  buildScopeHierarchy,
  canOverride,
  validatePolicy,
  validateRule,
  validateLegalHold,
  detectPolicyConflicts,
  explainResolution,
  traceResolution,
} from "../policy-inheritance";
import {
  type RetentionPolicy,
  type RetentionRule,
  type LegalHold,
  type RetentionResolutionContext,
} from "../retention-types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestPolicy(
  overrides: Partial<RetentionPolicy> = {},
): RetentionPolicy {
  return {
    id: "pol_test",
    name: "Test Policy",
    description: "Test policy",
    scope: "global",
    targetId: null,
    status: "active",
    rules: [
      {
        contentType: "messages",
        enabled: true,
        period: { value: 30, unit: "days" },
        action: "delete",
      },
    ],
    allowOverride: true,
    inheritable: true,
    priority: 0,
    createdBy: "user1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestLegalHold(overrides: Partial<LegalHold> = {}): LegalHold {
  return {
    id: "lh_test",
    name: "Test Hold",
    description: "Test legal hold",
    matterReference: "CASE-001",
    scope: {
      userIds: [],
      channelIds: [],
      workspaceIds: [],
      contentTypes: [],
    },
    status: "active",
    createdBy: "user1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("PolicyInheritance", () => {
  // ============================================================================
  // Policy Filtering Tests
  // ============================================================================

  describe("filterApplicablePolicies", () => {
    it("filters out inactive policies", () => {
      const policies = [
        createTestPolicy({ id: "pol1", status: "active" }),
        createTestPolicy({ id: "pol2", status: "inactive" }),
      ];
      const context: RetentionResolutionContext = {};

      const result = filterApplicablePolicies(policies, context);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("pol1");
    });

    it("includes global policies for any context", () => {
      const policies = [createTestPolicy({ scope: "global" })];
      const context: RetentionResolutionContext = {
        workspaceId: "ws1",
        channelId: "ch1",
      };

      const result = filterApplicablePolicies(policies, context);

      expect(result.length).toBe(1);
    });

    it("filters workspace policies by workspace ID", () => {
      const policies = [
        createTestPolicy({ id: "pol1", scope: "workspace", targetId: "ws1" }),
        createTestPolicy({ id: "pol2", scope: "workspace", targetId: "ws2" }),
      ];
      const context: RetentionResolutionContext = { workspaceId: "ws1" };

      const result = filterApplicablePolicies(policies, context);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("pol1");
    });

    it("filters channel policies by channel ID", () => {
      const policies = [
        createTestPolicy({ id: "pol1", scope: "channel", targetId: "ch1" }),
        createTestPolicy({ id: "pol2", scope: "channel", targetId: "ch2" }),
      ];
      const context: RetentionResolutionContext = { channelId: "ch1" };

      const result = filterApplicablePolicies(policies, context);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("pol1");
    });

    it("filters user policies by user ID", () => {
      const policies = [
        createTestPolicy({ id: "pol1", scope: "user", targetId: "user1" }),
        createTestPolicy({ id: "pol2", scope: "user", targetId: "user2" }),
      ];
      const context: RetentionResolutionContext = { userId: "user1" };

      const result = filterApplicablePolicies(policies, context);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("pol1");
    });
  });

  // ============================================================================
  // Policy Sorting Tests
  // ============================================================================

  describe("sortPoliciesByPrecedence", () => {
    it("sorts by scope priority", () => {
      const policies = [
        createTestPolicy({ id: "pol_user", scope: "user", targetId: "user1" }),
        createTestPolicy({ id: "pol_global", scope: "global" }),
        createTestPolicy({
          id: "pol_channel",
          scope: "channel",
          targetId: "ch1",
        }),
        createTestPolicy({
          id: "pol_workspace",
          scope: "workspace",
          targetId: "ws1",
        }),
      ];

      const sorted = sortPoliciesByPrecedence(policies);

      expect(sorted[0].scope).toBe("global");
      expect(sorted[1].scope).toBe("workspace");
      expect(sorted[2].scope).toBe("channel");
      expect(sorted[3].scope).toBe("user");
    });

    it("sorts by priority within same scope", () => {
      const policies = [
        createTestPolicy({ id: "pol2", scope: "global", priority: 10 }),
        createTestPolicy({ id: "pol1", scope: "global", priority: 5 }),
        createTestPolicy({ id: "pol3", scope: "global", priority: 1 }),
      ];

      const sorted = sortPoliciesByPrecedence(policies);

      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(5);
      expect(sorted[2].priority).toBe(10);
    });
  });

  // ============================================================================
  // Policy Resolution Tests
  // ============================================================================

  describe("resolveRetentionPolicy", () => {
    it("resolves single global policy", () => {
      const policies = [createTestPolicy()];
      const legalHolds: LegalHold[] = [];
      const context: RetentionResolutionContext = {};

      const resolved = resolveRetentionPolicy(policies, legalHolds, context);

      expect(resolved.effectiveRules.size).toBe(1);
      expect(resolved.effectiveRules.get("messages")).toBeDefined();
      expect(resolved.sourcePolicies).toContain("pol_test");
      expect(resolved.deletionBlocked).toBe(false);
    });

    it("inherits rules from parent scopes", () => {
      const policies = [
        createTestPolicy({
          id: "pol_global",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 365, unit: "days" },
              action: "delete",
            },
          ],
        }),
        createTestPolicy({
          id: "pol_workspace",
          scope: "workspace",
          targetId: "ws1",
          rules: [
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 90, unit: "days" },
              action: "archive",
            },
          ],
        }),
      ];
      const context: RetentionResolutionContext = { workspaceId: "ws1" };

      const resolved = resolveRetentionPolicy(policies, [], context);

      expect(resolved.effectiveRules.size).toBe(2);
      expect(resolved.effectiveRules.get("messages")).toBeDefined();
      expect(resolved.effectiveRules.get("attachments")).toBeDefined();
    });

    it("overrides parent rules with more specific scope", () => {
      const policies = [
        createTestPolicy({
          id: "pol_global",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 365, unit: "days" },
              action: "delete",
            },
          ],
        }),
        createTestPolicy({
          id: "pol_channel",
          scope: "channel",
          targetId: "ch1",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "archive",
            },
          ],
        }),
      ];
      const context: RetentionResolutionContext = { channelId: "ch1" };

      const resolved = resolveRetentionPolicy(policies, [], context);

      const messageRule = resolved.effectiveRules.get("messages");
      expect(messageRule?.period.value).toBe(30);
      expect(messageRule?.action).toBe("archive");
    });

    it("blocks deletion when legal hold is active", () => {
      const policies = [createTestPolicy()];
      const legalHolds = [createTestLegalHold()];
      const context: RetentionResolutionContext = { channelId: "ch1" };

      const resolved = resolveRetentionPolicy(policies, legalHolds, context);

      expect(resolved.deletionBlocked).toBe(true);
      expect(resolved.activeLegalHolds.length).toBe(1);
    });

    it("respects allowOverride flag", () => {
      const policies = [
        createTestPolicy({
          id: "pol_global",
          scope: "global",
          allowOverride: false,
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 365, unit: "days" },
              action: "delete",
            },
          ],
        }),
        createTestPolicy({
          id: "pol_channel",
          scope: "channel",
          targetId: "ch1",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "archive",
            },
          ],
        }),
      ];
      const context: RetentionResolutionContext = { channelId: "ch1" };

      const resolved = resolveRetentionPolicy(policies, [], context);

      // Should still have the global policy's rule since it blocks override
      const messageRule = resolved.effectiveRules.get("messages");
      expect(messageRule?.period.value).toBe(365);
    });
  });

  // ============================================================================
  // Legal Hold Tests
  // ============================================================================

  describe("findApplicableLegalHolds", () => {
    it("returns active holds matching context", () => {
      const holds = [
        createTestLegalHold({ id: "lh1", status: "active" }),
        createTestLegalHold({ id: "lh2", status: "released" }),
      ];
      const context: RetentionResolutionContext = { channelId: "ch1" };

      const result = findApplicableLegalHolds(holds, context);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("lh1");
    });

    it("filters by workspace scope", () => {
      const holds = [
        createTestLegalHold({
          id: "lh1",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: ["ws1"],
            contentTypes: [],
          },
        }),
      ];

      expect(
        findApplicableLegalHolds(holds, { workspaceId: "ws1" }).length,
      ).toBe(1);
      expect(
        findApplicableLegalHolds(holds, { workspaceId: "ws2" }).length,
      ).toBe(0);
    });

    it("filters by content type", () => {
      const holds = [
        createTestLegalHold({
          id: "lh1",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: ["messages"],
          },
        }),
      ];

      expect(
        findApplicableLegalHolds(holds, { contentType: "messages" }).length,
      ).toBe(1);
      expect(
        findApplicableLegalHolds(holds, { contentType: "attachments" }).length,
      ).toBe(0);
    });
  });

  describe("isItemOnLegalHold", () => {
    it("detects items covered by legal holds", () => {
      const holds = [createTestLegalHold({ id: "lh1" })];
      const item = {
        userId: "user1",
        channelId: "ch1",
        workspaceId: "ws1",
        contentType: "messages" as const,
        createdAt: new Date(),
      };

      const result = isItemOnLegalHold(holds, item);

      expect(result.onHold).toBe(true);
      expect(result.holds).toContain("lh1");
    });

    it("returns false when no holds apply", () => {
      const holds = [
        createTestLegalHold({
          id: "lh1",
          scope: {
            userIds: ["other_user"],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        }),
      ];
      const item = {
        userId: "user1",
        channelId: "ch1",
        workspaceId: "ws1",
        contentType: "messages" as const,
        createdAt: new Date(),
      };

      const result = isItemOnLegalHold(holds, item);

      expect(result.onHold).toBe(false);
      expect(result.holds.length).toBe(0);
    });
  });

  // ============================================================================
  // Rule Access Tests
  // ============================================================================

  describe("getEffectiveRule", () => {
    it("returns rule for content type", () => {
      const resolved = resolveRetentionPolicy([createTestPolicy()], [], {});
      const rule = getEffectiveRule(resolved, "messages");

      expect(rule).not.toBeNull();
      expect(rule?.contentType).toBe("messages");
    });

    it("returns null for missing content type", () => {
      const resolved = resolveRetentionPolicy([createTestPolicy()], [], {});
      const rule = getEffectiveRule(resolved, "attachments");

      expect(rule).toBeNull();
    });
  });

  describe("isDeletionAllowed", () => {
    it("allows deletion when no legal holds", () => {
      const resolved = resolveRetentionPolicy([createTestPolicy()], [], {});
      expect(isDeletionAllowed(resolved, "messages")).toBe(true);
    });

    it("blocks deletion when legal hold exists", () => {
      const resolved = resolveRetentionPolicy(
        [createTestPolicy()],
        [createTestLegalHold()],
        {},
      );
      expect(isDeletionAllowed(resolved, "messages")).toBe(false);
    });
  });

  // ============================================================================
  // Scope Hierarchy Tests
  // ============================================================================

  describe("getParentScope", () => {
    it("returns correct parent scopes", () => {
      expect(getParentScope("user")).toBe("channel");
      expect(getParentScope("channel")).toBe("workspace");
      expect(getParentScope("workspace")).toBe("global");
      expect(getParentScope("global")).toBeNull();
    });
  });

  describe("getChildScopes", () => {
    it("returns correct child scopes", () => {
      expect(getChildScopes("global")).toEqual([
        "workspace",
        "channel",
        "user",
      ]);
      expect(getChildScopes("workspace")).toEqual(["channel", "user"]);
      expect(getChildScopes("channel")).toEqual(["user"]);
      expect(getChildScopes("user")).toEqual([]);
    });
  });

  describe("buildScopeHierarchy", () => {
    it("builds complete hierarchy", () => {
      const context = {
        workspaceId: "ws1",
        channelId: "ch1",
        userId: "user1",
      };

      const hierarchy = buildScopeHierarchy(context);

      expect(hierarchy.length).toBe(4);
      expect(hierarchy[0]).toEqual({ scope: "global", targetId: null });
      expect(hierarchy[1]).toEqual({ scope: "workspace", targetId: "ws1" });
      expect(hierarchy[2]).toEqual({ scope: "channel", targetId: "ch1" });
      expect(hierarchy[3]).toEqual({ scope: "user", targetId: "user1" });
    });

    it("handles partial context", () => {
      const context = { workspaceId: "ws1" };
      const hierarchy = buildScopeHierarchy(context);

      expect(hierarchy.length).toBe(2);
      expect(hierarchy[0].scope).toBe("global");
      expect(hierarchy[1].scope).toBe("workspace");
    });
  });

  describe("canOverride", () => {
    it("allows more specific scopes to override", () => {
      expect(canOverride("workspace", "global")).toBe(true);
      expect(canOverride("channel", "workspace")).toBe(true);
      expect(canOverride("user", "channel")).toBe(true);
    });

    it("prevents less specific scopes from overriding", () => {
      expect(canOverride("global", "workspace")).toBe(false);
      expect(canOverride("workspace", "channel")).toBe(false);
      expect(canOverride("channel", "user")).toBe(false);
    });

    it("handles same scope", () => {
      expect(canOverride("global", "global")).toBe(false);
      expect(canOverride("channel", "channel")).toBe(false);
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe("validatePolicy", () => {
    it("validates correct policy", () => {
      const policy = createTestPolicy();
      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("requires policy ID", () => {
      const policy = createTestPolicy({ id: "" });
      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Policy ID is required");
    });

    it("requires policy name", () => {
      const policy = createTestPolicy({ name: "" });
      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Policy name is required");
    });

    it("requires target ID for non-global scopes", () => {
      const policy = createTestPolicy({ scope: "workspace", targetId: null });
      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
    });

    it("rejects target ID for global scope", () => {
      const policy = createTestPolicy({ scope: "global", targetId: "ws1" });
      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
    });

    it("requires at least one rule", () => {
      const policy = createTestPolicy({ rules: [] });
      const result = validatePolicy(policy);

      expect(result.valid).toBe(false);
    });
  });

  describe("validateRule", () => {
    it("validates correct rule", () => {
      const rule: RetentionRule = {
        contentType: "messages",
        enabled: true,
        period: { value: 30, unit: "days" },
        action: "delete",
      };
      const errors = validateRule(rule);

      expect(errors.length).toBe(0);
    });

    it("rejects invalid content type", () => {
      const rule = {
        contentType: "invalid" as any,
        enabled: true,
        period: { value: 30, unit: "days" },
        action: "delete" as const,
      };
      const errors = validateRule(rule);

      expect(errors.some((e) => e.includes("Invalid content type"))).toBe(true);
    });

    it("rejects non-positive period", () => {
      const rule: RetentionRule = {
        contentType: "messages",
        enabled: true,
        period: { value: 0, unit: "days" },
        action: "delete",
      };
      const errors = validateRule(rule);

      expect(errors.some((e) => e.includes("must be positive"))).toBe(true);
    });

    it("rejects invalid action", () => {
      const rule = {
        contentType: "messages" as const,
        enabled: true,
        period: { value: 30, unit: "days" as const },
        action: "invalid" as any,
      };
      const errors = validateRule(rule);

      expect(errors.some((e) => e.includes("Invalid action"))).toBe(true);
    });
  });

  describe("validateLegalHold", () => {
    it("validates correct legal hold", () => {
      const hold = createTestLegalHold();
      const result = validateLegalHold(hold);

      expect(result.valid).toBe(true);
    });

    it("requires name", () => {
      const hold = createTestLegalHold({ name: "" });
      const result = validateLegalHold(hold);

      expect(result.valid).toBe(false);
    });

    it("requires matter reference", () => {
      const hold = createTestLegalHold({ matterReference: "" });
      const result = validateLegalHold(hold);

      expect(result.valid).toBe(false);
    });

    it("validates date range", () => {
      const hold = createTestLegalHold({
        scope: {
          userIds: [],
          channelIds: [],
          workspaceIds: [],
          contentTypes: [],
          startDate: new Date("2024-12-01"),
          endDate: new Date("2024-01-01"), // Before start
        },
      });
      const result = validateLegalHold(hold);

      expect(result.valid).toBe(false);
    });
  });

  // ============================================================================
  // Conflict Detection Tests
  // ============================================================================

  describe("detectPolicyConflicts", () => {
    it("detects same-scope conflicts", () => {
      const policies = [
        createTestPolicy({ id: "pol1", scope: "global", priority: 1 }),
        createTestPolicy({ id: "pol2", scope: "global", priority: 1 }),
      ];

      const conflicts = detectPolicyConflicts(policies);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].conflictType).toBe("same_scope");
    });

    it("detects override-blocked conflicts", () => {
      const policies = [
        createTestPolicy({
          id: "pol1",
          scope: "global",
          allowOverride: false,
        }),
        createTestPolicy({
          id: "pol2",
          scope: "workspace",
          targetId: "ws1",
        }),
      ];

      const conflicts = detectPolicyConflicts(policies);

      expect(conflicts.some((c) => c.conflictType === "override_blocked")).toBe(
        true,
      );
    });

    it("returns empty for non-conflicting policies", () => {
      const policies = [
        createTestPolicy({
          id: "pol1",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        }),
        createTestPolicy({
          id: "pol2",
          scope: "global",
          priority: 10, // Different priority
          rules: [
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        }),
      ];

      const conflicts = detectPolicyConflicts(policies);

      expect(conflicts.length).toBe(0);
    });
  });

  // ============================================================================
  // Debug Utilities Tests
  // ============================================================================

  describe("explainResolution", () => {
    it("returns explanation lines", () => {
      const policies = [createTestPolicy()];
      const explanation = explainResolution(policies, [], {});

      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation[0]).toContain("Policy Resolution");
    });
  });

  describe("traceResolution", () => {
    it("traces rule application", () => {
      const policies = [
        createTestPolicy({ id: "pol1", scope: "global" }),
        createTestPolicy({
          id: "pol2",
          scope: "channel",
          targetId: "ch1",
        }),
      ];

      const trace = traceResolution(policies, { channelId: "ch1" }, "messages");

      // The trace includes:
      // 1. pol1 applied (initially)
      // 2. pol1 overridden (when pol2 comes in)
      // 3. pol2 applied (final)
      expect(trace.length).toBe(3);
      expect(trace[0].action).toBe("applied");
      expect(trace[0].policyId).toBe("pol1");
      expect(trace[1].action).toBe("overridden");
      expect(trace[1].policyId).toBe("pol1");
      expect(trace[2].action).toBe("applied");
      expect(trace[2].policyId).toBe("pol2");
    });
  });
});
