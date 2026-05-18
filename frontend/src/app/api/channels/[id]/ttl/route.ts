/**
 * Channel TTL API Route
 *
 * Handles default TTL (Time-To-Live) settings for a channel.
 * When set, new messages in the channel will automatically have this TTL applied.
 *
 * GET /api/channels/[id]/ttl - Get channel default TTL
 * POST /api/channels/[id]/ttl - Set channel default TTL
 * DELETE /api/channels/[id]/ttl - Clear channel TTL (messages become permanent)
 *
 * @module api/channels/[id]/ttl
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getEphemeralMessageService } from "@/services/messages/ephemeral.service";
import { validateTTL, formatTTL } from "@/graphql/messages/ephemeral";
import {
  createChannelService,
  createPermissionsService,
} from "@/services/channels";
import type { UserRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SetChannelTTLSchema = z.object({
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
  const key = `channel-ttl:${userId}`;
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

function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get("x-user-role") as UserRole) || "guest";
}

/**
 * Check if user can manage channel TTL settings
 * Requires admin/owner role or channel-specific permissions
 */
async function canManageChannelTTL(
  channelId: string,
  userId: string,
  userRole: UserRole,
): Promise<boolean> {
  // Site owners and admins can always manage TTL
  if (userRole === "owner" || userRole === "admin") {
    return true;
  }

  try {
    const permissionsService = createPermissionsService(apolloClient);
    return await permissionsService.canPerformAction(
      channelId,
      userId,
      userRole,
      "canUpdateSettings",
    );
  } catch {
    return false;
  }
}

// ============================================================================
// GET /api/channels/[id]/ttl - Get channel default TTL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("GET /api/channels/[id]/ttl - Get channel TTL", {
      channelId: id,
    });

    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const result = await ephemeralService.getChannelTTL(id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to get channel TTL",
        },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        channelId: result.data.id,
        channelName: result.data.name,
        defaultTTLSeconds: result.data.defaultTTLSeconds,
        formattedTTL: formatTTL(result.data.defaultTTLSeconds),
        hasEphemeralMessages: result.data.defaultTTLSeconds !== null,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/channels/[id]/ttl - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get channel TTL",
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
// POST /api/channels/[id]/ttl - Set channel default TTL
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("POST /api/channels/[id]/ttl - Set channel TTL", {
      channelId: id,
    });

    // Auth check
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);

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
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    // Check permissions
    const canManage = await canManageChannelTTL(id, userId, userRole);
    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to manage channel TTL",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = SetChannelTTLSchema.safeParse(body);
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

    // Set channel default TTL
    const result = await ephemeralService.setChannelDefaultTTL(
      id,
      ttlSeconds,
      userId,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to set channel TTL",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/channels/[id]/ttl - Channel TTL set successfully", {
      channelId: id,
      ttlSeconds,
    });

    return NextResponse.json(
      {
        success: true,
        message: `New messages in this channel will expire in ${formatTTL(ttlSeconds)}`,
        data: {
          channelId: result.data!.id,
          channelName: result.data!.name,
          defaultTTLSeconds: result.data!.defaultTTLSeconds,
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
    logger.error("POST /api/channels/[id]/ttl - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to set channel TTL",
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
// DELETE /api/channels/[id]/ttl - Clear channel TTL
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    logger.info("DELETE /api/channels/[id]/ttl - Clear channel TTL", {
      channelId: id,
    });

    // Auth check
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);

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
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    // Check permissions
    const canManage = await canManageChannelTTL(id, userId, userRole);
    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to manage channel TTL",
        },
        { status: 403 },
      );
    }

    // Clear channel default TTL (set to null)
    const result = await ephemeralService.setChannelDefaultTTL(
      id,
      null,
      userId,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to clear channel TTL",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info(
      "DELETE /api/channels/[id]/ttl - Channel TTL cleared successfully",
      {
        channelId: id,
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Channel messages will no longer auto-expire",
        data: {
          channelId: result.data!.id,
          channelName: result.data!.name,
          defaultTTLSeconds: null,
          formattedTTL: "Permanent",
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
    logger.error("DELETE /api/channels/[id]/ttl - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear channel TTL",
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
