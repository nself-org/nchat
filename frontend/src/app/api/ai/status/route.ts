/**
 * AI Status API Route
 * GET /api/ai/status
 * Check availability of AI features
 */

import { NextResponse } from "next/server";
import { getMessageSummarizer } from "@/lib/ai/message-summarizer";
import { getSmartSearch } from "@/lib/ai/smart-search";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AIStatusResponse {
  summarization: {
    available: boolean;
    provider: string;
  };
  search: {
    available: boolean;
    provider: string;
    semantic: boolean;
  };
  cacheStats?: {
    size: number;
    maxSize: number;
  };
}

export async function GET() {
  try {
    const summarizer = getMessageSummarizer();
    const search = getSmartSearch();

    const status: AIStatusResponse = {
      summarization: {
        available: summarizer.available(),
        provider: summarizer.getProvider(),
      },
      search: {
        available: search.available(),
        provider: search.getProvider(),
        semantic: search.getProvider() !== "local",
      },
      cacheStats: search.getCacheStats(),
    };

    return NextResponse.json(status);
  } catch (error) {
    logger.error("AI status check error:", error);

    return NextResponse.json(
      {
        error: "Failed to check AI status",
      },
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
