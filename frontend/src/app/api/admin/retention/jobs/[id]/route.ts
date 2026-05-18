/**
 * Retention Job by ID API Route
 *
 * GET - Get a specific job
 * DELETE - Cancel a running job
 *
 * @module app/api/admin/retention/jobs/[id]
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getRetentionExecutorService } from "@/services/retention";

// ============================================================================
// GET - Get job by ID
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getRetentionExecutorService();

    if (!service.initialized) {
      await service.initialize();
    }

    const job = service.getJob(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: job });
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
// DELETE - Cancel job
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = getRetentionExecutorService();

    if (!service.initialized) {
      await service.initialize();
    }

    const cancelled = await service.cancelJob(id);

    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: "Job not found or cannot be cancelled" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Job cancelled" });
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
