/**
 * Livechat Agent Status API Route
 *
 * Handles agent status updates.
 *
 * PUT /api/livechat/agents/[id]/status - Update agent status
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLivechatService, getRoutingService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateStatusSchema = z.object({
  status: z.enum(["available", "busy", "away", "offline"]),
  statusMessage: z.string().max(200).optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const routingService = getRoutingService();

/**
 * PUT /api/livechat/agents/[id]/status - Update agent status
 */
async function updateAgentStatusHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const agentId = params.id;

  const body = await request.json();

  const validation = UpdateStatusSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Verify agent exists
  const agentResult = await livechatService.getAgent(agentId);
  if (!agentResult.success || !agentResult.data) {
    return notFoundResponse("Agent not found");
  }

  // Verify user owns this agent or is admin
  const agent = agentResult.data;
  if (
    agent.userId !== request.user.id &&
    !["owner", "admin"].includes(request.user.role)
  ) {
    return forbiddenResponse("You can only update your own status");
  }

  // Update status
  const result = await livechatService.updateAgentStatus(
    agentId,
    validation.data.status,
    validation.data.statusMessage,
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  // If agent became available, process queue
  if (validation.data.status === "available") {
    const assignedCount = await routingService.onAgentAvailable(agentId);
    logger.info("Queue processed on agent available", {
      agentId,
      assignedCount,
    });
  }

  logger.info("Agent status updated", {
    agentId,
    status: validation.data.status,
  });

  return successResponse({ agent: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(updateAgentStatusHandler as any);
