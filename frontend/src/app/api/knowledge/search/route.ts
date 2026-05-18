/**
 * Knowledge Base Search API Route
 *
 * GET /api/knowledge/search - Search articles with relevance scoring
 *
 * @module api/knowledge/search
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getKnowledgeBaseService } from "@/services/knowledge";

const logger = createLogger("KnowledgeSearchAPI");

/**
 * GET /api/knowledge/search
 * Search articles with relevance scoring
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("query");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required" },
        { status: 400 },
      );
    }

    const options = {
      limit: parseInt(searchParams.get("limit") || "10", 10),
      categoryId: searchParams.get("categoryId") || undefined,
      status: (searchParams.get("status") || "published") as
        | "draft"
        | "published"
        | "archived",
      visibility: (searchParams.get("visibility") || "public") as
        | "public"
        | "internal"
        | "restricted",
    };

    const service = getKnowledgeBaseService();
    const result = await service.searchArticles(query, options);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.status || 500 },
      );
    }

    logger.debug("Search completed", { query, count: result.data?.length });

    return NextResponse.json({
      success: true,
      data: result.data,
      query,
      count: result.data?.length || 0,
    });
  } catch (error) {
    logger.error("Failed to search articles", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search articles",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
