/**
 * Stream Viewers Management API
 *
 * GET /api/streams/[id]/viewers - List current viewers in a live stream
 *
 * Returns real-time viewer information from LiveKit room.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { getLiveKitService } from "@/services/webrtc/livekit.service";
import type { ParticipantInfo } from "livekit-server-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const QueryParamsSchema = z.object({
  includeMetadata: z.coerce.boolean().default(true),
  includeInactive: z.coerce.boolean().default(false),
  sortBy: z.enum(["joinTime", "username", "duration"]).default("joinTime"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_STREAM = gql`
  query GetStream($streamId: uuid!) {
    nchat_calls_by_pk(id: $streamId) {
      id
      call_id
      livekit_room_name
      call_type
      status
      channel_id
      metadata
      started_at
      ended_at
      initiator_id
      initiator {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

const GET_STREAM_PARTICIPANTS = gql`
  query GetStreamParticipants($streamId: uuid!) {
    nchat_call_participants(
      where: { call_id: { _eq: $streamId }, left_at: { _is_null: true } }
      order_by: { joined_at: asc }
    ) {
      id
      user_id
      livekit_identity
      joined_at
      left_at
      is_audio_enabled
      is_video_enabled
      is_screen_sharing
      connection_quality
      metadata
      user {
        id
        username
        display_name
        avatar_url
        status
      }
    }
  }
`;

const GET_STREAM_VIEWER_STATS = gql`
  query GetStreamViewerStats($streamId: uuid!) {
    active_viewers: nchat_call_participants_aggregate(
      where: { call_id: { _eq: $streamId }, left_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
    total_viewers: nchat_call_participants_aggregate(
      where: { call_id: { _eq: $streamId } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// TYPES
// ============================================================================

// Using ParticipantInfo from livekit-server-sdk

interface ViewerInfo {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
  duration: number;
  isActive: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality?: string;
  metadata?: Record<string, unknown>;
  livekitParticipant?: ParticipantInfo;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user ID from request headers
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    // Placeholder - implement proper JWT decoding
    return null;
  }

  return null;
}

/**
 * Calculate duration in seconds from join time to now
 */
function calculateDuration(joinedAt: string): number {
  const joinTime = new Date(joinedAt).getTime();
  const now = Date.now();
  return Math.floor((now - joinTime) / 1000);
}

/**
 * Merge database viewer data with LiveKit participant data
 */
