/**
 * SLA Service
 *
 * Tracks Service Level Agreement compliance for live chat conversations.
 * Handles:
 * - First response time targets
 * - Next response time targets
 * - Resolution time targets
 * - SLA violation detection and escalation
 * - Business hours awareness
 * - SLA metrics and reporting
 *
 * @module services/livechat/sla.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  SLAPolicy,
  CreateSLAPolicyInput,
  SLAViolation,
  SLAMetrics,
  Conversation,
  ConversationPriority,
  LivechatChannel,
  BusinessHours,
  BusinessHoursSchedule,
  LivechatListResult,
  LivechatListOptions,
} from "./types";
import { getLivechatService } from "./livechat.service";

const log = createLogger("SLAService");

// ============================================================================
// TYPES
// ============================================================================

/**
 * SLA check result for a conversation
 */
export interface SLACheckResult {
  conversationId: string;
  policyId?: string;
  policyName?: string;
  firstResponse: {
    target?: Date;
    met?: boolean;
    remaining?: number; // seconds
    exceeded?: number; // seconds
  };
  nextResponse: {
    target?: Date;
    met?: boolean;
    remaining?: number;
    exceeded?: number;
  };
  resolution: {
    target?: Date;
    met?: boolean;
    remaining?: number;
    exceeded?: number;
  };
  warnings: string[];
  violations: string[];
  urgency: "normal" | "warning" | "critical" | "violated";
}

/**
 * Escalation rule for SLA violations
 */
export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: "first_response" | "next_response" | "resolution";
    threshold: number; // percentage of target time (e.g., 80 = warning at 80%)
  };
  actions: EscalationAction[];
}

/**
 * Action to take when escalation triggers
 */
export interface EscalationAction {
  type:
    | "notify_agent"
    | "notify_manager"
    | "reassign"
    | "change_priority"
    | "webhook";
  target?: string; // agent ID, manager ID, webhook URL
  priority?: ConversationPriority;
  message?: string;
}

/**
 * SLA timer for active conversations
 */
interface SLATimer {
  conversationId: string;
  policyId: string;
  type: "first_response" | "next_response" | "resolution";
  targetTime: Date;
  timerId: NodeJS.Timeout;
  warningTriggered: boolean;
}

// ============================================================================
// DEFAULT POLICIES
// ============================================================================

const DEFAULT_SLA_POLICIES: Omit<
  SLAPolicy,
  "id" | "createdAt" | "updatedAt"
>[] = [
  {
    name: "Urgent Priority",
    description: "SLA for urgent priority conversations",
    priority: "urgent",
    firstResponseTime: 60, // 1 minute
    nextResponseTime: 120, // 2 minutes
    resolutionTime: 1800, // 30 minutes
    operationalHoursOnly: false,
    enabled: true,
  },
  {
    name: "High Priority",
    description: "SLA for high priority conversations",
    priority: "high",
    firstResponseTime: 180, // 3 minutes
    nextResponseTime: 300, // 5 minutes
    resolutionTime: 3600, // 1 hour
    operationalHoursOnly: false,
    enabled: true,
  },
  {
    name: "Medium Priority",
    description: "SLA for medium priority conversations (default)",
    priority: "medium",
    firstResponseTime: 300, // 5 minutes
    nextResponseTime: 600, // 10 minutes
    resolutionTime: 14400, // 4 hours
    operationalHoursOnly: true,
    enabled: true,
  },
  {
    name: "Low Priority",
    description: "SLA for low priority conversations",
    priority: "low",
    firstResponseTime: 900, // 15 minutes
    nextResponseTime: 1800, // 30 minutes
    resolutionTime: 86400, // 24 hours
    operationalHoursOnly: true,
    enabled: true,
  },
];

