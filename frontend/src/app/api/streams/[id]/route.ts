/**
 * Stream Details API Routes
 *
 * GET    /api/streams/[id] - Get stream details
 * PATCH  /api/streams/[id] - Update stream
 * DELETE /api/streams/[id] - Delete stream
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

    // Get stream details
    const { data, error } = await nhost.graphql.request(
      `
        query GetStream($id: uuid!) {
          nchat_streams_by_pk(id: $id) {
            id
            channel_id
            broadcaster_id
            title
            description
            thumbnail_url
            scheduled_at
            started_at
            ended_at
            status
            stream_key
            ingest_url
            hls_manifest_url
            dash_manifest_url
            max_resolution
            bitrate_kbps
            fps
            is_recorded
            recording_url
            recording_duration_seconds
            peak_viewer_count
            total_view_count
            total_chat_messages
            total_reactions
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
      { id: streamId },
    );

    if (error || !data?.nchat_streams_by_pk) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    return NextResponse.json(data.nchat_streams_by_pk);
  } catch (error) {
    logger.error("Get stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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
    const {
      title,
      description,
      thumbnailUrl,
      scheduledAt,
      maxResolution,
      enableChat,
      enableReactions,
      enableQa,
      chatMode,
      tags,
    } = body;

    // Build update object (only include provided fields)
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl;
    if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;
    if (maxResolution !== undefined) updates.max_resolution = maxResolution;
    if (enableChat !== undefined) updates.enable_chat = enableChat;
    if (enableReactions !== undefined)
      updates.enable_reactions = enableReactions;
    if (enableQa !== undefined) updates.enable_qa = enableQa;
    if (chatMode !== undefined) updates.chat_mode = chatMode;
    if (tags !== undefined) updates.tags = tags;

    // Update stream
    const { data, error } = await nhost.graphql.request(
      `
        mutation UpdateStream($id: uuid!, $updates: nchat_streams_set_input!) {
          update_nchat_streams_by_pk(
            pk_columns: { id: $id }
            _set: $updates
          ) {
            id
            title
            description
            thumbnail_url
            scheduled_at
            max_resolution
            enable_chat
            enable_reactions
            enable_qa
            chat_mode
            tags
            updated_at
          }
        }
      `,
      { id: streamId, updates },
    );

    if (error || !data?.update_nchat_streams_by_pk) {
      logger.error("Failed to update stream:", error);
      return NextResponse.json(
        { error: "Failed to update stream" },
        { status: 500 },
      );
    }

    return NextResponse.json(data.update_nchat_streams_by_pk);
  } catch (error) {
    logger.error("Update stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    // Delete stream (will cascade delete related records)
    const { data, error } = await nhost.graphql.request(
      `
        mutation DeleteStream($id: uuid!) {
          delete_nchat_streams_by_pk(id: $id) {
            id
          }
        }
      `,
      { id: streamId },
    );

    if (error) {
      logger.error("Failed to delete stream:", error);
      return NextResponse.json(
        { error: "Failed to delete stream" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Delete stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
