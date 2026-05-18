/**
 * AI Smart Search API Route
 * POST /api/ai/search
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSmartSearch,
  type SearchableMessage,
  type SearchOptions,
  type SearchResult,
} from "@/lib/ai/smart-search";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchRequest {
  query: string;
  messages: SearchableMessage[];
  options?: SearchOptions;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  count?: number;
  error?: string;
  provider?: string;
  isSemanticSearch?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequest;

    // Validate request
    if (!body.query || typeof body.query !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: query string required",
        } as SearchResponse,
        { status: 400 },
      );
    }

    if (body.query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Query too short. Minimum 2 characters required.",
        } as SearchResponse,
        { status: 400 },
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request: messages array required",
        } as SearchResponse,
        { status: 400 },
      );
    }

    // Limit message count to prevent abuse
    const MAX_MESSAGES = 10000;
    if (body.messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many messages to search. Maximum: ${MAX_MESSAGES}`,
        } as SearchResponse,
        { status: 400 },
      );
    }

    const smartSearch = getSmartSearch();

    // Perform search
    const results = await smartSearch.search(
      body.query,
      body.messages,
      body.options,
    );

    const provider = smartSearch.getProvider();
    const isSemanticSearch = provider !== "local";

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      provider,
      isSemanticSearch,
    } as SearchResponse);
  } catch (error) {
    logger.error("Search error:", error);
    captureError(error as Error, {
      tags: { api: "ai-search" },
      extra: { query: (error as any)?.query },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Search failed",
      } as SearchResponse,
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
