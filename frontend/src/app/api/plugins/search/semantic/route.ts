/**
 * POST /api/plugins/search/semantic
 *
 * Semantic search endpoint for Advanced Search plugin
 * Uses AI-powered natural language understanding for better results
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const SEARCH_SERVICE_URL =
  process.env.SEARCH_SERVICE_URL || "http://localhost:3107";

export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  threshold?: number; // Similarity threshold (0-1)
  filters?: {
    channelIds?: string[];
    userIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    types?: Array<"message" | "file" | "channel" | "user">;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SemanticSearchRequest = await request.json();

    if (!body.query || body.query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search/semantic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: body.query,
        limit: body.limit || 20,
        threshold: body.threshold || 0.7,
        filters: body.filters || {},
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Semantic search error:", error);
      return NextResponse.json(
        { error: "Semantic search failed" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Semantic search proxy error:", error);
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