function mergeViewerData(
  dbParticipants: any[],
  livekitParticipants: ParticipantInfo[],
  includeMetadata: boolean,
): ViewerInfo[] {
  const livekitMap = new Map(livekitParticipants.map((p) => [p.identity, p]));

  return dbParticipants.map((dbViewer) => {
    const livekitViewer = livekitMap.get(
      dbViewer.livekit_identity || dbViewer.user_id,
    );
    const joinedAt = dbViewer.joined_at;
    const leftAt = dbViewer.left_at;
    // ParticipantInfo.state is an enum, check if it's ACTIVE (value 0)
    const isActive = !leftAt && !!livekitViewer && livekitViewer.state === 0;

    const viewer: ViewerInfo = {
      id: dbViewer.id,
      userId: dbViewer.user_id,
      username: dbViewer.user.username,
      displayName: dbViewer.user.display_name || dbViewer.user.username,
      avatarUrl: dbViewer.user.avatar_url,
      joinedAt,
      duration: leftAt
        ? Math.floor(
            (new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / 1000,
          )
        : calculateDuration(joinedAt),
      isActive,
      isAudioEnabled: !!dbViewer.is_audio_enabled,
      isVideoEnabled: !!dbViewer.is_video_enabled,
      isScreenSharing: !!dbViewer.is_screen_sharing,
      connectionQuality: dbViewer.connection_quality,
    };

    if (includeMetadata) {
      viewer.metadata = dbViewer.metadata || {};

      if (livekitViewer) {
        viewer.livekitParticipant = livekitViewer;
      }
    }

    return viewer;
  });
}

/**
 * Sort viewers by specified criteria
 */
function sortViewers(
  viewers: ViewerInfo[],
  sortBy: "joinTime" | "username" | "duration",
  sortOrder: "asc" | "desc",
): ViewerInfo[] {
  const sorted = [...viewers].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "joinTime":
        comparison =
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        break;
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "duration":
        comparison = a.duration - b.duration;
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// GET /api/streams/[id]/viewers - List stream viewers
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const streamId = id;

    logger.info("GET /api/streams/[id]/viewers - List viewers", { streamId });

    // Validate stream ID format
    if (!z.string().uuid().safeParse(streamId).success) {
      return NextResponse.json(
        { success: false, error: "Invalid stream ID format" },
        { status: 400 },
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      includeMetadata: searchParams.get("includeMetadata") || "true",
      includeInactive: searchParams.get("includeInactive") || "false",
      sortBy: searchParams.get("sortBy") || "joinTime",
      sortOrder: searchParams.get("sortOrder") || "asc",
      limit: searchParams.get("limit") || "100",
      offset: searchParams.get("offset") || "0",
    };

    const validation = QueryParamsSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const params_validated = validation.data;

    // Get stream info from database
    const { data: streamData } = await apolloClient.query({
      query: GET_STREAM,
      variables: { streamId },
      fetchPolicy: "network-only",
    });

    if (!streamData.nchat_calls_by_pk) {
      return NextResponse.json(
        { success: false, error: "Stream not found" },
        { status: 404 },
      );
    }

    const stream = streamData.nchat_calls_by_pk;

    // Check if stream is active
    if (stream.status === "ended") {
      // For ended streams, only return database records
      const { data: participantsData } = await apolloClient.query({
        query: GET_STREAM_PARTICIPANTS,
        variables: { streamId },
        fetchPolicy: "network-only",
      });

      const viewers = mergeViewerData(
        participantsData.nchat_call_participants || [],
        [],
        params_validated.includeMetadata,
      );

      const sorted = sortViewers(
        viewers,
        params_validated.sortBy,
        params_validated.sortOrder,
      );
      const paginated = sorted.slice(
        params_validated.offset,
        params_validated.offset + params_validated.limit,
      );

      return NextResponse.json({
        success: true,
        viewers: paginated,
        stats: {
          active: 0,
          total: viewers.length,
          streamStatus: "ended",
        },
        pagination: {
          total: viewers.length,
          offset: params_validated.offset,
          limit: params_validated.limit,
          hasMore:
            params_validated.offset + params_validated.limit < viewers.length,
        },
      });
    }

    // For active streams, get real-time data from LiveKit
    let livekitParticipants: ParticipantInfo[] = [];

    try {
      if (stream.livekit_room_name) {
        const livekit = getLiveKitService();
        const participants = await livekit.listParticipants(
          stream.livekit_room_name,
        );
        livekitParticipants = participants || [];
      }
    } catch (error) {
      logger.warn("Failed to fetch LiveKit participants", {
        streamId,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      });
      // Continue with database data only
    }

    // Get viewer data from database
    const { data: participantsData } = await apolloClient.query({
      query: GET_STREAM_PARTICIPANTS,
      variables: { streamId },
      fetchPolicy: "network-only",
    });

    // Get viewer stats
    const { data: statsData } = await apolloClient.query({
      query: GET_STREAM_VIEWER_STATS,
      variables: { streamId },
      fetchPolicy: "network-only",
    });

    // Merge database and LiveKit data
    let viewers = mergeViewerData(
      participantsData.nchat_call_participants || [],
      livekitParticipants,
      params_validated.includeMetadata,
    );

    // Filter out inactive viewers if requested
    if (!params_validated.includeInactive) {
      viewers = viewers.filter((v) => v.isActive);
    }

    // Sort and paginate
    const sorted = sortViewers(
      viewers,
      params_validated.sortBy,
      params_validated.sortOrder,
    );
    const paginated = sorted.slice(
      params_validated.offset,
      params_validated.offset + params_validated.limit,
    );

    logger.info("GET /api/streams/[id]/viewers - Success", {
      streamId,
      viewersCount: viewers.length,
      activeViewers: statsData.active_viewers.aggregate.count,
      totalViewers: statsData.total_viewers.aggregate.count,
    });

    return NextResponse.json({
      success: true,
      viewers: paginated,
      stats: {
        active: statsData.active_viewers.aggregate.count,
        total: statsData.total_viewers.aggregate.count,
        streamStatus: stream.status,
        duration: stream.ended_at
          ? Math.floor(
              (new Date(stream.ended_at).getTime() -
                new Date(stream.started_at).getTime()) /
                1000,
            )
          : calculateDuration(stream.started_at),
      },
      pagination: {
        total: viewers.length,
        offset: params_validated.offset,
        limit: params_validated.limit,
        hasMore:
          params_validated.offset + params_validated.limit < viewers.length,
      },
      stream: {
        id: stream.id,
        name:
          stream.metadata?.name || `Stream by ${stream.initiator.display_name}`,
        type: stream.call_type,
        status: stream.status,
        startedAt: stream.started_at,
        initiator: {
          id: stream.initiator.id,
          username: stream.initiator.username,
          displayName: stream.initiator.display_name,
          avatarUrl: stream.initiator.avatar_url,
        },
      },
    });
  } catch (error) {
    logger.error("GET /api/streams/[id]/viewers - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stream viewers",
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
