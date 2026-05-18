/**
 * Stream Analytics API
 * GET /api/streams/[id]/analytics - Get stream analytics and metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { logger } from "@/lib/logger";

// Schema validation
const analyticsQuerySchema = z.object({
  timeRange: z.enum(["1h", "24h", "7d", "30d"]).default("1h"),
  metrics: z
    .array(z.enum(["viewers", "duration", "engagement", "all"]))
    .default(["all"]),
});

// Time range to interval mapping
const timeRangeConfig: Record<string, { intervalMs: number; buckets: number }> =
  {
    "1h": { intervalMs: 60000, buckets: 60 }, // 1 minute intervals
    "24h": { intervalMs: 3600000, buckets: 24 }, // 1 hour intervals
    "7d": { intervalMs: 21600000, buckets: 28 }, // 6 hour intervals
    "30d": { intervalMs: 86400000, buckets: 30 }, // 1 day intervals
  };

/**
 * GET /api/streams/[id]/analytics
 * Get comprehensive stream analytics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const streamId = id;

    // Validate stream ID
    if (!streamId || !z.string().uuid().safeParse(streamId).success) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.parse({
      timeRange: searchParams.get("timeRange") || "1h",
      metrics: searchParams.get("metrics")?.split(",") || ["all"],
    });

    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Calculate time range boundaries
    const config = timeRangeConfig[query.timeRange];
    const endTime = new Date();
    const startTime = new Date(
      endTime.getTime() - config.intervalMs * config.buckets,
    );

    // Fetch stream and verify access
    const { data: streamData, error: streamError } =
      await nhost.graphql.request(
        `
        query GetStreamForAnalytics($id: uuid!) {
          nchat_streams_by_pk(id: $id) {
            id
            broadcaster_id
            title
            status
            started_at
            ended_at
            current_viewers
            peak_viewers
            total_views
            total_reactions
            total_chat_messages
            max_resolution
            bitrate_kbps
            fps
            duration_seconds
            created_at
          }
        }
      `,
        { id: streamId },
      );

    if (streamError || !streamData?.nchat_streams_by_pk) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    const stream = streamData.nchat_streams_by_pk;

    // Verify user is the broadcaster (owner can see analytics)
    if (stream.broadcaster_id !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch viewer analytics
    const { data: viewerData } = await nhost.graphql.request(
      `
        query GetStreamViewerAnalytics($streamId: uuid!, $startTime: timestamptz!) {
          # Unique viewers count
          unique_viewers: nchat_stream_viewers_aggregate(
            where: {stream_id: {_eq: $streamId}, joined_at: {_gte: $startTime}}
            distinct_on: user_id
          ) {
            aggregate {
              count
            }
          }

          # Total view sessions
          total_views: nchat_stream_viewers_aggregate(
            where: {stream_id: {_eq: $streamId}, joined_at: {_gte: $startTime}}
          ) {
            aggregate {
              count
              avg {
                watch_duration_seconds
              }
            }
          }

          # Active viewers (currently watching)
          active_viewers: nchat_stream_viewers_aggregate(
            where: {stream_id: {_eq: $streamId}, left_at: {_is_null: true}}
          ) {
            aggregate {
              count
            }
          }
        }
      `,
      { streamId, startTime: startTime.toISOString() },
    );

    // Fetch engagement analytics
    const { data: engagementData } = await nhost.graphql.request(
      `
        query GetStreamEngagementAnalytics($streamId: uuid!, $startTime: timestamptz!) {
          # Chat messages
          chat_messages: nchat_stream_chat_messages_aggregate(
            where: {stream_id: {_eq: $streamId}, created_at: {_gte: $startTime}}
          ) {
            aggregate {
              count
            }
          }

          # Reactions by type
          reactions: nchat_stream_reactions(
            where: {stream_id: {_eq: $streamId}, created_at: {_gte: $startTime}}
          ) {
            reaction_type
          }

          # Total reactions
          total_reactions: nchat_stream_reactions_aggregate(
            where: {stream_id: {_eq: $streamId}, created_at: {_gte: $startTime}}
          ) {
            aggregate {
              count
            }
          }
        }
      `,
      { streamId, startTime: startTime.toISOString() },
    );

    // Calculate reaction breakdown
    const reactionsByType: Record<string, number> = {};
    if (engagementData?.reactions) {
      for (const reaction of engagementData.reactions) {
        const type = reaction.reaction_type;
        reactionsByType[type] = (reactionsByType[type] || 0) + 1;
      }
    }

    // Calculate duration
    let durationSeconds = stream.duration_seconds || 0;
    if (stream.status === "live" && stream.started_at) {
      const startedAt = new Date(stream.started_at).getTime();
      durationSeconds = Math.floor((Date.now() - startedAt) / 1000);
    }

    // Calculate messages per minute
    const totalMessages = engagementData?.chat_messages?.aggregate?.count || 0;
    const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60));
    const messagesPerMinute = Math.round(totalMessages / durationMinutes);

    // Build analytics response
    const analytics: Record<string, unknown> = {
      streamId,
      timeRange: query.timeRange,
      generatedAt: new Date().toISOString(),
    };

    const includeAll = query.metrics.includes("all");

    // Viewer metrics
    if (includeAll || query.metrics.includes("viewers")) {
      const uniqueViewers = viewerData?.unique_viewers?.aggregate?.count || 0;
      const totalViews =
        viewerData?.total_views?.aggregate?.count || stream.total_views || 0;
      const activeViewers =
        viewerData?.active_viewers?.aggregate?.count ||
        stream.current_viewers ||
        0;

      analytics.viewers = {
        current: activeViewers,
        peak: stream.peak_viewers || activeViewers,
        total: totalViews,
        uniqueViewers,
        averageWatchDuration: Math.round(
          viewerData?.total_views?.aggregate?.avg?.watch_duration_seconds || 0,
        ),
      };
    }

    // Duration metrics
    if (includeAll || query.metrics.includes("duration")) {
      analytics.duration = {
        totalSeconds: durationSeconds,
        startTime: stream.started_at,
        endTime: stream.ended_at,
        status: stream.status,
      };
    }

    // Engagement metrics
    if (includeAll || query.metrics.includes("engagement")) {
      analytics.engagement = {
        totalMessages,
        messagesPerMinute,
        reactions: {
          total:
            engagementData?.total_reactions?.aggregate?.count ||
            stream.total_reactions ||
            0,
          byType: reactionsByType,
        },
      };
    }

    // Stream quality info (from stream metadata)
    if (includeAll) {
      analytics.quality = {
        resolution: stream.max_resolution,
        bitrate: stream.bitrate_kbps,
        frameRate: stream.fps,
      };
    }

    return NextResponse.json({
      analytics,
    });
  } catch (error) {
    logger.error("Error fetching stream analytics:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
