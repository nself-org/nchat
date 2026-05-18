/**
 * Messages API Route
 *
 * Handles CRUD operations for message management using Hasura GraphQL.
 * All endpoints require authentication and enforce proper permissions.
 *
 * GET /api/messages - List messages (with filters, pagination, threads)
 * POST /api/messages - Create/send new message
 * PUT /api/messages - Update/edit message (requires messageId in body)
 * DELETE /api/messages - Delete message (requires messageId in query)
 * PATCH /api/messages - Add/remove reaction
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getMessageService } from "@/services/messages/message.service";
import { getReactionService } from "@/services/messages/reaction.service";
import { getMentionService } from "@/services/messages/mention.service";
import { getMembershipService } from "@/services/channels/membership.service";
import { getPermissionsService } from "@/services/channels/permissions.service";
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
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api/response";
import { indexMessage, hasLinks } from "@/lib/search/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateMessageSchema = z.object({
  channelId: z.string().uuid("Invalid channel ID"),
  userId: z.string().uuid("Invalid user ID"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4000, "Message content too long (max 4000 characters)"),
  type: z.string().optional().default("text"),
  threadId: z.string().uuid().optional().nullable(),
  parentMessageId: z.string().uuid().optional().nullable(),
  mentions: z.array(z.string().uuid()).optional(),
  mentionedRoles: z.array(z.string()).optional(),
  mentionedChannels: z.array(z.string().uuid()).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        size: z.number(),
        mimetype: z.string(),
      }),
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateMessageSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4000, "Message content too long"),
  mentions: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const SearchQuerySchema = z.object({
  channelId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  search: z.string().optional(),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeThreads: z.coerce.boolean().default(false),
  includeReactions: z.coerce.boolean().default(true),
});

const ReactionSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  userId: z.string().uuid("Invalid user ID"),
  emoji: z.string().min(1).max(50),
  action: z.enum(["add", "remove", "toggle"]),
});

// ============================================================================
// SERVICES
// ============================================================================

const messageService = getMessageService(apolloClient);
const reactionService = getReactionService(apolloClient);
const mentionService = getMentionService(apolloClient);
const membershipService = getMembershipService(apolloClient);
const permissionsService = getPermissionsService(apolloClient);

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

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
 * Check if user can post messages in a channel
 */
async function canPostInChannel(
  channelId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Global admins and owners can post anywhere
  if (["owner", "admin"].includes(userRole)) {
    return { allowed: true };
  }

  // Check membership
  const membership = await membershipService.checkMembership(channelId, userId);
  if (!membership.isMember) {
    return {
      allowed: false,
      reason: "You must be a member of this channel to post messages",
    };
  }

  // Check write permission
  if (membership.canWrite === false) {
    return {
      allowed: false,
      reason: "You do not have permission to post in this channel",
    };
  }

  // Guests cannot write by default
  if (membership.role === "guest" && membership.canWrite !== true) {
    return {
      allowed: false,
      reason: "Guests cannot post messages in this channel",
    };
  }

  return { allowed: true };
}

/**
 * Check if user can modify a message (edit or delete)
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

  // Get the message
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

/**
 * Check if user can add reactions in a channel
 */
async function canReactInChannel(
  channelId: string,
  userId: string,
  userRole: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Global admins and owners can react anywhere
  if (["owner", "admin"].includes(userRole)) {
    return { allowed: true };
  }

  // Check membership - must be a member to react
  const membership = await membershipService.checkMembership(channelId, userId);
  if (!membership.isMember) {
    return {
      allowed: false,
      reason: "You must be a member of this channel to add reactions",
    };
  }

  // Check read permission (if you can read, you can typically react)
  if (membership.canRead === false) {
    return { allowed: false, reason: "You do not have access to this channel" };
  }

  return { allowed: true };
}

// ============================================================================
// GET /api/messages - List messages (authenticated)
// ============================================================================

