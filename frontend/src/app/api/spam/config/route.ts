/**
 * API Route: Spam Detection Configuration
 * GET /api/spam/config - Get current spam detection config
 * PUT /api/spam/config - Update spam detection config
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpamDetector } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const detector = getSpamDetector();
    const config = detector.getConfig();

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    logger.error("Failed to get spam config:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "config" },
    });

    return NextResponse.json(
      { error: "Failed to get spam configuration" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sensitivity,
      spamThreshold,
      blockedDomains,
      blockedKeywords,
      trustedUsers,
      trustedDomains,
      ...otherConfig
    } = body;

    const detector = getSpamDetector();

    // Update sensitivity if provided
    if (sensitivity && ["low", "medium", "high"].includes(sensitivity)) {
      detector.setSensitivity(sensitivity);
    }

    // Update other config options
    detector.updateConfig({
      ...(spamThreshold !== undefined && { spamThreshold }),
      ...(blockedDomains && { blockedDomains }),
      ...(blockedKeywords && { blockedKeywords }),
      ...(trustedUsers && { trustedUsers }),
      ...(trustedDomains && { trustedDomains }),
      ...otherConfig,
    });

    const updatedConfig = detector.getConfig();

    logger.info("Spam config updated", {
      sensitivity: updatedConfig.sensitivity,
      spamThreshold: updatedConfig.spamThreshold,
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error) {
    logger.error("Failed to update spam config:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "config" },
    });

    return NextResponse.json(
      { error: "Failed to update spam configuration" },
      { status: 500 },
    );
  }
}
