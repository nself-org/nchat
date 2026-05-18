/**
 * Ticket Escalation API Route
 *
 * Handles escalation operations on tickets.
 *
 * @route POST /api/tickets/[id]/escalate - Escalate a ticket
 * @route DELETE /api/tickets/[id]/escalate - De-escalate a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEscalationService,
  getTicketHistoryService,
} from "@/services/tickets";
import type { EscalateTicketInput } from "@/lib/tickets/ticket-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tickets/[id]/escalate
 * Escalate a ticket
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const escalationService = getEscalationService();
    const historyService = getTicketHistoryService();

    const body = await request.json();

    // Validate required fields
    if (!body.reason) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Escalation reason is required" },
        { status: 400 },
      );
    }

    const escalatedBy =
      request.headers.get("x-user-id") || body.escalatedBy || "system";

    const input: EscalateTicketInput = {
      reason: body.reason,
      targetAgentId: body.targetAgentId,
      targetDepartment: body.targetDepartment,
      priority: body.priority,
      escalatedBy,
    };

    const result = await escalationService.escalateTicket(id, input);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    // Record history
    const ticket = result.data!;
    await historyService.recordEscalation(
      id,
      ticket.escalation?.level || 1,
      body.reason,
      escalatedBy,
      body.escalatedByName || "System",
      false,
    );

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error escalating ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to escalate ticket" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tickets/[id]/escalate
 * De-escalate a ticket
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const escalationService = getEscalationService();

    const body = await request.json().catch(() => ({}));

    const deescalatedBy =
      request.headers.get("x-user-id") || body.deescalatedBy || "system";
    const reason = body.reason || "De-escalated by agent";

    const result = await escalationService.deescalateTicket(
      id,
      reason,
      deescalatedBy,
    );

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error de-escalating ticket:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to de-escalate ticket" },
      { status: 500 },
    );
  }
}
