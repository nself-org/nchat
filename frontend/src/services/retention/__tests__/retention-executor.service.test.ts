/**
 * Retention Executor Service Tests
 *
 * Comprehensive tests for the retention executor service.
 *
 * @module services/retention/__tests__/retention-executor.service.test
 * @version 1.0.0
 */

import {
  RetentionExecutorService,
  createRetentionExecutorService,
  resetRetentionExecutorService,
  InMemoryContentProvider,
  type ContentItem,
} from "../retention-executor.service";
import {
  RetentionPolicyService,
  createRetentionPolicyService,
  resetRetentionPolicyService,
} from "../retention-policy.service";

describe("RetentionExecutorService", () => {
  let policyService: RetentionPolicyService;
  let contentProvider: InMemoryContentProvider;
  let executor: RetentionExecutorService;

  beforeEach(async () => {
    resetRetentionPolicyService();
    resetRetentionExecutorService();

    policyService = createRetentionPolicyService();
    await policyService.initialize();

    contentProvider = new InMemoryContentProvider();
    executor = createRetentionExecutorService(policyService, contentProvider);
    await executor.initialize();
  });

  afterEach(async () => {
    await executor.close();
    await policyService.close();
    resetRetentionExecutorService();
    resetRetentionPolicyService();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe("initialization", () => {
    it("initializes successfully", () => {
      expect(executor.initialized).toBe(true);
    });

    it("can be initialized multiple times safely", async () => {
      await executor.initialize();
      await executor.initialize();
      expect(executor.initialized).toBe(true);
    });

    it("is not running initially", () => {
      expect(executor.running).toBe(false);
    });
  });

  // ============================================================================
  // Policy Execution Tests
  // ============================================================================

  describe("executePolicy", () => {
    it("executes policy and deletes expired items", async () => {
      // Create policy
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      // Add expired content
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "msg2", contentType: "messages", createdAt: oldDate },
      ]);

      // Execute
      const result = await executor.executePolicy(policy.data!.id);

      expect(result.success).toBe(true);
      expect(result.itemsDeleted).toBe(2);
      expect(contentProvider.getDeletedIds()).toContain("msg1");
      expect(contentProvider.getDeletedIds()).toContain("msg2");
    });

    it("skips non-expired items", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      // Add recent content (not expired)
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: recentDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.itemsDeleted).toBe(0);
      expect(contentProvider.getDeletedIds().length).toBe(0);
    });

    it("archives items when action is archive", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Archive Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "archive",
              archiveDestination: "archive-bucket",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.success).toBe(true);
      expect(result.itemsArchived).toBe(1);
      expect(contentProvider.getArchivedItems().length).toBe(1);
    });

    it("archives then deletes for archive_then_delete action", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Archive Then Delete Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "archive_then_delete",
              archiveDestination: "archive-bucket",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.success).toBe(true);
      expect(result.itemsArchived).toBe(1);
      expect(result.itemsDeleted).toBe(1);
    });

    it("skips items blocked by legal hold", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await policyService.createLegalHold(
        {
          name: "Legal Hold",
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

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.itemsSkipped).toBe(1);
      expect(result.itemsDeleted).toBe(0);
    });

    it("throws for non-existent policy", async () => {
      await expect(executor.executePolicy("non_existent")).rejects.toThrow(
        "Policy not found",
      );
    });

    it("throws for inactive policy", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Inactive Policy",
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
      await policyService.deactivatePolicy(policy.data!.id, "user1");

      await expect(executor.executePolicy(policy.data!.id)).rejects.toThrow(
        "Policy is not active",
      );
    });

    it("performs dry run without deleting", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id, {
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.itemsDeleted).toBe(1); // Would be deleted
      expect(contentProvider.getDeletedIds().length).toBe(0); // Not actually deleted
    });
  });

  describe("executeAllPolicies", () => {
    it("executes all active policies", async () => {
      await policyService.createPolicy(
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
      await policyService.createPolicy(
        {
          name: "Policy 2",
          scope: "global",
          rules: [
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "att1", contentType: "attachments", createdAt: oldDate },
      ]);

      const results = await executor.executeAllPolicies();

      expect(results.length).toBe(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("skips inactive policies", async () => {
      const activePolicy = await policyService.createPolicy(
        {
          name: "Active",
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
      const inactivePolicy = await policyService.createPolicy(
        {
          name: "Inactive",
          scope: "global",
          rules: [
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );
      await policyService.deactivatePolicy(inactivePolicy.data!.id, "user1");

      const results = await executor.executeAllPolicies();

      expect(results.length).toBe(1);
    });
  });

  // ============================================================================
  // Candidate Identification Tests
  // ============================================================================

  describe("getCandidates", () => {
    it("returns candidates for deletion", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "msg2", contentType: "messages", createdAt: oldDate },
      ]);

      const candidates = await executor.getCandidates(policy.data!.id);

      expect(candidates.length).toBe(2);
      expect(candidates[0].action).toBe("delete");
    });

    it("marks candidates blocked by legal hold", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await policyService.createLegalHold(
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

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const candidates = await executor.getCandidates(policy.data!.id);

      expect(candidates.length).toBe(1);
      expect(candidates[0].blockedByLegalHold).toBe(true);
    });

    it("filters by content type", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Test Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "att1", contentType: "attachments", createdAt: oldDate },
      ]);

      const candidates = await executor.getCandidates(policy.data!.id, {
        contentType: "messages",
      });

      expect(candidates.length).toBe(1);
      expect(candidates[0].contentType).toBe("messages");
    });

    it("respects limit", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "msg2", contentType: "messages", createdAt: oldDate },
        { id: "msg3", contentType: "messages", createdAt: oldDate },
      ]);

      const candidates = await executor.getCandidates(policy.data!.id, {
        limit: 2,
      });

      expect(candidates.length).toBe(2);
    });
  });

  describe("previewExecution", () => {
    it("previews what would happen", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "msg2", contentType: "messages", createdAt: oldDate },
      ]);

      const preview = await executor.previewExecution(policy.data!.id);

      expect(preview.wouldDelete).toBe(2);
      expect(preview.candidates.length).toBe(2);
    });

    it("counts blocked by legal hold", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await policyService.createLegalHold(
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

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
      ]);

      const preview = await executor.previewExecution(policy.data!.id);

      expect(preview.blockedByLegalHold).toBe(1);
      expect(preview.wouldDelete).toBe(0);
    });
  });

  // ============================================================================
  // Job Management Tests
  // ============================================================================

  describe("job management", () => {
    it("tracks job execution", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      const result = await executor.executePolicy(policy.data!.id);
      const job = executor.getJob(result.jobId);

      expect(job).not.toBeNull();
      expect(job?.status).toBe("completed");
    });

    it("lists jobs", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await executor.executePolicy(policy.data!.id);
      await executor.executePolicy(policy.data!.id);

      const jobs = executor.getJobs();

      expect(jobs.length).toBe(2);
    });

    it("filters jobs by status", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await executor.executePolicy(policy.data!.id);

      const completedJobs = executor.getJobs({ status: "completed" });
      const runningJobs = executor.getJobs({ status: "running" });

      expect(completedJobs.length).toBe(1);
      expect(runningJobs.length).toBe(0);
    });

    it("clears completed jobs", async () => {
      const policy = await policyService.createPolicy(
        {
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
        },
        "user1",
      );

      await executor.executePolicy(policy.data!.id);
      expect(executor.getJobs().length).toBe(1);

      const cleared = executor.clearCompletedJobs();

      expect(cleared).toBe(1);
      expect(executor.getJobs().length).toBe(0);
    });
  });

  // ============================================================================
  // Grace Period Tests
  // ============================================================================

  describe("grace period handling", () => {
    it("respects grace period", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Policy with Grace Period",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
              gracePeriod: {
                enabled: true,
                duration: { value: 7, unit: "days" },
                recoverable: true,
              },
            },
          ],
        },
        "user1",
      );

      // Item expired but within grace period
      const justExpired = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000); // 32 days ago
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: justExpired },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      // Item should be skipped because it's within grace period
      expect(result.itemsSkipped).toBe(1);
      expect(result.itemsDeleted).toBe(0);
    });
  });

  // ============================================================================
  // Multi-Content Type Tests
  // ============================================================================

  describe("multiple content types", () => {
    it("processes multiple content types", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Multi-type Policy",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
            {
              contentType: "attachments",
              enabled: true,
              period: { value: 60, unit: "days" },
              action: "archive",
              archiveDestination: "archive",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "att1", contentType: "attachments", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.itemsDeleted).toBe(1); // messages
      expect(result.itemsArchived).toBe(1); // attachments
    });

    it("skips disabled rules", async () => {
      const policy = await policyService.createPolicy(
        {
          name: "Policy with Disabled Rule",
          scope: "global",
          rules: [
            {
              contentType: "messages",
              enabled: true,
              period: { value: 30, unit: "days" },
              action: "delete",
            },
            {
              contentType: "attachments",
              enabled: false, // Disabled
              period: { value: 30, unit: "days" },
              action: "delete",
            },
          ],
        },
        "user1",
      );

      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      contentProvider.addItems([
        { id: "msg1", contentType: "messages", createdAt: oldDate },
        { id: "att1", contentType: "attachments", createdAt: oldDate },
      ]);

      const result = await executor.executePolicy(policy.data!.id);

      expect(result.itemsDeleted).toBe(1); // Only messages
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe("configuration", () => {
    it("returns configuration", () => {
      const config = executor.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.jobSettings.batchSize).toBeGreaterThan(0);
    });

    it("updates configuration", () => {
      executor.updateConfig({
        jobSettings: {
          batchSize: 500,
          maxConcurrentJobs: 2,
          batchDelayMs: 200,
          maxRetries: 5,
          retryDelayMs: 10000,
        },
      });

      const config = executor.getConfig();
      expect(config.jobSettings.batchSize).toBe(500);
    });
  });

  // ============================================================================
  // Content Provider Tests
  // ============================================================================

  describe("InMemoryContentProvider", () => {
    it("stores and retrieves items", () => {
      const items: ContentItem[] = [
        { id: "item1", contentType: "messages", createdAt: new Date() },
        { id: "item2", contentType: "messages", createdAt: new Date() },
      ];

      contentProvider.addItems(items);

      expect(contentProvider.getAllItems().length).toBe(2);
    });

    it("deletes items", async () => {
      contentProvider.addItems([
        { id: "item1", contentType: "messages", createdAt: new Date() },
      ]);

      const result = await contentProvider.deleteItems("messages", ["item1"]);

      expect(result.deleted).toBe(1);
      expect(contentProvider.getDeletedIds()).toContain("item1");
    });

    it("archives items", async () => {
      contentProvider.addItems([
        { id: "item1", contentType: "messages", createdAt: new Date() },
      ]);

      const result = await contentProvider.archiveItems(
        "messages",
        [{ id: "item1", contentType: "messages", createdAt: new Date() }],
        "archive",
      );

      expect(result.archived).toBe(1);
      expect(contentProvider.getArchivedItems().length).toBe(1);
    });

    it("clears all data", () => {
      contentProvider.addItems([
        { id: "item1", contentType: "messages", createdAt: new Date() },
      ]);

      contentProvider.clear();

      expect(contentProvider.getAllItems().length).toBe(0);
    });
  });
});
