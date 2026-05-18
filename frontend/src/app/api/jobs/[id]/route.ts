/**
 * Job Detail API Route
 *
 * Handles individual job operations.
 *
 * GET /api/jobs/[id] - Get job details
 * DELETE /api/jobs/[id] - Cancel a job
 * POST /api/jobs/[id] - Retry a failed job
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getQueueService, type QueueName, QUEUE_NAMES } from "@/services/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Type Definitions
// ============================================================================

interface JobData {
  type?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt?: string;
}

// ============================================================================
// GET /api/jobs/[id]
// ============================================================================

/**
 * Get job details
 *
 * Query parameters:
 * - queue: Queue name hint (optional, searches all queues if not provided)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const queueHint = searchParams.get("queue") as QueueName | null;

    // Get queue service
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    // Find job
    const job = await queueService.getJob(id, queueHint || undefined);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = job.data as JobData;
    const state = await job.getState();

    // Get failure reason if failed
    let failedReason: string | undefined;
    if (state === "failed") {
      failedReason = job.failedReason;
    }

    // Get return value if completed
    let returnValue: unknown;
    if (state === "completed") {
      returnValue = job.returnvalue;
    }

    // Get logs
    const logs = await job.log("");

    logger.info("Retrieved job details", { jobId: id, state });

    return NextResponse.json({
      id: job.id,
      queue: job.queueName,
      type: data.type || "unknown",
      status: state,
      payload: data.payload,
      progress: job.progress,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : null,
      finishedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : null,
      delay: job.opts.delay,
      metadata: data.metadata,
      tags: data.tags,
      failedReason,
      returnValue,
      logs,
      options: {
        priority: (job.opts as any).priority,
        delay: (job.opts as any).delay,
        attempts: (job.opts as any).attempts,
        removeOnComplete: (job.opts as any).removeOnComplete,
        removeOnFail: (job.opts as any).removeOnFail,
      },
    });
  } catch (error) {
    logger.error("Failed to get job", error as Error);
    return NextResponse.json(
      { error: "Failed to get job details" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/jobs/[id]
// ============================================================================

/**
 * Cancel a job
 *
 * Can only cancel jobs that are not currently active.
 *
 * Query parameters:
 * - queue: Queue name hint (optional)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const queueHint = searchParams.get("queue") as QueueName | null;

    // Get queue service
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    // Find job first to check status
    const job = await queueService.getJob(id, queueHint || undefined);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();

    // Check if job can be cancelled
    if (state === "active") {
      return NextResponse.json(
        {
          error:
            "Cannot cancel an active job. Wait for it to complete or fail.",
        },
        { status: 400 },
      );
    }

    if (state === "completed") {
      return NextResponse.json(
        { error: "Job has already completed" },
        { status: 400 },
      );
    }

    // Cancel the job
    const cancelled = await queueService.cancelJob(id, queueHint || undefined);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Failed to cancel job" },
        { status: 500 },
      );
    }

    logger.info("Job cancelled", { jobId: id });

    return NextResponse.json({
      message: "Job cancelled successfully",
      jobId: id,
    });
  } catch (error) {
    logger.error("Failed to cancel job", error as Error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/jobs/[id]
// ============================================================================

/**
 * Retry a failed job
 *
 * Can only retry jobs that have failed.
 *
 * Request body (optional):
 * - queue: Queue name hint (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let queueHint: QueueName | null = null;

    // Check for queue hint in body
    try {
      const body = await request.json();
      queueHint = body.queue as QueueName | null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Get queue service
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    // Find job first to check status
    const job = await queueService.getJob(id, queueHint || undefined);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();

    // Check if job can be retried
    if (state !== "failed") {
      return NextResponse.json(
        { error: `Can only retry failed jobs. Current status: ${state}` },
        { status: 400 },
      );
    }

    // Retry the job
    const retried = await queueService.retryJob(id, queueHint || undefined);

    if (!retried) {
      return NextResponse.json(
        { error: "Failed to retry job" },
        { status: 500 },
      );
    }

    logger.info("Job retried", { jobId: id });

    return NextResponse.json({
      message: "Job retried successfully",
      jobId: id,
    });
  } catch (error) {
    logger.error("Failed to retry job", error as Error);
    return NextResponse.json({ error: "Failed to retry job" }, { status: 500 });
  }
}
