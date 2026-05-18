/**
 * Embedding Worker Management API
 * POST /api/workers/embeddings - Start/stop worker
 * GET /api/workers/embeddings - Get worker stats
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEmbeddingWorker,
  startEmbeddingWorker,
  stopEmbeddingWorker,
} from "@/lib/workers/embedding-worker";
import { getVectorStore } from "@/lib/database/vector-store";
import { captureError } from "@/lib/sentry-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WorkerResponse {
  success: boolean;
  worker?: {
    isRunning: boolean;
    stats: any;
  };
  queue?: {
    pending: number;
    processing: number;
    failed: number;
    completedToday: number;
    avgProcessingTime: number;
  };
  coverage?: {
    total: number;
    withEmbeddings: number;
    needingEmbeddings: number;
    percentage: number;
  };
  error?: string;
}

// GET - Get worker status and stats
export async function GET() {
  try {
    const worker = getEmbeddingWorker();
    const vectorStore = getVectorStore();

    const [workerStats, queueStats, coverageStats] = await Promise.all([
      Promise.resolve(worker.getStats()),
      vectorStore.getQueueStats(),
      vectorStore.getCoverageStats(),
    ]);

    return NextResponse.json({
      success: true,
      worker: {
        isRunning: worker.isActive(),
        stats: workerStats,
      },
      queue: {
        pending: queueStats.pendingCount,
        processing: queueStats.processingCount,
        failed: queueStats.failedCount,
        completedToday: queueStats.completedToday,
        avgProcessingTime: queueStats.avgProcessingTimeSeconds,
      },
      coverage: {
        total: coverageStats.totalMessages,
        withEmbeddings: coverageStats.messagesWithEmbeddings,
        needingEmbeddings: coverageStats.messagesNeedingEmbeddings,
        percentage: coverageStats.coveragePercentage,
      },
    } as WorkerResponse);
  } catch (error) {
    captureError(error as Error, {
      tags: { api: "worker-status" },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get status",
      } as WorkerResponse,
      { status: 500 },
    );
  }
}

// POST - Start or stop worker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    if (!action || (action !== "start" && action !== "stop")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "start" or "stop"',
        } as WorkerResponse,
        { status: 400 },
      );
    }

    if (action === "start") {
      const worker = await startEmbeddingWorker(config);
      const stats = worker.getStats();

      return NextResponse.json({
        success: true,
        worker: {
          isRunning: true,
          stats,
        },
      } as WorkerResponse);
    }

    if (action === "stop") {
      await stopEmbeddingWorker();

      return NextResponse.json({
        success: true,
        worker: {
          isRunning: false,
          stats: {},
        },
      } as WorkerResponse);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown action",
      } as WorkerResponse,
      { status: 400 },
    );
  } catch (error) {
    captureError(error as Error, {
      tags: { api: "worker-control" },
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Worker operation failed",
      } as WorkerResponse,
      { status: 500 },
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
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
