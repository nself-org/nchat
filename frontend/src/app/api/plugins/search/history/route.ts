/**
 * GET/POST/DELETE /api/plugins/search/history
 *
 * Search history endpoint for Advanced Search plugin
 * Manages user search history
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

// GET - Fetch search history for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = searchParams.get("limit") || "20";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${SEARCH_SERVICE_URL}/api/search/history?userId=${userId}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("Search history fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch search history" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Search history proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

// POST - Add to search history
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.userId || !body.query) {
      return NextResponse.json(
        { error: "userId and query are required" },
        { status: 400 },
      );
    }

    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: body.userId,
        query: body.query,
        resultCount: body.resultCount || 0,
        filters: body.filters || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Search history add error:", error);
      return NextResponse.json(
        { error: "Failed to add to search history" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    logger.error("Search history POST proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

// DELETE - Clear search history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const historyId = searchParams.get("id"); // Optional: delete specific entry

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    let url = `${SEARCH_SERVICE_URL}/api/search/history?userId=${userId}`;
    if (historyId) {
      url += `&id=${historyId}`;
    }

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Search history delete error:", error);
      return NextResponse.json(
        { error: "Failed to clear search history" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Search history cleared",
    });
  } catch (error) {
    logger.error("Search history DELETE proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
