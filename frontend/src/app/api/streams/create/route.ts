/**
 * Create Stream API Route
 *
 * POST /api/streams/create
 * Creates a new live stream with scheduling support.
 */

import { NextRequest, NextResponse } from "next/server";
import { nhost } from "@/lib/nhost.server";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      channelId,
      title,
      description,
      thumbnailUrl,
      scheduledAt,
      maxResolution = "1080p",
      enableChat = true,
      enableReactions = true,
      enableQa = false,
      chatMode = "open",
      tags = [],
    } = body;

    // Validate required fields
    if (!channelId || !title) {
      return NextResponse.json(
        { error: "channelId and title are required" },
        { status: 400 },
      );
    }

    // Verify user has access to channel
    const { data: channelMember, error: memberError } =
      await nhost.graphql.request(
        `
        query CheckChannelMember($channelId: uuid!, $userId: uuid!) {
          nchat_channel_members(
            where: {
              channel_id: { _eq: $channelId }
              user_id: { _eq: $userId }
            }
          ) {
            id
          }
        }
      `,
        { channelId, userId },
      );

    if (memberError || !channelMember?.nchat_channel_members?.length) {
      return NextResponse.json(
        { error: "Not a member of this channel" },
        { status: 403 },
      );
    }

    // Generate stream key
    const streamKey = generateStreamKey();

    // Create stream in database
    const { data, error } = await nhost.graphql.request(
      `
        mutation CreateStream($object: nchat_streams_insert_input!) {
          insert_nchat_streams_one(object: $object) {
            id
            channel_id
            broadcaster_id
            title
            description
            thumbnail_url
            scheduled_at
            status
            stream_key
            ingest_url
            hls_manifest_url
            dash_manifest_url
            max_resolution
            bitrate_kbps
            fps
            is_recorded
            enable_chat
            enable_reactions
            enable_qa
            chat_mode
            tags
            language
            created_at
            updated_at
          }
        }
      `,
      {
        object: {
          channel_id: channelId,
          broadcaster_id: userId,
          title,
          description,
          thumbnail_url: thumbnailUrl,
          scheduled_at: scheduledAt,
          status: scheduledAt ? "scheduled" : "preparing",
          stream_key: streamKey,
          ingest_url: `${process.env.NEXT_PUBLIC_STREAM_INGEST_URL}/live/${streamKey}`,
          max_resolution: maxResolution,
          enable_chat: enableChat,
          enable_reactions: enableReactions,
          enable_qa: enableQa,
          chat_mode: chatMode,
          tags,
        },
      },
    );

    if (error) {
      logger.error("Failed to create stream:", error);
      return NextResponse.json(
        { error: "Failed to create stream" },
        { status: 500 },
      );
    }

    return NextResponse.json(data.insert_nchat_streams_one);
  } catch (error) {
    logger.error("Stream creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Generate unique stream key
 */
function generateStreamKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
