/**
 * Job Schedules API Route
 *
 * Handles scheduled/recurring job management.
 *
 * GET /api/jobs/schedule - List schedules
 * POST /api/jobs/schedule - Create a new schedule
 * PATCH /api/jobs/schedule - Update a schedule
 * DELETE /api/jobs/schedule - Delete a schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getSchedulerService,
  getQueueService,
  type NchatJobType,
  type QueueName,
  type ScheduleOptions,
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

function isValidJobType(type: string): type is NchatJobType {
  return VALID_JOB_TYPES.includes(type as NchatJobType);
}

function isValidQueueName(name: string): name is QueueName {
  return QUEUE_NAMES.includes(name as QueueName);
}

/**
 * Basic cron expression validation
 */
function isValidCronExpression(cron: string): boolean {
  // Basic validation: should have 5-6 parts
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    return false;
  }

  // Check for valid characters
  const validChars = /^[\d,\-\*\/]+$/;
  return parts.every((part) => validChars.test(part));
}

// ============================================================================
// GET /api/jobs/schedule
// ============================================================================

/**
 * List all schedules
 *
 * Query parameters:
 * - enabled: Filter by enabled status (true/false)
 * - jobType: Filter by job type
 * - tags: Filter by tags (comma-separated)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enabledParam = searchParams.get("enabled");
    const jobTypeParam = searchParams.get("jobType");
    const tagsParam = searchParams.get("tags");

    // Initialize services
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    const schedulerService = getSchedulerService();
    if (!schedulerService.initialized) {
      await schedulerService.initialize();
    }

    // Build filter options
    const filterOptions: {
      enabled?: boolean;
      jobType?: NchatJobType;
      tags?: string[];
    } = {};

    if (enabledParam !== null) {
      filterOptions.enabled = enabledParam === "true";
    }

    if (jobTypeParam && isValidJobType(jobTypeParam)) {
      filterOptions.jobType = jobTypeParam;
    }

    if (tagsParam) {
      filterOptions.tags = tagsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Get schedules
    const schedules = schedulerService.getSchedules(filterOptions);

    logger.info("Listed schedules", {
      count: schedules.length,
      filters: filterOptions,
    });

    return NextResponse.json({
      schedules: schedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        jobType: schedule.jobType,
        queueName: schedule.queueName,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
        enabled: schedule.enabled,
        lastRunAt: schedule.lastRunAt?.toISOString() || null,
        nextRunAt: schedule.nextRunAt?.toISOString() || null,
        totalRuns: schedule.totalRuns,
        successfulRuns: schedule.successfulRuns,
        failedRuns: schedule.failedRuns,
        maxRuns: schedule.maxRuns,
        endDate: schedule.endDate?.toISOString() || null,
        tags: schedule.tags,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      })),
      total: schedules.length,
    });
  } catch (error) {
    logger.error("Failed to list schedules", error as Error);
    return NextResponse.json(
      { error: "Failed to list schedules" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/jobs/schedule
// ============================================================================

/**
 * Create a new schedule
 *
 * Request body:
 * - name: Unique schedule name (required)
 * - description: Human-readable description (optional)
 * - jobType: Type of job to create (required)
 * - queueName: Queue to add jobs to (optional)
 * - payload: Job payload (required)
 * - cronExpression: Cron expression (required)
 * - timezone: Timezone for cron (optional, default: UTC)
 * - enabled: Enable schedule (optional, default: true)
 * - maxRuns: Maximum number of runs (optional)
 * - endDate: End date for schedule (optional)
 * - metadata: Additional metadata (optional)
 * - tags: Tags for filtering (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      jobType,
      queueName,
      payload,
      cronExpression,
      timezone,
      enabled,
      maxRuns,
      endDate,
      metadata,
      tags,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "name is required and must be a string" },
        { status: 400 },
      );
    }

    if (!jobType) {
      return NextResponse.json(
        { error: "jobType is required" },
        { status: 400 },
      );
    }

    if (!isValidJobType(jobType)) {
      return NextResponse.json(
        {
          error: `Invalid jobType. Valid types: ${VALID_JOB_TYPES.join(", ")}`,
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

    if (!cronExpression) {
      return NextResponse.json(
        { error: "cronExpression is required" },
        { status: 400 },
      );
    }

    if (!isValidCronExpression(cronExpression)) {
      return NextResponse.json(
        {
          error:
            'Invalid cron expression. Format: "minute hour day month weekday"',
        },
        { status: 400 },
      );
    }

    // Validate optional fields
    if (queueName && !isValidQueueName(queueName)) {
      return NextResponse.json(
        { error: `Invalid queueName. Valid queues: ${QUEUE_NAMES.join(", ")}` },
        { status: 400 },
      );
    }

    if (maxRuns !== undefined && (typeof maxRuns !== "number" || maxRuns < 1)) {
      return NextResponse.json(
        { error: "maxRuns must be a positive number" },
        { status: 400 },
      );
    }

    if (endDate !== undefined && isNaN(new Date(endDate).getTime())) {
      return NextResponse.json(
        { error: "endDate must be a valid date" },
        { status: 400 },
      );
    }

    // Initialize services
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    const schedulerService = getSchedulerService();
    if (!schedulerService.initialized) {
      await schedulerService.initialize();
    }

    // Build schedule options
    const scheduleOptions: ScheduleOptions = {
      name,
      description,
      jobType,
      queueName: queueName as QueueName | undefined,
      payload,
      cronExpression,
      timezone: timezone || "UTC",
      enabled: enabled !== false,
      maxRuns: maxRuns || null,
      endDate: endDate ? new Date(endDate) : null,
      metadata,
      tags,
    };

    // Create schedule
    const result = await schedulerService.createSchedule(scheduleOptions);

    logger.info("Schedule created", {
      scheduleId: result.scheduleId,
      name: result.name,
      nextRunAt: result.nextRunAt,
    });

    return NextResponse.json({
      scheduleId: result.scheduleId,
      name: result.name,
      nextRunAt: result.nextRunAt?.toISOString() || null,
      message: "Schedule created successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";

    // Check for duplicate name error
    if (errorMessage.includes("already exists")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    logger.error("Failed to create schedule", error as Error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/jobs/schedule
// ============================================================================

/**
 * Update a schedule
 *
 * Request body:
 * - scheduleId: Schedule ID (required) OR
 * - name: Schedule name (required)
 * - ... (same optional fields as POST)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleId, name: nameOrUpdate, ...updates } = body;

    // Get schedule ID
    let targetId = scheduleId;

    // Initialize services
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    const schedulerService = getSchedulerService();
    if (!schedulerService.initialized) {
      await schedulerService.initialize();
    }

    // If no scheduleId, try to find by name
    if (!targetId && nameOrUpdate) {
      const schedule = schedulerService.getScheduleByName(nameOrUpdate);
      if (schedule) {
        targetId = schedule.id;
      }
    }

    if (!targetId) {
      return NextResponse.json(
        { error: "scheduleId or name is required to identify the schedule" },
        { status: 400 },
      );
    }

    // Validate updates
    if (updates.jobType && !isValidJobType(updates.jobType)) {
      return NextResponse.json(
        {
          error: `Invalid jobType. Valid types: ${VALID_JOB_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (updates.queueName && !isValidQueueName(updates.queueName)) {
      return NextResponse.json(
        { error: `Invalid queueName. Valid queues: ${QUEUE_NAMES.join(", ")}` },
        { status: 400 },
      );
    }

    if (
      updates.cronExpression &&
      !isValidCronExpression(updates.cronExpression)
    ) {
      return NextResponse.json(
        { error: "Invalid cron expression" },
        { status: 400 },
      );
    }

    // Build update object
    const scheduleUpdates: Partial<ScheduleOptions> = {};
    if (nameOrUpdate && nameOrUpdate !== scheduleId)
      scheduleUpdates.name = nameOrUpdate;
    if (updates.description !== undefined)
      scheduleUpdates.description = updates.description;
    if (updates.jobType !== undefined)
      scheduleUpdates.jobType = updates.jobType;
    if (updates.queueName !== undefined)
      scheduleUpdates.queueName = updates.queueName;
    if (updates.payload !== undefined)
      scheduleUpdates.payload = updates.payload;
    if (updates.cronExpression !== undefined)
      scheduleUpdates.cronExpression = updates.cronExpression;
    if (updates.timezone !== undefined)
      scheduleUpdates.timezone = updates.timezone;
    if (updates.enabled !== undefined)
      scheduleUpdates.enabled = updates.enabled;
    if (updates.maxRuns !== undefined)
      scheduleUpdates.maxRuns = updates.maxRuns;
    if (updates.endDate !== undefined)
      scheduleUpdates.endDate = updates.endDate
        ? new Date(updates.endDate)
        : null;
    if (updates.metadata !== undefined)
      scheduleUpdates.metadata = updates.metadata;
    if (updates.tags !== undefined) scheduleUpdates.tags = updates.tags;

    // Update schedule
    const result = await schedulerService.updateSchedule(
      targetId,
      scheduleUpdates,
    );

    logger.info("Schedule updated", {
      scheduleId: result.scheduleId,
      updated: result.updated,
      nextRunAt: result.nextRunAt,
    });

    return NextResponse.json({
      scheduleId: result.scheduleId,
      updated: result.updated,
      nextRunAt: result.nextRunAt?.toISOString() || null,
      message: "Schedule updated successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";

    if (errorMessage.includes("not found")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes("already exists")) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    logger.error("Failed to update schedule", error as Error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/jobs/schedule
// ============================================================================

/**
 * Delete a schedule
 *
 * Query parameters:
 * - id: Schedule ID (required) OR
 * - name: Schedule name (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scheduleId = searchParams.get("id");
    const scheduleName = searchParams.get("name");

    // Initialize services
    const queueService = getQueueService();
    if (!queueService.initialized) {
      await queueService.initialize();
    }

    const schedulerService = getSchedulerService();
    if (!schedulerService.initialized) {
      await schedulerService.initialize();
    }

    // Get schedule ID
    let targetId = scheduleId;

    if (!targetId && scheduleName) {
      const schedule = schedulerService.getScheduleByName(scheduleName);
      if (schedule) {
        targetId = schedule.id;
      }
    }

    if (!targetId) {
      return NextResponse.json(
        { error: "id or name query parameter is required" },
        { status: 400 },
      );
    }

    // Delete schedule
    const deleted = await schedulerService.deleteSchedule(targetId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 },
      );
    }

    logger.info("Schedule deleted", { scheduleId: targetId });

    return NextResponse.json({
      message: "Schedule deleted successfully",
      scheduleId: targetId,
    });
  } catch (error) {
    logger.error("Failed to delete schedule", error as Error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 },
    );
  }
}
