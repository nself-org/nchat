/**
 * Livechat Conversation Messages API Route
 *
 * Handles message operations within a conversation.
 *
 * GET /api/livechat/conversations/[id]/messages - Get messages
 * POST /api/livechat/conversations/[id]/messages - Send a message
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLivechatService, getSLAService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  withOptionalAuth,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  notFoundResponse,
} from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SendMessageSchema = z.object({
  senderId: z.string(),
  senderType: z.enum(["visitor", "agent", "bot"]),
  content: z.string().min(1).max(4000),
  type: z
    .enum([
      "text",
      "file",
      "image",
      "audio",
      "video",
      "location",
      "system",
      "bot",
      "canned_response",
    ])
    .optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio", "video"]),
        name: z.string(),
        url: z.string().url(),
        size: z.number(),
        mimeType: z.string(),
        thumbnailUrl: z.string().url().optional(),
      }),
    )
    .optional(),
  isInternal: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ListMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  includeInternal: z.coerce.boolean().default(false),
});

// ============================================================================
// HANDLERS
// ============================================================================

const livechatService = getLivechatService();
const slaService = getSLAService();

/**
 * GET /api/livechat/conversations/[id]/messages - Get messages
 */
async function getMessagesHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const conversationId = params.id;

  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
    includeInternal: searchParams.get("includeInternal") || "false",
  };

  const validation = ListMessagesSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Verify conversation exists
  const conversationResult =
    await livechatService.getConversation(conversationId);
  if (!conversationResult.success || !conversationResult.data) {
    return notFoundResponse("Conversation not found");
  }

  const result = await livechatService.getMessages(
    conversationId,
    validation.data,
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

/**
 * POST /api/livechat/conversations/[id]/messages - Send a message
 */
async function sendMessageHandler(
  request: NextRequest,
  context: RouteContext<{ id: string }>,
) {
  const params = await context.params;
  const conversationId = params.id;

  const body = await request.json();

  const validation = SendMessageSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  // Verify conversation exists
  const conversationResult =
    await livechatService.getConversation(conversationId);
  if (!conversationResult.success || !conversationResult.data) {
    return notFoundResponse("Conversation not found");
  }

  const conversation = conversationResult.data;

  // Send message
  const result = await livechatService.sendMessage({
    conversationId,
    ...validation.data,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  // Record first response if this is an agent message and first response hasn't been recorded
  if (validation.data.senderType === "agent" && !conversation.firstResponseAt) {
    await slaService.recordFirstResponse(conversationId);
  }

  logger.debug("Message sent", { conversationId, messageId: result.data?.id });

  return createdResponse({ message: result.data });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(getMessagesHandler as any);

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withOptionalAuth,
)(sendMessageHandler as any);
