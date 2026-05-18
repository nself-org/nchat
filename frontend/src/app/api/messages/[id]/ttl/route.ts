/**
 * Message TTL API Route
 *
 * Handles TTL (Time-To-Live) operations for a specific message.
 *
 * GET /api/messages/[id]/ttl - Get message TTL info
 * POST /api/messages/[id]/ttl - Set TTL on message
 * DELETE /api/messages/[id]/ttl - Clear TTL (make permanent)
 *
 * @module api/messages/[id]/ttl
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getEphemeralMessageService } from "@/services/messages/ephemeral.service";
import { validateTTL, formatTTL } from "@/graphql/messages/ephemeral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SetTTLSchema = z.object({
  ttlSeconds: z
    .number()
    .int()
    .min(30, "TTL must be at least 30 seconds")
    .max(604800, "TTL must not exceed 7 days (604800 seconds)"),
});

// ============================================================================
// RATE LIMITING
// ============================================================================

// Simple in-memory rate limiter for TTL operations
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // 30 operations per minute
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const key = `ttl:${userId}`;
  const current = rateLimitMap.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetAt: now + RATE_WINDOW,
    };
  }

  if (current.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT - current.count,
    resetAt: current.resetAt,
  };
}

// ============================================================================
// SERVICES
// ============================================================================

const ephemeralService = getEphemeralMessageService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

// ============================================================================
// GET /api/messages/[id]/ttl - Get message TTL info
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("GET /api/messages/[id]/ttl - Get message TTL", {
      messageId: id,
    });

    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const result = await ephemeralService.getMessageTTL(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to get TTL info",
        },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.data.id,
        ttlSeconds: result.data.ttlSeconds,
        expiresAt: result.data.expiresAt?.toISOString() || null,
        remainingSeconds: result.data.remainingSeconds,
        isExpired: result.data.isExpired,
        formattedTTL: formatTTL(result.data.ttlSeconds),
        channel: {
          id: result.data.channel.id,
          name: result.data.channel.name,
          defaultTTLSeconds: result.data.channel.defaultTTLSeconds,
        },
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/messages/[id]/ttl - Error", error as Error, {
      messageId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get message TTL",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/messages/[id]/ttl - Set TTL on message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("POST /api/messages/[id]/ttl - Set message TTL", {
      messageId: id,
    });

    // Auth check
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded for TTL operations",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
            "Retry-After": Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = SetTTLSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { ttlSeconds } = validation.data;

    // Additional TTL validation
    const ttlValidation = validateTTL(ttlSeconds);
    if (!ttlValidation.valid) {
      return NextResponse.json(
        { success: false, error: ttlValidation.error },
        { status: 400 },
      );
    }

    // Set TTL
    const result = await ephemeralService.setMessageTTL(id, ttlSeconds, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || "Failed to set TTL" },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/messages/[id]/ttl - TTL set successfully", {
      messageId: id,
      ttlSeconds,
      expiresAt: result.data?.expiresAt?.toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Message will expire in ${formatTTL(ttlSeconds)}`,
        data: {
          messageId: result.data!.id,
          ttlSeconds: result.data!.ttlSeconds,
          expiresAt: result.data!.expiresAt.toISOString(),
          formattedTTL: formatTTL(ttlSeconds),
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": RATE_LIMIT.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
        },
      },
    );
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/messages/[id]/ttl - Error", error as Error, {
      messageId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set message TTL",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/messages/[id]/ttl - Clear TTL (make permanent)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("DELETE /api/messages/[id]/ttl - Clear message TTL", {
      messageId: id,
    });

    // Auth check
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Rate limit check
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded for TTL operations",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
            "Retry-After": Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Verify user owns the message
    const messageInfo = await ephemeralService.getMessageTTL(id);
    if (!messageInfo.success || !messageInfo.data) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    if (messageInfo.data.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the message author can clear TTL" },
        { status: 403 },
      );
    }

    // Clear TTL
    const result = await ephemeralService.clearMessageTTL(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to clear TTL",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("DELETE /api/messages/[id]/ttl - TTL cleared successfully", {
      messageId: id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Message is now permanent",
        data: {
          messageId: result.data!.id,
          ttlSeconds: null,
          expiresAt: null,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": RATE_LIMIT.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
        },
      },
    );
  } catch (error) {
    const { id } = await params;
    logger.error("DELETE /api/messages/[id]/ttl - Error", error as Error, {
      messageId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear message TTL",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
