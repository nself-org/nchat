/**
 * Recording Detail API
 * GET /api/recordings/[id] - Get recording details
 * PATCH /api/recordings/[id] - Update recording
 * DELETE /api/recordings/[id] - Stop or delete recording
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import {
  getRecordingPipeline,
  getPlaybackACLService,
} from "@/services/recordings";
import { logger } from "@/lib/logger";

// Schema validation
const updateRecordingSchema = z.object({
  visibility: z
    .enum(["private", "participants", "channel", "workspace", "public"])
    .optional(),
  legalHold: z.boolean().optional(),
});

/**
 * GET /api/recordings/[id]
 * Get recording details
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

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(recordingId, userId, "view");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get recording
    const pipeline = getRecordingPipeline();
    const recording = await pipeline.getRecording(recordingId);

    // Get user permissions
    const permissions = await aclService.getPermissions(recordingId, userId);

    // Get processing jobs if not completed
    let processingJobs;
    if (recording.status === "processing") {
      processingJobs = await pipeline.getProcessingJobs(recordingId);
    }

    // Log access
    await aclService.logRecordingAccess(recordingId, userId, "view");

    return NextResponse.json({
      recording,
      permissions,
      processingJobs,
    });
  } catch (error) {
    logger.error("Error getting recording:", error);

    if ((error as { code?: string }).code === "RECORDING_NOT_FOUND") {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/recordings/[id]
 * Update recording settings
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const validation = updateRecordingSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const updates = validation.data;

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(recordingId, userId, "edit");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update visibility
    if (updates.visibility) {
      await aclService.setVisibility(recordingId, updates.visibility, userId);
    }

    // Update legal hold
    if (updates.legalHold !== undefined) {
      const { getRetentionPolicyService } =
        await import("@/services/recordings");
      const retentionService = getRetentionPolicyService();
      await retentionService.setLegalHold(
        recordingId,
        updates.legalHold,
        userId,
      );
    }

    // Get updated recording
    const pipeline = getRecordingPipeline();
    const recording = await pipeline.getRecording(recordingId);

    logger.info("Recording updated", { recordingId, updates });

    return NextResponse.json({
      success: true,
      recording,
    });
  } catch (error) {
    logger.error("Error updating recording:", error);

    if ((error as { code?: string }).code === "RECORDING_NOT_FOUND") {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    if ((error as { code?: string }).code === "RECORDING_ACCESS_DENIED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recordings/[id]
 * Stop active recording or delete completed recording
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

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(
      recordingId,
      userId,
      "delete",
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const pipeline = getRecordingPipeline();
    const recording = await pipeline.getRecording(recordingId);

    // If recording is active, stop it
    if (recording.status === "recording") {
      const result = await pipeline.stopRecording(recordingId, userId);
      return NextResponse.json({
        success: true,
        action: "stopped",
        recording: result.recording,
        message: result.message,
      });
    }

    // If recording is completed or failed, delete it
    if (["completed", "failed", "archived"].includes(recording.status)) {
      // Check for legal hold
      if (recording.legalHold) {
        return NextResponse.json(
          { error: "Cannot delete recording under legal hold" },
          { status: 403 },
        );
      }

      await pipeline.deleteRecordingFile(recordingId);
      return NextResponse.json({
        success: true,
        action: "deleted",
        message: "Recording deleted successfully",
      });
    }

    return NextResponse.json(
      { error: `Cannot delete recording in ${recording.status} status` },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Error deleting recording:", error);

    if ((error as { code?: string }).code === "RECORDING_NOT_FOUND") {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
