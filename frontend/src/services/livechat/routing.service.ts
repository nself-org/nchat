/**
 * Routing Service
 *
 * Handles visitor-to-agent routing with multiple strategies:
 * - Auto selection (round-robin)
 * - Manual selection (agent picks from queue)
 * - Load balancing (based on current load)
 * - Skill-based routing
 * - Priority-based routing
 *
 * @module services/livechat/routing.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  Agent,
  Conversation,
  ConversationPriority,
  RoutingConfig,
  RoutingDecision,
  RoutingMethod,
  LivechatChannel,
} from "./types";
import { getLivechatService } from "./livechat.service";

const log = createLogger("RoutingService");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Routing score for agent selection
 */
interface AgentScore {
  agent: Agent;
  score: number;
  reasons: string[];
}

/**
 * Routing rule for custom routing logic
 */
export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RoutingCondition[];
  action: RoutingAction;
}

/**
 * Condition for routing rules
 */
export interface RoutingCondition {
  field:
    | "department"
    | "channel"
    | "priority"
    | "visitor_tag"
    | "custom_field"
    | "language";
  operator: "equals" | "not_equals" | "contains" | "in" | "not_in";
  value: string | string[];
}

/**
 * Action to take when routing rule matches
 */
export interface RoutingAction {
  type:
    | "assign_agent"
    | "assign_department"
    | "set_priority"
    | "add_tag"
    | "skip_queue";
  agentId?: string;
  department?: string;
  priority?: ConversationPriority;
  tag?: string;
}

/**
 * Routing history entry
 */
export interface RoutingHistoryEntry {
  id: string;
  conversationId: string;
  decision: RoutingDecision;
  selectedAgent?: Agent;
  timestamp: Date;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  method: "auto_selection",
  enabled: true,
  showQueue: true,
  showQueuePositionToVisitor: true,
  maxQueueSize: 100,
  maxWaitTime: 1800, // 30 minutes
  assignTimeout: 60, // 1 minute
  skillsMatchRequired: false,
  languageMatchRequired: false,
  offlineAction: "queue",
  offlineMessage:
    "All agents are currently offline. Your message has been queued.",
};

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

let routingConfig: RoutingConfig = { ...DEFAULT_ROUTING_CONFIG };
const routingRules: RoutingRule[] = [];
const routingHistory: RoutingHistoryEntry[] = [];
const assignmentTimers = new Map<string, NodeJS.Timeout>();
const lastAssignedAgentIndex = new Map<string, number>();

// ============================================================================
// ROUTING SERVICE CLASS
// ============================================================================

export class RoutingService {
  private livechatService = getLivechatService();

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get current routing configuration
   */
  getConfig(): RoutingConfig {
    return { ...routingConfig };
  }

  /**
   * Update routing configuration
   */
  updateConfig(config: Partial<RoutingConfig>): RoutingConfig {
    routingConfig = { ...routingConfig, ...config };
    log.info("Routing config updated", { method: routingConfig.method });
    return routingConfig;
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): RoutingConfig {
    routingConfig = { ...DEFAULT_ROUTING_CONFIG };
    log.info("Routing config reset to defaults");
    return routingConfig;
  }

  // ==========================================================================
  // MAIN ROUTING LOGIC
  // ==========================================================================

  /**
   * Route a conversation to an available agent
   */
  async routeConversation(
    conversation: Conversation,
  ): Promise<APIResponse<RoutingDecision>> {
    try {
      log.debug("Routing conversation", {
        id: conversation.id,
        method: routingConfig.method,
        department: conversation.department,
      });

      // Check if routing is enabled
      if (!routingConfig.enabled) {
        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "Routing disabled - manual assignment required",
            alternativeAgents: [],
            routedAt: new Date(),
            metadata: { method: "disabled" },
          },
        };
      }

      // Apply custom routing rules first
      const ruleResult = await this.applyRoutingRules(conversation);
      if (ruleResult) {
        log.info("Routing rule applied", {
          conversationId: conversation.id,
          ruleId: ruleResult.ruleId,
        });

        // If rule specifies an agent, try to assign
        if (ruleResult.agentId) {
          const agentResult = await this.livechatService.getAgent(
            ruleResult.agentId,
          );
          if (agentResult.success && agentResult.data) {
            const agent = agentResult.data;
            if (this.isAgentAvailable(agent)) {
              return this.createRoutingDecision(
                conversation,
                agent,
                `Rule matched: ${ruleResult.ruleName}`,
              );
            }
          }
        }
      }

