/**
 * Recording Share API
 * POST /api/recordings/share - Create share link
 * GET /api/recordings/share - Validate share link
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nhost } from "@/lib/nhost.server";
import { getPlaybackACLService } from "@/services/recordings";
import { logger } from "@/lib/logger";

// Schema validation
const createShareLinkSchema = z.object({
  recordingId: z.string().uuid(),
  permissions: z
    .array(z.enum(["view", "download", "share", "edit", "delete"]))
    .default(["view"]),
  expiresAt: z.string().datetime().optional(),
  maxViews: z.number().min(1).max(10000).optional(),
  password: z.string().min(4).max(128).optional(),
  requireAuth: z.boolean().default(false),
  allowedDomains: z.array(z.string()).optional(),
  allowedEmails: z.array(z.string().email()).optional(),
});

const validateShareLinkSchema = z.object({
  token: z.string().min(32),
  password: z.string().optional(),
});

/**
 * POST /api/recordings/share
 * Create a share link for a recording
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
    const validation = createShareLinkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 },
      );
    }

    const config = validation.data;

    // Create share link
    const aclService = getPlaybackACLService();
    const shareLink = await aclService.createShareLink(
      config.recordingId,
      userId,
      {
        permissions: config.permissions,
        expiresAt: config.expiresAt,
        maxViews: config.maxViews,
        password: config.password,
        requireAuth: config.requireAuth,
        allowedDomains: config.allowedDomains,
        allowedEmails: config.allowedEmails,
      },
    );

    // Generate URL
    const url = aclService.generateShareUrl(shareLink);

    logger.info("Share link created", {
      shareId: shareLink.id,
      recordingId: config.recordingId,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        shareLink: {
          id: shareLink.id,
          token: shareLink.token,
          url,
          permissions: shareLink.permissions,
          expiresAt: shareLink.expiresAt,
          maxViews: shareLink.maxViews,
          requireAuth: shareLink.requireAuth,
          hasPassword: !!config.password,
          createdAt: shareLink.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating share link:", error);

    if ((error as { code?: string }).code === "RECORDING_ACCESS_DENIED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if ((error as { code?: string }).code === "SHARE_LINK_ERROR") {
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
 * GET /api/recordings/share
 * Validate a share link token
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const token = request.nextUrl.searchParams.get("token");
    const password = request.nextUrl.searchParams.get("password");

    const validation = validateShareLinkSchema.safeParse({ token, password });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    // Get optional user context
    let userId: string | undefined;
    try {
      const session = await nhost.auth.getSession();
      userId = session?.user?.id;
    } catch {
      // Anonymous access is allowed
    }

    // Get client info
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    // Validate share link
    const aclService = getPlaybackACLService();
    const result = await aclService.validateShareLink(validation.data.token, {
      password: validation.data.password,
      userId,
      ip: ip || undefined,
      userAgent: userAgent || undefined,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    // Get recording info (limited for share links)
    const { getRecordingPipeline } = await import("@/services/recordings");
    const pipeline = getRecordingPipeline();
    const recording = await pipeline.getRecording(result.link!.recordingId);

    return NextResponse.json({
      valid: true,
      recording: {
        id: recording.id,
        format: recording.format,
        quality: recording.quality,
        durationSeconds: recording.durationSeconds,
        thumbnailUrl: recording.thumbnailUrl,
        createdAt: recording.createdAt,
      },
      permissions: result.link!.permissions,
      expiresAt: result.link!.expiresAt,
      viewsRemaining: result.link!.maxViews
        ? result.link!.maxViews - result.link!.viewCount
        : null,
    });
  } catch (error) {
    logger.error("Error validating share link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
