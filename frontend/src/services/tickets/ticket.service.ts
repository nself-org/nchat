/**
 * Ticket Service
 *
 * Core service for ticket CRUD operations and lifecycle management.
 * Provides complete ticket management functionality including:
 * - Ticket creation (from scratch or from live conversations)
 * - Status transitions
 * - Assignment management
 * - Message and note handling
 * - Priority-based queuing
 *
 * @module services/tickets/ticket.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSource,
  TicketRequester,
  TicketAssignee,
  TicketAssignment,
  TicketMessage,
  TicketNote,
  TicketAttachment,
  TicketMetrics,
  TicketQueueEntry,
  TicketQueueStats,
  TicketListResult,
  TicketListOptions,
  TicketSearchOptions,
  TicketEvent,
  TicketEventType,
  CreateTicketInput,
  CreateTicketFromConversationInput,
  UpdateTicketInput,
  AddTicketMessageInput,
  AddTicketNoteInput,
  MergeTicketsInput,
  SplitTicketInput,
} from "@/lib/tickets/ticket-types";
import { getLivechatService } from "@/services/livechat";

const log = createLogger("TicketService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const tickets = new Map<string, Ticket>();
const ticketsByNumber = new Map<string, string>(); // ticketNumber -> ticketId
let ticketCounter = 0;

// Event listeners for real-time updates
type TicketEventListener = (event: TicketEvent) => void;
const eventListeners: TicketEventListener[] = [];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ticket number
 */
function generateTicketNumber(): string {
  ticketCounter++;
  const year = new Date().getFullYear();
  const paddedNumber = String(ticketCounter).padStart(5, "0");
  return `TKT-${year}-${paddedNumber}`;
}

/**
 * Emit a ticket event
 */
function emitEvent<T>(
  type: TicketEventType,
  ticketId: string,
  ticketNumber: string,
  data: T,
): void {
  const event: TicketEvent<T> = {
    type,
    ticketId,
    ticketNumber,
    data,
    timestamp: new Date(),
  };

  log.debug("Emitting ticket event", { type, ticketId, ticketNumber });

  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (error) {
      log.error("Error in ticket event listener", error);
    }
  }
}

/**
 * Get priority weight for sorting
 */
function getPriorityWeight(priority: TicketPriority): number {
  const weights: Record<TicketPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return weights[priority] || 2;
}

/**
 * Create initial metrics object
 */
function createInitialMetrics(): TicketMetrics {
  return {
    messagesCount: 0,
    agentMessagesCount: 0,
    customerMessagesCount: 0,
    notesCount: 0,
    attachmentsCount: 0,
    reopenCount: 0,
    transferCount: 0,
    escalationCount: 0,
  };
}

/**
 * Validate status transition
 */
function isValidStatusTransition(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    open: ["pending", "in_progress", "on_hold", "resolved", "closed"],
    pending: ["open", "in_progress", "on_hold", "resolved", "closed"],
    in_progress: ["pending", "on_hold", "resolved", "closed"],
    on_hold: ["open", "pending", "in_progress", "resolved", "closed"],
    resolved: ["open", "closed"], // Can reopen or close
    closed: ["open"], // Can only reopen
  };
  return validTransitions[from]?.includes(to) ?? false;
}

// ============================================================================
// TICKET SERVICE CLASS
// ============================================================================

export class TicketService {
  private livechatService = getLivechatService();