async function listMessagesHandler(request: AuthenticatedRequest) {
  logger.info("GET /api/messages - List messages request", {
    userId: request.user.id,
  });

  // Parse and validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    channelId: searchParams.get("channelId") || undefined,
    threadId: searchParams.get("threadId") || undefined,
    userId: searchParams.get("userId") || undefined,
    search: searchParams.get("search") || undefined,
    before: searchParams.get("before") || undefined,
    after: searchParams.get("after") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
    sortOrder: searchParams.get("sortOrder") || "desc",
    includeThreads: searchParams.get("includeThreads") || "false",
    includeReactions: searchParams.get("includeReactions") || "true",
  };

  const validation = SearchQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const params = validation.data;
  const { user } = request;

  // Require at least channelId or threadId
  if (!params.channelId && !params.threadId) {
    return badRequestResponse(
      "Either channelId or threadId is required",
      "MISSING_PARAMS",
    );
  }

  // Check channel access permission
  if (params.channelId) {
    const accessCheck = await canAccessChannel(
      params.channelId,
      user.id,
      user.role,
    );
    if (!accessCheck.allowed) {
      return forbiddenResponse(
        accessCheck.reason || "You do not have access to this channel",
      );
    }
  }

  // If searching, use search endpoint
  if (params.search) {
    const result = await messageService.searchMessages({
      channelId: params.channelId,
      query: params.search,
      limit: params.limit,
      offset: params.offset,
      userId: params.userId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || "Search failed" },
        { status: result.error?.status || 500 },
      );
    }

    return successResponse({
      messages: result.data?.messages || [],
      pagination: {
        total: result.data?.totalCount || 0,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.data?.hasMore || false,
      },
    });
  }

  // If threadId provided, get thread messages
  if (params.threadId) {
    const result = await messageService.getThreadMessages(params.threadId, {
      limit: params.limit,
      offset: params.offset,
      before: params.before,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to fetch thread messages",
        },
        { status: result.error?.status || 500 },
      );
    }

    return successResponse({
      messages: result.data?.messages || [],
      pagination: {
        total: result.data?.totalCount || 0,
        offset: params.offset,
        limit: params.limit,
        hasMore: result.data?.hasMore || false,
      },
    });
  }

  // Get channel messages
  const result = await messageService.getMessages({
    channelId: params.channelId!,
    limit: params.limit,
    offset: params.offset,
    before: params.before,
    after: params.after,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to fetch messages",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("GET /api/messages - Success", {
    total: result.data?.totalCount,
    returned: result.data?.messages.length,
    channelId: params.channelId,
  });

  return successResponse({
    messages: result.data?.messages || [],
    pagination: {
      total: result.data?.totalCount || 0,
      offset: params.offset,
      limit: params.limit,
      hasMore: result.data?.hasMore || false,
    },
  });
}

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }), // 100 requests per minute
  withAuth,
)(listMessagesHandler as any);

// ============================================================================
// POST /api/messages - Create/send new message (authenticated)
// ============================================================================

async function createMessageHandler(request: AuthenticatedRequest) {
  const { user } = request;
  logger.info("POST /api/messages - Create message request", {
    userId: user.id,
  });

  const body = await request.json();

  // Validate request body
  const validation = CreateMessageSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = validation.data;

  // Ensure user can only post as themselves (unless admin)
  if (data.userId !== user.id && !["owner", "admin"].includes(user.role)) {
    return forbiddenResponse("You can only send messages as yourself");
  }

  // Check if user can post in this channel
  const postCheck = await canPostInChannel(data.channelId, user.id, user.role);
  if (!postCheck.allowed) {
    return forbiddenResponse(
      postCheck.reason || "You do not have permission to post in this channel",
    );
  }

  // Parse mentions from content
  const parsedMentions = mentionService.parseMentions(data.content);
  const mentionedUserIds = data.mentions || [];

  // Send message via service using authenticated user's ID
  const result = await messageService.sendMessage({
    channelId: data.channelId,
    userId: user.id, // Always use authenticated user's ID
    content: data.content,
    type: data.type,
    threadId: data.threadId || undefined,
    parentMessageId: data.parentMessageId || undefined,
    mentions: mentionedUserIds,
    mentionedRoles: data.mentionedRoles,
    mentionedChannels: data.mentionedChannels,
    metadata: data.metadata,
  });

  if (!result.success || !result.data) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to create message",
      },
      { status: result.error?.status || 500 },
    );
  }

  // Index message in MeiliSearch for full-text search (async, don't block response)
  indexMessage({
    id: result.data.id,
    content: data.content,
    author_id: user.id,
    author_name: result.data.user.displayName,
    channel_id: data.channelId,
    channel_name: "",
    thread_id: data.threadId ?? null,
    created_at:
      result.data.createdAt instanceof Date
        ? result.data.createdAt.toISOString()
        : String(result.data.createdAt),
    has_link: hasLinks(data.content),
    has_file: (data.attachments?.length ?? 0) > 0,
    has_image:
      data.attachments?.some((a) => a.mimetype.startsWith("image/")) ?? false,
    is_pinned: false,
    is_starred: false,
  }).catch((err: Error) => {
    logger.warn("Failed to index message in MeiliSearch", {
      error: err,
      messageId: result.data!.id,
    });
  });

  // Send mention notifications (async, don't wait)
  if (mentionedUserIds.length > 0 || mentionService.hasMentions(data.content)) {
    mentionService
      .notifyMentionedUsers(data.content, {
        messageId: result.data.id,
        channelId: data.channelId,
        actorId: user.id,
        actorName: result.data.user.displayName,
        messagePreview: data.content.substring(0, 100),
      })
      .catch((err) => {
        logger.warn("Failed to send mention notifications", { error: err });
      });
  }

  logger.info("POST /api/messages - Message created", {
    messageId: result.data.id,
    channelId: data.channelId,
    userId: user.id,
    isThreadReply: !!data.threadId,
  });

  return createdResponse({ message: result.data });
}

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }), // 60 messages per minute
  withAuth,
)(createMessageHandler as any);

// ============================================================================
// PUT /api/messages - Update/edit message (requires ownership or admin)
// ============================================================================

