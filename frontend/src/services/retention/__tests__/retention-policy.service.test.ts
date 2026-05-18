/**
 * Retention Policy Service Tests
 *
 * Comprehensive tests for the retention policy service.
 *
 * @module services/retention/__tests__/retention-policy.service.test
 * @version 1.0.0
 */

import {
  RetentionPolicyService,
  createRetentionPolicyService,
  resetRetentionPolicyService,
  type CreateRetentionPolicyInput,
  type CreateLegalHoldInput,
} from "../retention-policy.service";

describe("RetentionPolicyService", () => {
  let service: RetentionPolicyService;

  beforeEach(async () => {
    resetRetentionPolicyService();
    service = createRetentionPolicyService();
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
    resetRetentionPolicyService();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe("initialization", () => {
    it("initializes successfully", () => {
      expect(service.initialized).toBe(true);
    });

    it("can be initialized multiple times safely", async () => {
      await service.initialize();
      await service.initialize();
      expect(service.initialized).toBe(true);
    });

    it("starts with zero policies", () => {
      expect(service.policyCount).toBe(0);
    });

    it("starts with zero legal holds", () => {
      expect(service.legalHoldCount).toBe(0);
    });
  });

  // ============================================================================
  // Policy CRUD Tests
  // ============================================================================

  describe("createPolicy", () => {
    it("creates a valid policy", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Test Policy",
        description: "A test policy",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const result = await service.createPolicy(input, "user1");

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Policy");
      expect(result.data?.status).toBe("active");
      expect(service.policyCount).toBe(1);
    });

    it("generates unique IDs", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Policy 1",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const result1 = await service.createPolicy(input, "user1");
      const result2 = await service.createPolicy(
        { ...input, name: "Policy 2" },
        "user1",
      );

      expect(result1.data?.id).not.toBe(result2.data?.id);
    });

    it("rejects invalid policies", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "", // Empty name
        scope: "global",
        rules: [],
      };

      const result = await service.createPolicy(input, "user1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("requires rules", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "No Rules Policy",
        scope: "global",
        rules: [],
      };

      const result = await service.createPolicy(input, "user1");

      expect(result.success).toBe(false);
    });

    it("sets default values", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Minimal Policy",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const result = await service.createPolicy(input, "user1");

      expect(result.data?.allowOverride).toBe(true);
      expect(result.data?.inheritable).toBe(true);
      expect(result.data?.priority).toBe(0);
    });
  });

  describe("getPolicy", () => {
    it("returns policy by ID", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Test Policy",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const created = await service.createPolicy(input, "user1");
      const policy = service.getPolicy(created.data!.id);

      expect(policy).not.toBeNull();
      expect(policy?.name).toBe("Test Policy");
    });

    it("returns null for non-existent policy", () => {
      const policy = service.getPolicy("non_existent");
      expect(policy).toBeNull();
    });
  });

  describe("updatePolicy", () => {
    it("updates policy fields", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Original Name",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const created = await service.createPolicy(input, "user1");
      const result = await service.updatePolicy(
        created.data!.id,
        { name: "Updated Name" },
        "user1",
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Updated Name");
    });

    it("updates policy status", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Test Policy",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const created = await service.createPolicy(input, "user1");
      const result = await service.updatePolicy(
        created.data!.id,
        { status: "inactive" },
        "user1",
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("inactive");
    });

    it("fails for non-existent policy", async () => {
      const result = await service.updatePolicy(
        "non_existent",
        { name: "New Name" },
        "user1",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Policy not found");
    });

    it("validates updated rules", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "Test Policy",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const created = await service.createPolicy(input, "user1");
      const result = await service.updatePolicy(
        created.data!.id,
        {
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: -1, unit: "days" }, // Invalid
              action: "delete",
            },
          ],
        },
        "user1",
      );

      expect(result.success).toBe(false);
    });
  });

  describe("deletePolicy", () => {
    it("deletes existing policy", async () => {
      const input: CreateRetentionPolicyInput = {
        name: "To Delete",
        scope: "global",
        rules: [
          {
            contentType: "messages",
            enabled: true,
            period: { value: 30, unit: "days" },
            action: "delete",
          },
        ],
      };

      const created = await service.createPolicy(input, "user1");
      expect(service.policyCount).toBe(1);

      const result = await service.deletePolicy(created.data!.id, "user1");

      expect(result.success).toBe(true);
      expect(service.policyCount).toBe(0);
      expect(service.getPolicy(created.data!.id)).toBeNull();
    });

    it("fails for non-existent policy", async () => {
      const result = await service.deletePolicy("non_existent", "user1");

      expect(result.success).toBe(false);
    });
  });

  describe("listPolicies", () => {
    beforeEach(async () => {
      await service.createPolicy(
        {
          name: "Global Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await service.createPolicy(
        {
          name: "Workspace Policy",
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
        },
        "user1",
      );
    });

    it("lists all policies", () => {
      const policies = service.listPolicies();
      expect(policies.length).toBe(2);
    });

    it("filters by scope", () => {
      const policies = service.listPolicies({ scope: "global" });
      expect(policies.length).toBe(1);
      expect(policies[0].name).toBe("Global Policy");
    });

    it("filters by target ID", () => {
      const policies = service.listPolicies({ targetId: "ws1" });
      expect(policies.length).toBe(1);
      expect(policies[0].name).toBe("Workspace Policy");
    });

    it("filters by content type", () => {
      const policies = service.listPolicies({ contentType: "attachments" });
      expect(policies.length).toBe(1);
      expect(policies[0].name).toBe("Workspace Policy");
    });

    it("applies pagination", () => {
      const policies = service.listPolicies({ limit: 1, offset: 0 });
      expect(policies.length).toBe(1);
    });
  });

  describe("activatePolicy / deactivatePolicy", () => {
    it("activates inactive policy", async () => {
      const created = await service.createPolicy(
        {
          name: "Test",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await service.deactivatePolicy(created.data!.id, "user1");

      const result = await service.activatePolicy(created.data!.id, "user1");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("active");
    });

    it("deactivates active policy", async () => {
      const created = await service.createPolicy(
        {
          name: "Test",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const result = await service.deactivatePolicy(created.data!.id, "user1");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("inactive");
    });
  });

  // ============================================================================
  // Legal Hold Tests
  // ============================================================================

  describe("createLegalHold", () => {
    it("creates a valid legal hold", async () => {
      const input: CreateLegalHoldInput = {
        name: "Test Hold",
        description: "Test description",
        matterReference: "CASE-001",
        scope: {
          userIds: [],
          channelIds: [],
          workspaceIds: [],
          contentTypes: [],
        },
      };

      const result = await service.createLegalHold(input, "user1");

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Hold");
      expect(result.data?.status).toBe("active");
      expect(service.legalHoldCount).toBe(1);
    });

    it("rejects invalid legal holds", async () => {
      const input: CreateLegalHoldInput = {
        name: "", // Empty name
        description: "Test",
        matterReference: "CASE-001",
        scope: {
          userIds: [],
          channelIds: [],
          workspaceIds: [],
          contentTypes: [],
        },
      };

      const result = await service.createLegalHold(input, "user1");

      expect(result.success).toBe(false);
    });
  });

  describe("getLegalHold", () => {
    it("returns legal hold by ID", async () => {
      const input: CreateLegalHoldInput = {
        name: "Test Hold",
        description: "Test",
        matterReference: "CASE-001",
        scope: {
          userIds: [],
          channelIds: [],
          workspaceIds: [],
          contentTypes: [],
        },
      };

      const created = await service.createLegalHold(input, "user1");
      const hold = service.getLegalHold(created.data!.id);

      expect(hold).not.toBeNull();
      expect(hold?.name).toBe("Test Hold");
    });

    it("returns null for non-existent hold", () => {
      const hold = service.getLegalHold("non_existent");
      expect(hold).toBeNull();
    });
  });

  describe("updateLegalHold", () => {
    it("updates legal hold fields", async () => {
      const input: CreateLegalHoldInput = {
        name: "Original",
        description: "Test",
        matterReference: "CASE-001",
        scope: {
          userIds: [],
          channelIds: [],
          workspaceIds: [],
          contentTypes: [],
        },
      };

      const created = await service.createLegalHold(input, "user1");
      const result = await service.updateLegalHold(
        created.data!.id,
        { name: "Updated" },
        "user1",
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Updated");
    });

    it("cannot update released hold", async () => {
      const created = await service.createLegalHold(
        {
          name: "Test",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      await service.releaseLegalHold(created.data!.id, "user1");

      const result = await service.updateLegalHold(
        created.data!.id,
        { name: "Updated" },
        "user1",
      );

      expect(result.success).toBe(false);
    });
  });

  describe("releaseLegalHold", () => {
    it("releases active hold", async () => {
      const created = await service.createLegalHold(
        {
          name: "Test",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const result = await service.releaseLegalHold(created.data!.id, "user1");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("released");
      expect(result.data?.releasedBy).toBe("user1");
      expect(result.data?.releasedAt).toBeDefined();
    });

    it("cannot release already released hold", async () => {
      const created = await service.createLegalHold(
        {
          name: "Test",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      await service.releaseLegalHold(created.data!.id, "user1");

      const result = await service.releaseLegalHold(created.data!.id, "user1");

      expect(result.success).toBe(false);
    });
  });

  describe("listLegalHolds", () => {
    beforeEach(async () => {
      await service.createLegalHold(
        {
          name: "Active Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      const released = await service.createLegalHold(
        {
          name: "Released Hold",
          description: "Test",
          matterReference: "CASE-002",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      await service.releaseLegalHold(released.data!.id, "user1");
    });

    it("lists all holds", () => {
      const holds = service.listLegalHolds();
      expect(holds.length).toBe(2);
    });

    it("filters by status", () => {
      const activeHolds = service.listLegalHolds({ status: "active" });
      expect(activeHolds.length).toBe(1);
      expect(activeHolds[0].name).toBe("Active Hold");

      const releasedHolds = service.listLegalHolds({ status: "released" });
      expect(releasedHolds.length).toBe(1);
      expect(releasedHolds[0].name).toBe("Released Hold");
    });

    it("filters by matter reference", () => {
      const holds = service.listLegalHolds({ matterReference: "CASE-001" });
      expect(holds.length).toBe(1);
    });
  });

  describe("getActiveLegalHolds", () => {
    it("returns only active holds", async () => {
      await service.createLegalHold(
        {
          name: "Active",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      const released = await service.createLegalHold(
        {
          name: "Released",
          description: "Test",
          matterReference: "CASE-002",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      await service.releaseLegalHold(released.data!.id, "user1");

      const activeHolds = service.getActiveLegalHolds();

      expect(activeHolds.length).toBe(1);
      expect(activeHolds[0].name).toBe("Active");
    });
  });

  // ============================================================================
  // Policy Resolution Tests
  // ============================================================================

  describe("resolvePolicy", () => {
    it("resolves policy for context", async () => {
      await service.createPolicy(
        {
          name: "Global Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const resolved = service.resolvePolicy({ channelId: "ch1" });

      expect(resolved.effectiveRules.size).toBe(1);
      expect(resolved.effectiveRules.get("messages")).toBeDefined();
    });

    it("detects legal hold blocking", async () => {
      await service.createPolicy(
        {
          name: "Global Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await service.createLegalHold(
        {
          name: "Active Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const resolved = service.resolvePolicy({ channelId: "ch1" });

      expect(resolved.deletionBlocked).toBe(true);
    });
  });

  describe("isDeletionBlocked", () => {
    it("returns blocked when legal hold exists", async () => {
      await service.createLegalHold(
        {
          name: "Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const result = service.isDeletionBlocked({ channelId: "ch1" });

      expect(result.blocked).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("returns not blocked when no hold", () => {
      const result = service.isDeletionBlocked({ channelId: "ch1" });
      expect(result.blocked).toBe(false);
    });
  });

  // ============================================================================
  // Audit Log Tests
  // ============================================================================

  describe("getAuditLog", () => {
    it("records policy creation", async () => {
      await service.createPolicy(
        {
          name: "Test",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const entries = service.getAuditLog({ eventTypes: ["policy_created"] });

      expect(entries.length).toBe(1);
      expect(entries[0].actorId).toBe("user1");
    });

    it("records legal hold events", async () => {
      const created = await service.createLegalHold(
        {
          name: "Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );
      await service.releaseLegalHold(created.data!.id, "user1");

      const entries = service.getAuditLog();

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by event type", async () => {
      await service.createPolicy(
        {
          name: "Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await service.createLegalHold(
        {
          name: "Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const policyEntries = service.getAuditLog({
        eventTypes: ["policy_created"],
      });
      const holdEntries = service.getAuditLog({
        eventTypes: ["legal_hold_created"],
      });

      expect(policyEntries.length).toBe(1);
      expect(holdEntries.length).toBe(1);
    });
  });

  // ============================================================================
  // Import/Export Tests
  // ============================================================================

  describe("import/export", () => {
    it("exports policies", async () => {
      await service.createPolicy(
        {
          name: "Policy 1",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const exported = service.exportPolicies();

      expect(exported.length).toBe(1);
      expect(exported[0].name).toBe("Policy 1");
    });

    it("imports policies", async () => {
      const policies = [
        {
          id: "pol_imported",
          name: "Imported Policy",
          description: "",
          scope: "global" as const,
          targetId: null,
          status: "active" as const,
          rules: [
            {
              contentType: "messages" as const,
              enabled: true,
              period: { value: 30, unit: "days" as const },
              action: "delete" as const,
            },
          ],
          allowOverride: true,
          inheritable: true,
          priority: 0,
          createdBy: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.importPolicies(policies, "user1");

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);
      expect(service.policyCount).toBe(1);
    });

    it("exports legal holds", async () => {
      await service.createLegalHold(
        {
          name: "Hold 1",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const exported = service.exportLegalHolds();

      expect(exported.length).toBe(1);
      expect(exported[0].name).toBe("Hold 1");
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("configuration", () => {
    it("returns configuration", () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.defaultPeriod).toBeDefined();
    });

    it("updates configuration", () => {
      const updated = service.updateConfig({ enabled: false });

      expect(updated.enabled).toBe(false);
    });
  });

  // ============================================================================
  // Statistics Tests
  // ============================================================================

  describe("getStats", () => {
    it("returns statistics", async () => {
      await service.createPolicy(
        {
          name: "Test",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await service.createLegalHold(
        {
          name: "Hold",
          description: "Test",
          matterReference: "CASE-001",
          scope: {
            userIds: [],
            channelIds: [],
            workspaceIds: [],
            contentTypes: [],
          },
        },
        "user1",
      );

      const stats = service.getStats();

      expect(stats.activePolicies).toBe(1);
      expect(stats.activeLegalHolds).toBe(1);
    });
  });
});
