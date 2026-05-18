/**
 * POST /api/billing/usage/record
 *
 * Record usage events for metered billing.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getUsageBillingService } from "@/services/billing/usage-billing.service";
import type {
  CreateUsageEventInput,
  UsageDimensionType,
} from "@/lib/billing/usage-types";
import { DEFAULT_DIMENSION_CONFIGS } from "@/lib/billing/usage-types";

interface RecordUsageBody {
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  dimension: UsageDimensionType;
  quantity: number;
  timestamp?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

interface BatchRecordUsageBody {
  events: RecordUsageBody[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if batch request
    if ("events" in body && Array.isArray(body.events)) {
      return handleBatchRecord(body as BatchRecordUsageBody);
    }

    // Single event
    return handleSingleRecord(body as RecordUsageBody);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    logger.error("Error recording usage:", error);
    return NextResponse.json(
      { error: "Failed to record usage", details: errorMessage },
      { status: 500 },
    );
  }
}

async function handleSingleRecord(body: RecordUsageBody) {
  // Validate required fields
  if (!body.organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 },
    );
  }

  if (!body.dimension || !DEFAULT_DIMENSION_CONFIGS[body.dimension]) {
    return NextResponse.json(
      { error: "Valid dimension is required" },
      { status: 400 },
    );
  }

  if (typeof body.quantity !== "number" || !Number.isFinite(body.quantity)) {
    return NextResponse.json(
      { error: "Quantity must be a finite number" },
      { status: 400 },
    );
  }

  const billingService = getUsageBillingService();
  const tracker = billingService.getTracker();

  const input: CreateUsageEventInput = {
    organizationId: body.organizationId,
    workspaceId: body.workspaceId,
    userId: body.userId,
    dimension: body.dimension,
    quantity: body.quantity,
    timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
    idempotencyKey: body.idempotencyKey,
    metadata: body.metadata,
  };

  const result = await tracker.recordUsage(input);

  if (!result.success) {
    const status = result.limitExceeded ? 429 : 400;
    return NextResponse.json(
      {
        error: result.error,
        limitExceeded: result.limitExceeded,
        currentUsage: result.currentUsage,
      },
      { status },
    );
  }

  return NextResponse.json({
    success: true,
    eventId: result.eventId,
    currentUsage: result.currentUsage,
    alertTriggered: result.alertTriggered
      ? {
          id: result.alertTriggered.id,
          level: result.alertTriggered.level,
          message: result.alertTriggered.message,
        }
      : undefined,
    overageAmount: result.overageAmount,
  });
}

async function handleBatchRecord(body: BatchRecordUsageBody) {
  if (!body.events || body.events.length === 0) {
    return NextResponse.json(
      { error: "Events array is required and must not be empty" },
      { status: 400 },
    );
  }

  if (body.events.length > 100) {
    return NextResponse.json(
      { error: "Maximum 100 events per batch" },
      { status: 400 },
    );
  }

  const billingService = getUsageBillingService();
  const tracker = billingService.getTracker();

  const inputs: CreateUsageEventInput[] = body.events.map((event) => ({
    organizationId: event.organizationId,
    workspaceId: event.workspaceId,
    userId: event.userId,
    dimension: event.dimension,
    quantity: event.quantity,
    timestamp: event.timestamp ? new Date(event.timestamp) : undefined,
    idempotencyKey: event.idempotencyKey,
    metadata: event.metadata,
  }));

  const results = await tracker.recordUsageBatch(inputs);

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: failureCount === 0,
    totalEvents: body.events.length,
    successCount,
    failureCount,
    results: results.map((result, index) => ({
      index,
      success: result.success,
      eventId: result.eventId,
      error: result.error,
      limitExceeded: result.limitExceeded,
    })),
  });
}
