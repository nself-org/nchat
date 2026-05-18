/**
 * Get Call Recording Metadata
 * GET /api/calls/recordings/[id]/metadata
 * DELETE /api/calls/recordings/[id]/metadata
 *
 * Retrieve or delete recording metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getRecordingStorageService } from "@/services/webrtc/recording-storage.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/calls/recordings/[id]/metadata
 * Get recording metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recordingId } = await params;

    // Validate recording ID
    if (!recordingId || !z.string().uuid().safeParse(recordingId).success) {
      return NextResponse.json(
        { error: "Invalid recording ID" },
        { status: 400 },
      );
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

    // Get recording metadata
    const storageService = getRecordingStorageService();
    const metadata = await storageService.getRecordingMetadata(recordingId);

    if (!metadata) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    // Verify access (initiator, participant, or recorder)
    const { data: callData } = await nhost.graphql.request(
      `
        query VerifyRecordingAccess($recordingId: uuid!) {
          nchat_call_recordings_by_pk(id: $recordingId) {
            recorded_by
            call {
              initiator_id
              participants: nchat_call_participants(limit: 100) {
                user_id
              }
            }
          }
        }
      `,
      { recordingId },
    );

    const recording = callData?.nchat_call_recordings_by_pk;
    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    const call = recording.call;
    const isInitiator = call?.initiator_id === userId;
    const isParticipant = call?.participants?.some(
      (p: { user_id: string }) => p.user_id === userId,
    );
    const isRecorder = recording.recorded_by === userId;

    if (!isInitiator && !isParticipant && !isRecorder) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      metadata: {
        id: metadata.id,
        callId: metadata.call_id,
        status: metadata.status,
        resolution: metadata.resolution,
        layout: metadata.layout_type,
        audioOnly: metadata.audio_only,
        duration: metadata.duration_seconds,
        fileSize: metadata.file_size_bytes,
        fileUrl: metadata.file_url,
        thumbnailUrl: metadata.thumbnail_url,
        startedAt: metadata.started_at,
        endedAt: metadata.ended_at,
        processedAt: metadata.processed_at,
        errorMessage: metadata.error_message,
      },
    });
  } catch (error) {
    logger.error("Error fetching recording metadata:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/calls/recordings/[id]/metadata
 * Delete recording and associated file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recordingId } = await params;

    // Validate recording ID
    if (!recordingId || !z.string().uuid().safeParse(recordingId).success) {
      return NextResponse.json(
        { error: "Invalid recording ID" },
        { status: 400 },
      );
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

    // Delete recording
    const storageService = getRecordingStorageService();
    const deleted = await storageService.deleteRecording(recordingId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Recording not found or insufficient permissions" },
        { status: 404 },
      );
    }

    logger.info("Recording deleted", { recordingId, userId });

    return NextResponse.json({
      success: true,
      message: "Recording and associated file deleted",
    });
  } catch (error) {
    logger.error("Error deleting recording:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
