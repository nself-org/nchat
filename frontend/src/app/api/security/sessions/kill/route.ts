/**
 * Session Kill API Routes
 *
 * Endpoints for killing active sessions.
 *
 * POST /api/security/sessions/kill - Kill specific session(s)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createWipeService } from "@/services/security/wipe.service";

// ============================================================================
// Types
// ============================================================================

interface KillSessionsBody {
  sessionIds?: string[];
  killAll?: boolean;
  exceptCurrent?: boolean;
  reason: string;
}

// ============================================================================
// POST - Kill Sessions
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KillSessionsBody;

    if (!body.reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 },
      );
    }

    if (!body.sessionIds && !body.killAll) {
      return NextResponse.json(
        { error: "Either sessionIds or killAll is required" },
        { status: 400 },
      );
    }

    const wipeService = createWipeService();
    await wipeService.initialize();

    const results: {
      sessionId: string;
      success: boolean;
      error: string | null;
    }[] = [];

    if (body.killAll) {
      // Kill all other sessions
      const killResults = await wipeService.killAllOtherSessions(body.reason);

      for (const result of killResults) {
        results.push({
          sessionId: result.wipeId.replace("wipe_", ""),
          success: result.success,
          error: result.error,
        });
      }

      logger.security("Kill all sessions requested via API", {
        count: results.length,
        exceptCurrent: body.exceptCurrent,
      });
    } else if (body.sessionIds) {
      // Kill specific sessions
      for (const sessionId of body.sessionIds) {
        const result = await wipeService.killSession({
          sessionId,
          reason: body.reason,
        });

        results.push({
          sessionId,
          success: result.success,
          error: result.error,
        });
      }

      logger.security("Kill specific sessions via API", {
        count: body.sessionIds.length,
      });
    }

    wipeService.destroy();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    logger.error("Kill sessions API error", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
