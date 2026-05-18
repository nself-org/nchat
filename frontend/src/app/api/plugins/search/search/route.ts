/**
 * GET /api/plugins/search/search
 *
 * Proxy to Advanced Search plugin service (port 3107)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";

    const response = await fetch(
      `${SEARCH_SERVICE_URL}/api/search/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Search service error:", error);
      return NextResponse.json(
        { error: "Failed to perform search" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Search proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
