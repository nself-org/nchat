/**
 * GET /api/plugins/search/suggest
 *
 * Proxy to Advanced Search plugin for auto-suggestions
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const response = await fetch(
      `${SEARCH_SERVICE_URL}/api/search/suggest?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Search suggest service error:", error);
      return NextResponse.json(
        { error: "Failed to get suggestions" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Search suggest proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
