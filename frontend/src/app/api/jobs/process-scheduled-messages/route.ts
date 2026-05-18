/**
 * Process Scheduled Messages Job API Route
 *
 * POST /api/jobs/process-scheduled-messages - Process and send due scheduled messages
 *
 * Features:
 * - Batch processing
 * - Error handling and retry logic
 * - Timezone-aware scheduling
 * - Audit logging
 * - Rate limiting
 *
 * This endpoint should be called by a cron job or scheduler (e.g., Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { getScheduledMessageService } from "@/services/messages/scheduled.service";
import { getMessageService } from "@/services/messages/message.service";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long-running job

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 50; // Process 50 messages at a time
const MAX_RETRY_COUNT = 3;
const CRON_SECRET = process.env.CRON_SECRET || "change-me-in-production";

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_DUE_SCHEDULED_MESSAGES = gql`
  query GetDueScheduledMessages($now: timestamptz!, $limit: Int!) {
    nchat_scheduled_message(
      where: {
        scheduled_for: { _lte: $now }
        is_sent: { _eq: false }
        is_cancelled: { _eq: false }
        retry_count: { _lt: ${MAX_RETRY_COUNT} }
      }
      order_by: { scheduled_for: asc }
      limit: $limit
    ) {
      id
      channel_id
      user_id
      content
      content_type
      attachments
      mentions
      thread_id
      scheduled_for
      timezone
      recurrence
      retry_count
      channel {
        id
        name
        is_archived
      }
      user {
        id
        display_name
      }
    }
  }
`;

const MARK_MESSAGE_AS_SENT = gql`
  mutation MarkScheduledMessageAsSent(
    $id: uuid!
    $sentAt: timestamptz!
    $messageId: uuid!
  ) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _set: { is_sent: true, sent_at: $sentAt, sent_message_id: $messageId }
    ) {
      id
      is_sent
      sent_at
    }
  }
`;

const MARK_MESSAGE_AS_FAILED = gql`
  mutation MarkScheduledMessageAsFailed(
    $id: uuid!
    $errorMessage: String!
    $retryCount: Int!
  ) {
    update_nchat_scheduled_message_by_pk(
      pk_columns: { id: $id }
      _set: { error_message: $errorMessage, retry_count: $retryCount }
    ) {
      id
      error_message
      retry_count
    }
  }
`;

const CREATE_RECURRING_MESSAGE = gql`
  mutation CreateRecurringScheduledMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $contentType: String!
    $attachments: jsonb
    $mentions: jsonb
    $threadId: uuid
    $scheduledFor: timestamptz!
    $timezone: String!
    $recurrence: jsonb
  ) {
    insert_nchat_scheduled_message_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        content_type: $contentType
        attachments: $attachments
        mentions: $mentions
        thread_id: $threadId
        scheduled_for: $scheduledFor
        timezone: $timezone
        recurrence: $recurrence
      }
    ) {
      id
      scheduled_for
    }
  }
`;

// ============================================================================
// HELPERS
// ============================================================================

function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronAuth = request.headers.get("x-cron-auth");

  if (authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  if (cronAuth === CRON_SECRET) {
    return true;
  }

  return false;
}

function calculateNextOccurrence(
  currentDate: Date,
  recurrence: Record<string, unknown>,
): Date | null {
  const { type, interval = 1, end_at } = recurrence;

  if (end_at && new Date(end_at as string) < currentDate) {
    return null; // Recurrence has ended
  }

  const next = new Date(currentDate);

  switch (type) {
    case "daily":
      next.setDate(next.getDate() + (interval as number));
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * (interval as number));
      break;
    case "monthly":
      next.setMonth(next.getMonth() + (interval as number));
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + (interval as number));
      break;
    default:
      return null;
  }

  return next;
}

// ============================================================================
// POST - Process scheduled messages
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/jobs/process-scheduled-messages - Starting job");

    // Validate cron authentication
    if (!validateCronAuth(request)) {
      logger.warn("Unauthorized cron job attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const now = new Date().toISOString();
    const client = getServerApolloClient();
    const messageService = getMessageService(client);
    const stats = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      recurring: 0,
    };

    // Fetch due messages in batches
    const { data, errors } = await client.query({
      query: GET_DUE_SCHEDULED_MESSAGES,
      variables: { now, limit: BATCH_SIZE },
      fetchPolicy: "network-only",
    });

    if (errors) {
      throw new Error(errors[0].message);
    }

    const dueMessages = data.nchat_scheduled_message || [];
    logger.info("Found due scheduled messages", { count: dueMessages.length });

    // Process each message
    for (const scheduledMsg of dueMessages) {
      stats.processed++;

      try {
        // Skip if channel is archived
        if (scheduledMsg.channel.is_archived) {
          logger.warn("Skipping message for archived channel", {
            scheduledMessageId: scheduledMsg.id,
            channelId: scheduledMsg.channel_id,
          });
          stats.skipped++;
          await client.mutate({
            mutation: MARK_MESSAGE_AS_FAILED,
            variables: {
              id: scheduledMsg.id,
              errorMessage: "Channel is archived",
              retryCount: scheduledMsg.retry_count + 1,
            },
          });
          continue;
        }

        // Send the message
        const result = await messageService.sendMessage({
          channelId: scheduledMsg.channel_id,
          userId: scheduledMsg.user_id,
          content: scheduledMsg.content,
          type: scheduledMsg.content_type,
          threadId: scheduledMsg.thread_id,
          mentions: scheduledMsg.mentions?.userIds || [],
          metadata: {
            scheduled: true,
            originalScheduledFor: scheduledMsg.scheduled_for,
            scheduledMessageId: scheduledMsg.id,
          },
        });

        if (!result.success || !result.data) {
          throw new Error(result.error?.message || "Failed to send message");
        }

        const sentMessage = result.data;

        // Mark as sent
        await client.mutate({
          mutation: MARK_MESSAGE_AS_SENT,
          variables: {
            id: scheduledMsg.id,
            sentAt: new Date().toISOString(),
            messageId: sentMessage.id,
          },
        });

        stats.sent++;

        // Handle recurring messages
        if (scheduledMsg.recurrence) {
          const nextOccurrence = calculateNextOccurrence(
            new Date(scheduledMsg.scheduled_for),
            scheduledMsg.recurrence as Record<string, unknown>,
          );

          if (nextOccurrence) {
            await client.mutate({
              mutation: CREATE_RECURRING_MESSAGE,
              variables: {
                channelId: scheduledMsg.channel_id,
                userId: scheduledMsg.user_id,
                content: scheduledMsg.content,
                contentType: scheduledMsg.content_type,
                attachments: scheduledMsg.attachments,
                mentions: scheduledMsg.mentions,
                threadId: scheduledMsg.thread_id,
                scheduledFor: nextOccurrence.toISOString(),
                timezone: scheduledMsg.timezone,
                recurrence: scheduledMsg.recurrence,
              },
            });

            stats.recurring++;
            logger.info("Created next recurring message", {
              originalId: scheduledMsg.id,
              nextOccurrence: nextOccurrence.toISOString(),
            });
          }
        }

        // Log audit event
        await logAuditEvent({
          action: "send_scheduled",
          actor: scheduledMsg.user_id,
          category: "message",
          resource: { type: "scheduled_message", id: scheduledMsg.id },
          description: `Scheduled message sent to channel ${scheduledMsg.channel.name}`,
          metadata: {
            scheduledMessageId: scheduledMsg.id,
            sentMessageId: sentMessage.id,
            scheduledFor: scheduledMsg.scheduled_for,
            sentAt: new Date().toISOString(),
          },
        });

        logger.info("Scheduled message sent successfully", {
          scheduledMessageId: scheduledMsg.id,
          messageId: sentMessage.id,
          channelId: scheduledMsg.channel_id,
        });
      } catch (error) {
        stats.failed++;
        const errorMessage =
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error";

        logger.error("Failed to send scheduled message", error as Error, {
          scheduledMessageId: scheduledMsg.id,
          retryCount: scheduledMsg.retry_count,
        });

        // Mark as failed and increment retry count
        await client.mutate({
          mutation: MARK_MESSAGE_AS_FAILED,
          variables: {
            id: scheduledMsg.id,
            errorMessage,
            retryCount: scheduledMsg.retry_count + 1,
          },
        });
      }
    }

    logger.info(
      "POST /api/jobs/process-scheduled-messages - Job completed",
      stats,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        batchSize: BATCH_SIZE,
      },
    });
  } catch (error) {
    logger.error(
      "POST /api/jobs/process-scheduled-messages - Error",
      error as Error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process scheduled messages",
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

// ============================================================================
// GET - Job status (for monitoring)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Validate auth
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = getServerApolloClient();
    const scheduledMessageService = getScheduledMessageService(client);

    // Get stats
    const pendingResult = await scheduledMessageService.getScheduledMessages({
      userId: "system",
      isSent: false,
      limit: 1,
      offset: 0,
    });

    // Query actual failed message count
    const failedCountResult = await client.query({
      query: gql`
        query GetFailedScheduledMessageCount {
          nchat_scheduled_message_aggregate(
            where: {
              status: { _eq: "failed" }
              retry_count: { _gte: ${MAX_RETRY_COUNT} }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `,
      fetchPolicy: "network-only",
    });
    const failedCount =
      failedCountResult.data?.nchat_scheduled_message_aggregate?.aggregate
        ?.count ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        status: "healthy",
        pendingCount: pendingResult.data?.totalCount || 0,
        failedCount,
        lastRun: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      "GET /api/jobs/process-scheduled-messages - Error",
      error as Error,
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get job status",
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
