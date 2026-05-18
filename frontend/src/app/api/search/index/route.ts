/**
 * Search Index Management API Route
 *
 * POST /api/search/index - Trigger reindexing (admin only)
 * GET /api/search/index - Get index status
 * DELETE /api/search/index - Clear all indexes (admin only)
 *
 * @module app/api/search/index
 */

import { NextRequest, NextResponse } from "next/server";
import { getIndexService, getSyncService } from "@/services/search";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Types
// ============================================================================

interface ReindexRequest {
  indexName?: "messages" | "files" | "users" | "channels";
  forceRebuild?: boolean;
}

// ============================================================================
// GET - Get Index Status
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const indexService = getIndexService();
    const stats = await indexService.getAllIndexesInfo();

    // Check health for each index
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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error getting index status:", error);
    captureError(error as Error, { tags: { api: "search-index" } });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get index status",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Trigger Reindexing
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // const user = await getAuthenticatedUser(request)
    // if (!user || user.role !== 'admin' && user.role !== 'owner') {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    // }

    const body: ReindexRequest = await request.json().catch(() => ({}));
    const indexService = getIndexService();
    const syncService = getSyncService();

    // If forceRebuild, clear indexes first
    if (body.forceRebuild) {
      if (body.indexName) {
        await indexService.clearIndex(`nchat_${body.indexName}` as any);
      } else {
        await indexService.clearAllIndexes();
      }
    }

    // Initialize/configure indexes
    if (body.indexName) {
      const result = await indexService.initializeIndex(
        `nchat_${body.indexName}` as any,
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Index nchat_${body.indexName} initialized`,
        taskId: result.taskId,
        duration: result.duration,
      });
    }

    // Initialize all indexes
    const result = await indexService.initializeAllIndexes();

    return NextResponse.json({
      success: result.failed === 0,
      message:
        result.failed === 0
          ? "All indexes initialized successfully"
          : `Initialized ${result.successful} indexes, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    logger.error("Error triggering reindex:", error);
    captureError(error as Error, { tags: { api: "search-index" } });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to trigger reindex",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Clear Indexes
// ============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // const user = await getAuthenticatedUser(request)
    // if (!user || user.role !== 'admin' && user.role !== 'owner') {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url);
    const indexName = searchParams.get("indexName");

    const indexService = getIndexService();

    if (indexName) {
      const result = await indexService.clearIndex(`nchat_${indexName}` as any);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Index nchat_${indexName} cleared`,
        taskId: result.taskId,
      });
    }

    // Clear all indexes
    const result = await indexService.clearAllIndexes();

    return NextResponse.json({
      success: result.failed === 0,
      message:
        result.failed === 0
          ? "All indexes cleared"
          : `Cleared ${result.successful} indexes, ${result.failed} failed`,
      result,
    });
  } catch (error) {
    logger.error("Error clearing indexes:", error);
    captureError(error as Error, { tags: { api: "search-index" } });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to clear indexes",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// OPTIONS for CORS
// ============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
