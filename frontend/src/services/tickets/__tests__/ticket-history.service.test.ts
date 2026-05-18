/**
 * Ticket History Service Tests
 *
 * Comprehensive test suite for the ticket history service.
 */

import {
  TicketHistoryService,
  getTicketHistoryService,
  resetTicketHistoryService,
} from "../ticket-history.service";
import type {
  Ticket,
  TicketHistoryEventType,
} from "@/lib/tickets/ticket-types";

describe("TicketHistoryService", () => {
  let service: TicketHistoryService;

  const mockTicket: Ticket = {
    id: "ticket-1",
    ticketNumber: "TKT-2024-00001",
    subject: "Test Ticket",
    description: "Test description",
    status: "open",
    priority: "medium",
    category: "general",
    source: "web_form",
    tags: [],
    requester: {
      id: "requester-1",
      email: "test@example.com",
      metadata: {},
    },
    assigneeHistory: [],
    relatedTicketIds: [],
    childTicketIds: [],
    customFields: {},
    internalNotes: [],
    messages: [],
    attachments: [],
    metrics: {
      messagesCount: 0,
      agentMessagesCount: 0,
      customerMessagesCount: 0,
      notesCount: 0,
      attachmentsCount: 0,
      reopenCount: 0,
      transferCount: 0,
      escalationCount: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "agent-1",
    updatedBy: "agent-1",
  };

  beforeEach(() => {
    resetTicketHistoryService();
    service = getTicketHistoryService();
  });

  afterEach(() => {
    service.clearAll();
    resetTicketHistoryService();
  });

  describe("recordCreation", () => {
    it("should record ticket creation", async () => {
      const result = await service.recordCreation(
        mockTicket,
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.eventType).toBe("created");
      expect(result.data!.actorName).toBe("Agent One");
      expect(result.data!.description).toContain("created this ticket");
    });

    it("should set correct actor type", async () => {
      const result = await service.recordCreation(
        mockTicket,
        "system",
        "System",
        "system",
      );

      expect(result.data!.actorType).toBe("system");
    });
  });

  describe("recordUpdate", () => {
    it("should record field changes", async () => {
      const previousTicket = { ...mockTicket, subject: "Old Subject" };
      const updatedTicket = { ...mockTicket, subject: "New Subject" };

      const result = await service.recordUpdate(
        "ticket-1",
        previousTicket,
        updatedTicket,
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(
        result.data!.some((e) => e.changes?.some((c) => c.field === "subject")),
      ).toBe(true);
    });

    it("should record status changes as separate event", async () => {
      const previousTicket = { ...mockTicket, status: "open" as const };
      const updatedTicket = { ...mockTicket, status: "in_progress" as const };

      const result = await service.recordUpdate(
        "ticket-1",
        previousTicket,
        updatedTicket,
        "agent-1",
        "Agent One",
      );

      expect(result.data!.some((e) => e.eventType === "status_changed")).toBe(
        true,
      );
    });

    it("should record priority changes as separate event", async () => {
      const previousTicket = { ...mockTicket, priority: "medium" as const };
      const updatedTicket = { ...mockTicket, priority: "high" as const };

      const result = await service.recordUpdate(
        "ticket-1",
        previousTicket,
        updatedTicket,
        "agent-1",
        "Agent One",
      );

      expect(result.data!.some((e) => e.eventType === "priority_changed")).toBe(
        true,
      );
    });

    it("should return empty array if no changes", async () => {
      const result = await service.recordUpdate(
        "ticket-1",
        mockTicket,
        mockTicket,
        "agent-1",
        "Agent One",
      );

      expect(result.data).toEqual([]);
    });
  });

  describe("recordAssignment", () => {
    it("should record assignment event", async () => {
      const result = await service.recordAssignment(
        "ticket-1",
        "agent-2",
        "Agent Two",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("assigned");
      expect(result.data!.description).toContain("assigned");
    });

    it("should record previous assignee", async () => {
      const result = await service.recordAssignment(
        "ticket-1",
        "agent-3",
        "Agent Three",
        "agent-1",
        "Agent One",
        "agent-2",
        "Agent Two",
      );

      expect(result.data!.previousValue).toEqual({
        id: "agent-2",
        name: "Agent Two",
      });
    });
  });

  describe("recordUnassignment", () => {
    it("should record unassignment event", async () => {
      const result = await service.recordUnassignment(
        "ticket-1",
        "agent-2",
        "Agent Two",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("unassigned");
      expect(result.data!.previousValue).toEqual({
        id: "agent-2",
        name: "Agent Two",
      });
    });
  });

  describe("recordEscalation", () => {
    it("should record escalation event", async () => {
      const result = await service.recordEscalation(
        "ticket-1",
        2,
        "Customer requested escalation",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("escalated");
      expect(result.data!.metadata?.level).toBe(2);
    });

    it("should mark auto-escalation correctly", async () => {
      const result = await service.recordEscalation(
        "ticket-1",
        1,
        "SLA breach",
        "system",
        "System",
        true,
      );

      expect(result.data!.actorType).toBe("system");
      expect(result.data!.metadata?.autoEscalated).toBe(true);
    });
  });

  describe("recordMessageAdded", () => {
    it("should record message added event", async () => {
      const result = await service.recordMessageAdded(
        "ticket-1",
        "message-1",
        "agent-1",
        "Agent One",
        "agent",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("message_added");
      expect(result.data!.metadata?.messageId).toBe("message-1");
    });

    it("should track internal messages", async () => {
      const result = await service.recordMessageAdded(
        "ticket-1",
        "message-1",
        "agent-1",
        "Agent One",
        "agent",
        true,
      );

      expect(result.data!.metadata?.isInternal).toBe(true);
    });
  });

  describe("recordNoteAdded", () => {
    it("should record note added event", async () => {
      const result = await service.recordNoteAdded(
        "ticket-1",
        "note-1",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("note_added");
      expect(result.data!.metadata?.noteId).toBe("note-1");
    });
  });

  describe("recordAttachmentAdded", () => {
    it("should record attachment added event", async () => {
      const result = await service.recordAttachmentAdded(
        "ticket-1",
        "attachment-1",
        "document.pdf",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("attachment_added");
      expect(result.data!.metadata?.fileName).toBe("document.pdf");
    });
  });

  describe("recordTagChange", () => {
    it("should record tag added event", async () => {
      const result = await service.recordTagChange(
        "ticket-1",
        "urgent",
        true,
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("tag_added");
      expect(result.data!.metadata?.tag).toBe("urgent");
    });

    it("should record tag removed event", async () => {
      const result = await service.recordTagChange(
        "ticket-1",
        "obsolete",
        false,
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("tag_removed");
    });
  });

  describe("recordSLAWarning", () => {
    it("should record SLA warning event", async () => {
      const result = await service.recordSLAWarning(
        "ticket-1",
        "first_response",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("sla_warning");
      expect(result.data!.actorType).toBe("system");
      expect(result.data!.metadata?.type).toBe("first_response");
    });
  });

  describe("recordSLABreach", () => {
    it("should record SLA breach event", async () => {
      const result = await service.recordSLABreach(
        "ticket-1",
        "resolution",
        3600,
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("sla_breach");
      expect(result.data!.metadata?.exceededBy).toBe(3600);
    });
  });

  describe("recordMerge", () => {
    it("should record merge event", async () => {
      const result = await service.recordMerge(
        "ticket-1",
        ["TKT-2024-00002", "TKT-2024-00003"],
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("merged");
      expect(result.data!.metadata?.sourceTickets).toEqual([
        "TKT-2024-00002",
        "TKT-2024-00003",
      ]);
    });
  });

  describe("recordSplit", () => {
    it("should record split event", async () => {
      const result = await service.recordSplit(
        "ticket-1",
        ["TKT-2024-00004", "TKT-2024-00005"],
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("split");
      expect(result.data!.metadata?.newTickets).toEqual([
        "TKT-2024-00004",
        "TKT-2024-00005",
      ]);
    });
  });

  describe("recordLink", () => {
    it("should record link event", async () => {
      const result = await service.recordLink(
        "ticket-1",
        "ticket-2",
        "TKT-2024-00002",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("linked");
      expect(result.data!.metadata?.linkedTicketNumber).toBe("TKT-2024-00002");
    });
  });

  describe("recordUnlink", () => {
    it("should record unlink event", async () => {
      const result = await service.recordUnlink(
        "ticket-1",
        "ticket-2",
        "TKT-2024-00002",
        "agent-1",
        "Agent One",
      );

      expect(result.success).toBe(true);
      expect(result.data!.eventType).toBe("unlinked");
    });
  });

  describe("getHistory", () => {
    beforeEach(async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordMessageAdded(
        "ticket-1",
        "msg-1",
        "agent-1",
        "Agent",
        "agent",
      );
      await service.recordNoteAdded("ticket-1", "note-1", "agent-1", "Agent");
    });

    it("should get history for a ticket", async () => {
      const result = await service.getHistory("ticket-1");

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(3);
    });

    it("should filter by event types", async () => {
      const result = await service.getHistory("ticket-1", {
        eventTypes: ["created"] as TicketHistoryEventType[],
      });

      expect(result.data!.items.every((e) => e.eventType === "created")).toBe(
        true,
      );
    });

    it("should paginate results", async () => {
      const result = await service.getHistory("ticket-1", { limit: 2 });

      expect(result.data!.items.length).toBe(2);
      expect(result.data!.hasMore).toBe(true);
    });

    it("should sort by creation time desc", async () => {
      const result = await service.getHistory("ticket-1");

      for (let i = 1; i < result.data!.items.length; i++) {
        expect(result.data!.items[i].createdAt.getTime()).toBeLessThanOrEqual(
          result.data!.items[i - 1].createdAt.getTime(),
        );
      }
    });
  });

  describe("getHistoryForTickets", () => {
    beforeEach(async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordCreation(
        { ...mockTicket, id: "ticket-2", ticketNumber: "TKT-2024-00002" },
        "agent-1",
        "Agent One",
      );
    });

    it("should get history for multiple tickets", async () => {
      const result = await service.getHistoryForTickets([
        "ticket-1",
        "ticket-2",
      ]);

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
    });
  });

  describe("searchHistory", () => {
    beforeEach(async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordMessageAdded(
        "ticket-1",
        "msg-1",
        "agent-2",
        "Agent Two",
        "agent",
      );
    });

    it("should search by actor ID", async () => {
      const result = await service.searchHistory({ actorId: "agent-1" });

      expect(result.data!.items.every((e) => e.actorId === "agent-1")).toBe(
        true,
      );
    });

    it("should search by event types", async () => {
      const result = await service.searchHistory({
        eventTypes: ["created", "message_added"] as TicketHistoryEventType[],
      });

      expect(
        result.data!.items.every(
          (e) => e.eventType === "created" || e.eventType === "message_added",
        ),
      ).toBe(true);
    });

    it("should search by date range", async () => {
      const now = new Date();
      const result = await service.searchHistory({
        since: new Date(now.getTime() - 3600000), // 1 hour ago
        until: new Date(now.getTime() + 3600000), // 1 hour from now
      });

      expect(result.data!.items.length).toBeGreaterThan(0);
    });
  });

  describe("getActivitySummary", () => {
    beforeEach(async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordMessageAdded(
        "ticket-1",
        "msg-1",
        "agent-1",
        "Agent",
        "agent",
      );
      await service.recordMessageAdded(
        "ticket-1",
        "msg-2",
        "agent-2",
        "Agent Two",
        "agent",
      );
    });

    it("should get activity summary", async () => {
      const result = await service.getActivitySummary("ticket-1");

      expect(result.success).toBe(true);
      expect(result.data!.totalEvents).toBe(3);
      expect(result.data!.uniqueActors).toContain("agent-1");
      expect(result.data!.uniqueActors).toContain("agent-2");
      expect(result.data!.eventsByType.created).toBe(1);
      expect(result.data!.eventsByType.message_added).toBe(2);
    });
  });

  describe("exportHistory", () => {
    beforeEach(async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordMessageAdded(
        "ticket-1",
        "msg-1",
        "agent-1",
        "Agent",
        "agent",
      );
    });

    it("should export as JSON", async () => {
      const result = await service.exportHistory("ticket-1", "json");

      expect(result.success).toBe(true);
      const data = JSON.parse(result.data!);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("should export as CSV", async () => {
      const result = await service.exportHistory("ticket-1", "csv");

      expect(result.success).toBe(true);
      expect(result.data!).toContain("Timestamp");
      expect(result.data!).toContain("Event");
      expect(result.data!).toContain("created");
    });
  });

  describe("clearTicketHistory", () => {
    it("should clear history for a ticket", async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");

      const result = await service.clearTicketHistory("ticket-1");

      expect(result.success).toBe(true);

      const historyResult = await service.getHistory("ticket-1");
      expect(historyResult.data!.items.length).toBe(0);
    });
  });

  describe("getCounts", () => {
    it("should return correct counts", async () => {
      await service.recordCreation(mockTicket, "agent-1", "Agent One");
      await service.recordMessageAdded(
        "ticket-1",
        "msg-1",
        "agent-1",
        "Agent",
        "agent",
      );
      await service.recordCreation(
        { ...mockTicket, id: "ticket-2" },
        "agent-1",
        "Agent One",
      );

      const counts = service.getCounts();

      expect(counts.tickets).toBe(2);
      expect(counts.entries).toBe(3);
    });
  });
});
