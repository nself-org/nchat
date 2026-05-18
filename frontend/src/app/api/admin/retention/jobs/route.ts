/**
 * Retention Jobs API Route
 *
 * GET - List retention jobs
 * POST - Execute a retention policy
 *
 * @module app/api/admin/retention/jobs
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionExecutorService,
  type RetentionJobStatus,
} from "@/services/retention";

// ============================================================================
// GET - List jobs
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const service = getRetentionExecutorService();

    if (!service.initialized) {
      await service.initialize();
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const options = {
      status: searchParams.get("status") as RetentionJobStatus | undefined,
      policyId: searchParams.get("policyId") || undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
    };

    const jobs = service.getJobs(options);

    return NextResponse.json({
      success: true,
      data: jobs,
      total: jobs.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Execute policy
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const service = getRetentionExecutorService();

    if (!service.initialized) {
      await service.initialize();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.policyId && !body.executeAll) {
      return NextResponse.json(
        {
          success: false,
          error: "Policy ID is required (or set executeAll: true)",
        },
        { status: 400 },
      );
    }

    const options = {
      dryRun: body.dryRun ?? false,
      batchSize: body.batchSize,
      maxBatches: body.maxBatches,
    };

    let result;

    if (body.executeAll) {
      // Execute all active policies
      const results = await service.executeAllPolicies(options);
      result = {
        success: results.every((r) => r.success),
        results,
        totalItemsProcessed: results.reduce(
          (sum, r) => sum + r.itemsProcessed,
          0,
        ),
        totalItemsDeleted: results.reduce((sum, r) => sum + r.itemsDeleted, 0),
        totalItemsArchived: results.reduce(
          (sum, r) => sum + r.itemsArchived,
          0,
        ),
      };
    } else {
      // Execute specific policy
      result = await service.executePolicy(body.policyId, options);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
