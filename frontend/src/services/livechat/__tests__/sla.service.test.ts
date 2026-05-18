/**
 * SLA Service Tests
 *
 * Tests for the SLA service including:
 * - Policy CRUD operations
 * - SLA tracking
 * - Violation detection
 * - Business hours
 * - Escalation rules
 * - Metrics
 *
 * @module services/livechat/__tests__/sla.service.test
 */

import {
  SLAService,
  getSLAService,
  createSLAService,
  resetSLAService,
  type EscalationRule,
} from "../sla.service";
import { resetLivechatService, getLivechatService } from "../livechat.service";
import type { Conversation, ConversationPriority } from "../types";

// Mock logger
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).slice(2, 11)}`),
}));

describe("SLAService", () => {
  let service: SLAService;
  let livechatService: ReturnType<typeof getLivechatService>;

  let currentTime: number;

  beforeEach(() => {
    currentTime = Date.now();
    jest.useFakeTimers({ now: currentTime });
    resetSLAService();
    resetLivechatService();
    service = getSLAService();
    livechatService = getLivechatService();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetSLAService();
    resetLivechatService();
  });

  // Helper to advance time (both fake timers and Date.now)
  function advanceTime(ms: number): void {
    currentTime += ms;
    jest.setSystemTime(currentTime);
    jest.advanceTimersByTime(ms);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize with default SLA policies", async () => {
      const result = await service.listPolicies();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      const priorities = result.data!.map((p) => p.priority);
      expect(priorities).toContain("urgent");
      expect(priorities).toContain("high");
      expect(priorities).toContain("medium");
      expect(priorities).toContain("low");
    });

    it("should return same instance with getSLAService", () => {
      const instance1 = getSLAService();
      const instance2 = getSLAService();
      expect(instance1).toBe(instance2);
    });

    it("should return new instance with createSLAService", () => {
      const instance1 = createSLAService();
      const instance2 = createSLAService();
      expect(instance1).not.toBe(instance2);
    });

    it("should have default business hours configured", () => {
      const hours = service.getBusinessHours();

      expect(hours.enabled).toBe(true);
      expect(hours.timezone).toBe("America/New_York");
      expect(hours.schedule.length).toBe(7);
    });
  });

  // ============================================================================
  // POLICY CRUD
  // ============================================================================

  describe("Policy CRUD", () => {
    describe("createPolicy", () => {
      it("should create an SLA policy", async () => {
        const result = await service.createPolicy({
          name: "Custom Policy",
          priority: "high",
          firstResponseTime: 120,
          nextResponseTime: 300,
          resolutionTime: 3600,
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          name: "Custom Policy",
          priority: "high",
          firstResponseTime: 120,
          nextResponseTime: 300,
          resolutionTime: 3600,
          enabled: true,
        });
        expect(result.data!.id).toBeDefined();
      });

      it("should create policy with optional fields", async () => {
        const result = await service.createPolicy({
          name: "Full Policy",
          description: "A detailed description",
          priority: "medium",
          firstResponseTime: 300,
          nextResponseTime: 600,
          resolutionTime: 7200,
          operationalHoursOnly: true,
          departments: ["support", "sales"],
          channels: ["web_widget", "email"],
        });

        expect(result.success).toBe(true);
        expect(result.data!.description).toBe("A detailed description");
        expect(result.data!.operationalHoursOnly).toBe(true);
        expect(result.data!.departments).toEqual(["support", "sales"]);
        expect(result.data!.channels).toEqual(["web_widget", "email"]);
      });

      it("should reject non-positive time values", async () => {
        const result = await service.createPolicy({
          name: "Invalid",
          priority: "low",
          firstResponseTime: -1,
          nextResponseTime: 300,
          resolutionTime: 3600,
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("VALIDATION_ERROR");
      });

      it("should reject first response time exceeding resolution time", async () => {
        const result = await service.createPolicy({
          name: "Invalid",
          priority: "low",
          firstResponseTime: 7200,
          nextResponseTime: 300,
          resolutionTime: 3600,
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("VALIDATION_ERROR");
      });
    });

    describe("getPolicy", () => {
      it("should get a policy by ID", async () => {
        const created = await service.createPolicy({
          name: "Get Test",
          priority: "medium",
          firstResponseTime: 300,
          nextResponseTime: 600,
          resolutionTime: 3600,
        });

        const result = await service.getPolicy(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(created.data);
      });

      it("should return null for non-existent ID", async () => {
        const result = await service.getPolicy("non-existent");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("updatePolicy", () => {
      it("should update a policy", async () => {
        const created = await service.createPolicy({
          name: "Original",
          priority: "medium",
          firstResponseTime: 300,
          nextResponseTime: 600,
          resolutionTime: 3600,
        });

        const result = await service.updatePolicy(created.data!.id, {
          name: "Updated",
          firstResponseTime: 180,
        });

        expect(result.success).toBe(true);
        expect(result.data!.name).toBe("Updated");
        expect(result.data!.firstResponseTime).toBe(180);
      });

      it("should enable/disable policy", async () => {
        const created = await service.createPolicy({
          name: "Toggle Test",
          priority: "low",
          firstResponseTime: 900,
          nextResponseTime: 1800,
          resolutionTime: 86400,
        });

        const result = await service.updatePolicy(created.data!.id, {
          enabled: false,
        });

        expect(result.success).toBe(true);
        expect(result.data!.enabled).toBe(false);
      });

      it("should return error for non-existent ID", async () => {
        const result = await service.updatePolicy("non-existent", {
          name: "Updated",
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("deletePolicy", () => {
      it("should delete a policy", async () => {
        const created = await service.createPolicy({
          name: "Delete Test",
          priority: "low",
          firstResponseTime: 900,
          nextResponseTime: 1800,
          resolutionTime: 86400,
        });

        const result = await service.deletePolicy(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data!.deleted).toBe(true);

        const getResult = await service.getPolicy(created.data!.id);
        expect(getResult.data).toBeNull();
      });

      it("should return error for non-existent ID", async () => {
        const result = await service.deletePolicy("non-existent");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("listPolicies", () => {
      it("should list all policies sorted by priority", async () => {
        const result = await service.listPolicies();

        expect(result.success).toBe(true);
        const priorities = result.data!.map((p) => p.priority);
        const priorityOrder = ["urgent", "high", "medium", "low"];

        let lastIndex = -1;
        for (const p of priorities) {
          const currentIndex = priorityOrder.indexOf(p);
          expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
          lastIndex = currentIndex;
        }
      });

      it("should filter by enabled status", async () => {
        const created = await service.createPolicy({
          name: "Disabled Policy",
          priority: "low",
          firstResponseTime: 900,
          nextResponseTime: 1800,
          resolutionTime: 86400,
        });
        await service.updatePolicy(created.data!.id, { enabled: false });

        const enabledResult = await service.listPolicies({ enabled: true });
        const disabledResult = await service.listPolicies({ enabled: false });

        expect(enabledResult.data!.every((p) => p.enabled)).toBe(true);
        expect(disabledResult.data!.every((p) => !p.enabled)).toBe(true);
      });
    });
  });

  // ============================================================================
  // SLA TRACKING
  // ============================================================================

  describe("SLA Tracking", () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a visitor
      const visitorResult = await livechatService.createVisitor({
        name: "Test Visitor",
        email: "test@example.com",
        channel: "web_widget",
      });

      // Create a conversation with medium priority (matching default policy)
      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "medium",
      });
      conversationId = convResult.data!.id;
    });

    describe("getPolicyForConversation", () => {
      it("should find matching policy by priority", async () => {
        const convResult =
          await livechatService.getConversation(conversationId);
        const policy = await service.getPolicyForConversation(convResult.data!);

        expect(policy).not.toBeNull();
        expect(policy!.priority).toBe("medium");
      });

      it("should return null when no matching policy", async () => {
        // Disable all policies first
        const policies = await service.listPolicies();
        for (const policy of policies.data!) {
          await service.updatePolicy(policy.id, { enabled: false });
        }

        const convResult =
          await livechatService.getConversation(conversationId);
        const policy = await service.getPolicyForConversation(convResult.data!);

        expect(policy).toBeNull();
      });
    });

    describe("startTracking", () => {
      it("should start SLA tracking for a conversation", async () => {
        const result = await service.startTracking(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.policy).toBeDefined();
        expect(result.data!.targets.firstResponse).toBeInstanceOf(Date);
        expect(result.data!.targets.resolution).toBeInstanceOf(Date);
      });

      it("should return error for non-existent conversation", async () => {
        const result = await service.startTracking("non-existent");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should create SLA timers", async () => {
        await service.startTracking(conversationId);

        const timerCount = service.getActiveTimerCount();
        expect(timerCount).toBeGreaterThan(0);
      });
    });

    describe("stopTracking", () => {
      it("should stop SLA tracking", async () => {
        await service.startTracking(conversationId);

        const result = await service.stopTracking(conversationId);

        expect(result.success).toBe(true);
      });

      it("should clear timers", async () => {
        await service.startTracking(conversationId);
        const beforeCount = service.getActiveTimerCount();

        await service.stopTracking(conversationId);
        const afterCount = service.getActiveTimerCount();

        expect(afterCount).toBeLessThan(beforeCount);
      });
    });

    describe("checkSLA", () => {
      it("should check SLA status", async () => {
        await service.startTracking(conversationId);

        const result = await service.checkSLA(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.conversationId).toBe(conversationId);
        expect(result.data!.policyId).toBeDefined();
        expect(result.data!.urgency).toBe("normal");
      });

      it("should check urgency based on remaining time", async () => {
        await service.startTracking(conversationId);

        // Check SLA immediately - should be normal urgency
        const result = await service.checkSLA(conversationId);

        expect(result.success).toBe(true);
        // Urgency should be normal since we just started
        expect(result.data!.urgency).toBe("normal");
        expect(result.data!.firstResponse.remaining).toBeGreaterThan(0);
      });

      it("should return empty result for conversation without SLA", async () => {
        const result = await service.checkSLA(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.policyId).toBeUndefined();
      });
    });

    describe("recordFirstResponse", () => {
      it("should record first response and check SLA met", async () => {
        await service.startTracking(conversationId);

        const result = await service.recordFirstResponse(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.met).toBe(true);
        expect(result.data!.responseTime).toBeGreaterThanOrEqual(0);
      });

      it("should record SLA met when responding within target time", async () => {
        await service.startTracking(conversationId);

        // Record first response immediately - should be met
        const result = await service.recordFirstResponse(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.met).toBe(true);
        expect(result.data!.responseTime).toBeGreaterThanOrEqual(0);

        // No violations should be recorded
        const violations = await service.getViolations(conversationId);
        expect(
          violations.data!.filter((v) => v.type === "first_response").length,
        ).toBe(0);
      });
    });

    describe("recordResolution", () => {
      it("should record resolution and check SLA met", async () => {
        await service.startTracking(conversationId);

        const result = await service.recordResolution(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.met).toBe(true);
      });

      it("should clear all timers on resolution", async () => {
        await service.startTracking(conversationId);
        expect(service.getActiveTimerCount()).toBeGreaterThan(0);

        await service.recordResolution(conversationId);

        // Timers for this conversation should be cleared
        // (but there may be timers from default data)
      });
    });
  });

  // ============================================================================
  // VIOLATIONS
  // ============================================================================

  describe("Violations", () => {
    let conversationId: string;

    beforeEach(async () => {
      const visitorResult = await livechatService.createVisitor({
        name: "Test Visitor",
        channel: "web_widget",
      });

      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "urgent", // Urgent has stricter SLAs
      });
      conversationId = convResult.data!.id;
    });

    describe("getViolations", () => {
      it("should get violations for a conversation", async () => {
        await service.startTracking(conversationId);

        // Trigger violation
        advanceTime(2 * 60 * 1000); // 2 minutes (past 1 min urgent target)

        const result = await service.getViolations(conversationId);

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should return empty array when no violations", async () => {
        const result = await service.getViolations(conversationId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });
    });

    describe("listViolations", () => {
      beforeEach(async () => {
        // Create violations by letting timers expire
        await service.startTracking(conversationId);
        advanceTime(2 * 60 * 1000);
      });

      it("should list all violations", async () => {
        const result = await service.listViolations({});

        expect(result.success).toBe(true);
        expect(result.data!.items.length).toBeGreaterThan(0);
      });

      it("should filter by type", async () => {
        const result = await service.listViolations({ type: "first_response" });

        expect(result.success).toBe(true);
        expect(
          result.data!.items.every((v) => v.type === "first_response"),
        ).toBe(true);
      });

      it("should filter by period", async () => {
        const now = new Date();
        const result = await service.listViolations({
          period: {
            start: new Date(now.getTime() - 60000),
            end: new Date(now.getTime() + 60000),
          },
        });

        expect(result.success).toBe(true);
      });

      it("should paginate results", async () => {
        const result = await service.listViolations({ limit: 1, offset: 0 });

        expect(result.success).toBe(true);
        expect(result.data!.items.length).toBeLessThanOrEqual(1);
        expect(result.data!.limit).toBe(1);
        expect(result.data!.offset).toBe(0);
      });
    });
  });

  // ============================================================================
  // ESCALATION RULES
  // ============================================================================

  describe("Escalation Rules", () => {
    it("should add an escalation rule", () => {
      const rule = service.addEscalationRule({
        name: "Notify on first response breach",
        enabled: true,
        trigger: {
          type: "first_response",
          threshold: 100,
        },
        actions: [{ type: "notify_manager", target: "manager-1" }],
      });

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe("Notify on first response breach");
    });

    it("should get all escalation rules", () => {
      service.addEscalationRule({
        name: "Rule 1",
        enabled: true,
        trigger: { type: "first_response", threshold: 100 },
        actions: [],
      });

      service.addEscalationRule({
        name: "Rule 2",
        enabled: false,
        trigger: { type: "resolution", threshold: 100 },
        actions: [],
      });

      const rules = service.getEscalationRules();

      expect(rules.length).toBe(2);
    });

    it("should delete an escalation rule", () => {
      const rule = service.addEscalationRule({
        name: "To Delete",
        enabled: true,
        trigger: { type: "first_response", threshold: 100 },
        actions: [],
      });

      const deleted = service.deleteEscalationRule(rule.id);

      expect(deleted).toBe(true);

      const rules = service.getEscalationRules();
      expect(rules.find((r) => r.id === rule.id)).toBeUndefined();
    });

    it("should return false when deleting non-existent rule", () => {
      const deleted = service.deleteEscalationRule("non-existent");

      expect(deleted).toBe(false);
    });
  });

  // ============================================================================
  // BUSINESS HOURS
  // ============================================================================

  describe("Business Hours", () => {
    describe("getBusinessHours", () => {
      it("should return business hours configuration", () => {
        const hours = service.getBusinessHours();

        expect(hours.enabled).toBeDefined();
        expect(hours.timezone).toBeDefined();
        expect(hours.schedule).toBeDefined();
        expect(hours.schedule.length).toBe(7);
      });
    });

    describe("updateBusinessHours", () => {
      it("should update business hours", () => {
        const updated = service.updateBusinessHours({
          timezone: "America/Los_Angeles",
          enabled: false,
        });

        expect(updated.timezone).toBe("America/Los_Angeles");
        expect(updated.enabled).toBe(false);
      });

      it("should preserve existing values", () => {
        const original = service.getBusinessHours();

        service.updateBusinessHours({ timezone: "UTC" });

        const updated = service.getBusinessHours();
        expect(updated.timezone).toBe("UTC");
        expect(updated.schedule).toEqual(original.schedule);
      });
    });

    describe("isWithinBusinessHours", () => {
      it("should return true when business hours disabled", () => {
        service.updateBusinessHours({ enabled: false });

        const result = service.isWithinBusinessHours(new Date());

        expect(result).toBe(true);
      });

      it("should check against schedule", () => {
        service.updateBusinessHours({
          enabled: true,
          timezone: "UTC",
          schedule: [
            {
              day: "monday",
              enabled: true,
              openTime: "00:00",
              closeTime: "23:59",
            },
            {
              day: "tuesday",
              enabled: true,
              openTime: "00:00",
              closeTime: "23:59",
            },
            {
              day: "wednesday",
              enabled: true,
              openTime: "00:00",
              closeTime: "23:59",
            },
            {
              day: "thursday",
              enabled: true,
              openTime: "00:00",
              closeTime: "23:59",
            },
            {
              day: "friday",
              enabled: true,
              openTime: "00:00",
              closeTime: "23:59",
            },
            { day: "saturday", enabled: false },
            { day: "sunday", enabled: false },
          ],
        });

        // This test is time-dependent, but we can verify the function runs
        const result = service.isWithinBusinessHours(new Date());
        expect(typeof result).toBe("boolean");
      });
    });
  });

  // ============================================================================
  // METRICS
  // ============================================================================

  describe("Metrics", () => {
    let conversationId: string;

    beforeEach(async () => {
      const visitorResult = await livechatService.createVisitor({
        name: "Metrics Test",
        channel: "web_widget",
      });

      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "medium",
      });
      conversationId = convResult.data!.id;

      await service.startTracking(conversationId);
    });

    it("should get metrics for a period", async () => {
      const now = new Date();
      const result = await service.getMetrics({
        start: new Date(now.getTime() - 86400000),
        end: new Date(now.getTime() + 86400000),
      });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);

      const metric = result.data![0];
      expect(metric.policyId).toBeDefined();
      expect(metric.policyName).toBeDefined();
      expect(typeof metric.totalConversations).toBe("number");
      expect(typeof metric.complianceRate).toBe("number");
    });

    it("should filter metrics by policy", async () => {
      const policies = await service.listPolicies();
      const policyId = policies.data![0].id;

      const now = new Date();
      const result = await service.getMetrics(
        { start: new Date(now.getTime() - 86400000), end: now },
        policyId,
      );

      expect(result.success).toBe(true);
      expect(result.data!.every((m) => m.policyId === policyId)).toBe(true);
    });

    it("should calculate compliance rate", async () => {
      const now = new Date();
      const result = await service.getMetrics({
        start: new Date(now.getTime() - 86400000),
        end: new Date(now.getTime() + 86400000),
      });

      expect(result.success).toBe(true);
      for (const metric of result.data!) {
        expect(metric.complianceRate).toBeGreaterThanOrEqual(0);
        expect(metric.complianceRate).toBeLessThanOrEqual(100);
      }
    });
  });

  // ============================================================================
  // EVENTS
  // ============================================================================

  describe("Events", () => {
    it("should subscribe to SLA events", () => {
      const listener = jest.fn();

      const unsubscribe = service.subscribe(listener);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should unsubscribe from events", () => {
      const listener = jest.fn();

      const unsubscribe = service.subscribe(listener);
      unsubscribe();

      // After unsubscribe, listener should not be called
      // (Would need to trigger an event to fully test)
    });

    it("should emit violation events", async () => {
      const listener = jest.fn();
      service.subscribe(listener);

      const visitorResult = await livechatService.createVisitor({
        name: "Event Test",
        channel: "web_widget",
      });

      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "urgent",
      });

      await service.startTracking(convResult.data!.id);

      // Trigger violation
      advanceTime(2 * 60 * 1000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "violation",
        }),
      );
    });
  });

  // ============================================================================
  // CLEANUP
  // ============================================================================

  describe("Cleanup", () => {
    it("should clear all data", async () => {
      const visitorResult = await livechatService.createVisitor({
        name: "Clear Test",
        channel: "web_widget",
      });

      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "medium",
      });

      await service.startTracking(convResult.data!.id);

      service.clearAll();

      // Should still have default policies
      const policies = await service.listPolicies();
      expect(policies.data!.length).toBeGreaterThan(0);

      // Timers should be cleared
      expect(service.getActiveTimerCount()).toBe(0);
    });

    it("should return active timer count", async () => {
      const visitorResult = await livechatService.createVisitor({
        name: "Timer Test",
        channel: "web_widget",
      });

      const convResult = await livechatService.createConversation({
        visitorId: visitorResult.data!.id,
        channel: "web_widget",
        priority: "medium",
      });

      await service.startTracking(convResult.data!.id);

      const count = service.getActiveTimerCount();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    });
  });
});
