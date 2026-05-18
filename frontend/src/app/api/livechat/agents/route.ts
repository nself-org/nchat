/**
 * Livechat Agents API Route
 *
 * Handles agent management for the live support system.
 *
 * GET /api/livechat/agents - List agents
 * POST /api/livechat/agents - Register as an agent
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
import {
  successResponse,
  createdResponse,
  badRequestResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateAgentSchema = z.object({
  departments: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().int().min(1).max(20).optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  priority: z.number().int().min(1).max(10).optional(),
});

const ListAgentsSchema = z.object({
  department: z.string().optional(),
  status: z.enum(["available", "busy", "away", "offline"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const routingService = getRoutingService();

/**
 * GET /api/livechat/agents - List agents
 */
async function listAgentsHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    department: searchParams.get("department") || undefined,
    status: searchParams.get("status") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
  };

  const validation = ListAgentsSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const result = await livechatService.listAgents(validation.data as any);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

/**
 * POST /api/livechat/agents - Register as an agent
 */
async function createAgentHandler(request: AuthenticatedRequest) {
  const body = await request.json();

  const validation = CreateAgentSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Create agent for the authenticated user
  const result = await livechatService.createAgent({
    userId: request.user.id,
    ...validation.data,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("Agent created", {
    id: result.data?.id,
    userId: request.user.id,
  });

  return createdResponse({ agent: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(listAgentsHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }),
  withAuth,
)(createAgentHandler as any);
