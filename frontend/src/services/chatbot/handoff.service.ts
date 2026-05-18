/**
 * Handoff Service
 *
 * Manages bot-to-human handoff with context preservation.
 * Ensures smooth transition from chatbot to human agent.
 *
 * Features:
 * - Context-preserving handoff
 * - Queue management
 * - Agent assignment
 * - Conversation history transfer
 * - Handoff analytics
 *
 * @module services/chatbot/handoff.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  HandoffRequest,
  HandoffStatus,
  HandoffTrigger,
  HandoffSummary,
  HandoffConfig,
  BotConversationContext,
  ChatbotEvent,
  ChatbotEventType,
} from "@/lib/chatbot/chatbot-types";
import type { Agent, Visitor, Conversation } from "@/services/livechat/types";
import { getLivechatService } from "@/services/livechat";
import { getChatbotService } from "./chatbot.service";

const log = createLogger("HandoffService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const handoffRequests = new Map<string, HandoffRequest>();
const handoffsByConversation = new Map<string, string>(); // conversationId -> handoffId
const handoffConfig: HandoffConfig = createDefaultConfig();

// Event listeners
type EventListener = (event: ChatbotEvent) => void;
const eventListeners: EventListener[] = [];

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

function createDefaultConfig(): HandoffConfig {
  return {
    autoHandoff: true,
    confidenceThreshold: 0.3,
    maxBotTurns: 5,
    maxUnknownIntents: 2,
    sentimentThreshold: -0.5,
    handoffKeywords: [
      "human",
      "agent",
      "person",
      "representative",
      "operator",
      "transfer",
      "speak with",
    ],
    handoffMessage:
      "I'll connect you with a human agent who can better assist you. Please hold on a moment.",
    agentJoinedMessage:
      "An agent has joined the conversation. They can see our previous chat and will assist you further.",
    noAgentsMessage:
      "All our agents are currently busy. Your conversation has been saved and someone will get back to you as soon as possible.",
    showQueuePosition: true,
    allowCancel: true,
    offlineBehavior: "ticket",
    offlineMessage:
      "We're currently offline. Your message has been saved and our team will respond via email.",
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Emit a handoff event
 */
function emitEvent<T>(
  type: ChatbotEventType,
  conversationId: string,
  visitorId: string,
  data: T,
): void {
  const event: ChatbotEvent<T> = {
    type,
    conversationId,
    visitorId,
    data,
    timestamp: new Date(),
  };

  log.debug("Emitting handoff event", { type, conversationId });

  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (error) {
      log.error("Error in handoff event listener", error);
    }
  }
}

/**
 * Generate handoff summary from context
 */
function generateSummary(context: BotConversationContext): HandoffSummary {
  const now = Date.now();
  const startTime = context.createdAt.getTime();
  const botDuration = Math.round((now - startTime) / 1000);

  // Extract main issue from conversation
  const userMessages = context.messageHistory.filter((m) => m.role === "user");
  const mainIssue =
    userMessages.length > 0
      ? userMessages[0].content.substring(0, 200)
      : undefined;

  // Get key messages (first 2 user, last 2 exchanges)
  const keyMessages: HandoffSummary["keyMessages"] = [];

  // Add first user message
  if (userMessages.length > 0) {
    keyMessages.push(userMessages[0]);
  }

  // Add last few exchanges
  const recentMessages = context.messageHistory.slice(-4);
  for (const msg of recentMessages) {
    if (!keyMessages.find((m) => m.content === msg.content)) {
      keyMessages.push(msg);
    }
  }

  // Calculate average sentiment
  const sentiments = context.sentimentHistory;
  const avgSentiment =
    sentiments.length > 0
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

  return {
    botDuration,
    messageCount: context.messageHistory.length,
    topics: [...new Set(context.topics)],
    mainIssue,
    visitorData: context.collectedData,
    keyMessages,
    failedSuggestions: [...context.suggestedFAQs, ...context.suggestedArticles],
    sentiment: avgSentiment,
  };
}

/**
 * Calculate queue position
 */
