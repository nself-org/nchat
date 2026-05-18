/**
 * Livechat SLA Violations API Route
 *
 * Handles SLA violation listing and reporting.
 *
 * GET /api/livechat/sla/violations - Get SLA violations
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSLAService } from "@/services/livechat";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
} from "@/lib/api/middleware";
import { successResponse, badRequestResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ListViolationsSchema = z.object({
  type: z.enum(["first_response", "next_response", "resolution"]).optional(),
  policyId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HANDLERS
// ============================================================================

const slaService = getSLAService();

/**
 * GET /api/livechat/sla/violations - Get SLA violations
 */
async function getViolationsHandler(request: AuthenticatedRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    type: searchParams.get("type") || undefined,
    policyId: searchParams.get("policyId") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    limit: searchParams.get("limit") || "50",
    offset: searchParams.get("offset") || "0",
  };

  const validation = ListViolationsSchema.safeParse(queryParams);
  if (!validation.success) {
    return badRequestResponse("Invalid query parameters", "VALIDATION_ERROR", {
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { startDate, endDate, ...options } = validation.data;

  const period =
    startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

  const result = await slaService.listViolations({
    ...options,
    period,
  } as any);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error?.message },
      { status: result.error?.status || 500 },
    );
  }

  return successResponse(result.data);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 100, window: 60 }),
  withAuth,
)(getViolationsHandler as any);