// Default business hours
const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: true,
  timezone: "America/New_York",
  schedule: [
    { day: "monday", enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: "tuesday", enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: "wednesday", enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: "thursday", enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: "friday", enabled: true, openTime: "09:00", closeTime: "17:00" },
    { day: "saturday", enabled: false },
    { day: "sunday", enabled: false },
  ],
  holidays: [],
};

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const slaPolicies = new Map<string, SLAPolicy>();
const slaViolations = new Map<string, SLAViolation>();
const escalationRules: EscalationRule[] = [];
const activeTimers = new Map<string, SLATimer[]>();
let businessHours: BusinessHours = { ...DEFAULT_BUSINESS_HOURS };

// Event listeners for SLA events
type SLAEventListener = (event: {
  type: "warning" | "violation";
  data: unknown;
}) => void;
const eventListeners: SLAEventListener[] = [];

// ============================================================================
// SLA SERVICE CLASS
// ============================================================================

export class SLAService {
  private livechatService = getLivechatService();

  constructor() {
    // Initialize default policies if empty
    if (slaPolicies.size === 0) {
      this.initializeDefaults();
    }
  }

  /**
   * Initialize default SLA policies
   */
  private initializeDefaults(): void {
    const now = new Date();

    for (const policy of DEFAULT_SLA_POLICIES) {
      const id = uuidv4();
      slaPolicies.set(id, {
        id,
        ...policy,
        createdAt: now,
        updatedAt: now,
      });
    }

    log.info("Default SLA policies initialized", {
      count: DEFAULT_SLA_POLICIES.length,
    });
  }

  // ==========================================================================
  // POLICY MANAGEMENT
  // ==========================================================================

