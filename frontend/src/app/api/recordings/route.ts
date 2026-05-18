/**
 * Recordings API
 * GET /api/recordings - List recordings
 * POST /api/recordings - Start a new recording
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getRecordingPipeline } from "@/services/recordings";
import { getRetentionPolicyService } from "@/services/recordings";
import { logger } from "@/lib/logger";

// Schema validation
const listRecordingsSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  callId: z.string().uuid().optional(),
  status: z
    .array(
      z.enum([
        "starting",
        "recording",
        "stopping",
        "processing",
        "completed",
        "failed",
        "archived",
        "deleted",
        "legal_hold",
      ]),
    )
    .optional(),
  source: z
    .array(z.enum(["call", "livestream", "screen_share", "voice_chat"]))
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["createdAt", "duration", "fileSize"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const startRecordingSchema = z.object({
  callId: z.string().uuid().optional(),
  streamId: z.string().uuid().optional(),
  channelId: z.string().uuid(),
  format: z.enum(["mp4", "webm", "mkv", "hls", "audio_only"]).default("mp4"),
  quality: z.enum(["360p", "480p", "720p", "1080p", "4k"]).default("1080p"),
  layout: z
    .enum(["grid", "speaker", "single", "pip", "side_by_side"])
    .default("grid"),
  source: z.enum(["call", "livestream", "screen_share", "voice_chat"]),
  enableMultiTrack: z.boolean().default(false),
  retentionPolicyId: z.string().uuid().optional(),
  encrypt: z.boolean().default(true),
});

/**
 * GET /api/recordings
 * List recordings with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const session = await nhost.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    // Handle array parameters
    if (searchParams.status) {
      searchParams.status = searchParams.status.split(",") as any;
    }
    if (searchParams.source) {
      searchParams.source = searchParams.source.split(",") as any;
    }

    const validation = listRecordingsSchema.safeParse(searchParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const filters = validation.data;

    // Get recordings
    const pipeline = getRecordingPipeline();
    const { recordings, total } = await pipeline.listRecordings(filters);

    return NextResponse.json({
      recordings,
      total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: filters.offset + recordings.length < total,
    });
  } catch (error) {
    logger.error("Error listing recordings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/recordings
 * Start a new recording
 */
export async function POST(request: NextRequest) {
  try {
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

    // Validate either callId or streamId is provided
    if (!config.callId && !config.streamId) {
      return NextResponse.json(
        { error: "Either callId or streamId must be provided" },
        { status: 400 },
      );
    }

    // Start recording
    const pipeline = getRecordingPipeline();
    const result = await pipeline.startRecording(config, userId);

    // Apply retention policy if specified
    if (config.retentionPolicyId) {
      const retentionService = getRetentionPolicyService();
      await retentionService.applyPolicy(
        result.recording.id,
        config.retentionPolicyId,
      );
    }

    logger.info("Recording started via API", {
      recordingId: result.recording.id,
      userId,
      source: config.source,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error starting recording:", error);

    if ((error as { code?: string }).code === "RECORDING_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 409 },
      );
    }

    if ((error as { code?: string }).code === "STORAGE_QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
