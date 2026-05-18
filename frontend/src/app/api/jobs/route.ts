/**
 * Jobs API Route
 *
 * Handles job listing and creation for background tasks.
 *
 * GET /api/jobs - List jobs with filtering
 * POST /api/jobs - Create a new job
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getQueueService,
  type NchatJobType,
  type QueueName,
  type JobPayload,
  type CreateJobOptions,
  type JobStatus,
  QUEUE_NAMES,
} from "@/services/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// Validation
// ============================================================================

const VALID_JOB_TYPES: NchatJobType[] = [
  "scheduled-message",
  "email-digest",
  "cleanup-expired",
  "index-search",
  "process-file",
  "send-notification",
  "send-email",
  "http-webhook",
  "custom",
];

const VALID_PRIORITIES = ["critical", "high", "normal", "low"] as const;
const VALID_STATUSES: JobStatus[] = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
];

function isValidJobType(type: string): type is NchatJobType {
  return VALID_JOB_TYPES.includes(type as NchatJobType);
}

function isValidQueueName(name: string): name is QueueName {
  return QUEUE_NAMES.includes(name as QueueName);
}

function isValidPriority(
  priority: string,
): priority is (typeof VALID_PRIORITIES)[number] {
  return VALID_PRIORITIES.includes(
    priority as (typeof VALID_PRIORITIES)[number],
  );
}

function isValidStatus(status: string): status is JobStatus {
  return VALID_STATUSES.includes(status as JobStatus);
}

// ============================================================================
// GET /api/jobs
// ============================================================================

/**
 * List jobs with optional filtering
 *
 * Query parameters:
 * - queue: Queue name to filter by
 * - status: Job status to filter by (comma-separated for multiple)
 * - type: Job type to filter by
 * - limit: Maximum number of jobs to return (default: 50, max: 200)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queueParam = searchParams.get("queue");
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate queue parameter
    const queues: QueueName[] =
      queueParam && isValidQueueName(queueParam) ? [queueParam] : QUEUE_NAMES;

    // Validate status parameter
    let statuses: JobStatus[] = ["waiting", "active", "delayed"];
    if (statusParam) {
      const requestedStatuses = statusParam.split(",").filter(isValidStatus);
      if (requestedStatuses.length > 0) {
        statuses = requestedStatuses;
      }
    }

    // Get queue service
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    // Fetch jobs from all requested queues
    const jobs: Array<{
      id: string;
      queue: string;
      type: string;
      status: string;
      payload: unknown;
      progress: number;
      attempts: number;
      createdAt: string;
      processedAt: string | null;
      finishedAt: string | null;
      delay?: number;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }> = [];

    for (const queueName of queues) {
      const queueJobs = await queueService.getJobs(queueName, statuses, {
        start: offset,
        end: offset + limit,
      });

      for (const job of queueJobs) {
        const data = job.data as {
          type?: string;
          payload?: unknown;
          metadata?: Record<string, unknown>;
          tags?: string[];
        };

        // Filter by type if specified
        if (typeParam && data.type !== typeParam) {
          continue;
        }

        jobs.push({
          id: job.id!,
          queue: queueName,
          type: data.type || "unknown",
          status: await job.getState(),
          payload: data.payload,
          progress: (job.progress as number) || 0,
          attempts: job.attemptsMade,
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
        });
      }
    }

    // Sort by creation time (newest first)
    jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Apply limit
    const limitedJobs = jobs.slice(0, limit);

    logger.info("Listed jobs", {
      queues,
      statuses,
      type: typeParam,
      count: limitedJobs.length,
    });

    return NextResponse.json({
      jobs: limitedJobs,
      total: jobs.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Failed to list jobs", error as Error);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/jobs
// ============================================================================

/**
 * Create a new job
 *
 * Request body:
 * - type: Job type (required)
 * - payload: Job payload (required)
 * - queue: Queue name (optional, defaults based on type)
 * - priority: Job priority (optional, default: 'normal')
 * - delay: Delay in milliseconds (optional)
 * - maxRetries: Maximum retry attempts (optional)
 * - retryDelay: Delay between retries (optional)
 * - timeout: Job timeout (optional)
 * - metadata: Additional metadata (optional)
 * - tags: Tags for filtering (optional)
 * - jobId: Deduplication ID (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      payload,
      queue,
      priority,
      delay,
      maxRetries,
      retryDelay,
      timeout,
      metadata,
      tags,
      jobId,
    } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    if (!isValidJobType(type)) {
      return NextResponse.json(
        {
          error: `Invalid job type. Valid types: ${VALID_JOB_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "payload is required and must be an object" },
        { status: 400 },
      );
    }

    // Validate optional fields
    if (queue && !isValidQueueName(queue)) {
      return NextResponse.json(
        { error: `Invalid queue. Valid queues: ${QUEUE_NAMES.join(", ")}` },
        { status: 400 },
      );
    }

    if (priority && !isValidPriority(priority)) {
      return NextResponse.json(
        {
          error: `Invalid priority. Valid priorities: ${VALID_PRIORITIES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (delay !== undefined && (typeof delay !== "number" || delay < 0)) {
      return NextResponse.json(
        { error: "delay must be a positive number" },
        { status: 400 },
      );
    }

    // Build options
    const options: CreateJobOptions = {
      queue: queue as QueueName | undefined,
      priority,
      delay,
      maxRetries,
      retryDelay,
      timeout,
      metadata,
      tags,
      jobId,
    };

    // Get queue service
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    // Add job
    const result = await queueService.addJob(
      type,
      payload as JobPayload,
      options,
    );

    logger.info("Job created", {
      jobId: result.jobId,
      type,
      queue: result.queueName,
    });

    return NextResponse.json({
      jobId: result.jobId,
      queue: result.queueName,
      type,
      message: "Job created successfully",
    });
  } catch (error) {
    logger.error("Failed to create job", error as Error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 },
    );
  }
}
