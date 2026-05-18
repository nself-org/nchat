/**
 * Livechat Service
 *
 * Core service for omnichannel live support functionality.
 * Provides Rocket.Chat-style live help capabilities.
 *
 * Features:
 * - Visitor management
 * - Conversation lifecycle
 * - Agent management
 * - Department handling
 * - Message operations
 * - Queue management
 *
 * @module services/livechat/livechat.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  Visitor,
  CreateVisitorInput,
  UpdateVisitorInput,
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentStatus,
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  ConversationStatus,
  ConversationPriority,
  LivechatMessage,
  SendMessageInput,
  Department,
  QueueEntry,
  QueueStats,
  LivechatChannel,
  TransferRecord,
  LivechatListResult,
  LivechatListOptions,
  LivechatEvent,
  LivechatEventType,
} from "./types";

const log = createLogger("LivechatService");

// ============================================================================
// IN-MEMORY STORES (would be database in production)
// ============================================================================

const visitors = new Map<string, Visitor>();
const agents = new Map<string, Agent>();
const conversations = new Map<string, Conversation>();
const messages = new Map<string, LivechatMessage[]>();
const departments = new Map<string, Department>();
const queue: QueueEntry[] = [];

// Event listeners for real-time updates
type EventListener = (event: LivechatEvent) => void;
const eventListeners: EventListener[] = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique visitor token
 */
function generateVisitorToken(): string {
  return `v_${uuidv4().replace(/-/g, "")}`;
}

/**
 * Generate a conversation token
 */
function generateConversationToken(): string {
  return `c_${uuidv4().replace(/-/g, "")}`;
}

/**
 * Emit a livechat event
 */
function emitEvent<T>(
  type: LivechatEventType,
  data: T,
  conversationId?: string,
  visitorId?: string,
  agentId?: string,
): void {
  const event: LivechatEvent<T> = {
    type,
    conversationId,
    visitorId,
    agentId,
    data,
    timestamp: new Date(),
  };

  log.debug("Emitting event", { type, conversationId, visitorId, agentId });

  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (error) {
      log.error("Error in event listener", error);
    }
  }
}

/**
 * Calculate queue position for a conversation
 */
function calculateQueuePosition(entry: QueueEntry): number {
  const priorityWeight: Record<ConversationPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Sort queue by priority (desc) and then by time (asc)
  const sortedQueue = [...queue].sort((a, b) => {
    const priorityDiff =
      priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.queuedAt.getTime() - b.queuedAt.getTime();
  });

  const position = sortedQueue.findIndex((e) => e.id === entry.id);
  return position >= 0 ? position + 1 : sortedQueue.length + 1;
}

/**
 * Estimate wait time based on current queue and agent availability
 */
function estimateWaitTime(department?: string): number {
  const availableAgents = Array.from(agents.values()).filter((a) => {
    if (a.status !== "available") return false;
    if (department && !a.departments.includes(department)) return false;
    return a.activeChats < a.maxConcurrentChats;
  });

  if (availableAgents.length === 0) {
    // No available agents - estimate 10 minutes
    return 600;
  }

  const relevantQueue = department
    ? queue.filter((e) => e.department === department)
    : queue;

  // Average handling time is ~5 minutes per chat
  const avgHandlingTime = 300;
  const estimatedTime =
    (relevantQueue.length / availableAgents.length) * avgHandlingTime;

  return Math.round(estimatedTime);
}

// ============================================================================
// LIVECHAT SERVICE CLASS
// ============================================================================

export class LivechatService {
  // ==========================================================================
  // VISITOR OPERATIONS
  // ==========================================================================

