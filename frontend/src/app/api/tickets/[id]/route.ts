/**
 * Single Ticket API Route
 *
 * Handles operations on individual tickets.
 *
 * @route GET /api/tickets/[id] - Get a ticket
 * @route PATCH /api/tickets/[id] - Update a ticket
 * @route DELETE /api/tickets/[id] - Delete a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService, getTicketHistoryService } from "@/services/tickets";
import type { UpdateTicketInput, Ticket } from "@/lib/tickets/ticket-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tickets/[id]
 * Get a single ticket by ID or ticket number
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();

    // Check if ID looks like a ticket number (TKT-YYYY-NNNNN)
    const isTicketNumber = id.startsWith("TKT-");

    const result = isTicketNumber
      ? await ticketService.getTicketByNumber(id)
      : await ticketService.getTicket(id);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    if (!result.data) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Ticket not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error getting ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get ticket" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update a ticket
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();
    const historyService = getTicketHistoryService();

    const body = await request.json();

    // Get the current ticket for history comparison
    const currentResult = await ticketService.getTicket(id);
    if (!currentResult.success || !currentResult.data) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Ticket not found" },
        { status: 404 },
      );
    }

    const previousTicket: Partial<Ticket> = {
      subject: currentResult.data.subject,
      description: currentResult.data.description,
      status: currentResult.data.status,
      priority: currentResult.data.priority,
      category: currentResult.data.category,
      department: currentResult.data.department,
      tags: currentResult.data.tags,
      dueAt: currentResult.data.dueAt,
    };

    const input: UpdateTicketInput = {};

    if (body.subject !== undefined) input.subject = body.subject;
    if (body.description !== undefined) input.description = body.description;
    if (body.status !== undefined) input.status = body.status;
    if (body.priority !== undefined) input.priority = body.priority;
    if (body.category !== undefined) input.category = body.category;
    if (body.department !== undefined) input.department = body.department;
    if (body.tags !== undefined) input.tags = body.tags;
    if (body.assigneeId !== undefined) input.assigneeId = body.assigneeId;
    if (body.customFields !== undefined) input.customFields = body.customFields;
    if (body.dueAt !== undefined) {
      input.dueAt = body.dueAt ? new Date(body.dueAt) : null;
    }

    const updatedBy =
      request.headers.get("x-user-id") || body.updatedBy || "system";

    const result = await ticketService.updateTicket(id, input, updatedBy);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Record history
    await historyService.recordUpdate(
      id,
      previousTicket,
      result.data!,
      updatedBy,
      body.updatedByName || "System",
    );

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to update ticket" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tickets/[id]
 * Delete a ticket
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const ticketService = getTicketService();
    const historyService = getTicketHistoryService();

    const result = await ticketService.deleteTicket(id);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Clear history for deleted ticket
    await historyService.clearTicketHistory(id);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to delete ticket" },
      { status: 500 },
    );
  }
}