function calculateQueuePosition(handoffId: string): number {
  const pendingHandoffs = Array.from(handoffRequests.values())
    .filter((h) => h.status === "waiting_for_agent")
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const position = pendingHandoffs.findIndex((h) => h.id === handoffId);
  return position >= 0 ? position + 1 : pendingHandoffs.length + 1;
}

/**
 * Estimate wait time based on queue
 */
async function estimateWaitTime(department?: string): Promise<number> {
  const livechatService = getLivechatService();
  const statsResult = await livechatService.getQueueStats(department);

  if (statsResult.success && statsResult.data) {
    const stats = statsResult.data;
    const pendingCount = Array.from(handoffRequests.values()).filter(
      (h) =>
        h.status === "waiting_for_agent" &&
        (!department || h.department === department),
    ).length;

    if (stats.availableAgents === 0) {
      return 600; // 10 minutes if no agents
    }

    // Average 5 minutes per conversation
    return Math.round((pendingCount / stats.availableAgents) * 300);
  }

  return 300; // Default 5 minutes
}

// ============================================================================
// HANDOFF SERVICE CLASS
// ============================================================================

export class HandoffService {
  private livechatService = getLivechatService();
  private chatbotService = getChatbotService();

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get handoff configuration
   */
  async getConfig(): Promise<APIResponse<HandoffConfig>> {
    return {
      success: true,
      data: { ...handoffConfig },
    };
  }

  /**
   * Update handoff configuration
   */
  async updateConfig(
    updates: Partial<HandoffConfig>,
  ): Promise<APIResponse<HandoffConfig>> {
    try {
      Object.assign(handoffConfig, updates);
      log.info("Handoff config updated");
      return {
        success: true,
        data: { ...handoffConfig },
      };
    } catch (error) {
      log.error("Failed to update config", error);
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
  // HANDOFF OPERATIONS
  // ==========================================================================

  /**
   * Initiate a handoff from bot to human
   */
  async initiateHandoff(input: {
    conversationId: string;
    trigger: HandoffTrigger;
    reason?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    department?: string;
    preferredAgentId?: string;
    notes?: string;
  }): Promise<APIResponse<HandoffRequest>> {
    try {
      log.debug("Initiating handoff", {
        conversationId: input.conversationId,
        trigger: input.trigger,
      });

      // Check for existing handoff
      const existingId = handoffsByConversation.get(input.conversationId);
      if (existingId) {
        const existing = handoffRequests.get(existingId);
        if (
          existing &&
          !["completed", "cancelled", "failed"].includes(existing.status)
        ) {
          return {
            success: false,
            error: {
              code: "CONFLICT",
              status: 409,
              message: "Handoff already in progress for this conversation",
            },
          };
        }
      }

      // Get bot context
      const contextResult = await this.chatbotService.getContext(
        input.conversationId,
      );
      const context = contextResult.data;

      if (!context) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Bot conversation context not found",
          },
        };
      }

      // Generate summary for agent
      const summary = generateSummary(context);
      if (input.notes) {
        summary.notes = input.notes;
      }

      const now = new Date();

      // Create handoff request
      const handoff: HandoffRequest = {
        id: uuidv4(),
        conversationId: input.conversationId,
        visitor: context.visitor,
        trigger: input.trigger,
        reason: input.reason,
        status: "pending",
        priority: input.priority || "medium",
        department: input.department,
        preferredAgentId: input.preferredAgentId,
        summary,
        createdAt: now,
        updatedAt: now,
      };

      handoffRequests.set(handoff.id, handoff);
      handoffsByConversation.set(input.conversationId, handoff.id);

      // Update context state
      await this.chatbotService.updateContext(input.conversationId, {
        state: "handoff_pending",
      });

      emitEvent(
        "bot.handoff_requested",
        input.conversationId,
        context.visitor.id,
        { handoff },
      );

      log.info("Handoff initiated", {
        handoffId: handoff.id,
        conversationId: input.conversationId,
      });

      // Try to find available agent
      const agentAssigned = await this.tryAssignAgent(handoff);

      if (!agentAssigned) {
        // No agent available - add to queue
        handoff.status = "waiting_for_agent";
        handoff.queuePosition = calculateQueuePosition(handoff.id);
        handoff.estimatedWait = await estimateWaitTime(input.department);
        handoffRequests.set(handoff.id, handoff);
      }

      return {
        success: true,
        data: handoff,
      };
    } catch (error) {
      log.error("Failed to initiate handoff", error);
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
   * Try to assign an available agent
   */
  private async tryAssignAgent(handoff: HandoffRequest): Promise<boolean> {
    // Get available agents
    const agentsResult = await this.livechatService.listAvailableAgents(
      handoff.department,
    );

    if (
      !agentsResult.success ||
      !agentsResult.data ||
      agentsResult.data.length === 0
    ) {
      return false;
    }

    const agents = agentsResult.data;

    // Prefer specified agent if available
    let selectedAgent: Agent | undefined;
    if (handoff.preferredAgentId) {
      selectedAgent = agents.find((a) => a.id === handoff.preferredAgentId);
    }

    // Otherwise pick first available
    if (!selectedAgent) {
      selectedAgent = agents[0];
    }

    if (selectedAgent) {
      handoff.assignedAgent = selectedAgent;
      handoff.status = "agent_assigned";
      handoff.updatedAt = new Date();
      handoffRequests.set(handoff.id, handoff);

      log.info("Agent assigned to handoff", {
        handoffId: handoff.id,
        agentId: selectedAgent.id,
      });

      return true;
    }

    return false;
  }

  /**
   * Accept a handoff (by agent)
   */
  async acceptHandoff(
    handoffId: string,
    agentId: string,
  ): Promise<APIResponse<HandoffRequest>> {
    try {
      const handoff = handoffRequests.get(handoffId);
      if (!handoff) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Handoff request not found",
          },
        };
      }

