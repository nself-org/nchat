/**
 * Data Deletion Service Tests
 *
 * Comprehensive test suite for GDPR Right to be Forgotten service.
 * Target: 30+ tests
 */

import {
  DataDeletionService,
  createDataDeletionService,
  resetDataDeletionService,
  type CreateDeletionJobInput,
} from "../data-deletion.service";
import type { DataDeletionServiceConfig } from "../compliance.types";
import type { LegalHold } from "@/lib/compliance/compliance-types";

describe("DataDeletionService", () => {
  let service: DataDeletionService;

  beforeEach(async () => {
    resetDataDeletionService();
    service = createDataDeletionService();
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize successfully", () => {
      expect(service.initialized).toBe(true);
    });

    it("should be enabled by default", () => {
      expect(service.enabled).toBe(true);
    });

    it("should have zero jobs initially", () => {
      expect(service.jobCount).toBe(0);
    });

    it("should have zero requests initially", () => {
      expect(service.requestCount).toBe(0);
    });

    it("should have zero certificates initially", () => {
      expect(service.certificateCount).toBe(0);
    });

    it("should accept custom configuration", async () => {
      const customService = createDataDeletionService({
        coolingOffPeriodDays: 7,
        requireVerification: false,
      });
      await customService.initialize();

      const config = customService.getConfig();
      expect(config.coolingOffPeriodDays).toBe(7);
      expect(config.requireVerification).toBe(false);

      await customService.close();
    });

    it("should update configuration", () => {
      const newConfig = service.updateConfig({ batchSize: 1000 });
      expect(newConfig.batchSize).toBe(1000);
    });
  });

  // ============================================================================
  // REQUEST CREATION TESTS
  // ============================================================================

  describe("Request Creation", () => {
    it("should create a deletion request successfully", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        "full_account",
        { reason: "User requested deletion" },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.scope).toBe("full_account");
    });

    it("should set correct initial status with verification", async () => {
      service.updateConfig({ requireVerification: true });

      const result = await service.createRequest(
        "user-verify",
        "verify@example.com",
        "full_account",
      );

      expect(result.data!.status).toBe("pending_verification");
    });

    it("should set correct initial status without verification", async () => {
      service.updateConfig({ requireVerification: false });

      const result = await service.createRequest(
        "user-no-verify",
        "no-verify@example.com",
        "full_account",
      );

      expect(result.data!.status).toBe("pending");
    });

    it("should calculate cooling-off period end date", async () => {
      service.updateConfig({ coolingOffPeriodDays: 14 });

      const result = await service.createRequest(
        "user-cool",
        "cool@example.com",
        "full_account",
      );

      const now = new Date();
      const endDate = new Date(result.data!.retentionPeriodEnds!);
      const daysDiff = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDiff).toBe(14);
    });

    it("should support partial deletion scope", async () => {
      const result = await service.createRequest(
        "user-partial",
        "partial@example.com",
        "partial",
        { specificCategories: ["messages", "files"] },
      );

      expect(result.success).toBe(true);
      expect(result.data!.scope).toBe("partial");
      expect(result.data!.specificCategories).toContain("messages");
    });

    it("should reject empty categories for partial scope", async () => {
      const result = await service.createRequest(
        "user-empty",
        "empty@example.com",
        "partial",
        { specificCategories: [] },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("categories");
    });

    it("should prevent duplicate pending requests", async () => {
      await service.createRequest(
        "user-dup",
        "dup@example.com",
        "full_account",
      );

      const result = await service.createRequest(
        "user-dup",
        "dup@example.com",
        "full_account",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("pending");
    });

    it("should fail when service is disabled", async () => {
      service.updateConfig({ enabled: false });

      const result = await service.createRequest(
        "user-disabled",
        "disabled@example.com",
        "full_account",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("disabled");
    });

    it("should record IP address", async () => {
      const result = await service.createRequest(
        "user-ip",
        "ip@example.com",
        "full_account",
        { ipAddress: "192.168.1.1" },
      );

      expect(result.data!.ipAddress).toBe("192.168.1.1");
    });
  });

  // ============================================================================
  // LEGAL HOLD TESTS
  // ============================================================================

  describe("Legal Hold Handling", () => {
    beforeEach(() => {
      const legalHold: LegalHold = {
        id: "hold-1",
        name: "Test Hold",
        matterName: "Legal Case 1",
        custodians: ["user-held"],
        status: "active",
        preserveMessages: true,
        preserveFiles: true,
        preserveAuditLogs: true,
        notifyCustodians: false,
        startDate: new Date(),
        createdAt: new Date(),
        createdBy: "admin",
      };
      service.setLegalHolds([legalHold]);
    });

    it("should detect legal hold on request creation", async () => {
      const result = await service.createRequest(
        "user-held",
        "held@example.com",
        "full_account",
      );

      expect(result.success).toBe(true);
      expect(result.data!.legalHoldBlocked).toBe(true);
      expect(result.data!.legalHoldIds).toContain("hold-1");
    });

    it("should not block requests for non-held users", async () => {
      const result = await service.createRequest(
        "user-free",
        "free@example.com",
        "full_account",
      );

      expect(result.data!.legalHoldBlocked).toBe(false);
    });

    it("should block job execution for held users", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-held",
        userId: "user-held",
        userEmail: "held@example.com",
        scope: "full_account",
      });

      expect(createResult.data!.legalHoldBlocked).toBe(true);
    });
  });

  // ============================================================================
  // REQUEST VERIFICATION TESTS
  // ============================================================================

  describe("Request Verification", () => {
    it("should verify request with valid token", async () => {
      const createResult = await service.createRequest(
        "user-verify",
        "verify@example.com",
        "full_account",
      );

      const result = await service.verifyRequest(
        createResult.data!.id,
        "valid-token",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("approved");
      expect(result.data!.verifiedAt).toBeDefined();
    });

    it("should reject empty token", async () => {
      const createResult = await service.createRequest(
        "user-empty-token",
        "empty@example.com",
        "full_account",
      );

      const result = await service.verifyRequest(createResult.data!.id, "");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid verification token");
    });

    it("should reject verification for non-pending request", async () => {
      service.updateConfig({ requireVerification: false });

      const createResult = await service.createRequest(
        "user-not-pending",
        "not-pending@example.com",
        "full_account",
      );

      const result = await service.verifyRequest(
        createResult.data!.id,
        "token",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not pending verification");
    });
  });

  // ============================================================================
  // REQUEST APPROVAL/REJECTION TESTS
  // ============================================================================

  describe("Request Approval and Rejection", () => {
    it("should approve request", async () => {
      service.updateConfig({ requireVerification: false });

      const createResult = await service.createRequest(
        "user-approve",
        "approve@example.com",
        "full_account",
      );

      const result = await service.approveRequest(
        createResult.data!.id,
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("approved");
      expect(result.data!.approvedBy).toBe("admin");
    });

    it("should not approve blocked request", async () => {
      const legalHold: LegalHold = {
        id: "hold-2",
        name: "Block Hold",
        matterName: "Case 2",
        custodians: ["user-blocked"],
        status: "active",
        preserveMessages: true,
        preserveFiles: true,
        preserveAuditLogs: true,
        notifyCustodians: false,
        startDate: new Date(),
        createdAt: new Date(),
        createdBy: "admin",
      };
      service.setLegalHolds([legalHold]);

      service.updateConfig({ requireVerification: false });
      const createResult = await service.createRequest(
        "user-blocked",
        "blocked@example.com",
        "full_account",
      );

      const result = await service.approveRequest(
        createResult.data!.id,
        "admin",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("legal hold");
    });

    it("should reject request with reason", async () => {
      const createResult = await service.createRequest(
        "user-reject",
        "reject@example.com",
        "full_account",
      );

      const result = await service.rejectRequest(
        createResult.data!.id,
        "Identity not verified",
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("rejected");
      expect(result.data!.rejectionReason).toBe("Identity not verified");
    });
  });

  // ============================================================================
  // CANCELLATION TESTS
  // ============================================================================

  describe("Request Cancellation", () => {
    it("should cancel pending request", async () => {
      const createResult = await service.createRequest(
        "user-cancel",
        "cancel@example.com",
        "full_account",
      );

      const result = await service.cancelRequest(createResult.data!.id);

      expect(result.success).toBe(true);

      const request = service.getRequest(createResult.data!.id);
      expect(request!.status).toBe("cancelled");
    });

    it("should check if cancellation is allowed", async () => {
      const createResult = await service.createRequest(
        "user-check-cancel",
        "check@example.com",
        "full_account",
      );

      const canCancel = service.canCancelRequest(createResult.data!.id);

      expect(canCancel.canCancel).toBe(true);
    });

    it("should not allow cancellation when disabled", async () => {
      service.updateConfig({ allowCancellation: false });

      const createResult = await service.createRequest(
        "user-no-cancel",
        "no-cancel@example.com",
        "full_account",
      );

      const result = await service.cancelRequest(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should not allow cancellation after cooling-off period", async () => {
      const createResult = await service.createRequest(
        "user-expired",
        "expired@example.com",
        "full_account",
      );

      // Manually set cooling-off to past
      const request = service.getRequest(createResult.data!.id)!;
      request.retentionPeriodEnds = new Date(Date.now() - 1000);

      const result = await service.cancelRequest(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cooling-off period");
    });

    it("should calculate remaining cooling-off days", async () => {
      service.updateConfig({ coolingOffPeriodDays: 14 });

      const createResult = await service.createRequest(
        "user-remaining",
        "remaining@example.com",
        "full_account",
      );

      const remainingDays = service.getRemainingCoolingOffDays(
        createResult.data!.id,
      );

      expect(remainingDays).toBe(14);
    });
  });

  // ============================================================================
  // JOB CREATION TESTS
  // ============================================================================

  describe("Job Creation", () => {
    const validInput: CreateDeletionJobInput = {
      dsarId: "dsar-123",
      userId: "user-123",
      userEmail: "user@example.com",
      scope: "full_account",
    };

    it("should create a deletion job", async () => {
      const result = await service.createJob(validInput);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBeDefined();
      expect(result.data!.status).toBe("queued");
    });

    it("should require userId", async () => {
      const result = await service.createJob({
        ...validInput,
        userId: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID");
    });

    it("should require dsarId", async () => {
      const result = await service.createJob({
        ...validInput,
        dsarId: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("DSAR ID");
    });

    it("should respect max concurrent jobs", async () => {
      service.updateConfig({ maxConcurrentJobs: 2 });

      await service.createJob({ ...validInput, dsarId: "dsar-1" });
      await service.createJob({ ...validInput, dsarId: "dsar-2" });
      const result = await service.createJob({
        ...validInput,
        dsarId: "dsar-3",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum concurrent");
    });
  });

  // ============================================================================
  // JOB EXECUTION TESTS
  // ============================================================================

  describe("Job Execution", () => {
    it("should execute deletion job", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-exec",
        userId: "user-exec",
        userEmail: "exec@example.com",
        scope: "full_account",
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should generate deletion certificate", async () => {
      service.updateConfig({ generateCertificate: true });

      const createResult = await service.createJob({
        dsarId: "dsar-cert",
        userId: "user-cert",
        userEmail: "cert@example.com",
        scope: "full_account",
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBeDefined();
      expect(result.data!.checksum).toBeDefined();
    });

    it("should update job progress during execution", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-progress",
        userId: "user-progress",
        userEmail: "progress@example.com",
        scope: "full_account",
      });

      const progressUpdates: number[] = [];
      service.onProgress(createResult.data!.id, (job) => {
        progressUpdates.push(job.progress);
      });

      await service.executeJob(createResult.data!.id);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it("should fail for non-existent job", async () => {
      const result = await service.executeJob("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail for non-queued job", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-double",
        userId: "user-double",
        userEmail: "double@example.com",
        scope: "full_account",
      });

      await service.executeJob(createResult.data!.id);
      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not in queued state");
    });

    it("should fail when blocked by legal hold", async () => {
      const legalHold: LegalHold = {
        id: "hold-exec",
        name: "Exec Hold",
        matterName: "Exec Case",
        custodians: ["user-exec-blocked"],
        status: "active",
        preserveMessages: true,
        preserveFiles: true,
        preserveAuditLogs: true,
        notifyCustodians: false,
        startDate: new Date(),
        createdAt: new Date(),
        createdBy: "admin",
      };
      service.setLegalHolds([legalHold]);

      const createResult = await service.createJob({
        dsarId: "dsar-blocked-exec",
        userId: "user-exec-blocked",
        userEmail: "blocked@example.com",
        scope: "full_account",
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("legal hold");
    });
  });

  // ============================================================================
  // CUSTOM DELETER TESTS
  // ============================================================================

  describe("Custom Deleters", () => {
    it("should use custom message deleter", async () => {
      let deleteCount = 0;

      service.registerDeleter("messages", async (userId, options) => {
        deleteCount = 10;
        return { deleted: 10, failed: 0, details: [] };
      });

      const createResult = await service.createJob({
        dsarId: "dsar-custom",
        userId: "user-custom",
        userEmail: "custom@example.com",
        scope: "messages_only",
      });

      await service.executeJob(createResult.data!.id);

      expect(deleteCount).toBe(10);

      const job = service.getJob(createResult.data!.id);
      expect(job!.messagesDeleted).toBe(10);
    });

    it("should handle deleter errors gracefully", async () => {
      service.registerDeleter("messages", async () => {
        throw new Error("Database error");
      });

      const createResult = await service.createJob({
        dsarId: "dsar-error",
        userId: "user-error",
        userEmail: "error@example.com",
        scope: "messages_only",
      });

      const result = await service.executeJob(createResult.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });
  });

  // ============================================================================
  // CERTIFICATE TESTS
  // ============================================================================

  describe("Deletion Certificates", () => {
    it("should get certificate by ID", async () => {
      service.updateConfig({ generateCertificate: true });

      const createResult = await service.createJob({
        dsarId: "dsar-get-cert",
        userId: "user-get-cert",
        userEmail: "get-cert@example.com",
        scope: "full_account",
      });

      const execResult = await service.executeJob(createResult.data!.id);
      const certificate = service.getCertificate(execResult.data!.id);

      expect(certificate).not.toBeNull();
      expect(certificate!.userId).toBe("user-get-cert");
    });

    it("should get certificates by user", async () => {
      service.updateConfig({ generateCertificate: true });

      const createResult = await service.createJob({
        dsarId: "dsar-user-certs",
        userId: "user-certs",
        userEmail: "certs@example.com",
        scope: "full_account",
      });

      await service.executeJob(createResult.data!.id);
      const certificates = service.getCertificatesByUser("user-certs");

      expect(certificates.length).toBe(1);
    });

    it("should verify certificate checksum", async () => {
      service.updateConfig({ generateCertificate: true });

      const createResult = await service.createJob({
        dsarId: "dsar-verify-cert",
        userId: "user-verify-cert",
        userEmail: "verify@example.com",
        scope: "full_account",
      });

      const execResult = await service.executeJob(createResult.data!.id);
      const verification = service.verifyCertificate(execResult.data!.id);

      expect(verification.valid).toBe(true);
    });

    it("should fail verification for non-existent certificate", () => {
      const verification = service.verifyCertificate("non-existent");

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain("not found");
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("Statistics", () => {
    it("should track job statistics", async () => {
      await service.createJob({
        dsarId: "dsar-stat1",
        userId: "user-stat1",
        userEmail: "stat1@example.com",
        scope: "full_account",
      });

      const stats = service.getStatistics();

      expect(stats.totalJobs).toBe(1);
      expect(stats.activeJobs).toBe(1);
    });

    it("should update stats after completion", async () => {
      const createResult = await service.createJob({
        dsarId: "dsar-stat-complete",
        userId: "user-stat-complete",
        userEmail: "complete@example.com",
        scope: "full_account",
      });

      await service.executeJob(createResult.data!.id);
      const stats = service.getStatistics();

      expect(stats.completedJobs).toBe(1);
      expect(stats.activeJobs).toBe(0);
    });

    it("should count certificates generated", async () => {
      service.updateConfig({ generateCertificate: true });

      const createResult = await service.createJob({
        dsarId: "dsar-cert-count",
        userId: "user-cert-count",
        userEmail: "count@example.com",
        scope: "full_account",
      });

      await service.executeJob(createResult.data!.id);
      const stats = service.getStatistics();

      expect(stats.certificatesGenerated).toBe(1);
    });

    it("should count legal hold blocks", async () => {
      const legalHold: LegalHold = {
        id: "hold-stats",
        name: "Stats Hold",
        matterName: "Stats Case",
        custodians: ["user-stat-held"],
        status: "active",
        preserveMessages: true,
        preserveFiles: true,
        preserveAuditLogs: true,
        notifyCustodians: false,
        startDate: new Date(),
        createdAt: new Date(),
        createdBy: "admin",
      };
      service.setLegalHolds([legalHold]);

      await service.createJob({
        dsarId: "dsar-stat-held",
        userId: "user-stat-held",
        userEmail: "held@example.com",
        scope: "full_account",
      });

      const stats = service.getStatistics();
      expect(stats.blockedByLegalHold).toBe(1);
    });
  });

  // ============================================================================
  // RETRIEVAL TESTS
  // ============================================================================

  describe("Job and Request Retrieval", () => {
    it("should get jobs by DSAR ID", async () => {
      await service.createJob({
        dsarId: "dsar-get",
        userId: "user-get",
        userEmail: "get@example.com",
        scope: "full_account",
      });

      const jobs = service.getJobsByDSAR("dsar-get");
      expect(jobs.length).toBe(1);
    });

    it("should get jobs by user ID", async () => {
      await service.createJob({
        dsarId: "dsar-user1",
        userId: "user-multi",
        userEmail: "multi@example.com",
        scope: "full_account",
      });

      await service.createJob({
        dsarId: "dsar-user2",
        userId: "user-multi",
        userEmail: "multi@example.com",
        scope: "messages_only",
      });

      const jobs = service.getJobsByUser("user-multi");
      expect(jobs.length).toBe(2);
    });

    it("should get requests by user ID", async () => {
      await service.createRequest(
        "user-req",
        "req@example.com",
        "full_account",
      );

      const requests = service.getRequestsByUser("user-req");
      expect(requests.length).toBe(1);
    });

    it("should return null for non-existent job", () => {
      const job = service.getJob("non-existent");
      expect(job).toBeNull();
    });

    it("should return null for non-existent request", () => {
      const request = service.getRequest("non-existent");
      expect(request).toBeNull();
    });
  });
});
