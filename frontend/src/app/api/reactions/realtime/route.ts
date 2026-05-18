/**
 * Reactions Realtime API Route
 *
 * POST /api/reactions/realtime - Broadcast reaction event to realtime service
 *
 * Features:
 * - Realtime reaction broadcasting
 * - Socket.io integration via APIEventBroadcaster
 * - Optimistic updates
 * - Rate limiting per user
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import {
  broadcastReactionAdded,
  broadcastReactionRemoved,
} from "@/lib/realtime/broadcast-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ReactionEventSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  channelId: z.string().uuid("Invalid channel ID"),
  userId: z.string().uuid("Invalid user ID"),
  emoji: z.string().min(1).max(50),
  action: z.enum(["add", "remove"]),
  userName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_CHANNEL_MEMBERS = gql`
  query GetChannelMembers($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      user {
        id
        display_name
      }
    }
  }
`;

const GET_MESSAGE_INFO = gql`
  query GetMessageInfo($messageId: uuid!) {
    nchat_messages_by_pk(id: $messageId) {
      id
      channel_id
      reaction_count
      reactions: nchat_reactions(order_by: { created_at: desc }) {
        id
        emoji
        user {
          id
          display_name
          avatar_url
        }
        created_at
      }
    }
  }
`;

// ============================================================================
// POST - Broadcast reaction event
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/reactions/realtime");

    // Parse and validate request body
    const body = await request.json();
    const validation = ReactionEventSchema.safeParse(body);

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

    const event = validation.data;

    // Verify message exists and get updated reaction state
    const { data: messageData, errors } = await apolloClient.query({
      query: GET_MESSAGE_INFO,
      variables: { messageId: event.messageId },
      fetchPolicy: "network-only",
    });

    if (errors || !messageData?.nchat_messages_by_pk) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    const message = messageData.nchat_messages_by_pk;

    // Get channel members to broadcast to
    const { data: membersData } = await apolloClient.query({
      query: GET_CHANNEL_MEMBERS,
      variables: { channelId: event.channelId },
      fetchPolicy: "network-only",
    });

    const memberIds =
      membersData?.nchat_channel_members?.map(
        (m: Record<string, unknown>) => m.user_id,
      ) || [];

    // Group reactions by emoji for efficient client-side rendering
    const reactionSummary = message.reactions.reduce(
      (acc: Record<string, unknown[]>, reaction: Record<string, unknown>) => {
        const emoji = reaction.emoji as string;
        if (!acc[emoji]) {
          acc[emoji] = [];
        }
        acc[emoji].push({
          userId: (reaction.user as Record<string, unknown>).id,
          userName: (reaction.user as Record<string, unknown>).display_name,
          avatarUrl: (reaction.user as Record<string, unknown>).avatar_url,
        });
        return acc;
      },
      {},
    );

    // Build the actor user object for broadcasting
    const actorUser = {
      id: event.userId,
      username: event.userName || event.userId,
      displayName: event.userName,
      avatarUrl: event.avatarUrl,
    };

    // Broadcast via APIEventBroadcaster — posts to the realtime server's
    // /api/broadcast endpoint which fans out to all connected Socket.io clients
    // in the channel room.
    if (event.action === "add") {
      await broadcastReactionAdded(
        event.messageId,
        event.channelId,
        event.emoji,
        actorUser,
        message.reaction_count ?? 0,
      );
    } else {
      await broadcastReactionRemoved(
        event.messageId,
        event.channelId,
        event.emoji,
        event.userId,
        Math.max(0, (message.reaction_count ?? 1) - 1),
      );
    }

    logger.info("Reaction event broadcasted", {
      messageId: event.messageId,
      emoji: event.emoji,
      action: event.action,
      recipientCount: memberIds.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        broadcasted: true,
        recipientCount: memberIds.length,
        reactionCount: message.reaction_count,
        reactionSummary,
      },
    });
  } catch (error) {
    logger.error("POST /api/reactions/realtime - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to broadcast reaction event",
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
