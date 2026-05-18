/**
 * Download Call Recording
 * GET /api/calls/recordings/[id]/download
 *
 * Generate signed download URL for authorized users
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getRecordingStorageService } from "@/services/webrtc/recording-storage.service";
import { logger } from "@/lib/logger";

/**
 * GET /api/calls/recordings/[id]/download
 * Get signed URL for recording download
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

    // Get signed download URL
    const storageService = getRecordingStorageService();
    const downloadUrl = await storageService.getRecordingDownloadUrl(
      recordingId,
      userId,
      3600,
    );

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Recording not found or access denied" },
        { status: 404 },
      );
    }

    logger.info("Recording download URL generated", { recordingId, userId });

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error("Error generating recording download URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
