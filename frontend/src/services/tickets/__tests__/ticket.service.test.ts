/**
 * Ticket Service Tests
 *
 * Comprehensive test suite for the ticket service.
 */

import {
  TicketService,
  getTicketService,
  resetTicketService,
} from "../ticket.service";
import { resetLivechatService, getLivechatService } from "@/services/livechat";
import type {
  CreateTicketInput,
  UpdateTicketInput,
  AddTicketMessageInput,
  AddTicketNoteInput,
} from "@/lib/tickets/ticket-types";

describe("TicketService", () => {
  let service: TicketService;

  beforeEach(() => {
    resetTicketService();
    resetLivechatService();
    service = getTicketService();
  });

  afterEach(() => {
    service.clearAll();
    resetTicketService();
    resetLivechatService();
  });

  describe("createTicket", () => {
    it("should create a ticket with required fields", async () => {
      const input: CreateTicketInput = {
        subject: "Test Ticket",
        description: "Test description",
        requester: {
          name: "John Doe",
          email: "john@example.com",
        },
      };

      const result = await service.createTicket(input, "agent-1");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.subject).toBe("Test Ticket");
      expect(result.data!.description).toBe("Test description");
      expect(result.data!.status).toBe("open");
      expect(result.data!.priority).toBe("medium");
      expect(result.data!.ticketNumber).toMatch(/^TKT-\d{4}-\d{5}$/);
    });

    it("should create a ticket with all optional fields", async () => {
      const input: CreateTicketInput = {
        subject: "Urgent Issue",
        description: "This is urgent",
        priority: "urgent",
        category: "technical",
        source: "email",
        department: "support",
        tags: ["urgent", "technical"],
        requester: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "+1234567890",
          organization: "Acme Corp",
        },
        customFields: { customField1: "value1" },
        dueAt: new Date("2025-01-01"),
      };

      const result = await service.createTicket(input, "agent-1");

      expect(result.success).toBe(true);
      expect(result.data!.priority).toBe("urgent");
      expect(result.data!.category).toBe("technical");
      expect(result.data!.source).toBe("email");
      expect(result.data!.department).toBe("support");
      expect(result.data!.tags).toEqual(["urgent", "technical"]);
      expect(result.data!.requester.phone).toBe("+1234567890");
      expect(result.data!.customFields).toEqual({ customField1: "value1" });
    });

    it("should generate unique ticket numbers", async () => {
      const input: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const result1 = await service.createTicket(input, "agent-1");
      const result2 = await service.createTicket(input, "agent-1");
      const result3 = await service.createTicket(input, "agent-1");

      expect(result1.data!.ticketNumber).not.toBe(result2.data!.ticketNumber);
      expect(result2.data!.ticketNumber).not.toBe(result3.data!.ticketNumber);
    });

    it("should set parent ticket relationship", async () => {
      const parentInput: CreateTicketInput = {
        subject: "Parent Ticket",
        description: "Parent",
        requester: { email: "test@example.com" },
      };

      const parentResult = await service.createTicket(parentInput, "agent-1");
      const parentId = parentResult.data!.id;

      const childInput: CreateTicketInput = {
        subject: "Child Ticket",
        description: "Child",
        requester: { email: "test@example.com" },
        parentTicketId: parentId,
      };

      const childResult = await service.createTicket(childInput, "agent-1");

      expect(childResult.data!.parentTicketId).toBe(parentId);

      // Verify parent has child reference
      const updatedParent = await service.getTicket(parentId);
      expect(updatedParent.data!.childTicketIds).toContain(
        childResult.data!.id,
      );
    });
  });

  describe("getTicket", () => {
    it("should get a ticket by ID", async () => {
      const input: CreateTicketInput = {
        subject: "Test Ticket",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(input, "agent-1");
      const ticketId = createResult.data!.id;

      const result = await service.getTicket(ticketId);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe(ticketId);
    });

    it("should return null for non-existent ticket", async () => {
      const result = await service.getTicket("non-existent-id");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("getTicketByNumber", () => {
    it("should get a ticket by ticket number", async () => {
      const input: CreateTicketInput = {
        subject: "Test Ticket",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(input, "agent-1");
      const ticketNumber = createResult.data!.ticketNumber;

      const result = await service.getTicketByNumber(ticketNumber);

      expect(result.success).toBe(true);
      expect(result.data!.ticketNumber).toBe(ticketNumber);
    });

    it("should return null for non-existent ticket number", async () => {
      const result = await service.getTicketByNumber("TKT-9999-99999");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("updateTicket", () => {
    it("should update ticket fields", async () => {
      const createInput: CreateTicketInput = {
        subject: "Original Subject",
        description: "Original",
        priority: "low",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      const updateInput: UpdateTicketInput = {
        subject: "Updated Subject",
        priority: "high",
        tags: ["new-tag"],
      };

      const result = await service.updateTicket(
        ticketId,
        updateInput,
        "agent-2",
      );

      expect(result.success).toBe(true);
      expect(result.data!.subject).toBe("Updated Subject");
      expect(result.data!.priority).toBe("high");
      expect(result.data!.tags).toEqual(["new-tag"]);
      expect(result.data!.updatedBy).toBe("agent-2");
    });

    it("should validate status transitions", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      // Valid transition: open -> in_progress
      const result1 = await service.updateTicket(
        ticketId,
        { status: "in_progress" },
        "agent-1",
      );
      expect(result1.success).toBe(true);

      // Valid transition: in_progress -> resolved
      const result2 = await service.updateTicket(
        ticketId,
        { status: "resolved" },
        "agent-1",
      );
      expect(result2.success).toBe(true);
    });

    it("should return error for non-existent ticket", async () => {
      const result = await service.updateTicket(
        "non-existent",
        { subject: "New" },
        "agent-1",
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should track reopen count", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      // Close the ticket
      await service.updateTicket(ticketId, { status: "resolved" }, "agent-1");
      await service.updateTicket(ticketId, { status: "closed" }, "agent-1");

      // Reopen
      const result = await service.updateTicket(
        ticketId,
        { status: "open" },
        "agent-1",
      );

      expect(result.data!.metrics.reopenCount).toBe(1);
    });
  });

  describe("deleteTicket", () => {
    it("should delete a ticket", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      const result = await service.deleteTicket(ticketId);

      expect(result.success).toBe(true);
      expect(result.data!.deleted).toBe(true);

      // Verify deletion
      const getResult = await service.getTicket(ticketId);
      expect(getResult.data).toBeNull();
    });

    it("should return error for non-existent ticket", async () => {
      const result = await service.deleteTicket("non-existent");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });

    it("should remove from parent when deleting child ticket", async () => {
      const parentInput: CreateTicketInput = {
        subject: "Parent",
        description: "Parent",
        requester: { email: "test@example.com" },
      };

      const parentResult = await service.createTicket(parentInput, "agent-1");
      const parentId = parentResult.data!.id;

      const childInput: CreateTicketInput = {
        subject: "Child",
        description: "Child",
        requester: { email: "test@example.com" },
        parentTicketId: parentId,
      };

      const childResult = await service.createTicket(childInput, "agent-1");
      const childId = childResult.data!.id;

      await service.deleteTicket(childId);

      const updatedParent = await service.getTicket(parentId);
      expect(updatedParent.data!.childTicketIds).not.toContain(childId);
    });
  });

  describe("addMessage", () => {
    it("should add a message to a ticket", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      const messageInput: AddTicketMessageInput = {
        content: "Hello, this is a message",
        senderType: "agent",
        senderId: "agent-1",
        senderName: "Agent One",
      };

      const result = await service.addMessage(ticketId, messageInput);

      expect(result.success).toBe(true);
      expect(result.data!.content).toBe("Hello, this is a message");
      expect(result.data!.senderType).toBe("agent");
    });

    it("should update metrics when adding messages", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      await service.addMessage(ticketId, {
        content: "Agent message",
        senderType: "agent",
        senderId: "agent-1",
        senderName: "Agent",
      });

      await service.addMessage(ticketId, {
        content: "Customer message",
        senderType: "customer",
        senderId: "customer-1",
        senderName: "Customer",
      });

      const ticket = await service.getTicket(ticketId);

      expect(ticket.data!.metrics.messagesCount).toBe(2);
      expect(ticket.data!.metrics.agentMessagesCount).toBe(1);
      expect(ticket.data!.metrics.customerMessagesCount).toBe(1);
    });

    it("should track first response time", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      await service.addMessage(ticketId, {
        content: "First response",
        senderType: "agent",
        senderId: "agent-1",
        senderName: "Agent",
      });

      const ticket = await service.getTicket(ticketId);

      expect(ticket.data!.firstResponseAt).toBeDefined();
      expect(ticket.data!.metrics.firstResponseTime).toBeDefined();
    });
  });

  describe("addNote", () => {
    it("should add an internal note to a ticket", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      const noteInput: AddTicketNoteInput = {
        content: "This is an internal note",
        createdBy: "agent-1",
        createdByName: "Agent One",
      };

      const result = await service.addNote(ticketId, noteInput);

      expect(result.success).toBe(true);
      expect(result.data!.content).toBe("This is an internal note");
    });

    it("should update note count", async () => {
      const createInput: CreateTicketInput = {
        subject: "Test",
        description: "Test",
        requester: { email: "test@example.com" },
      };

      const createResult = await service.createTicket(createInput, "agent-1");
      const ticketId = createResult.data!.id;

      await service.addNote(ticketId, {
        content: "Note 1",
        createdBy: "agent-1",
        createdByName: "Agent",
      });

      await service.addNote(ticketId, {
        content: "Note 2",
        createdBy: "agent-1",
        createdByName: "Agent",
      });

      const ticket = await service.getTicket(ticketId);

      expect(ticket.data!.metrics.notesCount).toBe(2);
    });
  });

  describe("listTickets", () => {
    beforeEach(async () => {
      // Create test tickets
      await service.createTicket(
        {
          subject: "Urgent Issue",
          description: "Urgent",
          priority: "urgent",
          category: "technical",
          tags: ["urgent"],
          requester: { email: "test1@example.com" },
        },
        "agent-1",
      );

      await service.createTicket(
        {
          subject: "Normal Issue",
          description: "Normal",
          priority: "medium",
          category: "billing",
          tags: ["billing"],
          requester: { email: "test2@example.com" },
        },
        "agent-1",
      );

      await service.createTicket(
        {
          subject: "Low Priority",
          description: "Low",
          priority: "low",
          category: "general",
          requester: { email: "test3@example.com" },
        },
        "agent-1",
      );
    });

    it("should list all tickets", async () => {
      const result = await service.listTickets({});

      expect(result.success).toBe(true);
      expect(result.data!.totalCount).toBe(3);
      expect(result.data!.items.length).toBe(3);
    });

    it("should filter by status", async () => {
      const result = await service.listTickets({ status: "open" });

      expect(result.success).toBe(true);
      expect(result.data!.items.every((t) => t.status === "open")).toBe(true);
    });

    it("should filter by priority", async () => {
      const result = await service.listTickets({ priority: "urgent" });

      expect(result.success).toBe(true);
      expect(result.data!.totalCount).toBe(1);
      expect(result.data!.items[0].priority).toBe("urgent");
    });

    it("should filter by category", async () => {
      const result = await service.listTickets({ category: "billing" });

      expect(result.success).toBe(true);
      expect(result.data!.totalCount).toBe(1);
    });

    it("should filter by tags", async () => {
      const result = await service.listTickets({ tags: ["urgent"] });

      expect(result.success).toBe(true);
      expect(result.data!.totalCount).toBe(1);
    });

    it("should filter by query", async () => {
      const result = await service.listTickets({ query: "Urgent" });

      expect(result.success).toBe(true);
      expect(result.data!.totalCount).toBe(1);
    });

    it("should paginate results", async () => {
      const result = await service.listTickets({ limit: 2, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBe(2);
      expect(result.data!.hasMore).toBe(true);

      const result2 = await service.listTickets({ limit: 2, offset: 2 });

      expect(result2.data!.items.length).toBe(1);
      expect(result2.data!.hasMore).toBe(false);
    });

    it("should sort by priority", async () => {
      const result = await service.listTickets({
        sortBy: "priority",
        sortOrder: "desc",
      });

      expect(result.success).toBe(true);
      expect(result.data!.items[0].priority).toBe("urgent");
    });
  });

  describe("getQueue", () => {
    beforeEach(async () => {
      await service.createTicket(
        {
          subject: "High Priority",
          description: "High",
          priority: "high",
          department: "support",
          requester: { email: "test1@example.com" },
        },
        "agent-1",
      );

      await service.createTicket(
        {
          subject: "Medium Priority",
          description: "Medium",
          priority: "medium",
          department: "support",
          requester: { email: "test2@example.com" },
        },
        "agent-1",
      );
    });

    it("should get ticket queue", async () => {
      const result = await service.getQueue();

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
      // Should be sorted by priority
      expect(result.data![0].priority).toBe("high");
    });

    it("should filter queue by department", async () => {
      const result = await service.getQueue("support");

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
    });
  });

  describe("getQueueStats", () => {
    beforeEach(async () => {
      await service.createTicket(
        {
          subject: "Open Ticket",
          description: "Open",
          priority: "high",
          category: "technical",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const pendingResult = await service.createTicket(
        {
          subject: "Pending Ticket",
          description: "Pending",
          priority: "medium",
          category: "billing",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      await service.updateTicket(
        pendingResult.data!.id,
        { status: "pending" },
        "agent-1",
      );
    });

    it("should get queue statistics", async () => {
      const result = await service.getQueueStats();

      expect(result.success).toBe(true);
      expect(result.data!.totalOpen).toBe(1);
      expect(result.data!.totalPending).toBe(1);
      expect(result.data!.byPriority.high).toBe(1);
      expect(result.data!.byPriority.medium).toBe(1);
      expect(result.data!.byCategory.technical).toBe(1);
      expect(result.data!.byCategory.billing).toBe(1);
    });
  });

  describe("mergeTickets", () => {
    it("should merge tickets", async () => {
      const target = await service.createTicket(
        {
          subject: "Target Ticket",
          description: "Target",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const source = await service.createTicket(
        {
          subject: "Source Ticket",
          description: "Source",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      // Add message to source
      await service.addMessage(source.data!.id, {
        content: "Source message",
        senderType: "customer",
        senderId: "customer-1",
        senderName: "Customer",
      });

      const result = await service.mergeTickets({
        targetTicketId: target.data!.id,
        sourceTicketIds: [source.data!.id],
        mergedBy: "agent-1",
        reason: "Duplicate",
      });

      expect(result.success).toBe(true);
      expect(result.data!.messages.length).toBeGreaterThan(0);

      // Source should be closed
      const closedSource = await service.getTicket(source.data!.id);
      expect(closedSource.data!.status).toBe("closed");
    });
  });

  describe("splitTicket", () => {
    it("should split a ticket", async () => {
      const parent = await service.createTicket(
        {
          subject: "Parent Ticket",
          description: "Parent",
          priority: "high",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const result = await service.splitTicket({
        ticketId: parent.data!.id,
        newTickets: [
          { subject: "Split 1", description: "First split" },
          { subject: "Split 2", description: "Second split" },
        ],
        splitBy: "agent-1",
        reason: "Multiple issues",
      });

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
      expect(result.data![0].parentTicketId).toBe(parent.data!.id);
      expect(result.data![1].parentTicketId).toBe(parent.data!.id);
    });
  });

  describe("linkTickets", () => {
    it("should link two tickets", async () => {
      const ticket1 = await service.createTicket(
        {
          subject: "Ticket 1",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticket2 = await service.createTicket(
        {
          subject: "Ticket 2",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const result = await service.linkTickets(
        ticket1.data!.id,
        ticket2.data!.id,
      );

      expect(result.success).toBe(true);

      const updated1 = await service.getTicket(ticket1.data!.id);
      const updated2 = await service.getTicket(ticket2.data!.id);

      expect(updated1.data!.relatedTicketIds).toContain(ticket2.data!.id);
      expect(updated2.data!.relatedTicketIds).toContain(ticket1.data!.id);
    });
  });

  describe("unlinkTickets", () => {
    it("should unlink two tickets", async () => {
      const ticket1 = await service.createTicket(
        {
          subject: "Ticket 1",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      const ticket2 = await service.createTicket(
        {
          subject: "Ticket 2",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      await service.linkTickets(ticket1.data!.id, ticket2.data!.id);
      const result = await service.unlinkTickets(
        ticket1.data!.id,
        ticket2.data!.id,
      );

      expect(result.success).toBe(true);

      const updated1 = await service.getTicket(ticket1.data!.id);
      const updated2 = await service.getTicket(ticket2.data!.id);

      expect(updated1.data!.relatedTicketIds).not.toContain(ticket2.data!.id);
      expect(updated2.data!.relatedTicketIds).not.toContain(ticket1.data!.id);
    });
  });

  describe("subscribe", () => {
    it("should emit events on ticket operations", async () => {
      const events: unknown[] = [];
      const unsubscribe = service.subscribe((event) => {
        events.push(event);
      });

      await service.createTicket(
        {
          subject: "Test",
          description: "Test",
          requester: { email: "test@example.com" },
        },
        "agent-1",
      );

      expect(events.length).toBeGreaterThan(0);
      expect(
        events.some(
          (e: unknown) => (e as { type: string }).type === "ticket.created",
        ),
      ).toBe(true);

      unsubscribe();
    });
  });
});
