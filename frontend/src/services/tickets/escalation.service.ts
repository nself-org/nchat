/**
 * Escalation Service
 *
 * Manages escalation workflows for support tickets.
 * Provides:
 * - Escalation rule management
 * - Trigger evaluation
 * - Action execution
 * - Escalation history tracking
 *
 * @module services/tickets/escalation.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  Ticket,
  TicketPriority,
  TicketEscalation,
  EscalationHistoryEntry,
  EscalationRule,
  EscalationCondition,
  EscalationAction,
  EscalationExecution,
  EscalationActionResult,
  EscalationTriggerType,
  EscalationActionType,
  EscalateTicketInput,
  TicketListResult,
} from "@/lib/tickets/ticket-types";
import { getTicketService } from "./ticket.service";

const log = createLogger("EscalationService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const escalationRules = new Map<string, EscalationRule>();
const escalationExecutions = new Map<string, EscalationExecution[]>(); // ticketId -> executions

// Event listeners
type EscalationEventListener = (event: {
  type: "escalated" | "rule_triggered";
  data: unknown;
}) => void;
const eventListeners: EscalationEventListener[] = [];

// ============================================================================
// DEFAULT RULES
// ============================================================================

const DEFAULT_ESCALATION_RULES: Omit<
  EscalationRule,
  "id" | "executionCount" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "SLA Breach - First Response",
    description: "Escalate when first response SLA is breached",
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
      {
        type: "notify_manager",
        message: "First response SLA has been breached",
      },
    ],
    cooldownMinutes: 30,
    maxExecutions: 3,
  },
  {
    name: "SLA Warning - Resolution",
    description: "Notify when resolution SLA is at risk",
    enabled: true,
    order: 2,
    conditions: [
      {
        type: "sla_warning",
        field: "type",
        operator: "equals",
        value: "resolution",
      },
    ],
    actions: [
      {
        type: "notify_agent",
        message: "Resolution SLA is at risk",
      },
    ],
    cooldownMinutes: 15,
    maxExecutions: 5,
  },
  {
    name: "No Response - 1 Hour",
    description: "Escalate tickets with no agent response for 1 hour",
    enabled: true,
    order: 3,
    conditions: [
      {
        type: "no_response",
        field: "duration",
        operator: "greater_than",
        value: 3600, // 1 hour in seconds
      },
    ],
    actions: [
      {
        type: "notify_team",
        message: "Ticket has been waiting for over 1 hour",
      },
    ],
    cooldownMinutes: 60,
    maxExecutions: 3,
  },
  {
    name: "Priority Upgrade - Urgent",
    description: "Notify managers when priority is changed to urgent",
    enabled: true,
    order: 4,
    conditions: [
      {
        type: "priority_change",
        field: "priority",
        operator: "equals",
        value: "urgent",
      },
    ],
    actions: [
      {
        type: "notify_manager",
        message: "Ticket has been escalated to urgent priority",
      },
    ],
    cooldownMinutes: 0,
    maxExecutions: 1,
  },
  {
    name: "Reopen - Assign Previous Agent",
    description: "Reassign to previous agent when ticket is reopened",
    enabled: true,
    order: 5,
    conditions: [
      {
        type: "reopen",
        operator: "equals",
        value: true,
      },
    ],
    actions: [
      {
        type: "notify_agent",
        message: "Ticket has been reopened",
      },
    ],
    cooldownMinutes: 0,
    maxExecutions: 10,
  },
];

// ============================================================================
// ESCALATION SERVICE CLASS
// ============================================================================

export class EscalationService {
  private ticketService = getTicketService();

  constructor() {
    if (escalationRules.size === 0) {
      this.initializeDefaultRules();
    }
  }

  /**
   * Initialize default escalation rules
   */
  private initializeDefaultRules(): void {
    const now = new Date();

    for (const rule of DEFAULT_ESCALATION_RULES) {
      const id = uuidv4();
      escalationRules.set(id, {
        id,
        ...rule,
        executionCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    log.info("Default escalation rules initialized", {
      count: DEFAULT_ESCALATION_RULES.length,
    });
  }

  // ==========================================================================
  // RULE MANAGEMENT
  // ==========================================================================

  /**
   * Create a new escalation rule
   */
  async createRule(
    input: Omit<
      EscalationRule,
      "id" | "executionCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<APIResponse<EscalationRule>> {
    try {
      log.debug("Creating escalation rule", { name: input.name });

      const id = uuidv4();
      const now = new Date();

      const rule: EscalationRule = {
        id,
        ...input,
        executionCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      escalationRules.set(id, rule);

      log.info("Escalation rule created", { id, name: input.name });

      return {
        success: true,
        data: rule,
      };
    } catch (error) {
      log.error("Failed to create escalation rule", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get an escalation rule by ID
   */
  async getRule(id: string): Promise<APIResponse<EscalationRule | null>> {
    try {
      const rule = escalationRules.get(id);
      return {
        success: true,
        data: rule || null,
      };
    } catch (error) {
      log.error("Failed to get escalation rule", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update an escalation rule
   */
  async updateRule(
    id: string,
    updates: Partial<Omit<EscalationRule, "id" | "createdAt">>,
  ): Promise<APIResponse<EscalationRule>> {
    try {
      const existing = escalationRules.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Escalation rule not found",
          },
        };
      }

      const updated: EscalationRule = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      escalationRules.set(id, updated);

      log.info("Escalation rule updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update escalation rule", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Delete an escalation rule
   */
  async deleteRule(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const existing = escalationRules.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Escalation rule not found",
          },
        };
      }

      escalationRules.delete(id);

      log.info("Escalation rule deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete escalation rule", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * List all escalation rules
   */
  async listRules(options?: {
    enabled?: boolean;
  }): Promise<APIResponse<EscalationRule[]>> {
    try {
      let rules = Array.from(escalationRules.values());

      if (options?.enabled !== undefined) {
        rules = rules.filter((r) => r.enabled === options.enabled);
      }

      // Sort by order
      rules.sort((a, b) => a.order - b.order);

      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      log.error("Failed to list escalation rules", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // ESCALATION OPERATIONS
  // ==========================================================================

  /**
   * Escalate a ticket manually
   */
  async escalateTicket(
    ticketId: string,
    input: EscalateTicketInput,
  ): Promise<APIResponse<Ticket>> {
    try {
      log.debug("Escalating ticket", { ticketId, reason: input.reason });

      const ticketResult = await this.ticketService.getTicket(ticketId);
      if (!ticketResult.success || !ticketResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const ticket = ticketResult.data;
      const now = new Date();

      // Determine escalation level
      const currentLevel = ticket.escalation?.level || 0;
      const newLevel = currentLevel + 1;

      // Create escalation history entry
      const historyEntry: EscalationHistoryEntry = {
        id: uuidv4(),
        fromLevel: currentLevel,
        toLevel: newLevel,
        fromAgentId: ticket.assignee?.agentId,
        toAgentId: input.targetAgentId,
        fromDepartment: ticket.department,
        toDepartment: input.targetDepartment,
        reason: input.reason,
        escalatedBy: input.escalatedBy,
        autoEscalated: false,
        escalatedAt: now,
      };

      // Build escalation info
      const escalation: TicketEscalation = {
        level: newLevel,
        escalatedAt: now,
        escalatedBy: input.escalatedBy,
        reason: input.reason,
        targetAgentId: input.targetAgentId,
        targetDepartment: input.targetDepartment,
        autoEscalated: false,
        escalationHistory: [
          ...(ticket.escalation?.escalationHistory || []),
          historyEntry,
        ],
      };

      // Update ticket
      const updates: {
        priority?: TicketPriority;
        assigneeId?: string;
        department?: string;
      } = {};

      if (input.priority) {
        updates.priority = input.priority;
      }

      if (input.targetAgentId) {
        updates.assigneeId = input.targetAgentId;
      }

      if (input.targetDepartment) {
        updates.department = input.targetDepartment;
      }

      // Apply updates through ticket service
      const updateResult = await this.ticketService.updateTicket(
        ticketId,
        updates,
        input.escalatedBy,
      );
      if (!updateResult.success || !updateResult.data) {
        return updateResult;
      }

      const updatedTicket = updateResult.data;
      updatedTicket.escalation = escalation;
      updatedTicket.metrics.escalationCount++;

      // Add internal note
      await this.ticketService.addNote(ticketId, {
        content: `Ticket escalated to level ${newLevel}. Reason: ${input.reason}`,
        createdBy: input.escalatedBy,
        createdByName: "System",
      });

      // Emit event
      this.emitEvent("escalated", {
        ticket: updatedTicket,
        escalation,
      });

      log.info("Ticket escalated", {
        ticketId,
        ticketNumber: updatedTicket.ticketNumber,
        level: newLevel,
      });

      return {
        success: true,
        data: updatedTicket,
      };
    } catch (error) {
      log.error("Failed to escalate ticket", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * De-escalate a ticket
   */
  async deescalateTicket(
    ticketId: string,
    reason: string,
    deescalatedBy: string,
  ): Promise<APIResponse<Ticket>> {
    try {
      const ticketResult = await this.ticketService.getTicket(ticketId);
      if (!ticketResult.success || !ticketResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const ticket = ticketResult.data;

      if (!ticket.escalation || ticket.escalation.level <= 0) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "Ticket is not currently escalated",
          },
        };
      }

      const now = new Date();
      const currentLevel = ticket.escalation.level;
      const newLevel = currentLevel - 1;

      // Create history entry
      const historyEntry: EscalationHistoryEntry = {
        id: uuidv4(),
        fromLevel: currentLevel,
        toLevel: newLevel,
        reason: `De-escalated: ${reason}`,
        escalatedBy: deescalatedBy,
        autoEscalated: false,
        escalatedAt: now,
      };

      if (newLevel <= 0) {
        // Remove escalation
        ticket.escalation = undefined;
      } else {
        ticket.escalation.level = newLevel;
        ticket.escalation.escalationHistory.push(historyEntry);
      }

      // Add note
      await this.ticketService.addNote(ticketId, {
        content: `Ticket de-escalated from level ${currentLevel} to ${newLevel}. Reason: ${reason}`,
        createdBy: deescalatedBy,
        createdByName: "System",
      });

      log.info("Ticket de-escalated", {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        fromLevel: currentLevel,
        toLevel: newLevel,
      });

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      log.error("Failed to de-escalate ticket", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // TRIGGER EVALUATION
  // ==========================================================================

  /**
   * Evaluate triggers for a ticket and execute matching rules
   */
  async evaluateTriggers(
    ticketId: string,
    triggerType: EscalationTriggerType,
    context?: Record<string, unknown>,
  ): Promise<APIResponse<EscalationExecution[]>> {
    try {
      log.debug("Evaluating escalation triggers", { ticketId, triggerType });

      const ticketResult = await this.ticketService.getTicket(ticketId);
      if (!ticketResult.success || !ticketResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const ticket = ticketResult.data;
      const executions: EscalationExecution[] = [];

      // Get enabled rules sorted by order
      const rules = Array.from(escalationRules.values())
        .filter((r) => r.enabled)
        .sort((a, b) => a.order - b.order);

      for (const rule of rules) {
        // Check if rule applies to this trigger type
        const matchingConditions = rule.conditions.filter(
          (c) => c.type === triggerType,
        );
        if (matchingConditions.length === 0) continue;

        // Check cooldown
        if (rule.cooldownMinutes && rule.lastExecutedAt) {
          const cooldownEnd = new Date(
            rule.lastExecutedAt.getTime() + rule.cooldownMinutes * 60 * 1000,
          );
          if (new Date() < cooldownEnd) {
            log.debug("Rule skipped due to cooldown", {
              ruleId: rule.id,
              ruleName: rule.name,
            });
            continue;
          }
        }

        // Check max executions
        if (rule.maxExecutions && rule.executionCount >= rule.maxExecutions) {
          log.debug("Rule skipped due to max executions", {
            ruleId: rule.id,
            ruleName: rule.name,
          });
          continue;
        }

        // Evaluate conditions
        const conditionsMet = this.evaluateConditions(
          matchingConditions,
          ticket,
          context,
        );
        if (!conditionsMet) continue;

        // Execute actions
        const execution = await this.executeRule(
          rule,
          ticket,
          triggerType,
          context,
        );
        executions.push(execution);

        // Update rule execution count
        rule.executionCount++;
        rule.lastExecutedAt = new Date();
        escalationRules.set(rule.id, rule);

        // Emit event
        this.emitEvent("rule_triggered", {
          rule,
          ticket,
          execution,
        });
      }

      // Store executions
      const ticketExecutions = escalationExecutions.get(ticketId) || [];
      ticketExecutions.push(...executions);
      escalationExecutions.set(ticketId, ticketExecutions);

      log.debug("Triggers evaluated", {
        ticketId,
        triggerType,
        rulesExecuted: executions.length,
      });

      return {
        success: true,
        data: executions,
      };
    } catch (error) {
      log.error("Failed to evaluate triggers", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Evaluate conditions against a ticket
   */
  private evaluateConditions(
    conditions: EscalationCondition[],
    ticket: Ticket,
    context?: Record<string, unknown>,
  ): boolean {
    for (const condition of conditions) {
      // Get the value to compare
      let actualValue: unknown;

      if (condition.field) {
        // Check ticket fields first
        const ticketValue = (ticket as unknown as Record<string, unknown>)[
          condition.field
        ];
        // Then check context
        const contextValue = context?.[condition.field];
        actualValue = ticketValue ?? contextValue;
      } else {
        // For conditions without a specific field, check the context
        actualValue = context?.[condition.type] ?? true;
      }

      // Evaluate based on operator
      const expectedValue = condition.value;
      let matches = false;

      switch (condition.operator) {
        case "equals":
          matches = actualValue === expectedValue;
          break;
        case "not_equals":
          matches = actualValue !== expectedValue;
          break;
        case "greater_than":
          matches =
            typeof actualValue === "number" &&
            actualValue > (expectedValue as number);
          break;
        case "less_than":
          matches =
            typeof actualValue === "number" &&
            actualValue < (expectedValue as number);
          break;
        case "contains":
          matches =
            typeof actualValue === "string" &&
            actualValue.includes(expectedValue as string);
          break;
        case "in":
          matches =
            Array.isArray(expectedValue) && expectedValue.includes(actualValue);
          break;
      }

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a rule's actions
   */
  private async executeRule(
    rule: EscalationRule,
    ticket: Ticket,
    trigger: EscalationTriggerType,
    context?: Record<string, unknown>,
  ): Promise<EscalationExecution> {
    const actionResults: EscalationActionResult[] = [];

    for (const action of rule.actions) {
      const result = await this.executeAction(action, ticket, context);
      actionResults.push(result);
    }

    const execution: EscalationExecution = {
      id: uuidv4(),
      ticketId: ticket.id,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      actionsExecuted: actionResults,
      success: actionResults.every((r) => r.success),
      executedAt: new Date(),
    };

    if (!execution.success) {
      execution.error = actionResults.find((r) => !r.success)?.error;
    }

    log.info("Escalation rule executed", {
      ruleId: rule.id,
      ruleName: rule.name,
      ticketId: ticket.id,
      success: execution.success,
    });

    return execution;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: EscalationAction,
    ticket: Ticket,
    context?: Record<string, unknown>,
  ): Promise<EscalationActionResult> {
    try {
      switch (action.type) {
        case "assign_agent":
          if (action.target) {
            await this.ticketService.updateTicket(
              ticket.id,
              {
                assigneeId: action.target,
              },
              "system",
            );
            log.info("Action: assign_agent", {
              ticketId: ticket.id,
              agentId: action.target,
            });
          }
          break;

        case "assign_department":
          if (action.target) {
            await this.ticketService.updateTicket(
              ticket.id,
              {
                department: action.target,
              },
              "system",
            );
            log.info("Action: assign_department", {
              ticketId: ticket.id,
              department: action.target,
            });
          }
          break;

        case "change_priority":
          if (action.priority) {
            await this.ticketService.updateTicket(
              ticket.id,
              {
                priority: action.priority,
              },
              "system",
            );
            log.info("Action: change_priority", {
              ticketId: ticket.id,
              priority: action.priority,
            });
          }
          break;

        case "add_tag":
          if (action.target) {
            const currentTags = ticket.tags || [];
            if (!currentTags.includes(action.target)) {
              await this.ticketService.updateTicket(
                ticket.id,
                {
                  tags: [...currentTags, action.target],
                },
                "system",
              );
            }
            log.info("Action: add_tag", {
              ticketId: ticket.id,
              tag: action.target,
            });
          }
          break;

        case "notify_agent":
          log.info("Action: notify_agent", {
            ticketId: ticket.id,
            agentId: ticket.assignee?.agentId,
            message: action.message,
          });
          // In production, this would send a notification
          break;

        case "notify_manager":
          log.info("Action: notify_manager", {
            ticketId: ticket.id,
            message: action.message,
          });
          // In production, this would send a notification
          break;

        case "notify_team":
          log.info("Action: notify_team", {
            ticketId: ticket.id,
            department: ticket.department,
            message: action.message,
          });
          // In production, this would send a notification
          break;

        case "send_email":
          log.info("Action: send_email", {
            ticketId: ticket.id,
            target: action.target,
            message: action.message,
          });
          // In production, this would send an email
          break;

        case "webhook":
          log.info("Action: webhook", {
            ticketId: ticket.id,
            url: action.target,
          });
          // In production, this would call the webhook
          break;

        case "create_subtask":
          // In production, this would create a child ticket
          log.info("Action: create_subtask", { ticketId: ticket.id });
          break;
      }

      return {
        action,
        success: true,
      };
    } catch (error) {
      log.error("Failed to execute escalation action", error, {
        actionType: action.type,
        ticketId: ticket.id,
      });

      return {
        action,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ==========================================================================
  // EXECUTION HISTORY
  // ==========================================================================

  /**
   * Get escalation executions for a ticket
   */
  async getExecutions(
    ticketId: string,
  ): Promise<APIResponse<EscalationExecution[]>> {
    try {
      const executions = escalationExecutions.get(ticketId) || [];
      return {
        success: true,
        data: executions.sort(
          (a, b) => b.executedAt.getTime() - a.executedAt.getTime(),
        ),
      };
    } catch (error) {
      log.error("Failed to get executions", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get all executions with optional filters
   */
  async listExecutions(options?: {
    ruleId?: string;
    trigger?: EscalationTriggerType;
    success?: boolean;
    since?: Date;
    limit?: number;
  }): Promise<APIResponse<TicketListResult<EscalationExecution>>> {
    try {
      const { limit = 50, ruleId, trigger, success, since } = options || {};

      let allExecutions: EscalationExecution[] = [];
      for (const executions of escalationExecutions.values()) {
        allExecutions.push(...executions);
      }

      // Apply filters
      if (ruleId) {
        allExecutions = allExecutions.filter((e) => e.ruleId === ruleId);
      }

      if (trigger) {
        allExecutions = allExecutions.filter((e) => e.trigger === trigger);
      }

      if (success !== undefined) {
        allExecutions = allExecutions.filter((e) => e.success === success);
      }

      if (since) {
        allExecutions = allExecutions.filter((e) => e.executedAt >= since);
      }

      // Sort by execution time desc
      allExecutions.sort(
        (a, b) => b.executedAt.getTime() - a.executedAt.getTime(),
      );

      const totalCount = allExecutions.length;
      const items = allExecutions.slice(0, limit);

      return {
        success: true,
        data: {
          items,
          totalCount,
          hasMore: totalCount > limit,
          offset: 0,
          limit,
        },
      };
    } catch (error) {
      log.error("Failed to list executions", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // SCHEDULED EVALUATION
  // ==========================================================================

  /**
   * Evaluate time-based triggers for all open tickets
   */
  async evaluateScheduledTriggers(): Promise<
    APIResponse<{ evaluated: number; escalated: number }>
  > {
    try {
      log.debug("Evaluating scheduled triggers");

      const allTickets = this.ticketService.getAllTickets();
      const openTickets = allTickets.filter((t) =>
        ["open", "pending", "in_progress"].includes(t.status),
      );

      let evaluated = 0;
      let escalated = 0;

      for (const ticket of openTickets) {
        evaluated++;

        // Check for no response trigger
        const now = Date.now();
        const lastResponse = ticket.lastAgentResponseAt || ticket.createdAt;
        const noResponseDuration = Math.round(
          (now - lastResponse.getTime()) / 1000,
        );

        const execResult = await this.evaluateTriggers(
          ticket.id,
          "no_response",
          {
            duration: noResponseDuration,
          },
        );

        if (
          execResult.success &&
          execResult.data &&
          execResult.data.length > 0
        ) {
          escalated += execResult.data.length;
        }
      }

      log.info("Scheduled triggers evaluated", { evaluated, escalated });

      return {
        success: true,
        data: { evaluated, escalated },
      };
    } catch (error) {
      log.error("Failed to evaluate scheduled triggers", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to escalation events
   */
  subscribe(listener: EscalationEventListener): () => void {
    eventListeners.push(listener);
    return () => {
      const index = eventListeners.indexOf(listener);
      if (index >= 0) {
        eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an escalation event
   */
  private emitEvent(type: "escalated" | "rule_triggered", data: unknown): void {
    for (const listener of eventListeners) {
      try {
        listener({ type, data });
      } catch (error) {
        log.error("Error in escalation event listener", error);
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    escalationRules.clear();
    escalationExecutions.clear();
    this.initializeDefaultRules();
    log.debug("Escalation service cleared");
  }

  /**
   * Get counts (for debugging)
   */
  getCounts(): { rules: number; executions: number } {
    let executionCount = 0;
    for (const executions of escalationExecutions.values()) {
      executionCount += executions.length;
    }
    return {
      rules: escalationRules.size,
      executions: executionCount,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let escalationServiceInstance: EscalationService | null = null;

/**
 * Get or create the escalation service singleton
 */
export function getEscalationService(): EscalationService {
  if (!escalationServiceInstance) {
    escalationServiceInstance = new EscalationService();
  }
  return escalationServiceInstance;
}

/**
 * Create a new escalation service instance (for testing)
 */
export function createEscalationService(): EscalationService {
  return new EscalationService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetEscalationService(): void {
  if (escalationServiceInstance) {
    escalationServiceInstance.clearAll();
  }
  escalationServiceInstance = null;
}

export default EscalationService;
