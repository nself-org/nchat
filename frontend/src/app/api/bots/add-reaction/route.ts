/**
 * Bot API: Add Reaction
 * POST /api/bots/add-reaction
 *
 * Allows bots to add reactions to messages
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { withBotAuth } from "@/lib/api/bot-auth";
import { BotPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * GraphQL mutation to add reaction
 */
const ADD_REACTION = gql`
  mutation AddReaction($messageId: uuid!, $userId: uuid!, $emoji: String!) {
    insert_nchat_reactions_one(
      object: { message_id: $messageId, user_id: $userId, emoji: $emoji }
      on_conflict: {
        constraint: reactions_message_id_user_id_emoji_key
        update_columns: []
      }
    ) {
      id
      emoji
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
 * GraphQL query to check if message exists
 */
const CHECK_MESSAGE = gql`
  query CheckMessage($messageId: uuid!) {
    nchat_messages_by_pk(id: $messageId) {
      id
      channel_id
    }
  }
`;

/**
 * Request body schema
 */
interface AddReactionRequest {
  messageId: string;
  emoji: string;
}

/**
 * Validate emoji format
 * Supports: unicode emojis and :shortcode: format
 */
function isValidEmoji(emoji: string): boolean {
  // Check for :shortcode: format
  if (/^:[a-z0-9_+-]+:$/i.test(emoji)) {
    return true;
  }

  // Check for unicode emoji (basic validation)
  // This is a simplified check - full emoji validation is complex
  if (
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
      emoji,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * POST handler
 */
export const POST = withBotAuth(async (request: NextRequest, auth) => {
  try {
    // Parse request body
    const body = (await request.json()) as AddReactionRequest;

    // Validate required fields
    if (!body.messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 },
      );
    }

    if (!body.emoji) {
      return NextResponse.json({ error: "emoji is required" }, { status: 400 });
    }

    // Validate emoji format
    if (!isValidEmoji(body.emoji)) {
      return NextResponse.json(
        { error: "Invalid emoji format" },
        { status: 400 },
      );
    }

    // Check if message exists
    const client = getApolloClient();
    const { data: messageData } = await client.query({
      query: CHECK_MESSAGE,
      variables: { messageId: body.messageId },
      fetchPolicy: "network-only",
    });

    if (!messageData?.nchat_messages_by_pk) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Add reaction
    const { data, errors } = await client.mutate({
      mutation: ADD_REACTION,
      variables: {
        messageId: body.messageId,
        userId: auth.userId,
        emoji: body.emoji,
      },
    });

    if (errors || !data?.insert_nchat_reactions_one) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to add reaction", details: errors },
        { status: 500 },
      );
    }

    const reaction = data.insert_nchat_reactions_one;

    return NextResponse.json({
      success: true,
      reaction: {
        id: reaction.id,
        emoji: reaction.emoji,
        messageId: body.messageId,
        createdAt: reaction.created_at,
        user: reaction.user,
      },
    });
  } catch (error) {
    logger.error("Error adding reaction:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}, BotPermission.REACTIONS_ADD);
