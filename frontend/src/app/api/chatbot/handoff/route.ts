/**
 * Chatbot Handoff API Routes
 *
 * GET /api/chatbot/handoff - List handoff requests
 * POST /api/chatbot/handoff - Initiate a new handoff
 *
 * @module api/chatbot/handoff
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getHandoffService } from "@/services/chatbot";
import type { HandoffStatus } from "@/lib/chatbot/chatbot-types";

const logger = createLogger("HandoffAPI");

/**
 * GET /api/chatbot/handoff
 * List handoff requests with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const options: {
      status?: HandoffStatus | HandoffStatus[];
      department?: string;
      agentId?: string;
      limit?: number;
      offset?: number;
    } = {};

    const status = searchParams.get("status");
    if (status) {
      if (status.includes(",")) {
        options.status = status.split(",") as HandoffStatus[];
      } else {
        options.status = status as HandoffStatus;
      }
    }

    const department = searchParams.get("department");
    if (department) options.department = department;

    const agentId = searchParams.get("agentId");
    if (agentId) options.agentId = agentId;

    const limit = searchParams.get("limit");
    if (limit) options.limit = parseInt(limit, 10);

    const offset = searchParams.get("offset");
    if (offset) options.offset = parseInt(offset, 10);

    const service = getHandoffService();
    const result = await service.listHandoffs(options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.debug("Listed handoffs", { count: result.data?.length });

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0,
    });
  } catch (error) {
    logger.error("Failed to list handoffs", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list handoffs",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chatbot/handoff
 * Initiate a new handoff
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.conversationId) {
      return NextResponse.json(
        { success: false, error: "conversationId is required" },
        { status: 400 },
      );
    }

    const service = getHandoffService();
    const result = await service.initiateHandoff({
      conversationId: body.conversationId,
      trigger: body.trigger || "user_request",
      reason: body.reason,
      priority: body.priority,
      department: body.department,
      preferredAgentId: body.preferredAgentId,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("Initiated handoff", {
      id: result.data?.id,
      conversationId: body.conversationId,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: "Handoff initiated successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Failed to initiate handoff", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initiate handoff",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
