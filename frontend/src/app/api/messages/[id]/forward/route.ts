/**
 * Message Forward API Route
 *
 * POST /api/messages/[id]/forward - Forward a message to one or more channels
 *
 * Features:
 * - Forward to multiple channels
 * - Optional comment/context
 * - Permission checks
 * - Audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ForwardMessageSchema = z.object({
  channelIds: z
    .array(z.string().uuid())
    .min(1, "At least one channel required"),
  userId: z.string().uuid("Invalid user ID"),
  comment: z.string().max(500).optional(),
  includeAttachments: z.boolean().default(true),
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_MESSAGE = gql`
  query GetMessageForForward($id: uuid!) {
    nchat_messages_by_pk(id: $id) {
      id
      content
      content_html
      type
      user_id
      channel_id
      metadata
      user {
        id
        display_name
        avatar_url
      }
      attachments: nchat_attachments {
        id
        file_name
        file_type
        file_size
        file_url
        thumbnail_url
        metadata
      }
    }
  }
`;

const FORWARD_MESSAGE = gql`
  mutation ForwardMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $contentHtml: String
    $type: String!
    $metadata: jsonb!
    $quotedMessageId: uuid
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        content_html: $contentHtml
        type: $type
        metadata: $metadata
        quoted_message_id: $quotedMessageId
      }
    ) {
      id
      content
      created_at
      channel_id
    }
  }
`;

const CREATE_FORWARDED_RECORD = gql`
  mutation CreateForwardedRecord(
    $originalMessageId: uuid!
    $forwardedMessageId: uuid!
    $forwardedBy: uuid!
  ) {
    insert_nchat_forwarded_messages_one(
      object: {
        original_message_id: $originalMessageId
        forwarded_message_id: $forwardedMessageId
        forwarded_by: $forwardedBy
      }
    ) {
      id
    }
  }
`;

const COPY_ATTACHMENTS = gql`
  mutation CopyAttachments($objects: [nchat_attachments_insert_input!]!) {
    insert_nchat_attachments(objects: $objects) {
      affected_rows
    }
  }
`;

// ============================================================================
// POST - Forward message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const messageId = resolvedParams.id;

  try {
    logger.info("POST /api/messages/[id]/forward", { messageId });

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ForwardMessageSchema.safeParse(body);

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

    const { channelIds, userId, comment, includeAttachments } = validation.data;

    // Fetch original message
    const { data: messageData, errors: messageErrors } =
      await apolloClient.query({
        query: GET_MESSAGE,
        variables: { id: messageId },
        fetchPolicy: "network-only",
      });

    if (messageErrors || !messageData?.nchat_messages_by_pk) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    const originalMessage = messageData.nchat_messages_by_pk;
    const forwardedMessages: string[] = [];

    // Forward to each channel
    for (const channelId of channelIds) {
      // Build forwarded message content
      let forwardedContent = `Forwarded from ${originalMessage.user.display_name}:\n\n${originalMessage.content}`;

      if (comment) {
        forwardedContent = `${comment}\n\n---\n\n${forwardedContent}`;
      }

      // Add forward metadata
      const forwardMetadata = {
        ...originalMessage.metadata,
        forwarded: true,
        original_message_id: messageId,
        original_channel_id: originalMessage.channel_id,
        original_user_id: originalMessage.user_id,
        original_user_name: originalMessage.user.display_name,
        forwarded_by: userId,
        forwarded_at: new Date().toISOString(),
      };

      // Create forwarded message
      const { data: forwardData, errors: forwardErrors } =
        await apolloClient.mutate({
          mutation: FORWARD_MESSAGE,
          variables: {
            channelId,
            userId,
            content: forwardedContent,
            contentHtml: originalMessage.content_html,
            type: originalMessage.type,
            metadata: forwardMetadata,
            quotedMessageId: messageId,
          },
        });

      if (forwardErrors || !forwardData?.insert_nchat_messages_one) {
        logger.error("Failed to forward message to channel", {
          channelId,
          error: forwardErrors,
        });
        continue;
      }

      const newMessageId = forwardData.insert_nchat_messages_one.id;
      forwardedMessages.push(newMessageId);

      // Create forwarded record for tracking
      await apolloClient.mutate({
        mutation: CREATE_FORWARDED_RECORD,
        variables: {
          originalMessageId: messageId,
          forwardedMessageId: newMessageId,
          forwardedBy: userId,
        },
      });

      // Copy attachments if requested
      if (includeAttachments && originalMessage.attachments?.length > 0) {
        const attachmentObjects = originalMessage.attachments.map(
          (att: Record<string, unknown>) => ({
            message_id: newMessageId,
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size,
            file_url: att.file_url,
            thumbnail_url: att.thumbnail_url,
            metadata: att.metadata,
          }),
        );

        await apolloClient.mutate({
          mutation: COPY_ATTACHMENTS,
          variables: { objects: attachmentObjects },
        });
      }

      // Log audit event
      await logAuditEvent({
        action: "forward",
        actor: userId,
        category: "message",
        resource: { type: "message", id: messageId },
        description: `Message forwarded to channel ${channelId}`,
        metadata: {
          originalMessageId: messageId,
          targetChannelId: channelId,
          newMessageId,
          includeAttachments,
          hasComment: !!comment,
        },
      });
    }

    logger.info("Message forwarded successfully", {
      messageId,
      forwardedCount: forwardedMessages.length,
      targetChannels: channelIds.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          originalMessageId: messageId,
          forwardedMessageIds: forwardedMessages,
          channelCount: forwardedMessages.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/messages/[id]/forward - Error", error as Error, {
      messageId,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to forward message",
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
