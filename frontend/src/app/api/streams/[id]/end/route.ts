/**
 * End Stream API Route
 *
 * POST /api/streams/[id]/end - End broadcasting stream
 */

import { NextRequest, NextResponse } from "next/server";
import { nhost } from "@/lib/nhost.server";

import { logger } from "@/lib/logger";

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

    // Verify user is the broadcaster
    const { data: streamData, error: streamError } =
      await nhost.graphql.request(
        `
        query GetStreamBroadcaster($id: uuid!) {
          nchat_streams_by_pk(id: $id) {
            broadcaster_id
            status
            started_at
          }
        }
      `,
        { id: streamId },
      );

    if (streamError || !streamData?.nchat_streams_by_pk) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (streamData.nchat_streams_by_pk.broadcaster_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate duration if started
    let recordingDuration = null;
    if (streamData.nchat_streams_by_pk.started_at) {
      const startTime = new Date(
        streamData.nchat_streams_by_pk.started_at,
      ).getTime();
      const endTime = Date.now();
      recordingDuration = Math.floor((endTime - startTime) / 1000); // seconds
    }

    // Update stream status to ended
    const { data, error } = await nhost.graphql.request(
      `
        mutation EndStream($id: uuid!, $duration: Int) {
          update_nchat_streams_by_pk(
            pk_columns: { id: $id }
            _set: {
              status: "ended"
              ended_at: "now()"
              recording_duration_seconds: $duration
            }
          ) {
            id
            channel_id
            broadcaster_id
            title
            status
            started_at
            ended_at
            recording_duration_seconds
            peak_viewer_count
            total_view_count
            total_chat_messages
            total_reactions
          }
        }
      `,
      { id: streamId, duration: recordingDuration },
    );

    if (error || !data?.update_nchat_streams_by_pk) {
      logger.error("Failed to end stream:", error);
      return NextResponse.json(
        { error: "Failed to end stream" },
        { status: 500 },
      );
    }

    return NextResponse.json(data.update_nchat_streams_by_pk);
  } catch (error) {
    logger.error("End stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
