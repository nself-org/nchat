/**
 * Ticket Queue API Route
 *
 * Handles ticket queue operations.
 *
 * @route GET /api/tickets/queue - Get ticket queue
 * @route GET /api/tickets/queue/stats - Get queue statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { getTicketService } from "@/services/tickets";

/**
 * GET /api/tickets/queue
 * Get the ticket queue
 */
export async function GET(request: NextRequest) {
  try {
    const ticketService = getTicketService();
    const searchParams = request.nextUrl.searchParams;

    const department = searchParams.get("department") || undefined;
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const result = await ticketService.getQueueStats(department);

      if (!result.success) {
        return NextResponse.json(result.error, {
          status: result.error?.status || 500,
        });
      }

      return NextResponse.json(result.data);
    }

    const result = await ticketService.getQueue(department);

    if (!result.success) {
      return NextResponse.json(result.error, {
        status: result.error?.status || 500,
      });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Error getting queue:", error);
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Failed to get queue" },
      { status: 500 },
    );
  }
}
