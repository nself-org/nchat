/**
 * Ticket Messages API Route
 *
 * Handles message operations on tickets.
 *
 * @route GET /api/tickets/[id]/messages - Get ticket messages
 * @route POST /api/tickets/[id]/messages - Add a message to ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService, getTicketHistoryService } from "@/services/tickets";
import type { AddTicketMessageInput } from "@/lib/tickets/ticket-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tickets/[id]/messages
 * Get messages for a ticket
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();
    const searchParams = request.nextUrl.searchParams;

    const includeInternal = searchParams.get("includeInternal") === "true";

    const result = await ticketService.getMessages(id, { includeInternal });

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error getting messages:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get messages" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tickets/[id]/messages
 * Add a message to a ticket
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();
    const historyService = getTicketHistoryService();

    const body = await request.json();

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Message content is required" },
        { status: 400 },
      );
    }

    const senderId =
      request.headers.get("x-user-id") || body.senderId || "system";

    const input: AddTicketMessageInput = {
      content: body.content,
      senderType: body.senderType || "agent",
      senderId,
      senderName: body.senderName || "System",
      attachments: body.attachments,
      isInternal: body.isInternal || false,
      metadata: body.metadata,
    };

    const result = await ticketService.addMessage(id, input);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Record history
    await historyService.recordMessageAdded(
      id,
      result.data!.id,
      senderId,
      body.senderName || "System",
      body.senderType || "agent",
      body.isInternal || false,
    );

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error adding message:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to add message" },
      { status: 500 },
    );
  }
}