async function updateMessageHandler(request: AuthenticatedRequest) {
  const { user } = request;
  logger.info("PUT /api/messages - Update message request", {
    userId: user.id,
  });

  const body = await request.json();

  // Validate request body
  const validation = UpdateMessageSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = validation.data;

  // Check permission to edit
  const permCheck = await canModifyMessage(
    data.messageId,
    user.id,
    user.role,
    "edit",
  );
  if (!permCheck.allowed) {
    return forbiddenResponse(
      permCheck.reason || "You do not have permission to edit this message",
    );
  }

  // Parse mentions from updated content
  const parsedMentions = mentionService.parseMentions(data.content);
  const mentionedUserIds = data.mentions || [];

  // Update message via service with editor tracking
  const result = await messageService.updateMessage({
    id: data.messageId,
    content: data.content,
    mentions: mentionedUserIds,
    metadata: data.metadata,
    editorId: user.id, // Track who edited
  });

  if (!result.success || !result.data) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to update message",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("PUT /api/messages - Message updated", {
    messageId: data.messageId,
    updatedBy: user.id,
    isOwner: permCheck.message?.userId === user.id,
  });

  return successResponse({ message: result.data });
}

export const PUT = compose(
  withErrorHandler,
  withRateLimit({ limit: 30, window: 60 }), // 30 edits per minute
  withAuth,
)(updateMessageHandler as any);

// ============================================================================
// DELETE /api/messages - Delete message (requires ownership, mod, or admin)
// ============================================================================

async function deleteMessageHandler(request: AuthenticatedRequest) {
  const { user } = request;
  logger.info("DELETE /api/messages - Delete message request", {
    userId: user.id,
  });

  const searchParams = request.nextUrl.searchParams;
  const messageId = searchParams.get("messageId");
  const hardDelete = searchParams.get("hardDelete") === "true";

  if (!messageId) {
    return badRequestResponse(
      "messageId query parameter is required",
      "MISSING_MESSAGE_ID",
    );
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    return badRequestResponse("Invalid message ID format", "INVALID_ID");
  }

  // Hard delete only allowed for admins/owners
  if (hardDelete && !["owner", "admin"].includes(user.role)) {
    return forbiddenResponse(
      "Only administrators can permanently delete messages",
    );
  }

  // Check permission to delete
  const permCheck = await canModifyMessage(
    messageId,
    user.id,
    user.role,
    "delete",
  );
  if (!permCheck.allowed) {
    return forbiddenResponse(
      permCheck.reason || "You do not have permission to delete this message",
    );
  }

  // Delete message via service
  const result = await messageService.deleteMessage(messageId, {
    hard: hardDelete,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to delete message",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("DELETE /api/messages - Message deleted", {
    messageId,
    hardDelete,
    deletedBy: user.id,
    wasOwner: permCheck.message?.userId === user.id,
  });

  return successResponse({
    message: hardDelete ? "Message deleted permanently" : "Message deleted",
    messageId,
  });
}

export const DELETE = compose(
  withErrorHandler,
  withRateLimit({ limit: 20, window: 60 }), // 20 deletes per minute
  withAuth,
)(deleteMessageHandler as any);

// ============================================================================
// PATCH /api/messages - Add/remove reaction (authenticated)
// ============================================================================

async function reactionHandler(request: AuthenticatedRequest) {
  const { user } = request;
  logger.info("PATCH /api/messages - Reaction request", { userId: user.id });

  const body = await request.json();

  // Validate request body
  const validation = ReactionSchema.safeParse(body);
  if (!validation.success) {
    return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const data = validation.data;

  // Users can only add/remove their own reactions (unless admin)
  if (data.userId !== user.id && !["owner", "admin"].includes(user.role)) {
    return forbiddenResponse("You can only modify your own reactions");
  }

  // Get the message to find its channel
  const messageResult = await messageService.getMessage(data.messageId);
  if (!messageResult.success || !messageResult.data) {
    return notFoundResponse("Message not found");
  }

  // Check if user can react in this channel
  const reactCheck = await canReactInChannel(
    messageResult.data.channelId,
    user.id,
    user.role,
  );
  if (!reactCheck.allowed) {
    return forbiddenResponse(
      reactCheck.reason ||
        "You do not have permission to react in this channel",
    );
  }

  let result;
  if (data.action === "add") {
    result = await reactionService.addReaction({
      messageId: data.messageId,
      userId: user.id, // Always use authenticated user's ID
      emoji: data.emoji,
    });
  } else if (data.action === "remove") {
    result = await reactionService.removeReaction({
      messageId: data.messageId,
      userId: user.id,
      emoji: data.emoji,
    });
  } else {
    result = await reactionService.toggleReaction(
      data.messageId,
      user.id,
      data.emoji,
    );
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error?.message || "Failed to update reaction",
      },
      { status: result.error?.status || 500 },
    );
  }

  logger.info("PATCH /api/messages - Reaction updated", {
    messageId: data.messageId,
    emoji: data.emoji,
    action: data.action,
    userId: user.id,
  });

  return successResponse({ data: result.data });
}

export const PATCH = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }), // 100 reactions per minute
  withAuth,
)(reactionHandler as any);