  /**
   * Create a new visitor
   */
  async createVisitor(
    input: CreateVisitorInput,
  ): Promise<APIResponse<Visitor>> {
    try {
      log.debug("Creating visitor", {
        channel: input.channel,
        email: input.email,
      });

      const id = uuidv4();
      const token = input.token || generateVisitorToken();
      const now = new Date();

      const visitor: Visitor = {
        id,
        token,
        name: input.name,
        email: input.email,
        phone: input.phone,
        department: input.department,
        channel: input.channel,
        status: "online",
        customFields: input.customFields || {},
        tags: [],
        metadata: input.metadata || {},
        visitsCount: 1,
        totalChats: 0,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      };

      visitors.set(id, visitor);

      emitEvent("visitor.created", visitor, undefined, id);

      log.info("Visitor created", { id, token });

      return {
        success: true,
        data: visitor,
      };
    } catch (error) {
      log.error("Failed to create visitor", error);
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
   * Get a visitor by ID
   */
  async getVisitor(id: string): Promise<APIResponse<Visitor | null>> {
    try {
      const visitor = visitors.get(id);
      return {
        success: true,
        data: visitor || null,
      };
    } catch (error) {
      log.error("Failed to get visitor", error);
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
   * Get a visitor by token
   */
  async getVisitorByToken(token: string): Promise<APIResponse<Visitor | null>> {
    try {
      const visitor = Array.from(visitors.values()).find(
        (v) => v.token === token,
      );
      return {
        success: true,
        data: visitor || null,
      };
    } catch (error) {
      log.error("Failed to get visitor by token", error);
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
   * Update a visitor
   */
  async updateVisitor(
    id: string,
    input: UpdateVisitorInput,
  ): Promise<APIResponse<Visitor>> {
    try {
      const visitor = visitors.get(id);
      if (!visitor) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Visitor not found",
          },
        };
      }

      const updated: Visitor = {
        ...visitor,
        ...input,
        customFields: { ...visitor.customFields, ...input.customFields },
        tags: input.tags ?? visitor.tags,
        metadata: { ...visitor.metadata, ...input.metadata },
        updatedAt: new Date(),
      };

      visitors.set(id, updated);

      emitEvent("visitor.updated", updated, undefined, id);

      log.info("Visitor updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update visitor", error);
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
   * Update visitor status
   */
  async updateVisitorStatus(
    id: string,
    status: "online" | "offline",
  ): Promise<APIResponse<Visitor>> {
    try {
      const visitor = visitors.get(id);
      if (!visitor) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Visitor not found",
          },
        };
      }

      visitor.status = status;
      visitor.lastSeenAt = new Date();
      visitor.updatedAt = new Date();

      visitors.set(id, visitor);

      emitEvent(
        status === "online" ? "visitor.online" : "visitor.offline",
        visitor,
        undefined,
        id,
      );

      return {
        success: true,
        data: visitor,
      };
    } catch (error) {
      log.error("Failed to update visitor status", error);
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
   * List visitors with pagination
   */
  async listVisitors(
    options: LivechatListOptions & { status?: string },
  ): Promise<APIResponse<LivechatListResult<Visitor>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
        status,
      } = options;

      let results = Array.from(visitors.values());

      if (status) {
        results = results.filter((v) => v.status === status);
      }

      // Sort
      results.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortBy];
        const bVal = (b as unknown as Record<string, unknown>)[sortBy];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder === "asc"
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortOrder === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });

      const totalCount = results.length;
      const items = results.slice(offset, offset + limit);

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
      log.error("Failed to list visitors", error);
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
  // AGENT OPERATIONS
  // ==========================================================================

