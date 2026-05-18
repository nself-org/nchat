/**
 * Start Stream API Route
 *
 * POST /api/streams/[id]/start - Start broadcasting stream (go live)
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

    if (streamData.nchat_streams_by_pk.status === "live") {
      return NextResponse.json(
        { error: "Stream is already live" },
        { status: 400 },
      );
    }

    // Generate HLS and DASH manifest URLs
    const hlsManifestUrl = `${process.env.NEXT_PUBLIC_HLS_BASE_URL}/${streamId}/index.m3u8`;
    const dashManifestUrl = `${process.env.NEXT_PUBLIC_DASH_BASE_URL || process.env.NEXT_PUBLIC_HLS_BASE_URL}/${streamId}/manifest.mpd`;

    // Update stream status to live with both HLS and DASH manifests
    const { data, error } = await nhost.graphql.request(
      `
        mutation StartStream($id: uuid!, $hlsUrl: String!, $dashUrl: String!) {
          update_nchat_streams_by_pk(
            pk_columns: { id: $id }
            _set: {
              status: "live"
              started_at: "now()"
              hls_manifest_url: $hlsUrl
              dash_manifest_url: $dashUrl
            }
          ) {
            id
            channel_id
            broadcaster_id
            title
            description
            status
            started_at
            hls_manifest_url
            dash_manifest_url
            max_resolution
            enable_chat
            enable_reactions
            created_at
          }
        }
      `,
      { id: streamId, hlsUrl: hlsManifestUrl, dashUrl: dashManifestUrl },
    );

    if (error || !data?.update_nchat_streams_by_pk) {
      logger.error("Failed to start stream:", error);
      return NextResponse.json(
        { error: "Failed to start stream" },
        { status: 500 },
      );
    }

    return NextResponse.json(data.update_nchat_streams_by_pk);
  } catch (error) {
    logger.error("Start stream error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
