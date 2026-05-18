/**
 * Ticket Notes API Route
 *
 * Handles internal note operations on tickets.
 *
 * @route GET /api/tickets/[id]/notes - Get ticket notes
 * @route POST /api/tickets/[id]/notes - Add a note to ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService, getTicketHistoryService } from "@/services/tickets";
import type { AddTicketNoteInput } from "@/lib/tickets/ticket-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tickets/[id]/notes
 * Get internal notes for a ticket
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();

    const result = await ticketService.getNotes(id);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error getting notes:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get notes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tickets/[id]/notes
 * Add an internal note to a ticket
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
        { code: "VALIDATION_ERROR", message: "Note content is required" },
        { status: 400 },
      );
    }

    const createdBy =
      request.headers.get("x-user-id") || body.createdBy || "system";

    const input: AddTicketNoteInput = {
      content: body.content,
      createdBy,
      createdByName: body.createdByName || "System",
      mentions: body.mentions,
    };

    const result = await ticketService.addNote(id, input);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Record history
    await historyService.recordNoteAdded(
      id,
      result.data!.id,
      createdBy,
      body.createdByName || "System",
    );

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to add note" },
      { status: 500 },
    );
  }
}
