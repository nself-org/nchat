/**
 * GET /api/plugins/media/[id]/thumbnail
 *
 * Proxy to Media Pipeline plugin for thumbnail
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://localhost:3108";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const response = await fetch(
      `${MEDIA_SERVICE_URL}/api/media/${id}/thumbnail`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Media service error:", error);
      return NextResponse.json(
        { error: "Failed to get thumbnail" },
        { status: response.status },
      );
    }

    // Return image directly
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/webp";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    logger.error("Media thumbnail proxy error:", error);
    return NextResponse.json(
      { error: "Media service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
