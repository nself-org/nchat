/**
 * Bot API: Get Channel Info
 * GET /api/bots/channel-info?channelId=xxx
 *
 * Allows bots to read channel information
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { withBotAuth } from "@/lib/api/bot-auth";
import { BotPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * GraphQL query to get channel info
 */
const GET_CHANNEL_INFO = gql`
  query GetChannelInfo($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      id
      name
      description
      is_private
      created_at
      updated_at
      created_by
      metadata
      creator {
        id
        display_name
        avatar_url
      }
      _aggregate_messages: messages_aggregate {
        aggregate {
          count
        }
      }
      _aggregate_members: channel_members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * GET handler
 */
export const GET = withBotAuth(async (request: NextRequest) => {
  try {
    // Get channelId from query params
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId query parameter is required" },
        { status: 400 },
      );
    }

    // Fetch channel info
    const client = getApolloClient();
    const { data, errors } = await client.query({
      query: GET_CHANNEL_INFO,
      variables: { channelId },
      fetchPolicy: "network-only",
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch channel info", details: errors },
        { status: 500 },
      );
    }

    const channel = data?.nchat_channels_by_pk;

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.is_private,
        createdAt: channel.created_at,
        updatedAt: channel.updated_at,
        createdBy: channel.created_by,
        metadata: channel.metadata,
        creator: channel.creator,
        stats: {
          messageCount: channel._aggregate_messages?.aggregate?.count || 0,
          memberCount: channel._aggregate_members?.aggregate?.count || 0,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching channel info:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}, BotPermission.CHANNELS_READ);
