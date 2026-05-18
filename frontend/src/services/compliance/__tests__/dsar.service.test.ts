/**
 * DSAR Service Tests
 *
 * Comprehensive test suite for DSAR workflow management.
 * Target: 35+ tests
 */

import {
  DSARService,
  createDSARService,
  resetDSARService,
} from "../dsar.service";
import type {
  DSARServiceConfig,
  CreateDSARInput,
  DSARStatus,
  DSARPriority,
  RegulationFramework,
} from "../compliance.types";

describe("DSARService", () => {
  let service: DSARService;

  beforeEach(async () => {
    resetDSARService();
    service = createDSARService();
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

    it("should have zero requests initially", () => {
      expect(service.requestCount).toBe(0);
    });

    it("should accept custom configuration", async () => {
      const customService = createDSARService({
        defaultDeadlineDays: 45,
        requireIdentityVerification: false,
      });
      await customService.initialize();

      const config = customService.getConfig();
      expect(config.defaultDeadlineDays).toBe(45);
      expect(config.requireIdentityVerification).toBe(false);

      await customService.close();
    });

    it("should update configuration", () => {
      const newConfig = service.updateConfig({
        maxRequestsPerUserPerMonth: 10,
      });
      expect(newConfig.maxRequestsPerUserPerMonth).toBe(10);
    });
  });

  // ============================================================================
  // REQUEST CREATION TESTS
  // ============================================================================

  describe("Request Creation", () => {
    const validInput: CreateDSARInput = {
      requestType: "access",
      regulation: "gdpr",
      dataCategories: ["profile", "messages"],
    };

    it("should create a request successfully", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.status).toBe("identity_verification_pending");
    });

    it("should generate external reference", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.data!.externalRef).toBeDefined();
      expect(result.data!.externalRef).toMatch(/^DSAR-\d{4}-[A-Z0-9]+$/);
    });

    it("should calculate deadline based on regulation", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        { ...validInput, regulation: "gdpr" },
      );

      const now = new Date();
      const deadline = new Date(result.data!.deadlineAt);
      const daysDiff = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDiff).toBe(30); // GDPR is 30 days
    });

    it("should use CCPA deadline for California requests", async () => {
      const result = await service.createRequest(
        "user-ca",
        "user@example.com",
        { ...validInput, regulation: "ccpa" },
      );

      const now = new Date();
      const deadline = new Date(result.data!.deadlineAt);
      const daysDiff = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(daysDiff).toBe(45); // CCPA is 45 days
    });

    it("should require identity verification by default", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.data!.verificationRequired).toBe(true);
      expect(result.data!.status).toBe("identity_verification_pending");
    });

    it("should auto-acknowledge if configured", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.data!.acknowledgedAt).toBeDefined();
    });

    it("should add initial audit event", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.data!.auditEvents.length).toBeGreaterThan(0);
      expect(result.data!.auditEvents[0].action).toBe("request_submitted");
    });

    it("should validate request type", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        { requestType: "invalid" as any },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid request type");
    });

    it("should fail when service is disabled", async () => {
      service.updateConfig({ enabled: false });

      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("disabled");
    });

    it("should record source IP and user agent", async () => {
      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        validInput,
        { ipAddress: "192.168.1.1", userAgent: "Test/1.0" },
      );

      expect(result.data!.sourceIp).toBe("192.168.1.1");
      expect(result.data!.userAgent).toBe("Test/1.0");
    });
  });

  // ============================================================================
  // RATE LIMITING TESTS
  // ============================================================================

  describe("Rate Limiting", () => {
    it("should enforce max concurrent requests", async () => {
      service.updateConfig({ maxConcurrentRequests: 1 });

      await service.createRequest("user-123", "user@example.com", {
        requestType: "access",
      });

      const result = await service.createRequest(
        "user-123",
        "user@example.com",
        {
          requestType: "portability",
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("concurrent");
    });

    it("should enforce monthly request limit", async () => {
      service.updateConfig({ maxRequestsPerUserPerMonth: 2 });

      // First request
      const req1 = await service.createRequest(
        "user-limit",
        "limit@example.com",
        {
          requestType: "access",
        },
      );
      // Cancel first to allow second
      await service.cancelRequest(req1.data!.id, "test", "system");

      // Second request
      const req2 = await service.createRequest(
        "user-limit",
        "limit@example.com",
        {
          requestType: "access",
        },
      );
      await service.cancelRequest(req2.data!.id, "test", "system");

      // Third request should fail
      const result = await service.createRequest(
        "user-limit",
        "limit@example.com",
        {
          requestType: "access",
        },
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("limit");
    });
  });

  // ============================================================================
  // REQUEST RETRIEVAL TESTS
  // ============================================================================

  describe("Request Retrieval", () => {
    beforeEach(async () => {
      await service.createRequest("user-1", "user1@example.com", {
        requestType: "access",
      });
      await service.createRequest("user-1", "user1@example.com", {
        requestType: "portability",
      });
      await service.createRequest("user-2", "user2@example.com", {
        requestType: "erasure",
      });
    });

    it("should get request by ID", async () => {
      const createResult = await service.createRequest(
        "user-test",
        "test@example.com",
        {
          requestType: "access",
        },
      );

      const request = service.getRequest(createResult.data!.id);
      expect(request).not.toBeNull();
      expect(request!.userId).toBe("user-test");
    });

    it("should get request by external reference", async () => {
      const createResult = await service.createRequest(
        "user-ref",
        "ref@example.com",
        {
          requestType: "access",
        },
      );

      const request = service.getRequestByExternalRef(
        createResult.data!.externalRef!,
      );
      expect(request).not.toBeNull();
      expect(request!.id).toBe(createResult.data!.id);
    });

    it("should return null for non-existent request", () => {
      const request = service.getRequest("non-existent-id");
      expect(request).toBeNull();
    });

    it("should get requests by user", () => {
      const requests = service.getRequestsByUser("user-1");
      expect(requests.length).toBe(2);
    });

    it("should list requests with pagination", () => {
      const result = service.listRequests({ limit: 2, offset: 0 });
      expect(result.requests.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it("should filter requests by status", () => {
      const result = service.listRequests({
        filters: { status: ["identity_verification_pending"] },
      });
      expect(result.requests.length).toBe(3);
    });

    it("should filter requests by request type", () => {
      const result = service.listRequests({
        filters: { requestType: ["erasure"] },
      });
      expect(result.requests.length).toBe(1);
    });

    it("should sort requests by deadline", () => {
      const result = service.listRequests({
        sortBy: "deadlineAt",
        sortOrder: "asc",
      });
      expect(result.requests.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // VERIFICATION TESTS
  // ============================================================================

  describe("Identity Verification", () => {
    let requestId: string;
    let verificationId: string;

    beforeEach(async () => {
      const result = await service.createRequest(
        "user-verify",
        "verify@example.com",
        {
          requestType: "access",
        },
      );
      requestId = result.data!.id;
      verificationId = result.data!.identityVerification!.id;
    });

    it("should initiate verification on request creation", async () => {
      const request = service.getRequest(requestId);
      expect(request!.identityVerification).toBeDefined();
      expect(request!.identityVerification!.status).toBe("pending");
    });

    it("should complete verification with valid token", async () => {
      const request = service.getRequest(requestId);
      const token = request!.identityVerification!.verificationToken!;

      const result = await service.completeVerification(verificationId, token);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("identity_verified");
      expect(result.data!.verifiedAt).toBeDefined();
    });

    it("should reject invalid token", async () => {
      const result = await service.completeVerification(
        verificationId,
        "wrong-token",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid verification token");
    });

    it("should track verification attempts", async () => {
      await service.completeVerification(verificationId, "wrong-1");
      await service.completeVerification(verificationId, "wrong-2");

      const request = service.getRequest(requestId);
      expect(request!.identityVerification!.attempts).toBe(2);
    });

    it("should fail after max attempts", async () => {
      // Config maxVerificationAttempts is set at verification creation time
      // Default is 3, so we need 4 attempts to exceed
      await service.completeVerification(verificationId, "wrong-1");
      await service.completeVerification(verificationId, "wrong-2");
      await service.completeVerification(verificationId, "wrong-3");
      const result = await service.completeVerification(
        verificationId,
        "wrong-4",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum verification attempts exceeded");
    });

    it("should resend verification", async () => {
      const result = await service.resendVerification(requestId);

      expect(result.success).toBe(true);
      expect(result.data!.verificationToken).toBeDefined();
    });
  });

  // ============================================================================
  // WORKFLOW ACTIONS TESTS
  // ============================================================================

  describe("Workflow Actions", () => {
    let requestId: string;

    beforeEach(async () => {
      // Create and verify request
      const result = await service.createRequest(
        "user-workflow",
        "workflow@example.com",
        {
          requestType: "access",
        },
      );
      requestId = result.data!.id;

      // Complete verification
      const request = service.getRequest(requestId);
      const token = request!.identityVerification!.verificationToken!;
      await service.completeVerification(
        request!.identityVerification!.id,
        token,
      );
    });

    it("should assign request to staff", async () => {
      const result = await service.assignRequest(requestId, "staff-1", "admin");

      expect(result.success).toBe(true);
      expect(result.data!.assignedTo).toBe("staff-1");
    });

    it("should approve request", async () => {
      const result = await service.approveRequest(
        requestId,
        "admin",
        "Looks good",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("approved");
      expect(result.data!.reviewedBy).toBe("admin");
      expect(result.data!.reviewNotes).toBe("Looks good");
    });

    it("should reject request", async () => {
      const result = await service.rejectRequest(
        requestId,
        "Invalid identity",
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("rejected");
      expect(result.data!.rejectionReason).toBe("Invalid identity");
    });

    it("should request extension", async () => {
      const result = await service.requestExtension(
        requestId,
        "Complex request",
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.data!.extensionDeadline).toBeDefined();
      expect(result.data!.extensionReason).toBe("Complex request");
    });

    it("should not allow double extension", async () => {
      await service.requestExtension(requestId, "First reason", "admin");
      const result = await service.requestExtension(
        requestId,
        "Second reason",
        "admin",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already granted");
    });

    it("should mark request as delivered", async () => {
      await service.approveRequest(requestId, "admin");

      const result = await service.markDelivered(
        requestId,
        "https://example.com/download/123",
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe("delivered");
      expect(result.data!.downloadUrl).toBe("https://example.com/download/123");
      expect(result.data!.completedAt).toBeDefined();
    });

    it("should record download", async () => {
      await service.approveRequest(requestId, "admin");
      await service.markDelivered(
        requestId,
        "https://example.com/download",
        "admin",
      );

      const result = await service.recordDownload(requestId, {
        ipAddress: "192.168.1.1",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(1); // First download

      const request = service.getRequest(requestId);
      expect(request!.downloadCount).toBe(1);
    });

    it("should enforce max downloads", async () => {
      await service.approveRequest(requestId, "admin");
      await service.markDelivered(
        requestId,
        "https://example.com/download",
        "admin",
      );

      // Default maxDownloads is 5, so download that many times
      await service.recordDownload(requestId);
      await service.recordDownload(requestId);
      await service.recordDownload(requestId);
      await service.recordDownload(requestId);
      await service.recordDownload(requestId);
      const result = await service.recordDownload(requestId); // 6th download should fail

      expect(result.success).toBe(false);
      expect(result.error).toContain("Maximum download limit reached");
    });

    it("should close request", async () => {
      await service.approveRequest(requestId, "admin");
      await service.markDelivered(
        requestId,
        "https://example.com/download",
        "admin",
      );

      const result = await service.closeRequest(requestId, "admin");

      expect(result.success).toBe(true);

      const request = service.getRequest(requestId);
      expect(request!.status).toBe("closed");
      expect(request!.closedAt).toBeDefined();
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
        {
          requestType: "access",
        },
      );

      const result = await service.cancelRequest(
        createResult.data!.id,
        "Changed mind",
        "user-cancel",
      );

      expect(result.success).toBe(true);

      const request = service.getRequest(createResult.data!.id);
      expect(request!.status).toBe("cancelled");
    });

    it("should not cancel completed request", async () => {
      const createResult = await service.createRequest(
        "user-complete",
        "complete@example.com",
        {
          requestType: "access",
        },
      );

      // Verify and complete the request
      const request = service.getRequest(createResult.data!.id)!;
      await service.completeVerification(
        request.identityVerification!.id,
        request.identityVerification!.verificationToken!,
      );
      await service.approveRequest(createResult.data!.id, "admin");
      await service.markDelivered(
        createResult.data!.id,
        "https://example.com",
        "admin",
      );

      const result = await service.cancelRequest(
        createResult.data!.id,
        "Too late",
        "user-complete",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot cancel");
    });
  });

  // ============================================================================
  // DEADLINE MANAGEMENT TESTS
  // ============================================================================

  describe("Deadline Management", () => {
    it("should calculate remaining days", async () => {
      const result = await service.createRequest(
        "user-deadline",
        "deadline@example.com",
        {
          requestType: "access",
          regulation: "gdpr",
        },
      );

      const remainingDays = service.getRemainingDays(result.data!.id);
      expect(remainingDays).toBe(30);
    });

    it("should identify overdue requests", async () => {
      // Create request with past deadline (by modifying directly)
      const result = await service.createRequest(
        "user-overdue",
        "overdue@example.com",
        {
          requestType: "access",
        },
      );

      const request = service.getRequest(result.data!.id)!;
      request.deadlineAt = new Date(Date.now() - 1000 * 60 * 60 * 24); // Yesterday

      const overdueRequests = service.getOverdueRequests();
      expect(overdueRequests.length).toBe(1);
      expect(overdueRequests[0].id).toBe(result.data!.id);
    });

    it("should identify approaching deadline requests", async () => {
      const result = await service.createRequest(
        "user-approaching",
        "approaching@example.com",
        {
          requestType: "access",
        },
      );

      const request = service.getRequest(result.data!.id)!;
      request.deadlineAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days

      const approaching = service.getApproachingDeadlineRequests(5);
      expect(approaching.length).toBe(1);
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("Statistics", () => {
    beforeEach(async () => {
      // Create some test requests
      await service.createRequest("user-stat1", "stat1@example.com", {
        requestType: "access",
        regulation: "gdpr",
      });
      await service.createRequest("user-stat2", "stat2@example.com", {
        requestType: "erasure",
        regulation: "ccpa",
      });
    });

    it("should track total requests", () => {
      const stats = service.getStatistics();
      expect(stats.totalRequests).toBe(2);
    });

    it("should count active requests", () => {
      const stats = service.getStatistics();
      expect(stats.activeRequests).toBe(2);
    });

    it("should count by request type", () => {
      const stats = service.getStatistics();
      expect(stats.byRequestType.access).toBe(1);
      expect(stats.byRequestType.erasure).toBe(1);
    });

    it("should count by regulation", () => {
      const stats = service.getStatistics();
      expect(stats.byRegulation.gdpr).toBe(1);
      expect(stats.byRegulation.ccpa).toBe(1);
    });

    it("should count by status", () => {
      const stats = service.getStatistics();
      expect(stats.byStatus.identity_verification_pending).toBe(2);
    });

    it("should calculate period statistics", async () => {
      const stats = service.getStatistics(30);
      expect(stats.newRequestsInPeriod).toBe(2);
      expect(stats.periodStart).toBeDefined();
      expect(stats.periodEnd).toBeDefined();
    });
  });

  // ============================================================================
  // AUDIT TRAIL TESTS
  // ============================================================================

  describe("Audit Trail", () => {
    it("should log status changes", async () => {
      const result = await service.createRequest(
        "user-audit",
        "audit@example.com",
        {
          requestType: "access",
        },
      );

      const request = service.getRequest(result.data!.id)!;
      await service.completeVerification(
        request.identityVerification!.id,
        request.identityVerification!.verificationToken!,
      );

      const updatedRequest = service.getRequest(result.data!.id)!;
      expect(updatedRequest.auditEvents.length).toBeGreaterThan(1);
    });

    it("should include audit events in list response", async () => {
      await service.createRequest("user-include", "include@example.com", {
        requestType: "access",
      });

      const result = service.listRequests({ includeAuditEvents: true });
      expect(result.requests[0].auditEvents.length).toBeGreaterThan(0);
    });

    it("should exclude audit events by default", async () => {
      await service.createRequest("user-exclude", "exclude@example.com", {
        requestType: "access",
      });

      const result = service.listRequests({ includeAuditEvents: false });
      expect(result.requests[0].auditEvents.length).toBe(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should throw when not initialized", async () => {
      const uninitializedService = createDSARService();

      await expect(
        uninitializedService.createRequest("user", "user@example.com", {
          requestType: "access",
        }),
      ).rejects.toThrow("not initialized");
    });

    it("should handle non-existent request gracefully", async () => {
      const result = await service.approveRequest("non-existent", "admin");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should prevent invalid status transitions", async () => {
      const createResult = await service.createRequest(
        "user-invalid",
        "invalid@example.com",
        {
          requestType: "access",
        },
      );

      // Try to approve without verification
      const result = await service.approveRequest(
        createResult.data!.id,
        "admin",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot approve");
    });
  });
});
