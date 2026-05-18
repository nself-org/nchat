/**
 * Tickets API Route
 *
 * Handles ticket listing and creation.
 *
 * @route GET /api/tickets - List tickets with filters
 * @route POST /api/tickets - Create a new ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService, getTicketHistoryService } from "@/services/tickets";
import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketSource,
  CreateTicketInput,
} from "@/lib/tickets/ticket-types";

/**
 * GET /api/tickets
 * List tickets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const ticketService = getTicketService();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const options = {
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
      sortBy: (searchParams.get("sortBy") || "createdAt") as
        | "createdAt"
        | "updatedAt"
        | "priority"
        | "status"
        | "dueAt",
      sortOrder: (searchParams.get("sortOrder") || "desc") as "asc" | "desc",
      query: searchParams.get("query") || undefined,
      status: searchParams.get("status") as TicketStatus | undefined,
      priority: searchParams.get("priority") as TicketPriority | undefined,
      category: searchParams.get("category") as TicketCategory | undefined,
      source: searchParams.get("source") as TicketSource | undefined,
      department: searchParams.get("department") || undefined,
      assigneeId: searchParams.get("assigneeId") || undefined,
      requesterId: searchParams.get("requesterId") || undefined,
      unassigned: searchParams.get("unassigned") === "true",
      escalated: searchParams.get("escalated") === "true",
      slaBreached: searchParams.get("slaBreached") === "true",
      tags: searchParams.get("tags")?.split(",").filter(Boolean),
    };

    const result = await ticketService.listTickets(options);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error listing tickets:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to list tickets" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tickets
 * Create a new ticket
 */
export async function POST(request: NextRequest) {
  try {
    const ticketService = getTicketService();
    const historyService = getTicketHistoryService();

    const body = await request.json();

    // Validate required fields
    if (!body.subject || !body.description) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Subject and description are required",
        },
        { status: 400 },
      );
    }

    if (!body.requester || (!body.requester.email && !body.requester.name)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Requester information is required",
        },
        { status: 400 },
      );
    }

    const input: CreateTicketInput = {
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      category: body.category,
      source: body.source,
      channel: body.channel,
      department: body.department,
      tags: body.tags,
      requester: body.requester,
      assigneeId: body.assigneeId,
      sourceConversationId: body.sourceConversationId,
      parentTicketId: body.parentTicketId,
      customFields: body.customFields,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    };

    // Get creator ID from header or body
    const createdBy =
      request.headers.get("x-user-id") || body.createdBy || "system";

    const result = await ticketService.createTicket(input, createdBy);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Record history
    await historyService.recordCreation(
      result.data!,
      createdBy,
      body.createdByName || "System",
    );

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to create ticket" },
      { status: 500 },
    );
  }
}
