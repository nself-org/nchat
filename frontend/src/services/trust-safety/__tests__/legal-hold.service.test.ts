/**
 * Legal Hold Service Tests
 *
 * Comprehensive tests for legal hold creation, management, and enforcement.
 */

import {
  LegalHoldService,
  createLegalHoldService,
  DEFAULT_LEGAL_HOLD_CONFIG,
} from "../legal-hold.service";
import {
  EvidenceCollectorService,
  createEvidenceCollector,
} from "../evidence-collector.service";
import type {
  LegalHoldCriteria,
  LegalHoldScope,
} from "@/lib/trust-safety/evidence-types";

describe("LegalHoldService", () => {
  let legalHoldService: LegalHoldService;
  let evidenceCollector: EvidenceCollectorService;

  beforeEach(() => {
    evidenceCollector = createEvidenceCollector();
    legalHoldService = createLegalHoldService(
      { requireApproval: false },
      evidenceCollector,
    );
  });

  afterEach(() => {
    legalHoldService.clear();
    evidenceCollector.clear();
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = legalHoldService.getConfig();
      expect(config.creatorRoles).toEqual(
        DEFAULT_LEGAL_HOLD_CONFIG.creatorRoles,
      );
    });

    it("should accept custom configuration", () => {
      const customService = createLegalHoldService({
        maxHoldDurationDays: 180,
        requireApproval: true,
      });
      const config = customService.getConfig();
      expect(config.maxHoldDurationDays).toBe(180);
      expect(config.requireApproval).toBe(true);
    });

    it("should update configuration", () => {
      legalHoldService.updateConfig({ notifyAffectedUsers: true });
      const config = legalHoldService.getConfig();
      expect(config.notifyAffectedUsers).toBe(true);
    });
  });

  // ==========================================================================
  // Legal Hold Creation Tests
  // ==========================================================================

  describe("Legal Hold Creation", () => {
    const baseCriteria: LegalHoldCriteria = {
      userIds: ["user-1", "user-2"],
    };

    it("should create a legal hold", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test legal hold",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.hold.id).toBeDefined();
        expect(result.hold.name).toBe("Test Hold");
        expect(result.hold.status).toBe("active");
        expect(result.hold.scope).toBe("user");
      }
    });

    it("should reject unauthorized creator role", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "user-1",
        requestedByRole: "member", // Not authorized
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not authorized");
      }
    });

    it("should validate user scope criteria", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: {}, // Missing userIds
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("user ID");
      }
    });

    it("should validate channel scope criteria", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "channel",
        criteria: {}, // Missing channelIds
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("channel ID");
      }
    });

    it("should validate workspace scope criteria", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "workspace",
        criteria: {}, // Missing workspaceId
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(false);
    });

    it("should validate date range scope criteria", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "date_range",
        criteria: { startDate: new Date() }, // Missing endDate
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(false);
    });

    it("should validate specific scope criteria", async () => {
      const result = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "specific",
        criteria: {}, // Missing evidenceIds
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(result.success).toBe(false);
    });

    it("should create pending hold for future effective date", async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await legalHoldService.create({
        name: "Future Hold",
        description: "Test",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "legal-1",
        requestedByRole: "legal",
        effectiveFrom: futureDate,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Note: Without approval required, status depends on date
        expect(result.hold.effectiveFrom).toEqual(futureDate);
      }
    });

    it("should set expiration date", async () => {
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const result = await legalHoldService.create({
        name: "Expiring Hold",
        description: "Test",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.hold.expiresAt).toEqual(expiresAt);
      }
    });

    it("should validate max duration", async () => {
      const limitedService = createLegalHoldService(
        { maxHoldDurationDays: 30, requireApproval: false },
        evidenceCollector,
      );

      const result = await limitedService.create({
        name: "Long Hold",
        description: "Test",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("maximum");
      }
    });

    it("should set case reference", async () => {
      const result = await legalHoldService.create({
        name: "Case Hold",
        description: "Test",
        scope: "user",
        criteria: baseCriteria,
        requestedBy: "legal-1",
        requestedByRole: "legal",
        caseReference: "CASE-2026-001",
        legalMatterId: "MATTER-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.hold.caseReference).toBe("CASE-2026-001");
        expect(result.hold.legalMatterId).toBe("MATTER-123");
      }
    });
  });

  // ==========================================================================
  // Approval Tests
  // ==========================================================================

  describe("Legal Hold Approval", () => {
    let approvalService: LegalHoldService;

    beforeEach(() => {
      approvalService = createLegalHoldService(
        { requireApproval: true },
        evidenceCollector,
      );
    });

    afterEach(() => {
      approvalService.clear();
    });

    it("should create pending hold when approval required", async () => {
      const result = await approvalService.create({
        name: "Pending Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "moderator-1",
        requestedByRole: "moderator",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.hold.status).toBe("pending");
        expect(result.hold.approvedBy).toBeUndefined();
      }
    });

    it("should approve pending hold", async () => {
      const createResult = await approvalService.create({
        name: "Pending Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "moderator-1",
        requestedByRole: "moderator",
      });

      if (!createResult.success) return;

      const approveResult = await approvalService.approve(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Approved for investigation",
      );

      expect(approveResult.success).toBe(true);
      if (approveResult.success) {
        expect(approveResult.hold.status).toBe("active");
        expect(approveResult.hold.approvedBy).toBe("legal-1");
      }
    });

    it("should reject unauthorized approver", async () => {
      const createResult = await approvalService.create({
        name: "Pending Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "moderator-1",
        requestedByRole: "moderator",
      });

      if (!createResult.success) return;

      const approveResult = await approvalService.approve(
        createResult.hold.id,
        "user-1",
        "member", // Not authorized
      );

      expect(approveResult.success).toBe(false);
    });

    it("should reject approval of non-pending hold", async () => {
      // Create without approval required
      const createResult = await legalHoldService.create({
        name: "Active Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      const approveResult = await legalHoldService.approve(
        createResult.hold.id,
        "legal-2",
        "legal",
      );

      expect(approveResult.success).toBe(false);
    });
  });

  // ==========================================================================
  // Release Tests
  // ==========================================================================

  describe("Legal Hold Release", () => {
    it("should release active hold", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      const releaseResult = await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Investigation completed",
      );

      expect(releaseResult.success).toBe(true);
      if (releaseResult.success) {
        expect(releaseResult.hold.status).toBe("released");
      }
    });

    it("should reject unauthorized releaser", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      const releaseResult = await legalHoldService.release(
        createResult.hold.id,
        "user-1",
        "member",
        "Try to release",
      );

      expect(releaseResult.success).toBe(false);
    });

    it("should reject releasing already released hold", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Released",
      );

      const secondRelease = await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Try again",
      );

      expect(secondRelease.success).toBe(false);
    });

    it("should add release note", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Investigation completed",
      );

      const hold = legalHoldService.get(createResult.hold.id);
      expect(hold?.notes).toBeDefined();
      expect(
        hold?.notes?.some((n) => n.includes("Investigation completed")),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Extension Tests
  // ==========================================================================

  describe("Legal Hold Extension", () => {
    it("should extend hold expiration", async () => {
      const originalExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt: originalExpiry,
      });

      if (!createResult.success) return;

      const extendResult = await legalHoldService.extend(
        createResult.hold.id,
        newExpiry,
        "legal-1",
        "legal",
        "Investigation ongoing",
      );

      expect(extendResult.success).toBe(true);
      if (extendResult.success) {
        expect(extendResult.hold.expiresAt).toEqual(newExpiry);
      }
    });

    it("should reject extension to earlier date", async () => {
      const originalExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const earlierExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt: originalExpiry,
      });

      if (!createResult.success) return;

      const extendResult = await legalHoldService.extend(
        createResult.hold.id,
        earlierExpiry,
        "legal-1",
        "legal",
        "Test",
      );

      expect(extendResult.success).toBe(false);
    });

    it("should reject extension of released hold", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Done",
      );

      const extendResult = await legalHoldService.extend(
        createResult.hold.id,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        "legal-1",
        "legal",
        "Need more time",
      );

      expect(extendResult.success).toBe(false);
    });
  });

  // ==========================================================================
  // Criteria Update Tests
  // ==========================================================================

  describe("Criteria Updates", () => {
    it("should add users to criteria", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      const updateResult = await legalHoldService.updateCriteria(
        createResult.hold.id,
        { userIds: ["user-2", "user-3"] },
        "legal-1",
        "legal",
      );

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.hold.criteria.userIds).toContain("user-1");
        expect(updateResult.hold.criteria.userIds).toContain("user-2");
        expect(updateResult.hold.criteria.userIds).toContain("user-3");
      }
    });

    it("should expand date range", async () => {
      const startDate = new Date("2026-01-01");
      const endDate = new Date("2026-02-01");

      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "date_range",
        criteria: { startDate, endDate },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      const earlierStart = new Date("2025-12-01");
      const laterEnd = new Date("2026-03-01");

      const updateResult = await legalHoldService.updateCriteria(
        createResult.hold.id,
        { startDate: earlierStart, endDate: laterEnd },
        "legal-1",
        "legal",
      );

      expect(updateResult.success).toBe(true);
      if (updateResult.success) {
        expect(updateResult.hold.criteria.startDate).toEqual(earlierStart);
        expect(updateResult.hold.criteria.endDate).toEqual(laterEnd);
      }
    });

    it("should reject update of released hold", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Done",
      );

      const updateResult = await legalHoldService.updateCriteria(
        createResult.hold.id,
        { userIds: ["user-2"] },
        "legal-1",
        "legal",
      );

      expect(updateResult.success).toBe(false);
    });
  });

  // ==========================================================================
  // Query Tests
  // ==========================================================================

  describe("Legal Hold Queries", () => {
    beforeEach(async () => {
      await legalHoldService.create({
        name: "Hold 1",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
        caseReference: "CASE-001",
      });

      await legalHoldService.create({
        name: "Hold 2",
        description: "Test",
        scope: "channel",
        criteria: { channelIds: ["channel-1"] },
        requestedBy: "legal-2",
        requestedByRole: "legal",
        caseReference: "CASE-002",
      });
    });

    it("should get hold by ID", () => {
      const holds = legalHoldService.getAll();
      const hold = legalHoldService.get(holds[0].id);
      expect(hold).toBeDefined();
      expect(hold!.name).toBe(holds[0].name); // Get the same hold
    });

    it("should return undefined for non-existent hold", () => {
      const hold = legalHoldService.get("non-existent");
      expect(hold).toBeUndefined();
    });

    it("should get all holds", () => {
      const holds = legalHoldService.getAll();
      expect(holds).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const holds = legalHoldService.getAll();
      await legalHoldService.release(holds[0].id, "legal-1", "legal", "Done");

      const active = legalHoldService.getAll({ status: "active" });
      expect(active).toHaveLength(1);

      const released = legalHoldService.getAll({ status: "released" });
      expect(released).toHaveLength(1);
    });

    it("should filter by scope", () => {
      const userHolds = legalHoldService.getAll({ scope: "user" });
      expect(userHolds).toHaveLength(1);
      expect(userHolds[0].scope).toBe("user");
    });

    it("should filter by requester", () => {
      const holds = legalHoldService.getAll({ requestedBy: "legal-1" });
      expect(holds).toHaveLength(1);
    });

    it("should filter by case reference", () => {
      const holds = legalHoldService.getHoldsByCaseReference("CASE-001");
      expect(holds).toHaveLength(1);
      expect(holds[0].caseReference).toBe("CASE-001");
    });

    it("should get active holds", () => {
      const active = legalHoldService.getActive();
      expect(active).toHaveLength(2);
    });

    it("should get pending holds", async () => {
      const approvalService = createLegalHoldService(
        { requireApproval: true },
        evidenceCollector,
      );

      await approvalService.create({
        name: "Pending",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "mod-1",
        requestedByRole: "moderator",
      });

      const pending = approvalService.getPending();
      expect(pending).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Evidence Integration Tests
  // ==========================================================================

  describe("Evidence Integration", () => {
    it("should apply hold to matching evidence", async () => {
      // Create evidence first
      await evidenceCollector.collect(
        {
          type: "message",
          content: "Test",
          reason: "Test",
          source: "test",
          workspaceId: "ws-1",
          userId: "user-1",
        },
        "collector-1",
      );

      // Create hold
      const holdResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(holdResult.success).toBe(true);
      if (holdResult.success) {
        expect(holdResult.hold.evidenceCount).toBeGreaterThan(0);
      }
    });

    it("should check if evidence is under hold", async () => {
      const evResult = await evidenceCollector.collect(
        {
          type: "message",
          content: "Test",
          reason: "Test",
          source: "test",
          workspaceId: "ws-1",
          userId: "user-1",
        },
        "collector-1",
      );

      if (!evResult.success) return;

      // Before hold
      expect(legalHoldService.isEvidenceUnderHold(evResult.evidence.id)).toBe(
        false,
      );

      // Create hold
      await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "specific",
        criteria: { evidenceIds: [evResult.evidence.id] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      // After hold
      expect(legalHoldService.isEvidenceUnderHold(evResult.evidence.id)).toBe(
        true,
      );
    });

    it("should get holds for specific evidence", async () => {
      const evResult = await evidenceCollector.collect(
        {
          type: "message",
          content: "Test",
          reason: "Test",
          source: "test",
          workspaceId: "ws-1",
          userId: "user-1",
        },
        "collector-1",
      );

      if (!evResult.success) return;

      await legalHoldService.create({
        name: "Hold 1",
        description: "Test",
        scope: "specific",
        criteria: { evidenceIds: [evResult.evidence.id] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      const holds = legalHoldService.getHoldsForEvidence(evResult.evidence.id);
      expect(holds).toHaveLength(1);
    });

    it("should release evidence when hold released", async () => {
      const evResult = await evidenceCollector.collect(
        {
          type: "message",
          content: "Test",
          reason: "Test",
          source: "test",
          workspaceId: "ws-1",
        },
        "collector-1",
      );

      if (!evResult.success) return;

      const holdResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "specific",
        criteria: { evidenceIds: [evResult.evidence.id] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!holdResult.success) return;

      await legalHoldService.release(
        holdResult.hold.id,
        "legal-1",
        "legal",
        "Done",
      );

      const evidence = await evidenceCollector.get(
        evResult.evidence.id,
        "test",
      );
      if (evidence.success) {
        expect(evidence.evidence.legalHoldIds).not.toContain(
          holdResult.hold.id,
        );
        expect(evidence.evidence.status).toBe("active");
      }
    });
  });

  // ==========================================================================
  // Audit Log Tests
  // ==========================================================================

  describe("Audit Log", () => {
    it("should log hold creation", async () => {
      await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      const logs = legalHoldService.getAuditLog({ action: "create" });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("create");
    });

    it("should log hold release", async () => {
      const createResult = await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      if (!createResult.success) return;

      await legalHoldService.release(
        createResult.hold.id,
        "legal-1",
        "legal",
        "Done",
      );

      const logs = legalHoldService.getAuditLog({ action: "release" });
      expect(logs).toHaveLength(1);
    });

    it("should filter audit log by hold ID", async () => {
      const result1 = await legalHoldService.create({
        name: "Hold 1",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      await legalHoldService.create({
        name: "Hold 2",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-2"] },
        requestedBy: "legal-2",
        requestedByRole: "legal",
      });

      if (!result1.success) return;

      const logs = legalHoldService.getAuditLog({ holdId: result1.hold.id });
      expect(logs).toHaveLength(1);
    });

    it("should filter audit log by date range", async () => {
      await legalHoldService.create({
        name: "Test Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      const logs = legalHoldService.getAuditLog({
        startDate: new Date(Date.now() - 1000),
        endDate: new Date(Date.now() + 1000),
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe("Statistics", () => {
    beforeEach(async () => {
      await legalHoldService.create({
        name: "Active Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      });

      await legalHoldService.create({
        name: "Channel Hold",
        description: "Test",
        scope: "channel",
        criteria: { channelIds: ["channel-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });
    });

    it("should calculate statistics", () => {
      const stats = legalHoldService.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byScope.user).toBe(1);
      expect(stats.byScope.channel).toBe(1);
    });

    it("should track expiring holds", () => {
      const stats = legalHoldService.getStatistics();
      expect(stats.expiringWithin30Days).toBe(1);
    });

    it("should track pending approvals", async () => {
      const approvalService = createLegalHoldService(
        { requireApproval: true },
        evidenceCollector,
      );

      await approvalService.create({
        name: "Pending",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "mod-1",
        requestedByRole: "moderator",
      });

      const stats = approvalService.getStatistics();
      expect(stats.pendingApprovals).toBe(1);
    });
  });

  // ==========================================================================
  // Maintenance Tests
  // ==========================================================================

  describe("Maintenance", () => {
    it("should process expired holds", async () => {
      // Create hold that's already expired (mock past expiration)
      const createResult = await legalHoldService.create({
        name: "Expired Hold",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      if (!createResult.success) return;

      const result = await legalHoldService.processExpiredHolds();

      expect(result.processed).toBe(1);
      expect(result.expired).toContain(createResult.hold.id);

      const hold = legalHoldService.get(createResult.hold.id);
      expect(hold?.status).toBe("expired");
    });

    it("should count total holds", () => {
      expect(legalHoldService.count()).toBe(0);

      legalHoldService.create({
        name: "Test",
        description: "Test",
        scope: "user",
        criteria: { userIds: ["user-1"] },
        requestedBy: "legal-1",
        requestedByRole: "legal",
      });

      expect(legalHoldService.count()).toBe(1);
    });
  });
});
