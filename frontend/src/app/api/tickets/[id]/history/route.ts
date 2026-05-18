/**
 * Ticket History API Route
 *
 * Handles history/audit trail operations on tickets.
 *
 * @route GET /api/tickets/[id]/history - Get ticket history
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketHistoryService } from "@/services/tickets";
import type { TicketHistoryEventType } from "@/lib/tickets/ticket-types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tickets/[id]/history
 * Get history for a ticket
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const historyService = getTicketHistoryService();
    const searchParams = request.nextUrl.searchParams;

    const options = {
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
      eventTypes: searchParams.get("eventTypes")?.split(",").filter(Boolean) as
        | TicketHistoryEventType[]
        | undefined,
    };

    const result = await historyService.getHistory(id, options);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error getting history:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get history" },
      { status: 500 },
    );
  }
}
