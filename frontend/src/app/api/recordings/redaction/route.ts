/**
 * Recording Redaction API
 * POST /api/recordings/redaction - Create redaction request
 * GET /api/recordings/redaction - Get redactions for a recording
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import {
  getRedactionService,
  getPlaybackACLService,
} from "@/services/recordings";
import { logger } from "@/lib/logger";

// Schema validation
const redactionRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
  trackMovement: z.boolean().default(false),
});

const redactionSegmentSchema = z.object({
  type: z.enum(["audio", "video", "both", "blur", "silence", "beep"]),
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  reason: z.string().min(1).max(500),
  region: redactionRegionSchema.optional(),
  trackId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
});

const createRedactionSchema = z.object({
  recordingId: z.string().uuid(),
  segments: z.array(redactionSegmentSchema).min(1).max(100),
  applyImmediately: z.boolean().default(false),
  preserveOriginal: z.boolean().default(true),
});

/**
 * POST /api/recordings/redaction
 * Create a redaction request
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
    const validation = createRedactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const config = validation.data;

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(
      config.recordingId,
      userId,
      "edit",
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create redaction request
    const redactionService = getRedactionService();
    const redactionRequest = await redactionService.createRedactionRequest(
      config.recordingId,
      config.segments.map((seg) => ({
        type: seg.type,
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        reason: seg.reason,
        region: seg.region,
        trackId: seg.trackId,
        participantId: seg.participantId,
        createdBy: userId,
      })),
      userId,
      {
        applyImmediately: config.applyImmediately,
        preserveOriginal: config.preserveOriginal,
      },
    );

    logger.info("Redaction request created", {
      requestId: redactionRequest.id,
      recordingId: config.recordingId,
      segmentCount: config.segments.length,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        request: redactionRequest,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating redaction request:", error);

    if ((error as { code?: string }).code === "REDACTION_ERROR") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 400 },
      );
    }

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
 * GET /api/recordings/redaction
 * Get redactions for a recording
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

    // Get recording ID
    const recordingId = request.nextUrl.searchParams.get("recordingId");
    if (!recordingId || !z.string().uuid().safeParse(recordingId).success) {
      return NextResponse.json(
        { error: "Invalid recordingId" },
        { status: 400 },
      );
    }

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(recordingId, userId, "view");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get redactions
    const redactionService = getRedactionService();
    const segments = await redactionService.getRedactionSegments(recordingId);
    const requests = await redactionService.getRedactionRequests(recordingId);
    const auditLogs = await redactionService.getAuditLogs(recordingId);

    return NextResponse.json({
      segments,
      requests,
      auditLogs,
    });
  } catch (error) {
    logger.error("Error getting redactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/recordings/redaction
 * Apply a pending redaction request
 */
export async function PUT(request: NextRequest) {
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
    const requestId = body.requestId;
    const preserveOriginal = body.preserveOriginal ?? true;

    if (!requestId || !z.string().uuid().safeParse(requestId).success) {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
    }

    // Get request
    const redactionService = getRedactionService();
    const redactionRequest =
      await redactionService.getRedactionRequest(requestId);
    if (!redactionRequest) {
      return NextResponse.json(
        { error: "Redaction request not found" },
        { status: 404 },
      );
    }

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(
      redactionRequest.recordingId,
      userId,
      "edit",
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Apply redaction
    const result = await redactionService.applyRedactionRequest(
      requestId,
      userId,
      preserveOriginal,
    );

    logger.info("Redaction request applied", {
      requestId,
      status: result.status,
      userId,
    });

    return NextResponse.json({
      success: true,
      request: result,
    });
  } catch (error) {
    logger.error("Error applying redaction:", error);

    if ((error as { code?: string }).code === "REDACTION_ERROR") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recordings/redaction
 * Remove a pending redaction segment
 */
export async function DELETE(request: NextRequest) {
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

    // Get segment ID
    const segmentId = request.nextUrl.searchParams.get("segmentId");
    if (!segmentId || !z.string().uuid().safeParse(segmentId).success) {
      return NextResponse.json({ error: "Invalid segmentId" }, { status: 400 });
    }

    // Get segment
    const redactionService = getRedactionService();
    const segment = await redactionService.getRedactionSegment(segmentId);
    if (!segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Check access
    const aclService = getPlaybackACLService();
    const hasAccess = await aclService.checkAccess(
      segment.recordingId,
      userId,
      "edit",
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Remove segment
    await redactionService.removeRedactionSegment(segmentId, userId);

    logger.info("Redaction segment removed", { segmentId, userId });

    return NextResponse.json({
      success: true,
      message: "Redaction segment removed",
    });
  } catch (error) {
    logger.error("Error removing redaction segment:", error);

    if ((error as { code?: string }).code === "REDACTION_ERROR") {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
