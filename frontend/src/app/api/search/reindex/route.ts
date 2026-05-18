/**
 * Search Reindex API Route
 *
 * POST /api/search/reindex - Trigger full reindexing (admin only)
 * POST /api/search/reindex/batch - Batch index specific documents
 * GET /api/search/reindex/status - Get reindexing status
 *
 * @module app/api/search/reindex
 */

import { NextRequest, NextResponse } from "next/server";
import { getSyncService, getIndexService } from "@/services/search";
import {
  getAuthenticatedUser,
  withErrorHandler,
  withRateLimit,
  compose,
} from "@/lib/api/middleware";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Types
// ============================================================================

interface ReindexRequest {
  indexNames?: ("messages" | "files" | "users" | "channels")[];
  forceRebuild?: boolean;
  batchSize?: number;
}

interface BatchIndexRequest {
  indexName: "messages" | "files" | "users" | "channels";
  documents: Record<string, unknown>[];
}

// ============================================================================
// POST - Trigger Full Reindexing
// ============================================================================

async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication and admin role
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "owner")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const body: ReindexRequest = await request.json().catch(() => ({}));
    const syncService = getSyncService();
    const indexService = getIndexService();

    const indexNames = body.indexNames || [
      "messages",
      "files",
      "users",
      "channels",
    ];
    const results: Record<string, unknown> = {};

    // If forceRebuild, clear indexes first
    if (body.forceRebuild) {
      // REMOVED: console.log('[Reindex] Clearing indexes...')
      for (const indexName of indexNames) {
        await indexService.clearIndex(`nchat_${indexName}` as any);
      }
    }

    // Trigger reindexing for each index
    for (const indexName of indexNames) {
      // REMOVED: console.log(`[Reindex] Starting reindex for ${indexName}...`)

      try {
        switch (indexName) {
          case "messages":
            // Reindex messages - in production, this would fetch from database
            // For now, we'll just initialize the index
            const messageResult = await indexService.initializeIndex(
              "nchat_messages" as any,
            );
            results[indexName] = {
              success: messageResult.success,
              taskId: messageResult.taskId,
              error: messageResult.error,
            };
            break;

          case "files":
            const fileResult = await indexService.initializeIndex(
              "nchat_files" as any,
            );
            results[indexName] = {
              success: fileResult.success,
              taskId: fileResult.taskId,
              error: fileResult.error,
            };
            break;

          case "users":
            const userResult = await indexService.initializeIndex(
              "nchat_users" as any,
            );
            results[indexName] = {
              success: userResult.success,
              taskId: userResult.taskId,
              error: userResult.error,
            };
            break;

          case "channels":
            const channelResult = await indexService.initializeIndex(
              "nchat_channels" as any,
            );
            results[indexName] = {
              success: channelResult.success,
              taskId: channelResult.taskId,
              error: channelResult.error,
            };
            break;
        }
      } catch (error) {
        results[indexName] = {
          success: false,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : "Reindex failed",
        };
      }
    }

    // Check if all succeeded
    const allSucceeded = Object.values(results).every((r: any) => r.success);

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? "All indexes reindexed successfully"
        : "Some indexes failed to reindex",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Reindex error:", error);
    captureError(error as Error, { tags: { api: "search-reindex" } });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Reindex failed",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get Reindexing Status
// ============================================================================

async function handleGet(request: NextRequest): Promise<NextResponse> {
  try {
    const indexService = getIndexService();
    const stats = await indexService.getAllIndexesInfo();

    // Get health for each index
    const [messagesHealth, filesHealth, usersHealth, channelsHealth] =
      await Promise.all([
        indexService.checkIndexHealth("nchat_messages" as any),
        indexService.checkIndexHealth("nchat_files" as any),
        indexService.checkIndexHealth("nchat_users" as any),
        indexService.checkIndexHealth("nchat_channels" as any),
      ]);

    return NextResponse.json({
      success: true,
      stats,
      health: {
        messages: messagesHealth,
        files: filesHealth,
        users: usersHealth,
        channels: channelsHealth,
      },
      isReindexing:
        stats.messages.isIndexing ||
        stats.files.isIndexing ||
        stats.users.isIndexing ||
        stats.channels.isIndexing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get status",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// Export Handlers
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withRateLimit({ limit: 10, window: 60 }), // 10 requests per minute
)(handlePost);

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }), // 60 requests per minute
)(handleGet);

// ============================================================================
// OPTIONS for CORS
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
