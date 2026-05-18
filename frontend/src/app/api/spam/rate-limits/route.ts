/**
 * API Route: Rate Limit Management
 * GET /api/spam/rate-limits - Get rate limit status and stats
 * POST /api/spam/rate-limits - Check rate limit for an action
 * PUT /api/spam/rate-limits - Update rate limit configuration
 * DELETE /api/spam/rate-limits - Reset rate limits for a user
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimiter,
  createRateLimitHeaders,
  formatRetryAfter,
} from "@/lib/spam";
import type { RateLimitAction, RateLimitConfig } from "@/lib/spam";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS: RateLimitAction[] = [
  "message",
  "reaction",
  "channel_join",
  "channel_create",
  "api_call",
  "file_upload",
  "friend_request",
  "mention",
  "dm_create",
  "invite_create",
  "report",
  "profile_update",
  "webhook_call",
  "search",
  "export",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") as RateLimitAction | null;

    const limiter = getRateLimiter();

    // If userId and action provided, get specific state
    if (userId && action) {
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json(
          {
            error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const state = limiter.getState(action, userId);
      const violations = limiter.getViolationCount(userId);

      return NextResponse.json({
        success: true,
        userId,
        action,
        state,
        violations,
        isRepeatOffender: limiter.isRepeatOffender(userId),
      });
    }

    // Otherwise return stats
    const stats = limiter.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Failed to get rate limit info:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rate-limits" },
    });

    return NextResponse.json(
      { error: "Failed to get rate limit information" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, channelId, userRole, consume = true } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { error: "action and userId are required" },
        { status: 400 },
      );
    }

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const limiter = getRateLimiter();
    const result = limiter.check(action, userId, {
      channelId,
      userRole,
      consume,
    });

    const response = NextResponse.json({
      success: true,
      allowed: result.allowed,
      remaining: result.remaining,
      limit: result.limit,
      resetAt: result.resetAt,
      ...(result.retryAfter && {
        retryAfter: result.retryAfter,
        retryAfterFormatted: formatRetryAfter(result.retryAfter),
      }),
      ...(result.burstRemaining !== undefined && {
        burstRemaining: result.burstRemaining,
      }),
    });

    // Add rate limit headers
    const headers = createRateLimitHeaders(result);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error) {
    logger.error("Failed to check rate limit:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rate-limits" },
    });

    return NextResponse.json(
      { error: "Failed to check rate limit" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      userId,
      channelId,
      config,
      addTrustedUser,
      removeTrustedUser,
      applyStrictLimits,
      removeStrictLimits,
    } = body;

    const limiter = getRateLimiter();

    // Handle trusted user management
    if (addTrustedUser) {
      limiter.addTrustedUser(addTrustedUser);
      return NextResponse.json({
        success: true,
        message: `Added ${addTrustedUser} to trusted users`,
      });
    }

    if (removeTrustedUser) {
      limiter.removeTrustedUser(removeTrustedUser);
      return NextResponse.json({
        success: true,
        message: `Removed ${removeTrustedUser} from trusted users`,
      });
    }

    // Handle strict limits
    if (applyStrictLimits) {
      limiter.applyStrictLimits(applyStrictLimits);
      return NextResponse.json({
        success: true,
        message: `Applied strict limits to ${applyStrictLimits}`,
      });
    }

    if (removeStrictLimits) {
      limiter.removeStrictLimits(removeStrictLimits);
      return NextResponse.json({
        success: true,
        message: `Removed strict limits from ${removeStrictLimits}`,
      });
    }

    // Handle config updates
    if (action && config) {
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json(
          {
            error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const rateConfig: RateLimitConfig = {
        limit: config.limit || 30,
        windowMs: config.windowMs || 60000,
        ...(config.burstLimit && { burstLimit: config.burstLimit }),
        ...(config.burstWindowMs && { burstWindowMs: config.burstWindowMs }),
        ...(config.cooldownMs && { cooldownMs: config.cooldownMs }),
        ...(config.message && { message: config.message }),
        ...(config.exemptRoles && { exemptRoles: config.exemptRoles }),
      };

      if (userId) {
        // User-specific override
        limiter.setUserOverride(userId, action, rateConfig);
        logger.info("User rate limit override set", { userId, action });
      } else if (channelId) {
        // Channel-specific override
        limiter.setChannelOverride(channelId, action, rateConfig);
        logger.info("Channel rate limit override set", { channelId, action });
      } else {
        // Default limit
        limiter.setDefaultLimit(action, rateConfig);
        logger.info("Default rate limit updated", { action });
      }

      return NextResponse.json({
        success: true,
        action,
        config: rateConfig,
      });
    }

    return NextResponse.json(
      { error: "No valid update parameters provided" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Failed to update rate limit config:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rate-limits" },
    });

    return NextResponse.json(
      { error: "Failed to update rate limit configuration" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") as RateLimitAction | null;
    const channelId = searchParams.get("channelId") || undefined;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const limiter = getRateLimiter();

    if (action) {
      // Reset specific action
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json(
          {
            error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(", ")}`,
          },
          { status: 400 },
        );
      }

      limiter.reset(action, userId, "user", channelId);
      logger.info("Rate limit reset", { userId, action, channelId });

      return NextResponse.json({
        success: true,
        message: `Reset rate limit for ${action}`,
        userId,
      });
    }

    // Reset all
    limiter.resetAll(userId);
    logger.info("All rate limits reset", { userId });

    return NextResponse.json({
      success: true,
      message: "Reset all rate limits",
      userId,
    });
  } catch (error) {
    logger.error("Failed to reset rate limits:", error);
    captureError(error as Error, {
      tags: { feature: "spam", endpoint: "rate-limits" },
    });

    return NextResponse.json(
      { error: "Failed to reset rate limits" },
      { status: 500 },
    );
  }
}