  /**
   * Create/register an agent
   */
  async createAgent(input: CreateAgentInput): Promise<APIResponse<Agent>> {
    try {
      log.debug("Creating agent", { userId: input.userId });

      // Check if agent already exists for this user
      const existing = Array.from(agents.values()).find(
        (a) => a.userId === input.userId,
      );
      if (existing) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Agent already exists for this user",
          },
        };
      }

      const id = uuidv4();
      const now = new Date();

      const agent: Agent = {
        id,
        userId: input.userId,
        username: `agent_${id.substring(0, 8)}`,
        displayName: `Agent ${id.substring(0, 8)}`,
        email: "",
        departments: input.departments || [],
        status: "offline",
        maxConcurrentChats: input.maxConcurrentChats ?? 5,
        activeChats: 0,
        totalChatsHandled: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        rating: 0,
        ratingCount: 0,
        skills: input.skills || [],
        languages: input.languages || ["en"],
        priority: input.priority ?? 1,
        createdAt: now,
        updatedAt: now,
      };

      agents.set(id, agent);

      log.info("Agent created", { id, userId: input.userId });

      return {
        success: true,
        data: agent,
      };
    } catch (error) {
      log.error("Failed to create agent", error);
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
   * Get an agent by ID
   */
  async getAgent(id: string): Promise<APIResponse<Agent | null>> {
    try {
      const agent = agents.get(id);
      return {
        success: true,
        data: agent || null,
      };
    } catch (error) {
      log.error("Failed to get agent", error);
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
   * Get an agent by user ID
   */
  async getAgentByUserId(userId: string): Promise<APIResponse<Agent | null>> {
    try {
      const agent = Array.from(agents.values()).find(
        (a) => a.userId === userId,
      );
      return {
        success: true,
        data: agent || null,
      };
    } catch (error) {
      log.error("Failed to get agent by user ID", error);
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
   * Update an agent
   */
  async updateAgent(
    id: string,
    input: UpdateAgentInput,
  ): Promise<APIResponse<Agent>> {
    try {
      const agent = agents.get(id);
      if (!agent) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Agent not found",
          },
        };
      }

      const oldStatus = agent.status;

      const updated: Agent = {
        ...agent,
        ...input,
        departments: input.departments ?? agent.departments,
        skills: input.skills ?? agent.skills,
        languages: input.languages ?? agent.languages,
        updatedAt: new Date(),
      };

      agents.set(id, updated);

      if (oldStatus !== updated.status) {
        emitEvent(
          "agent.status_changed",
          { agent: updated, oldStatus, newStatus: updated.status },
          undefined,
          undefined,
          id,
        );
      }

      log.info("Agent updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update agent", error);
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
   * Update agent status
   */
  async updateAgentStatus(
    id: string,
    status: AgentStatus,
    statusMessage?: string,
  ): Promise<APIResponse<Agent>> {
    return this.updateAgent(id, { status, statusMessage });
  }

  /**
   * List available agents for a department
   */
  async listAvailableAgents(
    department?: string,
  ): Promise<APIResponse<Agent[]>> {
    try {
      let availableAgents = Array.from(agents.values()).filter((a) => {
        if (a.status !== "available") return false;
        if (a.activeChats >= a.maxConcurrentChats) return false;
        return true;
      });

      if (department) {
        availableAgents = availableAgents.filter((a) =>
          a.departments.includes(department),
        );
      }

      // Sort by priority (desc) and then by active chats (asc)
      availableAgents.sort((a, b) => {
        const priorityDiff = b.priority - a.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.activeChats - b.activeChats;
      });

      return {
        success: true,
        data: availableAgents,
      };
    } catch (error) {
      log.error("Failed to list available agents", error);
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
   * List all agents with pagination
   */
  async listAgents(
    options: LivechatListOptions & {
      department?: string;
      status?: AgentStatus;
    },
  ): Promise<APIResponse<LivechatListResult<Agent>>> {
    try {
      const { limit = 50, offset = 0, department, status } = options;

      let results = Array.from(agents.values());

      if (department) {
        results = results.filter((a) => a.departments.includes(department));
      }

      if (status) {
        results = results.filter((a) => a.status === status);
      }

      const totalCount = results.length;
      const items = results.slice(offset, offset + limit);

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
      log.error("Failed to list agents", error);
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
  // CONVERSATION OPERATIONS
  // ==========================================================================

  /**
   * Create a new conversation
   */
  async createConversation(
    input: CreateConversationInput,
  ): Promise<APIResponse<Conversation>> {
    try {
      log.debug("Creating conversation", {
        visitorId: input.visitorId,
        channel: input.channel,
      });

      // Validate visitor exists
      const visitor = visitors.get(input.visitorId);
      if (!visitor) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Visitor not found",
          },
        };
      }

      const id = uuidv4();
      const token = generateConversationToken();
      const now = new Date();

      const conversation: Conversation = {
        id,
        token,
        visitor,
        department: input.department,
        channel: input.channel,
        status: "queued",
        priority: input.priority || "medium",
        source: input.source || { type: "widget" },
        tags: [],
        customFields: input.customFields || {},
        metrics: {
          messagesCount: 0,
          agentMessages: 0,
          visitorMessages: 0,
        },
        transferHistory: [],
        queuedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      conversations.set(id, conversation);
      messages.set(id, []);

      // Update visitor stats
      visitor.totalChats++;
      visitor.status = "waiting";
      visitors.set(visitor.id, visitor);

      // Add to queue
      const queueEntry: QueueEntry = {
        id: uuidv4(),
        conversationId: id,
        visitor,
        department: input.department,
        priority: conversation.priority,
        position: 0,
        estimatedWaitTime: 0,
        queuedAt: now,
      };
      queue.push(queueEntry);

      // Update queue positions
      this.updateQueuePositions();

      emitEvent("conversation.created", conversation, id, visitor.id);
      emitEvent("queue.updated", { queue: this.getQueueSnapshot() });

      // Send initial message if provided
      if (input.message) {
        await this.sendMessage({
          conversationId: id,
          senderId: visitor.id,
          senderType: "visitor",
          content: input.message,
          type: "text",
        });
      }

      log.info("Conversation created", { id, token, visitorId: visitor.id });

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      log.error("Failed to create conversation", error);
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
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<APIResponse<Conversation | null>> {
    try {
      const conversation = conversations.get(id);
      return {
        success: true,
        data: conversation || null,
      };
    } catch (error) {
      log.error("Failed to get conversation", error);
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
   * Get a conversation by token
   */
  async getConversationByToken(
    token: string,
  ): Promise<APIResponse<Conversation | null>> {
    try {
      const conversation = Array.from(conversations.values()).find(
        (c) => c.token === token,
      );
      return {
        success: true,
        data: conversation || null,
      };
    } catch (error) {
      log.error("Failed to get conversation by token", error);
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
   * Update a conversation
   */
  async updateConversation(
    id: string,
    input: UpdateConversationInput,
  ): Promise<APIResponse<Conversation>> {
    try {
      const conversation = conversations.get(id);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const updated: Conversation = {
        ...conversation,
        ...input,
        tags: input.tags ?? conversation.tags,
        customFields: { ...conversation.customFields, ...input.customFields },
        updatedAt: new Date(),
      };

      conversations.set(id, updated);

      log.info("Conversation updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update conversation", error);
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
   * Assign an agent to a conversation
   */
  async assignAgent(
    conversationId: string,
    agentId: string,
  ): Promise<APIResponse<Conversation>> {
    try {
      log.debug("Assigning agent", { conversationId, agentId });

      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const agent = agents.get(agentId);
      if (!agent) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Agent not found",
          },
        };
      }

      if (agent.status !== "available") {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Agent is not available",
          },
        };
      }

      if (agent.activeChats >= agent.maxConcurrentChats) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Agent has reached maximum concurrent chats",
          },
        };
      }

      const now = new Date();

      // Update conversation
      conversation.agent = agent;
      conversation.status = "open";
      conversation.assignedAt = now;
      conversation.updatedAt = now;

      // Calculate waiting time
      if (conversation.queuedAt) {
        conversation.metrics.waitingTime = Math.round(
          (now.getTime() - conversation.queuedAt.getTime()) / 1000,
        );
      }

      conversations.set(conversationId, conversation);

      // Update agent
      agent.activeChats++;
      agent.lastRoutedAt = now;
      agents.set(agentId, agent);

      // Update visitor status
      const visitor = visitors.get(conversation.visitor.id);
      if (visitor) {
        visitor.status = "chatting";
        visitors.set(visitor.id, visitor);
      }

      // Remove from queue
      const queueIndex = queue.findIndex(
        (e) => e.conversationId === conversationId,
      );
      if (queueIndex >= 0) {
        queue.splice(queueIndex, 1);
        this.updateQueuePositions();
      }

      emitEvent(
        "conversation.assigned",
        { conversation, agent },
        conversationId,
        conversation.visitor.id,
        agentId,
      );
      emitEvent("queue.updated", { queue: this.getQueueSnapshot() });

      log.info("Agent assigned", { conversationId, agentId });

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      log.error("Failed to assign agent", error);
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
   * Transfer a conversation to another agent or department
   */
  async transferConversation(
    conversationId: string,
    options: {
      toAgentId?: string;
      toDepartment?: string;
      reason?: string;
      comment?: string;
    },
    transferredBy: string,
  ): Promise<APIResponse<Conversation>> {
    try {
      log.debug("Transferring conversation", { conversationId, ...options });

      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const now = new Date();
      const fromAgent = conversation.agent;

      // Create transfer record
      const transfer: TransferRecord = {
        id: uuidv4(),
        fromAgentId: fromAgent?.id,
        toAgentId: options.toAgentId,
        fromDepartment: conversation.department,
        toDepartment: options.toDepartment,
        reason: options.reason,
        comment: options.comment,
        transferredAt: now,
        transferredBy,
      };

      conversation.transferHistory.push(transfer);

      // Update previous agent
      if (fromAgent) {
        fromAgent.activeChats = Math.max(0, fromAgent.activeChats - 1);
        agents.set(fromAgent.id, fromAgent);
      }

      // Update department if specified
      if (options.toDepartment) {
        conversation.department = options.toDepartment;
      }

      // Assign new agent if specified
      if (options.toAgentId) {
        const newAgent = agents.get(options.toAgentId);
        if (newAgent) {
          conversation.agent = newAgent;
          newAgent.activeChats++;
          newAgent.lastRoutedAt = now;
          agents.set(newAgent.id, newAgent);
        }
      } else {
        // Put back in queue
        conversation.agent = undefined;
        conversation.status = "queued";
        conversation.queuedAt = now;

        const queueEntry: QueueEntry = {
          id: uuidv4(),
          conversationId,
          visitor: conversation.visitor,
          department: conversation.department,
          priority: conversation.priority,
          position: 0,
          estimatedWaitTime: 0,
          queuedAt: now,
        };
        queue.push(queueEntry);
        this.updateQueuePositions();
      }

      conversation.updatedAt = now;
      conversations.set(conversationId, conversation);

      emitEvent(
        "conversation.transferred",
        { conversation, transfer },
        conversationId,
        conversation.visitor.id,
        options.toAgentId,
      );

      log.info("Conversation transferred", {
        conversationId,
        toAgentId: options.toAgentId,
        toDepartment: options.toDepartment,
      });

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      log.error("Failed to transfer conversation", error);
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
   * Resolve a conversation
   */
  async resolveConversation(
    conversationId: string,
    agentId: string,
  ): Promise<APIResponse<Conversation>> {
    try {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      if (
        conversation.status === "closed" ||
        conversation.status === "resolved"
      ) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: "Conversation is already resolved or closed",
          },
        };
      }

      const now = new Date();

      conversation.status = "resolved";
      conversation.resolvedAt = now;
      conversation.updatedAt = now;

      // Calculate chat duration
      if (conversation.assignedAt) {
        conversation.metrics.chatDuration = Math.round(
          (now.getTime() - conversation.assignedAt.getTime()) / 1000,
        );
      }

      conversations.set(conversationId, conversation);

      // Update agent stats
      if (conversation.agent) {
        const agent = agents.get(conversation.agent.id);
        if (agent) {
          agent.activeChats = Math.max(0, agent.activeChats - 1);
          agent.totalChatsHandled++;

          // Update average resolution time
          if (conversation.metrics.chatDuration) {
            const totalTime =
              agent.averageResolutionTime * (agent.totalChatsHandled - 1) +
              conversation.metrics.chatDuration;
            agent.averageResolutionTime = Math.round(
              totalTime / agent.totalChatsHandled,
            );
          }

          agents.set(agent.id, agent);
        }
      }

      // Update visitor status
      const visitor = visitors.get(conversation.visitor.id);
      if (visitor) {
        visitor.status = "online";
        visitors.set(visitor.id, visitor);
      }

      emitEvent(
        "conversation.resolved",
        conversation,
        conversationId,
        conversation.visitor.id,
        agentId,
      );

      log.info("Conversation resolved", { conversationId, agentId });

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      log.error("Failed to resolve conversation", error);
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
   * Close a conversation
   */
  async closeConversation(
    conversationId: string,
  ): Promise<APIResponse<Conversation>> {
    try {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const now = new Date();

      conversation.status = "closed";
      conversation.closedAt = now;
      conversation.updatedAt = now;

      conversations.set(conversationId, conversation);

      // Cleanup agent if still assigned
      if (conversation.agent && conversation.status === "closed") {
        const agent = agents.get(conversation.agent.id);
        if (agent) {
          agent.activeChats = Math.max(0, agent.activeChats - 1);
          agents.set(agent.id, agent);
        }
      }

      emitEvent(
        "conversation.closed",
        conversation,
        conversationId,
        conversation.visitor.id,
        conversation.agent?.id,
      );

      log.info("Conversation closed", { conversationId });

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      log.error("Failed to close conversation", error);
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
   * List conversations with filters
   */
  async listConversations(
    options: LivechatListOptions & {
      status?: ConversationStatus;
      agentId?: string;
      department?: string;
      channel?: LivechatChannel;
      visitorId?: string;
    },
  ): Promise<APIResponse<LivechatListResult<Conversation>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        agentId,
        department,
        channel,
        visitorId,
      } = options;

      let results = Array.from(conversations.values());

      if (status) {
        results = results.filter((c) => c.status === status);
      }

      if (agentId) {
        results = results.filter((c) => c.agent?.id === agentId);
      }

      if (department) {
        results = results.filter((c) => c.department === department);
      }

      if (channel) {
        results = results.filter((c) => c.channel === channel);
      }

      if (visitorId) {
        results = results.filter((c) => c.visitor.id === visitorId);
      }

      // Sort by createdAt desc
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = results.length;
      const items = results.slice(offset, offset + limit);

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
      log.error("Failed to list conversations", error);
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
  // MESSAGE OPERATIONS
  // ==========================================================================

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    input: SendMessageInput,
  ): Promise<APIResponse<LivechatMessage>> {
    try {
      log.debug("Sending message", {
        conversationId: input.conversationId,
        senderType: input.senderType,
      });

      const conversation = conversations.get(input.conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const id = uuidv4();
      const now = new Date();

      const message: LivechatMessage = {
        id,
        conversationId: input.conversationId,
        senderId: input.senderId,
        senderType: input.senderType,
        type: input.type || "text",
        content: input.content,
        attachments: input.attachments?.map((a) => ({ ...a, id: uuidv4() })),
        metadata: input.metadata,
        isInternal: input.isInternal || false,
        createdAt: now,
      };

      // Get or create message array for this conversation
      const conversationMessages = messages.get(input.conversationId) || [];
      conversationMessages.push(message);
      messages.set(input.conversationId, conversationMessages);

      // Update conversation metrics
      conversation.metrics.messagesCount++;
      if (input.senderType === "agent") {
        conversation.metrics.agentMessages++;

        // Track first response time
        if (!conversation.firstResponseAt && conversation.assignedAt) {
          conversation.firstResponseAt = now;
          conversation.metrics.firstResponseTime = Math.round(
            (now.getTime() - conversation.assignedAt.getTime()) / 1000,
          );
        }
      } else if (input.senderType === "visitor") {
        conversation.metrics.visitorMessages++;
      }

      conversation.lastMessageAt = now;
      conversation.updatedAt = now;
      conversations.set(input.conversationId, conversation);

      // Update visitor last message time
      const visitor = visitors.get(conversation.visitor.id);
      if (visitor) {
        visitor.lastMessageAt = now;
        visitor.lastSeenAt = now;
        visitors.set(visitor.id, visitor);
      }

      emitEvent(
        "message.created",
        message,
        input.conversationId,
        conversation.visitor.id,
        conversation.agent?.id,
      );

      log.debug("Message sent", { id, conversationId: input.conversationId });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      log.error("Failed to send message", error);
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
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options: LivechatListOptions & { includeInternal?: boolean },
  ): Promise<APIResponse<LivechatListResult<LivechatMessage>>> {
    try {
      const { limit = 50, offset = 0, includeInternal = false } = options;

      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      let conversationMessages = messages.get(conversationId) || [];

      if (!includeInternal) {
        conversationMessages = conversationMessages.filter(
          (m) => !m.isInternal,
        );
      }

      // Sort by createdAt asc
      conversationMessages.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      const totalCount = conversationMessages.length;
      const items = conversationMessages.slice(offset, offset + limit);

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
      log.error("Failed to get messages", error);
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
   * Mark messages as read
   */
  async markMessagesRead(
    conversationId: string,
    readerId: string,
    readerType: "visitor" | "agent",
  ): Promise<APIResponse<number>> {
    try {
      const conversationMessages = messages.get(conversationId);
      if (!conversationMessages) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      const now = new Date();
      let markedCount = 0;

      for (const message of conversationMessages) {
        // Mark messages from the other party as read
        if (message.senderType !== readerType && !message.readAt) {
          message.readAt = now;
          markedCount++;
        }
      }

      messages.set(conversationId, conversationMessages);

      if (markedCount > 0) {
        emitEvent(
          "message.read",
          { conversationId, readerId, count: markedCount },
          conversationId,
        );
      }

      return {
        success: true,
        data: markedCount,
      };
    } catch (error) {
      log.error("Failed to mark messages read", error);
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
  // QUEUE OPERATIONS
  // ==========================================================================

  /**
   * Get current queue
   */
  async getQueue(department?: string): Promise<APIResponse<QueueEntry[]>> {
    try {
      let queueItems = [...queue];

      if (department) {
        queueItems = queueItems.filter((e) => e.department === department);
      }

      // Sort by position
      queueItems.sort((a, b) => a.position - b.position);

      return {
        success: true,
        data: queueItems,
      };
    } catch (error) {
      log.error("Failed to get queue", error);
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
   * Get queue statistics
   */
  async getQueueStats(department?: string): Promise<APIResponse<QueueStats>> {
    try {
      const relevantQueue = department
        ? queue.filter((e) => e.department === department)
        : queue;

      const agentList = Array.from(agents.values());
      const relevantAgents = department
        ? agentList.filter((a) => a.departments.includes(department))
        : agentList;

      const availableAgents = relevantAgents.filter(
        (a) => a.status === "available" && a.activeChats < a.maxConcurrentChats,
      ).length;

      const busyAgents = relevantAgents.filter(
        (a) =>
          a.status === "available" && a.activeChats >= a.maxConcurrentChats,
      ).length;

      const offlineAgents = relevantAgents.filter(
        (a) => a.status !== "available",
      ).length;

      // Calculate wait times
      const now = Date.now();
      const waitTimes = relevantQueue.map((e) =>
        Math.round((now - e.queuedAt.getTime()) / 1000),
      );
      const averageWaitTime =
        waitTimes.length > 0
          ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
          : 0;
      const longestWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

      const stats: QueueStats = {
        department,
        totalQueued: relevantQueue.length,
        averageWaitTime,
        longestWaitTime,
        availableAgents,
        busyAgents,
        offlineAgents,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      log.error("Failed to get queue stats", error);
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
   * Get queue position for a conversation
   */
  async getQueuePosition(
    conversationId: string,
  ): Promise<APIResponse<{ position: number; estimatedWait: number } | null>> {
    try {
      const entry = queue.find((e) => e.conversationId === conversationId);

      if (!entry) {
        return {
          success: true,
          data: null,
        };
      }

      return {
        success: true,
        data: {
          position: entry.position,
          estimatedWait: entry.estimatedWaitTime,
        },
      };
    } catch (error) {
      log.error("Failed to get queue position", error);
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
   * Update queue positions and estimated wait times
   */
  private updateQueuePositions(): void {
    const priorityWeight: Record<ConversationPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    // Sort by priority (desc) then by queue time (asc)
    queue.sort((a, b) => {
      const priorityDiff =
        priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });

    // Update positions and wait times
    for (let i = 0; i < queue.length; i++) {
      queue[i].position = i + 1;
      queue[i].estimatedWaitTime = estimateWaitTime(queue[i].department);
    }
  }

  /**
   * Get a snapshot of the queue for events
   */
  private getQueueSnapshot(): QueueEntry[] {
    return queue.map((e) => ({ ...e }));
  }

  // ==========================================================================
  // DEPARTMENT OPERATIONS
  // ==========================================================================

  /**
   * Create a department
   */
  async createDepartment(
    input: Omit<Department, "id" | "numAgents" | "createdAt" | "updatedAt">,
  ): Promise<APIResponse<Department>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const department: Department = {
        id,
        ...input,
        numAgents: 0,
        createdAt: now,
        updatedAt: now,
      };

      departments.set(id, department);

      log.info("Department created", { id, name: input.name });

      return {
        success: true,
        data: department,
      };
    } catch (error) {
      log.error("Failed to create department", error);
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
   * Get a department by ID
   */
  async getDepartment(id: string): Promise<APIResponse<Department | null>> {
    try {
      const department = departments.get(id);
      return {
        success: true,
        data: department || null,
      };
    } catch (error) {
      log.error("Failed to get department", error);
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
   * List all departments
   */
  async listDepartments(options?: {
    enabled?: boolean;
  }): Promise<APIResponse<Department[]>> {
    try {
      let depts = Array.from(departments.values());

      if (options?.enabled !== undefined) {
        depts = depts.filter((d) => d.enabled === options.enabled);
      }

      // Update agent counts
      for (const dept of depts) {
        dept.numAgents = Array.from(agents.values()).filter((a) =>
          a.departments.includes(dept.id),
        ).length;
      }

      return {
        success: true,
        data: depts,
      };
    } catch (error) {
      log.error("Failed to list departments", error);
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
  // TYPING INDICATORS
  // ==========================================================================

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    conversationId: string,
    senderId: string,
    isTyping: boolean,
  ): Promise<APIResponse<void>> {
    try {
      const conversation = conversations.get(conversationId);
      if (!conversation) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Conversation not found",
          },
        };
      }

      emitEvent(
        isTyping ? "typing.start" : "typing.stop",
        { conversationId, senderId },
        conversationId,
        conversation.visitor.id,
        conversation.agent?.id,
      );

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      log.error("Failed to send typing indicator", error);
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
   * Subscribe to livechat events
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
  // STORE MANAGEMENT (for testing)
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    visitors.clear();
    agents.clear();
    conversations.clear();
    messages.clear();
    departments.clear();
    queue.length = 0;
    log.debug("All livechat data cleared");
  }

  /**
   * Get store sizes (for debugging)
   */
  getStoreSizes(): Record<string, number> {
    return {
      visitors: visitors.size,
      agents: agents.size,
      conversations: conversations.size,
      messages: messages.size,
      departments: departments.size,
      queue: queue.length,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let livechatServiceInstance: LivechatService | null = null;

/**
 * Get or create the livechat service singleton
 */
export function getLivechatService(): LivechatService {
  if (!livechatServiceInstance) {
    livechatServiceInstance = new LivechatService();
  }
  return livechatServiceInstance;
}

/**
 * Create a new livechat service instance (for testing)
 */
export function createLivechatService(): LivechatService {
  return new LivechatService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetLivechatService(): void {
  if (livechatServiceInstance) {
    livechatServiceInstance.clearAll();
  }
  livechatServiceInstance = null;
}

export default LivechatService;