      if (handoff.status === "in_progress" || handoff.status === "completed") {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Handoff already accepted or completed",
          },
        };
      }

      // Get agent info
      const agentResult = await this.livechatService.getAgent(agentId);
      if (!agentResult.success || !agentResult.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Agent not found",
          },
        };
      }

      const now = new Date();

      handoff.assignedAgent = agentResult.data;
      handoff.status = "in_progress";
      handoff.acceptedAt = now;
      handoff.updatedAt = now;
      handoff.queuePosition = undefined;
      handoff.estimatedWait = undefined;

      handoffRequests.set(handoffId, handoff);

      // Update bot context
      await this.chatbotService.updateContext(handoff.conversationId, {
        state: "handed_off",
      });

      // Assign agent to livechat conversation
      const conversationResult = await this.livechatService.getConversation(
        handoff.conversationId,
      );
      if (conversationResult.success && conversationResult.data) {
        await this.livechatService.assignAgent(handoff.conversationId, agentId);
      }

      emitEvent(
        "bot.handoff_accepted",
        handoff.conversationId,
        handoff.visitor.id,
        { handoff },
      );

      log.info("Handoff accepted", { handoffId, agentId });

      // Update queue positions for other handoffs
      this.updateQueuePositions();

      return {
        success: true,
        data: handoff,
      };
    } catch (error) {
      log.error("Failed to accept handoff", error);
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
   * Complete a handoff
   */
  async completeHandoff(
    handoffId: string,
  ): Promise<APIResponse<HandoffRequest>> {
    try {
      const handoff = handoffRequests.get(handoffId);
      if (!handoff) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Handoff request not found",
          },
        };
      }

      if (handoff.status === "completed") {
        return { success: true, data: handoff };
      }

      const now = new Date();

      handoff.status = "completed";
      handoff.completedAt = now;
      handoff.updatedAt = now;

      handoffRequests.set(handoffId, handoff);

      // End bot session
      await this.chatbotService.endSession(handoff.conversationId);

      emitEvent(
        "bot.handoff_completed",
        handoff.conversationId,
        handoff.visitor.id,
        { handoff },
      );

      log.info("Handoff completed", { handoffId });

      return {
        success: true,
        data: handoff,
      };
    } catch (error) {
      log.error("Failed to complete handoff", error);
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
   * Cancel a handoff (by visitor or system)
   */
  async cancelHandoff(
    handoffId: string,
    reason?: string,
  ): Promise<APIResponse<HandoffRequest>> {
    try {
      const handoff = handoffRequests.get(handoffId);
      if (!handoff) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Handoff request not found",
          },
        };
      }

      if (!handoffConfig.allowCancel && handoff.status === "in_progress") {
        return {
          success: false,
          error: {
            code: "FORBIDDEN",
            status: 403,
            message: "Handoff cancellation not allowed once in progress",
          },
        };
      }

      if (handoff.status === "completed" || handoff.status === "cancelled") {
        return { success: true, data: handoff };
      }

      const now = new Date();

      handoff.status = "cancelled";
      handoff.reason = reason || "Cancelled by user";
      handoff.updatedAt = now;

      handoffRequests.set(handoffId, handoff);

      // Return to bot conversation
      await this.chatbotService.updateContext(handoff.conversationId, {
        state: "answering",
      });

      emitEvent(
        "bot.handoff_cancelled",
        handoff.conversationId,
        handoff.visitor.id,
        { handoff, reason },
      );

      log.info("Handoff cancelled", { handoffId, reason });

      // Update queue positions
      this.updateQueuePositions();

      return {
        success: true,
        data: handoff,
      };
    } catch (error) {
      log.error("Failed to cancel handoff", error);
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
   * Get a handoff request by ID
   */
  async getHandoff(
    handoffId: string,
  ): Promise<APIResponse<HandoffRequest | null>> {
    try {
      const handoff = handoffRequests.get(handoffId);
      return {
        success: true,
        data: handoff || null,
      };
    } catch (error) {
      log.error("Failed to get handoff", error);
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
   * Get handoff by conversation ID
   */
  async getHandoffByConversation(
    conversationId: string,
  ): Promise<APIResponse<HandoffRequest | null>> {
    try {
      const handoffId = handoffsByConversation.get(conversationId);
      if (!handoffId) {
        return { success: true, data: null };
      }
      return this.getHandoff(handoffId);
    } catch (error) {
      log.error("Failed to get handoff by conversation", error);
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
   * List handoff requests
   */
  async listHandoffs(options?: {
    status?: HandoffStatus | HandoffStatus[];
    department?: string;
    agentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<HandoffRequest[]>> {
    try {
      let results = Array.from(handoffRequests.values());

      if (options?.status) {
        const statuses = Array.isArray(options.status)
          ? options.status
          : [options.status];
        results = results.filter((h) => statuses.includes(h.status));
      }

      if (options?.department) {
        results = results.filter((h) => h.department === options.department);
      }

      if (options?.agentId) {
        results = results.filter(
          (h) => h.assignedAgent?.id === options.agentId,
        );
      }

      // Sort by priority and creation time
      const priorityOrder: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      results.sort((a, b) => {
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || 50;
      results = results.slice(offset, offset + limit);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      log.error("Failed to list handoffs", error);
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
   * Get pending handoffs for an agent (queue)
   */
  async getPendingQueue(options?: {
    department?: string;
    limit?: number;
  }): Promise<APIResponse<HandoffRequest[]>> {
    return this.listHandoffs({
      status: ["pending", "waiting_for_agent"],
      department: options?.department,
      limit: options?.limit,
    });
  }

  /**
   * Get handoff summary for agent view
   */
  async getHandoffSummary(
    handoffId: string,
  ): Promise<APIResponse<HandoffSummary | null>> {
    try {
      const handoff = handoffRequests.get(handoffId);
      if (!handoff) {
        return { success: true, data: null };
      }
      return {
        success: true,
        data: handoff.summary,
      };
    } catch (error) {
      log.error("Failed to get handoff summary", error);
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
   * Get full conversation history for handoff
   */
  async getConversationHistory(handoffId: string): Promise<
    APIResponse<{
      botMessages: Array<{
        role: "user" | "bot";
        content: string;
        timestamp: Date;
      }>;
      livechatMessages: Array<{
        senderId: string;
        senderType: string;
        content: string;
        createdAt: Date;
      }>;
    } | null>
  > {
    try {
      const handoff = handoffRequests.get(handoffId);
      if (!handoff) {
        return { success: true, data: null };
      }

      // Get bot context messages
      const contextResult = await this.chatbotService.getContext(
        handoff.conversationId,
      );
      const botMessages = contextResult.data?.messageHistory || [];

      // Get livechat messages if conversation exists
      const livechatMessagesResult = await this.livechatService.getMessages(
        handoff.conversationId,
        { limit: 100 },
      );
      const livechatMessages =
        livechatMessagesResult.data?.items.map((m) => ({
          senderId: m.senderId,
          senderType: m.senderType,
          content: m.content,
          createdAt: m.createdAt,
        })) || [];

      return {
        success: true,
        data: {
          botMessages,
          livechatMessages,
        },
      };
    } catch (error) {
      log.error("Failed to get conversation history", error);
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
   * Update queue positions for all waiting handoffs
   */
  private updateQueuePositions(): void {
    const waiting = Array.from(handoffRequests.values())
      .filter((h) => h.status === "waiting_for_agent")
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          urgent: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    for (let i = 0; i < waiting.length; i++) {
      waiting[i].queuePosition = i + 1;
      handoffRequests.set(waiting[i].id, waiting[i]);
    }
  }

  // ==========================================================================
  // HANDOFF HELPERS FOR AGENTS
  // ==========================================================================

  /**
   * Check if handoff should be triggered based on context
   */
  shouldTriggerHandoff(context: BotConversationContext): {
    shouldHandoff: boolean;
    trigger?: HandoffTrigger;
    reason?: string;
  } {
    // Check unknown count
    if (context.unknownCount >= handoffConfig.maxUnknownIntents) {
      return {
        shouldHandoff: true,
        trigger: "low_confidence",
        reason: "Multiple unrecognized messages",
      };
    }

    // Check bot turns
    if (context.botTurns >= handoffConfig.maxBotTurns) {
      return {
        shouldHandoff: true,
        trigger: "max_turns_reached",
        reason: "Maximum conversation length reached",
      };
    }

    // Check sentiment
    if (context.sentimentHistory.length >= 3) {
      const recent = context.sentimentHistory.slice(-3);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (avg < handoffConfig.sentimentThreshold) {
        return {
          shouldHandoff: true,
          trigger: "negative_sentiment",
          reason: "Negative sentiment detected",
        };
      }
    }

    // Check last intent
    if (context.lastIntent?.requestsHuman) {
      return {
        shouldHandoff: true,
        trigger: "user_request",
        reason: "User requested human agent",
      };
    }

    return { shouldHandoff: false };
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to handoff events
   */
  subscribe(listener: EventListener): () => void {
    eventListeners.push(listener);
    return () => {
      const index = eventListeners.indexOf(listener);
      if (index >= 0) {
        eventListeners.splice(index, 1);
      }
    };
  }

  // ==========================================================================
  // STORE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    handoffRequests.clear();
    handoffsByConversation.clear();
    // Reset config to defaults
    Object.assign(handoffConfig, createDefaultConfig());
    log.debug("All handoff data cleared");
  }

  /**
   * Get store sizes (for debugging)
   */
  getStoreSizes(): Record<string, number> {
    return {
      handoffRequests: handoffRequests.size,
      handoffsByConversation: handoffsByConversation.size,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let handoffServiceInstance: HandoffService | null = null;

/**
 * Get or create the handoff service singleton
 */
export function getHandoffService(): HandoffService {
  if (!handoffServiceInstance) {
    handoffServiceInstance = new HandoffService();
  }
  return handoffServiceInstance;
}

/**
 * Create a new handoff service instance (for testing)
 */
export function createHandoffService(): HandoffService {
  return new HandoffService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetHandoffService(): void {
  if (handoffServiceInstance) {
    handoffServiceInstance.clearAll();
  }
  handoffServiceInstance = null;
}

export default HandoffService;
