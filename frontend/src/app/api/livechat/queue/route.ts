/**
 * Livechat Queue API Route
 *
 * Handles queue management for the live support system.
 *
 * GET /api/livechat/queue - Get queue entries and stats
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
} from "@/lib/api/middleware";
import { successResponse, badRequestResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GetQueueSchema = z.object({
  department: z.string().optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const routingService = getRoutingService();

/**
 * GET /api/livechat/queue - Get queue entries and stats
 */
async function getQueueHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    department: searchParams.get("department") || undefined,
  };

  const validation = GetQueueSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { department } = validation.data;

  // Get queue entries
  const queueResult = await livechatService.getQueue(department);
  if (!queueResult.success) {
    return NextResponse.json(
      { success: false, error: queueResult.error?.message },
      { status: queueResult.error?.status || 500 },
    );
  }

  // Get queue stats
  const statsResult = await livechatService.getQueueStats(department);
  if (!statsResult.success) {
    return NextResponse.json(
      { success: false, error: statsResult.error?.message },
      { status: statsResult.error?.status || 500 },
    );
  }

  // Get routing config
  const routingConfig = routingService.getConfig();

  return successResponse({
    entries: queueResult.data,
    stats: statsResult.data,
    config: {
      method: routingConfig.method,
      showQueuePositionToVisitor: routingConfig.showQueuePositionToVisitor,
      maxQueueSize: routingConfig.maxQueueSize,
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(getQueueHandler as any);
