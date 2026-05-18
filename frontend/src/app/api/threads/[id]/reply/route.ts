/**
 * Thread Reply API Route
 *
 * POST /api/threads/[id]/reply - Reply to a thread
 *
 * Features:
 * - Create reply in thread
 * - Automatically track participants
 * - Send notifications to thread participants
 * - Update thread metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { getThreadService } from "@/services/messages/thread.service";
import { apolloClient } from "@/lib/apollo-client";
import { getMentionService } from "@/services/messages/mention.service";
import { getNotificationService } from "@/services/notifications/notification.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ThreadReplySchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4000, "Message content too long (max 4000 characters)"),
  mentions: z.array(z.string().uuid()).optional(),
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

// ============================================================================
// SERVICES
// ============================================================================

const threadService = getThreadService(apolloClient);
const mentionService = getMentionService(apolloClient);
const notificationService = getNotificationService();

// ============================================================================
// POST - Reply to thread
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const threadId = resolvedParams.id;

  try {
    logger.info("POST /api/threads/[id]/reply", { threadId });

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread ID format" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ThreadReplySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Parse mentions from content
    const parsedMentions = mentionService.parseMentions(data.content);
    const mentionedUserIds = data.mentions || [];

    // Reply to thread via service
    const result = await threadService.replyToThread({
      threadId,
      channelId: data.channelId,
      userId: data.userId,
      content: data.content,
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to create thread reply",
        },
        { status: result.error?.status || 500 },
      );
    }

    const reply = result.data;

    // Send mention notifications (async, don't wait)
    if (
      mentionedUserIds.length > 0 ||
      mentionService.hasMentions(data.content)
    ) {
      mentionService
        .notifyMentionedUsers(data.content, {
          messageId: reply.id,
          channelId: reply.channelId,
          actorId: data.userId,
          actorName: reply.user.displayName,
          messagePreview: data.content.substring(0, 100),
        })
        .catch((err) => {
          logger.warn("Failed to send mention notifications in thread", {
            error: err,
          });
        });
    }

    // Get thread participants to notify
    const threadResult = await threadService.getThread(threadId);
    if (threadResult.success && threadResult.data) {
      const thread = threadResult.data;
      const participantIds = thread.participants
        .map((p) => p.id)
        .filter((id) => id !== data.userId); // Don't notify the author

      // Send thread reply notifications (async)
      if (participantIds.length > 0) {
        // Notify each participant of the new reply
        // Cast to any to work around Thread.participants type mismatch
        const threadParticipants = thread.participants as any[];
        Promise.all(
          threadParticipants
            .filter((p) => p.userId !== data.userId && p.notificationsEnabled)
            .map(async (participant) => {
              try {
                await notificationService.send({
                  userId: participant.userId,
                  channel: "push",
                  category: "transactional",
                  template: "nchat_thread_reply",
                  to: {
                    // Push token would come from user preferences
                    pushToken: undefined,
                  },
                  variables: {
                    actor_name: reply.user.displayName,
                    actor_avatar: reply.user.avatarUrl,
                    channel_name: thread.rootMessage?.channelId || "",
                    message_preview: data.content.substring(0, 100),
                    action_url: `/chat/${reply.channelId}?thread=${threadId}`,
                  },
                  metadata: {
                    event_type: "thread.reply",
                    actor_id: data.userId,
                    channel_id: reply.channelId,
                    message_id: reply.id,
                    thread_id: threadId,
                  },
                  tags: ["thread.reply", `thread:${threadId}`],
                });
              } catch (err) {
                logger.warn(
                  "Failed to send thread reply notification to participant",
                  {
                    error: err,
                    participantId: participant.userId,
                    threadId,
                  },
                );
              }
            }),
        ).catch((err) => {
          logger.warn("Failed to send some thread reply notifications", {
            error: err,
            threadId,
          });
        });

        logger.debug("Sending thread reply notifications", {
          threadId,
          participantCount: participantIds.length,
          replyId: reply.id,
        });
      }
    }

    logger.info("Thread reply created successfully", {
      threadId,
      replyId: reply.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          reply,
          threadId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/threads/[id]/reply - Error", error as Error, {
      threadId,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create thread reply",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
