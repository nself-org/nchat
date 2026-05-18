/**
 * Ticket History Service
 *
 * Manages audit trail and history tracking for support tickets.
 * Provides:
 * - Event recording for all ticket changes
 * - Field change tracking
 * - Audit log queries
 * - History export
 *
 * @module services/tickets/ticket-history.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketHistoryEntry,
  TicketHistoryEventType,
  TicketFieldChange,
  TicketListResult,
  TicketListOptions,
} from "@/lib/tickets/ticket-types";

const log = createLogger("TicketHistoryService");

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const historyEntries = new Map<string, TicketHistoryEntry[]>(); // ticketId -> entries

// ============================================================================
// FIELD LABELS
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
  subject: "Subject",
  description: "Description",
  status: "Status",
  priority: "Priority",
  category: "Category",
  department: "Department",
  tags: "Tags",
  assignee: "Assignee",
  requester: "Requester",
  dueAt: "Due Date",
  customFields: "Custom Fields",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a value for display in history
 */
function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "(none)";
  }

  if (field === "status" && typeof value === "string") {
    return STATUS_LABELS[value as TicketStatus] || value;
  }

  if (field === "priority" && typeof value === "string") {
    return PRIORITY_LABELS[value as TicketPriority] || value;
  }

  if (field === "tags" && Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "(none)";
  }

  if (field === "dueAt" && value instanceof Date) {
    return value.toISOString();
  }

  if (field === "assignee" && typeof value === "object" && value !== null) {
    const assignee = value as { name?: string; email?: string };
    return assignee.name || assignee.email || "(unknown)";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Generate description for an event type
 */
function generateDescription(
  eventType: TicketHistoryEventType,
  actorName: string,
  changes?: TicketFieldChange[],
  metadata?: Record<string, unknown>,
): string {
  switch (eventType) {
    case "created":
      return `${actorName} created this ticket`;

    case "updated":
      if (changes && changes.length > 0) {
        const fieldNames = changes.map((c) => c.fieldLabel).join(", ");
        return `${actorName} updated ${fieldNames}`;
      }
      return `${actorName} updated this ticket`;

    case "status_changed":
      if (changes && changes.length > 0) {
        const change = changes[0];
        return `${actorName} changed status from ${formatValue("status", change.previousValue)} to ${formatValue("status", change.newValue)}`;
      }
      return `${actorName} changed the status`;

    case "priority_changed":
      if (changes && changes.length > 0) {
        const change = changes[0];
        return `${actorName} changed priority from ${formatValue("priority", change.previousValue)} to ${formatValue("priority", change.newValue)}`;
      }
      return `${actorName} changed the priority`;

    case "assigned":
      const assigneeName = metadata?.assigneeName || "an agent";
      return `${actorName} assigned this ticket to ${assigneeName}`;

    case "unassigned":
      return `${actorName} removed the assignee`;

    case "transferred":
      const fromDept = metadata?.fromDepartment || "unknown";
      const toDept = metadata?.toDepartment || "unknown";
      return `${actorName} transferred this ticket from ${fromDept} to ${toDept}`;

    case "escalated":
      const level = metadata?.level || "unknown";
      return `${actorName} escalated this ticket to level ${level}`;

    case "message_added":
      return `${actorName} added a message`;

    case "note_added":
      return `${actorName} added an internal note`;

    case "attachment_added":
      const fileName = metadata?.fileName || "a file";
      return `${actorName} attached ${fileName}`;

    case "tag_added":
      const addedTag = metadata?.tag || "a tag";
      return `${actorName} added tag: ${addedTag}`;

    case "tag_removed":
      const removedTag = metadata?.tag || "a tag";
      return `${actorName} removed tag: ${removedTag}`;

    case "sla_warning":
      const warningType = metadata?.type || "unknown";
      return `SLA warning: ${warningType} approaching deadline`;

    case "sla_breach":
      const breachType = metadata?.type || "unknown";
      return `SLA breach: ${breachType} deadline exceeded`;

    case "merged":
      const mergedFrom = (metadata?.sourceTickets as string[]) || [];
      return `${actorName} merged ${mergedFrom.length} ticket(s) into this ticket`;

    case "split":
      const newTickets = (metadata?.newTickets as string[]) || [];
      return `${actorName} split this ticket into ${newTickets.length} new ticket(s)`;

    case "linked":
      const linkedTicket = metadata?.linkedTicketNumber || "another ticket";
      return `${actorName} linked this ticket to ${linkedTicket}`;

    case "unlinked":
      const unlinkedTicket = metadata?.unlinkedTicketNumber || "another ticket";
      return `${actorName} unlinked this ticket from ${unlinkedTicket}`;

    default:
      return `${actorName} performed an action`;
  }
}

// ============================================================================
// TICKET HISTORY SERVICE CLASS
// ============================================================================

export class TicketHistoryService {
  // ==========================================================================
  // RECORDING EVENTS
  // ==========================================================================

  /**
   * Record a ticket creation event
   */
  async recordCreation(
    ticket: Ticket,
    actorId: string,
    actorName: string,
    actorType: "agent" | "customer" | "system" = "agent",
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId: ticket.id,
        eventType: "created",
        actorId,
        actorName,
        actorType,
        newValue: {
          subject: ticket.subject,
          priority: ticket.priority,
          category: ticket.category,
          status: ticket.status,
        },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record creation", error);
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
   * Record a ticket update event
   */
  async recordUpdate(
    ticketId: string,
    previousTicket: Partial<Ticket>,
    updatedTicket: Ticket,
    actorId: string,
    actorName: string,
    actorType: "agent" | "customer" | "system" = "agent",
  ): Promise<APIResponse<TicketHistoryEntry[]>> {
    try {
      const entries: TicketHistoryEntry[] = [];

      // Detect changes
      const fieldsToTrack = [
        "subject",
        "description",
        "status",
        "priority",
        "category",
        "department",
        "tags",
        "dueAt",
      ];

      const changes: TicketFieldChange[] = [];

      for (const field of fieldsToTrack) {
        const prev = (previousTicket as unknown as Record<string, unknown>)[
          field
        ];
        const curr = (updatedTicket as unknown as Record<string, unknown>)[
          field
        ];

        if (JSON.stringify(prev) !== JSON.stringify(curr)) {
          changes.push({
            field,
            fieldLabel: FIELD_LABELS[field] || field,
            previousValue: prev,
            newValue: curr,
          });
        }
      }

      if (changes.length === 0) {
        return { success: true, data: [] };
      }

      // Special handling for status changes
      const statusChange = changes.find((c) => c.field === "status");
      if (statusChange) {
        entries.push(
          this.createEntry({
            ticketId,
            eventType: "status_changed",
            actorId,
            actorName,
            actorType,
            changes: [statusChange],
            previousValue: statusChange.previousValue,
            newValue: statusChange.newValue,
          }),
        );
      }

      // Special handling for priority changes
      const priorityChange = changes.find((c) => c.field === "priority");
      if (priorityChange) {
        entries.push(
          this.createEntry({
            ticketId,
            eventType: "priority_changed",
            actorId,
            actorName,
            actorType,
            changes: [priorityChange],
            previousValue: priorityChange.previousValue,
            newValue: priorityChange.newValue,
          }),
        );
      }

      // Record other changes as a general update
      const otherChanges = changes.filter(
        (c) => c.field !== "status" && c.field !== "priority",
      );
      if (otherChanges.length > 0) {
        entries.push(
          this.createEntry({
            ticketId,
            eventType: "updated",
            actorId,
            actorName,
            actorType,
            changes: otherChanges,
          }),
        );
      }

      return {
        success: true,
        data: entries,
      };
    } catch (error) {
      log.error("Failed to record update", error);
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
   * Record an assignment event
   */
  async recordAssignment(
    ticketId: string,
    assigneeId: string,
    assigneeName: string,
    actorId: string,
    actorName: string,
    previousAssigneeId?: string,
    previousAssigneeName?: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "assigned",
        actorId,
        actorName,
        actorType: "agent",
        previousValue: previousAssigneeId
          ? { id: previousAssigneeId, name: previousAssigneeName }
          : undefined,
        newValue: { id: assigneeId, name: assigneeName },
        metadata: { assigneeName, previousAssigneeName },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record assignment", error);
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
   * Record an unassignment event
   */
  async recordUnassignment(
    ticketId: string,
    previousAssigneeId: string,
    previousAssigneeName: string,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "unassigned",
        actorId,
        actorName,
        actorType: "agent",
        previousValue: { id: previousAssigneeId, name: previousAssigneeName },
        metadata: { previousAssigneeName },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record unassignment", error);
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
   * Record an escalation event
   */
  async recordEscalation(
    ticketId: string,
    level: number,
    reason: string,
    actorId: string,
    actorName: string,
    autoEscalated: boolean = false,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "escalated",
        actorId,
        actorName,
        actorType: autoEscalated ? "system" : "agent",
        newValue: { level, reason },
        metadata: { level, reason, autoEscalated },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record escalation", error);
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
   * Record a message added event
   */
  async recordMessageAdded(
    ticketId: string,
    messageId: string,
    actorId: string,
    actorName: string,
    actorType: "agent" | "customer" | "system" = "agent",
    isInternal: boolean = false,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "message_added",
        actorId,
        actorName,
        actorType,
        metadata: { messageId, isInternal },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record message added", error);
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
   * Record a note added event
   */
  async recordNoteAdded(
    ticketId: string,
    noteId: string,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "note_added",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { noteId },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record note added", error);
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
   * Record an attachment added event
   */
  async recordAttachmentAdded(
    ticketId: string,
    attachmentId: string,
    fileName: string,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "attachment_added",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { attachmentId, fileName },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record attachment added", error);
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
   * Record tag changes
   */
  async recordTagChange(
    ticketId: string,
    tag: string,
    added: boolean,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: added ? "tag_added" : "tag_removed",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { tag },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record tag change", error);
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
   * Record SLA warning
   */
  async recordSLAWarning(
    ticketId: string,
    type: "first_response" | "next_response" | "resolution",
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "sla_warning",
        actorId: "system",
        actorName: "System",
        actorType: "system",
        metadata: { type },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record SLA warning", error);
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
   * Record SLA breach
   */
  async recordSLABreach(
    ticketId: string,
    type: "first_response" | "next_response" | "resolution",
    exceededBy: number,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "sla_breach",
        actorId: "system",
        actorName: "System",
        actorType: "system",
        metadata: { type, exceededBy },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record SLA breach", error);
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
   * Record merge event
   */
  async recordMerge(
    ticketId: string,
    sourceTicketNumbers: string[],
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "merged",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { sourceTickets: sourceTicketNumbers },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record merge", error);
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
   * Record split event
   */
  async recordSplit(
    ticketId: string,
    newTicketNumbers: string[],
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "split",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { newTickets: newTicketNumbers },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record split", error);
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
   * Record link event
   */
  async recordLink(
    ticketId: string,
    linkedTicketId: string,
    linkedTicketNumber: string,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "linked",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { linkedTicketId, linkedTicketNumber },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record link", error);
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
   * Record unlink event
   */
  async recordUnlink(
    ticketId: string,
    unlinkedTicketId: string,
    unlinkedTicketNumber: string,
    actorId: string,
    actorName: string,
  ): Promise<APIResponse<TicketHistoryEntry>> {
    try {
      const entry = this.createEntry({
        ticketId,
        eventType: "unlinked",
        actorId,
        actorName,
        actorType: "agent",
        metadata: { unlinkedTicketId, unlinkedTicketNumber },
      });

      return {
        success: true,
        data: entry,
      };
    } catch (error) {
      log.error("Failed to record unlink", error);
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
  // QUERYING HISTORY
  // ==========================================================================

  /**
   * Get history for a ticket
   */
  async getHistory(
    ticketId: string,
    options?: TicketListOptions & { eventTypes?: TicketHistoryEventType[] },
  ): Promise<APIResponse<TicketListResult<TicketHistoryEntry>>> {
    try {
      const { limit = 50, offset = 0, eventTypes } = options || {};

      let entries = historyEntries.get(ticketId) || [];

      if (eventTypes && eventTypes.length > 0) {
        entries = entries.filter((e) => eventTypes.includes(e.eventType));
      }

      // Sort by creation time desc
      entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = entries.length;
      const items = entries.slice(offset, offset + limit);

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
      log.error("Failed to get history", error);
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
   * Get history for multiple tickets
   */
  async getHistoryForTickets(
    ticketIds: string[],
    options?: TicketListOptions,
  ): Promise<APIResponse<TicketListResult<TicketHistoryEntry>>> {
    try {
      const { limit = 50, offset = 0 } = options || {};

      let allEntries: TicketHistoryEntry[] = [];
      for (const ticketId of ticketIds) {
        const entries = historyEntries.get(ticketId) || [];
        allEntries.push(...entries);
      }

      // Sort by creation time desc
      allEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = allEntries.length;
      const items = allEntries.slice(offset, offset + limit);

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
      log.error("Failed to get history for tickets", error);
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
   * Search history across all tickets
   */
  async searchHistory(options: {
    actorId?: string;
    eventTypes?: TicketHistoryEventType[];
    since?: Date;
    until?: Date;
    limit?: number;
    offset?: number;
  }): Promise<APIResponse<TicketListResult<TicketHistoryEntry>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        actorId,
        eventTypes,
        since,
        until,
      } = options;

      let allEntries: TicketHistoryEntry[] = [];
      for (const entries of historyEntries.values()) {
        allEntries.push(...entries);
      }

      // Apply filters
      if (actorId) {
        allEntries = allEntries.filter((e) => e.actorId === actorId);
      }

      if (eventTypes && eventTypes.length > 0) {
        allEntries = allEntries.filter((e) => eventTypes.includes(e.eventType));
      }

      if (since) {
        allEntries = allEntries.filter((e) => e.createdAt >= since);
      }

      if (until) {
        allEntries = allEntries.filter((e) => e.createdAt <= until);
      }

      // Sort by creation time desc
      allEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalCount = allEntries.length;
      const items = allEntries.slice(offset, offset + limit);

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
      log.error("Failed to search history", error);
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
   * Get activity summary for a ticket
   */
  async getActivitySummary(ticketId: string): Promise<
    APIResponse<{
      totalEvents: number;
      eventsByType: Record<TicketHistoryEventType, number>;
      uniqueActors: string[];
      firstActivity?: Date;
      lastActivity?: Date;
    }>
  > {
    try {
      const entries = historyEntries.get(ticketId) || [];

      const eventsByType: Partial<Record<TicketHistoryEventType, number>> = {};
      const actors = new Set<string>();

      for (const entry of entries) {
        eventsByType[entry.eventType] =
          (eventsByType[entry.eventType] || 0) + 1;
        actors.add(entry.actorId);
      }

      const sortedEntries = [...entries].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      return {
        success: true,
        data: {
          totalEvents: entries.length,
          eventsByType: eventsByType as Record<TicketHistoryEventType, number>,
          uniqueActors: Array.from(actors),
          firstActivity: sortedEntries[0]?.createdAt,
          lastActivity: sortedEntries[sortedEntries.length - 1]?.createdAt,
        },
      };
    } catch (error) {
      log.error("Failed to get activity summary", error);
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
   * Export history for a ticket
   */
  async exportHistory(
    ticketId: string,
    format: "json" | "csv" = "json",
  ): Promise<APIResponse<string>> {
    try {
      const entries = historyEntries.get(ticketId) || [];
      const sortedEntries = [...entries].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      if (format === "csv") {
        const headers = [
          "Timestamp",
          "Event",
          "Description",
          "Actor",
          "Actor Type",
        ];
        const rows = sortedEntries.map((e) => [
          e.createdAt.toISOString(),
          e.eventType,
          e.description,
          e.actorName,
          e.actorType,
        ]);

        const csv = [headers, ...rows]
          .map((row) =>
            row
              .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");

        return {
          success: true,
          data: csv,
        };
      }

      return {
        success: true,
        data: JSON.stringify(sortedEntries, null, 2),
      };
    } catch (error) {
      log.error("Failed to export history", error);
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
  // INTERNAL HELPERS
  // ==========================================================================

  /**
   * Create a history entry
   */
  private createEntry(params: {
    ticketId: string;
    eventType: TicketHistoryEventType;
    actorId: string;
    actorName: string;
    actorType: "agent" | "customer" | "system" | "bot";
    changes?: TicketFieldChange[];
    previousValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
  }): TicketHistoryEntry {
    const description = generateDescription(
      params.eventType,
      params.actorName,
      params.changes,
      params.metadata,
    );

    const entry: TicketHistoryEntry = {
      id: uuidv4(),
      ticketId: params.ticketId,
      eventType: params.eventType,
      description,
      changes: params.changes,
      previousValue: params.previousValue,
      newValue: params.newValue,
      actorId: params.actorId,
      actorName: params.actorName,
      actorType: params.actorType,
      metadata: params.metadata,
      createdAt: new Date(),
    };

    // Store entry
    const entries = historyEntries.get(params.ticketId) || [];
    entries.push(entry);
    historyEntries.set(params.ticketId, entries);

    log.debug("History entry created", {
      ticketId: params.ticketId,
      eventType: params.eventType,
      entryId: entry.id,
    });

    return entry;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear history for a ticket
   */
  async clearTicketHistory(
    ticketId: string,
  ): Promise<APIResponse<{ cleared: boolean }>> {
    try {
      historyEntries.delete(ticketId);

      return {
        success: true,
        data: { cleared: true },
      };
    } catch (error) {
      log.error("Failed to clear ticket history", error);
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
   * Clear all data (for testing)
   */
  clearAll(): void {
    historyEntries.clear();
    log.debug("History service cleared");
  }

  /**
   * Get counts (for debugging)
   */
  getCounts(): { tickets: number; entries: number } {
    let entryCount = 0;
    for (const entries of historyEntries.values()) {
      entryCount += entries.length;
    }
    return {
      tickets: historyEntries.size,
      entries: entryCount,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let historyServiceInstance: TicketHistoryService | null = null;

/**
 * Get or create the history service singleton
 */
export function getTicketHistoryService(): TicketHistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new TicketHistoryService();
  }
  return historyServiceInstance;
}

/**
 * Create a new history service instance (for testing)
 */
export function createTicketHistoryService(): TicketHistoryService {
  return new TicketHistoryService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTicketHistoryService(): void {
  if (historyServiceInstance) {
    historyServiceInstance.clearAll();
  }
  historyServiceInstance = null;
}

export default TicketHistoryService;
