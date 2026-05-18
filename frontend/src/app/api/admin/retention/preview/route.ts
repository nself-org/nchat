/**
 * Retention Preview API Route
 *
 * POST - Preview retention execution (dry run with details)
 *
 * @module app/api/admin/retention/preview
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getRetentionExecutorService } from "@/services/retention";

// ============================================================================
// POST - Preview retention execution
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const service = getRetentionExecutorService();

    if (!service.initialized) {
      await service.initialize();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.policyId) {
      return NextResponse.json(
        { success: false, error: "Policy ID is required" },
        { status: 400 },
      );
    }

    const preview = await service.previewExecution(body.policyId, {
      contentType: body.contentType,
      limit: body.limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        policyId: body.policyId,
        wouldDelete: preview.wouldDelete,
        wouldArchive: preview.wouldArchive,
        wouldSkip: preview.wouldSkip,
        blockedByLegalHold: preview.blockedByLegalHold,
        inGracePeriod: preview.inGracePeriod,
        candidateCount: preview.candidates.length,
        candidates: body.includeCandidates ? preview.candidates : undefined,
      },
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
