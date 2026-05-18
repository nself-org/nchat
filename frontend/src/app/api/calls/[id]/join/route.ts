/**
 * Join Call API
 * POST /api/calls/[id]/join
 */

import { NextRequest, NextResponse } from "next/server";
import { nhost } from "@/lib/nhost.server";
import { getLiveKitService } from "@/services/webrtc/livekit.service";

import { logger } from "@/lib/logger.server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    const userName = session.user?.displayName || session.user?.email || "User";
    const { id: callId } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Get call details
    const { data: callData, error: callError } = await nhost.graphql.request(
      `
        query GetCall($id: uuid!) {
          nchat_calls_by_pk(id: $id) {
            id
            livekit_room_name
            status
            call_type
          }
        }
      `,
      { id: callId },
    );

    if (callError || !callData?.nchat_calls_by_pk) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const call = callData.nchat_calls_by_pk;

    if (call.status === "ended") {
      return NextResponse.json({ error: "Call has ended" }, { status: 400 });
    }

    // Generate access token
    const livekit = getLiveKitService();
    const token = await livekit.generateToken({
      identity: userId,
      name: userName,
      roomName: call.livekit_room_name,
      metadata: JSON.stringify({ role: "participant" }),
      ttl: 7200,
    });

    const iceServers = livekit.getICEServers(userId);

    // Update participant status
    await nhost.graphql.request(
      `
        mutation UpdateParticipant($callId: uuid!, $userId: uuid!) {
          update_nchat_call_participants(
            where: {
              call_id: { _eq: $callId }
              user_id: { _eq: $userId }
            }
            _set: {
              status: "joined"
              joined_at: "now()"
            }
          ) {
            affected_rows
          }
        }
      `,
      { callId, userId },
    );

    return NextResponse.json({
      roomName: call.livekit_room_name,
      token,
      iceServers,
      livekitUrl: process.env.LIVEKIT_URL || "ws://localhost:7880",
      callType: call.call_type,
    });
  } catch (error) {
    logger.error("Join call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
