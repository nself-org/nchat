import { NextRequest, NextResponse } from "next/server";
import type {
  GifApiRequest,
  GifApiResponse,
  GifSearchParams,
  GifTrendingParams,
} from "@/types/gif";
import { gifService, getGifProvider } from "@/lib/gif/gif-service";

import { logger } from "@/lib/logger";

/**
 * GIF API Route - Proxy for Giphy/Tenor API
 *
 * This route acts as a proxy to hide API keys from the client.
 * All GIF requests from the frontend should go through this endpoint.
 *
 * POST /api/gif
 * Body: {
 *   action: 'search' | 'trending' | 'categories' | 'random',
 *   query?: string,
 *   limit?: number,
 *   offset?: number,
 *   rating?: string,
 *   lang?: string
 * }
 */

// ============================================================================
// GET Handler (for testing)
// ============================================================================

export async function GET() {
  const provider = getGifProvider();
  const isAvailable = gifService.isAvailable();

  return NextResponse.json({
    success: true,
    provider,
    available: isAvailable,
    message: "GIF API is operational. Use POST to make requests.",
    endpoints: {
      search: {
        action: "search",
        query: "required",
        limit: "optional",
        offset: "optional",
      },
      trending: { action: "trending", limit: "optional", offset: "optional" },
      categories: { action: "categories" },
      random: { action: "random", query: "optional (tag)" },
    },
  });
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: GifApiRequest = await request.json();
    const { action, query, limit, offset, rating, lang } = body;

    // Validate action
    if (
      !action ||
      !["search", "trending", "categories", "random"].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid action. Must be one of: search, trending, categories, random",
        } as GifApiResponse,
        { status: 400 },
      );
    }

    // Check if service is available
    if (!gifService.isAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GIF service is not configured. Please set GIPHY_API_KEY or TENOR_API_KEY.",
        } as GifApiResponse,
        { status: 503 },
      );
    }

    let data;
    const provider = gifService.getProvider();

    switch (action) {
      case "search": {
        if (!query || typeof query !== "string" || query.trim().length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Search query is required",
            } as GifApiResponse,
            { status: 400 },
          );
        }

        const searchParams: GifSearchParams = {
          query: query.trim(),
          limit: Math.min(limit || 25, 50), // Cap at 50
          offset: offset || 0,
          rating: validateRating(rating),
          lang: lang || "en",
        };

        data = await gifService.search(searchParams);
        break;
      }

      case "trending": {
        const trendingParams: GifTrendingParams = {
          limit: Math.min(limit || 25, 50), // Cap at 50
          offset: offset || 0,
          rating: validateRating(rating),
        };

        data = await gifService.getTrending(trendingParams);
        break;
      }

      case "categories": {
        data = await gifService.getCategories();
        break;
      }

      case "random": {
        data = await gifService.getRandom(query || undefined);
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid action",
          } as GifApiResponse,
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data,
      provider,
    } as GifApiResponse);
  } catch (error) {
    logger.error("GIF API error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Internal server error",
      } as GifApiResponse,
      { status: 500 },
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate and return a safe rating value
 */
function validateRating(rating?: string): "g" | "pg" | "pg-13" | "r" {
  const validRatings = ["g", "pg", "pg-13", "r"];
  if (rating && validRatings.includes(rating.toLowerCase())) {
    return rating.toLowerCase() as "g" | "pg" | "pg-13" | "r";
  }
  return "pg-13"; // Default to safe rating
}

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
