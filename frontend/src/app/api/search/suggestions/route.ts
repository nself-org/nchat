/**
 * Search Suggestions API Route
 * GET /api/search/suggestions?q=query
 * Provides autocomplete suggestions based on search history and popular searches
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthPool } from "@/lib/db/pool";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SuggestionResponse {
  success: boolean;
  suggestions?: Array<{
    query: string;
    count: number;
    lastUsed?: Date;
  }>;
  error?: string;
}

// Database pool (shared singleton)
const pool = getAuthPool();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");
    const userId = searchParams.get("userId"); // Optional: personalized suggestions

    // Validate inputs
    if (limit <= 0 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Limit must be between 1 and 50",
        } as SuggestionResponse,
        { status: 400 },
      );
    }

    let sql: string;
    let params: any[];

    if (userId) {
      // Personalized suggestions based on user's search history
      sql = `
        SELECT
          query,
          COUNT(*) as count,
          MAX(searched_at) as last_used
        FROM nchat_search_history
        WHERE
          user_id = $1
          AND query ILIKE $2
        GROUP BY query
        ORDER BY count DESC, last_used DESC
        LIMIT $3
      `;
      params = [userId, `%${query}%`, limit];
    } else {
      // Global popular searches
      sql = `
        SELECT
          query,
          COUNT(*) as count,
          MAX(searched_at) as last_used
        FROM nchat_search_history
        WHERE query ILIKE $1
        GROUP BY query
        ORDER BY count DESC, last_used DESC
        LIMIT $2
      `;
      params = [`%${query}%`, limit];
    }

    if (!pool) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not available",
        } as SuggestionResponse,
        { status: 503 },
      );
    }
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);

      const suggestions = result.rows.map((row) => ({
        query: row.query,
        count: parseInt(row.count),
        lastUsed: row.last_used,
      }));

      // If no results and query is not empty, add the query as a suggestion
      if (suggestions.length === 0 && query.trim().length > 0) {
        suggestions.push({
          query: query.trim(),
          count: 0,
          lastUsed: undefined,
        });
      }

      return NextResponse.json({
        success: true,
        suggestions,
      } as SuggestionResponse);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Search suggestions error:", error);
    captureError(error as Error, {
      tags: { api: "search-suggestions" },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get suggestions",
      } as SuggestionResponse,
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