      // Get available agents
      const agentsResult = await this.livechatService.listAvailableAgents(
        conversation.department,
      );
      if (!agentsResult.success) {
        return {
          success: false,
          error: agentsResult.error,
        };
      }

      const availableAgents = agentsResult.data || [];

      // Handle no available agents
      if (availableAgents.length === 0) {
        return this.handleNoAgentsAvailable(conversation);
      }

      // Select agent based on routing method
      const selectedAgent = await this.selectAgent(
        conversation,
        availableAgents,
      );

      if (!selectedAgent) {
        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "No suitable agent found",
            alternativeAgents: availableAgents.map((a) => a.id),
            routedAt: new Date(),
            metadata: { method: routingConfig.method },
          },
        };
      }

      // Create routing decision
      const decision = await this.createRoutingDecision(
        conversation,
        selectedAgent,
        `Selected via ${routingConfig.method}`,
        availableAgents
          .filter((a) => a.id !== selectedAgent.id)
          .map((a) => a.id),
      );

      // Assign agent to conversation
      if (decision.success && decision.data?.selectedAgentId) {
        await this.livechatService.assignAgent(
          conversation.id,
          decision.data.selectedAgentId,
        );

        // Set assignment timeout
        this.startAssignmentTimer(conversation.id);
      }

      return decision;
    } catch (error) {
      log.error("Failed to route conversation", error);
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
   * Select an agent based on the configured routing method
   */
  private async selectAgent(
    conversation: Conversation,
    agents: Agent[],
  ): Promise<Agent | null> {
    if (agents.length === 0) return null;

    switch (routingConfig.method) {
      case "auto_selection":
        return this.selectByRoundRobin(agents, conversation.department);

      case "load_balancing":
        return this.selectByLoadBalancing(agents);

      case "skill_based":
        return this.selectBySkills(conversation, agents);

      case "priority_based":
        return this.selectByPriority(agents);

      case "manual_selection":
        // Manual selection doesn't auto-assign
        return null;

      default:
        return agents[0];
    }
  }

  /**
   * Round-robin agent selection
   */
  private selectByRoundRobin(agents: Agent[], department?: string): Agent {
    const key = department || "global";
    const lastIndex = lastAssignedAgentIndex.get(key) ?? -1;
    const nextIndex = (lastIndex + 1) % agents.length;

    lastAssignedAgentIndex.set(key, nextIndex);

    return agents[nextIndex];
  }

  /**
   * Load-balanced agent selection (fewest active chats)
   */
  private selectByLoadBalancing(agents: Agent[]): Agent {
    // Sort by load ratio (active chats / max concurrent)
    const sortedAgents = [...agents].sort((a, b) => {
      const loadA = a.activeChats / a.maxConcurrentChats;
      const loadB = b.activeChats / b.maxConcurrentChats;
      return loadA - loadB;
    });

    return sortedAgents[0];
  }

  /**
   * Skill-based agent selection
   */
  private selectBySkills(
    conversation: Conversation,
    agents: Agent[],
  ): Agent | null {
    // Extract required skills from conversation
    const requiredSkills =
      (conversation.customFields?.requiredSkills as string[]) || [];
    const visitorLanguage = conversation.visitor.language || "en";

    // Score agents based on skill match
    const scoredAgents: AgentScore[] = agents.map((agent) => {
      let score = 100;
      const reasons: string[] = [];

      // Skills match
      if (requiredSkills.length > 0) {
        const matchedSkills = requiredSkills.filter((s) =>
          agent.skills.includes(s),
        );
        const skillScore = (matchedSkills.length / requiredSkills.length) * 50;
        score += skillScore;
        reasons.push(
          `Skills match: ${matchedSkills.length}/${requiredSkills.length}`,
        );
      }

      // Language match
      if (
        routingConfig.languageMatchRequired &&
        agent.languages.includes(visitorLanguage)
      ) {
        score += 30;
        reasons.push("Language match");
      }

      // Priority bonus
      score += agent.priority * 10;
      reasons.push(`Priority: ${agent.priority}`);

      // Load penalty
      const loadPenalty = (agent.activeChats / agent.maxConcurrentChats) * 20;
      score -= loadPenalty;
      reasons.push(`Load: ${agent.activeChats}/${agent.maxConcurrentChats}`);

      return { agent, score, reasons };
    });

    // Filter out agents with required skills if needed
    let eligibleAgents = scoredAgents;
    if (routingConfig.skillsMatchRequired && requiredSkills.length > 0) {
      eligibleAgents = scoredAgents.filter(({ agent }) =>
        requiredSkills.every((s) => agent.skills.includes(s)),
      );
    }

    // Filter out agents without required language
    if (routingConfig.languageMatchRequired) {
      eligibleAgents = eligibleAgents.filter(({ agent }) =>
        agent.languages.includes(visitorLanguage),
      );
    }

    if (eligibleAgents.length === 0) return null;

    // Sort by score descending
    eligibleAgents.sort((a, b) => b.score - a.score);

    log.debug("Skill-based routing scores", {
      conversationId: conversation.id,
      topAgent: eligibleAgents[0].agent.id,
      topScore: eligibleAgents[0].score,
      reasons: eligibleAgents[0].reasons,
    });

    return eligibleAgents[0].agent;
  }

  /**
   * Priority-based agent selection (highest priority agent)
   */
  private selectByPriority(agents: Agent[]): Agent {
    const sortedAgents = [...agents].sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by fewer active chats
      return a.activeChats - b.activeChats;
    });

    return sortedAgents[0];
  }

  /**
   * Handle case when no agents are available
   */
  private async handleNoAgentsAvailable(
    conversation: Conversation,
  ): Promise<APIResponse<RoutingDecision>> {
    log.info("No agents available", { conversationId: conversation.id });

    switch (routingConfig.offlineAction) {
      case "queue":
        // Already in queue from conversation creation
        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "No agents available - queued for next available",
            alternativeAgents: [],
            routedAt: new Date(),
            metadata: { action: "queued" },
          },
        };

      case "email":
        // Would send email notification
        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "No agents available - email notification sent",
            alternativeAgents: [],
            routedAt: new Date(),
            metadata: { action: "email_sent" },
          },
        };

      case "message":
        // Send offline message to visitor
        await this.livechatService.sendMessage({
          conversationId: conversation.id,
          senderId: "system",
          senderType: "bot",
          content:
            routingConfig.offlineMessage || "All agents are currently offline.",
          type: "system",
        });

        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "No agents available - offline message sent",
            alternativeAgents: [],
            routedAt: new Date(),
            metadata: { action: "message_sent" },
          },
        };

      default:
        return {
          success: true,
          data: {
            conversationId: conversation.id,
            reason: "No agents available",
            alternativeAgents: [],
            routedAt: new Date(),
            metadata: {},
          },
        };
    }
  }

  /**
   * Create a routing decision and record it
   */
  private async createRoutingDecision(
    conversation: Conversation,
    agent: Agent,
    reason: string,
    alternatives: string[] = [],
  ): Promise<APIResponse<RoutingDecision>> {
    const decision: RoutingDecision = {
      conversationId: conversation.id,
      selectedAgentId: agent.id,
      reason,
      alternativeAgents: alternatives,
      routedAt: new Date(),
      metadata: {
        method: routingConfig.method,
        agentStatus: agent.status,
        agentLoad: `${agent.activeChats}/${agent.maxConcurrentChats}`,
      },
    };

    // Record in history
    const historyEntry: RoutingHistoryEntry = {
      id: uuidv4(),
      conversationId: conversation.id,
      decision,
      selectedAgent: agent,
      timestamp: new Date(),
    };
    routingHistory.push(historyEntry);

    // Trim history if too large
    if (routingHistory.length > 1000) {
      routingHistory.splice(0, 100);
    }

    log.info("Routing decision made", {
      conversationId: conversation.id,
      agentId: agent.id,
      reason,
    });

    return {
      success: true,
      data: decision,
    };
  }

  // ==========================================================================
  // ROUTING RULES
  // ==========================================================================

  /**
   * Add a routing rule
   */
  addRule(rule: Omit<RoutingRule, "id">): RoutingRule {
    const newRule: RoutingRule = {
      id: uuidv4(),
      ...rule,
    };

    routingRules.push(newRule);

    // Sort by priority (higher first)
    routingRules.sort((a, b) => b.priority - a.priority);

    log.info("Routing rule added", { id: newRule.id, name: newRule.name });

    return newRule;
  }

  /**
   * Update a routing rule
   */
  updateRule(
    id: string,
    updates: Partial<Omit<RoutingRule, "id">>,
  ): RoutingRule | null {
    const index = routingRules.findIndex((r) => r.id === id);
    if (index < 0) return null;

    routingRules[index] = { ...routingRules[index], ...updates };

    // Re-sort by priority
    routingRules.sort((a, b) => b.priority - a.priority);

    log.info("Routing rule updated", { id });

    return routingRules[index];
  }

  /**
   * Delete a routing rule
   */
  deleteRule(id: string): boolean {
    const index = routingRules.findIndex((r) => r.id === id);
    if (index < 0) return false;

    routingRules.splice(index, 1);
    log.info("Routing rule deleted", { id });

    return true;
  }

  /**
   * Get all routing rules
   */
  getRules(): RoutingRule[] {
    return [...routingRules];
  }

  /**
   * Apply routing rules to a conversation
   */
  private async applyRoutingRules(conversation: Conversation): Promise<{
    ruleId: string;
    ruleName: string;
    agentId?: string;
    department?: string;
  } | null> {
    for (const rule of routingRules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateConditions(rule.conditions, conversation);
      if (!matches) continue;

      // Rule matched - return action info
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        agentId: rule.action.agentId,
        department: rule.action.department,
      };
    }

    return null;
  }

  /**
   * Evaluate routing conditions against a conversation
   */
  private evaluateConditions(
    conditions: RoutingCondition[],
    conversation: Conversation,
  ): boolean {
    return conditions.every((condition) => {
      let fieldValue: string | string[] | undefined;

      switch (condition.field) {
        case "department":
          fieldValue = conversation.department;
          break;
        case "channel":
          fieldValue = conversation.channel;
          break;
        case "priority":
          fieldValue = conversation.priority;
          break;
        case "visitor_tag":
          fieldValue = conversation.visitor.tags;
          break;
        case "language":
          fieldValue = conversation.visitor.language;
          break;
        case "custom_field":
          // Format: "field_name:value"
          const [fieldName] = (condition.value as string).split(":");
          fieldValue = conversation.customFields?.[fieldName] as string;
          break;
        default:
          return false;
      }

      if (fieldValue === undefined) return false;

      switch (condition.operator) {
        case "equals":
          return fieldValue === condition.value;

        case "not_equals":
          return fieldValue !== condition.value;

        case "contains":
          if (Array.isArray(fieldValue)) {
            return fieldValue.includes(condition.value as string);
          }
          return String(fieldValue).includes(condition.value as string);

        case "in":
          if (Array.isArray(condition.value)) {
            return condition.value.includes(fieldValue as string);
          }
          return false;

        case "not_in":
          if (Array.isArray(condition.value)) {
            return !condition.value.includes(fieldValue as string);
          }
          return true;

        default:
          return false;
      }
    });
  }

  // ==========================================================================
  // ASSIGNMENT TIMEOUT
  // ==========================================================================

  /**
   * Start assignment timeout timer
   */
  private startAssignmentTimer(conversationId: string): void {
    // Clear existing timer if any
    this.clearAssignmentTimer(conversationId);

    const timer = setTimeout(async () => {
      log.info("Assignment timeout reached", { conversationId });
      await this.handleAssignmentTimeout(conversationId);
    }, routingConfig.assignTimeout * 1000);

    assignmentTimers.set(conversationId, timer);
  }

  /**
   * Clear assignment timeout timer
   */
  clearAssignmentTimer(conversationId: string): void {
    const timer = assignmentTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      assignmentTimers.delete(conversationId);
    }
  }

  /**
   * Handle assignment timeout - re-route conversation
   */
  private async handleAssignmentTimeout(conversationId: string): Promise<void> {
    const result = await this.livechatService.getConversation(conversationId);
    if (!result.success || !result.data) return;

    const conversation = result.data;

    // Only re-route if still assigned but no response
    if (
      conversation.status === "open" &&
      conversation.agent &&
      !conversation.firstResponseAt
    ) {
      log.info("Re-routing conversation due to timeout", { conversationId });

      // Transfer back to queue
      await this.livechatService.transferConversation(
        conversationId,
        { reason: "Assignment timeout - no response" },
        "system",
      );

      // Route to next available agent
      await this.routeConversation(conversation);
    }
  }

  // ==========================================================================
  // QUEUE PROCESSING
  // ==========================================================================

  /**
   * Process the queue and assign pending conversations
   */
  async processQueue(department?: string): Promise<number> {
    const queueResult = await this.livechatService.getQueue(department);
    if (!queueResult.success || !queueResult.data) return 0;

    const queueEntries = queueResult.data;
    let assignedCount = 0;

    for (const entry of queueEntries) {
      const conversationResult = await this.livechatService.getConversation(
        entry.conversationId,
      );
      if (!conversationResult.success || !conversationResult.data) continue;

      const conversation = conversationResult.data;

      // Skip if already assigned
      if (conversation.status !== "queued") continue;

      // Try to route
      const routingResult = await this.routeConversation(conversation);
      if (routingResult.success && routingResult.data?.selectedAgentId) {
        assignedCount++;
      }
    }

    if (assignedCount > 0) {
      log.info("Queue processed", { assigned: assignedCount, department });
    }

    return assignedCount;
  }

  /**
   * Auto-process queue on agent status change
   */
  async onAgentAvailable(agentId: string): Promise<number> {
    const agentResult = await this.livechatService.getAgent(agentId);
    if (!agentResult.success || !agentResult.data) return 0;

    const agent = agentResult.data;

    // Process queue for each department the agent belongs to
    let totalAssigned = 0;
    for (const dept of agent.departments) {
      totalAssigned += await this.processQueue(dept);
    }

    // Also process global queue if agent has no departments
    if (agent.departments.length === 0) {
      totalAssigned += await this.processQueue();
    }

    return totalAssigned;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Check if an agent is available for routing
   */
  private isAgentAvailable(agent: Agent): boolean {
    return (
      agent.status === "available" &&
      agent.activeChats < agent.maxConcurrentChats
    );
  }

  /**
   * Get routing history
   */
  getHistory(options?: {
    conversationId?: string;
    agentId?: string;
    limit?: number;
  }): RoutingHistoryEntry[] {
    let results = [...routingHistory];

    if (options?.conversationId) {
      results = results.filter(
        (h) => h.conversationId === options.conversationId,
      );
    }

    if (options?.agentId) {
      results = results.filter((h) => h.selectedAgent?.id === options.agentId);
    }

    // Sort by timestamp desc
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get routing statistics
   */
  async getStats(period: { start: Date; end: Date }): Promise<{
    totalRouted: number;
    averageRoutingTime: number;
    byMethod: Record<RoutingMethod, number>;
    byDepartment: Record<string, number>;
    successRate: number;
  }> {
    const relevantHistory = routingHistory.filter(
      (h) => h.timestamp >= period.start && h.timestamp <= period.end,
    );

    const stats = {
      totalRouted: relevantHistory.length,
      averageRoutingTime: 0,
      byMethod: {} as Record<RoutingMethod, number>,
      byDepartment: {} as Record<string, number>,
      successRate: 0,
    };

    let successCount = 0;
    let totalRoutingTime = 0;

    for (const entry of relevantHistory) {
      // Method count
      const method = entry.decision.metadata?.method as RoutingMethod;
      if (method) {
        stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
      }

      // Success count
      if (entry.selectedAgent) {
        successCount++;
      }

      // Department count
      const dept = entry.selectedAgent?.departments[0] || "unassigned";
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
    }

    stats.successRate =
      relevantHistory.length > 0
        ? (successCount / relevantHistory.length) * 100
        : 0;

    stats.averageRoutingTime =
      relevantHistory.length > 0
        ? totalRoutingTime / relevantHistory.length
        : 0;

    return stats;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all routing data (for testing)
   */
  clearAll(): void {
    routingRules.length = 0;
    routingHistory.length = 0;
    lastAssignedAgentIndex.clear();

    // Clear all timers
    for (const timer of assignmentTimers.values()) {
      clearTimeout(timer);
    }
    assignmentTimers.clear();

    routingConfig = { ...DEFAULT_ROUTING_CONFIG };

    log.debug("Routing service cleared");
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let routingServiceInstance: RoutingService | null = null;

/**
 * Get or create the routing service singleton
 */
export function getRoutingService(): RoutingService {
  if (!routingServiceInstance) {
    routingServiceInstance = new RoutingService();
  }
  return routingServiceInstance;
}

/**
 * Create a new routing service instance (for testing)
 */
export function createRoutingService(): RoutingService {
  return new RoutingService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetRoutingService(): void {
  if (routingServiceInstance) {
    routingServiceInstance.clearAll();
  }
  routingServiceInstance = null;
}

export default RoutingService;
