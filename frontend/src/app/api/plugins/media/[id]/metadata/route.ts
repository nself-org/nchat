/**
 * GET /api/plugins/media/[id]/metadata
 *
 * Proxy to Media Pipeline plugin for metadata
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
      `${MEDIA_SERVICE_URL}/api/media/${id}/metadata`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Media service error:", error);
      return NextResponse.json(
        { error: "Failed to get metadata" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Media metadata proxy error:", error);
    return NextResponse.json(
      { error: "Media service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
