/**
 * Bot API: Get User Info
 * GET /api/bots/user-info?userId=xxx
 *
 * Allows bots to read user information
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { withBotAuth } from "@/lib/api/bot-auth";
import { BotPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * GraphQL query to get user info
 */
const GET_USER_INFO = gql`
  query GetUserInfo($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      display_name
      avatar_url
      bio
      role
      status
      is_bot
      created_at
      updated_at
      metadata
      _aggregate_messages: messages_aggregate {
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
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 },
      );
    }

    // Fetch user info
    const client = getApolloClient();
    const { data, errors } = await client.query({
      query: GET_USER_INFO,
      variables: { userId },
      fetchPolicy: "network-only",
    });

    if (errors) {
      logger.error("GraphQL errors:", errors);
      return NextResponse.json(
        { error: "Failed to fetch user info", details: errors },
        { status: 500 },
      );
    }

    const user = data?.nchat_users_by_pk;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        role: user.role,
        status: user.status,
        isBot: user.is_bot,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        metadata: user.metadata,
        stats: {
          messageCount: user._aggregate_messages?.aggregate?.count || 0,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching user info:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}, BotPermission.USERS_READ);