  /**
   * Create a new SLA policy
   */
  async createPolicy(
    input: CreateSLAPolicyInput,
  ): Promise<APIResponse<SLAPolicy>> {
    try {
      log.debug("Creating SLA policy", {
        name: input.name,
        priority: input.priority,
      });

      // Validate time values
      if (
        input.firstResponseTime <= 0 ||
        input.nextResponseTime <= 0 ||
        input.resolutionTime <= 0
      ) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "All time values must be positive",
          },
        };
      }

      if (input.firstResponseTime > input.resolutionTime) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message: "First response time cannot exceed resolution time",
          },
        };
      }

      const id = uuidv4();
      const now = new Date();

      const policy: SLAPolicy = {
        id,
        name: input.name,
        description: input.description,
        priority: input.priority,
        firstResponseTime: input.firstResponseTime,
        nextResponseTime: input.nextResponseTime,
        resolutionTime: input.resolutionTime,
        operationalHoursOnly: input.operationalHoursOnly ?? false,
        departments: input.departments,
        channels: input.channels,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };

      slaPolicies.set(id, policy);

      log.info("SLA policy created", { id, name: input.name });

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      log.error("Failed to create SLA policy", error);
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
   * Get an SLA policy by ID
   */
  async getPolicy(id: string): Promise<APIResponse<SLAPolicy | null>> {
    try {
      const policy = slaPolicies.get(id);
      return {
        success: true,
        data: policy || null,
      };
    } catch (error) {
      log.error("Failed to get SLA policy", error);
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
   * Update an SLA policy
   */
  async updatePolicy(
    id: string,
    updates: Partial<Omit<SLAPolicy, "id" | "createdAt">>,
  ): Promise<APIResponse<SLAPolicy>> {
    try {
      const existing = slaPolicies.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "SLA policy not found",
          },
        };
      }

      const updated: SLAPolicy = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      slaPolicies.set(id, updated);

      log.info("SLA policy updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update SLA policy", error);
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
   * Delete an SLA policy
   */
  async deletePolicy(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const existing = slaPolicies.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "SLA policy not found",
          },
        };
      }

      slaPolicies.delete(id);

      log.info("SLA policy deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete SLA policy", error);
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
   * List all SLA policies
   */
  async listPolicies(options?: {
    enabled?: boolean;
  }): Promise<APIResponse<SLAPolicy[]>> {
    try {
      let policies = Array.from(slaPolicies.values());

      if (options?.enabled !== undefined) {
        policies = policies.filter((p) => p.enabled === options.enabled);
      }

      // Sort by priority
      const priorityOrder: Record<ConversationPriority, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      policies.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      return {
        success: true,
        data: policies,
      };
    } catch (error) {
      log.error("Failed to list SLA policies", error);
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
  // SLA TRACKING
  // ==========================================================================

  /**
   * Get the applicable SLA policy for a conversation
   */
  async getPolicyForConversation(
    conversation: Conversation,
  ): Promise<SLAPolicy | null> {
    const policies = Array.from(slaPolicies.values()).filter((p) => {
      if (!p.enabled) return false;

      // Match priority
      if (p.priority !== conversation.priority) return false;

      // Match department if specified
      if (p.departments && p.departments.length > 0) {
        if (
          !conversation.department ||
          !p.departments.includes(conversation.department)
        ) {
          return false;
        }
      }

      // Match channel if specified
      if (p.channels && p.channels.length > 0) {
        if (!p.channels.includes(conversation.channel)) {
          return false;
        }
      }

      return true;
    });

    // Return first matching policy (sorted by priority)
    return policies[0] || null;
  }

  /**
   * Start SLA tracking for a conversation
   */
  async startTracking(conversationId: string): Promise<
    APIResponse<{
      policy: SLAPolicy;
      targets: { firstResponse: Date; resolution: Date };
    }>
  > {
    try {
      const conversationResult =
        await this.livechatService.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const conversation = conversationResult.data;

      const policy = await this.getPolicyForConversation(conversation);
      if (!policy) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "No applicable SLA policy found",
          },
        };
      }

      const now = new Date();
      const startTime = conversation.queuedAt || now;

      // Calculate target times
      const firstResponseTarget = this.calculateTargetTime(
        startTime,
        policy.firstResponseTime,
        policy.operationalHoursOnly,
      );

      const resolutionTarget = this.calculateTargetTime(
        startTime,
        policy.resolutionTime,
        policy.operationalHoursOnly,
      );

      // Update conversation with SLA info
      conversation.sla = {
        policyId: policy.id,
        policyName: policy.name,
        firstResponseDue: firstResponseTarget,
        resolutionDue: resolutionTarget,
      };

      // Start timers
      this.startTimers(conversationId, policy, {
        firstResponseTarget,
        resolutionTarget,
      });

      log.info("SLA tracking started", {
        conversationId,
        policyId: policy.id,
        firstResponseDue: firstResponseTarget.toISOString(),
        resolutionDue: resolutionTarget.toISOString(),
      });

      return {
        success: true,
        data: {
          policy,
          targets: {
            firstResponse: firstResponseTarget,
            resolution: resolutionTarget,
          },
        },
      };
    } catch (error) {
      log.error("Failed to start SLA tracking", error);
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
   * Stop SLA tracking for a conversation
   */
  async stopTracking(conversationId: string): Promise<APIResponse<void>> {
    try {
      this.clearTimers(conversationId);

      log.debug("SLA tracking stopped", { conversationId });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      log.error("Failed to stop SLA tracking", error);
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
   * Check SLA status for a conversation
   */
  async checkSLA(conversationId: string): Promise<APIResponse<SLACheckResult>> {
    try {
      const conversationResult =
        await this.livechatService.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const conversation = conversationResult.data;
      const now = new Date();

      const result: SLACheckResult = {
        conversationId,
        policyId: conversation.sla?.policyId,
        policyName: conversation.sla?.policyName,
        firstResponse: {},
        nextResponse: {},
        resolution: {},
        warnings: [],
        violations: [],
        urgency: "normal",
      };

      if (!conversation.sla) {
        return { success: true, data: result };
      }

      // Check first response
      if (conversation.sla.firstResponseDue) {
        const target = new Date(conversation.sla.firstResponseDue);
        result.firstResponse.target = target;

        if (conversation.firstResponseAt) {
          result.firstResponse.met = conversation.firstResponseAt <= target;
          conversation.sla.firstResponseMet = result.firstResponse.met;
        } else {
          const remaining = Math.round(
            (target.getTime() - now.getTime()) / 1000,
          );
          result.firstResponse.remaining = remaining;

          if (remaining <= 0) {
            result.firstResponse.exceeded = Math.abs(remaining);
            result.violations.push("First response SLA violated");
            result.urgency = "violated";
          } else if (remaining < 60) {
            result.warnings.push(
              "First response SLA warning (less than 1 minute remaining)",
            );
            if (result.urgency === "normal") result.urgency = "critical";
          } else if (remaining < 120) {
            result.warnings.push("First response SLA approaching");
            if (result.urgency === "normal") result.urgency = "warning";
          }
        }
      }

      // Check resolution
      if (conversation.sla.resolutionDue) {
        const target = new Date(conversation.sla.resolutionDue);
        result.resolution.target = target;

        if (conversation.resolvedAt) {
          result.resolution.met = conversation.resolvedAt <= target;
          conversation.sla.resolutionMet = result.resolution.met;
        } else {
          const remaining = Math.round(
            (target.getTime() - now.getTime()) / 1000,
          );
          result.resolution.remaining = remaining;

          if (remaining <= 0) {
            result.resolution.exceeded = Math.abs(remaining);
            result.violations.push("Resolution SLA violated");
            result.urgency = "violated";
          } else if (remaining < 300) {
            result.warnings.push(
              "Resolution SLA warning (less than 5 minutes remaining)",
            );
            if (result.urgency === "normal" || result.urgency === "warning") {
              result.urgency = "critical";
            }
          }
        }
      }

      // Check next response time if waiting for agent
      if (
        conversation.status === "waiting" &&
        conversation.sla.nextResponseDue
      ) {
        const target = new Date(conversation.sla.nextResponseDue);
        result.nextResponse.target = target;

        const remaining = Math.round((target.getTime() - now.getTime()) / 1000);
        result.nextResponse.remaining = remaining;

        if (remaining <= 0) {
          result.nextResponse.exceeded = Math.abs(remaining);
          result.violations.push("Next response SLA violated");
          if (result.urgency !== "violated") result.urgency = "violated";
        }
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      log.error("Failed to check SLA", error);
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
   * Record a first response for SLA
   */
  async recordFirstResponse(
    conversationId: string,
  ): Promise<APIResponse<{ met: boolean; responseTime: number }>> {
    try {
      const conversationResult =
        await this.livechatService.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const conversation = conversationResult.data;
      const now = new Date();

      if (!conversation.sla) {
        return { success: true, data: { met: true, responseTime: 0 } };
      }

      const startTime = conversation.queuedAt || conversation.createdAt;
      const responseTime = Math.round(
        (now.getTime() - new Date(startTime).getTime()) / 1000,
      );

      let met = true;
      if (conversation.sla.firstResponseDue) {
        met = now <= new Date(conversation.sla.firstResponseDue);
      }

      conversation.sla.firstResponseMet = met;

      // Clear first response timer
      const timers = activeTimers.get(conversationId) || [];
      const updatedTimers = timers.filter((t) => t.type !== "first_response");
      if (updatedTimers.length > 0) {
        activeTimers.set(conversationId, updatedTimers);
      } else {
        activeTimers.delete(conversationId);
      }

      // Record violation if not met
      if (!met) {
        await this.recordViolation(
          conversationId,
          conversation.sla.policyId!,
          "first_response",
          new Date(conversation.sla.firstResponseDue!),
          now,
        );
      }

      log.info("First response recorded", {
        conversationId,
        met,
        responseTime,
      });

      return {
        success: true,
        data: { met, responseTime },
      };
    } catch (error) {
      log.error("Failed to record first response", error);
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
   * Record conversation resolution for SLA
   */
  async recordResolution(
    conversationId: string,
  ): Promise<APIResponse<{ met: boolean; resolutionTime: number }>> {
    try {
      const conversationResult =
        await this.livechatService.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const conversation = conversationResult.data;
      const now = new Date();

      if (!conversation.sla) {
        return { success: true, data: { met: true, resolutionTime: 0 } };
      }

      const startTime = conversation.queuedAt || conversation.createdAt;
      const resolutionTime = Math.round(
        (now.getTime() - new Date(startTime).getTime()) / 1000,
      );

      let met = true;
      if (conversation.sla.resolutionDue) {
        met = now <= new Date(conversation.sla.resolutionDue);
      }

      conversation.sla.resolutionMet = met;

      // Clear all timers
      this.clearTimers(conversationId);

      // Record violation if not met
      if (!met) {
        await this.recordViolation(
          conversationId,
          conversation.sla.policyId!,
          "resolution",
          new Date(conversation.sla.resolutionDue!),
          now,
        );
      }

      log.info("Resolution recorded", { conversationId, met, resolutionTime });

      return {
        success: true,
        data: { met, resolutionTime },
      };
    } catch (error) {
      log.error("Failed to record resolution", error);
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
  // VIOLATIONS
  // ==========================================================================

  /**
   * Record an SLA violation
   */
  private async recordViolation(
    conversationId: string,
    policyId: string,
    type: "first_response" | "next_response" | "resolution",
    targetTime: Date,
    actualTime?: Date,
  ): Promise<SLAViolation> {
    const policy = slaPolicies.get(policyId);

    const violation: SLAViolation = {
      id: uuidv4(),
      conversationId,
      policyId,
      policyName: policy?.name || "Unknown",
      type,
      targetTime,
      actualTime,
      exceeded: true,
      exceedDuration: actualTime
        ? Math.round((actualTime.getTime() - targetTime.getTime()) / 1000)
        : undefined,
      createdAt: new Date(),
    };

    slaViolations.set(violation.id, violation);

    // Emit violation event
    this.emitEvent("violation", violation);

    // Trigger escalation
    await this.triggerEscalation(violation);

    log.warn("SLA violation recorded", {
      conversationId,
      type,
      policyName: policy?.name,
      exceedDuration: violation.exceedDuration,
    });

    return violation;
  }

  /**
   * Get violations for a conversation
   */
  async getViolations(
    conversationId: string,
  ): Promise<APIResponse<SLAViolation[]>> {
    try {
      const violations = Array.from(slaViolations.values())
        .filter((v) => v.conversationId === conversationId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        success: true,
        data: violations,
      };
    } catch (error) {
      log.error("Failed to get violations", error);
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
   * List all violations with filters
   */
  async listViolations(
    options: LivechatListOptions & {
      type?: "first_response" | "next_response" | "resolution";
      policyId?: string;
      period?: { start: Date; end: Date };
    },
  ): Promise<APIResponse<LivechatListResult<SLAViolation>>> {
    try {
      const { limit = 50, offset = 0, type, policyId, period } = options;

      let violations = Array.from(slaViolations.values());

      if (type) {
        violations = violations.filter((v) => v.type === type);
      }

      if (policyId) {
        violations = violations.filter((v) => v.policyId === policyId);
      }

      if (period) {
        violations = violations.filter(
          (v) => v.createdAt >= period.start && v.createdAt <= period.end,
        );
      }

      violations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = violations.length;
      const items = violations.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items,
          totalCount,
          hasMore: offset + limit < totalCount,
          offset,
          limit,
        },
      };
    } catch (error) {
      log.error("Failed to list violations", error);
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
  // ESCALATION
  // ==========================================================================

  /**
   * Add an escalation rule
   */
  addEscalationRule(rule: Omit<EscalationRule, "id">): EscalationRule {
    const newRule: EscalationRule = {
      id: uuidv4(),
      ...rule,
    };

    escalationRules.push(newRule);

    log.info("Escalation rule added", { id: newRule.id, name: newRule.name });

    return newRule;
  }

  /**
   * Get all escalation rules
   */
  getEscalationRules(): EscalationRule[] {
    return [...escalationRules];
  }

  /**
   * Delete an escalation rule
   */
  deleteEscalationRule(id: string): boolean {
    const index = escalationRules.findIndex((r) => r.id === id);
    if (index < 0) return false;

    escalationRules.splice(index, 1);
    log.info("Escalation rule deleted", { id });

    return true;
  }

  /**
   * Trigger escalation for a violation
   */
  private async triggerEscalation(violation: SLAViolation): Promise<void> {
    for (const rule of escalationRules) {
      if (!rule.enabled) continue;
      if (rule.trigger.type !== violation.type) continue;

      log.info("Triggering escalation", {
        ruleId: rule.id,
        ruleName: rule.name,
        violationId: violation.id,
      });

      for (const action of rule.actions) {
        try {
          await this.executeEscalationAction(action, violation);
        } catch (error) {
          log.error("Failed to execute escalation action", error, {
            actionType: action.type,
            violationId: violation.id,
          });
        }
      }
    }
  }

  /**
   * Execute an escalation action
   */
  private async executeEscalationAction(
    action: EscalationAction,
    violation: SLAViolation,
  ): Promise<void> {
    switch (action.type) {
      case "notify_agent":
        // Would send notification to agent
        log.info("Escalation: notify agent", {
          agentId: action.target,
          violationId: violation.id,
        });
        break;

      case "notify_manager":
        // Would send notification to manager
        log.info("Escalation: notify manager", {
          managerId: action.target,
          violationId: violation.id,
        });
        break;

      case "reassign":
        // Would reassign conversation
        log.info("Escalation: reassign", {
          conversationId: violation.conversationId,
        });
        break;

      case "change_priority":
        if (action.priority) {
          await this.livechatService.updateConversation(
            violation.conversationId,
            {
              priority: action.priority,
            },
          );
          log.info("Escalation: priority changed", {
            conversationId: violation.conversationId,
            newPriority: action.priority,
          });
        }
        break;

      case "webhook":
        // Would call webhook
        log.info("Escalation: webhook", {
          url: action.target,
          violationId: violation.id,
        });
        break;
    }
  }

  // ==========================================================================
  // TIMERS
  // ==========================================================================

  /**
   * Start SLA timers for a conversation
   */
  private startTimers(
    conversationId: string,
    policy: SLAPolicy,
    targets: { firstResponseTarget: Date; resolutionTarget: Date },
  ): void {
    this.clearTimers(conversationId);

    const timers: SLATimer[] = [];
    const now = Date.now();

    // First response timer
    const firstResponseDelay = targets.firstResponseTarget.getTime() - now;
    if (firstResponseDelay > 0) {
      const timerId = setTimeout(() => {
        this.handleTimerExpiry(conversationId, policy.id, "first_response");
      }, firstResponseDelay);

      timers.push({
        conversationId,
        policyId: policy.id,
        type: "first_response",
        targetTime: targets.firstResponseTarget,
        timerId,
        warningTriggered: false,
      });

      // Set warning timer (at 80% of time)
      const warningDelay = firstResponseDelay * 0.8;
      if (warningDelay > 0) {
        setTimeout(() => {
          this.handleWarning(conversationId, "first_response");
        }, warningDelay);
      }
    }

    // Resolution timer
    const resolutionDelay = targets.resolutionTarget.getTime() - now;
    if (resolutionDelay > 0) {
      const timerId = setTimeout(() => {
        this.handleTimerExpiry(conversationId, policy.id, "resolution");
      }, resolutionDelay);

      timers.push({
        conversationId,
        policyId: policy.id,
        type: "resolution",
        targetTime: targets.resolutionTarget,
        timerId,
        warningTriggered: false,
      });
    }

    if (timers.length > 0) {
      activeTimers.set(conversationId, timers);
    }
  }

  /**
   * Clear timers for a conversation
   */
  private clearTimers(conversationId: string): void {
    const timers = activeTimers.get(conversationId);
    if (timers) {
      for (const timer of timers) {
        clearTimeout(timer.timerId);
      }
      activeTimers.delete(conversationId);
    }
  }

  /**
   * Handle timer expiry (SLA violated)
   */
  private async handleTimerExpiry(
    conversationId: string,
    policyId: string,
    type: "first_response" | "next_response" | "resolution",
  ): Promise<void> {
    const timers = activeTimers.get(conversationId) || [];
    const timer = timers.find((t) => t.type === type);

    if (!timer) return;

    // Record violation
    await this.recordViolation(
      conversationId,
      policyId,
      type,
      timer.targetTime,
      new Date(),
    );

    // Remove timer
    const updatedTimers = timers.filter((t) => t.type !== type);
    if (updatedTimers.length > 0) {
      activeTimers.set(conversationId, updatedTimers);
    } else {
      activeTimers.delete(conversationId);
    }
  }

  /**
   * Handle SLA warning
   */
  private handleWarning(
    conversationId: string,
    type: "first_response" | "next_response" | "resolution",
  ): void {
    const timers = activeTimers.get(conversationId);
    if (!timers) return;

    const timer = timers.find((t) => t.type === type);
    if (!timer || timer.warningTriggered) return;

    timer.warningTriggered = true;

    log.info("SLA warning triggered", { conversationId, type });

    this.emitEvent("warning", {
      conversationId,
      type,
      targetTime: timer.targetTime,
    });
  }

  // ==========================================================================
  // BUSINESS HOURS
  // ==========================================================================

  /**
   * Get business hours configuration
   */
  getBusinessHours(): BusinessHours {
    return { ...businessHours };
  }

  /**
   * Update business hours configuration
   */
  updateBusinessHours(config: Partial<BusinessHours>): BusinessHours {
    businessHours = { ...businessHours, ...config };
    log.info("Business hours updated");
    return businessHours;
  }

  /**
   * Check if current time is within business hours
   */
  isWithinBusinessHours(date: Date = new Date()): boolean {
    if (!businessHours.enabled) return true;

    const dayNames: BusinessHoursSchedule["day"][] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    const dayOfWeek = dayNames[date.getDay()];
    const schedule = businessHours.schedule.find((s) => s.day === dayOfWeek);

    if (!schedule || !schedule.enabled) return false;

    const timeStr = date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: businessHours.timezone,
    });

    return (
      timeStr >= (schedule.openTime || "00:00") &&
      timeStr < (schedule.closeTime || "23:59")
    );
  }

  /**
   * Calculate target time considering business hours
   */
  private calculateTargetTime(
    startTime: Date,
    durationSeconds: number,
    operationalHoursOnly: boolean,
  ): Date {
    if (!operationalHoursOnly || !businessHours.enabled) {
      return new Date(startTime.getTime() + durationSeconds * 1000);
    }

    // For operational hours, calculate effective time
    let remainingSeconds = durationSeconds;
    let currentTime = new Date(startTime);

    while (remainingSeconds > 0) {
      if (this.isWithinBusinessHours(currentTime)) {
        remainingSeconds--;
      }
      currentTime = new Date(currentTime.getTime() + 1000);
    }

    return currentTime;
  }

  // ==========================================================================
  // METRICS
  // ==========================================================================

  /**
   * Get SLA metrics for a period
   */
  async getMetrics(
    period: { start: Date; end: Date },
    policyId?: string,
  ): Promise<APIResponse<SLAMetrics[]>> {
    try {
      const policies = policyId
        ? ([slaPolicies.get(policyId)].filter(Boolean) as SLAPolicy[])
        : Array.from(slaPolicies.values());

      const metrics: SLAMetrics[] = [];

      for (const policy of policies) {
        const violations = Array.from(slaViolations.values()).filter(
          (v) =>
            v.policyId === policy.id &&
            v.createdAt >= period.start &&
            v.createdAt <= period.end,
        );

        const firstResponseViolations = violations.filter(
          (v) => v.type === "first_response",
        );
        const resolutionViolations = violations.filter(
          (v) => v.type === "resolution",
        );

        // Get conversations for this policy in the period
        const conversationsResult =
          await this.livechatService.listConversations({
            limit: 1000,
          });

        const conversations = (conversationsResult.data?.items || []).filter(
          (c) =>
            c.sla?.policyId === policy.id &&
            c.createdAt >= period.start &&
            c.createdAt <= period.end,
        );

        const totalConversations = conversations.length;
        const firstResponseMet =
          totalConversations - firstResponseViolations.length;
        const resolutionMet = totalConversations - resolutionViolations.length;

        // Calculate average times
        const responseTimes = conversations
          .filter((c) => c.metrics.firstResponseTime)
          .map((c) => c.metrics.firstResponseTime!);

        const resolutionTimes = conversations
          .filter((c) => c.metrics.chatDuration)
          .map((c) => c.metrics.chatDuration!);

        const avgFirstResponseTime =
          responseTimes.length > 0
            ? Math.round(
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
              )
            : 0;

        const avgResolutionTime =
          resolutionTimes.length > 0
            ? Math.round(
                resolutionTimes.reduce((a, b) => a + b, 0) /
                  resolutionTimes.length,
              )
            : 0;

        const complianceRate =
          totalConversations > 0
            ? (resolutionMet / totalConversations) * 100
            : 100;

        metrics.push({
          policyId: policy.id,
          policyName: policy.name,
          period,
          totalConversations,
          firstResponseMet,
          firstResponseBreached: firstResponseViolations.length,
          resolutionMet,
          resolutionBreached: resolutionViolations.length,
          averageFirstResponseTime: avgFirstResponseTime,
          averageResolutionTime: avgResolutionTime,
          complianceRate: Math.round(complianceRate * 100) / 100,
        });
      }

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      log.error("Failed to get metrics", error);
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
  // EVENT HANDLING
  // ==========================================================================

  /**
   * Subscribe to SLA events
   */
  subscribe(listener: SLAEventListener): () => void {
    eventListeners.push(listener);
    return () => {
      const index = eventListeners.indexOf(listener);
      if (index >= 0) {
        eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an SLA event
   */
  private emitEvent(type: "warning" | "violation", data: unknown): void {
    for (const listener of eventListeners) {
      try {
        listener({ type, data });
      } catch (error) {
        log.error("Error in SLA event listener", error);
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
    // Clear all timers
    for (const timers of activeTimers.values()) {
      for (const timer of timers) {
        clearTimeout(timer.timerId);
      }
    }
    activeTimers.clear();

    slaPolicies.clear();
    slaViolations.clear();
    escalationRules.length = 0;
    businessHours = { ...DEFAULT_BUSINESS_HOURS };

    this.initializeDefaults();

    log.debug("SLA service cleared");
  }

  /**
   * Get active timer count (for debugging)
   */
  getActiveTimerCount(): number {
    let count = 0;
    for (const timers of activeTimers.values()) {
      count += timers.length;
    }
    return count;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let slaServiceInstance: SLAService | null = null;

/**
 * Get or create the SLA service singleton
 */
export function getSLAService(): SLAService {
  if (!slaServiceInstance) {
    slaServiceInstance = new SLAService();
  }
  return slaServiceInstance;
}

/**
 * Create a new SLA service instance (for testing)
 */
export function createSLAService(): SLAService {
  return new SLAService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSLAService(): void {
  if (slaServiceInstance) {
    slaServiceInstance.clearAll();
  }
  slaServiceInstance = null;
}

export default SLAService;
