/**
 * Stream Chat API Routes
 *
 * GET  /api/streams/[id]/chat - Get chat messages
 * POST /api/streams/[id]/chat - Send chat message
 */

import { NextRequest, NextResponse } from "next/server";
import { nhost } from "@/lib/nhost.server";

import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const streamId = id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get chat messages
    const { data, error } = await nhost.graphql.request(
      `
        query GetStreamChat($streamId: uuid!, $limit: Int!, $offset: Int!) {
          nchat_stream_chat_messages(
            where: { stream_id: { _eq: $streamId } }
            order_by: { created_at: desc }
            limit: $limit
            offset: $offset
          ) {
            id
            stream_id
            user_id
            content
            is_pinned
            is_deleted
            deleted_at
            deleted_by
            created_at
            user {
              id
              display_name
              avatar_url
            }
          }
        }
      `,
      { streamId, limit, offset },
    );

    if (error) {
      logger.error("Failed to get chat messages:", error);
      return NextResponse.json(
        { error: "Failed to get chat messages" },
        { status: 500 },
      );
    }

    // Reverse to show oldest first
    const messages = (data?.nchat_stream_chat_messages || []).reverse();

    return NextResponse.json(messages);
  } catch (error) {
    logger.error("Get stream chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streamId = id;
    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 },
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "Message too long (max 500 characters)" },
        { status: 400 },
      );
    }

    // Verify stream is live and chat is enabled
    const { data: streamData, error: streamError } =
      await nhost.graphql.request(
        `
        query GetStreamChatStatus($id: uuid!) {
          nchat_streams_by_pk(id: $id) {
            status
            enable_chat
            chat_mode
          }
        }
      `,
        { id: streamId },
      );

    if (streamError || !streamData?.nchat_streams_by_pk) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (!streamData.nchat_streams_by_pk.enable_chat) {
      return NextResponse.json(
        { error: "Chat is disabled for this stream" },
        { status: 403 },
      );
    }

    if (streamData.nchat_streams_by_pk.status !== "live") {
      return NextResponse.json(
        { error: "Stream is not live" },
        { status: 400 },
      );
    }

    // Insert chat message
    const { data, error } = await nhost.graphql.request(
      `
        mutation SendStreamChat($object: nchat_stream_chat_messages_insert_input!) {
          insert_nchat_stream_chat_messages_one(object: $object) {
            id
            stream_id
            user_id
            content
            is_pinned
            is_deleted
            created_at
            user {
              id
              display_name
              avatar_url
            }
          }
        }
      `,
      {
        object: {
          stream_id: streamId,
          user_id: userId,
          content: content.trim(),
        },
      },
    );

    if (error || !data?.insert_nchat_stream_chat_messages_one) {
      logger.error("Failed to send chat message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    return NextResponse.json(data.insert_nchat_stream_chat_messages_one);
  } catch (error) {
    logger.error("Send stream chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
