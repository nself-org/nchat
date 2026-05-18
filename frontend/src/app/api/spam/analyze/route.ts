/**
 * API Route: Analyze Content for Spam
 * POST /api/spam/analyze - Analyze message content for spam patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpamDetector, getRateLimiter } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, userId, channelId, userRole, workspaceId, quickCheck } =
      body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    if (!userId || !channelId) {
      return NextResponse.json(
        { error: "userId and channelId are required" },
        { status: 400 },
      );
    }

    const detector = getSpamDetector();
    const rateLimiter = getRateLimiter();

    // Check rate limit first
    const rateLimitResult = rateLimiter.check("message", userId, {
      channelId,
      userRole,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: true,
        isSpam: true,
        rateLimited: true,
        retryAfter: rateLimitResult.retryAfter,
        result: {
          isSpam: true,
          score: 1,
          categories: ["rapid_fire"],
          matchedRules: [],
          heuristics: [
            {
              category: "rapid_fire",
              score: 1,
              description: "Rate limit exceeded",
              evidence: [`Retry after ${rateLimitResult.retryAfter}ms`],
            },
          ],
          suggestedAction: "flag",
          severity: "medium",
          metadata: {
            messageLength: content.length,
            wordCount: 0,
            linkCount: 0,
            mentionCount: 0,
            emojiCount: 0,
            capsPercentage: 0,
            unicodeAnomalyScore: 0,
            repetitionScore: 0,
            analysisTime: 0,
          },
        },
      });
    }

    // Quick check for fast path
    if (quickCheck) {
      const isSpam = detector.quickCheck(content);
      return NextResponse.json({
        success: true,
        isSpam,
        quickCheck: true,
      });
    }

    // Full analysis
    const result = detector.analyze(content, {
      userId,
      channelId,
      userRole,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      isSpam: result.isSpam,
      rateLimited: false,
      result,
    });
  } catch (error) {
    logger.error("Spam analysis failed:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "analyze" },
    });

    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 },
    );
  }
}
