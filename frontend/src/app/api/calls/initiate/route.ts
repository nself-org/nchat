/**
 * Initiate Call API
 *
 * POST /api/calls/initiate - Start a new voice/video call
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { nhost } from "@/lib/nhost.server";
import { getLiveKitService } from "@/services/webrtc/livekit.service";
import { z } from "zod";

import { logger } from "@/lib/logger";

const initiateCallSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  targetUserIds: z.array(z.string().uuid()).optional(),
  channelId: z.string().uuid().optional(),
  type: z.enum(["audio", "video", "screen_share"]).default("audio"),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    const userName = session.user?.displayName || session.user?.email || "User";

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = initiateCallSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { targetUserId, targetUserIds, channelId, type, metadata } =
      validation.data;

    // Determine if group call
    const isGroupCall = !!targetUserIds && targetUserIds.length > 1;
    const participants = targetUserIds || (targetUserId ? [targetUserId] : []);

    if (participants.length === 0 && !channelId) {
      return NextResponse.json(
        {
          error: "Either targetUserId, targetUserIds, or channelId is required",
        },
        { status: 400 },
      );
    }

    // If channel call, verify user is member
    if (channelId) {
      const { data: memberData, error: memberError } =
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

      if (memberError || !memberData?.nchat_channel_members?.length) {
        return NextResponse.json(
          { error: "Not a member of this channel" },
          { status: 403 },
        );
      }
    }

    // Generate unique room name
    const roomName = `call-\${Date.now()}-\${randomBytes(5).toString('hex')}`;

    // Create LiveKit room
    const livekit = getLiveKitService();
    await livekit.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 100,
      metadata: JSON.stringify({ channelId, type }),
    });

    // Generate access token for initiator
    const token = await livekit.generateToken({
      identity: userId,
      name: userName,
      roomName,
      metadata: JSON.stringify({ role: "host" }),
      grants: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      ttl: 7200, // 2 hours
    });

    // Get ICE servers (TURN/STUN)
    const iceServers = livekit.getICEServers(userId);

    // Create call record in database
    const { data: callData, error: callError } = await nhost.graphql.request(
      `
        mutation CreateCall($object: nchat_calls_insert_input!) {
          insert_nchat_calls_one(object: $object) {
            id
            livekit_room_name
            call_type
            status
            is_group_call
            initiated_at
            created_at
          }
        }
      `,
      {
        object: {
          livekit_room_name: roomName,
          call_type: type,
          status: "initiating",
          initiator_id: userId,
          channel_id: channelId,
          is_group_call: isGroupCall,
          metadata: metadata || {},
        },
      },
    );

    if (callError || !callData?.insert_nchat_calls_one) {
      logger.error("Failed to create call record:", callError);
      // Clean up LiveKit room
      await livekit.deleteRoom(roomName);
      return NextResponse.json(
        { error: "Failed to create call" },
        { status: 500 },
      );
    }

    const callId = callData.insert_nchat_calls_one.id;

    // Add initiator as participant
    await nhost.graphql.request(
      `
        mutation AddCallParticipant($object: nchat_call_participants_insert_input!) {
          insert_nchat_call_participants_one(object: $object) {
            id
          }
        }
      `,
      {
        object: {
          call_id: callId,
          user_id: userId,
          livekit_identity: userId,
          status: "joined",
          joined_at: new Date().toISOString(),
          is_audio_enabled: type !== "screen_share",
          is_video_enabled: type === "video",
          is_screen_sharing: type === "screen_share",
        },
      },
    );

    // Create participant records for invited users
    if (participants.length > 0) {
      const participantObjects = participants.map((participantId) => ({
        call_id: callId,
        user_id: participantId,
        status: "invited",
        invited_at: new Date().toISOString(),
      }));

      await nhost.graphql.request(
        `
          mutation AddCallParticipants($objects: [nchat_call_participants_insert_input!]!) {
            insert_nchat_call_participants(objects: $objects) {
              affected_rows
            }
          }
        `,
        { objects: participantObjects },
      );

      // This should trigger push notifications, websocket events, etc.
    }

    // Return call details
    return NextResponse.json({
      callId,
      roomName,
      token,
      iceServers,
      livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880",
      expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
      participants: participants.length,
    });
  } catch (error) {
    logger.error("Initiate call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
