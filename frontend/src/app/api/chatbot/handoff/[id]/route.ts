/**
 * Chatbot Handoff API Routes
 *
 * GET /api/chatbot/handoff/[id] - Get a handoff request
 * PUT /api/chatbot/handoff/[id] - Update a handoff (accept/complete)
 * DELETE /api/chatbot/handoff/[id] - Cancel a handoff
 *
 * @module api/chatbot/handoff/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getHandoffService } from "@/services/chatbot";

const logger = createLogger("HandoffByIdAPI");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chatbot/handoff/[id]
 * Get a handoff request by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get("includeHistory") === "true";

    const service = getHandoffService();
    const result = await service.getHandoff(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "Handoff not found" },
        { status: 404 },
      );
    }

    // Optionally include conversation history
    let history = null;
    if (includeHistory) {
      const historyResult = await service.getConversationHistory(id);
      if (historyResult.success) {
        history = historyResult.data;
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      history,
    });
  } catch (error) {
    logger.error("Failed to get handoff", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get handoff",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/chatbot/handoff/[id]
 * Update a handoff (accept or complete)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const service = getHandoffService();

    // Accept handoff
    if (body.action === "accept") {
      if (!body.agentId) {
        return NextResponse.json(
          { success: false, error: "agentId is required to accept handoff" },
          { status: 400 },
        );
      }

      const result = await service.acceptHandoff(id, body.agentId);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.error?.status || 500 },
        );
      }

      logger.info("Accepted handoff", { id, agentId: body.agentId });

      return NextResponse.json({
        success: true,
        data: result.data,
        message: "Handoff accepted",
      });
    }

    // Complete handoff
    if (body.action === "complete") {
      const result = await service.completeHandoff(id);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.error?.status || 500 },
        );
      }

      logger.info("Completed handoff", { id });

      return NextResponse.json({
        success: true,
        data: result.data,
        message: "Handoff completed",
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "accept" or "complete"' },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to update handoff", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update handoff",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chatbot/handoff/[id]
 * Cancel a handoff
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const reason = searchParams.get("reason") || undefined;

    const service = getHandoffService();
    const result = await service.cancelHandoff(id, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Cancelled handoff", { id, reason });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Handoff cancelled",
    });
  } catch (error) {
    logger.error("Failed to cancel handoff", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to cancel handoff",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
