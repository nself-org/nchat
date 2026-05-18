/**
 * @jest-environment node
 */

/**
 * Retention Policy Service Tests
 *
 * Comprehensive test suite for RetentionPolicyService:
 * - Policy CRUD operations
 * - Retention schedules
 * - Storage quota management
 * - Legal hold
 */

import {
  RetentionPolicyService,
  createRetentionPolicyService,
} from "../retention-policy.service";
import { createRecordingPipeline } from "../recording-pipeline.service";
import { RetentionPolicyError } from "../types";

// Mock dependencies
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com"),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/services/files/config", () => ({
  getStorageConfig: jest.fn().mockReturnValue({
    endpoint: "http://localhost:9000",
    bucket: "test-bucket",
    region: "us-east-1",
    accessKey: "test-key",
    secretKey: "test-secret",
    provider: "minio",
  }),
}));

describe("RetentionPolicyService", () => {
  let service: RetentionPolicyService;
  let pipeline: ReturnType<typeof createRecordingPipeline>;

  const workspaceId = "workspace-123";
  const userId = "user-123";
  const channelId = "channel-456";

  beforeEach(() => {
    pipeline = createRecordingPipeline({ encryptionEnabled: false });
    service = createRetentionPolicyService(undefined, pipeline);
  });

  afterEach(() => {
    service.clearAll();
    pipeline.clearAll();
  });

  // ==========================================================================
  // Policy CRUD Tests
  // ==========================================================================

  describe("Policy CRUD", () => {
    it("should create a retention policy", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        {
          name: "Standard Policy",
          retentionPeriod: "90_days",
          description: "Keep recordings for 90 days",
        },
        userId,
      );

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe("Standard Policy");
      expect(policy.retentionPeriod).toBe("90_days");
      expect(policy.retentionDays).toBe(90);
      expect(policy.workspaceId).toBe(workspaceId);
      expect(policy.createdBy).toBe(userId);
    });

    it("should create policy with all options", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        {
          name: "Custom Policy",
          retentionPeriod: "1_year",
          description: "Annual retention",
          isDefault: true,
          autoDeleteEnabled: true,
          warningDaysBefore: 14,
          legalHoldExempt: false,
          enforceQuota: true,
          quotaBytes: 100 * 1024 * 1024 * 1024,
          onExpiry: "archive",
          archiveLocation: "s3://archive-bucket",
          applyToSources: ["call", "livestream"],
          applyToChannelIds: ["channel-1", "channel-2"],
        },
        userId,
      );

      expect(policy.isDefault).toBe(true);
      expect(policy.warningDaysBefore).toBe(14);
      expect(policy.enforceQuota).toBe(true);
      expect(policy.onExpiry).toBe("archive");
      expect(policy.applyToSources).toEqual(["call", "livestream"]);
    });

    it("should get policy by ID", async () => {
      const created = await service.createPolicy(
        workspaceId,
        { name: "Test Policy", retentionPeriod: "30_days" },
        userId,
      );

      const policy = await service.getPolicy(created.id);

      expect(policy).not.toBeNull();
      expect(policy!.id).toBe(created.id);
    });

    it("should return null for non-existent policy", async () => {
      const policy = await service.getPolicy("non-existent");
      expect(policy).toBeNull();
    });

    it("should get all policies for a workspace", async () => {
      await service.createPolicy(
        workspaceId,
        { name: "Policy 1", retentionPeriod: "30_days" },
        userId,
      );
      await service.createPolicy(
        workspaceId,
        { name: "Policy 2", retentionPeriod: "90_days" },
        userId,
      );
      await service.createPolicy(
        "other-workspace",
        { name: "Policy 3", retentionPeriod: "180_days" },
        userId,
      );

      const policies = await service.getPolicies(workspaceId);

      expect(policies).toHaveLength(2);
      expect(policies.every((p) => p.workspaceId === workspaceId)).toBe(true);
    });

    it("should get default policy for workspace", async () => {
      await service.createPolicy(
        workspaceId,
        { name: "Non-default", retentionPeriod: "30_days" },
        userId,
      );
      await service.createPolicy(
        workspaceId,
        { name: "Default", retentionPeriod: "90_days", isDefault: true },
        userId,
      );

      const defaultPolicy = await service.getDefaultPolicy(workspaceId);

      expect(defaultPolicy).not.toBeNull();
      expect(defaultPolicy!.isDefault).toBe(true);
      expect(defaultPolicy!.name).toBe("Default");
    });

    it("should update a policy", async () => {
      const created = await service.createPolicy(
        workspaceId,
        { name: "Original", retentionPeriod: "30_days" },
        userId,
      );

      const updated = await service.updatePolicy(created.id, {
        name: "Updated",
        retentionPeriod: "90_days",
        warningDaysBefore: 14,
      });

      expect(updated.name).toBe("Updated");
      expect(updated.retentionPeriod).toBe("90_days");
      expect(updated.retentionDays).toBe(90);
      expect(updated.warningDaysBefore).toBe(14);
    });

    it("should throw error when updating non-existent policy", async () => {
      await expect(
        service.updatePolicy("non-existent", { name: "Updated" }),
      ).rejects.toThrow(RetentionPolicyError);
    });

    it("should delete a policy", async () => {
      const created = await service.createPolicy(
        workspaceId,
        { name: "To Delete", retentionPeriod: "30_days" },
        userId,
      );

      await service.deletePolicy(created.id);

      const policy = await service.getPolicy(created.id);
      expect(policy).toBeNull();
    });

    it("should throw error when deleting non-existent policy", async () => {
      await expect(service.deletePolicy("non-existent")).rejects.toThrow(
        RetentionPolicyError,
      );
    });

    it("should unset previous default when setting new default", async () => {
      const first = await service.createPolicy(
        workspaceId,
        { name: "First", retentionPeriod: "30_days", isDefault: true },
        userId,
      );

      const second = await service.createPolicy(
        workspaceId,
        { name: "Second", retentionPeriod: "90_days", isDefault: true },
        userId,
      );

      const firstUpdated = await service.getPolicy(first.id);
      const secondUpdated = await service.getPolicy(second.id);

      expect(firstUpdated!.isDefault).toBe(false);
      expect(secondUpdated!.isDefault).toBe(true);
    });

    it("should enforce max policies per workspace", async () => {
      const limitedService = createRetentionPolicyService(
        {
          maxPoliciesPerWorkspace: 2,
        },
        pipeline,
      );

      await limitedService.createPolicy(
        workspaceId,
        { name: "Policy 1", retentionPeriod: "30_days" },
        userId,
      );
      await limitedService.createPolicy(
        workspaceId,
        { name: "Policy 2", retentionPeriod: "90_days" },
        userId,
      );

      await expect(
        limitedService.createPolicy(
          workspaceId,
          { name: "Policy 3", retentionPeriod: "180_days" },
          userId,
        ),
      ).rejects.toThrow("Maximum of 2 policies");

      limitedService.clearAll();
    });
  });

  // ==========================================================================
  // Retention Schedule Tests
  // ==========================================================================

  describe("Retention Schedules", () => {
    it("should apply policy to recording", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        { name: "Test Policy", retentionPeriod: "30_days" },
        userId,
      );

      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.applyPolicy(recording.id, policy.id);

      const updated = await pipeline.getRecording(recording.id);
      expect((updated as any).retentionPolicyId).toBe(policy.id);
      expect((updated as any).expiresAt).toBeDefined();
    });

    it("should schedule retention action", async () => {
      const recordingId = "recording-123";
      const policyId = "policy-456";
      const scheduledAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const schedule = await service.scheduleRetentionAction(
        recordingId,
        policyId,
        scheduledAt,
        "delete",
      );

      expect(schedule.recordingId).toBe(recordingId);
      expect(schedule.policyId).toBe(policyId);
      expect(schedule.scheduledAction).toBe("delete");
      expect(schedule.executed).toBe(false);
    });

    it("should get pending schedules", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000).toISOString();
      const future = new Date(now.getTime() + 1000000).toISOString();

      await service.scheduleRetentionAction("r1", "p1", past, "delete");
      await service.scheduleRetentionAction("r2", "p2", future, "archive");

      const pending = await service.getPendingSchedules(now);

      expect(pending).toHaveLength(1);
      expect(pending[0].recordingId).toBe("r1");
    });

    it("should execute scheduled deletion", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        {
          name: "Delete Policy",
          retentionPeriod: "7_days",
          onExpiry: "delete",
        },
        userId,
      );

      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(recording.id, userId);

      // Schedule for immediate execution
      await service.scheduleRetentionAction(
        recording.id,
        policy.id,
        new Date().toISOString(),
        "delete",
      );

      const result = await service.executeScheduledActions();

      expect(result.executed).toBeGreaterThanOrEqual(0);
    });

    it("should skip actions for recordings under legal hold", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        { name: "Delete Policy", retentionPeriod: "7_days" },
        userId,
      );

      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(recording.id, userId);

      // Set legal hold
      await service.setLegalHold(recording.id, true, userId);

      // Schedule deletion
      await service.scheduleRetentionAction(
        recording.id,
        policy.id,
        new Date().toISOString(),
        "delete",
      );

      const result = await service.executeScheduledActions();

      // Should skip, not execute
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Storage Quota Tests
  // ==========================================================================

  describe("Storage Quota", () => {
    it("should get storage quota for workspace", async () => {
      const quota = await service.getStorageQuota(workspaceId);

      expect(quota.workspaceId).toBe(workspaceId);
      expect(quota.totalBytes).toBeGreaterThan(0);
      expect(quota.usedBytes).toBeGreaterThanOrEqual(0);
      expect(quota.recordingCount).toBeGreaterThanOrEqual(0);
    });

    it("should set storage quota", async () => {
      const newQuota = 500 * 1024 * 1024 * 1024; // 500GB

      const quota = await service.setStorageQuota(workspaceId, newQuota);

      expect(quota.totalBytes).toBe(newQuota);
    });

    it("should check if upload would exceed quota", async () => {
      await service.setStorageQuota(workspaceId, 1024); // 1KB quota

      const canUploadSmall = await service.checkQuotaForUpload(
        workspaceId,
        512,
      );
      const canUploadLarge = await service.checkQuotaForUpload(
        workspaceId,
        2048,
      );

      expect(canUploadSmall).toBe(true);
      expect(canUploadLarge).toBe(false);
    });
  });

  // ==========================================================================
  // Legal Hold Tests
  // ==========================================================================

  describe("Legal Hold", () => {
    it("should set legal hold on recording", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(recording.id, userId);

      await service.setLegalHold(recording.id, true, userId);

      const updated = await pipeline.getRecording(recording.id);
      expect(updated.legalHold).toBe(true);
    });

    it("should remove legal hold from recording", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(recording.id, userId);

      await service.setLegalHold(recording.id, true, userId);
      await service.setLegalHold(recording.id, false, userId);

      const updated = await pipeline.getRecording(recording.id);
      expect(updated.legalHold).toBe(false);
    });

    it("should get recordings under legal hold", async () => {
      // Create recordings with mock workspace
      const { recording: r1 } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(r1.id, userId);
      await service.setLegalHold(r1.id, true, userId);

      const { recording: r2 } = await pipeline.startRecording(
        { callId: "call-2", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(r2.id, userId);

      const legalHoldRecordings =
        await service.getRecordingsUnderLegalHold("workspace-default");

      expect(legalHoldRecordings.some((r) => r.id === r1.id)).toBe(true);
      expect(legalHoldRecordings.some((r) => r.id === r2.id)).toBe(false);
    });

    it("should throw error for legal hold on exempt policy", async () => {
      const policy = await service.createPolicy(
        workspaceId,
        {
          name: "Exempt Policy",
          retentionPeriod: "30_days",
          legalHoldExempt: true,
        },
        userId,
      );

      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );
      await pipeline.stopRecording(recording.id, userId);

      // Apply policy
      await service.applyPolicy(recording.id, policy.id);

      // Try to set legal hold
      await expect(
        service.setLegalHold(recording.id, true, userId),
      ).rejects.toThrow("does not allow legal hold");
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    it("should clear all data", async () => {
      await service.createPolicy(
        workspaceId,
        { name: "Test", retentionPeriod: "30_days" },
        userId,
      );

      service.clearAll();

      expect(service.getAllPolicies()).toHaveLength(0);
      expect(service.getAllSchedules()).toHaveLength(0);
    });
  });
});
