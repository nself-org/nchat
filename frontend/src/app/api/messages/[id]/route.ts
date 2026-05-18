/**
 * Single Message API Route
 *
 * Handles operations on a specific message by ID.
 * Includes proper authentication and permission checks.
 *
 * GET /api/messages/[id] - Get message by ID
 * PATCH /api/messages/[id] - Update message (author or admin only)
 * DELETE /api/messages/[id] - Delete message (author, moderator, or admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getMessageService } from "@/services/messages/message.service";
import { getMentionService } from "@/services/messages/mention.service";
import { getMembershipService } from "@/services/channels/membership.service";
import { getPermissionsService } from "@/services/channels/permissions.service";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4000, "Message content too long"),
  mentions: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// SERVICES
// ============================================================================

const messageService = getMessageService(apolloClient);
const mentionService = getMentionService(apolloClient);
const membershipService = getMembershipService(apolloClient);
const permissionsService = getPermissionsService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Check if user has access to a channel (can read messages)
 */
async function canAccessChannel(
  channelId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Global admins and owners can access any channel
  if (["owner", "admin"].includes(userRole)) {
    return { allowed: true };
  }

  // Check if user can view the channel
  const canView = await permissionsService.canViewChannel(
    channelId,
    userId,
    userRole as any,
  );
  if (!canView) {
    return { allowed: false, reason: "You do not have access to this channel" };
  }

  return { allowed: true };
}

/**
 * Check if user can modify a message (edit or delete)
 * - Message author can always edit/delete their own messages
 * - Moderators can delete any message in their channels
 * - Admins and owners can edit/delete any message
 */
async function canModifyMessage(
  messageId: string,
  userId: string,
  userRole: string,
  action: "edit" | "delete",
): Promise<{ allowed: boolean; message?: any; reason?: string }> {
  // Admins and owners can modify any message
  if (["owner", "admin"].includes(userRole)) {
    return { allowed: true };
  }

  // Get the message to check ownership
  const messageResult = await messageService.getMessage(messageId);
  if (!messageResult.success || !messageResult.data) {
    return { allowed: false, reason: "Message not found" };
  }

  const message = messageResult.data;

  // Author can always modify their own messages
  if (message.userId === userId) {
    return { allowed: true, message };
  }

  // Moderators can delete but not edit other users' messages
  if (userRole === "moderator" && action === "delete") {
    return { allowed: true, message };
  }

  return {
    allowed: false,
    message,
    reason:
      action === "edit"
        ? "You can only edit your own messages"
        : "You do not have permission to delete this message",
  };
}

// ============================================================================
// GET /api/messages/[id] - Get single message
// ============================================================================

async function getMessageHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const { id } = await context.params;

  logger.info("GET /api/messages/[id] - Get message", {
    id,
    userId: request.user.id,
  });

  if (!validateUUID(id)) {
    return badRequestResponse("Invalid message ID format", "INVALID_ID");
  }

  const result = await messageService.getMessage(id);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to fetch message",
      },
      { status: result.error?.status || 500 },
    );
  }

  if (!result.data) {
    return notFoundResponse("Message not found");
  }

  // Check if user has access to the channel this message belongs to
  const { user } = request;
  const accessCheck = await canAccessChannel(
    result.data.channelId,
    user.id,
    user.role,
  );
  if (!accessCheck.allowed) {
    return forbiddenResponse(
      accessCheck.reason || "You do not have access to this message",
    );
  }

  return successResponse({ message: result.data });
}

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }), // 100 requests per minute
  withAuth,
)(getMessageHandler as any);

// ============================================================================
// PATCH /api/messages/[id] - Update message (requires ownership or admin)
// ============================================================================

async function updateMessageHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const { id } = await context.params;
  const { user } = request;

  logger.info("PATCH /api/messages/[id] - Update message", {
    id,
    userId: user.id,
  });

  if (!validateUUID(id)) {
    return badRequestResponse("Invalid message ID format", "INVALID_ID");
  }

  // Check permission to edit (this also fetches the message)
  const permCheck = await canModifyMessage(id, user.id, user.role, "edit");
  if (!permCheck.allowed) {
    return forbiddenResponse(
      permCheck.reason || "You do not have permission to edit this message",
    );
  }

  // Check if user has access to the channel this message belongs to
  if (permCheck.message?.channelId) {
    const accessCheck = await canAccessChannel(
      permCheck.message.channelId,
      user.id,
      user.role,
    );
    if (!accessCheck.allowed) {
      return forbiddenResponse(
        accessCheck.reason || "You do not have access to this channel",
      );
    }
  }

  const body = await request.json();

  // Validate request body
  const validation = UpdateMessageSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = validation.data;

  // Parse mentions from updated content
  const parsedMentions = mentionService.parseMentions(data.content);
  const mentionedUserIds = data.mentions || [];

  // Update message via service with editor tracking
  const result = await messageService.updateMessage({
    id,
    content: data.content,
    mentions: mentionedUserIds,
    metadata: data.metadata,
    editorId: user.id, // Track who edited
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to update message",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("PATCH /api/messages/[id] - Message updated", {
    id,
    updatedBy: user.id,
    isOwner: permCheck.message?.userId === user.id,
  });

  return successResponse({ message: result.data });
}

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }), // 30 edits per minute
  withAuth,
)(updateMessageHandler as any);

// ============================================================================
// DELETE /api/messages/[id] - Delete message (requires ownership, mod, or admin)
// ============================================================================

async function deleteMessageHandler(
  request: AuthenticatedRequest,
  context: RouteContext<{ id: string }>,
) {
  const { id } = await context.params;
  const { user } = request;
  const searchParams = request.nextUrl.searchParams;
  const hardDelete = searchParams.get("hard") === "true";

  logger.info("DELETE /api/messages/[id] - Delete message", {
    id,
    hardDelete,
    userId: user.id,
    userRole: user.role,
  });

  if (!validateUUID(id)) {
    return badRequestResponse("Invalid message ID format", "INVALID_ID");
  }

  // Hard delete only allowed for admins/owners
  if (hardDelete && !["owner", "admin"].includes(user.role)) {
    return forbiddenResponse(
      "Only administrators can permanently delete messages",
    );
  }

  // Check permission to delete (this also fetches the message)
  const permCheck = await canModifyMessage(id, user.id, user.role, "delete");
  if (!permCheck.allowed) {
    return forbiddenResponse(
      permCheck.reason || "You do not have permission to delete this message",
    );
  }

  // Check if user has access to the channel this message belongs to
  if (permCheck.message?.channelId) {
    const accessCheck = await canAccessChannel(
      permCheck.message.channelId,
      user.id,
      user.role,
    );
    if (!accessCheck.allowed) {
      return forbiddenResponse(
        accessCheck.reason || "You do not have access to this channel",
      );
    }
  }

  // Delete message via service
  const result = await messageService.deleteMessage(id, { hard: hardDelete });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to delete message",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("DELETE /api/messages/[id] - Message deleted", {
    id,
    hardDelete,
    deletedBy: user.id,
    wasOwner: permCheck.message?.userId === user.id,
  });

  return successResponse({
    message: hardDelete ? "Message deleted permanently" : "Message deleted",
    data: result.data,
  });
}

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 20, window: 60 }), // 20 deletes per minute
  withAuth,
)(deleteMessageHandler as any);
