/**
 * POST /api/plugins/media/upload
 *
 * Proxy to Media Pipeline plugin service (port 3108)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:3108";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${MEDIA_SERVICE_URL}/api/media/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Media service error:", error);
      return NextResponse.json(
        { error: "Failed to upload media" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Media upload proxy error:", error);
    return NextResponse.json(
      { error: "Media service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
