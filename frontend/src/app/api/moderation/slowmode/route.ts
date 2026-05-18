/**
 * API Route: Slow Mode Management
 * GET /api/moderation/slowmode - Get slowmode config for a channel
 * POST /api/moderation/slowmode - Set slowmode for a channel
 * DELETE /api/moderation/slowmode - Remove slowmode from a channel
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getModerationEngine,
  formatDurationMs,
} from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Common slowmode presets in milliseconds
const SLOWMODE_PRESETS = {
  off: 0,
  "5s": 5000,
  "10s": 10000,
  "15s": 15000,
  "30s": 30000,
  "1m": 60000,
  "2m": 120000,
  "5m": 300000,
  "10m": 600000,
  "15m": 900000,
  "30m": 1800000,
  "1h": 3600000,
  "2h": 7200000,
  "6h": 21600000,
} as const;

/**
 * GET: Get slowmode configuration for a channel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      // Return available presets
      return NextResponse.json({
        success: true,
        presets: Object.entries(SLOWMODE_PRESETS).map(([key, value]) => ({
          key,
          value,
          label: value === 0 ? "Off" : formatDurationMs(value),
        })),
      });
    }

    const engine = getModerationEngine();
    const config = engine.getSlowmodeConfig(channelId);

    return NextResponse.json({
      success: true,
      channelId,
      slowmode: config || null,
      isEnabled: config?.enabled ?? false,
      interval: config?.intervalMs ?? 0,
      intervalFormatted: config?.intervalMs
        ? formatDurationMs(config.intervalMs)
        : "Off",
    });
  } catch (error) {
    logger.error("Get slowmode error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "slowmode-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch slowmode config",
        details:
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

/**
 * POST: Set slowmode for a channel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, interval, moderatorId, bypassRoles, bypassUsers } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 },
      );
    }

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 },
      );
    }

    // Parse interval
    let intervalMs: number;
    if (typeof interval === "string") {
      // Check if it's a preset
      if (interval in SLOWMODE_PRESETS) {
        intervalMs =
          SLOWMODE_PRESETS[interval as keyof typeof SLOWMODE_PRESETS];
      } else {
        // Try to parse as duration string (e.g., "30s", "5m")
        const match = interval.match(/^(\d+)(s|m|h)$/);
        if (match) {
          const value = parseInt(match[1], 10);
          const unit = match[2];
          switch (unit) {
            case "s":
              intervalMs = value * 1000;
              break;
            case "m":
              intervalMs = value * 60 * 1000;
              break;
            case "h":
              intervalMs = value * 60 * 60 * 1000;
              break;
            default:
              intervalMs = 0;
          }
        } else {
          return NextResponse.json(
            { error: "Invalid interval format" },
            { status: 400 },
          );
        }
      }
    } else if (typeof interval === "number") {
      intervalMs = interval;
    } else {
      return NextResponse.json(
        { error: "Interval is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.setSlowmode({
      channelId,
      intervalMs,
      moderatorId,
      bypassRoles,
      bypassUsers,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      config: result.config,
      message:
        intervalMs > 0
          ? `Slowmode set to ${formatDurationMs(intervalMs)}`
          : "Slowmode disabled",
    });
  } catch (error) {
    logger.error("Set slowmode error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "slowmode-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to set slowmode",
        details:
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

/**
 * DELETE: Remove slowmode from a channel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const moderatorId = searchParams.get("moderatorId");

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 },
      );
    }

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();
    engine.removeSlowmode(channelId, moderatorId);

    return NextResponse.json({
      success: true,
      channelId,
      message: "Slowmode disabled",
    });
  } catch (error) {
    logger.error("Remove slowmode error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "slowmode-delete" },
    });

    return NextResponse.json(
      {
        error: "Failed to remove slowmode",
        details:
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
