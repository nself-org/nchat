/**
 * AI Rate Limits API
 * GET /api/admin/ai/limits - Get rate limit status
 * POST /api/admin/ai/limits - Update rate limits
 * DELETE /api/admin/ai/limits - Reset rate limits
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSummarizeUserLimiter,
  getSummarizeOrgLimiter,
  getSearchUserLimiter,
  getSearchOrgLimiter,
  getChatUserLimiter,
  getChatOrgLimiter,
  getEmbeddingsUserLimiter,
  getEmbeddingsOrgLimiter,
} from "@/lib/ai/rate-limiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const orgId = searchParams.get("orgId") || undefined;
    const endpoint = searchParams.get("endpoint") || undefined;

    const limiters = {
      summarize: {
        user: getSummarizeUserLimiter(),
        org: getSummarizeOrgLimiter(),
      },
      search: {
        user: getSearchUserLimiter(),
        org: getSearchOrgLimiter(),
      },
      chat: {
        user: getChatUserLimiter(),
        org: getChatOrgLimiter(),
      },
      embeddings: {
        user: getEmbeddingsUserLimiter(),
        org: getEmbeddingsOrgLimiter(),
      },
    };

    const limits: any = {};

    // Get limits for specific endpoint or all endpoints
    const endpoints = endpoint ? [endpoint] : Object.keys(limiters);

    for (const ep of endpoints) {
      const limiter = limiters[ep as keyof typeof limiters];
      if (!limiter) continue;

      limits[ep] = {};

      if (userId) {
        limits[ep].user = await limiter.user.checkUserLimit(userId, ep);
      }

      if (orgId) {
        limits[ep].org = await limiter.org.checkOrgLimit(orgId, ep);
      }

      // Get endpoint-level limit
      limits[ep].endpoint = await limiter.user.checkEndpointLimit(ep);
    }

    return NextResponse.json({
      success: true,
      data: {
        limits,
        userId,
        orgId,
      },
    });
  } catch (error) {
    logger.error("Error getting rate limits:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get rate limits",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const orgId = searchParams.get("orgId") || undefined;
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        {
          success: false,
          error: "endpoint is required",
        },
        { status: 400 },
      );
    }

    const limiters = {
      summarize: {
        user: getSummarizeUserLimiter(),
        org: getSummarizeOrgLimiter(),
      },
      search: {
        user: getSearchUserLimiter(),
        org: getSearchOrgLimiter(),
      },
      chat: {
        user: getChatUserLimiter(),
        org: getChatOrgLimiter(),
      },
      embeddings: {
        user: getEmbeddingsUserLimiter(),
        org: getEmbeddingsOrgLimiter(),
      },
    };

    const limiter = limiters[endpoint as keyof typeof limiters];
    if (!limiter) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid endpoint",
        },
        { status: 400 },
      );
    }

    if (userId) {
      await limiter.user.resetUserLimit(userId, endpoint);
    }

    if (orgId) {
      await limiter.org.resetOrgLimit(orgId, endpoint);
    }

    if (!userId && !orgId) {
      // Reset all limits for endpoint
      await limiter.user.resetAllLimits();
      await limiter.org.resetAllLimits();
    }

    return NextResponse.json({
      success: true,
      message: "Rate limits reset successfully",
    });
  } catch (error) {
    logger.error("Error resetting rate limits:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to reset rate limits",
      },
      { status: 500 },
    );
  }
}