  // ==========================================================================
  // TICKET CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new ticket
   */
  async createTicket(
    input: CreateTicketInput,
    createdBy: string,
  ): Promise<APIResponse<Ticket>> {
    try {
      log.debug("Creating ticket", {
        subject: input.subject,
        source: input.source,
      });

      const id = uuidv4();
      const ticketNumber = generateTicketNumber();
      const now = new Date();

      // Build requester
      const requester: TicketRequester = {
        id: input.requester.id || uuidv4(),
        name: input.requester.name,
        email: input.requester.email,
        phone: input.requester.phone,
        customerId: input.requester.customerId,
        organization: input.requester.organization,
        metadata: input.requester.metadata || {},
      };

      // Build assignee if specified
      let assignee: TicketAssignee | undefined;
      const assigneeHistory: TicketAssignment[] = [];

      if (input.assigneeId) {
        const agentResult = await this.livechatService.getAgent(
          input.assigneeId,
        );
        if (agentResult.success && agentResult.data) {
          const agent = agentResult.data;
          assignee = {
            id: uuidv4(),
            agentId: agent.id,
            name: agent.displayName,
            email: agent.email,
            avatarUrl: agent.avatarUrl,
            department: agent.departments[0],
          };

          assigneeHistory.push({
            id: uuidv4(),
            agentId: agent.id,
            agentName: agent.displayName,
            assignedAt: now,
            assignedBy: createdBy,
          });
        }
      }

      const ticket: Ticket = {
        id,
        ticketNumber,
        subject: input.subject,
        description: input.description,
        status: "open",
        priority: input.priority || "medium",
        category: input.category || "general",
        source: input.source || "web_form",
        channel: input.channel,
        department: input.department,
        tags: input.tags || [],
        requester,
        assignee,
        assigneeHistory,
        sourceConversationId: input.sourceConversationId,
        relatedTicketIds: [],
        childTicketIds: [],
        customFields: input.customFields || {},
        internalNotes: [],
        messages: [],
        attachments: [],
        metrics: createInitialMetrics(),
        dueAt: input.dueAt,
        createdAt: now,
        updatedAt: now,
        createdBy,
        updatedBy: createdBy,
      };

      // Handle parent ticket
      if (input.parentTicketId) {
        const parentTicket = tickets.get(input.parentTicketId);
        if (parentTicket) {
          ticket.parentTicketId = input.parentTicketId;
          parentTicket.childTicketIds.push(id);
          tickets.set(input.parentTicketId, parentTicket);
        }
      }

      tickets.set(id, ticket);
      ticketsByNumber.set(ticketNumber, id);

      emitEvent("ticket.created", id, ticketNumber, ticket);

      log.info("Ticket created", { id, ticketNumber, subject: input.subject });

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      log.error("Failed to create ticket", error);
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
   * Create a ticket from a live chat conversation
   */
  async createTicketFromConversation(
    input: CreateTicketFromConversationInput,
    createdBy: string,
  ): Promise<APIResponse<Ticket>> {
    try {
      log.debug("Creating ticket from conversation", {
        conversationId: input.conversationId,
      });

      const conversationResult = await this.livechatService.getConversation(
        input.conversationId,
      );
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

      // Get messages from conversation
      const messagesResult = await this.livechatService.getMessages(
        input.conversationId,
        { limit: 100 },
      );
      const conversationMessages = messagesResult.data?.items || [];

      // Build subject from first message or input
      const subject =
        input.subject ||
        `Support request from ${conversation.visitor.name || conversation.visitor.email || "Customer"}`;

      // Build description from messages or input
      let description = input.description || "";
      if (!description && conversationMessages.length > 0) {
        description = conversationMessages
          .filter((m) => m.senderType === "visitor")
          .slice(0, 3)
          .map((m) => m.content)
          .join("\n\n");
      }

      // Create ticket input
      const ticketInput: CreateTicketInput = {
        subject,
        description,
        priority: input.priority || conversation.priority,
        category: input.category || "general",
        source: "livechat",
        channel: conversation.channel,
        department: input.department || conversation.department,
        tags: input.tags,
        requester: {
          id: conversation.visitor.id,
          name: conversation.visitor.name,
          email: conversation.visitor.email,
          phone: conversation.visitor.phone,
          metadata: conversation.visitor.metadata,
        },
        assigneeId: input.assigneeId || conversation.agent?.id,
        sourceConversationId: input.conversationId,
        customFields: input.customFields,
      };

      // Create the ticket
      const ticketResult = await this.createTicket(ticketInput, createdBy);
      if (!ticketResult.success || !ticketResult.data) {
        return ticketResult;
      }

      const ticket = ticketResult.data;

      // Import messages from conversation
      for (const msg of conversationMessages) {
        const ticketMessage: TicketMessage = {
          id: uuidv4(),
          content: msg.content,
          contentHtml: msg.contentHtml,
          senderType:
            msg.senderType === "visitor"
              ? "customer"
              : msg.senderType === "agent"
                ? "agent"
                : "system",
          senderId: msg.senderId,
          senderName:
            msg.senderType === "visitor"
              ? conversation.visitor.name || "Customer"
              : "Agent",
          attachments: (msg.attachments || []).map((a) => ({
            id: a.id,
            name: a.name,
            url: a.url,
            size: a.size,
            mimeType: a.mimeType,
            thumbnailUrl: a.thumbnailUrl,
            uploadedBy: msg.senderId,
            uploadedAt: msg.createdAt,
          })),
          isInternal: msg.isInternal,
          metadata: msg.metadata,
          createdAt: msg.createdAt,
        };
        ticket.messages.push(ticketMessage);
      }

      // Update metrics
      ticket.metrics.messagesCount = ticket.messages.length;
      ticket.metrics.customerMessagesCount = ticket.messages.filter(
        (m) => m.senderType === "customer",
      ).length;
      ticket.metrics.agentMessagesCount = ticket.messages.filter(
        (m) => m.senderType === "agent",
      ).length;

      tickets.set(ticket.id, ticket);

      log.info("Ticket created from conversation", {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        conversationId: input.conversationId,
      });

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      log.error("Failed to create ticket from conversation", error);
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
   * Get a ticket by ID
   */
  async getTicket(id: string): Promise<APIResponse<Ticket | null>> {
    try {
      const ticket = tickets.get(id);
      return {
        success: true,
        data: ticket || null,
      };
    } catch (error) {
      log.error("Failed to get ticket", error);
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
   * Get a ticket by ticket number
   */
  async getTicketByNumber(
    ticketNumber: string,
  ): Promise<APIResponse<Ticket | null>> {
    try {
      const ticketId = ticketsByNumber.get(ticketNumber);
      if (!ticketId) {
        return { success: true, data: null };
      }
      return this.getTicket(ticketId);
    } catch (error) {
      log.error("Failed to get ticket by number", error);
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
   * Update a ticket
   */
  async updateTicket(
    id: string,
    input: UpdateTicketInput,
    updatedBy: string,
  ): Promise<APIResponse<Ticket>> {
    try {
      const ticket = tickets.get(id);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const now = new Date();
      const oldStatus = ticket.status;
      const oldPriority = ticket.priority;

      // Validate status transition if changing
      if (input.status && input.status !== oldStatus) {
        if (!isValidStatusTransition(oldStatus, input.status)) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              status: 400,
              message: `Invalid status transition from ${oldStatus} to ${input.status}`,
            },
          };
        }
      }

      // Handle assignee change
      if (input.assigneeId !== undefined) {
        if (input.assigneeId === null) {
          // Unassign
          if (ticket.assignee) {
            const lastAssignment =
              ticket.assigneeHistory[ticket.assigneeHistory.length - 1];
            if (lastAssignment) {
              lastAssignment.unassignedAt = now;
            }
            ticket.assignee = undefined;
          }
        } else if (input.assigneeId !== ticket.assignee?.agentId) {
          // New assignment
          const agentResult = await this.livechatService.getAgent(
            input.assigneeId,
          );
          if (agentResult.success && agentResult.data) {
            const agent = agentResult.data;

            // Close previous assignment
            if (ticket.assignee) {
              const lastAssignment =
                ticket.assigneeHistory[ticket.assigneeHistory.length - 1];
              if (lastAssignment) {
                lastAssignment.unassignedAt = now;
              }
              ticket.metrics.transferCount++;
            }

            // Create new assignment
            ticket.assignee = {
              id: uuidv4(),
              agentId: agent.id,
              name: agent.displayName,
              email: agent.email,
              avatarUrl: agent.avatarUrl,
              department: agent.departments[0],
            };

            ticket.assigneeHistory.push({
              id: uuidv4(),
              agentId: agent.id,
              agentName: agent.displayName,
              assignedAt: now,
              assignedBy: updatedBy,
            });

            emitEvent("ticket.assigned", id, ticket.ticketNumber, {
              ticket,
              assignee: ticket.assignee,
            });
          }
        }
      }

      // Apply updates
      if (input.subject !== undefined) ticket.subject = input.subject;
      if (input.description !== undefined)
        ticket.description = input.description;
      if (input.status !== undefined) ticket.status = input.status;
      if (input.priority !== undefined) ticket.priority = input.priority;
      if (input.category !== undefined) ticket.category = input.category;
      if (input.department !== undefined) ticket.department = input.department;
      if (input.tags !== undefined) ticket.tags = input.tags;
      if (input.customFields !== undefined) {
        ticket.customFields = { ...ticket.customFields, ...input.customFields };
      }
      if (input.dueAt !== undefined) {
        ticket.dueAt = input.dueAt || undefined;
      }

      ticket.updatedAt = now;
      ticket.updatedBy = updatedBy;

      // Handle status changes
      if (input.status && input.status !== oldStatus) {
        if (input.status === "resolved") {
          ticket.resolvedAt = now;
          if (ticket.createdAt) {
            ticket.metrics.resolutionTime = Math.round(
              (now.getTime() - ticket.createdAt.getTime()) / 1000,
            );
          }
          emitEvent("ticket.resolved", id, ticket.ticketNumber, ticket);
        } else if (input.status === "closed") {
          ticket.closedAt = now;
          emitEvent("ticket.closed", id, ticket.ticketNumber, ticket);
        } else if (oldStatus === "resolved" || oldStatus === "closed") {
          // Reopened
          ticket.metrics.reopenCount++;
          ticket.resolvedAt = undefined;
          ticket.closedAt = undefined;
          emitEvent("ticket.reopened", id, ticket.ticketNumber, ticket);
        }
      }

      tickets.set(id, ticket);

      emitEvent("ticket.updated", id, ticket.ticketNumber, {
        ticket,
        changes: {
          status:
            oldStatus !== ticket.status
              ? { from: oldStatus, to: ticket.status }
              : undefined,
          priority:
            oldPriority !== ticket.priority
              ? { from: oldPriority, to: ticket.priority }
              : undefined,
        },
      });

      log.info("Ticket updated", { id, ticketNumber: ticket.ticketNumber });

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      log.error("Failed to update ticket", error);
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
   * Delete a ticket
   */
  async deleteTicket(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const ticket = tickets.get(id);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      // Remove from parent if exists
      if (ticket.parentTicketId) {
        const parentTicket = tickets.get(ticket.parentTicketId);
        if (parentTicket) {
          parentTicket.childTicketIds = parentTicket.childTicketIds.filter(
            (cid) => cid !== id,
          );
          tickets.set(ticket.parentTicketId, parentTicket);
        }
      }

      // Remove from related tickets
      for (const relatedId of ticket.relatedTicketIds) {
        const relatedTicket = tickets.get(relatedId);
        if (relatedTicket) {
          relatedTicket.relatedTicketIds =
            relatedTicket.relatedTicketIds.filter((rid) => rid !== id);
          tickets.set(relatedId, relatedTicket);
        }
      }

      tickets.delete(id);
      ticketsByNumber.delete(ticket.ticketNumber);

      log.info("Ticket deleted", { id, ticketNumber: ticket.ticketNumber });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete ticket", error);
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
   * Add a message to a ticket
   */
  async addMessage(
    ticketId: string,
    input: AddTicketMessageInput,
  ): Promise<APIResponse<TicketMessage>> {
    try {
      const ticket = tickets.get(ticketId);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const now = new Date();

      const message: TicketMessage = {
        id: uuidv4(),
        content: input.content,
        senderType: input.senderType,
        senderId: input.senderId,
        senderName: input.senderName,
        attachments: (input.attachments || []).map((a) => ({
          ...a,
          id: uuidv4(),
          uploadedAt: now,
        })),
        isInternal: input.isInternal || false,
        metadata: input.metadata,
        createdAt: now,
      };

      ticket.messages.push(message);
      ticket.metrics.messagesCount++;

      if (input.senderType === "agent") {
        ticket.metrics.agentMessagesCount++;
        ticket.lastAgentResponseAt = now;

        // Track first response
        if (!ticket.firstResponseAt) {
          ticket.firstResponseAt = now;
          ticket.metrics.firstResponseTime = Math.round(
            (now.getTime() - ticket.createdAt.getTime()) / 1000,
          );
        }
      } else if (input.senderType === "customer") {
        ticket.metrics.customerMessagesCount++;
        ticket.lastCustomerContactAt = now;
      }

      ticket.updatedAt = now;
      tickets.set(ticketId, ticket);

      emitEvent("ticket.message_added", ticketId, ticket.ticketNumber, {
        ticket,
        message,
      });

      log.debug("Message added to ticket", { ticketId, messageId: message.id });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      log.error("Failed to add message", error);
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
   * Get messages for a ticket
   */
  async getMessages(
    ticketId: string,
    options?: { includeInternal?: boolean },
  ): Promise<APIResponse<TicketMessage[]>> {
    try {
      const ticket = tickets.get(ticketId);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      let messages = [...ticket.messages];

      if (!options?.includeInternal) {
        messages = messages.filter((m) => !m.isInternal);
      }

      // Sort by creation time
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return {
        success: true,
        data: messages,
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

  // ==========================================================================
  // NOTE OPERATIONS
  // ==========================================================================

  /**
   * Add an internal note to a ticket
   */
  async addNote(
    ticketId: string,
    input: AddTicketNoteInput,
  ): Promise<APIResponse<TicketNote>> {
    try {
      const ticket = tickets.get(ticketId);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const now = new Date();

      const note: TicketNote = {
        id: uuidv4(),
        content: input.content,
        createdBy: input.createdBy,
        createdByName: input.createdByName,
        createdAt: now,
        mentions: input.mentions || [],
      };

      ticket.internalNotes.push(note);
      ticket.metrics.notesCount++;
      ticket.updatedAt = now;

      tickets.set(ticketId, ticket);

      emitEvent("ticket.note_added", ticketId, ticket.ticketNumber, {
        ticket,
        note,
      });

      log.debug("Note added to ticket", { ticketId, noteId: note.id });

      return {
        success: true,
        data: note,
      };
    } catch (error) {
      log.error("Failed to add note", error);
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
   * Get notes for a ticket
   */
  async getNotes(ticketId: string): Promise<APIResponse<TicketNote[]>> {
    try {
      const ticket = tickets.get(ticketId);
      if (!ticket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const notes = [...ticket.internalNotes].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      return {
        success: true,
        data: notes,
      };
    } catch (error) {
      log.error("Failed to get notes", error);
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
  // LISTING AND SEARCH
  // ==========================================================================

  /**
   * List tickets with filters
   */
  async listTickets(
    options: TicketListOptions & TicketSearchOptions,
  ): Promise<APIResponse<TicketListResult<Ticket>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
        ...filters
      } = options;

      let results = Array.from(tickets.values());

      // Apply filters
      if (filters.query) {
        const query = filters.query.toLowerCase();
        results = results.filter(
          (t) =>
            t.subject.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.ticketNumber.toLowerCase().includes(query),
        );
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        results = results.filter((t) => statuses.includes(t.status));
      }

      if (filters.priority) {
        const priorities = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        results = results.filter((t) => priorities.includes(t.priority));
      }

      if (filters.category) {
        const categories = Array.isArray(filters.category)
          ? filters.category
          : [filters.category];
        results = results.filter((t) => categories.includes(t.category));
      }

      if (filters.source) {
        const sources = Array.isArray(filters.source)
          ? filters.source
          : [filters.source];
        results = results.filter((t) => sources.includes(t.source));
      }

      if (filters.department) {
        results = results.filter((t) => t.department === filters.department);
      }

      if (filters.assigneeId) {
        results = results.filter(
          (t) => t.assignee?.agentId === filters.assigneeId,
        );
      }

      if (filters.requesterId) {
        results = results.filter((t) => t.requester.id === filters.requesterId);
      }

      if (filters.tags && filters.tags.length > 0) {
        results = results.filter((t) =>
          filters.tags!.some((tag) => t.tags.includes(tag)),
        );
      }

      if (filters.createdAfter) {
        results = results.filter((t) => t.createdAt >= filters.createdAfter!);
      }

      if (filters.createdBefore) {
        results = results.filter((t) => t.createdAt <= filters.createdBefore!);
      }

      if (filters.unassigned) {
        results = results.filter((t) => !t.assignee);
      }

      if (filters.escalated) {
        results = results.filter((t) => !!t.escalation);
      }

      if (filters.slaBreached) {
        results = results.filter((t) => t.sla && t.sla.breaches.length > 0);
      }

      // Sort
      results.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "createdAt":
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case "updatedAt":
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case "priority":
            comparison =
              getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "dueAt":
            if (!a.dueAt && !b.dueAt) comparison = 0;
            else if (!a.dueAt) comparison = 1;
            else if (!b.dueAt) comparison = -1;
            else comparison = a.dueAt.getTime() - b.dueAt.getTime();
            break;
        }

        return sortOrder === "asc" ? comparison : -comparison;
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
      log.error("Failed to list tickets", error);
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
   * Get ticket queue
   */
  async getQueue(
    department?: string,
  ): Promise<APIResponse<TicketQueueEntry[]>> {
    try {
      const openStatuses: TicketStatus[] = [
        "open",
        "pending",
        "in_progress",
        "on_hold",
      ];

      let queueTickets = Array.from(tickets.values()).filter((t) =>
        openStatuses.includes(t.status),
      );

      if (department) {
        queueTickets = queueTickets.filter((t) => t.department === department);
      }

      // Sort by priority (desc) then by created time (asc)
      queueTickets.sort((a, b) => {
        const priorityDiff =
          getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const queueEntries: TicketQueueEntry[] = queueTickets.map(
        (ticket, index) => ({
          id: uuidv4(),
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority,
          status: ticket.status,
          department: ticket.department,
          requesterName: ticket.requester.name,
          assigneeName: ticket.assignee?.name,
          slaStatus: ticket.sla
            ? ticket.sla.breaches.length > 0
              ? "breached"
              : ticket.sla.firstResponseDue &&
                  new Date() > new Date(ticket.sla.firstResponseDue)
                ? "warning"
                : "ok"
            : undefined,
          waitingSince: ticket.createdAt,
          position: index + 1,
        }),
      );

      return {
        success: true,
        data: queueEntries,
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
  async getQueueStats(
    department?: string,
  ): Promise<APIResponse<TicketQueueStats>> {
    try {
      let relevantTickets = Array.from(tickets.values());

      if (department) {
        relevantTickets = relevantTickets.filter(
          (t) => t.department === department,
        );
      }

      const openStatuses: TicketStatus[] = [
        "open",
        "pending",
        "in_progress",
        "on_hold",
      ];
      const openTickets = relevantTickets.filter((t) =>
        openStatuses.includes(t.status),
      );

      // Calculate stats
      const totalOpen = relevantTickets.filter(
        (t) => t.status === "open",
      ).length;
      const totalPending = relevantTickets.filter(
        (t) => t.status === "pending",
      ).length;
      const totalInProgress = relevantTickets.filter(
        (t) => t.status === "in_progress",
      ).length;
      const totalOnHold = relevantTickets.filter(
        (t) => t.status === "on_hold",
      ).length;
      const totalUnassigned = openTickets.filter((t) => !t.assignee).length;

      // Calculate average wait time
      const now = Date.now();
      const waitTimes = openTickets.map(
        (t) => (now - t.createdAt.getTime()) / 1000,
      );
      const averageWaitTime =
        waitTimes.length > 0
          ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
          : 0;

      // Calculate average resolution time
      const resolvedTickets = relevantTickets.filter(
        (t) =>
          (t.status === "resolved" || t.status === "closed") &&
          t.metrics.resolutionTime,
      );
      const resolutionTimes = resolvedTickets.map(
        (t) => t.metrics.resolutionTime!,
      );
      const averageResolutionTime =
        resolutionTimes.length > 0
          ? Math.round(
              resolutionTimes.reduce((a, b) => a + b, 0) /
                resolutionTimes.length,
            )
          : 0;

      // Calculate SLA compliance
      const ticketsWithSLA = relevantTickets.filter((t) => t.sla);
      const ticketsWithinSLA = ticketsWithSLA.filter(
        (t) => t.sla!.breaches.length === 0,
      );
      const slaCompliance =
        ticketsWithSLA.length > 0
          ? Math.round((ticketsWithinSLA.length / ticketsWithSLA.length) * 100)
          : 100;

      // Count by priority
      const byPriority: Record<TicketPriority, number> = {
        urgent: openTickets.filter((t) => t.priority === "urgent").length,
        high: openTickets.filter((t) => t.priority === "high").length,
        medium: openTickets.filter((t) => t.priority === "medium").length,
        low: openTickets.filter((t) => t.priority === "low").length,
      };

      // Count by category
      const byCategory: Record<TicketCategory, number> = {
        general: 0,
        technical: 0,
        billing: 0,
        account: 0,
        feature_request: 0,
        bug_report: 0,
        complaint: 0,
        feedback: 0,
        other: 0,
      };
      for (const ticket of openTickets) {
        byCategory[ticket.category]++;
      }

      const stats: TicketQueueStats = {
        department,
        totalOpen,
        totalPending,
        totalInProgress,
        totalOnHold,
        totalUnassigned,
        averageWaitTime,
        averageResolutionTime,
        slaCompliance,
        byPriority,
        byCategory,
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

  // ==========================================================================
  // MERGE AND SPLIT
  // ==========================================================================

  /**
   * Merge multiple tickets into one
   */
  async mergeTickets(input: MergeTicketsInput): Promise<APIResponse<Ticket>> {
    try {
      const targetTicket = tickets.get(input.targetTicketId);
      if (!targetTicket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Target ticket not found",
          },
        };
      }

      const now = new Date();

      for (const sourceId of input.sourceTicketIds) {
        const sourceTicket = tickets.get(sourceId);
        if (!sourceTicket) continue;

        // Merge messages
        for (const message of sourceTicket.messages) {
          targetTicket.messages.push({
            ...message,
            metadata: {
              ...message.metadata,
              mergedFrom: sourceTicket.ticketNumber,
            },
          });
        }

        // Merge notes
        for (const note of sourceTicket.internalNotes) {
          targetTicket.internalNotes.push({
            ...note,
            content: `[Merged from ${sourceTicket.ticketNumber}] ${note.content}`,
          });
        }

        // Merge attachments
        targetTicket.attachments.push(...sourceTicket.attachments);

        // Add merge note
        targetTicket.internalNotes.push({
          id: uuidv4(),
          content: `Ticket ${sourceTicket.ticketNumber} was merged into this ticket. Reason: ${input.reason || "Not specified"}`,
          createdBy: input.mergedBy,
          createdByName: "System",
          createdAt: now,
          mentions: [],
        });

        // Add to related tickets
        if (!targetTicket.relatedTicketIds.includes(sourceId)) {
          targetTicket.relatedTicketIds.push(sourceId);
        }

        // Close source ticket
        sourceTicket.status = "closed";
        sourceTicket.closedAt = now;
        sourceTicket.internalNotes.push({
          id: uuidv4(),
          content: `This ticket was merged into ${targetTicket.ticketNumber}`,
          createdBy: input.mergedBy,
          createdByName: "System",
          createdAt: now,
          mentions: [],
        });

        tickets.set(sourceId, sourceTicket);
      }

      // Update metrics
      targetTicket.metrics.messagesCount = targetTicket.messages.length;
      targetTicket.metrics.notesCount = targetTicket.internalNotes.length;
      targetTicket.metrics.attachmentsCount = targetTicket.attachments.length;
      targetTicket.updatedAt = now;
      targetTicket.updatedBy = input.mergedBy;

      tickets.set(input.targetTicketId, targetTicket);

      log.info("Tickets merged", {
        targetTicket: targetTicket.ticketNumber,
        sourceTickets: input.sourceTicketIds.length,
      });

      return {
        success: true,
        data: targetTicket,
      };
    } catch (error) {
      log.error("Failed to merge tickets", error);
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
   * Split a ticket into multiple tickets
   */
  async splitTicket(input: SplitTicketInput): Promise<APIResponse<Ticket[]>> {
    try {
      const parentTicket = tickets.get(input.ticketId);
      if (!parentTicket) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Ticket not found",
          },
        };
      }

      const now = new Date();
      const newTickets: Ticket[] = [];

      for (const newTicketInput of input.newTickets) {
        const result = await this.createTicket(
          {
            subject: newTicketInput.subject,
            description: newTicketInput.description,
            priority: newTicketInput.priority || parentTicket.priority,
            category: newTicketInput.category || parentTicket.category,
            source: parentTicket.source,
            channel: parentTicket.channel,
            department: parentTicket.department,
            requester: parentTicket.requester,
            assigneeId: newTicketInput.assigneeId,
            parentTicketId: parentTicket.id,
          },
          input.splitBy,
        );

        if (result.success && result.data) {
          newTickets.push(result.data);
        }
      }

      // Add split note to parent
      parentTicket.internalNotes.push({
        id: uuidv4(),
        content: `This ticket was split into ${newTickets.length} new tickets: ${newTickets.map((t) => t.ticketNumber).join(", ")}. Reason: ${input.reason || "Not specified"}`,
        createdBy: input.splitBy,
        createdByName: "System",
        createdAt: now,
        mentions: [],
      });

      parentTicket.updatedAt = now;
      parentTicket.updatedBy = input.splitBy;

      tickets.set(input.ticketId, parentTicket);

      log.info("Ticket split", {
        parentTicket: parentTicket.ticketNumber,
        newTickets: newTickets.map((t) => t.ticketNumber),
      });

      return {
        success: true,
        data: newTickets,
      };
    } catch (error) {
      log.error("Failed to split ticket", error);
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
  // RELATIONSHIP MANAGEMENT
  // ==========================================================================

  /**
   * Link two tickets as related
   */
  async linkTickets(
    ticketId1: string,
    ticketId2: string,
  ): Promise<APIResponse<{ linked: boolean }>> {
    try {
      const ticket1 = tickets.get(ticketId1);
      const ticket2 = tickets.get(ticketId2);

      if (!ticket1 || !ticket2) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "One or both tickets not found",
          },
        };
      }

      if (!ticket1.relatedTicketIds.includes(ticketId2)) {
        ticket1.relatedTicketIds.push(ticketId2);
      }

      if (!ticket2.relatedTicketIds.includes(ticketId1)) {
        ticket2.relatedTicketIds.push(ticketId1);
      }

      tickets.set(ticketId1, ticket1);
      tickets.set(ticketId2, ticket2);

      log.debug("Tickets linked", { ticketId1, ticketId2 });

      return {
        success: true,
        data: { linked: true },
      };
    } catch (error) {
      log.error("Failed to link tickets", error);
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
   * Unlink two related tickets
   */
  async unlinkTickets(
    ticketId1: string,
    ticketId2: string,
  ): Promise<APIResponse<{ unlinked: boolean }>> {
    try {
      const ticket1 = tickets.get(ticketId1);
      const ticket2 = tickets.get(ticketId2);

      if (!ticket1 || !ticket2) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "One or both tickets not found",
          },
        };
      }

      ticket1.relatedTicketIds = ticket1.relatedTicketIds.filter(
        (id) => id !== ticketId2,
      );
      ticket2.relatedTicketIds = ticket2.relatedTicketIds.filter(
        (id) => id !== ticketId1,
      );

      tickets.set(ticketId1, ticket1);
      tickets.set(ticketId2, ticket2);

      log.debug("Tickets unlinked", { ticketId1, ticketId2 });

      return {
        success: true,
        data: { unlinked: true },
      };
    } catch (error) {
      log.error("Failed to unlink tickets", error);
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
   * Subscribe to ticket events
   */
  subscribe(listener: TicketEventListener): () => void {
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
    tickets.clear();
    ticketsByNumber.clear();
    ticketCounter = 0;
    log.debug("All ticket data cleared");
  }

  /**
   * Get store sizes (for debugging)
   */
  getStoreSizes(): { tickets: number } {
    return {
      tickets: tickets.size,
    };
  }

  /**
   * Get all tickets (for internal use)
   */
  getAllTickets(): Ticket[] {
    return Array.from(tickets.values());
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let ticketServiceInstance: TicketService | null = null;

/**
 * Get or create the ticket service singleton
 */
export function getTicketService(): TicketService {
  if (!ticketServiceInstance) {
    ticketServiceInstance = new TicketService();
  }
  return ticketServiceInstance;
}

/**
 * Create a new ticket service instance (for testing)
 */
export function createTicketService(): TicketService {
  return new TicketService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTicketService(): void {
  if (ticketServiceInstance) {
    ticketServiceInstance.clearAll();
  }
  ticketServiceInstance = null;
}

export default TicketService;
