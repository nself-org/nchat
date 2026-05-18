/**
 * API Route: Scan content for moderation
 * POST /api/moderation/scan
 */

import { NextRequest, NextResponse } from "next/server";
import { getModerationService } from "@/lib/moderation/moderation-service";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contentType,
      contentText,
      contentUrl,
      userId,
      messageCount,
      timeWindow,
      hasLinks,
      linkCount,
    } = body;

    if (!contentType) {
      return NextResponse.json(
        { error: "Content type is required" },
        { status: 400 },
      );
    }

    // Get moderation service
    const moderationService = getModerationService();

    // Initialize if needed
    await moderationService.initialize();

    let result;

    // Scan based on content type
    if (contentType === "text" || contentType === "message") {
      if (!contentText) {
        return NextResponse.json(
          { error: "Content text is required for text moderation" },
          { status: 400 },
        );
      }

      result = await moderationService.moderateText(contentText, {
        userId,
        messageCount,
        timeWindow,
        hasLinks,
        linkCount,
      });
    } else if (contentType === "image") {
      if (!contentUrl) {
        return NextResponse.json(
          { error: "Content URL is required for image moderation" },
          { status: 400 },
        );
      }

      result = await moderationService.moderateImage(contentUrl);
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Moderation scan error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "scan" },
    });

    return NextResponse.json(
      {
        error: "Failed to scan content",
        details:
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
