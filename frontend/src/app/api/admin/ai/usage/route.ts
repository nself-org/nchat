/**
 * AI Usage Statistics API
 * GET /api/admin/ai/usage
 */

import { NextRequest, NextResponse } from "next/server";
import { getCostTracker } from "@/lib/ai/cost-tracker";
import { getAllQueues } from "@/lib/ai/request-queue";
import { logger } from "@/lib/logger";
import {
  getSummarizationCache,
  getSearchCache,
  getChatCache,
  getEmbeddingsCache,
} from "@/lib/ai/response-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const orgId = searchParams.get("orgId") || undefined;
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly
    const date = searchParams.get("date") || new Date().toISOString();

    const costTracker = getCostTracker();

    // Get usage statistics
    let stats;
    const parsedDate = new Date(date);

    switch (period) {
      case "monthly": {
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth() + 1;
        stats = await costTracker.getMonthlyReport(year, month, userId, orgId);
        break;
      }
      case "daily":
      default:
        stats = await costTracker.getDailyReport(parsedDate, userId, orgId);
        break;
    }

    // Get queue metrics
    const queues = getAllQueues();
    const queueMetrics = await Promise.all(
      Array.from(queues.entries()).map(async ([name, queue]) => ({
        name,
        metrics: await queue.getMetrics(),
      })),
    );

    // Get cache statistics
    const [
      summarizationCacheStats,
      searchCacheStats,
      chatCacheStats,
      embeddingsCacheStats,
    ] = await Promise.all([
      getSummarizationCache().getStats(),
      getSearchCache().getStats(),
      getChatCache().getStats(),
      getEmbeddingsCache().getStats(),
    ]);

    const cacheStats = {
      summarization: summarizationCacheStats,
      search: searchCacheStats,
      chat: chatCacheStats,
      embeddings: embeddingsCacheStats,
    };

    return NextResponse.json({
      success: true,
      data: {
        usage: stats,
        queues: queueMetrics,
        cache: cacheStats,
        period,
        date: parsedDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error getting AI usage:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get AI usage",
      },
      { status: 500 },
    );
  }
}
