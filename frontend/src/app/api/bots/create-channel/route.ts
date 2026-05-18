/**
 * Bot API: Create Channel
 * POST /api/bots/create-channel
 *
 * Allows bots to create new channels
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { withBotAuth } from "@/lib/api/bot-auth";
import { BotPermission } from "@/lib/bots/permissions";

import { logger } from "@/lib/logger";

/**
 * GraphQL mutation to create channel
 */
const CREATE_CHANNEL = gql`
  mutation CreateChannel(
    $name: String!
    $description: String
    $isPrivate: Boolean!
    $createdBy: uuid!
    $metadata: jsonb
  ) {
    insert_nchat_channels_one(
      object: {
        name: $name
        description: $description
        is_private: $isPrivate
        created_by: $createdBy
        metadata: $metadata
      }
    ) {
      id
      name
      description
      is_private
      created_at
      created_by
    }
  }
`;

/**
 * Request body schema
 */
interface CreateChannelRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

/**
 * POST handler
 */
export const POST = withBotAuth(async (request: NextRequest, auth) => {
  try {
    // Parse request body
    const body = (await request.json()) as CreateChannelRequest;

    // Validate required fields
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required and cannot be empty" },
        { status: 400 },
      );
    }

    // Validate name format
    if (!/^[a-z0-9-_]{1,50}$/.test(body.name)) {
      return NextResponse.json(
        {
          error:
            "name must be 1-50 characters, lowercase letters, numbers, hyphens, and underscores only",
        },
        { status: 400 },
      );
    }

    // Validate description length
    if (body.description && body.description.length > 500) {
      return NextResponse.json(
        { error: "description exceeds maximum length of 500 characters" },
        { status: 400 },
      );
    }

    // Create channel
    const client = getApolloClient();
    const { data, errors } = await client.mutate({
      mutation: CREATE_CHANNEL,
      variables: {
        name: body.name,
        description: body.description || null,
        isPrivate: body.isPrivate || false,
        createdBy: auth.userId,
        metadata: {
          ...body.metadata,
          createdByBot: true,
          botId: auth.botId,
          botName: auth.botName,
        },
      },
    });

    if (errors || !data?.insert_nchat_channels_one) {
      logger.error("GraphQL errors:", errors);

      // Check for unique constraint violation
      const isDuplicateName = errors?.some(
        (e: { message: string }) =>
          e.message.includes("unique constraint") ||
          e.message.includes("duplicate key"),
      );

      if (isDuplicateName) {
        return NextResponse.json(
          { error: "A channel with this name already exists" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Failed to create channel", details: errors },
        { status: 500 },
      );
    }

    const channel = data.insert_nchat_channels_one;

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.is_private,
        createdAt: channel.created_at,
        createdBy: channel.created_by,
      },
    });
  } catch (error) {
    logger.error("Error creating channel:", error);
    return NextResponse.json(
      {
        error:
          (error instanceof Error ? error.message : String(error)) ||
          "Internal server error",
      },
      { status: 500 },
    );
  }
}, BotPermission.CHANNELS_CREATE);
