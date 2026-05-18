/**
 * Create Ticket from Conversation API Route
 *
 * Creates a ticket from an existing live chat conversation.
 *
 * @route POST /api/tickets/from-conversation - Create ticket from conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService, getTicketHistoryService } from "@/services/tickets";
import type { CreateTicketFromConversationInput } from "@/lib/tickets/ticket-types";

/**
 * POST /api/tickets/from-conversation
 * Create a ticket from a live chat conversation
 */
export async function POST(request: NextRequest) {
  try {
    const ticketService = getTicketService();
    const historyService = getTicketHistoryService();

    const body = await request.json();

    // Validate required fields
    if (!body.conversationId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Conversation ID is required" },
        { status: 400 },
      );
    }

    const createdBy =
      request.headers.get("x-user-id") || body.createdBy || "system";

    const input: CreateTicketFromConversationInput = {
      conversationId: body.conversationId,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
      category: body.category,
      department: body.department,
      tags: body.tags,
      assigneeId: body.assigneeId,
      customFields: body.customFields,
    };

    const result = await ticketService.createTicketFromConversation(
      input,
      createdBy,
    );

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
    console.error("Error creating ticket from conversation:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to create ticket from conversation",
      },
      { status: 500 },
    );
  }
}
