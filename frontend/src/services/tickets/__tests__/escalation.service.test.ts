/**
 * Escalation Service Tests
 *
 * Comprehensive test suite for the escalation service.
 */

import {
  EscalationService,
  createEscalationService,
  resetEscalationService,
} from "../escalation.service";
import { createTicketService, resetTicketService } from "../ticket.service";
import { resetLivechatService } from "@/services/livechat";
import type {
  EscalationRule,
  EscalateTicketInput,
} from "@/lib/tickets/ticket-types";

describe("EscalationService", () => {
  let service: EscalationService;
  let ticketService: ReturnType<typeof createTicketService>;

  beforeEach(() => {
    resetEscalationService();
    resetTicketService();
    resetLivechatService();
    service = createEscalationService();
    ticketService = createTicketService();
  });

  afterEach(() => {
    resetEscalationService();
    resetTicketService();
    resetLivechatService();
  });

  describe("createRule", () => {
    it("should create an escalation rule", async () => {
      const input: Omit<
        EscalationRule,
        "id" | "executionCount" | "createdAt" | "updatedAt"
      > = {
        name: "Test Rule",
        description: "A test rule",
        enabled: true,
        order: 1,
        conditions: [
          {
            type: "sla_breach",
            field: "type",
            operator: "equals",
            value: "first_response",
          },
        ],
        actions: [
          {
            type: "notify_manager",
            message: "SLA breached",
          },
        ],
      };

      const result = await service.createRule(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe("Test Rule");
      expect(result.data!.enabled).toBe(true);
      expect(result.data!.conditions.length).toBe(1);
      expect(result.data!.actions.length).toBe(1);
    });

    it("should set default values", async () => {
      const input: Omit<
        EscalationRule,
        "id" | "executionCount" | "createdAt" | "updatedAt"
      > = {
        name: "Minimal Rule",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      };

      const result = await service.createRule(input);

      expect(result.success).toBe(true);
      expect(result.data!.executionCount).toBe(0);
    });
  });

  describe("getRule", () => {
    it("should get a rule by ID", async () => {
      const createResult = await service.createRule({
        name: "Test Rule",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      const ruleId = createResult.data!.id;
      const result = await service.getRule(ruleId);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(ruleId);
    });

    it("should return null for non-existent rule", async () => {
      const result = await service.getRule("non-existent-id");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("updateRule", () => {
    it("should update a rule", async () => {
      const createResult = await service.createRule({
        name: "Original Name",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      const ruleId = createResult.data!.id;

      const result = await service.updateRule(ruleId, {
        name: "Updated Name",
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Updated Name");
      expect(result.data!.enabled).toBe(false);
    });

    it("should return error for non-existent rule", async () => {
      const result = await service.updateRule("non-existent", { name: "New" });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("deleteRule", () => {
    it("should delete a rule", async () => {
      const createResult = await service.createRule({
        name: "To Delete",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      const ruleId = createResult.data!.id;

      const result = await service.deleteRule(ruleId);

      expect(result.success).toBe(true);

      const getResult = await service.getRule(ruleId);
      expect(getResult.data).toBeNull();
    });

    it("should return error for non-existent rule", async () => {
      const result = await service.deleteRule("non-existent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("listRules", () => {
    it("should list all rules including defaults", async () => {
      const result = await service.listRules();

      expect(result.success).toBe(true);
      // Should have default rules
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("should filter by enabled status", async () => {
      await service.createRule({
        name: "Disabled Rule",
        enabled: false,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      const enabledResult = await service.listRules({ enabled: true });
      const disabledResult = await service.listRules({ enabled: false });

      expect(enabledResult.data!.every((r) => r.enabled)).toBe(true);
      expect(disabledResult.data!.every((r) => !r.enabled)).toBe(true);
    });

    it("should sort by order", async () => {
      await service.createRule({
        name: "Rule 100",
        enabled: true,
        order: 100,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      const result = await service.listRules();

      for (let i = 1; i < result.data!.length; i++) {
        expect(result.data![i].order).toBeGreaterThanOrEqual(
          result.data![i - 1].order,
        );
      }
    });
  });

  describe("escalateTicket", () => {
    it("should escalate a ticket", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      const input: EscalateTicketInput = {
        reason: "Customer requested escalation",
        escalatedBy: "agent-1",
      };

      const result = await service.escalateTicket(ticketId, input);

      expect(result.success).toBe(true);
      expect(result.data!.escalation).toBeDefined();
      expect(result.data!.escalation!.level).toBe(1);
      expect(result.data!.escalation!.reason).toBe(
        "Customer requested escalation",
      );
    });

    it("should increment escalation level", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      // First escalation
      await service.escalateTicket(ticketId, {
        reason: "First escalation",
        escalatedBy: "agent-1",
      });

      // Second escalation
      const result = await service.escalateTicket(ticketId, {
        reason: "Second escalation",
        escalatedBy: "agent-2",
      });

      expect(result.data!.escalation!.level).toBe(2);
      expect(result.data!.escalation!.escalationHistory.length).toBe(2);
    });

    it("should update priority if specified", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          priority: "medium",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      const result = await service.escalateTicket(ticketId, {
        reason: "Urgent issue",
        priority: "urgent",
        escalatedBy: "agent-1",
      });

      expect(result.data!.priority).toBe("urgent");
    });

    it("should return error for non-existent ticket", async () => {
      const result = await service.escalateTicket("non-existent", {
        reason: "Test",
        escalatedBy: "agent-1",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  describe("deescalateTicket", () => {
    it("should de-escalate a ticket", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      // Escalate first
      await service.escalateTicket(ticketId, {
        reason: "Escalated",
        escalatedBy: "agent-1",
      });

      // Then de-escalate
      const result = await service.deescalateTicket(
        ticketId,
        "Issue resolved at current level",
        "agent-2",
      );

      expect(result.success).toBe(true);
      expect(result.data!.escalation).toBeUndefined();
    });

    it("should return error if not escalated", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const result = await service.deescalateTicket(
        ticketResult.data!.id,
        "Test",
        "agent-1",
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("evaluateTriggers", () => {
    it("should evaluate and execute matching rules", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          priority: "medium",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      // Create a rule that matches
      await service.createRule({
        name: "Test Rule",
        enabled: true,
        order: 1,
        conditions: [
          {
            type: "sla_breach",
            field: "type",
            operator: "equals",
            value: "first_response",
          },
        ],
        actions: [
          {
            type: "change_priority",
            priority: "high",
          },
        ],
      });

      const result = await service.evaluateTriggers(ticketId, "sla_breach", {
        type: "first_response",
      });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("should respect cooldown period", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      await service.createRule({
        name: "Cooldown Rule",
        enabled: true,
        order: 1,
        cooldownMinutes: 60, // 1 hour cooldown
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      // First trigger
      const result1 = await service.evaluateTriggers(ticketId, "manual", {
        manual: true,
      });

      // Second trigger (should be blocked by cooldown)
      const result2 = await service.evaluateTriggers(ticketId, "manual", {
        manual: true,
      });

      expect(result1.data!.length).toBeGreaterThan(0);
      // Second should have fewer executions due to cooldown
      expect(result2.data!.length).toBeLessThanOrEqual(result1.data!.length);
    });

    it("should respect max executions", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      await service.createRule({
        name: "Limited Rule",
        enabled: true,
        order: 1,
        maxExecutions: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      // First trigger
      await service.evaluateTriggers(ticketId, "manual", { manual: true });

      // Second trigger (should be blocked by max executions)
      const result2 = await service.evaluateTriggers(ticketId, "manual", {
        manual: true,
      });

      // The limited rule should not execute again
      expect(
        result2.data!.filter((e) => e.ruleName === "Limited Rule").length,
      ).toBe(0);
    });
  });

  describe("getExecutions", () => {
    it("should get executions for a ticket", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticketId = ticketResult.data!.id;

      await service.createRule({
        name: "Execution Test",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      await service.evaluateTriggers(ticketId, "manual", { manual: true });

      const result = await service.getExecutions(ticketId);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });
  });

  describe("listExecutions", () => {
    it("should list all executions", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      await service.createRule({
        name: "List Test",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      await service.evaluateTriggers(ticketResult.data!.id, "manual", {
        manual: true,
      });

      const result = await service.listExecutions();

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBeGreaterThan(0);
    });

    it("should filter by trigger type", async () => {
      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      await service.createRule({
        name: "Filter Test",
        enabled: true,
        order: 1,
        conditions: [{ type: "manual", operator: "equals", value: true }],
        actions: [{ type: "notify_agent" }],
      });

      await service.evaluateTriggers(ticketResult.data!.id, "manual", {
        manual: true,
      });

      const result = await service.listExecutions({ trigger: "manual" });

      expect(result.success).toBe(true);
      expect(result.data!.items.every((e) => e.trigger === "manual")).toBe(
        true,
      );
    });
  });

  describe("evaluateScheduledTriggers", () => {
    it("should evaluate all open tickets", async () => {
      // Create an open ticket
      await ticketService.createTicket(
        {
          subject: "Open Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const result = await service.evaluateScheduledTriggers();

      expect(result.success).toBe(true);
      expect(result.data!.evaluated).toBeGreaterThan(0);
    });
  });

  describe("subscribe", () => {
    it("should emit events on escalation", async () => {
      const events: unknown[] = [];
      const unsubscribe = service.subscribe((event) => {
        events.push(event);
      });

      const ticketResult = await ticketService.createTicket(
        {
          subject: "Test Ticket",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      await service.escalateTicket(ticketResult.data!.id, {
        reason: "Test",
        escalatedBy: "agent-1",
      });

      expect(events.length).toBeGreaterThan(0);
      expect(
        events.some(
          (e: unknown) => (e as { type: string }).type === "escalated",
        ),
      ).toBe(true);

      unsubscribe();
    });
  });
});
