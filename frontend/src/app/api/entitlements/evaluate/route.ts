/**
 * Entitlement Evaluation API Route
 *
 * POST /api/entitlements/evaluate - Evaluate entitlements for a context
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntitlementService } from "@/services/entitlements/entitlement.service";
import type {
  EntitlementContext,
  BatchEvaluationRequest,
} from "@/lib/entitlements/entitlement-types";
import type { PlanTier } from "@/types/subscription.types";

/**
 * POST /api/entitlements/evaluate
 *
 * Evaluate one or more entitlements for a given context.
 *
 * Request body:
 * {
 *   context: EntitlementContext,
 *   entitlementKeys: string[],
 *   includeResolutionChain?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate context
    if (!body.context) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    if (!body.context.userId) {
      return NextResponse.json(
        { error: "Missing context.userId" },
        { status: 400 },
      );
    }

    if (!body.context.planTier) {
      return NextResponse.json(
        { error: "Missing context.planTier" },
        { status: 400 },
      );
    }

    // Validate plan tier
    const validTiers: PlanTier[] = [
      "free",
      "starter",
      "professional",
      "enterprise",
      "custom",
    ];
    if (!validTiers.includes(body.context.planTier)) {
      return NextResponse.json(
        { error: `Invalid planTier: ${body.context.planTier}` },
        { status: 400 },
      );
    }

    // Validate entitlement keys
    if (!body.entitlementKeys || !Array.isArray(body.entitlementKeys)) {
      return NextResponse.json(
        { error: "Missing or invalid entitlementKeys array" },
        { status: 400 },
      );
    }

    if (body.entitlementKeys.length === 0) {
      return NextResponse.json(
        { error: "entitlementKeys array cannot be empty" },
        { status: 400 },
      );
    }

    // Limit batch size
    const maxBatchSize = 100;
    if (body.entitlementKeys.length > maxBatchSize) {
      return NextResponse.json(
        { error: `Maximum batch size is ${maxBatchSize} entitlements` },
        { status: 400 },
      );
    }

    const context: EntitlementContext = {
      userId: body.context.userId,
      userRole: body.context.userRole,
      organizationId: body.context.organizationId,
      workspaceId: body.context.workspaceId,
      channelId: body.context.channelId,
      planTier: body.context.planTier,
      metadata: body.context.metadata,
    };

    const batchRequest: BatchEvaluationRequest = {
      context,
      entitlementKeys: body.entitlementKeys,
      includeResolutionChain: body.includeResolutionChain ?? false,
    };

    const service = getEntitlementService();
    const response = await service.evaluateBatch(batchRequest);

    // Add summary
    const results = Object.values(response.results);
    const summary = {
      total: results.length,
      granted: results.filter((r) => r.granted).length,
      denied: results.filter((r) => !r.granted).length,
    };

    return NextResponse.json({
      ...response,
      summary,
    });
  } catch (error) {
    console.error("Error evaluating entitlements:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to evaluate entitlements" },
      { status: 500 },
    );
  }
}
