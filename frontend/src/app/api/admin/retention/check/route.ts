/**
 * Retention Check API Route
 *
 * POST - Check if deletion is blocked for a context
 *
 * @module app/api/admin/retention/check
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRetentionPolicyService,
  type RetentionResolutionContext,
} from "@/services/retention";

// ============================================================================
// POST - Check deletion status
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const service = getRetentionPolicyService();

    if (!service.initialized) {
      await service.initialize();
    }

    const body = await request.json();

    const context: RetentionResolutionContext = {
      userId: body.userId,
      channelId: body.channelId,
      workspaceId: body.workspaceId,
      contentType: body.contentType,
    };

    // Check if deletion is blocked
    const deletionCheck = service.isDeletionBlocked(context);

    // Get resolved policy
    const resolved = service.resolvePolicy(context);

    // Get applicable policies
    const applicablePolicies = service.getApplicablePolicies(context);

    return NextResponse.json({
      success: true,
      data: {
        context,
        deletionBlocked: deletionCheck.blocked,
        blockReason: deletionCheck.reason,
        blockingLegalHolds: deletionCheck.legalHolds,
        effectiveScope: resolved.effectiveScope,
        sourcePolicies: resolved.sourcePolicies,
        activeLegalHolds: resolved.activeLegalHolds,
        applicablePolicyCount: applicablePolicies.length,
        effectiveRules: Object.fromEntries(resolved.effectiveRules),
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
