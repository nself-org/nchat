/**
 * Bot API: Send Message
 * POST /api/bots/send-message
 *
 * Allows bots to send messages to channels
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { withBotAuth } from "@/lib/api/bot-auth";
import { BotPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * GraphQL mutation to send message
 */
const SEND_MESSAGE = gql`
  mutation SendMessage(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $attachments: jsonb
    $metadata: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        attachments: $attachments
        metadata: $metadata
      }
    ) {
      id
      content
      created_at
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

/**
 * Request body schema
 */
interface SendMessageRequest {
  channelId: string;
  content: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size?: number;
  }>;
  metadata?: Record<string, any>;
}

/**
 * POST handler
 */
export const POST = withBotAuth(async (request: NextRequest, auth) => {
  try {
    // Parse request body
    const body = (await request.json()) as SendMessageRequest;

    // Validate required fields
    if (!body.channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 },
      );
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: "content is required and cannot be empty" },
        { status: 400 },
      );
    }

    // Validate content length (max 10,000 characters)
    if (body.content.length > 10000) {
      return NextResponse.json(
        { error: "content exceeds maximum length of 10,000 characters" },
        { status: 400 },
      );
    }

    // Send message using bot's user_id
    const client = getApolloClient();
    const { data, errors } = await client.mutate({
      mutation: SEND_MESSAGE,
      variables: {
        channelId: body.channelId,
        userId: auth.userId,
        content: body.content,
        attachments: body.attachments || null,
        metadata: {
          ...body.metadata,
          sentByBot: true,
          botId: auth.botId,
          botName: auth.botName,
        },
      },
    });

    if (errors || !data?.insert_nchat_messages_one) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to send message", details: errors },
        { status: 500 },
      );
    }

    const message = data.insert_nchat_messages_one;

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        channelId: body.channelId,
        createdAt: message.created_at,
        user: message.user,
      },
    });
  } catch (error) {
    logger.error("Error sending message:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}, BotPermission.MESSAGES_SEND);
