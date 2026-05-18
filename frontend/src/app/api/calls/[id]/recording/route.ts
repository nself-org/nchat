/**
 * Call Recording API
 * POST /api/calls/[id]/recording - Start recording
 * GET /api/calls/[id]/recording - Get recording status
 * DELETE /api/calls/[id]/recording - Stop recording
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getLiveKitService } from "@/services/webrtc/livekit.service";
import { getRecordingStorageService } from "@/services/webrtc/recording-storage.service";
import { logger } from "@/lib/logger";

// Schema validation
const startRecordingSchema = z.object({
  format: z.enum(["mp4", "webm"]).default("mp4"),
  quality: z.enum(["720p", "1080p", "4k"]).default("1080p"),
  audioOnly: z.boolean().default(false),
  layout: z.enum(["grid", "speaker", "single"]).default("grid"),
});

// Map quality to resolution
const qualityToResolution: Record<string, string> = {
  "720p": "720p",
  "1080p": "1080p",
  "4k": "4k",
};

/**
 * POST /api/calls/[id]/recording
 * Start recording a call
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const callId = id;

    // Validate call ID
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
    }

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
    const validation = startRecordingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const config = validation.data;

    // Verify call exists and is active
    const { data: callData, error: callError } = await nhost.graphql.request(
      `
        query GetCallForRecording($id: uuid!) {
          nchat_calls_by_pk(id: $id) {
            id
            status
            livekit_room_name
            initiator_id
            channel_id
          }
        }
      `,
      { id: callId },
    );

    if (callError || !callData?.nchat_calls_by_pk) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const call = callData.nchat_calls_by_pk;

    if (call.status !== "active") {
      return NextResponse.json(
        { error: "Call is not active" },
        { status: 400 },
      );
    }

    // Verify user is a participant or initiator
    const { data: participantData } = await nhost.graphql.request(
      `
        query CheckRecordingPermission($callId: uuid!, $userId: uuid!) {
          nchat_call_participants(where: {call_id: {_eq: $callId}, user_id: {_eq: $userId}}) {
            id
            status
          }
        }
      `,
      { callId, userId },
    );

    const isParticipant = participantData?.nchat_call_participants?.length > 0;
    const isInitiator = call.initiator_id === userId;

    if (!isParticipant && !isInitiator) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Check if recording is already in progress
    const { data: existingRecording } = await nhost.graphql.request(
      `
        query GetActiveRecording($callId: uuid!) {
          nchat_call_recordings(where: {call_id: {_eq: $callId}, status: {_in: ["starting", "recording"]}}) {
            id
            status
          }
        }
      `,
      { callId },
    );

    if (existingRecording?.nchat_call_recordings?.length > 0) {
      return NextResponse.json(
        { error: "Recording already in progress" },
        { status: 409 },
      );
    }

    // Start LiveKit recording
    const livekit = getLiveKitService();
    let egressId: string;

    try {
      egressId = await livekit.startRecording({
        roomName: call.livekit_room_name,
        layout: config.layout,
        audioOnly: config.audioOnly,
        resolution: qualityToResolution[config.quality] as
          | "720p"
          | "1080p"
          | "4k",
        outputFormat: config.format,
      });
    } catch (livekitError) {
      logger.error("LiveKit recording start failed:", livekitError);
      return NextResponse.json(
        { error: "Failed to start recording service" },
        { status: 500 },
      );
    }

    // Save recording metadata to database
    const { data: recordingData, error: recordingError } =
      await nhost.graphql.request(
        `
        mutation CreateCallRecording($object: nchat_call_recordings_insert_input!) {
          insert_nchat_call_recordings_one(object: $object) {
            id
            call_id
            recorded_by
            livekit_egress_id
            status
            resolution
            layout_type
            audio_only
            started_at
            created_at
          }
        }
      `,
        {
          object: {
            call_id: callId,
            channel_id: call.channel_id,
            recorded_by: userId,
            livekit_egress_id: egressId,
            status: "recording",
            resolution: config.quality,
            layout_type: config.layout,
            audio_only: config.audioOnly,
          },
        },
      );

    if (recordingError || !recordingData?.insert_nchat_call_recordings_one) {
      // Try to stop the LiveKit recording since DB insert failed
      try {
        await livekit.stopRecording(egressId);
      } catch {
        logger.error("Failed to cleanup LiveKit recording after DB error");
      }
      logger.error("Failed to save recording to database:", recordingError);
      return NextResponse.json(
        { error: "Failed to save recording metadata" },
        { status: 500 },
      );
    }

    const recording = recordingData.insert_nchat_call_recordings_one;

    logger.info("Call recording started", {
      callId,
      recordingId: recording.id,
      egressId,
    });

    return NextResponse.json(
      {
        success: true,
        recording: {
          id: recording.id,
          callId: recording.call_id,
          startedBy: recording.recorded_by,
          startedAt: recording.started_at,
          status: recording.status,
          resolution: recording.resolution,
          layout: recording.layout_type,
          audioOnly: recording.audio_only,
        },
        message: "Recording started successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error starting call recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/calls/[id]/recording
 * Get current recording status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const callId = id;

    // Validate call ID
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
    }

    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Verify user has access to this call
    const { data: accessData } = await nhost.graphql.request(
      `
        query CheckRecordingAccess($callId: uuid!, $userId: uuid!) {
          nchat_calls_by_pk(id: $callId) {
            id
            initiator_id
          }
          nchat_call_participants(where: {call_id: {_eq: $callId}, user_id: {_eq: $userId}}) {
            id
          }
        }
      `,
      { callId, userId },
    );

    const call = accessData?.nchat_calls_by_pk;
    const isParticipant = accessData?.nchat_call_participants?.length > 0;
    const isInitiator = call?.initiator_id === userId;

    if (!call || (!isParticipant && !isInitiator)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch active or most recent recording
    const { data: recordingData, error: recordingError } =
      await nhost.graphql.request(
        `
        query GetCallRecording($callId: uuid!) {
          nchat_call_recordings(
            where: {call_id: {_eq: $callId}}
            order_by: {created_at: desc}
            limit: 1
          ) {
            id
            call_id
            recorded_by
            livekit_egress_id
            status
            file_url
            file_size_bytes
            duration_seconds
            resolution
            layout_type
            audio_only
            thumbnail_url
            started_at
            ended_at
            created_at
            user: recorded_by_user {
              id
              display_name
            }
          }
        }
      `,
        { callId },
      );

    if (recordingError) {
      logger.error("Failed to fetch recording:", recordingError);
      return NextResponse.json(
        { error: "Failed to fetch recording" },
        { status: 500 },
      );
    }

    const recordings = recordingData?.nchat_call_recordings;
    if (!recordings || recordings.length === 0) {
      return NextResponse.json(
        { error: "No recording found" },
        { status: 404 },
      );
    }

    const recording = recordings[0];

    // If recording is active, get live status from LiveKit
    if (recording.status === "recording" && recording.livekit_egress_id) {
      try {
        const livekit = getLiveKitService();
        const egressInfo = await livekit.getEgressInfo(
          recording.livekit_egress_id,
        );

        // Calculate duration if still recording
        const startTime = new Date(recording.started_at).getTime();
        const currentDuration = Math.floor((Date.now() - startTime) / 1000);

        return NextResponse.json({
          recording: {
            id: recording.id,
            callId: recording.call_id,
            startedBy: recording.recorded_by,
            startedAt: recording.started_at,
            status: recording.status,
            resolution: recording.resolution,
            layout: recording.layout_type,
            audioOnly: recording.audio_only,
            duration: currentDuration,
            fileSize: null,
            url: null,
            egressStatus: egressInfo?.status,
          },
        });
      } catch (livekitError) {
        logger.warn("Could not fetch LiveKit egress info:", {
          error: String(livekitError),
        });
      }
    }

    return NextResponse.json({
      recording: {
        id: recording.id,
        callId: recording.call_id,
        startedBy: recording.recorded_by,
        startedAt: recording.started_at,
        endedAt: recording.ended_at,
        status: recording.status,
        resolution: recording.resolution,
        layout: recording.layout_type,
        audioOnly: recording.audio_only,
        duration: recording.duration_seconds,
        fileSize: recording.file_size_bytes,
        url: recording.file_url,
        thumbnailUrl: recording.thumbnail_url,
      },
    });
  } catch (error) {
    logger.error("Error fetching recording status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/calls/[id]/recording
 * Stop active recording
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const callId = id;

    // Validate call ID
    if (!callId || !z.string().uuid().safeParse(callId).success) {
      return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
    }

    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Verify user has permission and get active recording
    const { data: recordingData, error: recordingError } =
      await nhost.graphql.request(
        `
        query GetActiveRecordingToStop($callId: uuid!) {
          nchat_call_recordings(
            where: {
              call_id: {_eq: $callId}
              status: {_in: ["starting", "recording"]}
            }
            limit: 1
          ) {
            id
            livekit_egress_id
            recorded_by
            started_at
            call {
              id
              initiator_id
            }
          }
        }
      `,
        { callId },
      );

    if (recordingError) {
      logger.error("Failed to fetch recording:", recordingError);
      return NextResponse.json(
        { error: "Failed to fetch recording" },
        { status: 500 },
      );
    }

    const recordings = recordingData?.nchat_call_recordings;
    if (!recordings || recordings.length === 0) {
      return NextResponse.json(
        { error: "No active recording found" },
        { status: 404 },
      );
    }

    const recording = recordings[0];

    // Only the person who started recording or call initiator can stop it
    const isRecorder = recording.recorded_by === userId;
    const isInitiator = recording.call?.initiator_id === userId;

    if (!isRecorder && !isInitiator) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Stop LiveKit recording
    if (recording.livekit_egress_id) {
      try {
        const livekit = getLiveKitService();
        await livekit.stopRecording(recording.livekit_egress_id);
      } catch (livekitError) {
        logger.error("Failed to stop LiveKit recording:", livekitError);
        // Continue anyway to update database status
      }
    }

    // Calculate duration
    const startTime = new Date(recording.started_at).getTime();
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Update recording status
    const { data: updateData, error: updateError } =
      await nhost.graphql.request(
        `
        mutation StopCallRecording($id: uuid!, $duration: Int!) {
          update_nchat_call_recordings_by_pk(
            pk_columns: {id: $id}
            _set: {
              status: "processing"
              ended_at: "now()"
              duration_seconds: $duration
            }
          ) {
            id
            call_id
            status
            started_at
            ended_at
            duration_seconds
          }
        }
      `,
        { id: recording.id, duration: durationSeconds },
      );

    if (updateError || !updateData?.update_nchat_call_recordings_by_pk) {
      logger.error("Failed to update recording status:", updateError);
      return NextResponse.json(
        { error: "Failed to update recording status" },
        { status: 500 },
      );
    }

    const stoppedRecording = updateData.update_nchat_call_recordings_by_pk;

    logger.info("Call recording stopped", {
      callId,
      recordingId: recording.id,
      duration: durationSeconds,
    });

    return NextResponse.json({
      success: true,
      recording: {
        id: stoppedRecording.id,
        callId: stoppedRecording.call_id,
        stoppedAt: stoppedRecording.ended_at,
        status: stoppedRecording.status,
        duration: stoppedRecording.duration_seconds,
      },
      message:
        "Recording stopped and processing. File will be available after LiveKit completes encoding.",
    });
  } catch (error) {
    logger.error("Error stopping call recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
